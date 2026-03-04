"use client";
import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  return (
    <div style={{ padding: "40px" }}>
      <h1>Talli Login</h1>
      <LoginForm onSwitchToSignup={() => setTab("signup")} />
    </div>
  );
}
