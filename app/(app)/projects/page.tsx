"use client";

import { useEffect, useMemo, useState } from "react";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectForm } from "@/components/projects/project-form";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { EmptyState, ErrorBanner, Spinner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { api, ApiError } from "@/lib/api";
import type { Paginated, Project } from "@/lib/types";

type PaginationMeta = Paginated<Project>["meta"];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [target, setTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .listProjects({ page, per_page: perPage })
      .then((response) => {
        if (!active) return;
        setProjects(response.data);
        setMeta(response.meta);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof ApiError ? err.firstError() : "Gagal memuat project.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, perPage, reloadKey]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(term) ||
        (project.description ?? "").toLowerCase().includes(term),
    );
  }, [projects, search]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function goToPage(next: number) {
    setLoading(true);
    setPage(next);
  }

  function changePerPage(value: number) {
    setLoading(true);
    setPerPage(value);
    setPage(1);
  }

  function reload() {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }

  function handleSaved() {
    reload();
    setPage(1);
  }

  async function handleDelete() {
    if (!target) return;
    setDeleting(true);
    setActionError(null);
    try {
      await api.deleteProject(target.id);
      setTarget(null);
      reload();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.firstError()
          : "Gagal menghapus project.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Projects</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {meta?.total ?? projects.length} project terdaftar.
          </p>
        </div>
        <Button onClick={openCreate}>Project Baru</Button>
      </div>

      <Input
        placeholder="Cari project di halaman ini…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="max-w-sm"
      />

      {actionError ? <ErrorBanner message={actionError} /> : null}

      {loading ? (
        <Spinner label="Memuat project…" />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? "Project tidak ditemukan" : "Belum ada project"}
          description={
            search
              ? "Coba kata kunci lain."
              : "Buat project pertama untuk mulai menambahkan task."
          }
          action={!search ? <Button onClick={openCreate}>Project Baru</Button> : undefined}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={(item) => {
                  setEditing(item);
                  setFormOpen(true);
                }}
                onDelete={(item) => {
                  setActionError(null);
                  setTarget(item);
                }}
              />
            ))}
          </div>

          <Pagination
            page={meta?.current_page ?? page}
            lastPage={meta?.last_page ?? 1}
            total={meta?.total ?? projects.length}
            perPage={perPage}
            onPageChange={goToPage}
            onPerPageChange={changePerPage}
          />
        </>
      )}

      {formOpen ? (
        <ProjectForm
          project={editing}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(target)}
        title="Hapus project?"
        message={`Project "${target?.name ?? ""}" akan dihapus. Task di dalamnya mungkin terpengaruh.`}
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setTarget(null)}
      />
    </div>
  );
}
