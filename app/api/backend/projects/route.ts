import {
  authorizeContributes,
  requireUser,
  resolveActiveWorkspace,
} from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { handle, json } from "@/lib/server/http";
import { buildPagination, parsePagination } from "@/lib/server/pagination";
import { projectResource } from "@/lib/server/resources";
import { parseOrThrow, projectStoreSchema } from "@/lib/server/validation";

export async function GET(request: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    const active = await resolveActiveWorkspace(user, request);

    const url = new URL(request.url);
    const { page, perPage } = parsePagination(
      Number(url.searchParams.get("page") ?? "") || undefined,
      Number(url.searchParams.get("per_page") ?? "") || undefined,
      15,
    );

    const where = { workspaceId: active.workspace.id };
    const total = await prisma.project.count({ where });
    const projects = await prisma.project.findMany({
      where,
      include: { _count: { select: { tasks: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return json(
      buildPagination(
        projects.map((project) =>
          projectResource(project, { tasksCount: project._count.tasks }),
        ),
        total,
        page,
        perPage,
        url,
      ),
    );
  });
}

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    const active = await resolveActiveWorkspace(user, request);
    const input = parseOrThrow(projectStoreSchema, await request.json().catch(() => null));
    authorizeContributes(active);

    const project = await prisma.project.create({
      data: {
        workspaceId: active.workspace.id,
        userId: user.id,
        createdBy: user.id,
        name: input.name,
        description: input.description ?? null,
        status: input.status ?? "Active",
        startDate: input.start_date ?? null,
        dueDate: input.due_date ?? null,
      },
    });

    return json({ data: projectResource(project) }, 201);
  });
}
