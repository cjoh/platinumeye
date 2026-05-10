import {
  ECONOMY, ROUND_CONFIG, SHOP_ITEMS, WEAPONS, MAX_HEALTH, MAX_ARMOR
} from "../shared/constants.js";
import { floorHeightAt } from "../shared/collision.js";

const PHASE = { FREEZE: "freeze", LIVE: "live", PLANTED: "planted", END: "end", OVER: "over" };

export class BombGame {
  constructor(room) {
    this.room = room;
    this.arena = room.arena;
    this.roundNum = 0;
    this.scores = { attack: 0, defend: 0 };
    this.phase = PHASE.END;
    this.phaseEndsAt = Date.now() + 2000;
    this.bombCarrierId = null;
    this.bombPlanted = null;
    this.plantProgress = new Map();
    this.defuseProgress = new Map();
    this.consecutiveLosses = { attack: 0, defend: 0 };
    this.events = [];
  }

  assignTeams() {
    const humans = [...this.room.players.values()].filter(p => !p.isBot);
    const bots   = [...this.room.players.values()].filter(p => p.isBot);
    const all    = [...humans, ...bots];
    const half   = Math.ceil(all.length / 2);
    const swapped = this.roundNum > ROUND_CONFIG.totalRounds / 2;
    all.forEach((p, i) => {
      const baseTeam = i < half ? "attack" : "defend";
      p.team = swapped ? (baseTeam === "attack" ? "defend" : "attack") : baseTeam;
      p.cash = p.cash ?? ECONOMY.startCash;
    });
  }

  startRound() {
    this.roundNum++;
    this.assignTeams();
    this.bombPlanted = null;
    this.plantProgress.clear();
    this.defuseProgress.clear();
    this.bombCarrierId = null;

    for (const player of this.room.players.values()) {
      const spawns = player.team === "attack"
        ? this.arena.attackerSpawns
        : this.arena.defenderSpawns;
      const spawn = spawns[Math.floor(Math.random() * spawns.length)];
      player.pos = { x: spawn.x, z: spawn.z };
      player.yaw = spawn.yaw;
      player.health = MAX_HEALTH;
      player.alive = true;
      player.respawnAt = 0;
      player.yOffset = floorHeightAt(this.arena, player.pos);
      player.ownedWeapons = ["sentinel"];
      player.weapon = "sentinel";
      player.ammo = { sentinel: Infinity, cyclone: 0, argus: 0, oracle: 0, phantom: 0 };
    }

    const attackers = [...this.room.players.values()].filter(p => p.team === "attack" && p.alive);
    if (attackers.length) {
      this.bombCarrierId = attackers[Math.floor(Math.random() * attackers.length)].id;
    }

    this.phase = PHASE.FREEZE;
    this.phaseEndsAt = Date.now() + ROUND_CONFIG.freezeMs;
    const cashByPlayer = Object.fromEntries(
      [...this.room.players.values()].map(p => [p.id, p.cash || 0])
    );
    this.push("roundStart", { round: this.roundNum, scores: this.scores, freezeUntil: this.phaseEndsAt, cashByPlayer });
  }

  endRound(winner) {
    const loser = winner === "attack" ? "defend" : "attack";
    this.scores[winner]++;
    this.consecutiveLosses[winner] = 0;
    this.consecutiveLosses[loser]++;

    for (const player of this.room.players.values()) {
      const won = player.team === winner;
      const base = won ? ECONOMY.roundWin : ECONOMY.roundLossBase;
      const bonus = won ? 0 : Math.min(
        this.consecutiveLosses[player.team] * ECONOMY.roundLossStep,
        ECONOMY.roundLossMax - ECONOMY.roundLossBase
      );
      player.cash = Math.min(ECONOMY.maxCash, (player.cash || 0) + base + bonus);
    }

    this.phase = PHASE.END;
    this.phaseEndsAt = Date.now() + ROUND_CONFIG.endMs;
    this.push("roundEnd", { winner, scores: this.scores, round: this.roundNum });

    if (this.scores.attack >= ROUND_CONFIG.winScore || this.scores.defend >= ROUND_CONFIG.winScore) {
      this.phase = PHASE.OVER;
      this.push("matchOver", { scores: this.scores });
    }
  }

