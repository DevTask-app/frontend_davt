import { requireUser, resolveActiveWorkspace } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { handle, json, notFound } from "@/lib/server/http";
import { notificationResource } from "@/lib/server/resources";

type Params = { params: Promise<{ notificationId: string }> };

export async function PATCH(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const { notificationId } = await params;

    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, notifiableId: user.id },
    });
    if (!notification) {
      throw notFound(
        `No query results for model [Illuminate\\Notifications\\DatabaseNotification] ${notificationId}`,
      );
    }

    if (notification.readAt !== null) {
      return json({ data: notificationResource(notification) });
    }

    const read = await prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });

    return json({ data: notificationResource(read) });
  });
}
