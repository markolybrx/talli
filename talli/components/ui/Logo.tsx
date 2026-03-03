import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export function TalliIcon({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer rounded square background */}
      <rect width="40" height="40" rx="10" fill="#6366F1" />

      {/* Talli mark — stylized T with checkmark integration */}
      {/* Horizontal bar of T */}
      <rect x="8" y="10" width="24" height="4" rx="2" fill="white" />

      {/* Vertical stem of T */}
      <rect x="17" y="14" width="6" height="10" rx="1.5" fill="white" />

      {/* Checkmark / tick mark at bottom — represents task completion */}
      <path
        d="M10 28L15.5 33.5L30 22"
        stroke="white"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Subtle dot accent — top right */}
      <circle cx="33" cy="8" r="2.5" fill="#A5B4FC" />
    </svg>
  );
}

export function Logo({ size = 36, showWordmark = true, className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <TalliIcon size={size} />
      {showWordmark && (
        <span
          className="font-semibold text-text-primary tracking-tight"
          style={{ fontSize: size * 0.6, fontFamily: "Poppins, sans-serif" }}
        >
          talli
        </span>
      )}
    </div>
  );
}
