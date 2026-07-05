const OBJECTS = {
  clock: {
    kicker: "止まった時計",
    title: "二十三時四十七分",
    text: "時計は、澪が消えた時刻で止まっている。裏蓋を開けると、月の印を刻んだ金属片が落ちた。",
    memory: "『停電しても、時計だけは嘘をつかない。23:47を覚えていて』",
    mark: "月",
    symbol: "☾",
    message: "時計は、澪が消えた時刻を指している。",
  },
  painting: {
    kicker: "ふたりで描いた風景",
    title: "月のない夜",
    text: "幼い頃、澪と一緒に描いた山の絵だ。額縁の裏に、星形の金属片と短い手紙が貼られている。",
    memory: "『お姉ちゃん。月が消えたら、星の位置を見て。入口は絵の中と同じ場所にある』",
    mark: "星",
    symbol: "✦",
    message: "古い絵は、扉の向こうの景色を描いている。",
  },
  book: {
    kicker: "澪の日記",
    title: "最後のページ",
    text: "赤い日記の最後だけが切り抜かれている。その空洞には、波模様の欠片と録音用の小さな紙片があった。",
    memory: "『あの扉は、忘れたものを集めた人にだけ応える。私は先に行って確かめる』",
    mark: "波",
    symbol: "≈",
    message: "澪は、自分の意思で扉の向こうへ進んだらしい。",
  },
  plant: {
    kicker: "青い花の鉢",
    title: "埋められた約束",
    text: "澪の誕生日に贈った青い花は枯れていた。土をそっと払うと、太陽の印がある最後の欠片が現れる。",
    memory: "『帰ったら、今度こそ一緒に海を見に行こう。約束を忘れないで』",
    mark: "陽",
    symbol: "☀",
    message: "鉢の底に、澪と交わした約束が残されていた。",
  },
};

const state = {
  found: new Set(),
  doorUnlocked: false,
  doorOpen: false,
  activeObject: null,
  audioEnabled: true,
};

let audioContext = null;
let masterGain = null;
let ambienceGain = null;
let musicTimer = null;

const elements = {
  intro: document.querySelector("#intro"),
  startButton: document.querySelector("#start-button"),
  dialog: document.querySelector("#dialog"),
  dialogClose: document.querySelector("#dialog-close"),
  dialogAction: document.querySelector("#dialog-action"),
  dialogKicker: document.querySelector("#dialog-kicker"),
  dialogTitle: document.querySelector("#dialog-title"),
  dialogText: document.querySelector("#dialog-text"),
  dialogMemory: document.querySelector("#dialog-memory"),
  dialogSymbol: document.querySelector("#dialog-symbol"),
  fragmentMark: document.querySelector("#fragment-mark"),
  progressLabel: document.querySelector("#progress-label"),
  progressFill: document.querySelector("#progress-fill"),
  roomMessage: document.querySelector("#room-message"),
  door: document.querySelector("#door"),
  hintButton: document.querySelector("#hint-button"),
  audioButton: document.querySelector("#audio-button"),
  resetButton: document.querySelector("#reset-button"),
  memoryText: document.querySelector("#memory-text"),
  fragmentSlots: [...document.querySelectorAll("[data-fragment]")],
  ending: document.querySelector("#ending"),
  replayButton: document.querySelector("#replay-button"),
  hotspots: [...document.querySelectorAll(".hotspot")],
};

function showOverlay(element) {
  element.classList.add("is-visible");
  const focusTarget = element.querySelector("button");
  window.setTimeout(() => focusTarget?.focus(), 50);
}

function hideOverlay(element) {
  element.classList.remove("is-visible");
}

function setRoomMessage(message) {
  elements.roomMessage.textContent = message;
}

function createTone(frequency, duration = 0.2, options = {}) {
  if (!audioContext || !masterGain || !state.audioEnabled) return;

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = options.type ?? "sine";
  oscillator.frequency.setValueAtTime(frequency, now);
  if (options.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, now + duration);
  }
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(options.volume ?? 0.11, now + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.04);
}

