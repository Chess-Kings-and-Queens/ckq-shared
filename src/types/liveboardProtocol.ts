// ── Liveboard socket protocol (student side) ─────────────────────────────────
//
// Every Socket.io event a STUDENT socket receives from, or may send to,
// live-classroom-server (LCS), typed from the server's own emits and handlers at
// live-classroom-server master 7a74edd. The server is the source of truth: each
// type cites the emitting or handling line in `src/rooms/sessionRoom.js` (cited
// below as `sessionRoom.js:<line>`), `src/services/tournamentEngine.js`,
// `src/services/socketLag.js` or `src/server.js`.
//
// Coach-only events are not here: session:start, session:end, orientation:update,
// board:control, mode:set, quiz:start, quiz:end, quiz:extend, participant:remove,
// mission:start, mission:end, mission:extend, admin:score-adjust,
// tournament:create, tournament:next-round, tournament:end (client to server) and
// quiz:start-rejected, quiz:student-move, quiz:student-line (server to coach).
//
// Conventions: a field the server always sends is required; a value it can
// leave empty is `| null`; a field it only sometimes sends is optional (`?`).
// Timestamps named `*Deadline`, `*StartedAt`, `*StartsAt`, `at`, `serverTime`
// and every TournamentClocksWire stamp are epoch milliseconds on the SERVER's
// clock. `hosted.nextRoundAt`, `answeredAt` and every MissionClock timestamp are
// ISO strings. A client displays these values; it never derives a grade, score,
// rank or result from them (ADR frontend-005).
//
// Usage: Socket<LiveboardServerToClientEvents, LiveboardClientToServerEvents>.

import type { serializeShapes } from '../chessUtils';
import type { Side } from '../chessGame';
import type { TournamentResultReason } from '../gameOutcome';
import type { ValidateAppendError } from '../missionReplay';
import type { PuzzleType } from './homework';
import type { QuizVerdict } from './liveboard';
import type { MissionClock, MissionResult, MissionResultReason } from './missions';
import type { OnlineTournamentFormat } from './onlineTournaments';
import type { StandingsRow, TournamentGameResult } from './tournamentResults';

// ── Shared sub-shapes ────────────────────────────────────────────────────────

/** Board arrows and highlights in `serializeShapes` wire format: [orig, dest, brush][]; dest "" = square highlight. Read with `deserializeShapes`. */
export type LiveboardWireShapes = ReturnType<typeof serializeShapes>;

/** sessionRoom.js:82 `mode`; 'tournament' is set when a tournament starts and by the coach's mode:set (:4767). */
export type LiveboardMode = 'display' | 'quiz' | 'mission' | 'tournament';

/** sessionRoom.js:83 `status`; a student who joins before the coach starts the class syncs 'waiting'. No event announces the change to 'active'. */
export type LiveboardSessionStatus = 'waiting' | 'active' | 'ended';

/** sessionRoom.js:549 presenceStatus: present = connected; absent = offline but still paired; inactive = removed by the coach, or offline past the pairing window. */
export type LiveboardParticipantStatus = 'present' | 'absent' | 'inactive';

/** The engine-judge verdict on a quiz answer, as LCS records and sends it (the shared `QuizVerdict`). */
export type QuizResultVerdict = QuizVerdict;

/** 'win' | 'loss' | 'draw', from the student's point of view. */
export type LiveboardMissionOutcome = MissionResult['outcome'];

/** Reasons a class-mission attempt's result reaches its player (sessionRoom.js:3901 board result, :3849 / :4162 timeout, :3941 resign). 'forfeit' is recorded but never sent. */
export type LiveboardMissionResultReason = Exclude<MissionResultReason, 'forfeit'>;

/** The shared board's game: the move tree as PGN and the cursor as child indexes from the root (sessionRoom.js:3281). */
export interface LiveboardBoardGame {
  pgn: string;
  path: number[];
}

/** One line of a quiz round (sessionRoom.js:202 lineInfo). The branch fields are null for the main line. */
export interface QuizLineInfo {
  /** 0-based line number. */
  index: number;
  /** The line's start position. */
  fen: string;
  /** The side shown at the bottom (the line's first mover). */
  playerColor: Side;
  /** The opponent move the line starts after, as a label (e.g. "1... c5"). */
  branchMove: string | null;
  /** The position that move was played from. */
  branchFen: string | null;
  /** That move's bare SAN. */
  branchSan: string | null;
}

/** A graded quiz answer on a leaderboard entry (sessionRoom.js:809 recordQuizAnswer). */
export interface QuizRecentAnswerGraded {
  isCorrect: boolean;
  /** The student's formatted line. */
  answer: string;
  /** The formatted solution; null only when the solution cannot be formatted. */
  correctAnswer: string | null;
  /** Every SAN played on the line (student moves and server-played replies). */
  moves: string[];
  /** Always 1 on the liveboard. */
  attemptNumber: number;
  score: number;
  /** null for an exact match and for partial credit scored at quiz end. */
  verdict: QuizResultVerdict | null;
  /** 0-based line of the quiz this answer is for. */
  line: number;
  /** 1-based count of quizzes started this session. */
  quizNumber: number;
  /** Epoch ms. */
  at: number;
}

/** A quiz that timed out with no move played (sessionRoom.js:896 autoScoreUnansweredQuiz). */
export interface QuizRecentAnswerTimeout {
  isCorrect: false;
  answer: 'timeout';
  correctAnswer: string | null;
  line: number;
  quizNumber: number;
  at: number;
}

/** Narrow with `'moves' in answer`. */
export type QuizRecentAnswer = QuizRecentAnswerGraded | QuizRecentAnswerTimeout;

