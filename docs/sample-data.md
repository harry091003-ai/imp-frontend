# Sample data to try the real app

Written 2026-11-03. Realistic test data for your own database: the people, 12 incidents, and the order to use them in
so that every feature gets real data. Every value fits the backend's rules (lengths and allowed choices).

**Use made-up people only.** The emails end in `@example.com`, a domain reserved for examples, so no real person gets
anything. Pick **one test password** for all test accounts (at least 6 characters), and never your real password.

---

## 1. The people

| Username           | Email                     | Role       | Supervisor |
| ------------------ | ------------------------- | ---------- | ---------- |
| (you)              | your own account          | **Admin**  | -          |
| `meera.supervisor` | `meera.patel@example.com` | Supervisor | -          |
| `arjun.supervisor` | `arjun.rao@example.com`   | Supervisor | -          |
| `ravi.eng`         | `ravi.sharma@example.com` | Engineer   | Meera      |
| `priya.eng`        | `priya.nair@example.com`  | Engineer   | Meera      |
| `omar.eng`         | `omar.khan@example.com`   | Engineer   | Arjun      |
| `sara.eng`         | `sara.dsouza@example.com` | Engineer   | Arjun      |

**How:**

1. Sign out → **Sign up** each person (everyone starts as an engineer). Use a private window, or sign out between them.
2. Sign in as **you (admin)** → **Users and roles**:
   - change Meera and Arjun to **Supervisor**
   - put Ravi and Priya under **Meera**, Omar and Sara under **Arjun**

Remember: only 5 sign-ups an hour from your laptop, unless you raised the limit (`run-everything-together.md`, Step 2).

---

## 2. The incidents

Fill these in **Report an incident**. "Reporter" = who signs in to create it. Location and Affected source are optional
but make the data more real.

### 1. Login takes 20 seconds after the morning deploy

- **Reporter:** ravi.eng
- **Severity:** HIGH · **Priority:** HIGH · **Environment:** PRODUCTION
- **Service:** AUTH_SERVICE · **Category:** API
- **Location:** Mumbai office · **Affected source:** web login page
- **Description:**
  > Since the 09:00 deploy, signing in takes 15 to 25 seconds for every user. The login page shows the spinner the whole time, then succeeds. Other pages are normal once signed in. About 40 users reported it in the first hour. No errors in the browser console.

### 2. Payment confirmation emails not sent

- **Reporter:** priya.eng
- **Severity:** MEDIUM · **Priority:** HIGH · **Environment:** PRODUCTION
- **Service:** EMAIL_SERVICE · **Category:** CUSTOMER
- **Location:** All regions · **Affected source:** checkout confirmation email
- **Description:**
  > Customers pay successfully but do not receive the confirmation email. Payments appear in the admin panel, so money is taken correctly. Started around 14:30 yesterday. Support has 23 tickets asking whether the payment went through.

### 3. Database connection pool exhausted on reports

- **Reporter:** omar.eng
- **Severity:** CRITICAL · **Priority:** CRITICAL · **Environment:** PRODUCTION
- **Service:** REPORTING_SERVICE · **Category:** DATABASE
- **Location:** Primary data center · **Affected source:** monthly report export
- **Description:**
  > When the monthly report export runs, every report page returns errors for about 10 minutes. Logs show "Connection is not available, request timed out after 30000ms". The pool size is 10 and the export opens one connection per department.

### 4. Payment page times out for card payments

- **Reporter:** sara.eng
- **Severity:** CRITICAL · **Priority:** CRITICAL · **Environment:** PRODUCTION
- **Service:** PAYMENT_SERVICE · **Category:** API
- **Location:** Bengaluru region · **Affected source:** card payment form
- **Description:**
  > Card payments fail with "Gateway timeout" after 30 seconds. UPI payments still work. About 1 in 3 card payments fail since 11:15. The payment provider's status page shows no outage.

### 5. Gateway returns 502 for some users after scaling

- **Reporter:** ravi.eng
- **Severity:** HIGH · **Priority:** MEDIUM · **Environment:** STAGING
- **Service:** APIGATEWAY_SERVICE · **Category:** NETWORK
- **Location:** Staging cluster · **Affected source:** all API calls
- **Description:**
  > After scaling the gateway from 2 to 4 instances, about 10% of requests return 502 Bad Gateway. The new instances show as healthy. Requests to the old 2 instances always work.

### 6. Notification bell shows alerts twice

- **Reporter:** priya.eng
- **Severity:** LOW · **Priority:** LOW · **Environment:** DEVELOPMENT
- **Service:** NOTIFICATION_SERVICE · **Category:** OTHER
- **Location:** Dev environment · **Affected source:** alerts list
- **Description:**
  > Each new alert appears twice in the alerts list, with the same time and text. Refreshing the page shows only one. Happens in Chrome and Edge.

### 7. User profile photo upload fails above 2 MB

- **Reporter:** omar.eng
- **Severity:** LOW · **Priority:** MEDIUM · **Environment:** PRODUCTION
- **Service:** USER_SERVICE · **Category:** CUSTOMER
- **Location:** All regions · **Affected source:** profile settings page
- **Description:**
  > Uploading a profile photo larger than 2 MB shows "Something went wrong" with no further detail. Photos under 2 MB work. The page says the limit is 5 MB.

### 8. Disk almost full on the reporting server

