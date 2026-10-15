export type TaskStatus =
  | "Backlog"
  | "To Do"
  | "In Progress"
  | "In Review"
  | "Blocked"
  | "Done";

export type TaskPriority = "Low" | "Medium" | "High" | "Critical";

export type TaskType =
  | "Feature"
  | "Bug"
  | "Maintenance"
  | "Support"
  | "Research";

export type ProjectStatus = "Active" | "On Hold" | "Completed" | "Archived";

export type UserRole = "Admin" | "User";

export type WorkspaceRole = "Owner" | "Admin" | "Member" | "Viewer";

export interface User {
  id: number;
  name: string;
  email: string;
  role?: UserRole;
  email_verified_at: string | null;
  created_at: string | null;
  workspaces?: Workspace[];
}

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  is_personal: boolean;
  role: WorkspaceRole | null;
  members_count?: number;
  projects_count?: number;
  created_at: string | null;
}

export interface WorkspaceMember {
  id: number;
  name: string;
  email: string;
  role: WorkspaceRole | null;
  joined_at: string | null;
}

export interface WorkspaceInvitation {
  id: number;
  workspace_id: number;
  email: string;
  role: WorkspaceRole;
  token: string;
  is_pending: boolean;
  expires_at: string | null;
  accepted_at: string | null;
  invited_by?: User;
  created_at: string | null;
}

export interface Project {
  id: number;
  user_id: number;
  workspace_id: number;
  created_by: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  tasks_count?: number;
  tasks?: Task[];
}

export interface Task {
  id: number;
  project_id: number;
  created_by: number;
  updated_by: number | null;
  assignee_id: number | null;
  parent_task_id: number | null;
  title: string;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  estimated_hours: string | null;
  actual_hours: string | null;
  completed_at: string | null;
  blocked_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
  project?: Project;
  assignee?: User;
  subtasks?: Task[];
  activity_logs?: TaskActivityLog[];
  attachments?: TaskAttachment[];
}

export interface TaskAttachment {
  id: number;
  task_id: number;
  user_id: number;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  created_at: string | null;
}

export interface TaskChange {
  old: string | number | null;
  new: string | number | null;
}

export interface TaskActivityLog {
  id: number;
  task_id: number;
  user_id: number;
  action: string;
  changes: Record<string, TaskChange>;
  created_at: string | null;
}

export interface PaginationLink {
  url: string | null;
  label: string;
  active: boolean;
}

export interface Paginated<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
}

export interface StatusCounts {
  [key: string]: number;
}

export interface DashboardSummary {
  projects: {
    total: number;
    by_status: Record<ProjectStatus, number>;
  };
  tasks: {
    total: number;
    by_status: Record<TaskStatus, number>;
    by_priority: Record<TaskPriority, number>;
    overdue: number;
    completed_this_week: number;
  };
}

export interface WeeklyReport {
  period: {
    start: string;
    end: string;
  };
  created: number;
  completed: number;
  completed_by_day: Record<string, number>;
}
