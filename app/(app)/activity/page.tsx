"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Topbar } from "@/components/layout/Topbar";
import { Avatar } from "@/components/ui/Avatar";
import { supabase } from "@/lib/supabase";
import { formatDateTime, cn } from "@/lib/utils";
import { useWorkspace } from "@/hooks/useWorkspace";

interface ActivityItem {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
  task_id: string | null;
  profile?: { full_name: string | null; avatar_url: string | null; email: string };
}

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  task_created: {
    label: "created a task",
    color: "text-brand",
    bg: "bg-brand-light",
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  },
  task_updated: {
    label: "updated a task",
    color: "text-warning",
    bg: "bg-warning/10",
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
  },
  task_deleted: {
    label: "deleted a task",
    color: "text-danger",
    bg: "bg-danger/10",
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>,
  },
  task_completed: {
    label: "completed a task",
    color: "text-success",
    bg: "bg-success/10",
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  },
};

export default function ActivityPage() {
  const { workspace } = useWorkspace();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!workspace?.id) return;
    fetchActivity();
    const channel = supabase
      .channel(`activity:${workspace.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs", filter: `workspace_id=eq.${workspace.id}` },
        () => fetchActivity())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspace?.id]);

  const fetchActivity = async () => {
    if (!workspace?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("activity_logs")
      .select("*, profile:user_id(full_name, avatar_url, email)")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setActivities(data as ActivityItem[]);
    setLoading(false);
  };

  const filteredActivities = filter === "all"
    ? activities
    : activities.filter((a) => a.action === filter);

  const groupedByDate = filteredActivities.reduce<Record<string, ActivityItem[]>>((acc, item) => {
    const date = new Date(item.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  return (
    <>
      <Topbar title="Activity Feed" />
      <div className="flex-1 p-4 lg:p-6 space-y-5">
        {/* Filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {["all", "task_created", "task_updated", "task_completed", "task_deleted"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-xl border transition-all duration-150",
                filter === f
                  ? "bg-brand text-white border-brand"
                  : "border-border text-text-secondary hover:border-gray-300 hover:text-text-primary"
              )}
            >
              {f === "all" ? "All Activity" : ACTION_CONFIG[f]?.label ?? f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : Object.keys(groupedByDate).length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4D4D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <p className="text-text-secondary">No activity yet</p>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([date, items]) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold text-text-secondary bg-background px-2">{date}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                {items.map((item) => {
                  const config = ACTION_CONFIG[item.action] ?? ACTION_CONFIG.task_updated;
                  const taskTitle = (item.metadata?.title as string) ?? "a task";
                  return (
                    <div key={item.id} className="flex items-start gap-3 bg-surface border border-border rounded-2xl p-4">
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0", config.bg, config.color)}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary">
                          <span className="font-semibold">{item.profile?.full_name ?? item.profile?.email ?? "Someone"}</span>
                          {" "}{config.label}
                          {taskTitle && <span className="font-medium"> — "{taskTitle}"</span>}
                        </p>
                        <p className="text-xs text-text-secondary mt-1">{formatDateTime(item.created_at)}</p>
                      </div>
                      <Avatar name={item.profile?.full_name} src={item.profile?.avatar_url} size="xs" />
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
