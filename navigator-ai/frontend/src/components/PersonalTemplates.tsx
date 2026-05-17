import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type UserTemplate } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/telegram";

interface Props {
  templates: UserTemplate[];
  busy?: boolean;
  onRun: (prompt: string, templateKey?: string) => void;
  onRefresh: () => void;
}

export function PersonalTemplates({ templates, busy, onRun, onRefresh }: Props) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");

  const save = async () => {
    if (!title.trim() || !prompt.trim()) return;
    hapticLight();
    try {
      await api.createTemplate(title.trim(), prompt.trim());
      setTitle("");
      setPrompt("");
      setOpen(false);
      showToast("Шаблон сохранён", "success");
      onRefresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
  };

  const remove = async (id: number) => {
    hapticLight();
    try {
      await api.deleteTemplate(id);
      onRefresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="section-label flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Мои шаблоны
        </p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-mint hover:bg-white/5"
        >
          <Plus className="h-3 w-3" />
          {open ? "Отмена" : "Добавить"}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3 space-y-2"
          >
            <input
              className="input-field"
              placeholder="Название"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="input-field min-h-[72px] resize-none"
              placeholder="Текст для AI…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button type="button" className="btn-primary w-full" onClick={save}>
              Сохранить
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {templates.length === 0 ? (
        <p className="text-xs text-muted">Сохраните частые запросы — 1 тап без набора текста</p>
      ) : (
        <ul className="space-y-1.5">
          {templates.map((t, i) => (
            <motion.li
              key={t.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                disabled={busy}
                onClick={() => onRun(t.prompt, t.template_key ?? undefined)}
                className={cn(
                  "glass-card-interactive min-w-0 flex-1 p-2.5 text-left text-sm font-medium text-primary",
                  busy && "opacity-50"
                )}
              >
                {t.title}
              </button>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-muted hover:text-red-400"
                aria-label="Удалить"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
