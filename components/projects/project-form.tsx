"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ErrorBanner } from "@/components/ui/feedback";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { api, ApiError } from "@/lib/api";
import { PROJECT_STATUSES } from "@/lib/enums";
import type { Project } from "@/lib/types";
import { toDateInput } from "@/lib/utils";
import { projectSchema, zodFieldErrors } from "@/lib/validation";

const EMPTY = {
  name: "",
  description: "",
  status: "Active",
  start_date: "",
  due_date: "",
};

export function ProjectForm({
  project,
  onClose,
  onSaved,
}: {
  project?: Project | null;
  onClose: () => void;
  onSaved: (project: Project) => void;
}) {
  const [values, setValues] = useState(() =>
    project
      ? {
          name: project.name,
          description: project.description ?? "",
          status: project.status,
          start_date: toDateInput(project.start_date),
          due_date: toDateInput(project.due_date),
        }
      : EMPTY,
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

    const parsed = projectSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const payload = parsed.data;
      const response = project
        ? await api.updateProject(project.id, payload)
        : await api.createProject(payload);
      onSaved(response.data);
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.flattenErrors());
        setFormError(error.firstError());
      } else {
        setFormError("Gagal menyimpan project.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={project ? "Edit Project" : "Project Baru"}
      description={
        project ? "Perbarui detail project." : "Buat project untuk menampung task."
      }
      onClose={onClose}
    >
      <form id="project-form" className="space-y-4" onSubmit={handleSubmit} noValidate>
        {formError ? <ErrorBanner message={formError} /> : null}

        <Field label="Nama" htmlFor="p-name" error={errors.name}>
          <Input
            id="p-name"
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Nama project"
          />
        </Field>

        <Field label="Deskripsi" htmlFor="p-desc" error={errors.description}>
          <Textarea
            id="p-desc"
            value={values.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="Deskripsi singkat project"
          />
        </Field>

        <Field label="Status" htmlFor="p-status" error={errors.status}>
          <Select
            id="p-status"
            value={values.status}
            onChange={(event) => update("status", event.target.value)}
          >
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Tanggal Mulai" htmlFor="p-start" error={errors.start_date}>
            <Input
              id="p-start"
              type="date"
              value={values.start_date}
              onChange={(event) => update("start_date", event.target.value)}
            />
          </Field>
          <Field label="Tenggat" htmlFor="p-due" error={errors.due_date}>
            <Input
              id="p-due"
              type="date"
              value={values.due_date}
              onChange={(event) => update("due_date", event.target.value)}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" loading={saving}>
            {project ? "Simpan" : "Buat Project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
