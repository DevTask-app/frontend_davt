"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ProjectForm } from "@/components/projects/project-form";
import { BlockedReasonDialog } from "@/components/tasks/blocked-reason-dialog";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { TaskListItem } from "@/components/tasks/task-list-item";
import { ProjectStatusBadge } from "@/components/tasks/task-badges";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorBanner, Spinner } from "@/components/ui/feedback";
import { api, ApiError } from "@/lib/api";
import { useRealtimeEvents } from "@/lib/realtime";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useAuth } from "@/components/providers/auth-provider";
import type { Project, Task, TaskStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { canChangeTaskStatus, canEditTaskDetails } from "@/lib/workspace";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;
  const { activeWorkspace, canContribute } = useWorkspace();
  const { user } = useAuth();
  const canEdit = canEditTaskDetails(activeWorkspace?.role);

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "list">("board");
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<string>("Backlog");
  const [actionError, setActionError] = useState<string | null>(null);
  const [blockedRequest, setBlockedRequest] = useState<{
    task: Task;
    status: TaskStatus;
  } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const realtimeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refresh board/list task project ini senyap saat ada perubahan.
  useRealtimeEvents((event) => {
    if (event.project_id !== Number(projectId)) return;
    if (realtimeTimer.current !== null) clearTimeout(realtimeTimer.current);
    realtimeTimer.current = setTimeout(() => {
      realtimeTimer.current = null;
      setReloadKey((key) => key + 1);
    }, 300);
  });

  useEffect(
    () => () => {
      if (realtimeTimer.current !== null) clearTimeout(realtimeTimer.current);
    },
    [],
  );

  useEffect(() => {
    let active = true;
    Promise.all([
      api.getProject(projectId),
      api.listProjectTasks(projectId, { per_page: 100 }),
    ])
      .then(([projectRes, tasksRes]) => {
        if (!active) return;
        setProject(projectRes.data);
        setTasks(tasksRes.data);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof ApiError ? err.firstError() : "Gagal memuat project.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId, reloadKey]);

  function upsertTask(task: Task) {
    setTasks((prev) => {
      const exists = prev.some((item) => item.id === task.id);
      return exists
        ? prev.map((item) => (item.id === task.id ? task : item))
        : [task, ...prev];
    });
  }

  async function commitStatusChange(
    task: Task,
    status: TaskStatus,
    blockedReason?: string,
  ) {
    const previous = tasks;
    setTasks((prev) =>
      prev.map((item) => (item.id === task.id ? { ...item, status } : item)),
    );
    setActionError(null);
    try {
      const response = await api.updateTaskStatus(task.id, status, blockedReason);
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

  function handleStatusChange(task: Task, status: TaskStatus) {
    if (status === "Blocked") {
      setBlockedRequest({ task, status });
      return;
    }
    void commitStatusChange(task, status);
  }

  function openNewTask(status: string) {
    setEditingTask(null);
    setDefaultStatus(status);
    setTaskFormOpen(true);
  }

  if (loading) return <Spinner label="Memuat project…" />;
  if (error) return <ErrorBanner message={error} />;
  if (!project) return null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/projects"
          className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
        >
          ← Semua project
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{project.name}</h2>
              <ProjectStatusBadge status={project.status} />
            </div>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
              {project.description || "Tanpa deskripsi"}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {formatDate(project.start_date)} — {formatDate(project.due_date)} ·{" "}
              {tasks.length} task
            </p>
          </div>
          {canContribute ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProjectFormOpen(true)}
              >
                Edit Project
              </Button>
              <Button size="sm" onClick={() => openNewTask("Backlog")}>
                Task Baru
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {actionError ? <ErrorBanner message={actionError} /> : null}

      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700">
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
        </div>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="Belum ada task"
          description={
            canContribute
              ? "Tambahkan task pertama pada project ini."
              : "Belum ada task pada project ini."
          }
          action={
            canContribute ? (
              <Button onClick={() => openNewTask("Backlog")}>Task Baru</Button>
            ) : undefined
          }
        />
      ) : view === "board" ? (
        <KanbanBoard
          tasks={tasks}
          onOpen={(task) => {
            if (canEdit) {
              setEditingTask(task);
              setTaskFormOpen(true);
              return;
            }
            router.push(`/tasks/${task.id}`);
          }}
          onStatusChange={handleStatusChange}
          onAdd={canContribute ? openNewTask : undefined}
          canDrag={(task) =>
            canChangeTaskStatus(activeWorkspace?.role, task, user?.id)
          }
        />
      ) : (
        <Card className="space-y-2 p-4">
          {tasks.map((task) => (
            <TaskListItem key={task.id} task={task} />
          ))}
        </Card>
      )}

      {projectFormOpen && canContribute ? (
        <ProjectForm
          project={project}
          onClose={() => setProjectFormOpen(false)}
          onSaved={(updated) => setProject(updated)}
        />
      ) : null}

      {taskFormOpen && canContribute ? (
        <TaskForm
          projects={[project]}
          task={editingTask}
          defaultProjectId={project.id}
          defaultStatus={defaultStatus}
          onClose={() => setTaskFormOpen(false)}
          onSaved={(saved) => {
            upsertTask(saved);
            setProject((prev) =>
              prev && !editingTask
                ? { ...prev, tasks_count: (prev.tasks_count ?? 0) + 1 }
                : prev,
            );
          }}
        />
      ) : null}

      {blockedRequest ? (
        <BlockedReasonDialog
          taskTitle={blockedRequest.task.title}
          onCancel={() => setBlockedRequest(null)}
          onConfirm={(reason) => {
            const request = blockedRequest;
            setBlockedRequest(null);
            void commitStatusChange(request.task, request.status, reason);
          }}
        />
      ) : null}
    </div>
  );
}
