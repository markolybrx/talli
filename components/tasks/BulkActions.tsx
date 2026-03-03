"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { TaskStatus, Priority } from "@/types";

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkMove: (status: TaskStatus) => void;
  onBulkDelete: () => void;
  onBulkAssign: (userId: string) => void;
  onBulkPriority: (priority: Priority) => void;
  members: { id: string; profile: { full_name: string | null; email: string } }[];
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onBulkMove,
  onBulkDelete,
  onBulkAssign,
  onBulkPriority,
  members,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-text-primary text-white rounded-2xl shadow-dropdown px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{selectedCount} selected</span>
          <button onClick={onClearSelection} className="text-white/60 hover:text-white transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="w-px h-5 bg-white/20" />

        {/* Move actions */}
        <div className="flex items-center gap-1.5">
          {(["urgent", "pending", "completed"] as TaskStatus[]).map((status) => (
            <button key={status} onClick={() => onBulkMove(status)}
              className="text-xs font-medium px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg capitalize transition-colors">
              → {status}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-white/20" />

        {/* Priority */}
        <select
          onChange={(e) => e.target.value && onBulkPriority(e.target.value as Priority)}
          defaultValue=""
          className="text-xs font-medium px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white border-0 outline-none cursor-pointer"
        >
          <option value="" disabled>Set priority</option>
          <option value="high">High priority</option>
          <option value="medium">Medium priority</option>
          <option value="low">Low priority</option>
        </select>

        {/* Assign */}
        {members.length > 0 && (
          <select
            onChange={(e) => e.target.value && onBulkAssign(e.target.value)}
            defaultValue=""
            className="text-xs font-medium px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white border-0 outline-none cursor-pointer"
          >
            <option value="" disabled>Assign to</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.profile.full_name ?? m.profile.email}</option>
            ))}
          </select>
        )}

        <div className="w-px h-5 bg-white/20" />

        {/* Delete */}
        <button onClick={onBulkDelete}
          className="text-xs font-medium text-red-300 hover:text-red-200 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
          Delete all
        </button>
      </div>
    </div>
  );
}
