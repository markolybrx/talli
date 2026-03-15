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
    if (!workspaceId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?workspaceId=${workspaceId}`);
      const json = await res.json();
      if (!res.ok) { setError("Failed to load tasks"); }
      else {
        const processed = (json.tasks ?? []).map((task: any) => {
          let status = task.status as TaskStatus;
          // Only auto-promote to urgent if pending AND due very soon
          if (status === "pending" && task.due_date && isWithin12Hours(task.due_date)) {
            status = "urgent";
          }
          return { ...task, status };
        });
        setTasks(processed);
      }
    } catch (e: any) {
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchTasks();
    if (!workspaceId) return;
    const channel = supabase
      .channel(`tasks:${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks",
        filter: `workspace_id=eq.${workspaceId}` }, () => fetchTasks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, fetchTasks]);

  const createTask = async (input: CreateTaskInput, wsId: string): Promise<Task | null> => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: wsId, input }),
    });
    const json = await res.json();
    if (!res.ok || !json.task) { toast.error(json.error ?? "Failed to create task"); return null; }
    await fetchTasks();
    return json.task as Task;
  };

  const updateTask = async (id: string, input: UpdateTaskInput): Promise<boolean> => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) { toast.error("Failed to update task"); return false; }
      await fetchTasks();
      return true;
    } catch {
      toast.error("Failed to update task");
      return false;
    }
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete task"); return false; }
      setTasks((prev) => prev.filter((t) => t.id !== id));
      return true;
    } catch {
      toast.error("Failed to delete task");
      return false;
    }
  };

  const moveTask = async (id: string, newStatus: TaskStatus): Promise<boolean> => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t));
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        toast.error("Failed to update task");
        await fetchTasks();
        return false;
      }
      await fetchTasks();
      return true;
    } catch {
      toast.error("Failed to update task");
      await fetchTasks();
      return false;
    }
  };

  const urgentTasks = tasks.filter((t) => t.status === "urgent");
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  return { tasks, urgentTasks, pendingTasks, completedTasks, loading, error, createTask, updateTask, deleteTask, moveTask, refetch: fetchTasks };
}
