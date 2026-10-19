import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { TaskQueryInput } from "./validation";

export interface TaskQueryOptions {
  filters: TaskQueryInput;
  /** Extra base where clause (e.g. active workspace scope or project). */
  baseWhere?: Prisma.TaskWhereInput;
  requireProjectInScope?: boolean;
}

export function buildTaskWhere(options: TaskQueryOptions): Prisma.TaskWhereInput {
  const { filters, baseWhere } = options;
  const where: Prisma.TaskWhereInput = {
    deletedAt: null,
    AND: [],
  };
  const and: Prisma.TaskWhereInput[] = [];
  if (baseWhere) and.push(baseWhere);
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.type) where.type = filters.type;
  if (filters.project_id !== undefined && filters.project_id !== null) {
    where.projectId = filters.project_id;
  }
  if (filters.assignee_id !== undefined && filters.assignee_id !== null) {
    where.assigneeId = filters.assignee_id;
  }
  if (filters.parent_task_id !== undefined && filters.parent_task_id !== null) {
    where.parentTaskId = filters.parent_task_id;
  }
  if (filters.due_after) {
    and.push({ dueDate: { gte: filters.due_after } });
  }
  if (filters.due_before) {
    and.push({ dueDate: { lte: filters.due_before } });
  }
  if (and.length > 0) where.AND = and;
  return where;
}

const TASK_SORT_MAP: Record<
  string,
  keyof Prisma.TaskOrderByWithRelationInput
> = {
  id: "id",
  title: "title",
  status: "status",
  priority: "priority",
  type: "type",
  due_date: "dueDate",
  estimated_hours: "estimatedHours",
  actual_hours: "actualHours",
  completed_at: "completedAt",
  created_at: "createdAt",
  updated_at: "updatedAt",
};

export function buildTaskOrderBy(
  filters: TaskQueryInput,
): Prisma.TaskOrderByWithRelationInput {
  const field = TASK_SORT_MAP[filters.sort ?? "created_at"] ?? "createdAt";
  const direction = filters.direction === "asc" ? "asc" : "desc";
  return { [field]: direction } as Prisma.TaskOrderByWithRelationInput;
}

export async function queryTasks(options: TaskQueryOptions) {
  const where = buildTaskWhere(options);
  const [total, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      include: { project: true },
      orderBy: buildTaskOrderBy(options.filters),
    }),
  ]);
  return { total, tasks };
}
