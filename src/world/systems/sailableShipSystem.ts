// ============================================================================
// MODULE: World / Systems / Sailable Ship System
// DESIGN: Pure kinematic naval locomotion, passenger/animal transport, and deck collision (SRP)
// SUMMARY: Manages the Sailable Royal Explorer Flagship state, deck height resolution,
//          horse & animal deck transport, wave pitch/roll dynamics, and dock disembarkation.
// ============================================================================

import type { IPlayerInput, IPlayerState, IRideableHorseState } from '../domain/worldTypes';
import {
  PLAYABLE_RADIUS,
  RUINED_ATLANTIS_POS,
  SAILABLE_SHIP_INITIAL_POS,
  SOUTHEAST_HARBOR_POS,
} from '../domain/landmarksRegistry';

export type ShipTierId = 'sloop' | 'caravel' | 'galleon' | 'royal_flagship';

export interface IShipCatalogDef {
  readonly tierId: ShipTierId;
  readonly id: string;
  readonly name: string;
  readonly priceGold: number;
  readonly maxForwardSpeed: number;
  readonly sprintForwardSpeed: number;
  readonly deckY: number;
  readonly halfW: number;
  readonly halfL: number;
  readonly scale: number;
  readonly mastCount: 1 | 2 | 3;
  readonly hullColorHex: number;
  readonly sailColorHex: number;
  readonly trimColorHex: number;
  readonly description: string;
}

export const SHIP_CATALOG: readonly IShipCatalogDef[] = [
  {
    tierId: 'sloop',
    id: 'sailable-ship-sloop',
    name: 'Coastal Sloop',
    priceGold: 150,
    maxForwardSpeed: 18.0,
    sprintForwardSpeed: 25.0,
    deckY: SAILABLE_SHIP_INITIAL_POS.deckY,
    halfW: 2.8,
    halfL: 7.4,
    scale: 0.72,
    mastCount: 1,
    hullColorHex: 0x5c3c24,
    sailColorHex: 0xe2d9c8,
    trimColorHex: 0x8b5a2b,
    description: 'Light single-masted coastal sloop built for nimble and fast shoreline sailing.',
  },
  {
    tierId: 'caravel',
    id: 'sailable-ship-caravel',
    name: 'Explorer Caravel',
    priceGold: 420,
    maxForwardSpeed: 21.0,
    sprintForwardSpeed: 29.5,
    deckY: SAILABLE_SHIP_INITIAL_POS.deckY,
    halfW: 3.3,
    halfL: 8.8,
    scale: 0.86,
    mastCount: 2,
    hullColorHex: 0x4a2f1b,
    sailColorHex: 0xf5ebd6,
    trimColorHex: 0xb45309,
    description: 'Agile twin-masted exploration caravel with a wide deck for mounts and provisions.',
  },
  {
    tierId: 'galleon',
    id: 'sailable-ship-galleon',
    name: 'Imperial War Galleon',
    priceGold: 950,
    maxForwardSpeed: 24.0,
    sprintForwardSpeed: 34.0,
    deckY: SAILABLE_SHIP_INITIAL_POS.deckY,
    halfW: 3.85,
    halfL: 10.2,
    scale: 1.0,
    mastCount: 2,
    hullColorHex: 0x3b2313,
    sailColorHex: 0xfaf0dc,
    trimColorHex: 0x991b1b,
    description: 'Armored war galleon outfitted with bronze broadside cannons and a heavy cargo deck.',
  },
  {
    tierId: 'royal_flagship',
    id: 'sailable-ship',
    name: 'Atlantean Royal Flagship',
    priceGold: 1850,
    maxForwardSpeed: 28.0,
    sprintForwardSpeed: 40.0,
    deckY: SAILABLE_SHIP_INITIAL_POS.deckY,
    halfW: SAILABLE_SHIP_INITIAL_POS.halfW,
    halfL: SAILABLE_SHIP_INITIAL_POS.halfL,
    scale: 1.12,
    mastCount: 2,
    hullColorHex: 0x2d1a0e,
    sailColorHex: 0xfffbeb,
    trimColorHex: 0xd97706,
    description: 'The grandest flagship of the fleet: gilded orichalcum trim, Atlantean wayfinder compass, and top ocean speed.',
  },
] as const;

