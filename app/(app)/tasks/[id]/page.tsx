"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PriorityBadge, StatusBadge, TypeBadge } from "@/components/tasks/task-badges";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorBanner, Spinner } from "@/components/ui/feedback";
import { Select } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/modal";
import { api, ApiError } from "@/lib/api";
import {
  ACTIVITY_ACTIONS,
  FIELD_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "@/lib/enums";
import type { Task, TaskActivityLog, TaskPriority, TaskStatus } from "@/lib/types";
import {
  ACCEPTED_IMAGE_TYPES,
  formatDate,
  formatDateTime,
  formatFileSize,
  humanizeFieldValue,
  isOverdue,
  storagePath,
  validateImageFile,
} from "@/lib/utils";

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const taskId = params.id;

  const [task, setTask] = useState<Task | null>(null);
  const [activities, setActivities] = useState<TaskActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingField, setSavingField] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.getTask(taskId), api.taskActivities(taskId)])
      .then(([taskRes, activityRes]) => {
        if (!active) return;
        setTask(taskRes.data);
        setActivities(activityRes.data);
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
  }, [taskId]);

  async function changeStatus(status: TaskStatus) {
    if (!task) return;
    setSavingField(true);
    setActionError(null);
    try {
      const response = await api.updateTaskStatus(task.id, status);
      setTask(response.data);
      const activityRes = await api.taskActivities(task.id);
      setActivities(activityRes.data);
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.firstError() : "Gagal mengubah status.",
      );
    } finally {
      setSavingField(false);
    }
  }

  async function changePriority(priority: TaskPriority) {
    if (!task) return;
    setSavingField(true);
    setActionError(null);
    try {
      const response = await api.updateTaskPriority(task.id, priority);
      setTask(response.data);
      const activityRes = await api.taskActivities(task.id);
      setActivities(activityRes.data);
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.firstError() : "Gagal mengubah prioritas.",
      );
    } finally {
      setSavingField(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    setDeleting(true);
    setActionError(null);
    try {
      await api.deleteTask(task.id);
      router.push("/tasks");
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.firstError() : "Gagal menghapus task.",
      );
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !task) return;

    const message = validateImageFile(file);
    if (message) {
      setActionError(message);
      return;
    }

    setUploading(true);
    setActionError(null);
    try {
      await api.uploadTaskAttachment(task.id, file);
      const [taskRes, activityRes] = await Promise.all([
        api.getTask(task.id),
        api.taskActivities(task.id),
      ]);
      setTask(taskRes.data);
      setActivities(activityRes.data);
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.firstError() : "Gagal mengunggah foto.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function removeAttachment(id: number) {
    if (!task) return;
    setRemovingId(id);
    setActionError(null);
    try {
      await api.deleteTaskAttachment(id);
      const [taskRes, activityRes] = await Promise.all([
        api.getTask(task.id),
        api.taskActivities(task.id),
      ]);
      setTask(taskRes.data);
      setActivities(activityRes.data);
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.firstError() : "Gagal menghapus foto.",
      );
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) return <Spinner label="Memuat task…" />;
  if (error) return <ErrorBanner message={error} />;
  if (!task) return null;

  const attachments = task.attachments ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/tasks"
          className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
        >
          ← Semua task
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{task.title}</h2>
              {isOverdue(task) ? (
                <span className="text-xs font-medium text-red-600 dark:text-red-400">
                  Terlambat
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              <TypeBadge type={task.type} />
              {task.project ? (
                <Link
                  href={`/projects/${task.project.id}`}
                  className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  {task.project.name}
                </Link>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              Hapus
            </Button>
          </div>
        </div>
      </div>

      {actionError ? <ErrorBanner message={actionError} /> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-4">
            <h3 className="text-sm font-semibold">Deskripsi</h3>
            <p className="mt-2 whitespace-pre-line text-sm text-zinc-600 dark:text-zinc-300">
              {task.description || "Tanpa deskripsi."}
            </p>
          </Card>

          {task.blocked_reason ? (
            <Card className="border-red-200 p-4 dark:border-red-900/50">
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">
                Alasan terblokir
              </h3>
              <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                {task.blocked_reason}
              </p>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Lampiran"
              description={`${attachments.length} foto terlampir.`}
              action={
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                  {uploading ? "Mengunggah…" : "Tambah foto"}
                  <input
                    type="file"
                    accept={ACCEPTED_IMAGE_TYPES.join(",")}
                    className="hidden"
                    disabled={uploading}
                    onChange={handleUpload}
                  />
                </label>
              }
            />
            <div className="p-4">
              {attachments.length === 0 ? (
                <EmptyState
                  title="Belum ada lampiran"
                  description="Unggah foto (maks. 2 MB) sebagai bukti pengerjaan task."
                />
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {attachments.map((attachment) => (
                    <li
                      key={attachment.id}
                      className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700"
                    >
                      <a
                        href={storagePath(attachment.url)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={storagePath(attachment.url)}
                          alt={attachment.original_name}
                          className="h-32 w-full object-cover"
                        />
                      </a>
                      <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                        <span
                          className="truncate text-xs text-zinc-500 dark:text-zinc-400"
                          title={attachment.original_name}
                        >
                          {attachment.original_name} ·{" "}
                          {formatFileSize(attachment.size)}
                        </span>
                        <button
                          type="button"
                          disabled={removingId === attachment.id}
                          onClick={() => removeAttachment(attachment.id)}
                          className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                        >
                          Hapus
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Riwayat aktivitas"
              description={`${activities.length} perubahan tercatat.`}
            />
            <div className="p-4">
              {activities.length === 0 ? (
                <EmptyState title="Belum ada aktivitas" />
              ) : (
                <ol className="space-y-4">
                  {activities.map((activity) => (
                    <li key={activity.id} className="flex gap-3">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-zinc-400" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {ACTIVITY_ACTIONS[activity.action] ?? activity.action}
                        </p>
                        {Object.entries(activity.changes).length > 0 ? (
                          <ul className="mt-1 space-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            {Object.entries(activity.changes).map(
                              ([field, change]) => (
                                <li key={field}>
                                  {FIELD_LABELS[field] ?? field}:{" "}
                                  <span className="line-through">
                                    {humanizeFieldValue(field, change.old)}
                                  </span>{" "}
                                  →{" "}
                                  <span className="font-medium text-zinc-700 dark:text-zinc-200">
                                    {humanizeFieldValue(field, change.new)}
                                  </span>
                                </li>
                              ),
                            )}
                          </ul>
                        ) : null}
                        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-600">
                          {formatDateTime(activity.created_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4 p-4">
            <h3 className="text-sm font-semibold">Aksi cepat</h3>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Status
              </label>
              <Select
                value={task.status}
                disabled={savingField}
                onChange={(event) => changeStatus(event.target.value as TaskStatus)}
              >
                {TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Prioritas
              </label>
              <Select
                value={task.priority}
                disabled={savingField}
                onChange={(event) =>
                  changePriority(event.target.value as TaskPriority)
                }
              >
                {TASK_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </Select>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold">Detail</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500 dark:text-zinc-400">Tenggat</dt>
                <dd>{formatDate(task.due_date)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500 dark:text-zinc-400">Estimasi</dt>
                <dd>
                  {task.estimated_hours ? `${task.estimated_hours} jam` : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500 dark:text-zinc-400">Realisasi</dt>
                <dd>
                  {task.actual_hours ? `${task.actual_hours} jam` : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500 dark:text-zinc-400">Selesai</dt>
                <dd>{formatDateTime(task.completed_at)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500 dark:text-zinc-400">Dibuat</dt>
                <dd>{formatDateTime(task.created_at)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500 dark:text-zinc-400">Diubah</dt>
                <dd>{formatDateTime(task.updated_at)}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      {editOpen ? (
        <TaskForm
          projects={task.project ? [task.project] : []}
          task={task}
          onClose={() => setEditOpen(false)}
          onSaved={(saved) => setTask(saved)}
        />
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        title="Hapus task?"
        message={`Task "${task.title}" akan dihapus permanen.`}
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
