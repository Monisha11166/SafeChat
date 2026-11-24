const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },

    // "user" = normal chat account. "guardian" = a parent/guardian account
    // that logs in to VIEW alerts for any child whose guardianEmail/Phone
    // matches this account's own email/phone. Guardians never see chat
    // content or message text - only risk numbers and alert history.
    role: {
      type: String,
      enum: ["user", "guardian"],
      default: "user",
    },

    // Guardian's preferred language for alert emails/SMS (see i18n).
    preferredLanguage: {
      type: String,
      enum: ["en", "hi", "kn"],
      default: "en",
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Hidden from every query by default. Login explicitly asks for it
    // with .select("+password").
    password: {
      type: String,
      required: true,
      select: false,
    },

    // Stored in E.164 format, e.g. +919876543210
    phone: {
      type: String,
      default: "",
    },

    profilePic: {
      type: String,
      default: "",
    },

    // ---------------------------------------------
    // Parent / Guardian contact (receives risk alerts)
    // select:false => never leaks through /users, /search, populate(),
    // etc. Only the owner's own login / profile calls include it.
    // ---------------------------------------------
    guardianEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      select: false,
    },

    guardianPhone: {
      type: String,
      default: "",
      trim: true,
      select: false,
    },

    // Which language the GUARDIAN's alert emails/SMS should be written in.
    // Set by the child (or the guardian themself) from the dashboard.
    guardianPreferredLanguage: {
      type: String,
      enum: ["en", "hi", "kn"],
      default: "en",
      select: false,
    },

    // ---------------------------------------------
    // Forgot-password OTP (hashed, expires, attempt-limited)
    // ---------------------------------------------
    resetOtpHash: { type: String, default: "", select: false },
    resetOtpExpires: { type: Date, default: null, select: false },
    resetOtpAttempts: { type: Number, default: 0, select: false },
    resetOtpSentAt: { type: Date, default: null, select: false },

    // Online / Offline Status
    status: {
      type: String,
      default: "Offline",
    },

    // Last Seen
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
