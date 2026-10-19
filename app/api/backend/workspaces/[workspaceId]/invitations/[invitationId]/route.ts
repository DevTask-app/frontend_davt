import {
  authorizeWorkspaceManage,
  findWorkspaceForUser,
  requireUser,
  resolveActiveWorkspace,
} from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { handle, modelNotFound, noContent, notFound } from "@/lib/server/http";

type Params = { params: Promise<{ workspaceId: string; invitationId: string }> };

export async function DELETE(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const { workspaceId, invitationId } = await params;
    if (!/^\d+$/.test(workspaceId)) throw modelNotFound("Workspace", workspaceId);
    const workspace = await findWorkspaceForUser(user, Number(workspaceId));

    if (!/^\d+$/.test(invitationId)) {
      throw modelNotFound("WorkspaceInvitation", invitationId);
    }
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { id: Number(invitationId) },
    });
    if (!invitation) throw modelNotFound("WorkspaceInvitation", invitationId);
    if (invitation.workspaceId !== workspace.id) throw notFound("");

    await authorizeWorkspaceManage(user, workspace.id);

    await prisma.workspaceInvitation.delete({ where: { id: invitation.id } });
    return noContent();
  });
}
