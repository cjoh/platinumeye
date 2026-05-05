import "./styles.css";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { io } from "socket.io-client";
import { AVATARS, DEFAULT_AVATAR_ID, getAvatarById, isAvatarId } from "../shared/avatars.js";
import { DEFAULT_MAP_ID, MAP_ORDER, MAPS, getMap, isMapId } from "../shared/maps.js";
import {
  MAX_BOTS_PER_ROOM,
  MAX_ARMOR,
  MAX_HEALTH,
  PICKUP_RULES,
  PLAYER_BODY_HEIGHT,
  PLAYER_EYE_HEIGHT,
  PLAYER_RADIUS,
  SCORE_LIMIT,
  TRAINING_BOT_COUNT,
  WEAPON_ORDER,
  WEAPONS
} from "../shared/constants.js";
import {
  clamp,
  floorHeightAt,
  normalizeVector,
  rampHeightAt,
  resolveMovement,
  vectorFromYawPitch
} from "../shared/collision.js";

const LOOK_SENSITIVITY = {
  mouse: 0.0038,
  touch: 0.0052
};

const ADS_CONFIG = {
  sentinel: { fov: 50, sensitivity: 0.70, speed: 8 },
  cyclone:  { fov: 60, sensitivity: 0.82, speed: 10 },
  argus:    { fov: 65, sensitivity: 0.88, speed: 9 },
  oracle:   { fov: 44, sensitivity: 0.60, speed: 7 },
  phantom:  { fov: 14, sensitivity: 0.20, speed: 6 }
};

const WEAPON_MODELS = {
  sentinel: {
    obj: "/assets/weapons/quaternius/Pistol_1.obj",
    mtl: "/assets/weapons/quaternius/Pistol_1.mtl",
    length: 0.58,
    position: { x: 0.38, y: -0.44, z: -0.86 },
    rotation: { x: 0, y: Math.PI / 2, z: 0 }
  },
  cyclone: {
    obj: "/assets/weapons/quaternius/AssaultRifle2_1.obj",
    mtl: "/assets/weapons/quaternius/AssaultRifle2_1.mtl",
    length: 0.92,
    position: { x: 0.43, y: -0.45, z: -0.95 },
    rotation: { x: 0, y: Math.PI / 2, z: 0 }
  },
  argus: {
    obj: "/assets/weapons/quaternius/Shotgun_1.obj",
    mtl: "/assets/weapons/quaternius/Shotgun_1.mtl",
    length: 0.96,
    position: { x: 0.43, y: -0.46, z: -0.96 },
    rotation: { x: 0, y: Math.PI / 2, z: 0 }
  },
  oracle: {
    obj: "/assets/weapons/quaternius/Revolver_5.obj",
    mtl: "/assets/weapons/quaternius/Revolver_5.mtl",
    length: 0.68,
    position: { x: 0.38, y: -0.43, z: -0.88 },
    rotation: { x: 0, y: Math.PI / 2, z: 0 }
  },
  phantom: { buildFn: buildPhantomModel }
};

const GENERATED_TEXTURE_ATLAS_PATH = "/assets/textures/platinumeye-material-atlas.png";
const GENERATED_TEXTURE_TILES = {
  concrete: { col: 0, row: 0 },
  metal: { col: 1, row: 0 },
  crate: { col: 2, row: 0 },
  sand: { col: 3, row: 0 },
  sandbag: { col: 0, row: 1 },
  rock: { col: 1, row: 1 },
  grass: { col: 2, row: 1 },
  log: { col: 3, row: 1 },
  water: { col: 0, row: 2 },
  snow: { col: 1, row: 2 },
  ice: { col: 2, row: 2 },
  asphalt: { col: 3, row: 2 },
  redMetal: { col: 0, row: 3 },
  yellowMetal: { col: 1, row: 3 },
  grip: { col: 2, row: 3 },
  energy: { col: 3, row: 3 }
};

const WEAPON_VISUALS = {
  sentinel: {
    base: "#20221d",
    accent: "#ffd36b",
    emissive: "#2f2308",
    metalness: 0.42,
    roughness: 0.52,
    muzzleScale: 0.9
  },
  cyclone: {
    base: "#10251e",
    accent: "#55e0a3",
    emissive: "#0b3d2d",
    metalness: 0.36,
    roughness: 0.46,
    muzzleScale: 0.72
  },
  argus: {
    base: "#2b1912",
    accent: "#ff8d6b",
    emissive: "#3d170d",
    metalness: 0.32,
    roughness: 0.58,
    muzzleScale: 1.25
  },
  oracle: {
    base: "#25251e",
    accent: "#f6f08a",
    emissive: "#5e5718",
    metalness: 0.62,
    roughness: 0.28,
    muzzleScale: 1.45
  },
  phantom: {
    base: "#1a2530",
    accent: "#7dd4ff",
    emissive: "#0d2035",
    metalness: 0.72,
    roughness: 0.22,
    muzzleScale: 0.6
  }
};

const dom = {
  canvas: document.querySelector("#gameCanvas"),
  lobby: document.querySelector("#lobby"),
  joinForm: document.querySelector("#joinForm"),
  quickJoinButton: document.querySelector("#quickJoinButton"),
  nameInput: document.querySelector("#nameInput"),
  roomInput: document.querySelector("#roomInput"),
  botInput: document.querySelector("#botInput"),
  avatarGrid: document.querySelector("#avatarGrid"),
  mapGrid: document.querySelector("#mapGrid"),
  hud: document.querySelector("#hud"),
  roomCode: document.querySelector("#roomCode"),
  mapName: document.querySelector("#mapName"),
  matchStatus: document.querySelector("#matchStatus"),
  copyRoomButton: document.querySelector("#copyRoomButton"),
  healthValue: document.querySelector("#healthValue"),
  healthFill: document.querySelector("#healthFill"),
  armorValue: document.querySelector("#armorValue"),
  armorFill: document.querySelector("#armorFill"),
  weaponName: document.querySelector("#weaponName"),
  ammoValue: document.querySelector("#ammoValue"),
  weaponInventory: document.querySelector("#weaponInventory"),
  scoreRows: document.querySelector("#scoreRows"),
  scoreboard: document.querySelector("#scoreboard"),
  minimap: document.querySelector("#minimap"),
  feed: document.querySelector("#feed"),
  lockPrompt: document.querySelector("#lockPrompt"),
  deathScreen: document.querySelector("#deathScreen"),
  respawnTimer: document.querySelector("#respawnTimer"),
  hitMarker: document.querySelector("#hitMarker"),
  damageFlash: document.querySelector("#damageFlash"),
  movePad: document.querySelector("#movePad"),
  moveKnob: document.querySelector("#moveKnob"),
  touchFire: document.querySelector("#touchFire"),
  damageNumbers: document.querySelector("#damageNumbers"),
  scopeOverlay: document.querySelector("#scopeOverlay")
};

const state = {
  socket: null,
  connected: false,
  playerId: null,
  roomCode: "",
  botCount: getSavedBotCount(),
  mapId: getSavedMapId(),
  arena: getMap(getSavedMapId()),
  players: new Map(),
  pickups: new Map(),
  local: {
    pos: { x: 0, z: 0 },
    yaw: 0,
    pitch: 0,
    health: MAX_HEALTH,
    armor: 0,
    alive: false,
    hasSpawned: false,
    avatarId: getSavedAvatarId(),
    weapon: "sentinel",
    ownedWeapons: ["sentinel"],
    ammo: { sentinel: "inf", cyclone: 0, argus: 0, oracle: 0, phantom: 0 },
    lastShotAt: 0,
    respawnAt: 0,
    yOffset: 0,
    groundY: 0,
    jumpY: 0,
    vy: 0,
    crouch: 0, // 0 standing → 1 fully crouched
    moveSpeed: 0,
    bobPhase: 0
  },
  input: {
    keys: new Set(),
    moveStick: { x: 0, y: 0 },
    lookPointerId: null,
    lastLook: null,
    mouseHeld: false
  },
  feedSeen: new Set(),
  lastStateSentAt: 0,
  lastSnapshotAt: 0,
  recoil: 0,
  healthPrevious: MAX_HEALTH,
  weaponInventoryKey: "",
  audio: null,
  localSnapshotSeen: false,
  lastStepAt: 0,
  stepSide: 0,
  ads: false,
  adsFactor: 0
};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 320);
camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({
  canvas: dom.canvas,
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;

const clock = new THREE.Clock();
const minimapContext = dom.minimap.getContext("2d");
const remoteAgents = new Map();
const pickupMeshes = new Map();
const tracers = [];
const impacts = [];
const avatarLoader = new GLTFLoader();
const avatarTemplates = new Map();
const avatarLoads = new Map();
const weaponObjLoader = new OBJLoader();
const weaponMtlLoader = new MTLLoader();
const weaponTemplates = new Map();
const weaponLoads = new Map();
const noiseBuffers = new WeakMap();
const generatedTextureAtlas = createGeneratedTextureAtlas();

// Holds everything tied to the current map. Replaced when the map changes.
let arenaGroup = new THREE.Group();
scene.add(arenaGroup);
let waterPlanes = [];
let foliageMaterials = [];
let animatedProps = [];
let weatherSystem = null;

const weaponRig = createWeaponRig();
scene.add(weaponRig.group);

applyMap(state.arena);
renderAvatarPicker();
renderMapPicker();
bindEvents();
hydrateLobbyFromUrl();
animate();

// ---------------------------------------------------------------------------
// Map / theme rendering
// ---------------------------------------------------------------------------

function applyMap(arena) {
  state.arena = arena;
  state.local.groundY = floorHeightAt(arena, state.local.pos);
  state.local.jumpY = Math.max(0, state.local.yOffset - state.local.groundY);
  // Tear down previous arena geometry.
  scene.remove(arenaGroup);
  disposeGroup(arenaGroup);
  arenaGroup = new THREE.Group();
  scene.add(arenaGroup);
  waterPlanes = [];
  foliageMaterials = [];
  animatedProps = [];
  weatherSystem = null;

  // Sky / fog
  scene.background = new THREE.Color(arena.sky.color);
  scene.fog = new THREE.FogExp2(arena.sky.fog, arena.sky.fogDensity);

  buildArena(arena);
  rebuildPickupMeshes(arena);
}

function disposeGroup(group) {
  group.traverse((node) => {
    if (node.isSprite) {
      node.material?.map?.dispose?.();
      node.material?.dispose?.();
    }
    if (node.isMesh) {
      node.geometry?.dispose?.();
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      for (const mat of mats) {
        if (!mat) continue;
        for (const key of Object.keys(mat)) {
          const value = mat[key];
          if (value && value.isTexture) value.dispose?.();
        }
        mat.dispose?.();
      }
    }
  });
}

function buildArena(arena) {
  const materials = createThemeMaterials(arena);

  // Lighting
  const ambient = new THREE.HemisphereLight(
    arena.lighting.ambientSky,
    arena.lighting.ambientGround,
    arena.lighting.ambientIntensity
  );
  arenaGroup.add(ambient);

  const sun = new THREE.DirectionalLight(arena.lighting.sunColor, arena.lighting.sunIntensity);
  sun.position.set(...arena.lighting.sunPosition);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  const span = Math.max(arena.bounds.maxX - arena.bounds.minX, arena.bounds.maxZ - arena.bounds.minZ) * 0.7;
  sun.shadow.camera.left = -span;
  sun.shadow.camera.right = span;
  sun.shadow.camera.top = span;
  sun.shadow.camera.bottom = -span;
  arenaGroup.add(sun);

  // Outdoor maps get a dome and bright fill
  if (arena.theme !== "bunker") {
    arenaGroup.add(makeSkyDome(arena));
  }

  // Ground
  const groundWidth = arena.bounds.maxX - arena.bounds.minX;
  const groundDepth = arena.bounds.maxZ - arena.bounds.minZ;
  const groundExtra = arena.theme === "bunker" ? 0 : 80; // extend ground beyond playable area
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(groundWidth + groundExtra, groundDepth + groundExtra, 1, 1),
    materials.ground
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(
    (arena.bounds.minX + arena.bounds.maxX) / 2,
    0,
    (arena.bounds.minZ + arena.bounds.maxZ) / 2
  );
  ground.receiveShadow = true;
  arenaGroup.add(ground);

  // Water
  if (arena.water) {
    addWater(arena);
  }

  addElevationMeshes(arena, materials);

  // Outer perimeter walls (for bunker only — outdoor maps stay open)
  if (arena.theme === "bunker") {
    addBunkerOuterWalls(arena, materials);
    addBunkerCeiling(arena, materials);
  } else {
    addOutdoorBoundary(arena, materials);
  }

  // Colliders → meshes
  for (const collider of arena.colliders) {
    addColliderMesh(collider, materials);
  }

  // Floor inlays / decals (theme-specific)
  if (arena.theme === "bunker") {
    addBunkerFloorInlays(arena);
    addBunkerLightStrips(arena);
  }

  // Decorative props (no collision)
  if (arena.props) {
    for (const prop of arena.props) {
      addProp(prop, materials);
    }
  }

  // Add tree canopies on top of tree colliders
  if (arena.theme === "forest") {
    for (const collider of arena.colliders) {
      if (collider.material === "tree") addTreeCanopy(collider);
    }
  } else if (arena.theme === "frost") {
    for (const collider of arena.colliders) {
      if (collider.material === "tree") addPineCanopy(collider, true);
    }
  }

  // Atmosphere particles
  addAtmosphereParticles(arena);

  // Weather system (e.g. falling snow on frost map)
  if (arena.weather?.type === "snow") {
    addSnowfall(arena, arena.weather.density || 600);
  }
}

// ---------- Materials ----------

function createGeneratedTextureAtlas() {
  const status = {
    path: GENERATED_TEXTURE_ATLAS_PATH,
    loaded: false,
    error: false,
    requestedTiles: 0,
    appliedTiles: 0
  };
  if (typeof window !== "undefined") {
    window.__platinumeyeAssets = {
      ...(window.__platinumeyeAssets || {}),
      generatedTextureAtlas: status
    };
  }

  const atlas = {
    image: null,
    status,
    callbacks: []
  };
  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    atlas.image = image;
    status.loaded = true;
    for (const callback of atlas.callbacks.splice(0)) callback();
  };
  image.onerror = () => {
    status.error = true;
  };
  image.src = GENERATED_TEXTURE_ATLAS_PATH;
  return atlas;
}

function makeGeneratedTextureTile(tileKey, fallbackTexture, repeat = [1, 1]) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  drawFallbackTexture(context, fallbackTexture, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = `imagegen:${tileKey}`;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 6;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  generatedTextureAtlas.status.requestedTiles += 1;

  const applyGeneratedTile = () => {
    if (!paintGeneratedAtlasTile(context, tileKey, canvas.width, canvas.height)) return;
    texture.needsUpdate = true;
    generatedTextureAtlas.status.appliedTiles += 1;
  };

  if (generatedTextureAtlas.image) {
    applyGeneratedTile();
  } else {
    generatedTextureAtlas.callbacks.push(applyGeneratedTile);
  }

  fallbackTexture?.dispose?.();
  return texture;
}

function drawFallbackTexture(context, fallbackTexture, width, height) {
  context.fillStyle = "#777568";
  context.fillRect(0, 0, width, height);
  const image = fallbackTexture?.image;
  if (!image) return;
  try {
    context.drawImage(image, 0, 0, width, height);
  } catch {
    // If the fallback canvas is not drawable, the neutral fill above remains.
  }
}

function paintGeneratedAtlasTile(context, tileKey, width, height) {
  const image = generatedTextureAtlas.image;
  const tile = GENERATED_TEXTURE_TILES[tileKey];
  if (!image || !tile) return false;
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) return false;
  const cellWidth = sourceWidth / 4;
  const cellHeight = sourceHeight / 4;
  context.clearRect(0, 0, width, height);
  context.drawImage(
    image,
    tile.col * cellWidth,
    tile.row * cellHeight,
    cellWidth,
    cellHeight,
    0,
    0,
    width,
    height
  );
  return true;
}

