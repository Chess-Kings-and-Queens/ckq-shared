// Types-only module. The compile-time cases (typed fixtures, `satisfies`, `@ts-expect-error`) are
// checked by `npm run typecheck` (tsc --noEmit), which covers this file: ts-jest only transpiles
// here (tsconfig `isolatedModules`). Jest runs the narrowing and event-list assertions.
import type {
  LiveboardClientToServerEvents,
  LiveboardServerToClientEvents,
  MissionMoveAck,
  MissionMoveRefusedAck,
  ParticipantHistoryAck,
  QuizMoveResultPayload,
  QuizMoveResultStatus,
  QuizMoveTerminalResult,
  QuizRecentAnswer,
  SessionJoinAck,
  SessionSyncPayload,
  TournamentClocksWire,
  TournamentByeMoveAck,
  TournamentByeMoveRefusedAck,
  TournamentGameResumedPayload,
  TournamentMyGame,
} from '../index';
import { MOVE_ACK_GONE_ERRORS } from '../index';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const NOW = 1795000000000;

// Fixtures copy what live-classroom-server 7a74edd sends (src/rooms/sessionRoom.js buildSyncPayload).
const PVP_CLOCKS: TournamentClocksWire = { white: 299500, black: 300000, turnStartedAt: null, firstMoveDeadline: null, serverNow: NOW };

const BYE_GAME: TournamentMyGame = {
  gameId: 'g1', color: 'white', opponentName: 'Stockfish L5', engineLevel: 5, fen: START,
  moves: [{ san: 'e4', fen: AFTER_E4, byPlayer: true, moveIndex: 0, lagMs: 12, compMs: 12 }],
  clocks: null,
  clock: { playerMs: 299000, engineMs: 300000, incrementMs: 0, turnStartedAt: '2026-11-20T15:00:00.000Z', serverNow: '2026-11-20T15:00:01.000Z' },
  status: 'active', drawOfferBy: null,
};

const PVP_GAME: TournamentMyGame = {
  gameId: 'g2', color: 'black', opponentName: 'Ana B', engineLevel: null, fen: AFTER_E4,
  moves: [{ san: 'e4', byColor: 'white', clockAfterMs: 299500, at: NOW, lagMs: 0, compMs: 0, clientMoveTimeMs: null }],
  clocks: PVP_CLOCKS, clock: null, status: 'paused', drawOfferBy: null,
};

const LINE_ONE_RESULT: QuizMoveTerminalResult = {
  status: 'alternate', verdict: 'equivalent', message: 'Alternate solution, equally good!', score: 10, totalScore: 10, correctAnswer: null,
  line: 0, lineCount: 2,
  nextLine: { index: 1, fen: AFTER_E4, playerColor: 'black', branchMove: '1... c5', branchFen: AFTER_E4, branchSan: 'c5' },
};

