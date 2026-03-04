import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized - no session" }, { status: 401 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { name, code } = await req.json();

    const { data: workspace, error } = await admin
      .from("workspaces")
      .insert({ name, code, created_by: session.user.id })
      .select()
      .single();

    if (error || !workspace) {
      return NextResponse.json({ error: error?.message ?? "Insert failed", details: error }, { status: 500 });
    }

    const { error: memberError } = await admin.from("workspace_members").insert({
      workspace_id: workspace.id,
      user_id: session.user.id,
      role: "admin",
    });

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    return NextResponse.json({ workspace });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Unknown error" }, { status: 500 });
  }
}