function createThemeMaterials(arena) {
  const materials = {};

  if (arena.theme === "bunker") {
    const floorTex = makeGeneratedTextureTile(
      "concrete",
      makeConcreteTexture("#52584b", "#7a8170", "#262b22", 256),
      arena.ground.repeat
    );
    materials.ground = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.84, metalness: 0.1 });

    const wallTex = makeGeneratedTextureTile("metal", makeMetalPanelTexture("#454d3f", "#838c75", "#1c2118"), [2, 1]);
    materials.wall = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.7, metalness: 0.2 });

    const reinforcedTex = makeGeneratedTextureTile(
      "concrete",
      makeConcreteTexture("#6c7263", "#9aa18a", "#2d3328", 256),
      [1, 1]
    );
    materials.reinforced = new THREE.MeshStandardMaterial({
      map: reinforcedTex,
      roughness: 0.78,
      metalness: 0.16
    });

    const crateTex = makeGeneratedTextureTile("crate", makeCrateTexture("#7d6a3f", "#a48f50", "#3a2f18"), [1, 1]);
    materials.crate = new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.74, metalness: 0.08 });

    materials.console = new THREE.MeshStandardMaterial({ color: "#3f6d62", roughness: 0.5, metalness: 0.45 });
    materials.trim = new THREE.MeshStandardMaterial({ color: "#d8b652", roughness: 0.42, metalness: 0.5 });
  } else if (arena.theme === "coastal") {
    const sandTex = makeGeneratedTextureTile("sand", makeSandTexture(), arena.ground.repeat);
    materials.ground = new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.96, metalness: 0.0 });

    const concreteTex = makeGeneratedTextureTile(
      "concrete",
      makeConcreteTexture("#a59f8d", "#c8c2ad", "#5e5947", 256),
      [2, 1]
    );
    materials.concrete = new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.82, metalness: 0.06 });
    materials.wall = materials.concrete;
    materials.reinforced = materials.concrete;

    const sandbagTex = makeGeneratedTextureTile("sandbag", makeSandbagTexture(), [1, 1]);
    materials.sandbag = new THREE.MeshStandardMaterial({ map: sandbagTex, roughness: 0.92, metalness: 0.02 });
    materials.crate = new THREE.MeshStandardMaterial({
      map: makeGeneratedTextureTile("crate", makeCrateTexture("#876d3a", "#b18c4a", "#3e3018"), [1, 1]),
      roughness: 0.78,
      metalness: 0.05
    });

    const rockTex = makeGeneratedTextureTile("rock", makeRockTexture("#8b8474", "#5e5849", "#2a2820"), [1, 1]);
    materials.rock = new THREE.MeshStandardMaterial({ map: rockTex, roughness: 0.94, metalness: 0.04 });

    materials.rail = new THREE.MeshStandardMaterial({ color: "#3d3a32", roughness: 0.6, metalness: 0.6 });
    materials.console = new THREE.MeshStandardMaterial({ color: "#446b65", roughness: 0.55, metalness: 0.4 });
    materials.trim = new THREE.MeshStandardMaterial({ color: "#c1b483", roughness: 0.5, metalness: 0.3 });
  } else if (arena.theme === "forest") {
    const grassTex = makeGeneratedTextureTile("grass", makeGrassTexture(), arena.ground.repeat);
    materials.ground = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.96, metalness: 0.0 });

    const logTex = makeGeneratedTextureTile("log", makeLogTexture(), [1, 1]);
    materials.log = new THREE.MeshStandardMaterial({ map: logTex, roughness: 0.86, metalness: 0.02 });
    materials.wall = materials.log;
    materials.reinforced = materials.log;

    materials.tree = new THREE.MeshStandardMaterial({
      map: makeGeneratedTextureTile("log", makeLogTexture(), [1, 1]),
      color: "#6a5238",
      roughness: 0.96,
      metalness: 0.0
    });
    materials.logpile = new THREE.MeshStandardMaterial({
      map: makeGeneratedTextureTile("log", makeLogTexture(), [2, 1]),
      roughness: 0.88,
      metalness: 0.0
    });

    const rockTex = makeGeneratedTextureTile("rock", makeRockTexture("#7a8076", "#4d5247", "#22251f"), [1, 1]);
    materials.rock = new THREE.MeshStandardMaterial({ map: rockTex, roughness: 0.95, metalness: 0.04 });

    materials.crate = new THREE.MeshStandardMaterial({
      map: makeGeneratedTextureTile("crate", makeCrateTexture("#6b5230", "#a08247", "#2e2412"), [1, 1]),
      roughness: 0.85,
      metalness: 0.04
    });
    materials.console = new THREE.MeshStandardMaterial({ color: "#4d6044", roughness: 0.55, metalness: 0.35 });
    materials.trim = new THREE.MeshStandardMaterial({ color: "#a07c3e", roughness: 0.55, metalness: 0.2 });
  } else if (arena.theme === "frost") {
    const snowTex = makeGeneratedTextureTile("snow", makeSnowTexture(), arena.ground.repeat);
    materials.ground = new THREE.MeshStandardMaterial({ map: snowTex, roughness: 0.92, metalness: 0.0 });

    const stoneTex = makeGeneratedTextureTile("rock", makeRockTexture("#9aa0a6", "#5a6068", "#2a3036"), [1, 1]);
    materials.stone = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9, metalness: 0.06 });
    materials.wall = materials.stone;
    materials.reinforced = materials.stone;

    materials.ice = new THREE.MeshStandardMaterial({
      map: makeGeneratedTextureTile("ice", makeWaterTexture("#a5cad6", "#ffffff"), [1, 1]),
      color: "#cde7ee",
      transparent: true,
      opacity: 0.78,
      roughness: 0.16,
      metalness: 0.6,
      emissive: "#7dbdd0",
      emissiveIntensity: 0.12
    });
    materials.snowdrift = new THREE.MeshStandardMaterial({
      map: makeGeneratedTextureTile("snow", makeSnowTexture(0.18), [1.4, 1.4]),
      color: "#f4f7fb",
      roughness: 0.9,
      metalness: 0.0
    });

    materials.tree = new THREE.MeshStandardMaterial({
      map: makeGeneratedTextureTile("log", makeLogTexture(), [1, 1]),
      color: "#4c3928",
      roughness: 0.96,
      metalness: 0.0
    });
    materials.crate = new THREE.MeshStandardMaterial({
      map: makeGeneratedTextureTile("crate", makeCrateTexture("#5d7787", "#83a3b3", "#22323d"), [1, 1]),
      roughness: 0.7,
      metalness: 0.1
    });
    materials.rock = materials.stone;
    materials.console = new THREE.MeshStandardMaterial({ color: "#5783a0", roughness: 0.5, metalness: 0.45 });
    materials.trim = new THREE.MeshStandardMaterial({ color: "#9bb6c6", roughness: 0.45, metalness: 0.4 });
  } else if (arena.theme === "refinery") {
    const asphaltTex = makeGeneratedTextureTile("asphalt", makeAsphaltTexture(), arena.ground.repeat);
    materials.ground = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.92, metalness: 0.06 });

    const indTex = makeGeneratedTextureTile("metal", makeMetalPanelTexture("#7d7568", "#b6ad9c", "#36312a"), [2, 1]);
    materials.industrial = new THREE.MeshStandardMaterial({ map: indTex, roughness: 0.62, metalness: 0.5 });
    materials.wall = materials.industrial;
    materials.reinforced = materials.industrial;

    // Shipping containers — corrugated metal in different colors
    materials["container-red"] = new THREE.MeshStandardMaterial({
      map: makeGeneratedTextureTile("redMetal", makeContainerTexture("#a23a2c", "#6b1d12"), [2, 1]),
      roughness: 0.55,
      metalness: 0.35
    });

    materials["container-blue"] = new THREE.MeshStandardMaterial({
      map: makeGeneratedTextureTile("metal", makeContainerTexture("#2c5d8a", "#15324b"), [2, 1]),
      color: "#4f86b8",
      roughness: 0.55,
      metalness: 0.35
    });

    materials["container-yellow"] = new THREE.MeshStandardMaterial({
      map: makeGeneratedTextureTile("yellowMetal", makeContainerTexture("#c39a3a", "#6b531a"), [2, 1]),
      roughness: 0.55,
      metalness: 0.35
    });

    materials["container-green"] = new THREE.MeshStandardMaterial({
      map: makeGeneratedTextureTile("metal", makeContainerTexture("#3d6b40", "#1d3a20"), [2, 1]),
      color: "#5f9263",
      roughness: 0.55,
      metalness: 0.35
    });

    // Drum (oil drum) — striped texture
    materials.drum = new THREE.MeshStandardMaterial({
      map: makeGeneratedTextureTile("redMetal", makeDrumTexture(), [1, 1]),
      roughness: 0.5,
      metalness: 0.55
    });

    materials.crate = new THREE.MeshStandardMaterial({
      map: makeGeneratedTextureTile("crate", makeCrateTexture("#6b5230", "#a08247", "#2e2412"), [1, 1]),
      roughness: 0.78,
      metalness: 0.18
    });
    materials.rock = new THREE.MeshStandardMaterial({
      map: makeGeneratedTextureTile("rock", makeRockTexture("#3a342c", "#221f1a", "#12100d"), [1, 1]),
      color: "#5a5145",
      roughness: 0.86,
      metalness: 0.1
    });
    materials.console = new THREE.MeshStandardMaterial({ color: "#a8552d", roughness: 0.45, metalness: 0.55 });
    materials.trim = new THREE.MeshStandardMaterial({ color: "#d97c4f", roughness: 0.4, metalness: 0.55 });
  }

  // Shared
  materials.dark = new THREE.MeshStandardMaterial({ color: "#151c16", roughness: 0.78, metalness: 0.16 });
  materials.lightPanel = new THREE.MeshBasicMaterial({ color: "#f2d66f" });
  materials.glass = new THREE.MeshStandardMaterial({
    color: "#9de2b9",
    emissive: "#2f7d4e",
    emissiveIntensity: 0.35,
    roughness: 0.18,
    metalness: 0.28
  });
  materials.muzzle = new THREE.MeshBasicMaterial({ color: "#ffe68a", transparent: true, opacity: 0 });
  materials.player = new THREE.MeshStandardMaterial({ color: "#d1b45b", roughness: 0.58, metalness: 0.2 });
  materials.black = new THREE.MeshStandardMaterial({
    map: makeGeneratedTextureTile("grip", makeMetalPanelTexture("#151515", "#303030", "#050505"), [1, 1]),
    color: "#1c1c1a",
    roughness: 0.65,
    metalness: 0.25
  });

  return materials;
}

function addElevationMeshes(arena, materials) {
  for (const floor of arena.floors || []) {
    addFloorPlatform(floor, materials);
  }
  for (const ramp of arena.ramps || []) {
    addStairRamp(ramp, materials);
  }
}

function addFloorPlatform(floor, materials) {
  const material = materials[floor.material] || materials.reinforced || materials.wall;
  const trimMaterial = materials.trim || material;
  const slabThickness = 0.28;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(floor.w, slabThickness, floor.d), material);
  slab.position.set(floor.x, (floor.y || 0) - slabThickness / 2, floor.z);
  slab.castShadow = true;
  slab.receiveShadow = true;
  arenaGroup.add(slab);

  const edgeY = (floor.y || 0) + 0.035;
  const edges = [
    { x: floor.x, z: floor.z - floor.d / 2, w: floor.w, d: 0.12 },
    { x: floor.x, z: floor.z + floor.d / 2, w: floor.w, d: 0.12 },
    { x: floor.x - floor.w / 2, z: floor.z, w: 0.12, d: floor.d },
    { x: floor.x + floor.w / 2, z: floor.z, w: 0.12, d: floor.d }
  ];
  for (const edge of edges) {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(edge.w, 0.07, edge.d), trimMaterial);
    trim.position.set(edge.x, edgeY, edge.z);
    trim.castShadow = true;
    trim.receiveShadow = true;
    arenaGroup.add(trim);
  }
}

function addStairRamp(ramp, materials) {
  const material = materials[ramp.material] || materials.reinforced || materials.wall;
  const trimMaterial = materials.trim || material;
  const steps = Math.max(2, ramp.steps || 8);
  const isXAxis = ramp.axis === "x";
  const stepRun = (isXAxis ? ramp.w : ramp.d) / steps;
  const min = (isXAxis ? ramp.x : ramp.z) - (isXAxis ? ramp.w : ramp.d) / 2;

  for (let index = 0; index < steps; index += 1) {
    const centerCoord = min + stepRun * (index + 0.5);
    const sample = isXAxis ? { x: centerCoord, z: ramp.z } : { x: ramp.x, z: centerCoord };
    const height = Math.max(0.12, rampHeightAt(ramp, sample));
    const geometry = new THREE.BoxGeometry(isXAxis ? stepRun : ramp.w, height, isXAxis ? ramp.d : stepRun);
    const step = new THREE.Mesh(geometry, material);
    step.position.set(isXAxis ? centerCoord : ramp.x, height / 2, isXAxis ? ramp.z : centerCoord);
    step.castShadow = true;
    step.receiveShadow = true;
    arenaGroup.add(step);

    const nosing = new THREE.Mesh(
      new THREE.BoxGeometry(isXAxis ? 0.09 : ramp.w, 0.05, isXAxis ? ramp.d : 0.09),
      trimMaterial
    );
    nosing.position.set(isXAxis ? centerCoord - stepRun / 2 : ramp.x, height + 0.035, isXAxis ? ramp.z : centerCoord - stepRun / 2);
    if (ramp.highAt === "min") {
      nosing.position.set(isXAxis ? centerCoord + stepRun / 2 : ramp.x, height + 0.035, isXAxis ? ramp.z : centerCoord + stepRun / 2);
    }
    nosing.castShadow = true;
    arenaGroup.add(nosing);
  }

  addStairGuideLights(ramp);
}

function addStairGuideLights(ramp) {
  const highY = Math.max(ramp.highY || 0, ramp.lowY || 0);
  const lowY = Math.min(ramp.highY || 0, ramp.lowY || 0);
  const count = 3;
  for (let index = 0; index < count; index += 1) {
    const t = count === 1 ? 0.5 : index / (count - 1);
    const coord = (ramp.axis === "x" ? ramp.x - ramp.w / 2 : ramp.z - ramp.d / 2) + (ramp.axis === "x" ? ramp.w : ramp.d) * t;
    const sideOffset = (index % 2 === 0 ? -1 : 1) * ((ramp.axis === "x" ? ramp.d : ramp.w) / 2 - 0.25);
    const sample = ramp.axis === "x" ? { x: coord, z: ramp.z } : { x: ramp.x, z: coord };
    const y = clamp(rampHeightAt(ramp, sample) + 0.08, lowY + 0.12, highY + 0.12);
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(ramp.axis === "x" ? 0.08 : 0.34, 0.035, ramp.axis === "x" ? 0.34 : 0.08),
      new THREE.MeshBasicMaterial({ color: "#e7cf75" })
    );
    marker.position.set(ramp.axis === "x" ? coord : ramp.x + sideOffset, y, ramp.axis === "x" ? ramp.z + sideOffset : coord);
    arenaGroup.add(marker);
  }
}

function addColliderMesh(collider, materials) {
  const material = materials[collider.material] || materials.wall;
  const geometry = new THREE.BoxGeometry(collider.w, collider.h, collider.d);
  const mesh = new THREE.Mesh(geometry, material);
  const baseY = collider.y || 0;
  mesh.position.set(collider.x, baseY + collider.h / 2, collider.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  arenaGroup.add(mesh);

  // Theme-specific accents
  if (collider.material === "tree") {
    // tree trunk gets a slight taper feel — handled via canopy elsewhere
    return;
  }
  if (collider.material === "sandbag") {
    addSandbagDetail(collider, materials);
    return;
  }
  if (collider.material === "rock") {
    return;
  }
  if (collider.h > 1.8 && (collider.material === "wall" || collider.material === "reinforced" || collider.material === "concrete" || collider.material === "log")) {
    if (state.arena.theme === "bunker") {
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(collider.w + 0.08, 0.12, collider.d + 0.08),
        materials.trim
      );
      trim.position.set(collider.x, baseY + collider.h + 0.08, collider.z);
      arenaGroup.add(trim);
    }
  }
  if (collider.material === "console") {
    addConsoleScreen(collider);
  }
}

function addSandbagDetail(collider, materials) {
  // Stripe "sacks" by stacking two slightly smaller boxes for visual layering
  const baseY = collider.y || 0;
  for (let row = 0; row < 2; row += 1) {
    const sack = new THREE.Mesh(
      new THREE.BoxGeometry(collider.w * 0.96, collider.h * 0.4, collider.d * 0.96),
      materials.sandbag
    );
    sack.position.set(collider.x, baseY + 0.18 + row * collider.h * 0.42, collider.z);
    sack.rotation.y = (row % 2 === 0 ? 0.04 : -0.04);
    sack.castShadow = true;
    sack.receiveShadow = true;
    arenaGroup.add(sack);
  }
}

// ---------- Outdoor / sky / water ----------

function makeSkyDome(arena) {
  const radius = 220;
  const geometry = new THREE.SphereGeometry(radius, 24, 16);
  const topColor = arena.theme === "coastal" ? "#bcd9e4" : "#bccdb4";
  const horizonColor = arena.sky.fog;
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(topColor) },
      horizonColor: { value: new THREE.Color(horizonColor) },
      sunDir: { value: new THREE.Vector3(...arena.lighting.sunPosition).normalize() },
      sunColor: { value: new THREE.Color(arena.lighting.sunColor) }
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vWorld = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 sunDir;
      uniform vec3 sunColor;
      varying vec3 vWorld;
      void main() {
        float h = clamp(vWorld.y, 0.0, 1.0);
        vec3 col = mix(horizonColor, topColor, pow(h, 0.7));
        float sun = max(dot(normalize(vWorld), normalize(sunDir)), 0.0);
        col += sunColor * pow(sun, 80.0) * 0.65;
        col += sunColor * pow(sun, 6.0) * 0.08;
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = -10;
  return mesh;
}

function addWater(arena) {
  const water = arena.water;
  const width = water.maxX - water.minX;
  const depth = water.maxZ - water.minZ;
  const segX = water.frozen ? 8 : Math.min(48, Math.max(16, Math.round(width / 2)));
  const segZ = water.frozen ? 8 : Math.min(48, Math.max(16, Math.round(depth / 2)));
  const geometry = new THREE.PlaneGeometry(width, depth, segX, segZ);
  const tex = makeGeneratedTextureTile(
    water.frozen ? "ice" : "water",
    makeWaterTexture(water.color, water.foamColor),
    [Math.max(8, width / 8), Math.max(8, depth / 8)]
  );
  const material = new THREE.MeshStandardMaterial({
    map: tex,
    color: water.color,
    transparent: true,
    opacity: water.frozen ? 0.94 : 0.82,
    roughness: water.frozen ? 0.22 : 0.32,
    metalness: water.frozen ? 0.55 : 0.4,
    emissive: water.color,
    emissiveIntensity: water.frozen ? 0.04 : 0.06
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((water.minX + water.maxX) / 2, water.y, (water.minZ + water.maxZ) / 2);
  mesh.receiveShadow = true;
  arenaGroup.add(mesh);

  // Deep underlay for parallax
  const deep = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth, 1, 1),
    new THREE.MeshStandardMaterial({ color: water.deepColor, roughness: 0.85, metalness: 0.0 })
  );
  deep.rotation.x = -Math.PI / 2;
  deep.position.set((water.minX + water.maxX) / 2, water.y - 0.15, (water.minZ + water.maxZ) / 2);
  arenaGroup.add(deep);

  // Foam strip near shore (only for non-frozen water with a clear shoreline)
  if (!water.frozen) {
    const foamGeo = new THREE.PlaneGeometry(width, 1.2, 32, 1);
    const foamMat = new THREE.MeshBasicMaterial({
      color: water.foamColor,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    const foam = new THREE.Mesh(foamGeo, foamMat);
    foam.rotation.x = -Math.PI / 2;
    foam.position.set((water.minX + water.maxX) / 2, water.y + 0.005, water.minZ);
    arenaGroup.add(foam);
    animatedProps.push({
      type: "foam",
      update(dt, t) {
        foam.material.opacity = 0.4 + Math.sin(t * 1.6) * 0.2;
        foam.position.z = water.minZ + Math.sin(t * 0.8) * 0.4;
      }
    });
  }

  waterPlanes.push({ mesh, texture: tex, frozen: !!water.frozen, baseY: water.y, geometry });
}

function addOutdoorBoundary(arena, materials) {
  // Low boundary marker — distant scenery so the play area doesn't feel infinite.
  // Use rocky / wooden posts depending on theme.
  const { minX, maxX, minZ, maxZ } = arena.bounds;
  const postSpacing = 6;
  const accentMaterial = arena.theme === "coastal" ? materials.rock : materials.tree;
  const postH = arena.theme === "coastal" ? 1.0 : 1.6;

  const edges = [
    { dir: "x", side: minZ, range: [minX, maxX] },
    { dir: "x", side: maxZ, range: [minX, maxX] },
    { dir: "z", side: minX, range: [minZ, maxZ] },
    { dir: "z", side: maxX, range: [minZ, maxZ] }
  ];
  for (const edge of edges) {
    // Don't put posts along the water-facing edge of coastal map (south).
    if (arena.theme === "coastal" && edge.dir === "x" && edge.side === maxZ) continue;
    for (let t = edge.range[0] + 1.5; t <= edge.range[1] - 1.5; t += postSpacing) {
      const w = arena.theme === "coastal" ? 0.6 : 0.9;
      const d = w;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, postH, d),
        accentMaterial
      );
      const x = edge.dir === "x" ? t : edge.side;
      const z = edge.dir === "z" ? t : edge.side;
      mesh.position.set(x, postH / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      arenaGroup.add(mesh);
    }
  }

  // Distant horizon ring of trees (forest) or dunes (coastal)
  if (arena.theme === "forest") {
    addDistantTreeline(arena);
  } else if (arena.theme === "coastal") {
    addDistantDunes(arena);
  }
}

function addDistantTreeline(arena) {
  const radius = Math.max(arena.bounds.maxX - arena.bounds.minX, arena.bounds.maxZ - arena.bounds.minZ) * 0.8;
  const cx = (arena.bounds.minX + arena.bounds.maxX) / 2;
  const cz = (arena.bounds.minZ + arena.bounds.maxZ) / 2;
  const treeMat = new THREE.MeshStandardMaterial({ color: "#2c4a2a", roughness: 0.96, metalness: 0.0 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: "#3a2918", roughness: 0.96, metalness: 0.0 });
  for (let i = 0; i < 80; i += 1) {
    const angle = (i / 80) * Math.PI * 2 + Math.random() * 0.05;
    const r = radius + Math.random() * 18 + 8;
    const x = cx + Math.cos(angle) * r;
    const z = cz + Math.sin(angle) * r;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 3.4, 5), trunkMat);
    trunk.position.set(x, 1.7, z);
    arenaGroup.add(trunk);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 6.5, 6), treeMat);
    cone.position.set(x, 5.5, z);
    arenaGroup.add(cone);
  }
}

