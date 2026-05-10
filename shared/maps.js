// Map definitions. Each map provides bounds, spawn points, colliders, pickups,
// optional elevation surfaces, and environment hints used by both the server
// (collision/spawn logic) and the client (rendering theme).
//
// Themes:
//   "bunker"  - indoor industrial bunker
//   "coastal" - outdoor beach with water and concrete fortifications
//   "forest"  - outdoor woods with trees, cabins, stone outcrops

const BUNKER = {
  id: "bunker",
  name: "Foundry Annex",
  description: "Reinforced subterranean bunker. Tight corridors, crossfire pits.",
  theme: "bunker",
  bounds: { minX: -30, maxX: 30, minZ: -24, maxZ: 24 },
  ground: { material: "concrete", repeat: [12, 10] },
  sky: { color: "#0e120c", fog: "#0e120c", fogDensity: 0.018, ceiling: 5.2 },
  lighting: {
    ambientSky: "#f4e3a3",
    ambientGround: "#1f2a1c",
    ambientIntensity: 1.4,
    sunColor: "#ffe4a6",
    sunIntensity: 2.4,
    sunPosition: [-6, 14, 8]
  },
  spawnPoints: [
    { x: -25, z: -18, yaw: Math.PI * 0.22 },
    { x: 25, z: 18, yaw: Math.PI * 1.22 },
    { x: -25, z: 18, yaw: Math.PI * 0.78 },
    { x: 25, z: -18, yaw: Math.PI * 1.78 },
    { x: 0, z: -20, yaw: 0 },
    { x: 0, z: 20, yaw: Math.PI },
    { x: -27, z: 0, yaw: Math.PI * 0.5 },
    { x: 27, z: 0, yaw: Math.PI * 1.5 }
  ],
  colliders: [
    // Center vault
    { id: "core", x: 0, z: 0, w: 5.6, d: 5.6, h: 3.6, material: "reinforced" },
    { id: "core-pillar-nw", x: -3.2, z: -3.2, w: 1.0, d: 1.0, h: 4.2, material: "reinforced" },
    { id: "core-pillar-ne", x: 3.2, z: -3.2, w: 1.0, d: 1.0, h: 4.2, material: "reinforced" },
    { id: "core-pillar-sw", x: -3.2, z: 3.2, w: 1.0, d: 1.0, h: 4.2, material: "reinforced" },
    { id: "core-pillar-se", x: 3.2, z: 3.2, w: 1.0, d: 1.0, h: 4.2, material: "reinforced" },

    // North half blast walls
    { id: "north-wall-w", x: -16, z: -10, w: 12, d: 1.2, h: 3.0, material: "wall" },
    { id: "north-wall-e", x: 16, z: -10, w: 12, d: 1.2, h: 3.0, material: "wall" },
    { id: "north-mid-wall", x: 0, z: -14, w: 10, d: 1.2, h: 3.0, material: "wall" },

    // South half blast walls
    { id: "south-wall-w", x: -16, z: 10, w: 12, d: 1.2, h: 3.0, material: "wall" },
    { id: "south-wall-e", x: 16, z: 10, w: 12, d: 1.2, h: 3.0, material: "wall" },
    { id: "south-mid-wall", x: 0, z: 14, w: 10, d: 1.2, h: 3.0, material: "wall" },

    // East/west service racks
    { id: "west-rack-n", x: -18, z: -3, w: 1.8, d: 6.0, h: 2.4, material: "crate" },
    { id: "west-rack-s", x: -18, z: 3, w: 1.8, d: 6.0, h: 2.4, material: "crate" },
    { id: "east-rack-n", x: 18, z: -3, w: 1.8, d: 6.0, h: 2.4, material: "crate" },
    { id: "east-rack-s", x: 18, z: 3, w: 1.8, d: 6.0, h: 2.4, material: "crate" },

    // Corner consoles
    { id: "nw-console", x: -25, z: -20, w: 2.4, d: 2.4, h: 1.3, material: "console" },
    { id: "ne-console", x: 25, z: -20, w: 2.4, d: 2.4, h: 1.3, material: "console" },
    { id: "sw-console", x: -25, z: 20, w: 2.4, d: 2.4, h: 1.3, material: "console" },
    { id: "se-console", x: 25, z: 20, w: 2.4, d: 2.4, h: 1.3, material: "console" },

    // Mid cover
    { id: "mid-cover-a", x: -8, z: 6, w: 2.6, d: 1.6, h: 1.3, material: "crate" },
    { id: "mid-cover-b", x: 8, z: -6, w: 2.6, d: 1.6, h: 1.3, material: "crate" },
    { id: "mid-cover-c", x: -8, z: -6, w: 2.6, d: 1.6, h: 1.3, material: "crate" },
    { id: "mid-cover-d", x: 8, z: 6, w: 2.6, d: 1.6, h: 1.3, material: "crate" },
    { id: "mid-cover-e", x: -12, z: 0, w: 1.6, d: 2.4, h: 1.3, material: "crate" },
    { id: "mid-cover-f", x: 12, z: 0, w: 1.6, d: 2.4, h: 1.3, material: "crate" },

    // Outer pillars
    { id: "outer-nw", x: -22, z: -16, w: 1.4, d: 1.4, h: 3.4, material: "reinforced" },
    { id: "outer-ne", x: 22, z: -16, w: 1.4, d: 1.4, h: 3.4, material: "reinforced" },
    { id: "outer-sw", x: -22, z: 16, w: 1.4, d: 1.4, h: 3.4, material: "reinforced" },
    { id: "outer-se", x: 22, z: 16, w: 1.4, d: 1.4, h: 3.4, material: "reinforced" }
  ],
  pickups: [
    { id: "med-north", type: "medkit", x: 0, z: -18 },
    { id: "med-south", type: "medkit", x: 0, z: 18 },
    { id: "med-mid-w", type: "medkit", x: -20, z: 0 },
    { id: "med-mid-e", type: "medkit", x: 20, z: 0 },
    { id: "armor-w", type: "armor", x: -27, z: -8 },
    { id: "armor-e", type: "armor", x: 27, z: 8 },
    { id: "ammo-nw", type: "ammo", x: -22, z: -20, weapon: "cyclone" },
    { id: "ammo-se", type: "ammo", x: 22, z: 20, weapon: "argus" },
    { id: "ammo-ne", type: "ammo", x: 22, z: -20, weapon: "cyclone" },
    { id: "ammo-sw", type: "ammo", x: -22, z: 20, weapon: "argus" },
    { id: "weapon-cyclone", type: "weapon", x: -10, z: 0, weapon: "cyclone" },
    { id: "weapon-argus", type: "weapon", x: 10, z: 0, weapon: "argus" },
    { id: "weapon-oracle", type: "weapon", x: 0, z: -6, weapon: "oracle" },
    { id: "weapon-oracle-2", type: "weapon", x: 0, z: 6, weapon: "oracle" },
    { id: "weapon-phantom", type: "weapon", x: -27, z: -21, weapon: "phantom" }
  ]
};

