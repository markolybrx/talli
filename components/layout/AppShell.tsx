"use client";

import { useWorkspace } from "@/hooks/useWorkspace";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { workspace } = useWorkspace();

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
