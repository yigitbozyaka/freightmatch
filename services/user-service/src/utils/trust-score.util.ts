export interface TrustScoreInput {
  rating: number;
  onTimeRate: number;
  completedCount: number;
}

export function computeTrustScore(input: TrustScoreInput): number {
  const { rating, onTimeRate, completedCount } = input;

  if (!Number.isFinite(rating) || !Number.isFinite(onTimeRate) || !Number.isFinite(completedCount)) {
    return 0;
  }

  if (completedCount <= 0) {
    return 0;
  }

  const safeRating = Math.min(Math.max(rating, 0), 5);
  const safeOnTime = Math.min(Math.max(onTimeRate, 0), 1);
  const safeCount = Math.max(completedCount, 0);

  const ratingComponent = (safeRating / 5) * 50;
  const onTimeComponent = safeOnTime * 30;
  const experienceComponent = Math.min(safeCount / 50, 1) * 20;

  const total = ratingComponent + onTimeComponent + experienceComponent;

  return Math.min(Math.max(Math.round(total), 0), 100);
}
