import { Clock, ExternalLink, MapPin, TrafficCone } from "lucide-react";
import type { Route } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

interface Props {
  routes: Route[];
}

function trafficStyle(level: string | null) {
  const l = (level || "").toLowerCase();
  if (l.includes("высок") || l.includes("heavy") || l.includes("bad")) return "text-red-400 bg-red-500/10";
  if (l.includes("средн") || l.includes("moderate")) return "text-amber-400 bg-amber-500/10";
  return "text-emerald-400 bg-emerald-500/10";
}

export function RoutesPage({ routes }: Props) {
  return (
    <div className="stagger-children space-y-4 pb-2">
      <h2 className="heading-display flex items-center gap-2">
        <MapPin className="h-5 w-5 text-accent" />
        Маршруты
      </h2>

      {routes.length === 0 ? (
        <Card>
          <EmptyState
            icon={MapPin}
            title="Маршрутов пока нет"
            description="Отправьте геопозицию или текст с адресами боту — построю маршрут с пробками"
          />
        </Card>
      ) : (
        routes.map((r) => (
          <article key={r.id} className="glass-card overflow-hidden transition-transform active:scale-[0.99]">
            {r.static_map_url ? (
              <div className="relative">
                <img src={r.static_map_url} alt="" className="h-40 w-full object-cover opacity-90" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-transparent" />
              </div>
            ) : (
              <div className="flex h-28 items-center justify-center bg-gradient-to-br from-cyan-500/10 to-navy-900">
                <MapPin className="h-10 w-10 text-accent/40" />
              </div>
            )}
            <div className="p-4">
              <p className="text-sm font-medium leading-snug text-primary">
                <span className="text-muted">{r.from_address}</span>
                <span className="mx-1.5 text-accent">→</span>
                {r.to_address}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {r.duration_minutes != null && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-xs text-secondary">
                    <Clock className="h-3.5 w-3.5 text-accent" />~{r.duration_minutes} мин
                  </span>
                )}
                {r.traffic_level && (
                  <span className={cn("inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium", trafficStyle(r.traffic_level))}>
                    <TrafficCone className="h-3.5 w-3.5" />
                    {r.traffic_level}
                  </span>
                )}
              </div>
              {r.yandex_maps_url && (
                <a
                  href={r.yandex_maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary mt-4 inline-flex items-center gap-2 !py-2 text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Открыть в Яндекс.Картах
                </a>
              )}
            </div>
          </article>
        ))
      )}
    </div>
  );
}
