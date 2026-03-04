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

    const { code } = await req.json();
    const { data: workspace, error } = await admin.from("workspaces").select("*").eq("code", code).single();

    if (error || !workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    const { error: memberError } = await admin.from("workspace_members").insert({
      workspace_id: workspace.id,
      user_id: session.user.id,
      role: "member",
    });

    if (memberError) {
      if (memberError.code === "23505") return NextResponse.json({ error: "Already a member" }, { status: 400 });
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    return NextResponse.json({ workspace });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
