"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import { generateWorkspaceCode } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type Mode = "choose" | "create" | "join";
const createSchema = z.object({ name: z.string().min(2).max(50) });
const joinSchema = z.object({ code: z.string().length(8) });
type CreateData = z.infer<typeof createSchema>;
type JoinData = z.infer<typeof joinSchema>;

export default function WorkspacePageClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const [mode, setMode] = useState<Mode>("choose");
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const createForm = useForm<CreateData>({ resolver: zodResolver(createSchema) });
  const joinForm = useForm<JoinData>({ resolver: zodResolver(joinSchema) });

  const handleCreate = async (data: CreateData) => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const code = generateWorkspaceCode(data.name);
      const { data: workspace, error } = await supabase.from("workspaces").insert({ name: data.name, code, created_by: session.user.id }).select().single();
      if (error || !workspace) { toast.error("Failed to create workspace."); return; }
      await supabase.from("workspace_members").insert({ workspace_id: workspace.id, user_id: session.user.id, role: "admin" });
      setGeneratedCode(code);
      toast.success("Workspace created!");
    } catch { toast.error("Something went wrong."); } finally { setLoading(false); }
  };

  const handleJoin = async (data: JoinData) => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const { data: workspace, error } = await supabase.from("workspaces").select("*").eq("code", data.code.toLowerCase()).single();
      if (error || !workspace) { toast.error("Workspace not found."); return; }
      const { error: memberError } = await supabase.from("workspace_members").insert({ workspace_id: workspace.id, user_id: session.user.id, role: "member" });
      if (memberError) { toast.error("Failed to join workspace."); return; }
      toast.success("Joined workspace!");
      router.push("/dashboard");
    } catch { toast.error("Something went wrong."); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-3">
          <Logo size={44} className="justify-center" />
          <h1 className="text-2xl font-semibold text-text-primary">Set up your workspace</h1>
          <p className="text-text-secondary text-sm">Create a new workspace or join an existing one.</p>
        </div>
        {mode === "choose" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={() => setMode("create")} className="card p-6 text-left hover:border-brand/30 transition-all">
              <h3 className="font-semibold text-text-primary mb-1">Create workspace</h3>
              <p className="text-sm text-text-secondary">Start fresh and invite your team.</p>
            </button>
            <button onClick={() => setMode("join")} className="card p-6 text-left hover:border-brand/30 transition-all">
              <h3 className="font-semibold text-text-primary mb-1">Join workspace</h3>
              <p className="text-sm text-text-secondary">Enter a code to join your team.</p>
            </button>
          </div>
        )}
        {mode === "create" && !generatedCode && (
          <div className="card p-8 space-y-6">
            <button onClick={() => setMode("choose")} className="text-text-secondary hover:text-text-primary">← Back</button>
            <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
              <Input label="Workspace name" placeholder="e.g. Acme Recruitment" error={createForm.formState.errors.name?.message} {...createForm.register("name")} />
              <Button type="submit" fullWidth loading={loading} size="lg">Create Workspace</Button>
            </form>
          </div>
        )}
        {mode === "create" && generatedCode && (
          <div className="card p-8 space-y-6 text-center">
            <h2 className="font-semibold text-text-primary text-lg">Workspace created!</h2>
            <div className="bg-gray-50 border border-border rounded-xl p-4">
              <p className="text-xs text-text-secondary mb-1">Your workspace code</p>
              <p className="text-3xl font-semibold tracking-widest text-text-primary font-mono">{generatedCode}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" fullWidth onClick={() => { navigator.clipboard.writeText(generatedCode); toast.success("Copied!"); }}>Copy Code</Button>
              <Button fullWidth onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
            </div>
          </div>
        )}
        {mode === "join" && (
          <div className="card p-8 space-y-6">
            <button onClick={() => setMode("choose")} className="text-text-secondary hover:text-text-primary">← Back</button>
            <form onSubmit={joinForm.handleSubmit(handleJoin)} className="space-y-4">
              <Input label="Workspace code" placeholder="e.g. acm7k3x9" error={joinForm.formState.errors.code?.message} {...joinForm.register("code")} />
              <Button type="submit" fullWidth loading={loading} size="lg">Join Workspace</Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
