import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { api, type Expense } from "@/lib/api";
import { useToast } from "@/components/Toast";

const COLORS = ["#6366f1", "#22d3ee", "#f472b6", "#fbbf24", "#34d399", "#a78bfa"];

export function BudgetPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<{ by_category: { category: string; total: number }[]; total: number; forecast: number } | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);

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
      });
  }, [showToast]);

  if (!stats) return <p className="text-sm text-muted">Загрузка бюджета…</p>;

  return (
    <div className="space-y-4 animate-slide-up">
      <h2 className="text-lg font-semibold text-primary">Бюджет</h2>
      <div className="glass-card grid grid-cols-2 gap-3 p-4">
        <div>
          <p className="text-xs text-muted">Потрачено</p>
          <p className="text-2xl font-bold text-primary">{stats.total.toLocaleString("ru")} ₽</p>
        </div>
        <div>
          <p className="text-xs text-muted">Прогноз</p>
          <p className="text-2xl font-bold text-amber-500">{stats.forecast.toLocaleString("ru")} ₽</p>
        </div>
      </div>

      {stats.by_category.length > 0 && (
        <section className="glass-card h-64 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={stats.by_category} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80}>
                {stats.by_category.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `${v} ₽`} />
            </PieChart>
          </ResponsiveContainer>
        </section>
      )}

      <ul className="space-y-2">
        {stats.by_category.map((c, i) => (
          <li key={c.category} className="glass-card flex justify-between p-3 text-sm">
            <span className="flex items-center gap-2 text-primary">
              <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              {c.category}
            </span>
            <span className="font-medium text-primary">{c.total.toLocaleString("ru")} ₽</span>
          </li>
        ))}
      </ul>

      <section className="glass-card p-4">
        <h3 className="mb-3 text-sm font-medium text-primary">Транзакции</h3>
        {expenses.length === 0 ? (
          <p className="text-sm text-muted">Расходов пока нет — отправьте фото чека боту</p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {expenses.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-2 border-b border-white/5 pb-2 text-sm last:border-0">
                <div>
                  <p className="font-medium text-primary">{e.merchant || e.category}</p>
                  <p className="text-xs text-muted">
                    {e.category} · {new Date(e.expense_date).toLocaleDateString("ru")}
                  </p>
                </div>
                <span className="shrink-0 font-semibold text-emerald-500">−{e.amount.toLocaleString("ru")} ₽</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
