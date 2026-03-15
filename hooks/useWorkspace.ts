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
    // If unauthenticated, stop loading
    if (status === "unauthenticated") { setLoading(false); return; }
    // Still waiting for session
    if (status === "loading") return;
    // No user id
    if (!session?.user?.id) { setLoading(false); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/workspace");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load workspace");
        setWorkspace(null);
      } else {
        setWorkspace(json.workspace ?? null);
        setMembers(json.members ?? []);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, status]);

  useEffect(() => { fetchWorkspace(); }, [fetchWorkspace]);

  // Safety timeout — never stay loading more than 10s
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  return { workspace, members, loading, error, refetch: fetchWorkspace };
}
