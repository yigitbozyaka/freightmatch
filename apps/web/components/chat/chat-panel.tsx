"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/primitives/button";
import { cn } from "@/lib/ui/cn";
import { ChatMarkdown } from "./chat-markdown";
import { useAssistantChat, type AssistantChatMessage } from "./chat-provider";

const SUGGESTED_PROMPTS = [
  "Fair price for Istanbul → Berlin reefer 18t?",
  "Best carriers for hazmat?",
  "Explain my current load pipeline",
];

export function ChatPanel({ variant = "drawer" }: { variant?: "drawer" | "page" }) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden",
        variant === "page" && "fm-panel-surface rounded-xl",
      )}
    >
      <MessageList variant={variant} />
      <ChatComposer variant={variant} />
    </section>
  );
}

function MessageList({ variant }: { variant: "drawer" | "page" }) {
  const { isHydrated, messages } = useAssistantChat();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto px-4 py-5",
        variant === "page" ? "sm:px-6 lg:px-8" : "sm:px-6",
      )}
    >
      {!isHydrated ? (
        <div className="flex h-full items-center justify-center font-mono text-sm text-amber-400">
          ◐
        </div>
      ) : messages.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-amber-400">
              ASK OPS
            </p>
            <p className="mt-2 font-mono text-sm uppercase tracking-[0.16em] text-slate-500">
              link standby
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: AssistantChatMessage }) {
  const isUser = message.role === "user";

  return (
    <article className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-lg border px-4 py-3 shadow-[0_16px_34px_rgba(0,0,0,0.2)]",
          isUser
            ? "border-amber-400/60 bg-amber-400 text-slate-950"
            : "border-slate-700 bg-slate-900/90 text-slate-200",
          message.status === "error" && "border-[--color-danger]/70",
        )}
      >
        <div className="mb-2 flex items-center justify-between gap-4">
          <span
            className={cn(
              "font-mono text-[10px] uppercase tracking-[0.18em]",
              isUser ? "text-slate-900/70" : "text-amber-400/85",
            )}
          >
            {isUser ? "you" : "ops"}
          </span>
          <time
            className={cn("font-mono text-[10px]", isUser ? "text-slate-900/60" : "text-slate-500")}
            dateTime={message.createdAt}
          >
            {formatMessageTime(message.createdAt)}
          </time>
        </div>

        {message.content ? (
          isUser ? (
            <p className="whitespace-pre-wrap font-mono text-sm leading-6">{message.content}</p>
          ) : (
            <div className="space-y-3 text-sm">
              <ChatMarkdown content={message.content} />
            </div>
          )
        ) : (
          <p className="font-mono text-lg text-amber-400">◐</p>
        )}
      </div>
    </article>
  );
}

function ChatComposer({ variant }: { variant: "drawer" | "page" }) {
  const { isSending, sendPrompt } = useAssistantChat();
  const [draft, setDraft] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);

  const submitDraft = async () => {
    const prompt = draft.trim();
    if (!prompt) return;
    setDraft("");
    await sendPrompt(prompt);
  };

  return (
    <div
      className={cn(
        "border-t border-slate-800 bg-slate-950/45 p-4",
        variant === "page" ? "sm:p-5 lg:p-6" : "sm:p-5",
      )}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={isSending}
            onClick={() => void sendPrompt(prompt)}
            className="fm-focus-ring rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 font-mono text-[11px] text-slate-300 transition-colors hover:border-amber-400/50 hover:text-amber-300 disabled:pointer-events-none disabled:opacity-45"
          >
            {prompt}
          </button>
        ))}
      </div>

      <form
        ref={formRef}
        className="flex items-end gap-2 rounded-lg border border-slate-700 bg-slate-900/95 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus-within:border-amber-400/75 focus-within:shadow-[0_0_0_1px_rgba(245,179,66,0.35)]"
        onSubmit={(event) => {
          event.preventDefault();
          void submitDraft();
        }}
      >
        <span className="pb-2 pl-2 font-mono text-sm text-amber-400" aria-hidden="true">
          &gt;
        </span>
        <textarea
          aria-label="Ask Ops"
          className="min-h-10 flex-1 resize-none bg-transparent px-1 py-2 font-mono text-sm leading-5 text-slate-100 outline-none placeholder:text-slate-500"
          disabled={isSending}
          maxLength={2000}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          placeholder="Ask Ops..."
          rows={1}
          value={draft}
        />
        <Button
          className="shrink-0"
          disabled={!draft.trim()}
          loading={isSending}
          size="sm"
          type="submit"
        >
          Send
        </Button>
      </form>
    </div>
  );
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
