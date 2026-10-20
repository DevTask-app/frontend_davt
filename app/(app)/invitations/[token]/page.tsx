"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import { ErrorBanner, Spinner } from "@/components/ui/feedback";
import { api, ApiError } from "@/lib/api";

export default function AcceptInvitationPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { refresh } = useWorkspace();
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    api
      .acceptWorkspaceInvitation(token)
      .then(async () => {
        try {
          await refresh();
        } catch {
          // Workspace list is refetched by the dashboard layout anyway.
        }
        setAccepted(true);
      })
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? err.firstError()
            : "Gagal menerima undangan.",
        );
      });
  }, [token, refresh]);

  useEffect(() => {
    if (accepted) router.replace("/dashboard");
  }, [accepted, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-12 text-center">
        <h2 className="text-lg font-semibold">Undangan tidak dapat diterima</h2>
        <ErrorBanner message={error} />
        <Button onClick={() => router.replace("/dashboard")}>
          Ke Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Spinner label="Bergabung ke workspace…" />
      <Link
        href="/dashboard"
        className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
      >
        Batal
      </Link>
    </div>
  );
}
