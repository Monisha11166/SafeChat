/**
 * Demo data generator for the Safety Dashboard.
 * ------------------------------------------------
 * Creates 5 fake contacts (arjun_22, kavya_r, rohit_m, sneha_p, priya_s)
 * and backdated messages between them and a "main" account, so the risk
 * calculator shows High / Medium / Low cases immediately - no need to
 * exchange thousands of real messages.
 *
 * Only message METADATA matters (timestamps, sender/receiver). The text is
 * harmless filler and is never read by the risk engine.
 *
 * USAGE (from the backend folder)
 *   node scripts/seedDemoData.js
 *       -> creates a ready-made main account:  demo_user / Demo@1234
 *
 *   node scripts/seedDemoData.js Monisha
 *       -> attaches the demo chats to YOUR existing account
 *          (username, email or phone)
 *
 * OPTIONAL FLAGS
 *   --guardian-email=parent@gmail.com   guardian email for the main account
 *   --guardian-phone=9876543210         guardian phone for the main account
 *
 * Safe to re-run: previous demo chats/alerts for the main account are
 * cleared first, so the numbers are the same every time.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const User = require("../models/User");
const Message = require("../models/Message");
const RiskScore = require("../models/RiskScore");
const AlertLog = require("../models/AlertLog");
const Contact = require("../models/Contact");
const riskService = require("../services/riskService");
const { calculateRisk } = require("../utils/riskCalculator");
const { maybeAlertGuardians } = require("../services/alertService");
const { parseIdentifier, normalizePhone, normalizeEmail } = require("../utils/contact");
const { buildTimestamps } = require("../utils/demoTimestamps");
const { encryptText } = require("../utils/messageCrypto");

const DEMO_PASSWORD = "Demo@1234";

const MAIN_DEFAULT = {
  username: "demo_user",
  email: "demo.user@safechat.demo",
  phone: "+919000000000",
  guardianEmail: "guardian.demo@safechat.demo",
};

// Tuned against utils/riskCalculator.js  (Low 0-3, Medium 4-6, High 7+)
const SCENARIOS = [
  {
    username: "arjun_22",
    email: "arjun22@demo.safechat",
    phone: "+919000000001",
    guardianEmail: "parent.arjun@demo.safechat",
    guardianPhone: "+919111100001",
    label: "High   - very frequent + late-night + long streak",
    messageCount24h: 58,
    lateNightCount24h: 7,
    activeDaysStreak: 12,
    // Demonstrates the context-aware alert: an ordinary admin word in the
    // mix changes the guardian's alert wording to a calmer "ask what's
    // going on" instead of a flat "high risk" with no explanation.
    triggerMessage: "heard arjun got suspended today after that fight, is he ok?",
  },
  {
    username: "kavya_r",
    email: "kavya.r@demo.safechat",
    phone: "+919000000002",
    guardianEmail: "parent.kavya@demo.safechat",
    guardianPhone: "+919111100002",
    // Demonstrates multi-language alerts - this guardian's email/SMS
    // will be written in Hindi (see utils/alertI18n.js).
    guardianPreferredLanguage: "hi",
    label: "Medium - frequent messaging, one late-night",
    messageCount24h: 26,
    lateNightCount24h: 1,
    activeDaysStreak: 6,
    // Demonstrates the "caution word" wording - language sometimes
    // associated with secrecy/in-person meetups.
    triggerMessage: "meet me after school near the gate, don't tell anyone ok?",
  },
  {
    username: "rohit_m",
    email: "rohit.m@demo.safechat",
    phone: "+919000000003",
    guardianEmail: "parent.rohit@demo.safechat",
    guardianPhone: "+919111100003",
    // Demonstrates multi-language alerts - this guardian's email/SMS
    // will be written in Kannada.
    guardianPreferredLanguage: "kn",
    label: "Medium - driven by a very long day-streak",
    messageCount24h: 12,
    lateNightCount24h: 0,
    activeDaysStreak: 14,
  },
  {
    username: "sneha_p",
    email: "sneha.p@demo.safechat",
    phone: "+919000000004",
    guardianEmail: "parent.sneha@demo.safechat",
    guardianPhone: "+919111100004",
    label: "Low    - light, ordinary chat",
    messageCount24h: 8,
    lateNightCount24h: 0,
    activeDaysStreak: 3,
  },
  {
    username: "priya_s",
    email: "priya.s@demo.safechat",
    phone: "+919000000005",
    guardianEmail: "parent.priya@demo.safechat",
    guardianPhone: "+919111100005",
    label: "Low    - brand-new conversation",
    messageCount24h: 3,
    lateNightCount24h: 0,
    activeDaysStreak: 1,
  },
];

const FILLER = ["hey", "what's up?", "lol same", "did you see that", "haha ok",
  "brb", "sure, sounds good", "wyd", "ok cool", "nice"];
const filler = () => FILLER[Math.floor(Math.random() * FILLER.length)];

/* ---------------- helpers ---------------- */

