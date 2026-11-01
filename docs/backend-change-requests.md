# Backend change requests

Things the frontend needs that the backend does not provide today. Checked against the code on 2026-11-01.

**Nothing here has been changed.** Each item needs your approval first. Then: one small change, test first, following `IMP/CLAUDE.md`. Until a change lands, the frontend uses an MSW mock of the proposed contract, and the mock is marked as "proposed", not "real".

| Priority | Meaning                                                        |
| -------- | -------------------------------------------------------------- |
| **P0**   | Must be done before production. Security or a serious failure. |
| **P1**   | A designed screen cannot work honestly without it.             |
| **P2**   | Good improvement. The frontend has a safe fallback.            |

## Summary

| ID     | Change                                             | Priority | Service                       | Screens affected                  |
| ------ | -------------------------------------------------- | -------- | ----------------------------- | --------------------------------- |
| BCR-01 | Real client IP behind nginx                        | P0       | APIGateway                    | Sign in, sign up, session refresh |
| BCR-02 | Refresh token in an HttpOnly cookie                | P0       | AuthService                   | Every screen                      |
| BCR-03 | Server-side status rules                           | P0       | IncidentService               | Incident detail                   |
| BCR-04 | Turn off DEBUG logs and add production settings    | P0       | APIGateway, all               | Deployment                        |
| BCR-05 | Names for user ids (`POST /users/lookup`)          | P1       | UserService                   | Almost every screen               |
| BCR-06 | Search and filters on `GET /incidents`             | P1       | IncidentService               | Incident list, engineer home      |
| BCR-07 | SLA deadlines for people who can read the incident | P1       | ReportingService              | Lists, detail, engineer home      |
| BCR-08 | Activity history for engineers                     | P1       | ReportingService              | Incident detail                   |
| BCR-09 | Supervisor's own team, with stats in one call      | P1       | UserService, ReportingService | Team, assign dialog               |
| BCR-10 | Paged user list for admins, with roles and status  | P1       | UserService                   | Users and roles                   |
| BCR-11 | Send `version` with incident edits                 | P2       | IncidentService               | Incident edit, status             |
| BCR-12 | Notification read and unread state                 | P2       | NotificationService           | Alerts, bell badge                |
| BCR-13 | SLA policy endpoint                                | P2       | ReportingService              | Report form preview               |
| BCR-14 | Make login `username` optional                     | P2       | AuthService                   | Sign in                           |

---

## P0

### BCR-01: Real client IP behind nginx

**Problem.** `RateLimitFilter` deliberately uses the real connection address for login, signup and refresh, and ignores `X-Forwarded-For`. With nginx in front, every visitor's connection comes from nginx, so **all users on Earth share one bucket**:

- 10 logins a minute for the whole site. One person or bot can stop everyone signing in.
- 5 signups an hour for the whole site.
- 30 refreshes a minute for the whole site.

**Proposal.** A setting listing trusted proxy addresses. Only when the connection comes from a trusted proxy, read the client IP from `X-Real-IP`, which nginx overwrites on every request. Otherwise keep today's behaviour. This matches the rule already in `IMP/CLAUDE.md` section 10.

**Test first.** A fake forwarded header from an untrusted address is ignored. Two clients behind the trusted proxy get separate buckets.

### BCR-02: Refresh token in an HttpOnly cookie

**Problem.** Login and refresh return the 7-day refresh token in JSON, so frontend JavaScript must hold it. Any script injection could steal 7 days of access. `sessionStorage` has a second trap: duplicating a browser tab copies it, both tabs then use the same one-time token, and the reuse check cancels the login.

**Proposal.**

- `Set-Cookie` with `HttpOnly`, `Secure`, `SameSite=Strict`, on a path limited to refresh and logout.
- `POST /auth/refresh` reads the cookie. Logout clears it.
- The refresh token is removed from the JSON body once the frontend no longer needs it.
- The `Secure` flag and the cookie path come from settings, so local development still works.

**Also check.** `/logout/user` needs an access token. If that token has expired, the frontend refreshes first and then logs out.

**Test first.** The cookie has all its flags, and the JSON no longer contains the token. The reuse check still cancels the whole family.

### BCR-03: Server-side status rules

**Problem.** `updateIncidentStatusBasedOnRole` checks who may change the status, but not which change is valid. Any allowed caller can send CLOSED to OPEN, or set ASSIGNED with nobody assigned. Hiding buttons in the UI is not protection.

**Proposed rules, for you to confirm:**

