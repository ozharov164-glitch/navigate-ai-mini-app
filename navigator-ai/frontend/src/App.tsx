import { useEffect, useState } from "react";
import { api, type Dashboard } from "@/lib/api";
import { hapticLight, initTelegram } from "@/lib/telegram";
import { BottomNav } from "@/components/BottomNav";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ValueBanner } from "@/components/ValueBanner";
import { HomePage } from "@/pages/HomePage";
import { CalendarPage } from "@/pages/CalendarPage";
import { BudgetPage } from "@/pages/BudgetPage";
import { RoutesPage } from "@/pages/RoutesPage";
import { MorePage } from "@/pages/MorePage";
import { VoiceFab } from "@/components/VoiceFab";

export type Tab = "home" | "calendar" | "budget" | "routes" | "more";

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const load = async () => {
    try {
      setError(null);
      const d = await api.dashboard();
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initTelegram();
    const params = new URLSearchParams(window.location.search);
    const page = params.get("page");
    if (page === "privacy" || page === "premium") setTab("more");
    load();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    if (theme === "light") {
      document.body.classList.add("bg-slate-100", "text-slate-900");
      document.body.classList.remove("text-slate-100");
    } else {
      document.body.classList.remove("bg-slate-100", "text-slate-900");
      document.body.classList.add("text-slate-100");
    }
  }, [theme]);

  const onTab = (t: Tab) => {
    hapticLight();
    setTab(t);
  };

  const toggleTheme = async () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      await api.updateSettings(next);
    } catch {
      /* offline ok */
    }
  };

  if (loading) return <LoadingScreen />;
  if (error && !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <p className="text-red-400">{error}</p>
        <button className="glass-btn mt-4" onClick={load}>
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-24 animate-fade-in">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-slate-950/80 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">НавигаторAI</h1>
            <p className="text-xs text-slate-400">@NavigAI_bot</p>
          </div>
          <button onClick={toggleTheme} className="glass-btn text-xs">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      {data && <ValueBanner minutes={data.saved_minutes_today} rub={data.saved_rub_today} premium={data.is_premium} left={data.daily_actions_left} />}

      <main className="px-4 py-3">
        {tab === "home" && data && <HomePage data={data} onRefresh={load} />}
        {tab === "calendar" && <CalendarPage tasks={data?.tasks_today ?? []} />}
        {tab === "budget" && <BudgetPage />}
        {tab === "routes" && <RoutesPage routes={data?.routes_recent ?? []} />}
        {tab === "more" && <MorePage isPremium={data?.is_premium ?? false} onTheme={toggleTheme} />}
      </main>

      <VoiceFab onDone={load} />
      <BottomNav tab={tab} onChange={onTab} />
    </div>
  );
}
