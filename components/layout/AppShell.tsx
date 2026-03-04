"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";

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
      <Sidebar workspace={null} />
      <main style={{ flex: 1, padding: "20px" }}>{children}</main>
    </div>
  );
}
