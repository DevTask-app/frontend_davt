"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { TaskListItem } from "@/components/tasks/task-list-item";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorBanner, Spinner } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from "@/lib/enums";
import type { Project, Task, TaskStatus } from "@/lib/types";

interface Filters {
  status: string;
  priority: string;
  type: string;
  project_id: string;
  sort: string;
  direction: "asc" | "desc";
}

const INITIAL_FILTERS: Filters = {
  status: "",
  priority: "",
  type: "",
  project_id: "",
  sort: "created_at",
  direction: "desc",
};

export default function TasksPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [view, setView] = useState<"board" | "list">("list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<string>("Backlog");

  useEffect(() => {
    api
      .listProjects({ per_page: 100 })
      .then((response) => setProjects(response.data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    api
      .listTasks({
        status: (filters.status || undefined) as TaskStatus | undefined,
        priority: (filters.priority || undefined) as never,
        type: (filters.type || undefined) as never,
        project_id: filters.project_id ? Number(filters.project_id) : undefined,
        sort: filters.sort,
        direction: filters.direction,
        per_page: 200,
      })
      .then((response) => {
        if (!active) return;
        setTasks(response.data);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof ApiError ? err.firstError() : "Gagal memuat task.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tasks;
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(term) ||
        (task.description ?? "").toLowerCase().includes(term) ||
        (task.project?.name ?? "").toLowerCase().includes(term),
    );
  }, [tasks, search]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setLoading(true);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function resetFilters() {
    setSearch("");
    setLoading(true);
    setFilters(INITIAL_FILTERS);
  }

  function upsertTask(task: Task) {
    setTasks((prev) => {
      const exists = prev.some((item) => item.id === task.id);
      return exists
        ? prev.map((item) => (item.id === task.id ? task : item))
        : [task, ...prev];
    });
  }

  async function handleStatusChange(task: Task, status: TaskStatus) {
    const previous = tasks;
    setTasks((prev) =>
      prev.map((item) => (item.id === task.id ? { ...item, status } : item)),
    );
    setActionError(null);
    try {
      const response = await api.updateTaskStatus(task.id, status);
      upsertTask(response.data);
    } catch (err) {
      setTasks(previous);
      setActionError(
        err instanceof ApiError
          ? err.firstError()
          : "Gagal mengubah status task.",
      );
    }
  }

  function openNewTask(status: string) {
    setEditingTask(null);
    setDefaultStatus(status);
    setFormOpen(true);
  }

  const activeFilters =
    filters.status ||
    filters.priority ||
    filters.type ||
    filters.project_id ||
    search;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Tasks</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {filtered.length} task ditampilkan.
          </p>
        </div>
        <Button onClick={() => openNewTask("Backlog")}>Task Baru</Button>
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Cari judul / project…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value)}
          >
            <option value="">Semua status</option>
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
          <Select
            value={filters.priority}
            onChange={(event) => updateFilter("priority", event.target.value)}
          >
            <option value="">Semua prioritas</option>
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </Select>
          <Select
            value={filters.type}
            onChange={(event) => updateFilter("type", event.target.value)}
          >
            <option value="">Semua tipe</option>
            {TASK_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select
            className="max-w-xs"
            value={filters.project_id}
            onChange={(event) => updateFilter("project_id", event.target.value)}
          >
            <option value="">Semua project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>

          <Select
            className="max-w-[160px]"
            value={filters.sort}
            onChange={(event) => updateFilter("sort", event.target.value)}
          >
            <option value="created_at">Dibuat</option>
            <option value="due_date">Tenggat</option>
            <option value="priority">Prioritas</option>
            <option value="title">Judul</option>
          </Select>

          <Select
            className="max-w-[120px]"
            value={filters.direction}
            onChange={(event) =>
              updateFilter("direction", event.target.value as "asc" | "desc")
            }
          >
            <option value="desc">Turun</option>
            <option value="asc">Naik</option>
          </Select>

          {activeFilters ? (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Reset
            </Button>
          ) : null}

          <div className="ml-auto inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                view === "list"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 dark:text-zinc-300"
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setView("board")}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                view === "board"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 dark:text-zinc-300"
              }`}
            >
              Board
            </button>
          </div>
        </div>
      </div>

      {actionError ? <ErrorBanner message={actionError} /> : null}

      {loading ? (
        <Spinner label="Memuat task…" />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada task"
          description={
            activeFilters
              ? "Tidak ada task yang cocok dengan filter."
              : "Buat task pertama Anda."
          }
          action={
            <Button onClick={() => openNewTask("Backlog")}>Task Baru</Button>
          }
        />
      ) : view === "board" ? (
        <KanbanBoard
          tasks={filtered}
          onOpen={(task) => router.push(`/tasks/${task.id}`)}
          onStatusChange={handleStatusChange}
          onAdd={openNewTask}
        />
      ) : (
        <Card className="space-y-2 p-4">
          {filtered.map((task) => (
            <TaskListItem key={task.id} task={task} />
          ))}
        </Card>
      )}

      {formOpen ? (
        <TaskForm
          projects={projects}
          task={editingTask}
          defaultProjectId={
            filters.project_id ? Number(filters.project_id) : undefined
          }
          defaultStatus={defaultStatus}
          onClose={() => setFormOpen(false)}
          onSaved={upsertTask}
        />
      ) : null}
    </div>
  );
}