export interface ISailableShipState {
  id: string;
  tierId: ShipTierId;
  name: string;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  deckY: number;
  halfW: number;
  halfL: number;
  scale: number;
  priceGold: number;
  maxForwardSpeed: number;
  sprintForwardSpeed: number;
  description: string;
  spawned: boolean;
  rollAngle: number;
  pitchAngle: number;
  wheelAngle: number;
  wakePhase: number;
}

export interface IShipPassengerEntity {
  x: number;
  y: number;
  z: number;
  yaw: number;
  vx?: number;
  vy?: number;
  vz?: number;
  speed?: number;
  homeX?: number;
  homeZ?: number;
  inWater?: boolean;
  species?: string;
  isDead?: boolean;
}

function createShipStateFromDef(def: IShipCatalogDef, spawned: boolean): ISailableShipState {
  return {
    id: def.id,
    tierId: def.tierId,
    name: def.name,
    x: SAILABLE_SHIP_INITIAL_POS.homeX,
    z: SAILABLE_SHIP_INITIAL_POS.homeZ,
    yaw: SAILABLE_SHIP_INITIAL_POS.homeYaw,
    speed: 0,
    deckY: def.deckY,
    halfW: def.halfW,
    halfL: def.halfL,
    scale: def.scale,
    priceGold: def.priceGold,
    maxForwardSpeed: def.maxForwardSpeed,
    sprintForwardSpeed: def.sprintForwardSpeed,
    description: def.description,
    spawned,
    rollAngle: 0,
    pitchAngle: 0,
    wheelAngle: 0,
    wakePhase: 0,
  };
}

const allShipsRegistry: ISailableShipState[] = SHIP_CATALOG.map((def) =>
  createShipStateFromDef(def, def.tierId === 'royal_flagship')
);

let activeSailableShip: ISailableShipState =
  allShipsRegistry.find((s) => s.tierId === 'royal_flagship') ?? allShipsRegistry[0];

/**
 * Summary: Returns all 4 ship tier states (both spawned/owned and unspawned).
 */
export function getAllSailableShips(): readonly ISailableShipState[] {
  return allShipsRegistry;
}

/**
 * Summary: Returns only the ships currently owned/spawned in the ocean.
 */
export function getSpawnedSailableShips(): ISailableShipState[] {
  return allShipsRegistry.filter((s) => s.spawned);
}

/**
 * Summary: Returns the live mutable state of the currently active Sailable Ship.
 */
export function getActiveSailableShip(): ISailableShipState {
  return activeSailableShip;
}

/**
 * Summary: Selects which ship tier is the active sailable ship (e.g., when boarding one of the owned ships).
 */
export function setActiveSailableShipByTier(tierOrId: ShipTierId | string): ISailableShipState {
  const found = allShipsRegistry.find((s) => s.tierId === tierOrId || s.id === tierOrId);
  if (found) {
    activeSailableShip = found;
  }
  return activeSailableShip;
}

/**
 * Summary: Configures initial ship availability for Survival Mode (starts with 0 ships until bought)
 *          versus God Mode (starts with the Royal Flagship moored at the dock).
 */
export function configureSailableShipsForGameMode(survivalMode: boolean): void {
  for (let i = 0; i < allShipsRegistry.length; i++) {
    const s = allShipsRegistry[i];
    s.x = SAILABLE_SHIP_INITIAL_POS.homeX;
    s.z = SAILABLE_SHIP_INITIAL_POS.homeZ;
    s.yaw = SAILABLE_SHIP_INITIAL_POS.homeYaw;
    s.speed = 0;
    s.rollAngle = 0;
    s.pitchAngle = 0;
    s.wheelAngle = 0;
    s.wakePhase = 0;
    s.spawned = !survivalMode && s.tierId === 'royal_flagship';
  }
  activeSailableShip =
    allShipsRegistry.find((s) => s.tierId === 'royal_flagship') ?? allShipsRegistry[0];
}

/**
 * Summary: Checks if any spawned ship is currently moored within `clearanceRadius` of the Harbor Ship Pier
 *          spawn point, preventing a newly purchased ship from spawning on top of an existing ship.
 */