/** One recorded class-mission attempt (sessionRoom.js:1119 recordMissionAttempt). */
export interface LeaderboardMissionAttempt {
  /** 1-based mission round of this session. */
  round: number;
  attemptNumber: number;
  maxAttempts: number;
  succeeded: boolean;
  outcome: LiveboardMissionOutcome;
  /** Key for the saved game; null for a guest. */
  viewToken: string | null;
  /** Epoch ms. */
  at: number;
}

/** One row of leaderboard:updated / session:sync (utils/leaderboard.js:7 serializeLeaderboard over sessionRoom.js:3182). Server-sorted: score descending, then name. */
export interface LeaderboardEntry {
  userId: string;
  firstName: string;
  lastName: string;
  score: number;
  /** True once the student has finished every line of the running quiz. */
  answeredCurrentQuiz: boolean;
  /** Lines of the running quiz this student has finished. */
  quizLinesDone: number;
  finishedCurrentMission: boolean;
  /** Newest first, at most 5. */
  recentAnswers: QuizRecentAnswer[];
  /** Newest first, at most 5. */
  recentMissionAttempts: LeaderboardMissionAttempt[];
}

/** session:sync presence row (sessionRoom.js:402). `online` is `status === 'present'`. */
export interface LiveboardParticipant {
  userId: string;
  firstName: string;
  lastName: string;
  online: boolean;
  status: LiveboardParticipantStatus;
}

/** One of the requesting student's own recorded quiz answers, session:sync `myAnswers` (sessionRoom.js:825, :907). */
export interface QuizAnswerRecord {
  /** Material id the quiz came from, or null. */
  material: string | null;
  /** Formatted line, or 'timeout' for a timeout with no move. */
  answer: string;
  playerMoves: string[];
  isCorrect: boolean;
  score: number;
  correctCount: number;
  totalPlayerMoves: number;
  /** Seconds. */
  timeTaken: number;
  /** Absent on a timeout with no move (sessionRoom.js:907). */
  verdict?: QuizResultVerdict | null;
  line: number;
  quizNumber: number;
  correctAnswer: string | null;
  /** ISO datetime (a Date serialized by socket.io). */
  answeredAt: string;
}

/** A mission or engine-bye move as the SERVER stored it (sessionRoom.js:3856, :4731): its own SAN and FEN, never the client's. */
export interface LiveboardServerMove {
  san: string;
  /** Position after the move. */
  fen: string;
  byPlayer: boolean;
  moveIndex: number;
  /** Present only on a timed game. */
  lagMs?: number;
  /** Present only on a timed game. */
  compMs?: number;
}

/** A class-mission round's config as stored (sessionRoom.js:3631), session:sync `missionConfig`. */
export interface MissionConfig {
  fen: string;
  playerColor: Side;
  objective: 'win' | 'draw';
  stockfishLevel: number;
  /** Round length, seconds. */
  timeLimitSeconds: number;
  points: number;
  maxAttempts: number;
  /** null = no per-game clock this round. */
  timeControlSeconds: number | null;
  incrementSeconds: number | null;
}

/** The PvP clock on the wire (tournamentEngine.js:177 clocksWire). Remaining times in ms; stamps in epoch ms on the server's clock. */
export interface TournamentClocksWire {
  white: number;
  black: number;
  /** When the running turn started; null when the game is not active (paused or finished). */
  turnStartedAt: number | null;
  /** When the side still on its first move loses by no-start; null once both sides have moved, or when the game is not active. */
  firstMoveDeadline: number | null;
  serverNow: number;
}

/** A PvP tournament move as the server stores it (tournamentEngine.js:272). */
export interface TournamentPvpMoveRecord {
  san: string;
  byColor: Side;
  clockAfterMs: number;
  /** Epoch ms. */
  at: number;
  lagMs: number;
  compMs: number;
  clientMoveTimeMs: number | null;
}

/** A PvP move in the session:sync `tournamentGames` map (sessionRoom.js:310). `after` is the FEN after the move. */
export interface TournamentSyncPvpMove {
  san: string;
  from: string;
  to: string;
  after: string;
}

/** Tournament config (sessionRoom.js:4338 coach, :2712 hosted, :2829 league round). Every key is always present. */
export interface TournamentConfig {
  name: string | null;
  rounds: number;
  timeControlSeconds: number;
  incrementSeconds: number;
  fallbackEngineLevel: number;
  /** Override for every bye; null = each student's own level. */
  engineLevel: number | null;
  /** Custom start position for every round; null = standard position. */
  startFen: string | null;
  breakSeconds: number;
  allowDrawOffers: boolean;
}

/** One pairing (sessionRoom.js:1539, :1585). `black` is 'engine' for the engine bye. */
export interface TournamentPairing {
  white: string;
  black: string;
  gameId: string;
}

/** One standings row (services/pairing/standings.js:77), server-sorted: points, sb, wins, name. */
export type TournamentStanding = Pick<StandingsRow, 'playerId' | 'name' | 'points' | 'sb' | 'wins' | 'games'>;

/** The requesting student's own PvP game (sessionRoom.js:342 buildMyGameView). */
export interface TournamentMyPvpGame {
  gameId: string;
  color: Side;
  opponentName: string;
  engineLevel: null;
  fen: string;
  moves: TournamentPvpMoveRecord[];
  clocks: TournamentClocksWire;
  clock: null;
  status: 'active' | 'paused' | 'finished';
  drawOfferBy: Side | null;
}

