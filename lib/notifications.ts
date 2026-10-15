import type { AppNotification } from "./types";

const FALLBACK_HREF = "/notifications";

/**
 * Resolve a safe in-app path for a notification, preferring the backend-provided
 * absolute URL (e.g. `http://localhost:3000/tasks/5`) and falling back to the
 * task route when only `task_id` is present.
 */
export function notificationHref(notification: AppNotification): string {
  const { url, task_id: taskId } = notification.data;

  if (url) {
    try {
      const parsed = new URL(url, "http://localhost");
      return parsed.pathname + parsed.search;
    } catch {
      return url.startsWith("/") ? url : `/${url}`;
    }
  }

  if (taskId !== undefined && taskId !== null) {
    return `/tasks/${taskId}`;
  }

  return FALLBACK_HREF;
}

export function notificationTitle(notification: AppNotification): string {
  return notification.data.task_title ?? "Notifikasi baru";
}

export function notificationProject(
  notification: AppNotification,
): string | null {
  return notification.data.project_name ?? null;
}

export function notificationActor(notification: AppNotification): string | null {
  return notification.data.assigned_by ?? null;
}

/**
 * Workspace that owns the notification's target, used to switch the active
 * workspace before navigating so scoped routes (e.g. `/tasks/{id}`) resolve.
 */
export function notificationWorkspaceId(
  notification: AppNotification,
): number | null {
  return notification.data.workspace_id ?? null;
}

export function isUnread(notification: AppNotification): boolean {
  return notification.read_at === null;
}
