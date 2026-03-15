import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function assertAdmin(userId: string, workspaceId: string) {
  const { data } = await supabaseAdmin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();
  if (data?.role !== "admin") throw new Error("Forbidden");
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId, userId, role } = await req.json();
  if (!workspaceId || !userId || !role) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (!["admin", "member"].includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  try {
    await assertAdmin(session.user.id, workspaceId);
    if (userId === session.user.id) return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
    const { error } = await supabaseAdmin
      .from("workspace_members")
      .update({ role })
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId, userId } = await req.json();
  if (!workspaceId || !userId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  try {
    await assertAdmin(session.user.id, workspaceId);
    if (userId === session.user.id) return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    const { error } = await supabaseAdmin
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
}