const ARCHIVE = {
  id: "archive",
  name: "Archive Atrium",
  description: "Indoor records hall with twin mezzanines, stair fights, and balcony angles.",
  theme: "bunker",
  bounds: { minX: -28, maxX: 28, minZ: -24, maxZ: 24 },
  ground: { material: "concrete", repeat: [12, 10] },
  sky: { color: "#0b0f0b", fog: "#11150f", fogDensity: 0.02, ceiling: 6.9 },
  lighting: {
    ambientSky: "#f1df9e",
    ambientGround: "#182018",
    ambientIntensity: 1.28,
    sunColor: "#ffd879",
    sunIntensity: 2.25,
    sunPosition: [-8, 15, 7]
  },
  floors: [
    { id: "north-mezzanine", x: 0, z: -17, w: 52, d: 12, y: 2.4, material: "reinforced" },
    { id: "south-mezzanine", x: 0, z: 17, w: 52, d: 12, y: 2.4, material: "reinforced" }
  ],
  ramps: [
    { id: "stair-nw", x: -15, z: -7.5, w: 4.2, d: 7, lowY: 0, highY: 2.4, axis: "z", highAt: "min", material: "reinforced", steps: 8 },
    { id: "stair-ne", x: 15, z: -7.5, w: 4.2, d: 7, lowY: 0, highY: 2.4, axis: "z", highAt: "min", material: "reinforced", steps: 8 },
    { id: "stair-sw", x: -15, z: 7.5, w: 4.2, d: 7, lowY: 0, highY: 2.4, axis: "z", highAt: "max", material: "reinforced", steps: 8 },
    { id: "stair-se", x: 15, z: 7.5, w: 4.2, d: 7, lowY: 0, highY: 2.4, axis: "z", highAt: "max", material: "reinforced", steps: 8 }
  ],
  spawnPoints: [
    { x: -23, z: -20, yaw: Math.PI * 1.27 },
    { x: 23, z: 20, yaw: Math.PI * 0.27 },
    { x: -23, z: 20, yaw: Math.PI * 1.73 },
    { x: 23, z: -20, yaw: Math.PI * 0.73 },
    { x: -7, z: -15, yaw: Math.PI },
    { x: 7, z: -15, yaw: Math.PI },
    { x: -7, z: 15, yaw: 0 },
    { x: 7, z: 15, yaw: 0 }
  ],
  colliders: [
    // Perimeter walls
    { id: "archive-wall-n", x: 0, z: -23.5, w: 56, d: 1.0, h: 5.8, material: "wall" },
    { id: "archive-wall-s", x: 0, z: 23.5, w: 56, d: 1.0, h: 5.8, material: "wall" },
    { id: "archive-wall-w", x: -27.5, z: 0, w: 1.0, d: 48, h: 5.8, material: "wall" },
    { id: "archive-wall-e", x: 27.5, z: 0, w: 1.0, d: 48, h: 5.8, material: "wall" },

    // Ground-level stacks and columns
    { id: "archive-core-n", x: 0, z: -4, w: 8.4, d: 1.1, h: 3.4, material: "reinforced" },
    { id: "archive-core-s", x: 0, z: 4, w: 8.4, d: 1.1, h: 3.4, material: "reinforced" },
    { id: "archive-core-w", x: -4.2, z: 0, w: 1.1, d: 8.4, h: 3.4, material: "reinforced" },
    { id: "archive-core-e", x: 4.2, z: 0, w: 1.1, d: 8.4, h: 3.4, material: "reinforced" },
    { id: "archive-shelf-w1", x: -20, z: -3, w: 1.4, d: 8.2, h: 2.2, material: "crate" },
    { id: "archive-shelf-w2", x: -11, z: 3, w: 1.4, d: 8.2, h: 2.2, material: "crate" },
    { id: "archive-shelf-e1", x: 20, z: 3, w: 1.4, d: 8.2, h: 2.2, material: "crate" },
    { id: "archive-shelf-e2", x: 11, z: -3, w: 1.4, d: 8.2, h: 2.2, material: "crate" },
    { id: "archive-column-nw", x: -22, z: -16, w: 1.2, d: 1.2, h: 5.5, material: "reinforced" },
    { id: "archive-column-ne", x: 22, z: -16, w: 1.2, d: 1.2, h: 5.5, material: "reinforced" },
    { id: "archive-column-sw", x: -22, z: 16, w: 1.2, d: 1.2, h: 5.5, material: "reinforced" },
    { id: "archive-column-se", x: 22, z: 16, w: 1.2, d: 1.2, h: 5.5, material: "reinforced" },
    { id: "archive-console-w", x: -25, z: 0, w: 2.2, d: 2.2, h: 1.25, material: "console" },
    { id: "archive-console-e", x: 25, z: 0, w: 2.2, d: 2.2, h: 1.25, material: "console" },

    // Mezzanine railings and upper cover. These only block on the upper floor.
    { id: "north-rail-far-w", x: -22.2, z: -10.8, w: 7.0, d: 0.28, h: 0.85, y: 2.4, material: "reinforced" },
    { id: "north-rail-left", x: -5.2, z: -10.8, w: 9.0, d: 0.28, h: 0.85, y: 2.4, material: "reinforced" },
    { id: "north-rail-right", x: 5.2, z: -10.8, w: 9.0, d: 0.28, h: 0.85, y: 2.4, material: "reinforced" },
    { id: "north-rail-far-e", x: 22.2, z: -10.8, w: 7.0, d: 0.28, h: 0.85, y: 2.4, material: "reinforced" },
    { id: "north-rail-west", x: -25.4, z: -15, w: 0.28, d: 7.2, h: 0.85, y: 2.4, material: "reinforced" },
    { id: "north-rail-east", x: 25.4, z: -15, w: 0.28, d: 7.2, h: 0.85, y: 2.4, material: "reinforced" },
    { id: "south-rail-far-w", x: -22.2, z: 10.8, w: 7.0, d: 0.28, h: 0.85, y: 2.4, material: "reinforced" },
    { id: "south-rail-left", x: -5.2, z: 10.8, w: 9.0, d: 0.28, h: 0.85, y: 2.4, material: "reinforced" },
    { id: "south-rail-right", x: 5.2, z: 10.8, w: 9.0, d: 0.28, h: 0.85, y: 2.4, material: "reinforced" },
    { id: "south-rail-far-e", x: 22.2, z: 10.8, w: 7.0, d: 0.28, h: 0.85, y: 2.4, material: "reinforced" },
    { id: "south-rail-west", x: -25.4, z: 15, w: 0.28, d: 7.2, h: 0.85, y: 2.4, material: "reinforced" },
    { id: "south-rail-east", x: 25.4, z: 15, w: 0.28, d: 7.2, h: 0.85, y: 2.4, material: "reinforced" },
    { id: "upper-crate-nw", x: -7, z: -17.5, w: 3.0, d: 1.8, h: 1.1, y: 2.4, material: "crate" },
    { id: "upper-crate-ne", x: 7, z: -12.8, w: 3.0, d: 1.8, h: 1.1, y: 2.4, material: "crate" },
    { id: "upper-crate-sw", x: -7, z: 12.8, w: 3.0, d: 1.8, h: 1.1, y: 2.4, material: "crate" },
    { id: "upper-crate-se", x: 7, z: 17.5, w: 3.0, d: 1.8, h: 1.1, y: 2.4, material: "crate" }
  ],
  pickups: [
    { id: "med-ground-w", type: "medkit", x: -18, z: 0 },
    { id: "med-ground-e", type: "medkit", x: 18, z: 0 },
    { id: "armor-center", type: "armor", x: 0, z: 0 },
    { id: "armor-north", type: "armor", x: 0, z: -15 },
    { id: "armor-south", type: "armor", x: 0, z: 15 },
    { id: "ammo-nw", type: "ammo", x: -24, z: -20, weapon: "cyclone" },
    { id: "ammo-se", type: "ammo", x: 24, z: 20, weapon: "argus" },
    { id: "ammo-upper-n", type: "ammo", x: 11, z: -15, weapon: "oracle" },
    { id: "ammo-upper-s", type: "ammo", x: -11, z: 15, weapon: "oracle" },
    { id: "weapon-cyclone", type: "weapon", x: -15, z: -3.5, weapon: "cyclone" },
    { id: "weapon-argus", type: "weapon", x: 15, z: 3.5, weapon: "argus" },
    { id: "weapon-oracle-n", type: "weapon", x: 0, z: -18.2, weapon: "oracle" },
    { id: "weapon-oracle-s", type: "weapon", x: 0, z: 18.2, weapon: "oracle" },
    { id: "weapon-phantom", type: "weapon", x: 24, z: -21, weapon: "phantom" }
  ]
};

