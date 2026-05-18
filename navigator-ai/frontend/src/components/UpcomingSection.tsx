import { Bell, CalendarClock } from "lucide-react";
import type { Reminder, Task } from "@/lib/api";

interface Props {
  reminders: Reminder[];
  tasksWithDue: Task[];
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString("ru", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Блок «Скоро»: напоминания и задачи с дедлайном */
export function UpcomingSection({ reminders, tasksWithDue }: Props) {
  const items = [
    ...reminders.map((r) => ({
      key: `r-${r.id}`,
      icon: Bell,
      title: r.title,
      when: fmt(r.remind_at),
      kind: "reminder" as const,
    })),
    ...tasksWithDue
      .filter((t) => t.due_date && !t.completed)
      .slice(0, 8)
      .map((t) => ({
        key: `t-${t.id}`,
        icon: CalendarClock,
        title: t.title,
        when: fmt(t.due_date!),
        kind: "task" as const,
      })),
  ].sort((a, b) => a.when.localeCompare(b.when));

  if (items.length === 0) return null;

  return (
    <section>
      <h3 className="section-label mb-3">Скоро</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.key} className="task-row flex items-center gap-3 !py-2.5">
            <item.icon className="h-4 w-4 shrink-0 text-mint" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-primary">{item.title}</p>
              <p className="text-[11px] text-muted">{item.when}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
