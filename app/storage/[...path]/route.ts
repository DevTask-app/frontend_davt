import { checkStorageSignature, readAttachmentFile } from "@/lib/server/storage";

type Params = { params: Promise<{ path: string[] }> };

/** Laravel signed storage disk route (`GET /storage/{path}`), validated without auth. */
export async function GET(request: Request, { params }: Params): Promise<Response> {
  const { path: segments } = await params;
  const filePath = segments.join("/");
  const url = new URL(request.url);
  const expires = url.searchParams.get("expires") ?? "";
  const signature = url.searchParams.get("signature") ?? "";

  const check = checkStorageSignature(filePath, expires, signature);
  if (check === "invalid") return new Response("Invalid signature.", { status: 403 });
  if (check === "expired") return new Response("Signature has expired.", { status: 403 });

  const file = await readAttachmentFile(filePath);
  if (!file) return new Response("Not Found.", { status: 404 });

  const remaining = Math.max(0, Number(expires) - Math.floor(Date.now() / 1000));
  return new Response(new Uint8Array(file.bytes), {
    status: 200,
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(file.bytes.byteLength),
      "Cache-Control": `private, max-age=${remaining}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
