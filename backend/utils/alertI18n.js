/**
 * Translated building blocks for guardian alert emails/SMS.
 * -----------------------------------------------------------------------
 * Three languages ship by default: English, Hindi, Kannada - chosen to
 * cover what was asked for; adding another language is just adding
 * another entry to this object (same keys), nothing else needs to change.
 *
 * Machine-assisted translations - review with a native speaker before
 * relying on this for a real deployment.
 */

const LANGUAGES = {
  en: {
    label: "English",
    title: "SafeChat Safety Alert",
    greeting: "Hello,",
    reached: (child, other, level) =>
      `${child}'s conversation with "${other}" has reached ${level.toUpperCase()} risk`,
    score: (s) => `(score ${s}/10)`,
    whatWeNoticed: "What we noticed:",
    messages24h: "messages in the last 24 hours",
    lateNightMsgs: "messages sent late at night (11 PM - 5 AM)",
    activeDays: "different days",
    privacyNote:
      "SafeChat only analyses activity patterns, plus a small checklist of safety-relevant words. Full message content is never read or shared.",
    stepGeneric: (c) => `Have a calm, open conversation with ${c} about who they are talking to.`,
    stepContext: (c, w) =>
      `Along with the activity above, the word "${w}" came up recently. That's often something ordinary (a school or family matter) - but it's a good reason to ask ${c} directly what's going on.`,
    stepCaution: (c, w) =>
      `We also noticed language sometimes associated with requests for secrecy or an in-person meetup (e.g. "${w}"). This doesn't confirm anything is wrong, but we'd suggest reviewing this conversation with ${c} soon.`,
    signOff: "- SafeChat Safety Team",
    wordNoticed: (w) => `Word noticed: "${w}".`,
    pleaseTalk: (c) => `Please talk with ${c}.`,
    smsActivity: (m, l) => `${m} msgs/24h, ${l} late-night`,
  },

  hi: {
    label: "हिन्दी (Hindi)",
    title: "SafeChat सुरक्षा चेतावनी",
    greeting: "नमस्ते,",
    reached: (child, other, level) =>
      `${child} की "${other}" के साथ बातचीत ${level === "High" ? "उच्च" : "मध्यम"} जोखिम स्तर पर पहुँच गई है`,
    score: (s) => `(स्कोर ${s}/10)`,
    whatWeNoticed: "हमने क्या देखा:",
    messages24h: "पिछले 24 घंटों में संदेश",
    lateNightMsgs: "देर रात (रात 11 बजे - सुबह 5 बजे) भेजे गए संदेश",
    activeDays: "अलग-अलग दिन बातचीत हुई",
    privacyNote:
      "SafeChat केवल गतिविधि के पैटर्न और कुछ सुरक्षा-संबंधी शब्दों की जाँच करता है। पूरा संदेश कभी नहीं पढ़ा या साझा नहीं किया जाता।",
    stepGeneric: (c) => `${c} से शांति से बात करें कि वे किससे बात कर रहे हैं।`,
    stepContext: (c, w) =>
      `ऊपर दी गई गतिविधि के साथ, हाल ही में "${w}" शब्द भी सामने आया। यह अक्सर कोई सामान्य बात (स्कूल या पारिवारिक मामला) होती है - लेकिन ${c} से सीधे पूछना अच्छा रहेगा कि क्या हो रहा है।`,
    stepCaution: (c, w) =>
      `हमने ऐसी भाषा भी देखी जो गोपनीयता या व्यक्तिगत रूप से मिलने के अनुरोध से जुड़ी हो सकती है (जैसे "${w}")। इससे कुछ गलत होने की पुष्टि नहीं होती, लेकिन ${c} के साथ जल्द ही इस बातचीत की समीक्षा करने की सलाह दी जाती है।`,
    signOff: "- SafeChat सुरक्षा टीम",
    wordNoticed: (w) => `ध्यान में आया शब्द: "${w}"।`,
    pleaseTalk: (c) => `कृपया ${c} से बात करें।`,
    smsActivity: (m, l) => `${m} संदेश/24घं, ${l} देर-रात`,
  },

  kn: {
    label: "ಕನ್ನಡ (Kannada)",
    title: "SafeChat ಸುರಕ್ಷತಾ ಎಚ್ಚರಿಕೆ",
    greeting: "ನಮಸ್ಕಾರ,",
    reached: (child, other, level) =>
      `${child} ಅವರ "${other}" ಜೊತೆಗಿನ ಸಂಭಾಷಣೆ ${level === "High" ? "ಹೆಚ್ಚಿನ" : "ಮಧ್ಯಮ"} ಅಪಾಯದ ಮಟ್ಟವನ್ನು ತಲುಪಿದೆ`,
    score: (s) => `(ಅಂಕ ${s}/10)`,
    whatWeNoticed: "ನಾವು ಗಮನಿಸಿದ್ದು:",
    messages24h: "ಕಳೆದ 24 ಗಂಟೆಗಳಲ್ಲಿ ಸಂದೇಶಗಳು",
    lateNightMsgs: "ರಾತ್ರಿ ತಡವಾಗಿ (ರಾತ್ರಿ 11 - ಬೆಳಿಗ್ಗೆ 5) ಕಳುಹಿಸಿದ ಸಂದೇಶಗಳು",
    activeDays: "ವಿಭಿನ್ನ ದಿನಗಳಲ್ಲಿ ಸಂಭಾಷಣೆ",
    privacyNote:
      "SafeChat ಚಟುವಟಿಕೆಯ ಮಾದರಿಗಳನ್ನು ಮತ್ತು ಕೆಲವು ಸುರಕ್ಷತಾ-ಸಂಬಂಧಿತ ಪದಗಳನ್ನು ಮಾತ್ರ ಪರಿಶೀಲಿಸುತ್ತದೆ. ಪೂರ್ಣ ಸಂದೇಶವನ್ನು ಎಂದಿಗೂ ಓದಲಾಗುವುದಿಲ್ಲ ಅಥವಾ ಹಂಚಿಕೊಳ್ಳಲಾಗುವುದಿಲ್ಲ.",
    stepGeneric: (c) => `${c} ಯಾರೊಂದಿಗೆ ಮಾತನಾಡುತ್ತಿದ್ದಾರೆ ಎಂಬುದರ ಬಗ್ಗೆ ಶಾಂತವಾಗಿ ಮಾತನಾಡಿ.`,
    stepContext: (c, w) =>
      `ಮೇಲಿನ ಚಟುವಟಿಕೆಯ ಜೊತೆಗೆ, ಇತ್ತೀಚೆಗೆ "${w}" ಎಂಬ ಪದ ಕಂಡುಬಂದಿದೆ. ಇದು ಸಾಮಾನ್ಯವಾಗಿ ಶಾಲೆ ಅಥವಾ ಕುಟುಂಬದ ವಿಷಯವಾಗಿರಬಹುದು - ಆದರೆ ${c} ಅವರನ್ನು ನೇರವಾಗಿ ಕೇಳುವುದು ಒಳ್ಳೆಯದು.`,
    stepCaution: (c, w) =>
      `ಗೌಪ್ಯತೆ ಅಥವಾ ಖುದ್ದಾಗಿ ಭೇಟಿಯಾಗುವ ವಿನಂತಿಗೆ ಸಂಬಂಧಿಸಿದ ಭಾಷೆಯನ್ನೂ ನಾವು ಗಮನಿಸಿದ್ದೇವೆ (ಉದಾ. "${w}"). ಇದು ಏನಾದರೂ ತಪ್ಪಾಗಿದೆ ಎಂದು ಖಚಿತಪಡಿಸುವುದಿಲ್ಲ, ಆದರೆ ${c} ಜೊತೆ ಈ ಸಂಭಾಷಣೆಯನ್ನು ಶೀಘ್ರದಲ್ಲೇ ಪರಿಶೀಲಿಸಲು ಸಲಹೆ ನೀಡುತ್ತೇವೆ.`,
    signOff: "- SafeChat ಸುರಕ್ಷತಾ ತಂಡ",
    wordNoticed: (w) => `ಗಮನಿಸಿದ ಪದ: "${w}".`,
    pleaseTalk: (c) => `ದಯವಿಟ್ಟು ${c} ಜೊತೆ ಮಾತನಾಡಿ.`,
    smsActivity: (m, l) => `${m} ಸಂದೇಶ/24ಗಂ, ${l} ರಾತ್ರಿ-ತಡ`,
  },
};

function getLang(code) {
  return LANGUAGES[code] || LANGUAGES.en;
}

module.exports = { LANGUAGES, getLang };
