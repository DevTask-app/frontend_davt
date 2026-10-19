import { requireUser, resolveActiveWorkspace } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { handle, json } from "@/lib/server/http";
import { dateOnly } from "@/lib/server/resources";

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfWeek(date: Date): Date {
  const day = startOfUtcDay(date);
  const weekday = day.getUTCDay(); // 0 = Sunday
  const daysSinceMonday = (weekday + 6) % 7;
  return new Date(day.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);
}

export async function GET(request: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    const active = await resolveActiveWorkspace(user, request);

    const start = startOfWeek(new Date());
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1); // Sunday 23:59:59.999

    const where = { project: { workspaceId: active.workspace.id }, deletedAt: null } as const;

    const [created, completed, completedTasks] = await Promise.all([
      prisma.task.count({
        where: { ...where, createdAt: { gte: start, lte: end } },
      }),
      prisma.task.count({
        where: { ...where, completedAt: { gte: start, lte: end } },
      }),
      prisma.task.findMany({
        where: { ...where, completedAt: { gte: start, lte: end } },
        select: { completedAt: true },
      }),
    ]);

    const counts = new Map<string, number>();
    for (const task of completedTasks) {
      const key = dateOnly(task.completedAt);
      if (key !== null) counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const completedByDay: Record<string, number> = {};
    for (let day = start.getTime(); day <= end.getTime(); day += 24 * 60 * 60 * 1000) {
      const key = dateOnly(new Date(day));
      if (key !== null) completedByDay[key] = counts.get(key) ?? 0;
    }

    return json({
      data: {
        period: {
          start: dateOnly(start),
          end: dateOnly(end),
        },
        created,
        completed,
        completed_by_day: completedByDay,
      },
    });
  });
}
