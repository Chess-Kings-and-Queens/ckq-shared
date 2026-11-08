/**
 * The engine move judge's verdicts (ADR backend-023) and what a verdict is worth.
 * The backend's judge (backend-2.0 utils/moveJudge.js) produces them; every consumer
 * reads names, credit and wording from here.
 * The exported constants are frozen (D23): `readonly` protects TypeScript callers only.
 */
export const JUDGE_VERDICTS = Object.freeze(['exact', 'better', 'equivalent', 'acceptable', 'wrong', 'illegal'] as const);
export type JudgeVerdict = (typeof JUDGE_VERDICTS)[number];

/** The verdicts that count as correct (ADR backend-023). Frozen: JS consumers (backend, liveboard server) cannot change it at runtime (D23). */
export const CREDITED_VERDICTS: readonly JudgeVerdict[] = Object.freeze<JudgeVerdict[]>(['exact', 'better', 'equivalent', 'acceptable']);

export function isCreditedVerdict(verdict: string | null | undefined): verdict is JudgeVerdict {
  return verdict != null && (CREDITED_VERDICTS as readonly string[]).includes(verdict);
}

/** What the student sees for a credited alternative. `exact` has no message (it is the answer). */
export const JUDGE_VERDICT_MESSAGES: Readonly<Partial<Record<JudgeVerdict, string>>> = Object.freeze({
  better: 'Even better than the given solution!',
  equivalent: 'Alternate solution, equally good!',
  acceptable: 'Acceptable, but you can find better',
});

/** Raw 0-100 credit for an `acceptable` verdict, before attempt decay (D6). */
export const ACCEPTABLE_CREDIT = 50;

/**
 * Raw 0-100 score for a judged attempt, before attempt decay; null when the verdict is not credited.
 * `partialScore` is the strict grade's partial credit; an `acceptable` deviation never scores below it.
 */
export function judgedScore(verdict: string | null | undefined, partialScore: number): number | null {
  if (!isCreditedVerdict(verdict)) return null;
  if (verdict === 'acceptable') return Math.max(ACCEPTABLE_CREDIT, partialScore);
  return 100;
}

/** The judge outcome the homework move response carries. */
export interface HomeworkJudgeOutcome {
  verdict: JudgeVerdict;
  credited: boolean;
}
