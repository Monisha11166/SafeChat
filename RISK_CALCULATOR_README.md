# SafeChat — Risk Calculator + Voice/Video Calling

No new npm packages needed for either feature — reuses your existing
mongoose / express / socket.io / axios / react-router / react-icons setup.
Calling uses the browser's built-in WebRTC APIs (no library added).

## What's new vs. your original code

### Risk Calculator
Backend (`backend/`):
- `models/RiskScore.js` — NEW
- `utils/riskCalculator.js` — NEW (rule-based scoring engine)
- `services/riskService.js` — NEW
- `routes/riskRoutes.js` — NEW
- `routes/messageRoutes.js` — MODIFIED (recalculates risk after every send)
- `socket.js` — MODIFIED (added sendRiskAlert)

Frontend (`frontend/src/`):
- `components/RiskIndicator.jsx` + `.css` — NEW (badge in chat header)
- `pages/RiskDashboard.jsx` + `.css` — NEW (all conversations by risk, at `/dashboard`)
- `components/Header.jsx` — MODIFIED (renders `<RiskIndicator />`)
- `App.jsx` — MODIFIED (added `/dashboard` route)

### Voice/Video Calling
Backend (`backend/`):
- `socket.js` — MODIFIED (added call-user / call-answer / call-rejected /
  ice-candidate / call-ended signaling relay — server never touches
  audio/video, only routes connection setup messages)

Frontend (`frontend/src/`):
- `hooks/useCall.js` — NEW (WebRTC peer connection + call state machine)
- `components/CallModal.jsx` + `.css` — NEW (ringing/calling/connected UI)
- `Home.jsx` — MODIFIED (mounts `useCall` + `<CallModal />`, passes
  `onStartCall` down to Header)
- `components/Header.jsx` — MODIFIED (phone/video buttons now call
  `onStartCall("audio"|"video")`)

`server.js` — MODIFIED (registered `/api/risk` routes)

## Run it

```
cd backend && npm install && npm start
cd frontend && npm install && npm run dev
```

Your `.env` (`PORT`, `MONGO_URI`, `JWT_SECRET`) is untouched.

## Test the risk calculator

1. Log in as two users in two browser windows, chat between them.
2. Watch the badge under the contact's name in the chat header — starts "Low Risk".
3. To see it change fast in a demo, temporarily lower the thresholds in
   `backend/utils/riskCalculator.js`, restart the backend, and send a
   few messages.
4. Visit `/dashboard` while logged in to see every conversation ranked by risk.

## Test calling

1. Log in as two different users in **two separate browsers** (not
   two tabs of the same browser — some browsers restrict camera/mic
   access when a tab isn't focused, and you want to see both sides).
2. Both need to allow camera/microphone permission when the browser prompts.
3. On User A's screen, open the chat with User B and click the phone
   or video icon in the header.
4. User B should see a full-screen incoming-call overlay with Accept/Decline.
5. Accept — both sides should see/hear each other. Test mute, camera
   toggle (video calls), and end call.

### Important: HTTPS / localhost requirement
Browsers only allow `getUserMedia` (camera/mic access) on `localhost`
or over HTTPS — never on plain HTTP over a network IP. So:
- Testing on the same machine: `http://localhost:5173` works fine for both windows.
- Testing across two different computers on your network/campus wifi:
  you'll need to serve the frontend over HTTPS (e.g. a Vite HTTPS
  dev-server config, or a tunneling tool like ngrok) or the call
  buttons will fail with a permissions error before even reaching the
  other side.

### Why a call might not connect
- **"User is offline"** — the other user isn't logged in / socket not connected.
- **Call rings but no audio/video after accept** — usually a NAT/firewall
  issue. This build uses a public STUN server only (no TURN server),
  which is enough on the same wifi/network but can fail across strict
  corporate or campus networks. For a class demo, same-network testing
  is the safe bet.
- **Permission denied** — camera/mic blocked in browser settings for that site.

## Tuning risk thresholds

All thresholds live in `backend/utils/riskCalculator.js`
(`FREQUENCY_THRESHOLDS`, `LATE_NIGHT_THRESHOLDS`, `STREAK_THRESHOLDS`,
and the late-night hour window). Adjust based on your Phase-3 testing.

## Still open (say the word and I'll build it)

- Separate guardian/parent role so risk alerts go to a monitor account
  instead of both chat participants
- Trend chart on the risk dashboard using the `history` array already
  stored in each RiskScore document
- TURN server config for reliable cross-network calling
- Missed-call notifications / call history log