/** The requesting student's own engine-bye game (sessionRoom.js:342, :1551). The human is always white. */
export interface TournamentMyByeGame {
  gameId: string;
  color: 'white';
  /** Display string, e.g. "Stockfish L10". Read `engineLevel`, never parse this. */
  opponentName: string;
  engineLevel: number;
  /** The bye's start position until a move is stored (the tournament's startFen or the standard position). */
  fen: string;
  moves: LiveboardServerMove[];
  clocks: null;
  /** Server clock; null only for an untimed bye. */
  clock: MissionClock | null;
  status: 'active' | 'finished';
  drawOfferBy: null;
}

/** Narrow on `clocks === null` (bye). */
export type TournamentMyGame = TournamentMyPvpGame | TournamentMyByeGame;

/** session:sync `hosted` (sessionRoom.js:468): non-null only in a scheduler-hosted online tournament or league room. */
export interface HostedTournamentInfo {
  name: string | null;
  format: OnlineTournamentFormat;
  /** ISO datetime of the round this lobby waits for; null once the tournament has ended. */
  nextRoundAt: string | null;
  /** 1-based; null once the tournament has ended. */
  nextRoundNumber: number | null;
  /** OnlineTournamentSchedule id; keys the results REST API. */
  scheduleId: string | null;
}

// ── Quiz results ─────────────────────────────────────────────────────────────

/** Where a terminal quiz result sits in the round (sessionRoom.js:947). */
export interface QuizLineProgress {
  /** 0-based line this result is for. */
  line: number;
  lineCount: number;
  /** The line the student plays next; null after the last line. */
  nextLine: QuizLineInfo | null;
}

/**
 * A terminal quiz result (sessionRoom.js:947 finalizeV2). Narrow on `status`
 * (its four values are the shared `QuizMoveResultStatus`). `score` is this line's
 * score, `totalScore` the student's session total. `message` and `correctAnswer`
 * are the server's text, rendered as sent.
 */
export type QuizMoveTerminalResult = QuizLineProgress &
  (
    | { status: 'correct'; verdict: null; message: null; score: number; totalScore: number; correctAnswer: null }
    | { status: 'alternate'; verdict: 'better' | 'equivalent'; message: string; score: number; totalScore: number; correctAnswer: null }
    | { status: 'acceptable'; verdict: 'acceptable'; message: string; score: number; totalScore: number; correctAnswer: string | null }
    | { status: 'wrong'; verdict: 'wrong'; message: null; score: number; totalScore: number; correctAnswer: string | null }
  );

// ── session:sync ─────────────────────────────────────────────────────────────

/** session:sync `missionGames[studentId]` (sessionRoom.js:257), room-wide. */
export interface SessionSyncMissionGame {
  moves: LiveboardServerMove[];
  finished: boolean;
  outcome: LiveboardMissionOutcome | null;
  succeeded: boolean | null;
  attemptNumber: number;
  /** Assigned once the attempt finishes; null before that and for a guest. */
  viewToken: string | null;
  clock: MissionClock | null;
}

interface SessionSyncTournamentGameBase {
  round: number;
  white: { id: string; name: string };
  status: 'active' | 'paused' | 'finished';
  /** null while playing and for an aborted game. */
  result: TournamentGameResult;
  resultReason: TournamentResultReason | null;
  /** The game's custom start position, or null for the standard position. */
  startFen: string | null;
}

/** session:sync `tournamentGames[gameId]` for a PvP game (sessionRoom.js:299). */
export interface SessionSyncTournamentPvpGame extends SessionSyncTournamentGameBase {
  black: { id: string; name: string };
  moves: TournamentSyncPvpMove[];
  clocks: TournamentClocksWire;
  clock: null;
  drawOfferBy: Side | null;
}

/** session:sync `tournamentGames[gameId]` for an engine bye (sessionRoom.js:299, :1551). */
export interface SessionSyncTournamentByeGame extends SessionSyncTournamentGameBase {
  black: { id: 'engine'; name: string; level: number };
  moves: LiveboardServerMove[];
  clocks: null;
  clock: MissionClock | null;
  drawOfferBy: null;
}

/** Narrow on `clocks === null` (bye). */
export type SessionSyncTournamentGame = SessionSyncTournamentPvpGame | SessionSyncTournamentByeGame;

/** session:sync `tournament` (sessionRoom.js:453): null when no tournament is running. */
export interface SessionSyncTournament {
  config: TournamentConfig;
  round: number;
  roundStatus: 'active' | 'break';
  standings: TournamentStanding[];
  pairings: TournamentPairing[];
  /** Epoch ms (server clock); null during play, after a final round, and for a league round with no next time. */
  nextRoundStartsAt: number | null;
  /** null when the requester has no game this round. */
  myGame: TournamentMyGame | null;
  endingAfterRound: boolean;
}

/** session:sync `quizStudentLines[userId]` (sessionRoom.js:212), room-wide: the line each student is on. */
export interface QuizStudentLine {
  line: number;
  fen: string;
  branchMove: string | null;
}

