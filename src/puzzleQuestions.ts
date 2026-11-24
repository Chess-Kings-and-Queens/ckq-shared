import { parsePgnTree, pgnPositionPuzzle } from './moveTree';
import { placementToMap, squareToFileRank, BOARD_FILES, BOARD_RANKS } from './boardEditor';
import type { BoardFile, BoardRank } from './boardEditor';
import { fenFields } from './fen';
import { splitPgnGames } from './chessUtils';
import { CHOICE_IDS, NAME_MOVE_PIECES, PICK_STEPS } from './types/homework';
import type {
  ClickSummary,
  HomeworkQuestion,
  MaterialKind,
  NameMovePiece,
  NamingStep,
  PickStep,
  PuzzleQuestion,
  QuestionAnswer,
  QuestionReveal,
  StoredPick,
} from './types/homework';

// ── Beginner puzzle kinds (beginner-puzzle-kinds-revision-plan §5.1.3) ───────
//
// Chess facts and puzzle validity only. Attempts, decay and strikes stay in the backend.

const LIMITS = {
  minQuestions: 1,
  maxQuestions: 50,
  maxPrompt: 300,
  maxExplanation: 500,
  maxChoiceText: 200,
  minChoices: 2,
  maxChoices: 4,
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

type Validity = { ok: true } | { ok: false; reason: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const fail = (n: number, reason: string): Validity => ({ ok: false, reason: `Question ${n}: ${reason}` });

/** A used key list: the array, or null when it is not one. */
const listOf = (value: unknown): unknown[] | null => (Array.isArray(value) ? value : null);

/** True when `fen` has the FEN fields and a placement that parses; kings are not required (it is shown, never played). */
const isShowableFen = (fen: unknown): boolean => {
  const fields = fenFields(fen);
  return fields !== null && placementToMap(fields.placement) !== null;
};

function validateChoice(n: number, q: Record<string, unknown>, answer: Record<string, unknown>): Validity | null {
  if (q.fen !== null && !isShowableFen(q.fen)) return fail(n, 'the board position is not valid');
  const choices = listOf(q.choices);
  if (!choices || choices.length < LIMITS.minChoices || choices.length > LIMITS.maxChoices) return fail(n, 'needs 2 to 4 choices');
  for (let i = 0; i < choices.length; i++) {
    const c = choices[i];
    if (!isRecord(c) || c.id !== CHOICE_IDS[i]) return fail(n, 'choices must be lettered a to d in order');
  }
  for (const raw of choices) {
    const c = raw as Record<string, unknown>;
    const letter = String(c.id).toUpperCase();
    if (typeof c.text !== 'string' || c.text.length > LIMITS.maxChoiceText) return fail(n, `choice ${letter}: the text is too long`);
    if (c.fen !== null && !isShowableFen(c.fen)) return fail(n, `choice ${letter}: the board position is not valid`);
    if (c.text.trim() === '' && c.fen === null) return fail(n, `choice ${letter}: needs a text or a board position`);
  }
  const ids = listOf(answer.choiceIds);
  if (!ids || ids.length < 1) return fail(n, 'mark at least one correct choice');
  const known = choices.map((c) => (c as Record<string, unknown>).id);
  if (ids.some((id) => !known.includes(id)) || new Set(ids).size !== ids.length) return fail(n, 'a correct choice does not exist');
  if (ids.length >= choices.length) return fail(n, 'at least one choice must be wrong');
  return null;
}

/** The one validity rule for a question list; the first failure wins. */
export function validateQuestions(questions: unknown): Validity {
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
    const byChoice = validateChoice(n, q, answer);
    if (byChoice) return byChoice;
    if (Object.keys(answer).some((key) => key !== 'choiceIds')) return fail(n, 'has an answer that does not belong to a choice question');
  }
  return { ok: true };
}

/** True when `answer` has exactly the shape a student submits for a `choice` question. */
export function isQuestionAnswer(answer: unknown): answer is QuestionAnswer {
  if (!isRecord(answer)) return false;
  const keys = Object.keys(answer);
  return keys.length === 1 && typeof answer.choiceId === 'string' && (CHOICE_IDS as readonly string[]).includes(answer.choiceId);
}

/** Whether `answer` is right for `question`. */
export function gradeQuestionAnswer(question: PuzzleQuestion, answer: QuestionAnswer): boolean {
  return question.answer.choiceIds.includes(answer.choiceId);
}

/** The key and explanation of a resolved question. */
export function questionReveal(question: PuzzleQuestion): QuestionReveal {
  return { choiceIds: [...question.answer.choiceIds], squares: [], move: null, explanation: question.explanation };
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
    choices: question.choices.map((c) => ({ id: c.id, text: c.text, fen: c.fen })),
  };
}

/** "Nc7 · Knight to c7"; a pawn reads "c7 · Pawn to c7". */
export function nameMoveLabel(pick: { piece: NameMovePiece; file: BoardFile; rank: BoardRank }): string {
  const square = `${pick.file}${pick.rank}`;
  const san = `${pick.piece === 'P' ? '' : pick.piece}${square}`;
  return `${san} · ${PIECE_NAMES[pick.piece]} to ${square}`;
}

// ── One-move puzzles, click puzzles and picks (beginner-puzzle-kinds-revision D2–D7) ──

/** The one move a one-move puzzle asks for. */
export interface OneMoveAnswer { from: string; to: string; piece: NameMovePiece }

/** The upper-cased piece letter standing on `square` in `fen`'s placement; null when the square is empty or the placement does not parse. */
function pieceOn(fen: string, square: string): NameMovePiece | null {
  const fields = fenFields(fen);
  const map = fields ? placementToMap(fields.placement) : null;
  const letter = map?.get(square)?.toUpperCase();
  return letter !== undefined && isPiece(letter) ? letter : null;
}

