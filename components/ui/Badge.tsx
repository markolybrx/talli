import { cn, CATEGORY_CONFIG, PRIORITY_CONFIG } from "@/lib/utils";
import type { TaskCategory, Priority } from "@/types";

interface CategoryBadgeProps {
  category: TaskCategory;
  className?: string;
}

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  bg?: string;
  className?: string;
}

export function Badge({ children, color, bg, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
        className
      )}
      style={{ color, backgroundColor: bg }}
    >
      {children}
    </span>
  );
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category];
  return (
    <Badge color={config.color} bg={config.bg} className={className}>
      {config.label}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <Badge color={config.color} bg={config.bg} className={className}>
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </Badge>
  );
}

export function DueSoonBadge({ className }: { className?: string }) {
  return (
    <Badge color="#F43F5E" bg="#FFF1F2" className={className}>
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      Due Soon
    </Badge>
  );
}

export function OverdueBadge({ className }: { className?: string }) {
  return (
    <Badge color="#F43F5E" bg="#FFF1F2" className={className}>
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      Overdue
    </Badge>
  );
}
