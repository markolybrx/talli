"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useWorkspace } from "@/hooks/useWorkspace";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { workspace } = useWorkspace();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") return <div style={{padding:"20px"}}>Loading...</div>;
  if (!session) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar workspace={workspace} />
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
