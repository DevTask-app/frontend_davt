import type {
  Notification,
  Project,
  Task,
  TaskActivityLog,
  TaskAttachment,
  User,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember,
} from "@prisma/client";
import { createSignedStorageUrl } from "./storage";

/** Laravel Carbon toIso8601String(): "2026-10-19T02:15:34+00:00" (no milliseconds). */
export function isoDateTime(value: Date | null | undefined): string | null {
  if (!value) return null;
  const pad = (input: number) => String(input).padStart(2, "0");
  return (
    `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}` +
    `T${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}:${pad(value.getUTCSeconds())}+00:00`
  );
}

/** Laravel date cast serialization: "2026-10-19". */
export function dateOnly(value: Date | null | undefined): string | null {
  if (!value) return null;
  const pad = (input: number) => String(input).padStart(2, "0");
  return (
    `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`
  );
}

/** Laravel decimal:2 cast serializes Decimals as "16.00" strings. */
export function decimalString(
  value: { toFixed(places: number): string } | number | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  return value.toFixed(2);
}

export interface UserPayload {
  id: number;
  name: string;
  email: string;
  role: string;
  email_verified_at: string | null;
  created_at: string | null;
}

export function userResource(user: User): UserPayload {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    email_verified_at: isoDateTime(user.emailVerifiedAt),
    created_at: isoDateTime(user.createdAt),
  };
}

export interface WorkspacePayload {
  id: number;
  name: string;
  slug: string;
  is_personal: boolean;
  role: string | null;
  members_count?: number;
  projects_count?: number;
  created_at: string | null;
}

export function workspaceResource(
  workspace: Workspace,
  options: { role?: string | null; membersCount?: number; projectsCount?: number } = {},
): WorkspacePayload {
  const payload: WorkspacePayload = {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    is_personal: workspace.isPersonal,
    role: options.role ?? null,
    created_at: isoDateTime(workspace.createdAt),
  };
  if (options.membersCount !== undefined) payload.members_count = options.membersCount;
  if (options.projectsCount !== undefined) payload.projects_count = options.projectsCount;
  return payload;
}

export interface MemberPayload {
  id: number;
  name: string;
  email: string;
  role: string | null;
  joined_at: string | null;
}

export function memberResource(member: WorkspaceMember & { user: User }): MemberPayload {
  return {
    id: member.userId,
    name: member.user.name,
    email: member.user.email,
    role: member.role,
    joined_at: isoDateTime(member.joinedAt),
  };
}

export interface InvitationPayload {
  id: number;
  workspace_id: number;
  email: string;
  role: string;
  token: string;
  accept_url: string;
  is_pending: boolean;
  expires_at: string | null;
  accepted_at: string | null;
  invited_by?: UserPayload;
  created_at: string | null;
}

