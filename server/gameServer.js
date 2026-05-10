import { DEFAULT_AVATAR_ID, isAvatarId } from "../shared/avatars.js";
import { DEFAULT_MAP_ID, getMap, isMapId } from "../shared/maps.js";
import { BombGame } from "./bombGame.js";
import { BOMB_MODES } from "../shared/constants.js";
import {
  MAX_ARMOR,
  MAX_BOTS_PER_ROOM,
  MAX_HEALTH,
  MAX_PLAYERS_PER_ROOM,
  PICKUP_RULES,
  PLAYER_EYE_HEIGHT,
  PLAYER_RADIUS,
  RESPAWN_MS,
  ROOM_IDLE_TTL_MS,
  SNAPSHOT_MS,
  TRAINING_BOT_COUNT,
  WEAPON_ORDER,
  WEAPONS
} from "../shared/constants.js";
import {
  clamp,
  distance2d,
  floorHeightAt,
  nearestWallIntersection,
  normalizeAngle,
  normalizeVector,
  resolveMovement,
  vectorFromYawPitch,
  intersectRaySphere
} from "../shared/collision.js";

const COLORS = ["#e8c15c", "#5fd2a5", "#ec6f5e", "#75a9ff", "#d995f6", "#efef8a", "#ff9f57", "#8ee0e4"];
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const BOT_PROFILES = [
  { key: "atlas", name: "Atlas", avatarId: "character-d", weapon: "cyclone", speed: 3.6, reactionMs: 1400, aimError: 0.22, shotPauseMs: 700, shotJitterMs: 480, pressure: 0.32 },
  { key: "vesper", name: "Vesper", avatarId: "character-k", weapon: "argus", speed: 3.4, reactionMs: 1700, aimError: 0.28, shotPauseMs: 900, shotJitterMs: 600, pressure: 0.28 },
  { key: "cipher", name: "Cipher", avatarId: "character-q", weapon: "sentinel", speed: 3.7, reactionMs: 1200, aimError: 0.19, shotPauseMs: 650, shotJitterMs: 440, pressure: 0.35 }
];
const BOT_SPAWN_GRACE_MS = 1700;

class GameRoom {
  constructor(code, mapId, botCount = TRAINING_BOT_COUNT) {
    this.code = code;
    this.mapId = isMapId(mapId) ? mapId : DEFAULT_MAP_ID;
    this.botCount = sanitizeBotCount(botCount);
    this.arena = getMap(this.mapId);
    this.players = new Map();
    this.pickups = this.arena.pickups.map((pickup) => ({
      ...pickup,
      active: true,
      respawnAt: 0
    }));
    this.lastActiveAt = Date.now();
    this.feed = [];
    this.mode = this.arena.mode === "bomb" ? BOMB_MODES.BOMB : BOMB_MODES.DEATHMATCH;
    this.bombGame = this.mode === BOMB_MODES.BOMB ? new BombGame(this) : null;
  }

  get size() {
    return this.humanCount;
  }

  get humanCount() {
    return Array.from(this.players.values()).filter((player) => !player.isBot).length;
  }

  addPlayer(id, name, avatarId) {
    const spawn = this.pickSpawn();
    const spawnY = floorHeightAt(this.arena, spawn);
    const player = {
      id,
      name: sanitizeName(name),
      avatarId: sanitizeAvatarId(avatarId),
      color: COLORS[this.players.size % COLORS.length],
      pos: { x: spawn.x, z: spawn.z },
      yaw: spawn.yaw,
      pitch: 0,
      health: MAX_HEALTH,
      armor: 0,
      alive: true,
      score: 0,
      deaths: 0,
      streak: 0,
      team: null,
      cash: null,
      isBot: false,
      weapon: "sentinel",
      ownedWeapons: ["sentinel"],
      ammo: {
        sentinel: Infinity,
        cyclone: 0,
        argus: 0,
        oracle: 0,
        phantom: 0
      },
      yOffset: spawnY,
      crouch: 0,
      nextShotAt: 0,
      respawnAt: 0,
      lastStateAt: Date.now(),
      joinedAt: Date.now()
    };
    this.players.set(id, player);
    this.pushFeed(`${player.name} entered ${this.code}`);
    return player;
  }

  removePlayer(id) {
    const player = this.players.get(id);
    if (player) {
      this.players.delete(id);
      this.pushFeed(`${player.name} extracted`);
      this.ensureBots();
    }
  }

