# Phase 1 report

Date: 2026-11-02. Nothing is committed yet.

## Built

- Vite, React and TypeScript (strict), with `@/` imports
- ESLint, Prettier, Husky pre-commit hook, lint-staged
- Design tokens (light and dark), self-hosted fonts, theme with no flash on load
- `env.ts`, which only accepts a same-origin API path
- HTTP client: token, one shared refresh (also across tabs), normalized errors, trace id, safe GET retries
- GitHub Actions CI, pinned to commits, with audit, lint, types, tests, build and bundle budget
- A temporary placeholder page, replaced in Phase 3

## Changes from the plan

- **`eslint-plugin-boundaries` removed.** It needs one more package to understand `@/` imports. ESLint's built-in `no-restricted-imports` does the same job, and a test with deliberately bad imports proved it catches them.
- **`@testing-library/dom` 10.4.2 added.** It is a required companion of `@testing-library/react` and is used in tests only. It passed the same checks.
- **nginx config and Dockerfile moved to Phase 5.** Docker is not available here to test them, and untested security headers would give false confidence.

## Open items

| Item                                                        | Status                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------- |
| Two light-theme severity dot colours are below 3:1 contrast | Needs a decision                                        |
| Token JSON key (`jwttoken` or `JWTtoken`)                   | Client accepts both until the real login call           |
| Refresh uses the proposed cookie contract (BCR-02)          | **Sign-in against the real backend needs BCR-02 first** |
| GitHub Actions has never run                                | Needs a GitHub repo and your approval                   |
| Pre-commit hook has never run                               | Runs on the first commit                                |
| Dev-only `minimatch` warning                                | Accepted in ADR 0001                                    |

### Contrast decision

| Token       | Now       | Contrast on white | Proposed  | Contrast on white |
| ----------- | --------- | ----------------- | --------- | ----------------- |
| `--highdot` | `#F5820D` | 2.60:1            | `#D66A00` | about 3.5:1       |
| `--meddot`  | `#E2A507` | 2.18:1            | `#B58900` | about 3.2:1       |

The dots always appear with a text label, so meaning is not lost today. The change makes them easier to see. The test tracks these two as known failures and turns red once they are fixed, so the entry gets removed.
