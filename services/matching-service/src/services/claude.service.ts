import { env } from '../config/env';
import { CarrierResponse, CarrierRecommendation, LoadCreatedEvent } from '../types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-3.5-haiku';

function buildPrompt(load: LoadCreatedEvent, carriers: CarrierResponse[]): string {
  const carrierList = carriers
    .filter((c) => c.carrierProfile)
    .map(
      (c, i) =>
        `${i + 1}. ID: ${c.id}, Truck: ${c.carrierProfile!.truckType}, ` +
        `Capacity: ${c.carrierProfile!.capacityKg}kg, City: ${c.carrierProfile!.homeCity}, ` +
        `Rating: ${c.carrierProfile!.rating}/5, Completed: ${c.carrierProfile!.completedShipments} shipments`,
    )
    .join('\n');

  return (
    `You are a freight matching assistant. Given the cargo details and available carriers, rank the top 3 carriers by suitability.\n\n` +
    `Cargo:\n` +
    `- Origin: ${load.origin}\n` +
    `- Destination: ${load.destination}\n` +
    `- Type: ${load.cargoType}\n` +
    `- Weight: ${load.weightKg}kg\n` +
    `- Deadline: ${load.deadlineHours} hours\n\n` +
    `Carriers:\n${carrierList}\n\n` +
    `Respond in JSON only:\n` +
    `[\n  { "carrierId": "...", "score": 0-100, "reason": "..." },\n  ...\n]`
  );
}

function fallbackByRating(carriers: CarrierResponse[]): CarrierRecommendation[] {
  return carriers
    .filter((c) => c.carrierProfile)
    .sort((a, b) => (b.carrierProfile!.rating ?? 0) - (a.carrierProfile!.rating ?? 0))
    .slice(0, 3)
    .map((c, i) => ({
      carrierId: c.id,
      score: 100 - i * 15,
      reason: `Fallback: ranked #${i + 1} by rating (${c.carrierProfile!.rating}/5)`,
    }));
}

export async function getRecommendations(
  load: LoadCreatedEvent,
  carriers: CarrierResponse[],
): Promise<CarrierRecommendation[]> {
  const carriersWithProfile = carriers.filter((c) => c.carrierProfile);
  if (carriersWithProfile.length === 0) {
    return [];
  }

  try {
    const prompt = buildPrompt(load, carriersWithProfile);

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`OpenRouter API error (${response.status}):`, errorBody);
      return fallbackByRating(carriersWithProfile);
    }

    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content: string = data.choices?.[0]?.message?.content ?? '';

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Failed to parse Claude response as JSON array:', content);
      return fallbackByRating(carriersWithProfile);
    }

    const parsed: CarrierRecommendation[] = JSON.parse(jsonMatch[0]);

    const validCarrierIds = new Set(carriersWithProfile.map((c) => c.id));
    return parsed
      .filter((r) => validCarrierIds.has(r.carrierId) && typeof r.score === 'number' && typeof r.reason === 'string')
      .slice(0, 3);
  } catch (error) {
    console.error('Claude recommendation failed, using fallback:', error);
    return fallbackByRating(carriersWithProfile);
  }
}
