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
    gradient: "from-emerald-500/20 to-teal-500/5",
    iconColor: "text-emerald-400",
  },
  {
    id: "day",
    template: "day_plan",
    label: "План дня",
    desc: "Оптимальный распорядок",
    icon: CalendarDays,
    gradient: "from-cyan-500/20 to-blue-500/5",
    iconColor: "text-cyan-400",
  },
  {
    id: "week",
    template: "week_analysis",
    label: "Анализ недели",
    desc: "Задачи и расходы",
    icon: BarChart3,
    gradient: "from-violet-500/20 to-purple-500/5",
    iconColor: "text-violet-400",
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
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {templates.map((t) => {
        const Icon = t.icon;
        const loading = busy === t.template;
        return (
          <motion.button
            key={t.id}
            type="button"
            disabled={!!busy || externalBusy}
            onClick={() => run(t.template)}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: templates.indexOf(t) * 0.05 }}
            className={cn(
              "glass-card-interactive flex items-start gap-3 p-3 text-left disabled:opacity-60",
              `bg-gradient-to-br ${t.gradient}`
            )}
          >
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5", t.iconColor)}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-primary">{loading ? "Обработка…" : t.label}</span>
              <span className="mt-0.5 block text-[10px] text-muted">{t.desc}</span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
