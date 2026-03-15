"use client";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { useWorkspace } from "@/hooks/useWorkspace";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  due_date: string | null;
}

type Zoom = "2wk" | "1mo" | "2mo";
const ZOOM_DAYS: Record<Zoom, number> = { "2wk": 14, "1mo": 30, "2mo": 60 };
const ZOOM_LABELS: Record<Zoom, string> = { "2wk": "2 Weeks", "1mo": "1 Month", "2mo": "2 Months" };
const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-500",
  urgent: "bg-red-500",
  pending: "bg-violet-500",
};

export default function TimelinePage() {
  const { workspace, loading: wsLoading } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [zoom, setZoom] = useState<Zoom>("1mo");
  const [offsetDays, setOffsetDays] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setContainerWidth(e.contentRect.width);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!workspace?.id) return;
    setLoading(true);
    fetch(`/api/tasks?workspaceId=${workspace.id}`)
      .then((r) => r.json())
      .then((d) => setTasks(Array.isArray(d) ? d : d.tasks ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspace?.id]);

  if (wsLoading) return <LoadingScreen />;

  const totalDays = ZOOM_DAYS[zoom];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + offsetDays);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + totalDays);

  const labelWidth = 160;
  const dw = (containerWidth - labelWidth) / totalDays;

  const days = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const todayOffset = ((new Date().getTime() - startDate.getTime()) / 86400000) * dw;

  const visibleTasks = tasks.filter((t) => {
    const start = new Date(t.created_at);
    const end = t.due_date ? new Date(t.due_date) : null;
    if (!end) return start >= startDate && start <= endDate;
    return start <= endDate && end >= startDate;
  });

  const barStyle = (t: Task) => {
    const start = new Date(t.created_at);
    const end = t.due_date ? new Date(t.due_date) : new Date(start.getTime() + 86400000);
    const left = Math.max(0, (start.getTime() - startDate.getTime()) / 86400000) * dw;
    const rawW = Math.max(dw, (end.getTime() - start.getTime()) / 86400000) * dw;
    const width = Math.min(rawW, containerWidth - labelWidth - left);
    return { left, width: Math.max(24, width) };
  };

  return (
    <>
      <Topbar title="Timeline" />
      <div className="flex-1 p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setOffsetDays((o) => o - totalDays)}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setOffsetDays(0)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm hover:bg-gray-50">
              Today
            </button>
            <button onClick={() => setOffsetDays((o) => o + totalDays)}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            {(Object.keys(ZOOM_DAYS) as Zoom[]).map((z) => (
              <button key={z} onClick={() => setZoom(z)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${zoom === z ? "bg-violet-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                {ZOOM_LABELS[z]}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden" ref={containerRef}>
          <div className="flex border-b border-gray-200">
            <div className="shrink-0 border-r border-gray-200 p-2 text-xs text-gray-400 font-medium" style={{ width: labelWidth }}>Task</div>
            <div className="flex flex-1 overflow-hidden">
              {days.map((d, i) => {
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const showLabel = totalDays <= 14 || i % 7 === 0;
                return (
                  <div key={i} style={{ width: dw, minWidth: dw }}
                    className={`border-l border-gray-200 py-2 text-center text-[10px] text-gray-400 truncate ${isWeekend ? "bg-gray-50" : ""}`}>
                    {showLabel ? d.toLocaleDateString([], { month: "short", day: "numeric" }) : ""}
                  </div>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="p-6 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : visibleTasks.length === 0 ? (
            <p className="p-6 text-sm text-gray-400 text-center">No tasks with due dates in this range.</p>
          ) : (
            visibleTasks.map((t) => {
              const { left, width } = barStyle(t);
              const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed";
              const barColor = isOverdue ? "bg-red-500" : STATUS_COLORS[t.status] ?? "bg-violet-500";
              return (
                <div key={t.id} className="flex border-t border-gray-200">
                  <div className="shrink-0 p-2 text-xs text-gray-700 truncate border-r border-gray-200" style={{ width: labelWidth }}>
                    {t.title}
                  </div>
                  <div className="relative flex-1 h-9">
                    {todayOffset >= 0 && todayOffset <= containerWidth - labelWidth && (
                      <div className="absolute top-0 bottom-0 w-px bg-violet-400 opacity-30" style={{ left: todayOffset }} />
                    )}
                    <div className={`absolute top-1.5 h-6 rounded-lg text-white text-[10px] flex items-center px-2 truncate ${barColor}`}
                      style={{ left, width }} title={t.title}>
                      {width > 48 ? t.title : ""}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-4 mt-3">
          {[{ color: "bg-violet-500", label: "Pending" }, { color: "bg-red-500", label: "Urgent / Overdue" }, { color: "bg-green-500", label: "Completed" }].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
              <span className="text-xs text-gray-400">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
