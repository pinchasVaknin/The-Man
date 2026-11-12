import type {
  EquippedToolSlot,
  ICharacterSkillsState,
  InventoryItemId,
  IPlayerState,
  IRideableHorseState
} from '../domain/worldTypes';
import { DEFAULT_STARTER_OWNED_ITEM_IDS } from '../domain/worldTypes';
import type { ISmallAnimalState } from './boidsAndWildlifeSystem';
import { resetActiveWorldBirds } from './boidsAndWildlifeSystem';
import { resetActiveTempleMonksState } from './monkTempleSystem';
import {
  configureSailableShipsForGameMode,
  getActiveSailableShip,
  getAllSailableShips,
  resetSailableShipState,
  setActiveSailableShipByTier,
  setSailableShipTransform
} from './sailableShipSystem';
import {
  RIDEABLE_HORSES,
  SAILABLE_SHIP_INITIAL_POS,
  SURVIVAL_CABIN_SPAWN,
  WORLD_SPAWN
} from '../domain/landmarksRegistry';
import { walkableHeightAt, walkableHeightValueAt } from './terrainAndBiomeSystem';
import { applyGameModeToPlayerState } from './playerPhysicsSystem';

export type GameWorldMode = 'survival' | 'creative';

export interface ISavedAnimalState {
  id: string;
  species: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  isTamed?: boolean;
  tamedTier?: number;
  customName?: string;
  isLooted?: boolean;
  isDead?: boolean;
}

export interface ISavedPlayerState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  health: number;
  maxHealth: number;
  stamina: number;
  hunger: number;
  isMounted: boolean;
  mountedAnimalId?: string | null;
  isMountedShip?: boolean;
  inventory?: Array<{ id: string; name: string; count: number; icon?: string }>;
  ownedItemIds?: InventoryItemId[];
  activeWeaponId?: InventoryItemId;
  equippedClothingId?: InventoryItemId;
  equippedTool?: EquippedToolSlot;
  hotbarSlots?: [
    InventoryItemId | null,
    InventoryItemId | null,
    InventoryItemId | null,
    InventoryItemId | null
  ];
  favoriteIds?: InventoryItemId[];
  chestContentsById?: Record<string, InventoryItemId[]>;
  merchantStockByStallId?: Record<string, Partial<Record<InventoryItemId, number>>>;
  skills?: ICharacterSkillsState;
  gold?: number;
  arrows?: number;
}

export interface ISavedShipState {
  tierId?: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  spawned?: boolean;
  rudderAngle?: number;
  sailTrim?: number;
  hasSteeringControl?: boolean;
}

export interface ISavedHorseState {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface IWorldSaveSnapshot {
  version: number;
  mode: GameWorldMode;
  savedAt: number;
  player: ISavedPlayerState;
  ship?: ISavedShipState | null;
  ships?: ISavedShipState[];
  animals?: ISavedAnimalState[];
  horses?: ISavedHorseState[];
  openDoors?: string[];
  openedChests?: string[];
  timeOfDayHours?: number;
}

const STORAGE_KEY_PREFIX = 'THE_MAN_WORLD_SAVE_';

/** In-memory fallback if localStorage is disabled or restricted in iframe */
const memoryStorage: Record<string, string> = {};

function getStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch {
    // ignore
  }
  return memoryStorage[key] || null;
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
  memoryStorage[key] = value;
}

export function getWorldSaveStorageKey(mode: GameWorldMode): string {
  return `${STORAGE_KEY_PREFIX}${mode.toUpperCase()}`;
}

export function saveWorldSnapshot(mode: GameWorldMode, snapshot: IWorldSaveSnapshot): void {
  const key = getWorldSaveStorageKey(mode);
  const data = {
    ...snapshot,
    mode,
    savedAt: Date.now(),
    version: 1
  };
  setStorageItem(key, JSON.stringify(data));
}

