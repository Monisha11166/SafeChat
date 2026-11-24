// Quick SMS check - run from the backend folder:
//   node scripts/testSms.js +918792471514
// It loads your .env, sends one SMS and prints the REAL provider error,
// so you can see exactly why SMS fails (wrong key, unverified number...).
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { sendSMS, smsConfigured } = require("../services/notificationService");

(async () => {
  const to = process.argv[2];
  if (!to) {
    console.log("Usage: node scripts/testSms.js +91XXXXXXXXXX");
    process.exit(1);
  }
  console.log("FAST2SMS_API_KEY set:", Boolean(process.env.FAST2SMS_API_KEY));
  console.log("TWILIO set:", Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM));
  console.log("smsConfigured():", smsConfigured());
  const r = await sendSMS({ to, body: "SafeChat test SMS - if you read this, SMS works." });
  console.log("RESULT:", r);
  process.exit(0);
})();
