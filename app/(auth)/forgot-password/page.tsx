"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import { supabase } from "@/lib/supabase";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        setSent(true);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-slide-up">
        <div className="flex justify-center">
          <Logo size={40} />
        </div>

        {!sent ? (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-text-primary">
                Reset your password
              </h1>
              <p className="text-text-secondary text-sm mt-2">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            <div className="card p-8 space-y-5">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@company.com"
                  error={errors.email?.message}
                  leftIcon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  }
                  {...register("email")}
                />
                <Button type="submit" fullWidth loading={loading} size="lg">
                  Send Reset Link
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="card p-8 text-center space-y-4">
            {/* Success icon */}
            <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mx-auto">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Check your inbox</h2>
              <p className="text-text-secondary text-sm mt-1">
                We&apos;ve sent a password reset link to{" "}
                <span className="font-medium text-text-primary">{getValues("email")}</span>
              </p>
            </div>
            <p className="text-xs text-text-secondary">
              Didn&apos;t receive it? Check your spam folder or{" "}
              <button
                onClick={() => setSent(false)}
                className="text-brand hover:text-brand-hover font-medium"
              >
                try again
              </button>
            </p>
          </div>
        )}

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
