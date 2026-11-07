import React from "react";
import { cn } from "../../lib/utils";
import { useModern } from "../../lib/ui-style";

export const Input = React.forwardRef(({ className, type = "text", ...props }, ref) => {
  const modern = useModern();
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex w-full rounded-lg border-2 border-border/80 bg-background/80 px-3.5 py-1 text-sm font-medium transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:shadow-[3px_3px_0px_#080808] disabled:cursor-not-allowed disabled:opacity-50",
        modern ? "h-11" : "h-10",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";