const SYNC: SessionSyncPayload = {
  mode: 'tournament', status: 'active', currentFen: START, currentMaterial: null, shapes: [['e2', 'e4', 'green']],
  orientation: 'white', boardControllerId: null, boardGame: { pgn: '1. e4 *', path: [0] },
  quizDeadline: null, quizTimeLimit: null, quizMaxScore: 10, quizStartedAt: null,
  quizPlayerColor: null, quizEngineJudge: null, quizAllOrNothing: false, myQuizPending: false, myQuizResult: null,
  quizPuzzleType: 'regular', quizLineCount: 0, quizRoundMaxScore: null, myQuizLine: null, myQuizLineResults: [LINE_ONE_RESULT],
  leaderboard: [{
    userId: 'u1', firstName: 'Kai', lastName: 'L', score: 3, answeredCurrentQuiz: true, quizLinesDone: 1, finishedCurrentMission: false,
    recentAnswers: [
      { isCorrect: false, answer: 'timeout', correctAnswer: '1. Qh5', line: 0, quizNumber: 2, at: NOW },
      { isCorrect: true, answer: '1. Qh5', correctAnswer: '1. Qh5', moves: ['Qh5'], attemptNumber: 1, score: 3, verdict: null, line: 0, quizNumber: 1, at: NOW },
    ],
    recentMissionAttempts: [{ round: 1, attemptNumber: 2, maxAttempts: 3, succeeded: true, outcome: 'win', viewToken: null, at: NOW }],
  }],
  participants: [{ userId: 'u1', firstName: 'Kai', lastName: 'L', online: false, status: 'absent' }],
  myScore: 3, myAnswers: [], myQuizPlies: [], hasAnsweredCurrentQuiz: false,
  missionConfig: null, missionDeadline: null, missionStartedAt: null, myMissionMoves: [], myMissionClock: null,
  hasFinishedCurrentMission: false, myMissionAttemptNumber: 1, myMissionPointsAvailable: null,
  tournament: {
    config: { name: null, rounds: 3, timeControlSeconds: 300, incrementSeconds: 0, fallbackEngineLevel: 10, engineLevel: null, startFen: null, breakSeconds: 60, allowDrawOffers: true },
    round: 1, roundStatus: 'active',
    standings: [{ playerId: 'u1', name: 'Kai L', points: 0, sb: 0, wins: 0, games: 0 }],
    pairings: [{ white: 'u1', black: 'engine', gameId: 'g1' }],
    nextRoundStartsAt: null, myGame: BYE_GAME, endingAfterRound: false,
  },
  hosted: { name: 'November Monthly', format: 'tournament', nextRoundAt: '2026-11-20T15:00:00.000Z', nextRoundNumber: 1, scheduleId: '6650a1b2c3d4e5f6a7b8c9d1' },
  tournamentEnded: false, finalStandings: null, tournamentId: '6650a1b2c3d4e5f6a7b8c9d0', scheduleId: '6650a1b2c3d4e5f6a7b8c9d1',
  missionGames: {}, quizStudentLines: {}, currentAttemptMoves: {},
  tournamentGames: {
    g1: { round: 1, white: { id: 'u1', name: 'Kai L' }, black: { id: 'engine', name: 'Stockfish L5', level: 5 }, moves: [],
      status: 'active', result: null, resultReason: null, clocks: null, clock: null, drawOfferBy: null, startFen: null },
    g2: { round: 1, white: { id: 'u2', name: 'Ana B' }, black: { id: 'u3', name: 'Bo C' }, moves: [{ san: 'e4', from: 'e2', to: 'e4', after: AFTER_E4 }],
      status: 'paused', result: null, resultReason: null, clocks: PVP_CLOCKS, clock: null, drawOfferBy: 'white', startFen: null },
  },
};

// Compile-time rejections (tsc fails if any of these becomes legal).
// @ts-expect-error a terminal 'correct' result never carries a verdict
const BAD_CORRECT: QuizMoveResultPayload = { status: 'correct', verdict: 'better', message: null, score: 10, totalScore: 10, correctAnswer: null, line: 0, lineCount: 1, nextLine: null };
// @ts-expect-error a terminal result always says which line it is for
const BAD_NO_LINE: QuizMoveResultPayload = { status: 'wrong', verdict: 'wrong', message: null, score: 0, totalScore: 0, correctAnswer: null };
// @ts-expect-error a stale-index rejection always says which index the server expects
const BAD_STALE: QuizMoveResultPayload = { status: 'rejected', reason: 'stale-index' };
// @ts-expect-error a bye game has no PvP clocks
const BAD_BYE: TournamentMyGame = { ...BYE_GAME, clocks: PVP_CLOCKS };
// @ts-expect-error the PvP clock always carries the server's now
const BAD_CLOCKS: TournamentClocksWire = { white: 1, black: 1, turnStartedAt: null, firstMoveDeadline: null };
// @ts-expect-error 'tournament:create' is a coach event, not in the student map
const BAD_CLIENT_EVENT: keyof LiveboardClientToServerEvents = 'tournament:create';
// @ts-expect-error 'quiz:student-move' goes to the coach only, not in the student map
const BAD_SERVER_EVENT: keyof LiveboardServerToClientEvents = 'quiz:student-move';
void [BAD_CORRECT, BAD_NO_LINE, BAD_STALE, BAD_BYE, BAD_CLOCKS, BAD_CLIENT_EVENT, BAD_SERVER_EVENT];

