const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

interface EmailPayload {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("BREVO_API_KEY not set — skipping email");
    return false;
  }

  try {
    const res = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME ?? "Talli",
          email: process.env.BREVO_SENDER_EMAIL ?? "noreply@talli.app",
        },
        ...payload,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("Brevo email error:", err);
    return false;
  }
}

export function taskAssignedEmail(params: {
  toEmail: string;
  toName: string;
  taskTitle: string;
  assignedBy: string;
  dueDate?: string;
  workspaceName: string;
}): EmailPayload {
  return {
    to: [{ email: params.toEmail, name: params.toName }],
    subject: `New task assigned: ${params.taskTitle}`,
    htmlContent: `
      <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #FAFAFA; padding: 40px 20px;">
        <div style="background: white; border-radius: 16px; border: 1px solid #E4E4E7; overflow: hidden;">
          <div style="background: #6366F1; padding: 28px 32px;">
            <h1 style="color: white; font-size: 20px; font-weight: 600; margin: 0;">talli</h1>
          </div>
          <div style="padding: 32px;">
            <h2 style="font-size: 18px; font-weight: 600; color: #18181B; margin: 0 0 8px;">New Task Assigned</h2>
            <p style="color: #71717A; font-size: 14px; margin: 0 0 24px;">Hi ${params.toName}, ${params.assignedBy} assigned you a task in ${params.workspaceName}.</p>
            <div style="background: #F4F4F5; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
              <p style="font-size: 15px; font-weight: 600; color: #18181B; margin: 0 0 4px;">${params.taskTitle}</p>
              ${params.dueDate ? `<p style="font-size: 13px; color: #71717A; margin: 0;">Due: ${new Date(params.dueDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>` : ""}
            </div>
            <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; background: #6366F1; color: white; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 12px; text-decoration: none;">View Task</a>
          </div>
          <div style="padding: 16px 32px; border-top: 1px solid #E4E4E7;">
            <p style="font-size: 12px; color: #A1A1AA; margin: 0;">Talli Workspace · ${params.workspaceName}</p>
          </div>
        </div>
      </div>
    `,
  };
}

export function taskDueEmail(params: {
  toEmail: string;
  toName: string;
  taskTitle: string;
  dueDate: string;
  workspaceName: string;
  hoursLeft: number;
}): EmailPayload {
  return {
    to: [{ email: params.toEmail, name: params.toName }],
    subject: `Reminder: "${params.taskTitle}" due in ${params.hoursLeft} hour${params.hoursLeft !== 1 ? "s" : ""}`,
    htmlContent: `
      <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #FAFAFA; padding: 40px 20px;">
        <div style="background: white; border-radius: 16px; border: 1px solid #E4E4E7; overflow: hidden;">
          <div style="background: #F59E0B; padding: 28px 32px;">
            <h1 style="color: white; font-size: 20px; font-weight: 600; margin: 0;">talli · Due Soon</h1>
          </div>
          <div style="padding: 32px;">
            <h2 style="font-size: 18px; font-weight: 600; color: #18181B; margin: 0 0 8px;">Task Due in ${params.hoursLeft} Hour${params.hoursLeft !== 1 ? "s" : ""}</h2>
            <p style="color: #71717A; font-size: 14px; margin: 0 0 24px;">Hi ${params.toName}, this task needs your attention soon.</p>
            <div style="background: #FFFBEB; border-radius: 12px; border: 1px solid #FDE68A; padding: 16px; margin-bottom: 24px;">
              <p style="font-size: 15px; font-weight: 600; color: #18181B; margin: 0 0 4px;">${params.taskTitle}</p>
              <p style="font-size: 13px; color: #B45309; margin: 0;">Due: ${new Date(params.dueDate).toLocaleString()}</p>
            </div>
            <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; background: #F59E0B; color: white; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 12px; text-decoration: none;">View Dashboard</a>
          </div>
        </div>
      </div>
    `,
  };
}

export function dailyBriefingEmail(params: {
  toEmail: string;
  toName: string;
  briefing: string;
  stats: { total: number; urgent: number; dueSoon: number; overdue: number };
  workspaceName: string;
}): EmailPayload {
  return {
    to: [{ email: params.toEmail, name: params.toName }],
    subject: `Good morning, ${params.toName} — Your Talli Briefing`,
    htmlContent: `
      <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #FAFAFA; padding: 40px 20px;">
        <div style="background: white; border-radius: 16px; border: 1px solid #E4E4E7; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #6366F1, #8B5CF6); padding: 28px 32px;">
            <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0 0 4px;">Daily Briefing</p>
            <h1 style="color: white; font-size: 22px; font-weight: 600; margin: 0;">Good morning, ${params.toName}</h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: #18181B; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">${params.briefing}</p>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
              ${[
                { label: "Total", value: params.stats.total, color: "#6366F1" },
                { label: "Urgent", value: params.stats.urgent, color: "#F43F5E" },
                { label: "Due Soon", value: params.stats.dueSoon, color: "#F59E0B" },
                { label: "Overdue", value: params.stats.overdue, color: "#EF4444" },
              ].map((s) => `
                <div style="text-align: center; background: #F4F4F5; border-radius: 12px; padding: 12px;">
                  <p style="font-size: 20px; font-weight: 700; color: ${s.color}; margin: 0;">${s.value}</p>
                  <p style="font-size: 11px; color: #71717A; margin: 4px 0 0;">${s.label}</p>
                </div>
              `).join("")}
            </div>
            <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; background: #6366F1; color: white; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 12px; text-decoration: none;">Open Dashboard</a>
          </div>
        </div>
      </div>
    `,
  };
}
