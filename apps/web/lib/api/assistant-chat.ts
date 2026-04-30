export type AssistantConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type SendAssistantChatInput = {
  message: string;
  conversationHistory: AssistantConversationMessage[];
};

type SendAssistantChatOptions = {
  onDelta?: (delta: string, content: string) => void;
  signal?: AbortSignal;
};

export class AssistantChatError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AssistantChatError";
  }
}

export async function sendAssistantChatMessage(
  input: SendAssistantChatInput,
  options: SendAssistantChatOptions = {},
): Promise<string> {
  const response = await fetch("/api/proxy/api/chat", {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new AssistantChatError(response.status, await readErrorMessage(response));
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  if (contentType.includes("text/event-stream") && response.body) {
    return readSseResponse(response.body, options.onDelta);
  }

  const data = (await response.json().catch(() => null)) as unknown;
  const reply = readStringField(data, "reply");

  if (!reply) {
    throw new AssistantChatError(response.status, "No assistant reply received");
  }

  return reply;
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) return error.name === "AbortError";
  if (!isRecord(error)) return false;
  return error.name === "AbortError";
}

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  if (!text) return response.statusText || "Request failed";

  try {
    const data = JSON.parse(text) as unknown;
    return readStringField(data, "message") ?? readStringField(data, "error") ?? text;
  } catch {
    return text;
  }
}

async function readSseResponse(
  body: ReadableStream<Uint8Array>,
  onDelta?: (delta: string, content: string) => void,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";

  const emit = (delta: string) => {
    if (!delta) return;
    content += delta;
    onDelta?.(delta, content);
  };

  const processEvent = (event: string) => {
    const data = event
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n")
      .trim();

    if (!data || data === "[DONE]") return;
    emit(extractSseDelta(data));
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");

    let eventEnd = buffer.indexOf("\n\n");
    while (eventEnd !== -1) {
      const event = buffer.slice(0, eventEnd);
      buffer = buffer.slice(eventEnd + 2);
      processEvent(event);
      eventEnd = buffer.indexOf("\n\n");
    }

    if (done) break;
  }

  if (buffer.trim()) {
    processEvent(buffer);
  }

  return content;
}

function extractSseDelta(data: string): string {
  try {
    const parsed = JSON.parse(data) as unknown;

    if (typeof parsed === "string") return parsed;
    if (!isRecord(parsed)) return "";

    const direct =
      readStringField(parsed, "delta") ??
      readStringField(parsed, "content") ??
      readStringField(parsed, "reply") ??
      readStringField(parsed, "text");
    if (direct) return direct;

    const choices = parsed.choices;
    if (!Array.isArray(choices)) return "";

    const firstChoice = choices[0] as unknown;
    if (!isRecord(firstChoice)) return "";

    const delta = firstChoice.delta;
    if (isRecord(delta)) {
      const deltaContent = readStringField(delta, "content");
      if (deltaContent) return deltaContent;
    }

    const message = firstChoice.message;
    if (isRecord(message)) {
      const messageContent = readStringField(message, "content");
      if (messageContent) return messageContent;
    }

    return readStringField(firstChoice, "text") ?? "";
  } catch {
    return data;
  }
}

function readStringField(data: unknown, key: string): string | null {
  if (!isRecord(data)) return null;
  const value = data[key];
  return typeof value === "string" ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
