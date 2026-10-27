const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const { sendEmail, sendSMS } = require("../services/notificationService");
const { sendGuardianAlert } = require("../services/alertService");
const {
  normalizeEmail,
  isValidEmail,
  normalizePhone,
  isValidPhone,
  parseIdentifier,
} = require("../utils/contact");

const OTP_TTL_MINUTES = 10;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const MIN_PASSWORD_LENGTH = 6;

/**
 * Find a user by email OR phone (whichever the identifier looks like).
 * `extraSelect` lets callers opt in to hidden fields, e.g. "+password".
 */
/**
 * Build a Mongo filter that matches a phone number however it was stored.
 * Accounts created with the older version saved the phone exactly as typed
 * ("8792471514"), while new accounts store E.164 ("+918792471514").
 * We match both, plus anything ending with the same last 10 digits.
 */
function phoneFilter(value) {
  const normalized = normalizePhone(value);
  const digits = String(value || "").replace(/\D/g, "");
  const last10 = digits.slice(-10);

  const candidates = [normalized, String(value || "").trim(), digits, last10].filter(Boolean);
  const clauses = [{ phone: { $in: [...new Set(candidates)] } }];

  if (last10.length === 10) {
    clauses.push({ phone: { $regex: `${last10}$` } });
  }
  return { $or: clauses };
}

/**
 * Find a user by email OR phone (whichever the identifier looks like).
 * `extraSelect` lets callers opt in to hidden fields, e.g. "+password".
 */
async function findByIdentifier(identifier, extraSelect = "") {
  const parsed = parseIdentifier(identifier);
  if (!parsed.type || !parsed.value) return null;

  let filter;
  if (parsed.type === "email") {
    filter = { email: parsed.value };
  } else if (parsed.type === "username") {
    const escaped = parsed.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter = { username: new RegExp(`^${escaped}$`, "i") };
  } else {
    filter = phoneFilter(identifier);
  }

  return User.findOne(filter).select(extraSelect);
}

/**
 * Validate + normalise the parent/guardian contact.
 * At least one of email / phone is required.
 * Returns { error } or { guardianEmail, guardianPhone }.
 */
function validateGuardian(body, own = {}) {
  const guardianEmail = normalizeEmail(body.guardianEmail);
  const guardianPhone = normalizePhone(body.guardianPhone);

  if (!guardianEmail && !guardianPhone) {
    return {
      error: "Parent/guardian email or phone number is required.",
    };
  }
  if (guardianEmail && !isValidEmail(guardianEmail)) {
    return { error: "Guardian email address is not valid." };
  }
  if (guardianPhone && !isValidPhone(guardianPhone)) {
    return {
      error:
        "Guardian phone number is not valid (use 10 digits or +countrycode).",
    };
  }
  if (guardianEmail && own.email && guardianEmail === own.email) {
    return { error: "Guardian email must be different from your own email." };
  }
  if (guardianPhone && own.phone && guardianPhone === own.phone) {
    return { error: "Guardian phone must be different from your own phone." };
  }

  return { guardianEmail, guardianPhone };
}

// ======================================
// TEST ROUTE
// GET /api/users/test
// ======================================
router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "User route is working",
  });
});

