"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/types";

interface SidebarProps {
  workspace: Workspace | null;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/calendar", label: "Calendar" },
  { href: "/members", label: "Members" },
  { href: "/activity", label: "Activity" },
  { href: "/analytics", label: "Analytics" },
];

export function Sidebar({ workspace }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="hidden lg:flex flex-col flex-shrink-0 w-60 h-screen sticky top-0 bg-white border-r border-border">
      <div className="px-5 py-5 border-b border-border">
        <span className="font-bold text-lg text-brand">talli</span>
      </div>

      {workspace && (
        <div className="px-4 py-3 border-b border-border">
          <div className="bg-brand-light rounded-xl px-3 py-2">
            <p className="text-xs font-semibold text-text-primary truncate">{workspace.name}</p>
            <p className="text-[10px] text-text-secondary font-mono">{workspace.code}</p>
          </div>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150",
              pathname === item.href
                ? "bg-brand text-white"
                : "text-text-secondary hover:bg-gray-100 hover:text-text-primary"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-border">
        <p className="text-sm font-medium text-text-primary truncate">{session?.user?.name ?? "User"}</p>
        <p className="text-xs text-text-secondary truncate mb-2">{session?.user?.email}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs text-danger hover:text-danger/80 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