const COASTAL = {
  id: "coastal",
  name: "Coastal Battery",
  description: "Seawall fortifications. Open sand, sandbag berms, long sightlines.",
  theme: "coastal",
  bounds: { minX: -36, maxX: 36, minZ: -28, maxZ: 28 },
  ground: { material: "sand", repeat: [22, 18] },
  // Water occupies the south edge of the map (large negative Z is open beach,
  // positive Z is the surf line). We render water as a separate strip.
  water: {
    minX: -60,
    maxX: 60,
    minZ: 28,
    maxZ: 90,
    y: 0.02,
    color: "#2c6f88",
    deepColor: "#102b3d",
    foamColor: "#cfe9f0"
  },
  sky: { color: "#a9c8d6", fog: "#cad9df", fogDensity: 0.0085, ceiling: null },
  lighting: {
    ambientSky: "#cce0e8",
    ambientGround: "#a08e6a",
    ambientIntensity: 1.55,
    sunColor: "#fff1c4",
    sunIntensity: 3.1,
    sunPosition: [12, 26, -6]
  },
  spawnPoints: [
    { x: -30, z: -22, yaw: Math.PI * 0.25 },
    { x: 30, z: -22, yaw: Math.PI * 1.75 },
    { x: -30, z: 6, yaw: Math.PI * 0.5 },
    { x: 30, z: 6, yaw: Math.PI * 1.5 },
    { x: -8, z: -24, yaw: 0 },
    { x: 8, z: -24, yaw: 0 },
    { x: 0, z: 10, yaw: Math.PI },
    { x: 0, z: -8, yaw: Math.PI * 0.5 }
  ],
  colliders: [
    // Central pillbox bunker
    { id: "pillbox", x: 0, z: -2, w: 6.2, d: 4.6, h: 2.6, material: "concrete" },
    { id: "pillbox-roof-l", x: -4.4, z: -2, w: 2.0, d: 6.4, h: 2.6, material: "concrete" },
    { id: "pillbox-roof-r", x: 4.4, z: -2, w: 2.0, d: 6.4, h: 2.6, material: "concrete" },

    // Forward pillboxes flanking the beach
    { id: "fwd-pillbox-w", x: -16, z: 4, w: 4.4, d: 4.0, h: 2.4, material: "concrete" },
    { id: "fwd-pillbox-e", x: 16, z: 4, w: 4.4, d: 4.0, h: 2.4, material: "concrete" },

    // Sandbag berms on the beach approach
    { id: "berm-a", x: -10, z: 12, w: 5.6, d: 1.0, h: 0.95, material: "sandbag" },
    { id: "berm-b", x: 10, z: 12, w: 5.6, d: 1.0, h: 0.95, material: "sandbag" },
    { id: "berm-c", x: -22, z: 14, w: 4.0, d: 1.0, h: 0.95, material: "sandbag" },
    { id: "berm-d", x: 22, z: 14, w: 4.0, d: 1.0, h: 0.95, material: "sandbag" },
    { id: "berm-mid", x: 0, z: 14, w: 6.4, d: 1.0, h: 0.95, material: "sandbag" },

    // Inland walls and supply crates
    { id: "supply-nw", x: -24, z: -10, w: 3.0, d: 2.4, h: 1.6, material: "crate" },
    { id: "supply-ne", x: 24, z: -10, w: 3.0, d: 2.4, h: 1.6, material: "crate" },
    { id: "supply-mid-w", x: -8, z: -14, w: 2.4, d: 1.8, h: 1.4, material: "crate" },
    { id: "supply-mid-e", x: 8, z: -14, w: 2.4, d: 1.8, h: 1.4, material: "crate" },

    // Watchtower bases
    { id: "tower-w", x: -28, z: -22, w: 2.4, d: 2.4, h: 4.6, material: "concrete" },
    { id: "tower-e", x: 28, z: -22, w: 2.4, d: 2.4, h: 4.6, material: "concrete" },
    { id: "tower-w-rail", x: -28, z: -22, w: 3.4, d: 0.18, h: 5.2, material: "rail" },
    { id: "tower-e-rail", x: 28, z: -22, w: 3.4, d: 0.18, h: 5.2, material: "rail" },

    // Rear concrete walls (back wall of map)
    { id: "rear-wall-w", x: -18, z: -26, w: 14, d: 1.0, h: 3.2, material: "concrete" },
    { id: "rear-wall-e", x: 18, z: -26, w: 14, d: 1.0, h: 3.2, material: "concrete" },

    // Beach rocks
    { id: "rock-a", x: -14, z: 17, w: 2.0, d: 2.0, h: 1.4, material: "rock" },
    { id: "rock-b", x: 14, z: 17, w: 2.0, d: 2.0, h: 1.4, material: "rock" },
    { id: "rock-c", x: 0, z: 4, w: 1.4, d: 1.4, h: 1.0, material: "rock" }
  ],
  pickups: [
    { id: "med-pillbox", type: "medkit", x: 0, z: -2 },
    { id: "med-tower-w", type: "medkit", x: -28, z: -18 },
    { id: "med-tower-e", type: "medkit", x: 28, z: -18 },
    { id: "armor-fwd-w", type: "armor", x: -16, z: 8 },
    { id: "armor-fwd-e", type: "armor", x: 16, z: 8 },
    { id: "ammo-nw", type: "ammo", x: -32, z: -24, weapon: "cyclone" },
    { id: "ammo-ne", type: "ammo", x: 32, z: -24, weapon: "argus" },
    { id: "ammo-beach-w", type: "ammo", x: -22, z: 16, weapon: "cyclone" },
    { id: "ammo-beach-e", type: "ammo", x: 22, z: 16, weapon: "argus" },
    { id: "weapon-cyclone", type: "weapon", x: -8, z: 0, weapon: "cyclone" },
    { id: "weapon-argus", type: "weapon", x: 8, z: 0, weapon: "argus" },
    { id: "weapon-oracle", type: "weapon", x: 0, z: -16, weapon: "oracle" },
    { id: "weapon-phantom", type: "weapon", x: -30, z: -24, weapon: "phantom" }
  ],
  // Decorative props (no collision) — palms, driftwood, antennas
  props: [
    { type: "palm", x: -32, z: 8 },
    { type: "palm", x: 32, z: 8 },
    { type: "palm", x: -26, z: 16 },
    { type: "palm", x: 26, z: 16 },
    { type: "palm", x: -34, z: 18 },
    { type: "palm", x: 34, z: 18 },
    { type: "driftwood", x: -6, z: 18 },
    { type: "driftwood", x: 6, z: 22 },
    { type: "driftwood", x: -18, z: 22 },
    { type: "driftwood", x: 18, z: 24 },
    { type: "antenna", x: -28, z: -22, h: 7.8 },
    { type: "antenna", x: 28, z: -22, h: 7.8 },
    { type: "buoy", x: -10, z: 32 },
    { type: "buoy", x: 14, z: 38 },
    { type: "buoy", x: -22, z: 44 },
    { type: "buoy", x: 26, z: 50 },
    // Lighthouse on the eastern flank — rotating beam
    { type: "lighthouse", x: 32, z: -2, h: 9.5 },
    // Seagull flocks (animated)
    { type: "seagull-flock", x: 0, z: 30, h: 8 },
    { type: "seagull-flock", x: -16, z: 36, h: 9 }
  ]
};

