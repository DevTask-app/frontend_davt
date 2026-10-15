"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { InviteForm } from "@/components/workspaces/invite-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorBanner, Spinner } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { api, ApiError } from "@/lib/api";
import {
  INVITABLE_WORKSPACE_ROLES,
  WORKSPACE_ROLE_LABELS,
  WORKSPACE_ROLE_STYLES,
} from "@/lib/enums";
import type {
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceRole,
} from "@/lib/types";
import { formatDate, initials } from "@/lib/utils";
import { managesWorkspace } from "@/lib/workspace";

export default function WorkspaceSettingsPage() {
  const params = useParams<{ id: string }>();
  const workspaceId = params.id;
  const router = useRouter();
  const { refresh } = useWorkspace();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<number | null>(null);
  const [busyInvitationId, setBusyInvitationId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    api
      .getWorkspace(workspaceId)
      .then(async (response) => {
        const loaded = response.data;
        const canManage = managesWorkspace(loaded.role);
        const [membersRes, invitationsRes] = await Promise.all([
          api.listWorkspaceMembers(workspaceId),
          canManage
            ? api.listWorkspaceInvitations(workspaceId)
            : Promise.resolve({ data: [] as WorkspaceInvitation[] }),
        ]);
        if (!active) return;
        setWorkspace(loaded);
        setMembers(membersRes.data);
        setInvitations(invitationsRes.data);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof ApiError ? err.firstError() : "Gagal memuat workspace.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [workspaceId]);

  const canManage = managesWorkspace(workspace?.role);
  const isOwner = workspace?.role === "Owner";

  function openRename() {
    setRenameValue(workspace?.name ?? "");
    setRenameError(null);
    setRenameOpen(true);
  }

  async function handleRename(event: React.FormEvent) {
    event.preventDefault();
    if (!workspace) return;
    const name = renameValue.trim();
    if (!name) {
      setRenameError("Nama workspace wajib diisi.");
      return;
    }
    setSavingName(true);
    setRenameError(null);
    try {
      const response = await api.updateWorkspace(workspace.id, { name });
      setWorkspace(response.data);
      setRenameOpen(false);
      await refresh();
    } catch (err) {
      setRenameError(
        err instanceof ApiError ? err.firstError() : "Gagal mengubah nama.",
      );
    } finally {
      setSavingName(false);
    }
  }

  async function handleDeleteWorkspace() {
    if (!workspace) return;
    setDeleting(true);
    setActionError(null);
    try {
      await api.deleteWorkspace(workspace.id);
      await refresh();
      router.push("/dashboard");
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.firstError() : "Gagal menghapus workspace.",
      );
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function changeRole(member: WorkspaceMember, role: WorkspaceRole) {
    if (!workspace) return;
    setBusyMemberId(member.id);
    setActionError(null);
    try {
      const response = await api.updateWorkspaceMember(workspace.id, member.id, {
        role,
      });
      setMembers((prev) =>
        prev.map((item) =>
          item.id === member.id ? { ...item, role: response.data.role } : item,
        ),
      );
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.firstError() : "Gagal mengubah peran.",
      );
    } finally {
      setBusyMemberId(null);
    }
  }

  async function removeMember(member: WorkspaceMember) {
    if (!workspace) return;
    setBusyMemberId(member.id);
    setActionError(null);
    try {
      await api.removeWorkspaceMember(workspace.id, member.id);
      setMembers((prev) => prev.filter((item) => item.id !== member.id));
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.firstError() : "Gagal mengeluarkan anggota.",
      );
    } finally {
      setBusyMemberId(null);
    }
  }

  async function revokeInvitation(invitation: WorkspaceInvitation) {
    if (!workspace) return;
    setBusyInvitationId(invitation.id);
    setActionError(null);
    try {
      await api.revokeWorkspaceInvitation(workspace.id, invitation.id);
      setInvitations((prev) => prev.filter((item) => item.id !== invitation.id));
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.firstError() : "Gagal membatalkan undangan.",
      );
    } finally {
      setBusyInvitationId(null);
    }
  }

  async function copyInviteLink(invitation: WorkspaceInvitation) {
    const link = `${window.location.origin}/invitations/${invitation.token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(invitation.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setActionError("Tidak dapat menyalin link. Salin manual dari email.");
    }
  }

  if (loading) return <Spinner label="Memuat workspace…" />;
  if (error) return <ErrorBanner message={error} />;
  if (!workspace) return null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
        >
          ← Dashboard
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{workspace.name}</h2>
              {workspace.is_personal ? (
                <Badge className="bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300">
                  Personal
                </Badge>
              ) : null}
              {workspace.role ? (
                <Badge className={WORKSPACE_ROLE_STYLES[workspace.role]}>
                  {WORKSPACE_ROLE_LABELS[workspace.role]}
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {members.length} anggota · {workspace.projects_count ?? 0} project
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <Button variant="outline" size="sm" onClick={openRename}>
                Ubah nama
              </Button>
            ) : null}
            {isOwner && !workspace.is_personal ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeleteOpen(true)}
              >
                Hapus workspace
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {actionError ? <ErrorBanner message={actionError} /> : null}

      <Card>
        <CardHeader
          title="Anggota"
          description={
            canManage
              ? "Kelola peran dan keanggotaan workspace."
              : "Daftar anggota workspace ini."
          }
          action={
            canManage ? (
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                Undang anggota
              </Button>
            ) : undefined
          }
        />
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100">
                  {initials(member.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{member.name}</p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {member.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {member.role === "Owner" || !canManage ? (
                  member.role ? (
                    <Badge className={WORKSPACE_ROLE_STYLES[member.role]}>
                      {WORKSPACE_ROLE_LABELS[member.role]}
                    </Badge>
                  ) : null
                ) : (
                  <>
                    <Select
                      className="h-9 w-32"
                      value={member.role ?? "Member"}
                      disabled={busyMemberId === member.id}
                      onChange={(event) =>
                        changeRole(member, event.target.value as WorkspaceRole)
                      }
                    >
                      {INVITABLE_WORKSPACE_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {WORKSPACE_ROLE_LABELS[role]}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyMemberId === member.id}
                      onClick={() => removeMember(member)}
                    >
                      Keluarkan
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader
            title="Undangan tertunda"
            description={`${invitations.length} undangan menunggu diterima.`}
          />
          <div className="p-4">
            {invitations.length === 0 ? (
              <EmptyState
                title="Tidak ada undangan tertunda"
                description="Undang anggota baru untuk berkolaborasi di workspace ini."
              />
            ) : (
              <ul className="space-y-2">
                {invitations.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {invitation.email}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {WORKSPACE_ROLE_LABELS[invitation.role]} · kedaluwarsa{" "}
                        {formatDate(invitation.expires_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyInviteLink(invitation)}
                      >
                        {copiedId === invitation.id ? "Tersalin" : "Salin link"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyInvitationId === invitation.id}
                        onClick={() => revokeInvitation(invitation)}
                      >
                        Batalkan
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      ) : null}

      {inviteOpen ? (
        <InviteForm
          workspaceId={workspace.id}
          onClose={() => setInviteOpen(false)}
          onInvited={(invitation) =>
            setInvitations((prev) => [invitation, ...prev])
          }
        />
      ) : null}

      {renameOpen ? (
        <Modal
          open
          title="Ubah nama workspace"
          onClose={() => setRenameOpen(false)}
        >
          <form className="space-y-4" onSubmit={handleRename} noValidate>
            {renameError ? <ErrorBanner message={renameError} /> : null}
            <Input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              placeholder="Nama workspace"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameOpen(false)}
                disabled={savingName}
              >
                Batal
              </Button>
              <Button type="submit" loading={savingName}>
                Simpan
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        title="Hapus workspace?"
        message={`Workspace "${workspace.name}" akan dihapus permanen. Workspace yang masih memiliki project tidak dapat dihapus.`}
        loading={deleting}
        onConfirm={handleDeleteWorkspace}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
