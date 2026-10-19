import type {
  Project,
  Task,
  User,
  Workspace,
  WorkspaceMember,
} from "@prisma/client";
import { prisma } from "./db";
import { forbidden, modelNotFound, notFound, unauthenticated, validationError } from "./http";
import { verifyAccessToken, verifyRefreshToken } from "./jwt";
import { ensurePersonalWorkspace } from "./workspace-actions";

export function isAdmin(user: User): boolean {
  return user.role === "Admin";
}

async function userFromHeader(
  request: Request,
  verify: (token: string) => Promise<number | null>,
): Promise<User> {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) throw unauthenticated();
  const token = header.slice("Bearer ".length).trim();
  if (token === "") throw unauthenticated();
  const userId = await verify(token);
  if (userId === null) throw unauthenticated();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthenticated();
  return user;
}

export function requireUser(request: Request): Promise<User> {
  return userFromHeader(request, verifyAccessToken);
}

/** Accepts tokens expired within the refresh window (tymon refresh semantics). */
export function requireRefreshUser(request: Request): Promise<User> {
  return userFromHeader(request, verifyRefreshToken);
}

// ---------------------------------------------------------------------------
// Active workspace middleware
// ---------------------------------------------------------------------------

export interface ActiveWorkspaceContext {
  workspace: Workspace;
  membership: WorkspaceMember;
}

export async function resolveActiveWorkspace(
  user: User,
  request: Request,
): Promise<ActiveWorkspaceContext> {
  const header = request.headers.get("x-workspace-id");
  if (header !== null && header.trim() !== "") {
    if (!/^\d+$/.test(header.trim())) throw notFound("Workspace not found.");
    const workspaceId = Number(header.trim());
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw notFound("Workspace not found.");
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    });
    if (!membership) throw forbidden("You are not a member of this workspace.");
    return { workspace, membership };
  }

  const membership = await ensurePersonalWorkspace(user);
  const workspace = await prisma.workspace.findUnique({
    where: { id: membership.workspaceId },
  });
  if (!workspace) throw notFound("Workspace not found.");
  return { workspace, membership };
}

// ---------------------------------------------------------------------------
// Role helpers (WorkspaceMember::managesWorkspace / contributes)
// ---------------------------------------------------------------------------

export function managesWorkspace(membership: WorkspaceMember): boolean {
  return membership.role === "Owner" || membership.role === "Admin";
}

export function contributes(membership: WorkspaceMember): boolean {
  return membership.role !== "Viewer";
}

export function isOwner(membership: WorkspaceMember): boolean {
  return membership.role === "Owner";
}

async function membershipOf(
  userId: number,
  workspaceId: number,
): Promise<WorkspaceMember | null> {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}

// ---------------------------------------------------------------------------
// Route model binding (membership-scoped workspaces, visibleTo projects/tasks)
// ---------------------------------------------------------------------------

export async function findWorkspaceForUser(
  user: User,
  workspaceId: number,
): Promise<Workspace> {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) throw modelNotFound("Workspace", workspaceId);
  if (isAdmin(user)) return workspace;
  const membership = await membershipOf(user.id, workspace.id);
  if (!membership) throw modelNotFound("Workspace", workspaceId);
  return workspace;
}

export async function findProjectForUser(
  user: User,
  projectId: number,
): Promise<Project> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw modelNotFound("Project", projectId);
  if (isAdmin(user)) return project;
  const membership = await membershipOf(user.id, project.workspaceId);
  if (!membership) throw modelNotFound("Project", projectId);
  return project;
}

export type TaskWithProject = Task & { project: Project };

export async function findTaskForUser(user: User, taskId: number): Promise<TaskWithProject> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
  if (!task || task.deletedAt !== null) throw modelNotFound("Task", taskId);
  if (isAdmin(user)) return task;
  const membership = await membershipOf(user.id, task.project.workspaceId);
  if (!membership) throw modelNotFound("Task", taskId);
  return task;
}

// ---------------------------------------------------------------------------
// Policy checks
// ---------------------------------------------------------------------------

/** WorkspacePolicy::view — any membership (admins included). */
export async function authorizeWorkspaceView(user: User, workspaceId: number): Promise<WorkspaceMember> {
  const membership = await membershipOf(user.id, workspaceId);
  if (!membership) throw forbidden("This action is unauthorized.");
  return membership;
}

