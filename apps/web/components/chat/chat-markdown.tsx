"use client";

import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/lib/ui/cn";

export function ChatMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      rehypePlugins={[rehypeSanitize]}
      components={{
        a: ({ children, href }) => (
          <a
            className="text-amber-400 underline decoration-amber-400/40 underline-offset-4 hover:text-amber-300"
            href={href}
            rel="noreferrer"
            target="_blank"
          >
            {children}
          </a>
        ),
        code: ({ children, className, ...props }) => (
          <code
            className={cn(
              "rounded border border-slate-700 bg-slate-950/80 px-1.5 py-0.5 font-mono text-[0.88em] text-amber-300",
              className,
            )}
            {...props}
          >
            {children}
          </code>
        ),
        li: ({ children }) => <li className="ml-4 list-disc pl-1">{children}</li>,
        ol: ({ children }) => <ol className="space-y-1">{children}</ol>,
        p: ({ children }) => <p className="leading-6">{children}</p>,
        pre: ({ children }) => (
          <pre className="overflow-x-auto rounded-md border border-slate-700 bg-slate-950/80 p-3 font-mono text-xs text-slate-200">
            {children}
          </pre>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-slate-50">{children}</strong>
        ),
        ul: ({ children }) => <ul className="space-y-1">{children}</ul>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
