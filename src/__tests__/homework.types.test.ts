import { HOMEWORK_CONFLICT_CODES, homeworkConflictCode, MATERIAL_KINDS, PICK_STEPS, PUZZLE_TYPES, PUZZLE_TYPE_RULES, PUZZLE_TYPE_STUDENT_NOTES, puzzleTypeRules, puzzleTypeStudentNote } from '../types/homework';
import type { CreateHomeworkResultInput, HomeworkPositionAnswer, HomeworkPuzzleLine, HomeworkPuzzlePayload, HomeworkQuestion, HomeworkReport, HomeworkResultRecord, HomeworkRow, OpenPositionResult, PositionSubmissionOutcome, SubmitHomeworkMoveInput, SubmitHomeworkMoveResult, SubmitHomeworkPickInput, SubmitHomeworkPickResult } from '../types/homework';
import type { SubmitWorkbookMoveInput } from '../types/workbook';

describe('homeworkConflictCode', () => {
  test.each([...HOMEWORK_CONFLICT_CODES])('409 + %s returns the code', (code) => {
    expect(homeworkConflictCode(409, code)).toBe(code);
  });
  test('409 + any other message is null', () => {
    expect(homeworkConflictCode(409, 'something-else')).toBeNull();
    expect(homeworkConflictCode(409, 42)).toBeNull();
  });
  test('a non-409 status is null even for a known code', () => {
    expect(homeworkConflictCode(400, 'version-conflict')).toBeNull();
    expect(homeworkConflictCode(null, 'version-conflict')).toBeNull();
    expect(homeworkConflictCode(undefined, 'version-conflict')).toBeNull();
  });
});

describe('contract types', () => {
  test('CreateHomeworkResultInput compiles without totalPositions', () => {
    const input: CreateHomeworkResultInput = { materialCollectionId: 'c1', materials: [{ materialId: 'm1' }] };
    expect(input.materials[0].totalPositions).toBeUndefined();
  });
  test('SubmitWorkbookMoveInput carries attemptNumber', () => {
    const input: SubmitWorkbookMoveInput = { materialId: 'm1', positionIndex: 0, moves: ['e4'], attemptNumber: 2 };
    expect(input.attemptNumber).toBe(2);
  });
  test('PositionSubmissionOutcome keys are all required', () => {
    // @ts-expect-error the backend always sends all three keys
    const empty: PositionSubmissionOutcome = {};
    const full: PositionSubmissionOutcome = { positionDone: true, attemptsLeft: 1, nextPositionIndex: null };
    expect(empty.positionDone).toBeUndefined();
    expect(full.nextPositionIndex).toBeNull();
  });
  test('OpenPositionResult carries the attempt and the resume moves', () => {
    const open: OpenPositionResult = { timeLimit: 60, secondsRemaining: 41.2, attemptNumber: 2, attemptsAllowed: 3, resumeMoves: ['e4', 'e5'] };
    expect(open.resumeMoves).toEqual(['e4', 'e5']);
  });
});

