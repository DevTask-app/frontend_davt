import type {
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  TaskType,
  WorkspaceRole,
} from "./types";

export const TASK_STATUSES: TaskStatus[] = [
  "Backlog",
  "To Do",
  "In Progress",
  "In Review",
  "Blocked",
  "Done",
];

export const TASK_PRIORITIES: TaskPriority[] = [
  "Low",
  "Medium",
  "High",
  "Critical",
];

export const TASK_TYPES: TaskType[] = [
  "Feature",
  "Bug",
  "Maintenance",
  "Support",
  "Research",
];

export const PROJECT_STATUSES: ProjectStatus[] = [
  "Active",
  "On Hold",
  "Completed",
  "Archived",
];

export const WORKSPACE_ROLES: WorkspaceRole[] = [
  "Owner",
  "Admin",
  "Member",
  "Viewer",
];

export const INVITABLE_WORKSPACE_ROLES: WorkspaceRole[] = [
  "Admin",
  "Member",
  "Viewer",
];

export const WORKSPACE_ROLE_LABELS: Record<WorkspaceRole, string> = {
  Owner: "Owner",
  Admin: "Admin",
  Member: "Member",
  Viewer: "Viewer",
};

export const WORKSPACE_ROLE_DESCRIPTIONS: Record<WorkspaceRole, string> = {
  Owner: "Pemilik workspace, akses penuh.",
  Admin: "Dapat mengelola anggota dan pengaturan.",
  Member: "Dapat membuat dan mengubah project serta task.",
  Viewer: "Hanya dapat melihat, tidak dapat mengubah.",
};

export const WORKSPACE_ROLE_STYLES: Record<WorkspaceRole, string> = {
  Owner:
    "bg-violet-100 text-violet-700 ring-violet-500/20 dark:bg-violet-500/15 dark:text-violet-300",
  Admin:
    "bg-blue-100 text-blue-700 ring-blue-500/20 dark:bg-blue-500/15 dark:text-blue-300",
  Member:
    "bg-zinc-100 text-zinc-700 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300",
  Viewer:
    "bg-amber-100 text-amber-800 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300",
};

export const STATUS_STYLES: Record<TaskStatus, string> = {
  Backlog: "bg-zinc-100 text-zinc-700 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300",
  "To Do": "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300",
  "In Progress":
    "bg-blue-100 text-blue-700 ring-blue-500/20 dark:bg-blue-500/15 dark:text-blue-300",
  "In Review":
    "bg-violet-100 text-violet-700 ring-violet-500/20 dark:bg-violet-500/15 dark:text-violet-300",
  Blocked: "bg-red-100 text-red-700 ring-red-500/20 dark:bg-red-500/15 dark:text-red-300",
  Done: "bg-green-100 text-green-700 ring-green-500/20 dark:bg-green-500/15 dark:text-green-300",
};

export const PRIORITY_STYLES: Record<TaskPriority, string> = {
  Low: "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300",
  Medium:
    "bg-amber-100 text-amber-800 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300",
  High: "bg-orange-100 text-orange-800 ring-orange-500/20 dark:bg-orange-500/15 dark:text-orange-300",
  Critical: "bg-red-100 text-red-700 ring-red-500/20 dark:bg-red-500/15 dark:text-red-300",
};

export const TYPE_STYLES: Record<TaskType, string> = {
  Feature: "bg-blue-100 text-blue-700 ring-blue-500/20 dark:bg-blue-500/15 dark:text-blue-300",
  Bug: "bg-red-100 text-red-700 ring-red-500/20 dark:bg-red-500/15 dark:text-red-300",
  Maintenance:
    "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300",
  Support:
    "bg-teal-100 text-teal-700 ring-teal-500/20 dark:bg-teal-500/15 dark:text-teal-300",
  Research:
    "bg-violet-100 text-violet-700 ring-violet-500/20 dark:bg-violet-500/15 dark:text-violet-300",
};

export const PROJECT_STATUS_STYLES: Record<ProjectStatus, string> = {
  Active:
    "bg-green-100 text-green-700 ring-green-500/20 dark:bg-green-500/15 dark:text-green-300",
  "On Hold":
    "bg-amber-100 text-amber-800 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300",
  Completed:
    "bg-blue-100 text-blue-700 ring-blue-500/20 dark:bg-blue-500/15 dark:text-blue-300",
  Archived:
    "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300",
};

export const ACTIVITY_ACTIONS: Record<string, string> = {
  created: "Task dibuat",
  updated: "Task diperbarui",
  status_changed: "Status diubah",
  priority_changed: "Prioritas diubah",
  attachment_added: "Lampiran ditambahkan",
  attachment_removed: "Lampiran dihapus",
};

export const FIELD_LABELS: Record<string, string> = {
  title: "Judul",
  description: "Deskripsi",
  type: "Tipe",
  status: "Status",
  priority: "Prioritas",
  due_date: "Tenggat",
  estimated_hours: "Estimasi jam",
  actual_hours: "Aktual jam",
  parent_task_id: "Parent task",
  assignee_id: "Penanggung jawab",
  blocked_reason: "Alasan terblokir",
  attachment: "Lampiran",
};
