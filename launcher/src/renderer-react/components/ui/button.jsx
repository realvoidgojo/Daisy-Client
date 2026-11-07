import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";
import { useModern } from "../../lib/ui-style";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:translate-x-0.5 active:translate-y-0.5",
  {
    variants: {
      variant: {
        default: "border-2 border-daisy-ink bg-primary text-primary-foreground shadow-[2px_2px_0px_#080808] hover:bg-daisy-yellow-bright hover:shadow-[3px_3px_0px_#080808]",
        secondary: "border border-border/80 bg-secondary text-secondary-foreground hover:bg-accent hover:border-border hover:shadow-[2px_2px_0px_#080808]",
        outline: "border-2 border-border/80 bg-background/50 hover:border-primary/80 hover:bg-primary/10 hover:text-primary hover:shadow-[2px_2px_0px_#080808]",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive: "border-2 border-daisy-ink bg-destructive text-destructive-foreground shadow-[2px_2px_0px_#080808] hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "size-10 rounded-lg"
      }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);

// Modern gives every solid or outlined button a raised edge (.m-btn in styles.css).
const RAISED = new Set(["default", "secondary", "outline", "destructive"]);

export function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  const modern = useModern();
  const kind = variant || "default";
  const raised = modern && RAISED.has(kind) && size !== "icon";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }), raised && "m-btn")}
      data-variant={raised ? kind : undefined}
      data-3d={raised ? "" : undefined}
      {...props}
    />
  );
}

export { buttonVariants };
