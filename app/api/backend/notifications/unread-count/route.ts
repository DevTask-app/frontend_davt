import { requireUser, resolveActiveWorkspace } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { handle, json } from "@/lib/server/http";

export async function GET(request: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);

    const unread_count = await prisma.notification.count({
      where: { notifiableId: user.id, readAt: null },
    });

    return json({ data: { unread_count } });
  });
}
