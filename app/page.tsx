import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Check workspace server-side
  try {
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

    if (membership) {
      redirect("/dashboard");
    } else {
      redirect("/workspace");
    }
  } catch {
    redirect("/dashboard");
  }
}
