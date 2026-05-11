import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { MAP_ORDER } from "../shared/maps.js";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";
const outputDir = path.resolve(".verification");

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"]
});

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const lobbyPreview = await desktop.newPage();
  await verifyLobbyMaps(lobbyPreview);
  await verifyGeneratedTextureAtlas(lobbyPreview, 20);
  await verifyInviteLobby(lobbyPreview);
  await verifyStatsEndpoint(lobbyPreview);
  await lobbyPreview.close();

  const desktopA = await desktop.newPage();
  const desktopB = await desktop.newPage();
  await joinMatch(desktopA, "VerifierA", "QA64");
  await joinMatch(desktopB, "VerifierB", "QA64");
  await desktopA.waitForFunction(() => document.querySelectorAll(".score-row").length >= 2, null, { timeout: 5000 });
  await verifyCanvas(desktopA, "desktop");
  await verifyGeneratedTextureAtlas(desktopA, 4);
  await desktop.close();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const mobilePage = await mobile.newPage();
  await joinMatch(mobilePage, "TouchA", "MOBL");
  await verifyCanvas(mobilePage, "mobile");
  await mobile.close();

  console.log("Browser verification passed: desktop and mobile canvases render, game-code multiplayer joined, and stats responded.");
} finally {
  await browser.close();
}

async function joinMatch(page, name, room) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.fill("#nameInput", name);
  await page.fill("#roomInput", room);
  await page.click("button[type='submit']");
  await page.waitForSelector("#hud:not(.is-hidden)", { timeout: 5000 });
  await page.waitForTimeout(900);
}

async function verifyLobbyMaps(page) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("#lobby:not(.is-hidden)", { timeout: 5000 });
  for (const mapId of MAP_ORDER) {
    await page.click(`[data-map-id="${mapId}"]`);
    await page.waitForTimeout(450);
    await verifyCanvas(page, `map-${mapId}`);
  }
}

async function verifyInviteLobby(page) {
  await page.goto(`${baseUrl}/?gamecode=QA64&map=dockyard&bots=6`, { waitUntil: "networkidle" });
  await page.waitForSelector("#lobby.has-invite-code", { timeout: 5000 });
  const inviteState = await page.evaluate(() => {
    function isVisible(element) {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    }

    return {
      code: document.querySelector("#roomInput")?.value,
      mapVisible: isVisible(document.querySelector(".mission-panel")),
      roomVisible: isVisible(document.querySelector("#roomInput")),
      botVisible: isVisible(document.querySelector("#botInput")),
      quickVisible: isVisible(document.querySelector("#quickJoinButton"))
    };
  });
  if (inviteState.code !== "QA64" || inviteState.mapVisible || inviteState.roomVisible || inviteState.botVisible || inviteState.quickVisible) {
    throw new Error(`invite lobby exposed setup controls: ${JSON.stringify(inviteState)}`);
  }
}

async function verifyStatsEndpoint(page) {
  const stats = await page.evaluate(async (url) => {
    const response = await fetch(`${url}/stats.json`);
    return { ok: response.ok, stats: await response.json() };
  }, baseUrl);
  if (!stats.ok || !Array.isArray(stats.stats?.maps) || !Array.isArray(stats.stats?.modes) || stats.stats?.persistence?.ok !== true) {
    throw new Error(`stats endpoint failed: ${JSON.stringify(stats)}`);
  }
}

async function verifyCanvas(page, name) {
  await page.screenshot({ path: path.join(outputDir, `${name}.png`) });
  const metrics = await page.evaluate(async () => {
    const canvas = document.querySelector("#gameCanvas");
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const sample = document.createElement("canvas");
    sample.width = 48;
    sample.height = 48;
    const context = sample.getContext("2d", { willReadFrequently: true });
    context.drawImage(canvas, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    let lit = 0;
    let total = 0;
    const colors = new Set();
    for (let index = 0; index < pixels.length; index += 4) {
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const luma = r * 0.2126 + g * 0.7152 + b * 0.0722;
      total += luma;
      if (luma > 8) lit += 1;
      colors.add(`${r >> 4}-${g >> 4}-${b >> 4}`);
    }
    return {
      lit,
      averageLuma: total / (pixels.length / 4),
      colorBuckets: colors.size,
      width: canvas.width,
      height: canvas.height
    };
  });

  if (metrics.lit < 500 || metrics.colorBuckets < 8 || metrics.averageLuma < 12) {
    throw new Error(`${name} canvas appears blank: ${JSON.stringify(metrics)}`);
  }
  console.log(`${name} canvas`, metrics);
}

async function verifyGeneratedTextureAtlas(page, minAppliedTiles) {
  const atlas = await page.waitForFunction(
    (minApplied) => {
      const status = window.__platinumeyeAssets?.generatedTextureAtlas;
      if (!status) return false;
      if (status.error) return { ...status };
      if (status.loaded && status.appliedTiles >= minApplied) return { ...status };
      return false;
    },
    minAppliedTiles,
    { timeout: 5000 }
  ).then((handle) => handle.jsonValue());

  if (atlas.error || atlas.appliedTiles < minAppliedTiles) {
    throw new Error(`generated texture atlas was not applied: ${JSON.stringify(atlas)}`);
  }
  console.log("imagegen texture atlas", atlas);
}
