import { motion } from "framer-motion";
import { Bell, CheckCircle2, Receipt, Sparkles } from "lucide-react";
import type { AnalyzeResult } from "@/lib/api";

interface Props {
  result: AnalyzeResult;
  onDismiss: () => void;
}

/** Карточка результата разбора — что именно создал AI */
export function AnalyzeResultCard({ result, onDismiss }: Props) {
  const tasks = (result.tasks as { title?: string }[]) ?? [];
  const expenses = (result.expenses as { amount?: number; category?: string }[]) ?? [];
  const reminders = (result.reminders as { title?: string }[]) ?? [];
  const hasItems = tasks.length > 0 || expenses.length > 0 || reminders.length > 0;

  return (
    <motion.div
      className="analyze-result-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
    >
      <motion.div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-mint" />
          <p className="text-sm font-semibold text-primary">Разобрано</p>
        </div>
        <button type="button" className="text-xs text-muted transition hover:text-mint" onClick={onDismiss}>
          Скрыть
        </button>
      </motion.div>

      {result.summary && (
        <p className="mt-2 text-xs leading-relaxed text-secondary">{result.summary}</p>
      )}

      {hasItems && (
        <ul className="mt-3 space-y-2">
          {tasks.map((t, i) => (
            <li key={`t-${i}`} className="flex items-start gap-2 text-xs text-primary">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" />
              {t.title || "Задача"}
            </li>
          ))}
          {expenses.map((e, i) => (
            <li key={`e-${i}`} className="flex items-start gap-2 text-xs text-primary">
              <Receipt className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
              {e.amount != null ? `${e.amount.toLocaleString("ru")} ₽` : ""}
              {e.category ? ` · ${e.category}` : ""}
            </li>
          ))}
          {reminders.map((r, i) => (
            <li key={`r-${i}`} className="flex items-start gap-2 text-xs text-primary">
              <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" />
              {r.title || "Напоминание"}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
