// server.js - HTTP server + SSE endpoint for the translate -> [whimsy] -> speak pipeline.

import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { close } from "@qvac/sdk";
import { translateText, ensurePairLoaded, isValidDirection, getAvailableDirections } from "./src/translate.js";
import { speak, ensureVoiceLoaded } from "./src/speak.js";
import { buildWav } from "./src/wav.js";
import { buildEraCard, randomLoadingQuip, resolvePersona, NEUTRAL_PERSONA } from "./src/eras.js";
import { buildFrame, unloadLLM } from "./src/whimsy.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3459);
const app = express();

app.use(express.json({ limit: "16kb" }));

const warmup = { started: false, done: false, error: null };

async function warmupModels() {
  if (warmup.started) return;
  warmup.started = true;
  try {
    await ensurePairLoaded("en", "es");
    await ensureVoiceLoaded("es", "F1");
    warmup.done = true;
    console.log("[warmup] ready (NMT + TTS only; LLM loads on first whimsy request)");
  } catch (err) {
    warmup.error = err.message;
    console.error("[warmup] failed:", err.message);
  }
}

app.get("/api/status", (req, res) => {
  res.json({
    ready: warmup.done,
    loading: warmup.started && !warmup.done && !warmup.error,
    error: warmup.error,
    directions: getAvailableDirections(),
    quip: randomLoadingQuip(),
  });
});

app.post("/api/time-travel", async (req, res) => {
  const body = req.body ?? {};
  const text = body.text;
  const from = body.from;
  const to = body.to;
  const whimsy = body.whimsy === true;

  if (typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ error: "Type something first." });
  }
  if (text.length > 500) {
    return res.status(400).json({ error: "Keep it under 500 characters." });
  }
  if (from === to) {
    return res.status(400).json({ error: "Pick different departure and arrival languages." });
  }
  if (!isValidDirection(from, to)) {
    return res.status(400).json({ error: "That route is not available." });
  }

  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });

  const send = (event, data) => {
    res.write("event: " + event + "\n" + "data: " + JSON.stringify(data) + "\n\n");
  };

  try {
    // Persona is only resolved when whimsy is on. Otherwise neutral voice, no prefix.
    const persona = whimsy
      ? resolvePersona(typeof body.persona === "string" ? body.persona : "random")
      : NEUTRAL_PERSONA;

    // Prefix removed: the whimsy frame now provides greeting; pure mode has none.
    const enriched = text.trim();

    send("phase", { phase: "translating", label: "Consulting the port translator..." });
    const translated = await translateText(enriched, from, to);
    send("translation", { translated, whimsy });

    let greeting = "";
    let closing = "";
    if (whimsy) {
      send("phase", { phase: "dramatizing", label: "Stirring the inkwell..." });
      try {
        const frame = await buildFrame(to, persona);
        greeting = frame.greeting;
        closing = frame.closing;
        send("dramatized", { greeting, closing });
      } catch (err) {
        console.error("[whimsy] frame failed, using plain translation:", err.message);
      }
    }

    // Translated sentence is NEVER modified. Frame goes around it.
    const spoken = [greeting, translated, closing].filter(Boolean).join(" ");
    const finalText = spoken;

    send("phase", { phase: "synthesizing", label: "Winding the phonograph..." });
    const result = await speak(finalText, to, persona.voice);
    const wav = buildWav(result.pcm, result.sampleRate);
    const card = buildEraCard(to, text.trim(), translated, persona.label, whimsy);
    card.greeting = greeting;
    card.closing = closing;

    send("audio", { wavBase64: wav.toString("base64"), sampleRate: result.sampleRate, card });
    send("done", {});
  } catch (err) {
    console.error("[time-travel] failed:", err);
    send("error", { message: err.message || "The passage of time failed." });
  } finally {
    res.end();
  }
});

app.use(express.static(join(__dirname, "public")));

const server = app.listen(PORT, () => {
  console.log("Accent Time Machine listening at http://localhost:" + PORT);
  warmupModels();
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    console.log("");
    console.log("Shutting down...");
    server.close();
    try { await unloadLLM(); } catch { /* ignore */ }
    try { await close(); } catch { /* ignore */ }
    process.exit(0);
  });
}





