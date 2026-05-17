import { lazy, Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Sun, Moon } from "lucide-react";
import { api, type Dashboard } from "@/lib/api";
import { applyTheme, resolveInitialTheme, watchTelegramTheme, type AppTheme } from "@/lib/theme";
import { hapticLight, initTelegram } from "@/lib/telegram";
import { BottomNav } from "@/components/BottomNav";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PageShell } from "@/components/PageShell";
import { ValueBanner } from "@/components/ValueBanner";
import { PremiumBadge } from "@/components/PremiumBadge";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { HomePage } from "@/pages/HomePage";
import { CalendarPage } from "@/pages/CalendarPage";
import { SettingsPage } from "@/pages/SettingsPage";

const BudgetPage = lazy(() => import("@/pages/BudgetPage").then((m) => ({ default: m.BudgetPage })));

export type Tab = "home" | "calendar" | "budget" | "settings";

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<AppTheme>("dark");
  const [settingsScroll, setSettingsScroll] = useState<"premium" | "privacy" | null>(null);

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
      setTab("settings");
      setSettingsScroll(page);
    }
    load();
    return watchTelegramTheme((t) => {
      setTheme(t);
      applyTheme(t);
    });
  }, []);

  const onTab = (t: Tab) => {
    if (t === tab) return;
    hapticLight();
    setTab(t);
    if (t !== "settings") setSettingsScroll(null);
  };

  const goPremium = () => {
    setTab("settings");
    setSettingsScroll("premium");
    setTimeout(() => document.getElementById("premium-section")?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const toggleTheme = async () => {
    const next: AppTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      await api.updateSettings({ theme: next });
    } catch {
      /* best effort */
    }
  };

  if (loading) return <LoadingScreen />;
  if (error && !data) {
    return (
      <motion.div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-red-400">{error}</p>
        <button type="button" className="btn-primary" onClick={load}>
          Повторить
        </button>
      </motion.div>
    );
  }

  return (
    <div className="app-root mx-auto min-h-screen max-w-lg pb-28">
      <header className="app-header sticky top-0 z-20 border-b px-4 py-3 backdrop-blur-2xl">
        <motion.div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-mint/20 bg-mint/10 shadow-glow-sm">
              <Sparkles className="h-4 w-4 text-mint" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-primary">НавигаторAI</h1>
              <p className="font-mono text-[10px] text-muted">@NavigAI_bot</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data?.is_premium && <PremiumBadge />}
            <button
              type="button"
              onClick={toggleTheme}
              className="glass-btn flex h-10 w-10 items-center justify-center !p-0"
              aria-label="Переключить тему"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-mint" />}
            </button>
          </div>
        </motion.div>
      </header>

      {data && tab === "home" && (
        <ValueBanner
          minutes={data.saved_minutes_today}
          rub={data.saved_rub_today}
          premium={data.is_premium}
          left={data.daily_actions_left}
          limit={data.daily_actions_limit}
          used={data.daily_actions_used}
          onUpgrade={goPremium}
        />
      )}

      <main className="px-4 py-3">
        <PageShell tabKey={tab}>
          {tab === "home" && data && (
            <HomePage data={data} onRefresh={load} isPremium={data.is_premium} />
          )}
          {tab === "calendar" && (
            <CalendarPage tasks={[...(data?.tasks_today ?? []), ...(data?.tasks_completed_today ?? [])]} />
          )}
          {tab === "budget" && (
            <Suspense
              fallback={
                <div className="space-y-4">
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              }
            >
              <BudgetPage isPremium={data?.is_premium ?? false} onRefresh={load} />
            </Suspense>
          )}
          {tab === "settings" && (
            <SettingsPage
              isPremium={data?.is_premium ?? false}
              timezone={data?.timezone ?? "Europe/Moscow"}
              onTheme={toggleTheme}
              theme={theme}
              scrollTo={settingsScroll}
              onRefresh={load}
            />
          )}
        </PageShell>
      </main>

      <BottomNav tab={tab} onChange={onTab} />
    </div>
  );
}
