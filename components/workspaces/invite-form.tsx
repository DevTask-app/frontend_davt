"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ErrorBanner } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { api, ApiError } from "@/lib/api";
import {
  INVITABLE_WORKSPACE_ROLES,
  WORKSPACE_ROLE_DESCRIPTIONS,
  WORKSPACE_ROLE_LABELS,
} from "@/lib/enums";
import type { WorkspaceInvitation, WorkspaceRole } from "@/lib/types";
import { invitationSchema, zodFieldErrors } from "@/lib/validation";

export function InviteForm({
  workspaceId,
  onClose,
  onInvited,
}: {
  workspaceId: number | string;
  onClose: () => void;
  onInvited: (invitation: WorkspaceInvitation) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("Member");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const parsed = invitationSchema.safeParse({ email, role });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const response = await api.createWorkspaceInvitation(
        workspaceId,
        parsed.data,
      );
      onInvited(response.data);
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.flattenErrors());
        setFormError(error.firstError());
      } else {
        setFormError("Gagal mengirim undangan.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title="Undang anggota"
      description="Kirim undangan lewat email untuk bergabung ke workspace ini."
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {formError ? <ErrorBanner message={formError} /> : null}

        <Field label="Email" htmlFor="i-email" error={errors.email}>
          <Input
            id="i-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nama@email.com"
            autoFocus
          />
        </Field>

        <Field
          label="Peran"
          htmlFor="i-role"
          error={errors.role}
          hint={WORKSPACE_ROLE_DESCRIPTIONS[role]}
        >
          <Select
            id="i-role"
            value={role}
            onChange={(event) => setRole(event.target.value as WorkspaceRole)}
          >
            {INVITABLE_WORKSPACE_ROLES.map((option) => (
              <option key={option} value={option}>
                {WORKSPACE_ROLE_LABELS[option]}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" loading={saving}>
            Kirim Undangan
          </Button>
        </div>
      </form>
    </Modal>
  );
}
