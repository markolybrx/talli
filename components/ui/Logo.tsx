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
      <defs>
        <linearGradient id="talliGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7C3AED"/>
          <stop offset="100%" stopColor="#6366F1"/>
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#talliGrad)"/>
      {/* Progress bars */}
      <rect x="8" y="11" width="24" height="4" rx="2" fill="white"/>
      <rect x="8" y="18" width="18" height="4" rx="2" fill="white" opacity="0.7"/>
      <rect x="8" y="25" width="12" height="4" rx="2" fill="white" opacity="0.4"/>
      {/* Checkmark badge */}
      <circle cx="33" cy="27" r="4" fill="#C4B5FD"/>
      <path d="M31 27l1.5 1.5L35 25.5" stroke="#4F46E5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