export function invitationResource(
  invitation: WorkspaceInvitation,
  options: { inviter?: User | null } = {},
): InvitationPayload {
  const frontendUrl = (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const now = new Date();
  const isPending =
    invitation.acceptedAt === null &&
    (invitation.expiresAt === null || invitation.expiresAt.getTime() > now.getTime());
  const payload: InvitationPayload = {
    id: invitation.id,
    workspace_id: invitation.workspaceId,
    email: invitation.email,
    role: invitation.role,
    token: invitation.token,
    accept_url: `${frontendUrl}/invitations/${invitation.token}`,
    is_pending: isPending,
    expires_at: isoDateTime(invitation.expiresAt),
    accepted_at: isoDateTime(invitation.acceptedAt),
    created_at: isoDateTime(invitation.createdAt),
  };
  if (options.inviter) payload.invited_by = userResource(options.inviter);
  return payload;
}

export interface ProjectPayload {
  id: number;
  user_id: number;
  workspace_id: number;
  created_by: number;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  due_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  tasks_count?: number;
  tasks?: TaskPayload[];
}

export function projectResource(
  project: Project,
  options: { tasksCount?: number; tasks?: TaskPayload[] } = {},
): ProjectPayload {
  const payload: ProjectPayload = {
    id: project.id,
    user_id: project.userId,
    workspace_id: project.workspaceId,
    created_by: project.createdBy,
    name: project.name,
    description: project.description,
    status: project.status,
    start_date: dateOnly(project.startDate),
    due_date: dateOnly(project.dueDate),
    created_at: isoDateTime(project.createdAt),
    updated_at: isoDateTime(project.updatedAt),
  };
  if (options.tasksCount !== undefined) payload.tasks_count = options.tasksCount;
  if (options.tasks !== undefined) payload.tasks = options.tasks;
  return payload;
}

export interface TaskPayload {
  id: number;
  project_id: number;
  created_by: number;
  updated_by: number | null;
  assignee_id: number | null;
  parent_task_id: number | null;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  due_date: string | null;
  estimated_hours: string | null;
  actual_hours: string | null;
  completed_at: string | null;
  blocked_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
  project?: ProjectPayload;
  assignee?: UserPayload;
  subtasks?: TaskPayload[];
  activity_logs?: ActivityLogPayload[];
  attachments?: TaskAttachmentPayload[];
}

type DecimalLike = Parameters<typeof decimalString>[0];

export function taskResource(
  task: Task & {
    project?: Project;
    assignee?: User | null;
    subtasks?: Task[];
    logs?: TaskActivityLog[];
    attachments?: TaskAttachment[];
  },
): TaskPayload {
  const payload: TaskPayload = {
    id: task.id,
    project_id: task.projectId,
    created_by: task.createdBy,
    updated_by: task.updatedBy,
    assignee_id: task.assigneeId,
    parent_task_id: task.parentTaskId,
    title: task.title,
    description: task.description,
    type: task.type,
    status: task.status,
    priority: task.priority,
    due_date: dateOnly(task.dueDate),
    estimated_hours: decimalString(task.estimatedHours as DecimalLike),
    actual_hours: decimalString(task.actualHours as DecimalLike),
    completed_at: isoDateTime(task.completedAt),
    blocked_reason: task.blockedReason,
    created_at: isoDateTime(task.createdAt),
    updated_at: isoDateTime(task.updatedAt),
  };
  if (task.project) payload.project = projectResource(task.project);
  if (task.assignee) payload.assignee = userResource(task.assignee);
  if (task.subtasks) payload.subtasks = task.subtasks.map((subtask) => taskResource(subtask));
  if (task.logs) payload.activity_logs = task.logs.map(activityLogResource);
  if (task.attachments) payload.attachments = task.attachments.map(taskAttachmentResource);
  return payload;
}

export interface ActivityLogPayload {
  id: number;
  task_id: number;
  user_id: number;
  action: string;
  changes: Record<string, unknown>;
  created_at: string | null;
}

export function activityLogResource(
  log: TaskActivityLog & { user?: User },
): ActivityLogPayload {
  return {
    id: log.id,
    task_id: log.taskId,
    user_id: log.userId,
    action: log.action,
    changes: log.changes as Record<string, unknown>,
    created_at: isoDateTime(log.createdAt),
  };
}

export interface TaskAttachmentPayload {
  id: number;
  task_id: number;
  user_id: number;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  created_at: string | null;
}

export function taskAttachmentResource(attachment: TaskAttachment): TaskAttachmentPayload {
  const origin = (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return {
    id: attachment.id,
    task_id: attachment.taskId,
    user_id: attachment.userId,
    original_name: attachment.originalName,
    mime_type: attachment.mimeType,
    size: attachment.size,
    url: createSignedStorageUrl(attachment.path, origin),
    created_at: isoDateTime(attachment.createdAt),
  };
}

export interface NotificationPayload {
  id: string;
  type: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string | null;
}

export function notificationResource(notification: Notification): NotificationPayload {
  return {
    id: notification.id,
    type: notification.type,
    data: (notification.data ?? {}) as Record<string, unknown>,
    read_at: isoDateTime(notification.readAt),
    created_at: isoDateTime(notification.createdAt),
  };
}
