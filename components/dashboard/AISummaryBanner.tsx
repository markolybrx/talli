"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

interface AISummaryBannerProps {
  tasks: Task[];
  workspaceName: string;
}

export function AISummaryBanner({ tasks, workspaceName }: AISummaryBannerProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [allDone, setAllDone] = useState(false);
  const prevHashRef = useRef<string>("");

  // Only re-fetch when statuses actually change, not on every render
  const taskHash = tasks.map(t => `${t.id}:${t.status}`).sort().join("|");

  const fetchSummary = useCallback(async (force = false) => {
    if (!force && taskHash === prevHashRef.current && summary) return;
    prevHashRef.current = taskHash;

    if (tasks.length === 0) {
      setSummary("No tasks yet — create your first task to get the board moving.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks, workspaceName }),
      });
      const data = await res.json();
      setSummary(data.summary);
      setAllDone(data.stats?.allCompleted ?? false);
      setLastUpdated(new Date());
    } catch {
      setSummary(`${tasks.length} tasks in workspace — AI briefing unavailable right now.`);
    } finally {
      setLoading(false);
    }
  }, [taskHash, workspaceName]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  // Auto-refresh every 8 minutes to stay within RPM limits
  useEffect(() => {
    const interval = setInterval(() => fetchSummary(true), 8 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  return (
    <div className={cn(
      "border rounded-2xl p-4 flex items-start gap-3 transition-colors duration-500",
      allDone ? "bg-emerald-50 border-emerald-200" : "bg-surface border-border"
    )}>
      {/* Icon */}
      <div className={cn(
        "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
        allDone ? "bg-emerald-100" : "bg-brand-light"
      )}>
        {allDone ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L13.09 8.26L19 7L15.45 11.82L20 16L13.64 15.23L12 21L10.36 15.23L4 16L8.55 11.82L5 7L10.91 8.26L12 2Z"
              stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="#EEF2FF"/>
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            "text-xs font-semibold",
            allDone ? "text-emerald-700" : "text-brand"
          )}>
            {allDone ? "All Clear" : "AI Briefing"}
          </span>
          {allDone && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {lastUpdated && (
            <span className="text-[10px] text-text-secondary ml-auto">
              {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <span className="text-xs text-text-secondary">Thinking...</span>
          </div>
        ) : (
          <p className={cn(
            "text-sm leading-relaxed",
            allDone ? "text-emerald-800" : "text-text-primary"
          )}>
            {summary}
          </p>
        )}
      </div>

      {/* Refresh button */}
      <button
        onClick={() => fetchSummary(true)}
        disabled={loading}
        title="Refresh briefing"
        className={cn(
          "flex-shrink-0 mt-0.5 transition-colors",
          loading ? "opacity-40 cursor-not-allowed text-text-secondary" : "text-text-secondary hover:text-brand"
        )}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={cn(loading && "animate-spin")}>
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      </button>
    </div>
  );
}
