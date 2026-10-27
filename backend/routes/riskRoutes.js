const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const riskService = require("../services/riskService");
const AlertLog = require("../models/AlertLog");
const User = require("../models/User");

const isSelf = (req, id) => String(req.user?.userId) === String(id);

// NOTE: the specific routes (/summary, /alerts) MUST be declared before the
// generic "/:userA/:userB" route, otherwise Express matches
// "/summary/<id>" as userA="summary" and the dashboard fails.

// =======================
// Risk summary for a user (dashboard: all their conversations
// sorted by risk, highest first)
// =======================
router.get("/summary/:userId", authMiddleware, async (req, res) => {
  try {
    if (!isSelf(req, req.params.userId)) {
      return res.status(403).json({ message: "Not allowed." });
    }

    const summary = await riskService.getRiskSummaryForUser(req.params.userId);
    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =======================
// Guardian alerts that were sent for this user (dashboard panel)
// =======================
router.get("/alerts/:userId", authMiddleware, async (req, res) => {
  try {
    if (!isSelf(req, req.params.userId)) {
      return res.status(403).json({ message: "Not allowed." });
    }

    const alerts = await AlertLog.find({ childId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    res.status(200).json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =======================
// Force a recalculation (manual refresh)
// =======================
router.post("/recalculate", authMiddleware, async (req, res) => {
  try {
    const { userA, userB } = req.body;

    if (!isSelf(req, userA) && !isSelf(req, userB)) {
      return res.status(403).json({ message: "Not allowed." });
    }

    const risk = await riskService.recalculateRiskForPair(userA, userB);
    res.status(200).json(risk);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =======================
// "Guardian view" preview — everything needed to show, inside the app,
// what the child's parent/guardian actually sees (their contact info,
// the live risk numbers, and every alert sent to them so far). Lets you
// demo the parent-facing side without needing a real inbox/phone.
// =======================
router.get("/guardian-view/:userId", authMiddleware, async (req, res) => {
  try {
    if (!isSelf(req, req.params.userId)) {
      return res.status(403).json({ message: "Not allowed." });
    }

    const child = await User.findById(req.params.userId).select(
      "username email guardianEmail guardianPhone +guardianEmail +guardianPhone +guardianPreferredLanguage"
    );
    if (!child) return res.status(404).json({ message: "User not found." });

    const [summary, alerts] = await Promise.all([
      riskService.getRiskSummaryForUser(req.params.userId),
      AlertLog.find({ childId: req.params.userId }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    res.status(200).json({
      child: { username: child.username, email: child.email },
      guardianEmail: child.guardianEmail || "",
      guardianPhone: child.guardianPhone || "",
      summary,
      alerts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =======================
// GUARDIAN LOGIN DASHBOARD
// GET /api/risk/my-children
//
// Called by a logged-in GUARDIAN account. Finds every child account whose
// guardianEmail or guardianPhone matches this guardian's own email/phone,
// and returns each child's risk summary + alert history. Guardians only
// ever see risk numbers and alert text - never raw chat messages.
// =======================
router.get("/my-children", authMiddleware, async (req, res) => {
  try {
    const guardian = await User.findById(req.user.userId);
    if (!guardian) return res.status(404).json({ message: "Account not found." });
    if (guardian.role !== "guardian") {
      return res.status(403).json({
        message: "This account is not registered as a parent/guardian.",
      });
    }

    const children = await User.find({
      role: "user",
      $or: [
        ...(guardian.email ? [{ guardianEmail: guardian.email }] : []),
        ...(guardian.phone ? [{ guardianPhone: guardian.phone }] : []),
      ],
    }).select("username email profilePic");

    const results = await Promise.all(
      children.map(async (child) => {
        const [summary, alerts] = await Promise.all([
          riskService.getRiskSummaryForUser(child._id),
          AlertLog.find({ childId: child._id }).sort({ createdAt: -1 }).limit(30).lean(),
        ]);
        return {
          child: { _id: child._id, username: child.username, email: child.email, profilePic: child.profilePic },
          summary,
          alerts,
        };
      })
    );

    res.status(200).json({ guardian: { username: guardian.username, email: guardian.email }, children: results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =======================
// Risk for one conversation (chat header indicator)
// =======================
router.get("/:userA/:userB", authMiddleware, async (req, res) => {
  try {
    const { userA, userB } = req.params;

    if (!isSelf(req, userA) && !isSelf(req, userB)) {
      return res.status(403).json({ message: "Not allowed." });
    }

    const risk = await riskService.getRiskForPair(userA, userB);

    if (!risk) {
      return res.status(200).json({
        score: 0,
        level: "Low",
        factors: {},
        message: "No conversation history yet",
      });
    }

    res.status(200).json(risk);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
