"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

export function BlockedReasonDialog({
  taskTitle,
  loading = false,
  onCancel,
  onConfirm,
}: {
  taskTitle: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();

  return (
    <Modal
      open
      title="Tandai task terblokir"
      description={`Berikan alasan mengapa "${taskTitle}" terblokir.`}
      onClose={onCancel}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Batal
          </Button>
          <Button
            onClick={() => onConfirm(trimmed)}
            loading={loading}
            disabled={!trimmed}
          >
            Simpan
          </Button>
        </>
      }
    >
      <Field label="Alasan terblokir" htmlFor="blocked-reason">
        <Input
          id="blocked-reason"
          value={reason}
          autoFocus
          placeholder="Mis. menunggu keputusan desain"
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
    </Modal>
  );
}
