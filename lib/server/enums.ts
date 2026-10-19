export const WORKSPACE_ROLES = ["Owner", "Admin", "Member", "Viewer"] as const;
export const INVITABLE_WORKSPACE_ROLES = ["Admin", "Member", "Viewer"] as const;
export const TASK_STATUSES = [
  "Backlog",
  "To Do",
  "In Progress",
  "In Review",
  "Blocked",
  "Done",
] as const;
export const TASK_PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
export const TASK_TYPES = ["Feature", "Bug", "Maintenance", "Support", "Research"] as const;
export const PROJECT_STATUSES = ["Active", "On Hold", "Completed", "Archived"] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskType = (typeof TASK_TYPES)[number];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

function enumToken(value: string): string {
  return value.toLowerCase().replace(/[ _-]/g, "");
}

/**
 * Resolve user supplied enum input ("in_progress", "In Progress", "InProgress")
 * to the canonical backing value. Unrecognized values are returned unchanged
 * so validation reports them as invalid.
 */
export function normalizeEnumValue(value: unknown, values: readonly string[]): unknown {
  if (typeof value !== "string") return value;
  const needle = enumToken(value);
  for (const candidate of values) {
    if (needle === enumToken(candidate)) return candidate;
  }
  return value;
}
