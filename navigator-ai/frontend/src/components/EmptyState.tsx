import type { LucideIcon } from "lucide-react";
import { Mic } from "lucide-react";

interface Props {
  icon?: LucideIcon;
  title: string;
  description: string;
}

export function EmptyState({ icon: Icon = Mic, title, description }: Props) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className="empty-orb mb-4">
        <Icon className="h-10 w-10 text-mint animate-float" />
      </div>
      <p className="text-sm font-semibold text-primary">{title}</p>
      <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-muted">{description}</p>
    </div>
  );
}
