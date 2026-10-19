import { requireUser, resolveActiveWorkspace } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { handle, json } from "@/lib/server/http";
import { userResource, workspaceResource } from "@/lib/server/resources";

export async function GET(request: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: { workspace: true },
      orderBy: [{ workspace: { isPersonal: "desc" } }, { workspace: { name: "asc" } }],
    });

    return json({
      data: {
        ...userResource(user),
        workspaces: memberships.map((membership) =>
          workspaceResource(membership.workspace, { role: membership.role }),
        ),
      },
    });
  });
}
