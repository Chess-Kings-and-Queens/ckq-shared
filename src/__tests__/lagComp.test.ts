import {
  baseQuotaGainMs,
  chargeMove,
  compensate,
  flaggedAt,
  graceMs,
  initialLagQuota,
  reportedLagMs,
  settleRemainingMs,
  withTrustedLag,
} from '../lagComp';

const SEC = 1000;

describe('baseQuotaGainMs', () => {
  test.each([
    [10 * 60 * SEC, 0, 1000],
    [5 * 60 * SEC, 0, 1000],
    [3 * 60 * SEC, 0, 870],
    [2 * 60 * SEC, 0, 630],
    [1 * 60 * SEC, 0, 390],
    [1 * 60 * SEC, 2 * SEC, 710],
  ])('limit %i ms + increment %i ms -> %i ms', (limit, inc, expected) => {
    expect(baseQuotaGainMs(limit, inc)).toBe(expected);
  });

  test('never below the cpu allowance', () => {
    expect(baseQuotaGainMs(0, 0)).toBe(150);
    expect(baseQuotaGainMs(Number.NaN, Number.NaN)).toBe(150);
  });
});

describe('initialLagQuota', () => {
  test('starts at 3x the gain with a 7x cap', () => {
    expect(initialLagQuota(60 * SEC, 0)).toEqual({ gainMs: 390, quotaMs: 1170, maxMs: 2730 });
    expect(initialLagQuota(600 * SEC, 0)).toEqual({ gainMs: 1000, quotaMs: 3000, maxMs: 7000 });
  });
});

describe('withTrustedLag', () => {
  const q = initialLagQuota(600 * SEC, 0);

  test('caps the gain at trusted lag + 140 ms', () => {
    expect(withTrustedLag(q, 1000, 60)).toEqual({ ...q, gainMs: 200 });
  });

  test('does not raise the gain above the base gain', () => {
    expect(withTrustedLag(q, 1000, 5000).gainMs).toBe(1000);
  });

  test('null trusted lag is treated as 0', () => {
    expect(withTrustedLag(q, 1000, null).gainMs).toBe(140);
  });

  test('quotaMs and maxMs are unchanged', () => {
    const r = withTrustedLag(q, 1000, 60);
    expect(r.quotaMs).toBe(q.quotaMs);
    expect(r.maxMs).toBe(q.maxMs);
  });
});

describe('reportedLagMs', () => {
  test('elapsed minus the client claim', () => {
    expect(reportedLagMs(7000, 6200)).toBe(800);
  });

  test('null, undefined, negative and NaN claims report no lag', () => {
    expect(reportedLagMs(7000, null)).toBe(0);
    expect(reportedLagMs(7000, undefined)).toBe(0);
    expect(reportedLagMs(7000, -5)).toBe(0);
    expect(reportedLagMs(7000, Number.NaN)).toBe(0);
  });

  test('a claim larger than elapsed is not negative lag', () => {
    expect(reportedLagMs(5000, 9000)).toBe(0);
  });
});

describe('compensate', () => {
  const q = initialLagQuota(600 * SEC, 0);

  test('forgives the lag up to the quota, then refills by the gain', () => {
    const r = compensate(q, 800);
    expect(r.compMs).toBe(800);
    expect(r.quota.quotaMs).toBe(3000 + 1000 - 800);
  });

  test('caps the forgiveness at the quota', () => {
    const r = compensate(q, 10_000);
    expect(r.compMs).toBe(3000);
    expect(r.quota.quotaMs).toBe(1000);
  });

  test('never exceeds the max quota', () => {
    const full = { ...q, quotaMs: 6900 };
    expect(compensate(full, 0).quota.quotaMs).toBe(7000);
  });

  test('negative lag forgives nothing', () => {
    expect(compensate(q, -50).compMs).toBe(0);
  });

  test('ten moves at 1500 ms lag drain the quota down to the gain per move', () => {
    let quota = q;
    const comps: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      const r = compensate(quota, 1500);
      comps.push(r.compMs);
      quota = r.quota;
    }
    expect(comps.slice(0, 4)).toEqual([1500, 1500, 1500, 1500]);
    expect(comps.slice(-3)).toEqual([1000, 1000, 1000]);
    expect(quota.quotaMs).toBe(1000);
  });
});

describe('chargeMove', () => {
  test('charges elapsed minus comp and adds the increment when in time', () => {
    expect(
      chargeMove({ remainingMs: 60_000, incrementMs: 2000, elapsedMs: 7000, compMs: 800 }),
    ).toEqual({ remainingMs: 60_000 - 6200 + 2000, moveTimeMs: 6200, inTime: true });
  });

  test('a comp larger than elapsed charges 0', () => {
    expect(
      chargeMove({ remainingMs: 60_000, incrementMs: 0, elapsedMs: 300, compMs: 800 }).moveTimeMs,
    ).toBe(0);
  });

  test('move time equal to remaining is out of time: no increment, remaining 0', () => {
    expect(
      chargeMove({ remainingMs: 5000, incrementMs: 2000, elapsedMs: 5000, compMs: 0 }),
    ).toEqual({ remainingMs: 0, moveTimeMs: 5000, inTime: false });
  });

  test('move time past remaining leaves 0, not a negative', () => {
    expect(
      chargeMove({ remainingMs: 5000, incrementMs: 2000, elapsedMs: 6200, compMs: 0 }).remainingMs,
    ).toBe(0);
  });
});

describe('graceMs', () => {
  test('is the quota when below 2000', () => {
    expect(graceMs({ gainMs: 390, quotaMs: 1170, maxMs: 2730 })).toBe(1170);
  });

  test('is capped at 2000', () => {
    expect(graceMs(initialLagQuota(600 * SEC, 0))).toBe(2000);
  });
});

describe('flaggedAt', () => {
  test('remaining equal to elapsed minus grace is flagged', () => {
    expect(flaggedAt(1000, 2500, 1500)).toBe(true);
  });

  test('one millisecond earlier is not', () => {
    expect(flaggedAt(1000, 2499, 1500)).toBe(false);
  });

  test('grace 0 is the plain rule', () => {
    expect(flaggedAt(1000, 1000, 0)).toBe(true);
    expect(flaggedAt(1000, 999, 0)).toBe(false);
  });
});

describe('settleRemainingMs', () => {
  test('elapsed past remaining floors at 0 (a flagged side reads 0)', () => {
    expect(settleRemainingMs(54 * SEC, 60 * SEC)).toBe(0);
  });

  test('elapsed within remaining is charged', () => {
    expect(settleRemainingMs(54 * SEC, 10 * SEC)).toBe(44 * SEC);
  });

  test('elapsed 0 leaves the clock unchanged', () => {
    expect(settleRemainingMs(54 * SEC, 0)).toBe(54 * SEC);
  });

  test('negative elapsed is not credited', () => {
    expect(settleRemainingMs(54 * SEC, -5 * SEC)).toBe(54 * SEC);
  });

  test('non-finite inputs fall back to 0 remaining / 0 elapsed', () => {
    expect(settleRemainingMs(NaN, 10 * SEC)).toBe(0);
    expect(settleRemainingMs(54 * SEC, NaN)).toBe(54 * SEC);
    expect(settleRemainingMs(54 * SEC, Infinity)).toBe(54 * SEC);
  });
});