/**
 * Summary: Checks that a parsed save has a known mode and finite player transform before it is applied.
 * Design: Anything else is treated as missing, so a corrupt or old save falls back to the baseline world.
 */
function isUsableWorldSnapshot(value: unknown): value is IWorldSaveSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snap = value as Partial<IWorldSaveSnapshot>;
  if (snap.mode !== 'survival' && snap.mode !== 'creative') return false;
  const p = snap.player as Partial<ISavedPlayerState> | undefined;
  if (!p || typeof p !== 'object') return false;
  return [p.x, p.y, p.z, p.yaw, p.pitch].every((v) => typeof v === 'number' && Number.isFinite(v));
}

export function loadWorldSnapshot(mode: GameWorldMode): IWorldSaveSnapshot | null {
  const key = getWorldSaveStorageKey(mode);
  const raw = getStorageItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as IWorldSaveSnapshot;
    if (isUsableWorldSnapshot(parsed)) {
      return parsed;
    }
  } catch {
    // corrupt save, return null
  }
  return null;
}

export function clearWorldSave(mode: GameWorldMode): void {
  const key = getWorldSaveStorageKey(mode);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
  delete memoryStorage[key];
}

export function hasSavedWorldSnapshot(mode: GameWorldMode): boolean {
  return loadWorldSnapshot(mode) !== null;
}

/**
 * Returns default baseline spawn locations and states for fresh worlds if no save exists.
 */
export function getDefaultWorldBaseline(mode: GameWorldMode): IWorldSaveSnapshot {
  if (mode === 'creative') {
    const ground = walkableHeightAt(WORLD_SPAWN.x, WORLD_SPAWN.z);
    return {
      version: 1,
      mode: 'creative',
      savedAt: Date.now(),
      player: {
        x: WORLD_SPAWN.x,
        y: ground.height,
        z: WORLD_SPAWN.z,
        yaw: WORLD_SPAWN.yaw,
        pitch: WORLD_SPAWN.pitch,
        health: 500,
        maxHealth: 500,
        stamina: 100,
        hunger: 100,
        isMounted: false,
        gold: 280,
        arrows: 999,
        ownedItemIds: [...DEFAULT_STARTER_OWNED_ITEM_IDS],
        activeWeaponId: 'bow',
        equippedClothingId: 'ranger_garb',
        equippedTool: 'bow',
        hotbarSlots: ['bow', 'torch', 'sword', 'unarmed'],
        favoriteIds: ['bow', 'torch', 'sword', 'arrow_normal', 'arrow_fire', 'arrow_wind', 'unarmed'],
        chestContentsById: {}
      },
      ship: {
        tierId: 'royal_flagship',
        x: SAILABLE_SHIP_INITIAL_POS.homeX,
        y: SAILABLE_SHIP_INITIAL_POS.deckY,
        z: SAILABLE_SHIP_INITIAL_POS.homeZ,
        yaw: SAILABLE_SHIP_INITIAL_POS.homeYaw,
        speed: 0,
        spawned: true,
        hasSteeringControl: false
      },
      animals: [],
      horses: RIDEABLE_HORSES.map((h) => ({
        id: h.id,
        x: h.homeX,
        y: walkableHeightValueAt(h.homeX, h.homeZ),
        z: h.homeZ,
        yaw: h.homeYaw
      })),
      openDoors: [],
      openedChests: [],
      timeOfDayHours: 12
    };
  }

  const cabinGround = walkableHeightAt(SURVIVAL_CABIN_SPAWN.x, SURVIVAL_CABIN_SPAWN.z);
  return {
    version: 1,
    mode: 'survival',
    savedAt: Date.now(),
    player: {
      x: SURVIVAL_CABIN_SPAWN.x,
      y: cabinGround.height,
      z: SURVIVAL_CABIN_SPAWN.z,
      yaw: SURVIVAL_CABIN_SPAWN.yaw,
      pitch: SURVIVAL_CABIN_SPAWN.pitch,
      health: 100,
      maxHealth: 100,
      stamina: 100,
      hunger: 100,
      isMounted: false,
      gold: 0,
      arrows: 0,
      ownedItemIds: ['unarmed', 'simple_tunic'],
      activeWeaponId: 'unarmed',
      equippedClothingId: 'simple_tunic',
      equippedTool: 'unarmed',
      hotbarSlots: ['unarmed', null, null, null],
      favoriteIds: ['unarmed', 'simple_tunic'],
      chestContentsById: {}
    },
    ship: null,
    animals: [],
    horses: RIDEABLE_HORSES.map((h) => ({
      id: h.id,
      x: h.homeX,
      y: walkableHeightValueAt(h.homeX, h.homeZ),
      z: h.homeZ,
      yaw: h.homeYaw
    })),
    openDoors: [],
    openedChests: [],
    timeOfDayHours: 9
  };
}

