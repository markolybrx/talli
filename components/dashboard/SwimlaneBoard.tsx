"use client";

import { cn, CATEGORY_CONFIG, PRIORITY_CONFIG, formatDate, isOverdue, isWithin12Hours } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import type { Task, TaskStatus } from "@/types";

interface SwimlaneProps {
  tasks: Task[];
  members: { id: string; profile: { full_name: string | null; avatar_url: string | null; email: string } }[];
  onEdit: (task: Task) => void;
  onMove: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
}

const COLUMNS: { id: TaskStatus; label: string; color: string; bg: string }[] = [
  { id: "urgent",    label: "Urgent",    color: "#F43F5E", bg: "#FFF1F2" },
  { id: "pending",   label: "Pending",   color: "#F59E0B", bg: "#FFFBEB" },
  { id: "completed", label: "Completed", color: "#10B981", bg: "#ECFDF5" },
];

function TaskPill({ task, onEdit, onMove }: { task: Task; onEdit: (t: Task) => void; onMove: (id: string, status: TaskStatus) => void }) {
  const catConfig = CATEGORY_CONFIG[task.category];
  const priConfig = PRIORITY_CONFIG[task.priority];
  const overdue = task.due_date ? isOverdue(task.due_date) : false;
  const dueSoon = task.due_date ? isWithin12Hours(task.due_date) : false;

  return (
    <div onClick={() => onEdit(task)}
      className="group bg-white border border-border rounded-xl p-3 cursor-pointer hover:shadow-sm transition-all duration-150 space-y-2"
      style={{ borderLeft: `3px solid ${catConfig.color}` }}>
      <p className="text-xs font-medium text-text-primary leading-snug line-clamp-2">{task.title}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: priConfig.bg, color: priConfig.color }}>{priConfig.label}</span>
        {overdue && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-danger/10 text-danger">Overdue</span>}
        {dueSoon && !overdue && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-warning/10 text-warning">Due soon</span>}
      </div>
      {task.due_date && (
        <p className={cn("text-[10px]", overdue ? "text-danger font-medium" : "text-text-secondary")}>{formatDate(task.due_date)}</p>
      )}
      {task.status !== "completed" && (
        <div className="hidden group-hover:flex items-center gap-1 pt-0.5">
          {task.status !== "urgent" && (
            <button onClick={(e) => { e.stopPropagation(); onMove(task.id, "urgent"); }}
              className="text-[10px] font-medium text-danger bg-danger/10 hover:bg-danger/20 px-2 py-0.5 rounded-full transition-colors">→ Urgent</button>
          )}
          {task.status !== "pending" && (
            <button onClick={(e) => { e.stopPropagation(); onMove(task.id, "pending"); }}
              className="text-[10px] font-medium text-warning bg-warning/10 hover:bg-warning/20 px-2 py-0.5 rounded-full transition-colors">→ Pending</button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onMove(task.id, "completed"); }}
            className="text-[10px] font-medium text-success bg-success/10 hover:bg-success/20 px-2 py-0.5 rounded-full transition-colors">✓ Done</button>
        </div>
      )}
    </div>
  );
}

export function SwimlaneBoard({ tasks, members, onEdit, onMove }: SwimlaneProps) {
  const unassignedTasks = tasks.filter((t) => !t.assigned_to);
  const assignees = members.filter((m) => tasks.some((t) => t.assigned_to === m.id));
  const getCell = (memberId: string | null, status: TaskStatus) =>
    tasks.filter((t) => t.status === status && (memberId ? t.assigned_to === memberId : !t.assigned_to));

  const rows = [
    ...(unassignedTasks.length > 0 ? [{ id: null, member: null }] : []),
    ...assignees.map((m) => ({ id: m.id, member: m })),
  ];

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-text-secondary">No tasks assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-[180px_1fr_1fr_1fr] gap-3 mb-3 px-1">
          <div />
          {COLUMNS.map((col) => (
            <div key={col.id} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: col.bg }}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: col.color }} />
              <span className="text-xs font-semibold" style={{ color: col.color }}>{col.label}</span>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {rows.map(({ id: memberId, member }) => {
            const totalForRow = tasks.filter((t) => memberId ? t.assigned_to === memberId : !t.assigned_to).length;
            return (
              <div key={memberId ?? "unassigned"} className="grid grid-cols-[180px_1fr_1fr_1fr] gap-3 items-start">
                <div className="bg-surface border border-border rounded-xl p-3 flex items-center gap-2.5 self-start sticky left-0">
                  {member ? (
                    <>
                      <Avatar name={member.profile.full_name} src={member.profile.avatar_url} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-text-primary truncate">{member.profile.full_name ?? member.profile.email}</p>
                        <p className="text-[10px] text-text-secondary">{totalForRow} tasks</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-text-secondary">Unassigned</p>
                        <p className="text-[10px] text-text-secondary">{totalForRow} tasks</p>
                      </div>
                    </>
                  )}
                </div>
                {COLUMNS.map((col) => {
                  const cellTasks = getCell(memberId, col.id);
                  return (
                    <div key={col.id} className="bg-gray-50/60 border border-border rounded-xl p-2 min-h-[80px] space-y-2">
                      {cellTasks.length === 0 ? (
                        <div className="flex items-center justify-center h-10">
                          <span className="text-[10px] text-text-secondary opacity-50">—</span>
                        </div>
                      ) : (
                        cellTasks.map((task) => <TaskPill key={task.id} task={task} onEdit={onEdit} onMove={onMove} />)
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
