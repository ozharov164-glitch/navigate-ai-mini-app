import { ArrowRight, Clock, ExternalLink, MapPin, TrafficCone } from "lucide-react";
import { motion } from "framer-motion";
import type { Route } from "@/lib/api";
import { RouteProviderBadge } from "@/components/RouteProviderBadge";
import { RouteMapPreview } from "@/components/RouteMapPreview";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

interface Props {
  routes: Route[];
}

function trafficStyle(level: string | null) {
  const l = (level || "").toLowerCase();
  if (l.includes("высок") || l.includes("heavy") || l.includes("bad"))
    return "text-red-400 bg-red-500/10 border-red-500/20";
  if (l.includes("средн") || l.includes("moderate"))
    return "text-amber-400 bg-amber-500/10 border-amber-500/20";
  return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
}

export function RoutesPage({ routes }: Props) {
  return (
    <div className="stagger-children space-y-5 pb-2">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="heading-display flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-mint/20 bg-mint/10">
            <MapPin className="h-4.5 w-4.5 text-mint" strokeWidth={1.75} />
          </span>
          Маршруты
        </h2>
        <p className="mt-1.5 text-sm text-muted">OSM-маршрут · открытие в Яндекс.Картах</p>
      </motion.div>

      {routes.length === 0 ? (
        <Card>
          <EmptyState
            icon={MapPin}
            title="Маршрутов пока нет"
            description="Отправьте геопозицию или текст с адресами боту — построю маршрут"
          />
        </Card>
      ) : (
        routes.map((r, i) => (
          <motion.article
            key={r.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 300 }}
            whileHover={{ y: -2 }}
            className="route-card"
          >
            <div className="route-map-frame">
              {r.static_map_url ? (
                <>
                  <RouteMapPreview url={r.static_map_url} className="h-48 w-full object-cover" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-midnight via-midnight/40 to-transparent" />
                  <motion.div
                    className="absolute left-3 top-3 z-10"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                  >
                    <RouteProviderBadge provider={r.route_provider} />
                  </motion.div>
                </>
              ) : (
                <div className="flex h-48 items-center justify-center bg-gradient-to-br from-mint/10 via-midnight-850 to-midnight">
                  <MapPin className="h-12 w-12 text-mint/25" strokeWidth={1.25} />
                  <div className="absolute left-3 top-3">
                    <RouteProviderBadge provider={r.route_provider} />
                  </div>
                </div>
              )}
            </div>

            <motion.div className="p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
              <p className="text-sm font-medium leading-relaxed text-primary">
                <span className="text-muted line-clamp-2">{r.from_address}</span>
                <span className="my-1.5 flex items-center gap-1 text-mint">
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                </span>
                <span className="line-clamp-2">{r.to_address}</span>
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {r.duration_minutes != null && (
                  <span className="route-stat-pill">
                    <Clock className="h-3.5 w-3.5 text-mint" strokeWidth={1.75} />
                    ~{r.duration_minutes} мин
                  </span>
                )}
                {r.distance_km != null && (
                  <span className="route-stat-pill tabular-nums">{r.distance_km} км</span>
                )}
                {r.traffic_level && (
                  <span className={cn("route-stat-pill border", trafficStyle(r.traffic_level))}>
                    <TrafficCone className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {r.traffic_level}
                  </span>
                )}
              </div>

              {r.yandex_maps_url && (
                <motion.a
                  href={r.yandex_maps_url}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 !py-2.5 text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Открыть в Яндекс.Картах
                </motion.a>
              )}
            </motion.div>
          </motion.article>
        ))
      )}
    </div>
  );
}
