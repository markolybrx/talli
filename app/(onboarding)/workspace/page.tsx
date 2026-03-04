"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import { cn, generateWorkspaceCode } from "@/lib/utils";

type Mode = "choose" | "create" | "join";

const createSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters").max(50),
});

const joinSchema = z.object({
  code: z.string().length(8, "Workspace code must be 8 characters"),
});

type CreateData = z.infer<typeof createSchema>;
type JoinData = z.infer<typeof joinSchema>;

export default function WorkspacePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const createForm = useForm<CreateData>({ resolver: zodResolver(createSchema) });
  const joinForm = useForm<JoinData>({ resolver: zodResolver(joinSchema) });

  const handleCreate = async (data: CreateData) => {
    setLoading(true);
    try {
      const code = generateWorkspaceCode(data.name);
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, code }),
      });
      const json = await res.json();
      if (!res.ok || !json.workspace) {
        toast.error(json.error ?? "Failed to create workspace");
        return;
      }
      setGeneratedCode(code);
      toast.success("Workspace created!");
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (data: JoinData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: data.code.toLowerCase() }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to join workspace");
        return;
      }
      toast.success("Joined workspace!");
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong.");
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
            <h1 className="text-2xl font-semibold text-text-primary">Set up your workspace</h1>
            <p className="text-text-secondary text-sm mt-1">Create a new workspace or join an existing one with a code.</p>
          </div>
        </div>

        {mode === "choose" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={() => setMode("create")} className="card p-6 text-left hover:shadow-card-hover transition-all duration-200 hover:border-brand/30 group">
              <div className="w-10 h-10 bg-brand-light rounded-xl flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary mb-1">Create workspace</h3>
              <p className="text-sm text-text-secondary">Start fresh and invite your team members.</p>
            </button>
            <button onClick={() => setMode("join")} className="card p-6 text-left hover:shadow-card-hover transition-all duration-200 hover:border-brand/30 group">
              <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary mb-1">Join workspace</h3>
              <p className="text-sm text-text-secondary">Enter a workspace code to join your team.</p>
            </button>
          </div>
        )}

        {mode === "create" && !generatedCode && (
          <div className="card p-8 space-y-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setMode("choose")} className="text-text-secondary hover:text-text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="font-semibold text-text-primary">Create workspace</h2>
            </div>
            <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
              <Input label="Workspace name" placeholder="e.g. Acme Recruitment" error={createForm.formState.errors.name?.message} {...createForm.register("name")} />
              <Button type="submit" fullWidth loading={loading} size="lg">Create Workspace</Button>
            </form>
          </div>
        )}

        {mode === "create" && generatedCode && (
          <div className="card p-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="font-semibold text-text-primary text-lg">Workspace created!</h2>
              <p className="text-sm text-text-secondary">Share this code with your team.</p>
            </div>
            <div className="bg-gray-50 border border-border rounded-xl p-4 text-center">
              <p className="text-xs text-text-secondary mb-1">Your workspace code</p>
              <p className="text-3xl font-semibold tracking-[0.25em] text-text-primary font-mono">{generatedCode}</p>
            </div>
            <Button fullWidth onClick={() => { router.push("/dashboard"); router.refresh(); }}>Go to Dashboard</Button>
          </div>
        )}

        {mode === "join" && (
          <div className="card p-8 space-y-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setMode("choose")} className="text-text-secondary hover:text-text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="font-semibold text-text-primary">Join workspace</h2>
            </div>
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
