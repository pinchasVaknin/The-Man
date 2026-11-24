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
    halfW: 2.27,
    halfL: 8.2,
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
    halfW: 2.71,
    halfL: 9.8,
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
    halfW: 3.15,
    halfL: 11.4,
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

/**
 * Summary: Measured base-scale (scale = 1.0) geometry metrics of public/models/vehicles/ship.glb.
 *          Horizontal coordinates scale by `ship.scale`; vertical offsets are relative to `ship.deckY`.
 */
export const SHIP_GLB_DECK_METRICS = {
  mainDeckOffsetY: 0.0,
  forecastleOffsetY: 0.58,
  quarterdeckOffsetY: 1.82,
  forecastleMinBz: -5.9,
  forecastleMaxBz: -2.3,
  stairStartBz: 5.5,
  stairEndBz: 7.5,
  stairInnerHalfX: 1.22,
  quarterdeckStartBz: 7.45,
  quarterdeckEndBz: 11.15,
  helmWheelBz: 8.56,
  helmWheelOffsetY: 2.72,
  helmStandPositionBz: 9.75,
} as const;

export interface ISailableShipLocalColliderBox {
  readonly id: string;
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly minY: number;
  readonly maxY: number;
  readonly isStairGuard?: boolean;
}

export interface ISailableShipState {
  id: string;
  tierId: ShipTierId;
  name: string;
  x: number;
  z: number;
  yaw: number;
  prevX?: number;
  prevZ?: number;
  prevYaw?: number;
  prevRollAngle?: number;
  prevPitchAngle?: number;
  prevWheelAngle?: number;
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
  id?: string | number;
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

function syncShipPreviousPose(s: ISailableShipState): void {
  s.prevX = s.x;
  s.prevZ = s.z;
  s.prevYaw = s.yaw;
  s.prevRollAngle = s.rollAngle;
  s.prevPitchAngle = s.pitchAngle;
  s.prevWheelAngle = s.wheelAngle;
}

function createShipStateFromDef(def: IShipCatalogDef, spawned: boolean): ISailableShipState {
  const s: ISailableShipState = {
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
  syncShipPreviousPose(s);
  return s;
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

export function findSailableShipById(id?: string | null): ISailableShipState | null {
  if (!id) return null;
  for (let i = 0; i < allShipsRegistry.length; i++) {
    if (allShipsRegistry[i].id === id) return allShipsRegistry[i];
  }
  return null;
}

/**
 * Summary: Snapshots the pre-step poses of all spawned sailable ships for smooth sub-tick render interpolation.
 */
export function capturePreviousSailableShipPoses(): void {
  for (let i = 0; i < allShipsRegistry.length; i++) {
    syncShipPreviousPose(allShipsRegistry[i]);
  }
}

/**
 * Summary: Evaluates the alpha-interpolated world pose of a sailable ship between simulation ticks.
 */
export function getInterpolatedSailableShipPose(
  ship: ISailableShipState,
  alpha = 1
): {
  x: number;
  z: number;
  yaw: number;
  rollAngle: number;
  pitchAngle: number;
  wheelAngle: number;
  deckY: number;
} {
  const t = Math.max(0, Math.min(1, alpha));
  const px = ship.prevX ?? ship.x;
  const pz = ship.prevZ ?? ship.z;
  const pyaw = ship.prevYaw ?? ship.yaw;
  const yawDiff = Math.atan2(Math.sin(ship.yaw - pyaw), Math.cos(ship.yaw - pyaw));
  return {
    x: px + (ship.x - px) * t,
    z: pz + (ship.z - pz) * t,
    yaw: Math.atan2(Math.sin(pyaw + yawDiff * t), Math.cos(pyaw + yawDiff * t)),
    rollAngle: (ship.prevRollAngle ?? ship.rollAngle) + (ship.rollAngle - (ship.prevRollAngle ?? ship.rollAngle)) * t,
    pitchAngle: (ship.prevPitchAngle ?? ship.pitchAngle) + (ship.pitchAngle - (ship.prevPitchAngle ?? ship.pitchAngle)) * t,
    wheelAngle: (ship.prevWheelAngle ?? ship.wheelAngle) + (ship.wheelAngle - (ship.prevWheelAngle ?? ship.wheelAngle)) * t,
    deckY: ship.deckY,
  };
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
    syncShipPreviousPose(s);
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
  syncShipPreviousPose(ship);
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
  syncShipPreviousPose(activeSailableShip);
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
 * Summary: Converts world (x, z) to base-scale (1.0) ship-local (bx, bz), where -bz is bow and +bz is stern.
 */
export function getSailableShipLocalPoint(
  x: number,
  z: number,
  ship: ISailableShipState
): { bx: number; bz: number; lx: number; lz: number } {
  const cosY = Math.cos(ship.yaw);
  const sinY = Math.sin(ship.yaw);
  const dx = x - ship.x;
  const dz = z - ship.z;
  const lx = dx * cosY - dz * sinY;
  const lz = dx * sinY + dz * cosY;
  const invScale = 1.0 / (ship.scale || 1.0);
  return { bx: lx * invScale, bz: lz * invScale, lx, lz };
}

/**
 * Summary: Converts base-scale (1.0) ship-local (bx, bz) to world (x, z).
 */
export function sailableShipLocalToWorld(
  bx: number,
  bz: number,
  ship: ISailableShipState
): { x: number; z: number } {
  const s = ship.scale || 1.0;
  const lx = bx * s;
  const lz = bz * s;
  const cosY = Math.cos(ship.yaw);
  const sinY = Math.sin(ship.yaw);
  return {
    x: ship.x + lx * cosY + lz * sinY,
    z: ship.z - lx * sinY + lz * cosY,
  };
}

/**
 * Summary: Returns world coordinates of the active steering wheel and the helmsman standing deck position on 2F.
 */
export function getSailableShipHelmWorldPosition(
  ship: ISailableShipState = activeSailableShip
): {
  wheelX: number;
  wheelY: number;
  wheelZ: number;
  standX: number;
  standY: number;
  standZ: number;
} {
  const wheelW = sailableShipLocalToWorld(0, SHIP_GLB_DECK_METRICS.helmWheelBz, ship);
  const standW = sailableShipLocalToWorld(0, SHIP_GLB_DECK_METRICS.helmStandPositionBz, ship);
  return {
    wheelX: wheelW.x,
    wheelY: ship.deckY + SHIP_GLB_DECK_METRICS.quarterdeckOffsetY,
    wheelZ: wheelW.z,
    standX: standW.x,
    standY: ship.deckY + SHIP_GLB_DECK_METRICS.quarterdeckOffsetY,
    standZ: standW.z,
  };
}

function getShipDeckHalfWidthAtBaseZ(bz: number): number {
  if (bz < SHIP_GLB_DECK_METRICS.forecastleMinBz || bz > SHIP_GLB_DECK_METRICS.quarterdeckEndBz) {
    return 0;
  }
  if (bz < SHIP_GLB_DECK_METRICS.forecastleMaxBz) {
    const t =
      (bz - SHIP_GLB_DECK_METRICS.forecastleMinBz) /
      (SHIP_GLB_DECK_METRICS.forecastleMaxBz - SHIP_GLB_DECK_METRICS.forecastleMinBz);
    return 2.05 + t * 0.85;
  }
  if (bz <= SHIP_GLB_DECK_METRICS.stairStartBz) {
    return 3.12;
  }
  if (bz < SHIP_GLB_DECK_METRICS.quarterdeckStartBz) {
    return 2.95;
  }
  const tStern =
    (bz - SHIP_GLB_DECK_METRICS.quarterdeckStartBz) /
    (SHIP_GLB_DECK_METRICS.quarterdeckEndBz - SHIP_GLB_DECK_METRICS.quarterdeckStartBz);
  return 2.82 - tStern * 0.36;
}

/**
 * Summary: Returns all local-space (world-scaled, relative to ship center & deckY) solid collision boxes
 *          matching ship.glb hull, outer bulwark railings, port gangway gap, forecastle walls,
 *          aft cabin bulkhead, side stair guards, 2nd-floor railings, masts, and steering wheel pedestal.
 */
export function getSailableShipLocalCollisionBoxes(
  ship: ISailableShipState = activeSailableShip
): ISailableShipLocalColliderBox[] {
  const s = ship.scale || 1.0;
  const dY = ship.deckY;
  const box = (
    id: string,
    minBx: number,
    maxBx: number,
    minBz: number,
    maxBz: number,
    minRelY: number,
    maxRelY: number,
    isStairGuard = false
  ): ISailableShipLocalColliderBox => ({
    id,
    minX: minBx * s,
    maxX: maxBx * s,
    minZ: minBz * s,
    maxZ: maxBz * s,
    minY: dY + minRelY,
    maxY: dY + maxRelY,
    isStairGuard,
  });

  return [
    // 1. Solid lower/underwater hull & bowsprit spar (prevents swimming/walking through the ship hull sides or keel)
    box('ship-hull-lower', -2.95, 2.95, -6.4, 11.2, -3.9, -0.05),
    box('ship-hull-bow-beak', -1.35, 1.35, -9.2, -6.2, -3.2, 1.85),
    box('ship-hull-bowsprit', -0.45, 0.45, -12.4, -6.0, 0.7, 3.1),

    // 2. Main Deck (1F) Outer Bulwark Railings (Port gangway gap bz=0.8..3.8 left open for Harbor Jetty boarding)
    box('ship-rail-port-fwd', -3.32, -2.85, -2.4, 0.8, -0.2, 1.25),
    box('ship-rail-port-aft', -3.32, -2.85, 3.8, 7.5, -0.2, 2.25),
    box('ship-rail-stbd', 2.85, 3.32, -2.4, 7.5, -0.2, 2.25),

    // 3. Tapered Bow Forecastle Bulwarks & Nose Cap
    box('ship-bow-port-mid', -2.82, -2.25, -4.6, -2.2, -0.1, 1.65),
    box('ship-bow-stbd-mid', 2.25, 2.82, -4.6, -2.2, -0.1, 1.65),
    box('ship-bow-port-fwd', -2.18, -1.55, -6.1, -4.4, -0.1, 1.95),
    box('ship-bow-stbd-fwd', 1.55, 2.18, -6.1, -4.4, -0.1, 1.95),
    box('ship-bow-nose-cap', -1.75, 1.75, -6.6, -5.85, -0.1, 2.15),

    // 4. Aft Cabin Front Bulkhead Wall (solid under 2nd-floor front, between the Port & Starboard staircases)
    box('ship-aft-cabin-bulkhead', -1.25, 1.25, 7.05, 7.55, 0.0, 1.82),

    // 5. Inner Stairway Guard Stringers (bz = 5.5..7.5, |bx| ~ 1.22)
    box('ship-stair-guard-port', -1.32, -1.06, 5.5, 7.5, 0.0, 2.42, true),
    box('ship-stair-guard-stbd', 1.06, 1.32, 5.5, 7.5, 0.0, 2.42, true),

    // 6. Second Floor (2F Quarterdeck) Front Balustrade, Side Railings & Stern Transom
    box('ship-2f-rail-front', -1.36, 1.36, 7.22, 7.58, 1.8, 2.9),
    box('ship-2f-rail-port', -2.95, -2.55, 7.4, 11.3, 1.8, 2.95),
    box('ship-2f-rail-stbd', 2.55, 2.95, 7.4, 11.3, 1.8, 2.95),
    box('ship-2f-rail-stern', -2.75, 2.75, 10.95, 11.55, 0.0, 3.15),

    // 7. Masts & 2nd-Floor Steering Wheel / Helm Pedestal
    box('ship-mast-fore', -0.42, 0.42, -2.05, -1.15, 0.0, 15.0),
    box('ship-mast-main', -0.42, 0.42, 4.25, 5.15, 0.0, 16.0),
    box('ship-2f-helm-pedestal', -0.55, 0.55, 7.9, 8.68, 1.8, 3.25),
  ];
}

/**
 * Summary: Resolves horizontal player collision against a spawned Sailable Ship's rotated hull,
 *          bulwark railings, stair guards, masts, 2nd-floor railings, and helm pedestal.
 */
export function resolveSailableShipHorizontalCollisions(
  nextX: number,
  nextZ: number,
  playerY: number,
  playerRadius: number,
  ship: ISailableShipState
): { x: number; z: number; collided: boolean } {
  if (!ship.spawned) return { x: nextX, z: nextZ, collided: false };
  const dx = nextX - ship.x;
  const dz = nextZ - ship.z;
  const maxReach = Math.max(ship.halfL, 12.5) + 4.0;
  if (dx * dx + dz * dz > maxReach * maxReach) {
    return { x: nextX, z: nextZ, collided: false };
  }

  const cosY = Math.cos(ship.yaw);
  const sinY = Math.sin(ship.yaw);
  let lx = dx * cosY - dz * sinY;
  let lz = dx * sinY + dz * cosY;
  const s = ship.scale || 1.0;
  const boxes = getSailableShipLocalCollisionBoxes(ship);
  let collided = false;

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (playerY + 1.55 < box.minY) continue;
      let effMaxY = box.maxY;
      if (box.isStairGuard) {
        const bz = lz / s;
        const tStair = Math.max(
          0,
          Math.min(
            1,
            (bz - SHIP_GLB_DECK_METRICS.stairStartBz) /
              (SHIP_GLB_DECK_METRICS.stairEndBz - SHIP_GLB_DECK_METRICS.stairStartBz)
          )
        );
        effMaxY = ship.deckY + tStair * SHIP_GLB_DECK_METRICS.quarterdeckOffsetY + 0.62;
      }
      if (playerY >= effMaxY - 0.28) continue;

      const eMinX = box.minX - playerRadius;
      const eMaxX = box.maxX + playerRadius;
      const eMinZ = box.minZ - playerRadius;
      const eMaxZ = box.maxZ + playerRadius;
      if (lx <= eMinX || lx >= eMaxX || lz <= eMinZ || lz >= eMaxZ) continue;

      const pL = lx - eMinX;
      const pR = eMaxX - lx;
      const pF = lz - eMinZ;
      const pB = eMaxZ - lz;
      const mP = Math.min(pL, pR, pF, pB);
      if (mP === pL) lx = eMinX;
      else if (mP === pR) lx = eMaxX;
      else if (mP === pF) lz = eMinZ;
      else lz = eMaxZ;
      collided = true;
    }
  }

  if (!collided) return { x: nextX, z: nextZ, collided: false };
  return {
    x: ship.x + lx * cosY + lz * sinY,
    z: ship.z - lx * sinY + lz * cosY,
    collided: true,
  };
}

/**
 * Summary: Checks whether an entity (horse, animal, or player) at world (x, y, z)
 *          is standing on a Sailable Ship's deck (1F, forecastle, stairs, or 2F).
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
    if (y !== undefined && (y < s.deckY - 1.6 || y > s.deckY + 4.2)) {
      return false;
    }
    const dx = x - s.x;
    const dz = z - s.z;
    if (dx * dx + dz * dz > 260.0) {
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
 *          matching ship.glb's 1F main deck, raised bow forecastle, port/starboard staircases,
 *          2nd-floor quarterdeck, Harbor boarding jetty + gangplank apron, and Atlantis gangplank.
 */
export function sailableShipDeckHeightAt(
  x: number,
  z: number,
  currentY?: number,
  ship?: ISailableShipState
): number | null {
  // 1) Harbor Southern Royal Ship Jetty (x: 254.0..276.0, z: 282.0 ± 3.05) + Port Gangway Apron to moored ship
  if (
    x >= 254.0 &&
    x <= 276.0 &&
    Math.abs(z - SAILABLE_SHIP_INITIAL_POS.jettyZ) <= 3.05 &&
    (currentY === undefined || currentY >= 2.0)
  ) {
    const tPier = Math.max(0, Math.min(1, (x - 254.5) / 19.6));
    return (
      SOUTHEAST_HARBOR_POS.plazaY * (1 - tPier) +
      SAILABLE_SHIP_INITIAL_POS.deckY * tPier
    );
  }
  if (
    x >= 271.5 &&
    x <= 276.2 &&
    z >= SAILABLE_SHIP_INITIAL_POS.jettyZ + 2.4 &&
    z <= SAILABLE_SHIP_INITIAL_POS.homeZ - 2.2 &&
    (currentY === undefined || currentY >= 2.0)
  ) {
    return SAILABLE_SHIP_INITIAL_POS.deckY;
  }

  const evalSingleShipDeck = (s: ISailableShipState): number | null => {
    if (!s.spawned) return null;
    const dx = x - s.x;
    const dz = z - s.z;
    if (dx * dx + dz * dz <= 260.0) {
      const { bx, bz } = getSailableShipLocalPoint(x, z, s);
      const maxHalfW = getShipDeckHalfWidthAtBaseZ(bz);
      if (maxHalfW > 0 && Math.abs(bx) <= maxHalfW) {
        if (currentY !== undefined && currentY < s.deckY - 1.2) {
          return null;
        }
        // 2nd Floor Quarterdeck (aft poop deck, bz = 7.45..11.15)
        if (bz >= SHIP_GLB_DECK_METRICS.quarterdeckStartBz) {
          if (currentY !== undefined && currentY < s.deckY + 1.05) {
            return null;
          }
          return s.deckY + SHIP_GLB_DECK_METRICS.quarterdeckOffsetY;
        }
        // Port & Starboard Side Stairways (bz = 5.5..7.45, |bx| >= 1.22)
        if (bz > SHIP_GLB_DECK_METRICS.stairStartBz) {
          if (Math.abs(bx) >= SHIP_GLB_DECK_METRICS.stairInnerHalfX) {
            const tStair = Math.max(
              0,
              Math.min(
                1,
                (bz - SHIP_GLB_DECK_METRICS.stairStartBz) /
                  (SHIP_GLB_DECK_METRICS.stairEndBz - SHIP_GLB_DECK_METRICS.stairStartBz)
              )
            );
            const stairY = s.deckY + tStair * SHIP_GLB_DECK_METRICS.quarterdeckOffsetY;
            if (currentY === undefined || (currentY >= stairY - 0.95 && currentY <= stairY + 1.9)) {
              return stairY;
            }
          } else if (bz <= 7.25) {
            return s.deckY;
          }
          return null;
        }
        // Forecastle raised bow deck (bz = -5.9..-2.3) with smooth transition at -2.55..-2.05
        if (bz < -2.05) {
          const tBow = Math.max(0, Math.min(1, (-2.05 - bz) / 0.5));
          return s.deckY + tBow * SHIP_GLB_DECK_METRICS.forecastleOffsetY;
        }
        // 1F Main Deck (bz = -2.05..+5.5)
        return s.deckY;
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
    if (p.species === 'dragon' || p.species === 'dolphin' || p.species === 'koifish') return;
    if (p.y < ship.deckY - 0.55 || p.y > ship.deckY + 3.6) return;
    const dx = p.x - prevX;
    const dz = p.z - prevZ;
    if (dx * dx + dz * dz > 240.0) return;

    const lx = dx * cosPrev - dz * sinPrev;
    const lz = dx * sinPrev + dz * cosPrev;
    if (Math.abs(lx) <= ship.halfW - 0.15 && Math.abs(lz) <= ship.halfL - 0.15) {
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

function getShipHullHalfWidthAtBaseZ(bz: number): number {
  if (bz < -10.6 || bz > 12.2) return 0;
  if (bz < -5.5) {
    const t = (bz + 10.6) / 5.1;
    return 0.95 + t * 2.7;
  }
  if (bz <= 9.2) return 3.65;
  const tStern = (bz - 9.2) / 3.0;
  return 3.65 - tStern * 0.55;
}

/**
 * Summary: Horizontally pushes swimming dolphins and other non-passenger animals clear of the ship's
 *          tapered bow and hull sides without lifting their Y or mutating homeX/homeZ.
 */
export function pushAnimalClearOfShipHull(
  ship: ISailableShipState,
  animal: IShipPassengerEntity
): boolean {
  if (!ship.spawned || animal.isDead || animal.species === 'dragon') return false;
  const dx = animal.x - ship.x;
  const dz = animal.z - ship.z;
  if (dx * dx + dz * dz > 360.0) return false;

  const isAquatic = animal.species === 'dolphin' || animal.species === 'koifish';
  if (!isAquatic && animal.y >= ship.deckY - 0.55 && isEntityOnSailableShipDeck(animal.x, animal.z, animal.y, ship, 0.25)) {
    return false;
  }

  const { bx, bz } = getSailableShipLocalPoint(animal.x, animal.z, ship);
  const hullHalfW = getShipHullHalfWidthAtBaseZ(bz);
  if (hullHalfW <= 0) return false;

  const clearance = hullHalfW + 0.85;
  if (Math.abs(bx) >= clearance) return false;

  const numericId = typeof animal.id === 'number' ? animal.id : Math.round(animal.x + animal.z);
  const sideSign =
    Math.abs(bx) > 0.08
      ? Math.sign(bx)
      : numericId % 2 === 0
        ? 1
        : -1;
  const targetBx = sideSign * (clearance + 0.22);
  const targetBz = bz < -6.2 ? Math.min(bz, -6.2) : bz;
  const pushedWorld = sailableShipLocalToWorld(targetBx, targetBz, ship);
  animal.x = pushedWorld.x;
  animal.z = pushedWorld.z;

  if (animal.vx !== undefined && animal.vz !== undefined) {
    const cosY = Math.cos(ship.yaw);
    const sinY = Math.sin(ship.yaw);
    const outX = sideSign * cosY;
    const outZ = -sideSign * sinY;
    const radialDot = animal.vx * outX + animal.vz * outZ;
    if (radialDot < 1.8) {
      const pushBoost = 1.8 - radialDot;
      animal.vx += outX * pushBoost;
      animal.vz += outZ * pushBoost;
    }
  }
  return true;
}

/**
 * Summary: Pushes all nearby non-passenger world animals horizontally away from a moving/moored ship hull.
 */
export function pushNonPassengersClearOfShipHull(
  ship: ISailableShipState = activeSailableShip,
  worldAnimals?: readonly IShipPassengerEntity[]
): void {
  if (!ship.spawned || !worldAnimals) return;
  for (let i = 0; i < worldAnimals.length; i++) {
    pushAnimalClearOfShipHull(ship, worldAnimals[i]);
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
  syncShipPreviousPose(activeSailableShip);
  carryPassengersOnSailableShip(prevX, prevZ, prevYaw, activeSailableShip, horses, worldAnimals);
  pushNonPassengersClearOfShipHull(activeSailableShip, worldAnimals);
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
  const s = ship.scale || 1.0;
  const stallBx = (slotIndex % 2 === 0 ? -1 : 1) * 1.45;
  const stallBz = -0.3 + Math.floor(slotIndex / 2) * 2.1;
  const pos = sailableShipLocalToWorld(stallBx, stallBz, ship);
  mount.x = pos.x;
  mount.z = pos.z;
  mount.y = ship.deckY;
  mount.yaw = ship.yaw;
  if (mount.vx !== undefined) mount.vx = 0;
  if (mount.vy !== undefined) mount.vy = 0;
  if (mount.vz !== undefined) mount.vz = 0;
  if (mount.speed !== undefined) mount.speed = 0;
  if (mount.homeX !== undefined) mount.homeX = mount.x;
  if (mount.homeZ !== undefined) mount.homeZ = mount.z;
  if (mount.inWater !== undefined) mount.inWater = false;
  void s;
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
  const { bx: rawBx, bz: rawBz } = getSailableShipLocalPoint(mount.x, mount.z, ship);
  const bx = Math.max(-2.1, Math.min(2.1, rawBx));
  const bz = Math.max(-1.0, Math.min(3.4, rawBz));

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

  let target = sailableShipLocalToWorld(bx, bz, ship);

  if (isSpotOccupied(target.x, target.z)) {
    const candidateOffsets: ReadonlyArray<readonly [number, number]> = [
      [-1.5, 0.2],
      [1.5, 0.2],
      [-1.5, 2.2],
      [1.5, 2.2],
      [-1.5, -0.8],
      [1.5, -0.8],
      [0.0, 1.4],
      [0.0, 3.0],
    ];
    for (let c = 0; c < candidateOffsets.length; c++) {
      const [cbx, cbz] = candidateOffsets[c];
      const cand = sailableShipLocalToWorld(cbx, cbz, ship);
      if (!isSpotOccupied(cand.x, cand.z)) {
        target = cand;
        break;
      }
    }
  }

  mount.x = target.x;
  mount.z = target.z;
  mount.y = sailableShipDeckHeightAt(target.x, target.z, ship.deckY, ship) ?? ship.deckY;
  if (mount.vx !== undefined) mount.vx = 0;
  if (mount.vy !== undefined) mount.vy = 0;
  if (mount.vz !== undefined) mount.vz = 0;
  if (mount.speed !== undefined) mount.speed = 0;
  if (mount.homeX !== undefined) mount.homeX = mount.x;
  if (mount.homeZ !== undefined) mount.homeZ = mount.z;
  if (mount.inWater !== undefined) mount.inWater = false;
}

/**
 * Summary: Computes where the player stands when releasing the ship's wheel with [F].
 *          Steps straight onto the Ruined Atlantis Western Dock when moored nearby,
 *          and otherwise leaves the player standing behind the steering wheel on the 2nd floor.
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

  const helm = getSailableShipHelmWorldPosition(ship);
  return {
    x: helm.standX,
    y: helm.standY,
    z: helm.standZ,
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

  // 4) Carry all horses & deck animals aboard, and push non-passenger wildlife clear of the hull!
  carryPassengersOnSailableShip(prevX, prevZ, prevYaw, ship, horses, worldAnimals);
  pushNonPassengersClearOfShipHull(ship, worldAnimals);

  // 5) Sync player state right behind the 2nd-floor steering wheel
  const helm = getSailableShipHelmWorldPosition(ship);
  state.x = helm.standX;
  state.z = helm.standZ;
  state.y = helm.standY;
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
