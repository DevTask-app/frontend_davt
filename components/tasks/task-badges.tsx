import { Badge } from "@/components/ui/badge";
import {
  PRIORITY_STYLES,
  STATUS_STYLES,
  TYPE_STYLES,
  PROJECT_STATUS_STYLES,
} from "@/lib/enums";
import type { ProjectStatus, TaskPriority, TaskStatus, TaskType } from "@/lib/types";

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge className={STATUS_STYLES[status]}>{status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge className={PRIORITY_STYLES[priority]}>{priority}</Badge>;
}

export function TypeBadge({ type }: { type: TaskType }) {
  return <Badge className={TYPE_STYLES[type]}>{type}</Badge>;
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge className={PROJECT_STATUS_STYLES[status]}>{status}</Badge>;
}
