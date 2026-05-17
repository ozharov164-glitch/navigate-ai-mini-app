import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  icon?: LucideIcon;
  title: string;
  description: string;
  hint?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description, hint }: Props) {
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        className="empty-orb mb-4"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Icon className="h-9 w-9 text-mint" strokeWidth={1.5} />
      </motion.div>
      <p className="text-sm font-semibold text-primary">{title}</p>
      <p className="mt-1.5 max-w-[260px] text-xs leading-relaxed text-secondary">{description}</p>
      {hint && <p className="mt-3 text-[10px] font-medium uppercase tracking-wider text-mint/80">{hint}</p>}
    </motion.div>
  );
}
