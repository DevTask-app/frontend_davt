"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, getActiveWorkspaceId, setActiveWorkspaceId } from "@/lib/api";
import type { Workspace, WorkspaceMember } from "@/lib/types";
import {
  contributesToWorkspace,
  getStoredWorkspaceId,
  managesWorkspace,
  resolveActiveWorkspaceId,
  setStoredWorkspaceId,
} from "@/lib/workspace";

interface WorkspaceContextValue {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeWorkspaceId: number | null;
  members: WorkspaceMember[];
  membersById: Map<number, WorkspaceMember>;
  loading: boolean;
  error: string | null;
  canManage: boolean;
  canContribute: boolean;
  setActiveWorkspace: (id: number) => void;
  refresh: () => Promise<void>;
  addWorkspace: (workspace: Workspace) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [memberData, setMemberData] = useState<{
    workspaceId: number;
    list: WorkspaceMember[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyActive = useCallback((id: number | null) => {
    setActiveWorkspaceId(id);
    setStoredWorkspaceId(id);
    setActiveId(id);
  }, []);

  useEffect(() => {
    let active = true;
    setActiveWorkspaceId(null);

    api
      .listWorkspaces()
      .then((response) => {
        if (!active) return;
        const list = response.data;
        const id = resolveActiveWorkspaceId(list, getStoredWorkspaceId());
        setActiveWorkspaceId(id);
        setStoredWorkspaceId(id);
        setWorkspaces(list);
        setActiveId(id);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.firstError()
            : "Gagal memuat daftar workspace.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      setActiveWorkspaceId(null);
    };
  }, []);

  const setActiveWorkspace = useCallback(
    (id: number) => {
      applyActive(id);
    },
    [applyActive],
  );

  useEffect(() => {
    if (activeId === null) return;
    let active = true;

    api
      .listWorkspaceMembers(activeId)
      .then((response) => {
        if (active) {
          setMemberData({ workspaceId: activeId, list: response.data });
        }
      })
      .catch(() => {
        if (active) setMemberData({ workspaceId: activeId, list: [] });
      });

    return () => {
      active = false;
    };
  }, [activeId]);

  const members = useMemo(
    () => (memberData && memberData.workspaceId === activeId ? memberData.list : []),
    [memberData, activeId],
  );

  const membersById = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members],
  );

  const refresh = useCallback(async () => {
    const response = await api.listWorkspaces();
    const list = response.data;
    const id = resolveActiveWorkspaceId(list, getActiveWorkspaceId());
    applyActive(id);
    setWorkspaces(list);
    setError(null);
  }, [applyActive]);

  const addWorkspace = useCallback(
    (workspace: Workspace) => {
      setWorkspaces((prev) => [...prev, workspace]);
      applyActive(workspace.id);
    },
    [applyActive],
  );

  const activeWorkspace = useMemo(
    () => workspaces.find((item) => item.id === activeId) ?? null,
    [workspaces, activeId],
  );

  const value = useMemo(
    () => ({
      workspaces,
      activeWorkspace,
      activeWorkspaceId: activeId,
      members,
      membersById,
      loading,
      error,
      canManage: managesWorkspace(activeWorkspace?.role),
      canContribute: contributesToWorkspace(activeWorkspace?.role),
      setActiveWorkspace,
      refresh,
      addWorkspace,
    }),
    [
      workspaces,
      activeWorkspace,
      activeId,
      members,
      membersById,
      loading,
      error,
      setActiveWorkspace,
      refresh,
      addWorkspace,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace harus dipakai di dalam WorkspaceProvider");
  }
  return context;
}
