/**
 * Helpers for validating / normalising email addresses and phone numbers.
 * Phone numbers are stored in E.164 format (+919876543210) so that
 * login, forgot-password and SMS sending all agree on one representation.
 */

const defaultCountryCode = () => process.env.DEFAULT_COUNTRY_CODE || "+91";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return EMAIL_REGEX.test(normalizeEmail(value));
}

/**
 * "98765 43210"      -> "+919876543210"  (uses DEFAULT_COUNTRY_CODE)
 * "09876543210"      -> "+919876543210"
 * "+1 (415) 555-0100" -> "+14155550100"
 * Returns "" when the input is empty / cannot be a phone number.
 */
function normalizePhone(value) {
  let raw = String(value || "").trim();
  if (!raw) return "";

  const hasPlus = raw.startsWith("+");
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  if (hasPlus) return `+${digits}`;

  // Strip a leading trunk "0" (e.g. 09876543210)
  digits = digits.replace(/^0+/, "");

  // 10 digits -> local number, add default country code
  if (digits.length === 10) {
    return `${defaultCountryCode()}${digits}`;
  }

  // Already has country code but user forgot the "+"
  return `+${digits}`;
}

function isValidPhone(value) {
  return /^\+\d{10,15}$/.test(normalizePhone(value));
}

/** Decide whether a login/reset identifier is an email or a phone number. */
function parseIdentifier(value) {
  const raw = String(value || "").trim();
  if (!raw) return { type: null, value: "" };

  if (raw.includes("@")) {
    return { type: "email", value: normalizeEmail(raw) };
  }
  // Contains letters (and no @) -> treat as a username, e.g. "Monisha"
  if (/[a-zA-Z]/.test(raw)) {
    return { type: "username", value: raw };
  }
  return { type: "phone", value: normalizePhone(raw) };
}

/** Masking for display: r***@gmail.com / +91******3210 */
function maskEmail(email) {
  if (!email) return "";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name.charAt(0)}${"*".repeat(Math.max(name.length - 1, 2))}@${domain}`;
}

function maskPhone(phone) {
  if (!phone) return "";
  return `${phone.slice(0, 3)}${"*".repeat(Math.max(phone.length - 7, 3))}${phone.slice(-4)}`;
}

module.exports = {
  normalizeEmail,
  isValidEmail,
  normalizePhone,
  isValidPhone,
  parseIdentifier,
  maskEmail,
  maskPhone,
};
