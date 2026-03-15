"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Alert {
  type: "overdue" | "due_soon" | "overloaded" | "unassigned";
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
}

interface BottleneckAlertsProps {
  workspaceId: string;
}

const SEVERITY_CONFIG = {
  high:   { color: "text-danger",  bg: "bg-danger/10",   border: "border-danger/20",  dot: "bg-danger"  },
  medium: { color: "text-warning", bg: "bg-warning/10",  border: "border-warning/20", dot: "bg-warning" },
  low:    { color: "text-brand",   bg: "bg-brand-light", border: "border-brand/20",   dot: "bg-brand"   },
};

export function BottleneckAlerts({ workspaceId }: BottleneckAlertsProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    fetch("/api/ai/bottleneck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    })
      .then((r) => r.json())
      .then((d) => setAlerts(d.alerts ?? []))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const visibleAlerts = alerts.filter((_, i) => !dismissed.has(i));
  if (!loading && visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Bottleneck Alerts</h3>
        {!loading && visibleAlerts.length > 0 && (
          <span className="ml-auto text-xs font-semibold text-danger bg-danger/10 px-1.5 py-0.5 rounded-full">{visibleAlerts.length}</span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2.5 bg-surface border border-border rounded-xl p-4">
          <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm text-text-secondary">Scanning for bottlenecks…</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleAlerts
            .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] - { high: 0, medium: 1, low: 2 }[b.severity]))
            .map((alert, i) => {
              const config = SEVERITY_CONFIG[alert.severity];
              return (
                <div key={i} className={cn("flex items-start gap-3 rounded-xl p-3.5 border", config.bg, config.border)}>
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-white shadow-sm", config.color)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={cn("text-xs font-semibold", config.color)}>{alert.title}</p>
                      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", config.dot)} />
                      <span className="text-[10px] text-text-secondary capitalize">{alert.severity}</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-snug">{alert.detail}</p>
                  </div>
                  <button onClick={() => setDismissed((prev) => new Set([...prev, alerts.indexOf(alert)]))}
                    className="flex-shrink-0 text-text-secondary hover:text-text-primary transition-colors" aria-label="Dismiss">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
