"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
}

type AIAction = "subtasks" | "priority" | "description" | "deadline" | null;

export function CreateTaskModal({ open, onClose, onSubmit, members, tasks }: CreateTaskModalProps) {
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiAction, setAiAction] = useState<AIAction>(null);
  const [priorityReason, setPriorityReason] = useState<string | null>(null);
  const [deadlineReason, setDeadlineReason] = useState<string | null>(null);

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
    onClose();
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

  const addSubtask = () => {
    const title = subtaskInput.trim();
    if (!title) return;
    setSubtasks((prev) => [...prev, title]);
    setSubtaskInput("");
  };

  const removeSubtask = (index: number) => setSubtasks((prev) => prev.filter((_, i) => i !== index));

  // ── AI Actions ──────────────────────────────────────────

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
    <Modal open={open} onClose={handleClose} title="Create Task" description="Add a new task to your workspace" size="lg">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">

        {/* Title */}
        <div className="space-y-2">
          <Input
            label="Task title"
            placeholder="What needs to be done?"
            error={errors.title?.message}
            {...register("title")}
          />

          {/* AI Assist strip */}
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
          </div>
        </div>

        {/* Description */}
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

        {/* Priority + Category */}
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
              {(Object.entries(CATEGORY_CONFIG) as [TaskCategory, typeof CATEGORY_CONFIG[TaskCategory]][]).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Due date + time */}
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

        {/* Assign to */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Assign to <span className="text-text-secondary font-normal">(optional)</span>
          </label>
          <select {...register("assigned_to")}
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand bg-white">
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.profile.full_name ?? m.profile.email}</option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <Input label="Tags" placeholder="design, review, launch (comma separated)" hint="Separate tags with commas" {...register("tags")} />

        {/* Subtasks */}
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

        {/* Dependency */}
        {tasks.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Depends on <span className="text-text-secondary font-normal">(optional)</span>
            </label>
            <select {...register("depends_on")}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand bg-white">
              <option value="">No dependency</option>
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
        )}

        {/* Recurring */}
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

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" fullWidth onClick={handleClose}>Cancel</Button>
          <Button type="submit" fullWidth loading={loading}>Create Task</Button>
        </div>
      </form>
    </Modal>
  );
}
