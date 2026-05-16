import { Sparkles } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-accent/40" />
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 ring-1 ring-accent/30">
          <Sparkles className="h-7 w-7 text-accent animate-pulse-soft" />
        </div>
      </div>
      <div className="w-full max-w-xs space-y-2">
        <div className="skeleton mx-auto h-3 w-32" />
        <div className="skeleton h-12 w-full rounded-xl" />
        <div className="skeleton h-24 w-full rounded-2xl" />
      </div>
      <p className="text-sm text-muted">Загружаем ваш дашборд…</p>
    </div>
  );
}
