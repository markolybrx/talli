import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Only use supabaseAdmin in server-side code (API routes)
export function getSupabaseAdmin() {
  if (typeof window !== "undefined") {
    throw new Error("supabaseAdmin cannot be used on the client side");
  }
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Keep backward compat for server files
export const supabaseAdmin = typeof window === "undefined"
  ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null as any;
