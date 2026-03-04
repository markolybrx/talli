"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") return <div style={{padding:"20px"}}>Loading...</div>;
  if (!session) return null;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ width: "200px", background: "#6366F1", padding: "20px", color: "white" }}>
        Sidebar placeholder
      </div>
      <main style={{ flex: 1, padding: "20px" }}>
        {children}
      </main>
    </div>
  );
}
