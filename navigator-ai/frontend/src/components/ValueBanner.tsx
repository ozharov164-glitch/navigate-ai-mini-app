import { Sparkles } from "lucide-react";
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

/** Одна карточка ценности: без дублирования минут/₽ в отдельных блоках */
export function ValueBanner({ minutes, rub, premium, left, limit, used, onUpgrade }: Props) {
  const hasValue = minutes > 0 || rub > 0;

  return (
    <motion.section
      className="mx-4 mt-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={cn(
          "value-banner-card",
          premium && "value-banner-card-premium"
        )}
      >
        <motion.div className="flex items-start justify-between gap-3" initial={false}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-mint/25 bg-mint/10">
            <Sparkles className="h-5 w-5 text-mint" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="section-label">Сэкономлено сегодня</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-primary">
              {hasValue ? (
                <>
                  <span className="text-mint">{minutes}</span>
                  <span className="text-muted font-normal"> мин · </span>
                  <span className="text-mint">{rub.toLocaleString("ru")}</span>
                  <span className="text-muted font-normal"> ₽</span>
                </>
              ) : (
                "Начните с одной заметки"
              )}
            </h2>
            {!hasValue && (
              <p className="mt-1 text-xs text-secondary">
                Текст, голос или фото — AI разложит по задачам и расходам
              </p>
            )}
          </div>
          {premium && <PremiumBadge size="md" />}
        </motion.div>

        <motion.div className="value-banner-divider mt-5 pt-4">
          <ProgressBar
            value={used}
            max={limit}
            premium={premium}
            label={premium ? "AI Premium" : "AI-действия"}
          />
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Осталось <span className="font-semibold text-mint">{left}</span> из {limit}
            {!premium && onUpgrade && (
              <>
                {" · "}
                <button type="button" className="font-medium text-gold transition hover:underline" onClick={onUpgrade}>
                  Premium
                </button>
              </>
            )}
          </p>
        </motion.div>
      </div>
    </motion.section>
  );
}
