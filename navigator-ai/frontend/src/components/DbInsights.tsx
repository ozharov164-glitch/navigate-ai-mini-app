import { BarChart3, Calendar, Lightbulb, Sparkles, Target, Wallet } from "lucide-react";
import type { DbInsight } from "@/lib/api";
import { Card } from "@/components/ui/Card";

const ICONS: Record<string, typeof Sparkles> = {
  wallet: Wallet,
  calendar: Calendar,
  target: Target,
  chart: BarChart3,
  lightbulb: Lightbulb,
  sparkles: Sparkles,
};

interface Props {
  items: DbInsight[];
}

export function DbInsights({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <Card>
      <p className="section-label mb-3">Insights (без AI)</p>
      <ul className="space-y-2">
        {items.map((i) => {
          const Icon = ICONS[i.icon] || Lightbulb;
          return (
            <li
              key={i.id}
              className="flex gap-3 rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-3 transition hover:border-cyan-400/20"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <p className="text-sm font-medium text-primary">{i.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-secondary">{i.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
