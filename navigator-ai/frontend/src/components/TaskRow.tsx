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
      layout="position"
      className="task-row"
      initial={false}
      animate={{ opacity: 1 }}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => {
            hapticLight();
            if (done) onUndo(task);
            else onComplete(task);
          }}
          className={cn("task-check", done && "task-check-done")}
          aria-label={done ? "Отменить" : "Выполнено"}
        >
          <motion.span
            initial={false}
            animate={done ? { scale: [0.5, 1.15, 1], opacity: 1 } : { scale: 1, opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            {done && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
          </motion.span>
        </button>

        <motion.div className="min-w-0 flex-1" layout="position">
          <motion.p
            className={cn("text-sm font-medium text-primary", done && "text-muted")}
            animate={done ? { textDecoration: "line-through", opacity: 0.75 } : { textDecoration: "none", opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            {task.title}
          </motion.p>
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
      </div>

      {done && (
        <motion.div
          className="mt-3 flex gap-2 pl-9"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
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
