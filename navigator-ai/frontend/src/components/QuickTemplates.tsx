import { useState } from "react";
import { api } from "@/lib/api";
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
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const run = async (template: string) => {
    if (busy) return;
    hapticLight();
    setBusy(template);
    setToast(null);
    try {
      const result = await api.analyze(prompts[template] || "", template);
      setToast(result.summary || "Готово!");
      await onDone();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Не удалось выполнить");
    } finally {
      setBusy(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div>
      {toast && (
        <p className="mb-2 rounded-lg bg-indigo-500/20 px-3 py-2 text-xs text-indigo-200">{toast}</p>
      )}
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
    </div>
  );
}
