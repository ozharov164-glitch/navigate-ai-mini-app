import { Check, Send } from "lucide-react";
import { useState } from "react";
import type { Dashboard, Task } from "@/lib/api";
import { api } from "@/lib/api";
import { QuickTemplates } from "@/components/QuickTemplates";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/telegram";

interface Props {
  data: Dashboard;
  onRefresh: () => void;
}

export function HomePage({ data, onRefresh }: Props) {
  const { showToast } = useToast();
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const toggle = async (task: Task) => {
    try {
      await api.toggleTask(task.id, !task.completed);
      onRefresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
  };

  const submitAi = async () => {
    const text = aiText.trim();
    if (!text || aiBusy) return;
    hapticLight();
    setAiBusy(true);
    try {
      const result = await api.analyze(text);
      showToast(result.summary || "Готово!", "success");
      setAiText("");
      await onRefresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка AI", "error");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {data.summary_latest && (
        <section className="glass-card p-4">
          <h2 className="text-sm font-medium text-accent">Последний summary</h2>
          <p className="mt-2 text-sm text-secondary">{data.summary_latest}</p>
        </section>
      )}

      <section className="glass-card p-4">
        <h2 className="mb-2 text-sm font-medium text-primary">AI-запрос</h2>
        <p className="mb-2 text-xs text-muted">Текст, заметка или команда — бот разберёт в задачи и расходы</p>
        <textarea
          className="input-field min-h-[72px] resize-none"
          placeholder="Например: завтра в 10 встреча с врачом, купить молоко…"
          value={aiText}
          onChange={(e) => setAiText(e.target.value)}
          disabled={aiBusy}
        />
        <button
          type="button"
          className="glass-btn mt-2 flex w-full items-center justify-center gap-2 text-sm disabled:opacity-50"
          disabled={aiBusy || !aiText.trim()}
          onClick={submitAi}
        >
          {aiBusy ? "⏳ Обработка…" : (
            <>
              <Send className="h-4 w-4" /> Отправить AI
            </>
          )}
        </button>
      </section>

      <section className="glass-card p-4">
        <h2 className="mb-3 text-sm font-medium text-primary">Быстрые шаблоны</h2>
        <QuickTemplates onDone={onRefresh} />
      </section>

      <section className="glass-card p-4">
        <h2 className="mb-3 text-sm font-medium text-primary">План на сегодня</h2>
        <ul className="space-y-2">
          {data.tasks_today.length === 0 && (
            <p className="text-sm text-muted">Задач нет — отправьте боту голосовое или текст</p>
          )}
          {data.tasks_today.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => toggle(t)}
                className="flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-white/5"
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                    t.completed ? "border-emerald-500 bg-emerald-500/20" : "border-slate-500"
                  )}
                >
                  {t.completed && <Check className="h-3 w-3 text-emerald-400" />}
                </span>
                <span className={cn("text-sm text-primary", t.completed && "line-through text-muted")}>{t.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {data.insights.length > 0 && (
        <section className="glass-card p-4">
          <h2 className="mb-2 text-sm font-medium text-amber-400">Smart Insights</h2>
          <ul className="space-y-2">
            {data.insights.map((i) => (
              <li key={i.id} className="insight-card rounded-lg p-3 text-sm">
                {i.insight}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