function addDistantDunes(arena) {
  const cx = (arena.bounds.minX + arena.bounds.maxX) / 2;
  const cz = (arena.bounds.minZ + arena.bounds.maxZ) / 2;
  const duneMat = new THREE.MeshStandardMaterial({ color: "#cab98a", roughness: 0.98, metalness: 0.0 });
  for (let i = 0; i < 14; i += 1) {
    const angle = -Math.PI + (i / 14) * Math.PI; // semi-circle behind the back
    const r = Math.max(arena.bounds.maxX - arena.bounds.minX, arena.bounds.maxZ - arena.bounds.minZ) * 0.7 + Math.random() * 12;
    const x = cx + Math.cos(angle) * r;
    const z = cz - Math.abs(Math.sin(angle)) * r - 6;
    const dune = new THREE.Mesh(new THREE.SphereGeometry(8 + Math.random() * 6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), duneMat);
    dune.position.set(x, -1.2, z);
    dune.scale.set(1, 0.4, 1.2);
    arenaGroup.add(dune);
  }
}

// ---------- Bunker accents ----------

function addBunkerOuterWalls(arena, materials) {
  const { minX, maxX, minZ, maxZ } = arena.bounds;
  const height = 3.6;
  const walls = [
    { x: (minX + maxX) / 2, z: minZ - 0.25, w: maxX - minX + 1, d: 0.5 },
    { x: (minX + maxX) / 2, z: maxZ + 0.25, w: maxX - minX + 1, d: 0.5 },
    { x: minX - 0.25, z: (minZ + maxZ) / 2, w: 0.5, d: maxZ - minZ + 1 },
    { x: maxX + 0.25, z: (minZ + maxZ) / 2, w: 0.5, d: maxZ - minZ + 1 }
  ];
  for (const wall of walls) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(wall.w, height, wall.d), materials.wall);
    mesh.position.set(wall.x, height / 2, wall.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    arenaGroup.add(mesh);
  }
}

function addBunkerCeiling(arena, materials) {
  const { minX, maxX, minZ, maxZ } = arena.bounds;
  const ceilingY = arena.floors?.length ? Math.max(4.8, (arena.sky.ceiling || 6) - 0.7) : 3.6;
  for (let z = minZ + 4; z <= maxZ - 4; z += 6) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(maxX - minX, 0.18, 0.24), materials.dark);
    beam.position.set((minX + maxX) / 2, ceilingY, z);
    arenaGroup.add(beam);
  }
  for (let x = minX + 6; x <= maxX - 6; x += 8) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, maxZ - minZ), materials.dark);
    beam.position.set(x, ceilingY + 0.05, (minZ + maxZ) / 2);
    arenaGroup.add(beam);
  }
}

function addBunkerFloorInlays(arena) {
  const inlayMaterial = new THREE.MeshStandardMaterial({
    color: "#d9b84c",
    emissive: "#5c4715",
    emissiveIntensity: 0.18,
    roughness: 0.5,
    metalness: 0.38
  });
  // Inlay X across the center
  const cx = (arena.bounds.minX + arena.bounds.maxX) / 2;
  const cz = (arena.bounds.minZ + arena.bounds.maxZ) / 2;
  const sizeX = arena.bounds.maxX - arena.bounds.minX;
  const sizeZ = arena.bounds.maxZ - arena.bounds.minZ;
  const len = Math.min(sizeX, sizeZ) * 0.7;
  for (const r of [Math.PI * 0.25, -Math.PI * 0.25]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, 0.018, 0.18), inlayMaterial);
    mesh.position.set(cx, 0.012, cz);
    mesh.rotation.y = r;
    arenaGroup.add(mesh);
  }
}

function addBunkerLightStrips(arena) {
  const cx = (arena.bounds.minX + arena.bounds.maxX) / 2;
  const cz = (arena.bounds.minZ + arena.bounds.maxZ) / 2;
  const sizeX = arena.bounds.maxX - arena.bounds.minX;
  const sizeZ = arena.bounds.maxZ - arena.bounds.minZ;
  const lightY = arena.floors?.length ? Math.max(4.8, (arena.sky.ceiling || 6) - 1.4) : 3.5;
  const stripRows = [
    { x: cx, z: arena.bounds.minZ + 4, w: sizeX * 0.5, color: "#f0d56d" },
    { x: cx, z: arena.bounds.maxZ - 4, w: sizeX * 0.5, color: "#f0d56d" },
    { x: arena.bounds.minX + 3, z: cz, w: sizeZ * 0.4, r: Math.PI / 2, color: "#89ffd0" },
    { x: arena.bounds.maxX - 3, z: cz, w: sizeZ * 0.4, r: Math.PI / 2, color: "#89ffd0" },
    { x: cx, z: cz - 9, w: 4, color: "#ff806e" },
    { x: cx, z: cz + 9, w: 4, color: "#75a9ff" }
  ];
  for (const strip of stripRows) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(strip.w, 0.05, 0.18),
      new THREE.MeshBasicMaterial({ color: strip.color })
    );
    mesh.position.set(strip.x, lightY, strip.z);
    mesh.rotation.y = strip.r || 0;
    arenaGroup.add(mesh);

    const light = new THREE.PointLight(strip.color, 1.3, 14, 2);
    light.position.set(strip.x, lightY - 0.5, strip.z);
    arenaGroup.add(light);
  }
}

function addConsoleScreen(collider) {
  const baseY = collider.y || 0;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.min(1.35, collider.w * 0.72), 0.58),
    new THREE.MeshBasicMaterial({ map: makeConsoleTexture(collider.id), transparent: true })
  );
  const facesEast = collider.x < 0;
  screen.position.set(collider.x + (facesEast ? 1.06 : -1.06), baseY + collider.h + 0.06, collider.z);
  screen.rotation.y = facesEast ? Math.PI / 2 : -Math.PI / 2;
  arenaGroup.add(screen);

  const glow = new THREE.PointLight("#78ffc2", 1.0, 6, 1.8);
  glow.position.set(collider.x + (facesEast ? 0.9 : -0.9), baseY + collider.h + 0.2, collider.z);
  arenaGroup.add(glow);
}

// ---------- Props ----------

function addProp(prop, materials) {
  if (prop.type === "palm") addPalmTree(prop);
  else if (prop.type === "driftwood") addDriftwood(prop);
  else if (prop.type === "antenna") addAntenna(prop);
  else if (prop.type === "buoy") addBuoy(prop);
  else if (prop.type === "bush") addBush(prop);
  else if (prop.type === "stump") addStump(prop);
  else if (prop.type === "mushroom") addMushroom(prop);
  else if (prop.type === "firefly") addFirefly(prop);
  else if (prop.type === "snowpile") addSnowPile(prop);
  else if (prop.type === "icicle") addIcicle(prop);
  else if (prop.type === "frozenflag") addFrozenFlag(prop);
  else if (prop.type === "wolf-skull") addWolfSkull(prop);
  else if (prop.type === "smokestack") addSmokestack(prop);
  else if (prop.type === "pipe") addPipe(prop);
  else if (prop.type === "pallet") addPallet(prop);
  else if (prop.type === "hazard-sign") addHazardSign(prop);
  else if (prop.type === "floodlight") addFloodlight(prop);
  else if (prop.type === "lighthouse") addLighthouse(prop);
  else if (prop.type === "seagull-flock") addSeagullFlock(prop);
}

function addPalmTree({ x, z }) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: "#5b432a", roughness: 0.94, metalness: 0.0 });
  const leafMat = new THREE.MeshStandardMaterial({ color: "#3d6638", roughness: 0.88, metalness: 0.0 });
  const trunkH = 4.4 + Math.random() * 1.6;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, trunkH, 8), trunkMat);
  trunk.position.set(x, trunkH / 2, z);
  trunk.castShadow = true;
  trunk.rotation.z = (Math.random() - 0.5) * 0.18;
  arenaGroup.add(trunk);
  for (let i = 0; i < 7; i += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.4, 2.4, 4), leafMat);
    const angle = (i / 7) * Math.PI * 2;
    leaf.position.set(x + Math.cos(angle) * 0.4, trunkH - 0.2, z + Math.sin(angle) * 0.4);
    leaf.rotation.set(Math.PI / 2.4, angle, 0);
    leaf.castShadow = true;
    arenaGroup.add(leaf);
  }
}

function addDriftwood({ x, z }) {
  const mat = new THREE.MeshStandardMaterial({ color: "#9a8466", roughness: 0.95, metalness: 0.0 });
  const log = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 2.2, 6), mat);
  log.position.set(x, 0.22, z);
  log.rotation.set(Math.PI / 2, 0, Math.random() * Math.PI);
  log.castShadow = true;
  arenaGroup.add(log);
}

function addAntenna({ x, z, h = 6.0 }) {
  const mat = new THREE.MeshStandardMaterial({ color: "#3d3a32", roughness: 0.5, metalness: 0.7 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, h, 6), mat);
  pole.position.set(x, h / 2, z);
  pole.castShadow = true;
  arenaGroup.add(pole);
  // Cross-bracing struts at intervals
  for (let i = 1; i <= 3; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.025, 4, 8),
      mat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, (i / 4) * h, z);
    arenaGroup.add(ring);
  }
  const blink = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 8),
    new THREE.MeshBasicMaterial({ color: "#ff5555" })
  );
  blink.position.set(x, h + 0.25, z);
  arenaGroup.add(blink);
  const beacon = new THREE.PointLight("#ff5050", 0, 8, 2);
  beacon.position.set(x, h + 0.25, z);
  arenaGroup.add(beacon);
  const phase = Math.random() * Math.PI * 2;
  animatedProps.push({
    type: "beacon",
    update(dt, t) {
      const pulse = Math.max(0, Math.sin(t * 1.6 + phase));
      blink.material.color.setRGB(1, 0.25 + pulse * 0.3, 0.25 + pulse * 0.3);
      beacon.intensity = pulse * 1.4;
    }
  });
}

function addBuoy({ x, z }) {
  const mat = new THREE.MeshStandardMaterial({ color: "#d34d3a", roughness: 0.6, metalness: 0.1 });
  const buoy = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), mat);
  buoy.position.set(x, 0.2, z);
  arenaGroup.add(buoy);
}

function addBush({ x, z }) {
  const mat = new THREE.MeshStandardMaterial({ color: "#3a5a30", roughness: 0.96, metalness: 0.0 });
  for (let i = 0; i < 3; i += 1) {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.55 + Math.random() * 0.2, 8, 6), mat);
    sphere.position.set(x + (Math.random() - 0.5) * 0.6, 0.4, z + (Math.random() - 0.5) * 0.6);
    sphere.castShadow = true;
    arenaGroup.add(sphere);
  }
}

function addStump({ x, z }) {
  const mat = new THREE.MeshStandardMaterial({ color: "#5a3f25", roughness: 0.95, metalness: 0.0 });
  const top = new THREE.MeshStandardMaterial({ color: "#8a6a40", roughness: 0.95, metalness: 0.0 });
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.6, 10), [mat, top, top]);
  stump.position.set(x, 0.3, z);
  stump.castShadow = true;
  arenaGroup.add(stump);
}

function addTreeCanopy(collider) {
  const mat = new THREE.MeshStandardMaterial({ color: "#345f33", roughness: 0.96, metalness: 0.0 });
  for (let i = 0; i < 3; i += 1) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4 - i * 0.4, 2.4, 6), mat);
    cone.position.set(collider.x, collider.h + 0.4 + i * 1.6, collider.z);
    cone.castShadow = true;
    arenaGroup.add(cone);
  }
}

function addPineCanopy(collider, snowy = false) {
  const mat = new THREE.MeshStandardMaterial({
    color: snowy ? "#3d5648" : "#345f33",
    roughness: 0.96,
    metalness: 0.0
  });
  const snowMat = new THREE.MeshStandardMaterial({ color: "#f4f7fb", roughness: 0.92, metalness: 0.0 });
  for (let i = 0; i < 3; i += 1) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4 - i * 0.45, 2.6, 8), mat);
    cone.position.set(collider.x, collider.h + 0.6 + i * 1.6, collider.z);
    cone.castShadow = true;
    arenaGroup.add(cone);
    if (snowy) {
      // Snow cap on top
      const cap = new THREE.Mesh(new THREE.ConeGeometry((2.4 - i * 0.45) * 0.92, 0.6, 8), snowMat);
      cap.position.set(collider.x, collider.h + 0.6 + i * 1.6 + 1.0, collider.z);
      arenaGroup.add(cap);
    }
  }
}

function addMushroom({ x, z }) {
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.22, 6),
    new THREE.MeshStandardMaterial({ color: "#e2d6b6", roughness: 0.94 })
  );
  stem.position.set(x, 0.11, z);
  arenaGroup.add(stem);
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: "#b6432d", emissive: "#3d1a10", emissiveIntensity: 0.3, roughness: 0.7 })
  );
  cap.position.set(x, 0.24, z);
  arenaGroup.add(cap);
  // Spots
  for (let i = 0; i < 4; i += 1) {
    const spot = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 6, 6),
      new THREE.MeshStandardMaterial({ color: "#fffbe6" })
    );
    const a = (i / 4) * Math.PI * 2;
    spot.position.set(x + Math.cos(a) * 0.1, 0.27, z + Math.sin(a) * 0.1);
    arenaGroup.add(spot);
  }
}

function addFirefly({ x, z }) {
  const light = new THREE.PointLight("#d8ff7a", 1.2, 4.5, 2.0);
  light.position.set(x, 1.2, z);
  arenaGroup.add(light);
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 6, 6),
    new THREE.MeshBasicMaterial({ color: "#e8ff85", transparent: true, opacity: 0.95 })
  );
  sphere.position.copy(light.position);
  arenaGroup.add(sphere);
  const phase = Math.random() * Math.PI * 2;
  const radius = 1.2 + Math.random() * 0.6;
  animatedProps.push({
    type: "firefly",
    update(dt, t) {
      const ox = Math.sin(t * 0.7 + phase) * radius;
      const oz = Math.cos(t * 0.5 + phase * 1.3) * radius;
      const oy = 1.2 + Math.sin(t * 1.2 + phase) * 0.4;
      light.position.set(x + ox, oy, z + oz);
      sphere.position.copy(light.position);
      const flicker = 0.85 + Math.sin(t * 6 + phase) * 0.15;
      light.intensity = 1.0 * flicker;
      sphere.material.opacity = 0.6 + flicker * 0.4;
    }
  });
}

function addSnowPile({ x, z }) {
  const mat = new THREE.MeshStandardMaterial({ color: "#f4f7fb", roughness: 0.92 });
  for (let i = 0; i < 4; i += 1) {
    const r = 0.6 + Math.random() * 0.4;
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat);
    sphere.position.set(
      x + (Math.random() - 0.5) * 1.2,
      r * 0.55,
      z + (Math.random() - 0.5) * 1.2
    );
    sphere.scale.y = 0.5 + Math.random() * 0.2;
    sphere.castShadow = true;
    arenaGroup.add(sphere);
  }
}

function addIcicle({ x, z }) {
  const mat = new THREE.MeshStandardMaterial({
    color: "#cde7ee",
    transparent: true,
    opacity: 0.78,
    roughness: 0.16,
    metalness: 0.5
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.4, 6), mat);
  cone.position.set(x, 1.6, z);
  cone.rotation.x = Math.PI;
  arenaGroup.add(cone);
}

function addFrozenFlag({ x, z, h = 5.4 }) {
  const poleMat = new THREE.MeshStandardMaterial({ color: "#3a3a3a", roughness: 0.6, metalness: 0.6 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, h, 6), poleMat);
  pole.position.set(x, h / 2, z);
  pole.castShadow = true;
  arenaGroup.add(pole);
  const flagMat = new THREE.MeshStandardMaterial({
    color: "#bd3a32",
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide
  });
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.85), flagMat);
  flag.position.set(x + 0.7, h - 0.6, z);
  arenaGroup.add(flag);
  const phase = Math.random() * Math.PI * 2;
  animatedProps.push({
    type: "flag",
    update(dt, t) {
      flag.rotation.y = Math.sin(t * 1.6 + phase) * 0.12;
      flag.position.y = h - 0.6 + Math.sin(t * 2.4 + phase) * 0.04;
    }
  });
}

function addWolfSkull({ x, z }) {
  const mat = new THREE.MeshStandardMaterial({ color: "#e8e2cf", roughness: 0.6, metalness: 0.05 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), mat);
  head.position.set(x, 0.32, z);
  head.scale.set(1.2, 0.8, 1.5);
  arenaGroup.add(head);
  // Eye sockets
  for (const ox of [-0.12, 0.12]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 6),
      new THREE.MeshBasicMaterial({ color: "#0a0a0a" })
    );
    eye.position.set(x + ox, 0.36, z - 0.22);
    arenaGroup.add(eye);
  }
}

function addSmokestack({ x, z, h = 9 }) {
  const mat = new THREE.MeshStandardMaterial({ color: "#5a4a3a", roughness: 0.7, metalness: 0.4 });
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.95, h, 12), mat);
  stack.position.set(x, h / 2, z);
  stack.castShadow = true;
  arenaGroup.add(stack);
  // Red bands
  const bandMat = new THREE.MeshStandardMaterial({ color: "#b04a2e", roughness: 0.6, metalness: 0.4 });
  for (let i = 1; i <= 3; i += 1) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.78, 0.4, 12), bandMat);
    band.position.set(x, (i / 4) * h, z);
    arenaGroup.add(band);
  }
  // Steam plume — point sprite cluster animated upward
  const steamCount = 14;
  const steam = [];
  for (let i = 0; i < steamCount; i += 1) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.55 + Math.random() * 0.35, 8, 6),
      new THREE.MeshStandardMaterial({
        color: "#dbd1bf",
        transparent: true,
        opacity: 0.55,
        roughness: 0.95,
        depthWrite: false
      })
    );
    puff.position.set(
      x + (Math.random() - 0.5) * 0.4,
      h + 0.5 + Math.random() * 5,
      z + (Math.random() - 0.5) * 0.4
    );
    arenaGroup.add(puff);
    steam.push({ mesh: puff, basePhase: Math.random() * 4, drift: Math.random() * 0.6 });
  }
  // Top flicker (heat)
  const flame = new THREE.PointLight("#ff8a3a", 0.8, 4.5, 2.0);
  flame.position.set(x, h, z);
  arenaGroup.add(flame);
  animatedProps.push({
    type: "smokestack",
    update(dt, t) {
      for (const puff of steam) {
        const yPhase = (t * 0.5 + puff.basePhase) % 5;
        puff.mesh.position.y = h + 0.5 + yPhase;
        puff.mesh.position.x = x + Math.sin((t + puff.basePhase) * 0.4) * (0.4 + puff.drift);
        puff.mesh.position.z = z + Math.cos((t + puff.basePhase) * 0.35) * (0.4 + puff.drift);
        puff.mesh.material.opacity = Math.max(0, 0.55 - yPhase * 0.1);
        puff.mesh.scale.setScalar(1 + yPhase * 0.18);
      }
      flame.intensity = 0.7 + Math.abs(Math.sin(t * 8)) * 0.5;
    }
  });
}

