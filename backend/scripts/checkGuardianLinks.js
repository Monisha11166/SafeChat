/**
 * Diagnostic: for every account, shows exactly what guardian contact
 * info is stored, and whether it matches a real guardian account.
 * Helps debug "no child account is linked" on the parent dashboard.
 *
 * Run from the backend folder:   node scripts/checkGuardianLinks.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Database:", mongoose.connection.name, "\n");

  const children = await User.find({ role: "user" }).select(
    "username email +guardianEmail +guardianPhone"
  );
  const guardians = await User.find({ role: "guardian" }).select("username email phone");
  const guardianEmails = new Set(guardians.map((g) => g.email));

  console.log("CHILD ACCOUNTS:");
  console.table(
    children.map((c) => ({
      username: c.username,
      guardianEmail: c.guardianEmail || "(none)",
      matchesRealGuardianAccount: guardianEmails.has(c.guardianEmail) ? "YES" : "NO",
    }))
  );

  console.log("\nGUARDIAN ACCOUNTS:");
  console.table(guardians.map((g) => ({ username: g.username, email: g.email })));

  await mongoose.disconnect();
})();