  ensureBots() {
    const bots = Array.from(this.players.values()).filter((player) => player.isBot);
    const humans = this.humanCount;
    const desiredBots = humans > 0 ? clamp(this.botCount, 0, Math.max(0, MAX_PLAYERS_PER_ROOM - humans)) : 0;

    for (let index = bots.length - 1; index >= desiredBots; index -= 1) {
      this.players.delete(bots[index].id);
    }

    for (let index = bots.length; index < desiredBots; index += 1) {
      const bot = this.createBot(index);
      this.players.set(bot.id, bot);
      this.pushFeed(`${bot.name} simulation online`);
    }
  }

  createBot(index) {
    const profile = BOT_PROFILES[index % BOT_PROFILES.length];
    const spawn = this.pickSpawn();
    const spawnY = floorHeightAt(this.arena, spawn);
    const weapon = WEAPONS[profile.weapon] ? profile.weapon : "sentinel";
    const cycle = Math.floor(index / BOT_PROFILES.length);
    return {
      id: `bot-${this.code}-${index}-${profile.key}`,
      name: cycle > 0 ? `${profile.name} ${cycle + 1}` : profile.name,
      avatarId: profile.avatarId,
      color: COLORS[(this.players.size + index + 1) % COLORS.length],
      pos: { x: spawn.x, z: spawn.z },
      yaw: spawn.yaw,
      pitch: 0,
      health: MAX_HEALTH,
      armor: 10,
      alive: true,
      score: 0,
      deaths: 0,
      streak: 0,
      isBot: true,
      weapon,
      ownedWeapons: uniqueWeaponList(["sentinel", weapon, "cyclone", "argus"]),
      ammo: {
        sentinel: Infinity,
        cyclone: weapon === "cyclone" ? 90 : 36,
        argus: weapon === "argus" ? 24 : 8,
        oracle: 0,
        phantom: 0
      },
      yOffset: spawnY,
      crouch: 0,
      nextShotAt: Date.now() + BOT_SPAWN_GRACE_MS + index * 520,
      respawnAt: 0,
      lastStateAt: Date.now(),
      joinedAt: Date.now(),
      ai: {
        profile,
        nextThinkAt: 0,
        strafe: Math.random() > 0.5 ? 1 : -1,
        pressure: profile.pressure + Math.random() * 0.14,
        targetId: null,
        firstSeenAt: 0
      }
    };
  }

  setBotCount(botCount) {
    const nextCount = sanitizeBotCount(botCount);
    if (nextCount === this.botCount) return;
    this.botCount = nextCount;
    this.pushFeed(`Simulation count set to ${this.botCount}`);
    this.ensureBots();
  }

  pickSpawn() {
    const taken = Array.from(this.players.values()).filter((player) => player.alive);
    let best = this.arena.spawnPoints[0];
    let bestDistance = -Infinity;
    for (const spawn of this.arena.spawnPoints) {
      const nearest = taken.reduce((min, player) => Math.min(min, distance2d(spawn, player.pos)), Infinity);
      if (nearest > bestDistance) {
        best = spawn;
        bestDistance = nearest;
      }
    }
    return best;
  }

  updatePlayerState(id, state) {
    const player = this.players.get(id);
    if (!player || !player.alive) return;

    const now = Date.now();
    const dt = clamp((now - player.lastStateAt) / 1000, 0.016, 0.25);
    const desired = {
      x: Number(state?.position?.x),
      z: Number(state?.position?.z)
    };
    if (Number.isFinite(desired.x) && Number.isFinite(desired.z)) {
      const maxStep = 9.5 * dt + 0.3;
      const dx = clamp(desired.x - player.pos.x, -maxStep, maxStep);
      const dz = clamp(desired.z - player.pos.z, -maxStep, maxStep);
      player.pos = resolveMovement(this.arena, player.pos, { x: player.pos.x + dx, z: player.pos.z + dz }, PLAYER_RADIUS);
    }
    const floorY = floorHeightAt(this.arena, player.pos);

    if (Number.isFinite(state?.yaw)) {
      player.yaw = normalizeAngle(state.yaw);
    }
    if (Number.isFinite(state?.pitch)) {
      player.pitch = clamp(state.pitch, -1.25, 1.1);
    }
    if (Number.isFinite(state?.yOffset)) {
      player.yOffset = clamp(state.yOffset, floorY, floorY + 3.5);
    } else {
      player.yOffset = floorY;
    }
    if (Number.isFinite(state?.crouch)) {
      player.crouch = clamp(state.crouch, 0, 1);
    }
    player.lastStateAt = now;
    this.lastActiveAt = now;
  }

