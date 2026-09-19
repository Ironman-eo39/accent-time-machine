# Accent Time Machine

Type a modern sentence. Pick a language. Hear it spoken back the way an 1800s port merchant, sailor, clerk etc would have said it along with some quirky things added to the voice/translation -Everything is translated and voiced, entirely on your machine.

No API keys. No cloud AI. No data leaving your laptop.

Built for the [Tether QVAC hackathon](https://qvac.tether.io) using `@qvac/sdk`.

---

## What it does

You type something like *"Can I get this shipped by Friday?"* and pick a destination language. The app:

1. Prefixes your sentence with a short period-flavored phrase matching a chosen persona (e.g. *"Good sir - "*, *"Ahoy - "*, *"Kind merchant - "*).
2. Translates the enriched sentence on-device using a Bergamot neural machine translation model.
3. Synthesizes speech from the translation using Supertonic 3, in the language's own voice.
4. Renders it all on an "era card" - a stamped, dated, wax-sealed envelope from a fictional port city circa 1800-1899.

The translated audio streams to the browser and plays automatically. You can replay it, change the persona, or send another sentence.

It is a novelty, not a philological tool. The "1800s" is framing - the translation is modern, and the voice is modern. The interesting part is that both the translation and the speech are running on your own hardware, right now, with no network calls.

---

## QVAC SDK functions used

This project uses **`@qvac/sdk` version `0.19.1`** and calls five functions from it.

| Function | Where | Purpose |
|---|---|---|
| `loadModel` | `src/translate.js`, `src/speak.js`, `server.js` | Loads the four Bergamot translation models (one per direction) and the Supertonic 3 multilingual TTS model |
| `translate` | `src/translate.js` | Runs neural machine translation on the enriched sentence |
| `textToSpeech` | `src/speak.js` | Synthesizes speech from the translated text |
| `unloadModel` | `src/speak.js` | Releases the previous voice when switching personas, so RAM stays flat |
| `close` | `server.js` | Releases all QVAC resources cleanly on Ctrl+C / SIGTERM |

All five are documented QVAC functions. No invented APIs, no cloud AI anywhere in the request path.

### Models

| Model constant | Type | Size | Role |
|---|---|---|---|
| `BERGAMOT_EN_ES` | NMT (specialist transformer) | ~90 MB | English -> Spanish |
| `BERGAMOT_ES_EN` | NMT | ~90 MB | Spanish -> English |
| `BERGAMOT_EN_FR` | NMT | ~90 MB | English -> French |
| `BERGAMOT_FR_EN` | NMT | ~90 MB | French -> English |
| `TTS_MULTILINGUAL_SUPERTONIC3_Q8_0` | TTS (GGML) | ~127 MB | All voices, all languages |

Bergamot is a **purpose-built translator**, not a general-purpose LLM. It is smaller, faster, and more accurate at the specific job than a chat model of comparable size. Supertonic 3 is a **purpose-built TTS engine** with six voices per language (F1-F3 female, M1-M3 male).

**No large language model is used anywhere in this project.** That is a deliberate design choice, not a limitation.

---

## Requirements

- **Node.js** `>= 22.17` (QVAC worker requirement)
- **Windows:** Vulkan `>= 1.4` installed - required by QVAC even for CPU-only inference
- **Disk:** ~700 MB for the model cache (one-time)
- **RAM:** ~500 MB peak while running
- **Network:** needed only for the one-time model download. After that, the app runs fully offline.

No GPU required. Everything runs on CPU.

---

## Install

```bash
git clone https://github.com/Ironman-eo39/accent-time-machine.git
cd accent-time-machine
npm install
```

`npm install` pulls `@qvac/sdk@^0.19.0` and `express`, along with QVAC's native prebuilds. It may take 1-3 minutes on first run.

---

## Run

```bash
npm start
```

The server listens on **http://localhost:3459** (override with the `PORT` environment variable).

Open it in a browser. On first launch, the models download from the QVAC distributed registry. Progress appears in the terminal. Total first-run download is ~700 MB across five models; subsequent runs start in about two seconds because everything is cached in `~/.qvac/models/`.

### First-run flow

```
Accent Time Machine listening at http://localhost:3459
[engine] Loading from registry: ...
[engine] Downloading blob directly: model.enes.intgemm.alphas.bin
[engine] Checksum validated for model.enes.intgemm.alphas.bin
...
[engine] tts-ggml model loaded
[warmup] ready
```

`[warmup] ready` means the app is fully usable.

---

## Supported routes

Only four translation directions are available, because only those four Bergamot models exist in the QVAC registry.

| From | To | Available |
|---|---|---|
| English | Espanol | yes |
| Espanol | English | yes |
| English | Francais | yes |
| Francais | English | yes |
| Espanol | Francais | no |
| Francais | Espanol | no |

The UI enforces this: invalid combinations disable the send button and show a red note. The swap button between the two language dropdowns flips departure and arrival in one click.

Chinese is **not** supported - Supertonic 3 does not ship a Chinese voice.

---

## Personas

The persona picker chooses both the label on the era card and the TTS voice that speaks the translation. The prefix shown in the translated line matches the persona.

| Persona | Voice | Prefix |
|---|---|---|
| Random | (any) | (picked at random) |
| Spice merchant | F1 | Good sir - |
| Tea and silk trader | F3 | Kind merchant - |
| Port customs clerk | M1 | For the ledger - |
| Sailing master | M3 | Ahoy - |

Selecting a specific persona disables randomization for that request. Leaving it on **Random** picks a different persona each time, so consecutive sends produce visibly and audibly distinct results.

---

## How the project works

```
Browser (public/index.html, app.js)
   |  POST /api/time-travel  { text, from, to, persona }
   v
Express server (server.js)
   |  1. Resolve persona -> { label, voice, prefix }
   |  2. Prepend prefix to user's text
   |  3. loadModel(translation pair) - cached per direction
   |  4. translate(enriched, from, to)                    -> translated text
   |  5. loadModel(voice for arrival language) - cached per voice
   |  6. textToSpeech(translated, voice)                  -> PCM samples
   |  7. Wrap PCM in a WAV header (src/wav.js)
   v
SSE stream: phase events -> translation event -> audio event (base64 WAV + era card)
   v
Browser renders the era card + plays the audio
```

### Files

| File | Purpose |
|---|---|
| `server.js` | Express app, `POST /api/time-travel` (SSE), `GET /api/status`, static file serving, shutdown handling |
| `src/translate.js` | Bergamot wrapper. Loads each translation pair lazily and caches by direction |
| `src/speak.js` | Supertonic 3 wrapper. One voice per language is held in memory; switching voice unloads the previous one |
| `src/wav.js` | Wraps raw Int16 PCM in a minimal WAV container for the browser |
| `src/eras.js` | Persona definitions, era-card flavor (city/date/persona), loading quips |
| `public/index.html` | Single-page UI: composer, era card, audio player |
| `public/styles.css` | Vintage paper-and-ink theme (Palatino, sepia palette, dashed ticket border) |
| `public/app.js` | Form handler, SSE reader, base64 to WAV blob to audio playback |
| `scripts/spike.js` | Development probe: reports which QVAC model constants and functions exist |
| `scripts/voices.js` | Development probe: verifies which Supertonic voices a language supports |
| `scripts/smoke.js` | Standalone CLI test: `node scripts/smoke.js "sentence" fr` |

### Model caching behavior

- **Translation models** are cached by direction. Loading `en-es` does not download or reload `en-fr`.
- **TTS voices** are cached by language. Switching voice for the same language unloads the old one, keeping peak RAM around two models (one translation pair + one voice).
- All models persist to `~/.qvac/models/`. The cache survives server restarts.

### Streaming

The `/api/time-travel` endpoint returns **Server-Sent Events**, not JSON. As translation and synthesis progress, the server pushes named events to the browser:

```
event: phase
data: {"phase":"translating","label":"Consulting the port translator..."}

event: translation
data: {"translated":"Bueno senor - Puedo enviar esto para el viernes?"}

event: phase
data: {"phase":"synthesizing","label":"Winding the phonograph..."}

event: audio
data: {"wavBase64":"...","sampleRate":44100,"card":{...}}

event: done
data: {}
```

The browser reads the stream with `fetch` + `ReadableStream`, decodes the SSE blocks, and renders each phase as it arrives. This is why the UI shows "Consulting the port translator..." before "Winding the phonograph..." - those are real stage transitions from the server.

---

## Privacy

- **Nothing is written to disk.** No session state, no history, no logs of user input.
- **Nothing is transmitted off-device.** The text goes from the browser to `localhost:3459`, then to the local QVAC worker over IPC, then to the local translation and speech models running in-process. It goes nowhere else.
- **No cloud AI service** is used anywhere in the request path.
- **The only outbound network activity** is the one-time model download from the QVAC registry, which happens during the first `loadModel` call and is visible in the terminal. After that, the app runs entirely offline.

You can verify the offline claim: launch the app, run one translation, then disable your network connection. The next translation completes normally because every model is cached locally.

---

## Limitations

- **Four routes only.** EN/ES and EN/FR. No ES/FR, no Chinese.
- **Not a translation tool for serious use.** Bergamot is fast and decent, but it is not DeepL. It is used here for the demonstration.
- **The "1800s" is a frame.** The translation and voice are modern. The era card is decorative.
- **Single user, single machine.** No accounts, no sync, no multi-session state.
- **No voice customization.** Voices are tied to personas; you cannot independently pick a voice and a persona.

---

## Verify on-device inference

1. Start the app with `npm start` and open http://localhost:3459.
2. Run one translation to warm the caches.
3. Disconnect from the internet (turn off Wi-Fi, unplug the network cable, or set your OS to airplane mode).
4. Run another translation.

It will work exactly as before. The models are cached locally and no network request is made during normal operation.

---

## License

MIT. See [LICENSE](./LICENSE).

---

## Acknowledgments

Built for the [Tether QVAC hackathon](https://qvac.tether.io). Uses the QVAC SDK's `translate` and `textToSpeech` capabilities. Bergamot translation models and Supertonic 3 are sourced from the QVAC distributed model registry. The repository [tetherto/qvac](https://github.com/tetherto/qvac) is worth a star.