function playMusicPhrase() {
  if (!audioContext || !masterGain || !state.audioEnabled) return;

  const notes = [220, 277.18, 329.63, 246.94];
  notes.forEach((frequency, index) => {
    const start = audioContext.currentTime + index * 0.72;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.028, start + 0.16);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.25);
    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(start);
    oscillator.stop(start + 1.3);
  });
}

function initializeAudio() {
  if (audioContext) {
    audioContext.resume();
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    state.audioEnabled = false;
    updateAudioButton();
    return;
  }

  audioContext = new AudioContextClass();
  masterGain = audioContext.createGain();
  ambienceGain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  const droneA = audioContext.createOscillator();
  const droneB = audioContext.createOscillator();
  const lfo = audioContext.createOscillator();
  const lfoDepth = audioContext.createGain();

  masterGain.gain.value = 0.26;
  ambienceGain.gain.value = 0.045;
  filter.type = "lowpass";
  filter.frequency.value = 420;
  droneA.type = "sine";
  droneA.frequency.value = 55;
  droneB.type = "triangle";
  droneB.frequency.value = 82.41;
  lfo.type = "sine";
  lfo.frequency.value = 0.09;
  lfoDepth.gain.value = 0.012;

  droneA.connect(filter);
  droneB.connect(filter);
  filter.connect(ambienceGain);
  ambienceGain.connect(masterGain);
  lfo.connect(lfoDepth);
  lfoDepth.connect(ambienceGain.gain);
  masterGain.connect(audioContext.destination);

  droneA.start();
  droneB.start();
  lfo.start();
  playMusicPhrase();
  musicTimer = window.setInterval(playMusicPhrase, 6200);
}

function playSound(name) {
  if (!state.audioEnabled) return;

  if (name === "discover") {
    createTone(523.25, 0.45, { volume: 0.1 });
    window.setTimeout(() => createTone(783.99, 0.62, { volume: 0.08 }), 110);
  } else if (name === "door") {
    createTone(130.81, 1.1, {
      type: "sawtooth",
      endFrequency: 55,
      volume: 0.07,
    });
    window.setTimeout(() => createTone(392, 0.9, { volume: 0.08 }), 520);
  } else if (name === "ending") {
    [392, 493.88, 587.33].forEach((frequency, index) => {
      window.setTimeout(() => createTone(frequency, 0.8, { volume: 0.085 }), index * 160);
    });
  } else {
    createTone(330, 0.12, { volume: 0.045 });
  }
}

function updateAudioButton() {
  elements.audioButton.textContent = state.audioEnabled ? "音：ON" : "音：OFF";
  elements.audioButton.setAttribute("aria-pressed", String(state.audioEnabled));
}

function toggleAudio() {
  state.audioEnabled = !state.audioEnabled;

  if (state.audioEnabled) {
    initializeAudio();
    masterGain?.gain.setTargetAtTime(0.26, audioContext.currentTime, 0.08);
  } else if (masterGain && audioContext) {
    masterGain.gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.06);
  }

  updateAudioButton();
}

function updateProgress() {
  const count = state.found.size;
  elements.progressLabel.textContent = `手がかり ${count} / 4`;
  elements.progressFill.style.width = `${(count / 4) * 100}%`;
  elements.fragmentSlots.forEach((slot) => {
    slot.classList.toggle("is-found", state.found.has(slot.dataset.fragment));
  });
}

function unlockDoor() {
  if (state.doorUnlocked) return;

  state.doorUnlocked = true;
  elements.door.classList.add("is-unlocked");
  elements.door.setAttribute("aria-label", "開けられる扉");
  setRoomMessage("四つの記憶が重なり、扉の奥でオルゴールが鳴り始めた。");
  elements.memoryText.textContent = "月、星、波、太陽。澪の記憶がひとつの道を指している。";
  playSound("door");

  window.setTimeout(() => {
    elements.door.classList.add("is-open");
    state.doorOpen = true;
    setRoomMessage("扉が開いた。澪の声を追って、向こう側へ。");
  }, 850);
}

