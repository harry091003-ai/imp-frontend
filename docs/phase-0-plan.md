# Phase 0 plan: IMP Frontend

Status: **waiting for approval**. No application code exists yet. Backend checked on 2026-11-01. Design source: the "IMP Incident Platform UI" canvas (13 screens).

## 1. Corrections to the prompt

The backend changed after the prompt was written, so these lines need updating.

| Prompt says                            | Code says now                                                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI endpoints are GET with a body       | Fixed. Both are `POST` (issue 7).                                                                                                                 |
| Incident read returns only 8 fields    | Fixed. It now returns all fields (issue 58).                                                                                                      |
| All lists are Spring Page              | Not `/notifications/me`. It returns `{total, page, size, items}`. Several user endpoints are plain lists.                                         |
| Refresh limited only by "login per IP" | `/auth/refresh` has its own limit per IP: 30/min, 300/hour.                                                                                       |
| Login returns `JWTtoken`               | The Java field is `JWTtoken`, but Jackson's default naming should send **`jwttoken`**. I'm not sure until a real call confirms it. See section 9. |

New useful facts:

- `GET /reports/metrics/daily?days=` exists.
- The RAG answer has `status` (`OK` or `NOT_ENOUGH_SIMILAR_INCIDENTS`) and `sources`.
- The engineer recommendation is ADMIN and SUPERVISOR only.
- The gateway returns `X-Trace-Id` on responses.

## 2. Folder tree

```text
IMP Frontend/
  docs/                  plan, backend-change-requests, adr/
  deploy/                nginx.conf, security headers
  public/
  e2e/                   Playwright flows
  src/
    app/                 providers, router, route guards, error boundary
    features/
      auth/              {components,hooks,api,types,pages}
      incidents/
      notifications/
      reporting/
      ai/
      users/
    shared/
      ui/                buttons, pills, tables, dialogs...
      hooks/
      lib/
        http/            client, refresh lock, error normalizer
        env.ts           the only place that reads config
        date.ts          the only place that formats dates
        constants/       roles, statuses, routes, error codes
      utils/
      types/
      styles/            tokens.css, base.css
    test/                MSW handlers, fixtures, test setup
  Dockerfile
```

**Import rule, enforced by ESLint:** `app` -> `features` -> `shared`. A feature never imports another feature's internals, only its public `index.ts`. Components never import the http client.

## 3. Route map

Role is read from the JWT `roles` claim, not from `/users/me`, because that profile can lag after signup. A person with several roles gets the highest one: Admin, then Supervisor, then Engineer.

| Route               | Who               | Canvas screen             | Notes                                     |
| ------------------- | ----------------- | ------------------------- | ----------------------------------------- |
| `/login`, `/signup` | Public            | 1 Sign in                 | Signup does not log in                    |
| `/`                 | Logged in         | none                      | Redirects by role                         |
| `/dashboard`        | Supervisor, Admin | 2 Dashboard               |                                           |
| `/my-work`          | Engineer          | 7 Engineer home           |                                           |
| `/incidents`        | All               | 3 Incident list           | Results depend on role                    |
| `/incidents/new`    | All               | 5 Report incident         |                                           |
| `/incidents/:id`    | Allowed readers   | 4 Detail, 6 Assign dialog | The dialog is Supervisor and Admin only   |
| `/alerts`           | All               | 11 Alerts                 |                                           |
| `/team`             | Supervisor, Admin | 9 Team                    |                                           |
| `/reports`          | Supervisor, Admin | 10 Reports                |                                           |
| `/admin/users`      | Admin             | 12 Users and roles        |                                           |
| `/settings/account` | All               | **No design yet**         | Password and credentials endpoints exist  |
| `/403`, `*` (404)   | All               | **No design yet**         | Built from existing tokens and components |

Phone layouts (screen 8) are the same routes, responsive. The design system (screen 13) becomes `tokens.css` and `shared/ui`.

## 4. Screen to endpoint map

**Ready** means it works with today's backend. BCR ids refer to `backend-change-requests.md`.

