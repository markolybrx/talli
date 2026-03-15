"use client";

import { cn } from "@/lib/utils";
import type { Task } from "@/types";
import { isWithin12Hours, isOverdue } from "@/lib/utils";

interface StatsWidgetProps {
  tasks: Task[];
}

export function StatsWidget({ tasks }: StatsWidgetProps) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const dueSoon = tasks.filter(
    (t) => t.due_date && isWithin12Hours(t.due_date) && t.status !== "completed"
  ).length;
  const overdue = tasks.filter(
    (t) => t.due_date && isOverdue(t.due_date) && t.status !== "completed"
  ).length;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const stats = [
    {
      label: "Total Tasks",
      value: total,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      ),
      color: "text-brand",
      bg: "bg-brand-light",
    },
    {
      label: "Completed",
      value: `${completed} (${completionRate}%)`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Due Soon",
      value: dueSoon,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      color: "text-warning",
      bg: "bg-warning/10",
      highlight: dueSoon > 0,
    },
    {
      label: "Overdue",
      value: overdue,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      color: "text-danger",
      bg: "bg-danger/10",
      highlight: overdue > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            "bg-surface border border-border rounded-2xl p-4 flex items-center gap-3",
            stat.highlight && "border-opacity-50"
          )}
        >
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
              stat.bg,
              stat.color
            )}
          >
            {stat.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-text-secondary truncate">{stat.label}</p>
            <p
              className={cn(
                "text-lg font-semibold leading-tight",
                stat.highlight ? stat.color : "text-text-primary"
              )}
            >
              {stat.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
