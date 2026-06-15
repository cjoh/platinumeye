// Map definitions. Each map provides bounds, spawn points, colliders, pickups,
// optional elevation surfaces, and environment hints used by both the server
// (collision/spawn logic) and the client (rendering theme).
//
// Themes:
//   "bunker"  - indoor industrial bunker
//   "coastal" - outdoor beach with water and concrete fortifications
//   "forest"  - outdoor woods with trees, cabins, stone outcrops

function roomWalls({ id, x, z, w, d, h = 3.2, material = "wall", doors = [] }) {
  const walls = [];
  const horizontal = [
    { side: "n", z: z - d / 2 },
    { side: "s", z: z + d / 2 }
  ];
  const vertical = [
    { side: "w", x: x - w / 2 },
    { side: "e", x: x + w / 2 }
  ];

  for (const edge of horizontal) {
    const openings = doors
      .filter((door) => door.side === edge.side)
      .map((door) => ({
        min: x + (door.offset || 0) - (door.size || 7) / 2,
        max: x + (door.offset || 0) + (door.size || 7) / 2
      }));
    for (const [index, segment] of splitSpan(x - w / 2, x + w / 2, openings).entries()) {
      walls.push({ id: `${id}-${edge.side}-${index}`, x: segment.center, z: edge.z, w: segment.length, d: 0.9, h, material });
    }
  }

  for (const edge of vertical) {
    const openings = doors
      .filter((door) => door.side === edge.side)
      .map((door) => ({
        min: z + (door.offset || 0) - (door.size || 7) / 2,
        max: z + (door.offset || 0) + (door.size || 7) / 2
      }));
    for (const [index, segment] of splitSpan(z - d / 2, z + d / 2, openings).entries()) {
      walls.push({ id: `${id}-${edge.side}-${index}`, x: edge.x, z: segment.center, w: 0.9, d: segment.length, h, material });
    }
  }

  return walls;
}

// Deterministic PRNG — maps are evaluated independently on the server and in
// the browser, so scattered geometry MUST come out identical in both. Never
// use Math.random in a map definition.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function scatterTrees(idPrefix, cx, cz, radiusX, radiusZ, count, seed) {
  const rand = mulberry32(seed);
  const trees = [];
  for (let index = 0; index < count; index += 1) {
    const angle = rand() * Math.PI * 2;
    const reach = Math.sqrt(rand());
    const girth = 1.0 + Math.round(rand() * 4) / 10;
    trees.push({
      id: `${idPrefix}-${index}`,
      x: Math.round((cx + Math.cos(angle) * radiusX * reach) * 10) / 10,
      z: Math.round((cz + Math.sin(angle) * radiusZ * reach) * 10) / 10,
      w: girth,
      d: girth,
      h: 5.5 + Math.round(rand() * 30) / 10,
      material: "tree"
    });
  }
  return trees;
}

