"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { useWorkspace } from "@/hooks/useWorkspace";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { workspace } = useWorkspace();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <p style={{ color: "#6366F1", fontFamily: "sans-serif" }}>Loading...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar workspace={workspace} />
      <main className="flex-1 min-w-0 flex flex-col pb-16 lg:pb-0">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
