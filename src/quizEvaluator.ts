import { PgnReader, PgnReaderMove } from '@mliebelt/pgn-reader';

export enum MoveResult {
  Correct = 'Correct',
  Incorrect = 'Incorrect',
  Pending = 'Pending',
  Terminated = 'Terminated',
}

export type EvaluateMoveResult = {
  result: MoveResult;
  /** The next move to auto-play (opponent's reply), if any */
  nextMove?: PgnReaderMove;
  score: number;
  /** Player moves matched before the first miss (all of them when Correct). */
  correctPlayerMoves: number;
};

type BuildMovesResult = { noOfPlayerMoves: number; quizMoves: PgnReaderMove[] };

export class QuizEvaluator {
  readonly quizMoves: PgnReaderMove[];
  readonly maxScore: number;
  readonly playerColor: string;
  readonly scorePerMove: number;

  constructor(quizPgn: string, maxScore: number) {
    const reader = new PgnReader({ pgn: quizPgn });
    const firstTurn = reader.getFirstMove()?.turn ?? 'w';
    const built = this.buildQuizMoves(reader, firstTurn);

    this.quizMoves = built?.quizMoves ?? [];
    this.maxScore = maxScore;
    this.playerColor = firstTurn;
    this.scorePerMove =
      built && built.noOfPlayerMoves > 0
        ? maxScore / built.noOfPlayerMoves
        : 0;
  }

  private buildQuizMoves(
    reader: PgnReader,
    playerColor: string
  ): BuildMovesResult | undefined {
    let noOfPlayerMoves = 0;
    const quizMoves: PgnReaderMove[] = [];
    let move: PgnReaderMove | null | undefined = reader.getFirstMove();
    if (!move) return undefined;

    if (move.turn === playerColor) noOfPlayerMoves++;
    quizMoves.push(move);

    while (move?.next !== undefined) {
      move = reader.getMove(move.next);
      if (!move) break;
      if (move.turn === playerColor) noOfPlayerMoves++;
      quizMoves.push(move);
    }

    return { noOfPlayerMoves, quizMoves };
  }

  /**
   * Evaluate the moves the student has played so far against the quiz solution.
   * @param moves - the sequence of moves played so far (from index 0)
   */
  evaluate(moves: PgnReaderMove[]): EvaluateMoveResult {
    if (this.quizMoves.length === 0) {
      return { result: MoveResult.Terminated, score: 0, correctPlayerMoves: 0 };
    }
    if (moves.length === 0) {
      return { result: MoveResult.Pending, score: 0, correctPlayerMoves: 0 };
    }

    let correctPlayerMoves = 0;

    const allCorrect = moves.every((move, i) => {
      const expected = this.quizMoves[i];
      const match = move.notation.notation === expected.notation.notation;
      if (match && move.turn === this.playerColor) correctPlayerMoves++;
      return match;
    });

    if (!allCorrect) {
      return {
        result: MoveResult.Incorrect,
        score: this.scorePerMove * correctPlayerMoves,
        correctPlayerMoves,
      };
    }

    if (moves.length === this.quizMoves.length) {
      return { result: MoveResult.Correct, score: this.maxScore, correctPlayerMoves };
    }

    // Correct so far — return the next move if it's the opponent's turn
    const next = this.quizMoves[moves.length];
    return {
      result: MoveResult.Pending,
      nextMove: next.turn !== this.playerColor ? next : undefined,
      score: 0,
      correctPlayerMoves,
    };
  }
}

export type PositionGrade = {
  /** Server-side outcome of one attempt at one position. */
  isCorrect: boolean;
  /** Raw 0-100 score before attempt decay (the caller applies decay). */
  score: number;
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
 *   Correct    → { isCorrect: true,  score: 100 }
 *   Incorrect  → { isCorrect: false, score: partial (scorePerMove × correct player moves) }
 *   Pending / Terminated (no moves, an unfinished correct prefix, empty PGN)
 *              → { isCorrect: false, score: 0 }
 *
 * Moves after the end of the solution line are ignored. Each SAN is wrapped
 * exactly as useQuizEvaluator does — the expected move's `turn` with the
 * played notation — so preview and server compare the same strings.
 */
export function gradePositionAttempt(pgn: string, sans: string[]): PositionGrade {
  const evaluator = new QuizEvaluator(pgn, 100);
  const played = sans.slice(0, evaluator.quizMoves.length).map(
    (san, i) => ({ notation: { notation: san }, turn: evaluator.quizMoves[i].turn }) as PgnReaderMove,
  );
  const evaluated = evaluator.evaluate(played);
  const correctPlayerMoves = evaluated.correctPlayerMoves;
  if (evaluated.result === MoveResult.Correct) return { isCorrect: true, score: 100, result: evaluated.result, correctPlayerMoves };
  if (evaluated.result === MoveResult.Incorrect) return { isCorrect: false, score: evaluated.score, result: evaluated.result, correctPlayerMoves };
  return { isCorrect: false, score: 0, result: evaluated.result, correctPlayerMoves };
}
