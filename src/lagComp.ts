// Lag compensation for server-owned chess clocks. A pure port of the Lichess
// model (scalachess `Clock.scala` and `LagTracker.scala`), in milliseconds
// (scalachess works in centiseconds). No I/O, no clock reads: every instant is
// passed in. See docs/plans/clock-lag-compensation-plan.md D2/D3/D4/D13.

/** scalachess LagTracker.maxQuotaGainFor cap: 100 cs. */
export const MAX_QUOTA_GAIN_MS = 1000;
/** scalachess LagTracker.estimatedCpuLag: 14 cs. */
export const LAG_CPU_ALLOWANCE_MS = 140;
/** scalachess Clock.outOfTime grace cap: 200 cs. */
export const MAX_GRACE_MS = 2000;

export interface LagQuota {
  gainMs: number;
  quotaMs: number;
  maxMs: number;
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Lichess estimateTotalSeconds: limit + 40 x increment (scalachess
 * `Clock.Config.estimateTotalSeconds`, `limitSeconds + 40 * incrementSeconds`).
 */
export function estimateTotalSeconds(limitMs: number, incrementMs: number): number {
  return finiteOr(limitMs, 0) / 1000 + (40 * finiteOr(incrementMs, 0)) / 1000;
}

/**
 * min(1000, round(estimateTotalSeconds x 4 + 150)), never below
 * LAG_CPU_ALLOWANCE_MS. Mirrors scalachess `LagTracker.maxQuotaGainFor`:
 * `min(100 cs, estimateTotalSeconds x 2/5 + 15 cs)` (x 10 for ms).
 */
export function baseQuotaGainMs(limitMs: number, incrementMs: number): number {
  const raw = Math.round(estimateTotalSeconds(limitMs, incrementMs) * 4 + 150);
  return Math.max(LAG_CPU_ALLOWANCE_MS, Math.min(MAX_QUOTA_GAIN_MS, raw));
}

/**
 * { gainMs: g, quotaMs: 3g, maxMs: 7g } for g = baseQuotaGainMs(...). Mirrors
 * scalachess `LagTracker`: initial `quota = 3 x gain`, `quotaMax = 7 x gain`.
 */
export function initialLagQuota(limitMs: number, incrementMs: number): LagQuota {
  const g = baseQuotaGainMs(limitMs, incrementMs);
  return { gainMs: g, quotaMs: 3 * g, maxMs: 7 * g };
}

/**
 * Trusted cap on the per-move gain: gainMs = min(baseGainMs, trustedLagMs +
 * LAG_CPU_ALLOWANCE_MS); a null (or non-finite) trustedLagMs is treated as 0.
 * quotaMs and maxMs are unchanged. Mirrors scalachess
 * `LagTracker.withFrameLag`: `quotaGain = min(gain, frameLag + estimatedCpuLag)`.
 */
export function withTrustedLag(
  quota: LagQuota,
  baseGainMs: number,
  trustedLagMs: number | null,
): LagQuota {
  const trusted =
    trustedLagMs !== null && Number.isFinite(trustedLagMs) ? Math.max(0, trustedLagMs) : 0;
  return { ...quota, gainMs: Math.min(baseGainMs, trusted + LAG_CPU_ALLOWANCE_MS) };
}

/**
 * max(0, elapsedMs - clientMoveTimeMs); 0 when the client reported nothing or a
 * negative/NaN/non-finite value. Mirrors scalachess `MoveMetrics.reportedLag`:
 * `elapsed - clientMoveTime`, floored at 0.
 */
export function reportedLagMs(
  elapsedMs: number,
  clientMoveTimeMs: number | null | undefined,
): number {
  if (clientMoveTimeMs === null || clientMoveTimeMs === undefined) return 0;
  if (!Number.isFinite(clientMoveTimeMs) || clientMoveTimeMs < 0) return 0;
  if (!Number.isFinite(elapsedMs)) return 0;
  return Math.max(0, elapsedMs - clientMoveTimeMs);
}

/**
 * compMs = min(max(0, lagMs), quota.quotaMs); next quotaMs = min(quotaMs +
 * gainMs - compMs, maxMs). Mirrors scalachess `LagTracker.onMove`:
 * `comp = lag.atMost(quota)`, `quota = (quota + quotaGain - comp).atMost(quotaMax)`.
 */
export function compensate(
  quota: LagQuota,
  lagMs: number,
): { compMs: number; quota: LagQuota } {
  const compMs = Math.min(Math.max(0, finiteOr(lagMs, 0)), quota.quotaMs);
  const quotaMs = Math.min(quota.quotaMs + quota.gainMs - compMs, quota.maxMs);
  return { compMs, quota: { ...quota, quotaMs } };
}

/**
 * moveTimeMs = max(0, elapsedMs - compMs); inTime = moveTimeMs < remainingMs;
 * remaining = inTime ? remainingMs - moveTimeMs + incrementMs : 0. Mirrors
 * scalachess `Clock.step`: `moveTime = (elapsed - lagComp).nonNeg`, increment
 * only when `moveTime < player.remaining`, otherwise the clock hard-stops at 0.
 */
export function chargeMove(args: {
  remainingMs: number;
  incrementMs: number;
  elapsedMs: number;
  compMs: number;
}): { remainingMs: number; moveTimeMs: number; inTime: boolean } {
  const moveTimeMs = Math.max(0, args.elapsedMs - args.compMs);
  const inTime = moveTimeMs < args.remainingMs;
  const remainingMs = inTime ? args.remainingMs - moveTimeMs + args.incrementMs : 0;
  return { remainingMs, moveTimeMs, inTime };
}

/**
 * min(quota.quotaMs, MAX_GRACE_MS). Mirrors scalachess `Clock.outOfTime`:
 * `withGrace` uses `min(quota, 200 cs)`.
 */
export function graceMs(quota: LagQuota): number {
  return Math.min(quota.quotaMs, MAX_GRACE_MS);
}

/**
 * Lichess outOfTime with grace: remainingMs <= elapsedMs - graceMs (grace 0 is
 * the plain "remaining <= elapsed" rule). Mirrors scalachess `Clock.outOfTime`:
 * `remaining <= elapsed - min(quota, 200 cs)`.
 */
export function flaggedAt(remainingMs: number, elapsedMs: number, graceMs: number): boolean {
  return remainingMs <= elapsedMs - graceMs;
}
