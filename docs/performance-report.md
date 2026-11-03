# First-load size (Phase 5, step 1)

Date: 2026-11-02. Result: **230 KB down to 191 KB**, with one line in `package.json`. No library added or removed, no screen changed.

## What "first-load size" means

It is the JavaScript a visitor's browser must download before the first screen appears. It is measured compressed (gzip), the way it travels over the network.

It is **not** disk space. Free space on your laptop or server does not change it. What it changes is how long a visitor waits, most of all on a slow phone connection:

```
 visitor opens the app
        |
        v
 browser downloads index.html (0.5 KB)
        |
        v
 browser downloads every script index.html names   <- this is the "first load"
        |                                              230 KB before, 191 KB now
        v
 first screen appears (sign-in, or the dashboard)
        |
        v
 later, when the user opens a page, that page's own script is fetched (a "lazy" page)
```

## What was wrong

Every page was already lazy. The problem was one shared file, `src/shared/ui/index.ts`. It re-exports all 19 UI components so other files can write `import { Button } from '@/shared/ui'`. A file like this is called a **barrel**.

```
 BEFORE

 App shell ── needs Button, Skeleton, Toast ──► shared/ui/index.ts (barrel)
                                                   ├─ Button        needed
                                                   ├─ Toast         needed
                                                   ├─ DataTable     NOT needed on the first screen
                                                   ├─ Select        NOT needed
                                                   ├─ Dialog        NOT needed
                                                   └─ ... 14 more

 The bundler did not know if loading DataTable.tsx "does something" by itself.
 To be safe it kept every component on the path of the first screen.
 So the table, dropdown and dialog code was in the first download.
```

## The fix

```json
"sideEffects": ["**/*.css"]
```

This line in `package.json` tells the bundler: "Our code files do nothing just by being loaded. Only CSS files do." Now the bundler can drop a component the first screen does not use, and it moves to the page that does.

```
 AFTER

 first load:   React, router, zod, axios, TanStack Query, Button, Toast, the shell   191 KB
 Incidents page (lazy):   + DataTable, Select ...
 Detail page (lazy):      + Dialog ...
```

### Why it is safe here

The setting is only wrong if some file of ours is imported **only to make it run**, like `import './register-something'`. The search found one such import in the app code: `import '@/shared/styles/index.css'`. CSS is exactly what the setting keeps. The other one is in the test setup and imports an npm package, which this setting does not touch.

## Proof

| Check                                     | Result                             |
| ----------------------------------------- | ---------------------------------- |
| First load before                         | 230.2 KB                           |
| First load after                          | **191.4 KB**                       |
| Type check, lint                          | pass                               |
| Unit and component tests                  | 153 pass                           |
| Build                                     | pass                               |
| `npm run size` (new limit 200 KB)         | pass                               |
| Break check: remove the line, build again | 230.2 KB, `npm run size` **fails** |

The break check shows the size check would catch the problem if it came back.

What is in the 191 KB now, measured from source maps:

| Part                                      | KB       | Needed on the first screen because                         |
| ----------------------------------------- | -------- | ---------------------------------------------------------- |
| `react-dom`                               | 65       | It draws everything                                        |
| `react-router`                            | 30       | It decides which page to show                              |
| `zod`                                     | 27       | It checks settings, the saved session and every API answer |
| `axios`                                   | 16       | It makes the API calls                                     |
| TanStack Query                            | 11       | It loads data for the shell (alert count, current user)    |
| `tailwind-merge`                          | 9        | It combines CSS class names                                |
| Radix toast, theme switch and small parts | about 20 | They are in the shell                                      |
| Our own shell code                        | about 10 |                                                            |

## Options that were measured and not taken

| Option                                     | Saves                                        | Why not now                                                                                                                                             |
| ------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zod/mini` instead of `zod`                | **about 9 KB** (measured in a scratch build) | About 200 schema calls to rewrite, and its default error messages differ, so users would see different form errors. My earlier guess of 40 KB was wrong |
| A small `fetch` wrapper instead of `axios` | about 14 to 16 KB (estimate)                 | Rewrites the network layer, including token renewal. Possible later, with its own tests                                                                 |
| Both together                              | about 25 KB, to about 166 KB                 | Two risky rewrites for a small gain                                                                                                                     |

## The limit

The old limit, 170 KB, was my own estimate from Phase 0, not a measured need. The new limit is **200 KB**: today's 191 KB plus a little room. It is still below 230 KB, so the barrel problem cannot come back unnoticed. The decision is recorded in `docs/adr/0002-first-load-budget.md`.

## Not checked yet

- The built app was not opened in a browser in this step. The tests run the code without bundling it, so they cannot see a bundling mistake. A browser check of `npm run build` + `npm run preview` is the remaining proof.
- Real timings on a slow phone (Lighthouse) are later in Phase 5.
