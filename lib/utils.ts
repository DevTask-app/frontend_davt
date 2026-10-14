import type { Task } from "./types";

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

export function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function todayISO(): string {
  return toDateInput(new Date().toISOString());
}

export function isOverdue(task: Pick<Task, "due_date" | "status">): boolean {
  if (!task.due_date || task.status === "Done") return false;
  return task.due_date < todayISO();
}

export function isDueSoon(task: Pick<Task, "due_date" | "status">): boolean {
  if (!task.due_date || task.status === "Done") return false;
  const today = todayISO();
  if (task.due_date < today) return false;
  const diff =
    (new Date(task.due_date).getTime() - new Date(today).getTime()) /
    86_400_000;
  return diff <= 3;
}

export function relativeDay(value: string | null | undefined): string {
  if (!value) return "";
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return "";
  const today = new Date(todayISO());
  const diff = Math.round(
    (target.getTime() - today.getTime()) / 86_400_000,
  );
  if (diff === 0) return "hari ini";
  if (diff === 1) return "besok";
  if (diff === -1) return "kemarin";
  if (diff < 0) return `${Math.abs(diff)} hari lalu`;
  return `${diff} hari lagi`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function humanizeFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "due_date") return formatDate(String(value));
  return String(value);
}
