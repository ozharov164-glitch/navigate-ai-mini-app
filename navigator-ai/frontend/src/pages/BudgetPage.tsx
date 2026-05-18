import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PiggyBank, ShoppingBag, TrendingDown, TrendingUp, Wallet } from "lucide-react";
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
        setExpenses(
          e.filter((x) => {
            const d = new Date(x.expense_date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          })
        );
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : "Ошибка загрузки", "error");
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, [showToast]);

  const chartData = useMemo(
    () => stats?.by_category.map((c, i) => ({ ...c, fill: COLORS[i % COLORS.length] })) ?? [],
    [stats]
  );

  const topCategory = stats?.by_category[0];
  const dayOfMonth = new Date().getDate();
  const dailyAvg = stats && dayOfMonth > 0 ? Math.round(stats.total / dayOfMonth) : 0;

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
      <div>
        <h2 className="heading-display flex items-center gap-2">
          <Wallet className="h-5 w-5 text-mint" />
          Бюджет
        </h2>
        <p className="mt-1 text-xs capitalize text-muted">{stats.month_label}</p>
      </div>

      <Card className="budget-hero !p-4">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
          <PiggyBank className="h-3.5 w-3.5 text-mint" />
          Учёт без банка
        </p>
        <p className="mt-2 text-xs leading-relaxed text-secondary">
          Фиксируем то, что вы сами сообщили AI — чеки, голос, текст. Банк показывает списания; здесь — ваши
          намерения и категории в одном месте с задачами.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="!p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Потрачено</p>
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
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Прогноз</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-400">
            {Math.round(stats.forecast).toLocaleString("ru")} ₽
          </p>
          <p className="mt-1 text-[11px] text-muted">~{dailyAvg.toLocaleString("ru")} ₽ в день</p>
        </Card>
      </div>

      {topCategory && (
        <p className="rounded-xl border border-mint/20 bg-mint/5 px-3 py-2 text-xs text-secondary">
          Главная статья: <span className="font-semibold text-primary">{topCategory.category}</span> —{" "}
          {topCategory.total.toLocaleString("ru")} ₽
        </p>
      )}

      {chartData.length > 0 ? (
        <Card>
          <p className="section-label mb-2">Структура расходов</p>
          <div className="relative h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                  stroke="transparent"
                >
                  {chartData.map((entry, i) => (
                    <Cell key={entry.category} fill={entry.fill || COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v.toLocaleString("ru")} ₽`, ""]} />
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
          title="Расходов пока нет"
          description="Напишите «кофе 350₽» или отправьте фото чека на вкладке «Сегодня»"
          hint="AI сам выберет категорию"
        />
      )}

      <Card>
        <p className="section-label mb-3 flex items-center gap-1">
          <ShoppingBag className="h-3 w-3" />
          Операции за месяц
        </p>
        {expenses.length === 0 ? (
          <p className="text-sm text-muted">Появятся после первого разбора</p>
        ) : (
          <ul className="space-y-3">
            {expenses.slice(0, 20).map((e) => (
              <li key={e.id} className="flex items-center gap-3 border-b border-white/[0.05] pb-3 last:border-0 last:pb-0">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-base">
                  {categoryIcon(e.category)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-primary">{e.merchant || e.category}</p>
                  <p className="text-[11px] text-muted">
                    {new Date(e.expense_date).toLocaleDateString("ru", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums text-red-400/90">
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
