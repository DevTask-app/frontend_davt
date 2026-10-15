import { clearToken, getToken, setToken } from "./auth";
import type {
  DashboardSummary,
  Paginated,
  Project,
  ProjectStatus,
  Task,
  TaskActivityLog,
  TaskAttachment,
  TaskPriority,
  TaskStatus,
  TaskType,
  User,
  WeeklyReport,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceRole,
} from "./types";

const API_BASE = "/api/backend";

let activeWorkspaceId: number | null = null;

export function setActiveWorkspaceId(id: number | null): void {
  activeWorkspaceId = id;
}

export function getActiveWorkspaceId(): number | null {
  return activeWorkspaceId;
}

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(
    status: number,
    message: string,
    errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }

  firstError(field?: string): string {
    if (field && this.errors[field]?.length) return this.errors[field][0];
    const first = Object.values(this.errors)[0];
    if (first?.length) return first[0];
    return this.message;
  }

  flattenErrors(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [field, messages] of Object.entries(this.errors)) {
      if (messages.length) result[field] = messages[0];
    }
    return result;
  }
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshToken(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) return false;
  const data = (await response.json()) as TokenResponse;
  setToken(data.access_token, data.expires_in);
  return true;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
  retry?: boolean;
}

function buildUrl(
  path: string,
  query?: RequestOptions["query"],
): string {
  const url = new URL(
    `${API_BASE}${path}`,
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000",
  );
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.pathname + url.search;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, query, auth = true, retry = true } = options;

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (activeWorkspaceId !== null) {
      headers["X-Workspace-Id"] = String(activeWorkspaceId);
    }
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? (body as FormData)
          : JSON.stringify(body),
  });

  if (response.status === 401 && auth && retry) {
    refreshPromise ??= refreshToken().finally(() => {
      refreshPromise = null;
    });
    const refreshed = await refreshPromise;
    if (refreshed) {
      return request<T>(path, { ...options, retry: false });
    }
    clearToken();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    const message =
      (payload?.message as string | undefined) ??
      `Request gagal (${response.status})`;
    const errors =
      (payload?.errors as Record<string, string[]> | undefined) ?? {};
    throw new ApiError(response.status, message, errors);
  }

  return payload as T;
}

