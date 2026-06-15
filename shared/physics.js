import { PLAYER_BODY_HEIGHT, PLAYER_RADIUS } from "./constants.js";
import {
  clampToArena,
  floorHeightAt,
  hillHeightAt,
  ladderHeightAt,
  rampHeightAt
} from "./collision.js";

const GRAVITY = 14;
const CONTROLLER_OFFSET = 0.035;
const SNAP_TO_GROUND = 0.62;
const AUTOSTEP_HEIGHT = 0.42;
const AUTOSTEP_MIN_WIDTH = 0.2;
const WALL_THICKNESS = 1.4;
const FLOOR_THICKNESS = 0.28;

let rapierReady = false;
let rapierInitPromise = null;
let RAPIER = null;

export async function initializePhysics() {
  if (!rapierInitPromise) {
    rapierInitPromise = initializeRapier();
  }
  await rapierInitPromise;
}

async function initializeRapier() {
  RAPIER = await import("@dimforge/rapier3d-compat");
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (!String(args[0] || "").includes("deprecated parameters for the initialization function")) {
      originalWarn(...args);
    }
  };
  try {
    await RAPIER.init();
    rapierReady = true;
  } finally {
    console.warn = originalWarn;
  }
}

export function createArenaPhysics(arena) {
  if (!rapierReady) {
    throw new Error("Rapier physics must be initialized before creating arena physics.");
  }
  return new ArenaPhysics(arena);
}

class ArenaPhysics {
  constructor(arena) {
    this.arena = arena;
    this.world = new RAPIER.World({ x: 0, y: -GRAVITY, z: 0 });
    this.movers = new Map();

    addArenaBounds(this.world, arena);
    addGround(this.world, arena);
    addFloors(this.world, arena);
    addHills(this.world, arena);
    addRamps(this.world, arena);
    addLadders(this.world, arena);
    addColliders(this.world, arena);

    // Build the static broad phase before the first character query.
    this.world.step();
  }

  resolveMovement(current, desired, radius = PLAYER_RADIUS, floorY = floorHeightAt(this.arena, current, MOVEMENT_FLOOR_OPTIONS)) {
    const start = {
      x: current.x,
      y: Number.isFinite(current.y) ? current.y : floorY,
      z: current.z
    };
    const clampedDesired = clampToArena(this.arena, desired, radius);
    const result = this.moveCharacter(start, {
      x: clampedDesired.x - start.x,
      y: 0,
      z: clampedDesired.z - start.z
    }, { radius });

    return { x: result.position.x, z: result.position.z };
  }

  moveCharacter(current, desiredDelta, options = {}) {
    const radius = options.radius || PLAYER_RADIUS;
    const height = Math.max(options.height || PLAYER_BODY_HEIGHT, radius * 2 + 0.05);
    const mover = this.getMover(radius, height);
    const startFeetY = Number.isFinite(current.y) ? current.y : floorHeightAt(this.arena, current, MOVEMENT_FLOOR_OPTIONS);
    const startCenter = {
      x: current.x,
      y: startFeetY + height / 2,
      z: current.z
    };
    const wanted = {
      x: finiteOrZero(desiredDelta.x),
      y: finiteOrZero(desiredDelta.y),
      z: finiteOrZero(desiredDelta.z)
    };

    mover.collider.setTranslation(startCenter);
    mover.controller.computeColliderMovement(mover.collider, wanted);

    const movement = mover.controller.computedMovement();
    const finalCenter = {
      x: startCenter.x + finiteOrZero(movement.x),
      y: startCenter.y + finiteOrZero(movement.y),
      z: startCenter.z + finiteOrZero(movement.z)
    };
    const bounded = clampToArena(this.arena, finalCenter, radius);
    const finalFeetY = Math.max(0, finalCenter.y - height / 2);
    const correctedCenter = {
      x: bounded.x,
      y: finalFeetY + height / 2,
      z: bounded.z
    };
    mover.collider.setTranslation(correctedCenter);

    return {
      position: {
        x: bounded.x,
        y: finalFeetY,
        z: bounded.z
      },
      movement: {
        x: bounded.x - startCenter.x,
        y: finalCenter.y - startCenter.y,
        z: bounded.z - startCenter.z
      },
      grounded: mover.controller.computedGrounded(),
      collisions: mover.controller.numComputedCollisions()
    };
  }

