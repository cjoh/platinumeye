# PlatinumEye

PlatinumEye is a browser multiplayer arena shooter inspired by the tempo and split-screen tension of late-90s console shooters. It uses original names, map geometry, visuals, and sounds.

The arena materials use a generated Imagegen 2 texture atlas at `public/assets/textures/platinumeye-material-atlas.png`, with procedural canvas fallbacks kept in code so the game remains resilient while assets load.

## Run

```bash
npm install
npm run dev
```

Open the printed local URL in multiple tabs or share it on the same network. The first player picks a map and game code; everyone else who enters that game code joins the same map automatically.

Solo games are playable too: the server fills the match with a few simulation agents until more human players join.

Server stats are available at `/stats` while the game server is running. Lifetime counters are persisted to `data/stats.json` by default. Set `STATS_FILE=/path/to/stats.json` to store them elsewhere; Docker Compose mounts `./data` into the container at `/data`.

## Build

```bash
npm run build
```
