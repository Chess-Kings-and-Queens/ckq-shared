import { parsePgnTree, mainLine } from './moveTree';
import { formatMoveSequence, fenMoveContext } from './chessUtils';

export enum MoveResult {
  Correct = 'Correct',
  Incorrect = 'Incorrect',
  Pending = 'Pending',
  Terminated = 'Terminated',
}

/** One solution ply: the SAN as written, the FEN after it, the side that played it. */
export interface QuizMove { san: string; fen: string; turn: 'w' | 'b' }

export type EvaluateMoveResult = {
  result: MoveResult;
  /** The opponent's reply to auto-play, when the student is correct so far and it is not their turn. */
  nextSan?: string;
  /** Player moves matched before the first miss (all of them when Correct). */
  correctPlayerMoves: number;
};

export interface QuizEvaluatorOptions {
  /** Every ply is the student's: no opponent reply is auto-played, every ply earns credit and any ply can deviate (puzzleType 'withOpponentMoves', D6). */
  bothSides?: boolean;
}

export class QuizEvaluator {
  readonly quizMoves: QuizMove[];
  readonly playerColor: 'w' | 'b';
  /** The position the quiz starts from (the PGN's [FEN] tag, else the start position). */
  readonly startFen: string;
  readonly bothSides: boolean;

  /** Throws `Error('Invalid quiz PGN')` when the PGN cannot be parsed; empty move text does not throw. */
  constructor(quizPgn: string, options: QuizEvaluatorOptions = {}) {
    const root = parsePgnTree(quizPgn);
    if (!root) throw new Error('Invalid quiz PGN');
    const line = mainLine(root);
    this.startFen = root.fen;
    this.quizMoves = line.map((n) => ({ san: n.san, fen: n.fen, turn: n.color }));
    this.playerColor = line[0]?.color ?? 'w';
    this.bothSides = options.bothSides === true;
  }

  isPlayerPly(turn: 'w' | 'b'): boolean {
    return this.bothSides || turn === this.playerColor;
  }

  /** The solution with move numbers, e.g. "13... Qg1+ 14. Kh4 Qh2+" ('' when there are no moves). */
  get solutionLine(): string {
    if (this.quizMoves.length === 0) return '';
    const { color, fullMove } = fenMoveContext(this.startFen);
    return formatMoveSequence(this.quizMoves.map((m) => m.san), color, fullMove);
  }

  /** Evaluate the SANs played so far (student and auto-played opponent, from index 0). */
  evaluate(sans: readonly string[]): EvaluateMoveResult {
    if (this.quizMoves.length === 0) return { result: MoveResult.Terminated, correctPlayerMoves: 0 };
    if (sans.length === 0) return { result: MoveResult.Pending, correctPlayerMoves: 0 };
    let correctPlayerMoves = 0;
    const allCorrect = sans.every((san, i) => {
      const expected = this.quizMoves[i];
      const match = expected !== undefined && san === expected.san;
      if (match && this.isPlayerPly(expected.turn)) correctPlayerMoves++;
      return match;
    });
    if (!allCorrect) return { result: MoveResult.Incorrect, correctPlayerMoves };
    if (sans.length >= this.quizMoves.length) return { result: MoveResult.Correct, correctPlayerMoves };
    const next = this.quizMoves[sans.length];
    return { result: MoveResult.Pending, nextSan: this.isPlayerPly(next.turn) ? undefined : next.san, correctPlayerMoves };
  }

  /** The leading plies of `sans` that match the solution, and how many of them are the student's own. */
  matchedPrefix(sans: readonly string[]): { plies: number; playerUnits: number } {
    let plies = 0;
    let playerUnits = 0;
    while (plies < sans.length && plies < this.quizMoves.length && sans[plies] === this.quizMoves[plies].san) {
      if (this.isPlayerPly(this.quizMoves[plies].turn)) playerUnits++;
      plies++;
    }
    return { plies, playerUnits };
  }

  /** Number of student plies (units) in the line. */
  get playerUnits(): number {
    return this.quizMoves.filter((m) => this.isPlayerPly(m.turn)).length;
  }
}

export type PositionGrade = {
  /** Server-side outcome of one attempt at one position. */
  isCorrect: boolean;
  /** The evaluator's own result, for callers that need the detail. */
  result: MoveResult;
  /** Player moves matched before the first miss (all of them when Correct). */
  correctPlayerMoves: number;
};

/**
 * Grade a finished attempt — the full SAN sequence the student's board
 * produced (player moves and the auto-played opponent replies) — against a
 * position's PGN. This is the ONE grading rule, shared by the browser's
 * instant preview and the backend's authoritative grade (ADR backend-024).
 *
 *   Correct    → { isCorrect: true }
 *   Incorrect  → { isCorrect: false }
 *   Pending / Terminated (no moves, an unfinished correct prefix, empty PGN)
 *              → { isCorrect: false }
 * Points are not part of the grade: they come from attemptScoring.ts.
 *
 * Moves after the end of the solution line are ignored.
 */
export function gradePositionAttempt(pgn: string, sans: string[], options: QuizEvaluatorOptions = {}): PositionGrade {
  const evaluator = new QuizEvaluator(pgn, options);
  const evaluated = evaluator.evaluate(sans.slice(0, evaluator.quizMoves.length));
  const correctPlayerMoves = evaluated.correctPlayerMoves;
  if (evaluated.result === MoveResult.Correct) return { isCorrect: true, result: evaluated.result, correctPlayerMoves };
  return { isCorrect: false, result: evaluated.result, correctPlayerMoves };
}

export type PlyDeviation = {
  /** Index into the SANs (and the solution plies) of the first mismatch. */
  ply: number;
  /** The position the student saw before that ply. */
  fenBefore: string;
  /** The solution's SAN at that ply. */
  givenSan: string;
  /** The student's SAN at that ply. */
  studentSan: string;
  /** Whose move it was in the puzzle: the student's own side, or the opponent's (only possible under bothSides; D15). */
  side: 'player' | 'opponent';
};

/**
 * The first student move that differs from the solution, for the engine judge (homework D3).
 * Null when the moves match the solution as far as they go, when there are no moves, or when the
 * first mismatch falls on an opponent ply in a one-sided puzzle (a real client auto-plays those).
 * Throws `Error('Invalid quiz PGN')` like `QuizEvaluator`.
 */
export function firstDeviation(pgn: string, sans: readonly string[], options: QuizEvaluatorOptions = {}): PlyDeviation | null {
  const evaluator = new QuizEvaluator(pgn, options);
  const limit = Math.min(sans.length, evaluator.quizMoves.length);
  for (let i = 0; i < limit; i++) {
    const expected = evaluator.quizMoves[i];
    if (sans[i] === expected.san) continue;
    if (!evaluator.isPlayerPly(expected.turn)) return null;
    return {
      ply: i,
      fenBefore: i === 0 ? evaluator.startFen : evaluator.quizMoves[i - 1].fen,
      givenSan: expected.san,
      studentSan: sans[i],
      side: expected.turn === evaluator.playerColor ? 'player' : 'opponent',
    };
  }
  return null;
}
