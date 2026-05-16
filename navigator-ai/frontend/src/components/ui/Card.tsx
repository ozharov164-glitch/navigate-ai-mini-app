import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const pad = { none: "", sm: "p-3", md: "p-4", lg: "p-5" };

export function Card({ children, className, interactive, padding = "md" }: CardProps) {
  return (
    <section className={cn(interactive ? "glass-card-interactive" : "glass-card", pad[padding], className)}>
      {children}
    </section>
  );
}
