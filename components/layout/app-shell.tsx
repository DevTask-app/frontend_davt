"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { Button } from "@/components/ui/button";
import { cn, initials } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/projects", label: "Projects", icon: "▣" },
  { href: "/tasks", label: "Tasks", icon: "☑" },
  { href: "/profile", label: "Profil", icon: "◉" },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const activeLabel =
    NAV_ITEMS.find((item) => isActive(pathname, item.href))?.label ?? "DevT";

  return (
    <div className="min-h-dvh">
      {menuOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-hidden
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-200 bg-white transition-transform dark:border-zinc-800 dark:bg-zinc-900",
          menuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-zinc-100 px-5 dark:border-zinc-800">
          <Link
            href="/dashboard"
            className="text-xl font-bold tracking-tight"
            onClick={closeMenu}
          >
            Dev<span className="text-blue-600 dark:text-blue-400">T</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMenu}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(pathname, item.href)
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
              )}
            >
              <span aria-hidden className="text-base">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100">
              {user ? initials(user.name) : "?"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-zinc-200 bg-white/80 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Buka menu"
            >
              ☰
            </Button>
            <WorkspaceSwitcher />
            <h1 className="hidden text-base font-semibold sm:block">
              {activeLabel}
            </h1>
          </div>

          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUserMenuOpen((open) => !open)}
            >
              {user ? initials(user.name) : "?"}
            </Button>
            {userMenuOpen ? (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Profil
                  </Link>
                  <button
                    type="button"
                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    onClick={() => {
                      setUserMenuOpen(false);
                      void logout();
                    }}
                  >
                    Keluar
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </header>

        <main
          key={activeWorkspaceId ?? "none"}
          className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
