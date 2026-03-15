import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  const { data: tasksRaw } = await supabaseAdmin
    .from("tasks")
    .select("id, status, priority, category, created_at, updated_at, assigned_to, due_date")
    .eq("workspace_id", workspaceId);

  const { data: membersRaw } = await supabaseAdmin
    .from("workspace_members")
    .select("user_id, profile:user_id(full_name, email, avatar_url)")
    .eq("workspace_id", workspaceId);

  const t: any[] = tasksRaw ?? [];
  const members: any[] = membersRaw ?? [];

  const { data: timeLogsRaw } = await supabaseAdmin
    .from("time_logs")
    .select("user_id, duration_minutes, started_at")
    .in("task_id", t.map((x: any) => x.id));

  const timeLogs: any[] = timeLogsRaw ?? [];

  const now = new Date();

  // ── Last 7 days activity ─────────────────────────────────
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split("T")[0];
    return {
      date: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      shortDate: d.toLocaleDateString("en-US", { weekday: "short" }),
      created: t.filter((x: any) => x.created_at?.startsWith(key)).length,
      completed: t.filter((x: any) => x.status === "completed" && x.updated_at?.startsWith(key)).length,
    };
  });

  // ── Category breakdown ───────────────────────────────────
  const categoryCount: Record<string, { total: number; completed: number }> = {};
  t.forEach((task: any) => {
    if (!categoryCount[task.category]) categoryCount[task.category] = { total: 0, completed: 0 };
    categoryCount[task.category].total++;
    if (task.status === "completed") categoryCount[task.category].completed++;
  });

  // ── Priority breakdown ───────────────────────────────────
  const priorityCount = {
    high: t.filter((x: any) => x.priority === "high").length,
    medium: t.filter((x: any) => x.priority === "medium").length,
    low: t.filter((x: any) => x.priority === "low").length,
  };

  // ── Member workload ──────────────────────────────────────
  const memberStats = members.map((m: any) => {
    const assigned = t.filter((x: any) => x.assigned_to === m.user_id);
    const timeLogged = timeLogs
      .filter((l: any) => l.user_id === m.user_id)
      .reduce((sum: number, l: any) => sum + l.duration_minutes, 0);
    return {
      user_id: m.user_id,
      name: m.profile?.full_name ?? m.profile?.email ?? "Unknown",
      avatar_url: m.profile?.avatar_url ?? null,
      total: assigned.length,
      completed: assigned.filter((x: any) => x.status === "completed").length,
      urgent: assigned.filter((x: any) => x.status === "urgent").length,
      timeLogged,
    };
  });

  // ── Summary ──────────────────────────────────────────────
  const completed = t.filter((x: any) => x.status === "completed").length;
  const summary = {
    total: t.length,
    completed,
    urgent: t.filter((x: any) => x.status === "urgent").length,
    pending: t.filter((x: any) => x.status === "pending").length,
    overdue: t.filter((x: any) => x.due_date && new Date(x.due_date) < now && x.status !== "completed").length,
    completionRate: t.length > 0 ? Math.round((completed / t.length) * 100) : 0,
    totalTimeLogged: timeLogs.reduce((sum: number, l: any) => sum + l.duration_minutes, 0),
  };

  return NextResponse.json({ summary, last7, categoryCount, priorityCount, memberStats });
}