/** session:sync, sent only to the joining socket (sessionRoom.js:3208; built at :381 buildSyncPayload). Every field is always present. */
export interface SessionSyncPayload {
  mode: LiveboardMode;
  status: LiveboardSessionStatus;
  currentFen: string;
  /** Material id on screen, or null. */
  currentMaterial: string | null;
  shapes: LiveboardWireShapes;
  orientation: Side;
  /** userId of the one student the coach handed the board to; null = coach only. */
  boardControllerId: string | null;
  /** The shared board's game and cursor; null until one is sent, and cleared when an activity starts. */
  boardGame: LiveboardBoardGame | null;
  quizDeadline: number | null;
  /** Seconds; null before the first quiz, then keeps the last quiz's value. */
  quizTimeLimit: number | null;
  /** Points per line of the running (or last) quiz. */
  quizMaxScore: number;
  quizStartedAt: number | null;
  /** Line 0's side; non-null only while mode is 'quiz'. Read `myQuizLine.playerColor` for the requester's current line. */
  quizPlayerColor: Side | null;
  quizEngineJudge: { enabled: boolean } | null;
  /** Accuracy puzzle: full points or 0. false outside a quiz. */
  quizAllOrNothing: boolean;
  /** An engine-judge call for the requester's move is in flight. */
  myQuizPending: boolean;
  /** The requester's result on the LAST line; null while lines remain and outside a quiz. */
  myQuizResult: QuizMoveTerminalResult | null;
  /** 'regular' outside a quiz. */
  quizPuzzleType: PuzzleType;
  /** 0 outside a quiz. */
  quizLineCount: number;
  /** Points per line × lines for the running round; null outside a quiz. */
  quizRoundMaxScore: number | null;
  /** The requester's current line; null outside a quiz. */
  myQuizLine: QuizLineInfo | null;
  /** The requester's results on the lines already finished, in order. */
  myQuizLineResults: QuizMoveTerminalResult[];
  leaderboard: LeaderboardEntry[];
  participants: LiveboardParticipant[];
  myScore: number;
  myAnswers: QuizAnswerRecord[];
  /** The requester's plies on the current line (own moves and server-played replies); [] outside a quiz. */
  myQuizPlies: string[];
  hasAnsweredCurrentQuiz: boolean;
  /** Non-null only while mode is 'mission' with a round running. */
  missionConfig: MissionConfig | null;
  missionDeadline: number | null;
  missionStartedAt: number | null;
  myMissionMoves: LiveboardServerMove[];
  /** A not-yet-started clock (turnStartedAt null) before the first move of a timed round; null when untimed. */
  myMissionClock: MissionClock | null;
  hasFinishedCurrentMission: boolean;
  myMissionAttemptNumber: number;
  myMissionPointsAvailable: number | null;
  tournament: SessionSyncTournament | null;
  hosted: HostedTournamentInfo | null;
  /** True once a tournament here ended and none is running (`tournament` is null then). */
  tournamentEnded: boolean;
  finalStandings: TournamentStanding[] | null;
  /** Running or last-ended LiveboardTournament id. Optional: sent by the server today (sessionRoom.js:483); removed by tournament-single-view step K — clients use scheduleId. */
  tournamentId?: string | null;
  /** OnlineTournamentSchedule id of the running or last-ended tournament; null when it has no schedule. */
  scheduleId: string | null;
  /** Keyed by studentId; room-wide. */
  missionGames: Record<string, SessionSyncMissionGame>;
  /** Keyed by userId; room-wide; {} outside a quiz. */
  quizStudentLines: Record<string, QuizStudentLine>;
  /** Coach-only content: a student's sync always carries {} (sessionRoom.js:496). */
  currentAttemptMoves: Record<string, string[]>;
  /** Keyed by gameId; the current round (or the just-ended round during its break). */
  tournamentGames: Record<string, SessionSyncTournamentGame>;
}

// ── Server → client payloads ─────────────────────────────────────────────────

/** Empty object payload (session:ended, clock:ping). */
export type LiveboardEmptyPayload = Record<string, never>;

/** session:ended, sessionRoom.js:700 (manual end, idle or coach-disconnect timeout, hosted linger or cancel). No reason is sent. */
export type SessionEndedPayload = LiveboardEmptyPayload;

/** session:removed, sessionRoom.js:3572: to the removed student only; the server disconnects the socket right after. */
export interface SessionRemovedPayload {
  /** false = a later session:join is refused with error 'removed'. */
  allowRejoin: boolean;
}

/** time:pong, server.js:72. */
export interface TimePongPayload {
  clientTime: number;
  serverTime: number;
}

/** clock:ping, services/socketLag.js:37 (every 5 s, 4 s timeout). Answer the ack with no arguments. */
export type ClockPingPayload = LiveboardEmptyPayload;

/** board:moved, sessionRoom.js:3242 (room-wide, the mover included). */
export interface BoardMovedPayload {
  san: string;
  from: string;
  to: string;
  fen: string;
  shapes: LiveboardWireShapes;
}

/** board:set, sessionRoom.js:3260 (room-wide, the sender included). */
export interface BoardSetPayload {
  fen: string;
  shapes: LiveboardWireShapes;
  materialId: string | null;
}

/** shapes:updated, sessionRoom.js:3271 (room-wide, the sender included). */
export interface ShapesUpdatedPayload {
  shapes: LiveboardWireShapes;
}

/** board:game, both directions: received from sessionRoom.js:3283 (everyone but the sender), sent to the handler at :3275. */
export type BoardGamePayload = LiveboardBoardGame;

/** orientation:updated, sessionRoom.js:3295 (relayed unvalidated from the coach). */
export interface OrientationUpdatedPayload {
  orientation: Side;
}

/** board:control-changed, sessionRoom.js:978 (room-wide). */
export interface BoardControlChangedPayload {
  /** The student who now drives the board; null = back with the coach. */
  userId: string | null;
  /** coach = handed over or taken back; removed = the controller was removed; activity = a quiz, mission or tournament started or the mode left display; offline = the controller's 15 s reconnect grace ran out. */
  reason: 'coach' | 'removed' | 'activity' | 'offline';
}

/** mode:changed, sessionRoom.js:4793. */
export interface ModeChangedPayload {
  mode: LiveboardMode;
}

/** participant:joined, sessionRoom.js:3198 (first join) and :3127 (a return after the student was unlisted). To everyone but the joiner. */
export interface ParticipantJoinedPayload {
  userId: string;
  firstName: string;
  lastName: string;
}

/** participant:rejoined, sessionRoom.js:3127: only when the returning student was still listed. To everyone but the rejoiner. */
export type ParticipantRejoinedPayload = ParticipantJoinedPayload;

