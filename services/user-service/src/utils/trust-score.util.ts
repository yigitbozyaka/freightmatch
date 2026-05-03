/**
 * Computes a carrier trust score based on their performance metrics.
 * 
 * Formula:
 * - ratingComponent (50%): (rating / 5) * 50
 * - onTimeComponent (30%): onTimeRate * 30
 * - experienceComponent (20%): min(completedCount / 50, 1) * 20
 * 
 * Edge cases:
 * - If completedCount is 0, the score is 0 (new carriers have no score).
 * - The final score is rounded and clamped to [0, 100].
 * 
 * @param input Metrics for the carrier
 * @returns A trust score between 0 and 100
 */
export function computeTrustScore(input: {
  rating: number;         // 0..5
  onTimeRate: number;     // 0..1 (on-time deliveries / total)
  completedCount: number; // total completed shipments
}): number {
  const { rating, onTimeRate, completedCount } = input;

  // New carriers (0 completed) return 0
  if (completedCount <= 0) {
    return 0;
  }

  const ratingComponent = (Math.max(0, Math.min(rating, 5)) / 5) * 50;
  const onTimeComponent = Math.max(0, Math.min(onTimeRate, 1)) * 30;
  const experienceComponent = Math.min(completedCount / 50, 1) * 20;

  const total = ratingComponent + onTimeComponent + experienceComponent;

  // Round and clamp to [0, 100]
  return Math.round(Math.max(0, Math.min(total, 100)));
}