// ======================================
// REGISTER USER
// POST /api/users/register
// ======================================
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;

    // Validate required fields
    if (!username || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "Username, email, phone number and password are required.",
      });
    }

    const cleanEmail = normalizeEmail(email);
    const cleanPhone = normalizePhone(phone);

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (!isValidPhone(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phone number (10 digits or +countrycode).",
      });
    }

    if (String(password).trim().length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
    }

    // Parent / guardian contact (email and/or phone)
    const guardian = validateGuardian(req.body, {
      email: cleanEmail,
      phone: cleanPhone,
    });
    if (guardian.error) {
      return res.status(400).json({ success: false, message: guardian.error });
    }

    // Duplicate checks
    if (await User.findOne({ email: cleanEmail })) {
      return res.status(400).json({
        success: false,
        message: "User already exists.",
      });
    }

    if (await User.findOne(phoneFilter(phone))) {
      return res.status(400).json({
        success: false,
        message: "Phone number is already registered.",
      });
    }

    if (await User.findOne({ username: username.trim() })) {
      return res.status(400).json({
        success: false,
        message: "Username already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(String(password).trim(), 10);

    const user = new User({
      username: username.trim(),
      email: cleanEmail,
      password: hashedPassword,
      phone: cleanPhone,
      guardianEmail: guardian.guardianEmail,
      guardianPhone: guardian.guardianPhone,
      guardianPreferredLanguage: ["en", "hi", "kn"].includes(req.body.guardianPreferredLanguage)
        ? req.body.guardianPreferredLanguage
        : "en",
      // Auto-generated placeholder avatar so every account has a photo
      // from the start, WhatsApp-style. The user can replace it any time
      // via PUT /api/users/profile-picture.
      profilePic: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        username.trim()
      )}&backgroundType=gradientLinear`,
    });

    await user.save();

    // Never send password to frontend
    const safeUser = user.toObject();
    delete safeUser.password;

    return res.status(201).json({
      success: true,
      message: "User Registered Successfully.",
      user: safeUser,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Registration failed.",
    });
  }
});

// ======================================
// REGISTER A PARENT / GUARDIAN ACCOUNT
// POST /api/users/register-guardian
//
// Separate from the normal chat account registration above. A guardian
// account can log in and see read-only risk info and alert history for
// every child account whose guardianEmail or guardianPhone matches this
// guardian's own email/phone - no manual "linking" step needed, the
// connection is made automatically by matching contact details.
// ======================================
router.post("/register-guardian", async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    const cleanEmail = normalizeEmail(email);
    const cleanPhone = phone ? normalizePhone(phone) : "";

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }
    if (cleanPhone && !isValidPhone(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phone number.",
      });
    }
    if (String(password).trim().length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
    }

    if (await User.findOne({ email: cleanEmail })) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }
    if (cleanPhone && (await User.findOne(phoneFilter(cleanPhone)))) {
      return res.status(400).json({
        success: false,
        message: "An account with this phone number already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(String(password).trim(), 10);

    const guardian = new User({
      username: username.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      password: hashedPassword,
      role: "guardian",
      profilePic: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        username.trim()
      )}&backgroundType=gradientLinear`,
    });

    await guardian.save();

    // How many child accounts already list this email/phone as their
    // guardian contact — lets the frontend show "2 children linked" right
    // after sign-up, confirming the connection worked.
    const linkedCount = await User.countDocuments({
      role: "user",
      $or: [
        ...(cleanEmail ? [{ guardianEmail: cleanEmail }] : []),
        ...(cleanPhone ? [{ guardianPhone: cleanPhone }] : []),
      ],
    });

    const safeUser = guardian.toObject();
    delete safeUser.password;

    return res.status(201).json({
      success: true,
      message: "Guardian account created.",
      user: safeUser,
      linkedCount,
    });
  } catch (error) {
    console.error("GUARDIAN REGISTER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Registration failed.",
    });
  }
});

