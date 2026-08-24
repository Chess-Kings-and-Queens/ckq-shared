export function scoreColor(pct: number): string {
  if (pct >= 80) return "#2e7d32";
  if (pct >= 50) return "#f57f17";
  return "#c62828";
}

export function formatTime(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s} sec`;
  return s === 0 ? `${m} mins` : `${m} mins ${s} sec`;
}
