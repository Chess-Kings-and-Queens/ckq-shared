export type ScoreTone = 'success' | 'warning' | 'danger';

export function scoreTone(pct: number): ScoreTone {
  if (pct >= 80) return 'success';
  if (pct >= 50) return 'warning';
  return 'danger';
}

const SCORE_HEX: Record<ScoreTone, string> = { success: '#2e7d32', warning: '#f57f17', danger: '#c62828' };

export function scoreColor(pct: number): string {
  return SCORE_HEX[scoreTone(pct)];
}

export function formatTime(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s} sec`;
  return s === 0 ? `${m} mins` : `${m} mins ${s} sec`;
}
