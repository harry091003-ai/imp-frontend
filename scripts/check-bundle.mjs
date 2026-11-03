// Checks the real first-load size: every script index.html loads before anything is shown. Checking
// only the entry file looks fine while the rest of the first load is many times larger.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { gzipSync } from 'node:zlib';

// Set 2026-11-02 from a measurement, not a guess: 191 KB after `sideEffects` in package.json stopped the shared/ui
// barrel pulling every component into the first load (it was 230 KB). What is left is all used by the first screen
// (React, the router, zod, axios, TanStack Query). The limit fails again if the barrel problem comes back.
// Details: docs/performance-report.md.
const LIMIT_KB = 200;
const dist = resolve(import.meta.dirname, '../dist');
const html = readFileSync(resolve(dist, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map(
  (match) => match[1],
);

const sizes = scripts.map((file) => ({
  file,
  kb: gzipSync(readFileSync(resolve(dist, file))).length / 1024,
}));
const total = sizes.reduce((sum, row) => sum + row.kb, 0);

sizes
  .sort((a, b) => b.kb - a.kb)
  .forEach((row) => {
    console.log(`${row.kb.toFixed(1).padStart(7)} KB  ${row.file}`);
  });
console.log(`${total.toFixed(1).padStart(7)} KB  first load, limit ${String(LIMIT_KB)} KB`);

if (total > LIMIT_KB) {
  console.error('Over the first-load budget. See docs/REMAINING-WORK.md.');
  process.exitCode = 1;
}
