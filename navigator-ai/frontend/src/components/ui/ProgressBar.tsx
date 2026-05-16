import { cn } from "@/lib/utils";

interface Props {
  value: number;
  max: number;
  premium?: boolean;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, max, premium, label, className }: Props) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="mb-1 flex justify-between text-[10px] text-muted">
          <span>{label}</span>
          <span>
            {value}/{max}
          </span>
        </div>
      )}
      <div className="progress-track">
        <div
          className={cn("progress-fill h-full", premium && "progress-fill-premium")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
