const mongoose = require("mongoose");

/**
 * One row per guardian notification attempt (email or SMS).
 * Used by the dashboard's "Recent alerts" panel and for auditing.
 * Never stores message content.
 */
const alertLogSchema = new mongoose.Schema(
  {
    // The user whose guardian was notified
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // The other participant in the flagged conversation
    otherUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    otherUsername: { type: String, default: "" },

    channel: { type: String, enum: ["email", "sms"], required: true },

    // Masked (r***@gmail.com) - safe to show on the dashboard
    recipientMasked: { type: String, default: "" },

    level: { type: String, enum: ["Low", "Medium", "High"], required: true },
    score: { type: Number, default: 0 },

    // sent = delivered to provider, simulated = provider not configured
    // (printed to server console), failed = provider error
    status: {
      type: String,
      enum: ["sent", "simulated", "failed"],
      default: "sent",
    },
    error: { type: String, default: "" },

    kind: { type: String, enum: ["risk", "test"], default: "risk" },

    // The final human-readable sentence that was actually sent (what the
    // SMS said, or a one-line summary of the email). Safe to show on any
    // dashboard since it's exactly what the guardian already received -
    // never the raw chat message, only counts + at most one matched
    // safety-relevant word (see utils/alertKeywords.js).
    summaryText: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AlertLog", alertLogSchema);
