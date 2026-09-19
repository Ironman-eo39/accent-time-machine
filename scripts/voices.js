// scripts/voices.js - discover available Supertonic 3 voices per language.

import { loadModel, textToSpeech, unloadModel, TTS_MULTILINGUAL_SUPERTONIC3_Q8_0 } from "@qvac/sdk";

const CANDIDATES = ["F1", "F2", "F3", "M1", "M2", "M3", "S1", "S2"];
const LANG = process.argv[2] || "en";

console.log("Probing Supertonic 3 voices for language:", LANG);
console.log("");

for (const voice of CANDIDATES) {
  try {
    const modelId = await loadModel({
      modelSrc: TTS_MULTILINGUAL_SUPERTONIC3_Q8_0,
      modelType: "tts-ggml",
      modelConfig: { ttsEngine: "supertonic", language: LANG, voice },
    });
    console.log("  " + voice + ": OK");
    await unloadModel({ modelId });
  } catch (err) {
    console.log("  " + voice + ": FAILED - " + err.message);
  }
}

console.log("");
console.log("Done.");

