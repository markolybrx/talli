"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "active" | "completed" | "planned";
}

interface SprintSelectorProps {
  workspaceId: string;
  onSprintChange?: (sprint: Sprint | null) => void;
}

export function SprintSelector({ workspaceId, onSprintChange }: SprintSelectorProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [aiTasks, setAiTasks] = useState<string[]>([]);

  const fetchSprints = async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/sprints?workspaceId=${workspaceId}`);
      const data = await res.json();
      const list: Sprint[] = Array.isArray(data) ? data : [];
      setSprints(list);
      const active = list.find((s) => s.status === "active") ?? null;
      setActiveSprint(active);
      onSprintChange?.(active);
    } catch { setSprints([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSprints(); }, [workspaceId]);

  const handleSelect = (sprint: Sprint | null) => {
    setActiveSprint(sprint); onSprintChange?.(sprint); setDropdownOpen(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, name: newName.trim(), goal: newGoal.trim() || null, startDate: newStart || null, endDate: newEnd || null }),
      });
      const data = await res.json();
      if (!res.ok) return;
      if (data.aiTasks?.length) setAiTasks(data.aiTasks);
      await fetchSprints();
      handleSelect(data);
      setShowForm(false);
      setNewName(""); setNewGoal(""); setNewStart(""); setNewEnd("");
    } finally { setCreating(false); }
  };

  const handleComplete = async (sprint: Sprint) => {
    await fetch(`/api/sprints/${sprint.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "completed" }) });
    await fetchSprints();
  };

  const STATUS_CONFIG = {
    active:    { label: "Active",    color: "text-success",        bg: "bg-success/10",  dot: "bg-success" },
    completed: { label: "Completed", color: "text-text-secondary", bg: "bg-gray-100",    dot: "bg-gray-400" },
    planned:   { label: "Planned",   color: "text-brand",          bg: "bg-brand-light", dot: "bg-brand" },
  };

  if (loading) return (
    <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-xl">
      <div className="w-3 h-3 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-text-secondary">Loading…</span>
    </div>
  );

  return (
    <div className="relative">
      <button onClick={() => { setDropdownOpen(!dropdownOpen); setShowForm(false); setAiTasks([]); }}
        className="flex items-center gap-2.5 px-3 py-2 bg-surface border border-border rounded-xl hover:border-gray-300 transition-colors text-sm font-medium text-text-primary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
        </svg>
        {activeSprint ? <span className="max-w-[140px] truncate">{activeSprint.name}</span> : <span className="text-text-secondary">No sprint</span>}
        {activeSprint && (
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", STATUS_CONFIG[activeSprint.status].bg, STATUS_CONFIG[activeSprint.status].color)}>
            {STATUS_CONFIG[activeSprint.status].label}
          </span>
        )}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("transition-transform", dropdownOpen ? "rotate-180" : "")}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {dropdownOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-border rounded-2xl shadow-lg z-50 overflow-hidden animate-slide-down">
          <div className="max-h-52 overflow-y-auto p-2 space-y-1">
            <button onClick={() => handleSelect(null)}
              className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors text-sm",
                !activeSprint ? "bg-brand-light text-brand font-medium" : "text-text-secondary hover:bg-gray-50")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
              </svg>
              All tasks (no sprint filter)
            </button>
            {sprints.length === 0 && <p className="text-xs text-text-secondary text-center py-3">No sprints yet</p>}
            {sprints.map((sprint) => {
              const cfg = STATUS_CONFIG[sprint.status];
              const isSelected = activeSprint?.id === sprint.id;
              return (
                <div key={sprint.id} className={cn("group flex items-center gap-2 px-3 py-2 rounded-xl transition-colors", isSelected ? "bg-brand-light" : "hover:bg-gray-50")}>
                  <button className="flex-1 flex items-center gap-2.5 text-left min-w-0" onClick={() => handleSelect(sprint)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
                    <div className="min-w-0">
                      <p className={cn("text-sm font-medium truncate", isSelected ? "text-brand" : "text-text-primary")}>{sprint.name}</p>
                      {sprint.goal && <p className="text-[10px] text-text-secondary truncate">{sprint.goal}</p>}
                    </div>
                  </button>
                  {sprint.status === "active" && (
                    <button onClick={(e) => { e.stopPropagation(); handleComplete(sprint); }}
                      className="opacity-0 group-hover:opacity-100 text-[10px] font-medium text-success bg-success/10 hover:bg-success/20 px-2 py-0.5 rounded-full transition-all">
                      Complete
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {aiTasks.length > 0 && (
            <div className="border-t border-border p-3 space-y-2">
              <p className="text-xs font-semibold text-brand flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L13.09 8.26L19 7L15.45 11.82L20 16L13.64 15.23L12 21L10.36 15.23L4 16L8.55 11.82L5 7L10.91 8.26L12 2Z"/>
                </svg>
                AI suggested tasks
              </p>
              <ul className="space-y-1">{aiTasks.map((t, i) => <li key={i} className="text-xs text-text-secondary flex items-start gap-1.5"><span className="text-brand mt-0.5">•</span>{t}</li>)}</ul>
              <button onClick={() => setAiTasks([])} className="text-[10px] text-text-secondary hover:text-text-primary">Dismiss</button>
            </div>
          )}

          <div className="border-t border-border p-3">
            {!showForm ? (
              <button onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-2 text-xs font-medium text-brand hover:bg-brand-light rounded-xl py-2 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                New sprint
              </button>
            ) : (
              <div className="space-y-2">
                <input type="text" placeholder="Sprint name *" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus
                  className="w-full text-xs border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand" />
                <input type="text" placeholder="Goal (optional — AI will suggest tasks)" value={newGoal} onChange={(e) => setNewGoal(e.target.value)}
                  className="w-full text-xs border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)}
                    className="text-xs border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand" />
                  <input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)}
                    className="text-xs border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowForm(false); setNewName(""); setNewGoal(""); }}
                    className="flex-1 text-xs font-medium text-text-secondary border border-border rounded-xl py-1.5 hover:bg-gray-50 transition-colors">Cancel</button>
                  <button onClick={handleCreate} disabled={!newName.trim() || creating}
                    className="flex-1 text-xs font-medium text-white bg-brand rounded-xl py-1.5 hover:bg-brand-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                    {creating ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating…</> : "Create sprint"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {dropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />}
    </div>
  );
}