const FOREST = {
  id: "forest",
  name: "Northwood Outpost",
  description: "Pine forest sweep with a ranger cabin and cold creek.",
  theme: "forest",
  bounds: { minX: -40, maxX: 40, minZ: -30, maxZ: 30 },
  ground: { material: "grass", repeat: [28, 22] },
  water: {
    // Narrow creek bisecting the map east to west
    minX: -40,
    maxX: 40,
    minZ: -2.4,
    maxZ: 2.4,
    y: 0.02,
    color: "#1f5a4a",
    deepColor: "#0c2a23",
    foamColor: "#bfe2d2"
  },
  sky: { color: "#9bb0a4", fog: "#a8bcb0", fogDensity: 0.012, ceiling: null },
  lighting: {
    ambientSky: "#dbe7d4",
    ambientGround: "#3c4a32",
    ambientIntensity: 1.35,
    sunColor: "#ffe6b0",
    sunIntensity: 2.6,
    sunPosition: [-10, 22, 14]
  },
  spawnPoints: [
    { x: -34, z: -24, yaw: Math.PI * 0.25 },
    { x: 34, z: -24, yaw: Math.PI * 1.75 },
    { x: -34, z: 24, yaw: Math.PI * 0.75 },
    { x: 34, z: 24, yaw: Math.PI * 1.25 },
    { x: 0, z: -26, yaw: 0 },
    { x: 0, z: 26, yaw: Math.PI },
    { x: -34, z: 0, yaw: Math.PI * 0.5 },
    { x: 34, z: 0, yaw: Math.PI * 1.5 }
  ],
  colliders: [
    // Central ranger cabin (4 walls + open doorway implied by gaps)
    { id: "cabin-n", x: 0, z: -10, w: 7.2, d: 0.6, h: 3.0, material: "log" },
    { id: "cabin-s", x: 0, z: -6, w: 7.2, d: 0.6, h: 3.0, material: "log" },
    { id: "cabin-w", x: -3.6, z: -8, w: 0.6, d: 4.6, h: 3.0, material: "log" },
    { id: "cabin-e-1", x: 3.6, z: -9, w: 0.6, d: 2.6, h: 3.0, material: "log" },
    { id: "cabin-e-2", x: 3.6, z: -6.2, w: 0.6, d: 1.0, h: 3.0, material: "log" },

    // Second cabin (south of creek)
    { id: "cabin2-n", x: 0, z: 8, w: 6.4, d: 0.6, h: 2.8, material: "log" },
    { id: "cabin2-s", x: 0, z: 12, w: 6.4, d: 0.6, h: 2.8, material: "log" },
    { id: "cabin2-w", x: -3.2, z: 10, w: 0.6, d: 4.6, h: 2.8, material: "log" },
    { id: "cabin2-e", x: 3.2, z: 10, w: 0.6, d: 4.6, h: 2.8, material: "log" },

    // Tree clusters (used for cover; visuals add canopy on top)
    { id: "tree-1", x: -20, z: -18, w: 1.0, d: 1.0, h: 4.0, material: "tree" },
    { id: "tree-2", x: -10, z: -22, w: 1.0, d: 1.0, h: 4.0, material: "tree" },
    { id: "tree-3", x: 10, z: -22, w: 1.0, d: 1.0, h: 4.0, material: "tree" },
    { id: "tree-4", x: 20, z: -18, w: 1.0, d: 1.0, h: 4.0, material: "tree" },
    { id: "tree-5", x: -28, z: -8, w: 1.0, d: 1.0, h: 4.0, material: "tree" },
    { id: "tree-6", x: 28, z: -8, w: 1.0, d: 1.0, h: 4.0, material: "tree" },
    { id: "tree-7", x: -28, z: 12, w: 1.0, d: 1.0, h: 4.0, material: "tree" },
    { id: "tree-8", x: 28, z: 12, w: 1.0, d: 1.0, h: 4.0, material: "tree" },
    { id: "tree-9", x: -16, z: 20, w: 1.0, d: 1.0, h: 4.0, material: "tree" },
    { id: "tree-10", x: 16, z: 20, w: 1.0, d: 1.0, h: 4.0, material: "tree" },
    { id: "tree-11", x: -22, z: -2, w: 1.0, d: 1.0, h: 4.0, material: "tree" },
    { id: "tree-12", x: 22, z: 2, w: 1.0, d: 1.0, h: 4.0, material: "tree" },
    { id: "tree-13", x: -14, z: -14, w: 1.0, d: 1.0, h: 4.0, material: "tree" },
    { id: "tree-14", x: 14, z: -14, w: 1.0, d: 1.0, h: 4.0, material: "tree" },
    { id: "tree-15", x: -12, z: 16, w: 1.0, d: 1.0, h: 4.0, material: "tree" },
    { id: "tree-16", x: 12, z: 16, w: 1.0, d: 1.0, h: 4.0, material: "tree" },

    // Rock outcrops
    { id: "rock-nw", x: -26, z: -24, w: 3.0, d: 2.4, h: 1.8, material: "rock" },
    { id: "rock-ne", x: 26, z: -24, w: 3.0, d: 2.4, h: 1.8, material: "rock" },
    { id: "rock-sw", x: -26, z: 24, w: 3.0, d: 2.4, h: 1.8, material: "rock" },
    { id: "rock-se", x: 26, z: 24, w: 3.0, d: 2.4, h: 1.8, material: "rock" },
    { id: "rock-mid", x: -8, z: 0, w: 2.4, d: 2.4, h: 1.6, material: "rock" },
    { id: "rock-mid-2", x: 8, z: 0, w: 2.4, d: 2.4, h: 1.6, material: "rock" },

    // Log piles for low cover
    { id: "logs-w", x: -18, z: 4, w: 3.4, d: 1.0, h: 1.0, material: "logpile" },
    { id: "logs-e", x: 18, z: -4, w: 3.4, d: 1.0, h: 1.0, material: "logpile" },
    { id: "logs-n", x: 0, z: -18, w: 3.4, d: 1.0, h: 1.0, material: "logpile" },
    { id: "logs-s", x: 0, z: 18, w: 3.4, d: 1.0, h: 1.0, material: "logpile" }
  ],
  pickups: [
    { id: "med-cabin1", type: "medkit", x: 0, z: -8 },
    { id: "med-cabin2", type: "medkit", x: 0, z: 10 },
    { id: "med-w", type: "medkit", x: -32, z: 0 },
    { id: "med-e", type: "medkit", x: 32, z: 0 },
    { id: "armor-nw", type: "armor", x: -32, z: -26 },
    { id: "armor-se", type: "armor", x: 32, z: 26 },
    { id: "ammo-ne", type: "ammo", x: 32, z: -26, weapon: "cyclone" },
    { id: "ammo-sw", type: "ammo", x: -32, z: 26, weapon: "argus" },
    { id: "ammo-mid-n", type: "ammo", x: -10, z: -18, weapon: "cyclone" },
    { id: "ammo-mid-s", type: "ammo", x: 10, z: 18, weapon: "argus" },
    { id: "weapon-cyclone", type: "weapon", x: -14, z: 0, weapon: "cyclone" },
    { id: "weapon-argus", type: "weapon", x: 14, z: 0, weapon: "argus" },
    { id: "weapon-oracle", type: "weapon", x: 0, z: 0, weapon: "oracle" },
    { id: "weapon-phantom", type: "weapon", x: -36, z: -26, weapon: "phantom" }
  ],
  props: [
    // Decorative tree canopies are added on top of tree colliders by the renderer.
    // Bushes (no collision)
    { type: "bush", x: -6, z: -16 },
    { type: "bush", x: 6, z: -16 },
    { type: "bush", x: -6, z: 16 },
    { type: "bush", x: 6, z: 16 },
    { type: "bush", x: -24, z: 6 },
    { type: "bush", x: 24, z: 6 },
    { type: "bush", x: -18, z: -8 },
    { type: "bush", x: 18, z: -8 },
    // Stumps
    { type: "stump", x: -12, z: -4 },
    { type: "stump", x: 12, z: 4 },
    { type: "stump", x: -22, z: 18 },
    { type: "stump", x: 22, z: -18 },
    // Mushrooms scattered near tree bases
    { type: "mushroom", x: -19, z: -19 },
    { type: "mushroom", x: 19, z: -19 },
    { type: "mushroom", x: -19, z: 19 },
    { type: "mushroom", x: 19, z: 19 },
    { type: "mushroom", x: -9, z: -23 },
    { type: "mushroom", x: 9, z: 23 },
    { type: "mushroom", x: -27, z: 13 },
    { type: "mushroom", x: 27, z: -13 },
    // Fireflies (animated, used as light points)
    { type: "firefly", x: -10, z: -4 },
    { type: "firefly", x: 10, z: 4 },
    { type: "firefly", x: -22, z: 10 },
    { type: "firefly", x: 22, z: -10 }
  ]
};

