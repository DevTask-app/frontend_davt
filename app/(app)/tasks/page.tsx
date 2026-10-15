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
import { Pagination } from "@/components/ui/pagination";
import { api, ApiError } from "@/lib/api";
import { TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from "@/lib/enums";
import { useWorkspace } from "@/components/providers/workspace-provider";
import type {
  Paginated,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
} from "@/lib/types";
import { isOverdue, todayISO } from "@/lib/utils";

interface Filters {
  status: string;
  priority: string;
  type: string;
  project_id: string;
  assignee_id: string;
  sort: string;
  direction: "asc" | "desc";
}

type DeadlineFilter = "" | "overdue" | "upcoming";
type PaginationMeta = Paginated<Task>["meta"];

const INITIAL_FILTERS: Filters = {
  status: "",
  priority: "",
  type: "",
  project_id: "",
  assignee_id: "",
  sort: "created_at",
  direction: "desc",
};

function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function TasksPage() {
  const router = useRouter();
  const { members } = useWorkspace();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [deadline, setDeadline] = useState<DeadlineFilter>("");
  const [view, setView] = useState<"board" | "list">("list");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
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

  const effectivePerPage = view === "board" ? 100 : perPage;
  const today = todayISO();

  useEffect(() => {
    let active = true;
    api
      .listTasks({
        status: (filters.status || undefined) as TaskStatus | undefined,
        priority: (filters.priority || undefined) as TaskPriority | undefined,
        type: (filters.type || undefined) as TaskType | undefined,
        project_id: filters.project_id ? Number(filters.project_id) : undefined,
        assignee_id: filters.assignee_id ? Number(filters.assignee_id) : undefined,
        due_before:
          deadline === "overdue"
            ? today
            : deadline === "upcoming"
              ? addDays(today, 7)
              : undefined,
        due_after: deadline === "upcoming" ? today : undefined,
        sort: filters.sort,
        direction: filters.direction,
        page,
        per_page: effectivePerPage,
      })
      .then((response) => {
        if (!active) return;
        setTasks(response.data);
        setMeta(response.meta);
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
  }, [filters, deadline, page, effectivePerPage, reloadKey, today]);

  const filtered = useMemo(() => {
    let result = tasks;
    if (deadline === "overdue") {
      result = result.filter(isOverdue);
    } else if (deadline === "upcoming") {
      result = result.filter((task) => task.status !== "Done" && !isOverdue(task));
    }
    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(term) ||
          (task.description ?? "").toLowerCase().includes(term) ||
          (task.project?.name ?? "").toLowerCase().includes(term),
      );
    }
    return result;
  }, [tasks, deadline, search]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setLoading(true);
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function changeDeadline(value: DeadlineFilter) {
    setLoading(true);
    setPage(1);
    setDeadline(value);
  }

  function resetFilters() {
    setLoading(true);
    setSearch("");
    setDeadline("");
    setPage(1);
    setFilters(INITIAL_FILTERS);
  }

  function switchView(next: "board" | "list") {
    if (next === view) return;
    setLoading(true);
    setPage(1);
    setView(next);
  }

  function goToPage(next: number) {
    setLoading(true);
    setPage(next);
  }

  function changePerPage(value: number) {
    setLoading(true);
    setPerPage(value);
    setPage(1);
  }

  function reload() {
    setLoading(true);
    setReloadKey((key) => key + 1);
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
      if (filters.status) reload();
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
    filters.assignee_id ||
    deadline ||
    search;

  const showPagination = view === "list";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Tasks</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {filtered.length} ditampilkan · {meta?.total ?? tasks.length} total.
          </p>
        </div>
        <Button onClick={() => openNewTask("Backlog")}>Task Baru</Button>
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Cari di halaman ini…"
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
            className="max-w-xs"
            value={filters.assignee_id}
            onChange={(event) => updateFilter("assignee_id", event.target.value)}
          >
            <option value="">Semua penanggung jawab</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>

          <Select
            className="max-w-[190px]"
            value={deadline}
            onChange={(event) =>
              changeDeadline(event.target.value as DeadlineFilter)
            }
          >
            <option value="">Semua deadline</option>
            <option value="overdue">Terlambat</option>
            <option value="upcoming">7 hari ke depan</option>
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
              onClick={() => switchView("list")}
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
              onClick={() => switchView("board")}
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
          action={<Button onClick={() => openNewTask("Backlog")}>Task Baru</Button>}
        />
      ) : view === "board" ? (
        <KanbanBoard
          tasks={filtered}
          onOpen={(task) => router.push(`/tasks/${task.id}`)}
          onStatusChange={handleStatusChange}
          onAdd={openNewTask}
        />
      ) : (
        <>
          <Card className="space-y-2 p-4">
            {filtered.map((task) => (
              <TaskListItem key={task.id} task={task} />
            ))}
          </Card>

          {showPagination ? (
            <Pagination
              page={meta?.current_page ?? page}
              lastPage={meta?.last_page ?? 1}
              total={meta?.total ?? tasks.length}
              perPage={perPage}
              perPageOptions={[10, 20, 50, 100]}
              onPageChange={goToPage}
              onPerPageChange={changePerPage}
            />
          ) : null}
        </>
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
          onSaved={(saved) => {
            if (editingTask) {
              upsertTask(saved);
            } else {
              reload();
              setPage(1);
            }
          }}
        />
      ) : null}
    </div>
  );
}
