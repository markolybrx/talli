"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { TalliIcon } from "@/components/ui/Logo";

interface TopbarProps {
  title?: string;
  onSearch?: (query: string) => void;
}

export function Topbar({ title = "Dashboard", onSearch }: TopbarProps) {
  const { data: session } = useSession();
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const handleSearch = (value: string) => {
    setSearchValue(value);
    onSearch?.(value);
  };

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center px-4 lg:px-6 gap-4 fixed top-0 left-0 right-0 z-30">
      <div className="flex items-center gap-2.5">
        <TalliIcon size={32} />
        <h1 className="text-base font-semibold text-text-primary">{title}</h1>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-sm lg:max-w-md mx-auto lg:mx-0 lg:ml-auto">
        <div className={cn(
          "relative flex items-center bg-gray-50 border rounded-xl transition-all duration-200",
          searchFocused ? "border-brand bg-white shadow-sm" : "border-border"
        )}>
          <span className="absolute left-3 text-text-secondary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text" value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search tasks..."
            className="w-full bg-transparent pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
          />
          {searchValue && (
            <button onClick={() => handleSearch("")} className="absolute right-3 text-text-secondary hover:text-text-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Right: notifications + avatar */}
      <div className="flex items-center gap-2 ml-auto lg:ml-0">
        <NotificationCenter />
        <Avatar name={session?.user?.name} src={session?.user?.image} size="sm" className="cursor-pointer" />
      </div>
    </header>
  );
}
