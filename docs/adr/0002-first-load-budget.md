# ADR 0002: First-load budget of 200 KB

Date: 2026-11-02. Status: accepted.

## Decision

- `package.json` has `"sideEffects": ["**/*.css"]`, so a barrel file such as `src/shared/ui/index.ts` no longer pulls every component into the first load.
- `scripts/check-bundle.mjs` allows **200 KB** gzip of JavaScript on the first load (was 170 KB). Measured: 191.4 KB.

## Why

- The setting cut the first load from 230 KB to 191 KB with no change to any screen. Only CSS is imported just to run, and CSS is kept.
- The rest is used by the first screen. Going lower needs rewrites: `zod/mini` would save about 9 KB (measured) and replacing `axios` about 15 KB. Both risk the validation and network code for a small gain.
- 170 KB was an estimate, not a requirement. 200 KB leaves a little room and still fails at 230 KB, where the barrel problem would put us.

## Rules from now on

- A file imported only for what it does when loaded must be added to `sideEffects`, or it will be dropped from the build.
- If `npm run size` fails, find what entered the first load before raising the limit.

Review when the app grows, or if real timings on a slow phone are poor.
