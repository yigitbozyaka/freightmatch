import { computeTrustScore } from '../trust-score.util';

describe('computeTrustScore', () => {
  describe('new carriers', () => {
    it('returns 0 when completedCount is 0, regardless of rating', () => {
      expect(
        computeTrustScore({ rating: 5, onTimeRate: 1, completedCount: 0 }),
      ).toBe(0);
    });

    it('returns 0 when completedCount is negative', () => {
      expect(
        computeTrustScore({ rating: 5, onTimeRate: 1, completedCount: -10 }),
      ).toBe(0);
    });
  });

  describe('canonical scenarios', () => {
    it('scores a perfect carrier at 100', () => {
      expect(
        computeTrustScore({ rating: 5, onTimeRate: 1, completedCount: 50 }),
      ).toBe(100);
    });

    it('scores a perfect carrier with extra experience at 100 (capped)', () => {
      expect(
        computeTrustScore({ rating: 5, onTimeRate: 1, completedCount: 500 }),
      ).toBe(100);
    });

    it('scores a mediocre carrier in a sensible middle range', () => {
      const score = computeTrustScore({
        rating: 3,
        onTimeRate: 0.8,
        completedCount: 20,
      });
      // rating 30 + onTime 24 + experience 8 = 62
      expect(score).toBe(62);
      expect(score).toBeGreaterThan(30);
      expect(score).toBeLessThan(80);
    });

    it('scores a single-load new-ish carrier with low signal', () => {
      // rating 50 + onTime 30 + experience 0.4 = 80.4 -> 80
      expect(
        computeTrustScore({ rating: 5, onTimeRate: 1, completedCount: 1 }),
      ).toBe(80);
    });
  });

  describe('component weighting', () => {
    it('rating component contributes up to 50 points', () => {
      const score = computeTrustScore({
        rating: 5,
        onTimeRate: 0,
        completedCount: 1,
      });
      // rating 50 + onTime 0 + experience 0.4 = 50.4 -> 50
      expect(score).toBe(50);
    });

    it('on-time component contributes up to 30 points', () => {
      const score = computeTrustScore({
        rating: 0,
        onTimeRate: 1,
        completedCount: 1,
      });
      // rating 0 + onTime 30 + experience 0.4 = 30.4 -> 30
      expect(score).toBe(30);
    });

    it('experience component contributes up to 20 points and saturates at 50 completions', () => {
      const score50 = computeTrustScore({
        rating: 0,
        onTimeRate: 0,
        completedCount: 50,
      });
      const score200 = computeTrustScore({
        rating: 0,
        onTimeRate: 0,
        completedCount: 200,
      });
      expect(score50).toBe(20);
      expect(score200).toBe(20);
    });
  });

  describe('clamping and bad input', () => {
    it('clamps rating above 5 to a perfect rating component', () => {
      expect(
        computeTrustScore({ rating: 999, onTimeRate: 1, completedCount: 50 }),
      ).toBe(100);
    });

    it('clamps negative rating to 0', () => {
      // rating 0 + onTime 30 + experience 20 = 50
      expect(
        computeTrustScore({ rating: -3, onTimeRate: 1, completedCount: 50 }),
      ).toBe(50);
    });

    it('clamps onTimeRate above 1', () => {
      expect(
        computeTrustScore({ rating: 5, onTimeRate: 999, completedCount: 50 }),
      ).toBe(100);
    });

    it('clamps negative onTimeRate to 0', () => {
      // rating 50 + onTime 0 + experience 20 = 70
      expect(
        computeTrustScore({ rating: 5, onTimeRate: -1, completedCount: 50 }),
      ).toBe(70);
    });

    it('returns 0 when any input is NaN', () => {
      expect(
        computeTrustScore({ rating: NaN, onTimeRate: 1, completedCount: 50 }),
      ).toBe(0);
      expect(
        computeTrustScore({ rating: 5, onTimeRate: NaN, completedCount: 50 }),
      ).toBe(0);
      expect(
        computeTrustScore({ rating: 5, onTimeRate: 1, completedCount: NaN }),
      ).toBe(0);
    });

    it('returns 0 when any input is Infinity', () => {
      expect(
        computeTrustScore({ rating: Infinity, onTimeRate: 1, completedCount: 50 }),
      ).toBe(0);
      expect(
        computeTrustScore({ rating: 5, onTimeRate: 1, completedCount: Infinity }),
      ).toBe(0);
    });
  });

  describe('output guarantees', () => {
    it('always returns an integer in [0, 100]', () => {
      const samples: Array<{ rating: number; onTimeRate: number; completedCount: number }> = [
        { rating: 0, onTimeRate: 0, completedCount: 1 },
        { rating: 2.5, onTimeRate: 0.5, completedCount: 7 },
        { rating: 4.2, onTimeRate: 0.91, completedCount: 33 },
        { rating: 5, onTimeRate: 1, completedCount: 100 },
      ];

      for (const input of samples) {
        const score = computeTrustScore(input);
        expect(Number.isInteger(score)).toBe(true);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    });
  });
});
