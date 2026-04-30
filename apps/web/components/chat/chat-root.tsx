"use client";

import { ToastHost } from "@/components/primitives/ToastHost";
import { ChatDock } from "./chat-dock";
import { AssistantChatProvider, useAssistantChat } from "./chat-provider";

export function AssistantChatRoot({
  children,
  isAuthenticated,
  isAuthLoading,
}: {
  children: React.ReactNode;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
}) {
  return (
    <AssistantChatProvider isAuthenticated={isAuthenticated} isAuthLoading={isAuthLoading}>
      {children}
      <AssistantChatChrome />
    </AssistantChatProvider>
  );
}

function AssistantChatChrome() {
  const { dismissToast, isAuthenticated, isAuthLoading, toasts } = useAssistantChat();

  if (isAuthLoading || !isAuthenticated) return null;

  return (
    <>
      <ChatDock />
      <ToastHost className="bottom-24 right-5" toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
