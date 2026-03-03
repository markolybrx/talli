"use client";

import { useState } from "react";
import { cn, CATEGORY_CONFIG, PRIORITY_CONFIG } from "@/lib/utils";
import type { Priority, TaskCategory } from "@/types";

interface FilterState {
  priority: Priority | null;
  category: TaskCategory | null;
  assignee: string | null;
  dueSoon: boolean;
  overdue: boolean;
}

interface FilterBarProps {
  onFilterChange: (filters: FilterState) => void;
  members: { id: string; profile: { full_name: string | null; email: string } }[];
}

export function FilterBar({ onFilterChange, members }: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    priority: null, category: null, assignee: null, dueSoon: false, overdue: false,
  });

  const activeCount = Object.values(filters).filter((v) => v !== null && v !== false).length;

  const update = (key: keyof FilterState, value: FilterState[keyof FilterState]) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearAll = () => {
    const reset: FilterState = { priority: null, category: null, assignee: null, dueSoon: false, overdue: false };
    setFilters(reset);
    onFilterChange(reset);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl border transition-all duration-150",
          open || activeCount > 0
            ? "bg-brand-light text-brand border-brand/20"
            : "border-border text-text-secondary hover:border-gray-300 hover:text-text-primary"
        )}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="11" y1="18" x2="13" y2="18" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span className="w-4 h-4 bg-brand text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-11 z-40 w-72 bg-surface border border-border rounded-2xl shadow-dropdown p-4 space-y-4 animate-slide-down">
          {/* Priority */}
          <div>
            <p className="text-xs font-semibold text-text-secondary mb-2">Priority</p>
            <div className="flex gap-1.5">
              {(["high", "medium", "low"] as Priority[]).map((p) => {
                const config = PRIORITY_CONFIG[p];
                const isActive = filters.priority === p;
                return (
                  <button key={p} onClick={() => update("priority", isActive ? null : p)}
                    className={cn("flex-1 py-1.5 text-xs font-medium rounded-xl border transition-all",
                      isActive ? "border-transparent shadow-sm" : "border-border text-text-secondary hover:border-gray-300")}
                    style={isActive ? { backgroundColor: config.bg, color: config.color, borderColor: config.color } : {}}>
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category */}
          <div>
            <p className="text-xs font-semibold text-text-secondary mb-2">Category</p>
            <div className="space-y-1">
              {(Object.entries(CATEGORY_CONFIG) as [TaskCategory, typeof CATEGORY_CONFIG[TaskCategory]][]).map(([key, config]) => (
                <button key={key} onClick={() => update("category", filters.category === key ? null : key)}
                  className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all",
                    filters.category === key ? "text-white" : "text-text-primary hover:bg-gray-50")}
                  style={filters.category === key ? { backgroundColor: config.color } : {}}>
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee */}
          <div>
            <p className="text-xs font-semibold text-text-secondary mb-2">Assignee</p>
            <select
              value={filters.assignee ?? ""}
              onChange={(e) => update("assignee", e.target.value || null)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Anyone</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.profile.full_name ?? m.profile.email}</option>
              ))}
            </select>
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            {([
              { key: "dueSoon", label: "Due within 12 hours" },
              { key: "overdue", label: "Overdue only" },
            ] as { key: keyof FilterState; label: string }[]).map(({ key, label }) => (
              <button key={key} onClick={() => update(key, !filters[key])}
                className={cn("w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm border transition-all",
                  filters[key] ? "border-brand bg-brand-light text-brand" : "border-border text-text-primary hover:bg-gray-50")}>
                <span className="font-medium">{label}</span>
                <div className={cn("w-8 h-5 rounded-full relative transition-colors", filters[key] ? "bg-brand" : "bg-gray-200")}>
                  <span className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all", filters[key] ? "left-4" : "left-0.5")} />
                </div>
              </button>
            ))}
          </div>

          {activeCount > 0 && (
            <button onClick={clearAll} className="w-full text-xs font-medium text-danger hover:bg-danger/5 py-2 rounded-xl transition-colors">
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
