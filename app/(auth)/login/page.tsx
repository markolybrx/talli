"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Tab = "signin" | "signup";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<Tab>("signin");
  return (
    <div style={{ padding: "40px" }}>
      <h1>Talli Login</h1>
      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <button onClick={() => setActiveTab("signin")}
          style={{ padding: "8px 16px", background: activeTab === "signin" ? "#6366F1" : "#eee", color: activeTab === "signin" ? "white" : "black", borderRadius: "8px", border: "none" }}>
          Sign In
        </button>
        <button onClick={() => setActiveTab("signup")}
          style={{ padding: "8px 16px", background: activeTab === "signup" ? "#6366F1" : "#eee", color: activeTab === "signup" ? "white" : "black", borderRadius: "8px", border: "none" }}>
          Sign Up
        </button>
      </div>
      <p style={{ marginTop: "20px" }}>Active tab: {activeTab}</p>
    </div>
  );
}
