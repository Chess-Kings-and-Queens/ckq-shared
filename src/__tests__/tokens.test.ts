import { tokens } from '../tokens';

const HEX = /^#[0-9a-f]{6}$/i;
const RGBA = /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/;

describe('tokens', () => {
  it('every colour is a valid hex or rgba value', () => {
    for (const [name, value] of Object.entries(tokens.color)) {
      expect({ name, ok: HEX.test(value) || RGBA.test(value) }).toEqual({ name, ok: true });
    }
  });

  it('every overlay is a valid rgba value', () => {
    for (const [name, value] of Object.entries(tokens.overlay)) {
      expect({ name, ok: RGBA.test(value) }).toEqual({ name, ok: true });
    }
  });

  it('orangeSoft is present', () => {
    expect(tokens.color.orangeSoft).toBe('#fff7ed');
  });

  it('radii, font sizes and weights match the globals.css scale', () => {
    expect(tokens.radius).toEqual({
      '3xs': 2,
      '2xs': 4,
      xs: 6,
      sm: 8,
      md: 10,
      lg: 12,
      xl: 16,
      '2xl': 20,
      '3xl': 24,
      '4xl': 32,
      pill: 999,
      circle: '50%',
    });
    expect(tokens.fontSize.eyebrow).toBe(11);
    expect(tokens.fontSize.statXl).toBe(32);
    expect(tokens.fontWeight.heavy).toBe(800);
  });

  it('space has the named steps', () => {
    expect(Object.values(tokens.space)).toEqual([
      1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 40, 48, 56, 64, 80, 96,
    ]);
  });

  it('font sizes gain the full step scale', () => {
    expect(tokens.fontSize['2xs']).toBe(10);
    expect(tokens.fontSize.md).toBe(16);
    expect(tokens.fontSize['7xl']).toBe(48);
    expect(tokens.fontSize.glyph).toBe(80);
    expect(tokens.fontSize.glyphLg).toBe(144);
    expect(tokens.fontSize.watermark).toBe(256);
  });

  it('lineHeight, letterSpacing and duration are present with numeric values', () => {
    expect(tokens.lineHeight).toEqual({
      none: 1,
      tight: 1.1,
      snug: 1.25,
      cozy: 1.4,
      normal: 1.5,
      relaxed: 1.65,
      prose: 1.85,
    });
    expect(tokens.letterSpacing).toEqual({
      tighter: -0.02,
      tight: -0.01,
      normal: 0,
      slight: 0.02,
      wide: 0.04,
      wider: 0.06,
      caps: 0.08,
      eyebrow: 0.1,
      spread: 0.12,
      code: 0.3,
    });
    expect(tokens.duration).toEqual({
      instant: 100,
      fast: 120,
      base: 150,
      moderate: 200,
      slow: 300,
      slower: 400,
      slowest: 500,
    });
  });

  it('muted and successFg reach 4.5:1 on white and on the page background', () => {
    const lum = (hex: string): number => {
      const ch = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
    };
    const ratio = (a: string, b: string): number => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    for (const fg of [tokens.color.muted, tokens.color.successFg]) {
      expect(ratio(fg, tokens.color.surface)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(fg, tokens.color.bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('has no liveboard (lb*) key in any family', () => {
    for (const family of Object.values(tokens)) {
      for (const key of Object.keys(family)) {
        expect(key).not.toMatch(/^lb[A-Z-]/);
      }
    }
  });

  it('gradients use the globals.css values and deep has three stops', () => {
    expect(tokens.gradient.deep).toEqual(['#0f172a', '#0d2b6e', '#1e3a8a']);
    expect(tokens.gradient.deepStops).toEqual([0, 0.6, 1]);
    expect(tokens.gradient.blue).toEqual(['#1565c0', '#0d2b6e']);
  });
});
