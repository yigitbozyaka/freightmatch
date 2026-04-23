"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";
import { cn } from "@/lib/ui/cn";

type DrawerContextValue = {
  open: boolean;
};

const DrawerContext = React.createContext<DrawerContextValue | null>(null);

function useDrawerContext() {
  const context = React.useContext(DrawerContext);
  if (!context) {
    throw new Error("Drawer components must be used inside <Drawer>");
  }
  return context;
}

export type DrawerProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>;

export function Drawer({
  children,
  defaultOpen = false,
  onOpenChange,
  open: openProp,
  ...props
}: DrawerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (openProp === undefined) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [onOpenChange, openProp],
  );

  return (
    <DrawerContext.Provider value={{ open }}>
      <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange} {...props}>
        {children}
      </DialogPrimitive.Root>
    </DrawerContext.Provider>
  );
}

export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;
export const DrawerTitle = DialogPrimitive.Title;
export const DrawerDescription = DialogPrimitive.Description;

export const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ children, className, ...props }, ref) => {
  const { open } = useDrawerContext();

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <m.div
                animate={{ opacity: 1 }}
                className="fm-grid-overlay fixed inset-0 z-50"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            </DialogPrimitive.Overlay>
            <div className="fixed inset-0 z-50 overflow-hidden">
              <div className="absolute inset-y-0 right-0 flex w-full justify-end pl-12 sm:pl-24">
                <DialogPrimitive.Content asChild forceMount ref={ref} {...props}>
                  <m.div
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "fm-panel-surface h-full w-full max-w-xl rounded-none border-l p-6 sm:p-7",
                      className,
                    )}
                    exit={{ opacity: 0.98, x: 40 }}
                    initial={{ opacity: 1, x: 48 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {children}
                  </m.div>
                </DialogPrimitive.Content>
              </div>
            </div>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </LazyMotion>
  );
});

DrawerContent.displayName = "DrawerContent";

export function DrawerHeader({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {children}
    </div>
  );
}

export function DrawerFooter({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end", className)}
      {...props}
    >
      {children}
    </div>
  );
}
