import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold transition-all",
  {
    variants: {
      variant: {
        default: "border-daisy-ink bg-primary text-primary-foreground shadow-[1px_1px_0px_#080808]",
        secondary: "border-border/80 bg-secondary text-secondary-foreground",
        outline: "border-primary/60 bg-primary/10 text-primary",
        success: "border-success/50 bg-success/20 text-success shadow-[1px_1px_0px_#080808]",
        warning: "border-warning/50 bg-warning/20 text-warning shadow-[1px_1px_0px_#080808]",
        destructive: "border-destructive/50 bg-destructive/20 text-destructive shadow-[1px_1px_0px_#080808]"
      }
    },
    defaultVariants: { variant: "default" }
  }
);

export function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
