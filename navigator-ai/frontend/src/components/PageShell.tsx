import type { ReactNode } from "react";

/** Linear-style tab transition wrapper */
export function PageShell({ children, tabKey }: { children: ReactNode; tabKey: string }) {
  return (
    <div key={tabKey} className="tab-panel animate-slide-up">
      {children}
    </div>
  );
}
