"use client";

import { useState } from "react";
import { PriorityBadge, TypeBadge } from "./task-badges";
import { Button } from "@/components/ui/button";
import { TASK_STATUSES, STATUS_STYLES } from "@/lib/enums";
import type { Task, TaskStatus } from "@/lib/types";
import { cn, formatDate, isOverdue } from "@/lib/utils";

interface KanbanBoardProps {
  tasks: Task[];
  onOpen: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
  onAdd?: (status: TaskStatus) => void;
}

export function KanbanBoard({
  tasks,
  onOpen,
  onStatusChange,
  onAdd,
}: KanbanBoardProps) {
  const [dragId, setDragId] = useState<number | null>(null);
  const [overStatus, setOverStatus] = useState<TaskStatus | null>(null);

  function handleDrop(status: TaskStatus) {
    setOverStatus(null);
    const task = tasks.find((item) => item.id === dragId);
    setDragId(null);
    if (!task || task.status === status) return;
    onStatusChange(task, status);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {TASK_STATUSES.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status);
        return (
          <section
            key={status}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-xl border bg-zinc-50/70 dark:bg-zinc-900/40",
              overStatus === status
                ? "border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900"
                : "border-zinc-200 dark:border-zinc-800",
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setOverStatus(status);
            }}
            onDragLeave={() => setOverStatus((prev) => (prev === status ? null : prev))}
            onDrop={() => handleDrop(status)}
          >
            <header className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-block h-2.5 w-2.5 rounded-full ring-1 ring-inset",
                    STATUS_STYLES[status],
                  )}
                />
                <h3 className="text-sm font-semibold">{status}</h3>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {columnTasks.length}
                </span>
              </div>
              {onAdd ? (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Tambah task ${status}`}
                  onClick={() => onAdd(status)}
                >
                  +
                </Button>
              ) : null}
            </header>

            <div className="flex min-h-24 flex-1 flex-col gap-2 p-2">
              {columnTasks.map((task) => (
                <article
                  key={task.id}
                  draggable
                  onDragStart={() => setDragId(task.id)}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => onOpen(task)}
                  className="cursor-grab rounded-lg border border-zinc-200 bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <p className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {task.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {task.project?.name ?? "Tanpa project"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <TypeBadge type={task.type} />
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <p
                    className={cn(
                      "mt-2 text-xs",
                      isOverdue(task)
                        ? "font-medium text-red-600 dark:text-red-400"
                        : "text-zinc-500 dark:text-zinc-400",
                    )}
                  >
                    {task.due_date ? formatDate(task.due_date) : "Tanpa tenggat"}
                  </p>
                </article>
              ))}

              {columnTasks.length === 0 ? (
                <p className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-600">
                  Tarik task ke sini
                </p>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
