import { z } from "zod";
import { apiFetch } from "./client";

const RecommendationSchema = z.object({
  carrierId: z.string(),
  score: z.number(),
  reason: z.string(),
});

const RecommendationResultSchema = z.object({
  _id: z.string(),
  loadId: z.string(),
  recommendations: z.array(RecommendationSchema),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;
export type RecommendationResult = z.infer<typeof RecommendationResultSchema>;

export type TriggerRecommendationInput = {
  loadId: string;
  origin: string;
  destination: string;
  cargoType: string;
  weightKg: number;
  deadlineHours: number;
  shipperId: string;
};

export async function getRecommendations(loadId: string): Promise<RecommendationResult> {
  const data = await apiFetch<unknown>(`api/match/${loadId}`);
  return RecommendationResultSchema.parse(data);
}

export async function triggerRecommendation(
  input: TriggerRecommendationInput
): Promise<RecommendationResult> {
  const data = await apiFetch<unknown>("api/match/recommend", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return RecommendationResultSchema.parse(data);
}