export function isHarborShipDockOccupied(clearanceRadius = 18.0): ISailableShipState | null {
  for (let i = 0; i < allShipsRegistry.length; i++) {
    const s = allShipsRegistry[i];
    if (!s.spawned) continue;
    const dist = Math.hypot(
      s.x - SAILABLE_SHIP_INITIAL_POS.homeX,
      s.z - SAILABLE_SHIP_INITIAL_POS.homeZ
    );
    if (dist <= clearanceRadius) {
      return s;
    }
  }
  return null;
}

/**
 * Summary: Purchases and spawns a ship tier from the Harbor Galleon Shipwright vendor.
 *          Enforces:
 *          1) Max 1 ship per tier (`ALREADY_OWNED`)
 *          2) Dock clearance radius check (`DOCK_OCCUPIED`)
 *          3) Free in God Mode vs gold cost in Survival Mode (`INSUFFICIENT_GOLD`)
 */
export function buyOrSpawnShipFromShipwright(
  player: IPlayerState,
  tierId: ShipTierId | string,
  godMode: boolean
): {
  ok: boolean;
  code?: 'ALREADY_OWNED' | 'DOCK_OCCUPIED' | 'INSUFFICIENT_GOLD' | 'INVALID_TIER';
  message: string;
  ship?: ISailableShipState;
} {
  const ship = allShipsRegistry.find((s) => s.tierId === tierId || s.id === tierId);
  if (!ship) {
    return {
      ok: false,
      code: 'INVALID_TIER',
      message: 'Ship tier not found in the shipyard catalog.',
    };
  }
  if (ship.spawned) {
    return {
      ok: false,
      code: 'ALREADY_OWNED',
      message: `You already own the ${ship.name}! Only one ship of each class can be owned.`,
    };
  }
  const blockingShip = isHarborShipDockOccupied(18.0);
  if (blockingShip) {
    return {
      ok: false,
      code: 'DOCK_OCCUPIED',
      message: `The Harbor Pier is currently occupied by ${blockingShip.name}! Sail it away from the dock before launching another ship.`,
    };
  }
  const cost = godMode ? 0 : ship.priceGold;
  const currentGold = player.goldCoins ?? 0;
  if (!godMode && currentGold < cost) {
    return {
      ok: false,
      code: 'INSUFFICIENT_GOLD',
      message: `Insufficient Gold to purchase ${ship.name} (Required: ${cost} Gold, Owned: ${currentGold} Gold).`,
    };
  }
  if (!godMode) {
    player.goldCoins = Math.max(0, currentGold - cost);
  }
  ship.spawned = true;
  ship.x = SAILABLE_SHIP_INITIAL_POS.homeX;
  ship.z = SAILABLE_SHIP_INITIAL_POS.homeZ;
  ship.yaw = SAILABLE_SHIP_INITIAL_POS.homeYaw;
  ship.speed = 0;
  ship.rollAngle = 0;
  ship.pitchAngle = 0;
  ship.wheelAngle = 0;
  activeSailableShip = ship;
  return {
    ok: true,
    ship,
    message: godMode
      ? `Commissioned ${ship.name} for free (God Mode)! Now moored at the Southern Harbor Pier.`
      : `Purchased ${ship.name} for ${cost} Gold! Now moored at the Southern Harbor Pier.`,
  };
}

/**
 * Summary: Resets the active sailable ship back to its home Harbor Pier mooring.
 */
export function resetSailableShipState(): ISailableShipState {
  activeSailableShip.spawned = true;
  activeSailableShip.x = SAILABLE_SHIP_INITIAL_POS.homeX;
  activeSailableShip.z = SAILABLE_SHIP_INITIAL_POS.homeZ;
  activeSailableShip.yaw = SAILABLE_SHIP_INITIAL_POS.homeYaw;
  activeSailableShip.speed = 0;
  activeSailableShip.rollAngle = 0;
  activeSailableShip.pitchAngle = 0;
  activeSailableShip.wheelAngle = 0;
  activeSailableShip.wakePhase = 0;
  return activeSailableShip;
}

/**
 * Summary: Finds which spawned sailable ship (if any) contains the world point (x, y, z) on its deck.
 */
