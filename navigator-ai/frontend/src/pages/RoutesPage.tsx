import { Clock, ExternalLink, MapPin, TrafficCone } from "lucide-react";
import { motion } from "framer-motion";
import type { Route } from "@/lib/api";
import { RouteProviderBadge } from "@/components/RouteProviderBadge";
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
      <motion.h2
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="heading-display flex items-center gap-2"
      >
        <MapPin className="h-5 w-5 text-accent" />
        Маршруты
      </motion.h2>

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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.99 }}
            className="glass-card overflow-hidden"
          >
            <motion.div
              className="relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              {r.static_map_url ? (
                <>
                  <img
                    src={r.static_map_url}
                    alt=""
                    className="h-44 w-full object-cover"
                    loading="lazy"
                  />
                  <motion.div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/20 to-transparent"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                  <motion.div
                    className="absolute left-3 top-3"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, delay: 0.15 }}
                  >
                    <RouteProviderBadge provider={r.route_provider} />
                  </motion.div>
                </>
              ) : (
                <motion.div
                  className="relative flex h-32 items-center justify-center bg-gradient-to-br from-cyan-500/15 via-indigo-500/10 to-navy-900"
                  animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                  transition={{ duration: 8, repeat: Infinity }}
                >
                  <MapPin className="h-10 w-10 text-accent/40" />
                  <motion.div className="absolute left-3 top-3">
                    <RouteProviderBadge provider={r.route_provider} />
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
            <motion.div className="p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
              <p className="text-sm font-medium leading-snug text-primary">
                <span className="text-muted">{r.from_address}</span>
                <span className="mx-1.5 text-accent">→</span>
                {r.to_address}
              </p>
              <motion.div
                className="mt-3 flex flex-wrap items-center gap-2"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18 }}
              >
                {r.duration_minutes != null && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-xs text-secondary">
                    <Clock className="h-3.5 w-3.5 text-accent" />~{r.duration_minutes} мин
                  </span>
                )}
                {r.distance_km != null && (
                  <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-muted">{r.distance_km} км</span>
                )}
                {r.traffic_level && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium",
                      trafficStyle(r.traffic_level)
                    )}
                  >
                    <TrafficCone className="h-3.5 w-3.5" />
                    {r.traffic_level}
                  </span>
                )}
              </motion.div>
              {r.yandex_maps_url && (
                <motion.a
                  href={r.yandex_maps_url}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-primary mt-4 inline-flex items-center gap-2 !py-2 text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Открыть маршрут
                </motion.a>
              )}
            </motion.div>
          </motion.article>
        ))
      )}
    </div>
  );
}
