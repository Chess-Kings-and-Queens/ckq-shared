import type { SubscriptionCalculation } from '../types/student';

describe('SubscriptionCalculation', () => {
  test('is importable and assignable from a backend-shaped literal', () => {
    const calc: SubscriptionCalculation = { originalAmount: 120, finalAmount: 108, sessionCount: 4 };
    expect(calc.finalAmount).toBe(108);
    expect(calc.sessionCount).toBe(4);
  });
});
