"use client";

import { useState } from "react";
import { cn, formatDate, isWithin12Hours, isOverdue, CATEGORY_CONFIG, PRIORITY_CONFIG } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryBadge, PriorityBadge, DueSoonBadge, OverdueBadge } from "@/components/ui/Badge";
import { SubtaskList } from "@/components/tasks/SubtaskList";
import type { Task, TaskStatus } from "@/types";

interface TaskCardProps {
  task: Task;
  members: { id: string; profile: { full_name: string | null; avatar_url: string | null } }[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, status: TaskStatus) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  isDragging?: boolean;
}

export function TaskCard({
  task,
  members,
  onEdit,
  onDelete,
  onMove,
  onTogglePin,
  isDragging = false,
}: TaskCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const assignee = members.find((m) => m.id === task.assigned_to);
  const categoryConfig = CATEGORY_CONFIG[task.category];
  const subtasks = task.subtasks ?? [];
  const completedSubtasks = subtasks.filter((s) => s.is_completed).length;
  const dueSoon = task.due_date ? isWithin12Hours(task.due_date) : false;
  const overdue = task.due_date ? isOverdue(task.due_date) : false;

  const menuItems = [
    {
      label: "Edit task",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
      action: () => { onEdit(task); setMenuOpen(false); },
    },
    {
      label: task.is_pinned ? "Unpin" : "Pin task",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
      action: () => { onTogglePin(task.id, !task.is_pinned); setMenuOpen(false); },
    },
    ...(task.status !== "completed"
      ? [{
          label: "Mark complete",
          icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
          action: () => { onMove(task.id, "completed"); setMenuOpen(false); },
        }]
      : [{
          label: "Reopen task",
          icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>,
          action: () => { onMove(task.id, task.priority === "high" ? "urgent" : "pending"); setMenuOpen(false); },
        }]),
    {
      label: "Delete task",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>,
      action: () => { onDelete(task.id); setMenuOpen(false); },
      danger: true,
    },
  ];

  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-2xl p-4 space-y-3 cursor-pointer group transition-all duration-200",
        "hover:shadow-card-hover hover:border-gray-300",
        isDragging && "shadow-dropdown rotate-1 opacity-90 scale-[1.02]",
        task.is_pinned && "ring-1 ring-brand/20",
        task.status === "completed" && "opacity-75"
      )}
      style={{ borderLeft: `3px solid ${categoryConfig.color}` }}
      onClick={() => onEdit(task)}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {task.is_pinned && (
            <span className="text-brand">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" fill="white" />
              </svg>
            </span>
          )}
          <PriorityBadge priority={task.priority} />
          {dueSoon && !overdue && <DueSoonBadge />}
          {overdue && task.status !== "completed" && <OverdueBadge />}
        </div>

        {/* Menu */}
        <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary transition-all duration-150",
              "opacity-0 group-hover:opacity-100 hover:bg-gray-100 hover:text-text-primary",
              menuOpen && "opacity-100 bg-gray-100"
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="1" fill="currentColor" />
              <circle cx="12" cy="12" r="1" fill="currentColor" />
              <circle cx="12" cy="19" r="1" fill="currentColor" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 z-50 w-44 bg-surface border border-border rounded-xl shadow-dropdown py-1 animate-slide-down">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors",
                    item.danger
                      ? "text-danger hover:bg-danger/5"
                      : "text-text-primary hover:bg-gray-50"
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <h3 className={cn(
          "text-sm font-semibold text-text-primary leading-snug",
          task.status === "completed" && "line-through text-text-secondary"
        )}>
          {task.title}
        </h3>
        {task.description && (
          <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
            {task.description}
          </p>
        )}
      </div>

      {/* Subtask progress */}
      {subtasks.length > 0 && (
        <SubtaskList
          subtasks={subtasks}
          taskId={task.id}
          compact
        />
      )}

      {/* Category + tags */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <CategoryBadge category={task.category} />
        {task.tags?.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="text-[10px] font-medium px-2 py-0.5 bg-gray-100 text-text-secondary rounded-full"
          >
            {tag}
          </span>
        ))}
        {(task.tags?.length ?? 0) > 2 && (
          <span className="text-[10px] text-text-secondary">
            +{(task.tags?.length ?? 0) - 2}
          </span>
        )}
      </div>

      {/* Footer: due date + assignee */}
      <div className="flex items-center justify-between pt-0.5">
        {task.due_date ? (
          <span
            className={cn(
              "flex items-center gap-1 text-[11px] font-medium",
              overdue && task.status !== "completed"
                ? "text-danger"
                : dueSoon
                ? "text-warning"
                : "text-text-secondary"
            )}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {formatDate(task.due_date)}
          </span>
        ) : (
          <span />
        )}

        {assignee && (
          <Avatar
            name={assignee.profile.full_name}
            src={assignee.profile.avatar_url}
            size="xs"
          />
        )}
      </div>
    </div>
  );
}
