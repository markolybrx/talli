"use client";

import { useState, useEffect, useCallback } from "react";
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

  const fetchSummary = useCallback(async () => {
    if (tasks.length === 0) {
      setSummary("No tasks yet. Create your first task to get started.");
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
      setLastUpdated(new Date());
    } catch {
      setSummary(`${tasks.length} tasks in workspace. AI summary unavailable.`);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(tasks.map(t => ({ id: t.id, status: t.status, priority: t.priority }))), workspaceName]); // eslint-disable-line

  useEffect(() => {
    fetchSummary();
    // Refresh every 5 minutes
    const interval = setInterval(fetchSummary, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 flex items-start gap-3">
      {/* AI Icon */}
      <div className="w-8 h-8 bg-brand-light rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L13.09 8.26L19 7L15.45 11.82L20 16L13.64 15.23L12 21L10.36 15.23L4 16L8.55 11.82L5 7L10.91 8.26L12 2Z"
            stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="#EEF2FF"/>
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-brand">AI Briefing</span>
          {lastUpdated && (
            <span className="text-[10px] text-text-secondary">
              Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="text-xs text-text-secondary">Generating summary...</span>
          </div>
        ) : (
          <p className="text-sm text-text-primary leading-relaxed">{summary}</p>
        )}
      </div>

      {/* Refresh button */}
      <button
        onClick={fetchSummary}
        disabled={loading}
        className={cn(
          "text-text-secondary hover:text-brand transition-colors flex-shrink-0 mt-0.5",
          loading && "opacity-50 cursor-not-allowed"
        )}
        title="Refresh summary"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(loading && "animate-spin")}
        >
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      </button>
    </div>
  );
}
