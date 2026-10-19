import {
  assertAssigneeInWorkspace,
  assertParentTaskInProject,
  authorizeManageOrCreator,
  authorizeTaskUpdate,
  findTaskForUser,
  requireUser,
  resolveActiveWorkspace,
} from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { handle, json, modelNotFound, noContent, validationError } from "@/lib/server/http";
import { taskResource } from "@/lib/server/resources";
import { updateTask } from "@/lib/server/task-actions";
import { parseOrThrow, taskUpdateSchema } from "@/lib/server/validation";

type Params = { params: Promise<{ taskId: string }> };

export async function GET(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const { taskId } = await params;
    if (!/^\d+$/.test(taskId)) throw modelNotFound("Task", taskId);
    const task = await findTaskForUser(user, Number(taskId));

    const full = await prisma.task.findUniqueOrThrow({
      where: { id: task.id },
      include: {
        subtasks: { where: { deletedAt: null }, orderBy: { id: "desc" } },
        logs: { orderBy: { id: "desc" } },
        assignee: true,
        attachments: { orderBy: { id: "asc" } },
      },
    });

    return json({ data: taskResource(full) });
  });
}

export async function PATCH(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const { taskId } = await params;
    if (!/^\d+$/.test(taskId)) throw modelNotFound("Task", taskId);
    const task = await findTaskForUser(user, Number(taskId));
    const input = parseOrThrow(taskUpdateSchema, await request.json().catch(() => null));

    const errors: Record<string, string[]> = {};
    if (input.assignee_id !== undefined && input.assignee_id !== null) {
      await assertAssigneeInWorkspace(task.project.workspaceId, input.assignee_id, errors);
    }
    if (input.parent_task_id !== undefined && input.parent_task_id !== null) {
      await assertParentTaskInProject(input.parent_task_id, task.projectId, task.id, errors);
    }
    if (Object.keys(errors).length > 0) throw validationError(errors);

    await authorizeTaskUpdate(user, task);

    const updated = await updateTask({ task, userId: user.id, data: input });
    return json({ data: taskResource(updated) });
  });
}

export async function DELETE(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const { taskId } = await params;
    if (!/^\d+$/.test(taskId)) throw modelNotFound("Task", taskId);
    const task = await findTaskForUser(user, Number(taskId));

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: task.project.workspaceId, userId: user.id },
      },
    });
    authorizeManageOrCreator(membership, task.createdBy, user.id);

    await prisma.task.update({
      where: { id: task.id },
      data: { deletedAt: new Date() },
    });

    return noContent();
  });
}

export const PUT = PATCH;
