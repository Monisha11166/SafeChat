/**
 * One-time migration: converts phone numbers of accounts created with the
 * old version (e.g. "8792471514") into the new format ("+918792471514").
 *
 * Run once from the backend folder:   node scripts/normalizePhones.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const { normalizePhone, isValidPhone } = require("../utils/contact");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const users = await User.find({ phone: { $ne: "" } });
  let changed = 0;

  for (const u of users) {
    const fixed = normalizePhone(u.phone);
    if (fixed && isValidPhone(fixed) && fixed !== u.phone) {
      console.log(`${u.username}: ${u.phone} -> ${fixed}`);
      u.phone = fixed;
      await u.save();
      changed++;
    }
  }

  console.log(`Done. Updated ${changed} user(s).`);
  await mongoose.disconnect();
})();
