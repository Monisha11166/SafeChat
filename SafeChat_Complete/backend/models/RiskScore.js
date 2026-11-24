const mongoose = require("mongoose");

const riskScoreSchema = new mongoose.Schema(
  {
    // The pair is stored in a fixed order (userA < userB as strings)
    // so one document tracks a conversation regardless of who sent last.
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    score: {
      type: Number,
      default: 0,
    },

    level: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low",
    },

    // Breakdown of which rules fired, useful for the dashboard
    // and for explaining *why* a score was assigned (non-invasive:
    // this stores counts/flags, never message content).
    factors: {
      messageFrequencyScore: { type: Number, default: 0 },
      lateNightScore: { type: Number, default: 0 },
      repetitionScore: { type: Number, default: 0 },
      messageCount24h: { type: Number, default: 0 },
      lateNightCount24h: { type: Number, default: 0 },
      activeDaysStreak: { type: Number, default: 0 },
    },

    lastCalculatedAt: {
      type: Date,
      default: Date.now,
    },

    // Guardian-alert bookkeeping: prevents sending a new SMS/email
    // on every single message once a conversation is already flagged.
    lastAlertLevel: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low",
    },
    lastAlertAt: {
      type: Date,
      default: null,
    },

    // Simple history so the dashboard can show a trend line
    history: [
      {
        score: Number,
        level: String,
        calculatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

riskScoreSchema.index({ userA: 1, userB: 1 }, { unique: true });

module.exports = mongoose.model("RiskScore", riskScoreSchema);
