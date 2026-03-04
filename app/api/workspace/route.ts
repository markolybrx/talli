import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, code } = await req.json();

  const { data: workspace, error } = await supabaseAdmin
    .from("workspaces")
    .insert({ name, code, created_by: session.user.id })
    .select()
    .single();

  if (error || !workspace) return NextResponse.json({ error: error?.message }, { status: 500 });

  await supabaseAdmin.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: session.user.id,
    role: "admin",
  });

  return NextResponse.json({ workspace });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: membership } = await supabaseAdmin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", session.user.id)
    .limit(1)
    .single();

  if (!membership) return NextResponse.json({ workspace: null });

  const { data: workspace } = await supabaseAdmin
    .from("workspaces")
    .select("*")
    .eq("id", membership.workspace_id)
    .single();

  return NextResponse.json({ workspace });
}
