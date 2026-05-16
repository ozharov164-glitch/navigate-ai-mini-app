import { getInitData } from "./telegram";

/** Базовый URL API всегда с суффиксом /api (VITE_API_URL может быть с доменом или без). */
export function apiBase(): string {
  const raw = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
  if (raw.endsWith("/api")) return raw;
  if (raw.startsWith("http")) return `${raw}/api`;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

const API = apiBase();

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const initData = getInitData();
  if (!initData) {
    throw new Error("Откройте Mini App из Telegram-бота @NavigAI_bot");
  }

  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
        ...(options.headers as Record<string, string>),
      },
    });
  } catch {
    throw new Error("Нет связи с сервером. Проверьте интернет и повторите.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = err.detail || res.statusText;
    if (res.status === 401) {
      throw new Error(typeof detail === "string" ? detail : "Требуется авторизация Telegram");
    }
    throw new Error(typeof detail === "string" ? detail : "Ошибка запроса");
  }
  return res.json();
}

export interface Dashboard {
  tasks_today: Task[];
  expenses_month: Expense[];
  routes_recent: Route[];
  insights: Insight[];
  summary_latest: string | null;
  saved_minutes_today: number;
  saved_rub_today: number;
  tier: string;
  daily_actions_left: number;
  is_premium: boolean;
  theme: "dark" | "light";
}

export interface AnalyzeResult {
  summary: string;
  tasks: unknown[];
  expenses: unknown[];
  routes: unknown[];
  reminders: unknown[];
  smart_insights: string[];
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  completed: boolean;
  created_at: string;
}

export interface Expense {
  id: number;
  amount: number;
  category: string;
  merchant: string | null;
  expense_date: string;
}

export interface Route {
  id: number;
  from_address: string;
  to_address: string;
  duration_minutes: number | null;
  static_map_url: string | null;
  yandex_maps_url: string | null;
  traffic_level: string | null;
}

export interface Insight {
  id: number;
  insight: string;
  category: string;
  is_read: boolean;
}

export const api = {
  dashboard: () => request<Dashboard>("/dashboard"),
  tasks: () => request<Task[]>("/dashboard/tasks"),
  toggleTask: (id: number, completed: boolean) =>
    request<Task>(`/dashboard/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    }),
  analyze: (text: string, template?: string) =>
    request<AnalyzeResult>("/dashboard/analyze", {
      method: "POST",
      body: JSON.stringify({ text, template }),
    }),

  analyzeVoice: async (blob: Blob, filename = "voice.webm"): Promise<AnalyzeResult> => {
    const initData = getInitData();
    if (!initData) {
      throw new Error("Откройте Mini App из Telegram-бота @NavigAI_bot");
    }
    const form = new FormData();
    form.append("file", blob, filename);

    let res: Response;
    try {
      res = await fetch(`${API}/dashboard/analyze-voice`, {
        method: "POST",
        headers: { "X-Telegram-Init-Data": initData },
        body: form,
      });
    } catch {
      throw new Error("Нет связи с сервером. Проверьте интернет и повторите.");
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const detail = err.detail || res.statusText;
      throw new Error(typeof detail === "string" ? detail : "Ошибка распознавания голоса");
    }
    return res.json();
  },
  budgetStats: () =>
    request<{ by_category: { category: string; total: number }[]; total: number; forecast: number }>(
      "/dashboard/budget-stats"
    ),
  routes: () => request<Route[]>("/dashboard/routes"),
  documents: () => request<{ id: number; title: string; doc_type: string; expiry_date: string | null }[]>("/dashboard/documents"),
  digests: () => request<{ id: number; type: string; content: string; date: string }[]>("/dashboard/digests"),
  places: () => request<{ id: number; name: string; address: string }[]>("/dashboard/places"),
  addPlace: (name: string, address: string) =>
    request("/dashboard/places", { method: "POST", body: JSON.stringify({ name, address }) }),
  privacy: () => request<{ stored_items: string[]; retention_policy: string; encryption: string }>("/dashboard/privacy"),
  deleteAll: () => request("/dashboard/privacy/delete-all", { method: "DELETE" }),
  updateSettings: (theme: string) =>
    request("/dashboard/settings", { method: "PATCH", body: JSON.stringify({ theme }) }),
  /** Скачивание файла экспорта с авторизацией initData */
  downloadExport: async (path: "/export/ical" | "/export/pdf", filename: string) => {
    const initData = getInitData();
    if (!initData) {
      throw new Error("Откройте Mini App из Telegram-бота @NavigAI_bot");
    }
    const res = await fetch(`${API}${path}`, {
      headers: { "X-Telegram-Init-Data": initData },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(typeof err.detail === "string" ? err.detail : "Ошибка экспорта");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
  starsInvoice: (tier: string) =>
    request("/payments/stars-invoice", { method: "POST", body: JSON.stringify({ tier }) }),
  yookassa: (tier: string) =>
    request<{ confirmation_url: string }>("/payments/yookassa", { method: "POST", body: JSON.stringify({ tier }) }),
};
