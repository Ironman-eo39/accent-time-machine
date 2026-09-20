// src/whimsy.js - LLM writes ONLY a period greeting + closing.
// The translated sentence is never sent to the LLM, so its meaning is
// preserved by construction, not by the model's judgment.

import {
  loadModel,
  completion,
  unloadModel,
  LLAMA_3_2_1B_INST_Q4_0,
} from "@qvac/sdk";

let llmModelId = null;
let llmLoading = null;

const recentFrames = new Map();
const MAX_RECENT = 3;

function getRecent(key) { return recentFrames.get(key) ?? []; }
function pushRecent(key, val) {
  const list = getRecent(key);
  list.push(val);
  while (list.length > MAX_RECENT) list.shift();
  recentFrames.set(key, list);
}

export async function ensureLLMLoaded() {
  if (llmModelId) return llmModelId;
  if (llmLoading) return llmLoading;
  llmLoading = (async () => {
    const modelId = await loadModel({
      modelSrc: LLAMA_3_2_1B_INST_Q4_0,
      modelType: "llm",
      onProgress: (p) => console.log("[whimsy] llm load:", p),
    });
    llmModelId = modelId;
    llmLoading = null;
    console.log("[whimsy] llm ready");
    return modelId;
  })();
  return llmLoading;
}

export async function unloadLLM() {
  if (llmModelId) {
    try { await unloadModel({ modelId: llmModelId }); } catch { /* ignore */ }
    llmModelId = null;
    llmLoading = null;
  }
}

function wordCount(s) {
  return s.split(/\s+/).filter(Boolean).length;
}

function sanitize(s) {
  return s
    .replace(/^["'«»\s\-–—:.]+/, "")
    .replace(/["'«»\s\-–—:.]+$/, "")
    .trim();
}

/**
 * Return { greeting, closing } — short period phrases in the target language.
 * On any failure, returns empty strings so the caller falls back to plain
 * translation with no framing.
 */
export async function buildFrame(targetLang, persona) {
  const modelId = await ensureLLMLoaded();
  const cacheKey = persona.id + "|" + targetLang;
  const recent = getRecent(cacheKey);

  const langName = { es: "Spanish", fr: "French", en: "English" }[targetLang] ?? targetLang;

  const avoidBlock = recent.length
    ? "Avoid reusing: " + recent.join(" | ") + "\n"
    : "";

  const systemPrompt =
    "You write short period phrases in " + langName + " for a " + persona.styleHint + ".\n" +
    "Produce exactly two lines:\n" +
    "GREETING: a 3 to 8 word opening phrase.\n" +
    "CLOSING: a 3 to 8 word closing phrase.\n" +
    "No explanation. No extra text. " + avoidBlock +
    "Output only the two lines.";

  const result = completion({
    modelId,
    history: [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Write the two lines." },
    ],
    stream: true,
    temperature: 0.7,
    top_p: 0.9,
  });

  let out = "";
  for await (const token of result.tokenStream) out += token;

  const gMatch = out.match(/GREETING\s*:\s*(.+)/i);
  const cMatch = out.match(/CLOSING\s*:\s*(.+)/i);

  let greeting = gMatch ? sanitize(gMatch[1]) : "";
  let closing = cMatch ? sanitize(cMatch[1]) : "";

  // Hard limits — small model WILL overshoot sometimes.
  if (wordCount(greeting) > 10) greeting = "";
  if (wordCount(closing) > 10) closing = "";

  // Reject greetings/closings that contain sentence-ending punctuation
  // (means the model smuggled the translation content into the frame).
  if (/[.!?]/.test(greeting.slice(0, -1))) greeting = "";
  if (/[.!?]/.test(closing.slice(0, -1))) closing = "";

  if (greeting || closing) {
    pushRecent(cacheKey, [greeting, closing].filter(Boolean).join(" / "));
  }

  console.log("[whimsy] frame ->", JSON.stringify({ greeting, closing }));
  return { greeting, closing };
}
