/**
 * Shared, time-of-day-proof timestamp generator used by the demo seed
 * script and the test-case report, so both always agree with each other
 * and with the live app regardless of when they're run.
 */

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const isNightHour = (h) => h >= 23 || h < 5;

/**
 * Builds timestamps that produce EXACTLY the requested numbers, whatever
 * time of day the script is run:
 *   - messageCount24h   messages inside the last 24h
 *   - lateNightCount24h of those sent between 11PM and 5AM
 *   - activeDaysStreak  distinct calendar days with messages
 */
function buildTimestamps(
  { messageCount24h, lateNightCount24h, activeDaysStreak },
  now = new Date()
) {
  const oneDay = 24 * 60 * 60 * 1000;
  const recent = [];

  // Late-night messages: anchored at a moment that is always inside the
  // 11PM-5AM window and always within the last 24h.
  const anchor = new Date(now);
  if (now.getHours() < 5) {
    anchor.setDate(anchor.getDate() - 1); // yesterday 23:30
    anchor.setHours(23, 30, 0, 0);
  } else {
    anchor.setHours(4, 0, 0, 0); // today 04:00
  }
  for (let i = 0; i < lateNightCount24h; i++) {
    recent.push(new Date(anchor.getTime() - i * 60 * 1000));
  }

  // Remaining recent messages: random moments in the last 24h that are
  // NOT in the late-night window.
  const daytime = messageCount24h - lateNightCount24h;
  // A brand-new conversation (streak of 1 day) must sit on ONE calendar
  // day, so pin it to today (afternoon/evening runs) or yesterday (morning runs).
  const singleDay = new Date(now);
  if (now.getHours() < 12) singleDay.setDate(singleDay.getDate() - 1);

  let guard = 0;
  while (recent.length < messageCount24h && guard++ < 100000) {
    const minutesAgo = 10 + Math.floor(Math.random() * (24 * 60 - 20));
    const t = new Date(now.getTime() - minutesAgo * 60 * 1000);
    if (isNightHour(t.getHours())) continue;
    if (activeDaysStreak <= 1 && dayKey(t) !== dayKey(singleDay)) continue;
    recent.push(t);
  }
  if (recent.length < messageCount24h) {
    throw new Error("Could not place recent messages - please re-run the script.");
  }
  if (daytime < 0) throw new Error("lateNightCount24h cannot exceed messageCount24h");

  // Earlier days (all older than 24h) until we reach the target number of
  // distinct active days.
  const keys = new Set(recent.map(dayKey));
  const older = [];
  const cursor = new Date(Math.min(...recent.map((d) => d.getTime())));
  while (keys.size < activeDaysStreak) {
    cursor.setDate(cursor.getDate() - 1);
    cursor.setHours(15, Math.floor(Math.random() * 60), 0, 0);
    if (now.getTime() - cursor.getTime() <= oneDay) continue; // still inside 24h window
    const k = dayKey(cursor);
    if (!keys.has(k)) {
      keys.add(k);
      older.push(new Date(cursor));
    }
  }

  return [...older, ...recent].sort((a, b) => a - b);
}


module.exports = { buildTimestamps };
