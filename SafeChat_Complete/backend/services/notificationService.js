/**
 * Notification service - email (SMTP via nodemailer) and SMS (Twilio REST).
 *
 * Every function resolves to { status, error? } and NEVER throws, so a
 * provider outage can't break chat, login or password reset.
 *
 *   status = "sent"       -> accepted by the provider
 *   status = "simulated"  -> provider not configured; message printed to the
 *                            server console (handy for demos / development)
 *   status = "failed"     -> provider returned an error
 */

let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch (e) {
  console.warn("⚠️  nodemailer not installed - emails will be simulated. Run: npm install");
}

let transporter = null;

// Brevo sends over HTTPS (port 443), so it works on hosts that block the
// SMTP ports (e.g. Render's free tier). Preferred when BREVO_API_KEY is set.
function brevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
}

function emailConfigured() {
  if (brevoConfigured()) return true;
  return Boolean(
    nodemailer &&
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

// Fast2SMS (India). Preferred for +91 numbers when FAST2SMS_API_KEY is set.
function fast2smsConfigured() {
  return Boolean(process.env.FAST2SMS_API_KEY);
}

// Returns the 10-digit Indian mobile number for "+918861369152", "918861369152",
// "08861369152" or "8861369152"; null if it isn't an Indian mobile number.
function toIndianMobile(to) {
  const digits = String(to || "").replace(/\D/g, "");
  const m = digits.match(/^(?:91|0)?([6-9]\d{9})$/);
  return m ? m[1] : null;
}

function smsConfigured() {
  if (fast2smsConfigured()) return true;
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM
  );
}

function getTransporter() {
  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT || 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // true for 465, false for 587 (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

function simulate(kind, to, content) {
  console.log(
    `\n📨 [SIMULATED ${kind.toUpperCase()}] provider not configured in .env\n` +
      `   To: ${to}\n` +
      content
        .split("\n")
        .map((l) => `   ${l}`)
        .join("\n") +
      "\n"
  );
  return { status: "simulated" };
}

async function sendEmail({ to, subject, text, html }) {
  if (!to) return { status: "failed", error: "No email address" };

  if (!emailConfigured()) {
    return simulate("email", to, `Subject: ${subject}\n${text}`);
  }

  if (brevoConfigured()) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: process.env.BREVO_SENDER_NAME || "SafeChat",
            email: process.env.BREVO_SENDER_EMAIL,
          },
          to: [{ email: to }],
          subject,
          textContent: text,
          ...(html ? { htmlContent: html } : {}),
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.message || `Brevo HTTP ${res.status}`;
        console.error("Email send failed (Brevo):", msg);
        return { status: "failed", error: msg };
      }
      return { status: "sent" };
    } catch (err) {
      console.error("Email send failed (Brevo):", err.message);
      return { status: "failed", error: err.message };
    }
  }

  try {
    await getTransporter().sendMail({
      from: process.env.MAIL_FROM || `SafeChat <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    return { status: "sent" };
  } catch (err) {
    console.error("Email send failed:", err.message);
    return { status: "failed", error: err.message };
  }
}

async function sendViaFast2SMS(mobile, body) {
  try {
    // Non-English text (Hindi, Kannada...) must be sent as unicode.
    const isUnicode = /[^\x00-\x7F]/.test(body);
    const form = new URLSearchParams({
      route: process.env.FAST2SMS_ROUTE || "q", // "q" = Quick SMS (no DLT template)
      message: body,
      language: isUnicode ? "unicode" : "english",
      numbers: mobile,
      flash: "0",
    });

    const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: process.env.FAST2SMS_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.return === false) {
      const msg = Array.isArray(data.message) ? data.message.join(", ") : data.message;
      const err = msg || `Fast2SMS HTTP ${res.status}`;
      console.error("SMS send failed (Fast2SMS):", err);
      return { status: "failed", error: err };
    }
    return { status: "sent" };
  } catch (err) {
    console.error("SMS send failed (Fast2SMS):", err.message);
    return { status: "failed", error: err.message };
  }
}

function twilioConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM
  );
}

async function sendViaTwilio(to, body) {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const auth = Buffer.from(
      `${sid}:${process.env.TWILIO_AUTH_TOKEN}`
    ).toString("base64");

    const form = new URLSearchParams({
      To: to,
      From: process.env.TWILIO_FROM,
      Body: body,
    });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
        signal: AbortSignal.timeout(15000),
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Twilio error codes explain most failures, e.g.
      //  21608 = trial account: number not verified
      //  21211 = invalid "To" number, 20003 = wrong SID/token
      const msg = `${data.message || "Twilio HTTP " + res.status}${
        data.code ? " (code " + data.code + ")" : ""
      }`;
      console.error("SMS send failed (Twilio):", msg);
      return { status: "failed", error: msg };
    }

    console.log(`SMS accepted by Twilio: sid=${data.sid} status=${data.status}`);
    return { status: "sent" };
  } catch (err) {
    console.error("SMS send failed (Twilio):", err.message);
    return { status: "failed", error: err.message };
  }
}

async function sendSMS({ to, body }) {
  if (!to) return { status: "failed", error: "No phone number" };

  if (!smsConfigured()) {
    return simulate("sms", to, body);
  }

  let fast2smsError = null;

  // Indian numbers -> Fast2SMS first.
  if (fast2smsConfigured()) {
    const mobile = toIndianMobile(to);
    if (mobile) {
      const r = await sendViaFast2SMS(mobile, body);
      if (r.status === "sent") return r;
      fast2smsError = r.error;
      // Fast2SMS failed (e.g. wallet empty / account not verified):
      // fall back to Twilio if it is configured, so the demo still works.
      if (!twilioConfigured()) return r;
      console.warn("Fast2SMS failed, falling back to Twilio:", fast2smsError);
    } else if (!twilioConfigured()) {
      return { status: "failed", error: "Fast2SMS only supports Indian (+91) numbers" };
    }
  }

  const r = await sendViaTwilio(to, body);
  if (r.status === "failed" && fast2smsError) {
    r.error = `Fast2SMS: ${fast2smsError} | Twilio: ${r.error}`;
  }
  return r;
}

module.exports = {
  sendEmail,
  sendSMS,
  emailConfigured,
  smsConfigured,
};
