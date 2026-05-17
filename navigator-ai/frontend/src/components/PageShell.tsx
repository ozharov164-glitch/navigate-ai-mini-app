import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

/** Плавная смена вкладок без чёрного экрана (Framer Motion) */
const tabMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
};

export function PageShell({ children, tabKey }: { children: ReactNode; tabKey: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={tabKey} className="tab-panel" {...tabMotion}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
