import { Globe, Map } from "lucide-react";
import { cn } from "@/lib/utils";

export function RouteProviderBadge({ provider }: { provider?: string | null }) {
  const isOsrm = provider === "osrm";
  const Icon = isOsrm ? Globe : Map;
  const label = isOsrm ? "OSM" : "Ссылка";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md",
        isOsrm
          ? "border-mint/30 bg-midnight-900/80 text-mint shadow-[0_0_16px_rgba(0,229,201,0.15)]"
          : "border-white/15 bg-midnight-900/70 text-slate-400"
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2} />
      {label}
    </span>
  );
}
