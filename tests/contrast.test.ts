import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// WCAG 2.x: ordinary text needs a contrast ratio of at least 4.5 to 1 against its background; enhanced is 7 to 1.
const css = readFileSync(new URL('../src/web/style.css', import.meta.url), 'utf8');

function vars(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) out[m[1] as string] = (m[2] as string).toLowerCase();
  return out;
}
const lum = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string): number => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number]; return (x + 0.05) / (y + 0.05); };

const dark = vars(css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {'))));
const lightStart = css.indexOf('@media (prefers-color-scheme: light) {');
const light = { ...dark, ...vars(css.slice(lightStart, css.indexOf('}', lightStart))) };
const hcDark = { ...dark, ...vars(css.slice(css.indexOf(':root[data-contrast] {'), css.indexOf('}', css.indexOf(':root[data-contrast] {')))) };
const hcLightAt = css.indexOf(':root[data-contrast] { --ink: #000000');
const hcLight = { ...light, ...vars(css.slice(hcLightAt, css.indexOf('}', hcLightAt))) };

describe('colours are readable', () => {
  const themes = { dark, light, 'high-contrast dark': hcDark, 'high-contrast light': hcLight };
  for (const [name, t] of Object.entries(themes)) {
    it(`${name}: text, dim text, links and events are at least 4.5 to 1 on the page and on panels`, () => {
      for (const fg of ['ink', 'dim', 'accent', 'event']) for (const bg of ['bg', 'panel']) {
        expect(ratio(t[fg] as string, t[bg] as string), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    });
    it(`${name}: the main text is at least 7 to 1`, () => {
      expect(ratio(t.ink as string, t.bg as string)).toBeGreaterThanOrEqual(7);
    });
  }
  it('the primary button text is readable on the accent colour', () => {
    for (const t of [dark, light, hcDark, hcLight]) expect(ratio(t['on-accent'] as string, t.accent as string)).toBeGreaterThanOrEqual(4.5);
  });
  it('respects reduced motion', () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
  });
});
