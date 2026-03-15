"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn, CATEGORY_CONFIG, PRIORITY_CONFIG } from "@/lib/utils";
import type { Priority, TaskCategory } from "@/types";
import toast from "react-hot-toast";

interface ExtractedTask {
  title: string;
  description: string;
  priority: Priority;
  assigned_to_name: string;
  due_date: string;
  category: TaskCategory;
  selected: boolean;
}

interface MeetingImporterProps {
  open: boolean;
  onClose: () => void;
  onImport: (tasks: Omit<ExtractedTask, "selected">[]) => Promise<void>;
  members: { id: string; profile: { full_name: string | null; email: string } }[];
}

export function MeetingImporter({ open, onClose, onImport, members }: MeetingImporterProps) {
  const [step, setStep] = useState<"input" | "review">("input");
  const [notes, setNotes] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedTask[]>([]);

  const handleClose = () => {
    setStep("input");
    setNotes("");
    setExtracted([]);
    onClose();
  };

  const parseNotes = async () => {
    if (!notes.trim()) { toast.error("Paste your meeting notes first"); return; }
    setParsing(true);
    try {
      const res = await fetch("/api/ai/meeting-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, members }),
      });
      const data = await res.json();
      if (!data.tasks?.length) {
        toast.error("No action items found in these notes");
        return;
      }
      setExtracted(data.tasks.map((t: any) => ({ ...t, selected: true })));
      setStep("review");
    } catch {
      toast.error("Failed to parse notes");
    } finally {
      setParsing(false);
    }
  };

  const toggleTask = (i: number) => {
    setExtracted((prev) => prev.map((t, idx) => idx === i ? { ...t, selected: !t.selected } : t));
  };

  const handleImport = async () => {
    const selected = extracted.filter((t) => t.selected);
    if (!selected.length) { toast.error("Select at least one task"); return; }
    setImporting(true);
    try {
      // Resolve assigned_to_name to user id
      const resolved = selected.map((t) => {
        const match = members.find((m) =>
          m.profile.full_name?.toLowerCase().includes(t.assigned_to_name?.toLowerCase()) ||
          m.profile.email?.toLowerCase().includes(t.assigned_to_name?.toLowerCase())
        );
        return { ...t, assigned_to: match?.id ?? undefined };
      });
      await onImport(resolved);
      toast.success(`${selected.length} task${selected.length > 1 ? "s" : ""} created`);
      handleClose();
    } catch {
      toast.error("Failed to create tasks");
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = extracted.filter((t) => t.selected).length;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Meeting → Tasks"
      description={step === "input" ? "Paste your meeting notes and AI will extract action items" : `${extracted.length} action items found — select which to create`}
      size="lg"
    >
      {step === "input" ? (
        <div className="space-y-4">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={10}
            placeholder={`Paste meeting notes, transcripts, or any text with action items...

Example:
"John will follow up with the client by Friday. Sarah needs to update the job posting for the marketing role. We agreed to review candidate shortlists next Monday. The onboarding checklist needs to be revised before the new hire starts."`}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-brand transition-all"
          />
          <div className="flex items-center gap-2 text-xs text-text-secondary bg-gray-50 rounded-xl px-3 py-2.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L13.09 8.26L19 7L15.45 11.82L20 16L13.64 15.23L12 21L10.36 15.23L4 16L8.55 11.82L5 7L10.91 8.26L12 2Z" />
            </svg>
            AI will identify tasks, owners, priorities and due dates automatically
          </div>
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={handleClose}>Cancel</Button>
            <Button fullWidth onClick={parseNotes} loading={parsing}>
              {parsing ? "Extracting..." : "Extract Action Items"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Select all */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">{selectedCount} of {extracted.length} selected</span>
            <button
              onClick={() => setExtracted((prev) => prev.map((t) => ({ ...t, selected: selectedCount < extracted.length })))}
              className="text-xs font-medium text-brand hover:text-brand-hover transition-colors"
            >
              {selectedCount < extracted.length ? "Select all" : "Deselect all"}
            </button>
          </div>

          {/* Task list */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {extracted.map((task, i) => {
              const priConfig = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
              const catConfig = CATEGORY_CONFIG[task.category] ?? CATEGORY_CONFIG.others;
              return (
                <div
                  key={i}
                  onClick={() => toggleTask(i)}
                  className={cn(
                    "border rounded-xl p-3 cursor-pointer transition-all duration-150 space-y-1.5",
                    task.selected ? "border-brand/40 bg-brand-light/40" : "border-border bg-surface hover:border-gray-300"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Checkbox */}
                    <div className={cn(
                      "w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors",
                      task.selected ? "bg-brand border-brand" : "border-border"
                    )}>
                      {task.selected && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: priConfig.bg, color: priConfig.color }}>
                          {priConfig.label}
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: catConfig.bg, color: catConfig.color }}>
                          {catConfig.label}
                        </span>
                        {task.assigned_to_name && (
                          <span className="text-[11px] text-text-secondary flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                            </svg>
                            {task.assigned_to_name}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="text-[11px] text-text-secondary flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            {task.due_date}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setStep("input")}>Back</Button>
            <Button fullWidth onClick={handleImport} loading={importing} disabled={selectedCount === 0}>
              Create {selectedCount} Task{selectedCount !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
