// src/speak.js - Supertonic 3 multilingual TTS wrapper.
// One instance per language, loaded lazily and cached.

import { loadModel, textToSpeech, TTS_MULTILINGUAL_SUPERTONIC3_Q8_0 } from "@qvac/sdk";

const instances = new Map();

export async function ensureVoiceLoaded(language) {
  if (instances.has(language)) return instances.get(language);
  const modelId = await loadModel({
    modelSrc: TTS_MULTILINGUAL_SUPERTONIC3_Q8_0,
    modelType: "tts-ggml",
    modelConfig: {
      ttsEngine: "supertonic",
      language,
      voice: "F1",
    },
  });
  instances.set(language, modelId);
  return modelId;
}

export async function speak(text, language) {
  const modelId = await ensureVoiceLoaded(language);
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

