import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Dev<span className="text-blue-600 dark:text-blue-400">T</span>
          </Link>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manajemen project &amp; task
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
