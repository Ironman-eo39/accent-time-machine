# Accent Time Machine

Send a sentence back to the 1800s and hear how any person with different occupation would have said it.

An on-device AI toy built on the [QVAC SDK](https://qvac.tether.io/). You type a modern sentence, pick a period persona / person's job, and the machine delivers it back in the voice of an 1800s dock worker, spice trader, customs clerk, or sailing master — complete with a stamped era card from a random port and year.

Everything runs on your machine. Nothing leaves the device.

## What you actually get

- A **stamped era card** — city, year, persona — as if the sentence arrived by packet ship.
- The **translated sentence** in the target language.
- A **period voice** reading it aloud, spoken by Supertonic 3.
- Two modes:
  - **Just Translate** — the sentence, plain and clean.
  - **Whimsy Mode** — the sentence wrapped in a short period greeting and closing, written on-device by a small LLM.

## Why it isn't just another translator

Translation is the _engine_, not the product. The product is the fiction: you're not reading a translation, you're reading a message that arrived by sail in 1843.

Whimsy Mode is what makes that fiction land. Instead of a raw translation, you get a short opening ("In the depths of the orient, I meet a stranger") and a closing ("Farewell, my dear, may the winds of fortune blow") around the sentence — written live by an on-device LLM, in the target language, in the persona's voice.

The translated sentence itself is **never touched by the LLM**. The LLM only writes the wrapping. That means meaning can't be corrupted, no matter how small the model is.

## The pipeline

**Just Translate (default)**

    text  ->  NMT  ->  TTS  ->  WAV

No LLM is loaded. Deterministic and fast.

**Whimsy Mode (opt-in)**

    text  ->  NMT  -> Use small LLM -> [greeting] + sentence + [closing]  ->  TTS  ->  WAV
                            ^
                            |
                      LLM writes only these as well

The LLM (`LLAMA_3_2_1B_INST_Q4_0`) loads lazily on the first whimsy request. Once loaded it stays warm. If it fails, produces garbage, or times out, the pipeline falls back to plain mode without breaking the request.

## QVAC SDK functions used

| Function       | Where                                               | Purpose                                |
| -------------- | --------------------------------------------------- | -------------------------------------- |
| `loadModel`    | `src/translate.js`, `src/speak.js`, `src/whimsy.js` | Loads NMT, TTS, and LLM models         |
| `translate`    | `src/translate.js`                                  | Neural machine translation             |
| `textToSpeech` | `src/speak.js`                                      | Supertonic 3 voice synthesis           |
| `completion`   | `src/whimsy.js`                                     | LLM writes the period greeting/closing |
| `unloadModel`  | `src/speak.js`, `src/whimsy.js`                     | Frees prior voice / LLM                |
| `close`        | `server.js`                                         | Graceful shutdown                      |

SDK version: **@qvac/sdk ^0.19.1**

## Requirements

- Node.js >= 22.17.0
- ~2 GB free RAM (NMT + TTS); add ~1 GB when Whimsy Mode loads the LLM
- No GPU required

## Install

    npm install

## Run

    npm start

Open [http://localhost:3459](http://localhost:3459).

First request of a given language pair pays the NMT model load. First English request pays the English voice load. Whimsy Mode pays the LLM load on first use.

## Using it

- **Whimsy mode** — off by default. Toggle state persists across reloads.
- **Persona** — appears only when Whimsy Mode is on. Picks the period voice used for the greeting/closing and for TTS.
- **Swap** — flips departure and arrival languages.
- Available routes: English ↔ Español, English ↔ Français.

## Project structure

    server.js              Express + SSE endpoint, warmup, shutdown
    src/translate.js       NMT wrapper with per-pair model cache
    src/speak.js           TTS wrapper with per-language voice cache
    src/whimsy.js          LLM greeting/closing frame (lazy-loaded)
    src/eras.js            Personas, era-card flavor, loading quips
    src/wav.js             Wrap raw PCM in a WAV container
    public/                Frontend (index.html, app.js, styles.css)

## API

- `POST /api/time-travel` — SSE stream. Body: `{ text, from, to, persona, whimsy }`
- `GET /api/status` — warmup state and available language directions

## Privacy

Every stage — translation, framing, and speech — runs on-device through the QVAC SDK. No network calls at inference time. No API keys. No cloud.

## License

MIT
