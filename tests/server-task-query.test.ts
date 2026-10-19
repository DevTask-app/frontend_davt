import { describe, expect, it } from "vitest";
import { buildTaskOrderBy, buildTaskWhere } from "@/lib/server/task-query";
import type { TaskQueryInput } from "@/lib/server/validation";

function filters(overrides: Partial<TaskQueryInput> = {}): TaskQueryInput {
  return { ...overrides } as TaskQueryInput;
}

describe("buildTaskOrderBy", () => {
  it("defaults to created_at desc with camelCase mapping", () => {
    expect(buildTaskOrderBy(filters())).toEqual({ createdAt: "desc" });
  });

  it("maps snake_case sort fields to Prisma columns", () => {
    expect(buildTaskOrderBy(filters({ sort: "due_date", direction: "asc" }))).toEqual({
      dueDate: "asc",
    });
    expect(buildTaskOrderBy(filters({ sort: "updated_at" }))).toEqual({
      updatedAt: "desc",
    });
    expect(buildTaskOrderBy(filters({ sort: "estimated_hours", direction: "asc" }))).toEqual({
      estimatedHours: "asc",
    });
    expect(buildTaskOrderBy(filters({ sort: "completed_at" }))).toEqual({
      completedAt: "desc",
    });
  });

  it("passes through non-snake fields and ignores unknown values", () => {
    expect(buildTaskOrderBy(filters({ sort: "title", direction: "asc" }))).toEqual({
      title: "asc",
    });
    expect(buildTaskOrderBy(filters({ sort: "created_at" }))).toEqual({
      createdAt: "desc",
    });
    expect(buildTaskOrderBy(filters({ sort: "not_a_column" }))).toEqual({
      createdAt: "desc",
    });
  });
});

describe("buildTaskWhere", () => {
  it("always excludes soft-deleted tasks", () => {
    expect(buildTaskWhere({ filters: filters() })).toMatchObject({
      deletedAt: null,
    });
  });

  it("applies normalized enum filters directly", () => {
    const where = buildTaskWhere({
      filters: filters({ status: "In Progress", priority: "Critical", type: "Bug" }),
    });
    expect(where.status).toBe("In Progress");
    expect(where.priority).toBe("Critical");
    expect(where.type).toBe("Bug");
  });

  it("keeps zero ids (not treated as absent)", () => {
    const where = buildTaskWhere({
      filters: filters({ assignee_id: 0, project_id: 0 }),
    });
    expect(where.assigneeId).toBe(0);
    expect(where.projectId).toBe(0);
  });

  it("merges base scope and date range into AND", () => {
    const after = new Date("2026-01-01T00:00:00.000Z");
    const before = new Date("2026-12-31T00:00:00.000Z");
    const where = buildTaskWhere({
      filters: filters({ due_after: after, due_before: before }),
      baseWhere: { projectId: 7 },
    });
    expect(where.AND).toEqual([
      { projectId: 7 },
      { dueDate: { gte: after } },
      { dueDate: { lte: before } },
    ]);
  });
});
