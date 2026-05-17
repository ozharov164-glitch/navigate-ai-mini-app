import { Archive, Check, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import type { Task } from "@/lib/api";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/telegram";

interface Props {
  task: Task;
  onComplete: (task: Task) => void;
  onUndo: (task: Task) => void;
  onArchive: (task: Task) => void;
}

export function TaskRow({ task, onComplete, onUndo, onArchive }: Props) {
  const done = task.completed;

  return (
    <motion.li
      layout
      className="glass-card flex flex-col gap-2 rounded-2xl p-3.5"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => {
            hapticLight();
            if (done) onUndo(task);
            else onComplete(task);
          }}
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition",
            done ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400" : "border-white/15 hover:border-mint/40"
          )}
          aria-label={done ? "Отменить выполнение" : "Выполнено"}
        >
          {done && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
        </button>
        <motion.div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium text-primary", done && "line-through text-muted")}>{task.title}</p>
          {task.due_date && (
            <p className="mt-0.5 text-[11px] text-muted">
              {new Date(task.due_date).toLocaleString("ru", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </motion.div>
      </motion.div>

      {done && (
        <motion.div
          className="flex gap-2 pl-9"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          <button type="button" className="glass-btn flex flex-1 items-center justify-center gap-1.5 !py-2 text-xs" onClick={() => onUndo(task)}>
            <RotateCcw className="h-3 w-3" />
            Отменить
          </button>
          <button type="button" className="glass-btn flex flex-1 items-center justify-center gap-1.5 !py-2 text-xs" onClick={() => onArchive(task)}>
            <Archive className="h-3 w-3" />
            Архивировать
          </button>
        </motion.div>
      )}
    </motion.li>
  );
}
