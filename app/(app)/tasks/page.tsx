"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Topbar } from "@/components/layout/Topbar";
import { TableView } from "@/components/tasks/TableView";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { BulkActionsBar } from "@/components/tasks/BulkActions";
import { Button } from "@/components/ui/Button";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useTasks } from "@/hooks/useTasks";
import { isWithin12Hours, isOverdue } from "@/lib/utils";
import type { Task, TaskStatus, Priority } from "@/types";
import toast from "react-hot-toast";

export default function TasksPage() {
  const { data: session } = useSession();
  const { workspace, members } = useWorkspace();
  const { tasks, loading, createTask, updateTask, deleteTask, moveTask } =
    useTasks(workspace?.id ?? null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<{
    priority: string | null;
    category: string | null;
    assignee: string | null;
    dueSoon: boolean;
    overdue: boolean;
  }>({ priority: null, category: null, assignee: null, dueSoon: false, overdue: false });

  const filteredTasks = useCallback(() => {
    let result = tasks;
    if (statusFilter !== "all") result = result.filter((t) => t.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    if (filters.priority) result = result.filter((t) => t.priority === filters.priority);
    if (filters.category) result = result.filter((t) => t.category === filters.category);
    if (filters.assignee) result = result.filter((t) => t.assigned_to === filters.assignee);
    if (filters.dueSoon) result = result.filter((t) => t.due_date && isWithin12Hours(t.due_date));
    if (filters.overdue)
      result = result.filter((t) => t.due_date && isOverdue(t.due_date) && t.status !== "completed");
    return result;
  }, [tasks, statusFilter, searchQuery, filters]);

  const handleCreateTask = async (data: Parameters<typeof createTask>[0]) => {
    if (!workspace?.id) return;
    const task = await createTask(data, workspace.id);
    if (task) toast.success("Task created!");
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    const success = await deleteTask(id);
    if (success) toast.success("Task deleted");
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

  const membersForModal = members.map((m) => ({
    id: m.user_id,
    profile: {
      full_name: m.profile?.full_name ?? null,
      avatar_url: m.profile?.avatar_url ?? null,
      email: m.profile?.email ?? "",
    },
  }));

  const counts = {
    all: tasks.length,
    urgent: tasks.filter((t) => t.status === "urgent").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };

  const STATUS_TABS: { key: "all" | TaskStatus; label: string }[] = [
    { key: "all",       label: "All" },
    { key: "urgent",    label: "Urgent" },
    { key: "pending",   label: "Pending" },
    { key: "completed", label: "Completed" },
  ];

  if (loading) return <LoadingScreen />;
  if (!workspace) return null;

  const displayTasks = filteredTasks();

  return (
    <>
      <Topbar title="Tasks" onSearch={setSearchQuery} />
      <div className="flex-1 p-4 lg:p-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <FilterBar onFilterChange={setFilters} members={membersForModal} />
          <p className="text-sm text-text-secondary flex-1">
            {displayTasks.length} task{displayTasks.length !== 1 ? "s" : ""}
          </p>
          <Button size="sm" onClick={() => setCreateModalOpen(true)} className="gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Task
          </Button>
        </div>

        <div className="flex items-center gap-1 border-b border-border">
          {STATUS_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                statusFilter === key
                  ? "border-brand text-brand"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {label}
              <span className={`ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                statusFilter === key ? "bg-brand-light text-brand" : "bg-gray-100 text-text-secondary"
              }`}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        {displayTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4D4D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </div>
            <p className="text-text-secondary text-sm">No tasks found</p>
            <button onClick={() => setCreateModalOpen(true)} className="mt-3 text-sm text-brand font-medium hover:underline">
              + Create your first task
            </button>
          </div>
        ) : (
          <TableView
            tasks={displayTasks}
            members={membersForModal}
            onEdit={setEditingTask}
            onMove={moveTask}
            onDelete={handleDeleteTask}
          />
        )}
      </div>

      <CreateTaskModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateTask}
        workspaceId={workspace?.id ?? ""}
        members={membersForModal}
        tasks={tasks.map((t) => ({ id: t.id, title: t.title }))}
      />

      <TaskDetailModal
        task={editingTask}
        open={!!editingTask}
        onClose={() => setEditingTask(null)}
        onUpdate={updateTask}
        onDelete={handleDeleteTask}
        onMove={moveTask}
        members={membersForModal}
        tasks={tasks.map((t) => ({ id: t.id, title: t.title }))}
        currentUserId={session?.user?.id ?? ""}
      />

      <BulkActionsBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onBulkMove={handleBulkMove}
        onBulkDelete={handleBulkDelete}
        onBulkAssign={handleBulkAssign}
        onBulkPriority={handleBulkPriority}
        members={membersForModal}
      />
    </>
  );
}
