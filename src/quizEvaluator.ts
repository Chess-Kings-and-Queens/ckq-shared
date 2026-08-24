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
      return { result: MoveResult.Terminated, score: 0 };
    }
    if (moves.length === 0) {
      return { result: MoveResult.Pending, score: 0 };
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
      };
    }

    if (moves.length === this.quizMoves.length) {
      return { result: MoveResult.Correct, score: this.maxScore };
    }

    // Correct so far — return the next move if it's the opponent's turn
    const next = this.quizMoves[moves.length];
    return {
      result: MoveResult.Pending,
      nextMove: next.turn !== this.playerColor ? next : undefined,
      score: 0,
    };
  }
}
