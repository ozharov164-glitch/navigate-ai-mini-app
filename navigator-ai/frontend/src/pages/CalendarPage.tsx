import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, type Task } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

interface Props {
  tasks: Task[];
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function CalendarPage({ tasks: initialTasks }: Props) {
  const { showToast } = useToast();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [allTasks, setAllTasks] = useState<Task[]>(initialTasks);
  const [selected, setSelected] = useState<Date>(() => new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .tasks()
      .then(setAllTasks)
      .catch((e) => showToast(e instanceof Error ? e.message : "Ошибка загрузки", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  const daysInMonth = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(year, m, 1);
    const last = new Date(year, m + 1, 0);
    const startPad = (first.getDay() + 6) % 7;
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, m, d));
    return cells;
  }, [month]);

  const tasksOnDay = (day: Date) =>
    allTasks.filter((t) => t.due_date && sameDay(new Date(t.due_date), day));

  const monthLabel = month.toLocaleDateString("ru", { month: "long", year: "numeric" });
  const selectedTasks = tasksOnDay(selected);

  const prevMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const nextMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">Календарь</h2>
        <div className="flex items-center gap-1">
          <button type="button" className="glass-btn p-2" onClick={prevMonth} aria-label="Предыдущий месяц">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[120px] text-center text-sm capitalize text-secondary">{monthLabel}</span>
          <button type="button" className="glass-btn p-2" onClick={nextMonth} aria-label="Следующий месяц">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <section className="glass-card p-3">
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] text-muted">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;
            const count = tasksOnDay(day).length;
            const isSelected = sameDay(day, selected);
            const isToday = sameDay(day, new Date());
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelected(day)}
                className={cn(
                  "relative rounded-lg p-1.5 text-center text-xs transition",
                  isSelected ? "bg-indigo-500/30 ring-1 ring-indigo-400" : "hover:bg-white/5",
                  isToday && !isSelected && "ring-1 ring-indigo-400/50"
                )}
              >
                <span className="font-semibold text-primary">{day.getDate()}</span>
                {count > 0 && (
                  <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-indigo-400" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="glass-card p-4">
        <h3 className="mb-2 text-sm font-medium text-primary">
          {selected.toLocaleDateString("ru", { weekday: "long", day: "numeric", month: "long" })}
        </h3>
        {loading && <p className="text-sm text-muted">Загрузка…</p>}
        {!loading && selectedTasks.length === 0 && (
          <p className="text-sm text-muted">Нет задач на этот день</p>
        )}
        <ul className="space-y-2">
          {selectedTasks.map((t) => (
            <li key={t.id} className="text-sm text-secondary">
              <span className="text-accent">{t.due_date ? new Date(t.due_date).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
              {" — "}
              <span className={cn(t.completed && "line-through text-muted")}>{t.title}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-card p-4">
        <h3 className="mb-2 text-sm font-medium text-primary">Все задачи ({allTasks.length})</h3>
        {allTasks.length === 0 ? (
          <p className="text-sm text-muted">Задач пока нет</p>
        ) : (
          <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
            {allTasks.map((t) => (
              <li key={t.id} className={cn("text-secondary", t.completed && "line-through text-muted")}>
                {t.due_date ? new Date(t.due_date).toLocaleDateString("ru") : "без даты"} — {t.title}
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        className="glass-btn w-full text-center text-sm"
        onClick={() =>
          api.downloadExport("/export/ical", "navigai.ics").catch((e) =>
            showToast(e instanceof Error ? e.message : "Ошибка экспорта", "error")
          )
        }
      >
        📅 Экспорт iCal
      </button>
    </div>
  );
}
