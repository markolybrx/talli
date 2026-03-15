"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  BarChart2,
  Users,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home",      icon: LayoutDashboard },
  { href: "/tasks",     label: "Tasks",     icon: CheckSquare },
  { href: "/calendar",  label: "Calendar",  icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/members",   label: "Team",      icon: Users },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-2 py-1 flex justify-around z-50">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs transition-colors ${
              active
                ? "text-violet-600 dark:text-violet-400"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
