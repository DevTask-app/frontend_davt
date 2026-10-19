import { z } from "zod";
import {
  INVITABLE_WORKSPACE_ROLES,
  PROJECT_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  normalizeEnumValue,
} from "./enums";
import { validationError } from "./http";

// ---------------------------------------------------------------------------
// Laravel default validation messages (vendor lang/en/validation.php)
// ---------------------------------------------------------------------------

const requiredMsg = (field: string) => `The ${field} field is required.`;
const stringMsg = (field: string) => `The ${field} field must be a string.`;
const emailMsg = (field: string) => `The ${field} field must be a valid email address.`;
const maxStrMsg = (field: string, max: number) =>
  `The ${field} field must not be greater than ${max} characters.`;
const minStrMsg = (field: string, min: number) =>
  `The ${field} field must be at least ${min} characters.`;
const maxNumMsg = (field: string, max: number) =>
  `The ${field} field must not be greater than ${max}.`;
const minNumMsg = (field: string, min: number) => `The ${field} field must be at least ${min}.`;
const integerMsg = (field: string) => `The ${field} field must be an integer.`;
const numericMsg = (field: string) => `The ${field} field must be a number.`;
const dateMsg = (field: string) => `The ${field} field must be a valid date.`;
const enumMsg = (field: string) => `The selected ${field} is invalid.`;
const confirmedMsg = "The password field confirmation does not match.";
const passwordMinMsg = "The password must be at least 8 characters.";
const requiredIfBlockedMsg =
  "The blocked_reason field is required when status is Blocked.";
const dueAfterStartMsg =
  "The due_date field must be a date after or equal to start_date.";

type IssueLike = { input?: unknown };

// ---------------------------------------------------------------------------
// Input cleaning: Laravel trims all input strings and converts "" to null
// (Global middleware TrimStrings + ConvertEmptyStringsToNull).
// ---------------------------------------------------------------------------

export function cleanInput(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (Array.isArray(value)) return value.map(cleanInput);
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = cleanInput(entry);
    }
    return result;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Field builders
// ---------------------------------------------------------------------------

function emptyToNull(value: unknown): unknown {
  return value === "" ? null : value;
}

function requiredStringError(field: string) {
  return (issue: IssueLike): string =>
    issue.input === undefined || issue.input === null
      ? requiredMsg(field)
      : stringMsg(field);
}

function optionalStringError(field: string) {
  return (): string => stringMsg(field);
}

function requiredString(field: string, max: number) {
  return z.preprocess(
    emptyToNull,
    z.string({ error: requiredStringError(field) }).max(max, maxStrMsg(field, max)),
  );
}

/** Present-and-non-null must be a string within max; key may be absent. */
function sometimesString(field: string, max: number) {
  return z.preprocess(
    emptyToNull,
    z
      .string({
        error: (issue: IssueLike): string =>
          issue.input === null ? requiredMsg(field) : stringMsg(field),
      })
      .max(max, maxStrMsg(field, max))
      .optional(),
  );
}

/** Nullable string; any length constraint is optional. */
function nullableString(field: string, max?: number) {
  let schema = z.string({ error: optionalStringError(field) });
  if (max !== undefined) schema = schema.max(max, maxStrMsg(field, max));
  return schema.nullable().optional();
}

function requiredEmail(field: string) {
  return z.preprocess(
    emptyToNull,
    z
      .string({ error: requiredStringError(field) })
      .max(255, maxStrMsg(field, 255))
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, emailMsg(field)),
  );
}

function optionalEnum(field: string, values: readonly string[]) {
  return z.preprocess(
    (value) => normalizeEnumValue(value, values),
    z
      .string({ error: optionalStringError(field) })
      .refine((value) => values.includes(value), enumMsg(field))
      .nullable()
      .optional(),
  );
}

function requiredEnum(field: string, values: readonly string[]) {
  return z.preprocess(
    (value) => normalizeEnumValue(value, values),
    z
      .string({ error: requiredStringError(field) })
      .refine((value) => values.includes(value), enumMsg(field)),
  );
}

function optionalInteger(field: string) {
  return z.preprocess(
    (value) => {
      if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
      return value;
    },
    z.number({ error: () => integerMsg(field) }).nullable().optional(),
  );
}

