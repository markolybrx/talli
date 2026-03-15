import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const AVATAR_COLORS = [
  { bg: "#EEF2FF", text: "#6366F1" },
  { bg: "#ECFDF5", text: "#10B981" },
  { bg: "#FFFBEB", text: "#F59E0B" },
  { bg: "#FFF1F2", text: "#F43F5E" },
  { bg: "#F0FDF4", text: "#22C55E" },
  { bg: "#EFF6FF", text: "#3B82F6" },
];

function getColorForName(name: string) {
  const index =
    name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({ name, src, size = "sm", className }: AvatarProps) {
  const sizes = {
    xs: "w-5 h-5 text-[9px]",
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-11 h-11 text-base",
  };

  const pixelSizes = { xs: 20, sm: 28, md: 36, lg: 44 };

  if (src) {
    return (
      <div
        className={cn(
          "relative rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white",
          sizes[size],
          className
        )}
      >
        <Image
          src={src}
          alt={name ?? "User"}
          width={pixelSizes[size]}
          height={pixelSizes[size]}
          className="object-cover"
        />
      </div>
    );
  }

  const displayName = name ?? "?";
  const colors = getColorForName(displayName);

  return (
    <div
      className={cn(
        "rounded-full flex-shrink-0 flex items-center justify-center font-semibold ring-2 ring-white",
        sizes[size],
        className
      )}
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {getInitials(displayName)}
    </div>
  );
}

export function AvatarGroup({
  users,
  max = 3,
  size = "xs",
}: {
  users: { name?: string | null; src?: string | null }[];
  max?: number;
  size?: "xs" | "sm";
}) {
  const visible = users.slice(0, max);
  const overflow = users.length - max;

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((user, i) => (
        <Avatar key={i} name={user.name} src={user.src} size={size} />
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            "rounded-full bg-gray-100 text-text-secondary font-medium ring-2 ring-white flex items-center justify-center flex-shrink-0",
            size === "xs" ? "w-5 h-5 text-[9px]" : "w-7 h-7 text-xs"
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
