import { Check } from "lucide-react";
import type { Dashboard, Task } from "@/lib/api";
import { api } from "@/lib/api";
import { QuickTemplates } from "@/components/QuickTemplates";
import { cn } from "@/lib/utils";

interface Props {
  data: Dashboard;
  onRefresh: () => void;
}

export function HomePage({ data, onRefresh }: Props) {
  const toggle = async (task: Task) => {
    await api.toggleTask(task.id, !task.completed);
    onRefresh();
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {data.summary_latest && (
        <section className="glass-card p-4">
          <h2 className="text-sm font-medium text-indigo-300">Последний summary</h2>
          <p className="mt-2 text-sm text-slate-300">{data.summary_latest}</p>
        </section>
      )}

      <section className="glass-card p-4">
        <h2 className="mb-3 text-sm font-medium">Быстрые шаблоны</h2>
        <QuickTemplates onDone={onRefresh} />
      </section>

      <section className="glass-card p-4">
        <h2 className="mb-3 text-sm font-medium">План на сегодня</h2>
        <ul className="space-y-2">
          {data.tasks_today.length === 0 && (
            <p className="text-sm text-slate-500">Задач нет — отправьте боту голосовое или текст</p>
          )}
          {data.tasks_today.map((t) => (
            <li key={t.id}>
              <button
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
                <span className={cn("text-sm", t.completed && "line-through text-slate-500")}>{t.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {data.insights.length > 0 && (
        <section className="glass-card p-4">
          <h2 className="mb-2 text-sm font-medium text-amber-300">Smart Insights</h2>
          <ul className="space-y-2">
            {data.insights.map((i) => (
              <li key={i.id} className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-100/90">
                {i.insight}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
