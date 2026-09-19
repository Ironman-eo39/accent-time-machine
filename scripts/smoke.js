// scripts/smoke.js - prove the translate -> speak pipeline end to end.
// Usage: node scripts/smoke.js "your sentence" <fr|es>

import { writeFileSync } from "node:fs";
import { translateText } from "../src/translate.js";
import { speak } from "../src/speak.js";
import { buildWav } from "../src/wav.js";
import { close } from "@qvac/sdk";

const text = process.argv[2] || "Where is the nearest coffee shop?";
const to = process.argv[3] || "fr";

if (to !== "fr" && to !== "es") {
  console.error("Second argument must be fr or es.");
  process.exit(1);
}

console.log("Original:", text);
console.log("Translating en ->", to, "...");

const translated = await translateText(text, "en", to);
console.log("Translated:", translated);
console.log("");

console.log("Synthesizing speech in", to, "...");
const { pcm, sampleRate } = await speak(translated, to);
console.log("PCM samples:", pcm.length, "@", sampleRate, "Hz");

const wav = buildWav(pcm, sampleRate);
const outFile = "smoke-" + to + ".wav";
writeFileSync(outFile, wav);
console.log("Wrote", outFile, "(" + (wav.length / 1024).toFixed(1) + " KB)");
console.log("");
console.log("Pipeline OK. Open", outFile, "to verify the audio.");

await close();