function requiredInteger(field: string) {
  return z.preprocess(
    (value) => {
      if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
      return value;
    },
    z.number({
      error: (issue: IssueLike): string =>
        issue.input === undefined || issue.input === null
          ? requiredMsg(field)
          : integerMsg(field),
    }),
  );
}

function optionalNumeric(field: string) {
  return z.preprocess(
    (value) => {
      if (typeof value === "string" && value !== "" && Number.isFinite(Number(value))) {
        return Number(value);
      }
      return value;
    },
    z
      .number({ error: () => numericMsg(field) })
      .min(0, minNumMsg(field, 0))
      .nullable()
      .optional(),
  );
}

function isValidDateString(value: string): boolean {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }
  return !Number.isNaN(Date.parse(value));
}

function toDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  return new Date(Date.parse(value));
}

function optionalDate(field: string) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      if (!isValidDateString(value)) return value;
      return toDate(value);
    },
    z.date({ error: () => dateMsg(field) }).nullable().optional(),
  );
}

// ---------------------------------------------------------------------------
// Cross-field helpers
// ---------------------------------------------------------------------------

function requireBlockedReasonWhenBlocked(
  data: { status?: string | null; blocked_reason?: string | null },
  ctx: z.RefinementCtx,
): void {
  if (data.status === "Blocked" && (data.blocked_reason === null || data.blocked_reason === undefined)) {
    ctx.addIssue({
      code: "custom",
      path: ["blocked_reason"],
      message: requiredIfBlockedMsg,
    });
  }
}

function dueDateAfterStartDate<
  T extends { start_date?: Date | null; due_date?: Date | null },
>(data: T, ctx: z.RefinementCtx): void {
  if (data.due_date && data.start_date && data.due_date < data.start_date) {
    ctx.addIssue({
      code: "custom",
      path: ["due_date"],
      message: dueAfterStartMsg,
    });
  }
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const PASSWORD_MIN = 8;

function passwordField(field: string, errorMessage?: string) {
  return z.preprocess(
    emptyToNull,
    z
      .string({ error: requiredStringError(field) })
      .min(PASSWORD_MIN, errorMessage ?? minStrMsg(field, PASSWORD_MIN)),
  );
}

export const loginSchema = z.object({
  email: requiredEmail("email"),
  password: z.preprocess(emptyToNull, z.string({ error: requiredStringError("password") })),
});

export const registerSchema = z
  .object({
    name: requiredString("name", 255),
    email: requiredEmail("email"),
    password: passwordField("password", passwordMinMsg),
    password_confirmation: z.unknown().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.password_confirmation) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: confirmedMsg,
      });
    }
  });

export const workspaceStoreSchema = z.object({
  name: requiredString("name", 150),
});

export const workspaceUpdateSchema = z.object({
  name: sometimesString("name", 150),
});

export const memberUpdateSchema = z.object({
  role: requiredEnum("role", INVITABLE_WORKSPACE_ROLES),
});

export const invitationStoreSchema = z.object({
  email: requiredEmail("email"),
  role: optionalEnum("role", INVITABLE_WORKSPACE_ROLES),
});

export const projectStoreSchema = z
  .object({
    name: requiredString("name", 150),
    description: nullableString("description"),
    status: optionalEnum("status", PROJECT_STATUSES),
    start_date: optionalDate("start_date"),
    due_date: optionalDate("due_date"),
  })
  .superRefine(dueDateAfterStartDate);

export const projectUpdateSchema = z
  .object({
    name: sometimesString("name", 150),
    description: nullableString("description"),
    status: optionalEnum("status", PROJECT_STATUSES),
    start_date: optionalDate("start_date"),
    due_date: optionalDate("due_date"),
  })
  .superRefine(dueDateAfterStartDate);

export const TASK_SORTABLE = [
  "id",
  "title",
  "status",
  "priority",
  "type",
  "due_date",
  "estimated_hours",
  "actual_hours",
  "completed_at",
  "created_at",
  "updated_at",
] as const;