export function findSailableShipContainingPoint(
  x: number,
  z: number,
  y?: number,
  margin = 0.85
): ISailableShipState | null {
  for (let i = 0; i < allShipsRegistry.length; i++) {
    const s = allShipsRegistry[i];
    if (!s.spawned) continue;
    if (isEntityOnSailableShipDeck(x, z, y, s, margin)) {
      return s;
    }
  }
  return null;
}

/**
 * Summary: Checks whether an entity (horse, animal, or player) at world (x, y, z)
 *          is standing on a Sailable Ship's deck.
 */
export function isEntityOnSailableShipDeck(
  x: number,
  z: number,
  y?: number,
  ship?: ISailableShipState,
  margin = 0.85
): boolean {
  const checkSingleShip = (s: ISailableShipState): boolean => {
    if (!s.spawned) return false;
    if (y !== undefined && Math.abs(y - s.deckY) > 3.6) {
      return false;
    }
    const dx = x - s.x;
    const dz = z - s.z;
    if (dx * dx + dz * dz > 240.0) {
      return false;
    }
    const cosY = Math.cos(s.yaw);
    const sinY = Math.sin(s.yaw);
    const lx = dx * cosY - dz * sinY;
    const lz = dx * sinY + dz * cosY;
    return Math.abs(lx) <= s.halfW + margin && Math.abs(lz) <= s.halfL + margin;
  };

  if (ship) {
    return checkSingleShip(ship);
  }
  for (let i = 0; i < allShipsRegistry.length; i++) {
    if (checkSingleShip(allShipsRegistry[i])) return true;
  }
  return false;
}

/**
 * Summary: Evaluates the walkable wooden deck height of any spawned Sailable Ship at world (x, z),
 *          including the raised aft helm quarterdeck, Harbor boarding jetty, and Atlantis gangplank.
 */
export function sailableShipDeckHeightAt(
  x: number,
  z: number,
  currentY?: number,
  ship?: ISailableShipState
): number | null {
  // 1) Harbor Southern Royal Ship Pier (x: 254.0..274.8, z: 278.8..285.2) connecting Harbor Plaza to Ship's home berth
  if (
    x >= 254.0 &&
    x <= 274.8 &&
    Math.abs(z - SAILABLE_SHIP_INITIAL_POS.homeZ) <= 3.2 &&
    (currentY === undefined || currentY >= 2.0)
  ) {
    const tPier = Math.max(0, Math.min(1, (x - 254.5) / 19.0));
    return (
      SOUTHEAST_HARBOR_POS.plazaY * (1 - tPier) +
      SAILABLE_SHIP_INITIAL_POS.deckY * tPier
    );
  }

  const evalSingleShipDeck = (s: ISailableShipState): number | null => {
    if (!s.spawned) return null;
    // 2) Live Sailable Ship Hull Deck & Raised Aft Quarterdeck
    const dx = x - s.x;
    const dz = z - s.z;
    if (dx * dx + dz * dz <= 225.0) {
      const cosY = Math.cos(s.yaw);
      const sinY = Math.sin(s.yaw);
      const lx = dx * cosY - dz * sinY;
      const lz = dx * sinY + dz * cosY;

      if (Math.abs(lx) <= s.halfW && Math.abs(lz) <= s.halfL) {
        let targetDeckY = s.deckY;
        const quarterStartLz = 2.6 * (s.scale ?? 1.0);
        if (lz >= quarterStartLz) {
          const tQuarter = Math.max(0, Math.min(1, (lz - quarterStartLz) / 2.0));
          targetDeckY = s.deckY + tQuarter * 0.55;
        }
        if (currentY === undefined || currentY >= s.deckY - 1.5) {
          return targetDeckY;
        }
      }
    }

    // 3) Automatic Atlantis Boarding Gangplank when moored near Ruined Atlantis Western Dock
    const distShipToAtlantisDock = Math.hypot(
      s.x - RUINED_ATLANTIS_POS.dockX,
      s.z - RUINED_ATLANTIS_POS.dockZ
    );
    if (distShipToAtlantisDock <= 24.0 && (currentY === undefined || currentY >= 1.4)) {
      const ax = s.x;
      const az = s.z;
      const bx = RUINED_ATLANTIS_POS.dockX + 2.0;
      const bz = RUINED_ATLANTIS_POS.dockZ;
      const vx = bx - ax;
      const vz = bz - az;
      const lenSq = vx * vx + vz * vz;
      if (lenSq > 0.01) {
        const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / lenSq));
        const px = ax + t * vx;
        const pz = az + t * vz;
        if (Math.hypot(x - px, z - pz) <= 3.4) {
          return s.deckY * (1 - t) + RUINED_ATLANTIS_POS.dockY * t;
        }
      }
    }
    return null;
  };

  if (ship) {
    return evalSingleShipDeck(ship);
  }
  for (let i = 0; i < allShipsRegistry.length; i++) {
    const h = evalSingleShipDeck(allShipsRegistry[i]);
    if (h !== null) return h;
  }
  return null;
}