- **Reporter:** sara.eng
- **Severity:** HIGH · **Priority:** HIGH · **Environment:** PRODUCTION
- **Service:** REPORTING_SERVICE · **Category:** INFRASTRUCTURE
- **Location:** Primary data center · **Affected source:** reporting server disk
- **Description:**
  > The reporting server disk is at 94% and grows about 2% a day. Most of the space is old log files and exported reports from the last 18 months. At this rate it is full in 3 days.

### 9. Password reset link expired immediately

- **Reporter:** ravi.eng
- **Severity:** MEDIUM · **Priority:** MEDIUM · **Environment:** PRODUCTION
- **Service:** AUTH_SERVICE · **Category:** CUSTOMER
- **Location:** All regions · **Affected source:** password reset email
- **Description:**
  > Users who click the password reset link within a minute see "This link has expired". Started after the server clocks were changed last night. 8 users affected so far.

### 10. Slow database queries on the incident list

- **Reporter:** priya.eng
- **Severity:** MEDIUM · **Priority:** HIGH · **Environment:** PRODUCTION
- **Service:** REPORTING_SERVICE · **Category:** DATABASE
- **Location:** Primary data center · **Affected source:** incidents report page
- **Description:**
  > The incidents report page takes 8 to 12 seconds to load. The slow query log shows a full table scan on the incident report table when filtering by status and severity. The table has 1.2 million rows.

### 11. Office Wi-Fi drops every 30 minutes

- **Reporter:** omar.eng
- **Severity:** MEDIUM · **Priority:** LOW · **Environment:** OTHERS
- **Service:** OTHERS · **Category:** HARDWARE
- **Location:** Pune office, 3rd floor · **Affected source:** floor 3 access point
- **Description:**
  > The Wi-Fi on the 3rd floor disconnects for about a minute every 30 minutes. Wired connections are fine. Started after the access point was replaced on Monday.

### 12. Login slow again during peak hours

- **Reporter:** sara.eng
- **Severity:** HIGH · **Priority:** HIGH · **Environment:** PRODUCTION
- **Service:** AUTH_SERVICE · **Category:** API
- **Location:** Delhi office · **Affected source:** web login page
- **Description:**
  > Between 09:00 and 10:00 signing in takes 10 to 20 seconds. Outside peak hours it is fast. Looks similar to the slow login problem from last week.

**Why 1 and 12 are so alike:** after you **resolve #1** (step 3 below), create #12. The AI suggestion on #12 should
find #1 and suggest its fix. That tests the AI memory.

---

## 3. What to do with them (so every screen gets data)

**Assign** (as Meera for Ravi's and Priya's incidents, as Arjun for Omar's and Sara's):

| #        | Assign to |
| -------- | --------- |
| 1, 9     | ravi.eng  |
| 2, 6, 10 | priya.eng |
| 3, 7, 11 | omar.eng  |
| 4, 5, 8  | sara.eng  |

Try the **AI ranking** in the assign window at least once.

**Then move them along** (as the assigned engineer):

| #            | Do                                                 | Root cause / Resolution notes (needed for Resolved)                                                                                                                                                  |
| ------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1            | Start work → **Resolve** → **Close**               | Root cause: _The new deploy turned on password hashing with a cost of 16, which takes 18 seconds per login._ Notes: _Lowered the hashing cost to 12 and redeployed. Login now takes under 1 second._ |
| 2            | Start work → **Resolve**                           | Root cause: _The email provider's API key expired at 14:30._ Notes: _Renewed the key, added an expiry alert 14 days ahead, resent the 312 missed emails._                                            |
| 3            | Start work → **Resolve** → **Close**               | Root cause: _The export opened one database connection per department, 14 at once, with a pool of 10._ Notes: _Export now reuses one connection; pool raised to 20. Export ran without errors._      |
| 4            | Start work (leave it **In progress**)              | -                                                                                                                                                                                                    |
| 5            | Start work → **Resolve** → **Reopen** → Start work | First resolve, root cause: _New instances were missing in the load balancer health check list._ Notes: _Added them._ Then reopen: it came back.                                                      |
| 6            | **Resolve** straight away                          | Root cause: _The alerts list subscribed to updates twice._ Notes: _Removed the second subscription._                                                                                                 |
| 8            | Start work → **Resolve** → **Close**               | Root cause: _No clean-up of old logs and exports._ Notes: _Deleted logs older than 90 days, moved old exports to archive storage, added a weekly clean-up job. Disk now at 41%._                     |
| 7, 9, 10, 11 | Leave them as they are (Assigned)                  | -                                                                                                                                                                                                    |

Leave **#4 (CRITICAL)** in progress and **create one more CRITICAL incident without assigning it**. After a while the
SLA check raises alerts, which you then see under **Alerts** and the bell.

---

## 4. What to check after that

| Where                                   | You should see                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------------------- |
| Incidents list                          | Names (not ids) for reporter and assignee; the mix of statuses                     |
| Incident detail                         | Only the allowed next buttons; the timeline; root cause and notes on resolved ones |
| Engineer home (as ravi.eng)             | His assigned incidents and the ones he created                                     |
| Dashboard and Reports (as Meera or you) | Counts by status and severity, trends, top failing services (REPORTING and AUTH)   |
| Team (as Meera)                         | Ravi and Priya with their open-incident counts                                     |
| Alerts                                  | Assigned and status-change alerts; SLA alerts after a while                        |
| Users and roles (as you)                | The 6 people with the right roles and supervisors                                  |
| AI suggestion on #12                    | Points to #1 and its fix                                                           |

Write down anything that looks wrong: the page, what you did, and the **trace id** shown in an error. That list is the
start of the bug-fixing step.