// The terminal statuses are exactly the shared QuizMoveResultStatus (checked in both directions).
const STATUS_A: QuizMoveResultStatus[] = [] as QuizMoveTerminalResult['status'][];
const STATUS_B: QuizMoveTerminalResult['status'][] = [] as QuizMoveResultStatus[];
void [STATUS_A, STATUS_B];

const SERVER_EVENTS = {
  'time:pong': true, 'clock:ping': true, 'session:sync': true, 'session:ended': true, 'session:removed': true,
  'board:moved': true, 'board:set': true, 'shapes:updated': true, 'board:game': true, 'orientation:updated': true,
  'board:control-changed': true, 'mode:changed': true, 'participant:joined': true, 'participant:rejoined': true,
  'participant:left': true, 'participant:removed': true, 'leaderboard:updated': true, 'quiz:started': true,
  'quiz:extended': true, 'quiz:ended': true, 'quiz:move-result': true, 'mission:started': true, 'mission:extended': true,
  'mission:student-move': true, 'mission:result-ack': true, 'mission:retry': true, 'mission:student-retry': true,
  'mission:student-retry-started': true, 'mission:student-finished': true, 'mission:ended': true,
  'tournament:started': true, 'tournament:round-started': true, 'tournament:game-moved': true,
  'tournament:move-rejected': true, 'tournament:draw-offered': true, 'tournament:draw-declined': true,
  'tournament:game-paused': true, 'tournament:game-resumed': true, 'tournament:bye-move-relay': true,
  'tournament:game-ended': true, 'tournament:standings-updated': true, 'tournament:round-ended': true,
  'tournament:ending-after-round': true, 'tournament:ended': true, 'tournament:error': true,
} satisfies Record<keyof LiveboardServerToClientEvents, true>;

const CLIENT_EVENTS = {
  'time:ping': true, 'session:join': true, 'board:move': true, 'board:set': true, 'shapes:update': true, 'board:game': true,
  'quiz:move': true, 'participant:history': true, 'mission:move': true, 'mission:complete': true, 'mission:retry-started': true,
  'tournament:game-move': true, 'tournament:game-resign': true, 'tournament:game-draw-offer': true,
  'tournament:game-draw-accept': true, 'tournament:game-draw-decline': true, 'tournament:game-complete': true,
  'tournament:bye-move': true,
} satisfies Record<keyof LiveboardClientToServerEvents, true>;

describe('liveboard protocol event maps', () => {
  test('the server-to-client map lists the 45 events a student socket receives', () => {
    expect(Object.keys(SERVER_EVENTS)).toHaveLength(45);
  });

  test('the client-to-server map lists the 18 events a student socket may send', () => {
    expect(Object.keys(CLIENT_EVENTS)).toHaveLength(18);
  });

  test('the board-control events and the two newer student events are in the client map', () => {
    expect(Object.keys(CLIENT_EVENTS)).toEqual(
      expect.arrayContaining(['board:move', 'board:set', 'shapes:update', 'board:game', 'mission:retry-started', 'participant:history']),
    );
  });
});