function addPipe({ x, z, len = 8, axis = "x" }) {
  const mat = new THREE.MeshStandardMaterial({ color: "#7a8088", roughness: 0.55, metalness: 0.6 });
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, len, 10), mat);
  pipe.position.set(x, 0.5, z);
  if (axis === "x") {
    pipe.rotation.z = Math.PI / 2;
  } else {
    pipe.rotation.x = Math.PI / 2;
  }
  arenaGroup.add(pipe);
  // Joint flanges along the length
  for (let i = -len / 2 + 1; i <= len / 2 - 1; i += 2) {
    const flange = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.26, 0.12, 10),
      new THREE.MeshStandardMaterial({ color: "#404448", roughness: 0.5, metalness: 0.6 })
    );
    if (axis === "x") {
      flange.rotation.z = Math.PI / 2;
      flange.position.set(x + i, 0.5, z);
    } else {
      flange.rotation.x = Math.PI / 2;
      flange.position.set(x, 0.5, z + i);
    }
    arenaGroup.add(flange);
  }
}

function addPallet({ x, z }) {
  const mat = new THREE.MeshStandardMaterial({ color: "#7a5a30", roughness: 0.92 });
  for (let i = 0; i < 4; i += 1) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.18), mat);
    slat.position.set(x, 0.18, z + (i - 1.5) * 0.32);
    arenaGroup.add(slat);
  }
  // Side rails
  for (const oz of [-0.5, 0.5]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.16), mat);
    rail.position.set(x, 0.08, z + oz);
    arenaGroup.add(rail);
  }
}

function addHazardSign({ x, z }) {
  const poleMat = new THREE.MeshStandardMaterial({ color: "#3a342c", roughness: 0.6, metalness: 0.5 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), poleMat);
  pole.position.set(x, 0.8, z);
  arenaGroup.add(pole);
  const signGeo = new THREE.BoxGeometry(0.7, 0.7, 0.05);
  const signTex = makeHazardSignTexture();
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.7 });
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(x, 1.4, z);
  sign.rotation.z = Math.PI / 4;
  arenaGroup.add(sign);
}

function makeHazardSignTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f3c83a";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#1a0f0a";
  // Triangle outline
  ctx.beginPath();
  ctx.moveTo(size / 2, 16);
  ctx.lineTo(size - 16, size - 16);
  ctx.lineTo(16, size - 16);
  ctx.closePath();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#1a0f0a";
  ctx.stroke();
  // !
  ctx.font = "900 60px Verdana";
  ctx.fillText("!", size / 2 - 12, size - 28);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addLighthouse({ x, z, h = 9.5 }) {
  // Tapered tower with red/white bands
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.4, h, 14),
    new THREE.MeshStandardMaterial({ color: "#f5efde", roughness: 0.7, metalness: 0.05 })
  );
  tower.position.set(x, h / 2, z);
  tower.castShadow = true;
  arenaGroup.add(tower);
  // Red bands
  const bandMat = new THREE.MeshStandardMaterial({ color: "#bd3a32", roughness: 0.7 });
  for (let i = 1; i <= 3; i += 1) {
    const ratio = i / 4;
    const r = 1.4 - (1.4 - 0.9) * ratio;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.04, r + 0.06, 0.6, 14), bandMat);
    band.position.set(x, ratio * h, z);
    arenaGroup.add(band);
  }
  // Lantern room
  const lantern = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.85, 1.0, 12),
    new THREE.MeshStandardMaterial({ color: "#3a2418", roughness: 0.7, metalness: 0.4 })
  );
  lantern.position.set(x, h + 0.6, z);
  arenaGroup.add(lantern);
  // Glass
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 0.85, 12),
    new THREE.MeshStandardMaterial({
      color: "#fff5cc",
      transparent: true,
      opacity: 0.6,
      emissive: "#ffe69a",
      emissiveIntensity: 0.6,
      roughness: 0.2
    })
  );
  glass.position.set(x, h + 0.6, z);
  arenaGroup.add(glass);
  // Roof cap
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(0.95, 1.1, 12),
    new THREE.MeshStandardMaterial({ color: "#bd3a32", roughness: 0.6 })
  );
  cap.position.set(x, h + 1.65, z);
  arenaGroup.add(cap);
  // Rotating beam — a long, thin cone with low opacity
  const beamMat = new THREE.MeshBasicMaterial({
    color: "#fff5cc",
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const beamGeo = new THREE.ConeGeometry(2.2, 22, 24, 1, true);
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.rotation.z = Math.PI / 2;
  const beamPivot = new THREE.Group();
  beamPivot.position.set(x, h + 0.6, z);
  beamPivot.add(beam);
  beam.position.x = 11;
  arenaGroup.add(beamPivot);
  // Light source pulses with rotation
  const lampLight = new THREE.PointLight("#fff5cc", 1.6, 22, 1.4);
  lampLight.position.set(x, h + 0.6, z);
  arenaGroup.add(lampLight);
  animatedProps.push({
    type: "lighthouse",
    update(dt, t) {
      beamPivot.rotation.y = t * 0.5;
      // Pulse the lamp slightly
      lampLight.intensity = 1.3 + Math.sin(t * 0.5) * 0.4;
      glass.material.emissiveIntensity = 0.55 + Math.sin(t * 0.5) * 0.15;
    }
  });
}

function addSeagullFlock({ x, z, h = 8 }) {
  const count = 6;
  const birds = [];
  const mat = new THREE.MeshBasicMaterial({ color: "#f4f4ec" });
  for (let i = 0; i < count; i += 1) {
    // Tiny "V"-shaped sprite using two thin boxes
    const wing1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.06), mat);
    const wing2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.06), mat);
    const group = new THREE.Group();
    wing1.position.x = -0.22;
    wing1.rotation.z = -0.4;
    wing2.position.x = 0.22;
    wing2.rotation.z = 0.4;
    group.add(wing1, wing2);
    arenaGroup.add(group);
    birds.push({ group, wing1, wing2, phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.5 });
  }
  animatedProps.push({
    type: "seagulls",
    update(dt, t) {
      for (let i = 0; i < birds.length; i += 1) {
        const b = birds[i];
        const a = t * b.speed + b.phase + i * 0.6;
        b.group.position.set(
          x + Math.cos(a) * (6 + i * 0.3),
          h + Math.sin(a * 1.4) * 0.6,
          z + Math.sin(a) * (5 + i * 0.4)
        );
        b.group.rotation.y = -a + Math.PI / 2;
        const flap = Math.sin(t * 8 + b.phase);
        b.wing1.rotation.z = -0.4 + flap * 0.5;
        b.wing2.rotation.z = 0.4 - flap * 0.5;
      }
    }
  });
}

function addFloodlight({ x, z }) {
  const baseMat = new THREE.MeshStandardMaterial({ color: "#3a3a3a", roughness: 0.5, metalness: 0.6 });
  const headMat = new THREE.MeshStandardMaterial({
    color: "#9a9a9a",
    emissive: "#fff5cc",
    emissiveIntensity: 1.4,
    roughness: 0.4,
    metalness: 0.6
  });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.5, 6), baseMat);
  pole.position.set(x, 2.25, z);
  arenaGroup.add(pole);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.4), headMat);
  head.position.set(x, 4.3, z);
  arenaGroup.add(head);
  const light = new THREE.PointLight("#fff5cc", 1.2, 14, 1.6);
  light.position.set(x, 4.0, z);
  arenaGroup.add(light);
}

// ---------- Atmosphere ----------

function addSnowfall(arena, count) {
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count);
  const drifts = new Float32Array(count);
  const minY = 0.4;
  const maxY = 18;
  for (let i = 0; i < count; i += 1) {
    positions[i * 3 + 0] = THREE.MathUtils.randFloat(arena.bounds.minX - 6, arena.bounds.maxX + 6);
    positions[i * 3 + 1] = THREE.MathUtils.randFloat(minY, maxY);
    positions[i * 3 + 2] = THREE.MathUtils.randFloat(arena.bounds.minZ - 6, arena.bounds.maxZ + 6);
    velocities[i] = 0.6 + Math.random() * 1.2;
    drifts[i] = Math.random() * Math.PI * 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: "#ffffff",
    size: 0.16,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    sizeAttenuation: true
  });
  const points = new THREE.Points(geometry, material);
  arenaGroup.add(points);
  weatherSystem = {
    type: "snow",
    points,
    update(dt, t) {
      const arr = geometry.attributes.position.array;
      for (let i = 0; i < count; i += 1) {
        arr[i * 3 + 1] -= velocities[i] * dt * 1.4;
        arr[i * 3 + 0] += Math.sin(t * 0.5 + drifts[i]) * dt * 0.4;
        arr[i * 3 + 2] += Math.cos(t * 0.4 + drifts[i] * 1.3) * dt * 0.4;
        if (arr[i * 3 + 1] < minY) {
          arr[i * 3 + 1] = maxY;
          arr[i * 3 + 0] = THREE.MathUtils.randFloat(arena.bounds.minX - 6, arena.bounds.maxX + 6);
          arr[i * 3 + 2] = THREE.MathUtils.randFloat(arena.bounds.minZ - 6, arena.bounds.maxZ + 6);
        }
      }
      geometry.attributes.position.needsUpdate = true;
    }
  };
}

function addAtmosphereParticles(arena) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const count = arena.theme === "bunker" ? 90 : 130;
  const yMin = 0.4;
  const yMax = arena.theme === "bunker" ? 3.0 : 6.0;
  for (let index = 0; index < count; index += 1) {
    positions.push(
      THREE.MathUtils.randFloat(arena.bounds.minX + 1, arena.bounds.maxX - 1),
      THREE.MathUtils.randFloat(yMin, yMax),
      THREE.MathUtils.randFloat(arena.bounds.minZ + 1, arena.bounds.maxZ - 1)
    );
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const color = arena.theme === "coastal" ? "#dcefff" : arena.theme === "forest" ? "#dfe9c5" : "#f4d987";
  const material = new THREE.PointsMaterial({
    color,
    size: arena.theme === "bunker" ? 0.04 : 0.06,
    transparent: true,
    opacity: arena.theme === "bunker" ? 0.32 : 0.45,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  arenaGroup.add(new THREE.Points(geometry, material));
}

// ---------- Pickups ----------

function rebuildPickupMeshes(arena) {
  for (const mesh of pickupMeshes.values()) {
    scene.remove(mesh);
    disposeGroup(mesh);
  }
  pickupMeshes.clear();

  for (const pickup of arena.pickups) {
    const group = new THREE.Group();
    const pickupFloorY = floorHeightAt(arena, pickup);
    group.position.set(pickup.x, pickupFloorY + 0.72, pickup.z);
    const rule = PICKUP_RULES[pickup.type];
    const weapon = pickup.weapon ? WEAPONS[pickup.weapon] : null;
    const pickupColor = weapon?.color || rule.color;
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.08, 8),
      new THREE.MeshStandardMaterial({ color: rule.color, roughness: 0.45, metalness: 0.35 })
    );
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.54, 0.7, 16),
      new THREE.MeshBasicMaterial({
        color: pickupColor,
        transparent: true,
        opacity: 0.38,
        side: THREE.DoubleSide
      })
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -0.27;

    const label = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makePickupLabelTexture(pickup),
        transparent: true,
        depthWrite: false
      })
    );
    label.position.y = pickup.type === "weapon" ? 1.12 : 0.86;
    label.scale.set(pickup.type === "weapon" ? 1.95 : 1.35, pickup.type === "weapon" ? 0.48 : 0.36, 1);

    group.add(base, halo, label);
    group.userData.baseY = pickupFloorY + 0.68;
    group.userData.label = label;
    group.userData.halo = halo;

    if (pickup.type === "weapon" && weapon) {
      const weaponAnchor = new THREE.Group();
      weaponAnchor.position.y = 0.24;
      weaponAnchor.add(createFallbackPickupWeapon(pickup.weapon));
      group.add(weaponAnchor);
      group.userData.weaponAnchor = weaponAnchor;
      loadWeaponTemplate(pickup.weapon)
        .then((template) => {
          if (pickupMeshes.get(pickup.id) !== group) return;
          weaponAnchor.clear();
          weaponAnchor.add(createPickupWeaponModel(template, pickup.weapon));
        })
        .catch(() => {});
    } else {
      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.32, 0),
        new THREE.MeshStandardMaterial({
          color: pickupColor,
          emissive: pickupColor,
          emissiveIntensity: 0.5,
          roughness: 0.35,
          metalness: 0.25
        })
      );
      marker.position.y = 0.32;
      group.add(marker);
      group.userData.marker = marker;
    }

    scene.add(group);
    pickupMeshes.set(pickup.id, group);
  }
}

function createFallbackPickupWeapon(weaponId) {
  const weapon = WEAPONS[weaponId] || WEAPONS.sentinel;
  const style = WEAPON_VISUALS[weaponId] || WEAPON_VISUALS.sentinel;
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(weaponId === "cyclone" ? 1.08 : weaponId === "argus" ? 0.95 : 0.68, 0.14, 0.2),
    new THREE.MeshStandardMaterial({ color: style.base, roughness: style.roughness, metalness: style.metalness })
  );
  const barrel = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.07, 0.08),
    new THREE.MeshStandardMaterial({ color: style.accent, emissive: style.emissive, emissiveIntensity: 0.12, roughness: 0.45, metalness: 0.5 })
  );
  barrel.position.x = 0.46;
  group.add(body, barrel);
  group.rotation.z = -0.08;
  group.userData.weaponName = weapon.name;
  return group;
}

function createPickupWeaponModel(template, weaponId) {
  const group = new THREE.Group();
  const model = template.clone(true);
  group.add(model);
  group.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const scale = 1.24 / Math.max(size.x, size.y, size.z, 0.001);
  model.scale.multiplyScalar(scale);
  group.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.y -= box.min.y + (box.max.y - box.min.y) * 0.45;
  model.position.z -= center.z;
  group.rotation.set(-0.06, Math.PI * 0.18, 0.08);
  return group;
}

