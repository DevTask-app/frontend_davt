import {
  authorizeWorkspaceManage,
  findWorkspaceForUser,
  requireUser,
  resolveActiveWorkspace,
} from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { handle, HttpError, json, modelNotFound, noContent, notFound } from "@/lib/server/http";
import { parseOrThrow, memberUpdateSchema } from "@/lib/server/validation";

type Params = { params: Promise<{ workspaceId: string; memberId: string }> };

async function loadMember(workspaceId: number, rawMemberId: string) {
  if (!/^\d+$/.test(rawMemberId)) throw modelNotFound("User", rawMemberId);
  const userId = Number(rawMemberId);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw modelNotFound("User", rawMemberId);
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!membership) throw notFound("This user is not a member of the workspace.");
  return { user, membership };
}

export async function PATCH(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const { workspaceId, memberId } = await params;
    if (!/^\d+$/.test(workspaceId)) throw modelNotFound("Workspace", workspaceId);
    const workspace = await findWorkspaceForUser(user, Number(workspaceId));
    const input = parseOrThrow(memberUpdateSchema, await request.json().catch(() => null));
    await authorizeWorkspaceManage(user, workspace.id);
    await loadMember(workspace.id, memberId);

    await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: Number(memberId) } },
      data: { role: input.role },
    });

    const member = await prisma.user.findUniqueOrThrow({ where: { id: Number(memberId) } });

    return json({
      data: {
        id: member.id,
        name: member.name,
        email: member.email,
        role: input.role,
      },
    });
  });
}

export async function DELETE(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const { workspaceId, memberId } = await params;
    if (!/^\d+$/.test(workspaceId)) throw modelNotFound("Workspace", workspaceId);
    const workspace = await findWorkspaceForUser(user, Number(workspaceId));
    await authorizeWorkspaceManage(user, workspace.id);
    const { membership } = await loadMember(workspace.id, memberId);

    if (membership.role === "Owner") {
      throw new HttpError(403, "The workspace owner cannot be removed.");
    }

    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: membership.userId } },
    });

    return noContent();
  });
}

export const PUT = PATCH;
