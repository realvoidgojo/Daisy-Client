import React from "react";
import { useModern } from "../lib/ui-style";

export function Section({ title, children }) {
  const modern = useModern();
  if (modern) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold tracking-[-0.01em] text-foreground flex items-center gap-2">
          <span>{title}</span>
        </h2>
        <div className="divide-y divide-border/80 rounded-2xl border-2 border-border/80 bg-card px-6 shadow-[3px_3px_0px_#080808]">{children}</div>
      </section>
    );
  }
  return (
    <section className="space-y-1">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="divide-y divide-border rounded-xl border-2 border-border/70 bg-card px-4 shadow-[2px_2px_0px_#080808]">{children}</div>
    </section>
  );
}

