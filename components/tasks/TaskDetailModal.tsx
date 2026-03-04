"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge, CategoryBadge, PriorityBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { SubtaskList } from "@/components/tasks/SubtaskList";
import { TaskComments } from "@/components/tasks/TaskComments";
import { TaskAttachments } from "@/components/tasks/TaskAttachments";
import { cn, CATEGORY_CONFIG, PRIORITY_CONFIG, formatDateTime, isWithin12Hours, isOverdue } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { Task, Priority, TaskCategory, TaskStatus } from "@/types";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";

const editSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]),
  category: z.enum(["recruitment_marketing", "recruitment_sourcing", "recruitment_agent_hiring", "others"]),
  due_date: z.string().optional(),
  due_time: z.string().optional(),
  assigned_to: z.string().optional(),
  tags: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurrence_pattern: z.string().optional(),
  depends_on: z.string().optional(),
});

type EditFormData = z.infer<typeof editSchema>;

type TabType = "details" | "subtasks" | "comments" | "attachments" | "history";

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Task>) => Promise<boolean>;
  onDelete: (id: string) => void;
  onMove: (id: string, status: TaskStatus) => void;
  members: { id: string; profile: { full_name: string | null; avatar_url: string | null; email: string } }[];
  tasks: { id: string; title: string }[];
  currentUserId: string;
}

