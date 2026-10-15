"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/components/providers/notification-provider";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorBanner, Spinner } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { api, ApiError } from "@/lib/api";
import {
  isUnread,
  notificationActor,
  notificationHref,
  notificationProject,
  notificationTitle,
  notificationWorkspaceId,
} from "@/lib/notifications";
import type { AppNotification, Paginated } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

type PaginationMeta = Paginated<AppNotification>["meta"];

export default function NotificationsPage() {
  const router = useRouter();
  const { unreadCount, refreshUnread, markRead, markAllRead } =
    useNotifications();
  const { setActiveWorkspace } = useWorkspace();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AppNotification | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    api
      .listNotifications({ page, per_page: perPage })
      .then((response) => {
        if (!active) return;
        setItems(response.data);
        setMeta(response.meta);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.firstError()
            : "Gagal memuat notifikasi.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, perPage]);

  function goToPage(next: number) {
    setLoading(true);
    setPage(next);
  }

  function changePerPage(value: number) {
    setLoading(true);
    setPerPage(value);
    setPage(1);
  }

  function switchWorkspace(notification: AppNotification) {
    const workspaceId = notificationWorkspaceId(notification);
    if (workspaceId !== null) {
      setActiveWorkspace(workspaceId);
    }
  }

  function openNotification(notification: AppNotification) {
    switchWorkspace(notification);
    router.push(notificationHref(notification));
  }

  async function handleMarkRead(notification: AppNotification) {
    setActionError(null);
    setBusyId(notification.id);
    try {
      await markRead(notification.id);
      setItems((prev) =>
        prev.map((item) =>
          item.id === notification.id
            ? { ...item, read_at: new Date().toISOString() }
            : item,
        ),
      );
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.firstError()
          : "Gagal menandai notifikasi.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkAllRead() {
    setActionError(null);
    try {
      await markAllRead();
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          read_at: item.read_at ?? new Date().toISOString(),
        })),
      );
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.firstError()
          : "Gagal menandai semua notifikasi.",
      );
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setActionError(null);
    setBusyId(target.id);
    try {
      await api.deleteNotification(target.id);
      setPendingDelete(null);
      setItems((prev) => prev.filter((item) => item.id !== target.id));
      setMeta((prev) =>
        prev ? { ...prev, total: Math.max(0, prev.total - 1) } : prev,
      );
      void refreshUnread();
      if (items.length === 1 && page > 1) {
        goToPage(page - 1);
      }
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.firstError()
          : "Gagal menghapus notifikasi.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Notifikasi</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {unreadCount > 0
              ? `${unreadCount} notifikasi belum dibaca.`
              : "Semua notifikasi sudah dibaca."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={unreadCount === 0}
          onClick={() => void handleMarkAllRead()}
        >
          Tandai semua dibaca
        </Button>
      </div>

      {actionError ? <ErrorBanner message={actionError} /> : null}

      {loading ? (
        <Spinner label="Memuat notifikasi…" />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Belum ada notifikasi"
          description="Anda akan menerima notifikasi saat ditugaskan ke sebuah task."
        />
      ) : (
        <>
          <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((notification) => {
              const unread = isUnread(notification);
              const actor = notificationActor(notification);
              const project = notificationProject(notification);
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between",
                    unread && "bg-blue-50/50 dark:bg-blue-950/10",
                  )}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        unread ? "bg-blue-600" : "bg-transparent",
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0">
                        <Link
                          href={notificationHref(notification)}
                          onClick={() => switchWorkspace(notification)}
                          className="block truncate text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                        >
                        {notificationTitle(notification)}
                      </Link>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {actor ? `Ditugaskan oleh ${actor}` : "Notifikasi"}
                        {project ? ` · ${project}` : ""}
                        {" · "}
                        {formatDateTime(notification.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7"
                      onClick={() => openNotification(notification)}
                    >
                      Buka
                    </Button>
                    {unread ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7"
                        loading={busyId === notification.id}
                        onClick={() => void handleMarkRead(notification)}
                      >
                        Tandai dibaca
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      onClick={() => setPendingDelete(notification)}
                    >
                      Hapus
                    </Button>
                  </div>
                </div>
              );
            })}
          </Card>

          <Pagination
            page={meta?.current_page ?? page}
            lastPage={meta?.last_page ?? 1}
            total={meta?.total ?? items.length}
            perPage={perPage}
            perPageOptions={[10, 20, 50]}
            onPageChange={goToPage}
            onPerPageChange={changePerPage}
            disabled={loading}
          />
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus notifikasi"
        message={
          pendingDelete
            ? `Hapus notifikasi "${notificationTitle(pendingDelete)}"?`
            : ""
        }
        loading={busyId === pendingDelete?.id}
        onConfirm={() => void handleDelete()}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
