import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export function Skeleton({ className }: Props) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

export function CardSkeleton() {
  return (
    <div className="glass-card space-y-3 p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-3/4" />
    </div>
  );
}
