const Message = require("../models/Message");
const RiskScore = require("../models/RiskScore");
const { calculateRisk } = require("../utils/riskCalculator");

/**
 * Always store the pair in a stable order so (A,B) and (B,A)
 * resolve to the same RiskScore document.
 */
function sortPair(idA, idB) {
  const a = idA.toString();
  const b = idB.toString();
  return a < b ? [a, b] : [b, a];
}

/**
 * Recalculate and persist the risk score for a conversation.
 * Call this right after a message is saved.
 *
 * @returns {object} the updated RiskScore document (plain object)
 */
async function recalculateRiskForPair(senderId, receiverId) {
  const [userA, userB] = sortPair(senderId, receiverId);

  const messages = await Message.find({
    $or: [
      { senderId: userA, receiverId: userB },
      { senderId: userB, receiverId: userA },
    ],
  })
    .select("createdAt") // metadata only — never fetch `message` text here
    .sort({ createdAt: 1 })
    .lean();

  const { score, level, factors } = calculateRisk(messages);

  const update = {
    userA,
    userB,
    score,
    level,
    factors,
    lastCalculatedAt: new Date(),
    $push: {
      history: {
        $each: [{ score, level, calculatedAt: new Date() }],
        $slice: -50, // keep last 50 points for trend charts
      },
    },
  };

  const riskDoc = await RiskScore.findOneAndUpdate({ userA, userB }, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });

  return riskDoc;
}

/**
 * Get the current risk for a pair without recalculating.
 */
async function getRiskForPair(idA, idB) {
  const [userA, userB] = sortPair(idA, idB);
  return RiskScore.findOne({ userA, userB });
}

/**
 * Get all conversations involving a given user, sorted highest risk first.
 * Useful for a parent/guardian dashboard.
 */
async function getRiskSummaryForUser(userId) {
  const id = userId.toString();
  return RiskScore.find({ $or: [{ userA: id }, { userB: id }] })
    .sort({ score: -1 })
    .populate("userA", "username email")
    .populate("userB", "username email");
}

module.exports = {
  recalculateRiskForPair,
  getRiskForPair,
  getRiskSummaryForUser,
};
