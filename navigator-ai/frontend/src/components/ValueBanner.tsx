import { Clock, Flame, Sparkles, Wallet } from "lucide-react";
import { PremiumBadge } from "@/components/PremiumBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";

const FREE_DAILY = 20;

interface Props {
  minutes: number;
  rub: number;
  premium: boolean;
  left: number;
  streak: number;
  onUpgrade?: () => void;
}

export function ValueBanner({ minutes, rub, premium, left, streak, onUpgrade }: Props) {
  const used = premium ? 0 : Math.max(0, FREE_DAILY - left);

  return (
    <div className="mx-4 mt-3 animate-slide-up">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border p-4 shadow-card backdrop-blur-xl",
          premium
            ? "border-premium/30 bg-gradient-to-br from-amber-500/15 via-navy-900/90 to-navy-950/95"
            : "border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-navy-900/80 to-navy-950/90"
        )}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-2">
          <div>
            <p className="section-label flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Ваша ценность сегодня
            </p>
            <div className="mt-3 flex flex-wrap gap-4">
              <Stat icon={Clock} value={`${minutes}`} unit="мин" label="сэкономлено" />
              <Stat icon={Wallet} value={rub.toLocaleString("ru")} unit="₽" label="учтено" accent="emerald" />
              {streak > 0 && (
                <Stat icon={Flame} value={`${streak}`} unit="" label={streak === 1 ? "день" : "дней"} accent="amber" />
              )}
            </div>
          </div>
          {premium && <PremiumBadge size="md" />}
        </div>

        {!premium && (
          <div className="relative mt-4">
            <ProgressBar value={used} max={FREE_DAILY} label="AI-действия сегодня" />
            <p className="mt-1.5 text-[10px] text-muted">
              Осталось {left} из {FREE_DAILY} ·{" "}
              <button type="button" className="text-accent underline-offset-2 hover:underline" onClick={onUpgrade}>
                Безлимит в Premium
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  unit,
  label,
  accent = "cyan",
}: {
  icon: typeof Clock;
  value: string;
  unit: string;
  label: string;
  accent?: "cyan" | "emerald" | "amber";
}) {
  const valueColor =
    accent === "emerald" ? "text-emerald-400" : accent === "amber" ? "text-amber-400" : "text-accent";
  return (
    <div>
      <div className="flex items-baseline gap-1">
        <Icon className={cn("mb-0.5 h-3.5 w-3.5", valueColor)} />
        <span className={cn("text-2xl font-bold tabular-nums tracking-tight", valueColor)}>{value}</span>
        {unit && <span className="text-sm font-medium text-muted">{unit}</span>}
      </div>
      <p className="text-[10px] text-muted">{label}</p>
    </div>
  );
}