  getMover(radius, height) {
    const key = `${radius.toFixed(3)}:${height.toFixed(3)}`;
    const existing = this.movers.get(key);
    if (existing) return existing;

    const halfSegment = Math.max(0.01, height / 2 - radius);
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc
        .capsule(halfSegment, radius)
        .setTranslation(0, height / 2, 0)
        .setContactSkin(0.01)
    );
    const controller = this.world.createCharacterController(CONTROLLER_OFFSET);
    controller.setUp({ x: 0, y: 1, z: 0 });
    controller.setSlideEnabled(true);
    controller.setNormalNudgeFactor?.(0.0025);
    controller.enableSnapToGround(SNAP_TO_GROUND);
    controller.enableAutostep(AUTOSTEP_HEIGHT, AUTOSTEP_MIN_WIDTH, false);
    controller.setMaxSlopeClimbAngle(48 * Math.PI / 180);
    controller.setMinSlopeSlideAngle(58 * Math.PI / 180);

    const mover = { collider, controller };
    this.movers.set(key, mover);
    return mover;
  }
}

function addArenaBounds(world, arena) {
  const { minX, maxX, minZ, maxZ } = arena.bounds;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const wallHeight = Math.max(5, arena.sky?.ceiling || 5);
  const halfY = wallHeight / 2;

  addStaticBox(world, centerX, halfY, minZ - WALL_THICKNESS / 2, width + WALL_THICKNESS * 2, wallHeight, WALL_THICKNESS);
  addStaticBox(world, centerX, halfY, maxZ + WALL_THICKNESS / 2, width + WALL_THICKNESS * 2, wallHeight, WALL_THICKNESS);
  addStaticBox(world, minX - WALL_THICKNESS / 2, halfY, centerZ, WALL_THICKNESS, wallHeight, depth);
  addStaticBox(world, maxX + WALL_THICKNESS / 2, halfY, centerZ, WALL_THICKNESS, wallHeight, depth);
}

function addGround(world, arena) {
  const { minX, maxX, minZ, maxZ } = arena.bounds;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  addStaticBox(
    world,
    (minX + maxX) / 2,
    -FLOOR_THICKNESS / 2,
    (minZ + maxZ) / 2,
    width,
    FLOOR_THICKNESS,
    depth
  );
}

function addFloors(world, arena) {
  for (const floor of arena.floors || []) {
    const y = floor.y || 0;
    const thickness = floor.thickness || FLOOR_THICKNESS;
    addStaticBox(world, floor.x, y - thickness / 2, floor.z, floor.w, thickness, floor.d);
  }
}

function addRamps(world, arena) {
  for (const ramp of arena.ramps || []) {
    const steps = Math.max(2, ramp.steps || 8);
    const isXAxis = ramp.axis === "x";
    const stepRun = (isXAxis ? ramp.w : ramp.d) / steps;
    const min = (isXAxis ? ramp.x : ramp.z) - (isXAxis ? ramp.w : ramp.d) / 2;

    for (let index = 0; index < steps; index += 1) {
      const centerCoord = min + stepRun * (index + 0.5);
      const sample = isXAxis ? { x: centerCoord, z: ramp.z } : { x: ramp.x, z: centerCoord };
      const height = Math.max(0.12, rampHeightAt(ramp, sample));
      addStaticBox(
        world,
        isXAxis ? centerCoord : ramp.x,
        height / 2,
        isXAxis ? ramp.z : centerCoord,
        isXAxis ? stepRun : ramp.w,
        height,
        isXAxis ? ramp.d : stepRun
      );
    }
  }
}

