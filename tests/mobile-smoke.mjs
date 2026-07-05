const DEBUG_PORT = process.env.CHROME_DEBUG_PORT ?? "9222";
const BASE_URL = process.env.GAME_URL ?? "http://127.0.0.1:8000/";

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
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: 390,
    screenHeight: 844,
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
        for (const id of ["clock", "painting", "book", "plant"]) {
          click('[data-object="' + id + '"]');
          await wait(80);
          stories.push({
            id,
            visible: document.querySelector("#dialog").classList.contains("is-visible"),
            quote: document.querySelector("#dialog-memory").textContent.trim(),
          });
          click("#dialog-action");
          await wait(100);
        }

        await wait(1700);
        const doorOpen = document.querySelector("#door").classList.contains("is-open");
        click("#door");
        await wait(150);

        const endingCard = document.querySelector(".ending-card").getBoundingClientRect();
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
          stories,
          progress: document.querySelector("#progress-label").textContent.trim(),
          fragmentCount: document.querySelectorAll(".fragment-tray .is-found").length,
          doorOpen,
          endingVisible: document.querySelector("#ending").classList.contains("is-visible"),
        };
      })()
    `,
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? "Page evaluation failed");
  }

  const report = result.result.value;
  const checks = {
    viewport: report.viewport.width === 390 && report.viewport.height === 844,
    noHorizontalOverflow:
      report.documentWidth <= report.viewport.width && report.bodyWidth <= report.viewport.width,
    overlaysFit: report.initialCardFits && report.endingCardFits,
    audioToggle: report.audioOff === "false" && report.audioOn === "true",
    storyDialogs:
      report.stories.length === 4 &&
      report.stories.every((story) => story.visible && story.quote.length > 0),
    completed: report.progress === "手がかり 4 / 4" && report.fragmentCount === 4,
    escaped: report.doorOpen && report.endingVisible,
  };

  console.log(JSON.stringify({ checks, report }, null, 2));
  if (Object.values(checks).some((passed) => !passed)) process.exitCode = 1;
} finally {
  client.close();
}