function makePickupLabelTexture(pickup) {
  const weapon = pickup.weapon ? WEAPONS[pickup.weapon] : null;
  const rule = PICKUP_RULES[pickup.type];
  const title =
    pickup.type === "weapon" && weapon ? weapon.name
    : pickup.type === "ammo" && weapon ? `${weapon.shortName} AMMO`
    : rule.label;
  const subtitle =
    pickup.type === "weapon" && weapon ? `SLOT ${WEAPON_ORDER.indexOf(weapon.id) + 1}`
    : pickup.type === "ammo" && weapon ? "AMMO"
    : pickup.type.toUpperCase();
  const color = weapon?.color || rule.color;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 72;
  const context = canvas.getContext("2d");
  context.fillStyle = "rgba(11, 14, 10, 0.82)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  context.fillStyle = color;
  context.fillRect(0, canvas.height - 8, canvas.width, 8);
  context.font = "900 20px Verdana";
  context.fillStyle = "#f2edca";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(title, canvas.width / 2, 27);
  context.font = "900 12px Verdana";
  context.fillStyle = color;
  context.fillText(subtitle, canvas.width / 2, 52);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

// ---------- Procedural textures ----------

function makeConcreteTexture(base, light, dark, size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Cracks
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1;
  for (let i = 0; i < 18; i += 1) {
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    const steps = 4 + Math.floor(Math.random() * 4);
    for (let s = 0; s < steps; s += 1) {
      x += (Math.random() - 0.5) * 30;
      y += (Math.random() - 0.5) * 30;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Stains
  for (let i = 0; i < 14; i += 1) {
    ctx.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.06})`;
    ctx.beginPath();
    ctx.ellipse(Math.random() * size, Math.random() * size, 6 + Math.random() * 18, 4 + Math.random() * 14, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // Speckle
  for (let i = 0; i < size * size * 0.06; i += 1) {
    const v = Math.random();
    ctx.fillStyle = v > 0.5 ? `rgba(255,255,255,${0.04 * Math.random()})` : `rgba(0,0,0,${0.06 * Math.random()})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }
  // Highlights
  ctx.fillStyle = light;
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 6; i += 1) {
    ctx.fillRect(0, (i * size) / 6, size, 2);
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeMetalPanelTexture(base, light, dark) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Brushed gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, "rgba(255,255,255,0.08)");
  gradient.addColorStop(0.5, "rgba(0,0,0,0.0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Rivets
  ctx.fillStyle = dark;
  for (const px of [16, size - 16]) {
    for (const py of [16, size / 2, size - 16]) {
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Rivet highlights
  ctx.fillStyle = light;
  for (const px of [16, size - 16]) {
    for (const py of [16, size / 2, size - 16]) {
      ctx.beginPath();
      ctx.arc(px - 0.8, py - 0.8, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Panel split
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();
  // Brushed lines
  for (let i = 0; i < 220; i += 1) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
    ctx.fillRect(0, Math.random() * size, size, 0.6);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeCrateTexture(base, light, dark) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  // Wood grain
  for (let i = 0; i < 80; i += 1) {
    const y = Math.random() * size;
    ctx.strokeStyle = `rgba(60,40,20,${0.08 + Math.random() * 0.12})`;
    ctx.lineWidth = 0.6 + Math.random();
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.3, y + (Math.random() - 0.5) * 8, size * 0.7, y + (Math.random() - 0.5) * 8, size, y);
    ctx.stroke();
  }
  // Border bands
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, size, 6);
  ctx.fillRect(0, size - 6, size, 6);
  ctx.fillRect(0, 0, 6, size);
  ctx.fillRect(size - 6, 0, 6, size);
  // Stencil mark
  ctx.fillStyle = light;
  ctx.font = "800 28px Verdana";
  ctx.fillText("MK-7", 24, size - 22);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeSandTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  // Base sand color
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#d8c285");
  grad.addColorStop(0.5, "#c8b070");
  grad.addColorStop(1, "#bda165");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  // Grain
  for (let i = 0; i < size * size * 0.16; i += 1) {
    const r = Math.random();
    if (r < 0.5) ctx.fillStyle = "rgba(150,120,70,0.18)";
    else ctx.fillStyle = "rgba(255,240,200,0.18)";
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }
  // Ripples
  ctx.strokeStyle = "rgba(120,90,50,0.08)";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 16; i += 1) {
    ctx.beginPath();
    const y = (i / 16) * size + Math.random() * 6;
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 16) {
      ctx.lineTo(x, y + Math.sin(x / 12 + i) * 3);
    }
    ctx.stroke();
  }
  // Pebbles
  for (let i = 0; i < 24; i += 1) {
    ctx.fillStyle = `rgba(${80 + Math.random() * 60},${60 + Math.random() * 50},${40 + Math.random() * 30},0.4)`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 1.5 + Math.random() * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeGrassTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size);
  grad.addColorStop(0, "#3f6a3a");
  grad.addColorStop(0.6, "#365e34");
  grad.addColorStop(1, "#2a4d29");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  // Grass blades
  for (let i = 0; i < 1400; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const shade = 0.12 + Math.random() * 0.18;
    const lighter = Math.random() > 0.55;
    ctx.strokeStyle = lighter ? `rgba(180,210,120,${shade})` : `rgba(40,80,30,${shade})`;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 2, y - 3 - Math.random() * 4);
    ctx.stroke();
  }
  // Dirt patches
  for (let i = 0; i < 8; i += 1) {
    ctx.fillStyle = "rgba(70,50,28,0.18)";
    ctx.beginPath();
    ctx.ellipse(Math.random() * size, Math.random() * size, 8 + Math.random() * 14, 6 + Math.random() * 10, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // Tiny flowers
  for (let i = 0; i < 18; i += 1) {
    ctx.fillStyle = Math.random() > 0.5 ? "#f0e68a" : "#e9c0d4";
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.4, 1.4);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeLogTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#5a3f25";
  ctx.fillRect(0, 0, size, size);
  // Vertical bark grooves
  for (let i = 0; i < 12; i += 1) {
    const x = (i / 12) * size + Math.random() * 4;
    ctx.strokeStyle = `rgba(30,18,8,${0.4 + Math.random() * 0.2})`;
    ctx.lineWidth = 1.5 + Math.random();
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y <= size; y += 8) {
      ctx.lineTo(x + Math.sin(y / 16) * 2.5, y);
    }
    ctx.stroke();
  }
  // Knots
  for (let i = 0; i < 4; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = "#2c1c0e";
    ctx.beginPath();
    ctx.ellipse(x, y, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(120,80,40,0.6)";
    ctx.beginPath();
    ctx.ellipse(x - 1, y - 1, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Highlights
  for (let i = 0; i < 200; i += 1) {
    ctx.fillStyle = `rgba(150,110,70,${0.05 + Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeRockTexture(base, dark, deep) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  // Splotches
  for (let i = 0; i < 24; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? dark : deep;
    ctx.globalAlpha = 0.18 + Math.random() * 0.18;
    ctx.beginPath();
    ctx.ellipse(Math.random() * size, Math.random() * size, 8 + Math.random() * 22, 6 + Math.random() * 18, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Cracks
  ctx.strokeStyle = deep;
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    for (let s = 0; s < 4; s += 1) {
      x += (Math.random() - 0.5) * 32;
      y += (Math.random() - 0.5) * 32;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeSandbagTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#8b7345";
  ctx.fillRect(0, 0, size, size);
  // Burlap weave
  for (let i = 0; i < size; i += 3) {
    ctx.strokeStyle = `rgba(60,45,20,${0.18 + Math.random() * 0.06})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
  }
  // Stitching
  ctx.fillStyle = "#3e2a12";
  for (let y = 6; y < size; y += 14) {
    for (let x = 4; x < size; x += 8) {
      ctx.fillRect(x, y, 2, 1);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}

function makeSnowTexture(noise = 0.1) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  // Base snow gradient (brighter in center, slightly bluer in shadows)
  const grad = ctx.createRadialGradient(size / 2, size / 2, 30, size / 2, size / 2, size);
  grad.addColorStop(0, "#fbfdff");
  grad.addColorStop(0.6, "#e8eef3");
  grad.addColorStop(1, "#c9d4dc");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  // Sparkle dots
  for (let i = 0; i < 220; i += 1) {
    ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.random() * 0.5})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.4, 1.4);
  }
  // Footprints / scuffs
  for (let i = 0; i < 6; i += 1) {
    ctx.fillStyle = `rgba(80,100,120,${0.05 + Math.random() * 0.06 + noise})`;
    ctx.beginPath();
    ctx.ellipse(Math.random() * size, Math.random() * size, 6 + Math.random() * 16, 4 + Math.random() * 12, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // Wind ripple lines
  ctx.strokeStyle = "rgba(150,170,190,0.05)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 18; i += 1) {
    ctx.beginPath();
    const y = (i / 18) * size + Math.random() * 4;
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 12) {
      ctx.lineTo(x, y + Math.sin(x / 14 + i) * 1.6);
    }
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeAsphaltTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#3a3530";
  ctx.fillRect(0, 0, size, size);
  // Speckle aggregate
  for (let i = 0; i < size * size * 0.18; i += 1) {
    const v = Math.random();
    const shade = 30 + Math.floor(v * 70);
    ctx.fillStyle = `rgba(${shade},${shade - 4},${shade - 8},${0.5 + Math.random() * 0.5})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }
  // Oil stains
  for (let i = 0; i < 6; i += 1) {
    ctx.fillStyle = "rgba(20,15,10,0.32)";
    ctx.beginPath();
    ctx.ellipse(Math.random() * size, Math.random() * size, 8 + Math.random() * 22, 6 + Math.random() * 16, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // Yellow lane lines
  ctx.fillStyle = "#c0a247";
  for (let y = 30; y < size; y += 80) {
    ctx.fillRect(0, y, size, 3);
  }
  // Cracks
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i += 1) {
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    for (let s = 0; s < 4; s += 1) {
      x += (Math.random() - 0.5) * 28;
      y += (Math.random() - 0.5) * 28;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeContainerTexture(base, dark) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  // Vertical corrugation (alternating darker stripes)
  for (let x = 0; x < size; x += 12) {
    const grad = ctx.createLinearGradient(x, 0, x + 12, 0);
    grad.addColorStop(0, "rgba(0,0,0,0.34)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.06)");
    grad.addColorStop(1, "rgba(0,0,0,0.34)");
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, 12, size);
  }
  // Top/bottom bands
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, size, 8);
  ctx.fillRect(0, size - 8, size, 8);
  // Hinged door details (right side)
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.strokeRect(size * 0.55, 18, size * 0.42, size - 36);
  ctx.beginPath();
  ctx.moveTo(size * 0.76, 18);
  ctx.lineTo(size * 0.76, size - 18);
  ctx.stroke();
  // Stencil
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "800 18px Verdana";
  ctx.fillText("MK-7-23", 18, 50);
  // Rust spots
  for (let i = 0; i < 16; i += 1) {
    ctx.fillStyle = `rgba(${100 + Math.random() * 60},${30 + Math.random() * 30},20,${0.18 + Math.random() * 0.18})`;
    ctx.beginPath();
    ctx.ellipse(Math.random() * size, Math.random() * size, 2 + Math.random() * 6, 1 + Math.random() * 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeDrumTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#cc4a2a";
  ctx.fillRect(0, 0, size, size);
  // Top and bottom rims
  ctx.fillStyle = "#7a2c18";
  ctx.fillRect(0, 0, size, 16);
  ctx.fillRect(0, size - 16, size, 16);
  // Middle band
  ctx.fillStyle = "#7a2c18";
  ctx.fillRect(0, size / 2 - 8, size, 16);
  // Hazard label
  ctx.fillStyle = "#f0d56d";
  ctx.font = "900 22px Verdana";
  ctx.fillText("HAZARD", 36, size * 0.36);
  ctx.fillStyle = "#1a0f0a";
  ctx.font = "900 16px Verdana";
  ctx.fillText("FLAMMABLE", 30, size * 0.7);
  // Rust spots
  for (let i = 0; i < 30; i += 1) {
    ctx.fillStyle = `rgba(${60 + Math.random() * 40},${25 + Math.random() * 20},10,${0.3 + Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(Math.random() * size, Math.random() * size, 1.5 + Math.random() * 4, 1 + Math.random() * 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Dents (highlights)
  for (let i = 0; i < 14; i += 1) {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.ellipse(Math.random() * size, Math.random() * size, 4 + Math.random() * 8, 2 + Math.random() * 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeWaterTexture(color, foamColor) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  // Wave bands
  for (let y = 0; y < size; y += 3) {
    const intensity = 0.06 + Math.abs(Math.sin(y / 9)) * 0.05;
    ctx.fillStyle = `rgba(255,255,255,${intensity})`;
    ctx.fillRect(0, y, size, 1);
  }
  // Foam dabs
  ctx.fillStyle = foamColor;
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 60; i += 1) {
    ctx.beginPath();
    ctx.ellipse(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 0.8 + Math.random() * 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Streaks
  ctx.strokeStyle = `rgba(255,255,255,0.08)`;
  ctx.lineWidth = 1;
  for (let i = 0; i < 30; i += 1) {
    const y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 16) {
      ctx.lineTo(x, y + Math.sin(x / 18 + i) * 2);
    }
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeConsoleTexture(id) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  context.fillStyle = "#07110d";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#7cffbd";
  context.fillRect(16, 18, 96, 8);
  context.fillRect(16, 40, 160, 5);
  context.fillRect(16, 58, 68, 5);
  context.fillStyle = "#e95f5f";
  context.fillRect(202, 18, 22, 22);
  context.strokeStyle = "#7cffbd";
  context.lineWidth = 3;
  context.strokeRect(142, 72, 76, 34);
  context.fillStyle = "#d9b84c";
  context.font = "700 18px Verdana";
  // Removed silly placard text — show neutral status indicator
  context.fillText("STATUS OK", 16, 104);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

// ---------------------------------------------------------------------------
// Weapon rig
// ---------------------------------------------------------------------------

function createWeaponRig() {
  const group = new THREE.Group();
  const fallback = new THREE.Group();
  const grip = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.46, 0.2),
    new THREE.MeshStandardMaterial({
      map: makeGeneratedTextureTile("grip", makeMetalPanelTexture("#151515", "#303030", "#050505"), [1, 1]),
      color: "#1c1c1a",
      roughness: 0.65,
      metalness: 0.25
    })
  );
  grip.position.set(0.26, -0.33, -0.72);
  grip.rotation.x = -0.18;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.16, 0.62),
    new THREE.MeshStandardMaterial({
      map: makeGeneratedTextureTile("energy", makeMetalPanelTexture("#c6a250", "#fff1a0", "#3a2d10"), [1, 1]),
      color: "#c6a250",
      roughness: 0.55,
      metalness: 0.35,
      emissive: "#2f2308",
      emissiveIntensity: 0.08
    })
  );
  body.position.set(0.18, -0.16, -0.94);
  const barrel = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.09, 0.54),
    new THREE.MeshStandardMaterial({
      map: makeGeneratedTextureTile("metal", makeMetalPanelTexture("#222421", "#55584f", "#0b0d0b"), [1, 1]),
      color: "#171916",
      roughness: 0.62,
      metalness: 0.45
    })
  );
  barrel.position.set(0.18, -0.13, -1.42);
  const muzzle = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.22),
    new THREE.MeshBasicMaterial({ color: "#ffe68a", transparent: true, opacity: 0 })
  );
  muzzle.position.set(0.18, -0.13, -1.72);
  const modelRoot = new THREE.Group();
  fallback.add(grip, body, barrel);
  group.add(fallback, modelRoot, muzzle);
  group.userData.body = body;
  group.userData.muzzle = muzzle;
  return { group, muzzle, body, fallback, modelRoot, currentWeaponId: null };
}

// ---------------------------------------------------------------------------
// Events / lobby / map+avatar pickers
// ---------------------------------------------------------------------------

function bindEvents() {
  dom.botInput.max = String(MAX_BOTS_PER_ROOM);
  dom.botInput.addEventListener("change", () => {
    setBotCount(dom.botInput.value);
  });
  dom.joinForm.addEventListener("submit", (event) => {
    event.preventDefault();
    joinRoom(dom.roomInput.value);
  });
  dom.quickJoinButton.addEventListener("click", () => {
    dom.roomInput.value = "";
    joinRoom("");
  });
  dom.weaponInventory?.addEventListener("click", (event) => {
    const button = event.target.closest(".weapon-slot");
    if (!button || button.disabled) return;
    selectWeapon(button.dataset.weaponId);
  });
  dom.copyRoomButton.addEventListener("click", copyRoomLink);
  dom.canvas.addEventListener("click", () => {
    unlockAudio();
    if (!state.connected) return;
    if (document.pointerLockElement !== dom.canvas && !isTouchDevice()) {
      dom.canvas.requestPointerLock?.()?.catch?.(() => {});
      return;
    }
    fireWeapon();
  });
  dom.touchFire.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    unlockAudio();
    fireWeapon();
  });
  document.addEventListener("pointerlockchange", updateLockPrompt);
  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== dom.canvas) return;
    const adsCfg = ADS_CONFIG[state.local.weapon] || ADS_CONFIG.sentinel;
    const sens = state.ads ? LOOK_SENSITIVITY.mouse * adsCfg.sensitivity : LOOK_SENSITIVITY.mouse;
    rotateView(event.movementX, event.movementY, sens);
  });
  document.addEventListener("mousedown", (event) => {
    if (document.pointerLockElement !== dom.canvas) return;
    if (event.button === 0) state.input.mouseHeld = true;
    if (event.button === 2) state.ads = true;
  });
  document.addEventListener("mouseup", (event) => {
    if (event.button === 0) state.input.mouseHeld = false;
    if (event.button === 2) state.ads = false;
  });
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  window.addEventListener("keydown", (event) => {
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight", "Space"].includes(event.code)) {
      event.preventDefault();
    }
    if (event.code === "Tab") {
      event.preventDefault();
      dom.scoreboard.classList.add("is-open");
      return;
    }
    const weaponIndex = Number(event.key) - 1;
    if (weaponIndex >= 0 && weaponIndex < WEAPON_ORDER.length) {
      selectWeapon(WEAPON_ORDER[weaponIndex]);
    }
    state.input.keys.add(event.code);
  });
  window.addEventListener("keyup", (event) => {
    if (event.code === "Tab") {
      event.preventDefault();
      dom.scoreboard.classList.remove("is-open");
      return;
    }
    state.input.keys.delete(event.code);
  });
  window.addEventListener("resize", resize);
  bindTouchControls();
}

function renderAvatarPicker() {
  dom.avatarGrid.innerHTML = AVATARS.map(
    (avatar) => `
      <button class="avatar-option" type="button" role="radio" aria-checked="false" data-avatar-id="${avatar.id}">
        <img src="${avatar.previewPath}" alt="" draggable="false" />
        <span>${avatar.label}</span>
      </button>
    `
  ).join("");

  for (const button of dom.avatarGrid.querySelectorAll(".avatar-option")) {
    button.addEventListener("click", () => selectAvatar(button.dataset.avatarId));
  }
  updateAvatarPicker();
}

function selectAvatar(avatarId) {
  if (!isAvatarId(avatarId)) return;
  state.local.avatarId = avatarId;
  localStorage.setItem("platinumeye.avatarId", avatarId);
  updateAvatarPicker();
}

function updateAvatarPicker() {
  for (const button of dom.avatarGrid.querySelectorAll(".avatar-option")) {
    const selected = button.dataset.avatarId === state.local.avatarId;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-checked", selected ? "true" : "false");
  }
}

function renderMapPicker() {
  if (!dom.mapGrid) return;
  dom.mapGrid.innerHTML = MAP_ORDER.map((id) => {
    const map = MAPS[id];
    const themeIcon =
      map.theme === "bunker" ? "▣"
      : map.theme === "coastal" ? "≈"
      : map.theme === "forest" ? "♣"
      : map.theme === "frost" ? "❄"
      : map.theme === "refinery" ? "⚙"
      : "■";
    return `
      <button class="map-option" type="button" role="radio" aria-checked="false" data-map-id="${id}">
        <span class="map-icon map-icon-${map.theme}" aria-hidden="true">${themeIcon}</span>
        <strong>${map.name}</strong>
        <em>${map.description}</em>
      </button>
    `;
  }).join("");

  for (const button of dom.mapGrid.querySelectorAll(".map-option")) {
    button.addEventListener("click", () => selectMap(button.dataset.mapId));
  }
  updateMapPicker();
}

function selectMap(mapId) {
  if (!isMapId(mapId)) return;
  state.mapId = mapId;
  localStorage.setItem("platinumeye.mapId", mapId);
  // Preview the chosen map in the lobby background scene
  applyMap(getMap(mapId));
  updateMapPicker();
}

function updateMapPicker() {
  if (!dom.mapGrid) return;
  for (const button of dom.mapGrid.querySelectorAll(".map-option")) {
    const selected = button.dataset.mapId === state.mapId;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-checked", selected ? "true" : "false");
  }
}