  switchWeapon(id, requestedWeapon) {
    const player = this.players.get(id);
    if (!player || !WEAPONS[requestedWeapon]) return;
    if (playerOwnsWeapon(player, requestedWeapon)) {
      player.weapon = requestedWeapon;
    }
  }

  shoot(id, payload) {
    const player = this.players.get(id);
    if (!player || !player.alive) return null;
    if (this.bombGame && (this.bombGame.phase === "freeze" || this.bombGame.phase === "end" || this.bombGame.phase === "over")) return null;
    const weapon = WEAPONS[player.weapon] || WEAPONS.sentinel;
    const now = Date.now();
    if (now < player.nextShotAt) return null;

    if (weapon.ammoMax !== Infinity) {
      const ammo = player.ammo[player.weapon] || 0;
      if (ammo <= 0) {
        return { type: "dry", playerId: id, weaponId: player.weapon };
      }
      player.ammo[player.weapon] = Math.max(0, ammo - 1);
    }

    player.nextShotAt = now + weapon.fireMs;
    this.lastActiveAt = now;

    let aim = normalizeVector(payload?.direction || vectorFromYawPitch(player.yaw, player.pitch));
    if (Math.abs(aim.y) > 0.95) {
      aim = vectorFromYawPitch(player.yaw, player.pitch);
    }

    const origin = {
      x: player.pos.x,
      y: PLAYER_EYE_HEIGHT + (player.yOffset || 0) - 0.06,
      z: player.pos.z
    };

    const pelletHits = new Map();
    let firstEnd = null;
    let firstHitId = null;
    for (let pellet = 0; pellet < weapon.pellets; pellet += 1) {
      const pelletDir = addSpread(aim, weapon.spread);
      const trace = this.traceShot(player, origin, pelletDir, weapon.range);
      firstEnd ||= trace.end;
      firstHitId ||= trace.hitId;
      if (trace.hitId) {
        pelletHits.set(trace.hitId, (pelletHits.get(trace.hitId) || 0) + weapon.damage);
      }
    }

    const damageResults = [];
    for (const [targetId, damage] of pelletHits.entries()) {
      const result = this.applyDamage(targetId, id, damage, weapon);
      if (result) damageResults.push(result);
    }

    return {
      type: "shot",
      shooterId: id,
      weaponId: weapon.id,
      origin,
      end: firstEnd || {
        x: origin.x + aim.x * weapon.range,
        y: origin.y + aim.y * weapon.range,
        z: origin.z + aim.z * weapon.range
      },
      hitId: firstHitId,
      damageResults
    };
  }

  traceShot(shooter, origin, direction, range) {
    const wallDistance = nearestWallIntersection(this.arena, origin, direction, range);
    let nearestPlayer = null;
    let nearestDistance = wallDistance;

    for (const target of this.players.values()) {
      if (target.id === shooter.id || !target.alive) continue;
      const center = { x: target.pos.x, y: PLAYER_EYE_HEIGHT + (target.yOffset || 0) - 0.34, z: target.pos.z };
      const hitDistance = intersectRaySphere(origin, direction, center, 0.58, nearestDistance);
      if (hitDistance !== null && hitDistance < nearestDistance) {
        nearestDistance = hitDistance;
        nearestPlayer = target;
      }
    }

    return {
      hitId: nearestPlayer?.id || null,
      end: {
        x: origin.x + direction.x * nearestDistance,
        y: origin.y + direction.y * nearestDistance,
        z: origin.z + direction.z * nearestDistance
      }
    };
  }