const FROSTGATE = {
  id: "frostgate",
  name: "Frostgate Spire",
  description: "Snowbound mountain pass. Frozen lake, fog banks, low cover under flurries.",
  theme: "frost",
  bounds: { minX: -42, maxX: 42, minZ: -32, maxZ: 32 },
  ground: { material: "snow", repeat: [24, 18] },
  // Frozen lake — water plane with ice color and white foam highlights
  water: {
    minX: -16,
    maxX: 16,
    minZ: -8,
    maxZ: 8,
    y: 0.04,
    color: "#a5cad6",
    deepColor: "#5a7e8d",
    foamColor: "#ffffff",
    frozen: true
  },
  sky: { color: "#c9d3da", fog: "#cbd6dd", fogDensity: 0.018, ceiling: null },
  lighting: {
    ambientSky: "#d8e2ea",
    ambientGround: "#5e6671",
    ambientIntensity: 1.5,
    sunColor: "#cfdaea",
    sunIntensity: 2.1,
    sunPosition: [10, 24, -8]
  },
  spawnPoints: [
    { x: -36, z: -28, yaw: Math.PI * 0.25 },
    { x: 36, z: -28, yaw: Math.PI * 1.75 },
    { x: -36, z: 28, yaw: Math.PI * 0.75 },
    { x: 36, z: 28, yaw: Math.PI * 1.25 },
    { x: 0, z: -28, yaw: 0 },
    { x: 0, z: 28, yaw: Math.PI },
    { x: -36, z: 0, yaw: Math.PI * 0.5 },
    { x: 36, z: 0, yaw: Math.PI * 1.5 }
  ],
  colliders: [
    // Central stone spire (4 sides + top)
    { id: "spire-w", x: -3.2, z: 0, w: 1.4, d: 6.4, h: 4.4, material: "stone" },
    { id: "spire-e", x: 3.2, z: 0, w: 1.4, d: 6.4, h: 4.4, material: "stone" },
    { id: "spire-n", x: 0, z: -3.2, w: 6.4, d: 1.4, h: 4.4, material: "stone" },
    { id: "spire-s", x: 0, z: 3.2, w: 6.4, d: 1.4, h: 4.4, material: "stone" },

    // Stone outpost ruins (walls fragments)
    { id: "ruin-nw-1", x: -22, z: -12, w: 6.0, d: 1.0, h: 2.4, material: "stone" },
    { id: "ruin-nw-2", x: -25, z: -8, w: 1.0, d: 4.0, h: 2.4, material: "stone" },
    { id: "ruin-ne-1", x: 22, z: -12, w: 6.0, d: 1.0, h: 2.4, material: "stone" },
    { id: "ruin-ne-2", x: 25, z: -8, w: 1.0, d: 4.0, h: 2.4, material: "stone" },
    { id: "ruin-sw-1", x: -22, z: 12, w: 6.0, d: 1.0, h: 2.4, material: "stone" },
    { id: "ruin-sw-2", x: -25, z: 8, w: 1.0, d: 4.0, h: 2.4, material: "stone" },
    { id: "ruin-se-1", x: 22, z: 12, w: 6.0, d: 1.0, h: 2.4, material: "stone" },
    { id: "ruin-se-2", x: 25, z: 8, w: 1.0, d: 4.0, h: 2.4, material: "stone" },

    // Ice block low cover
    { id: "ice-1", x: -10, z: -16, w: 2.6, d: 2.0, h: 1.2, material: "ice" },
    { id: "ice-2", x: 10, z: -16, w: 2.6, d: 2.0, h: 1.2, material: "ice" },
    { id: "ice-3", x: -10, z: 16, w: 2.6, d: 2.0, h: 1.2, material: "ice" },
    { id: "ice-4", x: 10, z: 16, w: 2.6, d: 2.0, h: 1.2, material: "ice" },
    { id: "ice-5", x: 0, z: -22, w: 3.4, d: 1.2, h: 1.0, material: "ice" },
    { id: "ice-6", x: 0, z: 22, w: 3.4, d: 1.2, h: 1.0, material: "ice" },

    // Snow drifts (low rounded cover)
    { id: "drift-w", x: -32, z: 0, w: 3.4, d: 4.0, h: 1.4, material: "snowdrift" },
    { id: "drift-e", x: 32, z: 0, w: 3.4, d: 4.0, h: 1.4, material: "snowdrift" },
    { id: "drift-n", x: -16, z: -22, w: 3.4, d: 1.6, h: 1.2, material: "snowdrift" },
    { id: "drift-s", x: 16, z: 22, w: 3.4, d: 1.6, h: 1.2, material: "snowdrift" },

    // Pine tree colliders
    { id: "pine-1", x: -28, z: -22, w: 1.0, d: 1.0, h: 4.5, material: "tree" },
    { id: "pine-2", x: 28, z: -22, w: 1.0, d: 1.0, h: 4.5, material: "tree" },
    { id: "pine-3", x: -28, z: 22, w: 1.0, d: 1.0, h: 4.5, material: "tree" },
    { id: "pine-4", x: 28, z: 22, w: 1.0, d: 1.0, h: 4.5, material: "tree" },
    { id: "pine-5", x: -38, z: -14, w: 1.0, d: 1.0, h: 4.5, material: "tree" },
    { id: "pine-6", x: 38, z: -14, w: 1.0, d: 1.0, h: 4.5, material: "tree" },
    { id: "pine-7", x: -38, z: 14, w: 1.0, d: 1.0, h: 4.5, material: "tree" },
    { id: "pine-8", x: 38, z: 14, w: 1.0, d: 1.0, h: 4.5, material: "tree" }
  ],
  pickups: [
    { id: "med-spire", type: "medkit", x: 0, z: 0 },
    { id: "med-w", type: "medkit", x: -36, z: 0 },
    { id: "med-e", type: "medkit", x: 36, z: 0 },
    { id: "armor-nw", type: "armor", x: -22, z: -16 },
    { id: "armor-se", type: "armor", x: 22, z: 16 },
    { id: "ammo-ne", type: "ammo", x: 22, z: -16, weapon: "cyclone" },
    { id: "ammo-sw", type: "ammo", x: -22, z: 16, weapon: "argus" },
    { id: "ammo-fwd-w", type: "ammo", x: -32, z: -28, weapon: "cyclone" },
    { id: "ammo-fwd-e", type: "ammo", x: 32, z: 28, weapon: "argus" },
    { id: "weapon-cyclone", type: "weapon", x: -12, z: 0, weapon: "cyclone" },
    { id: "weapon-argus", type: "weapon", x: 12, z: 0, weapon: "argus" },
    { id: "weapon-oracle", type: "weapon", x: 0, z: 18, weapon: "oracle" },
    { id: "weapon-phantom", type: "weapon", x: -38, z: -28, weapon: "phantom" }
  ],
  props: [
    { type: "snowpile", x: -16, z: -6 },
    { type: "snowpile", x: 16, z: 6 },
    { type: "snowpile", x: -8, z: 12 },
    { type: "snowpile", x: 8, z: -12 },
    { type: "icicle", x: -22, z: -12 },
    { type: "icicle", x: 22, z: 12 },
    { type: "frozenflag", x: -34, z: 0, h: 5.4 },
    { type: "frozenflag", x: 34, z: 0, h: 5.4 },
    { type: "wolf-skull", x: 0, z: -10 },
    { type: "wolf-skull", x: 0, z: 10 }
  ],
  weather: { type: "snow", density: 600 }
};

