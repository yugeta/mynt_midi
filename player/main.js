import "../api/main.js";

const MANIFEST_PATH = "../data/index.json";
const DEFAULT_FILES = ["コイン.json"];

let controller = null;

function setStatus(message) {
  const statusEl = document.getElementById("status");
  statusEl.textContent = `Status: ${message}`;
}

async function loadManifestFiles() {
  try {
    const response = await fetch(MANIFEST_PATH);
    if (!response.ok) {
      throw new Error(`manifest load failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.files) || data.files.length === 0) {
      throw new Error("manifest is invalid or empty");
    }

    return data.files;
  } catch (error) {
    console.warn("[player] fallback file list is used:", error);
    return DEFAULT_FILES;
  }
}

function makeJsonUrl(fileName) {
  return `../data/${encodeURIComponent(fileName)}`;
}

function getPlayOptions() {
  const loopFlag = document.getElementById("loop-flag").checked;
  const fadeOutFlag = document.getElementById("fadeout-flag").checked;

  return {
    loop: loopFlag,
    fadeOut: fadeOutFlag,
    fadeOutSec: 0.08,
  };
}

async function bindSelectedTrack() {
  const selectEl = document.getElementById("json-select");
  const fileName = selectEl.value;

  if (!fileName) {
    setStatus("error - no track selected");
    return;
  }

  if (controller) {
    controller.dispose();
    controller = null;
  }

  const sourceUrl = makeJsonUrl(fileName);

  controller = await window.MyntMidi.bindPlay({
    source: {
      type: "json-url",
      value: sourceUrl,
    },
    playTrigger: {
      target: "#play-btn",
      event: "click",
    },
    stopTrigger: {
      target: "#stop-btn",
      event: "click",
    },
    options: getPlayOptions(),
    callbacks: {
      onStart: ({ handle }) => {
        setStatus(`playing: ${fileName} (loop: ${handle.looping ? "on" : "off"})`);
      },
      onEnd: () => {
        setStatus(`ended: ${fileName}`);
      },
      onStop: () => {
        setStatus(`stopped: ${fileName}`);
      },
      onError: (error) => {
        setStatus(`error - ${error.message || "unknown error"}`);
        console.error(error);
      },
    },
  });

  setStatus(`ready: ${fileName}`);
}

async function init() {
  const selectEl = document.getElementById("json-select");
  const loopFlag = document.getElementById("loop-flag");
  const fadeOutFlag = document.getElementById("fadeout-flag");

  setStatus("loading manifest...");

  const files = await loadManifestFiles();
  selectEl.innerHTML = "";

  for (const file of files) {
    const option = document.createElement("option");
    option.value = file;
    option.textContent = file;
    selectEl.appendChild(option);
  }

  await bindSelectedTrack();

  selectEl.addEventListener("change", bindSelectedTrack);
  loopFlag.addEventListener("change", bindSelectedTrack);
  fadeOutFlag.addEventListener("change", bindSelectedTrack);
}

window.addEventListener("DOMContentLoaded", () => {
  init().catch((error) => {
    setStatus(`error - ${error.message || "init failed"}`);
    console.error(error);
  });
});
