"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  summary: {
    total: number; completed: number; urgent: number;
    pending: number; overdue: number; completionRate: number; totalTimeLogged: number;
  };
  last7: { date: string; shortDate: string; created: number; completed: number }[];
  categoryCount: Record<string, { total: number; completed: number }>;
  priorityCount: { high: number; medium: number; low: number };
  memberStats: {
    user_id: string; name: string; avatar_url: string | null;
    total: number; completed: number; urgent: number; timeLogged: number;
  }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  recruitment_marketing: "Marketing",
  recruitment_sourcing: "Sourcing",
  recruitment_agent_hiring: "Agent Hiring",
  others: "Others",
};

const CATEGORY_COLORS: Record<string, string> = {
  recruitment_marketing: "#6366F1",
  recruitment_sourcing: "#F59E0B",
  recruitment_agent_hiring: "#10B981",
  others: "#94A3B8",
};

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Mini bar chart row
function BarRow({ label, value, max, color, sublabel }: {
  label: string; value: number; max: number; color: string; sublabel?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-primary">{label}</span>
        <div className="flex items-center gap-2">
          {sublabel && <span className="text-[11px] text-text-secondary">{sublabel}</span>}
          <span className="text-xs font-semibold text-text-primary">{value}</span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// SVG sparkline / bar chart for 7-day data
function WeekChart({ data }: { data: { shortDate: string; created: number; completed: number }[] }) {
  const maxVal = Math.max(...data.flatMap((d) => [d.created, d.completed]), 1);
  const chartH = 80;
  const barW = 18;
  const gap = 8;
  const totalW = data.length * (barW * 2 + gap + 8);

  return (
    <div className="overflow-x-auto">
      <svg width={totalW} height={chartH + 24} className="min-w-full">
        {data.map((d, i) => {
          const x = i * (barW * 2 + gap + 8) + 4;
          const createdH = Math.round((d.created / maxVal) * chartH);
          const completedH = Math.round((d.completed / maxVal) * chartH);
          return (
            <g key={i}>
              {/* Created bar */}
              <rect x={x} y={chartH - createdH} width={barW} height={createdH}
                rx="4" fill="#E0E7FF" />
              {/* Completed bar */}
              <rect x={x + barW + 2} y={chartH - completedH} width={barW} height={completedH}
                rx="4" fill="#6366F1" />
              {/* Label */}
              <text x={x + barW + 1} y={chartH + 16} textAnchor="middle"
                fontSize="10" fill="#94A3B8">{d.shortDate}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Donut chart
function DonutChart({ segments }: { segments: { value: number; color: string; label: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="35" fill="none" stroke="#F4F4F5" strokeWidth="18" />
    </svg>
  );

  const r = 35;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#F4F4F5" strokeWidth="18" />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const gap = circ - dash;
        const el = (
          <circle key={i} cx="50" cy="50" r={r} fill="none"
            stroke={seg.color} strokeWidth="18"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 50 50)" />
        );
        offset += dash;
        return el;
      })}
      <text x="50" y="46" textAnchor="middle" fontSize="16" fontWeight="700" fill="#18181B">{total}</text>
      <text x="50" y="60" textAnchor="middle" fontSize="9" fill="#94A3B8">tasks</text>
    </svg>
  );
}

export default function AnalyticsPage() {
  const { workspace } = useWorkspace();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace?.id) return;
    setLoading(true);
    fetch(`/api/analytics?workspaceId=${workspace.id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [workspace?.id]);

  if (loading || !data) {
    return (
      <>
        <Topbar title="Analytics" />
        <div className="flex items-center justify-center py-32">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  const { summary, last7, categoryCount, priorityCount, memberStats } = data;
  const maxMemberTasks = Math.max(...memberStats.map((m) => m.total), 1);

  const categorySegments = Object.entries(categoryCount).map(([key, val]) => ({
    value: val.total,
    color: CATEGORY_COLORS[key] ?? "#94A3B8",
    label: CATEGORY_LABELS[key] ?? key,
  }));

  const prioritySegments = [
    { value: priorityCount.high, color: "#F43F5E", label: "High" },
    { value: priorityCount.medium, color: "#F59E0B", label: "Medium" },
    { value: priorityCount.low, color: "#10B981", label: "Low" },
  ];

  return (
    <>
      <Topbar title="Analytics" />
      <div className="flex-1 p-4 lg:p-6 space-y-5">

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Tasks", value: summary.total, color: "text-brand", bg: "bg-brand-light",
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
            { label: "Completion Rate", value: `${summary.completionRate}%`, color: "text-success", bg: "bg-success/10",
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
            { label: "Overdue", value: summary.overdue, color: summary.overdue > 0 ? "text-danger" : "text-text-secondary", bg: summary.overdue > 0 ? "bg-danger/10" : "bg-gray-100",
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
            { label: "Time Logged", value: formatTime(summary.totalTimeLogged), color: "text-indigo-600", bg: "bg-indigo-50",
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", stat.bg, stat.color)}>
                {stat.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-text-secondary truncate">{stat.label}</p>
                <p className={cn("text-lg font-semibold leading-tight", stat.color)}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 7-day chart + completion ring */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Bar chart */}
          <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Activity — Last 7 Days</h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-indigo-100" />
                  <span className="text-xs text-text-secondary">Created</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-brand" />
                  <span className="text-xs text-text-secondary">Completed</span>
                </div>
              </div>
            </div>
            <WeekChart data={last7} />
          </div>

          {/* Completion ring */}
          <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col items-center justify-center gap-3">
            <h3 className="text-sm font-semibold text-text-primary self-start">Completion</h3>
            <div className="relative">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="46" fill="none" stroke="#F4F4F5" strokeWidth="16" />
                <circle cx="60" cy="60" r="46" fill="none" stroke="#6366F1" strokeWidth="16"
                  strokeDasharray={`${(summary.completionRate / 100) * 2 * Math.PI * 46} ${2 * Math.PI * 46}`}
                  strokeDashoffset={-(-Math.PI / 2) * 46}
                  transform="rotate(-90 60 60)"
                  strokeLinecap="round" />
                <text x="60" y="55" textAnchor="middle" fontSize="22" fontWeight="700" fill="#18181B">
                  {summary.completionRate}%
                </text>
                <text x="60" y="72" textAnchor="middle" fontSize="10" fill="#94A3B8">complete</text>
              </svg>
            </div>
            <div className="grid grid-cols-3 gap-2 w-full">
              {[
                { label: "Urgent", value: summary.urgent, color: "#F43F5E" },
                { label: "Pending", value: summary.pending, color: "#F59E0B" },
                { label: "Done", value: summary.completed, color: "#10B981" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-base font-semibold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] text-text-secondary">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category + Priority breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Category */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">By Category</h3>
            <div className="flex items-center gap-6">
              <DonutChart segments={categorySegments} />
              <div className="flex-1 space-y-2.5">
                {Object.entries(categoryCount).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[key] ?? "#94A3B8" }} />
                      <span className="text-xs text-text-primary">{CATEGORY_LABELS[key] ?? key}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary">{val.completed}/{val.total}</span>
                      <span className="text-xs font-semibold text-text-primary">
                        {val.total > 0 ? Math.round((val.completed / val.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Priority */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">By Priority</h3>
            <div className="flex items-center gap-6">
              <DonutChart segments={prioritySegments} />
              <div className="flex-1 space-y-2.5">
                {prioritySegments.map((seg) => (
                  <div key={seg.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="text-xs text-text-primary">{seg.label}</span>
                    </div>
                    <span className="text-xs font-semibold text-text-primary">{seg.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Member workload */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Team Workload</h3>
          {memberStats.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-6">No members found</p>
          ) : (
            <div className="space-y-4">
              {memberStats.sort((a, b) => b.total - a.total).map((m) => {
                const completionPct = m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0;
                return (
                  <div key={m.user_id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={m.name} src={m.avatar_url} size="sm" />
                        <span className="text-sm font-medium text-text-primary truncate">{m.name}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 text-xs text-text-secondary">
                        <span className="text-danger font-medium">{m.urgent} urgent</span>
                        <span>{m.total} tasks</span>
                        <span className="text-success font-medium">{completionPct}%</span>
                        {m.timeLogged > 0 && (
                          <span className="text-brand font-medium">{formatTime(m.timeLogged)}</span>
                        )}
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full flex">
                        <div className="h-full bg-success rounded-l-full transition-all duration-700"
                          style={{ width: `${(m.completed / Math.max(maxMemberTasks, 1)) * 100}%` }} />
                        <div className="h-full bg-warning transition-all duration-700"
                          style={{ width: `${((m.total - m.completed - m.urgent) / Math.max(maxMemberTasks, 1)) * 100}%` }} />
                        <div className="h-full bg-danger rounded-r-full transition-all duration-700"
                          style={{ width: `${(m.urgent / Math.max(maxMemberTasks, 1)) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Legend */}
              <div className="flex items-center gap-4 pt-1">
                {[
                  { color: "bg-success", label: "Completed" },
                  { color: "bg-warning", label: "Pending" },
                  { color: "bg-danger", label: "Urgent" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <span className={cn("w-2.5 h-2.5 rounded-sm", l.color)} />
                    <span className="text-xs text-text-secondary">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
