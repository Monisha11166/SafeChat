const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

// Mints short-lived TURN credentials from Cloudflare Realtime TURN.
// TURN_KEY_ID and TURN_KEY_API_TOKEN stay on the server; the browser only
// ever receives credentials that expire (TTL below).
router.get("/ice", authMiddleware, async (req, res) => {
  // ---- Metered (preferred when configured) ----
  // METERED_APP_NAME: the part before ".metered.live" in your dashboard
  //                   (e.g. "safechat" for safechat.metered.live)
  // METERED_API_KEY:  the API key shown in the Metered TURN dashboard
  if (process.env.METERED_APP_NAME && process.env.METERED_API_KEY) {
    try {
      const app = process.env.METERED_APP_NAME.replace(/\.metered\.live.*$/i, "");
      const r = await fetch(
        `https://${app}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(
          process.env.METERED_API_KEY
        )}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!r.ok) {
        console.error("Metered TURN error:", r.status);
        return res.status(502).json({ message: "Could not get TURN credentials" });
      }
      const iceServers = await r.json();
      if (!Array.isArray(iceServers) || !iceServers.length) {
        return res.status(502).json({ message: "Metered returned no servers" });
      }
      return res.json({ iceServers });
    } catch (err) {
      console.error("Metered TURN request failed:", err.message);
      return res.status(502).json({ message: "Could not get TURN credentials" });
    }
  }

  // ---- Cloudflare (fallback) ----
  const keyId = process.env.TURN_KEY_ID;
  const token = process.env.TURN_KEY_API_TOKEN;

  if (!keyId || !token) {
    return res.status(503).json({ message: "TURN not configured" });
  }

  try {
    const r = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: 86400 }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!r.ok) {
      console.error("Cloudflare TURN error:", r.status);
      return res.status(502).json({ message: "Could not get TURN credentials" });
    }

    const data = await r.json();
    const list = Array.isArray(data.iceServers)
      ? data.iceServers
      : data.iceServers
      ? [data.iceServers]
      : [];

    // Port 53 is blocked by browsers and would only add a timeout delay.
    const iceServers = list.map((s) => ({
      ...s,
      urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter(
        (u) => !/:53(\?|$)/.test(u)
      ),
    }));

    res.json({ iceServers });
  } catch (err) {
    console.error("TURN credential request failed:", err.message);
    res.status(502).json({ message: "Could not get TURN credentials" });
  }
});

module.exports = router;