describe('puzzle type contract', () => {
  const base = {
    title: 't',
    games: ['1. e4 e5', '1. d4'],
    totalPositions: 2,
    timeLimit: 60,
    maxAttempts: 3,
    materialCollectionId: 'c1',
    groupClassSessionId: null,
    homeworkMaterialId: 'm1',
    engineJudge: false,
    kind: 'board' as const,
    questions: [],
    nameTheMove: false,
    allowIllegalPosition: false,
    showPuzzleText: false,
      activeViolations: 0,
      rushViolationsToBlock: 3,
      minThinkTimePct: 20,
    isBlocked: false,
    strikesLeft: 3,
    rushThresholdSeconds: null,
    changed: false,
  };
  test('PUZZLE_TYPES lists the three types', () => {
    expect([...PUZZLE_TYPES]).toEqual(['regular', 'withOpponentMoves', 'withVariations']);
  });
  test('PUZZLE_TYPE_RULES has a row per type with the D2 matrix', () => {
    expect(Object.keys(PUZZLE_TYPE_RULES)).toEqual([...PUZZLE_TYPES]);
    expect(PUZZLE_TYPE_RULES).toEqual({
      regular: { bothSides: false, expandVariations: false },
      withOpponentMoves: { bothSides: true, expandVariations: false },
      withVariations: { bothSides: false, expandVariations: true },
    });
  });
  test('puzzleTypeRules reads each type and falls back to regular', () => {
    expect(puzzleTypeRules('withVariations')).toEqual({ bothSides: false, expandVariations: true });
    expect(puzzleTypeRules('withOpponentMoves')).toEqual({ bothSides: true, expandVariations: false });
    for (const v of ['regular', undefined, null, 'bogus']) {
      expect(puzzleTypeRules(v)).toEqual({ bothSides: false, expandVariations: false });
    }
  });
  test('the table and its rows are frozen', () => {
    expect(Object.isFrozen(PUZZLE_TYPE_RULES)).toBe(true);
    for (const t of PUZZLE_TYPES) expect(Object.isFrozen(PUZZLE_TYPE_RULES[t])).toBe(true);
  });
  test('a HomeworkPuzzleLine without branchFen/branchSan is rejected by the compiler', () => {
    // @ts-expect-error branchFen and branchSan are required
    const bad: HomeworkPuzzleLine = { game: 0, branchMove: null };
    expect(bad.game).toBe(0);
  });
  test('a payload with puzzleType and lines compiles; lines parallels games', () => {
    const payload: HomeworkPuzzlePayload = {
      ...base,
      puzzleType: 'withOpponentMoves',
      lines: [
        { game: 0, branchMove: null, branchFen: null, branchSan: null },
        { game: 1, branchMove: '1... c5', branchFen: 'f', branchSan: 'c5' },
      ],
      prompts: [null, 'text'],
    };
    expect(payload.lines).toHaveLength(payload.games.length);
    expect(payload.prompts).toHaveLength(payload.games.length);
  });
  test('a payload without them is rejected by the compiler', () => {
    // @ts-expect-error puzzleType, lines and prompts are required
    const bad: HomeworkPuzzlePayload = { ...base };
    expect(bad.games).toHaveLength(2);
  });
  test('a payload missing only prompts is rejected by the compiler', () => {
    // @ts-expect-error prompts is required
    const bad: HomeworkPuzzlePayload = { ...base, puzzleType: 'regular', lines: [] };
    expect(bad.kind).toBe('board');
  });
  test('a payload carries nameTheMove and allowIllegalPosition', () => {
    const payload: HomeworkPuzzlePayload = { ...base, puzzleType: 'regular', lines: [], prompts: [], nameTheMove: true, allowIllegalPosition: true };
    expect(payload.nameTheMove).toBe(true);
    expect(payload.allowIllegalPosition).toBe(true);
  });
  test('a payload missing nameTheMove is rejected by the compiler', () => {
    // @ts-expect-error nameTheMove is required
    const bad: HomeworkPuzzlePayload = { ...base, puzzleType: 'regular', lines: [], prompts: [], nameTheMove: undefined };
    expect(bad.allowIllegalPosition).toBe(false);
  });
  test('a payload carries showPuzzleText', () => {
    const payload: HomeworkPuzzlePayload = { ...base, puzzleType: 'regular', lines: [], prompts: [], showPuzzleText: true };
    expect(payload.showPuzzleText).toBe(true);
  });
  test('a payload without showPuzzleText is rejected by the compiler', () => {
    const withoutText: Omit<typeof base, 'showPuzzleText'> = base;
    // @ts-expect-error showPuzzleText is required
    const bad: HomeworkPuzzlePayload = { ...withoutText, puzzleType: 'regular', lines: [], prompts: [] };
    expect(bad.games).toHaveLength(2);
  });
});

describe('question kinds contract', () => {
  const record: HomeworkResultRecord = { _id: 'r1', materialResults: [] };
  test('MATERIAL_KINDS equals the literal list', () => {
    expect([...MATERIAL_KINDS]).toEqual(['board', 'choice', 'square']);
  });
  test('a SubmitHomeworkMoveInput carries moves or answer', () => {
    const board: SubmitHomeworkMoveInput = { materialId: 'm1', positionIndex: 0, moves: ['e4'] };
    const question: SubmitHomeworkMoveInput = { materialId: 'm1', positionIndex: 0, answer: { choiceId: 'a' } };
    expect(board.moves).toEqual(['e4']);
    expect(question.answer).toEqual({ choiceId: 'a' });
  });
  test('moves and answer together are rejected by the compiler', () => {
    // @ts-expect-error exactly one of moves and answer
    const bad: SubmitHomeworkMoveInput = { materialId: 'm1', positionIndex: 0, moves: ['e4'], answer: { choiceId: 'a' } };
    expect(bad.positionIndex).toBe(0);
  });
  test('a SubmitHomeworkMoveResult carries attemptCorrect and reveal', () => {
    const result: SubmitHomeworkMoveResult = {
      result: record,
      rushViolation: null,
      positionDone: true,
      attemptsLeft: 0,
      nextPositionIndex: null,
      judge: null,
      attemptCorrect: true,
      reveal: { choiceIds: ['a'], squares: [], move: null, explanation: 'because' },
    };
    expect(result.attemptCorrect).toBe(true);
    expect(result.reveal?.choiceIds).toEqual(['a']);
  });
});

