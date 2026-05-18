import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ShoppingBag, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { api, type Expense } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/Toast";

const COLORS = ["#00E5C9", "#34d399", "#FFB800", "#a78bfa", "#5CEBD9", "#fb923c"];

const CATEGORY_ICONS: Record<string, string> = {
  еда: "🍽",
  продукты: "🛒",
  транспорт: "🚇",
  развлечения: "🎬",
  здоровье: "💊",
  одежда: "👕",
  жильё: "🏠",
  связь: "📱",
};

function categoryIcon(cat: string) {
  const key = cat.toLowerCase();
  for (const [k, icon] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return icon;
  }
  return "💳";
}

type Stats = Awaited<ReturnType<typeof api.budgetStats>>;

export function BudgetPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.budgetStats(), api.expenses()])
      .then(([s, e]) => {
        setStats(s);
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();
        setExpenses(
          e.filter((x) => {
            const d = new Date(x.expense_date);
            return d.getMonth() === month && d.getFullYear() === year;
          })
        );
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : "Ошибка загрузки", "error");
        setStats(null);
        setExpenses([]);
      })
      .finally(() => setLoading(false));
  }, [showToast]);

  const chartData = useMemo(
    () => stats?.by_category.map((c, i) => ({ ...c, fill: COLORS[i % COLORS.length] })) ?? [],
    [stats]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!stats) return null;

  const delta = stats.delta_pct;
  const deltaUp = delta != null && delta > 0;

  return (
    <div className="space-y-4 pb-2">
      <h2 className="heading-display flex items-center gap-2">
        <Wallet className="h-5 w-5 text-mint" />
        Бюджет
      </h2>
      <p className="text-xs capitalize text-muted">{stats.month_label}</p>

      <div className="grid grid-cols-2 gap-3">
        <Card className="!p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">За месяц</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{stats.total.toLocaleString("ru")} ₽</p>
          {delta != null && (
            <p className={`mt-1 flex items-center gap-1 text-[11px] ${deltaUp ? "text-red-400" : "text-emerald-400"}`}>
              {deltaUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {delta > 0 ? "+" : ""}
              {delta}% к прошлому месяцу
            </p>
          )}
        </Card>
        <Card className="!p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Прогноз на месяц</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-400">
            {Math.round(stats.forecast).toLocaleString("ru")} ₽
          </p>
          <p className="mt-1 text-[11px] text-muted">Прошлый: {stats.prev_month_total.toLocaleString("ru")} ₽</p>
        </Card>
      </div>

      {chartData.length > 0 ? (
        <Card>
          <p className="section-label mb-2">По категориям</p>
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                  stroke="transparent"
                >
                  {chartData.map((entry, i) => (
                    <Cell key={entry.category} fill={entry.fill || COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [`${v.toLocaleString("ru")} ₽`, ""]}
                  contentStyle={{
                    background: "rgba(10, 15, 28, 0.95)",
                    border: "1px solid rgba(0,229,201,0.2)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-muted">месяц</span>
              <span className="text-lg font-bold text-primary">{stats.total.toLocaleString("ru")} ₽</span>
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {stats.by_category.map((c, i) => (
              <li key={c.category} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-primary">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {categoryIcon(c.category)} {c.category}
                </span>
                <span className="font-semibold tabular-nums">{c.total.toLocaleString("ru")} ₽</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EmptyState
          title="Нет расходов за месяц"
          description="AI добавит расходы из текста, голоса или фото чека на вкладке «Сегодня»"
          hint="Не дублируем банк — фиксируем то, что вы сами сообщили"
        />
      )}

      <Card>
        <p className="section-label mb-4 flex items-center gap-1">
          <ShoppingBag className="h-3 w-3" />
          Транзакции · этот месяц
        </p>
        {expenses.length === 0 ? (
          <p className="text-sm text-muted">Пока пусто</p>
        ) : (
          <ul className="relative space-y-0">
            {expenses.map((e, idx) => (
              <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                {idx < expenses.length - 1 && <span className="timeline-line" aria-hidden />}
                <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-sm ring-1 ring-white/10">
                  {categoryIcon(e.category)}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-primary">{e.merchant || e.category}</p>
                  <p className="text-xs text-muted">
                    {e.category} ·{" "}
                    {new Date(e.expense_date).toLocaleDateString("ru", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <span className="shrink-0 pt-0.5 text-sm font-bold tabular-nums text-red-400">
                  −{e.amount.toLocaleString("ru")} ₽
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
