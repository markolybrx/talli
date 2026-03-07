"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface ExportButtonProps {
  workspaceId: string;
}

export function ExportButton({ workspaceId }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/export?workspaceId=${workspaceId}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `talli-tasks-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Tasks exported");
    } catch {
      toast.error("Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all duration-150",
        loading
          ? "opacity-50 cursor-not-allowed border-border text-text-secondary"
          : "border-border text-text-secondary hover:border-gray-300 hover:text-text-primary"
      )}
    >
      {loading ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      )}
      Export CSV
    </button>
  );
}
