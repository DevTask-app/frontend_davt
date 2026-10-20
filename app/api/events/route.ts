import { type NextRequest } from "next/server";
import { handle, unauthenticated } from "@/lib/server/http";
import { verifyAccessToken } from "@/lib/server/jwt";
import { prisma } from "@/lib/server/db";
import { subscribeRealtime } from "@/lib/server/realtime";

const HEARTBEAT_INTERVAL_MS = 25_000;

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token === "" ? null : token;
}

/**
 * Stream event realtime (SSE) untuk semua workspace tempat user menjadi member.
 * EventSource di browser mengirim cookie `davt_token` secara otomatis,
 * jadi autentikasi cukup dari cookie (fallback: header Authorization).
 */
export async function GET(request: NextRequest): Promise<Response> {
  return handle(async () => {
    const token = request.cookies.get("davt_token")?.value ?? bearerToken(request);
    if (!token) throw unauthenticated();

    const userId = await verifyAccessToken(token);
    if (userId === null) throw unauthenticated();

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });

    const encoder = new TextEncoder();
    let closed = false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    const unsubscribers: Array<() => void> = [];

    const cleanup = () => {
      if (closed) return;
      closed = true;
      if (heartbeat !== null) clearInterval(heartbeat);
      for (const unsubscribe of unsubscribers) unsubscribe();
    };

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (chunk: string) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(chunk));
          } catch {
            cleanup();
          }
        };

        for (const { workspaceId } of memberships) {
          unsubscribers.push(
            subscribeRealtime(workspaceId, (event) => {
              // Tanpa field `event:` agar browser men-dispatch sebagai
              // event default "message" yang didengar klien.
              send(`data: ${JSON.stringify(event)}\n\n`);
            }),
          );
        }

        send(": connected\n\n");
        heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_INTERVAL_MS);

        request.signal.addEventListener(
          "abort",
          () => {
            cleanup();
            try {
              controller.close();
            } catch {
              // stream sudah tertutup
            }
          },
          { once: true },
        );
      },
      cancel() {
        cleanup();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  });
}
