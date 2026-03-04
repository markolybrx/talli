"use client";
export const dynamic = "force-dynamic";


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
import { cn, generateWorkspaceCode } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type Mode = "choose" | "create" | "join";

const createSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters").max(50),
});

const joinSchema = z.object({
  code: z
    .string()
    .length(8, "Workspace code must be 8 characters")
    .regex(/^[a-z]{3}[a-z0-9]{5}$/, "Invalid workspace code format"),
});

type CreateData = z.infer<typeof createSchema>;
type JoinData = z.infer<typeof joinSchema>;

export default function WorkspacePage() {
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

      const { data: workspace, error } = await supabase
        .from("workspaces")
        .insert({ name: data.name, code, created_by: session.user.id })
        .select()
        .single();

      if (error || !workspace) {
        toast.error("Failed to create workspace. Try again.");
        return;
      }

      await supabase.from("workspace_members").insert({
        workspace_id: workspace.id,
        user_id: session.user.id,
        role: "admin",
      });

      setGeneratedCode(code);
      toast.success("Workspace created!");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (data: JoinData) => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const { data: workspace, error } = await supabase
        .from("workspaces")
        .select("*")
        .eq("code", data.code.toLowerCase())
        .single();

      if (error || !workspace) {
        toast.error("Workspace not found. Check the code and try again.");
        return;
      }

      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspace.id,
          user_id: session.user.id,
          role: "member",
        });

      if (memberError) {
        if (memberError.code === "23505") {
          toast("You're already a member of this workspace.");
        } else {
          toast.error("Failed to join workspace.");
        }
        return;
      }

      toast.success(`Joined "${workspace.name}"!`);
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8 animate-slide-up">
        <div className="text-center space-y-3">
          <Logo size={44} className="justify-center" />
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              Set up your workspace
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Create a new workspace or join an existing one with a code.
            </p>
          </div>
        </div>

        {mode === "choose" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
            {/* Create workspace */}
            <button
              onClick={() => setMode("create")}
              className="card p-6 text-left hover:shadow-card-hover transition-all duration-200 hover:border-brand/30 group"
            >
              <div className="w-10 h-10 bg-brand-light rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand group-hover:text-white transition-colors duration-200">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-white transition-colors">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary mb-1">Create workspace</h3>
              <p className="text-sm text-text-secondary">
                Start fresh and invite your team members.
              </p>
            </button>

            {/* Join workspace */}
            <button
              onClick={() => setMode("join")}
              className="card p-6 text-left hover:shadow-card-hover transition-all duration-200 hover:border-brand/30 group"
            >
              <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-success group-hover:text-white transition-colors duration-200">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-white transition-colors">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary mb-1">Join workspace</h3>
              <p className="text-sm text-text-secondary">
                Enter a workspace code to join your team.
              </p>
            </button>
          </div>
        )}

        {/* Create workspace form */}
        {mode === "create" && !generatedCode && (
          <div className="card p-8 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMode("choose")}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="font-semibold text-text-primary">Create workspace</h2>
            </div>

            <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
              <Input
                label="Workspace name"
                placeholder="e.g. Acme Recruitment"
                error={createForm.formState.errors.name?.message}
                hint="This will generate your unique workspace code"
                {...createForm.register("name")}
              />
              <Button type="submit" fullWidth loading={loading} size="lg">
                Create Workspace
              </Button>
            </form>
          </div>
        )}

        {/* Success — show generated code */}
        {mode === "create" && generatedCode && (
          <div className="card p-8 space-y-6 animate-slide-up">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="font-semibold text-text-primary text-lg">Workspace created!</h2>
              <p className="text-sm text-text-secondary">
                Share this code with your team so they can join.
              </p>
            </div>

            <div className="bg-gray-50 border border-border rounded-xl p-4 text-center">
              <p className="text-xs text-text-secondary mb-1">Your workspace code</p>
              <p className="text-3xl font-semibold tracking-[0.25em] text-text-primary font-mono">
                {generatedCode}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  navigator.clipboard.writeText(generatedCode);
                  toast.success("Code copied!");
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy Code
              </Button>
              <Button
                fullWidth
                onClick={() => {
                  router.push("/dashboard");
                  router.refresh();
                }}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* Join workspace form */}
        {mode === "join" && (
          <div className="card p-8 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMode("choose")}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="font-semibold text-text-primary">Join workspace</h2>
            </div>

            <form onSubmit={joinForm.handleSubmit(handleJoin)} className="space-y-4">
              <Input
                label="Workspace code"
                placeholder="e.g. acm7k3x9"
                error={joinForm.formState.errors.code?.message}
                hint="8-character code shared by your workspace admin"
                className="tracking-widest uppercase"
                {...joinForm.register("code")}
                onChange={(e) => {
                  e.target.value = e.target.value.toLowerCase();
                  joinForm.setValue("code", e.target.value);
                }}
              />
              <Button type="submit" fullWidth loading={loading} size="lg">
                Join Workspace
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
