import { requireUser, resolveActiveWorkspace } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { handle, json } from "@/lib/server/http";
import { taskResource } from "@/lib/server/resources";
import { parseQueryOrThrow, dashboardUpcomingQuerySchema } from "@/lib/server/validation";

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function GET(request: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    const active = await resolveActiveWorkspace(user, request);

    const query = parseQueryOrThrow(
      dashboardUpcomingQuerySchema,
      new URL(request.url).searchParams,
    );
    const limit = Math.min(Math.max(query.limit ?? 10, 1), 50);

    const today = startOfUtcDay(new Date());
    const tasks = await prisma.task.findMany({
      where: {
        project: { workspaceId: active.workspace.id },
        deletedAt: null,
        dueDate: { gte: today },
        status: { not: "Done" },
      },
      include: { project: true },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
      take: limit,
    });

    return json({ data: tasks.map((task) => taskResource(task)) });
  });
}
