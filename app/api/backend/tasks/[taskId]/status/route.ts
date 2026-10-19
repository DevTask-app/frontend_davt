import {
  authorizeTaskStatusUpdate,
  findTaskForUser,
  requireUser,
  resolveActiveWorkspace,
} from "@/lib/server/auth";
import { handle, json, modelNotFound } from "@/lib/server/http";
import { taskResource } from "@/lib/server/resources";
import { updateTask } from "@/lib/server/task-actions";
import { parseOrThrow, taskStatusUpdateSchema } from "@/lib/server/validation";

type Params = { params: Promise<{ taskId: string }> };

export async function PATCH(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const { taskId } = await params;
    if (!/^\d+$/.test(taskId)) throw modelNotFound("Task", taskId);
    const task = await findTaskForUser(user, Number(taskId));
    const input = parseOrThrow(taskStatusUpdateSchema, await request.json().catch(() => null));

    await authorizeTaskStatusUpdate(user, task);

    const updated = await updateTask({
      task,
      userId: user.id,
      data: { status: input.status, blocked_reason: input.blocked_reason },
    });

    return json({ data: taskResource(updated) });
  });
}
