import type { Task } from "@prisma/client";
import { prisma } from "./db";
import { notifyTaskAssignee } from "./notifications";
import { dateOnly, decimalString } from "./resources";

export interface TaskFieldValues {
  title?: string | null;
  description?: string | null;
  type?: string | null;
  status?: string | null;
  priority?: string | null;
  due_date?: Date | null;
  assignee_id?: number | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  parent_task_id?: number | null;
  blocked_reason?: string | null;
}

function pickString<T extends string>(value: T | null | undefined, fallback: T): T {
  return value ?? fallback;
}

function pickUpdated<T>(value: T | null | undefined, current: T): T | null {
  return value !== undefined && value !== null ? value : current;
}

export type ActivityChanges = Record<
  string,
  { old: string | number | null; new: string | number | null }
>;

const TRACKED_ATTRIBUTES = [
  "title",
  "description",
  "type",
  "status",
  "priority",
  "due_date",
  "estimated_hours",
  "actual_hours",
  "assignee_id",
  "parent_task_id",
] as const;

type TrackedAttribute = (typeof TRACKED_ATTRIBUTES)[number];

function normalizeChangeValue(
  attribute: TrackedAttribute,
  value: unknown,
): string | number | null {
  if (value === null || value === undefined) return null;
  if (attribute === "due_date") return dateOnly(value as Date);
  if (attribute === "estimated_hours" || attribute === "actual_hours") {
    return decimalString(value as Parameters<typeof decimalString>[0]);
  }
  return value as string | number;
}

function rawEquals(attribute: TrackedAttribute, a: unknown, b: unknown): boolean {
  return (
    normalizeChangeValue(attribute, a) === normalizeChangeValue(attribute, b)
  );
}

function changedAttributes(
  original: Record<TrackedAttribute, unknown>,
  next: Record<TrackedAttribute, unknown>,
): ActivityChanges {
  const changes: ActivityChanges = {};
  for (const attribute of TRACKED_ATTRIBUTES) {
    if (rawEquals(attribute, original[attribute], next[attribute])) continue;
    changes[attribute] = {
      old: normalizeChangeValue(attribute, original[attribute]),
      new: normalizeChangeValue(attribute, next[attribute]),
    };
  }
  return changes;
}

function actionFor(changes: ActivityChanges): string {
  const keys = Object.keys(changes);
  if (keys.length === 1 && keys[0] === "status") return "status_changed";
  if (keys.length === 1 && keys[0] === "priority") return "priority_changed";
  return "updated";
}

export interface CreateTaskInput {
  projectId: number;
  userId: number;
  data: TaskFieldValues;
}

export async function createTask({ projectId, userId, data }: CreateTaskInput): Promise<Task> {
  const status = pickString(data.status, "Backlog");
  const priority = pickString(data.priority, "Medium");

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        projectId,
        createdBy: userId,
        title: data.title ?? "",
        description: data.description ?? null,
        type: pickString(data.type, "Feature"),
        status,
        priority,
        dueDate: data.due_date ?? null,
        assigneeId: data.assignee_id ?? null,
        estimatedHours: data.estimated_hours ?? null,
        actualHours: data.actual_hours ?? null,
        parentTaskId: data.parent_task_id ?? null,
        completedAt: status === "Done" ? new Date() : null,
        blockedReason:
          status === "Blocked" ? (data.blocked_reason ?? null) : null,
      },
    });

    await tx.taskActivityLog.create({
      data: {
        taskId: created.id,
        userId,
        action: "created",
        changes: {
          status: { old: null, new: status },
          priority: { old: null, new: priority },
        },
      },
    });

    return created;
  });

  await notifyTaskAssignee(task.id, userId);
  return task;
}

export interface UpdateTaskInput {
  task: Task;
  userId: number;
  data: TaskFieldValues;
}

export async function updateTask({ task, userId, data }: UpdateTaskInput): Promise<Task> {
  const original: Record<TrackedAttribute, unknown> = {
    title: task.title,
    description: task.description,
    type: task.type,
    status: task.status,
    priority: task.priority,
    due_date: task.dueDate,
    estimated_hours: task.estimatedHours,
    actual_hours: task.actualHours,
    assignee_id: task.assigneeId,
    parent_task_id: task.parentTaskId,
  };

  const next: Record<TrackedAttribute, unknown> = {
    title: pickUpdated(data.title, task.title),
    description:
      data.description !== undefined ? data.description : task.description,
    type: pickUpdated(data.type, task.type),
    status: pickUpdated(data.status, task.status),
    priority: pickUpdated(data.priority, task.priority),
    due_date: data.due_date !== undefined ? data.due_date : task.dueDate,
    estimated_hours:
      data.estimated_hours !== undefined ? data.estimated_hours : task.estimatedHours,
    actual_hours: data.actual_hours !== undefined ? data.actual_hours : task.actualHours,
    assignee_id: data.assignee_id !== undefined ? data.assignee_id : task.assigneeId,
    parent_task_id:
      data.parent_task_id !== undefined ? data.parent_task_id : task.parentTaskId,
  };

  const status = next.status as string;
  const completedAt =
    status === "Done" ? (task.completedAt ?? new Date()) : null;

  let blockedReason: string | null;
  if (status === "Blocked") {
    blockedReason =
      data.blocked_reason !== undefined ? data.blocked_reason : task.blockedReason;
  } else {
    blockedReason = null;
  }

  const changes = changedAttributes(original, next);

  const updated = await prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id: task.id },
      data: {
        title: next.title as string,
        description: next.description as string | null,
        type: next.type as string,
        status,
        priority: next.priority as string,
        dueDate: next.due_date as Date | null,
        assigneeId: next.assignee_id as number | null,
        estimatedHours: next.estimated_hours as number | null,
        actualHours: next.actual_hours as number | null,
        parentTaskId: next.parent_task_id as number | null,
        completedAt,
        blockedReason,
        updatedBy: userId,
      },
    });

    if (Object.keys(changes).length > 0) {
      await tx.taskActivityLog.create({
        data: {
          taskId: task.id,
          userId,
          action: actionFor(changes),
          changes,
        },
      });
    }

    return updated;
  });

  if ("assignee_id" in changes) await notifyTaskAssignee(task.id, userId);
  return updated;
}