describe('liveboard protocol narrowing', () => {
  test('a tournament game narrows to bye or PvP on clocks', () => {
    const read = (g: TournamentMyGame) => (g.clocks === null ? g.engineLevel : g.clocks.serverNow);
    expect(read(BYE_GAME)).toBe(5);
    expect(read(PVP_GAME)).toBe(NOW);
  });

  test('a recent answer narrows to a timeout on the missing moves', () => {
    const answers: QuizRecentAnswer[] = SYNC.leaderboard[0].recentAnswers;
    expect(answers.map((a) => ('moves' in a ? a.moves.join(' ') : a.answer))).toEqual(['timeout', 'Qh5']);
  });

  test('a quiz move result narrows on status to the next line', () => {
    const next = (r: QuizMoveResultPayload) =>
      r.status === 'rejected' || r.status === 'continue' || r.status === 'checking' ? null : r.nextLine?.index ?? null;
    expect(next(LINE_ONE_RESULT)).toBe(1);
    expect(next({ status: 'continue', ply: 0, opponent: null })).toBeNull();
    expect(next({ status: 'rejected', reason: 'stale-index', expectedIndex: 2 })).toBeNull();
  });

  test('a resumed game narrows to the returning player on yourColor', () => {
    const own: TournamentGameResumedPayload = { fen: AFTER_E4, moves: [], clocks: PVP_CLOCKS, yourColor: 'black' };
    const notice: TournamentGameResumedPayload = { gameId: 'g2', fen: AFTER_E4, clocks: PVP_CLOCKS };
    const id = (p: TournamentGameResumedPayload) => ('yourColor' in p ? p.yourColor : p.gameId);
    expect([id(own), id(notice)]).toEqual(['black', 'g2']);
  });

  test('a mission:move rejection carrying moves is the restore case', () => {
    const acks: MissionMoveAck[] = [
      { ok: true },
      { ok: true, duplicate: true },
      { ok: false, error: 'out-of-turn', fen: START, moves: [] },
      { ok: false, error: 'move-index-gap' },
    ];
    expect(acks.map((a) => !a.ok && 'moves' in a)).toEqual([false, false, true, false]);
  });

  test('a refused session:join reads as removed', () => {
    const acks: SessionJoinAck[] = [{ ok: true }, { ok: false, error: 'removed' }, { ok: false, error: 'join-failed' }];
    expect(acks.map((a) => !a.ok && a.error === 'removed')).toEqual([false, true, false]);
  });

  test('a participant:history ack narrows on ok', () => {
    const acks: ParticipantHistoryAck[] = [
      { ok: true, studentId: 'u1', name: 'Kai L', quiz: [{ quizNumber: 1, line: 0, isCorrect: true, verdict: null, answer: '1. Qh5', correctAnswer: '1. Qh5', score: 3, at: NOW }], missions: [] },
      { ok: false, error: 'forbidden' },
    ];
    expect(acks.map((a) => (a.ok ? a.quiz.length : a.error))).toEqual([1, 'forbidden']);
  });

  test('the sync fixture keeps the hosted lobby, board game and bye fields', () => {
    expect(SYNC.hosted?.nextRoundNumber).toBe(1);
    expect(SYNC.boardGame?.path).toEqual([0]);
    expect(SYNC.tournament?.myGame?.gameId).toBe('g1');
    expect(SYNC.tournamentGames.g1.clocks).toBeNull();
  });
});

describe('move refusal acks', () => {
  test('every refusal code is assignable to its ack union', () => {
    const mission: MissionMoveRefusedAck[] = [
      { ok: false, error: 'no-active-mission' },
      { ok: false, error: 'no-participant' },
      { ok: false, error: 'move-index-gap' },
    ];
    const bye: TournamentByeMoveRefusedAck[] = [
      { ok: false, error: 'no-active-tournament' },
      { ok: false, error: 'no-such-game' },
      { ok: false, error: 'not-your-game' },
      { ok: false, error: 'move-index-gap' },
    ];
    const missionAcks: MissionMoveAck[] = mission;
    const byeAcks: TournamentByeMoveAck[] = bye;
    expect(missionAcks).toHaveLength(3);
    expect(byeAcks).toHaveLength(4);
  });

  test('a code from the other event is not a refusal of this one', () => {
    // @ts-expect-error not-your-game is a tournament:bye-move refusal only
    const wrongMission: MissionMoveRefusedAck = { ok: false, error: 'not-your-game' };
    // @ts-expect-error no-participant is a mission:move refusal only
    const wrongBye: TournamentByeMoveRefusedAck = { ok: false, error: 'no-participant' };
    expect([wrongMission.ok, wrongBye.ok]).toEqual([false, false]);
  });

  test('the gone list is exactly the refusal codes minus move-index-gap', () => {
    type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
    const goneListIsExact: Equals<
      (typeof MOVE_ACK_GONE_ERRORS)[number],
      Exclude<MissionMoveRefusedAck['error'] | TournamentByeMoveRefusedAck['error'], 'move-index-gap'>
    > = true;
    expect(goneListIsExact).toBe(true);
  });
});
