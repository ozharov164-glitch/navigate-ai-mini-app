import { useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { hapticLight } from "@/lib/telegram";

const templates = [
  { id: "receipt", label: "🧾 Разобрать чек", template: "receipt" },
  { id: "day", label: "📅 Планирование дня", template: "day_plan" },
  { id: "week", label: "📊 Анализ недели", template: "week_analysis" },
];

const prompts: Record<string, string> = {
  receipt: "Разбери последний чек и добавь расходы по категориям",
  day_plan: "Составь оптимальный план на сегодня с учётом моих задач",
  week_analysis: "Проанализируй мою неделю: задачи, расходы, рекомендации",
};

interface Props {
  onDone: () => void;
}

export function QuickTemplates({ onDone }: Props) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (template: string) => {
    if (busy) return;
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
    <div className="flex flex-wrap gap-2">
      {templates.map((t) => (
        <button
          key={t.id}
          type="button"
          className="glass-btn text-xs disabled:opacity-50"
          disabled={!!busy}
          onClick={() => run(t.template)}
        >
          {busy === t.template ? "⏳ Обработка…" : t.label}
        </button>
      ))}
    </div>
  );
}
