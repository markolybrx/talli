"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useTasks } from "@/hooks/useTasks";
import { cn, CATEGORY_CONFIG, PRIORITY_CONFIG, formatDate } from "@/lib/utils";
import type { Task } from "@/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function CalendarPage() {
  const { workspace } = useWorkspace();
  const { tasks } = useTasks(workspace?.id ?? null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => { setCurrentDate(new Date()); setSelectedDate(new Date()); };

  const getTasksForDate = (day: number, m: number, y: number): Task[] => {
    return tasks.filter((t) => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date);
      return d.getDate() === day && d.getMonth() === m && d.getFullYear() === y;
    });
  };

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const isSelected = (day: number) =>
    selectedDate ? day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear() : false;

  // Build calendar grid
  const cells: { day: number; currentMonth: boolean; month: number; year: number }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    const prevM = month === 0 ? 11 : month - 1;
    const prevY = month === 0 ? year - 1 : year;
    cells.push({ day: daysInPrevMonth - i, currentMonth: false, month: prevM, year: prevY });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ day: i, currentMonth: true, month, year });
  }
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    const nextM = month === 11 ? 0 : month + 1;
    const nextY = month === 11 ? year + 1 : year;
    cells.push({ day: i, currentMonth: false, month: nextM, year: nextY });
  }

  const selectedTasks = selectedDate
    ? getTasksForDate(selectedDate.getDate(), selectedDate.getMonth(), selectedDate.getFullYear())
    : [];

  return (
    <>
      <Topbar title="Calendar" />
      <div className="flex-1 p-4 lg:p-6 space-y-4">
        {/* Calendar header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-text-primary">{MONTHS[month]} {year}</h2>
            <button onClick={goToToday} className="text-xs font-medium text-brand bg-brand-light px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors">
              Today
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-xl border border-border hover:bg-gray-50 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-xl border border-border hover:bg-gray-50 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex gap-5 flex-col lg:flex-row">
          {/* Calendar grid */}
          <div className="flex-1 bg-surface border border-border rounded-2xl overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {DAYS.map((d) => (
                <div key={d} className="py-3 text-center text-xs font-semibold text-text-secondary">{d}</div>
              ))}
            </div>
            {/* Cells */}
            <div className="grid grid-cols-7">
              {cells.map((cell, i) => {
                const cellTasks = getTasksForDate(cell.day, cell.month, cell.year);
                const isTodayCell = isToday(cell.day) && cell.currentMonth;
                const isSelectedCell = isSelected(cell.day) && cell.currentMonth;
                return (
                  <div
                    key={i}
                    onClick={() => cell.currentMonth && setSelectedDate(new Date(cell.year, cell.month, cell.day))}
                    className={cn(
                      "min-h-[80px] p-2 border-b border-r border-border cursor-pointer transition-colors",
                      !cell.currentMonth ? "bg-gray-50/50" : "hover:bg-gray-50",
                      isSelectedCell && "bg-brand-light",
                      (i + 1) % 7 === 0 && "border-r-0"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                        !cell.currentMonth && "text-text-secondary opacity-40",
                        isTodayCell && "bg-brand text-white",
                        isSelectedCell && !isTodayCell && "text-brand font-semibold"
                      )}>
                        {cell.day}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {cellTasks.slice(0, 2).map((task) => (
                        <div
                          key={task.id}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded truncate"
                          style={{
                            backgroundColor: CATEGORY_CONFIG[task.category].bg,
                            color: CATEGORY_CONFIG[task.category].color,
                          }}
                        >
                          {task.title}
                        </div>
                      ))}
                      {cellTasks.length > 2 && (
                        <p className="text-[10px] text-text-secondary pl-1">+{cellTasks.length - 2} more</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected day tasks panel */}
          <div className="lg:w-72 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">
              {selectedDate
                ? formatDate(selectedDate)
                : "Select a day to view tasks"}
            </h3>
            {selectedDate && selectedTasks.length === 0 && (
              <div className="bg-surface border border-border rounded-2xl p-6 text-center">
                <p className="text-sm text-text-secondary">No tasks due this day</p>
              </div>
            )}
            {selectedTasks.map((task) => {
              const catConfig = CATEGORY_CONFIG[task.category];
              const priConfig = PRIORITY_CONFIG[task.priority];
              return (
                <div key={task.id} className="bg-surface border border-border rounded-2xl p-4 space-y-2"
                  style={{ borderLeft: `3px solid ${catConfig.color}` }}>
                  <p className="text-sm font-semibold text-text-primary">{task.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: priConfig.bg, color: priConfig.color }}>
                      {priConfig.label}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: catConfig.bg, color: catConfig.color }}>
                      {catConfig.label}
                    </span>
                  </div>
                  {task.due_date && (
                    <p className="text-xs text-text-secondary">
                      {new Date(task.due_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
