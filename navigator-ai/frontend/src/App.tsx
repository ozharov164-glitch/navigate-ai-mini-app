import { lazy, Suspense, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { api, type Dashboard } from "@/lib/api";
import { applyTheme, resolveInitialTheme, watchTelegramTheme, type AppTheme } from "@/lib/theme";
import { updateVisitStreak } from "@/lib/streak";
import { hapticLight, initTelegram } from "@/lib/telegram";
import { BottomNav } from "@/components/BottomNav";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PageShell } from "@/components/PageShell";
import { ValueBanner } from "@/components/ValueBanner";
import { PremiumBadge } from "@/components/PremiumBadge";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { HomePage } from "@/pages/HomePage";
import { CalendarPage } from "@/pages/CalendarPage";
import { RoutesPage } from "@/pages/RoutesPage";
import { MorePage } from "@/pages/MorePage";
import { VoiceFab } from "@/components/VoiceFab";

const BudgetPage = lazy(() => import("@/pages/BudgetPage").then((m) => ({ default: m.BudgetPage })));

export type Tab = "home" | "calendar" | "budget" | "routes" | "more";

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<AppTheme>("dark");
  const [moreScroll, setMoreScroll] = useState<"premium" | "privacy" | null>(null);
  const [streak, setStreak] = useState(1);

  const load = async () => {
    try {
      setError(null);
      const d = await api.dashboard();
      setData(d);
      const next = resolveInitialTheme(d.theme);
      setTheme(next);
      applyTheme(next);
      setStreak(d.gamification?.streak ?? updateVisitStreak());
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
    return watchTelegramTheme((t) => {
      setTheme(t);
      applyTheme(t);
    });
  }, []);

  const onTab = (t: Tab) => {
    hapticLight();
    setTab(t);
    if (t !== "more") setMoreScroll(null);
  };

  const goPremium = () => {
    setTab("more");
    setMoreScroll("premium");
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-red-400">{error}</p>
        <button type="button" className="btn-primary" onClick={load}>
          Повторить
        </button>
      </div>
    );
  }

  const headerBg =
    theme === "light"
      ? "border-slate-200/80 bg-white/90"
      : "border-white/[0.06] bg-navy-900/85";

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-32 animate-fade-in">
      <header className={`sticky top-0 z-20 border-b px-4 py-3 backdrop-blur-2xl ${headerBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/30 to-cyan-600/10 ring-1 ring-cyan-400/30">
              <Sparkles className="h-4 w-4 text-accent" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-primary">НавигаторAI</h1>
              <p className="font-mono text-[10px] text-muted">@NavigAI_bot</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data?.is_premium && <PremiumBadge />}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm transition hover:bg-white/10 active:scale-95"
              aria-label="Переключить тему"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </header>

      {data && (
        <ValueBanner
          minutes={data.saved_minutes_today}
          rub={data.saved_rub_today}
          premium={data.is_premium}
          left={data.daily_actions_left}
          limit={data.daily_actions_limit}
          used={data.daily_actions_used}
          streak={data.gamification?.streak ?? streak}
          level={data.gamification?.level ?? 1}
          onUpgrade={goPremium}
        />
      )}

      <main className="px-4 py-3">
        <PageShell tabKey={tab}>
          {tab === "home" && data && <HomePage data={data} onRefresh={load} />}
          {tab === "calendar" && <CalendarPage tasks={data?.tasks_today ?? []} />}
          {tab === "budget" && (
            <Suspense
              fallback={
                <div className="space-y-4">
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              }
            >
              <BudgetPage />
            </Suspense>
          )}
          {tab === "routes" && <RoutesPage routes={data?.routes_recent ?? []} />}
          {tab === "more" && (
            <MorePage
              isPremium={data?.is_premium ?? false}
              routeProvider={data?.route_provider ?? "auto"}
              onTheme={toggleTheme}
              theme={theme}
              scrollTo={moreScroll}
              onRefresh={load}
            />
          )}
        </PageShell>
      </main>

      <VoiceFab onDone={load} />
      <BottomNav tab={tab} onChange={onTab} />
    </div>
  );
}
