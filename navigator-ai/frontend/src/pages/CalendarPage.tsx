import { Calendar, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { api, type Task } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

interface Props {
  tasks: Task[];
}

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-400",
  medium: "bg-gold",
  low: "bg-mint",
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
  const selectedKey = selected.toDateString();

  const exportIcal = async () => {
    try {
      await api.downloadExport("/export/ical", "navigai.ics");
      showToast("Откройте файл в календаре (Google, Apple)", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка экспорта", "error");
    }
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
    <motion.div className="space-y-5 pb-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="heading-display flex items-center gap-2">
          <Calendar className="h-5 w-5 text-mint" strokeWidth={1.75} />
          Календарь
        </h2>
        <div className="calendar-nav">
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft className="h-4 w-4 text-secondary" />
          </button>
          <span className="min-w-[120px] px-2 text-center text-sm font-medium capitalize text-primary">{monthLabel}</span>
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            aria-label="Следующий месяц"
          >
            <ChevronRight className="h-4 w-4 text-secondary" />
          </button>
        </div>
      </div>

      <Card padding="sm" className="calendar-shell">
        <motion.div className="mb-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((w) => (
            <span key={w}>{w}</span>
          ))}
        </motion.div>
        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map((day, i) => {
            if (!day) return <div key={`pad-${i}`} className="aspect-square" />;
            const dayTasks = tasksOnDay(day);
            const isSelected = sameDay(day, selected);
            const isToday = sameDay(day, new Date());
            const hasTasks = dayTasks.length > 0;
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelected(day)}
                className={cn(
                  "linear-day relative flex flex-col items-center justify-center",
                  isSelected && "linear-day-selected",
                  !isSelected && "text-slate-400",
                  isToday && !isSelected && "linear-day-today"
                )}
              >
                <span className={cn(isSelected && "text-mint")}>{day.getDate()}</span>
                {hasTasks && (
                  <span className="absolute bottom-1 flex gap-0.5">
                    {dayTasks.slice(0, 3).map((t) => (
                      <span
                        key={t.id}
                        className={cn("h-1 w-1 rounded-full", PRIORITY_DOT[t.priority] || PRIORITY_DOT.low)}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="min-h-[120px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            <h3 className="mb-3 text-sm font-semibold capitalize text-primary">
              {selected.toLocaleDateString("ru", { weekday: "long", day: "numeric", month: "long" })}
            </h3>
            {selectedTasks.length === 0 ? (
              <p className="text-sm text-muted">На этот день задач нет. Добавьте на вкладке «Сегодня».</p>
            ) : (
              <ul className="space-y-3">
                {selectedTasks.map((t) => (
                  <li key={t.id} className="flex gap-3 border-b border-white/[0.06] pb-3 last:border-0 last:pb-0">
                    <span
                      className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT[t.priority] || PRIORITY_DOT.low)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-medium text-primary", t.completed && "line-through text-muted")}>
                        {t.title}
                      </p>
                      {t.due_date && (
                        <p className="mono-time mt-0.5">
                          {new Date(t.due_date).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </AnimatePresence>
      </Card>

      <button type="button" className="glass-btn flex w-full items-center justify-center gap-2 text-sm" onClick={exportIcal}>
        <Download className="h-4 w-4" strokeWidth={1.75} />
        Экспорт в календарь (iCal)
      </button>
    </motion.div>
  );
}
