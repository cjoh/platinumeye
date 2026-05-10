export const TICK_RATE = 20;
export const SNAPSHOT_MS = 1000 / TICK_RATE;
export const PLAYER_RADIUS = 0.36;
export const PLAYER_EYE_HEIGHT = 1.58;
export const PLAYER_BODY_HEIGHT = 1.72;
export const MAX_HEALTH = 100;
export const MAX_ARMOR = 100;
export const RESPAWN_MS = 3200;
export const ROOM_IDLE_TTL_MS = 1000 * 60 * 12;
export const MAX_PLAYERS_PER_ROOM = 8;
export const SCORE_LIMIT = 10;
export const MAX_BOTS_PER_ROOM = 6;
export const TRAINING_BOT_COUNT = 2;

export const WEAPONS = {
  sentinel: {
    id: "sentinel",
    name: "Sentinel",
    shortName: "SNTL",
    damage: 22,
    fireMs: 260,
    range: 58,
    spread: 0.006,
    pellets: 1,
    ammoMax: Infinity,
    pickupAmmo: Infinity,
    color: "#ffd36b",
    tracer: "#fff1b0",
    recoil: 0.045
  },
  cyclone: {
    id: "cyclone",
    name: "Cyclone SMG",
    shortName: "CYCL",
    damage: 12,
    fireMs: 82,
    range: 48,
    spread: 0.025,
    pellets: 1,
    ammoMax: 120,
    pickupAmmo: 72,
    color: "#55e0a3",
    tracer: "#9effcd",
    recoil: 0.035,
    fullyAuto: true
  },
  argus: {
    id: "argus",
    name: "Argus Scatter",
    shortName: "ARG",
    damage: 13,
    fireMs: 740,
    range: 28,
    spread: 0.07,
    pellets: 8,
    ammoMax: 36,
    pickupAmmo: 18,
    color: "#ff8d6b",
    tracer: "#ffd1bd",
    recoil: 0.085
  },
  oracle: {
    id: "oracle",
    name: "Oracle Prototype",
    shortName: "ORCL",
    damage: 110,
    fireMs: 980,
    range: 72,
    spread: 0.002,
    pellets: 1,
    ammoMax: 8,
    pickupAmmo: 4,
    color: "#f6f08a",
    tracer: "#fff8a8",
    recoil: 0.12
  },
  phantom: {
    id: "phantom",
    name: "Phantom SR",
    shortName: "PHNT",
    damage: 82,
    fireMs: 1650,
    range: 140,
    spread: 0.0008,
    pellets: 1,
    ammoMax: 10,
    pickupAmmo: 5,
    color: "#7dd4ff",
    tracer: "#c8eeff",
    recoil: 0.18
  }
};

export const WEAPON_ORDER = ["sentinel", "cyclone", "argus", "oracle", "phantom"];

export const PICKUP_RULES = {
  medkit: {
    label: "MED",
    color: "#e95f5f",
    respawnMs: 13000
  },
  armor: {
    label: "ARM",
    color: "#6aa0ff",
    respawnMs: 17000
  },
  ammo: {
    label: "AMM",
    color: "#f3b94e",
    respawnMs: 11000
  },
  weapon: {
    label: "WPN",
    color: "#63d6ac",
    respawnMs: 19000
  }
};

export const BOMB_MODES = { DEATHMATCH: "deathmatch", BOMB: "bomb" };

export const ROUND_CONFIG = {
  freezeMs: 15_000,
  roundMs: 105_000,
  postPlantMs: 40_000,
  endMs: 5_000,
  totalRounds: 24,
  plantDurationMs: 3_000,
  defuseDurationMs: 5_000,
  winScore: 13
};

export const ECONOMY = {
  startCash: 800,
  maxCash: 9000,
  killReward: 300,
  assistReward: 50,
  roundWin: 3250,
  roundLossBase: 1900,
  roundLossStep: 500,
  roundLossMax: 2900,
  plantReward: 300,
  defuseReward: 300,
};

export const SHOP_ITEMS = [
  { id: "cyclone",  type: "weapon", cost: 1000 },
  { id: "argus",    type: "weapon", cost: 1200 },
  { id: "oracle",   type: "weapon", cost: 1800 },
  { id: "phantom",  type: "weapon", cost: 2700 },
  { id: "armor50",  type: "armor",  cost: 400,  armorValue: 50  },
  { id: "armor100", type: "armor",  cost: 800,  armorValue: 100 },
];
