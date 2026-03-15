"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

interface StandupResult {
  bullets: string[];
  generatedAt: string;
}

interface StandupWidgetProps {
  workspaceId: string;
}

export function StandupWidget({ workspaceId }: StandupWidgetProps) {
  const { data: session } = useSession();
  const [standup, setStandup] = useState<StandupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generate = async (force = false) => {
    if (!session?.user?.id) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/ai/standup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, force }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStandup(data);
      setGenerated(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const BULLET_BG = ["bg-success/10", "bg-brand-light", "bg-warning/10"];
  const BULLET_LABELS = ["Completed", "Today", "Blockers"];
  const BULLET_COLORS = ["#10B981", "#6366F1", "#F59E0B"];

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-light rounded-xl flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 0 2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Daily Standup</h3>
            <p className="text-xs text-text-secondary">AI-generated from your tasks</p>
          </div>
        </div>
        {generated && (
          <button onClick={() => generate(true)} disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary border border-border rounded-xl px-3 py-1.5 transition-colors disabled:opacity-50">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? "animate-spin" : ""}>
              <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Refresh
          </button>
        )}
      </div>

      {!generated && !loading && (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-text-secondary">Generate your personal standup based on what you worked on.</p>
          <button onClick={() => generate()}
            className="inline-flex items-center gap-2 bg-brand text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-brand-hover transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L13.09 8.26L19 7L15.45 11.82L20 16L13.64 15.23L12 21L10.36 15.23L4 16L8.55 11.82L5 7L10.91 8.26L12 2Z" />
            </svg>
            Generate Standup
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-6 gap-3">
          <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-secondary">Writing your standup…</p>
        </div>
      )}

      {error && (
        <div className="text-center py-4 space-y-2">
          <p className="text-sm text-danger">Couldn't generate standup right now.</p>
          <button onClick={() => generate()} className="text-xs text-brand font-medium hover:underline">Try again</button>
        </div>
      )}

      {standup && !loading && (
        <div className="space-y-2.5">
          {standup.bullets.map((bullet, i) => (
            <div key={i} className={cn("flex items-start gap-3 rounded-xl p-3", BULLET_BG[i] ?? "bg-gray-50")}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-white shadow-sm">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BULLET_COLORS[i]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {i === 0 && <polyline points="20 6 9 17 4 12" />}
                  {i === 1 && <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>}
                  {i === 2 && <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>}
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide mb-0.5">{BULLET_LABELS[i]}</p>
                <p className="text-sm text-text-primary leading-snug">{bullet}</p>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-text-secondary text-right pt-1">
            Generated {new Date(standup.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      )}
    </div>
  );
}