const REFINERY = {
  id: "refinery",
  name: "Refinery Yard",
  description: "Industrial refinery. Container labyrinth, smokestacks, oil drums.",
  theme: "refinery",
  bounds: { minX: -38, maxX: 38, minZ: -30, maxZ: 30 },
  ground: { material: "asphalt", repeat: [16, 14] },
  sky: { color: "#7a6a52", fog: "#8b7a60", fogDensity: 0.011, ceiling: null },
  lighting: {
    ambientSky: "#d6c9a5",
    ambientGround: "#3a322a",
    ambientIntensity: 1.5,
    sunColor: "#ffd9a0",
    sunIntensity: 2.7,
    sunPosition: [-10, 20, 12]
  },
  spawnPoints: [
    { x: -32, z: -24, yaw: Math.PI * 0.25 },
    { x: 32, z: -24, yaw: Math.PI * 1.75 },
    { x: -32, z: 24, yaw: Math.PI * 0.75 },
    { x: 32, z: 24, yaw: Math.PI * 1.25 },
    { x: 0, z: -26, yaw: 0 },
    { x: 0, z: 26, yaw: Math.PI },
    { x: -34, z: 0, yaw: Math.PI * 0.5 },
    { x: 34, z: 0, yaw: Math.PI * 1.5 }
  ],
  colliders: [
    // Central refinery tower base
    { id: "tower-core", x: 0, z: 0, w: 4.6, d: 4.6, h: 5.4, material: "industrial" },
    // Container stacks (red/blue/yellow shipping containers)
    { id: "cont-r1", x: -10, z: -8, w: 6.0, d: 2.4, h: 2.6, material: "container-red" },
    { id: "cont-r2", x: -10, z: -10.6, w: 6.0, d: 2.4, h: 2.6, material: "container-red" },
    { id: "cont-b1", x: 10, z: 8, w: 6.0, d: 2.4, h: 2.6, material: "container-blue" },
    { id: "cont-b2", x: 10, z: 10.6, w: 6.0, d: 2.4, h: 2.6, material: "container-blue" },
    { id: "cont-y1", x: -10, z: 9, w: 2.4, d: 6.0, h: 2.6, material: "container-yellow" },
    { id: "cont-y2", x: -7.4, z: 9, w: 2.4, d: 6.0, h: 2.6, material: "container-yellow" },
    { id: "cont-g1", x: 10, z: -9, w: 2.4, d: 6.0, h: 2.6, material: "container-green" },
    { id: "cont-g2", x: 7.4, z: -9, w: 2.4, d: 6.0, h: 2.6, material: "container-green" },

    // Outer concrete walls (factory perimeter, partial)
    { id: "wall-n-w", x: -18, z: -26, w: 14, d: 1.0, h: 3.6, material: "industrial" },
    { id: "wall-n-e", x: 18, z: -26, w: 14, d: 1.0, h: 3.6, material: "industrial" },
    { id: "wall-s-w", x: -18, z: 26, w: 14, d: 1.0, h: 3.6, material: "industrial" },
    { id: "wall-s-e", x: 18, z: 26, w: 14, d: 1.0, h: 3.6, material: "industrial" },

    // Pillars + scaffolds
    { id: "pillar-nw", x: -22, z: -16, w: 1.4, d: 1.4, h: 4.4, material: "industrial" },
    { id: "pillar-ne", x: 22, z: -16, w: 1.4, d: 1.4, h: 4.4, material: "industrial" },
    { id: "pillar-sw", x: -22, z: 16, w: 1.4, d: 1.4, h: 4.4, material: "industrial" },
    { id: "pillar-se", x: 22, z: 16, w: 1.4, d: 1.4, h: 4.4, material: "industrial" },

    // Oil drum clusters (low cover)
    { id: "drums-nw", x: -16, z: -2, w: 2.4, d: 2.4, h: 1.2, material: "drum" },
    { id: "drums-ne", x: 16, z: 2, w: 2.4, d: 2.4, h: 1.2, material: "drum" },
    { id: "drums-mid-n", x: 0, z: -16, w: 3.0, d: 1.6, h: 1.2, material: "drum" },
    { id: "drums-mid-s", x: 0, z: 16, w: 3.0, d: 1.6, h: 1.2, material: "drum" },

    // Smokestack bases (tall obstacles)
    { id: "stack-w", x: -28, z: 0, w: 2.6, d: 2.6, h: 5.4, material: "industrial" },
    { id: "stack-e", x: 28, z: 0, w: 2.6, d: 2.6, h: 5.4, material: "industrial" }
  ],
  pickups: [
    { id: "med-tower", type: "medkit", x: 0, z: -6 },
    { id: "med-tower-2", type: "medkit", x: 0, z: 6 },
    { id: "med-w", type: "medkit", x: -32, z: 0 },
    { id: "med-e", type: "medkit", x: 32, z: 0 },
    { id: "armor-nw", type: "armor", x: -28, z: -22 },
    { id: "armor-se", type: "armor", x: 28, z: 22 },
    { id: "ammo-ne", type: "ammo", x: 28, z: -22, weapon: "cyclone" },
    { id: "ammo-sw", type: "ammo", x: -28, z: 22, weapon: "argus" },
    { id: "ammo-mid-n", type: "ammo", x: 0, z: -22, weapon: "cyclone" },
    { id: "ammo-mid-s", type: "ammo", x: 0, z: 22, weapon: "argus" },
    { id: "weapon-cyclone", type: "weapon", x: -14, z: 0, weapon: "cyclone" },
    { id: "weapon-argus", type: "weapon", x: 14, z: 0, weapon: "argus" },
    { id: "weapon-oracle", type: "weapon", x: 0, z: -3.4, weapon: "oracle" },
    { id: "weapon-phantom", type: "weapon", x: -32, z: -26, weapon: "phantom" }
  ],
  props: [
    // Smokestacks emitting steam
    { type: "smokestack", x: -28, z: 0, h: 9.5 },
    { type: "smokestack", x: 28, z: 0, h: 9.5 },
    // Pipes
    { type: "pipe", x: -22, z: 0, len: 12, axis: "z" },
    { type: "pipe", x: 22, z: 0, len: 12, axis: "z" },
    { type: "pipe", x: 0, z: -22, len: 14, axis: "x" },
    { type: "pipe", x: 0, z: 22, len: 14, axis: "x" },
    // Pallets
    { type: "pallet", x: -6, z: -20 },
    { type: "pallet", x: 6, z: -20 },
    { type: "pallet", x: -6, z: 20 },
    { type: "pallet", x: 6, z: 20 },
    // Hazard signs
    { type: "hazard-sign", x: -12, z: 0 },
    { type: "hazard-sign", x: 12, z: 0 },
    // Floodlights on pillars
    { type: "floodlight", x: -22, z: -16 },
    { type: "floodlight", x: 22, z: -16 },
    { type: "floodlight", x: -22, z: 16 },
    { type: "floodlight", x: 22, z: 16 }
  ]
};

