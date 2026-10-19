import {
  authorizeWorkspaceManage,
  authorizeWorkspaceView,
  findWorkspaceForUser,
  requireUser,
  resolveActiveWorkspace,
} from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { handle, json, modelNotFound, validationError } from "@/lib/server/http";
import { sendWorkspaceInvitationMail } from "@/lib/server/mail";
import { invitationResource } from "@/lib/server/resources";
import { randomToken } from "@/lib/server/workspace-actions";
import { parseOrThrow, invitationStoreSchema } from "@/lib/server/validation";

type Params = { params: Promise<{ workspaceId: string }> };

export async function GET(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const { workspaceId } = await params;
    if (!/^\d+$/.test(workspaceId)) throw modelNotFound("Workspace", workspaceId);
    const workspace = await findWorkspaceForUser(user, Number(workspaceId));
    await authorizeWorkspaceView(user, workspace.id);

    const invitations = await prisma.workspaceInvitation.findMany({
      where: { workspaceId: workspace.id },
      include: { inviter: true },
      orderBy: { id: "desc" },
    });

    return json({
      data: invitations.map((invitation) =>
        invitationResource(invitation, { inviter: invitation.inviter }),
      ),
    });
  });
}

export async function POST(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const { workspaceId } = await params;
    if (!/^\d+$/.test(workspaceId)) throw modelNotFound("Workspace", workspaceId);
    const workspace = await findWorkspaceForUser(user, Number(workspaceId));
    const input = parseOrThrow(invitationStoreSchema, await request.json().catch(() => null));
    await authorizeWorkspaceManage(user, workspace.id);

    const errors: Record<string, string[]> = {};
    const existingMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId: workspace.id, user: { email: input.email } },
    });
    if (existingMember) {
      errors.email = ["This person is already a member of the workspace."];
    } else {
      const pending = await prisma.workspaceInvitation.findFirst({
        where: {
          workspaceId: workspace.id,
          email: input.email,
          acceptedAt: null,
        },
      });
      if (pending) {
        errors.email = ["An invitation is already pending for this email."];
      }
    }
    if (Object.keys(errors).length > 0) throw validationError(errors);

    const invitation = await prisma.workspaceInvitation.create({
      data: {
        workspaceId: workspace.id,
        email: input.email,
        role: input.role ?? "Member",
        token: randomToken(64),
        invitedBy: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await sendWorkspaceInvitationMail({
      to: invitation.email,
      workspaceName: workspace.name,
      inviterName: user.name,
      acceptUrl: invitationResource(invitation).accept_url,
    });

    return json(
      { data: invitationResource(invitation, { inviter: user }) },
      201,
    );
  });
}
