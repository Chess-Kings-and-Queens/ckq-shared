import { ChessGame } from './chessGame';
import { validatePosition, squareToFileRank, BOARD_FILES, BOARD_RANKS } from './boardEditor';
import type { BoardFile, BoardRank } from './boardEditor';
import { CHOICE_IDS, NAME_MOVE_PIECES } from './types/homework';
import type {
  HomeworkQuestion,
  NameMovePiece,
  NameMoveTarget,
  PuzzleQuestion,
  QuestionAnswer,
  QuestionKind,
  QuestionReveal,
} from './types/homework';

// ── Beginner puzzle question kinds (beginner-puzzle-kinds-plan §5.1.3) ───────
//
// Chess facts and question validity only. Attempts, decay and strikes stay in the backend.

const LIMITS = {
  minQuestions: 1,
  maxQuestions: 50,
  maxPrompt: 300,
  maxExplanation: 500,
  maxAlt: 200,
  minChoices: 2,
  maxChoices: 4,
  maxSans: 8,
  maxSquares: 63,
} as const;

/** The one piece-name table. */
export const PIECE_NAMES: Readonly<Record<NameMovePiece, string>> = Object.freeze({
  K: 'King',
  Q: 'Queen',
  R: 'Rook',
  N: 'Knight',
  B: 'Bishop',
  P: 'Pawn',
});

const isPiece = (value: string): value is NameMovePiece => (NAME_MOVE_PIECES as readonly string[]).includes(value);
const isFile = (value: string): value is BoardFile => (BOARD_FILES as readonly string[]).includes(value);
const isRank = (value: string): value is BoardRank => (BOARD_RANKS as readonly string[]).includes(value);

/** The piece and destination of each SAN played from `fen`; a SAN that is not legal there is skipped. */
export function nameMoveTargets(fen: string, sans: readonly string[]): NameMoveTarget[] {
  const targets: NameMoveTarget[] = [];
  for (const san of sans) {
    const game = ChessGame.fromFen(fen);
    if (!game) continue;
    const move = game.peek(san);
    if (!move) continue;
    const moved = game.pieceAt(move.from);
    if (!moved) continue;
    const piece = moved.type.toUpperCase();
    const file = move.to[0];
    const rank = move.to[1];
    if (!isPiece(piece) || !isFile(file) || !isRank(rank)) continue;
    targets.push({ piece, file, rank, san: move.san });
  }
  return targets;
}

