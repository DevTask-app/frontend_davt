"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorBanner, Spinner } from "@/components/ui/feedback";
import { StatCard } from "@/components/dashboard/stat-card";
import { api, ApiError } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";
import { formatDate, initials } from "@/lib/utils";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .dashboardSummary()
      .then((response) => {
        if (!active) return;
        setSummary(response.data);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof ApiError ? err.firstError() : "Gagal memuat statistik.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Profil</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Informasi akun dan ringkasan aktivitas.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Akun" />
          <div className="p-4">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200 text-lg font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100">
                {initials(user.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{user.name}</p>
                <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                  {user.email}
                </p>
              </div>
            </div>

            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between gap-2 border-b border-zinc-100 py-2 dark:border-zinc-800">
                <dt className="text-zinc-500 dark:text-zinc-400">ID</dt>
                <dd>{user.id}</dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-zinc-100 py-2 dark:border-zinc-800">
                <dt className="text-zinc-500 dark:text-zinc-400">
                  Status verifikasi
                </dt>
                <dd>{user.email_verified_at ? "Terverifikasi" : "Belum verifikasi"}</dd>
              </div>
              <div className="flex justify-between gap-2 py-2">
                <dt className="text-zinc-500 dark:text-zinc-400">Bergabung</dt>
                <dd>{formatDate(user.created_at)}</dd>
              </div>
            </dl>

            <div className="mt-6">
              <Button
                variant="danger"
                loading={loggingOut}
                onClick={() => {
                  setLoggingOut(true);
                  void logout().finally(() => setLoggingOut(false));
                }}
              >
                Keluar
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {loading ? (
            <Spinner label="Memuat statistik…" />
          ) : error ? (
            <ErrorBanner message={error} />
          ) : (
            <>
              <StatCard label="Total Project" value={summary?.projects.total ?? 0} />
              <StatCard
                label="Total Task"
                value={summary?.tasks.total ?? 0}
                accent="blue"
              />
              <StatCard
                label="Selesai Minggu Ini"
                value={summary?.tasks.completed_this_week ?? 0}
                accent="green"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
