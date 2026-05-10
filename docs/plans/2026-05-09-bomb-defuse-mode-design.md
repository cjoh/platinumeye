# Bomb/Defuse Game Mode Design

## Overview

Add a CS/Valorant-style bomb/defuse mode alongside the existing deathmatch. Players select the mode in the lobby. The mode is map-gated — two new dedicated maps support bomb/defuse; existing maps remain deathmatch-only.

---

## Mode Selection

- Lobby gains a **mode picker**: Deathmatch (default) | Bomb/Defuse
- Selecting a bomb map auto-switches mode to Bomb/Defuse and vice versa
- Server validates mode/map compatibility on join

---

## Match Structure

- **24 rounds**, first team to **13 round wins** wins the match
- **Halftime at round 12** — teams swap sides (attackers ↔ defenders)
- Teams are **auto-balanced** at match start: players sorted by score, alternated into two even teams. Bots fill as needed.
- **Roles:** Attackers plant, Defenders defuse

### Round Timeline

| Phase | Duration |
|---|---|
| Freeze / Buy | 15 sec |
| Live (plant window) | 1 min 45 sec |
| Post-plant (defuse window) | 40 sec |
| Round-end / intermission | 5 sec |

### Round Win Conditions

Attackers win if:
- Bomb explodes (defuse timer reaches 0)
- All defenders eliminated before bomb is planted... actually attackers win if all defenders are dead

Defenders win if:
- Bomb is defused
- Round timer expires with no bomb planted
- All attackers eliminated before bomb is planted

---

## Economy

Cash persists round-to-round, resets at match start.

**Starting cash:** $800

### Earning

| Event | Cash |
|---|---|
| Kill | $300 |
| Assist | $50 |
| Round win (team) | $3,250 |
| Round loss (team) | $1,900 base + $500/consecutive loss (max $2,900) |
| Plant bomb | $300 |
| Defuse bomb | $300 |

### Buy Menu

| Item | Cost |
|---|---|
| Sentinel (pistol) | Free — always available |
| Cyclone SMG | $1,000 |
| Argus Scatter | $1,200 |
| Oracle Prototype | $1,800 |
| Phantom SR | $2,700 |
| Light Armor (50 pts) | $400 |
| Full Armor (100 pts) | $800 |

- Weapons carry over if you survive the round
- Dropped weapons on death can be picked up by any player
- Weapons not picked up disappear at round end

---

## Bomb Mechanics

- One attacker carries the bomb at round start (random assignment)
- **Plant:** Stand in a site radius for **3 seconds** (hold `F`)
- **Defuse:** Stand on planted bomb for **5 seconds** (hold `F`) — reduced to **3.5 sec** with defuse kit ($200 item)
- Bomb beeps accelerate as timer runs down
- Bomb site is visible on minimap as A/B markers
- Planted bomb position shown on minimap for all players

---

## New Maps

### Crossfire (compact urban)

- Tight corridor layout, short mid-lane connecting both sites
- One long sightline through mid (Phantom-friendly)
- Site A: indoor room, close quarters
- Site B: open courtyard, medium range
- `bounds: { minX: -28, maxX: 28, minZ: -22, maxZ: 22 }`

### Dockyard (industrial port)

- Larger map, two distinct attacker approach routes
- Site A: warehouse interior (Argus/Cyclone territory)
- Site B: exposed loading dock (Phantom/Oracle territory)
- `bounds: { minX: -40, maxX: 40, minZ: -32, maxZ: 32 }`

Both maps define:
```js
mode: "bomb",
sites: [
  { id: "A", x, z, radius: 4.0 },
  { id: "B", x, z, radius: 4.0 }
],
attackerSpawns: [...],
defenderSpawns: [...]
```

---

## Server Changes

- `GameRoom` gains `mode` field (`"deathmatch"` | `"bomb"`)
- New `BombRound` state machine: `freeze → live → planted → ended`
- Player gains `team` (`"attack"` | `"defend"`), `cash`, `hasBomb`, `alive` scoped to round
- No mid-round respawns in bomb mode
- Round end triggers economy payouts, then starts next round after intermission
- At round 12: swap all player teams

## Client Changes

- Lobby: mode picker + map picker with compatibility guard
- HUD: round timer, team indicator (ATK/DEF), cash display, bomb carrier indicator
- Buy menu overlay (freeze phase only): grid of purchasable items with keybinds
- Bomb plant/defuse progress bar (hold F)
- Round-end banner: "ROUND WIN" / "ROUND LOSS" + round score (e.g. 4–3)
- Match-end screen: final score, MVP
- Minimap: A/B site markers, planted bomb indicator
