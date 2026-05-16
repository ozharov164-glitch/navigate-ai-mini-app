import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { api } from "@/lib/api";

const COLORS = ["#6366f1", "#22d3ee", "#f472b6", "#fbbf24", "#34d399", "#a78bfa"];

export function BudgetPage() {
  const [stats, setStats] = useState<{ by_category: { category: string; total: number }[]; total: number; forecast: number } | null>(null);

  useEffect(() => {
    api.budgetStats().then(setStats).catch(() => setStats({ by_category: [], total: 0, forecast: 0 }));
  }, []);

  if (!stats) return <p className="text-sm text-slate-400">Загрузка бюджета…</p>;

  return (
    <div className="space-y-4 animate-slide-up">
      <h2 className="text-lg font-semibold">Бюджет</h2>
      <div className="glass-card grid grid-cols-2 gap-3 p-4">
        <div>
          <p className="text-xs text-slate-400">Потрачено</p>
          <p className="text-2xl font-bold">{stats.total.toLocaleString("ru")} ₽</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Прогноз</p>
          <p className="text-2xl font-bold text-amber-400">{stats.forecast.toLocaleString("ru")} ₽</p>
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
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              {c.category}
            </span>
            <span className="font-medium">{c.total.toLocaleString("ru")} ₽</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