const CROSSFIRE = {
  id: "crossfire",
  name: "Crossfire",
  description: "Compact urban layout. Short mid-lane, one long sightline.",
  theme: "bunker",
  mode: "bomb",
  bounds: { minX: -28, maxX: 28, minZ: -22, maxZ: 22 },
  ground: { material: "concrete", repeat: [11, 9] },
  sky: { color: "#0e120c", fog: "#0e120c", fogDensity: 0.018, ceiling: 5.2 },
  lighting: {
    ambientSky: "#f4e3a3", ambientGround: "#1f2a1c", ambientIntensity: 1.4,
    sunColor: "#ffe4a6", sunIntensity: 2.4, sunPosition: [-6, 14, 8]
  },
  sites: [
    { id: "A", x: -18, z: -14, radius: 4.0 },
    { id: "B", x: 18,  z: 14,  radius: 4.0 }
  ],
  attackerSpawns: [
    { x: 0,  z: 18, yaw: Math.PI },
    { x: -6, z: 18, yaw: Math.PI },
    { x: 6,  z: 18, yaw: Math.PI }
  ],
  defenderSpawns: [
    { x: 0,  z: -18, yaw: 0 },
    { x: -6, z: -18, yaw: 0 },
    { x: 6,  z: -18, yaw: 0 }
  ],
  spawnPoints: [
    { x: 0, z: 18, yaw: Math.PI }, { x: 0, z: -18, yaw: 0 }
  ],
  colliders: [
    { id: "mid-wall-w", x: -10, z: 0, w: 14, d: 1.2, h: 2.8, material: "wall" },
    { id: "mid-wall-e", x: 10,  z: 0, w: 14, d: 1.2, h: 2.8, material: "wall" },
    { id: "a-wall-n",  x: -18, z: -20, w: 12, d: 1.0, h: 3.2, material: "wall" },
    { id: "a-wall-w",  x: -25, z: -14, w: 1.0, d: 13, h: 3.2, material: "wall" },
    { id: "a-wall-e",  x: -12, z: -14, w: 1.0, d: 13, h: 3.2, material: "wall" },
    { id: "b-wall-s",  x: 18,  z: 20,  w: 12, d: 1.0, h: 3.2, material: "wall" },
    { id: "b-wall-e",  x: 25,  z: 14,  w: 1.0, d: 13, h: 3.2, material: "wall" },
    { id: "b-wall-w",  x: 12,  z: 14,  w: 1.0, d: 13, h: 3.2, material: "wall" },
    { id: "cover-mid-a", x: -4, z: -6, w: 2.4, d: 1.6, h: 1.3, material: "crate" },
    { id: "cover-mid-b", x: 4,  z: 6,  w: 2.4, d: 1.6, h: 1.3, material: "crate" },
    { id: "cover-a-1",   x: -20, z: -12, w: 1.6, d: 2.4, h: 1.3, material: "crate" },
    { id: "cover-b-1",   x: 20,  z: 12,  w: 1.6, d: 2.4, h: 1.3, material: "crate" },
  ],
  pickups: [
    { id: "med-mid-w", type: "medkit", x: -14, z: 0 },
    { id: "med-mid-e", type: "medkit", x: 14,  z: 0 },
  ],
  props: []
};

