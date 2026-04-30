export function computeTrustScore(input: {
  rating: number; // 0..5
  onTimeRate: number; // 0..1 (on-time deliveries / total)
  completedCount: number; // total completed shipments
}): number {
  if (input.completedCount === 0 || input.completedCount < 0) {
    return 0;
  }

  const rating = Math.max(0, Math.min(5, input.rating));
  const onTimeRate = Math.max(0, Math.min(1, input.onTimeRate));
  const completedCount = Math.max(0, input.completedCount);

  const ratingComponent = (rating / 5) * 50;
  const onTimeComponent = onTimeRate * 30;
  const experienceComponent = Math.min(completedCount / 50, 1) * 20;

  const sum = ratingComponent + onTimeComponent + experienceComponent;

  return Math.max(0, Math.min(100, Math.round(sum)));
}
