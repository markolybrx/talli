"use client";
import { SessionProvider } from "next-auth/react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <main style={{ flex: 1, padding: "20px" }}>
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
