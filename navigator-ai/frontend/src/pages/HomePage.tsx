import { useState } from "react";
import type { Dashboard, Task } from "@/lib/api";
import { api } from "@/lib/api";
import { DbInsights } from "@/components/DbInsights";
import { EmptyState } from "@/components/EmptyState";
import { InputBar } from "@/components/InputBar";
import { TaskRow } from "@/components/TaskRow";
import { useToast } from "@/components/Toast";
import { hapticLight } from "@/lib/telegram";

interface Props {
  data: Dashboard;
  onRefresh: () => void;
  isPremium: boolean;
}

export function HomePage({ data, onRefresh, isPremium }: Props) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const patch = async (task: Task, body: { completed?: boolean; archived?: boolean }) => {
    hapticLight();
    try {
      await api.updateTask(task.id, body);
      await onRefresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
  };

  return (
    <div className="space-y-5 pb-4">
      <InputBar onDone={onRefresh} isPremium={isPremium} busy={busy} onBusy={setBusy} />

      {data.db_insights.length > 0 && <DbInsights items={data.db_insights} />}

      <section>
        <h3 className="section-label mb-3">Задачи на сегодня</h3>
        {data.tasks_today.length === 0 ? (
          <EmptyState
            title="Чистый лист"
            description="Опишите день одной фразой — AI разложит на задачи и напоминания"
            hint="Текст · голос · фото чека"
          />
        ) : (
          <ul className="space-y-2">
            {data.tasks_today.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onComplete={(task) => patch(task, { completed: true })}
                onUndo={(task) => patch(task, { completed: false })}
                onArchive={(task) => patch(task, { archived: true })}
              />
            ))}
          </ul>
        )}
      </section>

      {data.tasks_completed_today.length > 0 && (
        <section>
          <h3 className="section-label mb-3 text-emerald-400/90">Выполнено сегодня</h3>
          <ul className="space-y-2">
            {data.tasks_completed_today.map((t) => (
              <TaskRow
                key={t.id}
                task={{ ...t, completed: true }}
                onComplete={() => {}}
                onUndo={(task) => patch(task, { completed: false })}
                onArchive={(task) => patch(task, { archived: true })}
              />
            ))}
          </ul>
        </section>
      )}

      {data.summary_latest && (
        <p className="summary-snippet">
          {data.summary_latest}
        </p>
      )}
    </div>
  );
}
