"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { useWorkspace } from "@/hooks/useWorkspace";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { OfflineBanner } from "@/components/ui/OfflineBanner";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { workspace } = useWorkspace();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") return <LoadingScreen />;
  if (!session) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0 overflow-y-auto h-screen pt-16">
        {children}
      </main>
      <OfflineBanner />
      <MobileNav />
    </div>
  );
}
