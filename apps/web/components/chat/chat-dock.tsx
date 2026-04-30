"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/primitives/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/primitives/drawer";
import { cn } from "@/lib/ui/cn";
import { ChatPanel } from "./chat-panel";
import { useAssistantChat } from "./chat-provider";

export function ChatDock() {
  const pathname = usePathname();
  const { clearConversation, isAuthenticated, isAuthLoading, messages } = useAssistantChat();
  const [open, setOpen] = useState(false);

  if (isAuthLoading || !isAuthenticated || isPublicPath(pathname)) return null;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          aria-label="Ask Ops"
          className="fm-focus-ring group fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-amber-300 bg-amber-400 font-mono text-lg font-bold text-slate-950 shadow-[0_18px_38px_rgba(0,0,0,0.42),0_0_26px_rgba(245,179,66,0.25)] transition-[transform,background-color,border-color] hover:-translate-y-0.5 hover:bg-amber-300 active:translate-y-px"
        >
          <span aria-hidden="true">&gt;_</span>
          <span className="pointer-events-none absolute bottom-full right-0 mb-2 rounded border border-amber-400/40 bg-slate-950/95 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            ASK OPS
          </span>
        </button>
      </DrawerTrigger>

      <DrawerContent className="flex max-w-2xl flex-col p-0">
        <DrawerHeader className="border-b border-slate-800 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DrawerTitle className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-slate-50">
                ASK OPS
              </DrawerTitle>
              <DrawerDescription className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">
                freight assistant
              </DrawerDescription>
            </div>

            <div className="flex items-center gap-2">
              {messages.length > 0 ? (
                <button
                  type="button"
                  onClick={clearConversation}
                  className="fm-focus-ring rounded-md border border-slate-700 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
                >
                  Clear
                </button>
              ) : null}
              <Button asChild size="sm" variant="secondary">
                <Link href="/chat" onClick={() => setOpen(false)}>
                  Expand
                </Link>
              </Button>
            </div>
          </div>
        </DrawerHeader>

        <ChatPanel />
      </DrawerContent>
    </Drawer>
  );
}

function isPublicPath(pathname: string | null) {
  if (!pathname) return true;

  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/403" ||
    pathname.startsWith("/_kitchen")
  );
}
