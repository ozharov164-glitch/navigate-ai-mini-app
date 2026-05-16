import type { Route } from "@/lib/api";

interface Props {
  routes: Route[];
}

export function RoutesPage({ routes }: Props) {
  return (
    <div className="space-y-4 animate-slide-up">
      <h2 className="text-lg font-semibold">Маршруты</h2>
      {routes.length === 0 && <p className="text-sm text-slate-500">Отправьте геопозицию или текст с адресами боту</p>}
      {routes.map((r) => (
        <article key={r.id} className="glass-card overflow-hidden">
          {r.static_map_url && (
            <img src={r.static_map_url} alt="Карта" className="h-36 w-full object-cover opacity-90" />
          )}
          <div className="p-4">
            <p className="text-sm">
              {r.from_address} → {r.to_address}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              ~{r.duration_minutes} мин · пробки: {r.traffic_level || "—"}
            </p>
            {r.yandex_maps_url && (
              <a href={r.yandex_maps_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-indigo-400">
                Открыть в Яндекс.Картах →
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
