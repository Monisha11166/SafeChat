# Changes made in this session (24 Nov 2026)

## Backend
- middleware/upload.js      : auto-creates uploads/ folder (fixes photo upload ENOENT on Render)
- server.js                 : /uploads served from absolute path
- services/notificationService.js : Fast2SMS support (set FAST2SMS_API_KEY) + Twilio fallback + simulate
- routes/turnRoutes.js      : Metered TURN support (METERED_APP_NAME, METERED_API_KEY)

## Frontend
- components/CallModal.jsx  : fixed video blinking (stream attached once, not on every render)
- hooks/useCall.js          : [call] debug logs in browser Console (ICE state, TURN route)
- i18n/ (new)               : translations (English, Hindi, Kannada; Telugu/Tamil partial) + LanguageContext
- components/LanguageSwitcher.jsx (new) : language dropdown
- Login.jsx, AuthLayout.jsx, Sidebar.jsx, Header.jsx, MessageInput.jsx, main.jsx, index.css : wired to translations

## Render environment variables
FOR SMS (demo, free): TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM=+17372212163
   (trial sends only to verified numbers, e.g. +918792471514)
FOR SMS (real, paid):  FAST2SMS_API_KEY
FOR VIDEO CALLS:       METERED_APP_NAME, METERED_API_KEY
Also check: CLIENT_ORIGIN = your Vercel URL (https://safe-chat-tau.vercel.app), no trailing slash.

## After pushing
1. Wait for Vercel + Render to show Ready/Live.
2. Browser: DevTools > Application > Service Workers > Unregister, Clear site data, reload.
3. Phone: clear site data / reinstall the home-screen app.

## Fixes added (demo eve, 24 Nov 2026)
- hooks/useCall.js : caller now applies queued ICE candidates after the answer (main reason calls never connected); failed connection ends the call; TURN fetch retries + clear warnings
- Home.jsx : socket re-registers user on every reconnect (fixes "User is offline" on calls)
- userRoutes.js + ProfileModal.jsx/.css : NEW DELETE /api/users/profile-picture and "Remove photo" button
- notificationService.js : Fast2SMS failure falls back to Twilio; real provider errors (with Twilio code) saved in alert log
- scripts/testSms.js : run `node scripts/testSms.js +91XXXXXXXXXX` to see the exact SMS error