/** participant:left, sessionRoom.js:5036 (after the 15 s reconnect grace). */
export interface ParticipantLeftPayload {
  userId: string;
}

/** participant:removed, sessionRoom.js:3568 (coach) and :5051 (offline past the pairing window). Room-wide; the row becomes 'inactive'. */
export interface ParticipantRemovedPayload {
  userId: string;
  reason: 'coach' | 'offline';
}

/** leaderboard:updated, sessionRoom.js:160 (150 ms debounce). */
export interface LeaderboardUpdatedPayload {
  leaderboard: LeaderboardEntry[];
}

/** quiz:started, sessionRoom.js:3424. Describes line 0; no solution is ever sent. */
export interface QuizStartedPayload {
  materialId: string | null;
  fen: string;
  playerColor: Side;
  /** Seconds. */
  timeLimit: number;
  /** Points per line. */
  maxScore: number;
  deadline: number;
  protocol: 2;
  engineJudge: { enabled: boolean };
  /** Accuracy puzzle: full points or 0. */
  allOrNothing: boolean;
  puzzleType: PuzzleType;
  lineCount: number;
  branchMove: string | null;
  branchFen: string | null;
  branchSan: string | null;
  /** maxScore × lineCount. */
  roundMaxScore: number;
}

/** quiz:extended, sessionRoom.js:3495. */
export interface QuizExtendedPayload {
  deadline: number;
}

/** quiz:ended, sessionRoom.js:786 (reasons set at :756, :3463, :3476). */
export interface QuizEndedPayload {
  leaderboard: LeaderboardEntry[];
  reason: 'all_answered' | 'timeout' | 'manual';
  currentFen: string;
}

export type QuizMoveRejectReason = 'no-quiz' | 'judge-pending' | 'stale-index' | 'not-your-turn' | 'illegal';

/** The server-played reply inside a quiz:move-result 'continue'. */
export interface QuizOpponentMove {
  san: string;
  from: string;
  to: string;
  fen: string;
}

/**
 * quiz:move-result, to the mover only: sessionRoom.js:4820-4864 (rejected, continue, checking), :960 (terminal).
 * Narrow on `status`. In 'continue', `ply` is the index of the last ply the server stored and `opponent`
 * is null when the student plays both sides.
 */
export type QuizMoveResultPayload =
  | { status: 'rejected'; reason: 'stale-index'; expectedIndex: number }
  | { status: 'rejected'; reason: Exclude<QuizMoveRejectReason, 'stale-index'> }
  | { status: 'continue'; ply: number; opponent: QuizOpponentMove | null }
  | { status: 'checking' }
  | QuizMoveTerminalResult;

/** mission:started, sessionRoom.js:3660. */
export interface MissionStartedPayload {
  fen: string;
  playerColor: Side;
  objective: 'win' | 'draw';
  stockfishLevel: number;
  /** Round length, seconds. */
  timeLimit: number;
  points: number;
  maxAttempts: number;
  timeControlSeconds: number | null;
  incrementSeconds: number | null;
  deadline: number;
  round: number;
  /** The round's not-yet-started game clock; null when untimed. */
  clock: MissionClock | null;
}

/** mission:extended, sessionRoom.js:4196. */
export interface MissionExtendedPayload {
  deadline: number;
}

/** mission:student-move, sessionRoom.js:3884 (room-wide; the mover receives it too). */
export interface MissionStudentMovePayload {
  userId: string;
  san: string;
  fen: string;
  byPlayer: boolean;
  moveIndex: number;
  /** Present only on a timed round. */
  clock?: MissionClock;
}

/** mission:result-ack, to the finishing student only: sessionRoom.js:3990 (success), :4057 (retry follows), :4094 (attempts exhausted). */
export interface MissionResultAckPayload {
  succeeded: boolean;
  /** Awarded points; 0 on a failure. */
  points: number;
  /** True: mission:retry follows with the next attempt. */
  canRetry: boolean;
  /** The attempt that just finished. */
  attemptNumber: number;
  maxAttempts: number;
  outcome: LiveboardMissionOutcome;
  reason: LiveboardMissionResultReason;
  /** Settled clock; null when untimed. */
  clock: MissionClock | null;
}

/** mission:retry, to the failing student only, sessionRoom.js:4069. */
export interface MissionRetryPayload {
  /** The NEW attempt number. */
  attemptNumber: number;
  maxAttempts: number;
  pointsAvailable: number;
}

/** mission:student-retry, sessionRoom.js:4078 (room-wide): the student's next attempt exists. */
export interface MissionStudentRetryPayload {
  userId: string;
  attemptNumber: number;
}

/** mission:student-retry-started, sessionRoom.js:4137 (room-wide): the student opened that attempt, so observers reset the tile. */
export interface MissionStudentRetryStartedPayload {
  userId: string;
  attemptNumber: number;
}

/** mission:student-finished, sessionRoom.js:4002, :4105 (room-wide; only when the student is done with the round). */
export interface MissionStudentFinishedPayload {
  userId: string;
  outcome: LiveboardMissionOutcome;
  succeeded: boolean;
  viewToken: string | null;
}

/** mission:ended, sessionRoom.js:1180 (reasons set at :4174, :3700, :1222, :4775, :3617, :636). */
export interface MissionEndedPayload {
  reason: 'manual' | 'timeout' | 'all_finished' | 'mode_change' | 'new_round' | 'session_end';
  leaderboard: LeaderboardEntry[];
}

