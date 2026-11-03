# API map: every page and the backend call behind it

Pages always call the real backend paths and read the real data shapes. In sample data mode, a mock layer answers those same paths from `src/mocks`. So moving to real data does not change any page.

**Full steps to run everything together:** `docs/run-everything-together.md`.

**The switch:** add this line to a file named `.env.local`, then restart `npm run dev`:

```
VITE_API_MOCKING=false
```

Production builds always use the real backend, and contain no sample data.

| Where                                | What it holds                                                       |
| ------------------------------------ | ------------------------------------------------------------------- |
| `src/shared/lib/api/endpoints.ts`    | Every backend URL                                                   |
| `src/features/*/types`               | The data shapes, copied from the Java DTOs, checked on every answer |
| `src/features/*/api`                 | One function per backend call                                       |
| `src/shared/lib/api/capabilities.ts` | What the real backend cannot do yet                                 |
| `src/mocks`                          | The sample data. Never in a production build                        |

## Status

- **Real:** the endpoint exists in your backend today.
- **Proposed:** it does not exist yet. With the real backend, the page hides that part rather than showing something false. When the backend change lands, set its line in `capabilities.ts` to `true`.

| Page                          | Who               | Backend call                                                                                    | Status                               |
| ----------------------------- | ----------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------ |
| Sign in                       | Everyone          | `POST /auth/login`                                                                              | Real                                 |
| Sign up                       | Everyone          | `POST /auth/signup`                                                                             | Real                                 |
| Stay signed in, reload        | Everyone          | `POST /auth/refresh` with cookie                                                                | Real (BCR-02, branch not merged yet) |
| Sign out                      | Everyone          | `POST /logout/user`                                                                             | Real                                 |
| Account                       | Everyone          | `POST /password/update`, `PUT /credentials/profile`                                             | Real                                 |
| Dashboard                     | Supervisor, admin | `GET /reports/metrics`, `/reports/trends`, `/reports/top-services/failing`                      | Real                                 |
| Dashboard                     | Supervisor, admin | `GET /incidents`, `GET /notifications/me`                                                       | Real                                 |
| My work                       | Engineer          | `GET /incidents?filter=assignedToMe` and `createdByMe`                                          | Real                                 |
| Incidents                     | Everyone          | `GET /incidents?page&size&filter`                                                               | Real                                 |
| Incidents: search and filters | Everyone          | `GET /incidents` with `status`, `severity`, `q`                                                 | Proposed, BCR-06                     |
| Incident detail               | Allowed readers   | `GET /incidents/{id}`                                                                           | Real                                 |
| Edit                          | Allowed editors   | `PUT /incidents/{id}`                                                                           | Real                                 |
| Change status, resolve        | Allowed editors   | `PUT /incidents/{id}/status`, wrong steps get 409 (BCR-03)                                      | Real                                 |
| Activity                      | Supervisor, admin | `GET /reports/incidents/{id}/audit`                                                             | Real                                 |
| Activity for engineers        | Engineer          | The same call                                                                                   | Proposed, BCR-08                     |
| Report an incident            | Everyone          | `POST /incidents`                                                                               | Real                                 |
| AI suggestion                 | Everyone          | `POST /ai/rag/suggestion`                                                                       | Real                                 |
| Assign                        | Supervisor, admin | `PUT /incidents/{id}/assign`, `GET /users/engineers`                                            | Real                                 |
| Assign: AI ranking            | Supervisor, admin | `POST /ai/EngineersSuggestion-ForIncidentAssignment`                                            | Real                                 |
| Alerts, bell                  | Everyone          | `GET /notifications/me`                                                                         | Real                                 |
| Team                          | Supervisor, admin | `GET /users/engineers`, `GET /reports/engineer-workload/{id}`, `PUT /users/{id}/statusEngineer` | Real                                 |
| Team: SLA and expertise       | Supervisor, admin | `POST /reports/engineer-summaries`                                                              | Proposed, BCR-09                     |
| Reports                       | Supervisor, admin | `GET /reports/incidents?status&severity`, plus the Dashboard calls                              | Real                                 |
| Users and roles               | Admin             | `GET /users/engineers`, `/users/supervisors`, `PUT /roles/{username}/update`                    | Real                                 |
| Users and roles               | Admin             | `PUT /users/{id}/statusEngineer`, `statusSupervisor`, `PUT` and `DELETE` supervisor             | Real                                 |
| Names on all pages            | Everyone          | `POST /users/lookup` (at most 100 ids a call)                                                   | Real (BCR-05, branch not merged yet) |
| SLA badges and timers         | Everyone          | `POST /reports/sla/lookup`                                                                      | Proposed, BCR-07. Until then, hidden |
| SLA preview on report form    | Everyone          | `GET /reports/sla-policy`                                                                       | Proposed, BCR-13. Until then, hidden |

## To confirm against the real backend

Tested only against a stand-in that copies your DTOs, so these need one real run:

- ~~The login token's JSON key.~~ Settled 2026-11-02 by a backend test: it is `jwttoken`. The app still accepts `JWTtoken` too, which is harmless.
- The JSON form of `incidentsDate` in `/reports/trends`. The app accepts a date string or a timestamp.
- That your server's clock matches `VITE_SERVER_UTC_OFFSET`.

## How this was checked

- `src/test/api-contract.test.ts` runs every API function against the sample data, through the real schemas.
- With the mock off and a stand-in on the gateway's port, the pages sent the real paths through the `/api` proxy with a token and trace id, and hid the proposed features.