export async function authorizeWorkspaceManage(
  user: User,
  workspaceId: number,
): Promise<WorkspaceMember> {
  const membership = await membershipOf(user.id, workspaceId);
  if (!membership || !managesWorkspace(membership)) {
    throw forbidden("This action is unauthorized.");
  }
  return membership;
}

/** ProjectPolicy::update — contributes to the PROJECT's workspace. */
export async function authorizeProjectUpdate(
  user: User,
  project: Project,
): Promise<WorkspaceMember> {
  const membership = await membershipOf(user.id, project.workspaceId);
  if (!membership || !contributes(membership)) {
    throw forbidden("This action is unauthorized.");
  }
  return membership;
}

/** ProjectPolicy::create — contributes to the ACTIVE workspace. */
export function authorizeContributes(active: ActiveWorkspaceContext): WorkspaceMember {
  if (!contributes(active.membership)) {
    throw forbidden("This action is unauthorized.");
  }
  return active.membership;
}

/** ProjectPolicy::delete / TaskPolicy::delete — manages or creator. */
export function authorizeManageOrCreator(
  membership: WorkspaceMember | null,
  creatorId: number,
  userId: number,
): void {
  const manages = membership !== null && managesWorkspace(membership);
  if (!manages && creatorId !== userId) {
    throw forbidden("This action is unauthorized.");
  }
}

/** TaskPolicy::update — manages the task's workspace. */
export async function authorizeTaskUpdate(
  user: User,
  task: { project: Project },
): Promise<WorkspaceMember> {
  const membership = await membershipOf(user.id, task.project.workspaceId);
  if (!membership || !managesWorkspace(membership)) {
    throw forbidden("This action is unauthorized.");
  }
  return membership;
}

/** TaskPolicy::updateStatus — manages, or contributes AND is the assignee. */
export async function authorizeTaskStatusUpdate(
  user: User,
  task: TaskWithProject,
): Promise<void> {
  const membership = await membershipOf(user.id, task.project.workspaceId);
  const manages = membership !== null && managesWorkspace(membership);
  const assignee =
    membership !== null && contributes(membership) && task.assigneeId === user.id;
  if (!manages && !assignee) {
    throw forbidden("This action is unauthorized.");
  }
}

/** TaskPolicy::create — contributes to the PROJECT's workspace. */
export async function authorizeTaskCreate(
  user: User,
  project: Project,
): Promise<void> {
  const membership = await membershipOf(user.id, project.workspaceId);
  if (!membership || !contributes(membership)) {
    throw forbidden("This action is unauthorized.");
  }
}

// ---------------------------------------------------------------------------
// Database-backed validation rules (Laravel Rule::exists)
// ---------------------------------------------------------------------------

export async function assertProjectInUserWorkspaces(
  user: User,
  projectId: number,
  errors: Record<string, string[]>,
): Promise<Project | null> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    errors.project_id = ["The selected project is invalid."];
    return null;
  }
  if (!isAdmin(user)) {
    const membership = await membershipOf(user.id, project.workspaceId);
    if (!membership) {
      errors.project_id = ["The selected project is invalid."];
      return null;
    }
  }
  return project;
}

export async function assertAssigneeInWorkspace(
  workspaceId: number,
  assigneeId: number,
  errors: Record<string, string[]>,
): Promise<void> {
  const membership = await membershipOf(assigneeId, workspaceId);
  if (!membership) {
    errors.assignee_id = ["The selected assignee_id is invalid."];
  }
}

export async function assertParentTaskInProject(
  parentTaskId: number,
  targetProjectId: number,
  taskId: number | null,
  errors: Record<string, string[]>,
): Promise<void> {
  const parent = await prisma.task.findUnique({ where: { id: parentTaskId } });
  if (!parent) return; // exists rule on tasks.id passed; soft-deleted still "exists" in Laravel
  if (parent.projectId !== targetProjectId) {
    errors.parent_task_id = ["The parent task must belong to the same project."];
    return;
  }
  if (taskId !== null && parent.id === taskId) {
    errors.parent_task_id = ["A task may not be its own parent."];
  }
}

export async function assertEmailAvailable(
  email: string,
  errors: Record<string, string[]>,
): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    errors.email = ["The email has already been taken."];
  }
}

export function throwIfErrors(errors: Record<string, string[]>): void {
  if (Object.keys(errors).length > 0) throw validationError(errors);
}
