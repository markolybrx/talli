import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Ensure profile exists first
    await admin.from("profiles").upsert({
      id: session.user.id,
      email: session.user.email,
      full_name: session.user.name,
      avatar_url: session.user.image,
    }, { onConflict: "id" });

    const { name, code } = await req.json();

    const { data: workspace, error } = await admin
      .from("workspaces")
      .insert({ name, code, created_by: session.user.id })
      .select()
      .single();

    if (error || !workspace) {
      return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
    }

    await admin.from("workspace_members").insert({
      workspace_id: workspace.id,
      user_id: session.user.id,
      role: "admin",
    });

    return NextResponse.json({ workspace });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Unknown error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: membership } = await admin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", session.user.id)
      .limit(1)
      .single();

    if (!membership) return NextResponse.json({ workspace: null, members: [] });

    const { data: workspace } = await admin
      .from("workspaces")
      .select("*")
      .eq("id", membership.workspace_id)
      .single();

    const { data: members } = await admin
      .from("workspace_members")
      .select("*, profile:profiles(*)")
      .eq("workspace_id", membership.workspace_id);

    return NextResponse.json({ workspace: workspace ?? null, members: members ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