// ======================================
// LOGIN USER
// POST /api/users/login
// ======================================
router.post("/login", async (req, res) => {
  try {
    // "identifier" can be an email OR a phone number.
    // "email" is still accepted so older clients keep working.
    const identifier = req.body.identifier || req.body.email;
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Email, phone or username and password are required.",
      });
    }

    const user = await findByIdentifier(
      identifier,
      "+password +guardianEmail +guardianPhone +guardianPreferredLanguage"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const isMatch = await bcrypt.compare(String(password).trim(), user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid Password.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing in .env");

      return res.status(500).json({
        success: false,
        message: "JWT configuration is missing.",
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const safeUser = user.toObject();
    delete safeUser.password;

    return res.status(200).json({
      success: true,
      message: "Login Successful.",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Login failed.",
    });
  }
});

// ======================================
// FORGOT PASSWORD - step 1: send OTP
// POST /api/users/forgot-password
// body: { identifier }   (email or phone number)
//
// The OTP goes to the SAME channel the user typed:
//   email  -> emailed      phone -> SMS
// The response is identical whether or not the account exists,
// so this endpoint can't be used to discover registered users.
// ======================================
router.post("/forgot-password", async (req, res) => {
  const genericReply = {
    success: true,
    message:
      "If an account exists for that email/phone, a verification code has been sent.",
  };

  try {
    const parsed = parseIdentifier(req.body.identifier);

    if (!parsed.type || !parsed.value) {
      return res.status(400).json({
        success: false,
        message: "Enter your registered email or phone number.",
      });
    }

    if (parsed.type === "username") {
      return res.status(400).json({
        success: false,
        message: "Enter your registered email or phone number.",
      });
    }

    if (parsed.type === "email" && !isValidEmail(parsed.value)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }
    if (parsed.type === "phone" && !isValidPhone(parsed.value)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phone number.",
      });
    }

    const user = await findByIdentifier(
      req.body.identifier,
      "+resetOtpSentAt"
    );

    if (!user) return res.status(200).json(genericReply);

    // Resend throttle
    if (
      user.resetOtpSentAt &&
      Date.now() - user.resetOtpSentAt.getTime() < OTP_RESEND_SECONDS * 1000
    ) {
      const wait = Math.ceil(
        (OTP_RESEND_SECONDS * 1000 -
          (Date.now() - user.resetOtpSentAt.getTime())) /
          1000
      );
      return res.status(429).json({
        success: false,
        message: `Please wait ${wait}s before requesting another code.`,
      });
    }

    const otp = String(crypto.randomInt(100000, 1000000));

    user.resetOtpHash = await bcrypt.hash(otp, 10);
    user.resetOtpExpires = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    user.resetOtpAttempts = 0;
    user.resetOtpSentAt = new Date();
    await user.save();

    if (parsed.type === "email") {
      await sendEmail({
        to: user.email,
        subject: "SafeChat password reset code",
        text:
          `Your SafeChat password reset code is ${otp}.\n` +
          `It expires in ${OTP_TTL_MINUTES} minutes. If you did not request this, ignore this email.`,
        html: `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:420px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;padding:24px">
          <h2 style="margin:0 0 8px;color:#0f172a">Reset your password</h2>
          <p style="color:#475569">Use this code to reset your SafeChat password:</p>
          <p style="font-size:32px;letter-spacing:8px;font-weight:700;color:#2563eb;margin:16px 0">${otp}</p>
          <p style="color:#64748b;font-size:13px">Expires in ${OTP_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>
        </div>`,
      });
    } else {
      await sendSMS({
        to: user.phone,
        body: `SafeChat: your password reset code is ${otp}. Valid for ${OTP_TTL_MINUTES} minutes. Do not share it.`,
      });
    }

    return res.status(200).json(genericReply);
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Could not send verification code. Please try again.",
    });
  }
});

// ======================================
// FORGOT PASSWORD - step 2: verify OTP + set new password
// POST /api/users/reset-password
// body: { identifier, otp, newPassword }
// ======================================
router.post("/reset-password", async (req, res) => {
  try {
    const { identifier, otp, newPassword } = req.body;

    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Identifier, code and new password are required.",
      });
    }

    if (String(newPassword).trim().length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
    }

    const invalid = () =>
      res.status(400).json({
        success: false,
        message: "Invalid or expired code.",
      });

    const user = await findByIdentifier(
      identifier,
      "+password +resetOtpHash +resetOtpExpires +resetOtpAttempts"
    );

    if (
      !user ||
      !user.resetOtpHash ||
      !user.resetOtpExpires ||
      user.resetOtpExpires.getTime() < Date.now() ||
      user.resetOtpAttempts >= OTP_MAX_ATTEMPTS
    ) {
      return invalid();
    }

    const ok = await bcrypt.compare(String(otp).trim(), user.resetOtpHash);

    if (!ok) {
      user.resetOtpAttempts += 1;
      await user.save();
      return invalid();
    }

    user.password = await bcrypt.hash(String(newPassword).trim(), 10);
    user.resetOtpHash = "";
    user.resetOtpExpires = null;
    user.resetOtpAttempts = 0;
    user.resetOtpSentAt = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful. You can now log in.",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Password reset failed. Please try again.",
    });
  }
});

