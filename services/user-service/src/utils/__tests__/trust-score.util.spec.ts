import { computeTrustScore } from '../trust-score.util';

describe('computeTrustScore', () => {
  it('should return 0 for a new carrier (0 completed)', () => {
    expect(computeTrustScore({ rating: 5, onTimeRate: 1, completedCount: 0 })).toBe(0);
  });

  it('should return 100 for a perfect carrier', () => {
    expect(computeTrustScore({ rating: 5, onTimeRate: 1, completedCount: 50 })).toBe(100);
    expect(computeTrustScore({ rating: 5, onTimeRate: 1, completedCount: 100 })).toBe(100);
  });

  it('should return a sensible middle value for a mediocre carrier', () => {
    // ratingComponent: (3 / 5) * 50 = 30
    // onTimeComponent: 0.8 * 30 = 24
    // experienceComponent: (20 / 50) * 20 = 8
    // sum: 30 + 24 + 8 = 62
    expect(computeTrustScore({ rating: 3, onTimeRate: 0.8, completedCount: 20 })).toBe(62);
  });

  it('should clamp absurd inputs and not break', () => {
    // Over the top positive
    expect(computeTrustScore({ rating: 10, onTimeRate: 2, completedCount: 1000 })).toBe(100);

    // Negative values
    // rating=0, onTimeRate=0, completedCount=5 -> experience = (5/50) * 20 = 2
    expect(computeTrustScore({ rating: -5, onTimeRate: -1, completedCount: 5 })).toBe(2);

    // Negative completed count
    expect(computeTrustScore({ rating: 3, onTimeRate: 0.5, completedCount: -10 })).toBe(0);
  });

  it('should handle edge case when rounded sum is at the boundary', () => {
    expect(computeTrustScore({ rating: 0, onTimeRate: 0, completedCount: 1 })).toBe(0); // 1/50 * 20 = 0.4 -> round to 0
    expect(computeTrustScore({ rating: 0, onTimeRate: 0, completedCount: 2 })).toBe(1); // 2/50 * 20 = 0.8 -> round to 1
  });
});
