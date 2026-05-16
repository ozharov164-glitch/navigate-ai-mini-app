import { api } from "@/lib/api";
import { hapticLight } from "@/lib/telegram";

const templates = [
  { id: "receipt", label: "🧾 Разобрать чек", template: "receipt" },
  { id: "day", label: "📅 Планирование дня", template: "day_plan" },
  { id: "week", label: "📊 Анализ недели", template: "week_analysis" },
];

interface Props {
  onDone: () => void;
}

export function QuickTemplates({ onDone }: Props) {
  const run = async (template: string) => {
    hapticLight();
    const prompts: Record<string, string> = {
      receipt: "Разбери последний чек и добавь расходы",
      day_plan: "Составь план на сегодня",
      week_analysis: "Проанализируй мою неделю",
    };
    await api.analyze(prompts[template] || "", template);
    onDone();
  };

  return (
    <div className="flex flex-wrap gap-2">
      {templates.map((t) => (
        <button key={t.id} className="glass-btn text-xs" onClick={() => run(t.template)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
