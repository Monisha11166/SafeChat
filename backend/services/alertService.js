const User = require("../models/User");
const Message = require("../models/Message");
const RiskScore = require("../models/RiskScore");
const AlertLog = require("../models/AlertLog");
const { sendEmail, sendSMS } = require("./notificationService");
const { maskEmail, maskPhone } = require("../utils/contact");
const { scanForContext } = require("../utils/alertKeywords");
const { decryptText } = require("../utils/messageCrypto");
const { getLang } = require("../utils/alertI18n");

const RANK = { Low: 0, Medium: 1, High: 2 };

function esc(v) {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// Older RiskScore documents don't have lastAlertLevel in the DB at all;
// treat "missing" the same as "Low" when matching.
function levelMatch(level) {
  return level === "Low" ? { $in: ["Low", null] } : level;
}

function minLevel() {
  const v = process.env.RISK_ALERT_MIN_LEVEL || "Medium";
  return RANK[v] !== undefined ? v : "Medium";
}

function cooldownMs() {
  const hours = Number(process.env.RISK_ALERT_COOLDOWN_HOURS || 24);
  return (Number.isFinite(hours) ? hours : 24) * 60 * 60 * 1000;
}

/* ------------------------------------------------------------------ */
/* Message templates - contain behavioural signals only, never chat text */
/* ------------------------------------------------------------------ */

/**
 * Picks the right "suggested next step" sentence, in the guardian's
 * preferred language. `context` is the output of scanForContext() - a
 * couple of matched WORDS only, never the message itself. This is what
 * turns "High risk! Go check now" into something closer to "the word
 * 'suspended' came up - might be nothing, but worth asking about" versus
 * "mentions of meeting up/secrecy - take a closer look soon".
 */
function suggestedStep(childName, context, t) {
  const { contextWords = [], cautionWords = [] } = context || {};

  if (cautionWords.length) return t.stepCaution(childName, cautionWords[0]);
  if (contextWords.length) return t.stepContext(childName, contextWords[0]);
  return t.stepGeneric(childName);
}

function buildEmail({ childName, otherName, level, score, factors, context, lang = "en" }) {
  const t = getLang(lang);
  const f = factors || {};
  const subject = `SafeChat alert: ${level} risk activity on ${childName}'s account`;
  const step = suggestedStep(childName, context, t);

  const text =
    `${t.greeting}\n\n` +
    `This is an automated safety alert from SafeChat.\n\n` +
    `${t.reached(childName, otherName, level)} ${t.score(score)}.\n\n` +
    `${t.whatWeNoticed}\n` +
    ` - ${f.messageCount24h ?? 0} ${t.messages24h}\n` +
    ` - ${f.lateNightCount24h ?? 0} ${t.lateNightMsgs}\n` +
    ` - ${f.activeDaysStreak ?? 0} ${t.activeDays}\n\n` +
    `${t.privacyNote}\n\n` +
    `${step}\n\n` +
    `${t.signOff}`;

  const color = level === "High" ? "#dc2626" : "#d97706";
  const c = esc(childName);
  const o = esc(otherName);
  const stepHtml = esc(step);
  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    <div style="background:#0f172a;color:#fff;padding:18px 24px;font-size:18px;font-weight:600">🛡️ ${esc(t.title)}</div>
    <div style="padding:24px;color:#1e293b;line-height:1.55">
      <p>${esc(t.greeting)}</p>
      <p>${esc(t.reached(c, o, level))} ${esc(t.score(score))}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">${esc(t.messages24h)}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right"><b>${f.messageCount24h ?? 0}</b></td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">${esc(t.lateNightMsgs)}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right"><b>${f.lateNightCount24h ?? 0}</b></td></tr>
        <tr><td style="padding:8px">${esc(t.activeDays)}</td><td style="padding:8px;text-align:right"><b>${f.activeDaysStreak ?? 0}</b></td></tr>
      </table>
      <p style="font-size:13px;color:#64748b">${esc(t.privacyNote)}</p>
      <p>${stepHtml}</p>
    </div>
  </div>`;

  return {
    subject,
    text,
    html,
    summaryText: `${t.reached(childName, otherName, level)} ${t.score(score)}. ${step}`,
  };
}

function buildSms({ childName, otherName, level, score, factors, context, lang = "en" }) {
  const t = getLang(lang);
  const f = factors || {};
  const { contextWords = [], cautionWords = [] } = context || {};
  const hint = cautionWords[0] || contextWords[0];

  return (
    `${t.reached(childName, otherName, level)} ${t.score(score)}: ` +
    `${t.smsActivity(f.messageCount24h ?? 0, f.lateNightCount24h ?? 0)}. ` +
    (hint ? `${t.wordNoticed(hint)} ` : "") +
    t.pleaseTalk(childName)
  );
}

/* ------------------------------------------------------------------ */
/* Sending                                                             */
/* ------------------------------------------------------------------ */

/**
 * Send one alert (email and/or SMS, whichever guardian contacts exist)
 * for a single child, and log each attempt.
 */
/**
 * Fetches the last 24h of message TEXT between the two participants purely
 * to run the word-list scan, then immediately discards it - only the
 * matched words (from utils/alertKeywords.js) are kept and passed on.
 * Never stored, never emailed in full, never shown to the guardian.
 */
async function getRecentContext(childId, otherUserId) {
  if (!otherUserId) return { contextWords: [], cautionWords: [] };
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const docs = await Message.find({
      createdAt: { $gte: since },
      $or: [
        { senderId: childId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: childId },
      ],
    })
      .select("message")
      .limit(500)
      .lean();
    // Messages are encrypted at rest - decrypt in memory just long enough
    // to run the word-list check, then let it go out of scope.
    return scanForContext(docs.map((d) => decryptText(d.message)));
  } catch (err) {
    console.error("Context scan failed (alert will use generic wording):", err.message);
    return { contextWords: [], cautionWords: [] };
  }
}

async function sendGuardianAlert({
  child, // User doc with guardian fields selected
  otherUserId,
  otherName,
  level,
  score,
  factors,
  kind = "risk",
  context, // optional - pass pre-computed context to avoid re-scanning per guardian
}) {
  const ctx = context || (await getRecentContext(child._id, otherUserId));
  const lang = child.guardianPreferredLanguage || "en";
  const payload = { childName: child.username, otherName, level, score, factors, context: ctx, lang };
  const results = [];

  const base = {
    childId: child._id,
    otherUserId,
    otherUsername: otherName,
    level,
    score,
    kind,
  };

  if (child.guardianEmail) {
    const mail = buildEmail(payload);
    const r = await sendEmail({ to: child.guardianEmail, subject: mail.subject, text: mail.text, html: mail.html });
    results.push(
      await AlertLog.create({
        ...base,
        channel: "email",
        recipientMasked: maskEmail(child.guardianEmail),
        status: r.status,
        error: r.error || "",
        summaryText: mail.summaryText,
      })
    );
  }

  if (child.guardianPhone) {
    const body = buildSms(payload);
    const r = await sendSMS({ to: child.guardianPhone, body });
    results.push(
      await AlertLog.create({
        ...base,
        channel: "sms",
        recipientMasked: maskPhone(child.guardianPhone),
        status: r.status,
        error: r.error || "",
        summaryText: body,
      })
    );
  }

  return results;
}

/**
 * Called after every risk recalculation. Decides whether the guardians of
 * the two participants should be notified, and does so.
 *
 * Rules
 *  - level must be >= RISK_ALERT_MIN_LEVEL (default Medium)
 *  - alert when the level ESCALATES (Low->Medium, Medium->High) ...
 *  - ... or re-alert at the same level after RISK_ALERT_COOLDOWN_HOURS (24h)
 *  - if the level drops, the marker resets so a future rise alerts again
 */
async function maybeAlertGuardians(riskDoc) {
  const level = riskDoc.level;
  const prevLevel = riskDoc.lastAlertLevel || "Low";
  const prevAt = riskDoc.lastAlertAt || null;
  const now = new Date();

  // Below threshold: just reset the marker if the level fell.
  if (RANK[level] < RANK[minLevel()]) {
    if (prevLevel !== level) {
      await RiskScore.updateOne(
        { _id: riskDoc._id, lastAlertLevel: levelMatch(prevLevel) },
        { $set: { lastAlertLevel: level } }
      );
    }
    return { alerted: false };
  }

  const escalated = RANK[level] > RANK[prevLevel];
  const cooledDown = !prevAt || now - new Date(prevAt) >= cooldownMs();
  if (!escalated && !cooledDown) return { alerted: false };

  // Atomically "claim" this alert so two near-simultaneous messages
  // can't both send it.
  const claim = await RiskScore.updateOne(
    { _id: riskDoc._id, lastAlertLevel: levelMatch(prevLevel), lastAlertAt: prevAt },
    { $set: { lastAlertLevel: level, lastAlertAt: now } }
  );
  if (!claim.modifiedCount) return { alerted: false };

  const users = await User.find({
    _id: { $in: [riskDoc.userA, riskDoc.userB] },
  }).select("+guardianEmail +guardianPhone +guardianPreferredLanguage username");

  const byId = new Map(users.map((u) => [u._id.toString(), u]));
  const a = byId.get(riskDoc.userA.toString());
  const b = byId.get(riskDoc.userB.toString());

  // Same conversation either way round, so scan once and reuse for both
  // guardians' alerts instead of querying messages twice.
  const context = await getRecentContext(riskDoc.userA, riskDoc.userB);

  const jobs = [];
  if (a && (a.guardianEmail || a.guardianPhone)) {
    jobs.push(
      sendGuardianAlert({
        child: a,
        otherUserId: b?._id,
        otherName: b?.username || "another user",
        level,
        score: riskDoc.score,
        factors: riskDoc.factors,
        context,
      })
    );
  }
  if (b && (b.guardianEmail || b.guardianPhone)) {
    jobs.push(
      sendGuardianAlert({
        child: b,
        otherUserId: a?._id,
        otherName: a?.username || "another user",
        level,
        score: riskDoc.score,
        factors: riskDoc.factors,
        context,
      })
    );
  }

  await Promise.all(jobs);
  return { alerted: jobs.length > 0 };
}

module.exports = {
  maybeAlertGuardians,
  sendGuardianAlert,
};
