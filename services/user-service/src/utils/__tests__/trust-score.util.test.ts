import { computeTrustScore } from '../trust-score.util';

describe('computeTrustScore', () => {
  it('should return 0 for a new carrier with 0 completed shipments', () => {
    expect(computeTrustScore({ rating: 5, onTimeRate: 1, completedCount: 0 })).toBe(0);
    expect(computeTrustScore({ rating: 0, onTimeRate: 0, completedCount: 0 })).toBe(0);
  });

  it('should return 100 for a perfect carrier (5 rating, 100% on-time, 50+ completed)', () => {
    expect(computeTrustScore({ rating: 5, onTimeRate: 1, completedCount: 50 })).toBe(100);
    expect(computeTrustScore({ rating: 5, onTimeRate: 1, completedCount: 100 })).toBe(100);
  });

  it('should return a sensible middle value for a mediocre carrier', () => {
    // rating: 3/5 * 50 = 30
    // onTime: 0.8 * 30 = 24
    // experience: 20/50 * 20 = 8
    // total: 30 + 24 + 8 = 62
    expect(computeTrustScore({ rating: 3, onTimeRate: 0.8, completedCount: 20 })).toBe(62);
  });

  it('should clamp absurdly high inputs to 100', () => {
    expect(computeTrustScore({ rating: 10, onTimeRate: 2, completedCount: 500 })).toBe(100);
  });

  it('should handle negative or minimum inputs gracefully', () => {
    expect(computeTrustScore({ rating: -1, onTimeRate: -0.5, completedCount: 10 })).toBe(4); // experience only: 10/50 * 20 = 4
    expect(computeTrustScore({ rating: 0, onTimeRate: 0, completedCount: 1 })).toBe(0); // 1/50 * 20 = 0.4 -> rounded to 0
    expect(computeTrustScore({ rating: 0, onTimeRate: 0, completedCount: 5 })).toBe(2); // 5/50 * 20 = 2
  });

  it('should handle decimal results correctly by rounding', () => {
    // rating: 4.5/5 * 50 = 45
    // onTime: 0.95 * 30 = 28.5
    // experience: 40/50 * 20 = 16
    // total: 45 + 28.5 + 16 = 89.5 -> rounded to 90
    expect(computeTrustScore({ rating: 4.5, onTimeRate: 0.95, completedCount: 40 })).toBe(90);
  });
});
