import Link from "next/link";
import { AssigneeChip } from "./assignee";
import { PriorityBadge, StatusBadge, TypeBadge } from "./task-badges";
import { cn, formatDate, isOverdue, relativeDay } from "@/lib/utils";
import type { Task } from "@/lib/types";

export function TaskListItem({ task }: { task: Task }) {
  const overdue = isOverdue(task);
  return (
    <Link
      href={`/tasks/${task.id}`}
      className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/60"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {task.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
          {task.project?.name ?? "Tanpa project"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AssigneeChip id={task.assignee_id} />
        <TypeBadge type={task.type} />
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
        <span
          className={cn(
            "text-xs",
            overdue
              ? "font-medium text-red-600 dark:text-red-400"
              : "text-zinc-500 dark:text-zinc-400",
          )}
        >
          {formatDate(task.due_date)}
          {task.due_date ? ` · ${relativeDay(task.due_date)}` : ""}
        </span>
      </div>
    </Link>
  );
}
