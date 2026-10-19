import { requireUser, resolveActiveWorkspace } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { handle, json } from "@/lib/server/http";
import { PROJECT_STATUSES, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/server/enums";

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfWeek(date: Date): Date {
  const day = startOfUtcDay(date);
  const weekday = day.getUTCDay(); // 0 = Sunday
  const daysSinceMonday = (weekday + 6) % 7;
  return new Date(day.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);
}

async function countBy<T extends string>(
  workspaceId: number,
  column: "status" | "priority",
  values: readonly T[],
): Promise<Record<T, number>> {
  const grouped = await prisma.task.groupBy({
    by: [column],
    where: { project: { workspaceId }, deletedAt: null },
    _count: { _all: true },
  });
  const counts = new Map<string, number>();
  for (const row of grouped) {
    counts.set(row[column], row._count._all);
  }
  const result = {} as Record<T, number>;
  for (const value of values) {
    result[value] = counts.get(value) ?? 0;
  }
  return result;
}

export async function GET(request: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    const active = await resolveActiveWorkspace(user, request);
    const workspaceId = active.workspace.id;

    const [projectTotal, projectByStatus, taskTotal, taskByStatus, taskByPriority] =
      await Promise.all([
        prisma.project.count({ where: { workspaceId } }),
        prisma.project.groupBy({
          by: ["status"],
          where: { workspaceId },
          _count: { _all: true },
        }),
        prisma.task.count({ where: { project: { workspaceId }, deletedAt: null } }),
        countBy(workspaceId, "status", TASK_STATUSES),
        countBy(workspaceId, "priority", TASK_PRIORITIES),
      ]);

    const projectCounts = new Map<string, number>();
    for (const row of projectByStatus) {
      projectCounts.set(row.status, row._count._all);
    }
    const projectsByStatus = {} as Record<(typeof PROJECT_STATUSES)[number], number>;
    for (const status of PROJECT_STATUSES) {
      projectsByStatus[status] = projectCounts.get(status) ?? 0;
    }

    const today = startOfUtcDay(new Date());
    const weekStart = startOfWeek(new Date());
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [overdue, completedThisWeek] = await Promise.all([
      prisma.task.count({
        where: {
          project: { workspaceId },
          deletedAt: null,
          dueDate: { lt: today },
          status: { not: "Done" },
        },
      }),
      prisma.task.count({
        where: {
          project: { workspaceId },
          deletedAt: null,
          completedAt: { gte: weekStart, lt: weekEnd },
        },
      }),
    ]);

    return json({
      data: {
        projects: {
          total: projectTotal,
          by_status: projectsByStatus,
        },
        tasks: {
          total: taskTotal,
          by_status: taskByStatus,
          by_priority: taskByPriority,
          overdue,
          completed_this_week: completedThisWeek,
        },
      },
    });
  });
}
