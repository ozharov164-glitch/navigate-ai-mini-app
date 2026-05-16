import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  size?: "sm" | "md";
}

export function PremiumBadge({ className, size = "sm" }: Props) {
  return (
    <span className={cn("premium-badge", size === "md" && "px-3 py-1 text-xs", className)}>
      <Crown className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} />
      Premium
    </span>
  );
}
