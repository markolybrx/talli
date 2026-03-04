import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id } = params;

  const { data: task, error } = await supabaseAdmin
    .from("tasks")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity
  await supabaseAdmin.from("activity_logs").insert({
    workspace_id: task.workspace_id,
    task_id: id,
    user_id: session.user.id,
    action: "task_updated",
    metadata: body,
  });

  // If task completed, notify watchers
  if (body.status === "completed") {
    const { data: watchers } = await supabaseAdmin
      .from("task_watchers")
      .select("user_id")
      .eq("task_id", id);

    if (watchers && watchers.length > 0) {
      await supabaseAdmin.from("notifications").insert(
        watchers.map((w: any) => ({
          user_id: w.user_id,
          title: "Task completed",
          message: `"${task.title}" has been marked as completed.`,
          type: "task_completed",
          task_id: id,
        }))
      );
    }
  }

  return NextResponse.json({ task });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  // Get task before deleting for activity log
  const { data: task } = await supabaseAdmin
    .from("tasks")
    .select("workspace_id, title")
    .eq("id", id)
    .single();

  const { error } = await supabaseAdmin.from("tasks").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (task) {
    await supabaseAdmin.from("activity_logs").insert({
      workspace_id: task.workspace_id,
      task_id: null,
      user_id: session.user.id,
      action: "task_deleted",
      metadata: { title: task.title },
    });
  }

  return NextResponse.json({ success: true });
}