export function TaskDetailModal({
  task,
  open,
  onClose,
  onUpdate,
  onDelete,
  onMove,
  members,
  tasks,
  currentUserId,
}: TaskDetailModalProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [watchers, setWatchers] = useState<{ user_id: string; profile: { full_name: string | null; avatar_url: string | null } }[]>([]);
  const [activityLog, setActivityLog] = useState<{ id: string; action: string; metadata: Record<string, unknown>; created_at: string; profile?: { full_name: string | null } }[]>([]);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
  });

  const watchRecurring = watch("is_recurring");

  useEffect(() => {
    if (!task || !open) return;
    const dueDate = task.due_date ? task.due_date.split("T")[0] : "";
    const dueTime = task.due_date ? task.due_date.split("T")[1]?.slice(0, 5) : "";
    reset({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      category: task.category,
      due_date: dueDate,
      due_time: dueTime,
      assigned_to: task.assigned_to ?? "",
      tags: task.tags?.join(", ") ?? "",
      is_recurring: task.is_recurring,
      recurrence_pattern: task.recurrence_pattern ?? "",
      depends_on: task.depends_on ?? "",
    });
    fetchWatchers();
    fetchActivity();
  }, [task, open]);

  const fetchWatchers = async () => {
    if (!task) return;
    const { data } = await supabase
      .from("task_watchers")
      .select("user_id, profiles:user_id(full_name, avatar_url)")
      .eq("task_id", task.id);
    if (data) {
      const mapped = data.map((w: any) => ({
        user_id: w.user_id,
        profile: w.profiles ?? { full_name: null, avatar_url: null },
      }));
      setWatchers(mapped);
      setIsWatching(mapped.some((w) => w.user_id === currentUserId));
    }
  };

  const fetchActivity = async () => {
    if (!task) return;
    const { data } = await supabase
      .from("activity_logs")
      .select("*, profile:user_id(full_name)")
      .eq("task_id", task.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setActivityLog(data as any);
  };

  const handleSave = async (data: EditFormData) => {
    if (!task) return;
    setSaving(true);
    const due_date = data.due_date && data.due_time
      ? `${data.due_date}T${data.due_time}`
      : data.due_date ? `${data.due_date}T23:59` : undefined;
    const tags = data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const success = await onUpdate(task.id, { ...data, due_date, tags });
    if (success) {
      toast.success("Task updated");
      setEditing(false);
    }
    setSaving(false);
  };

  const toggleWatch = async () => {
    if (!task || !session?.user?.id) return;
    const userId = session.user.id;
    if (isWatching) {
      await supabase.from("task_watchers").delete().eq("task_id", task.id).eq("user_id", userId);
      setIsWatching(false);
      setWatchers((prev) => prev.filter((w) => w.user_id !== userId));
      toast.success("Stopped watching task");
    } else {
      await supabase.from("task_watchers").insert({ task_id: task.id, user_id: session.user.id });
      setIsWatching(true);
      await fetchWatchers();
      toast.success("Watching task");
    }
  };

  const formatAction = (action: string, metadata: Record<string, unknown>) => {
    const actionMap: Record<string, string> = {
      task_created: "created this task",
      task_updated: "updated this task",
      task_deleted: "deleted a task",
      status_changed: `moved to ${metadata.status}`,
    };
    return actionMap[action] ?? action;
  };

  if (!task) return null;

  const assignee = members.find((m) => m.id === task.assigned_to);
  const dependsOnTask = tasks.find((t) => t.id === task.depends_on);
  const dueSoon = task.due_date ? isWithin12Hours(task.due_date) : false;
  const overdue = task.due_date ? isOverdue(task.due_date) : false;

  const tabs: { id: TabType; label: string }[] = [
    { id: "details", label: "Details" },
    { id: "subtasks", label: `Subtasks${task.subtasks?.length ? ` (${task.subtasks.length})` : ""}` },
    { id: "comments", label: "Comments" },
    { id: "attachments", label: "Attachments" },
    { id: "history", label: "History" },
  ];

  return (
    <Modal open={open} onClose={onClose} size="xl" className="max-h-[90vh] flex flex-col">
      <div className="flex flex-col h-full -mt-6 -mx-6">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <CategoryBadge category={task.category} />
                <PriorityBadge priority={task.priority} />
                {dueSoon && !overdue && (
                  <span className="text-xs font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full">Due Soon</span>
                )}
                {overdue && task.status !== "completed" && (
                  <span className="text-xs font-medium text-danger bg-danger/10 px-2 py-0.5 rounded-full">Overdue</span>
                )}
                {task.status === "completed" && (
                  <span className="text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">Completed</span>
                )}
              </div>
              <h2 className={cn("text-xl font-semibold text-text-primary", task.status === "completed" && "line-through text-text-secondary")}>
                {task.title}
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={toggleWatch}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all duration-150",
                  isWatching
                    ? "bg-brand-light text-brand border-brand/20"
                    : "border-border text-text-secondary hover:border-gray-300"
                )}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {isWatching ? "Watching" : "Watch"}
              </button>
              {!editing ? (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              )}
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-gray-100 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 mt-3">
            {task.status !== "completed" ? (
              <Button size="sm" variant="secondary" onClick={() => { onMove(task.id, "completed"); onClose(); }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Mark Complete
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => { onMove(task.id, task.priority === "high" ? "urgent" : "pending"); onClose(); }}>
                Reopen Task
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => { onDelete(task.id); onClose(); }} className="text-danger hover:bg-danger/5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              Delete
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150 -mb-px",
                activeTab === tab.id
                  ? "border-brand text-brand"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* DETAILS TAB */}
          {activeTab === "details" && (
            <div className="space-y-5">
              {editing ? (
                <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
                  <Input label="Title" error={errors.title?.message} {...register("title")} />
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Description</label>
                    <textarea {...register("description")} rows={3} className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">Priority</label>
                      <div className="flex gap-1.5">
                        {(["high", "medium", "low"] as Priority[]).map((p) => {
                          const config = PRIORITY_CONFIG[p];
                          const isSelected = watch("priority") === p;
                          return (
                            <button key={p} type="button" onClick={() => setValue("priority", p)}
                              className={cn("flex-1 py-2 rounded-xl text-xs font-medium border transition-all",
                                isSelected ? "shadow-sm border-transparent" : "border-border text-text-secondary")}
                              style={isSelected ? { backgroundColor: config.bg, color: config.color, borderColor: config.color } : {}}>
                              {config.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">Category</label>
                      <select {...register("category")} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white">
                        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                          <option key={key} value={key}>{config.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Due date" type="date" {...register("due_date")} />
                    <Input label="Due time" type="time" {...register("due_time")} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Assign to</label>
                    <select {...register("assigned_to")} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white">
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>{m.profile.full_name ?? m.profile.email}</option>
                      ))}
                    </select>
                  </div>
                  <Input label="Tags (comma separated)" placeholder="design, urgent" {...register("tags")} />
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Depends on</label>
                    <select {...register("depends_on")} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white">
                      <option value="">No dependency</option>
                      {tasks.filter((t) => t.id !== task.id).map((t) => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" fullWidth onClick={() => setEditing(false)}>Cancel</Button>
                    <Button type="submit" fullWidth loading={saving}>Save Changes</Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-5">
                  {task.description && (
                    <div>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Description</p>
                      <p className="text-sm text-text-primary leading-relaxed">{task.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Assignee</p>
                      {assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={assignee.profile.full_name} src={assignee.profile.avatar_url} size="sm" />
                          <span className="text-sm text-text-primary">{assignee.profile.full_name ?? assignee.profile.email}</span>
                        </div>
                      ) : (
                        <p className="text-sm text-text-secondary">Unassigned</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Due Date</p>
                      <p className={cn("text-sm font-medium",
                        overdue && task.status !== "completed" ? "text-danger" :
                        dueSoon ? "text-warning" : "text-text-primary"
                      )}>
                        {task.due_date ? formatDateTime(task.due_date) : "No due date"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Created</p>
                      <p className="text-sm text-text-primary">{formatDateTime(task.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Last Updated</p>
                      <p className="text-sm text-text-primary">{formatDateTime(task.updated_at)}</p>
                    </div>
                  </div>
                  {task.tags && task.tags.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {task.tags.map((tag) => (
                          <span key={tag} className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-text-secondary rounded-full">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {dependsOnTask && (
                    <div>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Depends On</p>
                      <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                          <line x1="8" y1="18" x2="21" y2="18" />
                          <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" />
                          <line x1="3" y1="18" x2="3.01" y2="18" />
                        </svg>
                        <span className="text-sm text-text-primary">{dependsOnTask.title}</span>
                      </div>
                    </div>
                  )}
                  {task.is_recurring && (
                    <div>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Recurring</p>
                      <span className="text-xs font-medium text-brand bg-brand-light px-2.5 py-1 rounded-full capitalize">
                        {task.recurrence_pattern ?? "Recurring"}
                      </span>
                    </div>
                  )}
                  {watchers.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Watchers</p>
                      <div className="flex items-center gap-2">
                        {watchers.map((w) => (
                          <Avatar key={w.user_id} name={w.profile.full_name} src={null} size="sm" />
                        ))}
                        <span className="text-xs text-text-secondary">{watchers.length} watching</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SUBTASKS TAB */}
          {activeTab === "subtasks" && (
            <SubtaskList subtasks={task.subtasks ?? []} taskId={task.id} onUpdate={() => {}} />
          )}

          {/* COMMENTS TAB */}
          {activeTab === "comments" && (
            <TaskComments taskId={task.id} members={members} currentUserId={currentUserId} />
          )}

          {/* ATTACHMENTS TAB */}
          {activeTab === "attachments" && (
            <TaskAttachments taskId={task.id} currentUserId={currentUserId} />
          )}

          {/* HISTORY TAB */}
          {activeTab === "history" && (
            <div className="space-y-3">
              {activityLog.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-8">No activity recorded yet.</p>
              ) : (
                activityLog.map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary">
                        <span className="font-medium">{(log as any).profile?.full_name ?? "Someone"}</span>
                        {" "}{formatAction(log.action, log.metadata)}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">{formatDateTime(log.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
