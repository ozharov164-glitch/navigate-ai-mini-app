import { Share2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import { hapticLight } from "@/lib/telegram";

interface Props {
  minutes: number;
  rub: number;
  streak: number;
  level: number;
}

export function ShareCard({ minutes, rub, streak, level }: Props) {
  const { showToast } = useToast();

  const text = `Сегодня НавигаторAI сэкономил мне ${minutes} мин и учёл ${rub.toLocaleString("ru")} ₽ · streak ${streak} · lvl ${level}`;

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
    <button
      type="button"
      onClick={share}
      className="glass-card-interactive flex w-full items-center justify-center gap-2 p-3 text-sm font-medium text-accent"
    >
      <Share2 className="h-4 w-4" />
      Поделиться результатом дня
    </button>
  );
}
