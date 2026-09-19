// public/app.js - form handler, SSE reader, audio player.

const fromSelect = document.querySelector("#from");
const toSelect = document.querySelector("#to");
const textInput = document.querySelector("#text");
const charCount = document.querySelector("#char-count");
const sendButton = document.querySelector("#send");

const statusSection = document.querySelector("#status-section");
const statusLabel = document.querySelector("#status-label");

const resultSection = document.querySelector("#result-section");
const cityEl = document.querySelector("#city");
const dateEl = document.querySelector("#date-string");
const personaEl = document.querySelector("#persona");
const translatedEl = document.querySelector("#translated");
const originalEl = document.querySelector("#original");
const playButton = document.querySelector("#play");
const playIcon = document.querySelector("#play-icon");
const playLabel = document.querySelector("#play-label");
const audioEl = document.querySelector("#audio");
const anotherButton = document.querySelector("#another");

const errorSection = document.querySelector("#error-section");
const errorText = document.querySelector("#error-text");
const retryButton = document.querySelector("#retry");

let busy = false;

const VALID_DIRECTIONS = new Set(["en-es", "es-en", "en-fr", "fr-en"]);

function isRouteValid() {
  return VALID_DIRECTIONS.has(fromSelect.value + "-" + toSelect.value);
}

function updateSendState() {
  const text = textInput.value.trim();
  const valid = isRouteValid();
  charCount.textContent = textInput.value.length + " / 500";
  sendButton.disabled = busy || text.length === 0 || !valid;
  const note = document.querySelector("#route-note");
  if (!note) return;
  if (valid) {
    note.textContent = "Available routes: English \u2194 Espa\u00f1ol \u00b7 English \u2194 Fran\u00e7ais";
    note.classList.remove("invalid");
  } else {
    note.textContent = "That route is not available. Only English \u2194 Espa\u00f1ol and English \u2194 Fran\u00e7ais." ;
    note.classList.add("invalid");
  }
}

function resetToComposer() {
  resultSection.hidden = true;
  errorSection.hidden = true;
  statusSection.hidden = true;
  textInput.value = "";
  audioEl.pause();
  audioEl.removeAttribute("src");
  updateSendState();
  textInput.focus();
}

function showError(message) {
  statusSection.hidden = true;
  resultSection.hidden = true;
  errorSection.hidden = false;
  errorText.textContent = message;
}

function formatDate(card) {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return months[card.month - 1] + " " + card.day + ", " + card.year;
}

function renderCard(card) {
  cityEl.textContent = card.city.toUpperCase();
  dateEl.textContent = formatDate(card);
  personaEl.textContent = card.persona;
  translatedEl.textContent = card.translated;
  originalEl.textContent = card.original;
}

function parseSSEBlock(block) {
  let eventType = "message";
  let dataLine = null;
  for (const line of block.split("\n")) {
    if (line.startsWith("event: ")) eventType = line.slice(7).trim();
    else if (line.startsWith("data: ")) dataLine = line.slice(6);
  }
  return { eventType, dataLine };
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function timeTravel() {
  const text = textInput.value.trim();
  const from = fromSelect.value;
  const to = toSelect.value;
  if (!text || from === to) return;

  busy = true;
  updateSendState();
  errorSection.hidden = true;
  resultSection.hidden = true;
  statusSection.hidden = false;
  statusLabel.textContent = "Consulting the port translator...";

  let card = null;
  let wavBase64 = null;

  try {
    const response = await fetch("/api/time-travel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, from, to }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "The passage of time failed.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value || new Uint8Array(), { stream: !chunk.done });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() || "";

      for (const block of blocks) {
        const parsed = parseSSEBlock(block);
        if (parsed.dataLine === null) continue;
        let data;
        try { data = JSON.parse(parsed.dataLine); } catch { continue; }

        if (parsed.eventType === "phase") {
          statusLabel.textContent = data.label || "Working...";
        } else if (parsed.eventType === "translation") {
          statusLabel.textContent = "Winding the phonograph...";
        } else if (parsed.eventType === "audio") {
          card = data.card;
          wavBase64 = data.wavBase64;
        } else if (parsed.eventType === "error") {
          throw new Error(data.message || "The passage of time failed.");
        }
      }

      if (chunk.done) break;
    }

    if (!card || !wavBase64) throw new Error("The time machine returned nothing.");

    renderCard(card);

    const bytes = base64ToBytes(wavBase64);
    const blob = new Blob([bytes], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    audioEl.src = url;

    statusSection.hidden = true;
    resultSection.hidden = false;

    try { await audioEl.play(); } catch { /* autoplay blocked */ }
  } catch (err) {
    showError(err.message || "Something went wrong.");
  } finally {
    busy = false;
    updateSendState();
  }
}

sendButton.addEventListener("click", timeTravel);
textInput.addEventListener("input", updateSendState);
fromSelect.addEventListener("change", updateSendState);
toSelect.addEventListener("change", updateSendState);

textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    timeTravel();
  }
});

playButton.addEventListener("click", async () => {
  if (audioEl.paused) await audioEl.play().catch(() => {});
  else { audioEl.pause(); audioEl.currentTime = 0; }
});

audioEl.addEventListener("play", () => {
  playButton.classList.add("playing");
  playIcon.innerHTML = "&nbsp;&#9632;&nbsp;";
  playLabel.textContent = "PLAYING...";
});

audioEl.addEventListener("pause", () => {
  playButton.classList.remove("playing");
  playIcon.innerHTML = "&nbsp;&#9654;&nbsp;";
  playLabel.textContent = "PLAY THE PHONOGRAPH";
});

audioEl.addEventListener("ended", () => {
  playButton.classList.remove("playing");
  playIcon.innerHTML = "&nbsp;&#9654;&nbsp;";
  playLabel.textContent = "PLAY THE PHONOGRAPH";
});

anotherButton.addEventListener("click", resetToComposer);
retryButton.addEventListener("click", () => { errorSection.hidden = true; timeTravel(); });

const swapButton = document.querySelector("#swap");
if (swapButton) {
  swapButton.addEventListener("click", () => {
    const a = fromSelect.value;
    const b = toSelect.value;
    fromSelect.value = b;
    toSelect.value = a;
    updateSendState();
  });
}

updateSendState();

