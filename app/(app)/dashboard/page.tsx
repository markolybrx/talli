"use client";

export const dynamic = "force-dynamic";

import { useState, useCallback } from "react";
import {
  DndContext, DragEndEvent, PointerSensor,
  useSensor, useSensors, closestCorners,
} from "@dnd-kit/core";
import { Topbar } from "@/components/layout/Topbar";
import { StatsWidget } from "@/components/dashboard/StatsWidget";
import { AISummaryBanner } from "@/components/dashboard/AISummaryBanner";
import { TaskColumn } from "@/components/dashboard/TaskColumn";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { BulkActionsBar } from "@/components/tasks/BulkActions";
import { NLTaskCreator } from "@/components/ai/NLTaskCreator";
import { Button } from "@/components/ui/Button";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useTasks } from "@/hooks/useTasks";
import { useRouter } from "next/navigation";
import { cn, isWithin12Hours, isOverdue } from "@/lib/utils";
import type { Task, TaskStatus, Priority } from "@/types";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

type MobileTab = "urgent" | "pending" | "completed";

const COLUMN_CONFIG = {
  urgent: {
    title: "Urgent Tasks",
    accentColor: "#F43F5E",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  pending: {
    title: "Pending Tasks",
    accentColor: "#F59E0B",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  completed: {
    title: "Completed Tasks",
    accentColor: "#10B981",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
} as const;

export default function DashboardPage() {
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const { workspace, members } = useWorkspace();
  const { tasks, urgentTasks, pendingTasks, completedTasks, loading: tasksLoading,
    createTask, updateTask, deleteTask, moveTask } = useTasks(workspace?.id ?? null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [nlModalOpen, setNlModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileTab, setMobileTab] = useState<MobileTab>("pending");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<{
    priority: string | null; category: string | null;
    assignee: string | null; dueSoon: boolean; overdue: boolean;
  }>({ priority: null, category: null, assignee: null, dueSoon: false, overdue: false });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const applyFilters = useCallback((taskList: Task[]) => {
    let result = taskList;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }
    if (filters.priority) result = result.filter(t => t.priority === filters.priority);
    if (filters.category) result = result.filter(t => t.category === filters.category);
    if (filters.assignee) result = result.filter(t => t.assigned_to === filters.assignee);
    if (filters.dueSoon) result = result.filter(t => t.due_date && isWithin12Hours(t.due_date));
    if (filters.overdue) result = result.filter(t => t.due_date && isOverdue(t.due_date) && t.status !== "completed");
    return result;
  }, [searchQuery, filters]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;
    if (["urgent", "pending", "completed"].includes(over.id as string)) {
      const newStatus = over.id as TaskStatus;
      if (activeTask.status !== newStatus) {
        await moveTask(activeTask.id, newStatus);
        if (newStatus === "completed") toast.success("Task completed! 🎉");
      }
    }
  };

  const handleCreateTask = async (data: Parameters<typeof createTask>[0]) => {
    toast.success('WS: ' + (workspace?.id ?? 'NULL'));
    if (!workspace?.id) return;
    const task = await createTask(data, workspace.id);
    if (task) toast.success("Task created!");
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    const success = await deleteTask(id);
    if (success) toast.success("Task deleted");
  };

  const handleTogglePin = async (id: string, pinned: boolean) => {
    await updateTask(id, { is_pinned: pinned });
    toast.success(pinned ? "Task pinned" : "Task unpinned");
  };

  const handleBulkMove = async (status: TaskStatus) => {
    for (const id of selectedIds) await moveTask(id, status);
    setSelectedIds(new Set());
    toast.success(`${selectedIds.size} tasks moved to ${status}`);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} tasks?`)) return;
    for (const id of selectedIds) await deleteTask(id);
    setSelectedIds(new Set());
    toast.success("Tasks deleted");
  };

  const handleBulkAssign = async (userId: string) => {
    for (const id of selectedIds) await updateTask(id, { assigned_to: userId });
    setSelectedIds(new Set());
    toast.success("Tasks assigned");
  };

  const handleBulkPriority = async (priority: Priority) => {
    for (const id of selectedIds) await updateTask(id, { priority });
    setSelectedIds(new Set());
    toast.success("Priority updated");
  };

  const membersForCard = members.map(m => ({
    id: m.user_id,
    profile: { full_name: m.profile?.full_name ?? null, avatar_url: m.profile?.avatar_url ?? null },
  }));

  const membersForModal = members.map(m => ({
    id: m.user_id,
    profile: { full_name: m.profile?.full_name ?? null, avatar_url: m.profile?.avatar_url ?? null, email: m.profile?.email ?? "" },
  }));

  const { loading: wsLoading } = useWorkspace();

  if (wsLoading || tasksLoading) return <LoadingScreen />;

  if (!workspace) {
    router.replace("/workspace");
    return <LoadingScreen />;
  }



  const columns: { id: TaskStatus; tasks: Task[] }[] = [
    { id: "urgent", tasks: applyFilters(urgentTasks) },
    { id: "pending", tasks: applyFilters(pendingTasks) },
    { id: "completed", tasks: applyFilters(completedTasks) },
  ];

  return (
    <>
      <Topbar title="Dashboard" onSearch={setSearchQuery} />
      <div className="flex-1 p-4 lg:p-6 space-y-4 overflow-x-hidden">
        <StatsWidget tasks={tasks} />
        <AISummaryBanner tasks={tasks} workspaceName={workspace?.name ?? "Workspace"} />

        <div className="flex items-center gap-3 flex-wrap">
          <FilterBar onFilterChange={setFilters} members={membersForModal} />
          <p className="text-sm text-text-secondary flex-1">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </p>
          <Button variant="outline" size="sm" onClick={() => setNlModalOpen(true)} className="gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L13.09 8.26L19 7L15.45 11.82L20 16L13.64 15.23L12 21L10.36 15.23L4 16L8.55 11.82L5 7L10.91 8.26L12 2Z" />
            </svg>
            AI Create
          </Button>
          <Button size="sm" onClick={() => setCreateModalOpen(true)} className="gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Task
          </Button>
        </div>

        <div className="lg:hidden flex bg-gray-100 rounded-xl p-1">
          {(["urgent", "pending", "completed"] as MobileTab[]).map(tab => {
            const count = columns.find(c => c.id === tab)?.tasks.length ?? 0;
            return (
              <button key={tab} onClick={() => setMobileTab(tab)}
                className={cn("flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-200",
                  mobileTab === tab ? "bg-white text-text-primary shadow-card" : "text-text-secondary")}>
                {COLUMN_CONFIG[tab].title.split(" ")[0]} ({count})
              </button>
            );
          })}
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="hidden lg:grid lg:grid-cols-3 gap-5">
            {columns.map(({ id, tasks: colTasks }) => {
              const config = COLUMN_CONFIG[id];
              return (
                <TaskColumn key={id} id={id} title={config.title} tasks={colTasks}
                  accentColor={config.accentColor} icon={config.icon}
                  members={membersForCard}
                  onAddTask={id !== "completed" ? () => setCreateModalOpen(true) : undefined}
                  onEditTask={setEditingTask}
                  onDeleteTask={handleDeleteTask}
                  onMoveTask={moveTask}
                  onTogglePin={handleTogglePin}
                />
              );
            })}
          </div>
          <div className="lg:hidden">
            {columns.filter(c => c.id === mobileTab).map(({ id, tasks: colTasks }) => {
              const config = COLUMN_CONFIG[id];
              return (
                <TaskColumn key={id} id={id} title={config.title} tasks={colTasks}
                  accentColor={config.accentColor} icon={config.icon}
                  members={membersForCard}
                  onAddTask={id !== "completed" ? () => setCreateModalOpen(true) : undefined}
                  onEditTask={setEditingTask}
                  onDeleteTask={handleDeleteTask}
                  onMoveTask={moveTask}
                  onTogglePin={handleTogglePin}
                />
              );
            })}
          </div>
        </DndContext>
      </div>

      <CreateTaskModal open={createModalOpen} onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateTask} members={membersForModal}
        tasks={tasks.map(t => ({ id: t.id, title: t.title }))} />

      <TaskDetailModal task={editingTask} open={!!editingTask}
        onClose={() => setEditingTask(null)}
        onUpdate={updateTask} onDelete={handleDeleteTask} onMove={moveTask}
        members={membersForModal} tasks={tasks.map(t => ({ id: t.id, title: t.title }))}
        currentUserId={session?.user?.id ?? ""} />

      <NLTaskCreator open={nlModalOpen} onClose={() => setNlModalOpen(false)}
        onConfirm={async (parsed) => {
          if (!workspace?.id) return;
          await createTask({
            title: parsed.title,
            description: parsed.description,
            priority: parsed.priority,
            category: parsed.category,
            due_date: parsed.due_date,
            assigned_to: parsed.assigned_to,
            tags: parsed.tags,
            subtasks: parsed.subtasks.map(t => ({ title: t })),
          }, workspace.id);
          toast.success("Task created!");
        }}
        members={membersForModal} />

      <BulkActionsBar selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onBulkMove={handleBulkMove} onBulkDelete={handleBulkDelete}
        onBulkAssign={handleBulkAssign} onBulkPriority={handleBulkPriority}
        members={membersForModal} />
    </>
  );
}
