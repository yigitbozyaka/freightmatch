import { env } from '../config/env';
import { logger } from '@freightmatch/instrumentation';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-3.5-haiku';

const SYSTEM_PROMPT = `You are FreightMatch AI Assistant, an intelligent chatbot for a freight logistics platform. You help shippers and carriers with:

1. **Route Planning**: Suggest optimal routes between origins and destinations
2. **Pricing Estimates**: Provide rough freight cost estimates based on distance, weight, cargo type, and market conditions
3. **Cargo Advice**: Recommend appropriate truck types (flatbed, refrigerated, dry-van, tanker) based on cargo characteristics
4. **Shipping Best Practices**: Advise on packaging, timing, regulations, and documentation
5. **Platform Help**: Explain how to create loads, submit bids, track shipments, and manage carrier profiles
6. **Market Insights**: Share general knowledge about freight industry trends, seasonal patterns, and capacity

Guidelines:
- Be concise and professional
- When giving price estimates, always include a disclaimer that these are rough estimates
- If asked about specific loads or bids, explain that you can provide general guidance but cannot access real-time data
- Format responses with markdown for readability
- Focus on US domestic freight logistics
- Never share sensitive information or make guarantees about pricing`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatResponse {
  reply: string;
  model: string;
  tokensUsed: number;
}

export async function chat(
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
): Promise<ChatResponse> {
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.slice(-10), // Keep last 10 messages for context
    { role: 'user', content: userMessage },
  ];

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('OpenRouter chat API error', { status: response.status, body: errorBody });
      return {
        reply: 'I apologize, but I am temporarily unavailable. Please try again in a moment.',
        model: MODEL,
        tokensUsed: 0,
      };
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };

    const reply = data.choices?.[0]?.message?.content ?? 'I could not generate a response. Please try again.';
    const tokensUsed = data.usage?.total_tokens ?? 0;

    return {
      reply,
      model: MODEL,
      tokensUsed,
    };
  } catch (error) {
    logger.error('Chat service error', { error });
    return {
      reply: 'I apologize, but I encountered an error. Please try again later.',
      model: MODEL,
      tokensUsed: 0,
    };
  }
}