function bindTouchControls() {
  let stickPointer = null;
  const resetStick = () => {
    stickPointer = null;
    state.input.moveStick = { x: 0, y: 0 };
    dom.moveKnob.style.transform = "translate(-50%, -50%)";
  };

  dom.movePad.addEventListener("pointerdown", (event) => {
    stickPointer = event.pointerId;
    dom.movePad.setPointerCapture(event.pointerId);
    updateStick(event);
  });
  dom.movePad.addEventListener("pointermove", (event) => {
    if (event.pointerId === stickPointer) updateStick(event);
  });
  dom.movePad.addEventListener("pointerup", resetStick);
  dom.movePad.addEventListener("pointercancel", resetStick);

  dom.canvas.addEventListener("pointerdown", (event) => {
    if (!isTouchDevice() || event.target !== dom.canvas) return;
    state.input.lookPointerId = event.pointerId;
    state.input.lastLook = { x: event.clientX, y: event.clientY };
  });
  dom.canvas.addEventListener("pointermove", (event) => {
    if (event.pointerId !== state.input.lookPointerId || !state.input.lastLook) return;
    rotateView(event.clientX - state.input.lastLook.x, event.clientY - state.input.lastLook.y, LOOK_SENSITIVITY.touch);
    state.input.lastLook = { x: event.clientX, y: event.clientY };
  });
  dom.canvas.addEventListener("pointerup", () => {
    state.input.lookPointerId = null;
    state.input.lastLook = null;
  });

  function updateStick(event) {
    const rect = dom.movePad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const max = rect.width * 0.34;
    const dx = clamp(event.clientX - cx, -max, max);
    const dy = clamp(event.clientY - cy, -max, max);
    state.input.moveStick = {
      x: dx / max,
      y: dy / max
    };
    dom.moveKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
}

function hydrateLobbyFromUrl() {
  dom.botInput.value = String(state.botCount);
  const params = new URLSearchParams(window.location.search);
  const room = params.get("room");
  if (room) {
    dom.roomInput.value = room.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  }
  const map = params.get("map");
  if (map && isMapId(map)) {
    selectMap(map);
  }
  const bots = params.get("bots");
  if (bots !== null) {
    setBotCount(bots);
  }
}

function joinRoom(room) {
  unlockAudio();
  const botCount = setBotCount(dom.botInput.value);
  if (!state.socket) {
    state.socket = io();
    wireSocket(state.socket);
  }
  const name = dom.nameInput.value || "Agent";
  state.socket.emit(
    "joinRoom",
    { name, room, avatarId: state.local.avatarId, mapId: state.mapId, botCount },
    (response) => {
      if (!response?.ok) {
        dom.quickJoinButton.textContent = response?.error || "Room Error";
        setTimeout(() => {
          dom.quickJoinButton.textContent = "Quick Room";
        }, 1600);
        return;
      }
      state.connected = true;
      state.playerId = response.playerId;
      state.roomCode = response.roomCode;
      state.botCount = sanitizeBotCount(response.botCount ?? botCount);
      dom.botInput.value = String(state.botCount);
      if (response.mapId && response.mapId !== state.arena.id) {
        state.mapId = response.mapId;
        applyMap(getMap(response.mapId));
      }
      dom.roomCode.textContent = response.roomCode;
      if (dom.mapName) dom.mapName.textContent = state.arena.name;
      dom.lobby.classList.add("is-hidden");
      dom.hud.classList.remove("is-hidden");
      history.replaceState(null, "", `?room=${response.roomCode}&map=${state.mapId}&bots=${state.botCount}`);
      applyLocalPlayer(response.player);
      playSound("deploy");
      updateLockPrompt();
    }
  );
}

function wireSocket(socket) {
  socket.on("snapshot", (snapshot) => {
    state.lastSnapshotAt = performance.now();
    state.roomCode = snapshot.roomCode;
    if (Number.isFinite(Number(snapshot.botCount))) {
      state.botCount = sanitizeBotCount(snapshot.botCount);
    }
    dom.roomCode.textContent = snapshot.roomCode;
    if (snapshot.mapId && snapshot.mapId !== state.arena.id) {
      state.mapId = snapshot.mapId;
      applyMap(getMap(snapshot.mapId));
      if (dom.mapName) dom.mapName.textContent = state.arena.name;
    }
    state.players = new Map(snapshot.players.map((player) => [player.id, player]));
    for (const pickup of snapshot.pickups) {
      state.pickups.set(pickup.id, pickup);
    }
    const local = state.players.get(state.playerId);
    if (local) {
      applyLocalPlayer(local);
    }
    syncRemoteAgents();
    syncPickupMeshes();
    renderScoreboard(snapshot.players);
    renderMatchStatus(snapshot.players);
    renderFeed(snapshot.feed);
  });

  socket.on("shot", (event) => {
    addTracer(event);
    addImpact(event);
    if (event.shooterId === state.playerId) {
      weaponRig.muzzle.material.opacity = 1;
      state.recoil = Math.max(state.recoil, WEAPONS[event.weaponId]?.recoil || 0.04);
      playSound("shot", event.weaponId);
      if (event.hitId) {
        showHitMarker();
        spawnDamageNumbers(event);
      }
    } else {
      const shooter = state.players.get(event.shooterId);
      const distance = shooter ? Math.hypot(shooter.pos.x - state.local.pos.x, shooter.pos.z - state.local.pos.z) : 30;
      playSound("remoteShot", event.weaponId, distance);
    }
  });

  socket.on("dry", () => {
    playSound("dry");
  });
}

function applyLocalPlayer(player) {
  if (!player) return;
  const previous = {
    seen: state.localSnapshotSeen,
    alive: state.local.alive,
    health: state.local.health,
    armor: state.local.armor,
    weapon: state.local.weapon,
    ownedWeapons: [...state.local.ownedWeapons],
    ammo: { ...state.local.ammo }
  };
  const wasAlive = state.local.alive;
  const correctionDistance = Math.hypot(player.pos.x - state.local.pos.x, player.pos.z - state.local.pos.z);
  if (player.alive && (!state.local.hasSpawned || !wasAlive || correctionDistance > 2.5)) {
    state.local.pos = { ...player.pos };
    state.local.yaw = player.yaw;
    state.local.pitch = player.pitch;
    state.local.hasSpawned = true;
    state.local.groundY = floorHeightAt(state.arena, state.local.pos);
    state.local.yOffset = Number.isFinite(player.yOffset) ? Math.max(player.yOffset, state.local.groundY) : state.local.groundY;
    state.local.jumpY = Math.max(0, state.local.yOffset - state.local.groundY);
    state.local.vy = 0;
    state.local.crouch = 0;
    state.local.moveSpeed = 0;
    state.local.bobPhase = 0;
  }
  state.local.health = player.health;
  state.local.armor = player.armor;
  state.local.alive = player.alive;
  state.local.avatarId = player.avatarId || state.local.avatarId;
  state.local.weapon = player.weapon;
  state.local.ownedWeapons = normalizeOwnedWeapons(player.ownedWeapons, player.ammo);
  state.local.ammo = player.ammo;
  state.local.respawnAt = player.respawnAt;

  if (!player.alive) {
    state.ads = false;
    state.local.pos = { ...player.pos };
    state.local.groundY = floorHeightAt(state.arena, state.local.pos);
    state.local.jumpY = 0;
    state.local.yOffset = Number.isFinite(player.yOffset) ? Math.max(player.yOffset, state.local.groundY) : state.local.groundY;
    if (state.healthPrevious > 0) {
      flashDamage();
    }
  } else if (state.healthPrevious > player.health) {
    flashDamage();
  }
  playLocalStateSounds(previous, player);
  state.healthPrevious = player.health;
  state.localSnapshotSeen = true;
}

function playLocalStateSounds(previous, player) {
  if (!previous.seen) return;
  if (!previous.alive && player.alive) {
    playSound("deploy");
    return;
  }
  if (!player.alive) return;

  if (player.health > previous.health) {
    playSound("pickupHealth");
    return;
  }
  if (player.armor > previous.armor) {
    playSound("pickupArmor");
    return;
  }
  const gainedWeapon = state.local.ownedWeapons.find((weaponId) => !previous.ownedWeapons.includes(weaponId) && weaponId !== "sentinel");
  if (gainedWeapon) {
    playSound("pickupWeapon", gainedWeapon);
    return;
  }
  if (previous.weapon !== player.weapon && player.weapon !== "sentinel") {
    playSound("pickupWeapon", player.weapon);
    return;
  }

  const ammoWeapon = WEAPON_ORDER.find((weaponId) => {
    const current = ammoCount(player.ammo, weaponId);
    return Number.isFinite(current) && current > ammoCount(previous.ammo, weaponId);
  });
  if (ammoWeapon) {
    playSound("pickupAmmo", ammoWeapon);
  }
}

function ammoCount(ammo, weaponId) {
  const value = ammo?.[weaponId];
  if (value === "inf" || value === Infinity) return Infinity;
  return Number(value || 0);
}

function normalizeOwnedWeapons(ownedWeapons, ammo = state.local.ammo) {
  const owned = new Set(["sentinel"]);
  for (const weaponId of ownedWeapons || []) {
    if (WEAPONS[weaponId]) owned.add(weaponId);
  }
  for (const weaponId of WEAPON_ORDER) {
    if (ammoCount(ammo, weaponId) > 0) owned.add(weaponId);
  }
  return WEAPON_ORDER.filter((weaponId) => owned.has(weaponId));
}

function localOwnsWeapon(weaponId) {
  return normalizeOwnedWeapons(state.local.ownedWeapons, state.local.ammo).includes(weaponId);
}

function rotateView(dx, dy, scale) {
  state.local.yaw -= dx * scale;
  state.local.pitch = clamp(state.local.pitch - dy * scale, -1.16, 1.08);
}

function selectWeapon(weaponId) {
  if (!state.connected || !WEAPONS[weaponId]) return;
  if (!localOwnsWeapon(weaponId)) {
    playSound("dry");
    return;
  }
  if (state.local.weapon !== weaponId) {
    playSound("switch", weaponId);
  }
  state.local.weapon = weaponId;
  state.socket.emit("switchWeapon", weaponId);
}

function fireWeapon() {
  if (!state.connected || !state.local.alive) return;
  const weapon = WEAPONS[state.local.weapon] || WEAPONS.sentinel;
  const now = performance.now();
  if (now - state.local.lastShotAt < weapon.fireMs * 0.72) return;
  if (weapon.ammoMax !== Infinity && Number(state.local.ammo[state.local.weapon] || 0) <= 0) {
    playSound("dry");
    return;
  }
  state.local.lastShotAt = now;
  state.socket.emit("shoot", {
    weaponId: state.local.weapon,
    direction: vectorFromYawPitch(state.local.yaw, state.local.pitch)
  });
}

// ---------------------------------------------------------------------------
// Frame loop
// ---------------------------------------------------------------------------

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = performance.now() / 1000;
  if (state.input.mouseHeld && WEAPONS[state.local.weapon]?.fullyAuto) fireWeapon();
  updateLocalMovement(dt);
  updateCamera(dt, time);
  updateRemoteAgents(dt);
  updatePickups(time);
  updateTracers(dt);
  updateImpacts(dt);
  updateWater(time);
  updateAnimatedProps(dt, time);
  updateWeather(dt, time);
  updateHud();
  renderer.render(scene, camera);
}

function updateAnimatedProps(dt, time) {
  for (const prop of animatedProps) {
    prop.update(dt, time);
  }
}

function updateWeather(dt, time) {
  weatherSystem?.update(dt, time);
}

function updateLocalMovement(dt) {
  if (!state.connected || !state.local.alive) return;
  const keys = state.input.keys;
  const move = {
    x: (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0) + state.input.moveStick.x,
    y: (keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0) + state.input.moveStick.y
  };
  const length = Math.hypot(move.x, move.y);
  if (length > 1) {
    move.x /= length;
    move.y /= length;
  }

  const isCrouching = keys.has("ControlLeft") || keys.has("ControlRight") || keys.has("KeyC");
  const isSprint = !isCrouching && (keys.has("ShiftLeft") || keys.has("ShiftRight"));
  // Crouch slows movement; sprint slightly speeds up; jumping in air keeps speed
  const baseSpeed = isCrouching ? 2.6 : isSprint ? 6.6 : 5.2;
  const sin = Math.sin(state.local.yaw);
  const cos = Math.cos(state.local.yaw);
  const dx = (move.x * cos + move.y * sin) * baseSpeed * dt;
  const dz = (move.x * -sin + move.y * cos) * baseSpeed * dt;
  const previousPosition = state.local.pos;
  const desired = {
    x: state.local.pos.x + dx,
    z: state.local.pos.z + dz
  };
  state.local.pos = resolveMovement(state.arena, state.local.pos, desired, PLAYER_RADIUS);

  // Horizontal speed for bobbing / footsteps (units per second)
  const moved = Math.hypot(state.local.pos.x - previousPosition.x, state.local.pos.z - previousPosition.z);
  const instantSpeed = moved / Math.max(dt, 0.0001);
  state.local.moveSpeed = lerp(state.local.moveSpeed, instantSpeed, Math.min(1, dt * 14));

  state.local.groundY = floorHeightAt(state.arena, state.local.pos);

  // Jump
  let grounded = state.local.jumpY <= 0.001 && state.local.vy <= 0;
  if (grounded) {
    state.local.jumpY = 0;
    state.local.vy = 0;
    if (keys.has("Space") && !isCrouching) {
      state.local.vy = 4.6;
      state.local.jumpY = 0.001; // leave ground
      playSound("jump");
    }
  }
  // Apply gravity
  if (state.local.jumpY > 0 || state.local.vy > 0) {
    state.local.vy -= 14 * dt;
    state.local.jumpY = Math.max(0, state.local.jumpY + state.local.vy * dt);
    if (state.local.jumpY === 0 && state.local.vy < 0) {
      if (state.local.vy < -1.4) playSound("land");
      state.local.vy = 0;
    }
  }
  grounded = state.local.jumpY <= 0.001 && state.local.vy <= 0;
  state.local.yOffset = state.local.groundY + state.local.jumpY;

  // Crouch interpolation
  const crouchTarget = isCrouching ? 1 : 0;
  state.local.crouch = lerp(state.local.crouch, crouchTarget, Math.min(1, dt * 12));

  // Footsteps tied to actual ground movement (only when grounded and moving)
  const now = performance.now();
  const stepDelay = isSprint ? 290 : isCrouching ? 540 : 380;
  if (state.local.moveSpeed > 0.6 && grounded && moved > 0.005 && now - state.lastStepAt > stepDelay) {
    state.lastStepAt = now;
    state.stepSide = 1 - state.stepSide;
    playSound("step");
  }

  if (now - state.lastStateSentAt > 45) {
    state.lastStateSentAt = now;
    state.socket?.emit("playerState", {
      position: state.local.pos,
      yaw: state.local.yaw,
      pitch: state.local.pitch,
      yOffset: state.local.yOffset,
      crouch: state.local.crouch
    });
  }
}

function updateCamera(dt, time) {
  // Head-bob driven by actual horizontal speed. No movement → no bob.
  const speedNorm = clamp(state.local.moveSpeed / 5.5, 0, 1.2);
  const grounded = state.local.jumpY <= 0.001;
  if (state.local.alive && grounded && speedNorm > 0.05) {
    state.local.bobPhase += dt * (8 + speedNorm * 6);
  } else {
    // Bleed phase to zero crossing so we don't snap when starting to move
    state.local.bobPhase += dt * 0.0;
  }
  const bobAmp = state.local.alive && grounded ? speedNorm * 0.045 : 0;
  const bobY = Math.sin(state.local.bobPhase) * bobAmp;
  const bobX = Math.cos(state.local.bobPhase * 0.5) * bobAmp * 0.6;

  const crouchOffset = state.local.crouch * -0.55; // lower head when crouched
  const eyeY = PLAYER_EYE_HEIGHT + crouchOffset + state.local.yOffset + bobY;

  // ADS — lerp factor and FOV
  const adsCfg = ADS_CONFIG[state.local.weapon] || ADS_CONFIG.sentinel;
  const adsTarget = (state.ads && state.local.alive) ? 1 : 0;
  state.adsFactor = lerp(state.adsFactor, adsTarget, Math.min(1, dt * adsCfg.speed));
  const targetFov = lerp(72, adsCfg.fov, state.adsFactor);
  if (Math.abs(camera.fov - targetFov) > 0.05) {
    camera.fov = targetFov;
    camera.updateProjectionMatrix();
  }

  // Phantom scope overlay — only fully visible at max ads
  const isPhantomAds = state.local.weapon === "phantom" && state.adsFactor > 0.95;
  dom.scopeOverlay.classList.toggle("is-hidden", !isPhantomAds);

  camera.position.set(state.local.pos.x + bobX * 0.0, eyeY, state.local.pos.z);
  camera.rotation.y = state.local.yaw;
  camera.rotation.x = state.local.pitch - state.recoil;
  state.recoil = Math.max(0, state.recoil - dt * 0.52);

  // Weapon rig slides toward center when ADS, bobs less
  const adsSwaySuppress = 1 - state.adsFactor * 0.85;
  weaponRig.group.position.copy(camera.position);
  weaponRig.group.rotation.copy(camera.rotation);
  weaponRig.group.translateX((0.04 + bobX * 0.6) * (1 - state.adsFactor));
  weaponRig.group.translateY(-0.02 - state.recoil * 1.8 + bobY * 0.4 * adsSwaySuppress - state.local.crouch * 0.05);
  weaponRig.group.translateZ(0.02 + state.adsFactor * 0.06);
  // Hide weapon model while phantom scope is showing
  weaponRig.group.visible = !isPhantomAds;
  const weaponVisual = WEAPON_VISUALS[state.local.weapon] || WEAPON_VISUALS.sentinel;
  weaponRig.body.material.color.set(weaponVisual.accent);
  weaponRig.body.material.emissive?.set(weaponVisual.emissive);
  weaponRig.body.material.emissiveIntensity = (state.local.weapon === "oracle" || state.local.weapon === "phantom") ? 0.28 : 0.1;
  weaponRig.muzzle.material.color.set(weaponVisual.accent);
  weaponRig.muzzle.material.opacity = Math.max(0, weaponRig.muzzle.material.opacity - dt * 8);
  weaponRig.muzzle.scale.setScalar(1 + weaponRig.muzzle.material.opacity * weaponVisual.muzzleScale);
  setWeaponRigModel(state.local.weapon);
}

function setWeaponRigModel(weaponId) {
  if (weaponRig.currentWeaponId === weaponId) return;
  weaponRig.currentWeaponId = weaponId;
  weaponRig.modelRoot.clear();
  weaponRig.fallback.visible = true;

  loadWeaponTemplate(weaponId)
    .then((template) => {
      if (weaponRig.currentWeaponId !== weaponId) return;
      const model = template.clone(true);
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      weaponRig.modelRoot.clear();
      weaponRig.modelRoot.add(model);
      weaponRig.fallback.visible = false;
    })
    .catch(() => {
      if (weaponRig.currentWeaponId !== weaponId) return;
      weaponRig.modelRoot.clear();
      weaponRig.fallback.visible = true;
    });
}

function buildPhantomModel() {
  const mat = (color, metal = 0.7, rough = 0.22) =>
    new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough });
  const box = (w, h, d, color, metal, rough) =>
    new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, metal, rough));

  const root = new THREE.Group();

  // main receiver / stock body
  const receiver = box(0.06, 0.07, 0.52, "#1a2530", 0.72, 0.22);
  receiver.position.set(0.38, -0.44, -0.78);
  root.add(receiver);

  // long barrel
  const barrel = box(0.03, 0.03, 0.78, "#0f1a24", 0.82, 0.16);
  barrel.position.set(0.38, -0.42, -1.28);
  root.add(barrel);

  // muzzle brake
  const brake = box(0.05, 0.05, 0.06, "#233040", 0.78, 0.2);
  brake.position.set(0.38, -0.42, -1.7);
  root.add(brake);

  // stock
  const stock = box(0.04, 0.06, 0.22, "#12202c", 0.6, 0.38);
  stock.position.set(0.38, -0.46, -0.44);
  root.add(stock);

  // cheek rest
  const cheek = box(0.04, 0.04, 0.12, "#1a2d3a", 0.6, 0.38);
  cheek.position.set(0.38, -0.40, -0.48);
  root.add(cheek);

  // scope body
  const scopeBody = box(0.04, 0.04, 0.28, "#101820", 0.85, 0.14);
  scopeBody.position.set(0.38, -0.36, -0.84);
  root.add(scopeBody);

  // scope lens front
  const lensF = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.01, 12),
    new THREE.MeshStandardMaterial({ color: "#7dd4ff", metalness: 0.1, roughness: 0.05, emissive: "#2266aa", emissiveIntensity: 0.4 })
  );
  lensF.rotation.x = Math.PI / 2;
  lensF.position.set(0.38, -0.36, -0.99);
  root.add(lensF);

  // scope lens rear
  const lensR = lensF.clone();
  lensR.position.set(0.38, -0.36, -0.70);
  root.add(lensR);

  // scope mount rings
  for (const z of [-0.76, -0.94]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.025, 0.008, 6, 12),
      mat("#233040", 0.8, 0.2)
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0.38, -0.36, z);
    root.add(ring);
  }

  // bipod legs (folded flat)
  for (const side of [-1, 1]) {
    const leg = box(0.012, 0.1, 0.014, "#1a2530", 0.7, 0.3);
    leg.position.set(0.38 + side * 0.035, -0.50, -1.18);
    leg.rotation.z = side * 0.2;
    root.add(leg);
  }

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return root;
}

function loadWeaponTemplate(weaponId) {
  const config = WEAPON_MODELS[weaponId] || WEAPON_MODELS.sentinel;
  if (weaponTemplates.has(weaponId)) {
    return Promise.resolve(weaponTemplates.get(weaponId));
  }
  if (weaponLoads.has(weaponId)) {
    return weaponLoads.get(weaponId);
  }

  if (config.buildFn) {
    const model = config.buildFn();
    weaponTemplates.set(weaponId, model);
    return Promise.resolve(model);
  }

  const load = new Promise((resolve, reject) => {
    weaponMtlLoader.load(
      config.mtl,
      (materials) => {
        materials.preload();
        weaponObjLoader.setMaterials(materials);
        weaponObjLoader.load(
          config.obj,
          (object) => {
            const normalized = normalizeWeaponModel(object, config, weaponId);
            weaponTemplates.set(weaponId, normalized);
            resolve(normalized);
          },
          undefined,
          reject
        );
      },
      undefined,
      reject
    );
  });
  weaponLoads.set(weaponId, load);
  return load;
}

function normalizeWeaponModel(object, config, weaponId) {
  const wrapper = new THREE.Group();
  object.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
  wrapper.add(object);
  wrapper.updateMatrixWorld(true);

  let box = new THREE.Box3().setFromObject(wrapper);
  const size = box.getSize(new THREE.Vector3());
  const scale = config.length / Math.max(size.z, size.x, size.y, 0.001);
  object.scale.setScalar(scale);
  wrapper.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(wrapper);
  const center = box.getCenter(new THREE.Vector3());
  object.position.x += config.position.x - center.x;
  object.position.y += config.position.y - center.y;
  object.position.z += config.position.z - center.z;

  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material = skinWeaponMaterial(child.material, weaponId);
      }
    }
  });

  return wrapper;
}

function skinWeaponMaterial(material, weaponId) {
  if (Array.isArray(material)) {
    return material.map((entry, index) => skinSingleWeaponMaterial(entry, weaponId, index));
  }
  return skinSingleWeaponMaterial(material, weaponId, 0);
}