function parseArgs() {
  const flags = {};
  let identifier = null;
  for (const a of process.argv.slice(2)) {
    if (a.startsWith("--")) {
      const [k, ...v] = a.slice(2).split("=");
      flags[k] = v.join("=");
    } else if (!identifier) {
      identifier = a;
    }
  }
  return { identifier, flags };
}

/**
 * Real trend line: replay the conversation in 8 steps and run the actual
 * calculator on each growing slice of messages.
 */
function buildHistory(timestamps) {
  const steps = 8;
  const points = [];
  for (let s = 1; s <= steps; s++) {
    const k = Math.max(1, Math.ceil((timestamps.length * s) / steps));
    const slice = timestamps.slice(0, k).map((createdAt) => ({ createdAt }));
    const { score, level } = calculateRisk(slice);
    points.push({ score, level, calculatedAt: timestamps[k - 1] });
  }
  return points;
}

async function findExisting(identifier) {
  const p = parseIdentifier(identifier);
  let filter;
  if (p.type === "email") filter = { email: p.value };
  else if (p.type === "username") filter = { username: new RegExp(`^${identifier}$`, "i") };
  else filter = { phone: new RegExp(`${identifier.replace(/\D/g, "").slice(-10)}$`) };
  return User.findOne(filter).select("+guardianEmail +guardianPhone +guardianPreferredLanguage");
}

async function ensureUser(def) {
  const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);
  await User.updateOne(
    { email: def.email },
    {
      $setOnInsert: {
        username: def.username,
        email: def.email,
        phone: def.phone,
        password: hashed,
        role: "user",
        guardianEmail: def.guardianEmail || "",
        guardianPhone: def.guardianPhone || "",
        guardianPreferredLanguage: def.guardianPreferredLanguage || "en",
        profilePic: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          def.username
        )}&backgroundType=gradientLinear`,
      },
    },
    { upsert: true }
  );
  // Backfill guardian contact on accounts that already existed from a
  // previous run (before this field was added), without overwriting
  // anything the person may have set manually.
  const user = await User.findOne({ email: def.email }).select("+guardianEmail +guardianPhone +guardianPreferredLanguage");
  const fill = {};
  if (!user.guardianEmail && def.guardianEmail) fill.guardianEmail = def.guardianEmail;
  if (!user.guardianPhone && def.guardianPhone) fill.guardianPhone = def.guardianPhone;
  if (
    def.guardianPreferredLanguage &&
    (!user.guardianPreferredLanguage || user.guardianPreferredLanguage === "en") &&
    def.guardianPreferredLanguage !== "en"
  ) {
    fill.guardianPreferredLanguage = def.guardianPreferredLanguage;
  }
  if (Object.keys(fill).length) {
    await User.updateOne({ _id: user._id }, { $set: fill });
    Object.assign(user, fill);
  }
  return user;
}

/**
 * Creates (or reuses) a real, loggable GUARDIAN account for a demo
 * parent's email/phone, so "log in as the parent" is an actual thing you
 * can do, not just a preview. It's automatically linked to the child via
 * matching contact details — no code/invite needed, same as production.
 */
async function ensureGuardianAccount(name, email, phone, preferredLanguage = "en") {
  const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);
  await User.updateOne(
    { email },
    {
      $setOnInsert: {
        username: name,
        email,
        phone: phone || "",
        password: hashed,
        role: "guardian",
        preferredLanguage,
        profilePic: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          name
        )}&backgroundType=gradientLinear`,
      },
    },
    { upsert: true }
  );
}

