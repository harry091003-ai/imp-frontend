# BCR-02: keep the "stay signed in" key in a locked cookie

Status: **approved 2026-11-02 and built** on the `IMP` branch `auth-refresh-cookie`. **Not committed or merged**, which is your decision. AuthService 94 and gateway 77 tests pass. Not tried by hand on the real system yet: the steps are in `IMP/PROGRESS.md`, section "BCR-02".

Results of the build:

- **Test first:** the new tests ran against untouched `master` code and 11 of 13 failed. The two that passed check things that were already true.
- **Break checks:** each protection was removed once, and its test failed each time. Removing `@JsonIgnore` put the token back in the JSON. Removing the 200-character limit let an oversized cookie reach the hashing. Clearing the cookie on a lock removed the cookie a locked user still needs. A gateway filter that drops `Cookie` broke the gateway test.
- **Answered:** the access token's JSON key is **`jwttoken`**.
- **Found and fixed:** at DEBUG level the gateway logged every request header, including this cookie, the access token and the internal secret. This was older than this change. One log-level line and a new test (`GatewayLogSecretsTest`, failed before and passes after) fix it. See BCR-04 in `backend-change-requests.md`.
- **Notes with flow charts:** `IMP/notes/refresh-token-in-a-cookie.md`.

The plan below is unchanged from what you approved.

Read **parts 1 to 5** to decide. Part 6 onward is the technical detail for the build.

---

## 1. In one minute

When someone signs in, your backend gives the browser **two keys**:

| Key               | Think of it as                             | Lives for  | Used for                                                                       |
| ----------------- | ------------------------------------------ | ---------- | ------------------------------------------------------------------------------ |
| **Access token**  | A 15-minute entry pass                     | 15 minutes | Sent with every request, to prove who you are                                  |
| **Refresh token** | A one-time voucher to get a new entry pass | 7 days     | Sent only when the entry pass runs out, so you do not type your password again |

The question is: **where does the browser keep the voucher (the refresh token)?**

- **Today:** the backend puts it in the answer to login, as plain text. So the page's own JavaScript has to hold it somewhere.
- **This change:** the backend hands it to the browser as a **locked cookie**. The browser stores it and sends it back by itself. The page's JavaScript can never read it.

That is all this change does. It does not change how long anyone stays signed in, and your rules (one-time use, reuse detection, lockout) stay exactly as they are.

---

## 2. Words used here

| Word                | Plain meaning                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Cookie**          | A small piece of data the browser stores for a website and sends back automatically                                               |
| **HttpOnly cookie** | A cookie that JavaScript on the page **cannot read**. Only the browser can send it                                                |
| **Secure**          | The cookie is only sent over HTTPS (the padlock)                                                                                  |
| **SameSite=Strict** | The cookie is never sent when the request starts from a different website                                                         |
| **XSS**             | An attacker gets their own script to run inside your page, for example through text someone typed in an incident                  |
| **Rotation**        | Every time you use a refresh token, it is used up and you get a new one                                                           |
| **Reuse detection** | If a used-up token shows up again, the backend assumes it was copied and cancels that whole login. Your backend already does this |

---

## 3. How it works today

```text
Browser (our frontend)                          Backend (gateway + AuthService)
        |                                                |
        |  POST /auth/login  (email, password)           |
        |----------------------------------------------->|
        |                                                |
        |  200 OK, JSON:                                 |
        |    { accessToken,  refreshToken }              |
        |<-----------------------------------------------|
        |                                                |
        |  The refresh token is now plain text inside    |
        |  our page. Where do we keep it?  <-- THE PROBLEM
        v
```

Your `PROGRESS.md` says this was a deliberate first step: "JSON body now, HttpOnly cookie for a browser front end later". There was no browser frontend yet. Now there is, so this is "later".

### Why "keep it somewhere in the page" does not work well

A browser page has only four places to keep the voucher:

| Where               | Survives a reload? | Safe from a bad script? | Problem                                                                                 |
| ------------------- | ------------------ | ----------------------- | --------------------------------------------------------------------------------------- |
| **In memory only**  | **No**             | Yes                     | Every reload signs the user out. Not usable                                             |
| **localStorage**    | Yes                | **No**                  | Any script on the page can read it and copy a 7-day key. Stays after the browser closes |
| **sessionStorage**  | Yes                | **No**                  | Same theft risk. Also breaks when a tab is duplicated (see below)                       |
| **HttpOnly cookie** | Yes                | **Yes**                 | Needs a small backend change. **This plan**                                             |

