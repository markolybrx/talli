import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail, taskDueEmail, dailyBriefingEmail } from "@/lib/brevo";
import { isWithin12Hours } from "@/lib/utils";

// This route is called by Vercel Cron
// Add to vercel.json: {"crons":[{"path":"/api/cron/due-reminders","schedule":"0 * * * *"}]}

export async function GET(req: NextRequest) {
  // Validate cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all tasks due within 12 hours that haven't been notified
    const { data: tasks } = await supabaseAdmin
      .from("tasks")
      .select("*, workspace:workspace_id(name), assignee:assigned_to(email, full_name)")
      .neq("status", "completed")
      .not("due_date", "is", null)
      .not("assigned_to", "is", null);

    if (!tasks) return NextResponse.json({ processed: 0 });

    let notified = 0;

    for (const task of tasks) {
      if (!task.due_date || !isWithin12Hours(task.due_date)) continue;

      const assignee = task.assignee as { email: string; full_name: string | null } | null;
      if (!assignee?.email) continue;

      const hoursLeft = Math.ceil(
        (new Date(task.due_date).getTime() - Date.now()) / (1000 * 60 * 60)
      );

      // Create in-app notification
      await supabaseAdmin.from("notifications").insert({
        user_id: task.assigned_to,
        title: "Task due soon",
        message: `"${task.title}" is due in ${hoursLeft} hour${hoursLeft !== 1 ? "s" : ""}`,
        type: "task_due",
        task_id: task.id,
      });

      // Send email
      await sendEmail(taskDueEmail({
        toEmail: assignee.email,
        toName: assignee.full_name ?? assignee.email,
        taskTitle: task.title,
        dueDate: task.due_date,
        workspaceName: (task.workspace as { name: string } | null)?.name ?? "Workspace",
        hoursLeft,
      }));

      notified++;
    }

    return NextResponse.json({ processed: notified });
  } catch (err) {
    console.error("Cron error:", err);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