const DOCKYARD = {
  id: "dockyard",
  name: "Dockyard",
  description: "Industrial port. Two routes, warehouse A-site, open B-site.",
  theme: "coastal",
  mode: "bomb",
  bounds: { minX: -40, maxX: 40, minZ: -32, maxZ: 32 },
  ground: { material: "asphalt", repeat: [16, 13] },
  sky: { color: "#0b1520", fog: "#0b1520", fogDensity: 0.012 },
  lighting: {
    ambientSky: "#b0cce0", ambientGround: "#1a2530", ambientIntensity: 1.2,
    sunColor: "#ccdde8", sunIntensity: 2.0, sunPosition: [10, 18, -5]
  },
  sites: [
    { id: "A", x: -26, z: -20, radius: 4.5 },
    { id: "B", x: 26,  z: 20,  radius: 4.5 }
  ],
  attackerSpawns: [
    { x: 0,  z: 28, yaw: Math.PI },
    { x: -8, z: 28, yaw: Math.PI },
    { x: 8,  z: 28, yaw: Math.PI }
  ],
  defenderSpawns: [
    { x: -26, z: -28, yaw: 0 },
    { x: 0,   z: -28, yaw: 0 },
    { x: 26,  z: -28, yaw: 0 }
  ],
  spawnPoints: [
    { x: 0, z: 28, yaw: Math.PI }, { x: 0, z: -28, yaw: 0 }
  ],
  colliders: [
    { id: "warehouse-n",  x: -26, z: -26, w: 20, d: 1.0, h: 4.0, material: "wall" },
    { id: "warehouse-w",  x: -37, z: -20, w: 1.0, d: 13, h: 4.0, material: "wall" },
    { id: "warehouse-e",  x: -16, z: -22, w: 1.0, d: 9,  h: 4.0, material: "wall" },
    { id: "crane-base",   x: 0, z: 0, w: 3.0, d: 3.0, h: 5.0, material: "industrial" },
    { id: "crane-arm",    x: 10, z: 0, w: 20, d: 1.0, h: 1.0, material: "industrial" },
    { id: "dock-wall-s",  x: 26,  z: 26, w: 20, d: 1.0, h: 2.2, material: "concrete" },
    { id: "dock-wall-e",  x: 37,  z: 20, w: 1.0, d: 13, h: 2.2, material: "concrete" },
    { id: "crate-a-1",  x: -24, z: -18, w: 2.4, d: 1.6, h: 1.3, material: "crate" },
    { id: "crate-a-2",  x: -28, z: -16, w: 1.6, d: 2.4, h: 1.3, material: "crate" },
    { id: "crate-b-1",  x: 24,  z: 18,  w: 2.4, d: 1.6, h: 1.3, material: "crate" },
    { id: "crate-b-2",  x: 28,  z: 16,  w: 1.6, d: 2.4, h: 1.3, material: "crate" },
    { id: "crate-mid",  x: -12, z: 8,   w: 2.4, d: 2.4, h: 1.3, material: "crate" },
    { id: "drums-mid",  x: 12,  z: -8,  w: 2.4, d: 2.4, h: 1.2, material: "drum"  },
  ],
  pickups: [
    { id: "med-a",   type: "medkit", x: -26, z: -18 },
    { id: "med-b",   type: "medkit", x: 26,  z: 18  },
    { id: "med-mid", type: "medkit", x: 0,   z: 0   },
  ],
  props: []
};

export const MAPS = {
  archive: ARCHIVE,
  bunker: BUNKER,
  coastal: COASTAL,
  forest: FOREST,
  frostgate: FROSTGATE,
  refinery: REFINERY,
  crossfire: CROSSFIRE,
  dockyard: DOCKYARD
};

export const MAP_ORDER = ["bunker", "archive", "coastal", "forest", "frostgate", "refinery", "crossfire", "dockyard"];
export const DEFAULT_MAP_ID = "bunker";

export function getMap(id) {
  return MAPS[id] || MAPS[DEFAULT_MAP_ID];
}

export function isMapId(id) {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(MAPS, id);
}
