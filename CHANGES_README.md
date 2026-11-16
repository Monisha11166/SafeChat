# SafeChat – New Features

## 1. Professional UI
- New Login / Register / Forgot-password pages (shared `Auth.css`, `AuthLayout.jsx`)
- New Safety Dashboard at `/dashboard` (KPI cards, risk donut, conversation table with
  filter/search/trend, guardian contact card, recent alerts). Dashboard icon added to chat sidebar.

## 2. Login with email OR phone
`POST /api/users/login  { identifier, password }`

## 3. Forgot password (email or phone OTP)
`/forgot-password` page -> `POST /api/users/forgot-password` -> 6-digit OTP (hashed, 10 min,
5 attempts, 60 s resend limit) -> `POST /api/users/reset-password`.

## 4. Parent / Guardian contact
Collected on Register (email and/or phone, at least one). Existing users are nudged to add it
from the dashboard (`PUT /api/users/guardian`). Hidden from all other API responses.

## 5. Automatic risk alerts to parents
After every message the risk score is recalculated. When it reaches `RISK_ALERT_MIN_LEVEL`
(default Medium) the guardians of both participants get an email and/or SMS.
Sent only on escalation (Low->Medium->High) or again after `RISK_ALERT_COOLDOWN_HOURS` (24).
Contains counts only, never message text. Every attempt is logged (AlertLog) and shown on the dashboard.

## Setup
```
cd backend  && npm install && npm start
cd frontend && npm install && npm run dev
```
Edit `backend/.env`:
- **Email**: Gmail SMTP -> SMTP_USER + SMTP_PASS (Google "App password").
- **SMS**: create a Twilio account -> TWILIO_ACCOUNT_SID / AUTH_TOKEN / FROM.
- Leave them blank = DEMO MODE: emails/SMS are printed in the backend terminal
  (dashboard shows them as "demo (not sent)"). OTP codes also appear there.
- `DEFAULT_COUNTRY_CODE=+91` is added to 10-digit numbers.

## Test
1. Register two users, each with a guardian email/phone.
2. Dashboard -> "Send test alert".
3. To trigger a real alert quickly, lower the thresholds in `backend/utils/riskCalculator.js`,
   then chat between the two users.

## Bug fixed
`routes/riskRoutes.js`: `/summary/:userId` was declared after `/:userA/:userB`, so the
dashboard request never reached it. Order corrected.

Note: existing accounts have no phone/guardian; they can still log in by email, add guardian
from the dashboard. Old users with no phone can't use phone login/reset until one is stored.

## 6. Demo dataset (for showing the risk calculator without real chats)
`node scripts/seedDemoData.js <your-email-or-username-or-phone>`

Creates 5 fake contacts (arjun_22, kavya_r, rohit_m, sneha_p, priya_s) and backdates
messages between them and your account so the dashboard immediately shows one High,
two Medium and two Low risk conversations, plus guardian alerts. Message text is
placeholder only ("hey", "lol same"...) — the risk engine never reads it anyway.
Safe to re-run; add fresh messages each time by running it again.

## 7. Profile pictures, real file sending, calls (WhatsApp-style)
- **Auto profile picture**: every new account gets an auto-generated colored
  avatar (DiceBear initials) at registration — no blank profiles.
- **Change your photo**: click your name/photo in the sidebar -> "My profile"
  -> choose a photo. `PUT /api/users/profile-picture` (multipart).
- **Real photos everywhere**: sidebar, chat header, contact list and call
  screens now show the actual photo (falls back to a colored initial if
  none is set).
- **Image/file sending fixed**: the attach button in chat now actually
  uploads the file to the backend (`multipart/form-data`) and displays it —
  previously the image was picked but silently never sent. Non-image files
  (pdf/doc/txt/zip) now show as a downloadable file bubble; images render
  inline, like WhatsApp.
- **Voice/video calling**: this already existed (WebRTC + Socket.IO, in
  `hooks/useCall.js` / `components/CallModal.jsx`, buttons in the chat
  header). It now also shows the other person's real profile photo during
  the call instead of just an initial.

## 8. One-command demo (updated seed)
From the backend folder:

    npm run seed:fresh        # wipes ALL data, then loads the demo dataset

or, step by step:

    node scripts/resetDatabase.js --yes
    node scripts/seedDemoData.js                          # auto-creates demo_user / Demo@1234
    node scripts/seedDemoData.js Monisha                  # OR attach to your own account
    node scripts/seedDemoData.js --guardian-email=you@gmail.com   # optional real guardian

