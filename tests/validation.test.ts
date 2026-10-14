import { describe, expect, it } from "vitest";
import {
  loginSchema,
  projectSchema,
  registerSchema,
  taskSchema,
  zodFieldErrors,
} from "@/lib/validation";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({
      email: "demo@davt.test",
      password: "Password123!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email and empty password", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = zodFieldErrors(result.error);
      expect(errors.email).toBe("Format email tidak valid");
      expect(errors.password).toBe("Password wajib diisi");
    }
  });
});

describe("registerSchema", () => {
  const base = {
    name: "Demo User",
    email: "demo@davt.test",
    password: "Password123!",
    password_confirmation: "Password123!",
  };

  it("accepts a valid registration", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it("requires matching password confirmation", () => {
    const result = registerSchema.safeParse({
      ...base,
      password_confirmation: "Different123!",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodFieldErrors(result.error).password_confirmation).toBe(
        "Konfirmasi password tidak cocok",
      );
    }
  });

  it("enforces minimum password length", () => {
    const result = registerSchema.safeParse({
      ...base,
      password: "short",
      password_confirmation: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodFieldErrors(result.error).password).toBe(
        "Password minimal 8 karakter",
      );
    }
  });
});

describe("projectSchema", () => {
  it("coerces empty dates to null", () => {
    const result = projectSchema.safeParse({
      name: "Project A",
      description: "",
      status: "Active",
      start_date: "",
      due_date: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeNull();
      expect(result.data.start_date).toBeNull();
      expect(result.data.due_date).toBeNull();
    }
  });

  it("rejects a due_date earlier than start_date", () => {
    const result = projectSchema.safeParse({
      name: "Project A",
      description: "",
      status: "Active",
      start_date: "2026-05-10",
      due_date: "2026-05-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodFieldErrors(result.error).due_date).toBe(
        "Tenggat harus setelah atau sama dengan tanggal mulai",
      );
    }
  });
});

describe("taskSchema", () => {
  const base = {
    project_id: "1",
    title: "Fix login bug",
    description: "",
    type: "Bug",
    status: "To Do",
    priority: "High",
    due_date: "2026-05-20",
    estimated_hours: "2",
    actual_hours: "",
    blocked_reason: "",
  };

  it("coerces project_id and numeric hours", () => {
    const result = taskSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.project_id).toBe(1);
      expect(result.data.estimated_hours).toBe(2);
      expect(result.data.actual_hours).toBeNull();
    }
  });

  it("requires blocked_reason when status is Blocked", () => {
    const result = taskSchema.safeParse({ ...base, status: "Blocked" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodFieldErrors(result.error).blocked_reason).toBe(
        "Alasan wajib diisi ketika status Blocked",
      );
    }
  });

  it("accepts Blocked with a reason", () => {
    const result = taskSchema.safeParse({
      ...base,
      status: "Blocked",
      blocked_reason: "Menunggu akses staging",
    });
    expect(result.success).toBe(true);
  });

  it("requires a positive project_id", () => {
    const result = taskSchema.safeParse({ ...base, project_id: "0" });
    expect(result.success).toBe(false);
  });
});
