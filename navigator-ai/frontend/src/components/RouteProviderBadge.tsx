import { Link2, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

/** Только Яндекс или fallback (без выбора пользователем). */
export function RouteProviderBadge({ provider }: { provider?: string | null }) {
  const isYandex = provider === "yandex";
  const Icon = isYandex ? Navigation : Link2;
  const label = isYandex ? "Яндекс" : "Ссылка";
  const className = isYandex
    ? "border-amber-400/30 bg-amber-500/15 text-amber-300"
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