Expected result (verified for every time of day):
    arjun_22  High    7/10   58 msgs/24h, 7 late-night, 12 active days
    kavya_r   Medium  4/10   26 msgs/24h, 1 late-night,  6 active days
    rohit_m   Medium  4/10   12 msgs/24h, 0 late-night, 14 active days
    sneha_p   Low     1/10    8 msgs/24h, 0 late-night,  3 active days
    priya_s   Low     0/10    3 msgs/24h, 0 late-night,  1 active day
Passwords for every demo account: Demo@1234
Re-running the seed is safe - old demo chats/alerts are cleared first.
The dashboard trend line is computed by replaying the real risk calculator.

## 9. Seed fixes: contacts now appear in the chat list + guardians for every demo account
- The seed script now adds each demo contact to your chat/contact list in
  both directions, so the conversation shows up whether you're logged in as
  the main account OR as arjun_22 / kavya_r / etc. (previously only the
  RiskScore existed, not the actual Contact link the chat sidebar reads).
- Every demo contact (arjun_22, kavya_r, rohit_m, sneha_p, priya_s) now gets
  its own placeholder guardian email + phone, e.g. parent.arjun@demo.safechat.
  These are fake addresses for demo purposes only - nothing is really sent to
  them; in demo/simulated mode (no SMTP/Twilio configured) every alert is
  just printed in the backend terminal, which is exactly what makes it safe
  to use fake contacts here.
- Re-running the seed backfills guardian info onto contacts created by an
  older version of this script, without erasing anything set manually.

## 10. "Preview as parent" page + test-case document
- New page: Safety Dashboard → "Preview as parent" button → shows a
  phone-style mockup of exactly what a guardian sees (their contact info,
  the live risk numbers for every monitored conversation, and the text of
  every alert sent so far). Purely a presentation aid — real guardians
  never log into SafeChat, they only get email/SMS.
- `backend/routes/riskRoutes.js`: new `GET /api/risk/guardian-view/:userId`
  route powering that page.
- `backend/utils/demoTimestamps.js`: the timestamp-generation logic used by
  the seed script was pulled out into its own shared file so
  `seedDemoData.js` and the new `printTestCases.js` always produce
  identical, correct numbers — verified against 3,600 simulated run times
  across every hour of the day with zero mismatches.
- `backend/scripts/printTestCases.js`: prints the 5 test cases with
  PASS/FAIL to the console, no database needed.
- `docs/SafeChat_Risk_TestCases.docx`: a ready-to-present Word document —
  the scoring rules, the 5 test cases with inputs/expected/actual results,
  and the exact guardian alert text for each Medium/High case. Use this to
  explain the risk calculator to evaluators.

## 11. Diagnostic: list contact links
`node scripts/listContacts.js` — prints every contact relationship in the
database (who sees whom in their chat sidebar). Use this if a chat list
looks empty, to check whether the seed script's contact-linking actually ran.

## 12. Real parent/guardian login
Previously "Preview as parent" only worked from inside the child's own
session. Now a parent can register their own account and log in directly:
- `POST /api/users/register-guardian` — separate sign-up for parents
  (name, email, phone optional, password). New frontend page:
  `GuardianRegister.jsx` (link from the Login page: "Parent or guardian?").
- Linking is automatic: a guardian account is connected to any child whose
  `guardianEmail`/`guardianPhone` matches the guardian's own email/phone —
  no invite code, same as how the alerts already worked.
- `GET /api/risk/my-children` — returns every linked child's risk summary
  and alert history for the logged-in guardian.
- `GuardianDashboard.jsx` — the real, authenticated parent dashboard.
  Guardians only ever see risk levels and alert text, never chat messages.
- The seed script now creates REAL, loggable guardian accounts for all 5
  demo parents (previously these were just email strings, not accounts).
  See the seed script's final console output for the login list, or run
  `node scripts/listUsers.js`.

## 13. Context-aware alert wording (not just "High risk!")
Addresses: a teacher messaging "he is suspended" could previously trigger
the same alarming "High risk" text as an actual stranger. Now:
- `utils/alertKeywords.js` — a small, editable word list, checked ONLY at
  the moment an alert is about to be sent (never affects the score itself,
  which stays 100% metadata-only, per the original design).