| From        | Allowed next                                                      |
| ----------- | ----------------------------------------------------------------- |
| OPEN        | IN_PROGRESS, RESOLVED (ASSIGNED only through the assign endpoint) |
| ASSIGNED    | IN_PROGRESS, RESOLVED                                             |
| IN_PROGRESS | RESOLVED                                                          |
| RESOLVED    | CLOSED, REOPENED                                                  |
| CLOSED      | REOPENED                                                          |
| REOPENED    | IN_PROGRESS (ASSIGNED only through the assign endpoint)           |

An invalid change returns `409 INVALID_STATUS_TRANSITION`.

**Your decision.** Should an engineer be able to close or reopen, or only a supervisor and admin?

### BCR-04: Production settings

**Problem.** The gateway sets `logging.level.org.springframework.cloud.gateway=DEBUG`, and no Spring profiles exist. DEBUG logs can be large and may include request details. `/actuator` on the gateway has no login check.

**Proposal.** A `prod` profile with INFO logs. nginx also refuses `/api/actuator`; that part is frontend work and needs no backend change.

---

## P1

### BCR-05: Names for user ids

**Problem.** Incidents, notifications, audit rows and AI results contain only user UUIDs. An engineer has no endpoint that can turn an id into a name. The existing batch endpoint is internal only.

**Proposal.** `POST /users/lookup` with `{ids: [...]}`, at most 100 ids. Returns `{userid, username}` only, with no email. An unknown id is left out of the answer. The frontend caches results, so one screen makes one call.

**Your decision.** Is every logged-in user allowed to see any username? I think that is fine inside one company, but it is your rule to set.

### BCR-06: Search and filters on `GET /incidents`

**Problem.** The list has only `filter=createdByMe|assignedToMe|assignedByMe`. `/reports/incidents` has status and severity, but it is closed to engineers and has fewer fields. A filter done in the browser would only filter the current page and would give wrong results.

**Proposal.** Optional `status`, `severity`, `priority`, and `q` (title contains). Reuse the same access rule in `findIncidentsForUser`.

### BCR-07: SLA deadlines for people who can read the incident

**Problem.** `IncidentReport` holds `assignmentDeadline`, `resolutionDeadline` and both breach flags, but `IncidentReportResponseDTO` does not return them, and engineers get 403 on `/reports/**`. Working out deadlines in the browser would duplicate the SLA rules and would drift.

**Proposal.** Add the four fields to the report DTO. Add `POST /reports/sla/lookup` with up to 100 incident ids. It returns only rows the caller may read, so lists make one call rather than one per row.

### BCR-08: Activity history for engineers

**Problem.** `/reports/incidents/{id}/audit` is ADMIN and SUPERVISOR only, so the activity timeline would be empty for an engineer.

**Proposal.** Also allow the incident's creator and assignee, using the `createdBy` and `assignedTo` values already in `IncidentReport`.

### BCR-09: Supervisor's own team, with stats in one call

**Problem.**

- `GET /users/supervisor/{id}/engineers` is ADMIN only.
- `GET /users/engineers` gives a supervisor **every** engineer in the company, not only their team.
- `/users/search` does give the team, but without status.
- Workload is one call per engineer, which is slow and uses up the rate limit.
- Assign dialog: `EngineerCandidateDTO` has only `engineerId`, so names come from BCR-05.

**Proposal.** `GET /users/me/team`, plus a public, role-checked version of the existing internal `POST /internal/reports/engineer-summaries`.

**Your decision.** Should `GET /users/engineers` stay open to all supervisors? An admin assigning any engineer needs it, but a supervisor may not.

### BCR-10: Paged user list for admins

**Problem.** `/users/search` returns no roles and no status. `/users/engineers` and `/users/supervisors` have no paging, and admins appear in neither list.

**Proposal.** `GET /users?query=&role=&status=&page=&size=`, ADMIN only, returning `UserResponseDTO`.

---

## P2

### BCR-11: Send `version` with incident edits

`Incident` has `@Version`, but the DTO does not return it. Two people editing for minutes: the second silently overwrites the first, because the service re-reads the row at the start of each request (noted under issue 64). Proposal: return `version`, and accept it on update and status change. Then a stale screen gets `409 CONCURRENT_UPDATE`.

### BCR-12: Notification read state

The Alerts design has an Unread tab and a badge. There is no read state on the server. Fallback without this change: remember "last seen at" per browser and show **"New since your last visit"**. That text is honest, but the state does not follow the user across devices.

### BCR-13: SLA policy endpoint

The report form previews the SLA for the chosen priority. Fallback: hide the preview. Proposal: `GET /reports/sla-policy` returns the `SLAConfiguration` table, so the rules are never copied into the frontend.

### BCR-14: Make login `username` optional

`LoginFromDTO.username` is required and never read (issue 47). The frontend sends the email there for now.