function inspectObject(id) {
  const object = OBJECTS[id];
  if (!object) return;

  state.activeObject = id;
  elements.dialogKicker.textContent = object.kicker;
  elements.dialogTitle.textContent = object.title;
  elements.dialogText.textContent = object.text;
  elements.dialogMemory.textContent = object.memory;
  elements.dialogSymbol.textContent = object.symbol;
  elements.fragmentMark.textContent = object.mark;

  if (!state.found.has(id)) {
    state.found.add(id);
    document.querySelector(`[data-object="${id}"]`)?.classList.add("is-found");
    updateProgress();
    setRoomMessage(object.message);
    elements.memoryText.textContent = object.memory;
    playSound("discover");
  } else {
    playSound("ui");
  }

  showOverlay(elements.dialog);
}

function closeDialog() {
  hideOverlay(elements.dialog);

  if (state.found.size === Object.keys(OBJECTS).length) {
    window.setTimeout(unlockDoor, 300);
  } else {
    const activeHotspot = document.querySelector(`[data-object="${state.activeObject}"]`);
    activeHotspot?.focus();
  }
}

function showHint() {
  if (state.doorOpen) {
    setRoomMessage("開いた扉をクリックして、次の場所へ進もう。");
    elements.door.focus();
    return;
  }

  const next = elements.hotspots.find(
    (hotspot) => !state.found.has(hotspot.dataset.object),
  );

  if (!next) {
    setRoomMessage("四つの記憶が揃った。澪が封じた扉に注目しよう。");
    elements.door.focus();
    return;
  }

  const names = {
    clock: "中央の壁で、澪が消えた時刻を指すものを探そう。",
    painting: "左の壁にある、ふたりで描いた夜の絵を調べよう。",
    book: "書きかけの言葉は、中央の机に残されている。",
    plant: "出口のそばにある、枯れた青い花も忘れずに。",
  };

  setRoomMessage(names[next.dataset.object]);
  next.animate(
    [
      { filter: "brightness(1)" },
      { filter: "brightness(1.8)" },
      { filter: "brightness(1)" },
    ],
    { duration: 900, iterations: 2 },
  );
  next.focus();
}

function enterDoor() {
  if (!state.doorOpen) {
    const remaining = Object.keys(OBJECTS).length - state.found.size;
    setRoomMessage(`扉は澪の記憶を待っている。欠片があと${remaining}つ必要だ。`);
    playSound("ui");
    return;
  }

  playSound("ending");
  showOverlay(elements.ending);
}

function resetGame({ showIntro = false } = {}) {
  state.found.clear();
  state.doorUnlocked = false;
  state.doorOpen = false;
  state.activeObject = null;

  elements.hotspots.forEach((hotspot) => hotspot.classList.remove("is-found"));
  elements.door.classList.remove("is-unlocked", "is-open");
  elements.door.setAttribute("aria-label", "閉ざされた扉");
  hideOverlay(elements.dialog);
  hideOverlay(elements.ending);
  updateProgress();
  elements.memoryText.textContent =
    "妹の澪が消えた夜、この部屋だけが内側から閉ざされた。";
  setRoomMessage("澪が残した四つの記憶を探そう。");

  if (showIntro) {
    showOverlay(elements.intro);
  } else {
    hideOverlay(elements.intro);
    elements.hotspots[0]?.focus();
  }
}

elements.startButton.addEventListener("click", () => {
  initializeAudio();
  playSound("ui");
  hideOverlay(elements.intro);
  elements.hotspots[0]?.focus();
});

elements.hotspots.forEach((hotspot) => {
  hotspot.addEventListener("click", () => inspectObject(hotspot.dataset.object));
});

elements.dialogClose.addEventListener("click", closeDialog);
elements.dialogAction.addEventListener("click", closeDialog);
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) closeDialog();
});
elements.door.addEventListener("click", enterDoor);
elements.hintButton.addEventListener("click", showHint);
elements.audioButton.addEventListener("click", toggleAudio);
elements.resetButton.addEventListener("click", () => resetGame({ showIntro: true }));
elements.replayButton.addEventListener("click", () => resetGame());

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (elements.dialog.classList.contains("is-visible")) closeDialog();
});

updateProgress();
updateAudioButton();
