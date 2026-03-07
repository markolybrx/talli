import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  const { data: tasks } = await supabaseAdmin
    .from("tasks")
    .select("id, title, description, status, priority, category, due_date, created_at, assigned_to, tags")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const { data: members } = await supabaseAdmin
    .from("workspace_members")
    .select("user_id, profile:user_id(full_name, email)")
    .eq("workspace_id", workspaceId);

  const { data: timeLogs } = await supabaseAdmin
    .from("time_logs")
    .select("task_id, duration_minutes")
    .in("task_id", (tasks ?? []).map((t: any) => t.id));

  const memberMap: Record<string, string> = {};
  (members ?? []).forEach((m: any) => {
    memberMap[m.user_id] = m.profile?.full_name ?? m.profile?.email ?? "Unknown";
  });

  const timeMap: Record<string, number> = {};
  (timeLogs ?? []).forEach((l: any) => {
    timeMap[l.task_id] = (timeMap[l.task_id] ?? 0) + l.duration_minutes;
  });

  const escape = (v: any) => {
    if (v == null) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const headers = ["Title", "Status", "Priority", "Category", "Assigned To", "Due Date", "Time Logged (min)", "Tags", "Description", "Created At"];

  const rows = (tasks ?? []).map((t: any) => [
    escape(t.title),
    escape(t.status),
    escape(t.priority),
    escape(t.category?.replace(/_/g, " ")),
    escape(memberMap[t.assigned_to] ?? ""),
    escape(t.due_date ? t.due_date.split("T")[0] : ""),
    escape(timeMap[t.id] ?? 0),
    escape((t.tags ?? []).join("; ")),
    escape(t.description ?? ""),
    escape(t.created_at ? t.created_at.split("T")[0] : ""),
  ].join(","));

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="talli-tasks-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
