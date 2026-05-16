import { useEffect, useState } from "react";
import { api, type Dashboard } from "@/lib/api";
import { applyTheme, resolveInitialTheme, type AppTheme } from "@/lib/theme";
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
  const [theme, setTheme] = useState<AppTheme>("dark");
  const [moreScroll, setMoreScroll] = useState<"premium" | "privacy" | null>(null);

  const load = async () => {
    try {
      setError(null);
      const d = await api.dashboard();
      setData(d);
      const next = resolveInitialTheme(d.theme);
      setTheme(next);
      applyTheme(next);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка загрузки";
      setError(msg === "Load failed" || msg === "Failed to fetch" ? "Нет связи с сервером" : msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initTelegram();
    const params = new URLSearchParams(window.location.search);
    const page = params.get("page");
    if (page === "privacy" || page === "premium") {
      setTab("more");
      setMoreScroll(page);
    }
    load();
  }, []);

  const onTab = (t: Tab) => {
    hapticLight();
    setTab(t);
  };

  const toggleTheme = async () => {
    const next: AppTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      await api.updateSettings(next);
    } catch {
      /* сохранение темы — best effort */
    }
  };

  if (loading) return <LoadingScreen />;
  if (error && !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <p className="text-red-500">{error}</p>
        <button type="button" className="glass-btn mt-4" onClick={load}>
          Повторить
        </button>
      </div>
    );
  }

  const headerBg = theme === "light" ? "bg-white/90 border-slate-200" : "bg-slate-950/80 border-white/5";
  const subtitleClass = theme === "light" ? "text-slate-500" : "text-slate-400";

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-24 animate-fade-in">
      <header className={`sticky top-0 z-20 border-b px-4 py-3 backdrop-blur-xl ${headerBg}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">НавигаторAI</h1>
            <p className={`text-xs ${subtitleClass}`}>@NavigAI_bot</p>
          </div>
          <button type="button" onClick={toggleTheme} className="glass-btn text-xs" aria-label="Переключить тему">
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
        {tab === "more" && (
          <MorePage
            isPremium={data?.is_premium ?? false}
            onTheme={toggleTheme}
            theme={theme}
            scrollTo={moreScroll}
            onRefresh={load}
          />
        )}
      </main>

      <VoiceFab onDone={load} />
      <BottomNav tab={tab} onChange={onTab} />
    </div>
  );
}
