"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { Subtask } from "@/types";
import toast from "react-hot-toast";

interface SubtaskListProps {
  subtasks: Subtask[];
  taskId: string;
  onUpdate?: () => void;
  compact?: boolean;
}

export function SubtaskList({
  subtasks,
  taskId,
  onUpdate,
  compact = false,
}: SubtaskListProps) {
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(
    [...subtasks].sort((a, b) => a.order - b.order)
  );
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const completed = localSubtasks.filter((s) => s.is_completed).length;
  const total = localSubtasks.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  const toggleSubtask = async (subtask: Subtask) => {
    const updated = !subtask.is_completed;

    // Optimistic update
    setLocalSubtasks((prev) =>
      prev.map((s) =>
        s.id === subtask.id ? { ...s, is_completed: updated } : s
      )
    );

    const { error } = await supabase
      .from("subtasks")
      .update({ is_completed: updated })
      .eq("id", subtask.id);

    if (error) {
      // Revert on error
      setLocalSubtasks((prev) =>
        prev.map((s) =>
          s.id === subtask.id ? { ...s, is_completed: !updated } : s
        )
      );
      toast.error("Failed to update subtask");
    } else {
      onUpdate?.();
    }
  };

  const addSubtask = async () => {
    const title = newTitle.trim();
    if (!title) return;

    const { data, error } = await supabase
      .from("subtasks")
      .insert({ task_id: taskId, title, order: localSubtasks.length })
      .select()
      .single();

    if (error || !data) {
      toast.error("Failed to add subtask");
      return;
    }

    setLocalSubtasks((prev) => [...prev, data as Subtask]);
    setNewTitle("");
    onUpdate?.();
  };

  const deleteSubtask = async (id: string) => {
    setLocalSubtasks((prev) => prev.filter((s) => s.id !== id));
    await supabase.from("subtasks").delete().eq("id", id);
    onUpdate?.();
  };

  if (compact && total === 0) return null;

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      {total > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">
              {completed}/{total} subtasks
            </span>
            <span className="text-xs font-medium text-text-secondary">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Subtask list */}
      {!compact && (
        <div className="space-y-1.5">
          {localSubtasks.map((subtask) => (
            <div
              key={subtask.id}
              className="flex items-center gap-2.5 group"
            >
              <button
                onClick={() => toggleSubtask(subtask)}
                className={cn(
                  "w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all duration-150",
                  subtask.is_completed
                    ? "bg-brand border-brand"
                    : "border-border hover:border-brand"
                )}
              >
                {subtask.is_completed && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              <span
                className={cn(
                  "flex-1 text-sm",
                  subtask.is_completed
                    ? "line-through text-text-secondary"
                    : "text-text-primary"
                )}
              >
                {subtask.title}
              </span>
              <button
                onClick={() => deleteSubtask(subtask.id)}
                className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-danger transition-all duration-150"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}

          {/* Add subtask input */}
          {adding ? (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addSubtask();
                  if (e.key === "Escape") {
                    setAdding(false);
                    setNewTitle("");
                  }
                }}
                placeholder="Subtask title..."
                autoFocus
                className="flex-1 text-sm border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
              />
              <button
                onClick={addSubtask}
                className="text-brand hover:text-brand-hover text-sm font-medium"
              >
                Add
              </button>
              <button
                onClick={() => { setAdding(false); setNewTitle(""); }}
                className="text-text-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-brand transition-colors mt-1"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add subtask
            </button>
          )}
        </div>
      )}
    </div>
  );
}