export const taskQuerySchema = z.object({
  status: optionalEnum("status", TASK_STATUSES),
  priority: optionalEnum("priority", TASK_PRIORITIES),
  type: optionalEnum("type", TASK_TYPES),
  project_id: optionalInteger("project_id"),
  assignee_id: optionalInteger("assignee_id"),
  parent_task_id: optionalInteger("parent_task_id"),
  due_before: optionalDate("due_before"),
  due_after: optionalDate("due_after"),
  sort: z
    .string()
    .refine((value) => (TASK_SORTABLE as readonly string[]).includes(value), enumMsg("sort"))
    .optional(),
  direction: z
    .string()
    .refine((value) => value === "asc" || value === "desc", enumMsg("direction"))
    .optional(),
  page: z.preprocess(
    (value) => {
      if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
      return value;
    },
    z
      .number({ error: () => integerMsg("page") })
      .min(1, minNumMsg("page", 1))
      .nullable()
      .optional(),
  ),
  per_page: z.preprocess(
    (value) => {
      if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
      return value;
    },
    z
      .number({ error: () => integerMsg("per_page") })
      .min(1, minNumMsg("per_page", 1))
      .max(100, maxNumMsg("per_page", 100))
      .nullable()
      .optional(),
  ),
});

export const dashboardUpcomingQuerySchema = z.object({
  limit: z.preprocess(
    (value) => {
      if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
      return value;
    },
    z
      .number({ error: () => integerMsg("limit") })
      .nullable()
      .optional(),
  ),
});

function taskFields({ partial }: { partial: boolean }) {
  return {
    title: partial ? sometimesString("title", 200) : requiredString("title", 200),
    description: nullableString("description"),
    type: partial ? optionalEnum("type", TASK_TYPES) : requiredEnum("type", TASK_TYPES),
    status: optionalEnum("status", TASK_STATUSES),
    priority: optionalEnum("priority", TASK_PRIORITIES),
    due_date: optionalDate("due_date"),
    assignee_id: optionalInteger("assignee_id"),
    estimated_hours: optionalNumeric("estimated_hours"),
    actual_hours: optionalNumeric("actual_hours"),
    parent_task_id: optionalInteger("parent_task_id"),
    blocked_reason: z.preprocess(
      emptyToNull,
      z.string({ error: optionalStringError("blocked_reason") }).nullable().optional(),
    ),
  };
}

export const taskStoreFlatSchema = z
  .object({
    project_id: requiredInteger("project_id"),
    ...taskFields({ partial: false }),
  })
  .superRefine(requireBlockedReasonWhenBlocked);

export const taskStoreNestedSchema = z
  .object(taskFields({ partial: false }))
  .superRefine(requireBlockedReasonWhenBlocked);

export const taskUpdateSchema = z
  .object(taskFields({ partial: true }))
  .superRefine(requireBlockedReasonWhenBlocked);

export const taskStatusUpdateSchema = z
  .object({
    status: requiredEnum("status", TASK_STATUSES),
    blocked_reason: z.preprocess(
      emptyToNull,
      z.string({ error: optionalStringError("blocked_reason") }).nullable().optional(),
    ),
  })
  .superRefine(requireBlockedReasonWhenBlocked);

export const taskPriorityUpdateSchema = z.object({
  priority: requiredEnum("priority", TASK_PRIORITIES),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type WorkspaceStoreInput = z.infer<typeof workspaceStoreSchema>;
export type WorkspaceUpdateInput = z.infer<typeof workspaceUpdateSchema>;
export type MemberUpdateInput = z.infer<typeof memberUpdateSchema>;
export type InvitationStoreInput = z.infer<typeof invitationStoreSchema>;
export type ProjectStoreInput = z.infer<typeof projectStoreSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type TaskQueryInput = z.infer<typeof taskQuerySchema>;
export type DashboardUpcomingQueryInput = z.infer<typeof dashboardUpcomingQuerySchema>;
export type TaskStoreFlatInput = z.infer<typeof taskStoreFlatSchema>;
export type TaskStoreNestedInput = z.infer<typeof taskStoreNestedSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type TaskStatusUpdateInput = z.infer<typeof taskStatusUpdateSchema>;
export type TaskPriorityUpdateInput = z.infer<typeof taskPriorityUpdateSchema>;

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

export function zodErrors(error: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "value";
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}

export function parseOrThrow<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(cleanInput(body ?? {}));
  if (!result.success) {
    throw validationError(zodErrors(result.error));
  }
  return result.data;
}

export function parseQueryOrThrow<T>(schema: z.ZodType<T>, query: URLSearchParams): T {
  const raw: Record<string, unknown> = {};
  for (const key of new Set(query.keys())) {
    raw[key] = query.get(key);
  }
  const result = schema.safeParse(cleanInput(raw));
  if (!result.success) {
    throw validationError(zodErrors(result.error));
  }
  return result.data;
}
