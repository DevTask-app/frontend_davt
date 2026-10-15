"use client";

import { useWorkspace } from "@/components/providers/workspace-provider";
import { cn, initials } from "@/lib/utils";

export function AssigneeChip({
  id,
  className,
}: {
  id: number | null | undefined;
  className?: string;
}) {
  const { membersById } = useWorkspace();

  if (!id) return null;

  const member = membersById.get(id);
  const label = member?.name ?? `Anggota #${id}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400",
        className,
      )}
      title={member?.email ?? label}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100">
        {initials(label)}
      </span>
      <span className="max-w-[8rem] truncate">{label}</span>
    </span>
  );
}
