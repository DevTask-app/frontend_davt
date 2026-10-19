import { describe, expect, it } from "vitest";
import { HttpError, handle, json, modelNotFound } from "@/lib/server/http";
import { buildPagination, parsePagination } from "@/lib/server/pagination";
import { dateOnly, decimalString, isoDateTime } from "@/lib/server/resources";

describe("http envelope", () => {
  it("serializes HttpError with errors object", async () => {
    const response = await handle(async () => {
      throw new HttpError(422, "The given data was invalid.", {
        name: ["The name field is required."],
      });
    });
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      message: "The given data was invalid.",
      errors: { name: ["The name field is required."] },
    });
  });

  it("serializes HttpError without errors object", async () => {
    const response = await handle(async () => {
      throw new HttpError(403, "This action is unauthorized.");
    });
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      message: "This action is unauthorized.",
    });
  });

  it("returns 500 for unexpected errors", async () => {
    const response = await handle(async () => {
      throw new Error("boom");
    });
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ message: "Server error." });
  });

  it("builds Laravel model binding messages", () => {
    expect(modelNotFound("Workspace", 5).message).toBe(
      "No query results for model [App\\Models\\Workspace] 5",
    );
    expect(modelNotFound("WorkspaceInvitation", "abc").message).toBe(
      "No query results for model [App\\Models\\WorkspaceInvitation] abc",
    );
  });

  it("passes successful responses through", async () => {
    const response = await handle(async () => json({ ok: true }, 201));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});

describe("resources formatting", () => {
  it("formats ISO8601 without milliseconds and with +00:00", () => {
    expect(isoDateTime(new Date(Date.UTC(2026, 9, 19, 2, 15, 34, 123)))).toBe(
      "2026-10-19T02:15:34+00:00",
    );
    expect(isoDateTime(null)).toBeNull();
  });

  it("formats date-only values", () => {
    expect(dateOnly(new Date(Date.UTC(2026, 9, 19, 23, 59, 59)))).toBe("2026-10-19");
    expect(dateOnly(null)).toBeNull();
  });

  it("formats decimals as 2-place strings", () => {
    expect(decimalString(8)).toBe("8.00");
    expect(decimalString(15.5)).toBe("15.50");
    expect(decimalString(null)).toBeNull();
  });
});

describe("pagination", () => {
  const url = new URL("http://localhost:3000/api/backend/tasks?status=Done");

  it("builds Laravel-style links and meta", () => {
    const result = buildPagination(["a", "b"], 47, 2, 15, url);
    expect(result.meta).toEqual({
      current_page: 2,
      last_page: 4,
      per_page: 15,
      total: 47,
      from: 16,
      to: 30,
    });
    expect(result.links.prev).toContain("page=1");
    expect(result.links.next).toContain("page=3");
    expect(result.links.first).toContain("page=1");
    expect(result.links.last).toContain("page=4");
    expect(result.links.next).toContain("status=Done");
  });

  it("handles empty result sets", () => {
    const result = buildPagination([], 0, 1, 15, url);
    expect(result.meta.from).toBeNull();
    expect(result.meta.to).toBeNull();
    expect(result.meta.last_page).toBe(1);
    expect(result.links.prev).toBeNull();
    expect(result.links.next).toBeNull();
  });

  it("clamps invalid pagination input", () => {
    expect(parsePagination(undefined, undefined, 15)).toEqual({ page: 1, perPage: 15 });
    expect(parsePagination(0, 0, 15)).toEqual({ page: 1, perPage: 15 });
    expect(parsePagination(-3, 999, 15)).toEqual({ page: 1, perPage: 999 });
  });
});
