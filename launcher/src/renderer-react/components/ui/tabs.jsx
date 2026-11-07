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
        "inline-flex items-center justify-center gap-1.5 p-1 border-2 border-[#222019] bg-[#12110c] shadow-none",
        modern ? "h-11 rounded-lg" : "h-10 rounded-md",
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
        "inline-flex items-center justify-center whitespace-nowrap text-[#b8b2a3] transition-all hover:text-[#fffdf2] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        modern
          ? "h-full rounded-md px-3.5 text-xs font-bold tracking-normal data-[state=active]:border-2 data-[state=active]:border-[#ffd60a] data-[state=active]:bg-[#ffd60a] data-[state=active]:text-[#0f0e0c] data-[state=active]:shadow-[2px_2px_0px_#000000]"
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
