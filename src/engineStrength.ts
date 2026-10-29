// Engine strength levels — one table behind the 1–20 "Stockfish level" every
// surface stores (Material.trainingConfig.stockfishLevel, Level.stockfishLevel,
// a liveboard round's stockfishLevel, Tournament.engineLevel).
//
// Stockfish's own "Skill Level" option only picks among the top four moves of
// a full-strength search (noise ≤ 1 pawn), so on its own levels 10–20 are all
// above 2780 on Stockfish's UCI_Elo scale. Lichess (fishnet) limits three
// things per level — Skill Level, a depth cap and a think time — and that is
// what this table does. Level 20 is unbounded depth at 1000 ms: today's exact
// commands. docs/plans/stockfish-strength-levels-plan.md D2.

export const ENGINE_LEVEL_MIN = 1;
export const ENGINE_LEVEL_MAX = 20;

export interface EngineSearchLimits {
  /** Stockfish `Skill Level` UCI option, 0–20. */
  skillLevel: number;
  /** `go depth` cap; `null` = no cap (level 20 only). */
  depth: number | null;
  /** `go movetime` in milliseconds. */
  movetime: number;
}

const TABLE: readonly EngineSearchLimits[] = [
  /* 1 */ { skillLevel: 0, depth: 1, movetime: 50 },
  /* 2 */ { skillLevel: 0, depth: 1, movetime: 100 },
  /* 3 */ { skillLevel: 1, depth: 2, movetime: 100 },
  /* 4 */ { skillLevel: 2, depth: 2, movetime: 150 },
  /* 5 */ { skillLevel: 3, depth: 3, movetime: 150 },
  /* 6 */ { skillLevel: 4, depth: 3, movetime: 200 },
  /* 7 */ { skillLevel: 5, depth: 4, movetime: 200 },
  /* 8 */ { skillLevel: 6, depth: 5, movetime: 250 },
  /* 9 */ { skillLevel: 7, depth: 5, movetime: 300 },
  /* 10 */ { skillLevel: 9, depth: 6, movetime: 300 },
  /* 11 */ { skillLevel: 11, depth: 8, movetime: 400 },
  /* 12 */ { skillLevel: 12, depth: 9, movetime: 400 },
  /* 13 */ { skillLevel: 14, depth: 10, movetime: 450 },
  /* 14 */ { skillLevel: 15, depth: 12, movetime: 500 },
  /* 15 */ { skillLevel: 16, depth: 13, movetime: 500 },
  /* 16 */ { skillLevel: 17, depth: 15, movetime: 600 },
  /* 17 */ { skillLevel: 18, depth: 17, movetime: 700 },
  /* 18 */ { skillLevel: 19, depth: 19, movetime: 800 },
  /* 19 */ { skillLevel: 20, depth: 22, movetime: 900 },
  /* 20 */ { skillLevel: 20, depth: null, movetime: 1000 },
];

/** Clamps to [1,20] and rounds; a non-finite input is level 20. */
export function clampEngineLevel(level: number): number {
  if (!Number.isFinite(level)) return ENGINE_LEVEL_MAX;
  return Math.max(ENGINE_LEVEL_MIN, Math.min(ENGINE_LEVEL_MAX, Math.round(level)));
}

/** The UCI limits for a level. Returns a fresh object each call. */
export function engineSearchLimits(level: number): EngineSearchLimits {
  return { ...TABLE[clampEngineLevel(level) - 1] };
}

/** The UCI `go` command for a level — `go depth D movetime M`, or `go movetime M` when uncapped. */
export function engineGoCommand(level: number): string {
  const { depth, movetime } = engineSearchLimits(level);
  return depth === null ? `go movetime ${movetime}` : `go depth ${depth} movetime ${movetime}`;
}

export type EngineLevelLabel = 'Beginner' | 'Casual' | 'Club' | 'Strong' | 'Expert' | 'Strongest';

/** One word of strength for a level, shown next to the number (plan D5). */
export function engineLevelLabel(level: number): EngineLevelLabel {
  const l = clampEngineLevel(level);
  if (l <= 4) return 'Beginner';
  if (l <= 8) return 'Casual';
  if (l <= 12) return 'Club';
  if (l <= 16) return 'Strong';
  if (l <= 19) return 'Expert';
  return 'Strongest';
}
