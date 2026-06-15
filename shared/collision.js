import { PLAYER_RADIUS } from "./constants.js";

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeAngle(angle) {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

export function colliderToAabb(collider) {
  const baseY = collider.y || 0;
  return {
    minX: collider.x - collider.w / 2,
    maxX: collider.x + collider.w / 2,
    minY: baseY,
    maxY: baseY + collider.h,
    minZ: collider.z - collider.d / 2,
    maxZ: collider.z + collider.d / 2
  };
}

export function circleIntersectsCollider(position, collider, radius = PLAYER_RADIUS) {
  const minX = collider.x - collider.w / 2;
  const maxX = collider.x + collider.w / 2;
  const minZ = collider.z - collider.d / 2;
  const maxZ = collider.z + collider.d / 2;
  const closestX = clamp(position.x, minX, maxX);
  const closestZ = clamp(position.z, minZ, maxZ);
  const dx = position.x - closestX;
  const dz = position.z - closestZ;
  return dx * dx + dz * dz < radius * radius;
}

export function isWalkable(arena, position, radius = PLAYER_RADIUS, floorOptions = {}) {
  const bounds = arena.bounds;
  if (
    position.x < bounds.minX + radius ||
    position.x > bounds.maxX - radius ||
    position.z < bounds.minZ + radius ||
    position.z > bounds.maxZ - radius
  ) {
    return false;
  }
  const floorY = floorHeightAt(arena, position, floorOptions);
  return !arena.colliders.some((collider) => colliderBlocksFloor(collider, floorY) && circleIntersectsCollider(position, collider, radius));
}

export function clampToArena(arena, position, radius = PLAYER_RADIUS) {
  return {
    x: clamp(position.x, arena.bounds.minX + radius, arena.bounds.maxX - radius),
    z: clamp(position.z, arena.bounds.minZ + radius, arena.bounds.maxZ - radius)
  };
}

export function resolveMovement(arena, current, desired, radius = PLAYER_RADIUS, floorOptions = {}) {
  const clamped = clampToArena(arena, desired, radius);
  if (isWalkable(arena, clamped, radius, floorOptions)) {
    return clamped;
  }

  const xOnly = clampToArena(arena, { x: clamped.x, z: current.z }, radius);
  if (isWalkable(arena, xOnly, radius, floorOptions)) {
    return xOnly;
  }

  const zOnly = clampToArena(arena, { x: current.x, z: clamped.z }, radius);
  if (isWalkable(arena, zOnly, radius, floorOptions)) {
    return zOnly;
  }

  return clampToArena(arena, current, radius);
}

export function floorHeightAt(arena, position, options = {}) {
  let height = 0;
  for (const floor of arena.floors || []) {
    if (pointInRect(position, floor)) {
      height = highestReachable(height, floor.y || 0, options);
    }
  }
  for (const ramp of arena.ramps || []) {
    if (pointInRect(position, ramp)) {
      height = highestReachable(height, rampHeightAt(ramp, position), options);
    }
  }
  if (options.includeLadders !== false) {
    for (const ladder of arena.ladders || []) {
      if (pointInRect(position, ladder)) {
        height = highestReachable(height, ladderHeightAt(ladder, position), options);
      }
    }
  }
  for (const hill of arena.hills || []) {
    height = highestReachable(height, hillHeightAt(hill, position), options);
  }
  return height;
}

export function getLadderEndpoints(ladder) {
  const isXAxis = ladder.axis === "x";
  const run = isXAxis ? ladder.w : ladder.d;
  const center = isXAxis ? ladder.x : ladder.z;
  const min = center - run / 2;
  const max = center + run / 2;
  const lowCoord = ladder.highAt === "min" ? max : min;
  const highCoord = ladder.highAt === "min" ? min : max;
  const lowY = ladder.lowY || 0;
  const highY = ladder.highY || 0;

  return {
    bottom: isXAxis
      ? { x: lowCoord, y: lowY, z: ladder.z }
      : { x: ladder.x, y: lowY, z: lowCoord },
    top: isXAxis
      ? { x: highCoord, y: highY, z: ladder.z }
      : { x: ladder.x, y: highY, z: highCoord }
  };
}

export function findClimbableLadder(arena, position, yOffset = 0, maxDistance = 2.15) {
  let closest = null;
  for (const ladder of arena.ladders || []) {
    const { bottom, top } = getLadderEndpoints(ladder);
    const verticalGap = Math.abs((Number.isFinite(yOffset) ? yOffset : 0) - bottom.y);
    if (verticalGap > 1.35) continue;

    const distance = distanceToLadderEntry(ladder, position, bottom);
    if (distance > maxDistance) continue;
    if (!closest || distance < closest.distance) {
      closest = { ladder, bottom, top, distance };
    }
  }
  return closest;
}

export function rampHeightAt(ramp, position) {
  return linearSurfaceHeightAt(ramp, position);
}

export function ladderHeightAt(ladder, position) {
  return linearSurfaceHeightAt(ladder, position);
}

export function hillHeightAt(hill, position) {
  const radiusX = Math.max(hill.radiusX || hill.radius || 1, 0.001);
  const radiusZ = Math.max(hill.radiusZ || hill.radius || 1, 0.001);
  const dx = (position.x - hill.x) / radiusX;
  const dz = (position.z - hill.z) / radiusZ;
  const distance = Math.hypot(dx, dz);
  if (distance >= 1) return hill.baseY || 0;
  const plateau = Math.max(0, Math.min(hill.plateau || 0, 0.86));
  const raw = distance <= plateau ? 1 : 1 - (distance - plateau) / Math.max(1 - plateau, 0.001);
  const smooth = raw * raw * (3 - 2 * raw);
  return (hill.baseY || 0) + (hill.height || 0) * smooth;
}

function linearSurfaceHeightAt(surface, position) {
  const min = surface.axis === "x" ? surface.x - surface.w / 2 : surface.z - surface.d / 2;
  const max = surface.axis === "x" ? surface.x + surface.w / 2 : surface.z + surface.d / 2;
  const coord = surface.axis === "x" ? position.x : position.z;
  const raw = clamp((coord - min) / Math.max(max - min, 0.001), 0, 1);
  const t = surface.highAt === "min" ? 1 - raw : raw;
  const low = surface.lowY || 0;
  const high = surface.highY || 0;
  return low + (high - low) * t;
}

function pointInRect(position, rect) {
  return (
    position.x >= rect.x - rect.w / 2 &&
    position.x <= rect.x + rect.w / 2 &&
    position.z >= rect.z - rect.d / 2 &&
    position.z <= rect.z + rect.d / 2
  );
}

function distanceToLadderEntry(ladder, position, bottom) {
  const isXAxis = ladder.axis === "x";
  const lateralHalf = Math.max((isXAxis ? ladder.d : ladder.w) / 2, 0.35);
  const alongGap = Math.abs((isXAxis ? position.x : position.z) - (isXAxis ? bottom.x : bottom.z));
  const lateralGap = Math.abs((isXAxis ? position.z : position.x) - (isXAxis ? ladder.z : ladder.x));
  const outsideLateral = Math.max(0, lateralGap - lateralHalf);
  return Math.hypot(alongGap, outsideLateral);
}

function highestReachable(current, candidate, options) {
  if (!Number.isFinite(candidate) || !isReachableFloor(candidate, options)) {
    return current;
  }
  return Math.max(current, candidate);
}

function isReachableFloor(candidate, options) {
  if (!Number.isFinite(options.referenceY)) return true;
  const maxStepUp = Number.isFinite(options.maxStepUp) ? Math.max(options.maxStepUp, 0) : Infinity;
  return candidate <= options.referenceY + maxStepUp;
}

function colliderBlocksFloor(collider, floorY) {
  const baseY = collider.y || 0;
  const topY = baseY + collider.h;
  return baseY <= floorY + 0.35 && floorY < topY - 0.35;
}

export function vectorFromYawPitch(yaw, pitch) {
  const cp = Math.cos(pitch);
  return normalizeVector({
    x: -Math.sin(yaw) * cp,
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * cp
  });
}

export function normalizeVector(vector) {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (!Number.isFinite(length) || length < 0.0001) {
    return { x: 0, y: 0, z: -1 };
  }
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
}

export function distance2d(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function intersectRayAabb(origin, direction, aabb, maxDistance = Infinity) {
  let tMin = 0;
  let tMax = maxDistance;
  const axes = [
    ["x", "minX", "maxX"],
    ["y", "minY", "maxY"],
    ["z", "minZ", "maxZ"]
  ];

  for (const [axis, minKey, maxKey] of axes) {
    const rayOrigin = origin[axis];
    const rayDirection = direction[axis];
    const min = aabb[minKey];
    const max = aabb[maxKey];

    if (Math.abs(rayDirection) < 0.000001) {
      if (rayOrigin < min || rayOrigin > max) {
        return null;
      }
      continue;
    }

    let t1 = (min - rayOrigin) / rayDirection;
    let t2 = (max - rayOrigin) / rayDirection;
    if (t1 > t2) {
      const swap = t1;
      t1 = t2;
      t2 = swap;
    }

    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);

    if (tMin > tMax) {
      return null;
    }
  }

  if (tMin < 0 || tMin > maxDistance) {
    return null;
  }
  return tMin;
}

export function intersectRaySphere(origin, direction, center, radius, maxDistance = Infinity) {
  const oc = {
    x: origin.x - center.x,
    y: origin.y - center.y,
    z: origin.z - center.z
  };
  const b = oc.x * direction.x + oc.y * direction.y + oc.z * direction.z;
  const c = oc.x * oc.x + oc.y * oc.y + oc.z * oc.z - radius * radius;
  const discriminant = b * b - c;
  if (discriminant < 0) {
    return null;
  }
  const root = Math.sqrt(discriminant);
  const t = -b - root;
  if (t >= 0 && t <= maxDistance) {
    return t;
  }
  const fallback = -b + root;
  return fallback >= 0 && fallback <= maxDistance ? fallback : null;
}

export function nearestWallIntersection(arena, origin, direction, maxDistance) {
  let nearest = maxDistance;
  for (const collider of arena.colliders) {
    const hit = intersectRayAabb(origin, direction, colliderToAabb(collider), maxDistance);
    if (hit !== null && hit < nearest) {
      nearest = hit;
    }
  }
  for (const floor of arena.floors || []) {
    const hit = intersectRayAabb(origin, direction, floorToAabb(floor), maxDistance);
    if (hit !== null && hit < nearest) {
      nearest = hit;
    }
  }
  for (const ramp of arena.ramps || []) {
    for (const aabb of rampToAabbs(ramp)) {
      const hit = intersectRayAabb(origin, direction, aabb, maxDistance);
      if (hit !== null && hit < nearest) {
        nearest = hit;
      }
    }
  }
  return nearest;
}

function floorToAabb(floor) {
  const y = floor.y || 0;
  const thickness = floor.thickness || 0.28;
  return {
    minX: floor.x - floor.w / 2,
    maxX: floor.x + floor.w / 2,
    minY: y - thickness,
    maxY: y + 0.08,
    minZ: floor.z - floor.d / 2,
    maxZ: floor.z + floor.d / 2
  };
}

function rampToAabbs(ramp) {
  const steps = Math.max(2, ramp.steps || 8);
  const isXAxis = ramp.axis === "x";
  const stepRun = (isXAxis ? ramp.w : ramp.d) / steps;
  const min = (isXAxis ? ramp.x : ramp.z) - (isXAxis ? ramp.w : ramp.d) / 2;
  const aabbs = [];

  for (let index = 0; index < steps; index += 1) {
    const centerCoord = min + stepRun * (index + 0.5);
    const sample = isXAxis ? { x: centerCoord, z: ramp.z } : { x: ramp.x, z: centerCoord };
    const height = Math.max(0.12, rampHeightAt(ramp, sample));
    aabbs.push({
      minX: isXAxis ? centerCoord - stepRun / 2 : ramp.x - ramp.w / 2,
      maxX: isXAxis ? centerCoord + stepRun / 2 : ramp.x + ramp.w / 2,
      minY: 0,
      maxY: height + 0.08,
      minZ: isXAxis ? ramp.z - ramp.d / 2 : centerCoord - stepRun / 2,
      maxZ: isXAxis ? ramp.z + ramp.d / 2 : centerCoord + stepRun / 2
    });
  }

  return aabbs;
}
