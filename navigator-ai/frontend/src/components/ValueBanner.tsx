import { Clock, Sparkles, Wallet } from "lucide-react";
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
  onUpgrade?: () => void;
}

export function ValueBanner({ minutes, rub, premium, left, limit, used, onUpgrade }: Props) {
  return (
    <motion.section
      className="mx-4 mt-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border p-5 backdrop-blur-2xl",
          premium ? "premium-card" : "border-mint/15 bg-midnight-850/75 shadow-volumetric"
        )}
      >
        <motion.div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-mint/20 bg-mint/10">
            <Sparkles className="h-5 w-5 text-mint" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="section-label">Сэкономлено сегодня</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-primary">
              {minutes > 0 || rub > 0 ? (
                <>
                  {minutes} мин · {rub.toLocaleString("ru")} ₽
                </>
              ) : (
                "Отправьте задачу или чек"
              )}
            </h2>
          </div>
          {premium && <PremiumBadge size="md" />}
        </motion.div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat icon={Clock} value={String(minutes)} label="минут" />
          <Stat icon={Wallet} value={rub.toLocaleString("ru")} label="₽ учтено" />
        </div>

        <div className="mt-4">
          <ProgressBar
            value={used}
            max={limit}
            premium={premium}
            label={premium ? "AI Premium сегодня" : "AI-действия сегодня"}
          />
          <p className="mt-2 text-[11px] text-muted">
            Осталось <span className="font-semibold text-mint">{left}</span> из {limit}
            {!premium && onUpgrade && (
              <>
                {" · "}
                <button type="button" className="font-medium text-gold hover:underline" onClick={onUpgrade}>
                  Premium
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </motion.section>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Clock; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-2.5">
      <Icon className="mb-1 h-3.5 w-3.5 text-mint" strokeWidth={1.75} />
      <p className="text-xl font-semibold tabular-nums text-primary">{value}</p>
      <p className="text-[10px] text-muted">{label}</p>
    </div>
  );
}
