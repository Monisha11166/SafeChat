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

function emailConfigured() {
  return Boolean(
    nodemailer &&
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

function smsConfigured() {
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

async function sendSMS({ to, body }) {
  if (!to) return { status: "failed", error: "No phone number" };

  if (!smsConfigured()) {
    return simulate("sms", to, body);
  }

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

    // Node 18+ has global fetch - no extra dependency required.
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data.message || `Twilio HTTP ${res.status}`;
      console.error("SMS send failed:", msg);
      return { status: "failed", error: msg };
    }

    return { status: "sent" };
  } catch (err) {
    console.error("SMS send failed:", err.message);
    return { status: "failed", error: err.message };
  }
}

module.exports = {
  sendEmail,
  sendSMS,
  emailConfigured,
  smsConfigured,
};
