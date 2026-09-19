// src/eras.js - randomized era-card flavor: city, year, merchant persona.

const PORTS = {
  es: {
    city: "Cadiz",
    country: "Spain",
    personas: ["spice merchant", "silk trader", "cargo clerk", "ship chandler", "sailmaker"],
  },
  fr: {
    city: "Marseille",
    country: "France",
    personas: ["spice merchant", "silk trader", "perfume merchant", "cargo clerk", "port customs clerk"],
  },
  en: {
    city: "London",
    country: "England",
    personas: ["tea merchant", "ship chandler", "port customs clerk", "sailmaker", "cargo clerk"],
  },
};

const LOADING_QUIPS = [
  "Winding the phonograph...",
  "Consulting the port translator...",
  "Warming up the wax cylinder...",
  "Briefing the harbor scribe...",
  "Sailing to port...",
];

export function buildEraCard(toLanguage, original, translated) {
  const port = PORTS[toLanguage] ?? PORTS.en;
  const year = 1800 + Math.floor(Math.random() * 99);
  const persona = port.personas[Math.floor(Math.random() * port.personas.length)];
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  return {
    city: port.city,
    country: port.country,
    year,
    month,
    day,
    persona,
    original,
    translated,
  };
}

export function randomLoadingQuip() {
  return LOADING_QUIPS[Math.floor(Math.random() * LOADING_QUIPS.length)];
}