/**
 * Captures full snapshot of live world systems for the currently active game mode.
 */
export function captureCurrentWorldSnapshot(
  mode: GameWorldMode,
  player: IPlayerState,
  horses: readonly IRideableHorseState[],
  animals: readonly ISmallAnimalState[],
  openDoorIds: ReadonlySet<string>,
  worldHours: number
): IWorldSaveSnapshot {
  const liveShip = getActiveSailableShip();
  const allShips = getAllSailableShips();
  const pAny = player as IPlayerState & { health?: number; maxHealth?: number; gold?: number };
  return {
    version: 1,
    mode,
    savedAt: Date.now(),
    player: {
      x: player.x,
      y: player.y,
      z: player.z,
      yaw: player.yaw,
      pitch: player.pitch,
      health: player.hp ?? pAny.health ?? 100,
      maxHealth: player.maxHp ?? pAny.maxHealth ?? 100,
      stamina: player.stamina ?? 100,
      hunger: player.hunger ?? 100,
      isMounted: Boolean(player.mountedHorseId),
      mountedAnimalId: player.mountedHorseId ?? null,
      isMountedShip: Boolean(
        player.mountedHorseId === 'sailable-ship' || player.mountedHorseId?.startsWith('sailable-ship-')
      ),
      gold: player.goldCoins ?? pAny.gold ?? (mode === 'creative' ? 280 : 0),
      arrows: 25,
      ownedItemIds: player.ownedItemIds ? [...player.ownedItemIds] : undefined,
      activeWeaponId: player.activeWeaponId,
      equippedClothingId: player.equippedClothingId,
      equippedTool: player.equippedTool,
      hotbarSlots: player.hotbarSlots ? [...player.hotbarSlots] : undefined,
      favoriteIds: player.favoriteIds ? [...player.favoriteIds] : undefined,
      chestContentsById: player.chestContentsById
        ? JSON.parse(JSON.stringify(player.chestContentsById))
        : {},
      merchantStockByStallId: player.merchantStockByStallId
        ? JSON.parse(JSON.stringify(player.merchantStockByStallId))
        : undefined,
      skills: player.skills ? { ...player.skills } : undefined
    },
    ship: {
      tierId: liveShip.tierId,
      x: liveShip.x,
      y: liveShip.deckY,
      z: liveShip.z,
      yaw: liveShip.yaw,
      speed: liveShip.speed,
      spawned: liveShip.spawned,
      rudderAngle: liveShip.wheelAngle,
      hasSteeringControl: Boolean(
        player.mountedHorseId === 'sailable-ship' || player.mountedHorseId?.startsWith('sailable-ship-')
      )
    },
    ships: allShips.map((s) => ({
      tierId: s.tierId,
      x: s.x,
      y: s.deckY,
      z: s.z,
      yaw: s.yaw,
      speed: s.speed,
      spawned: s.spawned
    })),
    animals: animals.map((a) => {
      const aAny = a as ISmallAnimalState & { tamedTier?: number; customName?: string };
      return {
        id: String(a.id),
        species: a.species,
        x: a.x,
        y: a.y,
        z: a.z,
        yaw: a.yaw,
        hp: a.hp ?? 50,
        maxHp: a.maxHp ?? 50,
        isTamed: Boolean(a.isTamed),
        tamedTier: aAny.tamedTier,
        customName: aAny.customName,
        isLooted: Boolean(a.isLooted),
        isDead: Boolean(a.isDead)
      };
    }),
    horses: horses.map((h) => ({
      id: h.id,
      x: h.x,
      y: h.y,
      z: h.z,
      yaw: h.yaw
    })),
    openDoors: Array.from(openDoorIds),
    openedChests: player.openedChestIds ? [...player.openedChestIds] : [],
    timeOfDayHours: worldHours
  };
}