| Screen           | Endpoints                                                                                                                                                              | State                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Sign in, sign up | `POST /auth/login`, `POST /auth/signup`                                                                                                                                | Ready. Needs BCR-01 and BCR-02 for production.                                |
| Dashboard        | `/reports/metrics`, `/reports/metrics/daily`, `/reports/trends`, `/reports/top-services/failing`, `/reports/incidents`                                                 | Ready. Names need BCR-05.                                                     |
| Engineer home    | `/incidents?filter=assignedToMe`, `/notifications/me`                                                                                                                  | Partial. SLA needs BCR-07; names need BCR-05.                                 |
| Incident list    | `/incidents?filter=&page=&size=`                                                                                                                                       | Partial. Search and filters need BCR-06; SLA needs BCR-07.                    |
| Incident detail  | `GET /incidents/{id}`, `PUT /incidents/{id}`, `PUT /incidents/{id}/status`, `/reports/incidents/{id}/audit`, `POST /ai/rag/suggestion`                                 | Partial. Engineer activity needs BCR-08; SLA needs BCR-07; rules need BCR-03. |
| Report incident  | `POST /incidents`, `POST /ai/rag/suggestion`                                                                                                                           | Ready. SLA preview needs BCR-13.                                              |
| Assign dialog    | `POST /ai/EngineersSuggestion-ForIncidentAssignment`, `PUT /incidents/{id}/assign`, `/users/search`                                                                    | Partial. Names need BCR-05.                                                   |
| Alerts           | `GET /notifications/me`                                                                                                                                                | Partial. "Unread" needs BCR-12; fallback is "New since last visit".           |
| Team             | `/users/search`, `/users/engineers`, `/reports/engineer-workload/{id}`, `/reports/engineer-performance/...`, `PUT /users/{id}/statusEngineer`                          | Partial. Needs BCR-09.                                                        |
| Reports          | `/reports/incidents?status=&severity=`, `/reports/metrics/daily`, `/reports/trends`, `/reports/top-services/failing`                                                   | Ready. Names need BCR-05.                                                     |
| Users and roles  | `/users/engineers`, `/users/supervisors`, `PUT /roles/{username}/update`, `PUT /users/engineer/supervisor`, `DELETE /users/engineer/{id}/supervisor`, status endpoints | Partial. Needs BCR-10.                                                        |
| Account settings | `/users/me`, `POST /password/update`, `PUT /credentials/profile`, `POST /logout/user`                                                                                  | Ready.                                                                        |

### Where the canvas and the backend disagree

These need your choice or a backend change. I will not fake them.

1. **Incident edit.** `UpdateIncidentMetadate_RequestDTO` has no `serviceName` or `category`, so those two fields are read-only after creation.
2. **Unread alerts.** No read state on the server (BCR-12).
3. **SLA rings on lists and engineer screens.** No deadlines are available (BCR-07).
4. **Team numbers for a supervisor.** One call per engineer today (BCR-09).
5. **Names on every screen.** Only UUIDs today (BCR-05). Until then, the UI shows a short id, not an invented name.
6. **AI explanation in the assign dialog.** The backend gives scores only, with no written reason, so the UI shows the numbers and not a made-up reason.
7. **AI source links.** A source incident may be one the user cannot open. A 403 there shows a friendly message.
8. **Email wording.** No email is sent today, so the UI must never say "emailed".

## 5. Component list

**Foundations:** Button, IconButton, Input, Textarea, Select, Checkbox, Field (label, help, error), Tooltip, Popover, DropdownMenu, Dialog, Sheet, Tabs, SegmentedControl, Toast, Skeleton, Avatar, Badge.

**Product:** SeverityBadge (glyph and label), PriorityBadge, StatusPill, SlaIndicator, UserName (id to name), DateTime, TraceReference, PageHeader, EmptyState, ErrorState, DataTable with server paging, FilterBar, Pagination, StatCard, ChartCard, AiSuggestionPanel (always labelled "Suggestion"), RoleGate, AppShell, Sidebar, TopBar, MobileNav, ThemeToggle, OfflineBanner.

**Rule:** colour is never the only signal. Severity and status always have a label or glyph as well.

## 6. Design tokens

Copied exactly from the canvas into `src/shared/styles/tokens.css`, as light and dark sets:

| Group    | Tokens                                                                                              |
| -------- | --------------------------------------------------------------------------------------------------- |
| Surfaces | `--bg --surface --sunken --line --line2`                                                            |
| Text     | `--ink --ink2 --ink3`                                                                               |
| Actions  | `--btn --btnink --acc --accbg --accline`                                                            |
| Severity | `--crit --critbg --critdot --high --highbg --highdot --med --medbg --meddot --low --lowbg --lowdot` |
| Status   | `--s-open --s-asg --s-prog --s-res --s-clo --s-reo`, each with a `bg` version                       |
| Depth    | `--shadow --pop`                                                                                    |

Tailwind reads these variables, so no colour values live in components.

Fixes I need to make while porting:

- **`--pop` has no dark value** in the canvas, so dark popups would use the light shadow. I will add one and show you.
- **Contrast has not been measured** across every pair. Phase 1 includes an automated WCAG AA check of all token pairs in both themes. Anything that fails gets reported, not silently changed.
- **Fonts.** The canvas loads Inter and JetBrains Mono from Google. The real app should host the two fonts itself, so visitors' IPs do not go to a third party and the CSP stays strict.

## 7. Session design

This is the riskiest part of the frontend.

