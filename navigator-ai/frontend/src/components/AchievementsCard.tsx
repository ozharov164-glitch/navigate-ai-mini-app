import { Lock, Trophy } from "lucide-react";
import type { Achievement, Gamification } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";

interface Props {
  g: Gamification;
}

export function AchievementsCard({ g }: Props) {
  const unlocked = g.achievements.filter((a) => a.unlocked).length;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="section-label flex items-center gap-1">
          <Trophy className="h-3.5 w-3.5 text-premium" />
          Уровень {g.level}
        </p>
        <span className="text-[10px] text-muted">
          {unlocked}/{g.achievements.length} достижений
        </span>
      </div>
      <ProgressBar value={g.xp_in_level} max={g.xp_in_level + g.xp_to_next} label={`XP · ${g.xp}`} premium />
      <ul className="mt-4 grid grid-cols-2 gap-2">
        {g.achievements.map((a) => (
          <AchievementTile key={a.id} item={a} />
        ))}
      </ul>
    </Card>
  );
}

function AchievementTile({ item }: { item: Achievement }) {
  return (
    <li
      className={cn(
        "rounded-xl border p-2.5 text-left transition",
        item.unlocked
          ? "border-premium/30 bg-gradient-to-br from-amber-500/15 to-transparent"
          : "border-white/5 bg-white/[0.02] opacity-60"
      )}
    >
      <div className="flex items-start gap-2">
        {item.unlocked ? (
          <Trophy className="h-4 w-4 shrink-0 text-premium" />
        ) : (
          <Lock className="h-4 w-4 shrink-0 text-muted" />
        )}
        <div>
          <p className="text-xs font-semibold text-primary">{item.title}</p>
          <p className="mt-0.5 text-[10px] leading-snug text-muted">{item.description}</p>
        </div>
      </div>
    </li>
  );
}