  applyDamage(targetId, attackerId, rawDamage, weapon) {
    const target = this.players.get(targetId);
    const attacker = this.players.get(attackerId);
    if (!target || !attacker || !target.alive) return null;

    const armorAbsorb = Math.min(target.armor, Math.round(rawDamage * 0.52));
    const healthDamage = Math.max(0, Math.round(rawDamage - armorAbsorb));
    target.armor = Math.max(0, target.armor - armorAbsorb);
    target.health = Math.max(0, target.health - healthDamage);

    const result = {
      targetId,
      attackerId,
      damage: healthDamage,
      armorDamage: armorAbsorb,
      eliminated: false
    };

    if (target.health <= 0) {
      target.alive = false;
      target.deaths += 1;
      target.respawnAt = Date.now() + RESPAWN_MS;
      target.weapon = "sentinel";
      target.ownedWeapons = ["sentinel"];
      target.ammo.cyclone = Math.min(target.ammo.cyclone, 24);
      target.ammo.argus = Math.min(target.ammo.argus, 6);
      target.ammo.oracle = 0;
      target.ammo.phantom = 0;
      attacker.score += 1;
      attacker.streak += 1;
      target.streak = 0;
      result.eliminated = true;
      this.pushFeed(`${attacker.name} dropped ${target.name} with ${weapon.shortName}`);
    }

    return result;
  }

  update() {
    const now = Date.now();
    const events = [];
    this.ensureBots();

    for (const player of this.players.values()) {
      if (this.mode === BOMB_MODES.DEATHMATCH) {
        if (!player.alive && player.respawnAt && now >= player.respawnAt) {
          this.respawn(player);
        }
      }
    }

    for (const player of this.players.values()) {
      if (player.isBot) {
        const event = this.updateBot(player, now);
        if (event) events.push(event);
      }
    }

    for (const player of this.players.values()) {
      if (player.alive) {
        this.collectPickups(player, now);
      }
    }
    for (const pickup of this.pickups) {
      if (!pickup.active && pickup.respawnAt <= now) {
        pickup.active = true;
      }
    }
    if (this.bombGame) {
      this.bombGame.tickInteractions();
      const bombEvents = this.bombGame.update();
      for (const ev of bombEvents) events.push(ev);
    }
    return events;
  }

  updateBot(bot, now) {
    if (!bot.alive) return null;
    const dt = clamp((now - bot.lastStateAt) / 1000, 0.016, 0.18);
    const target = this.pickBotTarget(bot);
    if (!target) return null;

    const profile = bot.ai.profile;
    if (now >= bot.ai.nextThinkAt) {
      bot.ai.nextThinkAt = now + 520 + Math.random() * 680;
      bot.ai.strafe = Math.random() > 0.5 ? 1 : -1;
      bot.ai.pressure = profile.pressure + Math.random() * 0.18;
    }

    const toTarget = {
      x: target.pos.x - bot.pos.x,
      z: target.pos.z - bot.pos.z
    };
    const distance = Math.max(0.001, Math.hypot(toTarget.x, toTarget.z));
    const forward = { x: toTarget.x / distance, z: toTarget.z / distance };
    const side = { x: -forward.z * bot.ai.strafe, z: forward.x * bot.ai.strafe };
    const desiredRange = bot.weapon === "argus" ? 8 : bot.weapon === "cyclone" ? 13 : 16;
    const push = distance > desiredRange ? 1 : distance < desiredRange * 0.62 ? -0.72 : 0.12;
    const move = normalize2d({
      x: forward.x * push + side.x * bot.ai.pressure,
      z: forward.z * push + side.z * bot.ai.pressure
    });
    const speed = profile.speed * (bot.health < 36 ? 0.82 : 1);
    bot.pos = resolveMovement(this.arena, bot.pos, { x: bot.pos.x + move.x * speed * dt, z: bot.pos.z + move.z * speed * dt }, PLAYER_RADIUS);
    bot.yOffset = floorHeightAt(this.arena, bot.pos);
    bot.yaw = Math.atan2(-forward.x, -forward.z);
    bot.pitch = clamp(Math.atan2((target.yOffset || 0) - (bot.yOffset || 0), distance), -0.35, 0.32);
    bot.crouch = distance < 10 && Math.sin(now * 0.004 + bot.joinedAt) > 0.65 ? 0.65 : 0;
    bot.lastStateAt = now;

    this.chooseBotWeapon(bot, distance);
    if (!this.botHasLineOfSight(bot, target, distance)) {
      bot.ai.firstSeenAt = 0;
      return null;
    }
    if (bot.ai.targetId !== target.id || !bot.ai.firstSeenAt) {
      bot.ai.targetId = target.id;
      bot.ai.firstSeenAt = now;
      bot.nextShotAt = Math.max(bot.nextShotAt, now + profile.reactionMs);
    }
    if (distance > (WEAPONS[bot.weapon]?.range || 42) * 0.84) return null;
    if (!bot.ai.firstSeenAt || now - bot.ai.firstSeenAt < profile.reactionMs) return null;
    if (now < bot.nextShotAt) return null;

    const aim = normalizeVector({
      x: target.pos.x - bot.pos.x + randomRange(-profile.aimError, profile.aimError) * distance,
      y: (PLAYER_EYE_HEIGHT + (target.yOffset || 0) - 0.18) - (PLAYER_EYE_HEIGHT + (bot.yOffset || 0) - 0.06) + randomRange(-profile.aimError, profile.aimError) * distance * 0.35,
      z: target.pos.z - bot.pos.z + randomRange(-profile.aimError, profile.aimError) * distance
    });
    const event = this.shoot(bot.id, { direction: aim });
    if (event) {
      bot.nextShotAt += profile.shotPauseMs + Math.random() * profile.shotJitterMs;
    }
    return event;
  }