/** tournament:started, per recipient, sessionRoom.js:2665 via :1612. */
export interface TournamentStartedPayload {
  config: TournamentConfig;
  round: number;
  /** Optional: sent by the server today (sessionRoom.js:2668); removed by tournament-single-view step K — clients use scheduleId. */
  tournamentId?: string;
  scheduleId: string | null;
  pairings: TournamentPairing[];
  /** Always [] at round 1. */
  standings: TournamentStanding[];
  myGame: TournamentMyGame | null;
}

/** tournament:round-started, per recipient, sessionRoom.js:2043 via :1612. No config, no standings. */
export interface TournamentRoundStartedPayload {
  round: number;
  /** Optional: sent by the server today (sessionRoom.js:2045); removed by tournament-single-view step K — clients use scheduleId. */
  tournamentId?: string;
  scheduleId: string | null;
  pairings: TournamentPairing[];
  myGame: TournamentMyGame | null;
}

/** tournament:game-moved, sessionRoom.js:4473 (room-wide, PvP only). */
export interface TournamentGameMovedPayload {
  gameId: string;
  san: string;
  fen: string;
  clocks: TournamentClocksWire;
  moveIndex: number;
}

/** tournament:move-rejected, to the mover only, sessionRoom.js:4440. Carries no gameId. */
export interface TournamentMoveRejectedPayload {
  fen: string;
  clocks: TournamentClocksWire;
}

/** tournament:draw-offered, to the opponent (and coach) only, sessionRoom.js:4540. */
export interface TournamentDrawOfferedPayload {
  gameId: string;
  by: Side;
}

/** tournament:draw-declined, to the offerer (and coach) only, sessionRoom.js:4591. */
export interface TournamentDrawDeclinedPayload {
  gameId: string;
}

/** tournament:game-paused, sessionRoom.js:4974 (room-wide): a player disconnected; `clocks` are the frozen clocks. */
export interface TournamentGamePausedPayload {
  gameId: string;
  clocks: TournamentClocksWire;
}

/** tournament:game-resumed to the returning player's own socket, sessionRoom.js:3151 (tournamentEngine.js:432). Carries no gameId. */
export interface TournamentGameResumedOwnPayload {
  fen: string;
  moves: TournamentPvpMoveRecord[];
  clocks: TournamentClocksWire;
  yourColor: Side;
}

/** tournament:game-resumed room-wide notice, sessionRoom.js:3160 (the returning player receives it too). */
export interface TournamentGameResumedNoticePayload {
  gameId: string;
  fen: string;
  clocks: TournamentClocksWire;
}

/** Narrow with `'yourColor' in payload`. */
export type TournamentGameResumedPayload = TournamentGameResumedOwnPayload | TournamentGameResumedNoticePayload;

/** tournament:bye-move-relay, sessionRoom.js:4744 (room-wide; the bye's player receives it too). */
export interface TournamentByeMoveRelayPayload {
  gameId: string;
  san: string;
  fen: string;
  byPlayer: boolean;
  moveIndex: number;
}

/** tournament:game-ended, sessionRoom.js:1341 (room-wide). An aborted game is never announced. */
export interface TournamentGameEndedPayload {
  gameId: string;
  result: Exclude<TournamentGameResult, null>;
  reason: Exclude<TournamentResultReason, 'aborted'>;
  viewToken: string;
  /** PvP final clocks; null for a bye. */
  clocks: TournamentClocksWire | null;
  /** Bye settled clock; null for PvP and an untimed bye. */
  clock: MissionClock | null;
}

/** tournament:standings-updated, sessionRoom.js:1751 (room-wide, scheduled tournaments only): a game of `round` finished and the stored standings changed. Carries no standings; refetch them over REST. */
export interface TournamentStandingsUpdatedPayload {
  round: number;
}

/** tournament:round-ended, sessionRoom.js:1900 (league), :1953 (final round), :1977 (break). */
export interface TournamentRoundEndedPayload {
  round: number;
  standings: TournamentStanding[];
  /** Epoch ms (server clock) for the next round; null after a final round or a league round with no next time. */
  nextRoundStartsAt: number | null;
}

/** tournament:ending-after-round, sessionRoom.js:4407. */
export interface TournamentEndingAfterRoundPayload {
  round: number;
}

/** tournament:ended, sessionRoom.js:2186 (after the final writes settle). */
export interface TournamentEndedPayload {
  finalStandings: TournamentStanding[];
  /** Optional: sent by the server today (sessionRoom.js:2188); removed by tournament-single-view step K — clients use scheduleId. */
  tournamentId?: string;
  scheduleId: string | null;
}

/** tournament:error, room-wide in a hosted room: sessionRoom.js:2478 (cancelled), :2735 (create failed). The server's text, rendered as sent. */
export interface TournamentErrorPayload {
  message: string;
}

// ── Client → server payloads and acks ────────────────────────────────────────

/** time:ping, server.js:71. */
export interface TimePingPayload {
  clientTime: number;
}

/** session:join, sessionRoom.js:3049. The server reads neither field (room and user come from the JWT); kept for wire parity with the website. */
export interface SessionJoinPayload {
  sessionId: string;
  quizProtocol?: 2;
}

/**
 * session:join ack, sessionRoom.js:3062, :3083, :3220, :3223. session:sync is emitted before the ok ack.
 * `error` is 'removed' when the coach removed this student without rejoin; any other value is the
 * server's exception message (or 'join-failed').
 */
export type SessionJoinAck =
  | { ok: true }
  | { ok: true; ignored: 'coach' }
  | { ok: false; error: 'removed' }
  | { ok: false; error: string };

/**
 * board:move, sessionRoom.js:3231. Accepted from a student only while `boardControllerId` is that student
 * and the mode is 'display' (:2967); otherwise dropped silently. `fen` must be a valid FEN and `shapes` at most 64 (:2968).
 */
