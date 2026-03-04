import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { isWithin12Hours } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();
    const { workspaceId, input } = body;

    const nullIfEmpty = (v: any) => (v === "" || v === undefined ? null : v);

    let status = "pending";
    if (input.priority === "high" || (input.due_date && isWithin12Hours(input.due_date))) {
      status = "urgent";
    }

    const { data: task, error } = await admin
      .from("tasks")
      .insert({
        workspace_id: workspaceId,
        title: input.title,
        description: nullIfEmpty(input.description),
        priority: input.priority,
        category: input.category,
        status,
        due_date: nullIfEmpty(input.due_date),
        assigned_to: nullIfEmpty(input.assigned_to),
        tags: input.tags ?? [],
        is_recurring: input.is_recurring ?? false,
        recurrence_pattern: nullIfEmpty(input.recurrence_pattern),
        depends_on: nullIfEmpty(input.depends_on),
        created_by: session.user.id,
        column_order: 0,
      })
      .select()
      .single();

    if (error || !task) return NextResponse.json({ error: error?.message ?? "Failed to create task" }, { status: 500 });

    if (input.subtasks?.length > 0) {
      await admin.from("subtasks").insert(
        input.subtasks.map((st: { title: string }, i: number) => ({ task_id: task.id, title: st.title, order: i }))
      );
    }

    await admin.from("activity_logs").insert({
      workspace_id: workspaceId,
      task_id: task.id,
      user_id: session.user.id,
      action: "task_created",
      metadata: { title: task.title },
    })

    return NextResponse.json({ task });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

    const { data, error } = await admin
      .from("tasks")
      .select("*, subtasks(*)")
      .eq("workspace_id", workspaceId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ tasks: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
