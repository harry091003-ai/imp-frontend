# Secrets, GitHub and deployment

What may go to GitHub, what must never go, and where each secret lives. Checked 2026-11-04, before the first upload.

Think of GitHub as a photocopy of your project that lives on someone else's computer. Even a private copy can leak later
(a wrong click on "public", a stolen GitHub login, a collaborator). So the rule is simple: **the code goes to GitHub, the
keys never do.** The keys stay on your laptop now and on the server later.

## Result of the check (2026-11-04)

Both projects are safe to upload. Nothing secret is in the files or in any old commit.

| Check                                                                                                                   | IMP (backend)                                   | IMP Frontend                         |
| ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------ |
| Your real values (`internalsecret`, `apikey`, `jwtprivatekey`, `jwtpublickey`, `secretkey`) in a file or any old commit | None                                            | None                                 |
| Settings files: secrets read from environment variables, no backup value after `:`                                      | Yes, all 8 services                             | No secrets used                      |
| Private keys, Google API keys, GitHub tokens, real JWTs, password hashes, every past commit                             | None (only code and notes that talk about keys) | None                                 |
| Secret-type files ever committed (`.env`, `.pem`, `.key`, logs, `.idea`)                                                | None                                            | Only `.env.example`                  |
| Screenshots (15 in the backend)                                                                                         | Study notes only, no real value                 | No screenshots                       |
| Test passwords and secrets in test files                                                                                | Made-up values, safe                            | Made-up values, safe                 |
| Emails in files                                                                                                         | Only `@example.com` test addresses              | Only `@example.com` / `@imp.example` |

Two small notes, not problems:

- Your own Gmail address was in `PROGRESS.md` in two early commits (`4031925`, removed in `6c51eb3`). An email address is
  not a password. In a private repo only you see it.
- Commits carry an email too: the frontend's say `Harmandip Singh`, the backend's say `learning@local`. Same: fine
  for a private repo. If the repo ever becomes public, switch to GitHub's private "noreply" address first
  (GitHub, Settings, Emails).

## What goes up and what stays on the laptop

| Goes to GitHub                                                                            | Stays on the laptop (Git ignores it)                                            |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| All source code, tests, Flyway migrations, `pom.xml`, `package.json`, `package-lock.json` | `IMP/.idea/` (IntelliJ run settings, **holds your real secrets in plain text**) |
| `application.properties` files (they only say `${internalsecret}`, not the value)         | The JWT key pair in `~/jwt-keys` (outside the project anyway)                   |
| `docker-compose.yml` files (they read the password from the environment)                  | `IMP Frontend/.env.local` (your own settings)                                   |
| `.env.example` (a template with no secrets)                                               | `target/`, `out/`, `dist/`, `node_modules/` (build output, rebuilt anytime)     |
| Docs: `CLAUDE.md`, `PROGRESS.md`, `docs/`                                                 | `hs_err_pid*.log`, `allfiles.tmp` (crash logs and scratch)                      |
|                                                                                           | `IMP/notes/` (your study notes, ignored on purpose)                             |

## Where each secret lives

| Secret                                       | Laptop today                  | Server later                                            | Never                                                |
| -------------------------------------------- | ----------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| `jwtprivatekey` (signs logins)               | `~/jwt-keys`, set in IntelliJ | A file only the app's user can read, or a server secret | GitHub, a Docker image, chat, email                  |
| `jwtpublickey`                               | Same                          | Same (not secret, but kept with its partner)            |                                                      |
| `internalsecret` (services trust each other) | IntelliJ run settings         | Server environment variable                             | GitHub, a Docker image, a log                        |
| `user`, `password` (MySQL, PostgreSQL)       | IntelliJ run settings         | Server environment variable                             | GitHub, a Docker image                               |
| `apikey` (Gemini, costs money)               | IntelliJ run settings         | Server environment variable                             | GitHub, the frontend, a Docker image                 |
| `adminemail`                                 | Set once, then removed        | Set once for the first admin, then removed              |                                                      |
| Anything starting with `VITE_`               | `.env.local`                  | Build settings                                          | **A secret.** Everyone can read these in the browser |

## Before going live: new values for everything

The laptop values were made for testing and were typed into IntelliJ in plain text. The server gets **new** ones:

| Secret            | Why new                                                                                                      | How                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| JWT key pair      | The laptop pair is a test pair                                                                               | Same steps as `IMP/PROGRESS.md`, "Auth v2 - Step 5", on the server |
| `internalsecret`  | Old gateway logs may hold it (see `REMAINING-WORK.md`)                                                       | A long random value, at least 32 characters                        |
| Database password | The laptop one is only 4 characters                                                                          | A long random value, and a database user that is not `root`        |
| Gemini key        | Optional. It never leaked, but a separate key for the server lets you cut one off without breaking the other | Google AI Studio, with a spending limit                            |

## Rules from now on

1. **Before every `git add .`, run `git status`** and read the list. A file you did not expect (a `.env`, a `.pem`, a log,
   a `.zip`) means stop and ask.
2. **Docker images get no secrets.** A secret goes in when the container starts (an environment variable or a mounted
   file), never through `COPY` or `ENV` in a Dockerfile. Each project gets a `.dockerignore` (Phase 5 does this).
3. **GitHub Actions (CI) get secrets only through GitHub's Secrets page,** never in the workflow file. CI needs none today:
   the tests use made-up values.
4. **If a secret is ever pushed by mistake: change the secret first.** Deleting the file or rewriting history comes second,
   because a copy may already exist somewhere. Then tell me and we clean up the history.
5. **Never put a secret in a `VITE_` variable.** Everything in the frontend ends up in the user's browser.

## Tidy-ups (optional)

- IntelliJ still holds the old `secretkey` setting. No service uses it since 2026-10-24. Delete it from the run settings.
