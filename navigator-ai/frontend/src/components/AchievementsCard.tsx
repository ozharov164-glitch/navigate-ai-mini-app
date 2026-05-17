import { Lock, Sparkles, Trophy } from "lucide-react";
import { motion } from "framer-motion";
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
      <div className="mb-4 flex items-center justify-between">
        <p className="section-label flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-gold" strokeWidth={1.75} />
          Достижения
        </p>
        <span className="rounded-full border border-gold/20 bg-gold/10 px-2.5 py-0.5 text-[10px] font-semibold text-gold">
          Ур. {g.level}
        </span>
      </div>
      <ProgressBar
        value={g.xp_in_level}
        max={g.xp_in_level + g.xp_to_next}
        premium
        label={`${g.xp} XP · до следующего уровня`}
      />
      <p className="mt-2 text-[10px] text-muted">
        {unlocked}/{g.achievements.length} разблокировано
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-2.5">
        {g.achievements.map((a, i) => (
          <AchievementTile key={a.id} item={a} index={i} />
        ))}
      </ul>
    </Card>
  );
}

function AchievementTile({ item, index }: { item: Achievement; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ scale: 1.02 }}
      className={cn(item.unlocked ? "achievement-unlocked" : "achievement-locked")}
    >
      <motion.div className="flex items-start gap-2.5">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            item.unlocked
              ? "border-gold/30 bg-gold/15 text-gold"
              : "border-white/[0.06] bg-white/[0.03] text-slate-500"
          )}
        >
          {item.unlocked ? (
            <Trophy className="h-4 w-4" strokeWidth={1.75} />
          ) : (
            <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary">{item.title}</p>
          <p className="mt-0.5 text-[10px] leading-snug text-muted">{item.description}</p>
          {item.unlocked && (
            <p className="mt-1 flex items-center gap-0.5 text-[9px] font-medium uppercase tracking-wider text-gold/80">
              <Sparkles className="h-2.5 w-2.5" />
              Получено
            </p>
          )}
        </div>
      </motion.div>
    </motion.li>
  );
}
