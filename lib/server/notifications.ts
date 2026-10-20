import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { sendTaskAssignedMail } from "./mail";
import { sendAfterResponse } from "./mail-defer";

/** Laravel notification class name stored in `notifications.type`. */
export const TASK_ASSIGNED_TYPE = "App\\Notifications\\TaskAssigned";

export interface NotificationPayloadData {
  task_id: number;
  task_title: string;
  project_id: number;
  project_name: string;
  workspace_id: number;
  assigned_by: string;
  url: string;
}

export function frontendOrigin(): string {
  return (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/**
 * Notify the task assignee, skipping self-assignment and unassigned tasks
 * (`NotifyTaskAssignee::handle`). Writes the database notification and the
 * mail channel (log mailer in Phase 1/2).
 */
export async function notifyTaskAssignee(
  taskId: number,
  actorId: number,
): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
  if (!task || task.deletedAt !== null) return;
  if (task.assigneeId === null || task.assigneeId === actorId) return;

  const [actor, assignee] = await Promise.all([
    prisma.user.findUnique({ where: { id: actorId } }),
    prisma.user.findUnique({ where: { id: task.assigneeId } }),
  ]);
  if (!actor || !assignee) return;

  const data: NotificationPayloadData = {
    task_id: task.id,
    task_title: task.title,
    project_id: task.project.id,
    project_name: task.project.name,
    workspace_id: task.project.workspaceId,
    assigned_by: actor.name,
    url: `${frontendOrigin()}/tasks/${task.id}`,
  };

  await prisma.notification.create({
    data: {
      type: TASK_ASSIGNED_TYPE,
      notifiableType: "App\\Models\\User",
      notifiableId: assignee.id,
      data: data as unknown as Prisma.InputJsonObject,
    },
  });

  sendAfterResponse(() =>
    sendTaskAssignedMail({
      to: assignee.email,
      taskTitle: task.title,
      projectName: data.project_name,
      assignedBy: actor.name,
      url: data.url,
    }),
  );
}