/**
 * Applies a snapshot (from storage or fresh baseline) onto live mutable world systems,
 * cleanly separating Survival world state from Creative world state.
 */
export function applyWorldSnapshotToLiveSystems(
  snapshot: IWorldSaveSnapshot,
  player: IPlayerState,
  horses: IRideableHorseState[],
  animals: ISmallAnimalState[],
  openDoorIds: Set<string>
): void {
  const pAny = player as IPlayerState & { health?: number; maxHealth?: number; gold?: number };
  // 1. Restore Player Transform, Inventory, Chests & Vitals
  player.x = snapshot.player.x;
  player.y = snapshot.player.y;
  player.z = snapshot.player.z;
  player.yaw = snapshot.player.yaw;
  player.pitch = snapshot.player.pitch;
  player.vx = 0;
  player.vy = 0;
  player.vz = 0;
  player.hp = snapshot.player.health;
  pAny.health = snapshot.player.health;
  player.maxHp = snapshot.player.maxHealth;
  pAny.maxHealth = snapshot.player.maxHealth;
  player.stamina = snapshot.player.stamina;
  player.hunger = snapshot.player.hunger;
  player.goldCoins = snapshot.player.gold ?? (snapshot.mode === 'creative' ? 280 : 0);
  pAny.gold = player.goldCoins;
  player.openedChestIds = snapshot.openedChests ? [...snapshot.openedChests] : [];
  player.mountedHorseId = snapshot.player.mountedAnimalId ?? null;
  player.deathRespawnPhase = null;

  if (snapshot.player.ownedItemIds) {
    player.ownedItemIds = [...snapshot.player.ownedItemIds];
  }
  if (snapshot.player.activeWeaponId) {
    player.activeWeaponId = snapshot.player.activeWeaponId;
  }
  if (snapshot.player.equippedClothingId) {
    player.equippedClothingId = snapshot.player.equippedClothingId;
  }
  if (snapshot.player.equippedTool) {
    player.equippedTool = snapshot.player.equippedTool;
  }
  if (snapshot.player.hotbarSlots) {
    player.hotbarSlots = [...snapshot.player.hotbarSlots];
  }
  if (snapshot.player.favoriteIds) {
    player.favoriteIds = [...snapshot.player.favoriteIds];
  }
  if (snapshot.player.chestContentsById) {
    player.chestContentsById = JSON.parse(JSON.stringify(snapshot.player.chestContentsById));
  }
  if (snapshot.player.merchantStockByStallId) {
    player.merchantStockByStallId = JSON.parse(JSON.stringify(snapshot.player.merchantStockByStallId));
  }
  if (snapshot.player.skills) {
    player.skills = { ...snapshot.player.skills };
  }

  // 2. Restore Sailable Ships Fleet & Active Ship Transform
  if (snapshot.ships && snapshot.ships.length > 0) {
    const allShips = getAllSailableShips();
    for (let i = 0; i < allShips.length; i++) {
      const s = allShips[i];
      const savedShip = snapshot.ships.find((sh) => sh.tierId === s.tierId);
      if (savedShip) {
        s.x = savedShip.x;
        s.z = savedShip.z;
        s.yaw = savedShip.yaw;
        s.speed = savedShip.speed;
        s.spawned = Boolean(savedShip.spawned);
      }
    }
    if (snapshot.ship?.tierId) {
      setActiveSailableShipByTier(snapshot.ship.tierId);
    }
  } else if (snapshot.ship) {
    configureSailableShipsForGameMode(snapshot.mode === 'survival');
    setSailableShipTransform(
      snapshot.ship.x,
      snapshot.ship.z,
      snapshot.ship.yaw,
      horses,
      animals
    );
    const ship = getActiveSailableShip();
    ship.speed = snapshot.ship.speed;
    if (snapshot.ship.spawned !== undefined) {
      ship.spawned = snapshot.ship.spawned;
    }
  } else {
    configureSailableShipsForGameMode(snapshot.mode === 'survival');
  }

  // 3. Restore Wildlife Entities & Boss Taming Status
  if (snapshot.animals && snapshot.animals.length > 0) {
    const savedMap = new Map<string, ISavedAnimalState>();
    for (let i = 0; i < snapshot.animals.length; i++) {
      savedMap.set(String(snapshot.animals[i].id), snapshot.animals[i]);
    }
    for (let i = 0; i < animals.length; i++) {
      const a = animals[i];
      const aAny = a as ISmallAnimalState & { tamedTier?: number; customName?: string };
      const saved = savedMap.get(String(a.id));
      if (saved) {
        const isRelocatedBiomeHome =
          !saved.isTamed && Math.hypot(saved.x - a.homeX, saved.z - a.homeZ) > 110.0;
        if (isRelocatedBiomeHome) {
          a.x = a.homeX;
          a.z = a.homeZ;
          a.y = walkableHeightValueAt(a.homeX, a.homeZ);
        } else {
          a.x = saved.x;
          a.y = saved.y;
          a.z = saved.z;
          a.yaw = saved.yaw;
        }
        a.hp = saved.hp;
        a.maxHp = saved.maxHp;
        a.isTamed = Boolean(saved.isTamed);
        aAny.tamedTier = saved.tamedTier;
        aAny.customName = saved.customName;
        a.isLooted = Boolean(saved.isLooted);
        a.isDead = Boolean(saved.isDead || saved.hp <= 0);
        a.isSubdued = Boolean(saved.isTamed);
        if (a.isDead && !a.isBoss && a.species !== 'dragon') {
          a.respawnTimer = 45.0;
        }
      } else {
        a.isTamed = false;
        aAny.tamedTier = undefined;
        aAny.customName = undefined;
        a.isSubdued = false;
      }
    }
  } else {
    // Reset all animals to wild pristine state at their home coordinates
    for (let i = 0; i < animals.length; i++) {
      const a = animals[i];
      const aAny = a as ISmallAnimalState & { tamedTier?: number; customName?: string };
      a.x = a.homeX;
      a.z = a.homeZ;
      a.y = walkableHeightValueAt(a.homeX, a.homeZ);
      a.vx = 0;
      a.vz = 0;
      a.hp = a.maxHp ?? 50;
      a.isTamed = false;
      aAny.tamedTier = undefined;
      aAny.customName = undefined;
      a.isSubdued = false;
      a.isDead = false;
      a.isLooted = false;
      a.isMountedByPlayer = false;
      a.alertLevel = 'grazing';
      a.aiBehavior = 'grazing';
      a.respawnTimer = 0;
      a.wokenUpTimer = 0;
      a.actionTimer = 0;
      a.trappedByBearJawTimer = 0;
      a.bearTrapSlowTimer = 0;
      a.roarWarningDone = false;
      a.stompWarningDone = false;
    }
  }

  // 4. Restore Rideable Horses
  if (snapshot.horses && snapshot.horses.length > 0) {
    const horseMap = new Map<string, ISavedHorseState>();
    for (let i = 0; i < snapshot.horses.length; i++) {
      horseMap.set(snapshot.horses[i].id, snapshot.horses[i]);
    }
    for (let i = 0; i < horses.length; i++) {
      const h = horses[i];
      const saved = horseMap.get(h.id);
      if (saved) {
        h.x = saved.x;
        h.y = saved.y;
        h.z = saved.z;
        h.yaw = saved.yaw;
        h.speed = 0;
      }
    }
  } else {
    for (let i = 0; i < horses.length; i++) {
      const h = horses[i];
      const def = RIDEABLE_HORSES.find((d) => d.id === h.id);
      if (def) {
        h.x = def.homeX;
        h.z = def.homeZ;
        h.y = walkableHeightValueAt(def.homeX, def.homeZ);
        h.yaw = def.homeYaw;
        h.speed = 0;
      }
    }
  }

  // 5. Restore Doors
  openDoorIds.clear();
  if (snapshot.openDoors) {
    for (let i = 0; i < snapshot.openDoors.length; i++) {
      openDoorIds.add(snapshot.openDoors[i]);
    }
  }
}

