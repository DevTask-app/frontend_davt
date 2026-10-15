"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { NotificationProvider } from "@/components/providers/notification-provider";
import {
  WorkspaceProvider,
  useWorkspace,
} from "@/components/providers/workspace-provider";
import { ErrorBanner, Spinner } from "@/components/ui/feedback";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading && !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label="Memeriksa sesi…" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <WorkspaceProvider>
      <NotificationProvider>
        <WorkspaceGate>{children}</WorkspaceGate>
      </NotificationProvider>
    </WorkspaceProvider>
  );
}

function WorkspaceGate({ children }: { children: ReactNode }) {
  const { loading, error } = useWorkspace();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label="Memuat workspace…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center px-4">
        <ErrorBanner message={error} />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
