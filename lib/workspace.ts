import type { Project, Task, Workspace, WorkspaceRole } from "./types";

const STORAGE_KEY = "davt_workspace";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getStoredWorkspaceId(): number | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function setStoredWorkspaceId(id: number | null): void {
  if (!isBrowser()) return;
  if (id === null) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, String(id));
}

export function managesWorkspace(role: WorkspaceRole | null | undefined): boolean {
  return role === "Owner" || role === "Admin";
}

export function contributesToWorkspace(
  role: WorkspaceRole | null | undefined,
): boolean {
  return role !== null && role !== undefined && role !== "Viewer";
}

export function canEditTaskDetails(
  role: WorkspaceRole | null | undefined,
): boolean {
  return managesWorkspace(role);
}

function isAssignedTo(
  task: Pick<Task, "assignee_id">,
  userId: number | null | undefined,
): boolean {
  return (
    typeof userId === "number" &&
    task.assignee_id !== null &&
    task.assignee_id !== undefined &&
    task.assignee_id === userId
  );
}

export function canChangeTaskStatus(
  role: WorkspaceRole | null | undefined,
  task: Pick<Task, "assignee_id">,
  userId: number | null | undefined,
): boolean {
  return (
    managesWorkspace(role) ||
    (contributesToWorkspace(role) && isAssignedTo(task, userId))
  );
}

export function canManageTaskAttachments(
  role: WorkspaceRole | null | undefined,
  task: Pick<Task, "assignee_id">,
  userId: number | null | undefined,
): boolean {
  return canChangeTaskStatus(role, task, userId);
}

export function canEditProject(role: WorkspaceRole | null | undefined): boolean {
  return contributesToWorkspace(role);
}

export function canDeleteProject(
  role: WorkspaceRole | null | undefined,
  project: Pick<Project, "created_by">,
  userId: number | null | undefined,
): boolean {
  return (
    managesWorkspace(role) ||
    (typeof userId === "number" && project.created_by === userId)
  );
}

export function isPersonalWorkspace(
  workspace: Pick<Workspace, "is_personal"> | null | undefined,
): boolean {
  return workspace?.is_personal === true;
}

export function resolveActiveWorkspaceId(
  workspaces: Workspace[],
  preferredId: number | null,
): number | null {
  if (preferredId !== null && workspaces.some((item) => item.id === preferredId)) {
    return preferredId;
  }
  const personal = workspaces.find((item) => item.is_personal);
  return personal?.id ?? workspaces[0]?.id ?? null;
}
