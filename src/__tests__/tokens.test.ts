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
    expect(tokens.radius).toEqual({ sm: 8, md: 10, lg: 12, xl: 16, '2xl': 20, pill: 999 });
    expect(tokens.fontSize.eyebrow).toBe(11);
    expect(tokens.fontSize.statXl).toBe(32);
    expect(tokens.fontWeight.heavy).toBe(800);
  });

  it('space has the ten named steps', () => {
    expect(Object.values(tokens.space)).toEqual([4, 6, 8, 10, 12, 14, 16, 20, 22, 28]);
  });

  it('gradients use the globals.css values and deep has three stops', () => {
    expect(tokens.gradient.deep).toEqual(['#0f172a', '#0d2b6e', '#1e3a8a']);
    expect(tokens.gradient.deepStops).toEqual([0, 0.6, 1]);
    expect(tokens.gradient.blue).toEqual(['#1565c0', '#0d2b6e']);
  });
});
