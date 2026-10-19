import type { Prisma, PrismaClient, User, Workspace, WorkspaceMember } from "@prisma/client";
import { prisma } from "./db";
import { personalWorkspaceName, slugifyWorkspaceName } from "./workspace-utils";

export { randomToken } from "./workspace-utils";

type Db = PrismaClient | Prisma.TransactionClient;

/** CreateTeamWorkspace uniqueSlug(): base, then -2, -3, ... */
export async function uniqueWorkspaceSlug(db: Db, name: string): Promise<string> {
  const base = slugifyWorkspaceName(name);
  let slug = base;
  let suffix = 1;
  while (await db.workspace.findUnique({ where: { slug } })) {
    slug = `${base}-${++suffix}`;
  }
  return slug;
}

export async function createTeamWorkspace(user: User, name: string): Promise<Workspace> {
  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        name,
        slug: await uniqueWorkspaceSlug(tx, name),
        isPersonal: false,
      },
    });
    await tx.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: "Owner",
        joinedAt: new Date(),
      },
    });
    return workspace;
  });
}

/** CreatePersonalWorkspace: provision (or return the existing) personal workspace. */
export async function ensurePersonalWorkspace(user: User): Promise<WorkspaceMember> {
  const existing = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspace: { isPersonal: true } },
  });
  if (existing) return existing;

  try {
    return await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: personalWorkspaceName(user.name),
          slug: `personal-${user.id}`,
          isPersonal: true,
        },
      });
      return tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: "Owner",
          joinedAt: new Date(),
        },
      });
    });
  } catch (error) {
    // Unique slug race: another request provisioned the workspace already.
    const raced = await prisma.workspaceMember.findFirst({
      where: { userId: user.id, workspace: { isPersonal: true } },
    });
    if (raced) return raced;
    throw error;
  }
}
