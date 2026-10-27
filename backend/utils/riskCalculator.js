/**
 * Rule-based Online Grooming Risk Calculator
 * ------------------------------------------
 * Non-invasive by design: only looks at metadata (timestamps, counts,
 * sender/receiver ids). It never reads message text.
 *
 * Rules (tune these thresholds as your testing/validation phase suggests):
 *   1. Message frequency  -> many messages in a short rolling window
 *   2. Late-night activity -> messages sent between 11PM - 5AM
 *   3. Repetition          -> same pair chatting on many consecutive days
 *
 * Final score bands (from your review deck):
 *   0-3  -> Low
 *   4-6  -> Medium
 *   7+   -> High
 */

const LATE_NIGHT_START_HOUR = 23; // 11 PM
const LATE_NIGHT_END_HOUR = 5; // 5 AM

const FREQUENCY_THRESHOLDS = [
  { min: 100, points: 4 },
  { min: 50, points: 3 },
  { min: 25, points: 2 },
  { min: 10, points: 1 },
];

const LATE_NIGHT_THRESHOLDS = [
  { min: 10, points: 3 },
  { min: 5, points: 2 },
  { min: 1, points: 1 },
];

const STREAK_THRESHOLDS = [
  { min: 14, points: 3 },
  { min: 7, points: 2 },
  { min: 3, points: 1 },
];

function isLateNight(date) {
  const hour = date.getHours();
  return hour >= LATE_NIGHT_START_HOUR || hour < LATE_NIGHT_END_HOUR;
}

function scoreFromThresholds(value, thresholds) {
  for (const t of thresholds) {
    if (value >= t.min) return t.points;
  }
  return 0;
}

/**
 * Count distinct calendar days (in the messages' local time) on which
 * the pair exchanged at least one message — used as the "repeated
 * interaction" / streak signal.
 */
function countActiveDays(messages) {
  const days = new Set(
    messages.map((m) => {
      const d = new Date(m.createdAt);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );
  return days.size;
}

/**
 * @param {Array} messages - messages between the pair, most recent last,
 *   each needs at least `createdAt`. Content is NOT used.
 * @returns {{score:number, level:string, factors:object}}
 */
function calculateRisk(messages) {
  const now = Date.now();
  const last24h = messages.filter(
    (m) => now - new Date(m.createdAt).getTime() <= 24 * 60 * 60 * 1000
  );

  const messageCount24h = last24h.length;
  const lateNightCount24h = last24h.filter((m) =>
    isLateNight(new Date(m.createdAt))
  ).length;
  const activeDaysStreak = countActiveDays(messages);

  const messageFrequencyScore = scoreFromThresholds(
    messageCount24h,
    FREQUENCY_THRESHOLDS
  );
  const lateNightScore = scoreFromThresholds(
    lateNightCount24h,
    LATE_NIGHT_THRESHOLDS
  );
  const repetitionScore = scoreFromThresholds(
    activeDaysStreak,
    STREAK_THRESHOLDS
  );

  const score = messageFrequencyScore + lateNightScore + repetitionScore;

  let level = "Low";
  if (score >= 7) level = "High";
  else if (score >= 4) level = "Medium";

  return {
    score,
    level,
    factors: {
      messageFrequencyScore,
      lateNightScore,
      repetitionScore,
      messageCount24h,
      lateNightCount24h,
      activeDaysStreak,
    },
  };
}

module.exports = {
  calculateRisk,
  isLateNight,
};