  pickBotTarget(bot) {
    const targets = Array.from(this.players.values()).filter((player) => {
      if (player.id === bot.id || !player.alive) return false;
      if (this.mode === "bomb" && bot.team && player.team === bot.team) return false;
      return true;
    });
    const humans = targets.filter((player) => !player.isBot);
    const pool = humans.length ? humans : targets;
    return pool.sort((a, b) => distance2d(bot.pos, a.pos) - distance2d(bot.pos, b.pos))[0] || null;
  }

  chooseBotWeapon(bot, distance) {
    if (distance < 10 && bot.ammo.argus > 0) {
      bot.weapon = "argus";
    } else if (distance < 28 && bot.ammo.cyclone > 0) {
      bot.weapon = "cyclone";
    } else if (distance > 22 && bot.ammo.oracle > 0) {
      bot.weapon = "oracle";
    } else {
      bot.weapon = "sentinel";
    }
  }

  botHasLineOfSight(bot, target, distance) {
    const origin = { x: bot.pos.x, y: PLAYER_EYE_HEIGHT + (bot.yOffset || 0) - 0.06, z: bot.pos.z };
    const direction = normalizeVector({
      x: target.pos.x - bot.pos.x,
      y: (PLAYER_EYE_HEIGHT + (target.yOffset || 0) - 0.2) - origin.y,
      z: target.pos.z - bot.pos.z
    });
    return nearestWallIntersection(this.arena, origin, direction, distance) >= distance - 0.25;
  }

  respawn(player) {
    const spawn = this.pickSpawn();
    player.pos = { x: spawn.x, z: spawn.z };
    player.yaw = spawn.yaw;
    player.pitch = 0;
    player.yOffset = floorHeightAt(this.arena, player.pos);
    player.health = MAX_HEALTH;
    player.armor = 0;
    player.alive = true;
    player.ownedWeapons = uniqueWeaponList(player.ownedWeapons || ["sentinel"]);
    player.respawnAt = 0;
    player.nextShotAt = Date.now() + (player.isBot ? BOT_SPAWN_GRACE_MS : 450);
    if (player.isBot && player.ai) {
      player.ai.targetId = null;
      player.ai.firstSeenAt = 0;
    }
  }

  collectPickups(player, now) {
    for (const pickup of this.pickups) {
      if (!pickup.active || distance2d(player.pos, pickup) > 1.0) continue;
      if (Math.abs((player.yOffset || 0) - floorHeightAt(this.arena, pickup)) > 1.15) continue;
      const applied = applyPickup(player, pickup);
      if (!applied) continue;
      pickup.active = false;
      pickup.respawnAt = now + (PICKUP_RULES[pickup.type]?.respawnMs || 12000);
    }
  }

  pushFeed(message) {
    this.feed.unshift({ id: `${Date.now()}-${Math.random()}`, message, time: Date.now() });
    this.feed = this.feed.slice(0, 5);
  }

