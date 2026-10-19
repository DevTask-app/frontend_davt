import { describe, expect, it } from "vitest";
import { HttpError } from "@/lib/server/http";
import {
  invitationStoreSchema,
  loginSchema,
  memberUpdateSchema,
  parseOrThrow,
  projectStoreSchema,
  registerSchema,
  taskQuerySchema,
  taskStatusUpdateSchema,
  taskStoreFlatSchema,
  taskUpdateSchema,
  workspaceStoreSchema,
} from "@/lib/server/validation";

function catch422(fn: () => unknown): Record<string, string[]> {
  try {
    fn();
  } catch (error) {
    if (error instanceof HttpError && error.status === 422) {
      return error.errors ?? {};
    }
    throw error;
  }
  throw new Error("expected a 422 validation error");
}

describe("loginSchema", () => {
  it("requires email and password with Laravel messages", () => {
    expect(catch422(() => parseOrThrow(loginSchema, {}))).toEqual({
      email: ["The email field is required."],
      password: ["The password field is required."],
    });
  });

  it("rejects malformed emails", () => {
    expect(catch422(() => parseOrThrow(loginSchema, { email: "nope", password: "x" }))).toEqual({
      email: ["The email field must be a valid email address."],
    });
  });

  it("accepts valid credentials", () => {
    expect(parseOrThrow(loginSchema, { email: " a@b.co ", password: "secret" })).toEqual({
      email: "a@b.co",
      password: "secret",
    });
  });
});

describe("registerSchema", () => {
  it("validates required fields", () => {
    expect(catch422(() => parseOrThrow(registerSchema, {}))).toEqual({
      name: ["The name field is required."],
      email: ["The email field is required."],
      password: ["The password field is required."],
    });
  });

  it("enforces max length on name", () => {
    const errors = catch422(() =>
      parseOrThrow(registerSchema, {
        name: "x".repeat(256),
        email: "a@b.co",
        password: "password1",
        password_confirmation: "password1",
      }),
    );
    expect(errors.name).toEqual(["The name field must not be greater than 255 characters."]);
  });

  it("requires password confirmation match", () => {
    const errors = catch422(() =>
      parseOrThrow(registerSchema, {
        name: "A",
        email: "a@b.co",
        password: "password1",
        password_confirmation: "different",
      }),
    );
    expect(errors.password).toEqual(["The password field confirmation does not match."]);
  });

  it("requires password_confirmation to be provided", () => {
    const errors = catch422(() =>
      parseOrThrow(registerSchema, {
        name: "A",
        email: "a@b.co",
        password: "password1",
      }),
    );
    expect(errors.password).toEqual(["The password field confirmation does not match."]);
  });
});

describe("workspace schemas", () => {
  it("requires workspace name with 150 char cap", () => {
    expect(catch422(() => parseOrThrow(workspaceStoreSchema, {}))).toEqual({
      name: ["The name field is required."],
    });
    const errors = catch422(() =>
      parseOrThrow(workspaceStoreSchema, { name: "x".repeat(151) }),
    );
    expect(errors.name).toEqual(["The name field must not be greater than 150 characters."]);
  });

  it("rejects Owner in member updates", () => {
    expect(catch422(() => parseOrThrow(memberUpdateSchema, { role: "Owner" }))).toEqual({
      role: ["The selected role is invalid."],
    });
    expect(catch422(() => parseOrThrow(memberUpdateSchema, { role: "Super" }))).toEqual({
      role: ["The selected role is invalid."],
    });
    expect(parseOrThrow(memberUpdateSchema, { role: "Admin" }).role).toBe("Admin");
  });

  it("defaults invitation role and validates email", () => {
    const input = parseOrThrow(invitationStoreSchema, { email: "x@y.co" });
    expect(input.role).toBeUndefined();
    expect(catch422(() => parseOrThrow(invitationStoreSchema, { email: "x@y.co", role: "Owner" }))).toEqual({
      role: ["The selected role is invalid."],
    });
  });
});

