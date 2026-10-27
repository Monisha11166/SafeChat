const express = require("express");
const router = express.Router();
const CallLog = require("../models/CallLog");
const authMiddleware = require("../middleware/authMiddleware");

// GET all calls (incoming + outgoing) involving the logged-in user,
// most recent first, with the other person's basic info attached.
router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    const calls = await CallLog.find({
      $or: [{ callerId: userId }, { calleeId: userId }],
    })
      .sort({ startedAt: -1 })
      .limit(200)
      .populate("callerId", "username profilePic")
      .populate("calleeId", "username profilePic");

    res.json(calls);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch call history" });
  }
});

module.exports = router;