/** Makes two accounts show up in each other's chat/contact list. */
async function linkContacts(userId, contactId) {
  await Contact.updateOne({ userId, contactId }, { $setOnInsert: { userId, contactId } }, { upsert: true });
  await Contact.updateOne(
    { userId: contactId, contactId: userId },
    { $setOnInsert: { userId: contactId, contactId: userId } },
    { upsert: true }
  );
}

/* ---------------- main ---------------- */

(async () => {
  const { identifier, flags } = parseArgs();

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Database:", mongoose.connection.name, "\n");

  // One-time repair: earlier versions of this script created demo accounts
  // via an upsert that never wrote a `role` field at all (MongoDB doesn't
  // fill in schema defaults on its own), so those accounts were invisible
  // to anything that filters by role ("user"/"guardian") - including the
  // real parent dashboard. This patches any such account found, so you
  // don't need to wipe and reseed just to pick up this fix.
  const repaired = await User.updateMany(
    { role: { $exists: false }, email: { $regex: /@(demo\.safechat|safechat\.demo)$/ } },
    { $set: { role: "user" } }
  );
  if (repaired.modifiedCount > 0) {
    console.log(`Repaired ${repaired.modifiedCount} demo account(s) missing a role field.\n`);
  }

  // ---- main account ----
  let main;
  if (identifier) {
    main = await findExisting(identifier);
    if (!main) {
      console.log(`No account found for "${identifier}".`);
      console.log("Register it first, or run without a name to auto-create demo_user.");
      await mongoose.disconnect();
      return;
    }
  } else {
    main = await ensureUser(MAIN_DEFAULT);
    if (!main.guardianEmail && !main.guardianPhone) {
      main.guardianEmail = MAIN_DEFAULT.guardianEmail;
      await main.save();
    }
  }

  // Optional guardian flags
  let changed = false;
  if (flags["guardian-email"]) {
    main.guardianEmail = normalizeEmail(flags["guardian-email"]);
    changed = true;
  }
  if (flags["guardian-phone"]) {
    main.guardianPhone = normalizePhone(flags["guardian-phone"]);
    changed = true;
  }
  if (changed) await main.save();

  // Create a REAL, loggable guardian account for the main account's
  // guardian contact (only when it's a fresh/default demo address —
  // never for a real person's email entered via --guardian-email).
  if (main.guardianEmail === MAIN_DEFAULT.guardianEmail) {
    await ensureGuardianAccount("Demo Guardian", MAIN_DEFAULT.guardianEmail, "");
  }

  console.log(`Main account : ${main.username}  (${main.email})`);
  if (!identifier) console.log(`Login        : demo.user@safechat.demo  /  ${DEMO_PASSWORD}   (or username: demo_user)`);
  console.log(
    `Guardian     : ${main.guardianEmail || "-"} / ${main.guardianPhone || "-"}` +
      (!main.guardianEmail && !main.guardianPhone
        ? "   <-- none set: alerts will be skipped (add --guardian-email=...)"
        : "")
  );
  console.log("");

  // ---- wipe previous demo data for this account ----
  const contactEmails = SCENARIOS.map((s) => s.email);
  const existingContacts = await User.find({ email: { $in: contactEmails } }).select("_id");
  const contactIds = existingContacts.map((c) => c._id);
  if (contactIds.length) {
    await Message.deleteMany({
      $or: [
        { senderId: main._id, receiverId: { $in: contactIds } },
        { receiverId: main._id, senderId: { $in: contactIds } },
      ],
    });
    await RiskScore.deleteMany({
      $or: [
        { userA: main._id, userB: { $in: contactIds } },
        { userB: main._id, userA: { $in: contactIds } },
      ],
    });
  }
  await AlertLog.deleteMany({ childId: main._id });

  // ---- create the 5 conversations ----
  for (const sc of SCENARIOS) {
    const contact = await ensureUser(sc);
    await linkContacts(main._id, contact._id);

    // Real, loggable guardian account for this contact too, so you can
    // demo "log in as Arjun's parent" and see it land automatically.
    if (sc.guardianEmail) {
      await ensureGuardianAccount(
        `${sc.username}'s guardian`,
        sc.guardianEmail,
        sc.guardianPhone,
        sc.guardianPreferredLanguage || "en"
      );
    }

    const timestamps = buildTimestamps(sc);
    const lastIndex = timestamps.length - 1;
    const docs = timestamps.map((createdAt, i) => {
      const fromMain = Math.random() < 0.5;
      // Put the trigger phrase (if any) on the single most recent message,
      // so it falls inside the "last 24h" window the alert scan checks.
      const message = sc.triggerMessage && i === lastIndex ? sc.triggerMessage : filler();
      return {
        senderId: fromMain ? main._id : contact._id,
        receiverId: fromMain ? contact._id : main._id,
        // Encrypted at rest, same as real chat messages - see utils/messageCrypto.js
        message: encryptText(message),
        file: "",
        fileType: "",
        delivered: true,
        read: true,
        createdAt,
        updatedAt: createdAt,
      };
    });

    // Native insert keeps our backdated createdAt (Mongoose would overwrite it).
    await mongoose.connection.collection("messages").insertMany(docs);

    let riskDoc = await riskService.recalculateRiskForPair(main._id, contact._id);

    // Real trend for the dashboard sparkline
    const history = buildHistory(timestamps);
    history.push({ score: riskDoc.score, level: riskDoc.level, calculatedAt: new Date() });
    await RiskScore.updateOne({ _id: riskDoc._id }, { $set: { history } });
    riskDoc = await RiskScore.findById(riskDoc._id);

    console.log(
      `  ${sc.username.padEnd(9)} ${String(riskDoc.level).padEnd(6)} ` +
        `${String(riskDoc.score).padStart(2)}/10   ${sc.label}\n` +
        `             guardian: ${contact.guardianEmail || "-"} / ${contact.guardianPhone || "-"}` +
        (sc.guardianPreferredLanguage && sc.guardianPreferredLanguage !== "en"
          ? `  [alerts in: ${sc.guardianPreferredLanguage}]`
          : "") +
        (sc.triggerMessage ? `\n             trigger message: "${sc.triggerMessage}"` : "")
    );

    await maybeAlertGuardians(riskDoc);
  }

  console.log("\nDone. Log in and open the Safety Dashboard.");
  console.log(`Contact logins (any of them): password ${DEMO_PASSWORD}`);
  console.log("\nGuardian (parent) logins — these are REAL accounts you can sign in with:");
  if (main.guardianEmail === MAIN_DEFAULT.guardianEmail) {
    console.log(`  ${MAIN_DEFAULT.guardianEmail}  /  ${DEMO_PASSWORD}   (sees: ${main.username})`);
  }
  for (const sc of SCENARIOS) {
    const langNote = sc.guardianPreferredLanguage && sc.guardianPreferredLanguage !== "en"
      ? `   [${sc.guardianPreferredLanguage}]`
      : "";
    console.log(`  ${sc.guardianEmail}  /  ${DEMO_PASSWORD}   (sees: ${sc.username})${langNote}`);
  }
  console.log("\nLog in at /login with any guardian email above -> lands on /guardian-dashboard.");
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error("Seed failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
