"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

function Section({ title, description, children, danger = false }: {
  title: string; description?: string; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <div className={cn("bg-surface border rounded-2xl p-6 space-y-5", danger ? "border-danger/30" : "border-border")}>
      <div>
        <h2 className={cn("text-base font-semibold", danger ? "text-danger" : "text-text-primary")}>{title}</h2>
        {description && <p className="text-sm text-text-secondary mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, description, enabled, onChange }: {
  label: string; description?: string; enabled: boolean; onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && <p className="text-xs text-text-secondary mt-0.5">{description}</p>}
      </div>
      <button onClick={() => onChange(!enabled)}
        className={cn("relative rounded-full transition-colors duration-200 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2", enabled ? "bg-brand" : "bg-gray-200")}
        style={{ height: "22px", width: "40px" }} role="switch" aria-checked={enabled}>
        <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200", enabled ? "translate-x-[18px]" : "translate-x-0")} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const { workspace, members, refetch } = useWorkspace();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [notifyAssigned, setNotifyAssigned] = useState(true);
  const [notifyDue, setNotifyDue] = useState(true);
  const [notifyCompleted, setNotifyCompleted] = useState(false);
  const [leavingWorkspace, setLeavingWorkspace] = useState(false);

  const isAdmin = members.find((m) => m.user_id === session?.user?.id)?.role === "admin";

  useEffect(() => { if (session?.user?.name) setFullName(session.user.name); }, [session?.user?.name]);
  useEffect(() => { if (workspace?.name) setWorkspaceName(workspace.name); }, [workspace?.name]);
  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem("talli_notif_prefs") ?? "{}");
      if (typeof prefs.notifyAssigned === "boolean") setNotifyAssigned(prefs.notifyAssigned);
      if (typeof prefs.notifyDue === "boolean") setNotifyDue(prefs.notifyDue);
      if (typeof prefs.notifyCompleted === "boolean") setNotifyCompleted(prefs.notifyCompleted);
    } catch {}
  }, []);

  const saveNotifPrefs = (overrides: Partial<Record<string, boolean>>) => {
    const prefs = { notifyAssigned, notifyDue, notifyCompleted, ...overrides };
    localStorage.setItem("talli_notif_prefs", JSON.stringify(prefs));
  };

  const handleSaveProfile = async () => {
    if (!session?.user?.id) return;
    if (!fullName.trim()) { toast.error("Name can't be empty"); return; }
    setSavingProfile(true);
    try {
      const { error } = await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", session.user.id);
      if (error) throw error;
      await updateSession({ name: fullName.trim() });
      toast.success("Profile updated!");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update profile");
    } finally { setSavingProfile(false); }
  };

  const handleSaveWorkspace = async () => {
    if (!workspace?.id || !isAdmin) return;
    if (!workspaceName.trim()) { toast.error("Workspace name can't be empty"); return; }
    setSavingWorkspace(true);
    try {
      const { error } = await supabase.from("workspaces").update({ name: workspaceName.trim() }).eq("id", workspace.id);
      if (error) throw error;
      await refetch();
      toast.success("Workspace updated!");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update workspace");
    } finally { setSavingWorkspace(false); }
  };

  const handleCopyCode = () => {
    if (!workspace?.code) return;
    navigator.clipboard.writeText(workspace.code);
    setCopiedCode(true);
    toast.success("Workspace code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleLeaveWorkspace = async () => {
    if (!workspace?.id || !session?.user?.id) return;
    const admins = members.filter((m) => m.role === "admin");
    if (isAdmin && admins.length === 1) { toast.error("You're the only admin. Promote another member before leaving."); return; }
    if (!confirm("Are you sure you want to leave this workspace? You'll need an invite code to rejoin.")) return;
    setLeavingWorkspace(true);
    try {
      const { error } = await supabase.from("workspace_members").delete().eq("workspace_id", workspace.id).eq("user_id", session.user.id);
      if (error) throw error;
      toast.success("You've left the workspace");
      router.replace("/workspace");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to leave workspace");
      setLeavingWorkspace(false);
    }
  };

  return (
    <>
      <Topbar title="Settings" />
      <div className="flex-1 p-4 lg:p-6 max-w-2xl mx-auto w-full space-y-5">

        <Section title="Profile" description="Update your display name. Your email is managed by your auth provider.">
          <div className="flex items-center gap-4">
            <Avatar name={fullName || session?.user?.name} src={session?.user?.image} size="lg" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{fullName || session?.user?.name || "—"}</p>
              <p className="text-xs text-text-secondary truncate">{session?.user?.email}</p>
            </div>
          </div>
          <div className="space-y-3">
            <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" onKeyDown={(e) => e.key === "Enter" && handleSaveProfile()} />
            <Input label="Email address" value={session?.user?.email ?? ""} disabled hint="Email cannot be changed here." />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSaveProfile} loading={savingProfile} disabled={savingProfile || fullName.trim() === (session?.user?.name ?? "")}>
              Save changes
            </Button>
          </div>
        </Section>

        <Section title="Workspace" description={isAdmin ? "Manage your workspace name and share the invite code with teammates." : "Your workspace details. Only admins can edit the name."}>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-text-primary">Invite code</p>
            <div className="flex items-center gap-3">
              <span className="font-mono font-semibold text-text-primary tracking-widest text-sm bg-gray-50 px-4 py-2.5 rounded-xl border border-border flex-1">{workspace?.code ?? "—"}</span>
              <Button variant="outline" size="sm" onClick={handleCopyCode} className={cn("gap-1.5", copiedCode && "border-success/30 text-success bg-success/5")}>
                {copiedCode ? "Copied!" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-text-secondary">Share this code with teammates so they can join your workspace.</p>
          </div>
          <Input label="Workspace name" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="Your workspace name" disabled={!isAdmin} hint={!isAdmin ? "Only admins can rename the workspace." : undefined} onKeyDown={(e) => e.key === "Enter" && handleSaveWorkspace()} />
          {isAdmin && (
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSaveWorkspace} loading={savingWorkspace} disabled={savingWorkspace || workspaceName.trim() === (workspace?.name ?? "")}>Save changes</Button>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <div className="flex -space-x-2">
              {members.slice(0, 4).map((m) => (<Avatar key={m.id} name={m.profile?.full_name} src={m.profile?.avatar_url} size="xs" className="ring-2 ring-white" />))}
            </div>
            <p className="text-xs text-text-secondary">{members.length} member{members.length !== 1 ? "s" : ""} in this workspace</p>
          </div>
        </Section>

        <Section title="Notifications" description="Choose which in-app events you want to be notified about.">
          <div className="space-y-4">
            <ToggleRow label="Task assigned to me" description="Get notified when someone assigns you a task." enabled={notifyAssigned} onChange={(val) => { setNotifyAssigned(val); saveNotifPrefs({ notifyAssigned: val }); }} />
            <div className="h-px bg-border" />
            <ToggleRow label="Task due soon" description="Reminder when a task you own is due within 12 hours." enabled={notifyDue} onChange={(val) => { setNotifyDue(val); saveNotifPrefs({ notifyDue: val }); }} />
            <div className="h-px bg-border" />
            <ToggleRow label="Task completed" description="Notify me when a task I created gets marked complete." enabled={notifyCompleted} onChange={(val) => { setNotifyCompleted(val); saveNotifPrefs({ notifyCompleted: val }); }} />
          </div>
        </Section>

        <Section title="Account">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Sign out</p>
              <p className="text-xs text-text-secondary mt-0.5">Sign out of Talli on this device.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>Sign out</Button>
          </div>
        </Section>

        <Section title="Danger zone" description="Destructive actions — these cannot be undone." danger>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Leave workspace</p>
              <p className="text-xs text-text-secondary mt-0.5">
                You'll need an invite code to rejoin.
                {isAdmin && members.filter((m) => m.role === "admin").length === 1 && (
                  <span className="text-warning font-medium"> Promote another admin first.</span>
                )}
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={handleLeaveWorkspace} loading={leavingWorkspace} disabled={leavingWorkspace || (isAdmin && members.filter((m) => m.role === "admin").length === 1)}>Leave</Button>
          </div>
        </Section>

      </div>
    </>
  );
}
