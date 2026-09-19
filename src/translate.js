// src/translate.js - Bergamot NMT wrapper with per-pair model caching.

import {
  loadModel,
  translate,
  BERGAMOT_EN_ES,
  BERGAMOT_ES_EN,
  BERGAMOT_EN_FR,
  BERGAMOT_FR_EN,
} from "@qvac/sdk";

const PAIR_MODELS = {
  "en-es": BERGAMOT_EN_ES,
  "es-en": BERGAMOT_ES_EN,
  "en-fr": BERGAMOT_EN_FR,
  "fr-en": BERGAMOT_FR_EN,
};

const PAIR_META = {
  "en-es": { from: "en", to: "es" },
  "es-en": { from: "es", to: "en" },
  "en-fr": { from: "en", to: "fr" },
  "fr-en": { from: "fr", to: "en" },
};

const loadedPairs = new Map();

export function getAvailableDirections() {
  return Object.keys(PAIR_MODELS);
}

export function isValidDirection(from, to) {
  return PAIR_MODELS[`${from}-${to}`] !== undefined;
}

export async function ensurePairLoaded(from, to) {
  const key = `${from}-${to}`;
  if (loadedPairs.has(key)) return loadedPairs.get(key);
  const modelSrc = PAIR_MODELS[key];
  if (!modelSrc) throw new Error("Unsupported translation pair: " + key);
  const meta = PAIR_META[key];
  const modelId = await loadModel({
    modelSrc,
    modelType: "nmtcpp-translation",
    modelConfig: { engine: "Bergamot", from: meta.from, to: meta.to },
  });
  loadedPairs.set(key, modelId);
  return modelId;
}

export async function translateText(text, from, to) {
  const modelId = await ensurePairLoaded(from, to);
  const run = translate({
    modelId,
    text,
    modelType: "nmtcpp-translation",
    stream: false,
  });
  const translated = await run.text;
  return translated.trim();
}