function addHills(world, arena) {
  for (const hill of arena.hills || []) {
    const mesh = buildHillTriMesh(hill);
    world.createCollider(RAPIER.ColliderDesc.trimesh(mesh.vertices, mesh.indices, RAPIER.TriMeshFlags?.FIX_INTERNAL_EDGES));
  }
}

function buildHillTriMesh(hill) {
  const radiusX = Math.max(hill.radiusX || hill.radius || 1, 0.001);
  const radiusZ = Math.max(hill.radiusZ || hill.radius || 1, 0.001);
  const segments = Math.max(8, hill.segments || 18);
  const vertices = [];
  const indices = [];

  for (let zIndex = 0; zIndex <= segments; zIndex += 1) {
    const z = hill.z - radiusZ + (zIndex / segments) * radiusZ * 2;
    for (let xIndex = 0; xIndex <= segments; xIndex += 1) {
      const x = hill.x - radiusX + (xIndex / segments) * radiusX * 2;
      vertices.push(x, hillHeightAt(hill, { x, z }), z);
    }
  }

  const stride = segments + 1;
  for (let zIndex = 0; zIndex < segments; zIndex += 1) {
    for (let xIndex = 0; xIndex < segments; xIndex += 1) {
      const a = zIndex * stride + xIndex;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint32Array(indices)
  };
}

function addLadders(world, arena) {
  // Ladders climb like steep staircases: thin flat treads follow the rung
  // line, exactly the pattern ramps use (which the controller climbs
  // reliably). A smooth inclined slab does NOT work here — autostep never
  // engages while ascending a slope, so the lip where the ladder meets the
  // destination floor blocks the climb. Flat-to-flat risers (~0.29) autostep
  // cleanly in both directions, and thin treads keep the space beneath the
  // ladder mostly open.
  const treadThickness = 0.26;
  for (const ladder of arena.ladders || []) {
    const isXAxis = ladder.axis === "x";
    const run = isXAxis ? ladder.w : ladder.d;
    const breadth = isXAxis ? ladder.d : ladder.w;
    const rise = Math.abs((ladder.highY || 0) - (ladder.lowY || 0));
    const steps = Math.max(4, Math.ceil(rise / 0.29));
    const stepRun = run / steps;
    const minCoord = (isXAxis ? ladder.x : ladder.z) - run / 2;

    for (let index = 0; index < steps; index += 1) {
      const centerCoord = minCoord + stepRun * (index + 0.5);
      const sample = isXAxis ? { x: centerCoord, z: ladder.z } : { x: ladder.x, z: centerCoord };
      const treadTop = ladderHeightAt(ladder, sample);
      world.createCollider(
        RAPIER.ColliderDesc
          .cuboid(
            (isXAxis ? stepRun : breadth) / 2 + 0.01,
            treadThickness / 2,
            (isXAxis ? breadth : stepRun) / 2 + 0.01
          )
          .setTranslation(
            isXAxis ? centerCoord : ladder.x,
            Math.max(treadTop - treadThickness / 2, treadThickness / 2),
            isXAxis ? ladder.z : centerCoord
          )
      );
    }
  }
}

function addColliders(world, arena) {
  for (const collider of arena.colliders || []) {
    const baseY = collider.y || 0;
    addStaticBox(world, collider.x, baseY + collider.h / 2, collider.z, collider.w, collider.h, collider.d);
  }
}

function addStaticBox(world, x, y, z, width, height, depth) {
  world.createCollider(
    RAPIER.ColliderDesc
      .cuboid(Math.max(width / 2, 0.01), Math.max(height / 2, 0.01), Math.max(depth / 2, 0.01))
      .setTranslation(x, y, z)
  );
}

function finiteOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}

const MOVEMENT_FLOOR_OPTIONS = {
  includeLadders: false
};
