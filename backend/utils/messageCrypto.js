/**
 * Encryption at rest for chat message TEXT (AES-256-GCM).
 * -----------------------------------------------------------------------
 * Every message is encrypted before it touches the database and decrypted
 * only when returned to an authorized, authenticated participant of that
 * conversation (same auth checks as before - this adds a second layer on
 * top, it doesn't replace them).
 *
 * Key: MESSAGE_ENCRYPTION_KEY in .env, a 64-character hex string (32 raw
 * bytes). Generate one with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * If no key is configured, the app still runs (messages are stored in
 * plain text) so a fresh clone doesn't break — but a warning is printed
 * once, the same "demo mode" pattern used elsewhere in this project
 * (see notificationService.js). Set the key for a real deployment.
 *
 * Stored format: "enc:v1:<ivHex>:<authTagHex>:<ciphertextHex>"
 * Anything without that prefix is treated as legacy/unencrypted plain
 * text and returned as-is, so older seeded/demo data keeps working.
 */
const crypto = require("crypto");

const PREFIX = "enc:v1:";
const ALGO = "aes-256-gcm";

let warned = false;
function getKey() {
  const hex = process.env.MESSAGE_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    if (!warned) {
      console.warn(
        "⚠️  MESSAGE_ENCRYPTION_KEY not set (or not 64 hex chars) - chat messages " +
          "will be stored in PLAIN TEXT. Generate a key with:\n" +
          "    node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n" +
          "  and add it to backend/.env as MESSAGE_ENCRYPTION_KEY=<that value>"
      );
      warned = true;
    }
    return null;
  }
  return Buffer.from(hex, "hex");
}

function encryptText(plain) {
  const key = getKey();
  if (!key || plain == null || plain === "") return plain || "";

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

function decryptText(stored) {
  if (!stored || !stored.startsWith(PREFIX)) return stored || "";

  const key = getKey();
  if (!key) return "[message encrypted - server key missing]";

  try {
    const [ivHex, tagHex, dataHex] = stored.slice(PREFIX.length).split(":");
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]);
    return plain.toString("utf8");
  } catch (err) {
    console.error("Message decryption failed:", err.message);
    return "[message could not be decrypted]";
  }
}

module.exports = { encryptText, decryptText };
