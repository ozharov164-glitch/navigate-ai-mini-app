export type AppTheme = "dark" | "light";

export function applyTheme(theme: AppTheme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");

  const tg = window.Telegram?.WebApp;
  if (theme === "light") {
    document.body.classList.add("bg-slate-100", "text-slate-900");
    document.body.classList.remove("text-slate-100");
    tg?.setHeaderColor?.("#f1f5f9");
    tg?.setBackgroundColor?.("#f8fafc");
  } else {
    document.body.classList.remove("bg-slate-100", "text-slate-900");
    document.body.classList.add("text-slate-100");
    tg?.setHeaderColor?.("#0f172a");
    tg?.setBackgroundColor?.("#020617");
  }
}

export function resolveInitialTheme(saved?: string | null): AppTheme {
  if (saved === "light" || saved === "dark") return saved;
  const tgScheme = window.Telegram?.WebApp?.colorScheme;
  return tgScheme === "light" ? "light" : "dark";
}
