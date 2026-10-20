import { prisma } from "./db";
import type { RealtimeEvent, RealtimeEventType } from "../types";

export type { RealtimeEventType };
export type { RealtimeEvent };

type Listener = (event: RealtimeEvent) => void;

interface RealtimeGlobal {
  __davtRealtimeSubscribers?: Map<number, Set<Listener>>;
}

// Disimpan di globalThis agar koneksi subscriber tidak hilang saat modul
// di-evaluate ulang oleh HMR saat development.
function subscribers(): Map<number, Set<Listener>> {
  const scope = globalThis as RealtimeGlobal;
  if (!scope.__davtRealtimeSubscribers) {
    scope.__davtRealtimeSubscribers = new Map();
  }
  return scope.__davtRealtimeSubscribers;
}

export function subscribeRealtime(
  workspaceId: number,
  listener: Listener,
): () => void {
  const store = subscribers();
  let listeners = store.get(workspaceId);
  if (!listeners) {
    listeners = new Set();
    store.set(workspaceId, listeners);
  }
  listeners.add(listener);

  return () => {
    const current = store.get(workspaceId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) store.delete(workspaceId);
  };
}

export function publishRealtime(event: RealtimeEvent): void {
  const listeners = subscribers().get(event.workspace_id);
  if (!listeners || listeners.size === 0) return;
  for (const listener of [...listeners]) {
    try {
      listener(event);
    } catch (error) {
      console.error("Realtime listener gagal memproses event:", error);
    }
  }
}

/**
 * Publish event realtime task berdasarkan workspace tempat task berada.
 * Tidak pernah melempar error supaya mutasi task tidak terganggu.
 */
export async function publishTaskRealtime(params: {
  type: RealtimeEventType;
  projectId: number;
  taskId: number;
  actorId: number;
}): Promise<void> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      select: { workspaceId: true },
    });
    if (!project) return;

    publishRealtime({
      type: params.type,
      workspace_id: project.workspaceId,
      task_id: params.taskId,
      project_id: params.projectId,
      actor_id: params.actorId,
      at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Gagal mempublish event realtime:", error);
  }
}
