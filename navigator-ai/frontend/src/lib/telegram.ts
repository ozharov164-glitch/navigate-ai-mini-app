/** Инициализация Telegram Mini App SDK */
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        colorScheme: "light" | "dark";
        themeParams: Record<string, string>;
        ready: () => void;
        expand: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        HapticFeedback?: { impactOccurred: (style: string) => void };
        openInvoice?: (url: string) => void;
      };
    };
  }
}

export function getInitData(): string {
  return window.Telegram?.WebApp?.initData ?? "";
}

export function initTelegram(): void {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  tg.ready();
  tg.expand();
  const light = tg.colorScheme === "light";
  tg.setHeaderColor(light ? "#f1f5f9" : "#0f172a");
  tg.setBackgroundColor(light ? "#f8fafc" : "#020617");
}

export function hapticLight(): void {
  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
}