describe("project schemas", () => {
  it("normalizes status aliases", () => {
    const input = parseOrThrow(projectStoreSchema, { name: "P", status: "on_hold" });
    expect(input.status).toBe("On Hold");
  });

  it("rejects invalid status", () => {
    expect(catch422(() => parseOrThrow(projectStoreSchema, { name: "P", status: "zzz" }))).toEqual({
      status: ["The selected status is invalid."],
    });
  });

  it("enforces due_date after start_date", () => {
    const errors = catch422(() =>
      parseOrThrow(projectStoreSchema, {
        name: "P",
        start_date: "2026-10-10",
        due_date: "2026-10-09",
      }),
    );
    expect(errors.due_date).toEqual([
      "The due_date field must be a date after or equal to start_date.",
    ]);
  });

  it("rejects invalid dates", () => {
    const errors = catch422(() =>
      parseOrThrow(projectStoreSchema, { name: "P", start_date: "not-a-date" }),
    );
    expect(errors.start_date).toEqual(["The start_date field must be a valid date."]);
  });
});

describe("task schemas", () => {
  it("requires title and type on create", () => {
    expect(catch422(() => parseOrThrow(taskStoreFlatSchema, { project_id: 1 }))).toEqual({
      title: ["The title field is required."],
      type: ["The type field is required."],
    });
  });

  it("requires project_id as integer", () => {
    expect(catch422(() => parseOrThrow(taskStoreFlatSchema, { project_id: "abc" }))).toEqual({
      project_id: ["The project_id field must be an integer."],
      title: ["The title field is required."],
      type: ["The type field is required."],
    });
  });

  it("requires blocked_reason when status is Blocked", () => {
    const errors = catch422(() =>
      parseOrThrow(taskStoreFlatSchema, {
        project_id: 1,
        title: "T",
        type: "Feature",
        status: "Blocked",
      }),
    );
    expect(errors.blocked_reason).toEqual([
      "The blocked_reason field is required when status is Blocked.",
    ]);
  });

  it("normalizes status and priority aliases on update", () => {
    const input = parseOrThrow(taskUpdateSchema, { status: "in_review", priority: "critical" });
    expect(input.status).toBe("In Review");
    expect(input.priority).toBe("Critical");
  });

  it("rejects out of range per_page on queries", () => {
    const errors = catch422(() =>
      parseOrThrow(taskQuerySchema, { per_page: "101" }),
    );
    expect(errors.per_page).toEqual(["The per_page field must not be greater than 100."]);
  });

  it("validates direction and sort whitelist", () => {
    expect(catch422(() => parseOrThrow(taskQuerySchema, { direction: "up" }))).toEqual({
      direction: ["The selected direction is invalid."],
    });
    expect(catch422(() => parseOrThrow(taskQuerySchema, { sort: "evil" }))).toEqual({
      sort: ["The selected sort is invalid."],
    });
  });

  it("skips nullable filters given null", () => {
    const input = parseOrThrow(taskQuerySchema, { status: null, page: "2", per_page: "20" });
    expect(input.status).toBeNull();
    expect(input.page).toBe(2);
    expect(input.per_page).toBe(20);
  });

  it("requires status on status patch and blocked_reason when Blocked", () => {
    expect(catch422(() => parseOrThrow(taskStatusUpdateSchema, {}))).toEqual({
      status: ["The status field is required."],
    });
    const errors = catch422(() =>
      parseOrThrow(taskStatusUpdateSchema, { status: "Blocked" }),
    );
    expect(errors.blocked_reason).toEqual([
      "The blocked_reason field is required when status is Blocked.",
    ]);
    expect(parseOrThrow(taskStatusUpdateSchema, { status: "Blocked", blocked_reason: "why" }).status).toBe(
      "Blocked",
    );
  });

  it("trims title before validation", () => {
    const input = parseOrThrow(taskUpdateSchema, { title: "  Hello  " });
    expect(input.title).toBe("Hello");
  });
});
