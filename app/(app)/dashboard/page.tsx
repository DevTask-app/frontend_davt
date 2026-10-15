"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge, PriorityBadge } from "@/components/tasks/task-badges";
import { TaskListItem } from "@/components/tasks/task-list-item";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorBanner, Spinner } from "@/components/ui/feedback";
import { api, ApiError } from "@/lib/api";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/enums";
import type { DashboardSummary, Task, WeeklyReport } from "@/lib/types";
import { formatDate, todayISO } from "@/lib/utils";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [upcoming, setUpcoming] = useState<Task[]>([]);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [todayPriorities, setTodayPriorities] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.dashboardSummary(),
      api.dashboardUpcoming(5),
      api.weeklyReport(),
      api.listTasks({
        due_before: todayISO(),
        sort: "due_date",
        direction: "asc",
        per_page: 100,
      }),
    ])
      .then(([summaryRes, upcomingRes, reportRes, priorityRes]) => {
        if (!active) return;
        setSummary(summaryRes.data);
        setUpcoming(upcomingRes.data);
        setReport(reportRes.data);
        setTodayPriorities(
          priorityRes.data.filter(
            (task) =>
              (task.priority === "High" || task.priority === "Critical") &&
              task.status !== "Done",
          ),
        );
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof ApiError ? err.firstError() : "Gagal memuat dashboard.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <Spinner label="Memuat dashboard…" />;
  if (error) return <ErrorBanner message={error} />;

  const tasks = summary?.tasks;
  const projects = summary?.projects;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Ringkasan</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Pantau progres project dan task Anda.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/tasks">
            <Button variant="outline" size="sm">
              Semua Task
            </Button>
          </Link>
          <Link href="/projects">
            <Button size="sm">Kelola Project</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Project"
          value={projects?.total ?? 0}
          hint={`${projects?.by_status?.Active ?? 0} aktif`}
        />
        <StatCard
          label="Total Task"
          value={tasks?.total ?? 0}
          accent="blue"
          hint={`${tasks?.by_status?.["In Progress"] ?? 0} sedang dikerjakan`}
        />
        <StatCard
          label="Terlambat"
          value={tasks?.overdue ?? 0}
          accent="red"
          hint="Melewati tenggat"
        />
        <StatCard
          label="Selesai Minggu Ini"
          value={tasks?.completed_this_week ?? 0}
          accent="green"
          hint={report ? `${report.period.start} — ${report.period.end}` : undefined}
        />
      </div>

      <Card>
        <CardHeader
          title="Prioritas hari ini"
          description="Task prioritas High/Critical yang sudah jatuh tempo atau berakhir hari ini."
          action={
            <Link
              href="/tasks"
              className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Lihat semua
            </Link>
          }
        />
        <div className="space-y-2 p-4">
          {todayPriorities.length === 0 ? (
            <EmptyState
              title="Tidak ada prioritas mendesak"
              description="Tidak ada task High/Critical yang jatuh tempo atau berakhir hari ini."
            />
          ) : (
            todayPriorities
              .slice(0, 5)
              .map((task) => <TaskListItem key={task.id} task={task} />)
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Deadline terdekat"
            description="Task yang belum selesai dan akan datang."
            action={
              <Link
                href="/tasks"
                className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Lihat semua
              </Link>
            }
          />
          <div className="space-y-2 p-4">
            {upcoming.length === 0 ? (
              <EmptyState
                title="Tidak ada deadline mendatang"
                description="Semua task sudah selesai atau belum punya tenggat."
              />
            ) : (
              upcoming.map((task) => <TaskListItem key={task.id} task={task} />)
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-4">
            <h3 className="text-sm font-semibold">Task per status</h3>
            <ul className="mt-3 space-y-2">
              {TASK_STATUSES.map((status) => (
                <li
                  key={status}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <StatusBadge status={status} />
                  <span className="font-medium">
                    {tasks?.by_status?.[status] ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold">Task per prioritas</h3>
            <ul className="mt-3 space-y-2">
              {TASK_PRIORITIES.map((priority) => (
                <li
                  key={priority}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <PriorityBadge priority={priority} />
                  <span className="font-medium">
                    {tasks?.by_priority?.[priority] ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {report ? (
        <Card className="p-4">
          <h3 className="text-sm font-semibold">
            Penyelesaian minggu ini ({report.completed} task)
          </h3>
          <div className="mt-4 flex items-end gap-2">
            {Object.entries(report.completed_by_day).map(([day, count]) => {
              const max = Math.max(
                1,
                ...Object.values(report.completed_by_day),
              );
              const height = Math.round((count / max) * 100);
              return (
                <div
                  key={day}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div className="flex h-24 w-full items-end rounded bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="w-full rounded bg-blue-500"
                      style={{ height: `${Math.max(height, count > 0 ? 8 : 0)}%` }}
                      title={`${count} task`}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {new Date(day).toLocaleDateString("id-ID", {
                      weekday: "short",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Dibuat: {report.created} · Selesai: {report.completed} · Periode{" "}
            {formatDate(report.period.start)} — {formatDate(report.period.end)}
          </p>
        </Card>
      ) : null}
    </div>
  );
}
