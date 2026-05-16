import { Calendar, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, type Task } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

interface Props {
  tasks: Task[];
}

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-400",
  medium: "bg-amber-400",
  low: "bg-cyan-400",
};

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
  const [dayModal, setDayModal] = useState(false);

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

  const openDay = (day: Date) => {
    setSelected(day);
    setDayModal(true);
  };

  if (loading && allTasks.length === 0) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="stagger-children space-y-4 pb-2">
      <div className="flex items-center justify-between">
        <h2 className="heading-display flex items-center gap-2">
          <Calendar className="h-5 w-5 text-accent" />
          Календарь
        </h2>
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-0.5">
          <button type="button" className="rounded-lg p-2 transition hover:bg-white/10" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Предыдущий месяц">
            <ChevronLeft className="h-4 w-4 text-secondary" />
          </button>
          <span className="min-w-[130px] px-1 text-center text-sm font-medium capitalize text-primary">{monthLabel}</span>
          <button type="button" className="rounded-lg p-2 transition hover:bg-white/10" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Следующий месяц">
            <ChevronRight className="h-4 w-4 text-secondary" />
          </button>
        </div>
      </div>

      <Card padding="sm">
        <div className="mb-2 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {daysInMonth.map((day, i) => {
            if (!day) return <div key={`e-${i}`} className="aspect-square" />;
            const dayTasks = tasksOnDay(day);
            const isSelected = sameDay(day, selected);
            const isToday = sameDay(day, new Date());
            const priorities = [...new Set(dayTasks.map((t) => t.priority || "low"))].slice(0, 3);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => openDay(day)}
                className={cn(
                  "linear-day relative flex flex-col items-center justify-center",
                  isSelected && "linear-day-selected font-semibold",
                  !isSelected && "text-primary",
                  isToday && "linear-day-today"
                )}
              >
                <span>{day.getDate()}</span>
                {priorities.length > 0 && (
                  <span className="absolute bottom-1 flex gap-0.5">
                    {priorities.map((p) => (
                      <span key={p} className={cn("h-1 w-1 rounded-full", PRIORITY_DOT[p] || PRIORITY_DOT.low)} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <h3 className="mb-2 text-sm font-semibold text-primary">
          {selected.toLocaleDateString("ru", { weekday: "long", day: "numeric", month: "long" })}
        </h3>
        {selectedTasks.length === 0 ? (
          <p className="text-sm text-muted">Нет задач — нажмите на день в сетке</p>
        ) : (
          <ul className="space-y-2">
            {selectedTasks.map((t) => (
              <li key={t.id} className="flex gap-2 text-sm">
                <span className="mono-time shrink-0">
                  {t.due_date ? new Date(t.due_date).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }) : "—"}
                </span>
                <span className={cn("text-secondary", t.completed && "line-through text-muted")}>{t.title}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <button
        type="button"
        className="glass-btn flex w-full items-center justify-center gap-2 text-sm"
        onClick={() =>
          api.downloadExport("/export/ical", "navigai.ics").catch((e) =>
            showToast(e instanceof Error ? e.message : "Ошибка экспорта", "error")
          )
        }
      >
        <Download className="h-4 w-4" />
        Экспорт iCal
      </button>

      <Modal
        open={dayModal}
        title={selected.toLocaleDateString("ru", { weekday: "long", day: "numeric", month: "long" })}
        message={
          selectedTasks.length === 0 ? (
            <p className="text-muted">На этот день задач нет</p>
          ) : (
            <ul className="max-h-64 space-y-3 overflow-y-auto">
              {selectedTasks.map((t) => (
                <li key={t.id} className="flex gap-3 border-b border-white/5 pb-2 last:border-0">
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT[t.priority] || PRIORITY_DOT.low)} />
                  <div>
                    <p className={cn("font-medium text-primary", t.completed && "line-through text-muted")}>{t.title}</p>
                    {t.due_date && (
                      <p className="text-xs text-muted">
                        {new Date(t.due_date).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )
        }
        confirmLabel="Закрыть"
        onConfirm={() => setDayModal(false)}
        onCancel={() => setDayModal(false)}
      />
    </div>
  );
}