function skinSingleWeaponMaterial(material, weaponId, index) {
  const style = WEAPON_VISUALS[weaponId] || WEAPON_VISUALS.sentinel;
  const skinned = material.clone();
  const useAccent = index % 3 === 1 || weaponId === "oracle" || weaponId === "phantom";
  skinned.color = new THREE.Color(useAccent ? style.accent : style.base);
  skinned.roughness = style.roughness;
  skinned.metalness = style.metalness;
  if (weaponId === "oracle" || weaponId === "phantom") {
    skinned.emissive = new THREE.Color(style.emissive);
    skinned.emissiveIntensity = 0.24;
  } else if (weaponId === "cyclone") {
    skinned.emissive = new THREE.Color(style.emissive);
    skinned.emissiveIntensity = useAccent ? 0.1 : 0.03;
  } else {
    skinned.emissive = new THREE.Color(style.emissive);
    skinned.emissiveIntensity = useAccent ? 0.08 : 0.02;
  }
  skinned.needsUpdate = true;
  return skinned;
}

function syncRemoteAgents() {
  const present = new Set();
  for (const player of state.players.values()) {
    if (player.id === state.playerId) continue;
    present.add(player.id);
    if (!remoteAgents.has(player.id)) {
      const agent = createAgent(player);
      scene.add(agent.group);
      remoteAgents.set(player.id, agent);
    }
    const agent = remoteAgents.get(player.id);
    agent.target = player;
    if (agent.wasAlive && !player.alive) {
      agent.collapseProgress = 0;
    }
    if (!agent.wasAlive && player.alive) {
      agent.collapseProgress = 1;
      agent.avatarRoot.rotation.x = 0;
      agent.avatarRoot.position.y = 0;
    }
    agent.wasAlive = player.alive;
    agent.group.visible = player.alive || agent.collapseProgress < 1;
    agent.colorRing.material.color.set(player.color);
    if (agent.nameKey !== `${player.name}:${player.color}`) {
      agent.nameSprite.material.map?.dispose();
      agent.nameSprite.material.map = makeNameTexture(player.name, player.color);
      agent.nameSprite.material.needsUpdate = true;
      agent.nameKey = `${player.name}:${player.color}`;
    }
    if (agent.currentAvatarId !== player.avatarId) {
      setAgentAvatar(agent, player);
    }
    setRemoteWeaponStyle(agent, player.weapon);
  }
  for (const [id, agent] of remoteAgents.entries()) {
    if (!present.has(id)) {
      scene.remove(agent.group);
      remoteAgents.delete(id);
    }
  }
}

function createAgent(player) {
  const group = new THREE.Group();
  const avatarRoot = new THREE.Group();
  avatarRoot.add(createFallbackAgentModel(player));
  const weaponProxy = createRemoteWeaponProxy(player.weapon);
  const colorRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.52, 0.025, 6, 28),
    new THREE.MeshBasicMaterial({ color: player.color })
  );
  colorRing.rotation.x = -Math.PI / 2;
  colorRing.position.y = 0.035;
  const nameSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: makeNameTexture(player.name, player.color), transparent: true, depthWrite: false })
  );
  nameSprite.position.y = 2.2;
  nameSprite.scale.set(1.45, 0.36, 1);
  group.add(avatarRoot, weaponProxy, colorRing, nameSprite);
  group.position.set(player.pos.x, player.yOffset || 0, player.pos.z);
  group.rotation.y = player.yaw;
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  const agent = {
    group,
    target: player,
    avatarRoot,
    colorRing,
    nameSprite,
    weaponProxy,
    nameKey: `${player.name}:${player.color}`,
    currentAvatarId: null,
    currentWeaponId: null,
    wasAlive: true,
    collapseProgress: 1
  };
  setAgentAvatar(agent, player);
  setRemoteWeaponStyle(agent, player.weapon);
  return agent;
}

function createRemoteWeaponProxy(weaponId) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.12, 0.78),
    new THREE.MeshStandardMaterial({ color: "#20221d", roughness: 0.52, metalness: 0.42 })
  );
  body.position.set(0.34, 1.15, -0.42);
  body.rotation.x = -0.06;
  const barrel = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.07, 0.36),
    new THREE.MeshStandardMaterial({ color: "#10110f", roughness: 0.58, metalness: 0.5 })
  );
  barrel.position.set(0.34, 1.16, -0.98);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 8, 6),
    new THREE.MeshBasicMaterial({ color: "#ffd36b" })
  );
  glow.position.set(0.34, 1.16, -1.2);
  group.add(body, barrel, glow);
  group.userData.body = body;
  group.userData.barrel = barrel;
  group.userData.glow = glow;
  setRemoteWeaponProxyStyle(group, weaponId);
  return group;
}

function setRemoteWeaponStyle(agent, weaponId) {
  if (!agent.weaponProxy || agent.currentWeaponId === weaponId) return;
  agent.currentWeaponId = weaponId;
  setRemoteWeaponProxyStyle(agent.weaponProxy, weaponId);
}

function setRemoteWeaponProxyStyle(group, weaponId) {
  const style = WEAPON_VISUALS[weaponId] || WEAPON_VISUALS.sentinel;
  const weapon = WEAPONS[weaponId] || WEAPONS.sentinel;
  const length = weaponId === "cyclone" ? 1.08 : weaponId === "argus" ? 1.0 : weaponId === "oracle" ? 0.86 : weaponId === "phantom" ? 1.32 : 0.72;
  group.userData.body.scale.z = length;
  group.userData.body.material.color.set(style.base);
  group.userData.body.material.metalness = style.metalness;
  group.userData.body.material.roughness = style.roughness;
  group.userData.barrel.material.color.set(style.accent);
  group.userData.glow.material.color.set(weapon.tracer);
  group.userData.glow.scale.setScalar(style.muzzleScale);
}

function createFallbackAgentModel(player) {
  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: player.color, roughness: 0.66, metalness: 0.14 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 1.05, 7), bodyMaterial);
  body.position.y = 0.84;
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.38, 0.42),
    new THREE.MeshStandardMaterial({ color: "#d1b45b", roughness: 0.58, metalness: 0.2 })
  );
  head.position.y = 1.48;
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.08, 0.035),
    new THREE.MeshStandardMaterial({ color: "#0d0f0d", roughness: 0.65, metalness: 0.25 })
  );
  visor.position.set(0, 1.5, -0.225);
  group.add(body, head, visor);
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}

function setAgentAvatar(agent, player) {
  const avatarId = isAvatarId(player.avatarId) ? player.avatarId : DEFAULT_AVATAR_ID;
  agent.currentAvatarId = avatarId;
  loadAvatarTemplate(avatarId)
    .then((template) => {
      if (agent.currentAvatarId !== avatarId) return;
      agent.avatarRoot.clear();
      const model = template.clone(true);
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material?.map) {
            child.material.map.colorSpace = THREE.SRGBColorSpace;
          }
        }
      });
      agent.avatarRoot.add(model);
    })
    .catch(() => {
      if (agent.currentAvatarId !== avatarId) return;
      agent.avatarRoot.clear();
      agent.avatarRoot.add(createFallbackAgentModel(player));
    });
}

function loadAvatarTemplate(avatarId) {
  const avatar = getAvatarById(avatarId);
  if (avatarTemplates.has(avatar.id)) {
    return Promise.resolve(avatarTemplates.get(avatar.id));
  }
  if (avatarLoads.has(avatar.id)) {
    return avatarLoads.get(avatar.id);
  }
  const load = new Promise((resolve, reject) => {
    avatarLoader.load(
      avatar.modelPath,
      (gltf) => {
        const normalized = normalizeAvatarModel(gltf.scene);
        avatarTemplates.set(avatar.id, normalized);
        resolve(normalized);
      },
      undefined,
      reject
    );
  });
  avatarLoads.set(avatar.id, load);
  return load;
}

function normalizeAvatarModel(model) {
  const wrapper = new THREE.Group();
  wrapper.add(model);
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material?.map) {
        child.material.map.colorSpace = THREE.SRGBColorSpace;
      }
      child.material.needsUpdate = true;
    }
  });

  model.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = PLAYER_BODY_HEIGHT / Math.max(size.y, 0.001);
  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;
  wrapper.rotation.y = Math.PI;
  return wrapper;
}

function makeNameTexture(name, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  context.fillStyle = "rgba(13, 16, 13, 0.76)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = color;
  context.fillRect(0, 54, canvas.width, 6);
  context.font = "700 24px Verdana";
  context.fillStyle = "#f3edca";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(name, canvas.width / 2, 30);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

function updateRemoteAgents(dt) {
  for (const agent of remoteAgents.values()) {
    const target = agent.target;
    if (!target) continue;
    agent.group.position.x = lerp(agent.group.position.x, target.pos.x, Math.min(1, dt * 12));
    agent.group.position.z = lerp(agent.group.position.z, target.pos.z, Math.min(1, dt * 12));
    const targetY = target.yOffset || 0;
    agent.group.position.y = lerp(agent.group.position.y, targetY, Math.min(1, dt * 14));
    agent.group.rotation.y = lerpAngle(agent.group.rotation.y, target.yaw, Math.min(1, dt * 10));
    const healthRatio = target.health / MAX_HEALTH;
    const crouchScale = 1 - (target.crouch || 0) * 0.32;
    if (target.alive) {
      agent.avatarRoot.scale.y = (0.92 + healthRatio * 0.08) * crouchScale;
      agent.avatarRoot.rotation.x = 0;
      agent.avatarRoot.position.y = 0;
    } else if (agent.collapseProgress < 1) {
      agent.collapseProgress = Math.min(1, agent.collapseProgress + dt * 2.6);
      const t = 1 - (1 - agent.collapseProgress) ** 3;
      agent.avatarRoot.rotation.x = t * (Math.PI / 2);
      agent.avatarRoot.position.y = -t * 0.85;
      agent.avatarRoot.scale.y = 1 - t * 0.1;
    }
    agent.weaponProxy.visible = target.alive;
    agent.colorRing.visible = target.alive;
    agent.nameSprite.visible = target.alive;
    agent.weaponProxy.position.y = -(target.crouch || 0) * 0.38;
    agent.colorRing.rotation.z += dt * 1.8;
  }
}

function syncPickupMeshes() {
  for (const [id, pickup] of state.pickups.entries()) {
    const mesh = pickupMeshes.get(id);
    if (mesh) mesh.visible = pickup.active;
  }
}

function updatePickups(time) {
  for (const mesh of pickupMeshes.values()) {
    mesh.position.y = (mesh.userData.baseY || 0.68) + Math.sin(time * 2.5 + mesh.position.x) * 0.08;
    if (mesh.userData.weaponAnchor) {
      mesh.userData.weaponAnchor.rotation.y += 0.026;
      mesh.userData.weaponAnchor.rotation.z = Math.sin(time * 2.2 + mesh.position.z) * 0.08;
    } else {
      mesh.rotation.y += 0.02;
    }
    if (mesh.userData.marker) {
      mesh.userData.marker.rotation.x += 0.025;
      mesh.userData.marker.rotation.z -= 0.018;
    }
    if (mesh.userData.halo) {
      mesh.userData.halo.rotation.z -= 0.01;
    }
    if (mesh.userData.label) {
      mesh.userData.label.quaternion.copy(camera.quaternion);
    }
  }
}

function updateWater(time) {
  for (const water of waterPlanes) {
    if (!water.texture) continue;
    water.texture.offset.x = (time * 0.03) % 1;
    water.texture.offset.y = (time * 0.022) % 1;
    // Vertex wave displacement for non-frozen water
    if (!water.frozen && water.geometry) {
      const positions = water.geometry.attributes.position;
      for (let i = 0; i < positions.count; i += 1) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        // The plane is rotated to lie on Y=0; before rotation, "z" displacement is the third coord.
        const wave =
          Math.sin(x * 0.18 + time * 1.6) * 0.07 +
          Math.cos(y * 0.22 + time * 1.2) * 0.05;
        positions.setZ(i, wave);
      }
      positions.needsUpdate = true;
      water.geometry.computeVertexNormals();
    }
  }
}

function addTracer(event) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(event.origin.x, event.origin.y, event.origin.z),
    new THREE.Vector3(event.end.x, event.end.y, event.end.z)
  ]);
  const material = new THREE.LineBasicMaterial({
    color: WEAPONS[event.weaponId]?.tracer || "#fff1b0",
    transparent: true,
    opacity: 0.9
  });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  tracers.push({ line, age: 0, life: event.weaponId === "oracle" || event.weaponId === "phantom" ? 0.22 : 0.1 });
}

function updateTracers(dt) {
  for (let index = tracers.length - 1; index >= 0; index -= 1) {
    const tracer = tracers[index];
    tracer.age += dt;
    tracer.line.material.opacity = Math.max(0, 1 - tracer.age / tracer.life);
    if (tracer.age >= tracer.life) {
      scene.remove(tracer.line);
      tracers.splice(index, 1);
    }
  }
}

function addImpact(event) {
  const isHit = Boolean(event.hitId);
  const color = isHit ? "#ff6622" : "#ccccaa";
  const count = isHit ? 10 : 6;
  const speed = isHit ? 5.5 : 3.5;
  const life = isHit ? 0.38 : 0.22;
  const geo = new THREE.SphereGeometry(isHit ? 0.055 : 0.04, 4, 4);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
  const particles = [];
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geo, mat.clone());
    mesh.position.set(event.end.x, event.end.y, event.end.z);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    mesh.userData.vel = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * speed * (0.5 + Math.random() * 0.5),
      Math.abs(Math.cos(phi)) * speed * (0.5 + Math.random() * 0.5),
      Math.sin(phi) * Math.sin(theta) * speed * (0.5 + Math.random() * 0.5)
    );
    scene.add(mesh);
    particles.push(mesh);
  }
  impacts.push({ particles, mat, age: 0, life });
}

function updateImpacts(dt) {
  for (let i = impacts.length - 1; i >= 0; i--) {
    const imp = impacts[i];
    imp.age += dt;
    const t = imp.age / imp.life;
    const opacity = Math.max(0, 1 - t);
    for (const mesh of imp.particles) {
      mesh.position.addScaledVector(mesh.userData.vel, dt);
      mesh.userData.vel.y -= 9 * dt;
      mesh.material.opacity = opacity;
    }
    if (imp.age >= imp.life) {
      for (const mesh of imp.particles) scene.remove(mesh);
      impacts.splice(i, 1);
    }
  }
}

const _dmgVec = new THREE.Vector3();
function spawnDamageNumbers(event) {
  if (!event.damageResults?.length) return;
  for (const result of event.damageResults) {
    const total = result.damage + result.armorDamage;
    if (total <= 0) continue;
    _dmgVec.set(event.end.x, event.end.y + 0.4, event.end.z);
    _dmgVec.project(camera);
    const x = (_dmgVec.x * 0.5 + 0.5) * dom.canvas.clientWidth;
    const y = (-_dmgVec.y * 0.5 + 0.5) * dom.canvas.clientHeight;
    if (_dmgVec.z > 1) return;
    const el = document.createElement("span");
    el.className = "dmg-num" + (result.eliminated ? " is-kill" : result.armorDamage > 0 ? " is-armor" : " is-body");
    el.textContent = result.eliminated ? `${total} 💀` : String(total);
    el.style.left = `${x + (Math.random() - 0.5) * 18}px`;
    el.style.top = `${y}px`;
    dom.damageNumbers.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }
}

function updateHud() {
  dom.healthValue.textContent = Math.round(state.local.health);
  dom.armorValue.textContent = Math.round(state.local.armor);
  dom.healthFill.style.transform = `scaleX(${clamp(state.local.health / MAX_HEALTH, 0, 1)})`;
  dom.armorFill.style.transform = `scaleX(${clamp(state.local.armor / MAX_ARMOR, 0, 1)})`;
  const weapon = WEAPONS[state.local.weapon] || WEAPONS.sentinel;
  dom.weaponName.textContent = weapon.name;
  const ammo = state.local.ammo[state.local.weapon];
  dom.ammoValue.textContent = ammo === "inf" ? "--" : String(ammo || 0).padStart(2, "0");
  renderWeaponInventory();

  if (!state.local.alive && state.local.respawnAt) {
    dom.deathScreen.classList.remove("is-hidden");
    const seconds = Math.max(0, (state.local.respawnAt - Date.now()) / 1000);
    dom.respawnTimer.textContent = seconds.toFixed(1);
  } else {
    dom.deathScreen.classList.add("is-hidden");
  }
  drawMinimap();
}

function renderWeaponInventory() {
  if (!dom.weaponInventory) return;
  const ownedWeapons = normalizeOwnedWeapons(state.local.ownedWeapons, state.local.ammo);
  const key = WEAPON_ORDER.map((weaponId) => `${weaponId}:${ownedWeapons.includes(weaponId) ? "1" : "0"}:${state.local.ammo[weaponId]}:${state.local.weapon === weaponId ? "1" : "0"}`).join("|");
  if (key === state.weaponInventoryKey) return;
  state.weaponInventoryKey = key;
  dom.weaponInventory.innerHTML = WEAPON_ORDER.map((weaponId, index) => {
    const weapon = WEAPONS[weaponId];
    const owned = ownedWeapons.includes(weaponId);
    const ammo = state.local.ammo[weaponId];
    const ammoLabel = ammo === "inf" || weapon.ammoMax === Infinity ? "--" : String(ammo || 0).padStart(2, "0");
    return `
      <button
        class="weapon-slot ${state.local.weapon === weaponId ? "is-active" : ""} ${owned ? "is-owned" : "is-locked"}"
        type="button"
        data-weapon-id="${weaponId}"
        ${owned ? "" : "disabled"}
        style="--weapon-color:${weapon.color}"
        aria-label="Select ${escapeHtml(weapon.name)}"
      >
        <span>${index + 1}</span>
        <strong>${weapon.shortName}</strong>
        <em>${owned ? ammoLabel : "LOCK"}</em>
      </button>
    `;
  }).join("");
}

function renderScoreboard(players) {
  const sorted = [...players].sort((a, b) => b.score - a.score || a.deaths - b.deaths || a.name.localeCompare(b.name));
  dom.scoreRows.innerHTML = sorted
    .map(
      (player) => `
        <div class="score-row ${player.id === state.playerId ? "is-local" : ""} ${player.isBot ? "is-bot" : ""}">
          <span><i style="background:${player.color}"></i>${escapeHtml(player.name)}${player.isBot ? '<b class="bot-tag">SIM</b>' : ""}</span>
          <strong>${player.score}</strong>
          <strong>${player.deaths}</strong>
        </div>
      `
    )
    .join("");
}

function renderMatchStatus(players) {
  if (!dom.matchStatus) return;
  const sorted = [...players].sort((a, b) => b.score - a.score || a.deaths - b.deaths || a.name.localeCompare(b.name));
  const leader = sorted[0];
  if (!leader) {
    dom.matchStatus.innerHTML = "";
    return;
  }

  const localIndex = sorted.findIndex((player) => player.id === state.playerId);
  const local = localIndex >= 0 ? sorted[localIndex] : null;
  const progress = clamp(leader.score / SCORE_LIMIT, 0, 1);
  const status = leader.score >= SCORE_LIMIT ? "EXFIL READY" : `${leader.score}/${SCORE_LIMIT}`;
  dom.matchStatus.innerHTML = `
    <span>${leader.score >= SCORE_LIMIT ? "TARGET HIT" : "LEADER"}</span>
    <strong>${escapeHtml(leader.name)} <em>${status}</em></strong>
    <i style="transform:scaleX(${progress})"></i>
    ${local ? `<small>YOU ${local.score} · RANK ${localIndex + 1}/${sorted.length}</small>` : ""}
  `;
}

function renderFeed(feed) {
  for (const item of feed || []) {
    if (state.feedSeen.has(item.id)) continue;
    state.feedSeen.add(item.id);
    const row = document.createElement("div");
    row.textContent = item.message;
    dom.feed.prepend(row);
  }
  while (dom.feed.children.length > 4) {
    dom.feed.lastElementChild.remove();
  }
}

