# Remaining work

The one list of what is left. Updated as work finishes. Last updated: 2026-11-02.

## Before deploying (checked 2026-11-03)

The app runs end to end on the laptop (owner, 2026-11-03). What is left, in order:

| #   | Step                                    | Who            | Why                                                                                                                              |
| --- | --------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Commit BCR-03, 04, 05 (17 files)        | You            | Not saved in Git yet                                                                                                             |
| 2   | Commit the frontend (43 files)          | You, I prepare | Only Phase 1 is in Git                                                                                                           |
| 3   | Merge `gateway-prod-settings` to master | You            | It holds all backend work (BCR-01 to 05)                                                                                         |
| 4   | Put both projects on GitHub (private)   | You, I guide   | **No copy exists outside this laptop.** Also needed for CI                                                                       |
| 5   | Choose where to host                    | You decide     | 8 services + Kafka + MySQL + PostgreSQL need about 8 to 16 GB of RAM                                                             |
| 6   | Docker and nginx files (Phase 5)        | Me             | Packages every service, HTTPS, security headers, `X-Real-IP` (BCR-01), refuses `/api/actuator`, `prod` profile (BCR-04)          |
| 7   | Production secrets                      | You, I guide   | New JWT key pair, new `internalsecret`, strong database passwords, Gemini key: in server settings, never in files                |
| 8   | Database start-up                       | Me             | Roles rows are seeded by hand today; first admin through `adminemail`; daily database backups                                    |
| 9   | Final checks                            | Both           | Browser check of the production build, page tests, other browsers, the hand tests in `IMP/PROGRESS.md`                           |
| 10  | Decide which hidden features go first   | You decide     | BCR-06 to 10 are hidden today. BCR-09 also stops supervisors receiving every engineer's data, so it is worth doing before launch |

## Waiting on you

| Task                               | What you need to do                                                                                                                                          | Details                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| **Commit BCR-04, 03, 05 in `IMP`** | Built and tested on branch `gateway-prod-settings` (it also holds the BCR-02 and BCR-01 commits). Not committed: three commits, commands in chat             | `IMP/PROGRESS.md`                                    |
| ~~Try the whole app for real~~     | Done 2026-11-03: the app runs with the real backend                                                                                                          | `docs/run-everything-together.md`                    |
| Old gateway logs                   | The leak is fixed, but a log file written before it may hold tokens and the internal secret. Delete old logs; change `internalsecret` if one was ever shared | `IMP/notes/refresh-token-in-a-cookie.md`, section 12 |
| **Commit the frontend work**       | Run the commit. Phase 1 is the only commit so far                                                                                                            | The latest report in chat                            |
| Confirm the server timezone        | If your laptop is not on UTC, set `VITE_SERVER_UTC_OFFSET` in `.env.local`                                                                                   | `.env.example`                                       |

## Frontend

| Task                                                                                                                                                                                                              | Status                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Phase 3: sign-in, app layout, navigation, role access                                                                                                                                                             | Built on sample data                                                                                       |
| Phase 4: pages for all three roles                                                                                                                                                                                | Built on sample data                                                                                       |
| First-load size                                                                                                                                                                                                   | Done: 230 KB to 191 KB, limit 200 KB. `docs/performance-report.md`. Browser check of the build still to do |
| Phase 5: full tests, performance, README, ADRs                                                                                                                                                                    | Started: first-load size done, ADR 0002 written                                                            |
| Page-level tests. Today the tests cover components and API calls, and pages were checked by hand in a browser                                                                                                     | Phase 5                                                                                                    |
| Download Playwright browsers, needs your approval                                                                                                                                                                 | Not started                                                                                                |
| Firefox, Safari and iOS checks                                                                                                                                                                                    | Phase 5                                                                                                    |
| Docker and nginx files, with security headers. nginx must set `proxy_set_header X-Real-IP $remote_addr;` (BCR-01), refuse `/api/actuator`, and the gateway must start with `SPRING_PROFILES_ACTIVE=prod` (BCR-04) | Phase 5                                                                                                    |
| Connect pages to the real backend                                                                                                                                                                                 | Ready: `docs/run-everything-together.md`. Parts that need BCR-06 to 13 stay hidden                         |

## Backend changes (each needs your approval first)

Full details: `docs/backend-change-requests.md`. BCR-02 and the first piece of BCR-04 are committed (`c6b022e`), BCR-01 too (`eaeaa89`). The rest of BCR-04, BCR-03 and BCR-05 are built on the branch `gateway-prod-settings`, not committed. BCR-06 to 14 still need your approval.

| ID     | Change                                   | Priority                  | Blocks                                                                                      |
| ------ | ---------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------- |
| BCR-01 | Real client IP behind nginx              | **Committed, not merged** | `eaeaa89` on branch `gateway-real-client-ip` in `IMP`. Hand test once nginx exists          |
| BCR-02 | Refresh token in an HttpOnly cookie      | **Committed, not merged** | `c6b022e` on branch `auth-refresh-cookie` in `IMP`. Hand test to do                         |
| BCR-03 | Server-side status rules                 | **Built, not committed**  | Branch `gateway-prod-settings`. Engineers may close and reopen. IncidentService 42 pass     |
| BCR-04 | Production settings, DEBUG logs off      | **Built, not committed**  | Leak fix `c6b022e`; `prod` profile on branch `gateway-prod-settings`, gateway 93 tests pass |
| BCR-05 | Names for user ids                       | **Built, not committed**  | Branch `gateway-prod-settings`. `POST /users/lookup`. UserService 21 pass                   |
| BCR-06 | Search and filters on incidents          | Needed by pages           | Incident search                                                                             |
| BCR-07 | SLA deadlines for readers                | Needed by pages           | SLA timers                                                                                  |
| BCR-08 | Activity history for engineers           | Needed by pages           | Engineer's activity                                                                         |
| BCR-09 | Supervisor's own team, stats in one call | Needed by pages           | Team numbers. Also stops every engineer's data going to supervisors                         |
| BCR-10 | Paged admin user list                    | Needed by pages           | Admins missing from Users and roles                                                         |
| BCR-11 | Send `version` with edits                | Later                     | Stale-edit warning                                                                          |
| BCR-12 | Notification read state                  | Later                     | Unread across devices                                                                       |
| BCR-13 | SLA policy endpoint                      | Later                     | SLA preview on the report form                                                              |
| BCR-14 | Make login `username` optional           | Later                     | Nothing, a tidy-up                                                                          |

## Checks only you can run

| Check                                                  | Needs                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------ |
| Run the pages against the real backend                 | Backend running, the BCR-02 branch, `VITE_API_MOCKING=false`             |
| Refresh cookie hand test, never run on the real system | Backend running on the BCR-02 branch. Steps: `IMP/PROGRESS.md`, "BCR-02" |
| Set up GitHub and run CI for the first time            | A repo, and your approval to push                                        |

## Accepted for now

- Dev-only `minimatch` warning: `docs/adr/0001-package-safety.md`.
- A lost network answer during token renewal can force one extra login: `docs/bcr-02-plan.md`.
