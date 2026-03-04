"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import type { Workspace } from "@/types";

interface SidebarProps {
  workspace: Workspace | null;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/calendar", label: "Calendar" },
  { href: "/members", label: "Members" },
  { href: "/activity", label: "Activity" },
];

export function Sidebar({ workspace }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside style={{
      display: "none",
      width: "240px",
      backgroundColor: "#fff",
      borderRight: "1px solid #E4E4E7",
      height: "100vh",
      position: "sticky",
      top: 0,
      flexDirection: "column",
      flexShrink: 0,
    }}
    className="lg-sidebar">
      <div style={{ padding: "20px", borderBottom: "1px solid #E4E4E7" }}>
        <span style={{ fontWeight: 700, fontSize: "18px", color: "#6366F1" }}>talli</span>
      </div>

      {workspace && (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #E4E4E7" }}>
          <div style={{ background: "#EEF2FF", borderRadius: "12px", padding: "8px 12px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#18181B" }}>{workspace.name}</p>
            <p style={{ fontSize: "10px", color: "#71717A", fontFamily: "monospace" }}>{workspace.code}</p>
          </div>
        </div>
      )}

      <nav style={{ flex: 1, padding: "12px" }}>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} style={{
            display: "block",
            padding: "10px 12px",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: 500,
            marginBottom: "2px",
            textDecoration: "none",
            backgroundColor: pathname === item.href ? "#6366F1" : "transparent",
            color: pathname === item.href ? "#fff" : "#71717A",
          }}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div style={{ padding: "16px", borderTop: "1px solid #E4E4E7" }}>
        <p style={{ fontSize: "14px", fontWeight: 500, color: "#18181B" }}>{session?.user?.name ?? "User"}</p>
        <p style={{ fontSize: "12px", color: "#71717A", marginBottom: "8px" }}>{session?.user?.email}</p>
        <button onClick={() => signOut({ callbackUrl: "/login" })}
          style={{ fontSize: "12px", color: "#F43F5E", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
