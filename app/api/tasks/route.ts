import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isWithin12Hours } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const { data: tasks, error } = await supabaseAdmin
    .from("tasks")
    .select("*, subtasks(*)")
    .eq("workspace_id", workspaceId)
    .order("is_pinned", { ascending: false })
    .order("column_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    workspace_id,
    title,
    description,
    priority,
    category,
    due_date,
    assigned_to,
    tags,
    is_recurring,
    recurrence_pattern,
    depends_on,
    subtasks,
  } = body;

  if (!workspace_id || !title) {
    return NextResponse.json(
      { error: "workspace_id and title are required" },
      { status: 400 }
    );
  }

  // Auto-determine initial column
  let status = "pending";
  if (priority === "high" || (due_date && isWithin12Hours(due_date))) {
    status = "urgent";
  }

  const { data: task, error: taskError } = await supabaseAdmin
    .from("tasks")
    .insert({
      workspace_id,
      title,
      description,
      priority: priority ?? "medium",
      category: category ?? "others",
      status,
      due_date,
      assigned_to,
      tags: tags ?? [],
      is_recurring: is_recurring ?? false,
      recurrence_pattern,
      depends_on,
      created_by: session.user.id,
    })
    .select()
    .single();

  if (taskError || !task) {
    return NextResponse.json({ error: taskError?.message }, { status: 500 });
  }

  // Create subtasks
  if (subtasks?.length > 0) {
    await supabaseAdmin.from("subtasks").insert(
      subtasks.map((st: { title: string }, i: number) => ({
        task_id: task.id,
        title: st.title,
        order: i,
      }))
    );
  }

  // Log activity
  await supabaseAdmin.from("activity_logs").insert({
    workspace_id,
    task_id: task.id,
    user_id: session.user.id,
    action: "task_created",
    metadata: { title },
  });

  // Notify assigned user
  if (assigned_to && assigned_to !== session.user.id) {
    await supabaseAdmin.from("notifications").insert({
      user_id: assigned_to,
      title: "New task assigned",
      message: `You've been assigned: "${title}"`,
      type: "task_assigned",
      task_id: task.id,
    });
  }

  return NextResponse.json({ task }, { status: 201 });
}
