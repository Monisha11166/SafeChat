/**
 * Diagnostic: shows exactly what is stored for each account so you can see
 * which email / phone / username to log in with.
 *
 * Run from the backend folder:   node scripts/listUsers.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Database:", mongoose.connection.name);

  const users = await User.find({}).select("username email phone createdAt");
  console.table(
    users.map((u) => ({
      username: u.username,
      email: u.email,
      phone: u.phone || "(empty)",
      created: u.createdAt?.toISOString().slice(0, 10),
    }))
  );

  await mongoose.disconnect();
})();
