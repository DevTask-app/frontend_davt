import { requireUser, resolveActiveWorkspace } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { forbidden, gone, handle, json, modelNotFound } from "@/lib/server/http";
import { workspaceResource } from "@/lib/server/resources";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const { token } = await params;

    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { token },
    });
    if (!invitation) {
      throw modelNotFound("WorkspaceInvitation", token);
    }

    const isExpired =
      invitation.expiresAt !== null && invitation.expiresAt.getTime() <= Date.now();
    if (invitation.acceptedAt !== null || isExpired) {
      throw gone("This invitation is no longer valid.");
    }

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw forbidden("This invitation was issued to a different email address.");
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: invitation.workspaceId, userId: user.id },
      },
    });
    if (!existing) {
      await prisma.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: user.id,
          role: invitation.role,
          invitedBy: invitation.invitedBy,
          joinedAt: new Date(),
        },
      });
    }

    await prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: invitation.workspaceId },
      include: { _count: { select: { members: true, projects: true } } },
    });
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: workspace.id, userId: user.id },
      },
    });

    return json({
      data: workspaceResource(workspace, {
        role: membership?.role ?? null,
        membersCount: workspace._count.members,
        projectsCount: workspace._count.projects,
      }),
    });
  });
}