  serialize() {
    return {
      roomCode: this.code,
      mapId: this.mapId,
      botCount: this.botCount,
      serverTime: Date.now(),
      players: Array.from(this.players.values()).map((player) => ({
        id: player.id,
        name: player.name,
        avatarId: player.avatarId,
        color: player.color,
        pos: player.pos,
        yaw: player.yaw,
        pitch: player.pitch,
        health: player.health,
        armor: player.armor,
        alive: player.alive,
        score: player.score,
        deaths: player.deaths,
        streak: player.streak,
        isBot: Boolean(player.isBot),
        weapon: player.weapon,
        ownedWeapons: uniqueWeaponList(player.ownedWeapons || ["sentinel"]),
        ammo: serializeAmmo(player.ammo),
        respawnAt: player.respawnAt,
        yOffset: player.yOffset || 0,
        crouch: player.crouch || 0,
        team: player.team || null,
        cash: player.cash || 0
      })),
      pickups: this.pickups.map((pickup) => ({
        id: pickup.id,
        type: pickup.type,
        weapon: pickup.weapon,
        x: pickup.x,
        z: pickup.z,
        active: pickup.active
      })),
      feed: this.feed,
      bombRound: this.bombGame ? this.bombGame.serializeRound() : null
    };
  }
}

export function registerGameServer(io) {
  const rooms = new Map();
  const socketRooms = new Map();

  io.on("connection", (socket) => {
    socket.on("joinRoom", (payload, ack) => {
      const requestedRoom = sanitizeRoom(payload?.room);
      const requestedMap = isMapId(payload?.mapId) ? payload.mapId : DEFAULT_MAP_ID;
      const requestedBotCount = sanitizeBotCount(payload?.botCount);
      const roomCode = requestedRoom || createRoomCode();
      let room = rooms.get(roomCode);
      if (!room) {
        room = new GameRoom(roomCode, requestedMap, requestedBotCount);
        rooms.set(roomCode, room);
      }

      if (room.size >= MAX_PLAYERS_PER_ROOM) {
        ack?.({ ok: false, error: "Room is full" });
        return;
      }
      room.setBotCount(requestedBotCount);

      const previousRoomCode = socketRooms.get(socket.id);
      if (previousRoomCode && rooms.has(previousRoomCode)) {
        rooms.get(previousRoomCode).removePlayer(socket.id);
        socket.leave(previousRoomCode);
      }

      socket.join(roomCode);
      socketRooms.set(socket.id, roomCode);
      const player = room.addPlayer(socket.id, payload?.name, payload?.avatarId);
      room.ensureBots();
      ack?.({
        ok: true,
        roomCode,
        mapId: room.mapId,
        botCount: room.botCount,
        playerId: socket.id,
        player: room.serialize().players.find((item) => item.id === player.id)
      });
      io.to(roomCode).emit("snapshot", room.serialize());
    });

    socket.on("playerState", (state) => {
      const room = rooms.get(socketRooms.get(socket.id));
      room?.updatePlayerState(socket.id, state);
    });

    socket.on("switchWeapon", (weaponId) => {
      const room = rooms.get(socketRooms.get(socket.id));
      room?.switchWeapon(socket.id, weaponId);
    });

    socket.on("buy", (itemId) => {
      const room = rooms.get(socketRooms.get(socket.id));
      if (!room?.bombGame) return;
      const result = room.bombGame.buy(socket.id, itemId);
      socket.emit("buyResult", result);
      if (result.ok) io.to(room.code).emit("snapshot", room.serialize());
    });
    socket.on("plantStart", () => {
      const room = rooms.get(socketRooms.get(socket.id));
      room?.bombGame?.startPlant(socket.id);
    });
    socket.on("plantCancel", () => {
      const room = rooms.get(socketRooms.get(socket.id));
      room?.bombGame?.cancelPlant(socket.id);
    });
    socket.on("defuseStart", () => {
      const room = rooms.get(socketRooms.get(socket.id));
      room?.bombGame?.startDefuse(socket.id);
    });
    socket.on("defuseCancel", () => {
      const room = rooms.get(socketRooms.get(socket.id));
      room?.bombGame?.cancelDefuse(socket.id);
    });

    socket.on("shoot", (payload) => {
      const roomCode = socketRooms.get(socket.id);
      const room = rooms.get(roomCode);
      if (!room) return;
      const event = room.shoot(socket.id, payload);
      if (event) {
        io.to(roomCode).emit(event.type, event);
        io.to(roomCode).emit("snapshot", room.serialize());
      }
    });

    socket.on("disconnect", () => {
      const roomCode = socketRooms.get(socket.id);
      const room = rooms.get(roomCode);
      if (room) {
        room.removePlayer(socket.id);
        io.to(roomCode).emit("snapshot", room.serialize());
      }
      socketRooms.delete(socket.id);
    });
  });

  setInterval(() => {
    const now = Date.now();
    for (const [roomCode, room] of rooms.entries()) {
      const events = room.update();
      if (room.size === 0 && now - room.lastActiveAt > ROOM_IDLE_TTL_MS) {
        rooms.delete(roomCode);
        continue;
      }
      for (const ev of events) {
        if (ev.type === "shot") {
          io.to(roomCode).emit("shot", ev);
        } else {
          io.to(roomCode).emit(ev.type, ev);
        }
      }
      io.to(roomCode).emit("snapshot", room.serialize());
    }
  }, SNAPSHOT_MS);
}

