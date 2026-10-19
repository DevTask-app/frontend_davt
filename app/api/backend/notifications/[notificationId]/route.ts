import { requireUser, resolveActiveWorkspace } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { handle, noContent } from "@/lib/server/http";

type Params = { params: Promise<{ notificationId: string }> };

/** Laravel always returns 204, even when the id does not exist. */
export async function DELETE(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const { notificationId } = await params;

    await prisma.notification.deleteMany({
      where: { id: notificationId, notifiableId: user.id },
    });

    return noContent();
  });
}
