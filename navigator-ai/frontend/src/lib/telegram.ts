/** Инициализация Telegram Mini App SDK */
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe?: { user?: { first_name?: string; last_name?: string } };
        colorScheme: "light" | "dark";
        themeParams: Record<string, string>;
        ready: () => void;
        expand: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        HapticFeedback?: { impactOccurred: (style: string) => void };
        openInvoice?: (url: string, callback?: (status: string) => void) => void;
        openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
        onEvent?: (event: string, handler: () => void) => void;
        offEvent?: (event: string, handler: () => void) => void;
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
  tg.setHeaderColor(light ? "#f1f5f9" : "#0a0f1f");
  tg.setBackgroundColor(light ? "#f8fafc" : "#020617");
}

export function hapticLight(): void {
  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
}

export function openExternalLink(url: string): void {
  const tg = window.Telegram?.WebApp;
  if (tg?.openLink) {
    tg.openLink(url, { try_instant_view: false });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export function openStarsInvoice(invoiceUrl: string): Promise<"paid" | "cancelled" | "failed"> {
  return new Promise((resolve) => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.openInvoice) {
      resolve("failed");
      return;
    }
    tg.openInvoice(invoiceUrl, (status) => {
      if (status === "paid") resolve("paid");
      else if (status === "cancelled") resolve("cancelled");
      else resolve("failed");
    });
  });
}
