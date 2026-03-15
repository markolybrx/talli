"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  Settings,
  CalendarDays,
  Clock,
  Target,
  BarChart2,
  Activity,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks",     label: "Tasks",     icon: CheckSquare },
  { href: "/calendar",  label: "Calendar",  icon: CalendarDays },
  { href: "/timeline",  label: "Timeline",  icon: Clock },
  { href: "/goals",     label: "Goals",     icon: Target },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/activity",  label: "Activity",  icon: Activity },
  { href: "/members",   label: "Team",      icon: Users },
  { href: "/settings",  label: "Settings",  icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4 gap-1">
      <div className="mb-6 px-2">
        <span className="text-xl font-bold text-violet-600">Talli</span>
      </div>
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        );
      })}
    </aside>
  );
}
