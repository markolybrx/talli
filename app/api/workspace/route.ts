import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

function makeAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = makeAdmin();

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
    const admin = makeAdmin();

    // Upsert profile so it always exists
    await admin.from("profiles").upsert({
      id: session.user.id,
      email: session.user.email,
      full_name: session.user.name,
      avatar_url: session.user.image,
    }, { onConflict: "id" });

    // Try direct user_id lookup
    let { data: membership } = await admin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", session.user.id)
      .limit(1)
      .single();

    // Fallback: find other profiles with same email and migrate their membership
    if (!membership && session.user.email) {
      const { data: allProfiles } = await admin
        .from("profiles")
        .select("id")
        .eq("email", session.user.email);

      const otherIds = (allProfiles ?? [])
        .map((p: any) => p.id)
        .filter((id: string) => id !== session!.user!.id);

      for (const altId of otherIds) {
        const { data: altMembership } = await admin
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", altId)
          .limit(1)
          .single();

        if (altMembership) {
          await admin.from("workspace_members").upsert({
            workspace_id: altMembership.workspace_id,
            user_id: session.user.id,
            role: "admin",
          }, { onConflict: "workspace_id,user_id" });
          membership = altMembership;
          break;
        }
      }
    }

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
