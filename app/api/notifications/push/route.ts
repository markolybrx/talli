import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, title, body, url } = await req.json();
  if (!userId || !title) return NextResponse.json({ error: "userId and title required" }, { status: 400 });

  if (!process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ skipped: "VAPID not configured" });
  }

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs?.length) return NextResponse.json({ skipped: "no subscriptions" });

  const webPush = await import("web-push");
  webPush.setVapidDetails(
    "mailto:admin@talli.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const payload = JSON.stringify({ title, body: body ?? "", url: url ?? "/dashboard" });

  await Promise.allSettled(
    (subs as any[]).map((s) =>
      webPush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
    )
  );

  return NextResponse.json({ ok: true });
}