  update() {
    const now = Date.now();
    this.events = [];

    if (this.phase === PHASE.OVER) return this.events;

    if (this.phase === PHASE.END && now >= this.phaseEndsAt) {
      this.startRound();
      return this.events;
    }

    if (this.phase === PHASE.FREEZE && now >= this.phaseEndsAt) {
      this.phase = PHASE.LIVE;
      this.phaseEndsAt = now + ROUND_CONFIG.roundMs;
      this.push("phaseChange", { phase: PHASE.LIVE, endsAt: this.phaseEndsAt });
    }

    if (this.phase === PHASE.LIVE && now >= this.phaseEndsAt) {
      this.endRound("defend");
      return this.events;
    }

    if (this.phase === PHASE.PLANTED && now >= this.phaseEndsAt) {
      this.push("bombExplode", {});
      this.endRound("attack");
      return this.events;
    }

    if (this.phase === PHASE.LIVE || this.phase === PHASE.PLANTED) {
      const alive = [...this.room.players.values()].filter(p => p.alive);
      const aliveAtk = alive.filter(p => p.team === "attack").length;
      const aliveDef = alive.filter(p => p.team === "defend").length;

      if (aliveDef === 0 && this.phase === PHASE.LIVE) {
        this.endRound("attack");
      } else if (aliveAtk === 0 && this.phase === PHASE.LIVE) {
        this.endRound("defend");
      }
    }

    return this.events;
  }

  startPlant(playerId) {
    if (this.phase !== PHASE.LIVE) return;
    if (playerId !== this.bombCarrierId) return;
    const player = this.room.players.get(playerId);
    if (!player?.alive) return;
    const site = this.arena.sites?.find(s =>
      Math.hypot(player.pos.x - s.x, player.pos.z - s.z) <= s.radius
    );
    if (!site) return;
    player._plantSite = site.id;
    this.plantProgress.set(playerId, Date.now());
  }

  cancelPlant(playerId) { this.plantProgress.delete(playerId); }

  startDefuse(playerId) {
    if (this.phase !== PHASE.PLANTED) return;
    const player = this.room.players.get(playerId);
    if (!player?.alive || player.team !== "defend") return;
    if (!this.bombPlanted) return;
    const dist = Math.hypot(player.pos.x - this.bombPlanted.x, player.pos.z - this.bombPlanted.z);
    if (dist > 3.0) return;
    this.defuseProgress.set(playerId, Date.now());
  }

  cancelDefuse(playerId) { this.defuseProgress.delete(playerId); }

  tickInteractions() {
    const now = Date.now();
    for (const [playerId, startedAt] of this.plantProgress.entries()) {
      if (now - startedAt >= ROUND_CONFIG.plantDurationMs) {
        this.plantProgress.delete(playerId);
        const player = this.room.players.get(playerId);
        if (!player) continue;
        this.bombPlanted = { x: player.pos.x, z: player.pos.z, plantedAt: now, siteId: player._plantSite };
        this.bombCarrierId = null;
        this.phase = PHASE.PLANTED;
        this.phaseEndsAt = now + ROUND_CONFIG.postPlantMs;
        player.cash = Math.min(ECONOMY.maxCash, (player.cash || 0) + ECONOMY.plantReward);
        this.push("bombPlanted", { x: this.bombPlanted.x, z: this.bombPlanted.z, siteId: this.bombPlanted.siteId, endsAt: this.phaseEndsAt });
      }
    }
    for (const [playerId, startedAt] of this.defuseProgress.entries()) {
      if (now - startedAt >= ROUND_CONFIG.defuseDurationMs) {
        this.defuseProgress.delete(playerId);
        const player = this.room.players.get(playerId);
        if (player) player.cash = Math.min(ECONOMY.maxCash, (player.cash || 0) + ECONOMY.defuseReward);
        this.bombPlanted = null;
        this.push("bombDefused", { playerId });
        this.endRound("defend");
      }
    }
  }

  buy(playerId, itemId) {
    if (this.phase !== PHASE.FREEZE) return { ok: false, error: "Not buy phase" };
    const player = this.room.players.get(playerId);
    if (!player) return { ok: false, error: "No player" };
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return { ok: false, error: "Unknown item" };
    if ((player.cash || 0) < item.cost) return { ok: false, error: "Not enough cash" };
    player.cash -= item.cost;
    if (item.type === "weapon") {
      if (!player.ownedWeapons.includes(item.id)) player.ownedWeapons.push(item.id);
      player.weapon = item.id;
      const w = WEAPONS[item.id];
      player.ammo[item.id] = w.ammoMax === Infinity ? Infinity : w.ammoMax;
    } else if (item.type === "armor") {
      player.armor = Math.min(MAX_ARMOR, item.armorValue);
    }
    return { ok: true, cash: player.cash };
  }

  push(type, data) { this.events.push({ type, ...data }); }

  serializeRound() {
    return {
      mode: "bomb",
      phase: this.phase,
      round: this.roundNum,
      scores: this.scores,
      phaseEndsAt: this.phaseEndsAt,
      bombCarrierId: this.bombCarrierId,
      bombPlanted: this.bombPlanted ? {
        x: this.bombPlanted.x,
        z: this.bombPlanted.z,
        siteId: this.bombPlanted.siteId,
        endsAt: this.phaseEndsAt
      } : null,
      plantProgress: Object.fromEntries([...this.plantProgress.entries()].map(([id, t]) => [id, Date.now() - t])),
      defuseProgress: Object.fromEntries([...this.defuseProgress.entries()].map(([id, t]) => [id, Date.now() - t])),
    };
  }
}