function splitSpan(min, max, openings) {
  const segments = [];
  let cursor = min;
  const sortedOpenings = openings
    .map((opening) => ({ min: Math.max(min, opening.min), max: Math.min(max, opening.max) }))
    .filter((opening) => opening.max > opening.min)
    .sort((a, b) => a.min - b.min);

  for (const opening of sortedOpenings) {
    if (opening.min - cursor > 0.6) {
      segments.push({ center: (cursor + opening.min) / 2, length: opening.min - cursor });
    }
    cursor = Math.max(cursor, opening.max);
  }

  if (max - cursor > 0.6) {
    segments.push({ center: (cursor + max) / 2, length: max - cursor });
  }
  return segments;
}

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
  floors: [
    { id: "tower-w-deck", x: -28, z: -22, w: 3.6, d: 3.6, y: 4.6, material: "concrete" },
    { id: "tower-e-deck", x: 28, z: -22, w: 3.6, d: 3.6, y: 4.6, material: "concrete" }
  ],
  ladders: [
    { id: "ladder-tower-w", x: -28, z: -17.15, w: 1.1, d: 6.7, lowY: 0, highY: 4.6, axis: "z", highAt: "min", material: "rail", steps: 16 },
    { id: "ladder-tower-e", x: 28, z: -17.15, w: 1.1, d: 6.7, lowY: 0, highY: 4.6, axis: "z", highAt: "min", material: "rail", steps: 16 }
  ],
  hills: [
    { id: "dune-west", x: -22, z: 8, radiusX: 12, radiusZ: 8, height: 2.1, plateau: 0.16, material: "ground", tint: "#d0bd89", rocks: 2 },
    { id: "dune-east", x: 22, z: 8, radiusX: 12, radiusZ: 8, height: 2.1, plateau: 0.16, material: "ground", tint: "#d0bd89", rocks: 2 },
    { id: "beach-crest", x: 0, z: 19, radiusX: 18, radiusZ: 6.5, height: 1.45, plateau: 0.28, material: "ground", tint: "#d7c596" }
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
    { id: "tower-w-rail", x: -28, z: -23.6, w: 3.4, d: 0.18, y: 4.6, h: 0.8, material: "rail" },
    { id: "tower-e-rail", x: 28, z: -23.6, w: 3.4, d: 0.18, y: 4.6, h: 0.8, material: "rail" },

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
    { id: "weapon-phantom", type: "weapon", x: -28, z: -22, weapon: "phantom" }
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
  floors: [
    { id: "tower-core-deck", x: 0, z: 0, w: 5.4, d: 5.4, y: 5.4, material: "industrial" },
    { id: "stack-w-deck", x: -28, z: 0, w: 3.2, d: 3.2, y: 5.4, material: "industrial" },
    { id: "stack-e-deck", x: 28, z: 0, w: 3.2, d: 3.2, y: 5.4, material: "industrial" }
  ],
  ladders: [
    { id: "ladder-tower-core", x: 0, z: -6.25, w: 1.1, d: 7.5, lowY: 0, highY: 5.4, axis: "z", highAt: "max", material: "rail", steps: 18 },
    { id: "ladder-stack-w", x: -28, z: -5.0, w: 1.0, d: 7.0, lowY: 0, highY: 5.4, axis: "z", highAt: "max", material: "rail", steps: 18 },
    { id: "ladder-stack-e", x: 28, z: 5.0, w: 1.0, d: 7.0, lowY: 0, highY: 5.4, axis: "z", highAt: "min", material: "rail", steps: 18 }
  ],
  hills: [
    { id: "slag-pile-nw", x: -24, z: 20, radiusX: 10, radiusZ: 7, height: 1.9, plateau: 0.12, material: "rock", tint: "#6f6453", rocks: 3 },
    { id: "slag-pile-se", x: 24, z: -20, radiusX: 10, radiusZ: 7, height: 1.9, plateau: 0.12, material: "rock", tint: "#6f6453", rocks: 3 }
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

const AEGIS_COMPLEX = {
  id: "aegis",
  name: "Aegis Complex",
  description: "Big 6-8 player bunker. Roughly 10x Foundry Annex area with labs, reactor rooms, and long service corridors.",
  theme: "bunker",
  size: "big",
  recommendedPlayers: "6-8",
  bounds: { minX: -90, maxX: 90, minZ: -80, maxZ: 80 },
  ground: { material: "concrete", repeat: [34, 30] },
  sky: { color: "#0b100c", fog: "#0e120c", fogDensity: 0.011, ceiling: 7.4 },
  lighting: {
    ambientSky: "#f4e3a3",
    ambientGround: "#172117",
    ambientIntensity: 1.28,
    sunColor: "#ffe4a6",
    sunIntensity: 2.2,
    sunPosition: [-16, 26, 12]
  },
  spawnPoints: [
    { x: -78, z: -68, yaw: Math.PI * 0.22 },
    { x: 78, z: -68, yaw: Math.PI * 1.78 },
    { x: -78, z: 68, yaw: Math.PI * 0.78 },
    { x: 78, z: 68, yaw: Math.PI * 1.22 },
    { x: -8, z: -70, yaw: 0 },
    { x: 8, z: 70, yaw: Math.PI },
    { x: -84, z: 0, yaw: Math.PI * 0.5 },
    { x: 84, z: 0, yaw: Math.PI * 1.5 }
  ],
  colliders: [
    ...roomWalls({ id: "aegis-command", x: -54, z: -46, w: 42, d: 32, h: 3.8, material: "wall", doors: [{ side: "s", offset: 0, size: 9 }, { side: "e", offset: 0, size: 8 }] }),
    ...roomWalls({ id: "aegis-armory", x: 54, z: -46, w: 42, d: 32, h: 3.8, material: "reinforced", doors: [{ side: "s", offset: 0, size: 9 }, { side: "w", offset: 0, size: 8 }] }),
    ...roomWalls({ id: "aegis-reactor", x: -54, z: 46, w: 42, d: 32, h: 3.8, material: "reinforced", doors: [{ side: "n", offset: 0, size: 9 }, { side: "e", offset: 0, size: 8 }] }),
    ...roomWalls({ id: "aegis-archive", x: 54, z: 46, w: 42, d: 32, h: 3.8, material: "wall", doors: [{ side: "n", offset: 0, size: 9 }, { side: "w", offset: 0, size: 8 }] }),
    ...roomWalls({ id: "aegis-medbay", x: -78, z: 0, w: 22, d: 42, h: 3.4, material: "wall", doors: [{ side: "e", offset: 0, size: 10 }, { side: "n", offset: 0, size: 7 }, { side: "s", offset: 0, size: 7 }] }),
    ...roomWalls({ id: "aegis-security", x: 78, z: 0, w: 22, d: 42, h: 3.4, material: "wall", doors: [{ side: "w", offset: 0, size: 10 }, { side: "n", offset: 0, size: 7 }, { side: "s", offset: 0, size: 7 }] }),
    ...roomWalls({ id: "aegis-core-room", x: 0, z: 0, w: 34, d: 28, h: 4.2, material: "reinforced", doors: [{ side: "n", offset: 0, size: 9 }, { side: "s", offset: 0, size: 9 }, { side: "e", offset: 0, size: 9 }, { side: "w", offset: 0, size: 9 }] }),

    // Corridor baffles and landmarks
    { id: "aegis-north-corridor-w", x: -28, z: -20, w: 26, d: 1.1, h: 3.2, material: "wall" },
    { id: "aegis-north-corridor-e", x: 28, z: -20, w: 26, d: 1.1, h: 3.2, material: "wall" },
    { id: "aegis-south-corridor-w", x: -28, z: 20, w: 26, d: 1.1, h: 3.2, material: "wall" },
    { id: "aegis-south-corridor-e", x: 28, z: 20, w: 26, d: 1.1, h: 3.2, material: "wall" },
    { id: "aegis-west-corridor-n", x: -24, z: -58, w: 1.1, d: 22, h: 3.2, material: "wall" },
    { id: "aegis-east-corridor-n", x: 24, z: -58, w: 1.1, d: 22, h: 3.2, material: "wall" },
    { id: "aegis-west-corridor-s", x: -24, z: 58, w: 1.1, d: 22, h: 3.2, material: "wall" },
    { id: "aegis-east-corridor-s", x: 24, z: 58, w: 1.1, d: 22, h: 3.2, material: "wall" },
    { id: "aegis-reactor-core", x: 0, z: 0, w: 7, d: 7, h: 5.6, material: "reinforced" },
    { id: "aegis-core-pillar-nw", x: -12, z: -10, w: 2, d: 2, h: 5.2, material: "reinforced" },
    { id: "aegis-core-pillar-ne", x: 12, z: -10, w: 2, d: 2, h: 5.2, material: "reinforced" },
    { id: "aegis-core-pillar-sw", x: -12, z: 10, w: 2, d: 2, h: 5.2, material: "reinforced" },
    { id: "aegis-core-pillar-se", x: 12, z: 10, w: 2, d: 2, h: 5.2, material: "reinforced" },

    // Cover inside named rooms
    { id: "aegis-command-console", x: -54, z: -46, w: 5, d: 2.8, h: 1.3, material: "console" },
    { id: "aegis-armory-rack-a", x: 48, z: -52, w: 12, d: 1.8, h: 2.3, material: "crate" },
    { id: "aegis-armory-rack-b", x: 60, z: -40, w: 1.8, d: 12, h: 2.3, material: "crate" },
    { id: "aegis-reactor-bank-a", x: -62, z: 40, w: 3, d: 12, h: 2.6, material: "console" },
    { id: "aegis-reactor-bank-b", x: -46, z: 52, w: 12, d: 3, h: 2.6, material: "console" },
    { id: "aegis-archive-stack-a", x: 48, z: 40, w: 3, d: 14, h: 2.4, material: "crate" },
    { id: "aegis-archive-stack-b", x: 61, z: 52, w: 3, d: 14, h: 2.4, material: "crate" },
    { id: "aegis-mid-crate-w", x: -44, z: 0, w: 5, d: 3, h: 1.4, material: "crate" },
    { id: "aegis-mid-crate-e", x: 44, z: 0, w: 5, d: 3, h: 1.4, material: "crate" },
    { id: "aegis-north-crate", x: 0, z: -44, w: 4, d: 4, h: 1.5, material: "crate" },
    { id: "aegis-south-crate", x: 0, z: 44, w: 4, d: 4, h: 1.5, material: "crate" }
  ],
  pickups: [
    { id: "med-command", type: "medkit", x: -54, z: -46 },
    { id: "med-archive", type: "medkit", x: 54, z: 46 },
    { id: "med-west", type: "medkit", x: -76, z: 0 },
    { id: "med-east", type: "medkit", x: 76, z: 0 },
    { id: "armor-north", type: "armor", x: 0, z: -62 },
    { id: "armor-south", type: "armor", x: 0, z: 62 },
    { id: "armor-core", type: "armor", x: 0, z: 0 },
    { id: "ammo-nw", type: "ammo", x: -72, z: -66, weapon: "cyclone" },
    { id: "ammo-ne", type: "ammo", x: 72, z: -66, weapon: "argus" },
    { id: "ammo-sw", type: "ammo", x: -72, z: 66, weapon: "cyclone" },
    { id: "ammo-se", type: "ammo", x: 72, z: 66, weapon: "argus" },
    { id: "weapon-cyclone", type: "weapon", x: -32, z: -4, weapon: "cyclone" },
    { id: "weapon-argus", type: "weapon", x: 32, z: 4, weapon: "argus" },
    { id: "weapon-oracle", type: "weapon", x: -4, z: -36, weapon: "oracle" },
    { id: "weapon-phantom", type: "weapon", x: 4, z: 36, weapon: "phantom" }
  ],
  props: [
    { type: "hazard-sign", x: -18, z: -20 },
    { type: "hazard-sign", x: 18, z: 20 },
    { type: "pallet", x: -66, z: -34 },
    { type: "pallet", x: 66, z: 34 },
    { type: "floodlight", x: -12, z: -10 },
    { type: "floodlight", x: 12, z: 10 }
  ]
};

const TIMBERLINE_COMPOUND = {
  id: "timberline",
  name: "Timberline Compound",
  description: "Big 6-8 player woodland base. Roughly 10x Foundry Annex area with lodges, sheds, and creek crossings.",
  theme: "forest",
  size: "big",
  recommendedPlayers: "6-8",
  bounds: { minX: -100, maxX: 100, minZ: -72, maxZ: 72 },
  ground: { material: "grass", repeat: [46, 34] },
  water: {
    minX: -96,
    maxX: 96,
    minZ: -5,
    maxZ: 5,
    y: 0.02,
    color: "#1f5a4a",
    deepColor: "#0c2a23",
    foamColor: "#bfe2d2"
  },
  sky: { color: "#8ea79d", fog: "#9fb5aa", fogDensity: 0.008, ceiling: null },
  lighting: {
    ambientSky: "#dbe7d4",
    ambientGround: "#3c4a32",
    ambientIntensity: 1.32,
    sunColor: "#ffe6b0",
    sunIntensity: 2.5,
    sunPosition: [-14, 28, 12]
  },
  spawnPoints: [
    { x: -88, z: -62, yaw: Math.PI * 0.25 },
    { x: 88, z: -62, yaw: Math.PI * 1.75 },
    { x: -88, z: 62, yaw: Math.PI * 0.75 },
    { x: 88, z: 62, yaw: Math.PI * 1.25 },
    { x: -18, z: -64, yaw: 0 },
    { x: 18, z: 64, yaw: Math.PI },
    { x: -94, z: 0, yaw: Math.PI * 0.5 },
    { x: 94, z: 0, yaw: Math.PI * 1.5 }
  ],
  floors: [
    { id: "timber-watch-w-deck", x: -86, z: 0, w: 6.2, d: 5.2, y: 5.2, material: "logpile" },
    { id: "timber-watch-e-deck", x: 86, z: 0, w: 6.2, d: 5.2, y: 5.2, material: "logpile" }
  ],
  ladders: [
    { id: "timber-watch-w-ladder", x: -86, z: 5.65, w: 1.0, d: 5.6, lowY: 0, highY: 5.2, axis: "z", highAt: "min", material: "rail", steps: 15 },
    { id: "timber-watch-e-ladder", x: 86, z: -5.65, w: 1.0, d: 5.6, lowY: 0, highY: 5.2, axis: "z", highAt: "max", material: "rail", steps: 15 }
  ],
  hills: [
    { id: "timber-north-ridge", x: 0, z: -58, radiusX: 28, radiusZ: 10, height: 3.0, plateau: 0.22, material: "ground", tint: "#4f6b40", rocks: 4 },
    { id: "timber-south-ridge", x: 0, z: 58, radiusX: 28, radiusZ: 10, height: 3.0, plateau: 0.22, material: "ground", tint: "#4f6b40", rocks: 4 },
    { id: "timber-west-knoll", x: -72, z: 18, radiusX: 16, radiusZ: 12, height: 2.2, plateau: 0.18, material: "ground", tint: "#4a6338", rocks: 3 },
    { id: "timber-east-knoll", x: 72, z: -18, radiusX: 16, radiusZ: 12, height: 2.2, plateau: 0.18, material: "ground", tint: "#4a6338", rocks: 3 }
  ],
  colliders: [
    ...roomWalls({ id: "timber-lodge-nw", x: -54, z: -42, w: 34, d: 26, h: 3.1, material: "log", doors: [{ side: "s", offset: 0, size: 8 }, { side: "e", offset: 0, size: 7 }] }),
    ...roomWalls({ id: "timber-lodge-ne", x: 54, z: -42, w: 34, d: 26, h: 3.1, material: "log", doors: [{ side: "s", offset: 0, size: 8 }, { side: "w", offset: 0, size: 7 }] }),
    ...roomWalls({ id: "timber-lodge-sw", x: -54, z: 42, w: 34, d: 26, h: 3.1, material: "log", doors: [{ side: "n", offset: 0, size: 8 }, { side: "e", offset: 0, size: 7 }] }),
    ...roomWalls({ id: "timber-lodge-se", x: 54, z: 42, w: 34, d: 26, h: 3.1, material: "log", doors: [{ side: "n", offset: 0, size: 8 }, { side: "w", offset: 0, size: 7 }] }),
    ...roomWalls({ id: "timber-ranger-hall", x: 0, z: -34, w: 42, d: 22, h: 3.2, material: "log", doors: [{ side: "s", offset: -12, size: 7 }, { side: "s", offset: 12, size: 7 }, { side: "n", offset: 0, size: 8 }] }),
    ...roomWalls({ id: "timber-supply-hall", x: 0, z: 34, w: 42, d: 22, h: 3.2, material: "log", doors: [{ side: "n", offset: -12, size: 7 }, { side: "n", offset: 12, size: 7 }, { side: "s", offset: 0, size: 8 }] }),

    // Creek crossings and exterior cover
    { id: "timber-bridge-west", x: -38, z: 0, w: 12, d: 3, h: 0.45, material: "logpile" },
    { id: "timber-bridge-center", x: 0, z: 0, w: 14, d: 3, h: 0.45, material: "logpile" },
    { id: "timber-bridge-east", x: 38, z: 0, w: 12, d: 3, h: 0.45, material: "logpile" },
    { id: "timber-rock-nw", x: -82, z: -30, w: 5, d: 4, h: 2.0, material: "rock" },
    { id: "timber-rock-ne", x: 82, z: -30, w: 5, d: 4, h: 2.0, material: "rock" },
    { id: "timber-rock-sw", x: -82, z: 30, w: 5, d: 4, h: 2.0, material: "rock" },
    { id: "timber-rock-se", x: 82, z: 30, w: 5, d: 4, h: 2.0, material: "rock" },
    { id: "timber-log-n", x: -18, z: -56, w: 9, d: 1.4, h: 1.0, material: "logpile" },
    { id: "timber-log-s", x: 18, z: 56, w: 9, d: 1.4, h: 1.0, material: "logpile" },
    { id: "timber-log-w", x: -78, z: 10, w: 1.4, d: 9, h: 1.0, material: "logpile" },
    { id: "timber-log-e", x: 78, z: -10, w: 1.4, d: 9, h: 1.0, material: "logpile" },

    // Tree clusters
    { id: "timber-tree-1", x: -88, z: -52, w: 1.1, d: 1.1, h: 4.8, material: "tree" },
    { id: "timber-tree-2", x: -72, z: -60, w: 1.1, d: 1.1, h: 4.8, material: "tree" },
    { id: "timber-tree-3", x: 72, z: -60, w: 1.1, d: 1.1, h: 4.8, material: "tree" },
    { id: "timber-tree-4", x: 88, z: -52, w: 1.1, d: 1.1, h: 4.8, material: "tree" },
    { id: "timber-tree-5", x: -88, z: 52, w: 1.1, d: 1.1, h: 4.8, material: "tree" },
    { id: "timber-tree-6", x: -72, z: 60, w: 1.1, d: 1.1, h: 4.8, material: "tree" },
    { id: "timber-tree-7", x: 72, z: 60, w: 1.1, d: 1.1, h: 4.8, material: "tree" },
    { id: "timber-tree-8", x: 88, z: 52, w: 1.1, d: 1.1, h: 4.8, material: "tree" },
    { id: "timber-tree-9", x: -28, z: -16, w: 1.1, d: 1.1, h: 4.8, material: "tree" },
    { id: "timber-tree-10", x: 28, z: 16, w: 1.1, d: 1.1, h: 4.8, material: "tree" },
    { id: "timber-tree-11", x: -18, z: 22, w: 1.1, d: 1.1, h: 4.8, material: "tree" },
    { id: "timber-tree-12", x: 18, z: -22, w: 1.1, d: 1.1, h: 4.8, material: "tree" }
  ],
  pickups: [
    { id: "med-nw", type: "medkit", x: -54, z: -42 },
    { id: "med-se", type: "medkit", x: 54, z: 42 },
    { id: "med-creek-w", type: "medkit", x: -38, z: 8 },
    { id: "med-creek-e", type: "medkit", x: 38, z: -8 },
    { id: "armor-north", type: "armor", x: 0, z: -34 },
    { id: "armor-south", type: "armor", x: 0, z: 34 },
    { id: "ammo-nw", type: "ammo", x: -88, z: -62, weapon: "cyclone" },
    { id: "ammo-ne", type: "ammo", x: 88, z: -62, weapon: "argus" },
    { id: "ammo-sw", type: "ammo", x: -88, z: 62, weapon: "cyclone" },
    { id: "ammo-se", type: "ammo", x: 88, z: 62, weapon: "argus" },
    { id: "weapon-cyclone", type: "weapon", x: -18, z: -18, weapon: "cyclone" },
    { id: "weapon-argus", type: "weapon", x: 18, z: 18, weapon: "argus" },
    { id: "weapon-oracle", type: "weapon", x: 0, z: -58, weapon: "oracle" },
    { id: "weapon-phantom", type: "weapon", x: 0, z: 58, weapon: "phantom" }
  ],
  props: [
    { type: "bush", x: -62, z: -18 },
    { type: "bush", x: 62, z: 18 },
    { type: "bush", x: -30, z: 28 },
    { type: "bush", x: 30, z: -28 },
    { type: "stump", x: -12, z: 12 },
    { type: "stump", x: 12, z: -12 },
    { type: "mushroom", x: -84, z: -48 },
    { type: "mushroom", x: 84, z: 48 },
    { type: "firefly", x: -36, z: -4 },
    { type: "firefly", x: 36, z: 4 },
    { type: "firefly", x: 0, z: 0 }
  ]
};

const NEON_DISTRICT = {
  id: "neon",
  name: "Neon District",
  description: "Big 6-8 player city block. Intersections, storefront rooms, alleys, service garages, and neon street cover.",
  theme: "refinery",
  size: "big",
  recommendedPlayers: "6-8",
  bounds: { minX: -96, maxX: 96, minZ: -75, maxZ: 75 },
  ground: { material: "asphalt", repeat: [40, 32] },
  sky: { color: "#10151c", fog: "#10151c", fogDensity: 0.008, ceiling: null },
  lighting: {
    ambientSky: "#9fc2db",
    ambientGround: "#222b31",
    ambientIntensity: 1.18,
    sunColor: "#ffe0a0",
    sunIntensity: 2.15,
    sunPosition: [-18, 30, 14]
  },
  preview: { pos: { x: -34, z: 8 }, yaw: Math.PI * 1.52, pitch: -0.03 },
  spawnPoints: [
    { x: -32, z: -64, yaw: Math.PI },
    { x: 32, z: -64, yaw: Math.PI },
    { x: -32, z: 64, yaw: 0 },
    { x: 32, z: 64, yaw: 0 },
    { x: -88, z: -24, yaw: Math.PI * 1.5 },
    { x: 88, z: -24, yaw: Math.PI * 0.5 },
    { x: -88, z: 24, yaw: Math.PI * 1.5 },
    { x: 88, z: 24, yaw: Math.PI * 0.5 }
  ],
  colliders: [
    ...roomWalls({ id: "neon-market", x: -58, z: -42, w: 34, d: 28, h: 6.4, material: "wall", doors: [{ side: "s", offset: -7, size: 8 }, { side: "e", offset: 0, size: 8 }] }),
    ...roomWalls({ id: "neon-garage", x: 58, z: -42, w: 34, d: 28, h: 6.2, material: "industrial", doors: [{ side: "s", offset: 7, size: 8 }, { side: "w", offset: 0, size: 8 }] }),
    ...roomWalls({ id: "neon-apartments", x: -58, z: 42, w: 34, d: 28, h: 7.4, material: "wall", doors: [{ side: "n", offset: 7, size: 8 }, { side: "e", offset: 0, size: 8 }] }),
    ...roomWalls({ id: "neon-station", x: 58, z: 42, w: 34, d: 28, h: 6.8, material: "industrial", doors: [{ side: "n", offset: -7, size: 8 }, { side: "w", offset: 0, size: 8 }] }),
    ...roomWalls({ id: "neon-arcade", x: 0, z: -50, w: 38, d: 20, h: 5.8, material: "container-blue", doors: [{ side: "s", offset: -10, size: 7 }, { side: "s", offset: 10, size: 7 }, { side: "n", offset: 0, size: 8 }] }),
    ...roomWalls({ id: "neon-clinic", x: 0, z: 50, w: 38, d: 20, h: 5.8, material: "container-green", doors: [{ side: "n", offset: -10, size: 7 }, { side: "n", offset: 10, size: 7 }, { side: "s", offset: 0, size: 8 }] }),

    // Street center, alley blockers, and compact cover.
    { id: "neon-plaza-kiosk", x: 0, z: 0, w: 8, d: 8, h: 2.7, material: "container-yellow" },
    { id: "neon-plaza-cover-n", x: 0, z: -15, w: 14, d: 2.2, h: 1.35, material: "container-red" },
    { id: "neon-plaza-cover-s", x: 0, z: 15, w: 14, d: 2.2, h: 1.35, material: "container-blue" },
    { id: "neon-plaza-cover-w", x: -20, z: 0, w: 2.2, d: 12, h: 1.35, material: "crate" },
    { id: "neon-plaza-cover-e", x: 20, z: 0, w: 2.2, d: 12, h: 1.35, material: "crate" },
    { id: "neon-mid-bus", x: -38, z: -6, w: 12, d: 3.2, h: 2.6, material: "container-green" },
    { id: "neon-mid-truck", x: 38, z: 6, w: 12, d: 3.2, h: 2.6, material: "container-yellow" },
    { id: "neon-alley-nw-a", x: -78, z: -18, w: 3, d: 16, h: 3.4, material: "container-red" },
    { id: "neon-alley-nw-b", x: -65, z: -4, w: 16, d: 2.6, h: 2.6, material: "crate" },
    { id: "neon-alley-ne-a", x: 78, z: -18, w: 3, d: 16, h: 3.4, material: "container-blue" },
    { id: "neon-alley-ne-b", x: 65, z: -4, w: 16, d: 2.6, h: 2.6, material: "crate" },
    { id: "neon-alley-sw-a", x: -78, z: 18, w: 3, d: 16, h: 3.4, material: "container-green" },
    { id: "neon-alley-sw-b", x: -65, z: 4, w: 16, d: 2.6, h: 2.6, material: "crate" },
    { id: "neon-alley-se-a", x: 78, z: 18, w: 3, d: 16, h: 3.4, material: "container-yellow" },
    { id: "neon-alley-se-b", x: 65, z: 4, w: 16, d: 2.6, h: 2.6, material: "crate" },
    { id: "neon-north-lane-break-w", x: -30, z: -33, w: 16, d: 2, h: 2.2, material: "industrial" },
    { id: "neon-north-lane-break-e", x: 30, z: -33, w: 16, d: 2, h: 2.2, material: "industrial" },
    { id: "neon-south-lane-break-w", x: -30, z: 33, w: 16, d: 2, h: 2.2, material: "industrial" },
    { id: "neon-south-lane-break-e", x: 30, z: 33, w: 16, d: 2, h: 2.2, material: "industrial" },
    { id: "neon-market-counter", x: -58, z: -43, w: 11, d: 2.2, h: 1.35, material: "crate" },
    { id: "neon-garage-lift", x: 58, z: -43, w: 9, d: 3.2, h: 1.5, material: "industrial" },
    { id: "neon-apartment-desk", x: -58, z: 43, w: 9, d: 2.2, h: 1.35, material: "crate" },
    { id: "neon-station-booth", x: 58, z: 43, w: 9, d: 3.2, h: 1.5, material: "industrial" },

    // City blocks framing the streets. These make the map read as a city,
    // while leaving the central avenues and alleys playable.
    { id: "neon-west-highrise-n", x: -94, z: -42, w: 4, d: 36, h: 13.5, material: "industrial" },
    { id: "neon-west-highrise-s", x: -94, z: 42, w: 4, d: 36, h: 12.5, material: "industrial" },
    { id: "neon-east-highrise-n", x: 94, z: -42, w: 4, d: 36, h: 12.8, material: "industrial" },
    { id: "neon-east-highrise-s", x: 94, z: 42, w: 4, d: 36, h: 14.2, material: "industrial" },
    { id: "neon-north-storefront-w", x: -38, z: -72, w: 28, d: 4, h: 7.2, material: "container-red" },
    { id: "neon-north-storefront-e", x: 38, z: -72, w: 28, d: 4, h: 7.2, material: "container-blue" },
    { id: "neon-south-storefront-w", x: -38, z: 72, w: 28, d: 4, h: 7.2, material: "container-green" },
    { id: "neon-south-storefront-e", x: 38, z: 72, w: 28, d: 4, h: 7.2, material: "container-yellow" },
    { id: "neon-foodcart", x: -12, z: 22, w: 4.8, d: 2.2, h: 2.1, material: "container-red" },
    { id: "neon-newsstand", x: 14, z: -22, w: 4.8, d: 2.2, h: 2.1, material: "container-blue" },
    { id: "neon-subway-entry-a", x: -31, z: 24, w: 7.5, d: 2.4, h: 1.35, material: "industrial" },
    { id: "neon-subway-entry-b", x: 31, z: -24, w: 7.5, d: 2.4, h: 1.35, material: "industrial" },
    { id: "neon-scaffold-n", x: 0, z: -31, w: 22, d: 1.3, h: 3.1, material: "industrial" },
    { id: "neon-scaffold-s", x: 0, z: 31, w: 22, d: 1.3, h: 3.1, material: "industrial" },
    { id: "neon-alley-dumpster-w", x: -72, z: 20, w: 3.2, d: 2.0, h: 1.6, material: "container-green" },
    { id: "neon-alley-dumpster-e", x: 72, z: -20, w: 3.2, d: 2.0, h: 1.6, material: "container-green" }
  ],
  pickups: [
    { id: "med-market", type: "medkit", x: -58, z: -42 },
    { id: "med-station", type: "medkit", x: 58, z: 42 },
    { id: "med-west-alley", type: "medkit", x: -86, z: 0 },
    { id: "med-east-alley", type: "medkit", x: 86, z: 0 },
    { id: "armor-north", type: "armor", x: 0, z: -62 },
    { id: "armor-south", type: "armor", x: 0, z: 62 },
    { id: "armor-plaza", type: "armor", x: 0, z: 0 },
    { id: "ammo-nw", type: "ammo", x: -84, z: -62, weapon: "cyclone" },
    { id: "ammo-ne", type: "ammo", x: 84, z: -62, weapon: "argus" },
    { id: "ammo-sw", type: "ammo", x: -84, z: 62, weapon: "cyclone" },
    { id: "ammo-se", type: "ammo", x: 84, z: 62, weapon: "argus" },
    { id: "weapon-cyclone", type: "weapon", x: -24, z: -12, weapon: "cyclone" },
    { id: "weapon-argus", type: "weapon", x: 24, z: 12, weapon: "argus" },
    { id: "weapon-oracle", type: "weapon", x: -12, z: 38, weapon: "oracle" },
    { id: "weapon-phantom", type: "weapon", x: 12, z: -38, weapon: "phantom" }
  ],
  props: [
    { type: "asset-model", asset: "city-block", x: -124, z: -86, scale: 1.05, rotation: Math.PI * 0.1 },
    { type: "asset-model", asset: "city-block", x: 124, z: -86, scale: 1.0, rotation: Math.PI * 0.64 },
    { type: "asset-model", asset: "city-block", x: -126, z: 86, scale: 0.95, rotation: Math.PI * 1.22 },
    { type: "asset-model", asset: "city-block", x: 126, z: 86, scale: 1.05, rotation: Math.PI * 1.08 },

    { type: "city-facade", x: -58, z: -28.3, w: 25, h: 8.2, rotation: 0, color: "#656b70", accent: "#f0cf6a" },
    { type: "city-facade", x: 58, z: -28.3, w: 25, h: 7.6, rotation: 0, color: "#515d68", accent: "#85d8ff" },
    { type: "city-facade", x: -58, z: 28.3, w: 25, h: 8.8, rotation: Math.PI, color: "#62616a", accent: "#ff8dcf" },
    { type: "city-facade", x: 58, z: 28.3, w: 25, h: 8.2, rotation: Math.PI, color: "#5c6870", accent: "#83ffbd" },
    { type: "city-facade", x: -40, z: -72.2, w: 24, h: 9.2, rotation: 0, color: "#61494c", accent: "#ffd466" },
    { type: "city-facade", x: 40, z: -72.2, w: 24, h: 9.2, rotation: 0, color: "#465c68", accent: "#8ae6ff" },
    { type: "city-facade", x: -40, z: 72.2, w: 24, h: 9.2, rotation: Math.PI, color: "#446251", accent: "#91ffbf" },
    { type: "city-facade", x: 40, z: 72.2, w: 24, h: 9.2, rotation: Math.PI, color: "#686047", accent: "#ffe084" },

    { type: "neon-sign", x: -58, z: -27.8, y: 3.7, text: "MARKET", color: "#ffd15c", rotation: 0 },
    { type: "neon-sign", x: 58, z: -27.8, y: 3.7, text: "GARAGE", color: "#86dcff", rotation: 0 },
    { type: "neon-sign", x: -58, z: 27.8, y: 3.9, text: "ROOMS", color: "#ff87d7", rotation: Math.PI },
    { type: "neon-sign", x: 58, z: 27.8, y: 3.9, text: "TRANSIT", color: "#8fffc0", rotation: Math.PI },
    { type: "neon-sign", x: 0, z: -39.8, y: 3.6, text: "ARCADE", color: "#8ae6ff", rotation: 0 },
    { type: "neon-sign", x: 0, z: 39.8, y: 3.6, text: "CLINIC", color: "#95ffc7", rotation: Math.PI },

    { type: "sidewalk", x: -33, z: -40, w: 7.5, d: 64 },
    { type: "sidewalk", x: 33, z: -40, w: 7.5, d: 64 },
    { type: "sidewalk", x: -33, z: 40, w: 7.5, d: 64 },
    { type: "sidewalk", x: 33, z: 40, w: 7.5, d: 64 },
    { type: "sidewalk", x: -64, z: -15, w: 52, d: 6.5, rotation: Math.PI / 2 },
    { type: "sidewalk", x: 64, z: 15, w: 52, d: 6.5, rotation: Math.PI / 2 },
    { type: "curb", x: -28.7, z: -40, d: 64 },
    { type: "curb", x: 28.7, z: -40, d: 64 },
    { type: "curb", x: -28.7, z: 40, d: 64 },
    { type: "curb", x: 28.7, z: 40, d: 64 },
    { type: "curb", x: -64, z: -10.7, d: 52, rotation: Math.PI / 2 },
    { type: "curb", x: 64, z: 10.7, d: 52, rotation: Math.PI / 2 },

    { type: "road-stripe", x: -2.1, z: -51, w: 0.32, d: 12 },
    { type: "road-stripe", x: 2.1, z: -51, w: 0.32, d: 12 },
    { type: "road-stripe", x: -2.1, z: -20, w: 0.32, d: 12 },
    { type: "road-stripe", x: 2.1, z: -20, w: 0.32, d: 12 },
    { type: "road-stripe", x: -2.1, z: 20, w: 0.32, d: 12 },
    { type: "road-stripe", x: 2.1, z: 20, w: 0.32, d: 12 },
    { type: "road-stripe", x: -2.1, z: 51, w: 0.32, d: 12 },
    { type: "road-stripe", x: 2.1, z: 51, w: 0.32, d: 12 },
    { type: "road-stripe", x: -54, z: -2.1, w: 0.32, d: 14, rotation: Math.PI / 2 },
    { type: "road-stripe", x: -24, z: -2.1, w: 0.32, d: 14, rotation: Math.PI / 2 },
    { type: "road-stripe", x: 24, z: -2.1, w: 0.32, d: 14, rotation: Math.PI / 2 },
    { type: "road-stripe", x: 54, z: -2.1, w: 0.32, d: 14, rotation: Math.PI / 2 },
    { type: "crosswalk", x: 0, z: -28, w: 22, d: 9 },
    { type: "crosswalk", x: 0, z: 28, w: 22, d: 9 },
    { type: "crosswalk", x: -28, z: 0, w: 22, d: 9, rotation: Math.PI / 2 },
    { type: "crosswalk", x: 28, z: 0, w: 22, d: 9, rotation: Math.PI / 2 },

    { type: "streetlight", x: -24, z: -26, rotation: Math.PI * 0.22 },
    { type: "streetlight", x: 24, z: -26, rotation: Math.PI * 0.78 },
    { type: "streetlight", x: -24, z: 26, rotation: Math.PI * 1.78 },
    { type: "streetlight", x: 24, z: 26, rotation: Math.PI * 1.22 },
    { type: "streetlight", x: -72, z: -8, rotation: Math.PI * 0.5 },
    { type: "streetlight", x: 72, z: 8, rotation: Math.PI * 1.5 },

    { type: "parked-car", x: -36, z: 13, rotation: Math.PI * 0.08, color: "#2f6f8f" },
    { type: "parked-car", x: 43, z: -14, rotation: Math.PI * 1.05, color: "#7b4b38" },
    { type: "parked-car", x: -18, z: -34, rotation: Math.PI * 0.96, color: "#4b5f72" },
    { type: "parked-car", x: 19, z: 33, rotation: Math.PI * 0.02, color: "#7b6b38" },
    { type: "dumpster", x: -72, z: 20, rotation: Math.PI * 0.5 },
    { type: "dumpster", x: 72, z: -20, rotation: Math.PI * 1.5 },
    { type: "pipe", x: -42, z: 17, length: 9 },
    { type: "pipe", x: 42, z: -17, length: 9 },
    { type: "pallet", x: -52, z: -14 },
    { type: "pallet", x: 52, z: 14 },
    { type: "hazard-sign", x: -12, z: -15 },
    { type: "hazard-sign", x: 12, z: 15 },
    { type: "floodlight", x: -22, z: -28 },
    { type: "floodlight", x: 22, z: 28 }
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
  props: [
    { type: "pallet", x: -22, z: -8 },
    { type: "pallet", x: 22, z: 8 },
    { type: "pallet", x: -2, z: 12 },
    { type: "hazard-sign", x: -16, z: -10 },
    { type: "hazard-sign", x: 16, z: 10 },
    { type: "pipe", x: 0, z: -16, len: 8, axis: "x" },
    { type: "pipe", x: -24, z: 6, len: 7, axis: "z" }
  ]
};

const DOCKYARD = {
  id: "dockyard",
  name: "Dockyard",
  description: "Industrial port. Two routes, warehouse A-site, open B-site.",
  theme: "coastal",
  mode: "bomb",
  bounds: { minX: -40, maxX: 40, minZ: -32, maxZ: 32 },
  ground: { material: "asphalt", repeat: [16, 13] },
  sky: { color: "#101824", fog: "#101a26", fogDensity: 0.011 },
  lighting: {
    ambientSky: "#8fb4d8", ambientGround: "#1a2530", ambientIntensity: 1.15,
    sunColor: "#ffb877", sunIntensity: 2.3, sunPosition: [14, 16, -8]
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
  floors: [
    { id: "crane-sniper-deck", x: 0, z: 0, w: 4.2, d: 4.2, y: 5.0, material: "industrial" }
  ],
  ladders: [
    { id: "crane-ladder", x: 0, z: 5.3, w: 1.0, d: 7.0, lowY: 0, highY: 5.0, axis: "z", highAt: "min", material: "rail", steps: 17 }
  ],
  hills: [
    { id: "dock-gravel-a", x: -30, z: 10, radiusX: 8, radiusZ: 6, height: 1.45, plateau: 0.12, material: "rock", tint: "#6b7068", rocks: 2 },
    { id: "dock-gravel-b", x: 30, z: -10, radiusX: 8, radiusZ: 6, height: 1.45, plateau: 0.12, material: "rock", tint: "#6b7068", rocks: 2 }
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
  props: [
    { type: "lighthouse", x: 52, z: -44, h: 11 },
    { type: "floodlight", x: -20, z: -24 },
    { type: "floodlight", x: 20, z: 24 },
    { type: "floodlight", x: -8, z: 4 },
    { type: "smokestack", x: -46, z: 14, h: 12 },
    { type: "antenna", x: 44, z: -18, h: 7 },
    { type: "seagull-flock", x: 12, z: -20, h: 9 },
    { type: "seagull-flock", x: -28, z: 24, h: 8 },
    { type: "buoy", x: 48, z: 10 },
    { type: "buoy", x: -48, z: -28 },
    { type: "pipe", x: 8, z: 22, len: 10, axis: "x" },
    { type: "pipe", x: -10, z: -22, len: 9, axis: "x" },
    { type: "pallet", x: -20, z: -14 },
    { type: "pallet", x: 20, z: 14 },
    { type: "pallet", x: 14, z: -4 },
    { type: "hazard-sign", x: -14, z: 10 },
    { type: "hazard-sign", x: 4, z: -10 }
  ]
};

const HIGHLANDS = {
  id: "highlands",
  name: "Highland Frontier",
  description: "Vast open-world valley. Mountains, a glacial lake, pine woods, and scattered camps.",
  theme: "forest",
  size: "huge",
  recommendedPlayers: "4-8",
  bounds: { minX: -300, maxX: 300, minZ: -240, maxZ: 240 },
  ground: { material: "grass", repeat: [120, 96] },
  water: [
    // Glacial lake on the west side of the valley.
    {
      minX: -150, maxX: -10, minZ: -30, maxZ: 110, y: 0.05,
      color: "#1f5a6e", deepColor: "#0a2733", foamColor: "#bfe2e2"
    },
    // River draining the lake east to the map edge.
    {
      minX: -10, maxX: 300, minZ: 28, maxZ: 56, y: 0.05,
      color: "#1f5a6e", deepColor: "#0a2733", foamColor: "#bfe2e2"
    }
  ],
  sky: { color: "#8db8e0", top: "#5d9bd9", fog: "#c2d4e0", fogDensity: 0.0016, ceiling: null },
  lighting: {
    ambientSky: "#dce9e4",
    ambientGround: "#41523a",
    ambientIntensity: 1.4,
    sunColor: "#fff0c0",
    sunIntensity: 2.9,
    sunPosition: [-60, 120, 40]
  },
  preview: { pos: { x: -30, z: -100 }, yaw: Math.PI * 0.75, pitch: -0.04 },
  // All slopes stay under ~25°, well within the 48° walkable limit, so every
  // hilltop is reachable on foot.
  hills: [
    { id: "mount-keld", x: -200, z: -150, radiusX: 105, radiusZ: 92, height: 24, plateau: 0.16, segments: 36, material: "ground", tint: "#5b6b4f", rocks: 6 },
    { id: "ridge-north", x: 40, z: -185, radiusX: 130, radiusZ: 75, height: 13, plateau: 0.1, segments: 32, material: "ground", tint: "#647350", rocks: 3 },
    { id: "summit-east", x: 215, z: -60, radiusX: 92, radiusZ: 88, height: 18, plateau: 0.22, segments: 32, material: "ground", tint: "#6b7a55", rocks: 5 },
    { id: "downs-south", x: -120, z: 170, radiusX: 100, radiusZ: 72, height: 11, plateau: 0.14, segments: 28, material: "ground", tint: "#5f7048", rocks: 2 },
    { id: "knoll-se", x: 130, z: 150, radiusX: 72, radiusZ: 62, height: 9, plateau: 0.2, segments: 24, material: "ground", tint: "#697a51", rocks: 2 },
    { id: "bluff-west", x: -205, z: 55, radiusX: 60, radiusZ: 58, height: 7, plateau: 0.26, segments: 22, material: "ground", tint: "#5f7048" }
  ],
  floors: [
    { id: "watch-deck", x: -30, z: -120, w: 4.2, d: 3.6, y: 5.2, material: "reinforced" }
  ],
  ladders: [
    { id: "watch-ladder", x: -30, z: -115.15, w: 1.1, d: 6.7, lowY: 0, highY: 5.2, axis: "z", highAt: "min", material: "rail", steps: 18 }
  ],
  spawnPoints: [
    { x: -270, z: -40, yaw: Math.PI * 1.5 },
    { x: 270, z: 100, yaw: Math.PI * 0.5 },
    { x: 0, z: -225, yaw: Math.PI },
    { x: 60, z: 225, yaw: 0 },
    { x: -130, z: -90, yaw: Math.PI * 1.3 },
    { x: 160, z: -200, yaw: Math.PI },
    { x: -100, z: -55, yaw: Math.PI * 0.9 },
    { x: 75, z: -15, yaw: 0 },
    { x: -40, z: 200, yaw: 0 },
    { x: 185, z: 185, yaw: Math.PI * 0.25 },
    { x: 215, z: -60, yaw: Math.PI * 0.6 },
    { x: -205, z: 55, yaw: Math.PI * 1.5 }
  ],
  colliders: [
    // Lakeside camp — log cabin on the west shore.
    ...roomWalls({ id: "camp-cabin", x: -85, z: -75, w: 14, d: 10, h: 3.2, material: "log", doors: [{ side: "e", offset: 0, size: 5 }, { side: "s", offset: -2, size: 4 }] }),
    { id: "camp-crate-a", x: -94, z: -68, w: 2.4, d: 1.6, h: 1.3, material: "crate" },
    { id: "camp-crate-b", x: -76, z: -82, w: 1.6, d: 2.4, h: 1.3, material: "crate" },

    // River barn on the north bank.
    ...roomWalls({ id: "river-barn", x: 60, z: -30, w: 16, d: 12, h: 3.6, material: "wall", doors: [{ side: "n", offset: 0, size: 6 }, { side: "s", offset: 0, size: 6 }] }),
    { id: "barn-bales", x: 66, z: -33, w: 2.6, d: 2.6, h: 1.4, material: "crate" },

    // Watchtower legs (deck + ladder defined above).
    { id: "watch-legs", x: -30, z: -120.8, w: 2.6, d: 1.6, h: 5.2, material: "log" },

    // Summit fort — cover on the east summit plateau (terrain height 18).
    { id: "fort-crate-a", x: 207, z: -66, w: 2.6, d: 1.7, h: 1.3, y: 18, material: "crate" },
    { id: "fort-crate-b", x: 222, z: -55, w: 1.7, d: 2.6, h: 1.3, y: 18, material: "crate" },
    { id: "fort-rock", x: 215, z: -72, w: 3.2, d: 2.2, h: 1.6, y: 18, material: "rock" },

    // Cairn on the mountain plateau (terrain height 24).
    { id: "keld-cairn", x: -200, z: -150, w: 2.8, d: 2.8, h: 1.8, y: 24, material: "rock" },

    // Stepping stones in the river.
    { id: "river-rock-a", x: 120, z: 40, w: 3.0, d: 3.0, h: 0.9, material: "rock" },
    { id: "river-rock-b", x: 185, z: 44, w: 2.6, d: 2.6, h: 0.8, material: "rock" },

    // Fallen logs as mid-field cover.
    { id: "log-a", x: 0, z: -60, w: 5.0, d: 1.2, h: 1.0, material: "log" },
    { id: "log-b", x: -150, z: 125, w: 1.2, d: 5.0, h: 1.0, material: "log" },
    { id: "log-c", x: 150, z: 90, w: 5.0, d: 1.2, h: 1.0, material: "log" },
    { id: "log-d", x: -60, z: -180, w: 5.0, d: 1.2, h: 1.0, material: "log" },

    // Pine woods (deterministic scatter — identical on server and client).
    ...scatterTrees("forest-south", 20, 165, 55, 45, 14, 7),
    ...scatterTrees("forest-east", 250, 140, 45, 60, 12, 23),
    ...scatterTrees("forest-northeast", 150, -190, 60, 40, 12, 41),
    ...scatterTrees("forest-shore", 10, 95, 28, 28, 8, 67)
  ],
  pickups: [
    { id: "med-camp", type: "medkit", x: -100, z: -70 },
    { id: "med-barn", type: "medkit", x: 60, z: -25 },
    { id: "med-summit", type: "medkit", x: 215, z: -50 },
    { id: "med-mountain", type: "medkit", x: -200, z: -145 },
    { id: "med-shore", type: "medkit", x: 10, z: 100 },
    { id: "med-downs", type: "medkit", x: -40, z: 190 },
    { id: "med-ne", type: "medkit", x: 160, z: -180 },
    { id: "med-east", type: "medkit", x: 270, z: 60 },
    { id: "armor-tower", type: "armor", x: 0, z: -120 },
    { id: "armor-bluff", type: "armor", x: -205, z: 60 },
    { id: "armor-knoll", type: "armor", x: 130, z: 145 },
    { id: "armor-barn", type: "armor", x: 60, z: -35 },
    { id: "armor-nw", type: "armor", x: -150, z: -180 },
    { id: "ammo-camp", type: "ammo", x: -80, z: -80, weapon: "cyclone" },
    { id: "ammo-mid", type: "ammo", x: 100, z: -100, weapon: "cyclone" },
    { id: "ammo-woods", type: "ammo", x: 30, z: 170, weapon: "argus" },
    { id: "ammo-east", type: "ammo", x: 240, z: 150, weapon: "argus" },
    { id: "ammo-summit", type: "ammo", x: 200, z: -120, weapon: "phantom" },
    { id: "ammo-west", type: "ammo", x: -240, z: 20, weapon: "oracle" },
    { id: "weapon-cyclone-camp", type: "weapon", x: -85, z: -75, weapon: "cyclone" },
    { id: "weapon-cyclone-barn", type: "weapon", x: 60, z: -30, weapon: "cyclone" },
    { id: "weapon-argus-woods", type: "weapon", x: 10, z: 95, weapon: "argus" },
    { id: "weapon-argus-downs", type: "weapon", x: -40, z: 205, weapon: "argus" },
    { id: "weapon-oracle-summit", type: "weapon", x: 215, z: -65, weapon: "oracle" },
    { id: "weapon-oracle-keld", type: "weapon", x: -200, z: -155, weapon: "oracle" },
    { id: "weapon-phantom-tower", type: "weapon", x: -30, z: -120, weapon: "phantom" },
    { id: "weapon-phantom-bluff", type: "weapon", x: -205, z: 50, weapon: "phantom" }
  ],
  props: [
    { type: "buoy", x: -80, z: 40 },
    { type: "buoy", x: -120, z: 80 },
    { type: "buoy", x: -40, z: -10 },
    { type: "seagull-flock", x: -80, z: 40, h: 10 },
    { type: "seagull-flock", x: 150, z: 42, h: 8 },
    { type: "floodlight", x: -92, z: -68 },
    { type: "floodlight", x: 68, z: -38 },
    { type: "antenna", x: -26, z: -118, h: 6.5 },
    { type: "bush", x: -60, z: -100 }, { type: "bush", x: 40, z: -80 }, { type: "bush", x: 90, z: 70 },
    { type: "bush", x: -170, z: 120 }, { type: "bush", x: 200, z: 20 }, { type: "bush", x: -250, z: -60 },
    { type: "bush", x: 120, z: -150 }, { type: "bush", x: -20, z: 140 }, { type: "bush", x: 250, z: -150 },
    { type: "bush", x: -100, z: 220 },
    { type: "stump", x: 30, z: 150 }, { type: "stump", x: 240, z: 130 }, { type: "stump", x: 140, z: -180 },
    { type: "stump", x: -70, z: -160 }, { type: "stump", x: 0, z: 80 },
    { type: "mushroom", x: 25, z: 175 }, { type: "mushroom", x: 255, z: 145 },
    { type: "mushroom", x: 5, z: 105 }, { type: "mushroom", x: 145, z: -195 }
  ]
};

export const MAPS = {
  archive: ARCHIVE,
  bunker: BUNKER,
  coastal: COASTAL,
  forest: FOREST,
  frostgate: FROSTGATE,
  refinery: REFINERY,
  aegis: AEGIS_COMPLEX,
  timberline: TIMBERLINE_COMPOUND,
  highlands: HIGHLANDS,
  neon: NEON_DISTRICT,
  crossfire: CROSSFIRE,
  dockyard: DOCKYARD
};

export const MAP_ORDER = ["bunker", "archive", "coastal", "forest", "frostgate", "refinery", "aegis", "timberline", "highlands", "neon", "crossfire", "dockyard"];
export const MAP_GROUPS = [
  {
    mode: "deathmatch",
    label: "Deathmatch",
    mapIds: MAP_ORDER.filter((id) => getMapMode(id) === "deathmatch")
  },
  {
    mode: "bomb",
    label: "Bomb Defuse",
    mapIds: MAP_ORDER.filter((id) => getMapMode(id) === "bomb")
  }
].filter((group) => group.mapIds.length > 0);
export const DEFAULT_MAP_ID = "bunker";

export function getMap(id) {
  return MAPS[id] || MAPS[DEFAULT_MAP_ID];
}

export function isMapId(id) {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(MAPS, id);
}

export function getMapMode(idOrMap) {
  const map = typeof idOrMap === "string" ? getMap(idOrMap) : idOrMap;
  return map?.mode === "bomb" ? "bomb" : "deathmatch";
}
