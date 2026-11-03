# Run the frontend and backend together

Written 2026-11-02. The steps to use the real app on your laptop, with real accounts.

## Can I do it now?

**Yes.** Every page works against the real backend. A few parts stay hidden until their backend change exists (see
"What you will see"). Nothing shows false data.

```
 browser ──► http://localhost:5173  (Vite, the frontend)
                  │  /api/...
                  ▼
             gateway 127.0.0.1:8082 ──► AuthService, UserService, IncidentService, ...
```

## Step 1: the backend code

Run the services from the `IMP` branch **`gateway-prod-settings`**. It holds all the new backend work (BCR-01 to 05)
on top of each other. You do not need to merge first.

## Step 2: start the backend (as you already do)

In this order, with your usual environment variables:

1. Kafka: `docker compose -f kafka-docker/docker-compose.yml up -d`
2. MySQL and PostgreSQL
3. Eureka (8081)
4. AuthService (8083)
5. UserService, IncidentService, NotificationService, ReportingService, Ai-Service
6. APIGateway (8082) last

**Do not** set `SPRING_PROFILES_ACTIVE=prod` on the laptop. That is only for a server.
**Kafka must run:** a new sign-up reaches UserService through Kafka. Without it the person exists for login but not in
the user lists or names.

### Only while you create test accounts: raise the sign-up limit

The gateway allows **5 sign-ups an hour** from one address, and on your laptop everything comes from the same address.
To create more test accounts, add this to the **APIGateway** run configuration in IntelliJ, in the field
**Program arguments**, then restart the gateway:

```
--gateway.ratelimit.signup.per-hour=50
```

**Remove it again** when your accounts exist. The same works for logins: `--gateway.ratelimit.login.per-minute=50`.

## Step 3: switch the frontend to the real backend

In the `IMP Frontend` folder, create a file named **`.env.local`** (Git ignores it) with:

```
VITE_API_MOCKING=false
VITE_SERVER_UTC_OFFSET=+05:30
```

`+05:30` because your laptop's clock is on India time. Then start the frontend and open **http://localhost:5173**:

```bash
npm run dev
```

## Step 4: create the people

```
 1. sign up yourself in the app            → you are an ENGINEER (every sign-up starts as engineer)
 2. make yourself ADMIN (only the first time, see below)
 3. sign out and sign in again             → your new role is in your new token
 4. sign up the other people               → each one an engineer
 5. as admin, open "Users and roles"       → make some of them SUPERVISOR
                                           → put engineers under a supervisor
```

**Making the first admin.** Stop AuthService, add `adminemail=<your sign-up email>` to its run configuration, start it
again. It makes that account admin, but only while there is no admin yet. Then **remove** the variable. If you already
have an admin from earlier, just sign in with that account.

**To sign up a second person**, sign out first, or use a private browser window.

## What you will see

| Works now                                               | Stays hidden for now (and why)                      |
| ------------------------------------------------------- | --------------------------------------------------- |
| Sign up, sign in, stay signed in after reload, sign out | Incident search and filters (BCR-06)                |
| Dashboard, Reports                                      | SLA badges and timers (BCR-07)                      |
| Incidents list, detail, report, edit                    | Activity history for engineers (BCR-08)             |
| Status changes with the new rules (wrong steps refused) | SLA and expertise numbers on the Team page (BCR-09) |
| Assign, with the AI ranking                             | SLA preview on the report form (BCR-13)             |
| Alerts                                                  | Admins in the Users and roles list (BCR-10)         |
| Team, Users and roles                                   |                                                     |
| **Real names instead of ids** (new, BCR-05)             |                                                     |

## If something goes wrong

| You see                                      | Check                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| "Can't reach the server"                     | Is the gateway running on 8082?                                                       |
| Sign in works, but a reload signs you out    | DevTools > Application > Cookies: is `imp_refresh` there? Use Chrome, Edge or Firefox |
| "Too many attempts"                          | The rate limit: wait a minute, or the temporary setting in Step 2                     |
| A new person is missing from lists and names | Is Kafka running? Is UserService running?                                             |
| Times are off by hours                       | `VITE_SERVER_UTC_OFFSET` in `.env.local`                                              |
| Names show as short ids                      | UserService not running, or the backend is not on branch `gateway-prod-settings`      |

Write down anything that looks wrong (the page, what you did, the trace id shown in the error). That list is the
input for the next step: fixing bugs.

## Back to sample data

Delete `.env.local` (or set `VITE_API_MOCKING=true`) and restart `npm run dev`.
