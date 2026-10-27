/**
 * Emergency password reset from the command line — no email/SMS needed.
 * Useful while SMTP/Twilio aren't configured yet (demo mode).
 *
 * Run from the backend folder:
 *   node scripts/resetPasswordCli.js <email-or-phone-or-username> <newPassword>
 *
 * Example:
 *   node scripts/resetPasswordCli.js Monisha Moni@2005
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const { parseIdentifier } = require("../utils/contact");

const [, , identifier, newPassword] = process.argv;

if (!identifier || !newPassword) {
  console.log("Usage: node scripts/resetPasswordCli.js <email-or-phone-or-username> <newPassword>");
  process.exit(1);
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const parsed = parseIdentifier(identifier);
  let filter;
  if (parsed.type === "email") filter = { email: parsed.value };
  else if (parsed.type === "username") filter = { username: new RegExp(`^${identifier}$`, "i") };
  else filter = { phone: new RegExp(`${identifier.replace(/\D/g, "").slice(-10)}$`) };

  const user = await User.findOne(filter);

  if (!user) {
    console.log("No user matched:", identifier);
  } else {
    user.password = await bcrypt.hash(newPassword.trim(), 10);
    await user.save();
    console.log(`Password updated for ${user.username} (${user.email}).`);
  }

  await mongoose.disconnect();
})();
