/**
 * Prints the 5 demo test cases as a clean report - inputs, the risk
 * calculator's rule-by-rule scoring, and the expected result. Useful for
 * explaining the risk calculator to evaluators without digging through code.
 *
 * Uses the exact same timestamp generator as scripts/seedDemoData.js
 * (utils/demoTimestamps.js), so the numbers shown here always match what
 * actually ends up in the database and on the dashboard.
 *
 * Run from the backend folder:   node scripts/printTestCases.js
 * (does not touch the database - pure calculation, safe to run anytime)
 */
const { calculateRisk } = require("../utils/riskCalculator");
const { buildTimestamps } = require("../utils/demoTimestamps");

const CASES = [
  {
    id: "TC-01",
    name: "arjun_22",
    desc: "Very frequent + late-night + long streak",
    messageCount24h: 58,
    lateNightCount24h: 7,
    activeDaysStreak: 12,
    expectedLevel: "High",
  },
  {
    id: "TC-02",
    name: "kavya_r",
    desc: "Frequent messaging, one late-night message",
    messageCount24h: 26,
    lateNightCount24h: 1,
    activeDaysStreak: 6,
    expectedLevel: "Medium",
  },
  {
    id: "TC-03",
    name: "rohit_m",
    desc: "Moderate messaging, driven by a very long day-streak",
    messageCount24h: 12,
    lateNightCount24h: 0,
    activeDaysStreak: 14,
    expectedLevel: "Medium",
  },
  {
    id: "TC-04",
    name: "sneha_p",
    desc: "Light, ordinary day-to-day chatting",
    messageCount24h: 8,
    lateNightCount24h: 0,
    activeDaysStreak: 3,
    expectedLevel: "Low",
  },
  {
    id: "TC-05",
    name: "priya_s",
    desc: "Brand-new conversation, first contact",
    messageCount24h: 3,
    lateNightCount24h: 0,
    activeDaysStreak: 1,
    expectedLevel: "Low",
  },
];

console.log("=".repeat(78));
console.log("SAFECHAT RISK CALCULATOR - TEST CASES");
console.log("=".repeat(78));

let pass = 0;
for (const c of CASES) {
  const ts = buildTimestamps(c);
  const result = calculateRisk(ts.map((createdAt) => ({ createdAt })));
  const ok = result.level === c.expectedLevel;
  pass += ok ? 1 : 0;

  console.log(`\n${c.id}  "${c.name}" - ${c.desc}`);
  console.log(`  Input   : ${c.messageCount24h} msgs/24h, ${c.lateNightCount24h} late-night, ${c.activeDaysStreak} active days`);
  console.log(`  Expected: ${c.expectedLevel}`);
  console.log(`  Actual  : ${result.level}  (score ${result.score}/10)   ${ok ? "PASS" : "FAIL"}`);
}

console.log("\n" + "=".repeat(78));
console.log(`${pass}/${CASES.length} test cases passed`);
console.log("=".repeat(78));
