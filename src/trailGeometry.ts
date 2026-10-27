import type { TrailCheckpoint, TrailClimber } from './types/trail';

/**
 * Trail geometry only — where a node sits on the 680 px canvas and which step a
 * score falls on. No ranking, no counts, no "to next" numbers: the backend owns
 * all of those (ADR frontend-005, docs/plans/student-ladder-plan.md §5.2.4).
 * Moved from website2.0 Trail/trailGeometry.ts (2026-10-27); the CSS avatar
 * palette stays in each client, only the hash slot is shared.
 */

export const TRAIL_STEPS = 40;
export const TRAIL_HEIGHT = 680;
export const LEG_GAP = 150;
export const NODES_PER_LEG = 10;

/** Size of the per-student avatar palette; each client supplies its own seven colours. */
export const AVATAR_PALETTE_SIZE = 7;

function djb2(text: string): number {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return hash >>> 0;
}

/** A stable palette slot for a student id (djb2 hash), so one student keeps one colour everywhere. */
export const avatarPaletteIndex = (studentId: string): number => djb2(studentId) % AVATAR_PALETTE_SIZE;

// Intl.NumberFormat, not toLocaleString (banned by lint); same "1,000" output.
// Named formatTrailPoints: formatPoints is already exported by tournamentResultLabels.
const POINTS_FORMAT = new Intl.NumberFormat('en-US');
export const formatTrailPoints = (n: number): string => POINTS_FORMAT.format(n);

const rowY = (row: number): number => TRAIL_HEIGHT - 70 - row * LEG_GAP;

export function nodePosition(step: number): { x: number; y: number } {
  if (step === 0) return { x: 4, y: rowY(0) };
  if (step % NODES_PER_LEG === 0) {
    const row = step / NODES_PER_LEG - 1;
    return { x: row % 2 === 0 ? 96 : 4, y: rowY(row) - LEG_GAP / 2 };
  }
  const row = Math.floor(step / NODES_PER_LEG);
  const k = step % NODES_PER_LEG;
  return { x: row % 2 === 0 ? 4 + k * 9.2 : 96 - k * 9.2, y: rowY(row) };
}

/** SVG polyline points for a viewBox of `0 0 100 TRAIL_HEIGHT` with preserveAspectRatio="none". */
export function polyline(upToStep: number = TRAIL_STEPS): string {
  return Array.from({ length: upToStep + 1 }, (_, i) => nodePosition(i))
    .map((p) => `${p.x},${p.y}`)
    .join(' ');
}

export const isCheckpoint = (step: number): boolean => step % NODES_PER_LEG === 0;

export const checkpointIndex = (step: number): number => step / NODES_PER_LEG;

export const stepOf = (total: number, summit: number): number =>
  Math.max(0, Math.min(TRAIL_STEPS, Math.floor(total / (summit / TRAIL_STEPS))));

export const stepPoints = (step: number, summit: number): number =>
  Math.round((step * summit) / TRAIL_STEPS);

export function stepLabel(step: number, summit: number, checkpoints: TrailCheckpoint[]): string {
  if (isCheckpoint(step)) {
    return `${checkpoints[checkpointIndex(step)].name} · ${formatTrailPoints(stepPoints(step, summit))} pts`;
  }
  return `${formatTrailPoints(stepPoints(step, summit))}–${formatTrailPoints(stepPoints(step + 1, summit))} pts`;
}

/** Places each climber on a display step; the `isMe` climber comes first on a step. */
export function groupByStep(climbers: TrailClimber[], summit: number): Map<number, TrailClimber[]> {
  const map = new Map<number, TrailClimber[]>();
  for (const climber of climbers) {
    const step = stepOf(climber.total, summit);
    const here = map.get(step) ?? [];
    here.push(climber);
    map.set(step, here);
  }
  map.forEach((here, step) => {
    map.set(
      step,
      [...here].sort((a, b) => Number(b.isMe) - Number(a.isMe))
    );
  });
  return map;
}
