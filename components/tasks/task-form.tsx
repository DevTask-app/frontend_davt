"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ErrorBanner } from "@/components/ui/feedback";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { api, ApiError } from "@/lib/api";
import { TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from "@/lib/enums";
import type { Project, Task } from "@/lib/types";
import { toDateInput } from "@/lib/utils";
import { taskSchema, zodFieldErrors } from "@/lib/validation";

interface TaskFormProps {
  projects: Project[];
  task?: Task | null;
  defaultProjectId?: number;
  defaultStatus?: string;
  defaultDueDate?: string;
  onClose: () => void;
  onSaved: (task: Task) => void;
}

const EMPTY = {
  project_id: "",
  title: "",
  description: "",
  type: "Feature",
  status: "Backlog",
  priority: "Medium",
  due_date: "",
  estimated_hours: "",
  actual_hours: "",
  blocked_reason: "",
};

export function TaskForm({
  projects,
  task,
  defaultProjectId,
  defaultStatus,
  defaultDueDate,
  onClose,
  onSaved,
}: TaskFormProps) {
  const [values, setValues] = useState(() =>
    task
      ? {
          project_id: String(task.project_id),
          title: task.title,
          description: task.description ?? "",
          type: task.type,
          status: task.status,
          priority: task.priority,
          due_date: toDateInput(task.due_date),
          estimated_hours:
            task.estimated_hours === null ? "" : String(task.estimated_hours),
          actual_hours:
            task.actual_hours === null ? "" : String(task.actual_hours),
          blocked_reason: task.blocked_reason ?? "",
        }
      : {
          ...EMPTY,
          project_id: defaultProjectId ? String(defaultProjectId) : "",
          status: defaultStatus ?? "Backlog",
          due_date: defaultDueDate ?? "",
        },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update(key: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const parsed = taskSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    const data = parsed.data;
    try {
      const response = task
        ? await api.updateTask(task.id, {
            title: data.title,
            description: data.description,
            type: data.type,
            status: data.status,
            priority: data.priority,
            due_date: data.due_date,
            estimated_hours: data.estimated_hours,
            actual_hours: data.actual_hours,
            blocked_reason: data.blocked_reason,
          })
        : await api.createTask({
            project_id: data.project_id,
            title: data.title,
            description: data.description,
            type: data.type,
            status: data.status,
            priority: data.priority,
            due_date: data.due_date,
            estimated_hours: data.estimated_hours,
            blocked_reason: data.blocked_reason,
          });
      onSaved(response.data);
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.flattenErrors());
        setFormError(error.firstError());
      } else {
        setFormError("Gagal menyimpan task.");
      }
    } finally {
      setSaving(false);
    }
  }

  const blocked = values.status === "Blocked";

  return (
    <Modal
      open
      title={task ? "Edit Task" : "Task Baru"}
      description={
        task ? "Perbarui detail task." : "Tambahkan task ke project Anda."
      }
      onClose={onClose}
      size="lg"
    >
      <form id="task-form" className="space-y-4" onSubmit={handleSubmit} noValidate>
        {formError ? <ErrorBanner message={formError} /> : null}

        <Field label="Project" htmlFor="t-project" error={errors.project_id}>
          <Select
            id="t-project"
            value={values.project_id}
            disabled={Boolean(task)}
            onChange={(event) => update("project_id", event.target.value)}
          >
            <option value="">Pilih project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Judul" htmlFor="t-title" error={errors.title}>
          <Input
            id="t-title"
            value={values.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="Judul task"
          />
        </Field>

        <Field label="Deskripsi" htmlFor="t-desc" error={errors.description}>
          <Textarea
            id="t-desc"
            value={values.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="Detail task"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tipe" htmlFor="t-type" error={errors.type}>
            <Select
              id="t-type"
              value={values.type}
              onChange={(event) => update("type", event.target.value)}
            >
              {TASK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="t-status" error={errors.status}>
            <Select
              id="t-status"
              value={values.status}
              onChange={(event) => update("status", event.target.value)}
            >
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prioritas" htmlFor="t-priority" error={errors.priority}>
            <Select
              id="t-priority"
              value={values.priority}
              onChange={(event) => update("priority", event.target.value)}
            >
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tenggat" htmlFor="t-due" error={errors.due_date}>
            <Input
              id="t-due"
              type="date"
              value={values.due_date}
              onChange={(event) => update("due_date", event.target.value)}
            />
          </Field>
          <Field
            label="Estimasi (jam)"
            htmlFor="t-est"
            error={errors.estimated_hours}
          >
            <Input
              id="t-est"
              type="number"
              min={0}
              step="0.5"
              value={values.estimated_hours}
              onChange={(event) => update("estimated_hours", event.target.value)}
            />
          </Field>
          <Field
            label="Realisasi (jam)"
            htmlFor="t-act"
            error={errors.actual_hours}
          >
            <Input
              id="t-act"
              type="number"
              min={0}
              step="0.5"
              value={values.actual_hours}
              disabled={!task}
              onChange={(event) => update("actual_hours", event.target.value)}
            />
          </Field>
        </div>

        {blocked ? (
          <Field
            label="Alasan Blocked"
            htmlFor="t-blocked"
            error={errors.blocked_reason}
          >
            <Textarea
              id="t-blocked"
              value={values.blocked_reason}
              onChange={(event) => update("blocked_reason", event.target.value)}
              placeholder="Mengapa task ini terhambat?"
            />
          </Field>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" loading={saving}>
            {task ? "Simpan" : "Buat Task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