describe('pick contract', () => {
  const record: HomeworkResultRecord = { _id: 'r1', materialResults: [] };
  test('PICK_STEPS equals the literal list', () => {
    expect([...PICK_STEPS]).toEqual(['square', 'piece', 'file', 'rank']);
  });
  test('a SubmitHomeworkPickInput carries each pick shape', () => {
    const base = { materialId: 'm1', positionIndex: 0 };
    const picks: SubmitHomeworkPickInput[] = [
      { ...base, pick: { square: 'e4' } },
      { ...base, pick: { piece: 'N' } },
      { ...base, pick: { file: 'c' } },
      { ...base, pick: { rank: '7' } },
    ];
    expect(picks.map((p) => Object.keys(p.pick)[0])).toEqual(['square', 'piece', 'file', 'rank']);
  });
  test('a pick with two keys is rejected by the compiler', () => {
    // @ts-expect-error exactly one of square, piece, file and rank
    const bad: SubmitHomeworkPickInput = { materialId: 'm1', positionIndex: 0, pick: { piece: 'N', file: 'c' } };
    expect(bad.positionIndex).toBe(0);
  });
  test('a SubmitHomeworkPickResult carries the verdict, the picks and the next step', () => {
    const result: SubmitHomeworkPickResult = {
      result: record,
      pickCorrect: true,
      picks: [{ step: 'square', value: 'c2', isCorrect: true }],
      nextStep: 'square',
      positionDone: false,
      nextPositionIndex: null,
      reveal: null,
    };
    expect(result.picks[0].value).toBe('c2');
    expect(result.nextStep).toBe('square');
  });
  test('a HomeworkPositionAnswer has picks optionally', () => {
    const without: HomeworkPositionAnswer = { positionIndex: 0, attempts: [], bestScore: 0, isCorrect: false, isCompleted: false };
    const withPicks: HomeworkPositionAnswer = { ...without, picks: [{ step: 'piece', value: 'N', isCorrect: false }] };
    expect(without.picks).toBeUndefined();
    expect(withPicks.picks).toHaveLength(1);
  });
});

describe('web contract additions (beginner-puzzle-kinds-web)', () => {
  test('a HomeworkQuestion carries squareCount, a number or null', () => {
    const click: HomeworkQuestion = { id: '0', prompt: 'Click the pawns.', fen: '8/8/8/8/8/8/2P1P3/8 w - - 0 1', choices: [], squareCount: 2 };
    const choice: HomeworkQuestion = { ...click, id: 'q1', squareCount: null };
    expect(click.squareCount).toBe(2);
    expect(choice.squareCount).toBeNull();
  });
  test('a HomeworkQuestion without squareCount is rejected by the compiler', () => {
    // @ts-expect-error squareCount is required
    const bad: HomeworkQuestion = { id: '0', prompt: '', fen: null, choices: [] };
    expect(bad.id).toBe('0');
  });
  test('a HomeworkReport needs kind and a position may carry clicks', () => {
    const positions: HomeworkReport['positions'] = {
      '0': { score: 1, scorePct: 100, timeSpent: 3, status: 'correct', clicks: { total: 2, found: 1, wrong: 1 } },
    };
    const report: HomeworkReport = {
      homework: { noOfGames: 1, timeLimit: 0, createdAt: '2026-11-24T12:00:00Z', materialCollection: null, status: 'completed' },
      score: 1,
      maxScore: 1,
      scorePct: 100,
      timeSpent: 3,
      lesson: null,
      student: 's1',
      positions,
      puzzles: null,
      summary: { puzzleCount: 1, puzzlesAttempted: 1, lineCount: 1, linesAttempted: 1 },
      changed: false,
      kind: 'square',
    };
    expect(report.kind).toBe('square');
    expect(report.positions['0'].clicks?.found).toBe(1);
    const withoutKind: Omit<HomeworkReport, 'kind'> = report;
    // @ts-expect-error kind is required
    const bad: HomeworkReport = withoutKind;
    expect(bad.student).toBe('s1');
  });
});

describe('HomeworkRow', () => {
  const row = {
    _id: 'hw-1',
    coachName: '',
    noOfGames: 3,
    noOfAnswers: 0,
    completionPercentage: 0,
    scorePct: 0,
    timeSpent: 0,
    status: 'not_started' as const,
    createdAt: '2026-11-13T12:00:00Z',
    isNext: false,
  };
  test('a specialized row with no class compiles and reads back', () => {
    const hw: HomeworkRow = { ...row, isSpecialized: true };
    expect(hw.isSpecialized).toBe(true);
    expect(hw.groupClassName).toBeUndefined();
  });
  test('a row without isSpecialized is rejected by the compiler', () => {
    // @ts-expect-error isSpecialized is required
    const bad: HomeworkRow = { ...row };
    expect(bad._id).toBe('hw-1');
  });
});

describe('puzzleTypeStudentNote', () => {
  test('a both-sides puzzle carries the opponent-move note', () => {
    expect(puzzleTypeStudentNote('withOpponentMoves')).toBe("You have to find your opponent's best move as well.");
  });
  test('regular, withVariations, missing and unknown values have no note', () => {
    for (const v of ['regular', 'withVariations', undefined, null, '', 'nonsense']) {
      expect(puzzleTypeStudentNote(v)).toBeNull();
    }
  });
  test('the table has a key for every puzzle type and is frozen', () => {
    expect(Object.keys(PUZZLE_TYPE_STUDENT_NOTES)).toEqual([...PUZZLE_TYPES]);
    expect(Object.isFrozen(PUZZLE_TYPE_STUDENT_NOTES)).toBe(true);
  });
});
