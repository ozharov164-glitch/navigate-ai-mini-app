import { Calendar, Home, MapPin, MoreHorizontal, Wallet } from "lucide-react";
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
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn("nav-item min-w-[52px] flex-1", active && "active")}
              aria-current={active ? "page" : undefined}
            >
              <span className="nav-icon-wrap">
                <Icon className={cn("h-[18px] w-[18px]", active && "scale-105")} strokeWidth={active ? 2.25 : 1.75} />
              </span>
              <span className={cn("truncate", active && "font-semibold")}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
