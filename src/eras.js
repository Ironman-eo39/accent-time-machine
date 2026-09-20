// src/eras.js - personas, era-card flavor, loading quips.

export const PERSONAS = [
  {
    id: "spice",
    label: "spice merchant",
    voice: "F1",
    prefix: "Good sir -",
    styleHint: "an 1800s spice merchant with a taste for vivid, aromatic language",
  },
  {
    id: "trader",
    label: "tea and silk trader",
    voice: "F3",
    prefix: "Kind merchant -",
    styleHint: "an 1800s tea and silk trader with a calm, measured, polite voice",
  },
  {
    id: "clerk",
    label: "port customs clerk",
    voice: "M1",
    prefix: "For the ledger -",
    styleHint: "an 1800s port customs clerk who favors formal, ledger-like phrasing",
  },
  {
    id: "master",
    label: "sailing master",
    voice: "M3",
    prefix: "Ahoy -",
    styleHint: "an 1800s sailing master with a salty, nautical turn of phrase",
  },
];

// Neutral persona used when whimsy mode is OFF. No prefix, no LLM styling.
export const NEUTRAL_PERSONA = {
  id: "neutral",
  label: null,
  voice: "F1",
  prefix: "",
  styleHint: null,
};

const PORTS = {
  es: { city: "Cadiz", country: "Spain" },
  fr: { city: "Marseille", country: "France" },
  en: { city: "London", country: "England" },
};

const LOADING_QUIPS = [
  "Winding the phonograph...",
  "Consulting the port translator...",
  "Warming up the wax cylinder...",
  "Briefing the harbor scribe...",
  "Sailing to port...",
];

export function resolvePersona(id) {
  if (!id || id === "random") {
    return PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
  }
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}

export function buildEraCard(toLanguage, original, translated, personaLabel, whimsy) {
  const port = PORTS[toLanguage] ?? PORTS.en;
  const year = 1800 + Math.floor(Math.random() * 99);
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  return {
    city: port.city,
    country: port.country,
    year,
    month,
    day,
    persona: personaLabel,   // null when whimsy is off
    original,
    translated,
    whimsy: Boolean(whimsy),
  };
}

export function randomLoadingQuip() {
  return LOADING_QUIPS[Math.floor(Math.random() * LOADING_QUIPS.length)];
}