The first three each fail on something important. Only the cookie passes all of them.

### The duplicate-tab problem, in detail

Your backend allows each refresh token **once**. If a used one comes back, it assumes a thief and cancels the whole login. That is a good safety rule, but it clashes with `sessionStorage`:

```text
 Tab A holds refresh token R1                (stored in sessionStorage)
        |
        |  User right-clicks the tab and chooses "Duplicate"
        v
 Tab B starts with a COPY of R1

 15 minutes later, both tabs need a new entry pass:

 Tab A: refresh(R1)  ->  OK. Gets R2.  R1 is now USED UP.
 Tab B: refresh(R1)  ->  Backend: "R1 was already used.
                          Someone copied it!"
                          -> cancels the WHOLE login, R2 too

 Result: the user is signed out in BOTH tabs, with no idea why.
```

A cookie has no such problem, because every tab shares **one** cookie. There is only ever one current voucher.

---

## 4. How it works after the change

### 4a. Signing in

```text
Browser                                         Backend
   |  POST /auth/login (email, password)           |
   |---------------------------------------------->|
   |                                               |
   |  200 OK, JSON:  { accessToken }               |   <- no refreshToken here
   |  Set-Cookie: imp_refresh=R1;                  |   <- it is here instead
   |     HttpOnly; Secure; SameSite=Strict         |
   |<----------------------------------------------|
   |
   |  Browser stores the cookie by itself.
   |  Our page keeps accessToken in memory (a variable).
   |  Page JavaScript can NOT see R1.
```

### 4b. Normal use, and the 15-minute renewal

```text
Normal request                    Browser ---> Backend
                                  Authorization: Bearer <accessToken>
                                  (the cookie is NOT sent here)

After 15 minutes the entry pass runs out:

Browser                                         Backend
   |  GET /incidents   (old accessToken)           |
   |---------------------------------------------->|
   |  401 INVALID_TOKEN                            |
   |<----------------------------------------------|
   |                                               |
   |  POST /auth/refresh   (empty body)            |
   |  Browser adds the cookie imp_refresh=R1       |
   |---------------------------------------------->|
   |                          checks R1: real, unused, not expired
   |                          marks R1 as USED
   |  200 OK, JSON: { accessToken }   (new)        |
   |  Set-Cookie: imp_refresh=R2                   |
   |<----------------------------------------------|
   |                                               |
   |  Frontend repeats GET /incidents with the new pass.
   |  The user notices nothing.
```

### 4c. Reloading the page

```text
Reload  ->  the in-memory accessToken is gone
        ->  frontend sees its "I was signed in" flag
            (a harmless note in localStorage: it holds NO secret)
        ->  POST /auth/refresh   (cookie goes along automatically)
        ->  200 OK, new accessToken
        ->  the user is still signed in, on the same page

No flag  ->  the frontend does not even call refresh.
             The visitor just sees the sign-in page.
```

### 4d. Signing out

```text
Browser                                         Backend
   |  POST /logout/user   (with accessToken)       |
   |---------------------------------------------->|
   |                          cancels ALL refresh tokens of this user
   |  200 OK                                       |
   |  Set-Cookie: imp_refresh=; Max-Age=0          |   <- deletes the cookie
   |<----------------------------------------------|
   |
   |  Frontend also clears its cache and tells the other tabs
   |  to sign out.
```

### 4e. The safety net, which does not change

```text
A thief somehow copies R1 and uses it first:

 Thief:      refresh(R1)  ->  OK. Thief gets R2.  R1 is USED UP.
 Real user:  refresh(R1)  ->  Backend: "R1 already used! Copied!"
                              -> cancels the whole login
                              -> the thief's R2 is dead too
                              -> user signs in again

The cookie makes this much harder to start with,
because the thief can no longer simply read R1 from the page.
```

---

## 5. What the cookie does NOT protect against

Please read this part. A cookie is a clear improvement, but not magic.

| Limit                                                                 | Honest explanation                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A bad script on the page can still act while the page is open**     | If an attacker's script runs inside our page, it can still call refresh itself, because the browser attaches the cookie. What the cookie stops is the attacker **copying the 7-day key and using it from their own computer later**. The damage is limited to the time the victim has our page open |
| **So the cookie does not replace the other defences**                 | We still need: showing incident text and AI text as plain text only (already built), and a strict security policy for the page (planned in Phase 5)                                                                                                                                                 |
| **A computer with malware, or someone sitting at an unlocked laptop** | No cookie setting helps                                                                                                                                                                                                                                                                             |
| **Needs HTTPS in production**                                         | `Secure` means the cookie is sent only over HTTPS. On your laptop (`localhost`) Chrome and Firefox allow it. I am not sure about Safari, so there is a setting to turn `Secure` off for local use only                                                                                              |
| **Sibling websites**                                                  | If an untrusted site shares our main domain (for example `evil.company.com`), `SameSite` treats it as the same site. Host the app where you control every subdomain. Check this at deployment                                                                                                       |

