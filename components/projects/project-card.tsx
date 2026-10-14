import Link from "next/link";
import { ProjectStatusBadge } from "@/components/tasks/task-badges";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function ProjectCard({
  project,
  onEdit,
  onDelete,
}: {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <div>
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/projects/${project.id}`}
            className="text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
          >
            {project.name}
          </Link>
          <ProjectStatusBadge status={project.status} />
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
          {project.description || "Tanpa deskripsi"}
        </p>
        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
          <div>
            <dt className="inline">Task: </dt>
            <dd className="inline font-medium text-zinc-700 dark:text-zinc-200">
              {project.tasks_count ?? 0}
            </dd>
          </div>
          <div>
            <dt className="inline">Tenggat: </dt>
            <dd className="inline">{formatDate(project.due_date)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 flex gap-2">
        <Link href={`/projects/${project.id}`} className="flex-1">
          <Button variant="secondary" size="sm" className="w-full">
            Buka
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={() => onEdit(project)}>
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(project)}>
          Hapus
        </Button>
      </div>
    </div>
  );
}
