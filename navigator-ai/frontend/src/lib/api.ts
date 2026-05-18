import { getInitData } from "./telegram";

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
    throw new Error(typeof detail === "string" ? detail : "Ошибка запроса");
  }
  return res.json();
}

export interface DbInsight {
  id: string;
  title: string;
  body: string;
  icon: string;
}

export interface Reminder {
  id: number;
  title: string;
  remind_at: string;
  sent: boolean;
}

export interface Dashboard {
  tasks_today: Task[];
  tasks_completed_today: Task[];
  reminders_upcoming: Reminder[];
  expenses_month: Expense[];
  insights: Insight[];
  db_insights: DbInsight[];
  summary_latest: string | null;
  saved_minutes_today: number;
  saved_rub_today: number;
  tier: string;
  daily_actions_left: number;
  daily_actions_limit: number;
  daily_actions_used: number;
  is_premium: boolean;
  theme: "dark" | "light";
  timezone: string;
  proactive_enabled: boolean;
  referral_code: string;
  referrals_count: number;
}

export interface AnalyzeResult {
  summary: string;
  tasks: unknown[];
  expenses: unknown[];
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
  archived?: boolean;
  completed_at?: string | null;
  created_at: string;
}

export interface Expense {
  id: number;
  amount: number;
  category: string;
  merchant: string | null;
  expense_date: string;
}

export interface Insight {
  id: number;
  insight: string;
  category: string;
  is_read: boolean;
}

export const TIMEZONES = [
  "Europe/Moscow",
  "Europe/Kaliningrad",
  "Europe/Samara",
  "Asia/Yekaterinburg",
  "Asia/Omsk",
  "Asia/Krasnoyarsk",
  "Asia/Irkutsk",
  "Asia/Yakutsk",
  "Asia/Vladivostok",
  "Asia/Kamchatka",
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "Asia/Dubai",
  "Asia/Tokyo",
];

export const api = {
  dashboard: () => request<Dashboard>("/dashboard"),
  tasks: () => request<Task[]>("/dashboard/tasks"),
  updateTask: (id: number, body: { completed?: boolean; archived?: boolean }) =>
    request<Task>(`/dashboard/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  analyze: (text: string, template?: string) =>
    request<AnalyzeResult>("/dashboard/analyze", {
      method: "POST",
      body: JSON.stringify({ text, template }),
    }),
  analyzeVoice: async (blob: Blob, filename = "voice.webm"): Promise<AnalyzeResult> => {
    const initData = getInitData();
    if (!initData) throw new Error("Откройте Mini App из Telegram-бота @NavigAI_bot");
    const form = new FormData();
    form.append("file", blob, filename);
    const res = await fetch(`${API}/dashboard/analyze-voice`, {
      method: "POST",
      headers: { "X-Telegram-Init-Data": initData },
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(typeof err.detail === "string" ? err.detail : "Ошибка распознавания");
    }
    return res.json();
  },
  analyzePhoto: async (file: File, text?: string): Promise<AnalyzeResult> => {
    const initData = getInitData();
    if (!initData) throw new Error("Откройте Mini App из Telegram-бота @NavigAI_bot");
    const form = new FormData();
    form.append("file", file);
    if (text) form.append("text", text);
    const res = await fetch(`${API}/dashboard/analyze-photo`, {
      method: "POST",
      headers: { "X-Telegram-Init-Data": initData },
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(typeof err.detail === "string" ? err.detail : "Ошибка анализа фото");
    }
    return res.json();
  },
  budgetStats: () =>
    request<{
      by_category: { category: string; total: number }[];
      total: number;
      prev_month_total: number;
      delta_pct: number | null;
      forecast: number;
      month_label: string;
    }>("/dashboard/budget-stats"),
  addExpense: (body: { amount: number; category: string; merchant?: string; description?: string }) =>
    request<Expense>("/dashboard/expenses", { method: "POST", body: JSON.stringify(body) }),
  expenses: () => request<Expense[]>("/dashboard/expenses"),
  reminders: () => request<Reminder[]>("/dashboard/reminders"),
  privacy: () =>
    request<{ stored_items: string[]; retention_policy: string; encryption: string; server_location: string }>(
      "/dashboard/privacy"
    ),
  deleteAll: () => request("/dashboard/privacy/delete-all", { method: "DELETE" }),
  updateSettings: (payload: { theme?: string; timezone?: string; proactive_enabled?: boolean }) =>
    request("/dashboard/settings", { method: "PATCH", body: JSON.stringify(payload) }),
  downloadExport: async (path: "/export/ical" | "/export/pdf", filename: string) => {
    const initData = getInitData();
    if (!initData) throw new Error("Откройте Mini App из Telegram-бота @NavigAI_bot");
    const res = await fetch(`${API}${path}`, { headers: { "X-Telegram-Init-Data": initData } });
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
    request<{ invoice_url: string }>("/payments/stars-invoice", { method: "POST", body: JSON.stringify({ tier }) }),
  yookassa: (tier: string) =>
    request<{ confirmation_url: string; payment_id: string }>("/payments/yookassa", {
      method: "POST",
      body: JSON.stringify({ tier }),
    }),
  confirmYookassa: (tier: string, paymentId: string) =>
    request<{ ok: boolean }>("/payments/confirm", {
      method: "POST",
      body: JSON.stringify({ tier, payment_id: paymentId }),
    }),
};