/**
 * Summary: Transports any horses or animals standing on the Sailable Ship deck so they move and rotate
 *          rigidly with the ship as it sails across the ocean, clamping them safely inside the deck rails.
 */
export function carryPassengersOnSailableShip(
  prevX: number,
  prevZ: number,
  prevYaw: number,
  ship: ISailableShipState = activeSailableShip,
  horses?: readonly IRideableHorseState[],
  worldAnimals?: readonly IShipPassengerEntity[]
): void {
  if (!ship.spawned) return;
  const cosPrev = Math.cos(prevYaw);
  const sinPrev = Math.sin(prevYaw);
  const cosNew = Math.cos(ship.yaw);
  const sinNew = Math.sin(ship.yaw);
  const deltaYaw = Math.atan2(Math.sin(ship.yaw - prevYaw), Math.cos(ship.yaw - prevYaw));

  const maxLx = Math.max(1.2, ship.halfW - 0.75);
  const maxLz = Math.max(2.5, ship.halfL - 1.15);

  const transformPassenger = (p: IShipPassengerEntity) => {
    if (p.species === 'dragon') return;
    const dx = p.x - prevX;
    const dz = p.z - prevZ;
    if (dx * dx + dz * dz > 240.0) return;
    if (Math.abs(p.y - ship.deckY) > 3.6) return;

    const lx = dx * cosPrev - dz * sinPrev;
    const lz = dx * sinPrev + dz * cosPrev;
    if (Math.abs(lx) <= ship.halfW + 0.95 && Math.abs(lz) <= ship.halfL + 0.95) {
      const clampedLx = Math.max(-maxLx, Math.min(maxLx, lx));
      const clampedLz = Math.max(-maxLz, Math.min(maxLz, lz));
      const newX = ship.x + clampedLx * cosNew + clampedLz * sinNew;
      const newZ = ship.z - clampedLx * sinNew + clampedLz * cosNew;
      p.x = newX;
      p.z = newZ;
      p.yaw = Math.atan2(Math.sin(p.yaw + deltaYaw), Math.cos(p.yaw + deltaYaw));
      p.y = sailableShipDeckHeightAt(newX, newZ, p.y, ship) ?? ship.deckY;
      if (p.vx !== undefined) p.vx = 0;
      if (p.vy !== undefined) p.vy = 0;
      if (p.vz !== undefined) p.vz = 0;
      if (p.speed !== undefined) p.speed = 0;
      if (p.homeX !== undefined) p.homeX = newX;
      if (p.homeZ !== undefined) p.homeZ = newZ;
      if (p.inWater !== undefined) p.inWater = false;
    }
  };

  if (horses) {
    for (let i = 0; i < horses.length; i++) {
      const h = horses[i];
      if (h.id === ship.id || h.id.startsWith('sailable-ship')) continue;
      transformPassenger(h);
    }
  }

  if (worldAnimals) {
    for (let i = 0; i < worldAnimals.length; i++) {
      transformPassenger(worldAnimals[i]);
    }
  }
}

/**
 * Summary: Teleports or re-orients the sailable ship to specific ocean coordinates,
 *          carrying any onboard horses and animals along with the ship.
 */
