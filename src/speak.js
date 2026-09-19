// src/speak.js - Supertonic 3 TTS with per-language voice cache.
// One voice per language is held in memory; switching voice unloads the old one.

import { loadModel, unloadModel, textToSpeech, TTS_MULTILINGUAL_SUPERTONIC3_Q8_0 } from "@qvac/sdk";

const instances = new Map(); // language -> { voice, modelId }

export async function ensureVoiceLoaded(language, voice = "F1") {
  const existing = instances.get(language);
  if (existing && existing.voice === voice) return existing.modelId;

  if (existing) {
    try { await unloadModel({ modelId: existing.modelId }); } catch { /* ignore */ }
    instances.delete(language);
  }

  const modelId = await loadModel({
    modelSrc: TTS_MULTILINGUAL_SUPERTONIC3_Q8_0,
    modelType: "tts-ggml",
    modelConfig: {
      ttsEngine: "supertonic",
      language,
      voice,
    },
  });
  instances.set(language, { voice, modelId });
  return modelId;
}

export async function speak(text, language, voice = "F1") {
  const modelId = await ensureVoiceLoaded(language, voice);
  const result = textToSpeech({
    modelId,
    text,
    inputType: "text",
    stream: false,
  });
  const pcm = await result.buffer;
  const sampleRate = (await result.sampleRate) ?? 44100;
  return { pcm, sampleRate };
}

