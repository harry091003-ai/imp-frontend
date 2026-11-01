import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/shared/styles/tokens.css'), 'utf8');

function readTheme(selector: string): Map<string, string> {
  const start = css.indexOf(selector);
  const block = css.slice(start, css.indexOf('}', start));
  return new Map(
    [...block.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-f]{6})/g)].map((m) => [m[1] ?? '', m[2] ?? '']),
  );
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

const TEXT_PAIRS: [string, string][] = [
  ...['--bg', '--surface', '--sunken'].flatMap((background): [string, string][] => [
    ['--ink', background],
    ['--ink2', background],
    ['--ink3', background],
    ['--acc', background],
  ]),
  ['--btnink', '--btn'],
  ['--acc', '--accbg'],
  ['--crit', '--critbg'],
  ['--high', '--highbg'],
  ['--med', '--medbg'],
  ['--low', '--lowbg'],
  ['--s-open', '--s-openbg'],
  ['--s-asg', '--s-asgbg'],
  ['--s-prog', '--s-progbg'],
  ['--s-res', '--s-resbg'],
  ['--s-clo', '--s-clobg'],
  ['--s-reo', '--s-reobg'],
];

// Dots and glyphs are graphics, so the WCAG limit is 3:1, not 4.5:1.
const GRAPHIC_PAIRS: [string, string][] = [
  ['--critdot', '--surface'],
  ['--highdot', '--surface'],
  ['--meddot', '--surface'],
  ['--lowdot', '--surface'],
];

// Waiting for the owner's decision on the design colours. See docs/phase-1-report.md.
const KNOWN_FAILURES = new Set(['light:--highdot', 'light:--meddot']);

const lightTheme = readTheme(":root[data-theme='light']");
const darkTheme = readTheme(":root[data-theme='dark']");

describe.each([
  ['light', lightTheme],
  ['dark', darkTheme],
])('%s theme contrast (WCAG AA)', (_name, theme) => {
  const color = (token: string): string => {
    const value = theme.get(token);
    if (!value) throw new Error(`Missing token ${token}`);
    return value;
  };

  it.each(TEXT_PAIRS)('text %s on %s is at least 4.5:1', (text, background) => {
    expect(contrast(color(text), color(background))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(GRAPHIC_PAIRS)('graphic %s on %s is at least 3:1', (graphic, background) => {
    const pair = `${theme === lightTheme ? 'light' : 'dark'}:${graphic}`;
    const check = () => {
      expect(contrast(color(graphic), color(background))).toBeGreaterThanOrEqual(3);
    };
    // Known failures must keep failing: fixing a colour turns this red until the entry is removed.
    if (KNOWN_FAILURES.has(pair)) expect(check).toThrow();
    else check();
  });
});
