"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";
import { cn } from "@/lib/ui/cn";

type DialogContextValue = {
  open: boolean;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog components must be used inside <Dialog>");
  }
  return context;
}

export type DialogProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>;

export function Dialog({
  children,
  defaultOpen = false,
  onOpenChange,
  open: openProp,
  ...props
}: DialogProps) {
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
    <DialogContext.Provider value={{ open }}>
      <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange} {...props}>
        {children}
      </DialogPrimitive.Root>
    </DialogContext.Provider>
  );
}

export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ children, className, ...props }, ref) => {
  const { open } = useDialogContext();

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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              <DialogPrimitive.Content asChild forceMount ref={ref} {...props}>
                <m.div
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className={cn("fm-panel-surface w-full max-w-lg p-6 sm:p-7", className)}
                  exit={{ opacity: 0, scale: 0.98, y: 12 }}
                  initial={{ opacity: 0, scale: 0.98, y: 18 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                >
                  {children}
                </m.div>
              </DialogPrimitive.Content>
            </div>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </LazyMotion>
  );
});

DialogContent.displayName = DialogPrimitive.Content.displayName;

export function DialogHeader({
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

export function DialogFooter({
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