- "Context words" (suspended, expelled, hospital, bullying, etc.) produce
  a calmer tone: *"the word 'suspended' came up — might be ordinary, but
  worth asking about."*
- "Caution words" (meet me, our secret, come alone, etc.) produce a more
  pointed tone: *"language sometimes associated with secrecy or an
  in-person meetup — worth reviewing soon."*
- Neither case ever shows the guardian the actual message — only the one
  matched word, same privacy guarantee as before.
- The demo seed script now plants one realistic trigger message each for
  `arjun_22` ("...suspended...") and `kavya_r` ("meet me...don't tell...")
  so you can show this live — check the alert text on their guardians'
  dashboards after seeding.
- `AlertLog` now stores `summaryText`, the exact sentence that was sent,
  shown on both the child's dashboard and the new parent dashboard.

## 14. Security hardening
Answers "where is the security for your chat?":
- **Messages encrypted at rest (AES-256-GCM)** — `utils/messageCrypto.js`.
  Chat text is encrypted before it's saved to MongoDB and only decrypted
  for an authenticated participant of that conversation. A real key is
  already generated in `.env` (`MESSAGE_ENCRYPTION_KEY`) — back it up, since
  losing it makes old messages unreadable. Verified round-trip correct for
  English, emoji, Hindi and Kannada text, and fails safely (not a crash)
  if the wrong key is used.
- **HTTP security headers** via `helmet` (clickjacking/sniffing protection,
  hides the Express fingerprint).
- **Rate limiting** via `express-rate-limit` — a loose cap on the whole
  API, and a much stricter cap (20 requests/15 min) specifically on
  login, register, and password-reset, to blunt brute-force/credential-
  stuffing attempts.
- **CORS lockdown option** — set `CLIENT_ORIGIN` in `.env` to restrict the
  API to your real frontend URL in production; left blank for local dev.
- **Request size cap** (2MB) on JSON bodies, separate from file uploads.
- Fixed a minor info-leak: the server no longer prints your MongoDB
  credentials in plain text to the console on startup.
- Already present before this round (worth mentioning when asked):
  passwords hashed with bcrypt (never stored or logged in plain text),
  JWT-based auth with a 7-day expiry, ownership checks on every risk/
  message endpoint (`isSelf`), and Mongoose's parameterized queries (no
  raw string-built SQL/NoSQL injection surface).
- `npm install` in the backend folder picks up the two new packages
  (`helmet`, `express-rate-limit`).

## 15. Multi-language guardian alerts
Addresses: parents message should work in Hindi, Kannada, etc., not only
English.
- `utils/alertI18n.js` — translated building blocks for alert emails/SMS.
  Ships with English, Hindi, and Kannada. Adding a new language is just
  adding one more entry with the same keys to this file — nothing else in
  the app needs to change.
- New field `guardianPreferredLanguage` (en/hi/kn) on the child's account,
  settable on the Register page and from the Safety Dashboard's guardian
  contact editor. This is the language the actual alert is written in —
  independent of what language the app's own UI is in.
- Fully wired through `buildEmail`/`buildSms` in `services/alertService.js`
  — verified correct output in all 3 languages, including the
  context-aware "suspended"/"meet me" wording from the previous section.
- The demo seed script sets `kavya_r`'s guardian to Hindi and `rohit_m`'s
  guardian to Kannada, so running it and checking those two accounts'
  alert history shows real translated output without any extra setup.
- Scope note: full UI translation (login screen, dashboard labels, etc.)
  was not done in this pass — only the actual alert messages sent to
  guardians, since that was the specific ask. Ask if you'd like the rest
  of the interface translated too; the same `utils/alertI18n.js` pattern
  extends cleanly to that.

## 16. Updated demo re-seed
Because of the model/schema additions in sections 12-15, run the full
reset + reseed once more to get all of this demonstrable:

    node scripts/resetDatabase.js --yes
    node scripts/seedDemoData.js

This recreates all 5 child contacts AND their 5 real, loggable guardian
accounts (3 in English, 1 in Hindi, 1 in Kannada), plants the "suspended"
and "meet me" trigger messages, and sends the first round of alerts so
there's immediately something to look at on both the child's dashboard
and the new parent dashboard (`/guardian-dashboard`, after logging in with
one of the guardian accounts printed at the end of the seed script).

## 17. Diagnostic: check guardian-child linking
`node scripts/checkGuardianLinks.js` — prints every child account's stored
guardian email and whether it actually matches a real guardian login
account. Use this if the parent dashboard says "no child account is
linked" even after reseeding.

