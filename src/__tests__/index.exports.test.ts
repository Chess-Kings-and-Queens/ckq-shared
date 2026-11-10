import * as shared from '../index';

/** Every runtime export this release added; a missing re-export in the barrel fails here. */
const NEW_RUNTIME_EXPORTS = [
  // puzzleLines.ts / types/homework.ts
  'expandOpponentVariations',
  'puzzleLineProgress',
  'PUZZLE_TYPES',
  // moveTree.ts
  'treeToPgn',
  'subtreePgn',
  // types/liveboard.ts
  'QUIZ_VERDICTS',
  'QUIZ_MOVE_RESULT_STATUSES',
  // gameOutcome.ts
  'TOURNAMENT_RESULT_REASONS',
  'resultStringOf',
  'outcomeOf',
  // types/tournamentResults.ts
  'TIEBREAK_ORDER',
  // tournamentResultLabels.ts
  'formatClockSeconds',
  // decodeJwt.ts
  'decodeJwtPayload',
  'ADMIN_ROLES',
  'STAFF_ROLES',
  'isAdminRole',
  'isStaffRole',
  // names.ts
  'fullName',
  'shortName',
  'initials',
  // labels.ts
  'premiumLabels',
  'planOptionLabel',
  'selectOpenPlan',
  'ACTIVITY_EVENT_SYMBOL',
  'activityEventSymbol',
  'UNLIMITED_TIME_CONTROL_SECONDS',
  'missionTimeLabel',
  // missionAppend.ts
  'classifyAppendError',
  // types/homework.ts
  'HOMEWORK_CONFLICT_CODES',
  'homeworkConflictCode',
  // uciInfoParser.ts
  'parseUciInfoRaw',
  'parseBestmove',
  // boardEditor.ts
  'squareToFileRank',
  // dates.ts
  'DEFAULT_TIMEZONE',
  'formatDateOnly',
  'formatDateTime',
  'formatMonthYear',
  'isDatePastUTC',
  'formatDateOnlyET',
  'toFormDateET',
  'toFormDateInTz',
  'toFormDateUTC',
  'isDatePastET',
  'formatTimeInTZ',
  'formatClockTime',
  'stepDateStr',
  // onlineTournamentWindow.ts
  'computeFireTime',
  'DEFAULT_JOIN_WINDOW_MINUTES',
  'joinWindowOpensAt',
  // engineJudge.ts
  'JUDGE_VERDICTS',
  'CREDITED_VERDICTS',
  'isCreditedVerdict',
  'JUDGE_VERDICT_MESSAGES',
  'ACCEPTABLE_CREDIT',
  'judgedScore',
  // quizEvaluator.ts
  'firstDeviation',
  // puzzleAttemptReducer.ts
  'JUDGED_ADVANCE_MS',
] as const;

describe('package root exports (v0.36.0)', () => {
  test.each(NEW_RUNTIME_EXPORTS)('%s is exported from the barrel', (name) => {
    expect((shared as Record<string, unknown>)[name]).toBeDefined();
  });
});
