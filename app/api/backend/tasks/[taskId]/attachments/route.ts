import {
  authorizeTaskStatusUpdate,
  findTaskForUser,
  requireUser,
  resolveActiveWorkspace,
} from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { handle, json, modelNotFound, validationError } from "@/lib/server/http";
import { taskAttachmentResource } from "@/lib/server/resources";
import { MAX_ATTACHMENT_BYTES, sniffImageMime, storeAttachmentFile } from "@/lib/server/storage";

type Params = { params: Promise<{ taskId: string }> };

export async function POST(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const { taskId } = await params;
    if (!/^\d+$/.test(taskId)) throw modelNotFound("Task", taskId);
    const task = await findTaskForUser(user, Number(taskId));

    const form = await request.formData().catch(() => null);
    const value = form?.get("file") ?? null;

    const errors: Record<string, string[]> = {};
    let bytes: Uint8Array | null = null;
    let mime: string | null = null;
    let originalName = "";

    if (value === null) {
      errors.file = ["Pilih foto yang ingin diunggah."];
    } else if (!(value instanceof File)) {
      errors.file = ["Berkas tidak valid."];
    } else {
      const buffer = new Uint8Array(await value.arrayBuffer());
      const sniffed = sniffImageMime(buffer);
      const messages: string[] = [];
      if (sniffed === null) {
        messages.push("Berkas harus berupa gambar.");
        messages.push("Format gambar harus JPG, PNG, WEBP, atau GIF.");
      }
      if (value.size > MAX_ATTACHMENT_BYTES) messages.push("Ukuran foto maksimal 2 MB.");
      if (messages.length > 0) {
        errors.file = messages;
      } else {
        bytes = buffer;
        mime = sniffed;
        originalName = value.name;
      }
    }
    if (Object.keys(errors).length > 0) throw validationError(errors);

    await authorizeTaskStatusUpdate(user, task);

    const filePath = await storeAttachmentFile(task.id, bytes!, mime!);
    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId: task.id,
        userId: user.id,
        disk: "local",
        path: filePath,
        originalName,
        mimeType: mime!,
        size: bytes!.length,
      },
    });
    await prisma.taskActivityLog.create({
      data: {
        taskId: task.id,
        userId: user.id,
        action: "attachment_added",
        changes: { attachment: { old: null, new: originalName } },
      },
    });

    return json({ data: taskAttachmentResource(attachment) }, 201);
  });
}
