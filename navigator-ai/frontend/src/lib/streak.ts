const KEY = "navigai_visit_streak";

/** Client-only streak — no API calls */
export function updateVisitStreak(): number {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? (JSON.parse(raw) as { last: string; count: number }) : null;
    if (!data) {
      localStorage.setItem(KEY, JSON.stringify({ last: today, count: 1 }));
      return 1;
    }
    if (data.last === today) return data.count;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    const next = data.last === yStr ? data.count + 1 : 1;
    localStorage.setItem(KEY, JSON.stringify({ last: today, count: next }));
    return next;
  } catch {
    return 1;
  }
}
