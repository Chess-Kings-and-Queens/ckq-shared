import { QuizEvaluator } from './quizEvaluator';
import { isCreditedVerdict } from './engineJudge';

/**
 * The one attempt-scoring rule (ADR backend-051), read by the backend and the liveboard server.
 * Each student ply (unit) is worth `1 / units` of the position. A unit is banked at the percent of
 * the attempt that first played it correctly; a retry only offers the units not yet banked.
 */

/** Academy scoring settings (SystemSettings academy.scoring). Percent integers. */
export interface AttemptScoring {
  /** Percent of the open units an attempt can earn, by attempt number; later attempts use the last value. Always 3 entries, the first 100. */
  attemptPercents: readonly number[];
  /** Percent of the remaining units an engine-judged `acceptable` move earns (before the attempt percent). */
  acceptablePercent: number;
}

export const ATTEMPT_PERCENT_SLOTS = 3;

export const DEFAULT_ATTEMPT_SCORING: AttemptScoring = Object.freeze({
  attemptPercents: Object.freeze([100, 50, 25]),
  acceptablePercent: 50,
});

function isWholePercent(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 100;
}

/** Null when `value` is a valid AttemptScoring, else the first failing message. */
export function attemptScoringError(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return 'scoring must be an object';
  const { attemptPercents, acceptablePercent } = value as { attemptPercents?: unknown; acceptablePercent?: unknown };
  if (
    !Array.isArray(attemptPercents) ||
    attemptPercents.length !== ATTEMPT_PERCENT_SLOTS ||
    !attemptPercents.every((n) => typeof n === 'number' && Number.isInteger(n))
  ) {
    return 'attemptPercents must be 3 whole numbers';
  }
  const percents = attemptPercents as number[];
  if (percents[0] !== 100) return 'The first attempt is always 100%';
  if (percents.some((n) => n < 0 || n > 100)) return 'Each attempt percent must be 0–100';
  for (let i = 1; i < percents.length; i++) {
    if (percents[i] > percents[i - 1]) return 'A later attempt cannot be worth more than an earlier one';
  }
  if (!isWholePercent(acceptablePercent)) return 'acceptablePercent must be a whole number 0–100';
  return null;
}

/** `value` when valid, else the defaults. */
export function resolveAttemptScoring(value: unknown): AttemptScoring {
  return attemptScoringError(value) === null ? (value as AttemptScoring) : DEFAULT_ATTEMPT_SCORING;
}

/** Percent (0–100) an attempt can earn; attempt numbers below 1 use the first, above the table the last. */
export function attemptPercent(scoring: AttemptScoring, attemptNumber: number): number {
  return scoring.attemptPercents[Math.min(Math.max(attemptNumber, 1), scoring.attemptPercents.length) - 1];
}

export type AttemptCredit = 'none' | 'full' | 'acceptable';

/** What an engine-judge verdict is worth: the credited set comes from `isCreditedVerdict`. */
export function creditOfVerdict(verdict: string | null | undefined, { allOrNothing = false }: { allOrNothing?: boolean } = {}): AttemptCredit {
  if (!isCreditedVerdict(verdict)) return 'none';
  if (verdict === 'acceptable') return allOrNothing ? 'none' : 'acceptable';
  return 'full';
}

export interface LineAttempt {
  moves: readonly string[];
  credit: AttemptCredit;
}

export interface LineScore {
  /** 0..1 — the position's earned share after all attempts. */
  earned: number;
  /** 0..1 per attempt; sums to `earned`. Attempts after the solving one get 0. */
  attemptEarned: number[];
  /** The line was finished: an exact match, or a full/acceptable credit. */
  solved: boolean;
  /** SANs the next attempt starts from (solution plies, the opponent's reply included); [] when none. */
  resumeMoves: string[];
}

/** Score every attempt at a multi-move line, and name where the next one resumes. */
export function scoreLineAttempts(
  evaluator: QuizEvaluator,
  attempts: readonly LineAttempt[],
  { scoring, allOrNothing = false }: { scoring: AttemptScoring; allOrNothing?: boolean },
): LineScore {
  const units = evaluator.playerUnits;
  if (units === 0) return { earned: 0, attemptEarned: attempts.map(() => 0), solved: false, resumeMoves: [] };

  let banked = 0;
  let bankedPlies = 0;
  let solved = false;
  const attemptEarned: number[] = [];

  attempts.forEach((a, k) => {
    const m = attemptPercent(scoring, k + 1) / 100;
    if (solved) {
      attemptEarned.push(0);
      return;
    }
    const { plies, playerUnits } = evaluator.matchedPrefix(a.moves);
    const exact = plies >= evaluator.quizMoves.length;
    const newUnits = Math.max(0, playerUnits - banked);
    const remainingAfter = units - Math.max(banked, playerUnits);
    const credited = exact || a.credit !== 'none';
    let share: number;
    if (allOrNothing) {
      share = credited ? m : 0;
    } else {
      share = (newUnits / units) * m;
      if (!exact && a.credit === 'full') share += (remainingAfter / units) * m;
      if (!exact && a.credit === 'acceptable') share += ((remainingAfter / units) * m * scoring.acceptablePercent) / 100;
    }
    attemptEarned.push(share);
    banked = Math.max(banked, playerUnits);
    bankedPlies = Math.max(bankedPlies, plies);
    if (credited) solved = true;
  });

  const earned = Math.min(1, attemptEarned.reduce((sum, e) => sum + e, 0));
  let resumePly = bankedPlies;
  if (!solved && resumePly < evaluator.quizMoves.length && !evaluator.isPlayerPly(evaluator.quizMoves[resumePly].turn)) {
    resumePly += 1;
  }
  const resumeMoves = solved ? [] : evaluator.quizMoves.slice(0, resumePly).map((q) => q.san);
  return { earned, attemptEarned, solved, resumeMoves };
}

/** Score one-answer positions (choice, arrow, click): the first correct attempt earns that attempt's percent. */
export function scoreAnswerAttempts(
  attempts: readonly { isCorrect: boolean }[],
  { scoring }: { scoring: AttemptScoring },
): LineScore {
  const firstCorrect = attempts.findIndex((a) => a.isCorrect);
  const attemptEarned = attempts.map((_, k) => (k === firstCorrect ? attemptPercent(scoring, k + 1) / 100 : 0));
  const earned = firstCorrect === -1 ? 0 : attemptEarned[firstCorrect];
  return { earned, attemptEarned, solved: firstCorrect !== -1, resumeMoves: [] };
}

/** Points for a share of a position, rounded to the nearest whole point. */
export function pointsOf(earned: number, maxPoints: number): number {
  return Math.round(earned * maxPoints);
}
