"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/ui/cn";

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2",
        className,
      )}
      {...props}
    />
  );
});

TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "fm-focus-ring relative inline-flex h-10 items-center justify-center rounded-md px-3 font-mono text-xs uppercase tracking-[0.22em] text-slate-500 transition-colors outline-none",
        "after:absolute after:bottom-[-9px] after:left-3 after:right-3 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-amber-400 after:transition-transform after:duration-200",
        "hover:text-slate-300 data-[state=active]:font-bold data-[state=active]:text-slate-100 data-[state=active]:after:scale-x-100",
        className,
      )}
      {...props}
    />
  );
});

TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        "fm-panel-muted mt-4 rounded-lg p-4 font-mono text-sm text-slate-300 outline-none",
        className,
      )}
      {...props}
    />
  );
});

TabsContent.displayName = TabsPrimitive.Content.displayName;
