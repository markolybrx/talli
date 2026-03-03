"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn, CATEGORY_CONFIG, PRIORITY_CONFIG } from "@/lib/utils";
import type { Priority, TaskCategory } from "@/types";
import toast from "react-hot-toast";

interface ParsedTask {
  title: string;
  description?: string;
  priority: Priority;
  category: TaskCategory;
  due_date?: string;
  assigned_to_name?: string;
  tags: string[];
  subtasks: string[];
}

interface NLTaskCreatorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (task: ParsedTask & { assigned_to?: string }) => void;
  members: { id: string; profile: { full_name: string | null; email: string } }[];
}

export function NLTaskCreator({ open, onClose, onConfirm, members }: NLTaskCreatorProps) {
  const [input, setInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedTask | null>(null);
  const [assigneeId, setAssigneeId] = useState("");

  const handleParse = async () => {
    if (!input.trim()) return;
    setParsing(true);
    try {
      const membersStr = members.map((m) => m.profile.full_name ?? m.profile.email).join(", ");
      const prompt = `Parse this task description into structured data: "${input}"

Team members available: ${membersStr || "none"}

Return ONLY valid JSON (no markdown, no backticks) with this exact structure:
{
  "title": "concise task title",
  "description": "optional longer description or empty string",
  "priority": "high" | "medium" | "low",
  "category": "recruitment_marketing" | "recruitment_sourcing" | "recruitment_agent_hiring" | "others",
  "due_date": "YYYY-MM-DDTHH:mm or empty string",
  "assigned_to_name": "exact name from team members list or empty string",
  "tags": ["tag1", "tag2"],
  "subtasks": ["subtask1", "subtask2"]
}

Today's date: ${new Date().toISOString().split("T")[0]}
If no due date is mentioned, use empty string. Pick the most relevant category based on context.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
          }),
        }
      );
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      const result = JSON.parse(text.replace(/```json|```/g, "").trim());
      setParsed(result as ParsedTask);

      // Auto-match assignee
      if (result.assigned_to_name) {
        const match = members.find((m) =>
          (m.profile.full_name ?? "").toLowerCase().includes(result.assigned_to_name.toLowerCase())
        );
        if (match) setAssigneeId(match.id);
      }
    } catch {
      toast.error("Could not parse task. Try being more specific.");
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = () => {
    if (!parsed) return;
    onConfirm({ ...parsed, assigned_to: assigneeId || undefined });
    setParsed(null);
    setInput("");
    setAssigneeId("");
    onClose();
    toast.success("Task created from natural language!");
  };

  const handleClose = () => {
    setParsed(null);
    setInput("");
    setAssigneeId("");
    onClose();
  };

  const categoryConfig = parsed ? CATEGORY_CONFIG[parsed.category] : null;
  const priorityConfig = parsed ? PRIORITY_CONFIG[parsed.priority] : null;

  return (
    <Modal open={open} onClose={handleClose} title="Natural Language Task" description="Describe your task in plain English" size="md">
      <div className="space-y-5">
        {/* Input */}
        <div className="space-y-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !parsed) { e.preventDefault(); handleParse(); } }}
            rows={3}
            placeholder={`Try: "Remind the team to follow up with marketing applicants, high priority, due Friday at 5pm, assign to Sarah"`}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand resize-none"
            disabled={!!parsed}
          />
          {!parsed && (
            <Button fullWidth onClick={handleParse} loading={parsing} disabled={!input.trim()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L13.09 8.26L19 7L15.45 11.82L20 16L13.64 15.23L12 21L10.36 15.23L4 16L8.55 11.82L5 7L10.91 8.26L12 2Z"
                  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="white" fillOpacity="0.3"/>
              </svg>
              Parse with AI
            </Button>
          )}
        </div>

        {/* Parsed preview */}
        {parsed && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-success rounded-full" />
              <p className="text-xs font-semibold text-success">Task parsed — review and confirm</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <div>
                <p className="text-xs text-text-secondary mb-1">Title</p>
                <p className="text-sm font-semibold text-text-primary">{parsed.title}</p>
              </div>
              {parsed.description && (
                <div>
                  <p className="text-xs text-text-secondary mb-1">Description</p>
                  <p className="text-sm text-text-primary">{parsed.description}</p>
                </div>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Priority</p>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: priorityConfig?.bg, color: priorityConfig?.color }}>
                    {priorityConfig?.label}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Category</p>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: categoryConfig?.bg, color: categoryConfig?.color }}>
                    {categoryConfig?.label}
                  </span>
                </div>
                {parsed.due_date && (
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Due</p>
                    <p className="text-xs font-medium text-text-primary">{new Date(parsed.due_date).toLocaleString()}</p>
                  </div>
                )}
              </div>
              {parsed.subtasks.length > 0 && (
                <div>
                  <p className="text-xs text-text-secondary mb-1.5">Subtasks ({parsed.subtasks.length})</p>
                  <div className="space-y-1">
                    {parsed.subtasks.map((st, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded border border-border flex-shrink-0" />
                        <p className="text-xs text-text-primary">{st}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Assignee override */}
              <div>
                <p className="text-xs text-text-secondary mb-1.5">
                  Assign to {parsed.assigned_to_name ? `(AI suggested: ${parsed.assigned_to_name})` : ""}
                </p>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.profile.full_name ?? m.profile.email}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" fullWidth onClick={() => { setParsed(null); }}>
                Re-parse
              </Button>
              <Button fullWidth onClick={handleConfirm}>
                Create Task
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
