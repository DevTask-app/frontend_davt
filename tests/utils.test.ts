import { describe, expect, it } from "vitest";
import {
  cn,
  formatDate,
  humanizeFieldValue,
  initials,
  isDueSoon,
  isOverdue,
  relativeDay,
  toDateInput,
  todayISO,
} from "@/lib/utils";

function shiftDays(days: number): string {
  const date = new Date(todayISO());
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", false, undefined, "b", null)).toBe("a b");
  });
});

describe("initials", () => {
  it("takes the first letters of the first two words", () => {
    expect(initials("Demo User")).toBe("DU");
    expect(initials("madonna")).toBe("M");
  });
});

describe("toDateInput", () => {
  it("formats an ISO timestamp to a yyyy-mm-dd string", () => {
    const input = "2026-05-01T10:00:00.000Z";
    expect(toDateInput(input)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns an empty string for null", () => {
    expect(toDateInput(null)).toBe("");
  });
});

describe("formatDate", () => {
  it("returns a placeholder for empty values", () => {
    expect(formatDate(null)).toBe("—");
  });
});

describe("isOverdue", () => {
  it("is true for a past due date that is not done", () => {
    expect(isOverdue({ due_date: shiftDays(-1), status: "To Do" })).toBe(true);
  });

  it("is false when the task is done", () => {
    expect(isOverdue({ due_date: shiftDays(-1), status: "Done" })).toBe(false);
  });

  it("is false when there is no due date", () => {
    expect(isOverdue({ due_date: null, status: "To Do" })).toBe(false);
  });
});

describe("isDueSoon", () => {
  it("is true within three days", () => {
    expect(isDueSoon({ due_date: shiftDays(2), status: "To Do" })).toBe(true);
  });

  it("is false when overdue", () => {
    expect(isDueSoon({ due_date: shiftDays(-2), status: "To Do" })).toBe(false);
  });
});

describe("relativeDay", () => {
  it("labels today and tomorrow", () => {
    expect(relativeDay(todayISO())).toBe("hari ini");
    expect(relativeDay(shiftDays(1))).toBe("besok");
    expect(relativeDay(shiftDays(-1))).toBe("kemarin");
  });
});

describe("humanizeFieldValue", () => {
  it("returns a placeholder for empty values", () => {
    expect(humanizeFieldValue("status", null)).toBe("—");
  });

  it("formats due dates", () => {
    expect(humanizeFieldValue("due_date", todayISO())).not.toBe("—");
  });
});
