import { requireUser, resolveActiveWorkspace } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { handle, json } from "@/lib/server/http";
import { workspaceResource } from "@/lib/server/resources";
import { createTeamWorkspace } from "@/lib/server/workspace-actions";
import { parseOrThrow, workspaceStoreSchema } from "@/lib/server/validation";

export async function GET(request: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: {
        workspace: {
          include: { _count: { select: { members: true, projects: true } } },
        },
      },
      orderBy: [{ workspace: { isPersonal: "desc" } }, { workspace: { name: "asc" } }],
    });

    return json({
      data: memberships.map((membership) =>
        workspaceResource(membership.workspace, {
          role: membership.role,
          membersCount: membership.workspace._count.members,
          projectsCount: membership.workspace._count.projects,
        }),
      ),
    });
  });
}

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);

    const input = parseOrThrow(workspaceStoreSchema, await request.json().catch(() => null));

    const workspace = await createTeamWorkspace(user, input.name);

    const full = await prisma.workspace.findUniqueOrThrow({
      where: { id: workspace.id },
      include: { _count: { select: { members: true, projects: true } } },
    });

    return json(
      {
        data: workspaceResource(full, {
          role: "Owner",
          membersCount: full._count.members,
          projectsCount: full._count.projects,
        }),
      },
      201,
    );
  });
}
