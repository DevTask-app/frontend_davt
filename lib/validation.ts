import { z } from "zod";
import {
  PROJECT_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
} from "./enums";
import type {
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  TaskType,
} from "./types";

const projectStatusSchema = z.enum(
  PROJECT_STATUSES as [ProjectStatus, ...ProjectStatus[]],
);
const taskStatusSchema = z.enum(TASK_STATUSES as [TaskStatus, ...TaskStatus[]]);
const taskPrioritySchema = z.enum(
  TASK_PRIORITIES as [TaskPriority, ...TaskPriority[]],
);
const taskTypeSchema = z.enum(TASK_TYPES as [TaskType, ...TaskType[]]);

const emptyToNull = (value: unknown): unknown =>
  value === "" || value === undefined ? null : value;

const optionalText = z.preprocess(
  emptyToNull,
  z.string().nullable().optional(),
);

const optionalDate = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid")
    .nullable()
    .optional(),
);

const optionalNumber = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.coerce
    .number({ message: "Harus berupa angka" })
    .min(0, "Tidak boleh negatif")
    .nullable()
    .optional(),
);

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "Nama minimal 2 karakter")
      .max(255, "Maksimal 255 karakter"),
    email: z
      .string()
      .min(1, "Email wajib diisi")
      .email("Format email tidak valid"),
    password: z.string().min(8, "Password minimal 8 karakter"),
    password_confirmation: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    path: ["password_confirmation"],
    message: "Konfirmasi password tidak cocok",
  });

export const projectSchema = z
  .object({
    name: z
      .string()
      .min(1, "Nama project wajib diisi")
      .max(150, "Maksimal 150 karakter"),
    description: optionalText,
    status: projectStatusSchema,
    start_date: optionalDate,
    due_date: optionalDate,
  })
  .refine(
    (data) =>
      !data.start_date ||
      !data.due_date ||
      data.due_date >= data.start_date,
    {
      path: ["due_date"],
      message: "Tenggat harus setelah atau sama dengan tanggal mulai",
    },
  );

export const taskSchema = z
  .object({
    project_id: z.coerce
      .number({ message: "Pilih project terlebih dahulu" })
      .int()
      .positive("Pilih project terlebih dahulu"),
    title: z
      .string()
      .min(1, "Judul wajib diisi")
      .max(200, "Maksimal 200 karakter"),
    description: optionalText,
    type: taskTypeSchema,
    status: taskStatusSchema,
    priority: taskPrioritySchema,
    due_date: optionalDate,
    estimated_hours: optionalNumber,
    actual_hours: optionalNumber,
    blocked_reason: optionalText,
  })
  .superRefine((data, ctx) => {
    if (
      data.status === "Blocked" &&
      (!data.blocked_reason || String(data.blocked_reason).trim() === "")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["blocked_reason"],
        message: "Alasan wajib diisi ketika status Blocked",
      });
    }
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type TaskInput = z.infer<typeof taskSchema>;

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
