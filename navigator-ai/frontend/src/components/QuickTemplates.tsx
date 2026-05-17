import { BarChart3, CalendarDays, Receipt } from "lucide-react";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/telegram";

const templates = [
  {
    id: "receipt",
    template: "receipt",
    label: "Разобрать чек",
    desc: "Фото или текст чека",
    icon: Receipt,
    glow: "group-hover:shadow-[0_0_28px_rgba(52,211,153,0.2)]",
    iconBg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  },
  {
    id: "day",
    template: "day_plan",
    label: "План дня",
    desc: "Оптимальный распорядок",
    icon: CalendarDays,
    glow: "group-hover:shadow-[0_0_28px_rgba(0,229,201,0.22)]",
    iconBg: "bg-mint/15 text-accent border-mint/25",
  },
  {
    id: "week",
    template: "week_analysis",
    label: "Анализ недели",
    desc: "Задачи и расходы",
    icon: BarChart3,
    glow: "group-hover:shadow-[0_0_28px_rgba(167,139,250,0.2)]",
    iconBg: "bg-violet-500/15 text-violet-300 border-violet-500/20",
  },
] as const;

const prompts: Record<string, string> = {
  receipt: "Разбери последний чек и добавь расходы по категориям",
  day_plan: "Составь оптимальный план на сегодня с учётом моих задач",
  week_analysis: "Проанализируй мою неделю: задачи, расходы, рекомендации",
};

interface Props {
  onDone: () => void;
  busy?: boolean;
}

export function QuickTemplates({ onDone, busy: externalBusy }: Props) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const lockRef = useRef(0);

  const run = async (template: string) => {
    const now = Date.now();
    if (busy || externalBusy || now - lockRef.current < 2000) return;
    lockRef.current = now;
    hapticLight();
    setBusy(template);
    try {
      const result = await api.analyze(prompts[template] || "", template);
      showToast(result.summary || "Готово!", "success");
      await onDone();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Не удалось выполнить", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      {templates.map((t, i) => {
        const Icon = t.icon;
        const loading = busy === t.template;
        return (
          <motion.button
            key={t.id}
            type="button"
            disabled={!!busy || externalBusy}
            onClick={() => run(t.template)}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 320 }}
            className={cn(
              "group glass-card-interactive flex items-start gap-3 p-3.5 text-left disabled:opacity-50",
              t.glow
            )}
          >
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-shadow duration-300",
                t.iconBg
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-primary">{loading ? "Обработка…" : t.label}</span>
              <span className="mt-0.5 block text-[10px] leading-snug text-muted">{t.desc}</span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
