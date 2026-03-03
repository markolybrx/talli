"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
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
  const { data: session } = useSession();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspace = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    setError(null);

    try {
      // Get the user's workspace membership
      const { data: membership, error: membershipError } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", session.user.id)
        .order("joined_at", { ascending: true })
        .limit(1)
        .single();

      if (membershipError || !membership) {
        setError("No workspace found");
        setLoading(false);
        return;
      }

      // Get workspace details
      const { data: ws, error: wsError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", membership.workspace_id)
        .single();

      if (wsError || !ws) {
        setError("Failed to load workspace");
        setLoading(false);
        return;
      }

      setWorkspace(ws);

      // Get all members with profiles
      const { data: allMembers, error: membersError } = await supabase
        .from("workspace_members")
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq("workspace_id", ws.id)
        .order("joined_at", { ascending: true });

      if (!membersError && allMembers) {
        setMembers(allMembers as WorkspaceMemberWithProfile[]);
      }
    } catch {
      setError("Unexpected error loading workspace");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  return { workspace, members, loading, error, refetch: fetchWorkspace };
}
