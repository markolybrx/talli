"use client";
import { useState, useEffect } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Plus, Target, Trash2, X } from "lucide-react";

interface KeyResult {
  id: string;
  title: string;
  progress: number;
  order: number;
}

interface Goal {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  progress: number;
  key_results: KeyResult[];
}

const STATUS_COLORS: Record<string, string> = {
  on_track: "text-green-600 bg-green-50 dark:bg-green-900/30",
  at_risk: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30",
  off_track: "text-red-600 bg-red-50 dark:bg-red-900/30",
  completed: "text-violet-600 bg-violet-50 dark:bg-violet-900/30",
};

function ProgressRing({ pct }: { pct: number }) {
  const r = 20, cx = 24, cy = 24;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct / 100);
  return (
    <svg width="48" height="48" className="rotate-90 origin-center">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="#7634d8"
        strokeWidth="4"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <text
        x={cx} y={cy}
        textAnchor="middle" dy="0.3em"
        fill="currentColor"
        className="text-xs fill-gray-700 dark:fill-gray-300"
        style={{ transform: "rotate(-90deg)", transformOrigin: "24px 24px" }}
      >
        {pct}%
      </text>
    </svg>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id;

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/goals?workspaceId=${workspaceId}`)
      .then((d) => d.json())
      .then((d) => setGoals(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, title, description: desc || null, dueDate: dueDate || null }),
      });
      const data = await res.json();
      setGoals((prev) => [data, ...prev]);
      setTitle(""); setDesc(""); setDueDate(""); setShowForm(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const statusCounts = goals.reduce((acc, g) => {
    acc[g.status] = (acc[g.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Target className="w6 h-6 text-violet-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Goals &amp; OKRs</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
          <Plus className="w4 h-4" /> New Goal
        </button>
      </div>

      {Object.keys(statusCounts).length > 0 && (
        <div className="flex gap-3 mb-6 flex-wrap">
          {Object.entries(statusCounts).map(([st, cnt]) => (
            <span key={st} className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[st] || ""}`}>
              {st.replace("_", " ")}: {cnt}
            </span>
          ))}
        </div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">New Goal</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Goal title" className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full text-sm dark:bg-gray-750 dark:text-white" />
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" rows={2} className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full text-sm dark:bg-gray-750 dark:text-white" />
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-750 dark:text-white" />
            <p className="text-xs text-gray-400">AI will generate 3 key results automatically.</p>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={saving || !title.trim()} className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">{saving ? "Creating..." : "Create Goal"}</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : goals.length === 0 ? (
        <div className="text-center py-16">
          <Target className="w8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No goals yet. Create your first goal!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g) => (
            <div key={g.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[g.status] || ""}`}>
                      {g.status.replace("_", " ")}
                    </span>
                    {g.due_date && <span className="text-xs text-gray-400">Due {new Date(g.due_date).toLocaleDateString()}</span>}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{g.title}</h3>
                  {g.description && <p className="text-sm text-gray-500 mt-1">{g.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <ProgressRing pct={g.progress} />
                  <button onClick={() => handleDelete(g.id)} className="text-gray-300 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {g.key_results?.length > 0 && (
                <div className="space-y-2">
                  {g.key_results.sort((a, b) => a.order - b.order).map((kr) => (
                    <div key={kr.id} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600 dark:text-gray-400">{kr.title}</span>
                        <span className="text-xs text-gray-400">{kr.progress}%</span>
                      </div>
                      <div className="h-1 bg-gray-200 rounded-full">
                        <div className="h-1 bg-violet-500 rounded-full" style={{ width: `${kr.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}