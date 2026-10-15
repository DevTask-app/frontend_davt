"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/components/providers/notification-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { api } from "@/lib/api";
import {
  isUnread,
  notificationActor,
  notificationHref,
  notificationTitle,
  notificationWorkspaceId,
} from "@/lib/notifications";
import type { AppNotification } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Bell } from "lucide-react";

export function NotificationBell() {
  const router = useRouter();
  const { unreadCount, markRead, markAllRead } = useNotifications();
  const { setActiveWorkspace } = useWorkspace();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  async function loadPreview() {
    setLoading(true);
    try {
      const response = await api.listNotifications({ per_page: 8 });
      setItems(response.data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const next = !isOpen;
    setIsOpen(next);
    if (next) void loadPreview();
  }

  function close() {
    setIsOpen(false);
  }

  function openNotification(notification: AppNotification) {
    close();
    const wsId = notificationWorkspaceId(notification);
    if (wsId !== null) {
      setActiveWorkspace(wsId);
    }
    if (isUnread(notification)) {
      void markRead(notification.id);
      setItems((prev) =>
        prev.map((item) =>
          item.id === notification.id
            ? { ...item, read_at: new Date().toISOString() }
            : item,
        ),
      );
    }
    router.push(notificationHref(notification));
  }

  async function handleMarkAllRead() {
    await markAllRead();
    setItems((prev) =>
      prev.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })),
    );
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={toggle}
        aria-label={
          unreadCount > 0
            ? `Notifikasi (${unreadCount} belum dibaca)`
            : "Notifikasi"
        }
        aria-expanded={isOpen}
        className="relative"
      >
        <Bell size={20} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {isOpen ? (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={close}
          />
          <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-2 dark:border-zinc-800">
              <span className="text-sm font-semibold">Notifikasi</span>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Tandai semua dibaca
                </button>
              ) : null}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <p className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  Memuat…
                </p>
              ) : items.length === 0 ? (
                <EmptyState title="Belum ada notifikasi" />
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {items.map((notification) => {
                    const unread = isUnread(notification);
                    const actor = notificationActor(notification);
                    return (
                      <li key={notification.id}>
                        <button
                          type="button"
                          onClick={() => openNotification(notification)}
                          className={cn(
                            "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
                            unread && "bg-blue-50/60 dark:bg-blue-950/20",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                              unread ? "bg-blue-600" : "bg-transparent",
                            )}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {notificationTitle(notification)}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                              {actor ? `Ditugaskan oleh ${actor}` : "Notifikasi"}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-zinc-400 dark:text-zinc-500">
                              {formatDateTime(notification.created_at)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-zinc-100 p-2 dark:border-zinc-800">
              <Link
                href="/notifications"
                onClick={close}
                className="block rounded-md px-3 py-2 text-center text-sm font-medium text-blue-600 hover:bg-zinc-50 dark:text-blue-400 dark:hover:bg-zinc-800"
              >
                Lihat semua notifikasi
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
