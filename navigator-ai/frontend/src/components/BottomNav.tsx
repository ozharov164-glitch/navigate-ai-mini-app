import { Calendar, Home, Settings, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import type { Tab } from "@/App";
import { cn } from "@/lib/utils";

interface Props {
  tab: Tab;
  onChange: (t: Tab) => void;
}

const items: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Сегодня", icon: Home },
  { id: "calendar", label: "Календарь", icon: Calendar },
  { id: "budget", label: "Бюджет", icon: Wallet },
  { id: "settings", label: "Настройки", icon: Settings },
];

export function BottomNav({ tab, onChange }: Props) {
  return (
    <motion.div
      className="nav-dock-wrap"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <nav className="nav-dock" aria-label="Основная навигация">
        {items.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <motion.button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn("nav-item min-w-[56px] flex-1", active && "active")}
              aria-current={active ? "page" : undefined}
              whileTap={{ scale: 0.94 }}
            >
              <span className="nav-icon-wrap relative">
                {active && (
                  <motion.span
                    layoutId="nav-glow"
                    className="absolute inset-0 rounded-xl bg-mint/12"
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                )}
                <Icon className="relative h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.65} />
              </span>
              <span className={cn("truncate text-[10px] transition-colors", active && "font-semibold text-mint")}>
                {label}
              </span>
            </motion.button>
          );
        })}
      </nav>
    </motion.div>
  );
}
