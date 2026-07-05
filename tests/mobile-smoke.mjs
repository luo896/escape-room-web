const DEBUG_PORT = process.env.CHROME_DEBUG_PORT ?? "9222";
const BASE_URL = process.env.GAME_URL ?? "http://127.0.0.1:8000/";
const VIEWPORT_WIDTH = Number(process.env.VIEWPORT_WIDTH ?? 390);
const VIEWPORT_HEIGHT = Number(process.env.VIEWPORT_HEIGHT ?? 844);

async function getPageTarget() {
  const targets = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`).then((response) => {
    if (!response.ok) throw new Error(`CDP target list failed: ${response.status}`);
    return response.json();
  });
  const target = targets.find((candidate) => candidate.type === "page");
  if (!target) throw new Error("No Chrome page target found");
  return target;
}

function createClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  const eventWaiters = new Map();
  let nextId = 1;

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
      return;
    }

    const waiters = eventWaiters.get(message.method);
    if (!waiters?.length) return;
    eventWaiters.delete(message.method);
    waiters.forEach((resolve) => resolve(message.params));
  });

  const opened = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  return {
    async send(method, params = {}) {
      await opened;
      const id = nextId++;
      const response = new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
      socket.send(JSON.stringify({ id, method, params }));
      return response;
    },
    waitFor(method) {
      return new Promise((resolve) => {
        const waiters = eventWaiters.get(method) ?? [];
        waiters.push(resolve);
        eventWaiters.set(method, waiters);
      });
    },
    close() {
      socket.close();
    },
  };
}

const target = await getPageTarget();
const client = createClient(target.webSocketDebuggerUrl);

try {
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Network.enable");
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: VIEWPORT_WIDTH,
    screenHeight: VIEWPORT_HEIGHT,
  });
  await client.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });

  const loaded = client.waitFor("Page.loadEventFired");
  await client.send("Page.navigate", { url: BASE_URL });
  await loaded;

  const result = await client.send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `
      (async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const click = (selector) => {
          const element = document.querySelector(selector);
          if (!element) throw new Error("Missing element: " + selector);
          element.click();
        };

        const initialCard = document.querySelector(".intro-card").getBoundingClientRect();
        click("#start-button");
        await wait(120);

        click("#audio-button");
        const audioOff = document.querySelector("#audio-button").getAttribute("aria-pressed");
        click("#audio-button");
        const audioOn = document.querySelector("#audio-button").getAttribute("aria-pressed");

        const stories = [];

        click('[data-object="painting"]');
        await wait(80);
        click('[data-painting-symbol="moon"]');
        const paintingWrongAnswer =
          document.querySelector("#painting-feedback").textContent.trim();
        const paintingProgressBeforeSolve =
          document.querySelector("#progress-label").textContent.trim();
        for (const symbol of ["mountain", "moon", "star"]) {
          click('[data-painting-symbol="' + symbol + '"]');
          await wait(60);
        }
        await wait(240);
        stories.push({
          id: "painting",
          visible: document.querySelector("#dialog").classList.contains("is-visible"),
          quote: document.querySelector("#dialog-memory").textContent.trim(),
        });
        click("#dialog-action");
        await wait(100);

        click('[data-object="book"]');
        await wait(80);
        click("#book-submit-button");
        const bookWrongAnswer = document.querySelector("#book-feedback").textContent.trim();
        const bookProgressBeforeSolve =
          document.querySelector("#progress-label").textContent.trim();
        const bookAnswer = ["キ", "オ", "ク"];
        document.querySelectorAll("[data-book-letter]").forEach((select, index) => {
          select.value = bookAnswer[index];
          select.dispatchEvent(new Event("change", { bubbles: true }));
        });
        click("#book-submit-button");
        await wait(100);
        stories.push({
          id: "book",
          visible: document.querySelector("#dialog").classList.contains("is-visible"),
          quote: document.querySelector("#dialog-memory").textContent.trim(),
        });
        click("#dialog-action");
        await wait(100);

        click('[data-object="plant"]');
        await wait(80);
        stories.push({
          id: "plant",
          visible: document.querySelector("#dialog").classList.contains("is-visible"),
          quote: document.querySelector("#dialog-memory").textContent.trim(),
        });
        click("#dialog-action");
        await wait(100);

        click('[data-object="clock"]');
        await wait(80);
        click("#clock-submit-button");
        const wrongAnswer = document.querySelector("#clock-feedback").textContent.trim();
        const progressBeforeSolve = document.querySelector("#progress-label").textContent.trim();
        for (let index = 0; index < 7; index += 1) click("#clock-hour-button");
        for (let index = 0; index < 4; index += 1) click("#clock-minute-button");
        const clockTime = document.querySelector("#clock-time").textContent.trim();
        click("#clock-submit-button");
        await wait(100);
        stories.push({
          id: "clock",
          visible: document.querySelector("#dialog").classList.contains("is-visible"),
          quote: document.querySelector("#dialog-memory").textContent.trim(),
        });
        click("#dialog-action");

        await wait(1700);
        const completedProgress = document.querySelector("#progress-label").textContent.trim();
        const completedFragmentCount =
          document.querySelectorAll(".fragment-tray .is-found").length;
        const doorOpen = document.querySelector("#door").classList.contains("is-open");
        click("#door");
        await wait(150);

        const endingCard = document.querySelector(".ending-card").getBoundingClientRect();
        const endingVisible = document.querySelector("#ending").classList.contains("is-visible");
        click("#replay-button");
        await wait(120);
        click('[data-object="clock"]');
        await wait(80);
        const resetState = {
          progress: document.querySelector("#progress-label").textContent.trim(),
          clockTime: document.querySelector("#clock-time").textContent.trim(),
          fragmentCount: document.querySelectorAll(".fragment-tray .is-found").length,
          feedback: document.querySelector("#clock-feedback").textContent.trim(),
        };
        click("#dialog-action");
        click('[data-object="painting"]');
        await wait(80);
        resetState.paintingStep = document.querySelector("#painting-step").textContent.trim();
        resetState.paintingFeedback =
          document.querySelector("#painting-feedback").textContent.trim();
        click("#dialog-action");
        click('[data-object="book"]');
        await wait(80);
        resetState.bookAnswer = [...document.querySelectorAll("[data-book-letter]")]
          .map((select) => select.value)
          .join("");
        resetState.bookFeedback =
          document.querySelector("#book-feedback").textContent.trim();

        return {
          viewport: { width: innerWidth, height: innerHeight },
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          initialCardFits: initialCard.left >= 0 && initialCard.right <= innerWidth,
          endingCardFits:
            endingCard.left >= 0 &&
            endingCard.right <= innerWidth &&
            endingCard.top >= 0 &&
            endingCard.bottom <= innerHeight,
          audioOff,
          audioOn,
          paintingWrongAnswer,
          paintingProgressBeforeSolve,
          bookWrongAnswer,
          bookProgressBeforeSolve,
          wrongAnswer,
          progressBeforeSolve,
          clockTime,
          stories,
          progress: completedProgress,
          fragmentCount: completedFragmentCount,
          doorOpen,
          endingVisible,
          resetState,
        };
      })()
    `,
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? "Page evaluation failed");
  }

  const report = result.result.value;
  const checks = {
    viewport:
      report.viewport.width === VIEWPORT_WIDTH && report.viewport.height === VIEWPORT_HEIGHT,
    noHorizontalOverflow:
      report.documentWidth <= report.viewport.width && report.bodyWidth <= report.viewport.width,
    overlaysFit: report.initialCardFits && report.endingCardFits,
    audioToggle: report.audioOff === "false" && report.audioOn === "true",
    storyDialogs:
      report.stories.length === 4 &&
      report.stories.every((story) => story.visible && story.quote.length > 0),
    clockPuzzle:
      report.wrongAnswer.length > 0 &&
      report.progressBeforeSolve === "手がかり 3 / 4" &&
      report.clockTime === "07:20",
    paintingPuzzle:
      report.paintingWrongAnswer.length > 0 &&
      report.paintingProgressBeforeSolve === "手がかり 0 / 4",
    bookPuzzle:
      report.bookWrongAnswer.length > 0 &&
      report.bookProgressBeforeSolve === "手がかり 1 / 4",
    completed: report.progress === "手がかり 4 / 4" && report.fragmentCount === 4,
    escaped: report.doorOpen && report.endingVisible,
    reset:
      report.resetState.progress === "手がかり 0 / 4" &&
      report.resetState.clockTime === "12:00" &&
      report.resetState.fragmentCount === 0 &&
      report.resetState.feedback === "" &&
      report.resetState.paintingStep === "0 / 3" &&
      report.resetState.paintingFeedback === "" &&
      report.resetState.bookAnswer === "" &&
      report.resetState.bookFeedback === "",
  };

  console.log(JSON.stringify({ checks, report }, null, 2));
  if (Object.values(checks).some((passed) => !passed)) process.exitCode = 1;
} finally {
  client.close();
}
