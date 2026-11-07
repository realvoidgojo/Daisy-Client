import React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../lib/utils";
import { useModern } from "../../lib/ui-style";

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef(({ className, ...props }, ref) => {
  const modern = useModern();
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 p-1.5 border-2 border-border/80 bg-card/90 shadow-[2px_2px_0px_#080808]",
        modern ? "h-11 rounded-xl" : "h-10 rounded-lg",
        className
      )}
      {...props}
    />
  );
});
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => {
  const modern = useModern();
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap text-muted-foreground transition-all hover:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        modern
          ? "h-full rounded-lg px-4 text-xs font-bold tracking-tight focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:border data-[state=active]:border-primary/60 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-[1px_1px_0px_#080808]"
          : "rounded-md px-3 py-1 text-xs font-semibold data-[state=active]:bg-accent data-[state=active]:text-foreground",
        className
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("mt-4 focus-visible:outline-none", className)} {...props} />
));
TabsContent.displayName = "TabsContent";
