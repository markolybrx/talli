"use client";

import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { cn } from "@/lib/utils";

type Tab = "signin" | "signup";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<Tab>("signin");

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand relative overflow-hidden flex-col justify-between p-12">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-white/5 rounded-full" />

        {/* Top logo */}
        <div className="relative z-10">
          <Logo size={40} showWordmark={true} className="[&_span]:!text-white [&_rect:first-child]:fill-white/20" />
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-semibold text-white leading-tight">
            Your team's tasks,<br />
            <span className="text-indigo-200">organized intelligently.</span>
          </h1>
          <p className="text-indigo-200 text-base leading-relaxed max-w-sm">
            AI-powered task management built for recruitment teams. Prioritize, assign, and track — all in one place.
          </p>

          {/* Feature list */}
          <div className="space-y-3 pt-2">
            {[
              "AI-generated task summaries and briefings",
              "Smart priority and deadline suggestions",
              "Real-time collaboration across your workspace",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-indigo-100 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom text */}
        <div className="relative z-10">
          <p className="text-indigo-300 text-xs">
            © {new Date().getFullYear()} Talli. Built for modern recruitment teams.
          </p>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8 animate-slide-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center">
            <Logo size={40} />
          </div>

          {/* Header */}
          <div>
            <h2 className="text-2xl font-semibold text-text-primary">
              {activeTab === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-text-secondary text-sm mt-1">
              {activeTab === "signin"
                ? "Sign in to your workspace"
                : "Get started with Talli today"}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setActiveTab("signin")}
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                activeTab === "signin"
                  ? "bg-white text-text-primary shadow-card"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab("signup")}
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                activeTab === "signup"
                  ? "bg-white text-text-primary shadow-card"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <div className="animate-fade-in" key={activeTab}>
            {activeTab === "signin" ? (
              <LoginForm onSwitchToSignup={() => setActiveTab("signup")} />
            ) : (
              <SignupForm onSwitchToSignin={() => setActiveTab("signin")} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