**In short:** it cannot be called "fully safe". It removes the biggest weakness (a copyable 7-day key sitting in the page) and fixes the duplicate-tab logout.

---

## 6. What changes in the backend

|                             | Now                     | After                                    |
| --------------------------- | ----------------------- | ---------------------------------------- |
| Login answer                | JSON has `refreshToken` | JSON does not. `Set-Cookie` carries it   |
| Refresh request             | Body `{refreshToken}`   | Empty body. The browser sends the cookie |
| Refresh answer              | JSON has the new token  | JSON does not. `Set-Cookie` carries it   |
| Logout                      | Cancels tokens          | Cancels tokens and deletes the cookie    |
| A token in the request body | Accepted                | **Ignored**, so the old way is closed    |

The cookie:

```text
Set-Cookie: imp_refresh=<token>; Path=/api/auth/refresh; Max-Age=604800; HttpOnly; Secure; SameSite=Strict
```

| Part                     | Why                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `HttpOnly`               | JavaScript cannot read it. This is the point of the change                                                                     |
| `Secure`                 | HTTPS only                                                                                                                     |
| `SameSite=Strict`        | Another website cannot make the browser send it                                                                                |
| `Path=/api/auth/refresh` | The browser sends it **only** to refresh, not with every request. It includes `/api` because that is the path the browser sees |
| `Max-Age=604800`         | 7 days, taken from your existing `auth.refresh-token.lifetime-days`, so the two cannot disagree                                |

### Files

Only AuthService code changes, plus one new gateway test.

| File                                                       | Change                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| `controller/RefreshCookie.java`                            | **New.** The one place that builds and clears the cookie           |
| `controller/RefreshController.java`                        | Reads the cookie. Sets the new one. Clears it when refused         |
| `controller/LoginController.java`                          | Sets the cookie after a successful login                           |
| `controller/LogoutController.java`                         | Clears the cookie                                                  |
| `dto/LoginResponseDTO.java`, `dto/RefreshResponseDTO.java` | `@JsonIgnore` on `refreshToken`                                    |
| `dto/RefreshRequestDTO.java`                               | **Deleted**                                                        |
| `application.properties`                                   | Two new settings, below                                            |
| `config/SecurityConfig.java`                               | A comment on why CSRF can stay off                                 |
| `AuthEndpointSecurityTest.java`                            | Refresh with no cookie now answers 401, not 400                    |
| `LogoutControllerTest.java`                                | Passes the new cookie class                                        |
| `APIGateway` test                                          | **New.** Proves `Cookie` and `Set-Cookie` pass through the gateway |
| `CLAUDE.md`, `PROGRESS.md`                                 | Record the change and the new hand-test steps                      |

**Not changing:** `RefreshTokenService`, the database (no migration), the gateway code, and your existing 13 `RefreshTokenTest` tests. `@JsonIgnore` only affects JSON, so those tests still read the token in Java.

Settings, with safe defaults:

```properties
auth.refresh-cookie.secure=${refreshcookiesecure:true}
auth.refresh-cookie.path=${refreshcookiepath:/api/auth/refresh}
```

### Checked in the code

| Question                                                   | Answer                                                                                                                                                    |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Will the gateway refuse an empty `POST`?                   | No. `RequestSizeFilter` only refuses a body with no length, or one that is too large                                                                      |
| Does refresh need an access token?                         | No. `JwtGatewayFilter` skips `/auth`                                                                                                                      |
| Can logout delete a cookie whose path is the refresh path? | Yes. A response may set a path on its own host, and logout finds tokens by user id, so it never needs to read the cookie                                  |
| Is CSRF still safe with it switched off?                   | Yes for this cookie: `SameSite=Strict`, and with no CORS another site cannot read the answer. The cookie can only renew a session, not make other changes |
| Does the frontend need changing?                           | Barely. It already sends an empty body and expects a cookie                                                                                               |

---

## 7. How I would build it, safely