function applyPickup(player, pickup) {
  if (pickup.type === "medkit") {
    if (player.health >= MAX_HEALTH) return false;
    player.health = Math.min(MAX_HEALTH, player.health + 38);
    return true;
  }
  if (pickup.type === "armor") {
    if (player.armor >= MAX_ARMOR) return false;
    player.armor = Math.min(MAX_ARMOR, player.armor + 55);
    return true;
  }
  if (pickup.type === "ammo") {
    const weaponId = pickup.weapon || player.weapon;
    const weapon = WEAPONS[weaponId];
    if (!weapon || weapon.ammoMax === Infinity) return false;
    if (player.ammo[weaponId] >= weapon.ammoMax) return false;
    addOwnedWeapon(player, weaponId);
    player.ammo[weaponId] = Math.min(weapon.ammoMax, (player.ammo[weaponId] || 0) + Math.ceil(weapon.pickupAmmo / 2));
    return true;
  }
  if (pickup.type === "weapon") {
    const weapon = WEAPONS[pickup.weapon];
    if (!weapon) return false;
    addOwnedWeapon(player, weapon.id);
    if (weapon.ammoMax !== Infinity) {
      player.ammo[weapon.id] = Math.min(weapon.ammoMax, (player.ammo[weapon.id] || 0) + weapon.pickupAmmo);
    }
    player.weapon = weapon.id;
    return true;
  }
  return false;
}

function addOwnedWeapon(player, weaponId) {
  player.ownedWeapons = uniqueWeaponList([...(player.ownedWeapons || ["sentinel"]), weaponId]);
}

function playerOwnsWeapon(player, weaponId) {
  return uniqueWeaponList(player.ownedWeapons || ["sentinel"]).includes(weaponId);
}

function uniqueWeaponList(weaponIds) {
  const owned = new Set(["sentinel"]);
  for (const weaponId of weaponIds || []) {
    if (WEAPONS[weaponId]) owned.add(weaponId);
  }
  return WEAPON_ORDER.filter((weaponId) => owned.has(weaponId));
}

function addSpread(direction, spread) {
  if (!spread) return direction;
  return normalizeVector({
    x: direction.x + (Math.random() - 0.5) * spread,
    y: direction.y + (Math.random() - 0.5) * spread,
    z: direction.z + (Math.random() - 0.5) * spread
  });
}

function normalize2d(vector) {
  const length = Math.hypot(vector.x, vector.z);
  if (!Number.isFinite(length) || length < 0.0001) {
    return { x: 0, z: 0 };
  }
  return {
    x: vector.x / length,
    z: vector.z / length
  };
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function createRoomCode() {
  let code = "";
  for (let index = 0; index < 4; index += 1) {
    code += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  }
  return code;
}

function sanitizeRoom(room) {
  if (!room) return "";
  return String(room).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

function sanitizeBotCount(value) {
  const count = Number.parseInt(value, 10);
  if (!Number.isFinite(count)) return TRAINING_BOT_COUNT;
  return Math.round(clamp(count, 0, MAX_BOTS_PER_ROOM));
}

function sanitizeName(name) {
  const cleaned = String(name || "Agent").replace(/[^\w -]/g, "").trim().slice(0, 16);
  return cleaned || "Agent";
}

function sanitizeAvatarId(avatarId) {
  return isAvatarId(avatarId) ? avatarId : DEFAULT_AVATAR_ID;
}

function serializeAmmo(ammo) {
  return Object.fromEntries(
    WEAPON_ORDER.map((weaponId) => [weaponId, ammo[weaponId] === Infinity ? "inf" : ammo[weaponId] || 0])
  );
}
