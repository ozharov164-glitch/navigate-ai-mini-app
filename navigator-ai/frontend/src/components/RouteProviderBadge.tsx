import { Globe, Link2, MapPin, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

const CONFIG: Record<
  string,
  { label: string; className: string; icon: typeof MapPin }
> = {
  yandex: {
    label: "Яндекс",
    className: "border-amber-400/30 bg-amber-500/15 text-amber-300",
    icon: Navigation,
  },
  osrm: {
    label: "OSRM",
    className: "border-cyan-400/30 bg-cyan-500/15 text-cyan-300",
    icon: Globe,
  },
  link_only: {
    label: "Ссылка",
    className: "border-slate-400/30 bg-white/5 text-slate-400",
    icon: Link2,
  },
  fallback: {
    label: "Fallback",
    className: "border-slate-400/30 bg-white/5 text-slate-400",
    icon: Link2,
  },
};

export function RouteProviderBadge({ provider }: { provider?: string | null }) {
  const key = provider && CONFIG[provider] ? provider : "fallback";
  const c = CONFIG[key];
  const Icon = c.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        c.className
      )}
    >
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}
