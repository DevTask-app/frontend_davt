import {
  authorizeWorkspaceView,
  findWorkspaceForUser,
  requireUser,
  resolveActiveWorkspace,
} from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { handle, json, modelNotFound } from "@/lib/server/http";
import { memberResource } from "@/lib/server/resources";

type Params = { params: Promise<{ workspaceId: string; memberId?: string }> };

export async function GET(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const { workspaceId } = await params;
    if (!/^\d+$/.test(workspaceId)) throw modelNotFound("Workspace", workspaceId);
    const workspace = await findWorkspaceForUser(user, Number(workspaceId));
    await authorizeWorkspaceView(user, workspace.id);

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      include: { user: true },
      orderBy: { joinedAt: "asc" },
    });

    return json({ data: members.map(memberResource) });
  });
}