export const api = {
  register(input: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) {
    return request<TokenResponse>("/register", {
      method: "POST",
      body: input,
      auth: false,
    });
  },

  login(input: { email: string; password: string }) {
    return request<TokenResponse>("/login", {
      method: "POST",
      body: input,
      auth: false,
    });
  },

  logout() {
    return request<{ message: string }>("/logout", { method: "POST" });
  },

  me() {
    return request<{ data: User }>("/me");
  },

  // Workspaces
  listWorkspaces() {
    return request<{ data: Workspace[] }>("/workspaces");
  },

  getWorkspace(id: number | string) {
    return request<{ data: Workspace }>(`/workspaces/${id}`);
  },

  createWorkspace(input: { name: string }) {
    return request<{ data: Workspace }>("/workspaces", {
      method: "POST",
      body: input,
    });
  },

  updateWorkspace(id: number | string, input: { name: string }) {
    return request<{ data: Workspace }>(`/workspaces/${id}`, {
      method: "PATCH",
      body: input,
    });
  },

  deleteWorkspace(id: number | string) {
    return request<void>(`/workspaces/${id}`, { method: "DELETE" });
  },

  listWorkspaceMembers(id: number | string) {
    return request<{ data: WorkspaceMember[] }>(`/workspaces/${id}/members`);
  },

  updateWorkspaceMember(
    id: number | string,
    memberId: number | string,
    input: { role: WorkspaceRole },
  ) {
    return request<{ data: WorkspaceMember }>(
      `/workspaces/${id}/members/${memberId}`,
      { method: "PATCH", body: input },
    );
  },

  removeWorkspaceMember(id: number | string, memberId: number | string) {
    return request<void>(`/workspaces/${id}/members/${memberId}`, {
      method: "DELETE",
    });
  },

  listWorkspaceInvitations(id: number | string) {
    return request<{ data: WorkspaceInvitation[] }>(
      `/workspaces/${id}/invitations`,
    );
  },

  createWorkspaceInvitation(
    id: number | string,
    input: { email: string; role: WorkspaceRole },
  ) {
    return request<{ data: WorkspaceInvitation }>(
      `/workspaces/${id}/invitations`,
      { method: "POST", body: input },
    );
  },

  revokeWorkspaceInvitation(id: number | string, invitationId: number | string) {
    return request<void>(`/workspaces/${id}/invitations/${invitationId}`, {
      method: "DELETE",
    });
  },

  acceptWorkspaceInvitation(token: string) {
    return request<{ data: Workspace }>(`/invitations/${token}/accept`, {
      method: "POST",
    });
  },

  // Dashboard
  dashboardSummary() {
    return request<{ data: DashboardSummary }>("/dashboard/summary");
  },

  dashboardUpcoming(limit = 5) {
    return request<{ data: Task[] }>("/dashboard/upcoming", {
      query: { limit },
    });
  },

  weeklyReport() {
    return request<{ data: WeeklyReport }>("/reports/weekly");
  },

  // Projects
  listProjects(params: { page?: number; per_page?: number } = {}) {
    return request<Paginated<Project>>("/projects", { query: params });
  },

  getProject(id: number | string) {
    return request<{ data: Project }>(`/projects/${id}`);
  },

  createProject(input: {
    name: string;
    description?: string | null;
    status?: ProjectStatus;
    start_date?: string | null;
    due_date?: string | null;
  }) {
    return request<{ data: Project }>("/projects", {
      method: "POST",
      body: input,
    });
  },

  updateProject(
    id: number | string,
    input: Partial<{
      name: string;
      description: string | null;
      status: ProjectStatus;
      start_date: string | null;
      due_date: string | null;
    }>,
  ) {
    return request<{ data: Project }>(`/projects/${id}`, {
      method: "PATCH",
      body: input,
    });
  },

  deleteProject(id: number | string) {
    return request<void>(`/projects/${id}`, { method: "DELETE" });
  },

  // Tasks
  listTasks(
    params: Partial<{
      status: TaskStatus;
      priority: TaskPriority;
      type: TaskType;
      project_id: number;
      assignee_id: number;
      due_before: string;
      due_after: string;
      sort: string;
      direction: "asc" | "desc";
      page: number;
      per_page: number;
    }> = {},
  ) {
    return request<Paginated<Task>>("/tasks", { query: params });
  },

  listProjectTasks(
    projectId: number | string,
    params: Partial<{ page: number; per_page: number }> = {},
  ) {
    return request<Paginated<Task>>(`/projects/${projectId}/tasks`, {
      query: params,
    });
  },

  getTask(id: number | string) {
    return request<{ data: Task }>(`/tasks/${id}`);
  },

  createTask(input: {
    project_id: number;
    title: string;
    description?: string | null;
    type: TaskType;
    status?: TaskStatus;
    priority?: TaskPriority;
    due_date?: string | null;
    estimated_hours?: number | string | null;
    parent_task_id?: number | null;
    blocked_reason?: string | null;
    assignee_id?: number | null;
  }) {
    return request<{ data: Task }>("/tasks", { method: "POST", body: input });
  },

  createProjectTask(
    projectId: number | string,
    input: Partial<{
      title: string;
      description: string | null;
      type: TaskType;
      status: TaskStatus;
      priority: TaskPriority;
      due_date: string | null;
      estimated_hours: number | string | null;
    }>,
  ) {
    return request<{ data: Task }>(`/projects/${projectId}/tasks`, {
      method: "POST",
      body: input,
    });
  },

  updateTask(
    id: number | string,
    input: Partial<{
      title: string;
      description: string | null;
      type: TaskType;
      status: TaskStatus;
      priority: TaskPriority;
      due_date: string | null;
      estimated_hours: number | string | null;
      actual_hours: number | string | null;
      parent_task_id: number | null;
      blocked_reason: string | null;
      assignee_id: number | null;
    }>,
  ) {
    return request<{ data: Task }>(`/tasks/${id}`, {
      method: "PATCH",
      body: input,
    });
  },

  updateTaskStatus(id: number | string, status: TaskStatus) {
    return request<{ data: Task }>(`/tasks/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
  },

  updateTaskPriority(id: number | string, priority: TaskPriority) {
    return request<{ data: Task }>(`/tasks/${id}/priority`, {
      method: "PATCH",
      body: { priority },
    });
  },

  deleteTask(id: number | string) {
    return request<void>(`/tasks/${id}`, { method: "DELETE" });
  },

  taskActivities(id: number | string) {
    return request<{ data: TaskActivityLog[] }>(`/tasks/${id}/activities`);
  },

  // Task attachments
  uploadTaskAttachment(taskId: number | string, file: File) {
    const form = new FormData();
    form.append("file", file);
    return request<{ data: TaskAttachment }>(`/tasks/${taskId}/attachments`, {
      method: "POST",
      body: form,
    });
  },

  deleteTaskAttachment(id: number | string) {
    return request<void>(`/attachments/${id}`, { method: "DELETE" });
  },
};
