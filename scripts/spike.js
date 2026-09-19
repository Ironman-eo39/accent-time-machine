// scripts/spike.js - verify QVAC model availability before building the pipeline.
// Runs in ~10 seconds. Downloads nothing. Reports what exists.

import { readFile } from "node:fs/promises";
import * as qvac from "@qvac/sdk";

const line = "=".repeat(60);
console.log(line);
console.log("QVAC SPIKE - model and function availability");
console.log(line);
console.log("");

try {
  const pkg = JSON.parse(await readFile(new URL("../node_modules/@qvac/sdk/package.json", import.meta.url), "utf8"));
  console.log("@qvac/sdk version:", pkg.version);
} catch (err) {
  console.log("@qvac/sdk version: (could not read -", err.message + ")");
}
console.log("");

const bergamot = Object.keys(qvac).filter((k) => k.startsWith("BERGAMOT_"));
console.log("BERGAMOT_* constants (" + bergamot.length + "):");
if (bergamot.length === 0) console.log("  (none)");
for (const k of bergamot) console.log("  -", k);
console.log("");

const tts = Object.keys(qvac).filter((k) => k.startsWith("TTS_"));
console.log("TTS_* constants (" + tts.length + "):");
if (tts.length === 0) console.log("  (none)");
for (const k of tts) console.log("  -", k);
console.log("");

console.log("Function exports:");
for (const fn of ["loadModel", "unloadModel", "translate", "textToSpeech", "close"]) {
  const kind = typeof qvac[fn];
  const mark = kind === "function" ? "OK" : "MISSING";
  console.log("  " + fn + ": " + mark + " (" + kind + ")");
}
console.log("");

console.log("Querying model registry...");
try {
  const models = await qvac.modelRegistryList();
  console.log("Registry returned " + models.length + " models.");
  console.log("");

  const translation = models.filter((m) => /nmt|bergamot|translate/i.test(m.name || ""));
  console.log("Translation-related (" + translation.length + "):");
  for (const m of translation) console.log("  - " + m.name + " [engine=" + (m.engine ?? "?") + "]");
  console.log("");

  const ttsModels = models.filter((m) => /tts|speech|supertonic|chatterbox|parler|cosyvoice/i.test(m.name || ""));
  console.log("TTS-related (" + ttsModels.length + "):");
  for (const m of ttsModels) console.log("  - " + m.name + " [engine=" + (m.engine ?? "?") + "]");
} catch (err) {
  console.log("Registry query failed:", err.message);
}
console.log("");
console.log(line);
console.log("SPIKE COMPLETE");
console.log(line);

