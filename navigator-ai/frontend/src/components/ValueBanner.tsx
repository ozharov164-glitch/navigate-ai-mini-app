import { Clock, Flame, Sparkles, TrendingUp, Wallet, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { PremiumBadge } from "@/components/PremiumBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";

interface Props {
  minutes: number;
  rub: number;
  premium: boolean;
  left: number;
  limit: number;
  used: number;
  streak: number;
  level?: number;
  onUpgrade?: () => void;
}

export function ValueBanner({
  minutes,
  rub,
  premium,
  left,
  limit,
  used,
  streak,
  level = 1,
  onUpgrade,
}: Props) {
  const streakGoal = 7;
  const streakPct = Math.min(100, (streak / streakGoal) * 100);
  const levelPct = Math.min(100, ((level % 10) / 10) * 100 || 40);

  return (
    <motion.section
      className="mx-4 mt-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border p-5 backdrop-blur-2xl",
          premium ? "premium-card" : "border-mint/20 bg-midnight-850/80"
        )}
        style={
          !premium
            ? {
                boxShadow:
                  "0 20px 50px -12px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,229,201,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
              }
            : undefined
        }
      >
        <motion.div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-mint/10 blur-3xl"
          animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.05, 1] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        {premium && (
          <motion.div
            className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-gold/15 blur-2xl"
            animate={{ opacity: [0.2, 0.45, 0.2] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        )}

        <motion.div
          className="relative flex items-start justify-between gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.06 }}
        >
          <motion.div
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-mint/20 bg-mint/10"
            whileHover={{ scale: 1.05 }}
          >
            <Sparkles className="h-5 w-5 text-mint" strokeWidth={1.75} />
          </motion.div>
          <motion.div className="min-w-0 flex-1">
            <p className="section-label">Ваша ценность сегодня</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-primary">
              {minutes > 0 || rub > 0 ? "AI работает на вас" : "Начните с одной команды"}
            </h2>
          </motion.div>
          {premium && <PremiumBadge size="md" />}
        </motion.div>

        <motion.div
          className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <HeroStat icon={Clock} value={String(minutes)} suffix="мин" label="сэкономлено" tone="mint" />
          <HeroStat icon={Wallet} value={rub.toLocaleString("ru")} suffix="₽" label="учтено" tone="emerald" />
          <HeroStat icon={Flame} value={String(streak)} suffix="" label="streak" tone="gold" />
          <HeroStat icon={Zap} value={String(level)} suffix="lvl" label="уровень" tone="mint" />
        </motion.div>

        <motion.div
          className="relative mt-5 space-y-3 rounded-2xl border border-white/[0.05] bg-black/20 p-3.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.16 }}
        >
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-muted">
            <span className="flex items-center gap-1">
              <Flame className="h-3 w-3 text-gold" />
              Streak · {streak} дн.
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-mint" />
              Уровень {level}
            </span>
          </div>
          <ProgressBar value={streakPct} max={100} variant="streak" showLabel={false} />
          <ProgressBar value={levelPct} max={100} premium={premium} label={`Уровень ${level}`} showLabel={false} className="opacity-80" />
        </motion.div>

        <motion.div
          className="relative mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.22 }}
        >
          <ProgressBar
            value={used}
            max={limit}
            premium={premium}
            label={premium ? "Premium AI сегодня" : "AI-действия сегодня"}
          />
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            {premium ? (
              <>
                Осталось <span className="font-semibold text-mint">{left}</span> из {limit}
              </>
            ) : (
              <>
                Осталось <span className="font-semibold text-mint">{left}</span> из {limit} ·{" "}
                <button type="button" className="font-medium text-gold hover:underline" onClick={onUpgrade}>
                  Premium — до 50/день
                </button>
              </>
            )}
          </p>
        </motion.div>
      </div>
    </motion.section>
  );
}

function HeroStat({
  icon: Icon,
  value,
  suffix,
  label,
  tone,
}: {
  icon: typeof Clock;
  value: string;
  suffix: string;
  label: string;
  tone: "mint" | "emerald" | "gold";
}) {
  const colors = {
    mint: "text-mint",
    emerald: "text-emerald-400",
    gold: "text-gold",
  };
  return (
    <motion.div
      className="rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-2.5"
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,229,201,0.08)" }}
      transition={{ type: "spring", stiffness: 400 }}
    >
      <Icon className={cn("mb-1 h-3.5 w-3.5", colors[tone])} strokeWidth={1.75} />
      <p className="flex items-baseline gap-0.5">
        <span className={cn("text-xl font-semibold tabular-nums tracking-tight", colors[tone])}>{value}</span>
        {suffix && <span className="text-xs font-medium text-muted">{suffix}</span>}
      </p>
      <p className="mt-0.5 text-[10px] text-muted">{label}</p>
    </motion.div>
  );
}
