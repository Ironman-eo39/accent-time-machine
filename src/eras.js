// src/eras.js - personas, era-card flavor, loading quips.
// Each persona carries a short period prefix that gets prepended to the
// input before translation. The whole enriched line is what gets shown.

export const PERSONAS = [
  { id: "random", label: "a mystery figure",    voice: "F1", prefix: "" },
  { id: "spice",  label: "spice merchant",      voice: "F1", prefix: "Good sir -" },
  { id: "trader", label: "tea and silk trader", voice: "F3", prefix: "Kind merchant -" },
  { id: "clerk",  label: "port customs clerk",  voice: "M1", prefix: "For the ledger -" },
  { id: "master", label: "sailing master",      voice: "M3", prefix: "Ahoy -" },
];

const PORTS = {
  es: { city: "Cadiz",     country: "Spain" },
  fr: { city: "Marseille", country: "France" },
  en: { city: "London",    country: "England" },
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
    const options = PERSONAS.filter((p) => p.id !== "random");
    return options[Math.floor(Math.random() * options.length)];
  }
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[1];
}

export function buildEraCard(toLanguage, original, translated, personaId) {
  const port = PORTS[toLanguage] ?? PORTS.en;
  const persona = resolvePersona(personaId);
  const year = 1800 + Math.floor(Math.random() * 99);
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  return {
    city: port.city,
    country: port.country,
    year,
    month,
    day,
    persona: persona.label,
    original,
    translated,
  };
}

export function randomLoadingQuip() {
  return LOADING_QUIPS[Math.floor(Math.random() * LOADING_QUIPS.length)];
}

