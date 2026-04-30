import { z } from "zod";
import { apiFetch } from "./client";

const ChatMessageSchema = z.object({
  _id: z.string(),
  loadId: z.string(),
  senderId: z.string(),
  content: z.string(),
  createdAt: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export type SendMessageInput = {
  loadId: string;
  content: string;
};

export async function sendMessage(input: SendMessageInput): Promise<ChatMessage> {
  const data = await apiFetch<unknown>("api/chat/messages", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return ChatMessageSchema.parse(data);
}
