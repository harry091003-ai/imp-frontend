# IMP Frontend

Frontend for the Incident Management Platform. Backend: the `IMP` folder next to this one.

## Run it

Requires Node 26 LTS. Open this folder in VS Code, then in its terminal:

```bash
npm ci
```

```bash
npm run setup:hooks
```

```bash
npm run dev
```

Open http://localhost:5173. API calls to `/api` go to the gateway on `127.0.0.1:8082`.

`npm ci` is safe to repeat. Install scripts are switched off in `.npmrc`, which is why the Git hook has its own setup command.

## Sample data or real backend

By default `npm run dev` uses sample data, so no backend is needed. Press Engineer, Supervisor or Admin on the sign-in page. To use your real backend, create `.env.local` with `VITE_API_MOCKING=false` and restart. Production builds always use the real backend. See `docs/api-map.md`.

## Commands

| Command             | What it does                            |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Start the app                           |
| `npm test`          | Run all tests                           |
| `npm run lint`      | Check code rules                        |
| `npm run typecheck` | Check types                             |
| `npm run build`     | Make the production build               |
| `npm run size`      | Check the bundle budget (after a build) |

## Documents

- `docs/phase-0-plan.md`: the plan
- `docs/phase-1-report.md`: current state and open items
- `docs/backend-change-requests.md`: what the backend still needs
- `docs/adr/`: decisions and why
