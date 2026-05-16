import { getInitData } from "./telegram";

const API = import.meta.env.VITE_API_URL || "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": getInitData(),
      ...(options.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Ошибка запроса");
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
    request("/dashboard/analyze", {
      method: "POST",
      body: JSON.stringify({ text, template }),
    }),
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
  exportIcal: () => `${API}/export/ical`,
  exportPdf: () => `${API}/export/pdf`,
  starsInvoice: (tier: string) =>
    request("/payments/stars-invoice", { method: "POST", body: JSON.stringify({ tier }) }),
  yookassa: (tier: string) =>
    request<{ confirmation_url: string }>("/payments/yookassa", { method: "POST", body: JSON.stringify({ tier }) }),
};