type Validity = { ok: true } | { ok: false; reason: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const fail = (n: number, reason: string): Validity => ({ ok: false, reason: `Question ${n}: ${reason}` });

const positionReason = (fen: unknown): string | null => {
  if (typeof fen !== 'string') return 'Position is not valid';
  const result = validatePosition(fen);
  return result.ok ? null : result.reason;
};

/** A used key list: the array, or null when it is not one. */
const listOf = (value: unknown): unknown[] | null => (Array.isArray(value) ? value : null);

/** An unused key list is fine when absent or empty. */
const isEmptyList = (value: unknown): boolean => value === undefined || (Array.isArray(value) && value.length === 0);

function validateChoice(n: number, q: Record<string, unknown>, answer: Record<string, unknown>): Validity | null {
  if (q.fen !== null) return fail(n, 'must not have a board position');
  const choices = listOf(q.choices);
  if (!choices || choices.length < LIMITS.minChoices || choices.length > LIMITS.maxChoices) return fail(n, 'needs 2 to 4 choices');
  for (let i = 0; i < choices.length; i++) {
    const c = choices[i];
    if (!isRecord(c) || c.id !== CHOICE_IDS[i]) return fail(n, 'choices must be lettered a to d in order');
  }
  for (const raw of choices) {
    const c = raw as Record<string, unknown>;
    const letter = String(c.id).toUpperCase();
    if (typeof c.alt !== 'string' || c.alt.length > LIMITS.maxAlt) return fail(n, `choice ${letter}: the description is too long`);
    const reason = positionReason(c.fen);
    if (reason) return fail(n, `choice ${letter}: ${reason}`);
  }
  const ids = listOf(answer.choiceIds);
  if (!ids || ids.length < 1) return fail(n, 'mark at least one correct choice');
  const known = choices.map((c) => (c as Record<string, unknown>).id);
  if (ids.some((id) => !known.includes(id)) || new Set(ids).size !== ids.length) return fail(n, 'a correct choice does not exist');
  if (ids.length >= choices.length) return fail(n, 'at least one choice must be wrong');
  return null;
}

function validateSquare(n: number, q: Record<string, unknown>, answer: Record<string, unknown>): Validity | null {
  if (!isEmptyList(q.choices)) return fail(n, 'must not have choices');
  const reason = positionReason(q.fen);
  if (reason) return fail(n, reason);
  const squares = listOf(answer.squares);
  if (!squares || squares.length < 1 || squares.length > LIMITS.maxSquares) return fail(n, 'mark at least one correct square');
  for (const s of squares) {
    if (typeof s !== 'string' || squareToFileRank(s) === null) return fail(n, `${String(s)} is not a square`);
  }
  if (new Set(squares).size !== squares.length) return fail(n, 'mark at least one correct square');
  return null;
}

function validateNameMove(n: number, q: Record<string, unknown>, answer: Record<string, unknown>): Validity | null {
  if (!isEmptyList(q.choices)) return fail(n, 'must not have choices');
  const reason = positionReason(q.fen);
  if (reason) return fail(n, reason);
  const sans = listOf(answer.sans);
  if (!sans || sans.length < 1 || sans.length > LIMITS.maxSans) return fail(n, 'add at least one correct move');
  for (const san of sans) {
    if (typeof san !== 'string' || nameMoveTargets(q.fen as string, [san]).length === 0) {
      return fail(n, `${String(san)} is not a legal move in this position`);
    }
  }
  return null;
}

const KEY_LISTS = { choice: 'choiceIds', square: 'squares', nameMove: 'sans' } as const;

/** The one validity rule for a question list; the first failure wins. */
export function validateQuestions(kind: QuestionKind, questions: unknown): Validity {
  if (!Array.isArray(questions) || questions.length < LIMITS.minQuestions) return { ok: false, reason: 'Add at least one question' };
  if (questions.length > LIMITS.maxQuestions) return { ok: false, reason: 'A material holds at most 50 questions' };
  const seen = new Set<string>();
  for (let i = 0; i < questions.length; i++) {
    const n = i + 1;
    const q: unknown = questions[i];
    if (!isRecord(q) || typeof q.id !== 'string' || !/^[a-z0-9-]{1,24}$/.test(q.id)) return fail(n, 'needs an id');
    if (seen.has(q.id)) return { ok: false, reason: 'Question ids must be unique' };
    seen.add(q.id);
    if (typeof q.prompt !== 'string' || q.prompt.trim().length < 1) return fail(n, 'needs a question text');
    if (q.prompt.trim().length > LIMITS.maxPrompt) return fail(n, 'the question text is too long');
    if (typeof q.explanation !== 'string' || q.explanation.length > LIMITS.maxExplanation) return fail(n, 'the explanation is too long');
    const answer = isRecord(q.answer) ? q.answer : {};
    const byKind =
      kind === 'choice' ? validateChoice(n, q, answer) : kind === 'square' ? validateSquare(n, q, answer) : validateNameMove(n, q, answer);
    if (byKind) return byKind;
    for (const other of Object.keys(KEY_LISTS) as QuestionKind[]) {
      if (other !== kind && !isEmptyList(answer[KEY_LISTS[other]])) return fail(n, 'has an answer that does not belong to this kind');
    }
  }
  return { ok: true };
}

/** True when `answer` has exactly the shape a student submits for `kind`. */
export function answerMatchesKind(kind: QuestionKind, answer: unknown): answer is QuestionAnswer {
  if (!isRecord(answer)) return false;
  const keys = Object.keys(answer);
  if (kind === 'choice') {
    return keys.length === 1 && typeof answer.choiceId === 'string' && (CHOICE_IDS as readonly string[]).includes(answer.choiceId);
  }
  if (kind === 'square') {
    return keys.length === 1 && typeof answer.square === 'string' && squareToFileRank(answer.square) !== null;
  }
  return (
    keys.length === 3 &&
    typeof answer.piece === 'string' &&
    isPiece(answer.piece) &&
    typeof answer.file === 'string' &&
    isFile(answer.file) &&
    typeof answer.rank === 'string' &&
    isRank(answer.rank)
  );
}

/** Whether `answer` is right for `question`; an answer of another kind's shape is false. */
export function gradeQuestionAnswer(kind: QuestionKind, question: PuzzleQuestion, answer: QuestionAnswer): boolean {
  if (kind === 'choice') return 'choiceId' in answer && question.answer.choiceIds.includes(answer.choiceId);
  if (kind === 'square') return 'square' in answer && question.answer.squares.includes(answer.square);
  if (!('piece' in answer)) return false;
  return nameMoveTargets(question.fen ?? '', question.answer.sans).some(
    (t) => t.piece === answer.piece && t.file === answer.file && t.rank === answer.rank,
  );
}

/** The key and explanation of a resolved position. */
export function questionReveal(kind: QuestionKind, question: PuzzleQuestion): QuestionReveal {
  return {
    choiceIds: kind === 'choice' ? [...question.answer.choiceIds] : [],
    squares: kind === 'square' ? [...question.answer.squares] : [],
    moves: kind === 'nameMove' ? nameMoveTargets(question.fen ?? '', question.answer.sans) : [],
    explanation: question.explanation,
  };
}

/**
 * A question as a student receives it: no key, no explanation. Every field is copied by name, never spread: a
 * database document's choice carries a link to its parent question, and a spread would send the key with it.
 */
export function studentQuestion(question: PuzzleQuestion): HomeworkQuestion {
  return {
    id: question.id,
    prompt: question.prompt,
    fen: question.fen,
    choices: question.choices.map((c) => ({ id: c.id, fen: c.fen, alt: c.alt })),
  };
}

/** "Nc7 · Knight to c7"; a pawn reads "c7 · Pawn to c7". */
export function nameMoveLabel(pick: { piece: NameMovePiece; file: BoardFile; rank: BoardRank }): string {
  const square = `${pick.file}${pick.rank}`;
  const san = `${pick.piece === 'P' ? '' : pick.piece}${square}`;
  return `${san} · ${PIECE_NAMES[pick.piece]} to ${square}`;
}
