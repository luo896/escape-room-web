const OBJECTS = {
  clock: {
    kicker: "止まった時計",
    title: "動かない秒針",
    text: "裏蓋を開けると、小さな金属片が落ちた。表面には月の印が刻まれている。",
    mark: "月",
    symbol: "☾",
    message: "時計から「月」の欠片を見つけた。",
  },
  painting: {
    kicker: "夜の風景画",
    title: "額縁の裏側",
    text: "絵を少し持ち上げる。壁との隙間に、星の形をした欠片が貼り付けられていた。",
    mark: "星",
    symbol: "✦",
    message: "絵の裏から「星」の欠片を見つけた。",
  },
  book: {
    kicker: "古びた本",
    title: "切り抜かれたページ",
    text: "本の中央は四角く切り抜かれている。その中に、波模様の欠片が隠されていた。",
    mark: "波",
    symbol: "≈",
    message: "本の中から「波」の欠片を見つけた。",
  },
  plant: {
    kicker: "枯れかけた鉢植え",
    title: "土の中の光",
    text: "鉢の土をそっと払う。根元から、太陽の印が入った最後の欠片が姿を現した。",
    mark: "陽",
    symbol: "☀",
    message: "植木鉢から「陽」の欠片を見つけた。",
  },
};

const state = {
  found: new Set(),
  doorUnlocked: false,
  doorOpen: false,
  activeObject: null,
};

const elements = {
  intro: document.querySelector("#intro"),
  startButton: document.querySelector("#start-button"),
  dialog: document.querySelector("#dialog"),
  dialogClose: document.querySelector("#dialog-close"),
  dialogAction: document.querySelector("#dialog-action"),
  dialogKicker: document.querySelector("#dialog-kicker"),
  dialogTitle: document.querySelector("#dialog-title"),
  dialogText: document.querySelector("#dialog-text"),
  dialogSymbol: document.querySelector("#dialog-symbol"),
  fragmentMark: document.querySelector("#fragment-mark"),
  progressLabel: document.querySelector("#progress-label"),
  progressFill: document.querySelector("#progress-fill"),
  roomMessage: document.querySelector("#room-message"),
  door: document.querySelector("#door"),
  hintButton: document.querySelector("#hint-button"),
  resetButton: document.querySelector("#reset-button"),
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

function updateProgress() {
  const count = state.found.size;
  elements.progressLabel.textContent = `手がかり ${count} / 4`;
  elements.progressFill.style.width = `${(count / 4) * 100}%`;
}

function unlockDoor() {
  if (state.doorUnlocked) return;

  state.doorUnlocked = true;
  elements.door.classList.add("is-unlocked");
  elements.door.setAttribute("aria-label", "開けられる扉");
  setRoomMessage("四つの欠片が共鳴している。扉が開きそうだ。");

  window.setTimeout(() => {
    elements.door.classList.add("is-open");
    state.doorOpen = true;
    setRoomMessage("扉が開いた。クリックして次の場所へ進もう。");
  }, 850);
}

function inspectObject(id) {
  const object = OBJECTS[id];
  if (!object) return;

  state.activeObject = id;
  elements.dialogKicker.textContent = object.kicker;
  elements.dialogTitle.textContent = object.title;
  elements.dialogText.textContent = object.text;
  elements.dialogSymbol.textContent = object.symbol;
  elements.fragmentMark.textContent = object.mark;

  if (!state.found.has(id)) {
    state.found.add(id);
    document.querySelector(`[data-object="${id}"]`)?.classList.add("is-found");
    updateProgress();
    setRoomMessage(object.message);
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
    setRoomMessage("すべての欠片が揃った。扉に注目しよう。");
    elements.door.focus();
    return;
  }

  const names = {
    clock: "壁の左側で、時を刻むものを探そう。",
    painting: "月が描かれた風景には、何か秘密がありそうだ。",
    book: "机の上に置かれた赤いものを調べよう。",
    plant: "部屋の隅の鉢植えも忘れずに。",
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
    setRoomMessage(`扉は固く閉ざされている。欠片があと${remaining}つ必要だ。`);
    return;
  }

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
  setRoomMessage("部屋を調べて、扉を開ける方法を探そう。");

  if (showIntro) {
    showOverlay(elements.intro);
  } else {
    hideOverlay(elements.intro);
    elements.hotspots[0]?.focus();
  }
}

elements.startButton.addEventListener("click", () => {
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
elements.resetButton.addEventListener("click", () => resetGame({ showIntro: true }));
elements.replayButton.addEventListener("click", () => resetGame());

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (elements.dialog.classList.contains("is-visible")) closeDialog();
});

updateProgress();
