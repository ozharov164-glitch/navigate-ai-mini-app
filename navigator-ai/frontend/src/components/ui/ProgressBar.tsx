import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  max: number;
  premium?: boolean;
  variant?: "default" | "streak" | "premium";
  label?: string;
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max,
  premium,
  variant = "default",
  label,
  showLabel = true,
  className,
}: Props) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const fillClass =
    variant === "streak"
      ? "progress-fill-streak"
      : premium || variant === "premium"
        ? "progress-fill-premium"
        : "progress-fill";

  return (
    <motion.div className={cn("w-full", className)}>
      {label && showLabel && (
        <div className="mb-1.5 flex justify-between text-[10px] font-medium text-muted">
          <span>{label}</span>
          <span className="tabular-nums">
            {value}/{max}
          </span>
        </div>
      )}
      <motion.div className="progress-track">
        <motion.div
          className={cn("h-full", fillClass)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </motion.div>
    </motion.div>
  );
}
