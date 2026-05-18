import { AlertTriangle, BarChart3, Calendar, Crown, Flame, Lightbulb, MapPin, Sparkles, Target, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import type { DbInsight } from "@/lib/api";
import { Card } from "@/components/ui/Card";

const ICONS: Record<string, typeof Sparkles> = {
  wallet: Wallet,
  calendar: Calendar,
  target: Target,
  chart: BarChart3,
  lightbulb: Lightbulb,
  sparkles: Sparkles,
  alert: AlertTriangle,
  map: MapPin,
  flame: Flame,
  crown: Crown,
};

interface Props {
  items: DbInsight[];
}

export function DbInsights({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <Card>
      <p className="section-label mb-3">Из ваших данных</p>
      <ul className="space-y-2">
        {items.map((i, idx) => {
          const Icon = ICONS[i.icon] || Lightbulb;
          return (
            <motion.li
              key={i.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.01 }}
              className="flex gap-3 rounded-xl border border-cyan-400/10 bg-gradient-to-r from-cyan-400/8 to-transparent p-3"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 + idx * 0.05 }}>
                <p className="text-sm font-medium text-primary">{i.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-secondary">{i.body}</p>
              </motion.div>
            </motion.li>
          );
        })}
      </ul>
    </Card>
  );
}
