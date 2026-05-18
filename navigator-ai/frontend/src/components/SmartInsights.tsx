import { Lightbulb } from "lucide-react";
import type { Insight } from "@/lib/api";

interface Props {
  items: Insight[];
}

export function SmartInsights({ items }: Props) {
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="section-label mb-3">AI-инсайты</h3>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.id} className="glass-card p-3.5 text-xs leading-relaxed text-secondary">
            <Lightbulb className="mb-1.5 h-3.5 w-3.5 text-gold" />
            {i.insight}
          </li>
        ))}
      </ul>
    </section>
  );
}
