"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { isWithin12Hours } from "@/lib/utils";
import type { Task, TaskStatus, Priority, TaskCategory } from "@/types";
import toast from "react-hot-toast";

interface CreateTaskInput {
  title: string;
  description?: string;
  priority: Priority;
  category: TaskCategory;
  due_date?: string;
  assigned_to?: string;
  tags?: string[];
  is_recurring?: boolean;
  recurrence_pattern?: string;
  depends_on?: string;
  subtasks?: { title: string }[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: Priority;
  category?: TaskCategory;
  status?: TaskStatus;
  due_date?: string;
  assigned_to?: string;
  tags?: string[];
  is_pinned?: boolean;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  depends_on?: string;
  column_order?: number;
}

interface UseTasksReturn {
  tasks: Task[];
  urgentTasks: Task[];
  pendingTasks: Task[];
  completedTasks: Task[];
  loading: boolean;
  error: string | null;
  createTask: (input: CreateTaskInput, workspaceId: string) => Promise<Task | null>;
  updateTask: (id: string, input: UpdateTaskInput) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  moveTask: (id: string, newStatus: TaskStatus) => Promise<boolean>;
  refetch: () => void;
}

export function useTasks(workspaceId: string | null): UseTasksReturn {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error: fetchError } = await supabase
      .from("tasks")
      .select(`*, subtasks(*), task_watchers(user_id)`)
      .eq("workspace_id", workspaceId)
      .order("is_pinned", { ascending: false })
      .order("column_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError("Failed to load tasks");
    } else {
      const processed = (data ?? []).map((task) => {
        let status = task.status as TaskStatus;
        if (
          status !== "completed" &&
          (task.priority === "high" ||
            (task.due_date && isWithin12Hours(task.due_date)))
        ) {
          status = "urgent";
        }
        return { ...task, status };
      });
      setTasks(processed);
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchTasks();

    if (!workspaceId) return;
    const channel = supabase
      .channel(`tasks:${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `workspace_id=eq.${workspaceId}` }, () => fetchTasks())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, fetchTasks]);

  const createTask = async (input: CreateTaskInput, wsId: string): Promise<Task | null> => {
    if (!session?.user?.id) return null;

    let status: TaskStatus = "pending";
    if (input.priority === "high" || (input.due_date && isWithin12Hours(input.due_date))) {
      status = "urgent";
    }

    const { data: task, error: createError } = await supabase
      .from("tasks")
      .insert({
        workspace_id: wsId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        category: input.category,
        status,
        due_date: input.due_date,
        assigned_to: input.assigned_to,
        tags: input.tags ?? [],
        is_recurring: input.is_recurring ?? false,
        recurrence_pattern: input.recurrence_pattern,
        depends_on: input.depends_on,
        created_by: session.user.id,
        column_order: tasks.length,
      })
      .select()
      .single();

    if (createError || !task) { toast.error("Failed to create task"); return null; }

    if (input.subtasks && input.subtasks.length > 0) {
      await supabase.from("subtasks").insert(
        input.subtasks.map((st, i) => ({ task_id: task.id, title: st.title, order: i }))
      );
    }

    await supabase.from("activity_logs").insert({
      workspace_id: wsId, task_id: task.id, user_id: session.user.id,
      action: "task_created", metadata: { title: task.title },
    });

    await fetchTasks();
    return task as Task;
  };

  const updateTask = async (id: string, input: UpdateTaskInput): Promise<boolean> => {
    const { error: updateError } = await supabase.from("tasks").update(input).eq("id", id);
    if (updateError) { toast.error("Failed to update task"); return false; }

    if (session?.user?.id && workspaceId) {
      await supabase.from("activity_logs").insert({
        workspace_id: workspaceId, task_id: id, user_id: session.user.id,
        action: "task_updated", metadata: input,
      });
    }
    await fetchTasks();
    return true;
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    const { error: deleteError } = await supabase.from("tasks").delete().eq("id", id);
    if (deleteError) { toast.error("Failed to delete task"); return false; }
    setTasks((prev) => prev.filter((t) => t.id !== id));
    return true;
  };

  const moveTask = async (id: string, newStatus: TaskStatus): Promise<boolean> => {
    return updateTask(id, { status: newStatus });
  };

  const urgentTasks = tasks.filter((t) => t.status === "urgent");
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  return { tasks, urgentTasks, pendingTasks, completedTasks, loading, error, createTask, updateTask, deleteTask, moveTask, refetch: fetchTasks };
}
