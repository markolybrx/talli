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

export function CreateTaskModal({
  open,
  onClose,
  onSubmit,
  members,
  tasks,
}: CreateTaskModalProps) {
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      priority: "medium",
      category: "others",
      is_recurring: false,
    },
  });

  const watchPriority = watch("priority");
  const watchCategory = watch("category");
  const watchRecurring = watch("is_recurring");
  const watchTitle = watch("title");

  const handleClose = () => {
    reset();
    setSubtasks([]);
    setSubtaskInput("");
    onClose();
  };

  const handleFormSubmit = async (data: TaskFormData) => {
    setLoading(true);
    toast.success("Submitting...");
    try {
      const due_date =
        data.due_date && data.due_time
          ? `${data.due_date}T${data.due_time}`
          : data.due_date
          ? `${data.due_date}T23:59`
          : undefined;

      const tags = data.tags
        ? data.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

      await onSubmit({
        ...data,
        due_date,
        subtasks: subtasks.map((t) => ({ title: t })),
        tags: tags as any,
      });
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

  const removeSubtask = (index: number) => {
    setSubtasks((prev) => prev.filter((_, i) => i !== index));
  };

  // AI: Generate subtasks from title
  const generateSubtasks = async () => {
    if (!watchTitle?.trim()) {
      toast.error("Enter a task title first");
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `For the task "${watchTitle}", generate 3-5 specific, actionable subtasks. Return ONLY a JSON array of strings, no explanation, no markdown, no backticks. Example: ["Subtask 1","Subtask 2","Subtask 3"]`,
              }],
            }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
          }),
        }
      );
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      if (Array.isArray(parsed)) {
        setSubtasks(parsed.slice(0, 5));
        toast.success("Subtasks generated!");
      }
    } catch {
      toast.error("Failed to generate subtasks");
    } finally {
      setAiLoading(false);
    }
  };

  // AI: Suggest priority
  const suggestPriority = async () => {
    if (!watchTitle?.trim()) {
      toast.error("Enter a task title first");
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Based on the task title "${watchTitle}", suggest a priority level. Return ONLY one word: "high", "medium", or "low". No explanation.`,
              }],
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 10 },
          }),
        }
      );
      const data = await res.json();
      const priority = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase();
      if (["high", "medium", "low"].includes(priority)) {
        setValue("priority", priority as Priority);
        toast.success(`Priority set to ${priority}`);
      }
    } catch {
      toast.error("Failed to suggest priority");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Task"
      description="Add a new task to your workspace"
      size="lg"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">

        {/* Title + AI buttons */}
        <div className="space-y-2">
          <Input
            label="Task title"
            placeholder="What needs to be done?"
            error={errors.title?.message}
            {...register("title")}
          />
          {/* AI assist row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-secondary">AI assist:</span>
            <button
              type="button"
              onClick={generateSubtasks}
              disabled={aiLoading}
              className="flex items-center gap-1 text-xs text-brand hover:text-brand-hover font-medium transition-colors disabled:opacity-50"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L13.09 8.26L19 7L15.45 11.82L20 16L13.64 15.23L12 21L10.36 15.23L4 16L8.55 11.82L5 7L10.91 8.26L12 2Z" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Generate subtasks
            </button>
            <span className="text-gray-300">·</span>
            <button
              type="button"
              onClick={suggestPriority}
              disabled={aiLoading}
              className="flex items-center gap-1 text-xs text-brand hover:text-brand-hover font-medium transition-colors disabled:opacity-50"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L13.09 8.26L19 7L15.45 11.82L20 16L13.64 15.23L12 21L10.36 15.23L4 16L8.55 11.82L5 7L10.91 8.26L12 2Z" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Suggest priority
            </button>
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
                  <button
                    key={p}
                    type="button"
                    onClick={() => setValue("priority", p)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-medium border transition-all duration-150",
                      watchPriority === p
                        ? "border-transparent shadow-sm"
                        : "border-border text-text-secondary hover:border-gray-300"
                    )}
                    style={
                      watchPriority === p
                        ? { backgroundColor: config.bg, color: config.color, borderColor: config.color }
                        : {}
                    }
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Category</label>
            <select
              {...register("category")}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand bg-white"
            >
              {(Object.entries(CATEGORY_CONFIG) as [TaskCategory, typeof CATEGORY_CONFIG[TaskCategory]][]).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Due date + time */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Due date"
            type="date"
            {...register("due_date")}
          />
          <Input
            label="Due time"
            type="time"
            {...register("due_time")}
          />
        </div>

        {/* Assign to */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Assign to <span className="text-text-secondary font-normal">(optional)</span>
          </label>
          <select
            {...register("assigned_to")}
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand bg-white"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.profile.full_name ?? m.profile.email}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <Input
          label="Tags"
          placeholder="design, urgent, review (comma separated)"
          hint="Separate tags with commas"
          {...register("tags")}
        />

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
                <button
                  type="button"
                  onClick={() => removeSubtask(i)}
                  className="text-text-secondary hover:text-danger transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                placeholder="Add a subtask..."
                className="flex-1 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addSubtask}>
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Recurring */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium text-text-primary">Recurring task</p>
            <p className="text-xs text-text-secondary">Automatically re-create this task</p>
          </div>
          <button
            type="button"
            onClick={() => setValue("is_recurring", !watchRecurring)}
            className={cn(
              "w-10 h-6 rounded-full transition-all duration-200 relative",
              watchRecurring ? "bg-brand" : "bg-gray-200"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200",
                watchRecurring ? "left-5" : "left-0.5"
              )}
            />
          </button>
        </div>

        {watchRecurring && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Repeat</label>
            <select
              {...register("recurrence_pattern")}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand bg-white"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" fullWidth onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={loading}>
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
