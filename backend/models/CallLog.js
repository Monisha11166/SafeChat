const mongoose = require("mongoose");

const callLogSchema = new mongoose.Schema(
  {
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    calleeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    callType: {
      type: String,
      enum: ["audio", "video"],
      required: true,
    },

    // completed  - the call connected and both sides talked
    // missed     - callee never answered (timed out or caller hung up first)
    // declined   - callee explicitly rejected it
    // offline    - callee wasn't online to even ring
    status: {
      type: String,
      enum: ["completed", "missed", "declined", "offline"],
      default: "missed",
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    // Only set once the callee actually answers and the peer
    // connection is attempted — used to compute duration.
    connectedAt: {
      type: Date,
      default: null,
    },

    endedAt: {
      type: Date,
      default: null,
    },

    durationSeconds: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CallLog", callLogSchema);
