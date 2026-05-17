import { Calendar, Home, MapPin, MoreHorizontal, Wallet } from "lucide-react";
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
  { id: "routes", label: "Маршруты", icon: MapPin },
  { id: "more", label: "Ещё", icon: MoreHorizontal },
];

export function BottomNav({ tab, onChange }: Props) {
  return (
    <div className="nav-dock-wrap">
      <nav className="nav-dock" aria-label="Основная навигация">
        {items.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <motion.button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn("nav-item min-w-[52px] flex-1", active && "active")}
              aria-current={active ? "page" : undefined}
              whileTap={{ scale: 0.92 }}
            >
              <span className="nav-icon-wrap relative">
                {active && (
                  <motion.span
                    layoutId="nav-glow"
                    className="absolute inset-0 rounded-xl bg-mint/15"
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                )}
                <Icon
                  className={cn("relative h-[18px] w-[18px]", active && "scale-105")}
                  strokeWidth={active ? 2.25 : 1.65}
                />
              </span>
              <span className={cn("truncate transition-colors", active && "font-semibold")}>{label}</span>
              <span className="nav-pill" aria-hidden />
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
}
