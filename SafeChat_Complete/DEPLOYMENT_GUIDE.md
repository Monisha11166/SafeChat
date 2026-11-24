# Getting SafeChat onto a real domain (e.g. safechat.com)

Three separate things need to happen: buy a domain, host the app
somewhere, then point the domain at that hosting.

## 1. Buy a domain
Namecheap, GoDaddy, or similar — roughly ₹700-1500/year for a `.com`.
For a college project, consider a free option instead:
a Vercel/Render subdomain (e.g. `safechat.vercel.app`) costs nothing and
is enough to demo and share.

## 2. Host each piece
| Part | Where | Notes |
|---|---|---|
| Frontend (React) | Vercel or Netlify | Connect your GitHub repo, auto-deploys on push |
| Backend (Node/Express) | Render or Railway | Also connects to GitHub |
| Database | MongoDB Atlas (free tier) | Get a `mongodb+srv://...` connection string |

## 3. Backend environment variables (set these on Render/Railway)
Copy every value from your local `backend/.env`, but update:
- `MONGO_URI` → your MongoDB Atlas connection string (not localhost)
- `CLIENT_ORIGIN` → your deployed frontend's URL, e.g. `https://safechat.vercel.app`
  (this locks CORS down to just your real frontend instead of allowing
  any origin, which is important once this is public)
- Keep `MESSAGE_ENCRYPTION_KEY` exactly as-is — losing it makes old
  messages unreadable. Back it up somewhere safe.

## 4. Frontend environment variables (set these on Vercel/Netlify)
- `VITE_SERVER_ORIGIN` → your deployed backend's URL, e.g.
  `https://safechat-api.onrender.com` (no trailing slash)

(This required a small code fix — `services/api.js` and `socket.js` had
`http://localhost:5000` hard-coded. Both now read `VITE_SERVER_ORIGIN`
instead, falling back to localhost only when that variable isn't set, so
local development still works unchanged.)

## 5. Point your domain at it
- In Vercel/Netlify's dashboard: Settings → Domains → add your custom
  domain, they'll give you DNS records to add at your domain registrar.
- HTTPS is automatic on both platforms — no certificate setup needed.
- If you want `api.safechat.com` instead of the Render-given URL for the
  backend, same process on Render's dashboard.

## 6. A few things to tighten before it's genuinely public
- Rotate `JWT_SECRET` to something long and random (not `mysecretkey123`).
- Configure a real SMTP (Gmail app password) and/or Twilio account so
  alerts actually reach guardians instead of only logging to the console.
- Consider Atlas's IP allowlist / Render's static outbound IP so your
  database isn't open to the whole internet.
- The free tiers of Render/Railway "sleep" after inactivity — the first
  request after a while can take 10-30s to wake up. Fine for a demo, not
  for a real product.
