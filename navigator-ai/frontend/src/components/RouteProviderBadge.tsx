import { Globe, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function RouteProviderBadge({ provider }: { provider?: string | null }) {
  const isOsrm = provider === "osrm";
  const Icon = isOsrm ? Globe : Link2;
  const label = isOsrm ? "OSM" : "Ссылка";
  const className = isOsrm
    ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-300"
    : "border-slate-400/30 bg-white/5 text-slate-400";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