/**
 * Completely resets a world mode ('survival' or 'creative') back to its factory initial state:
 * clears saved storage, resets player spawn/inventory/chests/skills, resets all ships,
 * returns all horses and wildlife/bosses to their home spawns, and closes all doors/chests.
 */
export function resetLiveWorldToFreshBaseline(
  mode: GameWorldMode,
  player: IPlayerState,
  horses: IRideableHorseState[],
  animals: ISmallAnimalState[],
  openDoorIds: Set<string>
): void {
  clearWorldSave(mode);
  const isSurvival = mode === 'survival';
  applyGameModeToPlayerState(player, isSurvival);
  player.merchantStockByStallId = {};
  player.deathRespawnPhase = null;
  player.skills = {
    archeryLevel: 1,
    archeryXp: 0,
    archeryXpNext: 240,
    swordsmanshipLevel: 1,
    swordsmanshipXp: 0,
    swordsmanshipXpNext: 240,
    horsemanshipLevel: 1,
    horsemanshipXp: 0,
    horsemanshipXpNext: 240,
    athleticsLevel: 1,
    athleticsXp: 0,
    athleticsXpNext: 240,
    explorationLevel: 1,
    explorationXp: 0,
    explorationXpNext: 240,
    lastLevelUpSkill: null,
    lastLevelUpTitle: null,
    lastLevelUpTimer: 0
  };

  configureSailableShipsForGameMode(isSurvival);
  if (!isSurvival) {
    resetSailableShipState();
  }

  for (let i = 0; i < horses.length; i++) {
    const h = horses[i];
    const def = RIDEABLE_HORSES.find((d) => d.id === h.id);
    if (def) {
      h.x = def.homeX;
      h.z = def.homeZ;
      h.y = walkableHeightValueAt(def.homeX, def.homeZ);
      h.yaw = def.homeYaw;
      h.speed = 0;
      h.stamina = h.maxStamina ?? 100;
    }
  }

  for (let i = 0; i < animals.length; i++) {
    const a = animals[i];
    const aAny = a as ISmallAnimalState & { tamedTier?: number; customName?: string };
    a.x = a.homeX;
    a.z = a.homeZ;
    a.y = walkableHeightValueAt(a.homeX, a.homeZ);
    a.vx = 0;
    a.vz = 0;
    a.hp = a.maxHp ?? 50;
    a.isTamed = false;
    aAny.tamedTier = undefined;
    aAny.customName = undefined;
    a.isSubdued = false;
    a.isDead = false;
    a.isLooted = false;
    a.isMountedByPlayer = false;
    a.alertLevel = 'grazing';
    a.aiBehavior = 'grazing';
    a.respawnTimer = 0;
    a.wokenUpTimer = 0;
    a.actionTimer = 0;
    a.trappedByBearJawTimer = 0;
    a.bearTrapSlowTimer = 0;
    a.roarWarningDone = false;
    a.stompWarningDone = false;
  }

  resetActiveWorldBirds();
  resetActiveTempleMonksState();

  openDoorIds.clear();
}
