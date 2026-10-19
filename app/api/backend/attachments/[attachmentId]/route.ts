import {
  authorizeTaskStatusUpdate,
  findTaskForUser,
  requireUser,
  resolveActiveWorkspace,
} from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { handle, modelNotFound, noContent } from "@/lib/server/http";
import { deleteAttachmentFile } from "@/lib/server/storage";

type Params = { params: Promise<{ attachmentId: string }> };

export async function DELETE(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const { attachmentId } = await params;
    if (!/^\d+$/.test(attachmentId)) throw modelNotFound("TaskAttachment", attachmentId);

    const attachment = await prisma.taskAttachment.findUnique({
      where: { id: Number(attachmentId) },
    });
    if (!attachment) throw modelNotFound("TaskAttachment", attachmentId);

    // Binding is scoped to tasks visible to the user (404 on trashed/foreign tasks).
    const task = await findTaskForUser(user, attachment.taskId);
    await authorizeTaskStatusUpdate(user, task);

    await prisma.$transaction([
      prisma.taskAttachment.delete({ where: { id: attachment.id } }),
      prisma.taskActivityLog.create({
        data: {
          taskId: task.id,
          userId: user.id,
          action: "attachment_removed",
          changes: { attachment: { old: attachment.originalName, new: null } },
        },
      }),
    ]);
    await deleteAttachmentFile(attachment.path);

    return noContent();
  });
}