export interface BoardMovePayload {
  san: string;
  from: string;
  to: string;
  /** Position after the move. */
  fen: string;
  shapes?: LiveboardWireShapes;
}

/** board:set as a controlling student sends it, sessionRoom.js:3248. Same gate as board:move. The server ignores `materialId` from a student. */
export interface BoardSetRequestPayload {
  fen: string;
  shapes?: LiveboardWireShapes;
}

/** shapes:update, sessionRoom.js:3265. Same gate as board:move; at most 64 shapes. */
export interface ShapesUpdatePayload {
  shapes: LiveboardWireShapes;
}

/** quiz:move, sessionRoom.js:4807. Only `san` and `moveIndex` are read. `moveIndex` is the ply index on the student's CURRENT line: 0, 2, 4, ... when the server plays the replies, every index when the student plays both sides. */
export interface QuizMovePayload {
  san: string;
  moveIndex: number;
  from?: string;
  to?: string;
  fen?: string;
}

/** participant:history, sessionRoom.js:3507. A student may ask only for their own id. */
export interface ParticipantHistoryPayload {
  studentId: string;
}

/** One quiz answer in a participant:history ack (sessionRoom.js:3519). */
export interface ParticipantHistoryQuizEntry {
  quizNumber: number;
  line: number;
  isCorrect: boolean;
  verdict: QuizResultVerdict | null;
  /** Formatted line, or 'timeout'. */
  answer: string;
  correctAnswer: string | null;
  score: number;
  /** Epoch ms. */
  at: number;
}

/** participant:history ack, sessionRoom.js:3509-3523: the whole session's answers, oldest first, uncapped. */
export type ParticipantHistoryAck =
  | { ok: true; studentId: string; name: string; quiz: ParticipantHistoryQuizEntry[]; missions: LeaderboardMissionAttempt[] }
  | { ok: false; error: 'invalid-payload' | 'no-session' | 'forbidden' | 'no-participant' };

/** mission:move, sessionRoom.js:3720. Send every ply (the student's and the engine's), one at a time, in order. */
export interface MissionMovePayload {
  san: string;
  byPlayer: boolean;
  moveIndex: number;
  /** Ignored by the server (it stores its own FEN); the website still sends it. */
  fen?: string;
  /** Milliseconds the client's own clock ran for this move; absent = no lag forgiveness. */
  clientMoveTimeMs?: number;
}

/** A move rejection the client recovers from by rebuilding from the server's moves (sessionRoom.js:3814, :4695). */
export interface LiveboardMoveRestoreAck {
  ok: false;
  error: ValidateAppendError;
  fen: string;
  moves: LiveboardServerMove[];
}

/** The side to move had already flagged; the server finished the game and a result event follows (sessionRoom.js:3842, :4716). */
export interface LiveboardMoveFlaggedAck {
  ok: false;
  error: 'flagged';
  fen: string;
  moves: LiveboardServerMove[];
  clock: MissionClock;
}

/** The handler threw; `error` is the exception message or 'move-failed' (sessionRoom.js:3906, :4759). */
export interface LiveboardMoveThrewAck {
  ok: false;
  error: string;
}

/** mission:move ack, sessionRoom.js:3726-3906. Narrow with `ok`, then `'moves' in ack` and `'clock' in ack`. */
export type MissionMoveAck =
  | { ok: true; clock?: MissionClock }
  | { ok: true; duplicate: true }
  | { ok: true; ignored: 'coach' | 'already-finished' }
  | { ok: false; error: 'no-active-mission' | 'no-participant' | 'move-index-gap' }
  | LiveboardMoveRestoreAck
  | LiveboardMoveFlaggedAck
  | LiveboardMoveThrewAck;

/** mission:complete, sessionRoom.js:3917. Resign is the only result a client may report. */
export interface MissionCompletePayload {
  outcome: 'loss';
  reason: 'resign';
}

/** mission:retry-started, sessionRoom.js:4126: the student opened the attempt mission:retry announced (attemptNumber ≥ 2, before its first move). Relayed as mission:student-retry-started. */
export interface MissionRetryStartedPayload {
  attemptNumber: number;
}

/** tournament:game-move, sessionRoom.js:4412 (PvP only). No ack: tournament:game-moved or tournament:move-rejected answers. */
export interface TournamentGameMovePayload {
  gameId: string;
  san: string;
  clientMoveTimeMs?: number;
}

/** The `{ gameId }` body shared by resign and the three draw events. */
export interface TournamentGameIdPayload {
  gameId: string;
}

/** tournament:game-resign, sessionRoom.js:4485. */
export type TournamentGameResignPayload = TournamentGameIdPayload;
/** tournament:game-draw-offer, sessionRoom.js:4516 (silently refused when draw offers are off, too early, or locked). */
export type TournamentGameDrawOfferPayload = TournamentGameIdPayload;
/** tournament:game-draw-accept, sessionRoom.js:4544. */
export type TournamentGameDrawAcceptPayload = TournamentGameIdPayload;
/** tournament:game-draw-decline, sessionRoom.js:4567. */
export type TournamentGameDrawDeclinePayload = TournamentGameIdPayload;

/** tournament:game-complete, sessionRoom.js:4601 (engine bye only). Resign is the only result a client may report. */
export interface TournamentGameCompletePayload {
  gameId: string;
  outcome: 'loss';
  reason: 'resign';
}

/** tournament:bye-move, sessionRoom.js:4638. Same contract as mission:move; the human is white. */
export interface TournamentByeMovePayload {
  gameId: string;
  san: string;
  byPlayer: boolean;
  moveIndex: number;
  /** Ignored by the server; the website still sends it. */
  fen?: string;
  clientMoveTimeMs?: number;
}

