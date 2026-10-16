// ── Design tokens ──────────────────────────────────────────────────────────────
//
// Copied from website2.0's src/app/globals.css `:root` — the "Portal design
// tokens" block and the typography scale. Key rule (the website's tokensSync
// guard test uses the same rule): colours drop `--ckq-` and camel-case
// (`--ckq-blue-soft-2` → `color.blueSoft2`); radii drop `--ckq-radius-`
// (`--ckq-radius-2xl` → `radius['2xl']`); font sizes drop `--ckq-fs-` and
// camel-case (`--ckq-fs-title-hero` → `fontSize.titleHero`), stored in px
// (rem × 16). `orangeSoft` is added to globals.css by the website adoption PR.

export const tokens = {
  color: {
    blue: '#1565c0',
    blueHover: '#005f92',
    blueSoft: '#eff6ff',
    blueSoft2: '#dbeafe',
    navy: '#0d2b6e',
    navyDeep: '#0f172a',
    orange: '#f5921e',
    orangeHover: '#c2670a',
    orangeGlow: 'rgba(245, 146, 30, 0.30)',
    orangeSoft: '#fff7ed',
    success: '#0e9f6e',
    successFg: '#059669',
    successSoft: '#d1fae5',
    purple: '#7c3aed',
    amber: '#fbbf24',
    danger: '#dc2626',
    dangerSoft: '#fee2e2',
    warningFg: '#92400e',
    warningSoft: '#fef3c7',
    bg: '#f4f6f9',
    bgSoft: '#f8fafc',
    surface: '#ffffff',
    border: '#e5e7eb',
    borderSoft: '#f0f0f0',
    text: '#111827',
    textSoft: '#4b5563',
    muted: '#6b7280',
    muted2: '#9ca3af',
  },
  radius: {
    sm: 8,
    md: 10,
    lg: 12,
    xl: 16,
    '2xl': 20,
    pill: 999,
  },
  /** px (rem × 16). */
  fontSize: {
    eyebrow: 11,
    xs: 12,
    sm: 13,
    label: 14,
    body: 15,
    statSm: 18,
    statBase: 20,
    statMd: 22,
    titleHero: 28,
    statLg: 28,
    statXl: 32,
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    heavy: 800,
  },
  space: {
    s4: 4,
    s6: 6,
    s8: 8,
    s10: 10,
    s12: 12,
    s14: 14,
    s16: 16,
    s20: 20,
    s22: 22,
    s28: 28,
  },
  /** CSS box-shadow strings; `cta` has `--ckq-orange-glow` resolved to its value. */
  shadow: {
    xs: '0 1px 8px rgba(0, 0, 0, 0.06)',
    md: '0 8px 28px rgba(0, 0, 0, 0.12)',
    lg: '0 12px 32px rgba(0, 0, 0, 0.08)',
    cta: '0 8px 24px rgba(245, 146, 30, 0.30)',
    hero: '0 24px 80px rgba(13, 42, 110, 0.35)',
  },
  /** 135deg linear gradients (the globals.css values). `deepStops` are the colour stops of `deep`. */
  gradient: {
    deep: ['#0f172a', '#0d2b6e', '#1e3a8a'],
    deepStops: [0, 0.6, 1],
    blue: ['#1565c0', '#0d2b6e'],
  },
  /** Used only by the mobile app (not in globals.css, so not covered by the website guard test). */
  overlay: {
    onNavy08: 'rgba(255,255,255,0.08)',
    onNavy12: 'rgba(255,255,255,0.12)',
    onNavy15: 'rgba(255,255,255,0.15)',
    onNavyText60: 'rgba(255,255,255,0.6)',
    onNavyText70: 'rgba(255,255,255,0.7)',
    scrim: 'rgba(6,14,30,0.45)',
    countdownBg: 'rgba(245,146,30,0.18)',
    watermark: 'rgba(255,255,255,0.06)',
  },
} as const;

export type Tokens = typeof tokens;
