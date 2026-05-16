import { Check, Sparkles } from "lucide-react";
import { CommandBar } from "@/components/CommandBar";
import { useState } from "react";
import type { Dashboard, Task } from "@/lib/api";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { QuickTemplates } from "@/components/QuickTemplates";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";
import { displayName, timeGreeting } from "@/lib/greeting";
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
    hapticLight();
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

  const completedToday = data.tasks_today.filter((t) => t.completed).length;

  return (
    <div className="stagger-children space-y-4 pb-2">
      <div className="px-0.5">
        <h2 className="heading-display">
          {timeGreeting()}, {displayName()}!
        </h2>
        <p className="mt-1 text-sm text-secondary">
          {data.saved_minutes_today > 0 || data.saved_rub_today > 0
            ? `Сегодня AI уже сэкономил ${data.saved_minutes_today} мин и учёл ${data.saved_rub_today.toLocaleString("ru")} ₽`
            : "Кидай голосовое или текст — я всё разложу по полочкам"}
        </p>
      </div>

      {data.summary_latest && (
        <Card>
          <p className="section-label mb-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Последний summary
          </p>
          <p className="text-sm leading-relaxed text-secondary">{data.summary_latest}</p>
        </Card>
      )}

      <Card>
        <p className="section-label mb-3">Быстрые шаблоны</p>
        <QuickTemplates onDone={onRefresh} />
      </Card>

      <Card>
        <p className="section-label mb-3">AI-команда</p>
        <CommandBar
          value={aiText}
          onChange={setAiText}
          onSubmit={submitAi}
          busy={aiBusy}
          placeholder="Завтра в 10 встреча с врачом, купить молоко…"
        />
        <p className="mt-2 text-[10px] text-muted">Enter — отправить · микрофон внизу — голос</p>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <p className="section-label">План на сегодня</p>
          {data.tasks_today.length > 0 && (
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-muted">
              {completedToday}/{data.tasks_today.length}
            </span>
          )}
        </div>
        {data.tasks_today.length === 0 ? (
          <EmptyState
            title="Пока пусто"
            description="Кидай голосовое в бота или нажми микрофон внизу — я всё сделаю"
          />
        ) : (
          <ul className="space-y-1">
            {data.tasks_today.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => toggle(t)}
                  className="group flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-white/[0.04] active:scale-[0.99]"
                >
                  <span className={cn("task-checkbox", t.completed && "checked")}>
                    {t.completed && <Check className="h-3 w-3 text-emerald-400" strokeWidth={3} />}
                  </span>
                  <span
                    className={cn(
                      "text-sm leading-snug text-primary transition-all",
                      t.completed && "text-muted line-through"
                    )}
                  >
                    {t.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {data.insights.length > 0 && (
        <Card>
          <p className="section-label mb-3 text-amber-400/90">Smart Insights</p>
          <ul className="space-y-2">
            {data.insights.map((i) => (
              <li key={i.id} className="insight-card">
                {i.insight}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
