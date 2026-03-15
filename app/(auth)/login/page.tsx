"use client";
import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { TalliIcon } from "@/components/ui/Logo";

export default function LoginPage() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3">
          <TalliIcon size={56} />
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Welcome to talli</h1>
            <p className="text-text-secondary text-sm mt-1">Sign in to your workspace</p>
          </div>
        </div>
        <LoginForm onSwitchToSignup={() => setTab("signup")} />
      </div>
    </div>
  );
}