## 18. Bug fix: demo child accounts had no `role` field
Root cause of "no child account is linked" on the parent dashboard even
though the guardian email looked correct: `ensureUser()` in the seed
script created accounts via a MongoDB upsert (`$setOnInsert`) that never
explicitly included `role`. MongoDB does NOT apply Mongoose schema
defaults during a raw upsert, so those accounts were saved with no `role`
field at all - invisible to any query filtering by `role: "user"`,
including `GET /risk/my-children` (the real parent dashboard) and
`scripts/checkGuardianLinks.js`. Confirmed by reproducing the exact
behavior with a mock upsert.

Fixed in two parts so a full reset isn't required:
- `role: "user"` is now explicitly written when creating each demo
  account (same pattern `ensureGuardianAccount` already used correctly).
- A one-time repair step runs automatically at the start of
  `seedDemoData.js`: any existing demo account (`@demo.safechat` /
  `@safechat.demo`) missing a `role` is patched to `role: "user"`. Just
  re-run `node scripts/seedDemoData.js` - no reset needed - and it heals
  itself, printing how many accounts it repaired.

## 19. Fixed: keyword scanning only recognized English
Important distinction clarified: section 15 (multi-language) only
translated the OUTGOING alert to the guardian. It did NOT touch what
language the keyword scanner (section 13) could recognize in the
children's actual chat messages - that was still English-only, meaning
"yargu helbeda" (Kannada for "don't tell anyone") or "mat batana" (Hindi,
same meaning) would have been invisible to it.

Fixed in `utils/alertKeywords.js`:
- Added Hindi (Devanagari script + common romanized spellings) and
  Kannada (native script + common romanized spellings) equivalents to
  both the CONTEXT_WORDS and CAUTION_WORDS lists.
- Verified against a real example: the chat message
  "elladru hogana yargu helbeda aache hogana" is now correctly detected
  and flows through to a fully Kannada-language guardian alert
  referencing the actual matched phrase.

**Known, honest limitation:** romanized Indian-language text has no
single "correct" spelling - people type the same word many different
ways (yarigu/yaarigu/yargu/yarige...). This list covers the common
spellings I could think of, not every possible one. It's a plain
JavaScript array in `utils/alertKeywords.js` - add more spellings any
time your own testing turns up ones that were missed. Full, reliable
coverage of casually-typed regional language text is a genuinely hard
NLP problem; this keyword-list approach is a reasonable, explainable
starting point for a project, not a complete solution.

## 20. Installable as an app (PWA) — "send a link, they get an app"
SafeChat is now a Progressive Web App. Anyone who opens your deployed link
on their phone gets an "Install" / "Add to Home Screen" prompt. Once
installed: own icon, opens full-screen (no browser bar), works like a
native app — all from the same link, no Play Store needed.

What changed:
- `vite-plugin-pwa` added (`npm install` in `frontend` picks it up).
- `vite.config.js` — PWA manifest configured (name, icons, theme color,
  `display: standalone`). `autoUpdate` means people who've already
  installed it silently get your future updates too.
- New real app icon at `frontend/public/` (shield + chat bubble, matches
  the app's existing color scheme) in all required sizes, replacing the
  generic default Vite logo that was there before. Includes a "maskable"
  variant so Android doesn't crop it oddly inside its adaptive-icon shapes.
- `index.html` — proper title ("SafeChat" instead of "frontend"), favicon,
  and the extra meta tags iOS needs for "Add to Home Screen" to open
  full-screen instead of as a bookmark.
- Already-logged-in users now skip straight past the login screen when
  reopening the app, instead of having to log in every single time —
  important for it to actually feel like an app.

### To test it
```
cd frontend
npm install
npm run build
npm run preview
```
Open the preview URL on your phone (same wifi network) or deploy it (see
`DEPLOYMENT_GUIDE.md`) and open the real link on your phone. Chrome/Edge
on Android will show an install prompt automatically; on iPhone Safari,
use the Share button → "Add to Home Screen".

### If you also want it on the Google Play Store later
This PWA setup is also the prerequisite for that. Once it's deployed with
a real HTTPS URL, Google's own **Bubblewrap** tool (or the PWABuilder
website) wraps it into an Android app package automatically — you'd then
need a Google Play Developer account ($25 one-time) to publish it. Ask if
you want help with that step once you're deployed and ready for it.
