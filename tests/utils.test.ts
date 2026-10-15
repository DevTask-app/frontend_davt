import { describe, expect, it } from "vitest";
import {
  cn,
  formatDate,
  formatFileSize,
  humanizeFieldValue,
  initials,
  isDueSoon,
  isOverdue,
  relativeDay,
  storagePath,
  toDateInput,
  todayISO,
  validateImageFile,
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

describe("storagePath", () => {
  it("strips the origin from an absolute signed url", () => {
    expect(storagePath("http://localhost:8000/storage/a.png?signature=x")).toBe(
      "/storage/a.png?signature=x",
    );
  });

  it("keeps an already relative path untouched", () => {
    expect(storagePath("/storage/a.png")).toBe("/storage/a.png");
  });
});

describe("formatFileSize", () => {
  it("formats bytes, kilobytes and megabytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});

describe("validateImageFile", () => {
  it("accepts supported images under the limit", () => {
    expect(validateImageFile({ type: "image/png", size: 1024 } as File)).toBeNull();
  });

  it("rejects unsupported file types", () => {
    expect(
      validateImageFile({ type: "application/pdf", size: 1024 } as File),
    ).toBe("Format gambar harus JPG, PNG, WEBP, atau GIF.");
  });

  it("rejects images larger than two megabytes", () => {
    expect(
      validateImageFile({ type: "image/png", size: 2 * 1024 * 1024 + 1 } as File),
    ).toBe("Ukuran foto maksimal 2 MB.");
  });
});
