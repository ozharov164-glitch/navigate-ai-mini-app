import { Crown, Flame, Share2, Sparkles, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/Toast";
import { hapticLight } from "@/lib/telegram";
import type { Achievement } from "@/lib/api";

interface Props {
  minutes: number;
  rub: number;
  streak: number;
  level: number;
  achievements?: Achievement[];
}

export function ShareCard({ minutes, rub, streak, level, achievements = [] }: Props) {
  const { showToast } = useToast();
  const unlocked = achievements.filter((a) => a.unlocked).slice(0, 3);

  const text =
    `Сегодня НавигаторAI сэкономил мне ${minutes} мин и учёл ${rub.toLocaleString("ru")} ₽` +
    ` · streak ${streak} · lvl ${level}` +
    (unlocked.length ? ` · ${unlocked.map((a) => a.title).join(", ")}` : "");

  const share = async () => {
    hapticLight();
    try {
      if (navigator.share) {
        await navigator.share({ title: "НавигаторAI", text });
        return;
      }
    } catch {
      /* fallback */
    }
    await navigator.clipboard.writeText(text);
    showToast("Текст скопирован — вставьте в Stories", "success");
  };

  return (
    <motion.button
      type="button"
      onClick={share}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.98 }}
      className="relative w-full overflow-hidden rounded-2xl border border-cyan-400/20 p-4 text-left"
      style={{
        background:
          "linear-gradient(135deg, rgba(34,211,238,0.12) 0%, rgba(15,23,42,0.95) 40%, rgba(245,200,66,0.08) 100%)",
      }}
    >
      <motion.div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-400/20 blur-2xl"
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <p className="relative flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-mint">
        <Sparkles className="h-3 w-3" />
        Поделиться
      </p>
      <p className="relative mt-2 text-sm font-semibold text-primary">
        Сэкономил {minutes} мин · {rub.toLocaleString("ru")} ₽
      </p>
      <motion.div
        className="relative mt-3 flex flex-wrap gap-2"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">
          <Flame className="h-3 w-3" /> {streak} дн.
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] text-cyan-300">
          <Zap className="h-3 w-3" /> lvl {level}
        </span>
        {unlocked.map((a) => (
          <span
            key={a.id}
            className="inline-flex items-center gap-1 rounded-full border border-premium/30 bg-premium/10 px-2 py-0.5 text-[10px] text-amber-200"
          >
            <Crown className="h-3 w-3" />
            {a.title}
          </span>
        ))}
      </motion.div>
      <span className="relative mt-3 flex items-center justify-center gap-2 text-xs font-medium text-mint">
        <Share2 className="h-4 w-4" />
        Поделиться карточкой
      </span>
    </motion.button>
  );
}
