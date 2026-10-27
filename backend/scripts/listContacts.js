/**
 * Diagnostic: shows every contact link in the database, so you can see
 * whether an account's chat sidebar SHOULD have anything in it.
 *
 * Run from the backend folder:   node scripts/listContacts.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Contact = require("../models/Contact");
const User = require("../models/User");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Database:", mongoose.connection.name);

  const contacts = await Contact.find({})
    .populate("userId", "username email")
    .populate("contactId", "username email")
    .lean();

  if (!contacts.length) {
    console.log("\nNo contact links exist at all. Chat sidebars will be empty for everyone.");
    console.log("Run: node scripts/seedDemoData.js   (then check again)");
  } else {
    console.table(
      contacts.map((c) => ({
        owner: c.userId?.username || "(deleted user)",
        sees_in_sidebar: c.contactId?.username || "(deleted user)",
      }))
    );
  }

  await mongoose.disconnect();
})();
