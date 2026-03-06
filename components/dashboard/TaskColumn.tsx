"use client";

import { SwipeableCard } from "@/components/tasks/SwipeableCard";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { TaskCard } from "@/components/tasks/TaskCard";
import { Button } from "@/components/ui/Button";
import type { Task, TaskStatus } from "@/types";

interface TaskColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  accentColor: string;
  icon: React.ReactNode;
  members: { id: string; profile: { full_name: string | null; avatar_url: string | null } }[];
  onAddTask?: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onMoveTask: (id: string, status: TaskStatus) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
}

function SortableTaskCard({ task, ...props }: { task: Task } & Omit<React.ComponentProps<typeof TaskCard>, "task" | "isDragging">) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} isDragging={isDragging} {...props} />
    </div>
  );
}

export function TaskColumn({
  id,
  title,
  tasks,
  accentColor,
  icon,
  members,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onMoveTask,
  onTogglePin,
}: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const columnStyles: Record<TaskStatus, string> = {
    urgent: "border-t-danger",
    pending: "border-t-warning",
    completed: "border-t-success",
  };

  return (
    <div className="flex flex-col min-w-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{ color: accentColor }}>{icon}</span>
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
          >
            {tasks.length}
          </span>
        </div>
        {onAddTask && id !== "completed" && (
          <button
            onClick={onAddTask}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-all duration-150"
            title="Add task"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-2xl border-2 border-dashed transition-all duration-200 min-h-[120px] p-2 space-y-2.5",
          isOver
            ? "border-brand bg-brand-light"
            : "border-transparent bg-gray-50/50"
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              members={members}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onMove={onMoveTask}
              onTogglePin={onTogglePin}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && !isOver && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2 opacity-50">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
            <p className="text-xs text-text-secondary">No tasks here</p>
            {onAddTask && id !== "completed" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddTask}
                className="mt-2 text-xs"
              >
                Add task
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
