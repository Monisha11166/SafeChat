/**
 * Keyword-aware alert context.
 * -----------------------------------------------------------------------
 * IMPORTANT - this is intentionally separate from the risk SCORE.
 * utils/riskCalculator.js never looks at message text and that stays true.
 *
 * This file is used ONLY at the moment an alert is about to be sent, to
 * make the wording smarter — e.g. distinguishing "a teacher mentioned your
 * child was suspended" from "an unknown contact is asking to meet up and
 * keep it secret", instead of sending the same generic "High risk!" text
 * for both. It never changes the score or the Low/Medium/High level.
 *
 * Only a short, editable list of words is checked (case-insensitive, whole
 * word). If none match, the alert falls back to the original
 * metadata-only wording. Matched words are shown to the guardian as single
 * words - never the surrounding sentence or full message.
 */

// Ordinary, often-innocent admin/safety words. When these show up, the
// alert should prompt a calm question rather than sound alarming.
//
// Covers English, Hindi (Devanagari + common romanized spellings), and
// Kannada (native script + common romanized spellings) - since chats on
// this platform won't always be in English. Romanized ("Hinglish"/
// "Kanglish") spelling varies a lot person to person, so this list covers
// the most common spellings, not every possible one - add more any time,
// it's just a plain array.
const CONTEXT_WORDS = [
  // English
  "suspended", "expelled", "detention", "principal", "counselor", "counsellor",
  "hospital", "emergency", "police", "accident", "bullying", "bully",
  // Hindi
  "निलंबित", "नकाल दिया", "अस्पताल", "पुलिस", "दुर्घटना", "बुली", "धमकाना",
  "nilambit", "aspatal", "hospital", "police", "durghatna",
  // Kannada
  "ಅಮಾನತು", "ಆಸ್ಪತ್ರೆ", "ಪೊಲೀಸ್", "ಅಪಘಾತ", "ಬೆದರಿಕೆ",
  "amaanatu", "aspatre", "polis", "apaghata",
];

// A short, non-exhaustive set of words sometimes associated with
// requests for secrecy or an in-person meetup. Presence here is a prompt
// to look closer, not proof of anything - edit this list to fit your
// own project/context. Same multi-language coverage as above.
const CAUTION_WORDS = [
  // English
  "secret", "dont tell", "don't tell", "meet me", "meet up", "come alone",
  "our little secret", "delete this",
  // Hindi - native + common romanized spellings
  "राज़", "किसी को मत बताना", "मत बताना", "मिलते हैं", "अकेले आना", "ये बात किसी को मत बताना",
  "raaz hai", "kisi ko mat batana", "mat batana", "milte hain", "akele aana",
  // Kannada - native + common romanized spellings. Romanized spelling
  // varies a lot (no single "correct" way to type it in Latin letters),
  // so several variants are listed, plus the standalone verb as a
  // broader backup catch.
  "ಗುಟ್ಟು", "ಯಾರಿಗೂ ಹೇಳಬೇಡ", "ಸಿಗೋಣ", "ಒಬ್ಬರೇ ಬಾ", "ಯಾರಿಗೂ ಹೇಳ್ಬೇಡ",
  "guttu", "yarigu helbeda", "yaarigu helbeda", "yargu helbeda", "yarige helbeda",
  "helbeda", "sigona", "obbare ba",
];

function wordHits(text, list) {
  const lower = ` ${text.toLowerCase()} `;
  return list.filter((w) => lower.includes(` ${w.toLowerCase()} `) || lower.includes(w.toLowerCase()));
}

/**
 * Scans a batch of plain message strings (already fetched by the caller)
 * and returns which configured words appeared - nothing else. The caller
 * is responsible for discarding the actual message text afterward; only
 * the matched words should ever be persisted or emailed.
 */
function scanForContext(messageTexts = []) {
  const joined = messageTexts.filter(Boolean).join(" \n ");
  if (!joined.trim()) return { contextWords: [], cautionWords: [] };

  return {
    contextWords: [...new Set(wordHits(joined, CONTEXT_WORDS))],
    cautionWords: [...new Set(wordHits(joined, CAUTION_WORDS))],
  };
}

module.exports = { scanForContext, CONTEXT_WORDS, CAUTION_WORDS };
