"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useToastQueue } from "@/components/primitives/ToastHost";
import {
  AssistantChatError,
  isAbortError,
  sendAssistantChatMessage,
  type AssistantConversationMessage,
} from "@/lib/api/assistant-chat";

export const ASSISTANT_CHAT_STORAGE_KEY = "freightmatch:ask-ops:conversation";

export type AssistantChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  status: "sent" | "pending" | "streaming" | "error";
};

type AssistantChatContextValue = {
  clearConversation: () => void;
  dismissToast: (id: number) => void;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isHydrated: boolean;
  isSending: boolean;
  messages: AssistantChatMessage[];
  sendPrompt: (prompt: string) => Promise<void>;
  toasts: ReturnType<typeof useToastQueue>["toasts"];
};

const AssistantChatContext = createContext<AssistantChatContextValue | null>(null);

export function clearAssistantChatSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ASSISTANT_CHAT_STORAGE_KEY);
}

export function AssistantChatProvider({
  children,
  isAuthenticated,
  isAuthLoading,
}: {
  children: React.ReactNode;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
}) {
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesRef = useRef<AssistantChatMessage[]>([]);
  const sendingRef = useRef(false);
  const activeRequestRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const { dismissToast, pushToast, toasts } = useToastQueue(4500);

  const abortActiveRequest = useCallback((updateState = true) => {
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    sendingRef.current = false;

    if (updateState && mountedRef.current) {
      setIsSending(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      abortActiveRequest(false);
    };
  }, [abortActiveRequest]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    sendingRef.current = isSending;
  }, [isSending]);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated) {
      abortActiveRequest();
      clearAssistantChatSession();
      setMessages([]);
      setIsHydrated(true);
      return;
    }

    setMessages(readStoredMessages());
    setIsHydrated(true);
  }, [abortActiveRequest, isAuthenticated, isAuthLoading]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return;

    const persisted = messages
      .filter((message) => message.content.trim().length > 0)
      .map(({ content, createdAt, id, role }) => ({ content, createdAt, id, role }));

    if (persisted.length === 0) {
      clearAssistantChatSession();
      return;
    }

    window.sessionStorage.setItem(ASSISTANT_CHAT_STORAGE_KEY, JSON.stringify(persisted));
  }, [isAuthenticated, isHydrated, messages]);

  const clearConversation = useCallback(() => {
    abortActiveRequest();
    clearAssistantChatSession();
    setMessages([]);
  }, [abortActiveRequest]);

  const sendPrompt = useCallback(
    async (prompt: string) => {
      const message = prompt.trim();
      if (!message || sendingRef.current) return;

      const createdAt = new Date().toISOString();
      const userMessage: AssistantChatMessage = {
        id: makeMessageId(),
        role: "user",
        content: message,
        createdAt,
        status: "sent",
      };
      const assistantId = makeMessageId();
      const assistantMessage: AssistantChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        status: "pending",
      };
      const conversationHistory = toConversationHistory(messagesRef.current);
      const controller = new AbortController();

      activeRequestRef.current = controller;

      sendingRef.current = true;
      setIsSending(true);
      setMessages((current) => [...current, userMessage, assistantMessage]);

      const isCurrentRequest = () =>
        mountedRef.current && activeRequestRef.current === controller && !controller.signal.aborted;

      try {
        let receivedStreamDelta = false;
        const reply = await sendAssistantChatMessage(
          {
            message,
            conversationHistory,
          },
          {
            onDelta: (_delta, content) => {
              if (!isCurrentRequest()) return;
              receivedStreamDelta = true;
              replaceMessage(assistantId, { content, status: "streaming" });
            },
            signal: controller.signal,
          },
        );

        if (!isCurrentRequest()) return;

        replaceMessage(assistantId, {
          content:
            reply ||
            (receivedStreamDelta ? "" : "I could not generate a response. Please try again."),
          status: "sent",
        });
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error) || !isCurrentRequest()) return;

        const status = error instanceof AssistantChatError ? error.status : null;
        const isRateLimited = status === 429;

        pushToast(
          isRateLimited
            ? "ASK OPS cooling down. Try again in a few seconds."
            : "ASK OPS link interrupted. Try again in a moment.",
          "error",
        );

        replaceMessage(assistantId, {
          content: isRateLimited
            ? "Rate limit reached. Give the ops line a few seconds, then try again."
            : "I could not reach the assistant service. Please try again in a moment.",
          status: "error",
        });
      } finally {
        if (activeRequestRef.current === controller) {
          activeRequestRef.current = null;
          sendingRef.current = false;

          if (mountedRef.current) {
            setIsSending(false);
          }
        }
      }
    },
    [pushToast],
  );

  const value = useMemo<AssistantChatContextValue>(
    () => ({
      clearConversation,
      dismissToast,
      isAuthenticated,
      isAuthLoading,
      isHydrated,
      isSending,
      messages,
      sendPrompt,
      toasts,
    }),
    [
      clearConversation,
      dismissToast,
      isAuthenticated,
      isAuthLoading,
      isHydrated,
      isSending,
      messages,
      sendPrompt,
      toasts,
    ],
  );

  function replaceMessage(id: string, patch: Pick<AssistantChatMessage, "content" | "status">) {
    if (!mountedRef.current) return;

    setMessages((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  return <AssistantChatContext.Provider value={value}>{children}</AssistantChatContext.Provider>;
}

export function useAssistantChat() {
  const context = useContext(AssistantChatContext);
  if (!context) throw new Error("useAssistantChat must be used inside <AssistantChatProvider>");
  return context;
}

function toConversationHistory(messages: AssistantChatMessage[]): AssistantConversationMessage[] {
  return messages
    .filter((message) => message.status !== "pending" && message.status !== "error")
    .filter((message) => message.content.trim().length > 0)
    .map(({ content, role }) => ({ content, role }));
}

function readStoredMessages(): AssistantChatMessage[] {
  if (typeof window === "undefined") return [];

  const raw = window.sessionStorage.getItem(ASSISTANT_CHAT_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item) => {
      if (!isStoredMessage(item)) return [];
      return {
        id: item.id,
        role: item.role,
        content: item.content,
        createdAt: item.createdAt,
        status: "sent" as const,
      };
    });
  } catch {
    clearAssistantChatSession();
    return [];
  }
}

function isStoredMessage(value: unknown): value is {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
} {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    (item.role === "user" || item.role === "assistant") &&
    typeof item.content === "string" &&
    typeof item.createdAt === "string"
  );
}

function makeMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
