import { describe, expect, it } from "vitest";
import {
  canChangeTaskStatus,
  canDeleteProject,
  canEditProject,
  canEditTaskDetails,
  canManageTaskAttachments,
  contributesToWorkspace,
  isPersonalWorkspace,
  managesWorkspace,
  resolveActiveWorkspaceId,
} from "@/lib/workspace";
import { invitationSchema, workspaceSchema, zodFieldErrors } from "@/lib/validation";
import type { Workspace } from "@/lib/types";

function workspace(id: number, overrides: Partial<Workspace> = {}): Workspace {
  return {
    id,
    name: `Workspace ${id}`,
    slug: `workspace-${id}`,
    is_personal: false,
    role: "Member",
    created_at: "2026-01-01T00:00:00+00:00",
    ...overrides,
  };
}

describe("role capabilities", () => {
  it("lets Owner and Admin manage the workspace", () => {
    expect(managesWorkspace("Owner")).toBe(true);
    expect(managesWorkspace("Admin")).toBe(true);
    expect(managesWorkspace("Member")).toBe(false);
    expect(managesWorkspace("Viewer")).toBe(false);
    expect(managesWorkspace(null)).toBe(false);
  });

  it("treats everyone except Viewer as a contributor", () => {
    expect(contributesToWorkspace("Owner")).toBe(true);
    expect(contributesToWorkspace("Admin")).toBe(true);
    expect(contributesToWorkspace("Member")).toBe(true);
    expect(contributesToWorkspace("Viewer")).toBe(false);
    expect(contributesToWorkspace(undefined)).toBe(false);
  });
});

describe("task permissions", () => {
  const assigned = { assignee_id: 5 };
  const unassigned = { assignee_id: null };

  it("lets only Owner and Admin edit task details", () => {
    expect(canEditTaskDetails("Owner")).toBe(true);
    expect(canEditTaskDetails("Admin")).toBe(true);
    expect(canEditTaskDetails("Member")).toBe(false);
    expect(canEditTaskDetails("Viewer")).toBe(false);
  });

  it("lets managers change the status of any task", () => {
    expect(canChangeTaskStatus("Owner", unassigned, 5)).toBe(true);
    expect(canChangeTaskStatus("Admin", unassigned, 5)).toBe(true);
  });

  it("lets a member change the status of a task assigned to them", () => {
    expect(canChangeTaskStatus("Member", assigned, 5)).toBe(true);
    expect(canChangeTaskStatus("Member", assigned, 6)).toBe(false);
    expect(canChangeTaskStatus("Member", unassigned, 5)).toBe(false);
  });

  it("forbids viewers from changing the status", () => {
    expect(canChangeTaskStatus("Viewer", assigned, 5)).toBe(false);
  });

  it("mirrors the status rule for attachments", () => {
    expect(canManageTaskAttachments("Owner", unassigned, 5)).toBe(true);
    expect(canManageTaskAttachments("Member", assigned, 5)).toBe(true);
    expect(canManageTaskAttachments("Member", assigned, 6)).toBe(false);
    expect(canManageTaskAttachments("Viewer", assigned, 5)).toBe(false);
  });
});

describe("project permissions", () => {
  const project = { created_by: 5 };

  it("lets any contributor edit a project", () => {
    expect(canEditProject("Owner")).toBe(true);
    expect(canEditProject("Admin")).toBe(true);
    expect(canEditProject("Member")).toBe(true);
    expect(canEditProject("Viewer")).toBe(false);
  });

  it("lets managers or the creator delete a project", () => {
    expect(canDeleteProject("Owner", project, 6)).toBe(true);
    expect(canDeleteProject("Admin", project, 6)).toBe(true);
    expect(canDeleteProject("Member", project, 5)).toBe(true);
    expect(canDeleteProject("Member", project, 6)).toBe(false);
    expect(canDeleteProject("Viewer", project, 5)).toBe(true);
    expect(canDeleteProject("Viewer", project, 6)).toBe(false);
  });
});

describe("isPersonalWorkspace", () => {
  it("detects personal workspaces", () => {
    expect(isPersonalWorkspace({ is_personal: true })).toBe(true);
    expect(isPersonalWorkspace({ is_personal: false })).toBe(false);
    expect(isPersonalWorkspace(null)).toBe(false);
  });
});

describe("resolveActiveWorkspaceId", () => {
  const personal = workspace(1, { is_personal: true });
  const team = workspace(2, { name: "Team" });

  it("keeps a preferred id that is still a member workspace", () => {
    expect(resolveActiveWorkspaceId([personal, team], 2)).toBe(2);
  });

  it("falls back to the personal workspace when the preferred id is gone", () => {
    expect(resolveActiveWorkspaceId([personal, team], 99)).toBe(1);
  });

  it("falls back to the first workspace when there is no personal one", () => {
    expect(resolveActiveWorkspaceId([team], null)).toBe(2);
  });

  it("returns null for an empty list", () => {
    expect(resolveActiveWorkspaceId([], 5)).toBeNull();
  });
});

describe("workspaceSchema", () => {
  it("accepts a valid name", () => {
    expect(workspaceSchema.safeParse({ name: "Tim Produk" }).success).toBe(true);
  });

  it("requires a non-empty name", () => {
    const result = workspaceSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodFieldErrors(result.error).name).toBe(
        "Nama workspace wajib diisi",
      );
    }
  });
});

describe("invitationSchema", () => {
  it("accepts an invitable role", () => {
    const result = invitationSchema.safeParse({
      email: "new@davt.test",
      role: "Member",
    });
    expect(result.success).toBe(true);
  });

  it("rejects the Owner role", () => {
    expect(
      invitationSchema.safeParse({ email: "new@davt.test", role: "Owner" })
        .success,
    ).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = invitationSchema.safeParse({
      email: "not-an-email",
      role: "Viewer",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodFieldErrors(result.error).email).toBe(
        "Format email tidak valid",
      );
    }
  });
});
