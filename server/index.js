import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { registerGameServer } from "./gameServer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 5173);
const isProduction = process.env.NODE_ENV === "production";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true
  }
});

const gameServer = registerGameServer(io);

app.get("/stats.json", (_request, response) => {
  response.json(gameServer.getStats());
});

app.get("/stats", (_request, response) => {
  response.type("html").send(renderStatsPage(gameServer.getStats()));
});

if (isProduction) {
  app.use(express.static(path.join(root, "dist")));
  app.get("*", (_request, response) => {
    response.sendFile(path.join(root, "dist", "index.html"));
  });
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    root,
    server: {
      middlewareMode: true,
      hmr: {
        server: httpServer
      }
    },
    appType: "spa"
  });
  app.use(vite.middlewares);
}

httpServer.listen(port, () => {
  console.log(`PlatinumEye running at http://localhost:${port}`);
});

function renderStatsPage(stats) {
  const uptime = formatDuration(stats.uptimeMs);
  const persistence = stats.persistence?.ok
    ? `Persisting to ${stats.persistence.file}`
    : `Persistence error: ${stats.persistence?.error || "unknown error"}`;
  const mapRows = stats.maps.map((map) => `
            <tr>
              <td>${escapeHtml(map.name)}</td>
              <td>${escapeHtml(map.mode === "bomb" ? "Bomb Defuse" : "Deathmatch")}</td>
              <td>${formatNumber(map.gamesCreated)}</td>
              <td>${formatNumber(map.playerSessions)}</td>
              <td>${formatNumber(map.activeGames)}</td>
              <td>${formatNumber(map.activeHumanPlayers)}</td>
            </tr>
  `).join("");
  const modeCards = stats.modes.map((mode) => `
          <article class="card">
            <span>${escapeHtml(mode.label)}</span>
            <strong>${formatNumber(mode.gamesCreated)}</strong>
            <small>${formatNumber(mode.playerSessions)} player sessions</small>
          </article>
  `).join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PlatinumEye Stats</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: "Trebuchet MS", Verdana, sans-serif;
        background: #10140f;
        color: #f2edca;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at 20% 10%, rgba(232, 193, 92, 0.12), transparent 26rem),
          linear-gradient(135deg, #11170f, #10140f 52%, #171610);
      }
      main {
        width: min(68rem, calc(100% - 2rem));
        margin: 0 auto;
        padding: 2.25rem 0 3rem;
      }
      h1 {
        margin: 0;
        color: #f2edca;
        font-size: clamp(2rem, 8vw, 4.6rem);
        line-height: 0.9;
        letter-spacing: 0;
      }
      .kicker,
      th,
      .card span {
        color: #e3bd59;
        font-size: 0.72rem;
        font-weight: 900;
        text-transform: uppercase;
      }
      .meta {
        margin: 0.75rem 0 1.5rem;
        color: #aab09a;
      }
      .summary,
      .modes {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .modes {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .card,
      .table-wrap {
        border: 1px solid rgba(232, 193, 92, 0.45);
        background: rgba(17, 21, 15, 0.86);
      }
      .card {
        display: grid;
        gap: 0.25rem;
        min-height: 7rem;
        padding: 0.85rem 1rem;
        align-content: center;
      }
      .card strong {
        font-size: clamp(1.7rem, 5vw, 3rem);
        line-height: 1;
      }
      .card small {
        color: #aab09a;
        font-size: 0.76rem;
      }
      .table-wrap {
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 44rem;
      }
      th,
      td {
        padding: 0.75rem 0.85rem;
        border-bottom: 1px solid rgba(232, 193, 92, 0.18);
        text-align: left;
      }
      td {
        color: #d8d0aa;
      }
      tr:last-child td {
        border-bottom: 0;
      }
      @media (max-width: 760px) {
        .summary,
        .modes {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="kicker">MI-97 FIELD SIM</div>
      <h1>Stats</h1>
      <p class="meta">Lifetime stats since ${escapeHtml(stats.lifetimeStartedAt)}. Process started ${escapeHtml(stats.startedAt)}. Uptime ${escapeHtml(uptime)}. ${escapeHtml(persistence)}.</p>

      <section class="summary" aria-label="Summary">
        <article class="card"><span>Games Played</span><strong>${formatNumber(stats.gamesCreated)}</strong><small>Total game codes created</small></article>
        <article class="card"><span>Players</span><strong>${formatNumber(stats.playerSessions)}</strong><small>Total human joins</small></article>
        <article class="card"><span>Active Games</span><strong>${formatNumber(stats.activeGames)}</strong><small>Games in memory now</small></article>
        <article class="card"><span>Active Players</span><strong>${formatNumber(stats.activeHumanPlayers)}</strong><small>${formatNumber(stats.activeBots)} simulation agents online</small></article>
      </section>

      <section class="modes" aria-label="Modes">
${modeCards}
      </section>

      <section class="table-wrap" aria-label="Map stats">
        <table>
          <thead>
            <tr>
              <th>Map</th>
              <th>Mode</th>
              <th>Games</th>
              <th>Players</th>
              <th>Active Games</th>
              <th>Active Players</th>
            </tr>
          </thead>
          <tbody>
${mapRows}
          </tbody>
        </table>
      </section>
    </main>
  </body>
</html>`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours || days) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}
