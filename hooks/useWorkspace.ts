"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Workspace, WorkspaceMember, Profile } from "@/types";

interface WorkspaceMemberWithProfile extends WorkspaceMember {
  profile: Profile;
}

interface UseWorkspaceReturn {
  workspace: Workspace | null;
  members: WorkspaceMemberWithProfile[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useWorkspace(): UseWorkspaceReturn {
  const { data: session, status } = useSession();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspace = useCallback(async () => {
    if (status === "loading") return;
    if (!session?.user?.id) { setLoading(false); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/workspace");
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to load workspace"); }
      else {
        setWorkspace(json.workspace);
        setMembers(json.members ?? []);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, status]);

  useEffect(() => { fetchWorkspace(); }, [fetchWorkspace]);

  return { workspace, members, loading, error, refetch: fetchWorkspace };
}
