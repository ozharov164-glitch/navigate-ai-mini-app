import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import { api, type Expense } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/Toast";
const COLORS = ["#22d3ee", "#34d399", "#f5c842", "#a78bfa", "#f472b6", "#fb923c"];

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

export function BudgetPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<{ by_category: { category: string; total: number }[]; total: number; forecast: number } | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.budgetStats(), api.expenses()])
      .then(([s, e]) => {
        setStats(s);
        setExpenses(e);
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : "Ошибка загрузки", "error");
        setStats({ by_category: [], total: 0, forecast: 0 });
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

  return (
    <div className="stagger-children space-y-4 pb-2">
      <h2 className="heading-display flex items-center gap-2">
        <Wallet className="h-5 w-5 text-accent" />
        Бюджет
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <Card className="!p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Потрачено</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{stats.total.toLocaleString("ru")} ₽</p>
        </Card>
        <Card className="!p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-amber-400" />
            Прогноз
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-400">{stats.forecast.toLocaleString("ru")} ₽</p>
        </Card>
      </div>

      {chartData.length > 0 && (
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
                    background: "rgba(10, 15, 31, 0.95)",
                    border: "1px solid rgba(34,211,238,0.2)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-muted">всего</span>
              <span className="text-lg font-bold text-primary">{stats.total.toLocaleString("ru")} ₽</span>
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {stats.by_category.map((c, i) => (
              <li key={c.category} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-primary">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span>{categoryIcon(c.category)}</span>
                  {c.category}
                </span>
                <span className="font-semibold tabular-nums">{c.total.toLocaleString("ru")} ₽</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <p className="section-label mb-4 flex items-center gap-1">
          <ShoppingBag className="h-3 w-3" />
          Транзакции
        </p>
        {expenses.length === 0 ? (
          <p className="text-sm text-muted">Расходов пока нет — отправьте фото чека боту</p>
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
                    {e.category} · {new Date(e.expense_date).toLocaleDateString("ru", { day: "numeric", month: "short" })}
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
