import {
  authorizeManageOrCreator,
  authorizeProjectUpdate,
  findProjectForUser,
  requireUser,
  resolveActiveWorkspace,
} from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { conflict, handle, json, modelNotFound, noContent } from "@/lib/server/http";
import { projectResource, taskResource } from "@/lib/server/resources";
import { parseOrThrow, projectUpdateSchema } from "@/lib/server/validation";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const { projectId } = await params;
    if (!/^\d+$/.test(projectId)) throw modelNotFound("Project", projectId);
    const project = await findProjectForUser(user, Number(projectId));

    const [tasksCount, tasks] = await Promise.all([
      prisma.task.count({ where: { projectId: project.id, deletedAt: null } }),
      prisma.task.findMany({
        where: { projectId: project.id, deletedAt: null },
        orderBy: { id: "desc" },
      }),
    ]);

    return json({
      data: projectResource(project, {
        tasksCount,
        tasks: tasks.map((task) => taskResource(task)),
      }),
    });
  });
}

export async function PATCH(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const { projectId } = await params;
    if (!/^\d+$/.test(projectId)) throw modelNotFound("Project", projectId);
    const project = await findProjectForUser(user, Number(projectId));
    const input = parseOrThrow(projectUpdateSchema, await request.json().catch(() => null));
    await authorizeProjectUpdate(user, project);

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        ...(input.name != null ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status != null ? { status: input.status } : {}),
        ...(input.start_date !== undefined ? { startDate: input.start_date } : {}),
        ...(input.due_date !== undefined ? { dueDate: input.due_date } : {}),
      },
    });

    return json({ data: projectResource(updated) });
  });
}

export async function DELETE(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const { projectId } = await params;
    if (!/^\d+$/.test(projectId)) throw modelNotFound("Project", projectId);
    const project = await findProjectForUser(user, Number(projectId));

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: project.workspaceId, userId: user.id },
      },
    });
    authorizeManageOrCreator(membership, project.createdBy, user.id);

    const activeTasks = await prisma.task.count({
      where: { projectId: project.id, deletedAt: null },
    });
    if (activeTasks > 0) {
      throw conflict("Cannot delete a project that still has tasks.");
    }

    await prisma.$transaction([
      prisma.task.deleteMany({ where: { projectId: project.id } }),
      prisma.project.delete({ where: { id: project.id } }),
    ]);

    return noContent();
  });
}

export const PUT = PATCH;
