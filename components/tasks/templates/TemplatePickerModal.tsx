"use client";
import { useState, useEffect } from "react";
import { X, LayoutTemplate, Trash2 } from "lucide-react";

interface Template {
  id: string;
  name: string;
  template: {
    title?: string;
    description?: string;
    priority?: string;
    category?: string;
    subtasks?: { title: string; completed: boolean }[];
  };
  use_count: number;
}

const BUILTINS: Template[] = [
  {
    id: "_job_post",
    name: "Job Post Draft",
    template: {
      title: "Draft Job Post: ",
      description: "Write a compelling job description including: role summary, responsibilities, requirements, and compensation range.",
      priority: "medium",
      category: "recruitment_marketing",
      subtasks: [
        { title: "Define role requirements", completed: false },
        { title: "Write job description", completed: false },
        { title: "Get approval from hiring manager", completed: false },
        { title: "Post on job boards", completed: false },
      ],
    },
    use_count: 0,
  },
  {
    id: "_candidate_screen",
    name: "Candidate Screening",
    template: {
      title: "Screen Candidate: ",
      description: "Conduct initial screening call and assess fit.",
      priority: "high",
      category: "recruitment_sourcing",
      subtasks:
        [
          { title: "Review CV", completed: false },
          { title: "Schedule screening call", completed: false },
          { title: "Conduct call and take notes", completed: false },
          { title: "Send feedback to team", completed: false },
        ],
    },
    use_count: 0,
  },
  {
    id: "_agent_onboard",
    name: "Agent Onboarding",
    template: {
      title: "Onboard Agent: ",
      description: "Complete all onboarding steps for new agent.",
      priority: "urgent",
      category: "recruitment_agent_hiring",
      subtasks:
        [
          { title: "Send contract", completed: false },
          { title: "Collect ID and documents", completed: false },
          { title: "Set up access and tools", completed: false },
          { title: "Complete orientation", completed: false },
        ],
    },
    use_count: 0,
  },
  {
    id: "_weekly_pipeline",
    name: "Weekly Pipeline Review",
    template: {
      title: "WeeKe� Pipeline Review",
      description: "Review all active candidate pipelines and update statuses.",
      priority: "medium",
      category: "recruitment_sourcing",
      subtasks:
        [
          { title: "Review pending applications", completed: false },
          { title: "Update candidate statuses", completed: false },
          { title: "Follow up on pending offers", completed: false },
          { title: "Prepare weekly report", completed: false },
        ],
    },
    use_count: 0,
  },
];

interface TemplatePickerModalProps {
  workspaceId: string;
  onApply: (template: Template["template"]) => void;
  onClose: () => void;
}

export function TemplatePickerModal({ workspaceId, onApply, onClose }: TemplatePickerModalProps) {
  const [custom, setCustom] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/templates?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setCustom(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleDelete = async (id: string) => {
    await fetch("/api/templates", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setCustom((prev) => prev.filter((t) => t.id !== id));
  };

  const all = [...BUILTINS, ...custom];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-violet-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Pick a Template</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {all.map((t) => (
              <div key={t.id} className="relative border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-violet-400 transition-colors group cursor-pointer" onClick={() => onApply(t.template)}>
                <div className="flex items-start justify-between">
                  <p className="font-medium text-sm text-gray-900 dark:text-white">{t.name}</p>
                  {!t.id.startsWith("_") && (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {t.template.subtasks?.length && (
                  <p className="text-xs text-gray-400 mt-1">{t.template.subtasks!.length} subtasks</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
