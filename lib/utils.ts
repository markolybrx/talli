import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateWorkspaceCode(name: string): string {
  const prefix = name.slice(0, 3).toLowerCase().replace(/[^a-z]/g, "x");
  const paddedPrefix = prefix.padEnd(3, "x");
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const suffix = Array.from(
    { length: 5 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  return `${paddedPrefix}${suffix}`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function isWithin12Hours(dueDate: string | Date): boolean {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  return diffMs > 0 && diffMs <= 12 * 60 * 60 * 1000;
}

export function isOverdue(dueDate: string | Date): boolean {
  return new Date(dueDate) < new Date();
}

export const CATEGORY_CONFIG = {
  recruitment_marketing: {
    label: "Recruitment Marketing",
    color: "#6366F1",
    bg: "#EEF2FF",
    border: "border-l-brand",
  },
  recruitment_sourcing: {
    label: "Recruitment Sourcing",
    color: "#10B981",
    bg: "#ECFDF5",
    border: "border-l-success",
  },
  recruitment_agent_hiring: {
    label: "Recruitment Agent Hiring",
    color: "#F59E0B",
    bg: "#FFFBEB",
    border: "border-l-warning",
  },
  others: {
    label: "Others",
    color: "#64748B",
    bg: "#F8FAFC",
    border: "border-l-gray-400",
  },
} as const;

export const PRIORITY_CONFIG = {
  high: { label: "High", color: "#F43F5E", bg: "#FFF1F2" },
  medium: { label: "Medium", color: "#F59E0B", bg: "#FFFBEB" },
  low: { label: "Low", color: "#10B981", bg: "#ECFDF5" },
} as const;
