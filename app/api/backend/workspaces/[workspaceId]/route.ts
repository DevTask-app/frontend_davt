import {
  authorizeWorkspaceManage,
  authorizeWorkspaceView,
  findWorkspaceForUser,
  isOwner,
  requireUser,
  resolveActiveWorkspace,
} from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { conflict, handle, HttpError, json, modelNotFound, noContent } from "@/lib/server/http";
import { workspaceResource } from "@/lib/server/resources";
import { parseOrThrow, workspaceUpdateSchema } from "@/lib/server/validation";

type Params = { params: Promise<{ workspaceId: string }> };

async function parseWorkspaceId(raw: string): Promise<number> {
  if (!/^\d+$/.test(raw)) throw modelNotFound("Workspace", raw);
  return Number(raw);
}

async function workspaceWithCounts(workspaceId: number, role: string) {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    include: { _count: { select: { members: true, projects: true } } },
  });
  return workspaceResource(workspace, {
    role,
    membersCount: workspace._count.members,
    projectsCount: workspace._count.projects,
  });
}

export async function GET(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const workspace = await findWorkspaceForUser(user, await parseWorkspaceId((await params).workspaceId));
    const membership = await authorizeWorkspaceView(user, workspace.id);
    return json({ data: await workspaceWithCounts(workspace.id, membership.role) });
  });
}

export async function PATCH(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const workspace = await findWorkspaceForUser(user, await parseWorkspaceId((await params).workspaceId));
    const input = parseOrThrow(workspaceUpdateSchema, await request.json().catch(() => null));
    const membership = await authorizeWorkspaceManage(user, workspace.id);
    if (input.name !== undefined) {
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { name: input.name },
      });
    }
    return json({ data: await workspaceWithCounts(workspace.id, membership.role) });
  });
}

export async function DELETE(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const workspace = await findWorkspaceForUser(user, await parseWorkspaceId((await params).workspaceId));
    const membership = await authorizeWorkspaceManage(user, workspace.id);
    if (!isOwner(membership) || workspace.isPersonal) {
      throw new HttpError(403, "This action is unauthorized.");
    }
    const projectsCount = await prisma.project.count({
      where: { workspaceId: workspace.id },
    });
    if (projectsCount > 0) {
      throw conflict("Cannot delete a workspace that still has projects.");
    }
    await prisma.workspace.delete({ where: { id: workspace.id } });
    return noContent();
  });
}

export const PUT = PATCH;