- The access token (15 min) lives in memory only.
- The refresh token lives in an HttpOnly cookie, once BCR-02 lands. JavaScript never sees it.
- A refresh happens only on `401` with code `INVALID_TOKEN`. Never on `INVALID_CREDENTIALS`.
- One refresh at a time: a shared promise within a tab, and the Web Locks API across tabs. After getting the lock, a tab first checks whether another tab already refreshed.
- A failed request is retried once after a refresh. `POST` and `PUT` are only retried in this 401 case, because the server refused them before doing anything.
- `TOKEN_REVOKED`, `REFRESH_TOKEN_REUSED`, `REFRESH_TOKEN_EXPIRED`, `INVALID_REFRESH_TOKEN` and `ACCOUNT_LOCKED` end the session with a clear message.
- `AUTH_SERVICE_UNAVAILABLE` (503) does **not** log the user out.
- Logout syncs across tabs with BroadcastChannel, and clears the TanStack Query cache so the next user sees no leftover data.

## 8. Bundle budget

Enforced in CI from Phase 1. Sizes are gzip.

| Item                               | Limit                                                             |
| ---------------------------------- | ----------------------------------------------------------------- |
| JS on first load (shell + sign-in) | 170 KB (raised to 200 KB on 2026-11-02 after measuring: ADR 0002) |
| Any single lazy route              | 80 KB                                                             |
| Recharts                           | Loaded only on Dashboard and Reports                              |
| CSS total                          | 30 KB                                                             |
| Fonts (subset, woff2)              | 120 KB                                                            |

These limits are my starting estimate and not measured yet. If real numbers disagree, I will show you the reason before changing a limit.

## 9. Risks

| Risk                                         | Effect                              | Plan                                                                                                                |
| -------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Shared rate-limit bucket behind nginx        | One bot blocks all logins           | BCR-01 before production                                                                                            |
| Refresh race                                 | Random logouts                      | Test first in Phase 1                                                                                               |
| Token field name in JSON                     | Login appears to fail               | Zod parses both only if needed; confirm with one real call, then fix the mock                                       |
| Mocks drift from the real API                | Works in tests, fails live          | Fixtures are parsed by the same Zod schemas; a small contract check runs against the real gateway when you start it |
| `LocalDateTime` has no timezone              | Wrong times, wrong SLA countdown    | Backend sends server local time. One `date.ts`, one documented rule (decision 3)                                    |
| UUIDs as names                               | Poor UX                             | BCR-05                                                                                                              |
| `/users/me` lags after signup                | Profile 404 right after first login | Use JWT claims and retry the profile                                                                                |
| AI rate limit (5/min, 100/day)               | Users hit 429                       | AI runs on button click only, never on typing. Show `Retry-After` countdown                                         |
| Gemini slow (up to 60 s)                     | Looks frozen                        | Progress state and cancel button. The gateway route allows 60 s, so the client timeout matches                      |
| Gateway on 127.0.0.1, no backend Dockerfiles | Container nginx may not reach it    | Local dev uses the Vite proxy. Docker details checked at deploy; I'm not sure of the final hosting yet              |
| `/api/actuator` through nginx                | Exposes metrics publicly            | nginx blocks it                                                                                                     |
| Pasted text is untrusted                     | Script injection                    | React text rendering only, no raw HTML, strict CSP                                                                  |

### Security checklist carried into Phase 1

Strict CSP, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`, HSTS on HTTPS, no public source maps, `npm audit` in CI, no tokens in URLs, logs or storage, committed lockfile, pinned versions.

## 10. Build order

1. **Phase 1:** setup, tooling, tokens, env, http client with refresh tests first, CI.
2. **Phase 2:** shared UI, with a test screen showing both themes at 360 px and 1920 px.
3. **Phase 3:** auth, app shell, navigation, role guards.
4. **Phase 4:** Incidents, Notifications, Reporting, AI, Users.
5. **Phase 5:** full tests, accessibility, performance, README, ADRs.

Backend changes run alongside, one at a time, only after approval. The P0 items must be finished before deployment, not before starting.

## 11. Decisions needed

Accepted on 2026-11-02. These will be recorded as ADRs in `docs/adr/`.

1. Build the frontend first. The 4 P0 backend changes come before deployment, each with approval.
2. The refresh token moves to an HttpOnly cookie (BCR-02) before Phase 3.
3. Backend times are treated as one fixed server timezone and shown in the viewer's local time. The timezone is assumed to be UTC until confirmed.
4. English only for now, with text kept tidy so more languages can be added later.
5. Docker with nginx for now. The final provider is decided later.
6. A separate git repo inside `IMP Frontend`.

## 12. Open items

- **One real login call (postponed at the user's request).** It confirms the token's JSON key (`jwttoken` or `JWTtoken`). Do it before relying on sign-in against the real backend. Until then the mock is marked as unconfirmed.
- **Server timezone.** Confirm the assumed UTC before deployment.
