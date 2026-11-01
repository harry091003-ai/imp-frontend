# ADR 0001: Package safety rules

Date: 2026-11-02. Status: accepted.

## Decision

- `.npmrc`: `ignore-scripts=true`, `min-release-age=7`, `save-exact=true`. The lockfile is committed.
- Before a package is added: check its weekly downloads, official source repository, registry signature and install scripts.
- CI runs `npm audit signatures` and `npm audit --omit=dev`.
- A new dependency needs the owner's approval.

## Accepted warning

`npm audit` reports 9 moderate findings. All 9 are one issue: GHSA-g3hv-75wg-m249 in `minimatch` 10.2.6, used by ESLint and typescript-eslint.

- It only affects development tooling. `npm audit --omit=dev` finds 0, so it is not in what visitors run.
- It needs a malicious glob pattern, and ESLint here only reads patterns from our own config.
- `npm audit fix --force` would downgrade ESLint to version 4, so it is not used.

Review when ESLint or typescript-eslint updates.

## Limits

These checks reduce risk but cannot prove a package is safe. High downloads and a valid signature also applied to past hijacked releases, which is why the 7-day wait and blocked install scripts matter.
