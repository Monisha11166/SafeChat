/**
 * Wipes all app data so you can start clean before seeding demo data.
 * Deletes every document in: users, messages, riskscores, alertlogs.
 * Does NOT drop the database itself or touch indexes/collections structure.
 *
 * Safety: requires --yes so it can't be run by accident.
 *
 * Run from the backend folder:
 *   node scripts/resetDatabase.js --yes
 */
require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../models/User");
const Message = require("../models/Message");
const RiskScore = require("../models/RiskScore");
const AlertLog = require("../models/AlertLog");

(async () => {
  if (!process.argv.includes("--yes")) {
    console.log(
      "This will permanently delete ALL users, messages, risk scores and alert logs.\n" +
        "Re-run with --yes to confirm:\n" +
        "  node scripts/resetDatabase.js --yes"
    );
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Database:", mongoose.connection.name);

  const results = await Promise.all([
    User.deleteMany({}),
    Message.deleteMany({}),
    RiskScore.deleteMany({}),
    AlertLog.deleteMany({}),
  ]);

  console.log(`Deleted ${results[0].deletedCount} users`);
  console.log(`Deleted ${results[1].deletedCount} messages`);
  console.log(`Deleted ${results[2].deletedCount} risk scores`);
  console.log(`Deleted ${results[3].deletedCount} alert logs`);
  console.log("\nDatabase is now empty. Register your account, then run seedDemoData.js.");

  await mongoose.disconnect();
})();
