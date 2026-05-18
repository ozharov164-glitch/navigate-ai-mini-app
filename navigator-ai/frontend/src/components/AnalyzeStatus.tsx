import { motion } from "framer-motion";
import { FileText, ImageIcon, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export type AnalyzeKind = "text" | "photo" | "voice";

const LABELS: Record<AnalyzeKind, string> = {
  text: "Разбираю текст…",
  photo: "Анализирую фото…",
  voice: "Слушаю и разбираю…",
};

const ICONS = { text: FileText, photo: ImageIcon, voice: Mic };

interface Props {
  kind: AnalyzeKind;
  className?: string;
}

/** Компактный индикатор анализа над полем ввода */
export function AnalyzeStatus({ kind, className }: Props) {
  const Icon = ICONS[kind];
  return (
    <motion.div
      className={cn("analyze-status-pill", className)}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
    >
      <span className="analyze-status-dot" aria-hidden />
      <Icon className="h-3.5 w-3.5 shrink-0 text-mint" strokeWidth={2} />
      <span className="text-xs font-medium text-mint">{LABELS[kind]}</span>
    </motion.div>
  );
}
