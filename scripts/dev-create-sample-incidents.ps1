# DEVELOPMENT ONLY. Never run this against a real (production) system.
#
# Creates incidents 1 to 11 from docs/sample-data.md through the REAL gateway, signed in as each reporter.
# Going through the app (not SQL) matters: IncidentService then announces each incident on Kafka, so the
# dashboard, reports, SLA timers, alerts and the AI memory all get it too.
#
# Needs: the backend running (gateway on 127.0.0.1:8082), and the example accounts from docs/sample-data.md
# signed up with ONE shared test password. The script asks for that password; it is never saved.
# Incident 12 is left out on purpose: create it by hand after resolving incident 1 (it tests the AI memory).
#
# Run from the IMP Frontend folder:
#   powershell -ExecutionPolicy Bypass -File scripts\dev-create-sample-incidents.ps1

$ErrorActionPreference = 'Stop'
$gateway = 'http://127.0.0.1:8082'

$secure = Read-Host 'Test password of the example accounts' -AsSecureString
$password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))

function Send-Json($uri, $body, $token) {
    $headers = @{}
    if ($token) { $headers['Authorization'] = "Bearer $token" }
    $bytes = [Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json))
    Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $bytes `
        -ContentType 'application/json; charset=utf-8'
}

$incidents = @(
    @{ reporter = 'ravi.sharma@example.com'; title = 'Login takes 20 seconds after the morning deploy'
       severity = 'HIGH'; priority = 'HIGH'; environment = 'PRODUCTION'; serviceName = 'AUTH_SERVICE'; category = 'API'
       location = 'Mumbai office'; affectedSource = 'web login page'
       description = 'Since the 09:00 deploy, signing in takes 15 to 25 seconds for every user. The login page shows the spinner the whole time, then succeeds. Other pages are normal once signed in. About 40 users reported it in the first hour. No errors in the browser console.' },
    @{ reporter = 'priya.nair@example.com'; title = 'Payment confirmation emails not sent'
       severity = 'MEDIUM'; priority = 'HIGH'; environment = 'PRODUCTION'; serviceName = 'EMAIL_SERVICE'; category = 'CUSTOMER'
       location = 'All regions'; affectedSource = 'checkout confirmation email'
       description = 'Customers pay successfully but do not receive the confirmation email. Payments appear in the admin panel, so money is taken correctly. Started around 14:30 yesterday. Support has 23 tickets asking whether the payment went through.' },
    @{ reporter = 'omar.khan@example.com'; title = 'Database connection pool exhausted on reports'
       severity = 'CRITICAL'; priority = 'CRITICAL'; environment = 'PRODUCTION'; serviceName = 'REPORTING_SERVICE'; category = 'DATABASE'
       location = 'Primary data center'; affectedSource = 'monthly report export'
       description = 'When the monthly report export runs, every report page returns errors for about 10 minutes. Logs show "Connection is not available, request timed out after 30000ms". The pool size is 10 and the export opens one connection per department.' },
    @{ reporter = 'sara.dsouza@example.com'; title = 'Payment page times out for card payments'
       severity = 'CRITICAL'; priority = 'CRITICAL'; environment = 'PRODUCTION'; serviceName = 'PAYMENT_SERVICE'; category = 'API'
       location = 'Bengaluru region'; affectedSource = 'card payment form'
       description = 'Card payments fail with "Gateway timeout" after 30 seconds. UPI payments still work. About 1 in 3 card payments fail since 11:15. The payment provider status page shows no outage.' },
    @{ reporter = 'ravi.sharma@example.com'; title = 'Gateway returns 502 for some users after scaling'
       severity = 'HIGH'; priority = 'MEDIUM'; environment = 'STAGING'; serviceName = 'APIGATEWAY_SERVICE'; category = 'NETWORK'
       location = 'Staging cluster'; affectedSource = 'all API calls'
       description = 'After scaling the gateway from 2 to 4 instances, about 10% of requests return 502 Bad Gateway. The new instances show as healthy. Requests to the old 2 instances always work.' },
    @{ reporter = 'priya.nair@example.com'; title = 'Notification bell shows alerts twice'
       severity = 'LOW'; priority = 'LOW'; environment = 'DEVELOPMENT'; serviceName = 'NOTIFICATION_SERVICE'; category = 'OTHER'
       location = 'Dev environment'; affectedSource = 'alerts list'
       description = 'Each new alert appears twice in the alerts list, with the same time and text. Refreshing the page shows only one. Happens in Chrome and Edge.' },
    @{ reporter = 'omar.khan@example.com'; title = 'User profile photo upload fails above 2 MB'
       severity = 'LOW'; priority = 'MEDIUM'; environment = 'PRODUCTION'; serviceName = 'USER_SERVICE'; category = 'CUSTOMER'
       location = 'All regions'; affectedSource = 'profile settings page'
       description = 'Uploading a profile photo larger than 2 MB shows "Something went wrong" with no further detail. Photos under 2 MB work. The page says the limit is 5 MB.' },
    @{ reporter = 'sara.dsouza@example.com'; title = 'Disk almost full on the reporting server'
       severity = 'HIGH'; priority = 'HIGH'; environment = 'PRODUCTION'; serviceName = 'REPORTING_SERVICE'; category = 'INFRASTRUCTURE'
       location = 'Primary data center'; affectedSource = 'reporting server disk'
       description = 'The reporting server disk is at 94% and grows about 2% a day. Most of the space is old log files and exported reports from the last 18 months. At this rate it is full in 3 days.' },
    @{ reporter = 'ravi.sharma@example.com'; title = 'Password reset link expired immediately'
       severity = 'MEDIUM'; priority = 'MEDIUM'; environment = 'PRODUCTION'; serviceName = 'AUTH_SERVICE'; category = 'CUSTOMER'
       location = 'All regions'; affectedSource = 'password reset email'
       description = 'Users who click the password reset link within a minute see "This link has expired". Started after the server clocks were changed last night. 8 users affected so far.' },
    @{ reporter = 'priya.nair@example.com'; title = 'Slow database queries on the incident list'
       severity = 'MEDIUM'; priority = 'HIGH'; environment = 'PRODUCTION'; serviceName = 'REPORTING_SERVICE'; category = 'DATABASE'
       location = 'Primary data center'; affectedSource = 'incidents report page'
       description = 'The incidents report page takes 8 to 12 seconds to load. The slow query log shows a full table scan on the incident report table when filtering by status and severity. The table has 1.2 million rows.' },
    @{ reporter = 'omar.khan@example.com'; title = 'Office Wi-Fi drops every 30 minutes'
       severity = 'MEDIUM'; priority = 'LOW'; environment = 'OTHERS'; serviceName = 'OTHERS'; category = 'HARDWARE'
       location = 'Pune office, 3rd floor'; affectedSource = 'floor 3 access point'
       description = 'The Wi-Fi on the 3rd floor disconnects for about a minute every 30 minutes. Wired connections are fine. Started after the access point was replaced on Monday.' }
)

# Sign every reporter in FIRST. If one password is wrong, stop before creating anything, and before repeated
# wrong passwords can lock an account (5 wrong tries lock it for 15 minutes).
$tokens = @{}
foreach ($email in ($incidents | ForEach-Object { $_.reporter } | Sort-Object -Unique)) {
    try {
        $answer = Send-Json "$gateway/auth/login" @{ username = 'x'; email = $email; password = $password }
        $tokens[$email] = $answer.jwttoken
        Write-Host "Signed in: $email"
    } catch {
        Write-Host "Could not sign in as $email. Nothing was created." -ForegroundColor Red
        Write-Host $_.ErrorDetails.Message
        exit 1
    }
}

$created = 0
foreach ($incident in $incidents) {
    $body = $incident.Clone()
    $body.Remove('reporter')
    try {
        Send-Json "$gateway/incidents" $body $tokens[$incident.reporter] | Out-Null
        $created++
        Write-Host "Created: $($incident.title)"
    } catch {
        Write-Host "FAILED: $($incident.title)" -ForegroundColor Red
        Write-Host $_.ErrorDetails.Message
    }
}
Write-Host "$created of $($incidents.Count) incidents created. Now assign them in the app (docs/sample-data.md, section 3)."