export function setSailableShipTransform(
  x: number,
  z: number,
  yaw?: number,
  horses?: readonly IRideableHorseState[],
  worldAnimals?: readonly IShipPassengerEntity[]
): void {
  activeSailableShip.spawned = true;
  const prevX = activeSailableShip.x;
  const prevZ = activeSailableShip.z;
  const prevYaw = activeSailableShip.yaw;
  activeSailableShip.x = x;
  activeSailableShip.z = z;
  if (yaw !== undefined) {
    activeSailableShip.yaw = yaw;
  }
  activeSailableShip.speed = 0;
  carryPassengersOnSailableShip(prevX, prevZ, prevYaw, activeSailableShip, horses, worldAnimals);
}

/**
 * Summary: Places a horse or mount inside a numbered slot on the ship's deck, or keeps it at its
 *          current deck position without overlapping other animals when dismounted.
 */
export function stationMountInSailableShipStall(
  mount: IShipPassengerEntity,
  slotIndex = 0,
  ship: ISailableShipState = activeSailableShip
): void {
  const cosY = Math.cos(ship.yaw);
  const sinY = Math.sin(ship.yaw);
  const stallLx = (slotIndex % 2 === 0 ? -1 : 1) * 1.45;
  const stallLz = -2.8 - Math.floor(slotIndex / 2) * 2.4;
  mount.x = ship.x + stallLx * cosY + stallLz * sinY;
  mount.z = ship.z - stallLx * sinY + stallLz * cosY;
  mount.y = ship.deckY;
  mount.yaw = ship.yaw;
  if (mount.vx !== undefined) mount.vx = 0;
  if (mount.vy !== undefined) mount.vy = 0;
  if (mount.vz !== undefined) mount.vz = 0;
  if (mount.speed !== undefined) mount.speed = 0;
  if (mount.homeX !== undefined) mount.homeX = mount.x;
  if (mount.homeZ !== undefined) mount.homeZ = mount.z;
  if (mount.inWater !== undefined) mount.inWater = false;
}

/**
 * Summary: Keeps a dismounted animal right where the player leaves it on the ship's deck,
 *          and if another animal is already standing at that exact spot (< 1.75m), shifts it
 *          to a nearby free deck slot so animals never stack on top of each other.
 */
export function placeMountOnShipDeckWithoutStacking(
  mount: IShipPassengerEntity,
  ship: ISailableShipState = activeSailableShip,
  horses?: readonly IRideableHorseState[],
  worldAnimals?: readonly IShipPassengerEntity[]
): void {
  const cosY = Math.cos(ship.yaw);
  const sinY = Math.sin(ship.yaw);
  const dx = mount.x - ship.x;
  const dz = mount.z - ship.z;
  const maxLx = Math.max(1.1, ship.halfW - 0.85);
  const maxLz = Math.max(2.0, ship.halfL - 1.6);

  let lx = Math.max(-maxLx, Math.min(maxLx, dx * cosY - dz * sinY));
  let lz = Math.max(-maxLz, Math.min(1.8, dx * sinY + dz * cosY));

  const isSpotOccupied = (candX: number, candZ: number): boolean => {
    if (horses) {
      for (let i = 0; i < horses.length; i++) {
        const h = horses[i];
        if ((h as unknown) === (mount as unknown) || h.id.startsWith('sailable-ship')) continue;
        if (Math.hypot(h.x - candX, h.z - candZ) < 1.75 && Math.abs(h.y - ship.deckY) < 2.8) {
          return true;
        }
      }
    }
    if (worldAnimals) {
      for (let i = 0; i < worldAnimals.length; i++) {
        const a = worldAnimals[i];
        if ((a as unknown) === (mount as unknown) || a.isDead) continue;
        if (Math.hypot(a.x - candX, a.z - candZ) < 1.75 && Math.abs(a.y - ship.deckY) < 2.8) {
          return true;
        }
      }
    }
    return false;
  };

  let targetX = ship.x + lx * cosY + lz * sinY;
  let targetZ = ship.z - lx * sinY + lz * cosY;

  if (isSpotOccupied(targetX, targetZ)) {
    const candidateOffsets: ReadonlyArray< readonly [number, number]> = [
      [-1.55, -1.6],
      [1.55, -1.6],
      [-1.55, -3.8],
      [1.55, -3.8],
      [0.0, -2.7],
      [-1.55, 0.4],
      [1.55, 0.4],
      [0.0, -5.0],
    ];
    for (let c = 0; c < candidateOffsets.length; c++) {
      const [clx, clz] = candidateOffsets[c];
      const clampedCandLx = Math.max(-maxLx, Math.min(maxLx, clx));
      const clampedCandLz = Math.max(-maxLz, Math.min(maxLz, clz));
      const cx = ship.x + clampedCandLx * cosY + clampedCandLz * sinY;
      const cz = ship.z - clampedCandLx * sinY + clampedCandLz * cosY;
      if (!isSpotOccupied(cx, cz)) {
        targetX = cx;
        targetZ = cz;
        break;
      }
    }
  }

  mount.x = targetX;
  mount.z = targetZ;
  mount.y = sailableShipDeckHeightAt(targetX, targetZ, ship.deckY, ship) ?? ship.deckY;
  if (mount.vx !== undefined) mount.vx = 0;
  if (mount.vy !== undefined) mount.vy = 0;
  if (mount.vz !== undefined) mount.vz = 0;
  if (mount.speed !== undefined) mount.speed = 0;
  if (mount.homeX !== undefined) mount.homeX = mount.x;
  if (mount.homeZ !== undefined) mount.homeZ = mount.z;
  if (mount.inWater !== undefined) mount.inWater = false;
}

