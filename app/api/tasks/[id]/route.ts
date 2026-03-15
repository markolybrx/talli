import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const ALLOWED_FIELDS = [
  "title","description","status","priority","category",
  "due_date","assigned_to","tags","is_pinned","is_recurring",
  "recurrence_pattern","depends_on","column_order","sprint_id"
];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id } = await params;
  const safeBody = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED_FIELDS.includes(k)));
  const { data: task, error } = await supabaseAdmin.from("tasks")
    .update({ ...safeBody, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabaseAdmin.from("activity_logs").insert({
    workspace_id: task.workspace_id, user_id: session.user.id, action: "updated",
    entity_type: "task", entity_id: id, metadata: { updated_fields: Object.keys(safeBody) },
  }).then(() => {}).catch(() => {});
  return NextResponse.json({ task });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { data: task } = await supabaseAdmin.from("tasks").select("workspace_id").eq("id", id).single();
  const { error } = await supabaseAdmin.from("tasks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (task) await supabaseAdmin.from("activity_logs").insert({
    workspace_id: task.workspace_id, user_id: session.user.id, action: "deleted",
    entity_type: "task", entity_id: id,
  }).then(() => {}).catch(() => {});
  return NextResponse.json({ success: true });
}
