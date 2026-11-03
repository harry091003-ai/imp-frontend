# Role pages report (Phase 3 and Phase 4 on sample data)

Date: 2026-11-02.

## How to see it

Run `npm run dev` and open http://localhost:5173. On the sign-in page, press Engineer, Supervisor or Admin, then Sign in. The password is `password`. Sample data resets when you reload.

## Pages by role

| Page                                            | Engineer  | Supervisor | Admin     |
| ----------------------------------------------- | --------- | ---------- | --------- |
| My work                                         | Home page |            |           |
| Dashboard                                       |           | Home page  | Home page |
| Incidents, detail, report form, alerts, account | Yes       | Yes        | Yes       |
| Assign, with AI ranking                         |           | Yes        | Yes       |
| Team, Reports                                   |           | Yes        | Yes       |
| Users and roles                                 |           |            | Yes       |

The sample data follows your backend's access rules, so each role sees what it really would: an engineer only sees their own incidents and gets 403 on reports, for example.

## Differences from the design, and why

| Design                                         | Built                                        | Why                                                                                          |
| ---------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| AI ranks engineers as the dialog opens         | "My team" first, AI on a button              | AI calls are paid and limited to 5 a minute                                                  |
| AI suggests while typing                       | "Get a suggestion" button                    | The same limit                                                                               |
| "+6 vs last week" on dashboard cards           | Left out                                     | The backend has no such comparison                                                           |
| Export CSV on Reports                          | Left out                                     | The backend has no export, and one page would look like a full export                        |
| "Save draft" for root cause                    | Notes are sent when you press Resolve        | The backend has no draft. Saving through the status endpoint would log a false status change |
| Search people, Ctrl K in the top bar           | Left out                                     | Needs its own design and a decision on what it searches                                      |
| Unread alerts                                  | "New" since your last visit, in this browser | The backend has no read state (BCR-12)                                                       |
| Team bar "of 5"                                | Five segments, no claim of a limit           | The backend has no capacity value                                                            |
| SLA ring on the engineer's home page           | SLA badge                                    | Simpler, and it needs BCR-07 either way                                                      |
| Drafts saved in the browser on the report form | Left out                                     | Avoids keeping incident text on shared computers                                             |

## Checked

| Check                                                                                         | Result                             |
| --------------------------------------------------------------------------------------------- | ---------------------------------- |
| Tests, lint, types, build                                                                     | All pass (see below for size)      |
| Each role in a browser: sign in, navigation, pages load, blocked pages refused                | Done on sample data                |
| Supervisor assigns an incident; form errors on the report form                                | Done in a browser                  |
| axe scan, all 8 main pages, light and dark, desktop                                           | 0 issues, after fixing 3 real ones |
| 360 px: sideways scrolling                                                                    | None on any page                   |
| Sample data, mock worker and preview page in a production build                               | None                               |
| Mock off, stand-in on the gateway port: real paths, token, trace id, proposed features hidden | Works                              |

## Not checked

- **Your real backend.** The stand-in copies your DTOs, but it is not your backend.
- **Page-level automated tests.** Pages were checked by hand in a browser. Automated page tests come in Phase 5.
- **Resolve, edit, Team status, Admin save and AI panels, clicked through in a browser.** API calls for these have automated tests, and some screens were opened, but please click them yourself.
- **Screenshots of the final pages.** The preview pane could not draw while in the background, so layout was checked by measurements and text. **Please look at the pages yourself.**
- Firefox, Safari, iOS, 1920 px and real screen readers.

## First-load size: over budget

> **Update 2026-11-02 (Phase 5):** fixed. The first load is now 191 KB and the limit is 200 KB. The real cause was the `shared/ui` barrel, not `zod`. `zod/mini` was measured to save only about 9 KB, so the 40 KB estimate below was wrong. See `docs/performance-report.md`.

The first page loads **230 KB, against the 170 KB budget**. Measured contents: the shared UI chunk 117 KB (largest part `zod`), React 75 KB, router 27 KB, the rest 11 KB. `npm run size` fails until this is decided.

**Recommendation for Phase 5:** move to `zod/mini` first. It is designed to be smaller, and I estimate it could save about 40 KB. I am not sure of that number until it is tried, and the budget of 170 KB was my own estimate. If it still falls short, raise the budget to what is measured and record why.