/**
 * Summary: Computes the safest disembark position when the player presses [F] to leave the helm.
 *          Prioritizes the Ruined Atlantis Western Dock or Harbor Pier when moored nearby,
 *          or places the player on the ship's main deck next to the animal stall when anchored at sea.
 */
export function findSailableShipDisembarkPoint(
  ship: ISailableShipState = activeSailableShip
): { x: number; y: number; z: number } {
  const distToAtlantisDock = Math.hypot(
    ship.x - RUINED_ATLANTIS_POS.dockX,
    ship.z - RUINED_ATLANTIS_POS.dockZ
  );
  if (distToAtlantisDock <= 24.0) {
    return {
      x: RUINED_ATLANTIS_POS.dockX + 3.0,
      y: RUINED_ATLANTIS_POS.dockY,
      z: RUINED_ATLANTIS_POS.dockZ,
    };
  }

  const distToHarborPier = Math.hypot(
    ship.x - SAILABLE_SHIP_INITIAL_POS.homeX,
    ship.z - SAILABLE_SHIP_INITIAL_POS.homeZ
  );
  if (distToHarborPier <= 22.0) {
    return {
      x: 268.0,
      y: 3.02,
      z: SAILABLE_SHIP_INITIAL_POS.homeZ,
    };
  }

  return {
    x: ship.x,
    y: ship.deckY,
    z: ship.z,
  };
}

/**
 * Summary: Steps naval sailing physics for the Sailable Ship while helmed by the player,
 *          and transports all onboard horses & animals along with the moving hull.
 */
