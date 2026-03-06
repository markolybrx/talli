"use client";

import { useState } from "react";
import { cn, CATEGORY_CONFIG, PRIORITY_CONFIG, formatDate, isOverdue, isWithin12Hours } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import type { Task, TaskStatus } from "@/types";

type SortKey = "title" | "priority" | "status" | "category" | "due_date" | "assigned_to";
type SortDir = "asc" | "desc";

interface TableViewProps {
  tasks: Task[];
  members: { id: string; profile: { full_name: string | null; avatar_url: string | null; email: string } }[];
  onEdit: (task: Task) => void;
  onMove: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  urgent:    { label: "Urgent",    color: "#F43F5E", bg: "#FFF1F2" },
  pending:   { label: "Pending",   color: "#F59E0B", bg: "#FFFBEB" },
  completed: { label: "Completed", color: "#10B981", bg: "#ECFDF5" },
};

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
const STATUS_ORDER: Record<string, number> = { urgent: 0, pending: 1, completed: 2 };

export function TableView({ tasks, members, onEdit, onMove, onDelete }: TableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sorted = [...tasks].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "title":      cmp = a.title.localeCompare(b.title); break;
      case "priority":   cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]; break;
      case "status":     cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]; break;
      case "category":   cmp = a.category.localeCompare(b.category); break;
      case "due_date":   cmp = (a.due_date ?? "").localeCompare(b.due_date ?? ""); break;
      case "assigned_to": {
        const aName = members.find((m) => m.id === a.assigned_to)?.profile.full_name ?? "";
        const bName = members.find((m) => m.id === b.assigned_to)?.profile.full_name ?? "";
        cmp = aName.localeCompare(bName);
        break;
      }
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSelected = tasks.length > 0 && selectedIds.size === tasks.length;
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(tasks.map((t) => t.id)));

  const SortIcon = ({ col }: { col: SortKey }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      className={cn("transition-colors", sortKey === col ? "text-brand" : "text-text-secondary opacity-0 group-hover:opacity-100")}>
      {sortKey === col && sortDir === "asc"
        ? <><polyline points="18 15 12 9 6 15"/></>
        : <><polyline points="6 9 12 15 18 9"/></>
      }
    </svg>
  );

  const cols: { key: SortKey; label: string; className?: string }[] = [
    { key: "title",       label: "Task" },
    { key: "status",      label: "Status",   className: "w-28" },
    { key: "priority",    label: "Priority", className: "w-24" },
    { key: "category",    label: "Category", className: "w-36 hidden lg:table-cell" },
    { key: "assigned_to", label: "Assignee", className: "w-36 hidden md:table-cell" },
    { key: "due_date",    label: "Due",      className: "w-28 hidden sm:table-cell" },
  ];

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50/50">
              <th className="w-10 px-4 py-3">
                <button onClick={toggleAll}
                  className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors",
                    allSelected ? "bg-brand border-brand" : "border-border hover:border-gray-400")}>
                  {allSelected && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              </th>
              {cols.map((col) => (
                <th key={col.key}
                  className={cn("px-3 py-3 text-left font-semibold text-text-secondary text-xs tracking-wide cursor-pointer group", col.className)}
                  onClick={() => handleSort(col.key)}>
                  <div className="flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col.key} />
                  </div>
                </th>
              ))}
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((task) => {
              const statusCfg = STATUS_CONFIG[task.status];
              const priCfg = PRIORITY_CONFIG[task.priority];
              const catCfg = CATEGORY_CONFIG[task.category];
              const assignee = members.find((m) => m.id === task.assigned_to);
              const overdue = task.due_date ? isOverdue(task.due_date) : false;
              const dueSoon = task.due_date ? isWithin12Hours(task.due_date) : false;
              const selected = selectedIds.has(task.id);

              return (
                <tr key={task.id}
                  className={cn("hover:bg-gray-50/50 transition-colors group/row", selected && "bg-brand-light/30")}>
                  {/* Checkbox */}
                  <td className="px-4 py-3">
                    <button onClick={(e) => { e.stopPropagation(); toggleSelect(task.id); }}
                      className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0",
                        selected ? "bg-brand border-brand" : "border-border hover:border-gray-400")}>
                      {selected && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  </td>

                  {/* Title */}
                  <td className="px-3 py-3 cursor-pointer" onClick={() => onEdit(task)}>
                    <div className="flex items-center gap-2">
                      {task.is_pinned && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="#6366F1" className="flex-shrink-0">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        </svg>
                      )}
                      <span className={cn("font-medium text-text-primary line-clamp-1",
                        task.status === "completed" && "line-through text-text-secondary")}>
                        {task.title}
                      </span>
                    </div>
                    {task.subtasks && task.subtasks.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="h-1 w-16 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand rounded-full"
                            style={{ width: `${Math.round((task.subtasks.filter(s => s.is_completed).length / task.subtasks.length) * 100)}%` }} />
                        </div>
                        <span className="text-[11px] text-text-secondary">
                          {task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3 w-28">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
                      {statusCfg.label}
                    </span>
                  </td>

                  {/* Priority */}
                  <td className="px-3 py-3 w-24">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: priCfg.bg, color: priCfg.color }}>
                      {priCfg.label}
                    </span>
                  </td>

                  {/* Category */}
                  <td className="px-3 py-3 w-36 hidden lg:table-cell">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: catCfg.bg, color: catCfg.color }}>
                      {catCfg.label}
                    </span>
                  </td>

                  {/* Assignee */}
                  <td className="px-3 py-3 w-36 hidden md:table-cell">
                    {assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={assignee.profile.full_name} src={assignee.profile.avatar_url} size="xs" />
                        <span className="text-xs text-text-primary truncate max-w-[80px]">
                          {assignee.profile.full_name ?? assignee.profile.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-text-secondary">—</span>
                    )}
                  </td>

                  {/* Due date */}
                  <td className="px-3 py-3 w-28 hidden sm:table-cell">
                    {task.due_date ? (
                      <span className={cn("text-xs font-medium",
                        overdue && task.status !== "completed" ? "text-danger" :
                        dueSoon ? "text-warning" : "text-text-secondary")}>
                        {formatDate(task.due_date)}
                      </span>
                    ) : (
                      <span className="text-xs text-text-secondary">—</span>
                    )}
                  </td>

                  {/* Row actions */}
                  <td className="px-4 py-3 w-10">
                    <div className="opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center gap-1">
                      {task.status !== "completed" && (
                        <button onClick={(e) => { e.stopPropagation(); onMove(task.id, "completed"); }}
                          title="Mark complete"
                          className="w-6 h-6 flex items-center justify-center rounded-lg text-text-secondary hover:text-success hover:bg-success/10 transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                        title="Delete"
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {tasks.length === 0 && (
          <div className="text-center py-16">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#D4D4D8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            <p className="text-sm text-text-secondary">No tasks to display</p>
          </div>
        )}
      </div>
    </div>
  );
}
