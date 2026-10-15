"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";

interface NotificationContextValue {
  unreadCount: number;
  loading: boolean;
  refreshUnread: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

const POLL_INTERVAL_MS = 30_000;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshUnread = useCallback(async () => {
    try {
      const response = await api.unreadNotificationCount();
      setUnreadCount(response.data.unread_count);
    } catch {
      // Keep the last known count on transient failures.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    api
      .unreadNotificationCount()
      .then((response) => {
        if (active) setUnreadCount(response.data.unread_count);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshUnread();
      }
    }, POLL_INTERVAL_MS);

    const onFocus = () => void refreshUnread();
    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshUnread]);

  const markRead = useCallback(
    async (id: string) => {
      await api.markNotificationRead(id);
      await refreshUnread();
    },
    [refreshUnread],
  );

  const markAllRead = useCallback(async () => {
    await api.markAllNotificationsRead();
    setUnreadCount(0);
  }, []);

  const value = useMemo(
    () => ({ unreadCount, loading, refreshUnread, markRead, markAllRead }),
    [unreadCount, loading, refreshUnread, markRead, markAllRead],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications harus dipakai di dalam NotificationProvider",
    );
  }
  return context;
}
