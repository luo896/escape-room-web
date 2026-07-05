const OBJECTS = {
  clock: {
    kicker: "止まった時計",
    title: "動かない二本の針",
    text: "裏蓋には月と波の刻印があり、二本の針だけが手で動く。正しい時刻に合わせれば、内部の鍵が外れそうだ。",
    memory: "『月の位置を時に、波の数を分に。二つの記憶を重ねて』",
    solvedTitle: "七時二十分",
    solvedText: "二本の針が重なるように震え、裏蓋が開いた。中から月の印を刻んだ金属片が落ちる。",
    solvedMemory: "『覚えていてくれたんだね。これで最初の鍵は開いた』",
    mark: "月",
    symbol: "☾",
    message: "時計の内部から「月」の欠片を取り出した。",
  },
  painting: {
    kicker: "ふたりで描いた風景",
    title: "指でなぞられた夜",
    text: "幼い頃、澪と一緒に描いた山の絵だ。山、月、星の表面だけに、指で何度もなぞった跡が残っている。",
    memory: "『足元から空へ。近いものから、もっと遠いものへ。私が見た順になぞって』",
    solvedTitle: "山、月、星",
    solvedText: "山から月へ、月から星へ。最後の星に触れると額縁が外れ、裏から星形の金属片が現れた。",
    solvedMemory: "『月は七つ目の刻で、山の稜線に触れた。入口は絵の中と同じ場所にある』",
    mark: "星",
    symbol: "✦",
    message: "古い絵は、扉の向こうの景色を描いている。",
  },
  book: {
    kicker: "澪の日記",
    title: "置き換えられた言葉",
    text: "赤い日記の留め金には、三つの文字盤がある。最後のページに残された暗号を元の言葉へ戻せば開きそうだ。",
    memory: "『書かれた文字を、そのひとつ前へ。私たちが失くしかけたものを思い出して』",
    solvedTitle: "キオク",
    solvedText: "文字盤を「キ・オ・ク」に合わせると留め金が外れた。切り抜かれたページの空洞から、波模様の金属片が現れる。",
    solvedMemory: "『波を四度数えて。ひとつの波は五分。忘れたものを集めた人にだけ扉は応える』",
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
  clockHour: 12,
  clockMinute: 0,
  paintingSequence: [],
  bookLetters: ["", "", ""],
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
  clockPuzzle: document.querySelector("#clock-puzzle"),
  clockTime: document.querySelector("#clock-time"),
  clockHourHand: document.querySelector("#puzzle-hour-hand"),
  clockMinuteHand: document.querySelector("#puzzle-minute-hand"),
  clockHourButton: document.querySelector("#clock-hour-button"),
  clockMinuteButton: document.querySelector("#clock-minute-button"),
  clockResetButton: document.querySelector("#clock-reset-button"),
  clockSubmitButton: document.querySelector("#clock-submit-button"),
  clockFeedback: document.querySelector("#clock-feedback"),
  paintingClue: document.querySelector("#painting-clue"),
  bookClue: document.querySelector("#book-clue"),
  paintingPuzzle: document.querySelector("#painting-puzzle"),
  paintingStep: document.querySelector("#painting-step"),
  paintingSymbols: [...document.querySelectorAll("[data-painting-symbol]")],
  paintingSequenceSlots: [...document.querySelectorAll(".sequence-track span")],
  paintingFeedback: document.querySelector("#painting-feedback"),
  bookPuzzle: document.querySelector("#book-puzzle"),
  bookLetters: [...document.querySelectorAll("[data-book-letter]")],
  bookFeedback: document.querySelector("#book-feedback"),
  bookSubmitButton: document.querySelector("#book-submit-button"),
  fragment: document.querySelector("#fragment"),
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
  } else if (name === "wrong") {
    createTone(196, 0.2, { type: "square", endFrequency: 155.56, volume: 0.035 });
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

function collectObject(id) {
  const object = OBJECTS[id];
  if (state.found.has(id)) return;

  state.found.add(id);
  document.querySelector(`[data-object="${id}"]`)?.classList.add("is-found");
  updateProgress();
  setRoomMessage(object.message);
  elements.memoryText.textContent = object.memory;
  playSound("discover");
}

function updateClockPuzzle() {
  const displayHour = state.clockHour === 0 ? 12 : state.clockHour;
  elements.clockTime.textContent =
    `${String(displayHour).padStart(2, "0")}:${String(state.clockMinute).padStart(2, "0")}`;
  elements.clockHourHand.style.transform =
    `rotate(${(state.clockHour % 12) * 30 + state.clockMinute * 0.5}deg)`;
  elements.clockMinuteHand.style.transform = `rotate(${state.clockMinute * 6}deg)`;

  const hasPaintingClue = state.found.has("painting");
  const hasBookClue = state.found.has("book");
  elements.paintingClue.textContent = hasPaintingClue
    ? "絵の記憶：月は「七つ目の刻」に触れた。"
    : "絵に残された「時」の記憶が必要だ。";
  elements.bookClue.textContent = hasBookClue
    ? "日記の記憶：波は四度、ひとつは五分。"
    : "日記に残された「分」の記憶が必要だ。";
  elements.paintingClue.classList.toggle("is-unlocked", hasPaintingClue);
  elements.bookClue.classList.toggle("is-unlocked", hasBookClue);
}

function adjustClock(unit) {
  if (unit === "hour") state.clockHour = (state.clockHour + 1) % 12;
  if (unit === "minute") state.clockMinute = (state.clockMinute + 5) % 60;
  elements.clockFeedback.textContent = "";
  updateClockPuzzle();
  playSound("ui");
}

function solveClock() {
  if (state.clockHour !== 7 || state.clockMinute !== 20) {
    elements.clockFeedback.textContent = "針は反応しない。二つの記憶をもう一度確かめよう。";
    playSound("wrong");
    return;
  }

  const object = OBJECTS.clock;
  elements.clockPuzzle.hidden = true;
  elements.fragment.hidden = false;
  elements.dialogTitle.textContent = object.solvedTitle;
  elements.dialogText.textContent = object.solvedText;
  elements.dialogMemory.textContent = object.solvedMemory;
  collectObject("clock");
  elements.memoryText.textContent = object.solvedMemory;
}

function updatePaintingPuzzle() {
  elements.paintingStep.textContent = `${state.paintingSequence.length} / 3`;
  elements.paintingSequenceSlots.forEach((slot, index) => {
    const value = state.paintingSequence[index];
    slot.textContent = value ? { mountain: "山", moon: "月", star: "星" }[value] : "";
    slot.classList.toggle("is-filled", Boolean(value));
  });
}

function solvePainting() {
  const object = OBJECTS.painting;
  elements.paintingPuzzle.hidden = true;
  elements.fragment.hidden = false;
  elements.dialogTitle.textContent = object.solvedTitle;
  elements.dialogText.textContent = object.solvedText;
  elements.dialogMemory.textContent = object.solvedMemory;
  collectObject("painting");
  elements.memoryText.textContent = object.solvedMemory;
}

function selectPaintingSymbol(symbol) {
  const solution = ["mountain", "moon", "star"];
  const expected = solution[state.paintingSequence.length];

  if (symbol !== expected) {
    state.paintingSequence = [];
    elements.paintingFeedback.textContent =
      "絵の光が消えた。地面に近いものから、もう一度なぞろう。";
    updatePaintingPuzzle();
    playSound("wrong");
    return;
  }

  state.paintingSequence.push(symbol);
  elements.paintingFeedback.textContent = "";
  updatePaintingPuzzle();
  playSound("ui");

  if (state.paintingSequence.length === solution.length) {
    window.setTimeout(solvePainting, 180);
  }
}

function resetBookPuzzle() {
  state.bookLetters = ["", "", ""];
  elements.bookLetters.forEach((select) => {
    select.value = "";
  });
  elements.bookFeedback.textContent = "";
}

function solveBook() {
  state.bookLetters = elements.bookLetters.map((select) => select.value);

  if (state.bookLetters.join("") !== "キオク") {
    elements.bookFeedback.textContent =
      "留め金は開かない。暗号の各文字を、五十音表で一つ前に戻そう。";
    playSound("wrong");
    return;
  }

  const object = OBJECTS.book;
  elements.bookPuzzle.hidden = true;
  elements.fragment.hidden = false;
  elements.dialogTitle.textContent = object.solvedTitle;
  elements.dialogText.textContent = object.solvedText;
  elements.dialogMemory.textContent = object.solvedMemory;
  collectObject("book");
  elements.memoryText.textContent = object.solvedMemory;
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
  elements.clockPuzzle.hidden = true;
  elements.paintingPuzzle.hidden = true;
  elements.bookPuzzle.hidden = true;
  elements.fragment.hidden = false;

  if (id === "clock" && !state.found.has("clock")) {
    elements.clockPuzzle.hidden = false;
    elements.fragment.hidden = true;
    elements.clockFeedback.textContent = "";
    updateClockPuzzle();
    playSound("ui");
  } else if (id === "painting" && !state.found.has("painting")) {
    elements.paintingPuzzle.hidden = false;
    elements.fragment.hidden = true;
    state.paintingSequence = [];
    elements.paintingFeedback.textContent = "";
    updatePaintingPuzzle();
    playSound("ui");
  } else if (id === "book" && !state.found.has("book")) {
    elements.bookPuzzle.hidden = false;
    elements.fragment.hidden = true;
    resetBookPuzzle();
    playSound("ui");
  } else if (!state.found.has(id)) {
    collectObject(id);
  } else {
    if (id === "clock") {
      elements.dialogTitle.textContent = object.solvedTitle;
      elements.dialogText.textContent = object.solvedText;
      elements.dialogMemory.textContent = object.solvedMemory;
    } else if (id === "painting") {
      elements.dialogTitle.textContent = object.solvedTitle;
      elements.dialogText.textContent = object.solvedText;
      elements.dialogMemory.textContent = object.solvedMemory;
    } else if (id === "book") {
      elements.dialogTitle.textContent = object.solvedTitle;
      elements.dialogText.textContent = object.solvedText;
      elements.dialogMemory.textContent = object.solvedMemory;
    }
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

  let next;
  if (!state.found.has("clock") && !state.found.has("painting")) {
    next = document.querySelector('[data-object="painting"]');
  } else if (!state.found.has("clock") && !state.found.has("book")) {
    next = document.querySelector('[data-object="book"]');
  } else if (!state.found.has("clock")) {
    next = document.querySelector('[data-object="clock"]');
  } else {
    next = elements.hotspots.find(
      (hotspot) => !state.found.has(hotspot.dataset.object),
    );
  }

  if (!next) {
    setRoomMessage("四つの記憶が揃った。澪が封じた扉に注目しよう。");
    elements.door.focus();
    return;
  }

  const names = {
    clock: "絵の「七」と日記の「四つの五分」を時計に重ねよう。",
    painting: "絵に残る跡を、地面に近いものから空の奥へなぞろう。",
    book: "「ク・カ・ケ」を、五十音表でそれぞれ一つ前の文字へ戻そう。",
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
  state.clockHour = 12;
  state.clockMinute = 0;
  state.paintingSequence = [];
  state.bookLetters = ["", "", ""];

  elements.hotspots.forEach((hotspot) => hotspot.classList.remove("is-found"));
  elements.door.classList.remove("is-unlocked", "is-open");
  elements.door.setAttribute("aria-label", "閉ざされた扉");
  hideOverlay(elements.dialog);
  hideOverlay(elements.ending);
  elements.clockPuzzle.hidden = true;
  elements.clockFeedback.textContent = "";
  elements.paintingPuzzle.hidden = true;
  elements.paintingFeedback.textContent = "";
  elements.bookPuzzle.hidden = true;
  resetBookPuzzle();
  elements.fragment.hidden = false;
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
elements.clockHourButton.addEventListener("click", () => adjustClock("hour"));
elements.clockMinuteButton.addEventListener("click", () => adjustClock("minute"));
elements.clockResetButton.addEventListener("click", () => {
  state.clockHour = 12;
  state.clockMinute = 0;
  elements.clockFeedback.textContent = "";
  updateClockPuzzle();
  playSound("ui");
});
elements.clockSubmitButton.addEventListener("click", solveClock);
elements.paintingSymbols.forEach((symbol) => {
  symbol.addEventListener("click", () => selectPaintingSymbol(symbol.dataset.paintingSymbol));
});
elements.bookLetters.forEach((select, index) => {
  select.addEventListener("change", () => {
    state.bookLetters[index] = select.value;
    elements.bookFeedback.textContent = "";
    playSound("ui");
  });
});
elements.bookSubmitButton.addEventListener("click", solveBook);
elements.resetButton.addEventListener("click", () => resetGame({ showIntro: true }));
elements.replayButton.addEventListener("click", () => resetGame());

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (elements.dialog.classList.contains("is-visible")) closeDialog();
});

updateProgress();
updateAudioButton();
