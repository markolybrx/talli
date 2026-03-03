"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Avatar } from "@/components/ui/Avatar";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useTasks } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function MembersPage() {
  const { data: session } = useSession();
  const { workspace, members, refetch } = useWorkspace();
  const { tasks } = useTasks(workspace?.id ?? null);
  const [copiedCode, setCopiedCode] = useState(false);

  const isAdmin = members.find((m) => m.user_id === session?.user?.id)?.role === "admin";

  const getMemberStats = (userId: string) => {
    const memberTasks = tasks.filter((t) => t.assigned_to === userId);
    return {
      total: memberTasks.length,
      urgent: memberTasks.filter((t) => t.status === "urgent").length,
      pending: memberTasks.filter((t) => t.status === "pending").length,
      completed: memberTasks.filter((t) => t.status === "completed").length,
    };
  };

  const getWorkloadColor = (total: number) => {
    if (total === 0) return { color: "text-text-secondary", bg: "bg-gray-200", label: "Free" };
    if (total <= 3) return { color: "text-success", bg: "bg-success", label: "Light" };
    if (total <= 7) return { color: "text-warning", bg: "bg-warning", label: "Moderate" };
    return { color: "text-danger", bg: "bg-danger", label: "Heavy" };
  };

  const copyCode = () => {
    if (!workspace?.code) return;
    navigator.clipboard.writeText(workspace.code);
    setCopiedCode(true);
    toast.success("Workspace code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const promoteToAdmin = async (userId: string) => {
    if (!workspace?.id) return;
    await supabase.from("workspace_members").update({ role: "admin" })
      .eq("workspace_id", workspace.id).eq("user_id", userId);
    refetch();
    toast.success("Member promoted to admin");
  };

  const removeMember = async (userId: string) => {
    if (!workspace?.id) return;
    if (!confirm("Remove this member from the workspace?")) return;
    await supabase.from("workspace_members").delete()
      .eq("workspace_id", workspace.id).eq("user_id", userId);
    refetch();
    toast.success("Member removed");
  };

  return (
    <>
      <Topbar title="Team Members" />
      <div className="flex-1 p-4 lg:p-6 space-y-5">
        {/* Workspace info card */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-semibold text-text-primary">{workspace?.name}</h2>
              <p className="text-sm text-text-secondary mt-0.5">{members.length} member{members.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-text-secondary mb-1">Workspace Code</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-text-primary tracking-widest text-sm bg-gray-50 px-3 py-1.5 rounded-xl border border-border">
                    {workspace?.code}
                  </span>
                  <button
                    onClick={copyCode}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all duration-150",
                      copiedCode ? "bg-success/10 text-success border-success/20" : "border-border text-text-secondary hover:border-gray-300"
                    )}
                  >
                    {copiedCode ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                    {copiedCode ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-text-secondary mt-3 bg-gray-50 rounded-xl px-4 py-2.5">
            Share the workspace code above with teammates so they can join on the workspace setup screen.
          </p>
        </div>

        {/* Members grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {members.map((member) => {
            const stats = getMemberStats(member.user_id);
            const workload = getWorkloadColor(stats.total);
            const isCurrentUser = member.user_id === session?.user?.id;
            const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

            return (
              <div key={member.id} className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={member.profile?.full_name} src={member.profile?.avatar_url} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-text-primary truncate">
                          {member.profile?.full_name ?? member.profile?.email}
                        </p>
                        {isCurrentUser && (
                          <span className="text-[10px] font-medium text-brand bg-brand-light px-1.5 py-0.5 rounded-full">You</span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary truncate">{member.profile?.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={cn(
                      "text-xs font-semibold px-2.5 py-1 rounded-full capitalize",
                      member.role === "admin" ? "bg-brand-light text-brand" : "bg-gray-100 text-text-secondary"
                    )}>
                      {member.role}
                    </span>
                  </div>
                </div>

                {/* Workload bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">Workload</span>
                    <span className={cn("text-xs font-semibold", workload.color)}>{workload.label}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", workload.bg)}
                      style={{ width: `${Math.min((stats.total / 10) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Task stats */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Total", value: stats.total, color: "text-text-primary" },
                    { label: "Urgent", value: stats.urgent, color: "text-danger" },
                    { label: "Pending", value: stats.pending, color: "text-warning" },
                    { label: "Done", value: stats.completed, color: "text-success" },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center bg-gray-50 rounded-xl py-2">
                      <p className={cn("text-base font-semibold", stat.color)}>{stat.value}</p>
                      <p className="text-[10px] text-text-secondary">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Completion rate */}
                {stats.total > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-text-secondary">Completion</span>
                      <span className="text-xs font-medium text-text-primary">{completionRate}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-success rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
                    </div>
                  </div>
                )}

                {/* Admin actions */}
                {isAdmin && !isCurrentUser && (
                  <div className="flex gap-2 pt-1">
                    {member.role === "member" && (
                      <button onClick={() => promoteToAdmin(member.user_id)}
                        className="flex-1 text-xs font-medium text-brand bg-brand-light hover:bg-indigo-100 rounded-xl py-1.5 transition-colors">
                        Make Admin
                      </button>
                    )}
                    <button onClick={() => removeMember(member.user_id)}
                      className="flex-1 text-xs font-medium text-danger bg-danger/5 hover:bg-danger/10 rounded-xl py-1.5 transition-colors">
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
