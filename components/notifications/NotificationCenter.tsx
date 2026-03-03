"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { formatDateTime, cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import type { Notification } from "@/types";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  task_assigned: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  task_due: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  mention: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
    </svg>
  ),
  task_completed: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  task_reopened: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
};

const TYPE_COLORS: Record<string, string> = {
  task_assigned: "text-brand bg-brand-light",
  task_due: "text-warning bg-warning/10",
  mention: "text-brand bg-brand-light",
  task_completed: "text-success bg-success/10",
  task_reopened: "text-text-secondary bg-gray-100",
};

interface NotificationCenterProps {
  onCountChange?: (count: number) => void;
}

export function NotificationCenter({ onCountChange }: NotificationCenterProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    onCountChange?.(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchNotifications();

    const channel = supabase
      .channel(`notifications:${session.user.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${session.user.id}`,
      }, () => fetchNotifications())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) setNotifications(data as Notification[]);
  };

  const markAllRead = async () => {
    if (!session?.user?.id) return;
    await supabase.from("notifications").update({ is_read: true })
      .eq("user_id", session.user.id).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => { setOpen(!open); if (!open) markAllRead(); }}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-text-secondary hover:bg-gray-50 hover:text-text-primary transition-all duration-150"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 sm:w-96 bg-surface border border-border rounded-2xl shadow-dropdown z-50 animate-slide-down overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-brand hover:text-brand-hover font-medium transition-colors">
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-96">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4D4D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <p className="text-sm text-text-secondary">All caught up!</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-border last:border-0",
                    !n.is_read && "bg-brand-light/30"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5", TYPE_COLORS[n.type])}>
                    {TYPE_ICONS[n.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{n.title}</p>
                    <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-text-secondary mt-1">{formatDateTime(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 bg-brand rounded-full flex-shrink-0 mt-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