/**
 * The one-move rule (D2), the single source. A legal puzzle is one move with no variation; with `allowIllegalPosition`
 * it is a position with no moves and exactly one arrow on a piece. Null when the PGN is not such a puzzle.
 */
export function oneMoveAnswer(pgn: string, opts: { allowIllegalPosition: boolean }): OneMoveAnswer | null {
  if (opts.allowIllegalPosition) {
    const puzzle = pgnPositionPuzzle(pgn);
    if (!puzzle || puzzle.arrows.length !== 1) return null;
    const { from, to } = puzzle.arrows[0];
    const piece = pieceOn(puzzle.fen, from);
    return piece ? { from, to, piece } : null;
  }
  const root = parsePgnTree(pgn);
  if (!root || root.children.length !== 1 || root.children[0].children.length !== 0) return null;
  const node = root.children[0];
  const piece = pieceOn(root.fen, node.from);
  return piece ? { from: node.from, to: node.to, piece } : null;
}

/** Whether `moves` is the one from-to move (`d4c6`, an optional promotion letter ignored) that `answer` asks for. */
export function movesMatchOneMove(answer: OneMoveAnswer, moves: readonly string[]): boolean {
  if (moves.length !== 1 || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(moves[0])) return false;
  return moves[0].slice(0, 2) === answer.from && moves[0].slice(2, 4) === answer.to;
}

/**
 * The one validity rule for a PGN homework material's puzzles; the first failure wins and a per-game reason is
 * prefixed `Game <n>: `. A `choice` material is valid here (its questions are `validateQuestions`).
 */
export function validatePuzzleMaterial(input: {
  kind: MaterialKind;
  pgnContent: string;
  nameTheMove: boolean;
  allowIllegalPosition: boolean;
}): Validity {
  const { kind, pgnContent, nameTheMove, allowIllegalPosition } = input;
  if (kind === 'choice') return { ok: true };
  if (kind === 'square') {
    if (nameTheMove || allowIllegalPosition) return { ok: false, reason: 'Name the move and illegal positions are only for board puzzles' };
    if (pgnContent.trim() === '') return { ok: false, reason: 'Add at least one puzzle' };
    const games = splitPgnGames(pgnContent);
    for (let i = 0; i < games.length; i++) {
      const puzzle = pgnPositionPuzzle(games[i]);
      const n = i + 1;
      if (!puzzle) return { ok: false, reason: `Game ${n}: must be a position with no moves and a [FEN] tag` };
      if (puzzle.prompt === null) return { ok: false, reason: `Game ${n}: needs a question in its comment` };
      if (puzzle.squares.length === 0) return { ok: false, reason: `Game ${n}: needs at least one highlighted square ([%csl])` };
    }
    return { ok: true };
  }
  if (!nameTheMove && !allowIllegalPosition) return { ok: true };
  if (pgnContent.trim() === '') return { ok: false, reason: 'Add at least one puzzle' };
  const games = splitPgnGames(pgnContent);
  for (let i = 0; i < games.length; i++) {
    if (oneMoveAnswer(games[i], { allowIllegalPosition }) === null) {
      const n = i + 1;
      return {
        ok: false,
        reason: allowIllegalPosition
          ? `Game ${n}: needs a position with no moves and exactly one arrow ([%cal]) on a piece`
          : `Game ${n}: must be exactly one move with no variations`,
      };
    }
  }
  return { ok: true };
}

/** The step a pick answers, or null unless it has exactly one key holding a valid square, piece, file or rank. */
export function pickStep(pick: unknown): PickStep | null {
  if (!isRecord(pick)) return null;
  const keys = Object.keys(pick);
  if (keys.length !== 1) return null;
  const key = keys[0];
  const value = pick[key];
  if (typeof value !== 'string' || !(PICK_STEPS as readonly string[]).includes(key)) return null;
  if (key === 'square') return squareToFileRank(value) !== null ? 'square' : null;
  if (key === 'piece') return isPiece(value) ? 'piece' : null;
  if (key === 'file') return isFile(value) ? 'file' : null;
  return isRank(value) ? 'rank' : null;
}

/** The first of piece, file, rank with no correct pick; null when all three have one. */
export function namingStep(picks: readonly StoredPick[]): NamingStep | null {
  const order: NamingStep[] = ['piece', 'file', 'rank'];
  return order.find((step) => !picks.some((p) => p.step === step && p.isCorrect)) ?? null;
}

/** Whether `value` is right for naming `step` of `answer`'s move. */
export function gradeNamingPick(answer: OneMoveAnswer, step: NamingStep, value: string): boolean {
  if (step === 'piece') return value === answer.piece;
  if (step === 'file') return value === answer.to[0];
  return value === answer.to[1];
}

/** The answer squares not yet found: `answerSquares` minus every correct `square` pick, in `answerSquares` order. */
export function squaresLeft(answerSquares: readonly string[], picks: readonly StoredPick[]): string[] {
  const found = new Set(picks.filter((p) => p.step === 'square' && p.isCorrect).map((p) => p.value));
  return answerSquares.filter((s) => !found.has(s));
}

/** A click puzzle in numbers (D21): squares to find, squares found, wrong clicks. */
export function clickSummary(answerSquares: readonly string[], picks: readonly StoredPick[]): ClickSummary {
  const total = answerSquares.length;
  return {
    total,
    found: total - squaresLeft(answerSquares, picks).length,
    wrong: picks.filter((p) => p.step === 'square' && !p.isCorrect).length,
  };
}