function drawMinimap() {
  const arena = state.arena;
  const width = dom.minimap.width;
  const height = dom.minimap.height;
  const { minX, maxX, minZ, maxZ } = arena.bounds;
  minimapContext.clearRect(0, 0, width, height);
  minimapContext.fillStyle = "rgba(13, 16, 13, 0.78)";
  minimapContext.fillRect(0, 0, width, height);
  minimapContext.strokeStyle = "rgba(230, 207, 123, 0.4)";
  minimapContext.strokeRect(8, 8, width - 16, height - 16);

  const toMap = (point) => ({
    x: 8 + ((point.x - minX) / (maxX - minX)) * (width - 16),
    y: 8 + ((point.z - minZ) / (maxZ - minZ)) * (height - 16)
  });

  // Water on minimap
  if (arena.water) {
    minimapContext.fillStyle = "rgba(70,130,170,0.55)";
    const waterMinX = clamp(arena.water.minX, minX, maxX);
    const waterMaxX = clamp(arena.water.maxX, minX, maxX);
    const waterMinZ = clamp(arena.water.minZ, minZ, maxZ);
    const waterMaxZ = clamp(arena.water.maxZ, minZ, maxZ);
    if (waterMaxX > waterMinX && waterMaxZ > waterMinZ) {
      const tl = toMap({ x: waterMinX, z: waterMinZ });
      const br = toMap({ x: waterMaxX, z: waterMaxZ });
      minimapContext.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    }
  }

  minimapContext.fillStyle = "rgba(198, 179, 95, 0.18)";
  for (const floor of arena.floors || []) {
    const topLeft = toMap({ x: floor.x - floor.w / 2, z: floor.z - floor.d / 2 });
    const bottomRight = toMap({ x: floor.x + floor.w / 2, z: floor.z + floor.d / 2 });
    minimapContext.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
  }

  minimapContext.fillStyle = "rgba(232, 207, 117, 0.32)";
  for (const ramp of arena.ramps || []) {
    const topLeft = toMap({ x: ramp.x - ramp.w / 2, z: ramp.z - ramp.d / 2 });
    const bottomRight = toMap({ x: ramp.x + ramp.w / 2, z: ramp.z + ramp.d / 2 });
    minimapContext.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
  }

  minimapContext.fillStyle = "rgba(119, 126, 101, 0.7)";
  for (const collider of arena.colliders) {
    const topLeft = toMap({ x: collider.x - collider.w / 2, z: collider.z - collider.d / 2 });
    const bottomRight = toMap({ x: collider.x + collider.w / 2, z: collider.z + collider.d / 2 });
    minimapContext.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
  }

  for (const pickup of state.pickups.values()) {
    if (!pickup.active) continue;
    const point = toMap(pickup);
    minimapContext.fillStyle = PICKUP_RULES[pickup.type]?.color || "#e6cf7b";
    minimapContext.fillRect(point.x - 2, point.y - 2, 4, 4);
  }

  for (const player of state.players.values()) {
    if (!player.alive) continue;
    const point = toMap(player.pos);
    minimapContext.fillStyle = player.id === state.playerId ? "#f5e289" : player.color;
    minimapContext.beginPath();
    minimapContext.arc(point.x, point.y, player.id === state.playerId ? 4 : 3, 0, Math.PI * 2);
    minimapContext.fill();
    const dir = vectorFromYawPitch(player.id === state.playerId ? state.local.yaw : player.yaw, 0);
    minimapContext.strokeStyle = minimapContext.fillStyle;
    minimapContext.beginPath();
    minimapContext.moveTo(point.x, point.y);
    minimapContext.lineTo(point.x + dir.x * 8, point.y + dir.z * 8);
    minimapContext.stroke();
  }
}

function showHitMarker() {
  dom.hitMarker.classList.remove("is-hot");
  void dom.hitMarker.offsetWidth;
  dom.hitMarker.classList.add("is-hot");
  playSound("hit");
}

function flashDamage() {
  dom.damageFlash.classList.remove("is-hot");
  void dom.damageFlash.offsetWidth;
  dom.damageFlash.classList.add("is-hot");
  playSound("hurt");
}

function updateLockPrompt() {
  const shouldShow = state.connected && state.local.alive && document.pointerLockElement !== dom.canvas && !isTouchDevice();
  dom.lockPrompt.classList.toggle("is-hidden", !shouldShow);
}

function copyRoomLink() {
  const url = `${location.origin}${location.pathname}?room=${state.roomCode}&map=${state.mapId}&bots=${state.botCount}`;
  navigator.clipboard?.writeText(url);
  dom.copyRoomButton.textContent = "COPIED";
  setTimeout(() => {
    dom.copyRoomButton.textContent = "LINK";
  }, 900);
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ---------------------------------------------------------------------------
// Sound (improved layered synth)
// ---------------------------------------------------------------------------

function unlockAudio() {
  if (state.audio) {
    resumeAudioContext(state.audio);
    return;
  }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  state.audio = new AudioContext();

  // Master bus with subtle bus compression-ish soft clip and reverb send
  state.audioBus = createAudioBus(state.audio);

  resumeAudioContext(state.audio);
}

function createAudioBus(ctx) {
  const dry = ctx.createGain();
  dry.gain.value = 0.85;
  dry.connect(ctx.destination);

  const wet = ctx.createGain();
  wet.gain.value = 0.18;
  wet.connect(ctx.destination);

  // Cheap impulse-free reverb: feedback delay network using two delays.
  const delay1 = ctx.createDelay(1.0);
  delay1.delayTime.value = 0.071;
  const delay2 = ctx.createDelay(1.0);
  delay2.delayTime.value = 0.113;
  const fb1 = ctx.createGain();
  fb1.gain.value = 0.34;
  const fb2 = ctx.createGain();
  fb2.gain.value = 0.32;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 2400;
  delay1.connect(fb1).connect(delay2);
  delay2.connect(fb2).connect(delay1);
  delay2.connect(lowpass).connect(wet);

  const reverbIn = ctx.createGain();
  reverbIn.gain.value = 0.4;
  reverbIn.connect(delay1);
  reverbIn.connect(delay2);

  return { dry, reverbIn };
}

function playSound(type, weaponId = "sentinel", distance = 0) {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (type === "shot" || type === "remoteShot") {
    playWeaponShot(ctx, weaponId, type === "remoteShot", distance);
    return;
  }
  if (type.startsWith("pickup") || type === "deploy") {
    playPickupSound(ctx, type, weaponId);
    return;
  }

  const now = ctx.currentTime;
  switch (type) {
    case "hit":
      playTone(ctx, { frequency: 920, endFrequency: 1340, type: "triangle", volume: 0.06, duration: 0.06, start: now });
      playTone(ctx, { frequency: 1480, type: "sine", volume: 0.03, duration: 0.04, start: now + 0.025 });
      playNoise(ctx, { volume: 0.025, duration: 0.05, filterType: "highpass", filterFrequency: 3800, start: now });
      break;
    case "hurt":
      playTone(ctx, { frequency: 72, endFrequency: 38, type: "sawtooth", volume: 0.07, duration: 0.28, start: now });
      playNoise(ctx, { volume: 0.05, duration: 0.22, filterType: "lowpass", filterFrequency: 320, start: now });
      playTone(ctx, { frequency: 220, endFrequency: 110, type: "triangle", volume: 0.025, duration: 0.18, start: now + 0.02 });
      break;
    case "dry":
      playTone(ctx, { frequency: 240, endFrequency: 170, type: "square", volume: 0.026, duration: 0.045, start: now });
      playNoise(ctx, { volume: 0.014, duration: 0.04, filterType: "highpass", filterFrequency: 2600, start: now + 0.012 });
      // Metal click follow-up
      playTone(ctx, { frequency: 3400, endFrequency: 2200, type: "square", volume: 0.012, duration: 0.025, start: now + 0.05 });
      break;
    case "switch":
      playTone(ctx, { frequency: 160, endFrequency: 290, type: "triangle", volume: 0.028, duration: 0.075, start: now });
      playNoise(ctx, { volume: 0.014, duration: 0.05, filterType: "highpass", filterFrequency: 1800, start: now + 0.03 });
      playTone(ctx, { frequency: 880, endFrequency: 540, type: "square", volume: 0.014, duration: 0.04, start: now + 0.06 });
      break;
    case "step":
      playStepSound(ctx);
      break;
    case "jump":
      playTone(ctx, { frequency: 320, endFrequency: 460, type: "triangle", volume: 0.022, duration: 0.09, start: now });
      playNoise(ctx, { volume: 0.014, duration: 0.06, filterType: "bandpass", filterFrequency: 900, start: now });
      break;
    case "land":
      playNoise(ctx, { volume: 0.05, duration: 0.18, filterType: "lowpass", filterFrequency: 320, start: now });
      playTone(ctx, { frequency: 90, endFrequency: 50, type: "sawtooth", volume: 0.04, duration: 0.16, start: now });
      break;
    default:
      break;
  }
}

function getAudioContext() {
  if (!state.audio) return null;
  if (state.audio.state === "suspended") {
    resumeAudioContext(state.audio);
  }
  return state.audio;
}

function resumeAudioContext(ctx) {
  const resume = ctx.resume?.();
  if (resume?.catch) {
    resume.catch(() => {});
  }
}

function playWeaponShot(ctx, weaponId, remote = false, distance = 0) {
  const id = WEAPONS[weaponId] ? weaponId : "sentinel";
  const profiles = {
    sentinel: { bass: 95, crack: 280, tail: 0.18, noise: 0.05, pop: 1900, body: 320, snap: 4200 },
    cyclone: { bass: 130, crack: 420, tail: 0.09, noise: 0.038, pop: 2500, body: 480, snap: 5200 },
    argus: { bass: 58, crack: 122, tail: 0.34, noise: 0.085, pop: 1100, body: 220, snap: 3000 },
    oracle: { bass: 50, crack: 148, tail: 0.42, noise: 0.05, pop: 2100, body: 280, snap: 4600 },
    phantom: { bass: 38, crack: 90, tail: 0.55, noise: 0.03, pop: 1800, body: 240, snap: 5800 }
  };
  const profile = profiles[id] || profiles.sentinel;
  const now = ctx.currentTime;
  const distanceAtten = remote ? clamp(1 - distance / 60, 0.18, 1) : 1;
  const scale = (remote ? 0.55 : 1) * distanceAtten;
  const reverb = state.audioBus?.reverbIn;

  // 1) Punch / sub - low body
  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.type = id === "cyclone" ? "square" : "sawtooth";
  subOsc.frequency.setValueAtTime(profile.bass, now);
  subOsc.frequency.exponentialRampToValueAtTime(Math.max(28, profile.bass * 0.4), now + profile.tail * 0.7);
  shapeEnvelope(subGain.gain, now, (id === "argus" ? 0.11 : 0.075) * scale, profile.tail);
  subOsc.connect(subGain).connect(state.audioBus?.dry || ctx.destination);
  if (reverb) subGain.connect(reverb);
  subOsc.start(now);
  subOsc.stop(now + profile.tail + 0.05);

  // 2) Body crack — mid frequency
  const bodyOsc = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  bodyOsc.type = "square";
  bodyOsc.frequency.setValueAtTime(profile.body, now);
  bodyOsc.frequency.exponentialRampToValueAtTime(profile.body * 0.5, now + 0.08);
  shapeEnvelope(bodyGain.gain, now, 0.04 * scale, 0.09);
  bodyOsc.connect(bodyGain).connect(state.audioBus?.dry || ctx.destination);
  if (reverb) bodyGain.connect(reverb);
  bodyOsc.start(now);
  bodyOsc.stop(now + 0.13);

  // 3) Snap — high transient
  playNoise(ctx, {
    volume: 0.04 * scale,
    duration: 0.025,
    filterType: "highpass",
    filterFrequency: profile.snap,
    start: now
  });

  // 4) Tail noise — gunpowder hiss
  playNoise(ctx, {
    volume: profile.noise * scale,
    duration: profile.tail,
    filterType: id === "argus" ? "lowpass" : "bandpass",
    filterFrequency: id === "argus" ? 900 : profile.pop,
    start: now + 0.005,
    sendReverb: true
  });

  // 5) Mech click — bolt cycling (cyclone, sentinel)
  if (id === "cyclone" || id === "sentinel") {
    playTone(ctx, {
      frequency: 3800,
      endFrequency: 1200,
      type: "square",
      volume: 0.012 * scale,
      duration: 0.025,
      start: now + 0.045
    });
  }

  // 6) Argus shell pump
  if (id === "argus") {
    playNoise(ctx, {
      volume: 0.02 * scale,
      duration: 0.05,
      filterType: "highpass",
      filterFrequency: 1600,
      start: now + 0.18
    });
    playTone(ctx, { frequency: 580, endFrequency: 220, type: "square", volume: 0.02 * scale, duration: 0.05, start: now + 0.21 });
  }

  // 7) Oracle whine
  if (id === "oracle") {
    playTone(ctx, { frequency: 720, endFrequency: 240, type: "triangle", volume: 0.04 * scale, duration: 0.22, start: now + 0.025 });
    playTone(ctx, { frequency: 1450, endFrequency: 380, type: "sawtooth", volume: 0.018 * scale, duration: 0.18, start: now + 0.03 });
  }

  // 8) Phantom supersonic crack + long tail
  if (id === "phantom") {
    playTone(ctx, { frequency: 3200, endFrequency: 180, type: "sawtooth", volume: 0.055 * scale, duration: 0.06, start: now });
    playTone(ctx, { frequency: 900, endFrequency: 60, type: "triangle", volume: 0.07 * scale, duration: 0.48, start: now + 0.01 });
    playTone(ctx, { frequency: 6500, endFrequency: 800, type: "sine", volume: 0.022 * scale, duration: 0.04, start: now + 0.002 });
  }
}

function playPickupSound(ctx, type, weaponId) {
  const now = ctx.currentTime;
  const weaponTone = { sentinel: 520, cyclone: 670, argus: 440, oracle: 840, phantom: 960 }[weaponId] || 620;
  const profiles = {
    pickupHealth: { a: 520, b: 760, c: 980, volume: 0.04 },
    pickupArmor: { a: 430, b: 640, c: 820, volume: 0.038 },
    pickupAmmo: { a: 610, b: 470, c: 720, volume: 0.034 },
    pickupWeapon: { a: 350, b: weaponTone, c: weaponTone * 1.25, volume: 0.044 },
    deploy: { a: 180, b: 420, c: 620, volume: 0.05 }
  };
  const profile = profiles[type] || profiles.pickupAmmo;
  playTone(ctx, { frequency: profile.a, endFrequency: profile.a * 1.08, type: "sine", volume: profile.volume, duration: 0.09, start: now });
  playTone(ctx, { frequency: profile.b, type: "triangle", volume: profile.volume * 0.78, duration: 0.12, start: now + 0.06 });
  playTone(ctx, { frequency: profile.c, type: "sine", volume: profile.volume * 0.5, duration: 0.1, start: now + 0.13 });
  if (type === "deploy") {
    playNoise(ctx, { volume: 0.022, duration: 0.26, filterType: "lowpass", filterFrequency: 480, start: now });
  }
}

function playStepSound(ctx) {
  const now = ctx.currentTime;
  const theme = state.arena.theme;
  let pitch = state.stepSide ? 132 : 112;
  let volume = 0.018;
  let filterFreq = 320;
  let filterType = "lowpass";
  if (theme === "coastal") {
    // Sand has muted, slightly higher hiss
    pitch = state.stepSide ? 92 : 78;
    volume = 0.022;
    filterFreq = 580;
    filterType = "bandpass";
  } else if (theme === "forest") {
    // Grass / leaves rustle — broader noise
    pitch = state.stepSide ? 108 : 92;
    volume = 0.02;
    filterFreq = 1100;
    filterType = "bandpass";
  }
  playNoise(ctx, { volume, duration: 0.08, filterType, filterFrequency: filterFreq, start: now });
  playTone(ctx, { frequency: pitch, endFrequency: pitch * 0.7, type: "triangle", volume: 0.011, duration: 0.05, start: now });
}

function playTone(ctx, { frequency, endFrequency, type = "sine", volume = 0.04, duration = 0.1, start = ctx.currentTime, sendReverb = false }) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const safeDuration = Math.max(duration, 0.02);
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(16, frequency), start);
  if (endFrequency) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(16, endFrequency), start + safeDuration * 0.86);
  }
  shapeEnvelope(gain.gain, start, volume, safeDuration);
  osc.connect(gain);
  gain.connect(state.audioBus?.dry || ctx.destination);
  if (sendReverb && state.audioBus?.reverbIn) {
    gain.connect(state.audioBus.reverbIn);
  }
  osc.start(start);
  osc.stop(start + safeDuration + 0.04);
}

function playNoise(ctx, { volume = 0.02, duration = 0.08, filterType = "highpass", filterFrequency = 1200, start = ctx.currentTime, sendReverb = false }) {
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  const safeDuration = Math.max(duration, 0.02);
  source.buffer = getNoiseBuffer(ctx);
  source.loop = true;
  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFrequency, start);
  filter.Q.setValueAtTime(0.72, start);
  shapeEnvelope(gain.gain, start, volume, safeDuration, 0.002);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(state.audioBus?.dry || ctx.destination);
  if (sendReverb && state.audioBus?.reverbIn) {
    gain.connect(state.audioBus.reverbIn);
  }
  source.start(start, Math.random() * 0.8);
  source.stop(start + safeDuration + 0.04);
}

function shapeEnvelope(param, start, volume, duration, attack = 0.004) {
  const safeVolume = Math.max(volume, 0.0001);
  const end = start + Math.max(duration, attack + 0.01);
  param.cancelScheduledValues(start);
  param.setValueAtTime(0.0001, start);
  if (attack > 0) {
    param.linearRampToValueAtTime(safeVolume, start + attack);
  } else {
    param.setValueAtTime(safeVolume, start);
  }
  param.exponentialRampToValueAtTime(0.0001, end);
}

function getNoiseBuffer(ctx) {
  if (noiseBuffers.has(ctx)) {
    return noiseBuffers.get(ctx);
  }
  const length = Math.floor(ctx.sampleRate * 1.5);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let value = 0;
  for (let index = 0; index < length; index += 1) {
    value = value * 0.72 + (Math.random() * 2 - 1) * 0.28;
    data[index] = value;
  }
  noiseBuffers.set(ctx, buffer);
  return buffer;
}

function isTouchDevice() {
  return window.matchMedia("(pointer: coarse)").matches;
}

function getSavedAvatarId() {
  const saved = localStorage.getItem("platinumeye.avatarId");
  return isAvatarId(saved) ? saved : DEFAULT_AVATAR_ID;
}

function getSavedMapId() {
  const saved = localStorage.getItem("platinumeye.mapId");
  return isMapId(saved) ? saved : DEFAULT_MAP_ID;
}

function getSavedBotCount() {
  return sanitizeBotCount(localStorage.getItem("platinumeye.botCount"));
}

function setBotCount(value) {
  const botCount = sanitizeBotCount(value);
  state.botCount = botCount;
  dom.botInput.value = String(botCount);
  localStorage.setItem("platinumeye.botCount", String(botCount));
  return botCount;
}

function sanitizeBotCount(value) {
  const count = Number.parseInt(value, 10);
  if (!Number.isFinite(count)) return TRAINING_BOT_COUNT;
  return Math.round(clamp(count, 0, MAX_BOTS_PER_ROOM));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpAngle(a, b, t) {
  const diff = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + diff * t;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}
