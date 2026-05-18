import { X } from "lucide-react";
import { motion } from "framer-motion";
import type { Insight } from "@/lib/api";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";

interface Props {
  items: Insight[];
  onChange: () => void;
}

/** AI-инсайты: короткие, с отметкой прочитанного и очисткой */
export function SmartInsights({ items, onChange }: Props) {
  const { showToast } = useToast();
  if (items.length === 0) return null;

  const dismissOne = async (id: number) => {
    try {
      await api.dismissInsight(id);
      onChange();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
  };

  const dismissAll = async () => {
    try {
      await api.dismissAllInsights();
      onChange();
      showToast("Инсайты скрыты", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="section-label">AI-инсайты</h3>
        <button type="button" className="text-[10px] font-medium text-muted transition hover:text-mint" onClick={dismissAll}>
          Очистить все
        </button>
      </div>
      <ul className="space-y-2">
        {items.map((i) => (
          <motion.li
            key={i.id}
            layout
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="insight-card group flex gap-2"
          >
            <p className="min-w-0 flex-1 text-xs leading-relaxed text-primary">{i.insight}</p>
            <button
              type="button"
              className="insight-dismiss shrink-0 opacity-60 transition hover:opacity-100"
              onClick={() => dismissOne(i.id)}
              aria-label="Скрыть"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-muted">Только по вашим данным · не более 3 подсказок</p>
    </section>
  );
}
