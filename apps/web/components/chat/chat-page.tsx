"use client";

import { Button } from "@/components/primitives/button";
import { ChatPanel } from "./chat-panel";
import { useAssistantChat } from "./chat-provider";

export function ChatPage() {
  const { clearConversation, messages } = useAssistantChat();

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-5">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-amber-400">
              AI freight desk
            </p>
            <h1 className="mt-2 font-mono text-2xl font-semibold uppercase tracking-[0.12em] text-slate-50">
              ASK OPS
            </h1>
          </div>

          {messages.length > 0 ? (
            <Button size="sm" variant="secondary" onClick={clearConversation}>
              Clear
            </Button>
          ) : null}
        </header>

        <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[15rem_1fr]">
          <aside className="hidden min-h-0 border-r border-slate-800 pr-5 lg:block">
            <div className="space-y-5 font-mono text-[11px] uppercase tracking-[0.18em]">
              <div>
                <p className="text-slate-500">session</p>
                <p className="mt-2 text-amber-400">live</p>
              </div>
              <div>
                <p className="text-slate-500">messages</p>
                <p className="mt-2 text-slate-200">{messages.length}</p>
              </div>
              <div>
                <p className="text-slate-500">render</p>
                <p className="mt-2 text-slate-200">sanitized md</p>
              </div>
            </div>
          </aside>

          <ChatPanel variant="page" />
        </div>
      </div>
    </div>
  );
}
