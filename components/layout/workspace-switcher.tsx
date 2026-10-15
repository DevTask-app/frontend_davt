"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import { WorkspaceForm } from "@/components/workspaces/workspace-form";
import { WORKSPACE_ROLE_LABELS } from "@/lib/enums";
import { cn } from "@/lib/utils";

const DETAIL_ROUTE = /^\/(projects|tasks)\/\d+/;

export function WorkspaceSwitcher() {
  const {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspace,
    addWorkspace,
  } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  function handleSelect(id: number) {
    setOpen(false);
    if (id === activeWorkspaceId) return;
    setActiveWorkspace(id);
    if (DETAIL_ROUTE.test(pathname)) {
      router.push(pathname.startsWith("/tasks") ? "/tasks" : "/projects");
    }
  }

  const label = activeWorkspace?.name ?? "Workspace";

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="max-w-[12rem]"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="truncate">{label}</span>
        <span aria-hidden className="text-zinc-400">
          ▾
        </span>
      </Button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 z-20 mt-2 w-72 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <div className="max-h-64 overflow-y-auto py-1">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => handleSelect(workspace.id)}
                  className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-medium">
                        {workspace.name}
                      </span>
                      {workspace.is_personal ? (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          Personal
                        </span>
                      ) : null}
                    </span>
                    {workspace.role ? (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {WORKSPACE_ROLE_LABELS[workspace.role]}
                      </span>
                    ) : null}
                  </span>
                  {workspace.id === activeWorkspaceId ? (
                    <span aria-hidden className="text-blue-600 dark:text-blue-400">
                      ✓
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="border-t border-zinc-100 p-1 dark:border-zinc-800">
              {activeWorkspaceId !== null ? (
                <Link
                  href={`/workspaces/${activeWorkspaceId}`}
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <span aria-hidden>⚙</span>
                  Kelola workspace
                </Link>
              ) : null}
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium",
                  "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
                )}
                onClick={() => {
                  setOpen(false);
                  setFormOpen(true);
                }}
              >
                <span aria-hidden>＋</span>
                Workspace Baru
              </button>
            </div>
          </div>
        </>
      ) : null}

      {formOpen ? (
        <WorkspaceForm
          onClose={() => setFormOpen(false)}
          onSaved={(workspace) => {
            addWorkspace(workspace);
            setFormOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