/** tournament:bye-move ack, sessionRoom.js:4644-4759. */
export type TournamentByeMoveAck =
  | { ok: true; clock?: MissionClock }
  | { ok: true; duplicate: true }
  | { ok: true; ignored: 'coach' | 'already-finished' }
  | { ok: false; error: 'no-active-tournament' | 'no-such-game' | 'not-your-game' | 'move-index-gap' }
  | LiveboardMoveRestoreAck
  | LiveboardMoveFlaggedAck
  | LiveboardMoveThrewAck;

// ── Socket.io event maps ─────────────────────────────────────────────────────

/** Every event a student socket can receive. */
export interface LiveboardServerToClientEvents {
  'time:pong': (payload: TimePongPayload) => void;
  'clock:ping': (payload: ClockPingPayload, ack: () => void) => void;
  'session:sync': (payload: SessionSyncPayload) => void;
  'session:ended': (payload: SessionEndedPayload) => void;
  'session:removed': (payload: SessionRemovedPayload) => void;
  'board:moved': (payload: BoardMovedPayload) => void;
  'board:set': (payload: BoardSetPayload) => void;
  'shapes:updated': (payload: ShapesUpdatedPayload) => void;
  'board:game': (payload: BoardGamePayload) => void;
  'orientation:updated': (payload: OrientationUpdatedPayload) => void;
  'board:control-changed': (payload: BoardControlChangedPayload) => void;
  'mode:changed': (payload: ModeChangedPayload) => void;
  'participant:joined': (payload: ParticipantJoinedPayload) => void;
  'participant:rejoined': (payload: ParticipantRejoinedPayload) => void;
  'participant:left': (payload: ParticipantLeftPayload) => void;
  'participant:removed': (payload: ParticipantRemovedPayload) => void;
  'leaderboard:updated': (payload: LeaderboardUpdatedPayload) => void;
  'quiz:started': (payload: QuizStartedPayload) => void;
  'quiz:extended': (payload: QuizExtendedPayload) => void;
  'quiz:ended': (payload: QuizEndedPayload) => void;
  'quiz:move-result': (payload: QuizMoveResultPayload) => void;
  'mission:started': (payload: MissionStartedPayload) => void;
  'mission:extended': (payload: MissionExtendedPayload) => void;
  'mission:student-move': (payload: MissionStudentMovePayload) => void;
  'mission:result-ack': (payload: MissionResultAckPayload) => void;
  'mission:retry': (payload: MissionRetryPayload) => void;
  'mission:student-retry': (payload: MissionStudentRetryPayload) => void;
  'mission:student-retry-started': (payload: MissionStudentRetryStartedPayload) => void;
  'mission:student-finished': (payload: MissionStudentFinishedPayload) => void;
  'mission:ended': (payload: MissionEndedPayload) => void;
  'tournament:started': (payload: TournamentStartedPayload) => void;
  'tournament:round-started': (payload: TournamentRoundStartedPayload) => void;
  'tournament:game-moved': (payload: TournamentGameMovedPayload) => void;
  'tournament:move-rejected': (payload: TournamentMoveRejectedPayload) => void;
  'tournament:draw-offered': (payload: TournamentDrawOfferedPayload) => void;
  'tournament:draw-declined': (payload: TournamentDrawDeclinedPayload) => void;
  'tournament:game-paused': (payload: TournamentGamePausedPayload) => void;
  'tournament:game-resumed': (payload: TournamentGameResumedPayload) => void;
  'tournament:bye-move-relay': (payload: TournamentByeMoveRelayPayload) => void;
  'tournament:game-ended': (payload: TournamentGameEndedPayload) => void;
  'tournament:standings-updated': (payload: TournamentStandingsUpdatedPayload) => void;
  'tournament:round-ended': (payload: TournamentRoundEndedPayload) => void;
  'tournament:ending-after-round': (payload: TournamentEndingAfterRoundPayload) => void;
  'tournament:ended': (payload: TournamentEndedPayload) => void;
  'tournament:error': (payload: TournamentErrorPayload) => void;
}

/** Every event a student socket may send. board:move, board:set, shapes:update and board:game are accepted only while the student holds board control. */
export interface LiveboardClientToServerEvents {
  'time:ping': (payload: TimePingPayload) => void;
  'session:join': (payload: SessionJoinPayload, ack: (res: SessionJoinAck) => void) => void;
  'board:move': (payload: BoardMovePayload) => void;
  'board:set': (payload: BoardSetRequestPayload) => void;
  'shapes:update': (payload: ShapesUpdatePayload) => void;
  'board:game': (payload: BoardGamePayload) => void;
  'quiz:move': (payload: QuizMovePayload) => void;
  'participant:history': (payload: ParticipantHistoryPayload, ack: (res: ParticipantHistoryAck) => void) => void;
  'mission:move': (payload: MissionMovePayload, ack: (res: MissionMoveAck) => void) => void;
  'mission:complete': (payload: MissionCompletePayload) => void;
  'mission:retry-started': (payload: MissionRetryStartedPayload) => void;
  'tournament:game-move': (payload: TournamentGameMovePayload) => void;
  'tournament:game-resign': (payload: TournamentGameResignPayload) => void;
  'tournament:game-draw-offer': (payload: TournamentGameDrawOfferPayload) => void;
  'tournament:game-draw-accept': (payload: TournamentGameDrawAcceptPayload) => void;
  'tournament:game-draw-decline': (payload: TournamentGameDrawDeclinePayload) => void;
  'tournament:game-complete': (payload: TournamentGameCompletePayload) => void;
  'tournament:bye-move': (payload: TournamentByeMovePayload, ack: (res: TournamentByeMoveAck) => void) => void;
}
