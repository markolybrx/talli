"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { TemplatePickerModal } from "@/components/tasks/templates/TemplatePickerModal";
import { cn, CATEGORY_CONFIG, PRIORITY_CONFIG } from "@/lib/utils";
import type { Priority, TaskCategory } from "@/types";
import toast from "react-hot-toast";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
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

type TaskFormData = z.infer<typeof taskSchema>;

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData & { subtasks: { title: string }[]; tags: string[] }) => Promise<void>;
  members: { id: string; profile: { full_name: string | null; email: string } }[];
  tasks: { id: string; title: string }[];
  workspaceId?: string;
}

type AIAction = "subtasks" | "priority" | "description" | "deadline" | null;

export function CreateTaskModal({ open, onClose, onSubmit, members, tasks, workspaceId }: CreateTaskModalProps) {
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiAction, setAiAction] = useState<AIAction>(null);
  const [priorityReason, setPriorityReason] = useState<string | null>(null);
  const [deadlineReason, setDeadlineReason] = useState<string | null>(null);

  // Smart Assignment
  const [assignSuggestion, setAssignSuggestion] = useState<{ assignee_id: string; name: string; avatar_url: string | null; reason: string } | null>(null);
  const [loadingAssign, setLoadingAssign] = useState(false);

  // Auto-Categorize (debounced on title blur)
  const [catSuggestion, setCatSuggestion] = useState<{ category: string } | null>(null);
  const autoCatTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Effort Estimate
  const [effort, setEffort] = useState<{ hours: number; confidence: string; note: string } | null>(null);
  const [loadingEffort, setLoadingEffort] = useState(false);

  // Duplicate detection (debounced on title change)
  const [duplicate, setDuplicate] = useState<{ id: string; title: string; similarity: string } | null>(null);
  const dupCheckTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: { priority: "medium", category: "others", is_recurring: false },
  });

  const watchPriority = watch("priority");
  const watchCategory = watch("category");
  const watchRecurring = watch("is_recurring");
  const watchTitle = watch("title");
  const watchDueDate = watch("due_date");

  const handleClose = () => {
    reset();
    setSubtasks([]);
    setSubtaskInput("");
    setPriorityReason(null);
    setDeadlineReason(null);
    setAssignSuggestion(null);
    setCatSuggestion(null);
    setEffort(null);
    setDuplicate(null);
    onClose();
  };

  const applyTemplate = (tpl: any) => {
    if (tpl.title) setValue("title", tpl.title);
    if (tpl.description) setValue("description", tpl.description);
    if (tpl.priority) setValue("priority", tpl.priority);
    if (tpl.category) setValue("category", tpl.category);
    if (tpl.subtasks?.length) setSubtasks(tpl.subtasks.map((s: any) => s.title));
  };

  const handleFormSubmit = async (data: TaskFormData) => {
    setLoading(true);
    try {
      const due_date = data.due_date && data.due_time
        ? `${data.due_date}T${data.due_time}`
        : data.due_date ? `${data.due_date}T23:59` : undefined;
      const tags = data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
      await onSubmit({ ...data, due_date, subtasks: subtasks.map((t) => ({ title: t })), tags: tags as any });
      handleClose();
    } catch {
      toast.error("Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  // Auto-categorize on title change (debounced)
  const handleTitleBlur = () => {
    const title = watchTitle?.trim();
    if (!title || title.length < 5) return;
    clearTimeout(autoCatTimer.current);
    autoCatTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/ai/auto-categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        const data = await res.json();
        if (data.category && data.category !== watchCategory) {
          setCatSuggestion({ category: data.category });
        }
      } catch {}
    }, 800);
  };

  // Duplicate check (debounced)
  useEffect(() => {
    const title = watchTitle?.trim();
    if (!title || title.length < 6 || !tasks?.length) return;
    clearTimeout(dupCheckTimer.current);
    dupCheckTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/ai/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, existingTasks: tasks.slice(0, 100) }),
        });
        const data = await res.json();
        setDuplicate(data.duplicate ?? null);
      } catch {}
    }, 1200);
  }, [watchTitle]);

  const aiSmartAssign = async () => {
    if (!watchTitle?.trim() || !members?.length) { return; }
    const memberStats = members.map((m: any) => ({
      user_id: m.id,
      name: m.profile?.full_name ?? m.profile?.email ?? "Unknown",
      avatar_url: m.profile?.avatar_url ?? null,
      total: 0, urgent: 0, completed: 0,
    }));
    setLoadingAssign(true);
    try {
      const res = await fetch("/api/ai/suggest-assignee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: watchTitle,
          category: watchCategory,
          memberStats,
        }),
      });
      const data = await res.json();
      if (res.ok && data.assignee_id) setAssignSuggestion(data);
    } catch {}
    finally { setLoadingAssign(false); }
  };

  const aiEstimateEffort = async () => {
    if (!watchTitle?.trim()) return;
    setLoadingEffort(true);
    try {
      const res = await fetch("/api/ai/estimate-effort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: watchTitle,
          category: watchCategory,
          priority: watchPriority,
          subtasks,
        }),
      });
      const data = await res.json();
      if (res.ok && data.hours) setEffort(data);
    } catch {}
    finally { setLoadingEffort(false); }
  };

  const addSubtask = () => {
    const title = subtaskInput.trim();
    if (!title) return;
    setSubtasks((prev) => [...prev, title]);
    setSubtaskInput("");
  };

  const removeSubtask = (index: number) => setSubtasks((prev) => prev.filter((_, i) => i !== index));

  const aiGenSubtasks = async () => {
    if (!watchTitle?.trim()) { toast.error("Enter a task title first"); return; }
    setAiAction("subtasks");
    try {
      const res = await fetch("/api/ai/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: watchTitle, category: watchCategory }),
      });
      const data = await res.json();
      if (data.subtasks?.length) {
        setSubtasks(data.subtasks);
        toast.success(`${data.subtasks.length} subtasks generated`);
      } else {
        toast.error("Could not generate subtasks");
      }
    } catch {
      toast.error("AI unavailable");
    } finally {
      setAiAction(null);
    }
  };

  const aiSuggestPriority = async () => {
    if (!watchTitle?.trim()) { toast.error("Enter a task title first"); return; }
    setAiAction("priority");
    setPriorityReason(null);
    try {
      const res = await fetch("/api/ai/suggest-priority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: watchTitle, due_date: watchDueDate, category: watchCategory }),
      });
      const data = await res.json();
      if (data.priority) {
        setValue("priority", data.priority as Priority);
        setPriorityReason(data.reason ?? null);
        toast.success(`Priority set to ${data.priority}`);
      }
    } catch {
      toast.error("AI unavailable");
    } finally {
      setAiAction(null);
    }
  };

  const aiWriteDescription = async () => {
    if (!watchTitle?.trim()) { toast.error("Enter a task title first"); return; }
    setAiAction("description");
    try {
      const res = await fetch("/api/ai/write-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: watchTitle, category: watchCategory, priority: watchPriority }),
      });
      const data = await res.json();
      if (data.description) {
        setValue("description", data.description);
        toast.success("Description written");
      }
    } catch {
      toast.error("AI unavailable");
    } finally {
      setAiAction(null);
    }
  };

  const aiSuggestDeadline = async () => {
    if (!watchTitle?.trim()) { toast.error("Enter a task title first"); return; }
    setAiAction("deadline");
    setDeadlineReason(null);
    try {
      const res = await fetch("/api/ai/suggest-deadline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: watchTitle, priority: watchPriority, category: watchCategory }),
      });
      const data = await res.json();
      if (data.suggested_date) {
        setValue("due_date", data.suggested_date);
        setDeadlineReason(data.reason ?? null);
        toast.success("Deadline suggested");
      }
    } catch {
      toast.error("AI unavailable");
    } finally {
      setAiAction(null);
    }
  };

  const isAiLoading = aiAction !== null;

  const AIButton = ({ action, onClick, icon, label }: {
    action: AIAction; onClick: () => void;
    icon: React.ReactNode; label: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={isAiLoading}
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all duration-150",
        aiAction === action
          ? "bg-brand-light border-brand/30 text-brand"
          : "border-border text-text-secondary hover:border-brand/40 hover:text-brand",
        isAiLoading && aiAction !== action && "opacity-40 cursor-not-allowed"
      )}
    >
      {aiAction === action ? (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : icon}
      {label}
    </button>
  );

  const StarIcon = (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L13.09 8.26L19 7L15.45 11.82L20 16L13.64 15.23L12 21L10.36 15.23L4 16L8.55 11.82L5 7L10.91 8.26L12 2Z" />
    </svg>
  );

  return (
    <>
    <Modal open={open} onClose={handleClose} title="Create Task" description="Add a new task to your workspace" size="lg">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-zinc-700">Task title</span>
            <button
              type="button"
              onClick={() => setTemplatePickerOpen(true)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-violet-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              Use template
            </button>
          </div>
          <Input
            placeholder="What needs to be done?"
            error={errors.title?.message}
            {...register("title", { onBlur: handleTitleBlur })}
          />

          {duplicate && (
            <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span>Similar task exists: <strong>"{duplicate.title}"</strong> — {duplicate.similarity}</span>
              <button onClick={() => setDuplicate(null)} className="ml-auto opacity-60 hover:opacity-100">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 mr-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L13.09 8.26L19 7L15.45 11.82L20 16L13.64 15.23L12 21L10.36 15.23L4 16L8.55 11.82L5 7L10.91 8.26L12 2Z" />
              </svg>
              <span className="text-[11px] font-semibold text-brand">AI</span>
            </div>
            <AIButton action="description" onClick={aiWriteDescription} icon={StarIcon} label="Write description" />
            <AIButton action="subtasks" onClick={aiGenSubtasks} icon={StarIcon} label="Generate subtasks" />
            <AIButton action="priority" onClick={aiSuggestPriority} icon={StarIcon} label="Suggest priority" />
            <AIButton action="deadline" onClick={aiSuggestDeadline} icon={StarIcon} label="Suggest deadline" />
            <button
              type="button"
              onClick={aiEstimateEffort}
              disabled={loadingEffort || !watchTitle}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium text-brand bg-brand/5 hover:bg-brand/10 disabled:opacity-40 transition-colors"
            >
              {loadingEffort ? (
                <span className="w-2.5 h-2.5 border border-brand border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              Estimate effort
            </button>
          </div>

          {effort && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 border border-violet-100 rounded-xl text-xs text-violet-700">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span><strong>{effort.hours}h</strong> estimated ({effort.confidence} confidence) — {effort.note}</span>
              <button onClick={() => setEffort(null)} className="ml-auto opacity-50 hover:opacity-100">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Description <span className="text-text-secondary font-normal">(optional)</span>
          </label>
          <textarea
            {...register("description")}
            rows={2}
            placeholder="Add more context..."
            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Priority</label>
            <div className="flex gap-1.5">
              {(["high", "medium", "low"] as Priority[]).map((p) => {
                const config = PRIORITY_CONFIG[p];
                return (
                  <button key={p} type="button" onClick={() => { setValue("priority", p); setPriorityReason(null); }}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-medium border transition-all duration-150",
                      watchPriority === p ? "border-transparent shadow-sm" : "border-border text-text-secondary hover:border-gray-300"
                    )}
                    style={watchPriority === p ? { backgroundColor: config.bg, color: config.color, borderColor: config.color } : {}}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
            {priorityReason && (
              <p className="text-[11px] text-text-secondary mt-1.5 flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                {priorityReason}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Category</label>
            <select {...register("category")}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand bg-white">
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{(config as any).label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input label="Due date" type="date" {...register("due_date")} />
            {deadlineReason && (
              <p className="text-[11px] text-text-secondary mt-1.5 flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                {deadlineReason}
              </p>
            )}
          </div>
          <Input label="Due time" type="time" {...register("due_time")} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-text-primary">
              Assign to <span className="text-text-secondary font-normal">(optional)</span>
            </label>
            {members.length > 0 && (
              <button
                type="button"
                onClick={aiSmartAssign}
                disabled={loadingAssign || !watchTitle}
                className="flex items-center gap-1 text-[11px] text-brand font-medium hover:text-brand/80 disabled:opacity-40"
              >
                {loadingAssign ? (
                  <span className="w-2.5 h-2.5 border border-brand border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                )}
                AI suggest
              </button>
            )}
          </div>
          <select {...register("assigned_to")}
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand bg-white">
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.profile.full_name ?? m.profile.email}</option>
            ))}
          </select>
          {assignSuggestion && (
            <div className="mt-1.5 flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-100 rounded-xl">
              <svg className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-violet-700">Suggested: {assignSuggestion.name}</span>
                <p className="text-xs text-violet-500 truncate">{assignSuggestion.reason}</p>
              </div>
              <button
                type="button"
                onClick={() => { setValue("assigned_to", assignSuggestion.assignee_id); setAssignSuggestion(null); }}
                className="text-xs font-semibold text-violet-600 hover:text-violet-800 px-2 py-0.5 rounded-lg bg-white border border-violet-200"
              >
                Accept
              </button>
              <button type="button" onClick={() => setAssignSuggestion(null)} className="opacity-40 hover:opacity-100">
                <svg className="w-3 h-3 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <Input label="Tags" placeholder="design, review, launch (comma separated)" hint="Separate tags with commas" {...register("tags")} />

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Subtasks <span className="text-text-secondary font-normal">({subtasks.length})</span>
          </label>
          <div className="space-y-2">
            {subtasks.map((st, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <div className="w-3 h-3 rounded border border-border flex-shrink-0" />
                <span className="flex-1 text-sm text-text-primary">{st}</span>
                <button type="button" onClick={() => removeSubtask(i)} className="text-text-secondary hover:text-danger transition-colors">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input type="text" value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                placeholder="Add a subtask..."
                className="flex-1 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addSubtask}>Add</Button>
            </div>
          </div>
        </div>

        {tasks.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Depends on <span className="text-text-secondary font-normal">(optional)</span>
            </label>
            <select { ...register("depends_on")}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand bg-white">
              <option value="">No dependency</option>
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium text-text-primary">Recurring task</p>
            <p className="text-xs text-text-secondary">Automatically re-create this task</p>
          </div>
          <button type="button" onClick={() => setValue("is_recurring", !watchRecurring)}
            className={cn("w-10 h-6 rounded-full transition-all duration-200 relative", watchRecurring ? "bg-brand" : "bg-gray-200")}>
            <span className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200", watchRecurring ? "left-5" : "left-0.5")} />
          </button>
        </div>

        {watchRecurring && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Repeat</label>
            <select {...register("recurrence_pattern")}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand bg-white">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" fullWidth onClick={handleClose}>Cancel</Button>
          <Button type="submit" fullWidth loading={loading}>Create Task</Button>
        </div>
      </form>
    </Modal>
    {workspaceId && (
      <TemplatePickerModal
        onClose={() => setTemplatePickerOpen(false)}
        workspaceId={workspaceId}
        onApply={applyTemplate}
      />
    )}
  </>
  );
}