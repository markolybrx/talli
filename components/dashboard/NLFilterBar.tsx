"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Priority, TaskCategory, TaskStatus } from "@/types";

interface NLFilterResult {
  priority: Priority | null;
  category: TaskCategory | null;
  assignee_name: string | null;
  dueSoon: boolean;
  overdue: boolean;
  status: TaskStatus | null;
  label: string;
}

interface NLFilterBarProps {
  members: { id: string; profile: { full_name: string | null; email: string } }[];
  onApply: (filters: {
    priority: Priority | null;
    category: TaskCategory | null;
    assignee: string | null;
    dueSoon: boolean;
    overdue: boolean;
  }) => void;
  onClear: () => void;
}

const SUGGESTIONS = [
  "High priority tasks",
  "Overdue tasks",
  "Due this week",
  "Marketing tasks",
  "Completed tasks",
];

export function NLFilterBar({ members, onApply, onClear }: NLFilterBarProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const runFilter = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/nl-filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: query, members }),
      });
      const data = await res.json();
      const f: NLFilterResult = data.filters;
      if (!f) return;

      // Resolve assignee name to id
      let assigneeId: string | null = null;
      if (f.assignee_name) {
        const match = members.find((m) =>
          m.profile.full_name?.toLowerCase().includes(f.assignee_name!.toLowerCase()) ||
          m.profile.email?.toLowerCase().includes(f.assignee_name!.toLowerCase())
        );
        assigneeId = match?.id ?? null;
      }

      onApply({
        priority: f.priority ?? null,
        category: f.category ?? null,
        assignee: assigneeId,
        dueSoon: f.dueSoon ?? false,
        overdue: f.overdue ?? false,
      });
      setActiveLabel(f.label ?? query);
      setFocused(false);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInput("");
    setActiveLabel(null);
    onClear();
  };

  return (
    <div className="relative">
      {/* Active filter chip */}
      {activeLabel && !focused && (
        <div className="flex items-center gap-1.5 bg-brand-light border border-brand/20 rounded-xl px-3 py-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L13.09 8.26L19 7L15.45 11.82L20 16L13.64 15.23L12 21L10.36 15.23L4 16L8.55 11.82L5 7L10.91 8.26L12 2Z"/>
          </svg>
          <span className="text-xs font-medium text-brand">{activeLabel}</span>
          <button onClick={handleClear} className="text-brand/60 hover:text-brand ml-1 transition-colors">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Input */}
      {(!activeLabel || focused) && (
        <div className={cn(
          "flex items-center gap-2 border rounded-xl px-3 py-1.5 transition-all duration-150 bg-surface",
          focused ? "border-brand shadow-sm w-56" : "border-border w-36 hover:border-gray-300"
        )}>
          {loading ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin flex-shrink-0">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <path d="M12 2L13.09 8.26L19 7L15.45 11.82L20 16L13.64 15.23L12 21L10.36 15.23L4 16L8.55 11.82L5 7L10.91 8.26L12 2Z"/>
            </svg>
          )}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runFilter(input);
              if (e.key === "Escape") { setFocused(false); inputRef.current?.blur(); }
            }}
            placeholder="AI filter..."
            className="text-xs bg-transparent text-text-primary placeholder:text-text-secondary focus:outline-none w-full"
          />
          {input && (
            <button onClick={() => runFilter(input)} disabled={loading}
              className="text-brand text-[10px] font-semibold flex-shrink-0 hover:text-brand-hover transition-colors">
              Go
            </button>
          )}
        </div>
      )}

      {/* Suggestion dropdown */}
      {focused && !input && (
        <div className="absolute top-full mt-1 left-0 w-48 bg-surface border border-border rounded-xl shadow-dropdown z-50 overflow-hidden">
          <p className="text-[10px] font-semibold text-text-secondary px-3 pt-2 pb-1 uppercase tracking-wide">Try asking...</p>
          {SUGGESTIONS.map((s) => (
            <button key={s} onMouseDown={() => { setInput(s); runFilter(s); }}
              className="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-gray-50 transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
