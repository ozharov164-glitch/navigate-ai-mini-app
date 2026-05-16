export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="h-12 w-12 animate-pulse rounded-full bg-indigo-500/30 ring-2 ring-indigo-400/50" />
      <p className="text-sm text-slate-400">Загружаем ваш дашборд…</p>
    </div>
  );
}
