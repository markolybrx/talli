"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface RetrospectiveWidgetProps {
  workspaceId: string;
  workspaceName: string;
}

export function RetrospectiveWidget({ workspaceId, workspaceName }: RetrospectiveWidgetProps) {
  const [recap, setRecap] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ total: number; completed: number; pending: number; urgent: number } | null>(null);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/weekly-recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, workspaceName }),
      });
      const data = await res.json();
      setRecap(data.recap);
      setStats(data.stats);
      setGenerated(true);
    } catch {
      setRecap("Failed to generate retrospective. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-light rounded-lg flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-text-primary">Weekly Retrospective</h3>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all duration-150",
            loading
              ? "opacity-50 cursor-not-allowed border-border text-text-secondary"
              : generated
              ? "border-border text-text-secondary hover:border-gray-300"
              : "bg-brand text-white border-brand hover:bg-brand-hover"
          )}
        >
          {loading ? (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Generating...
            </>
          ) : generated ? (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Regenerate
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L13.09 8.26L19 7L15.45 11.82L20 16L13.64 15.23L12 21L10.36 15.23L4 16L8.55 11.82L5 7L10.91 8.26L12 2Z"/>
              </svg>
              Generate
            </>
          )}
        </button>
      </div>

      {!generated && !loading && (
        <div className="text-center py-8 bg-gray-50 rounded-xl">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4D4D8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
            <path d="M12 2L13.09 8.26L19 7L15.45 11.82L20 16L13.64 15.23L12 21L10.36 15.23L4 16L8.55 11.82L5 7L10.91 8.26L12 2Z"/>
          </svg>
          <p className="text-sm text-text-secondary">Generate an AI retrospective for this week</p>
          <p className="text-xs text-text-secondary mt-1">Reviews completed tasks, team performance and suggests improvements</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-6 justify-center">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <span className="text-xs text-text-secondary">Analysing this week...</span>
        </div>
      )}

      {recap && !loading && (
        <div className="space-y-4">
          {stats && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Created", value: stats.total, color: "text-brand" },
                { label: "Completed", value: stats.completed, color: "text-success" },
                { label: "Pending", value: stats.pending, color: "text-warning" },
                { label: "Urgent", value: stats.urgent, color: "text-danger" },
              ].map((s) => (
                <div key={s.label} className="text-center bg-gray-50 rounded-xl py-2">
                  <p className={cn("text-base font-semibold", s.color)}>{s.value}</p>
                  <p className="text-[10px] text-text-secondary">{s.label}</p>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm text-text-primary leading-relaxed">{recap}</p>
        </div>
      )}
    </div>
  );
}