Tests first. Each new test should fail on today's code, then pass. Following your project's custom, each protection also gets a "break check": remove it and see a test fail.

1. Login sets the cookie with every flag above.
2. Login JSON has no `refreshToken`.
3. **Pins the access token's real JSON key.** This also answers the `jwttoken` or `JWTtoken` question without a running backend.
4. A failed login sets no cookie.
5. Refresh with the cookie gives 200, a different cookie, and no token in the JSON.
6. Refresh with no cookie gives 401 `INVALID_REFRESH_TOKEN`, not 400 or 500.
7. A token in the body with no cookie gives 401, so the old way is closed.
8. A cookie over 200 characters gives 401 and is not hashed. This keeps today's limit.
9. Reuse gives 401 `REFRESH_TOKEN_REUSED`, the family stays cancelled, and the cookie is cleared.
10. A locked account gives 401 and **keeps** the cookie, because that token works again when the lock ends.
11. Logout clears the cookie, using the same path.
12. `secure=false` and a different path are respected.
13. Through a real gateway: `Cookie` is forwarded and `Set-Cookie` comes back.

Order of work:

1. Create the branch `auth-refresh-cookie` in `IMP`. `master` is not touched.
2. Run the current AuthService and gateway tests first, to know they pass before any change.
3. Write the tests above and watch them fail.
4. Make the change.
5. Run all AuthService and gateway tests, and the break checks.
6. Show you the result and the full diff. **You** decide on the commit and the merge.
7. **Your hand test.** The old steps in `PROGRESS.md` were never run, and they need rewriting for the cookie.

**Rollback:** all of this sits on one branch with no database change. Not merging it, or reverting the merge, restores today's behaviour exactly.

---

## 8. Known risks

| Risk                                                                                                                           | What happens                                                                                            | Plan                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **The answer is lost after the server already used up the token** (network drops, or the user presses F5 at that exact moment) | The browser keeps the used cookie, so the next refresh looks like reuse and the user must sign in again | Accepted for now: it is safe, rare and costs one sign-in. A grace period would weaken reuse detection, so add one only if it happens in real use |
| Refresh limit behind nginx (BCR-01)                                                                                            | Every visitor shares 30 refreshes a minute                                                              | BCR-01 stays required before production. Not needed on your laptop                                                                               |
| A page load with no session would call refresh                                                                                 | It would use up that limit for nothing                                                                  | Already built: the "I was signed in" flag means signed-out visitors never call refresh                                                           |
| A second account signs in on the same browser                                                                                  | The new cookie replaces the old one, so another open tab could refresh as the new user                  | Already built: the frontend compares the user id in each refresh answer and reloads if it changed                                                |
| Sibling subdomains count as "same site"                                                                                        | `SameSite` would not protect against an untrusted subdomain                                             | Host the app where you control the subdomains. Check at deployment                                                                               |
| Gateway DEBUG logs                                                                                                             | Could record headers                                                                                    | I saw no sign of this, but have not run it. BCR-04 turns DEBUG off for production, and the hand test will check the log                          |
| Anyone else using the JSON token                                                                                               | They would break                                                                                        | The only client today is this frontend, plus your hand test                                                                                      |

---

## 9. What you will see

- **Sign-in looks exactly the same.** Nothing new appears on screen.
- A user stays signed in across reloads and new tabs, for up to 7 days, unless they sign out or change their password or role.
- After the change you can open the browser's storage view and you will **not** find the 7-day token in the page's storage. It sits in a cookie marked HttpOnly.

---

## 10. If you decide "not yet" or "no"

The frontend is already written for the cookie, and its sample-data mode fakes it. If the backend stays as it is:

- A real sign-in works, but the app cannot renew the entry pass, so **every user is signed out after 15 minutes**, and a page reload signs them out at once.
- To avoid that I would have to change the frontend to hold the refresh token in `sessionStorage`. That brings back the theft risk and the duplicate-tab sign-outs from part 3. **I recommend against it**, but I can do it as a short-term step if you want to test the pages against your real backend first.

---

## 11. Decisions for you

| #   | Decision                                                               | My recommendation                                                    |
| --- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | Approve this change                                                    | **Yes**                                                              |
| 2   | Remove the token from the JSON straight away, or keep both for a while | Remove it now. Nothing is live, and keeping both would keep the risk |
| 3   | Keep the 7-day lifetime                                                | Keep it. It is already your decision in `PROGRESS.md`                |

You can also reply with questions about any part. Nothing in `IMP` changes until you say yes.
