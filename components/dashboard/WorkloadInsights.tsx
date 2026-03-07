"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Insight {
  type: "warning" | "tip" | "praise";
  member: string | null;
  message: string;
}

interface WorkloadInsightsProps {
  memberStats: {
    user_id: string; name: string; total: number;
    urgent: number; completed: number; timeLogged: number;
  }[];
}

const TYPE_CONFIG = {
  warning: { color: "text-danger", bg: "bg-danger/10", icon: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )},
  tip: { color: "text-brand", bg: "bg-brand-light", icon: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )},
  praise: { color: "text-success", bg: "bg-success/10", icon: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )},
};

export function WorkloadInsights({ memberStats }: WorkloadInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!memberStats.length || fetched) return;
    const hasData = memberStats.some((m) => m.total > 0);
    if (!hasData) return;

    setLoading(true);
    setFetched(true);
    fetch("/api/ai/workload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberStats }),
    })
      .then((r) => r.json())
      .then((d) => setInsights(d.insights ?? []))
      .finally(() => setLoading(false));
  }, [memberStats, fetched]);

  if (loading) return (
    <div className="flex items-center gap-2 py-2">
      <div className="flex gap-1">
        {[0,1,2].map((i) => (
          <div key={i} className="w-1 h-1 bg-brand rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
        ))}
      </div>
      <span className="text-xs text-text-secondary">Analysing workload...</span>
    </div>
  );

  if (!insights.length) return null;

  return (
    <div className="space-y-2 pt-2 border-t border-border mt-3">
      <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1.5">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L13.09 8.26L19 7L15.45 11.82L20 16L13.64 15.23L12 21L10.36 15.23L4 16L8.55 11.82L5 7L10.91 8.26L12 2Z"/>
        </svg>
        AI Insights
      </p>
      {insights.map((ins, i) => {
        const cfg = TYPE_CONFIG[ins.type] ?? TYPE_CONFIG.tip;
        return (
          <div key={i} className={cn("flex items-start gap-2 px-3 py-2 rounded-xl", cfg.bg)}>
            <span className={cn("flex-shrink-0 mt-0.5", cfg.color)}>{cfg.icon}</span>
            <div className="min-w-0">
              {ins.member && (
                <span className={cn("text-[11px] font-semibold mr-1", cfg.color)}>{ins.member}</span>
              )}
              <span className="text-xs text-text-primary">{ins.message}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
