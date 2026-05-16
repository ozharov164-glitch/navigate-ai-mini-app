import { Clock, Flame, Sparkles, Wallet, Zap } from "lucide-react";
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

export function ValueBanner({ minutes, rub, premium, left, limit, used, streak, level = 1, onUpgrade }: Props) {
  return (
    <motion.div
      className="mx-4 mt-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
    >
      <motion.div
        className={cn(
          "relative overflow-hidden rounded-2xl border p-4 shadow-card backdrop-blur-xl",
          premium
            ? "border-premium/30 bg-gradient-to-br from-amber-500/20 via-navy-900/95 to-navy-950"
            : "border-cyan-400/25 bg-gradient-to-br from-cyan-500/12 via-indigo-950/50 to-navy-950"
        )}
        whileHover={{ scale: 1.005 }}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />
        <motion.div
          className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-premium/15 blur-2xl"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        <motion.div
          className="relative flex items-start justify-between gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
        >
          <div>
            <p className="section-label flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Ваша ценность сегодня
            </p>
            <div className="mt-3 flex flex-wrap gap-4">
              <Stat icon={Clock} value={`${minutes}`} unit="мин" label="сэкономлено" accent="cyan" />
              <Stat icon={Wallet} value={rub.toLocaleString("ru")} unit="₽" label="учтено" accent="emerald" />
              <Stat icon={Flame} value={`${streak}`} unit="" label="streak" accent="amber" />
              <Stat icon={Zap} value={`${level}`} unit="lvl" label="уровень" accent="cyan" />
            </div>
          </div>
          {premium && <PremiumBadge size="md" />}
        </motion.div>

        <motion.div
          className="relative mt-4"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <ProgressBar
            value={used}
            max={limit}
            premium={premium}
            label={premium ? "Premium AI сегодня" : "AI-действия сегодня"}
          />
          <p className="mt-1.5 text-[10px] text-muted">
            {premium ? (
              <>Осталось {left} из {limit} · расширенный лимит Premium</>
            ) : (
              <>
                Осталось {left} из {limit} ·{" "}
                <button type="button" className="text-accent hover:underline" onClick={onUpgrade}>
                  Premium — до 50/день + голос/фото
                </button>
              </>
            )}
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
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
    <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 400 }}>
      <motion.div className="flex items-baseline gap-1" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
        <Icon className={cn("mb-0.5 h-3.5 w-3.5", valueColor)} />
        <span className={cn("text-2xl font-bold tabular-nums tracking-tight", valueColor)}>{value}</span>
        {unit && <span className="text-sm font-medium text-muted">{unit}</span>}
      </motion.div>
      <p className="text-[10px] text-muted">{label}</p>
    </motion.div>
  );
}
