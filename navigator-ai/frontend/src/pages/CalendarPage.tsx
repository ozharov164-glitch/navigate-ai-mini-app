import type { Task } from "@/lib/api";

interface Props {
  tasks: Task[];
}

export function CalendarPage({ tasks }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="space-y-4 animate-slide-up">
      <h2 className="text-lg font-semibold">Календарь</h2>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <div key={d.toISOString()} className="glass-card p-2 text-center text-xs">
            <p className="text-slate-400">{d.toLocaleDateString("ru", { weekday: "short" })}</p>
            <p className="font-semibold">{d.getDate()}</p>
          </div>
        ))}
      </div>
      <section className="glass-card p-4">
        <h3 className="mb-2 text-sm font-medium">Задачи с датами</h3>
        {tasks.filter((t) => t.due_date).length === 0 ? (
          <p className="text-sm text-slate-500">Нет запланированных задач</p>
        ) : (
          <ul className="space-y-2">
            {tasks
              .filter((t) => t.due_date)
              .map((t) => (
                <li key={t.id} className="text-sm">
                  <span className="text-indigo-400">{new Date(t.due_date!).toLocaleString("ru")}</span> — {t.title}
                </li>
              ))}
          </ul>
        )}
      </section>
      <a className="glass-btn block text-center text-sm" href={import.meta.env.VITE_API_URL + "/export/ical"}>
        📅 Экспорт iCal
      </a>
    </div>
  );
}
