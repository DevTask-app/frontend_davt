import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  accent = "default",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: "default" | "blue" | "red" | "green";
  icon?: ReactNode;
}) {
  const accentClass = {
    default: "text-zinc-900 dark:text-zinc-100",
    blue: "text-blue-600 dark:text-blue-400",
    red: "text-red-600 dark:text-red-400",
    green: "text-green-600 dark:text-green-400",
  }[accent];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        {icon ? <span aria-hidden>{icon}</span> : null}
      </div>
      <p className={`mt-2 text-3xl font-semibold ${accentClass}`}>{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      ) : null}
    </div>
  );
}
