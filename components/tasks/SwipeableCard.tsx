"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  rightLabel?: string;
  leftLabel?: string;
  rightColor?: string;
  leftColor?: string;
  rightIcon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  disabled?: boolean;
}

const THRESHOLD = 80;
const MAX_DRAG = 120;

export function SwipeableCard({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightLabel = "Complete",
  leftLabel = "Delete",
  rightColor = "#10B981",
  leftColor = "#F43F5E",
  rightIcon,
  leftIcon,
  disabled = false,
}: SwipeableCardProps) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [triggered, setTriggered] = useState<"left" | "right" | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontal.current = null;
    setSwiping(false);
    setTriggered(null);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (disabled) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Determine direction on first significant move
    if (isHorizontal.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        isHorizontal.current = Math.abs(dx) > Math.abs(dy);
      }
      return;
    }

    if (!isHorizontal.current) return;

    e.preventDefault();
    setSwiping(true);

    const clamped = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx));

    // Only allow directions that have handlers
    if (clamped > 0 && !onSwipeRight) return;
    if (clamped < 0 && !onSwipeLeft) return;

    setOffset(clamped);
    setTriggered(Math.abs(clamped) >= THRESHOLD ? (clamped > 0 ? "right" : "left") : null);
  };

  const onTouchEnd = () => {
    if (disabled || !swiping) return;
    if (triggered === "right" && onSwipeRight) {
      onSwipeRight();
    } else if (triggered === "left" && onSwipeLeft) {
      onSwipeLeft();
    }
    setOffset(0);
    setSwiping(false);
    setTriggered(null);
    isHorizontal.current = null;
  };

  const showRight = offset > 10;
  const showLeft = offset < -10;
  const rightTriggered = triggered === "right";
  const leftTriggered = triggered === "left";

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Right action (swipe right = complete) */}
      {onSwipeRight && (
        <div
          className="absolute inset-y-0 left-0 flex items-center pl-5 rounded-2xl transition-all duration-150"
          style={{
            backgroundColor: rightColor,
            width: Math.max(0, offset),
            opacity: showRight ? 1 : 0,
          }}
        >
          <div className={cn("flex items-center gap-2 text-white transition-transform duration-150", rightTriggered && "scale-110")}>
            {rightIcon ?? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {rightTriggered && <span className="text-xs font-semibold">{rightLabel}</span>}
          </div>
        </div>
      )}

      {/* Left action (swipe left = delete) */}
      {onSwipeLeft && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end pr-5 rounded-2xl transition-all duration-150"
          style={{
            backgroundColor: leftColor,
            width: Math.max(0, -offset),
            opacity: showLeft ? 1 : 0,
          }}
        >
          <div className={cn("flex items-center gap-2 text-white transition-transform duration-150", leftTriggered && "scale-110")}>
            {leftTriggered && <span className="text-xs font-semibold">{leftLabel}</span>}
            {leftIcon ?? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Card content */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? "none" : "transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
