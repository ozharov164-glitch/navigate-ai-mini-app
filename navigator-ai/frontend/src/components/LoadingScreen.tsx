import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <motion.div
        className="relative"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260 }}
      >
        <motion.div
          className="absolute inset-0 rounded-2xl border border-mint/25"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-mint/20 bg-mint/10 shadow-glow-sm">
          <Sparkles className="h-8 w-8 text-mint" strokeWidth={1.5} />
        </div>
      </motion.div>
      <div className="w-full max-w-xs space-y-2.5">
        <motion.div
          className="skeleton mx-auto h-3 w-36 rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        />
        <motion.div className="skeleton h-14 w-full rounded-2xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} />
        <motion.div className="skeleton h-28 w-full rounded-2.5xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} />
      </div>
      <motion.p
        className="text-sm font-medium text-muted"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Загружаем ваш дашборд…
      </motion.p>
    </div>
  );
}
