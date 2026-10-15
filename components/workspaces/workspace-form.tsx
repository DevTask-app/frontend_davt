"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ErrorBanner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { api, ApiError } from "@/lib/api";
import type { Workspace } from "@/lib/types";
import { workspaceSchema, zodFieldErrors } from "@/lib/validation";

export function WorkspaceForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (workspace: Workspace) => void;
}) {
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const parsed = workspaceSchema.safeParse({ name });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const response = await api.createWorkspace(parsed.data);
      onSaved(response.data);
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.flattenErrors());
        setFormError(error.firstError());
      } else {
        setFormError("Gagal membuat workspace.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title="Workspace Baru"
      description="Buat workspace tim untuk berkolaborasi dengan anggota lain."
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {formError ? <ErrorBanner message={formError} /> : null}

        <Field label="Nama" htmlFor="w-name" error={errors.name}>
          <Input
            id="w-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Contoh: Tim Produk"
            autoFocus
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" loading={saving}>
            Buat Workspace
          </Button>
        </div>
      </form>
    </Modal>
  );
}