// ======================================
// CURRENT USER (fresh copy incl. guardian contact)
// GET /api/users/me
// ======================================
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "+guardianEmail +guardianPhone +guardianPreferredLanguage"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});


// ======================================
// UPLOAD / CHANGE PROFILE PICTURE
// PUT /api/users/profile-picture   (multipart/form-data, field "file")
// ======================================
router.put(
  "/profile-picture",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No image uploaded." });
      }

      const user = await User.findByIdAndUpdate(
        req.user.userId,
        { profilePic: `/uploads/${req.file.filename}` },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: "Profile picture updated.",
        user,
      });
    } catch (error) {
      console.error("PROFILE PICTURE ERROR:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ======================================
// UPDATE PARENT / GUARDIAN CONTACT
// PUT /api/users/guardian
// body: { guardianEmail?, guardianPhone? }  (at least one)
// ======================================
router.put("/guardian", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "+guardianEmail +guardianPhone +guardianPreferredLanguage"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const guardian = validateGuardian(req.body, {
      email: user.email,
      phone: user.phone,
    });

    if (guardian.error) {
      return res.status(400).json({ success: false, message: guardian.error });
    }

    user.guardianEmail = guardian.guardianEmail;
    user.guardianPhone = guardian.guardianPhone;

    const lang = req.body.guardianPreferredLanguage;
    if (["en", "hi", "kn"].includes(lang)) {
      user.guardianPreferredLanguage = lang;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Guardian contact updated.",
      user,
    });
  } catch (error) {
    console.error("GUARDIAN UPDATE ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ======================================
// SEND A TEST ALERT TO THE GUARDIAN
// POST /api/users/guardian/test
// ======================================
router.post("/guardian/test", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "+guardianEmail +guardianPhone +guardianPreferredLanguage"
    );

    if (!user || (!user.guardianEmail && !user.guardianPhone)) {
      return res.status(400).json({
        success: false,
        message: "Add a guardian email or phone number first.",
      });
    }

    const results = await sendGuardianAlert({
      child: user,
      otherName: "a test contact",
      level: "Medium",
      score: 5,
      factors: { messageCount24h: 12, lateNightCount24h: 2, activeDaysStreak: 3 },
      kind: "test",
    });

    return res.status(200).json({
      success: true,
      message: "Test alert sent.",
      results: results.map((r) => ({
        channel: r.channel,
        status: r.status,
        error: r.error,
      })),
    });
  } catch (error) {
    console.error("TEST ALERT ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ======================================
// GET ALL USERS
// GET /api/users
// ======================================
router.get("/", async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ username: 1 });

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("GET USERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get users.",
    });
  }
});

// ======================================
// SEARCH USERS
// GET /api/users/search
//
// Supported:
// /api/users/search?query=monisha
//
// or
//
// /api/users/search?username=monisha&userId=xxxxx
// ======================================
router.get("/search", async (req, res) => {
  try {
    const {
      username,
      userId,
      query,
    } = req.query;

    // Support both username and query
    const searchText = (
      username ||
      query ||
      ""
    ).trim();

    // Search text required
    if (!searchText) {
      return res.status(400).json({
        success: false,
        message: "Username/search query is required.",
        users: [],
      });
    }

    // Prevent invalid regular-expression input
    const escapedSearchText = searchText.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const searchRegex = new RegExp(
      escapedSearchText,
      "i"
    );

    // Search username OR email
    const filter = {
      $or: [
        {
          username: searchRegex,
        },
        {
          email: searchRegex,
        },
      ],
    };

    // Exclude current logged-in user
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid User ID.",
          users: [],
        });
      }

      filter._id = {
        $ne: new mongoose.Types.ObjectId(userId),
      };
    }

    // Find users
    const users = await User.find(filter)
      .select("-password")
      .sort({ username: 1 })
      .limit(20);

    console.log(
      `User search "${searchText}" returned ${users.length} result(s)`
    );

    // IMPORTANT:
    // Frontend should use res.data.users
    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("SEARCH USERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Search failed.",
      users: [],
    });
  }
});

// ======================================
// EXPORT ROUTER
// ======================================
module.exports = router;