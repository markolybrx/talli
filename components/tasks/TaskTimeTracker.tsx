"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import toast from "react-hot-toast";

interface TimeLog {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  note: string | null;
  profile?: { full_name: string | null; avatar_url: string | null; email: string };
}

interface TaskTimeTrackerProps {
  taskId: string;
  currentUserId: string;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TaskTimeTracker({ taskId, currentUserId }: TaskTimeTrackerProps) {
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [note, setNote] = useState("");
  const [manualHours, setManualHours] = useState("");
  const [manualMins, setManualMins] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [saving, setSaving] = useState(false);

  const startTimeRef = useRef<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchLogs();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [taskId]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/time-logs?taskId=${taskId}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
    } catch {
      toast.error("Failed to load time logs");
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    startTimeRef.current = new Date();
    setElapsed(0);
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = async () => {
    if (!startTimeRef.current) return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    const endTime = new Date();
    const durationMinutes = Math.max(1, Math.round(elapsed / 60));

    setRunning(false);
    setSaving(true);
    try {
      const res = await fetch("/api/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: taskId,
          started_at: startTimeRef.current.toISOString(),
          ended_at: endTime.toISOString(),
          duration_minutes: durationMinutes,
          note: note.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Logged ${formatDuration(durationMinutes)}`);
      setNote("");
      setElapsed(0);
      await fetchLogs();
    } catch {
      toast.error("Failed to save time log");
    } finally {
      setSaving(false);
    }
  };

  const logManual = async () => {
    const h = parseInt(manualHours || "0", 10);
    const m = parseInt(manualMins || "0", 10);
    const total = h * 60 + m;
    if (total < 1) { toast.error("Enter at least 1 minute"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: taskId,
          duration_minutes: total,
          note: manualNote.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Logged ${formatDuration(total)}`);
      setManualHours("");
      setManualMins("");
      setManualNote("");
      setShowManual(false);
      await fetchLogs();
    } catch {
      toast.error("Failed to log time");
    } finally {
      setSaving(false);
    }
  };

  const deleteLog = async (id: string) => {
    try {
      await fetch(`/api/time-logs?id=${id}`, { method: "DELETE" });
      setLogs((prev) => prev.filter((l) => l.id !== id));
      toast.success("Log removed");
    } catch {
      toast.error("Failed to remove log");
    }
  };

  const totalMinutes = logs.reduce((sum, l) => sum + l.duration_minutes, 0);
  const myMinutes = logs
    .filter((l) => l.user_id === currentUserId)
    .reduce((sum, l) => sum + l.duration_minutes, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-brand-light rounded-2xl p-4">
          <p className="text-xs font-medium text-brand mb-1">Total time logged</p>
          <p className="text-2xl font-semibold text-brand">{formatDuration(totalMinutes)}</p>
          <p className="text-xs text-brand/60 mt-0.5">{logs.length} session{logs.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs font-medium text-text-secondary mb-1">Your time</p>
          <p className="text-2xl font-semibold text-text-primary">{formatDuration(myMinutes)}</p>
          <p className="text-xs text-text-secondary mt-0.5">
            {logs.filter((l) => l.user_id === currentUserId).length} session{logs.filter((l) => l.user_id === currentUserId).length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Timer */}
      <div className="border border-border rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold text-text-primary">Timer</p>

        {running ? (
          <div className="space-y-3">
            {/* Live display */}
            <div className="flex items-center justify-between bg-brand-light rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-brand rounded-full animate-pulse" />
                <span className="text-xl font-mono font-semibold text-brand">{formatElapsed(elapsed)}</span>
              </div>
              <span className="text-xs text-brand/70">Recording...</span>
            </div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What are you working on? (optional)"
              className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <button
              onClick={stopTimer}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-danger text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
              Stop & Save
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={startTimer}
              className="w-full flex items-center justify-center gap-2 bg-brand text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-brand-hover transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              Start Timer
            </button>
            <button
              onClick={() => setShowManual(!showManual)}
              className="w-full flex items-center justify-center gap-2 border border-border text-text-secondary rounded-xl py-2 text-sm font-medium hover:border-gray-300 hover:text-text-primary transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Log time manually
            </button>
          </div>
        )}

        {/* Manual entry */}
        {showManual && !running && (
          <div className="border-t border-border pt-3 space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-medium text-text-secondary block mb-1">Hours</label>
                <input
                  type="number" min="0" max="23" value={manualHours}
                  onChange={(e) => setManualHours(e.target.value)}
                  placeholder="0"
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-text-secondary block mb-1">Minutes</label>
                <input
                  type="number" min="0" max="59" value={manualMins}
                  onChange={(e) => setManualMins(e.target.value)}
                  placeholder="0"
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>
            <input
              type="text" value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              placeholder="Note (optional)"
              className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowManual(false)}
                className="flex-1 border border-border rounded-xl py-2 text-sm font-medium text-text-secondary hover:border-gray-300 transition-colors">
                Cancel
              </button>
              <button onClick={logManual} disabled={saving}
                className="flex-1 bg-brand text-white rounded-xl py-2 text-sm font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50">
                {saving ? "Saving..." : "Log Time"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log history */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-text-primary">
          History {logs.length > 0 && <span className="font-normal text-text-secondary">({logs.length})</span>}
        </p>
        {logs.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-2xl">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4D4D8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            <p className="text-sm text-text-secondary">No time logged yet</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-3">
              <Avatar name={log.profile?.full_name} src={log.profile?.avatar_url ?? null} size="xs" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-brand">{formatDuration(log.duration_minutes)}</span>
                  <span className="text-xs text-text-secondary">
                    {log.profile?.full_name ?? log.profile?.email ?? "You"}
                  </span>
                </div>
                {log.note && <p className="text-xs text-text-secondary mt-0.5 truncate">{log.note}</p>}
                <p className="text-[11px] text-text-secondary/60 mt-0.5">
                  {new Date(log.started_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                  {" "}
                  {new Date(log.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {log.user_id === currentUserId && (
                <button onClick={() => deleteLog(log.id)}
                  className="text-text-secondary hover:text-danger transition-colors flex-shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
