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
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg justify-around px-2 py-2">
        {items.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => onChange(id)} className={cn("nav-item", tab === id && "active")}>
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