export function stepSailableShipPhysics(
  state: IPlayerState,
  input: IPlayerInput,
  dt: number,
  isNavigableWaterAt: (x: number, z: number) => boolean,
  ship: ISailableShipState = activeSailableShip,
  horses?: readonly IRideableHorseState[],
  worldAnimals?: readonly IShipPassengerEntity[]
): void {
  const prevX = ship.x;
  const prevZ = ship.z;
  const prevYaw = ship.yaw;

  // 1) Rudder steering (A/D or Left/Right)
  const steerInput = input.right;
  const speedFactor = 0.45 + 0.55 * Math.min(1.0, Math.abs(ship.speed) / 10.0);
  const reverseSign = ship.speed < -0.5 ? -1.0 : 1.0;
  const turnRate = 1.25 * speedFactor * reverseSign;
  const yawDelta = -steerInput * turnRate * dt;

  ship.yaw = Math.atan2(Math.sin(ship.yaw + yawDelta), Math.cos(ship.yaw + yawDelta));
  state.yaw = Math.atan2(Math.sin(state.yaw + yawDelta), Math.cos(state.yaw + yawDelta));
  state.mountedHorseYaw = ship.yaw;

  // Spin the ship's helm wheel proportionally to steering input
  const targetWheel = -steerInput * 1.85;
  ship.wheelAngle += (targetWheel - ship.wheelAngle) * (1.0 - Math.exp(-8.0 * dt));

  // 2) Sail throttle propulsion (W/S + Shift for Full Royal Wind) scaled by ship tier
  const maxForwardSpeed = input.sprint
    ? (ship.sprintForwardSpeed ?? 32.0)
    : (ship.maxForwardSpeed ?? 20.5);
  const maxReverseSpeed = 8.5;
  let targetSpeed = 0;
  if (input.forward > 0.05) {
    targetSpeed = input.forward * maxForwardSpeed;
  } else if (input.forward < -0.05) {
    targetSpeed = input.forward * maxReverseSpeed;
  }

  const accelRate = Math.abs(targetSpeed) > Math.abs(ship.speed) ? 3.8 : 2.6;
  ship.speed += (targetSpeed - ship.speed) * (1.0 - Math.exp(-accelRate * dt));
  if (Math.abs(targetSpeed) < 0.01 && Math.abs(ship.speed) < 0.04) {
    ship.speed = 0;
  }

  // 3) Advance position along ship heading (-sin(yaw), -cos(yaw)) with coastal collision sliding
  const fwdX = -Math.sin(ship.yaw);
  const fwdZ = -Math.cos(ship.yaw);
  const vx = fwdX * ship.speed;
  const vz = fwdZ * ship.speed;

  let nextX = ship.x + vx * dt;
  let nextZ = ship.z + vz * dt;

  if (!isNavigableWaterAt(nextX, nextZ)) {
    const canSlideX = isNavigableWaterAt(nextX, ship.z);
    const canSlideZ = isNavigableWaterAt(ship.x, nextZ);
    if (canSlideX && !canSlideZ) {
      nextZ = ship.z;
      ship.speed *= 0.85;
    } else if (canSlideZ && !canSlideX) {
      nextX = ship.x;
      ship.speed *= 0.85;
    } else {
      nextX = ship.x;
      nextZ = ship.z;
      ship.speed = 0;
    }
  }

  const distFromCenter = Math.hypot(nextX, nextZ);
  if (distFromCenter > PLAYABLE_RADIUS - 12.0) {
    const scaleBack = (PLAYABLE_RADIUS - 12.0) / distFromCenter;
    nextX *= scaleBack;
    nextZ *= scaleBack;
  }

  const stepDist = Math.hypot(nextX - ship.x, nextZ - ship.z);
  ship.x = nextX;
  ship.z = nextZ;
  ship.wakePhase += (1.8 + Math.abs(ship.speed) * 0.35) * dt;

  // Wave pitch and turn banking roll
  const targetRoll =
    steerInput * Math.min(0.085, (Math.abs(ship.speed) / 22.0) * 0.085) +
    Math.sin(ship.wakePhase * 0.9) * 0.018;
  const targetPitch =
    Math.cos(ship.wakePhase * 1.1) * 0.022 +
    Math.min(0.035, Math.max(-0.02, ship.speed * 0.0014));
  ship.rollAngle += (targetRoll - ship.rollAngle) * (1.0 - Math.exp(-6.0 * dt));
  ship.pitchAngle += (targetPitch - ship.pitchAngle) * (1.0 - Math.exp(-6.0 * dt));

  // 4) Carry all horses & animals standing on the ship's deck along with the ship!
  carryPassengersOnSailableShip(prevX, prevZ, prevYaw, ship, horses, worldAnimals);

  // 5) Sync player state to the raised aft quarterdeck helm (local z = +4.8 * scale) with unobstructed ocean view
  const helmLz = 4.8 * (ship.scale ?? 1.0);
  state.x = ship.x + helmLz * Math.sin(ship.yaw);
  state.z = ship.z + helmLz * Math.cos(ship.yaw);
  state.y = ship.deckY + 0.68;
  state.vx = vx;
  state.vz = vz;
  state.vy = 0;
  state.onGround = true;
  state.isSwimming = false;
  state.inWater = false;
  state.isFlying = false;
  state.distanceWalked += stepDist;
  state.walkPace = input.sprint ? 'fast' : 'normal';
  state.bobPhase = ship.wakePhase;
  state.bobAmount = Math.min(0.45, Math.abs(ship.speed) / 24.0);
}
