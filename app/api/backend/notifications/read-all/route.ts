import { requireUser, resolveActiveWorkspace } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { handle, noContent } from "@/lib/server/http";

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);

    await prisma.notification.updateMany({
      where: { notifiableId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    return noContent();
  });
}
