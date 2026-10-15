import { describe, expect, it } from "vitest";
import {
  isUnread,
  notificationActor,
  notificationHref,
  notificationProject,
  notificationTitle,
  notificationWorkspaceId,
} from "@/lib/notifications";
import type { AppNotification } from "@/lib/types";

function makeNotification(
  data: AppNotification["data"],
  overrides: Partial<AppNotification> = {},
): AppNotification {
  return {
    id: "n-1",
    type: "App\\Notifications\\TaskAssigned",
    data,
    read_at: null,
    created_at: "2026-10-15T06:28:41+00:00",
    ...overrides,
  };
}

describe("notificationHref", () => {
  it("uses the path from the backend-provided absolute url", () => {
    const notification = makeNotification({
      task_id: 5,
      url: "http://localhost:3000/tasks/5",
    });
    expect(notificationHref(notification)).toBe("/tasks/5");
  });

  it("keeps query strings from the provided url", () => {
    const notification = makeNotification({
      url: "http://localhost:3000/tasks/5?tab=log",
    });
    expect(notificationHref(notification)).toBe("/tasks/5?tab=log");
  });

  it("falls back to the task route when no url is present", () => {
    expect(notificationHref(makeNotification({ task_id: 9 }))).toBe("/tasks/9");
  });

  it("falls back to the notifications page when nothing is available", () => {
    expect(notificationHref(makeNotification({}))).toBe("/notifications");
  });

  it("accepts a relative url", () => {
    const notification = makeNotification({ url: "tasks/7" });
    expect(notificationHref(notification)).toBe("/tasks/7");
  });
});

describe("notification accessors", () => {
  it("reads the title, actor and project from the payload", () => {
    const notification = makeNotification({
      task_title: "Fix login bug",
      assigned_by: "Dastin",
      project_name: "Demo Project",
    });
    expect(notificationTitle(notification)).toBe("Fix login bug");
    expect(notificationActor(notification)).toBe("Dastin");
    expect(notificationProject(notification)).toBe("Demo Project");
  });

  it("provides defaults for a missing title", () => {
    expect(notificationTitle(makeNotification({}))).toBe("Notifikasi baru");
  });
});

describe("notificationWorkspaceId", () => {
  it("returns the workspace id from the payload", () => {
    expect(notificationWorkspaceId(makeNotification({ workspace_id: 8 }))).toBe(
      8,
    );
  });

  it("returns null when the payload has no workspace id", () => {
    expect(notificationWorkspaceId(makeNotification({}))).toBeNull();
  });
});

describe("isUnread", () => {
  it("is true when read_at is null", () => {
    expect(isUnread(makeNotification({}))).toBe(true);
  });

  it("is false once read", () => {
    expect(
      isUnread(
        makeNotification({}, { read_at: "2026-10-15T07:00:00+00:00" }),
      ),
    ).toBe(false);
  });
});
