// ============================================================================
// MODULE: World / Domain / Landmarks / Interactions
// DESIGN: Ladder climbing queries and door gaze raycasting detection (SRP)
// SUMMARY: Manages runtime detection for climbable vertical ladders and enterable doors
//          across watchtowers, farmhouses, dwarven mines, and harbor structures.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { IClimbableLadderInfo, IFortressDoorDef, IWorldChest } from '../worldTypes';
import { t } from '../../../locales';
import { CHINESE_FORTRESS_POS, CORNER_WATCHTOWERS, FORTRESS_Z_OFFSET } from './fortressLandmarks';
import { HILL_WATCHTOWERS } from './highlandBridgeLandmarks';
import { SOUTHEAST_HARBOR_POS, SOUTHWEST_OASIS_POS } from './oasisAndHarborLandmarks';
import { HUNTER_LODGE_POS, VALLEY_FARMS } from './settlementLandmarks';
import { DWARVEN_STONE_HOUSES, SOUTHERN_MINE_POS } from './dwarvenLandmarks';
import { MINE_LEVEL_Y, MINE_POI, TREASURE_ISLAND } from './ancientMine/ancientMineLayout';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants
const FZ = FORTRESS_Z_OFFSET;
// #endregion

// ======================== CLIMBABLE LADDERS ======================== \\
// #region Climbable Ladders
/**
 * Summary: Retrieves ladder geometric info by identifier.
 * Design: Checks corner watchtowers, hill watchtowers, lighthouse, and oasis observatory.
 * @param id Ladder identifier string.
 * @returns Ladder definition with floor heights, or null.
 */
export function getLadderById(id: string | null | undefined): IClimbableLadderInfo | null {
  if (!id) return null;
  for (let i = 0; i < CORNER_WATCHTOWERS.length; i++) {
    const wt = CORNER_WATCHTOWERS[i];
    if (wt.id === id) {
      return {
        id: wt.id,
        name: wt.name,
        ladderX: wt.ladderX,
        ladderZ: wt.ladderZ,
        standX: wt.ladderX + (wt.isWest ? -0.42 : 0.42),
        standZ: wt.ladderZ + (wt.isSouth ? 0.42 : -0.42),
        isWest: wt.isWest,
        isSouth: wt.isSouth,
        minY: CHINESE_FORTRESS_POS.watchtowerFloor1Y,
        maxY: CHINESE_FORTRESS_POS.watchtowerFloor3Y,
        floors: [
          CHINESE_FORTRESS_POS.watchtowerFloor1Y,
          CHINESE_FORTRESS_POS.watchtowerFloor2Y,
          CHINESE_FORTRESS_POS.watchtowerFloor3Y,
        ],
      };
    }
  }
  for (let i = 0; i < HILL_WATCHTOWERS.length; i++) {
    const hw = HILL_WATCHTOWERS[i];
    if (hw.id === id) {
      return {
        id: hw.id,
        name: hw.name,
        ladderX: hw.ladderX,
        ladderZ: hw.ladderZ,
        standX: hw.standX,
        standZ: hw.standZ,
        isWest: hw.isWest,
        isSouth: hw.isSouth,
        minY: hw.baseY + 0.15,
        maxY: hw.deckY,
        floors: [hw.baseY + 0.15, hw.deckY],
      };
    }
  }
  if (id === SOUTHEAST_HARBOR_POS.lighthouseLadderId) {
    return {
      id: SOUTHEAST_HARBOR_POS.lighthouseLadderId,
      name: t('landmarks.lighthouse'),
      ladderX: SOUTHEAST_HARBOR_POS.lighthouseLadderX,
      ladderZ: SOUTHEAST_HARBOR_POS.lighthouseLadderZ,
      standX: SOUTHEAST_HARBOR_POS.lighthouseStandX,
      standZ: SOUTHEAST_HARBOR_POS.lighthouseStandZ,
      isWest: false,
      isSouth: false,
      minY: SOUTHEAST_HARBOR_POS.lighthouseBaseY + 0.15,
      maxY: SOUTHEAST_HARBOR_POS.lighthouseTopDeckY,
      floors: [SOUTHEAST_HARBOR_POS.lighthouseBaseY + 0.15, SOUTHEAST_HARBOR_POS.lighthouseTopDeckY],
    };
  }
  if (id === SOUTHWEST_OASIS_POS.observatoryLadderId) {
    return {
      id: SOUTHWEST_OASIS_POS.observatoryLadderId,
      name: t('landmarks.oasis_observatory'),
      ladderX: SOUTHWEST_OASIS_POS.observatoryLadderX,
      ladderZ: SOUTHWEST_OASIS_POS.observatoryLadderZ,
      standX: SOUTHWEST_OASIS_POS.observatoryStandX,
      standZ: SOUTHWEST_OASIS_POS.observatoryStandZ,
      isWest: true,
      isSouth: true,
      minY: SOUTHWEST_OASIS_POS.observatoryBaseY + 0.15,
      maxY: SOUTHWEST_OASIS_POS.observatoryTopDeckY,
      floors: [SOUTHWEST_OASIS_POS.observatoryBaseY + 0.15, SOUTHWEST_OASIS_POS.observatoryTopDeckY],
    };
  }
  return null;
}

/**
 * Summary: Identifies whether a 2D coordinate is within touching distance of a ladder base.
 * @param x World X coordinate.
 * @param z World Z coordinate.
 * @returns IClimbableLadderInfo if standing in front of a ladder, or null.
 */
export function findWatchtowerLadderAt(x: number, z: number): IClimbableLadderInfo | null {
  for (let i = 0; i < CORNER_WATCHTOWERS.length; i++) {
    const wt = CORNER_WATCHTOWERS[i];
    if (Math.abs(x - wt.ladderX) <= 1.45 && Math.abs(z - wt.ladderZ) <= 1.45) {
      return getLadderById(wt.id);
    }
  }
  for (let i = 0; i < HILL_WATCHTOWERS.length; i++) {
    const hw = HILL_WATCHTOWERS[i];
    if (Math.hypot(x - hw.ladderX, z - hw.ladderZ) <= 1.6) {
      return getLadderById(hw.id);
    }
  }
  if (
    Math.hypot(
      x - SOUTHEAST_HARBOR_POS.lighthouseLadderX,
      z - SOUTHEAST_HARBOR_POS.lighthouseLadderZ
    ) <= 1.6
  ) {
    return getLadderById(SOUTHEAST_HARBOR_POS.lighthouseLadderId);
  }
  if (
    Math.hypot(
      x - SOUTHWEST_OASIS_POS.observatoryLadderX,
      z - SOUTHWEST_OASIS_POS.observatoryLadderZ
    ) <= 1.6
  ) {
    return getLadderById(SOUTHWEST_OASIS_POS.observatoryLadderId);
  }
  return null;
}

/**
 * Summary: Fast predicate checking if position overlaps any ladder climbing zone.
 * @param x World X.
 * @param z World Z.
 * @returns True when standing within ladder grab volume.
 */
export function isOnWatchtowerLadder(x: number, z: number): boolean {
  return findWatchtowerLadderAt(x, z) !== null;
}

/**
 * Summary: Raycasts observer gaze direction to find a looked-at ladder.
 * Design: Evaluates dot product of forward gaze with ladder offset within distance cap.
 * @param x Observer eye X.
 * @param y Observer eye Y.
 * @param z Observer eye Z.
 * @param yaw Camera yaw angle.
 * @param pitch Camera pitch angle (default 0).
 * @returns Ladder info if looking directly at one within 4.5m, or null.
 */
export function findLookedAtWatchtowerLadder(
  x: number,
  y: number,
  z: number,
  yaw: number,
  pitch = 0
): IClimbableLadderInfo | null {
  if (Math.abs(pitch) > 1.35) return null;

  const fwdX = -Math.sin(yaw);
  const fwdZ = -Math.cos(yaw);

  for (let i = 0; i < CORNER_WATCHTOWERS.length; i++) {
    const wt = CORNER_WATCHTOWERS[i];
    if (
      y < CHINESE_FORTRESS_POS.watchtowerFloor1Y - 0.8 ||
      y > CHINESE_FORTRESS_POS.watchtowerFloor3Y + 1.8
    ) {
      continue;
    }
    const dx = wt.ladderX - x;
    const dz = wt.ladderZ - z;
    const dist = Math.hypot(dx, dz);
    if (dist > 4.4) continue;
    if (dist < 0.75 || (dx * fwdX + dz * fwdZ) / dist >= 0.42) {
      return getLadderById(wt.id);
    }
  }

  for (let i = 0; i < HILL_WATCHTOWERS.length; i++) {
    const hw = HILL_WATCHTOWERS[i];
    if (y < hw.baseY - 0.8 || y > hw.deckY + 1.8) continue;
    const dx = hw.ladderX - x;
    const dz = hw.ladderZ - z;
    const dist = Math.hypot(dx, dz);
    if (dist > 4.5) continue;
    if (dist < 0.75 || (dx * fwdX + dz * fwdZ) / dist >= 0.42) {
      return getLadderById(hw.id);
    }
  }

  if (
    y >= SOUTHEAST_HARBOR_POS.lighthouseBaseY - 0.8 &&
    y <= SOUTHEAST_HARBOR_POS.lighthouseTopDeckY + 1.8
  ) {
    const dx = SOUTHEAST_HARBOR_POS.lighthouseLadderX - x;
    const dz = SOUTHEAST_HARBOR_POS.lighthouseLadderZ - z;
    const dist = Math.hypot(dx, dz);
    if (dist <= 4.5 && (dist < 0.75 || (dx * fwdX + dz * fwdZ) / dist >= 0.42)) {
      return getLadderById(SOUTHEAST_HARBOR_POS.lighthouseLadderId);
    }
  }

  if (
    y >= SOUTHWEST_OASIS_POS.observatoryBaseY - 0.8 &&
    y <= SOUTHWEST_OASIS_POS.observatoryTopDeckY + 1.8
  ) {
    const dx = SOUTHWEST_OASIS_POS.observatoryLadderX - x;
    const dz = SOUTHWEST_OASIS_POS.observatoryLadderZ - z;
    const dist = Math.hypot(dx, dz);
    if (dist <= 4.5 && (dist < 0.75 || (dx * fwdX + dz * fwdZ) / dist >= 0.42)) {
      return getLadderById(SOUTHWEST_OASIS_POS.observatoryLadderId);
    }
  }
  return null;
}
// #endregion

// ======================== FORTRESS DOORS ======================== \\
// #region Fortress Doors
/** Summary: Complete registry of interactive doors across all buildings and towers. */
export const FORTRESS_DOORS: readonly IFortressDoorDef[] = [
  {
    id: 'main-hall-door',
    buildingName: t('buildings.fortress_main_hall'),
    x: 0,
    y: CHINESE_FORTRESS_POS.mainHallFloor1Y,
    z: -189.8 + FZ,
    minX: -2.2,
    maxX: 2.2,
    minZ: -190.25 + FZ,
    maxZ: -189.35 + FZ,
    interactRadius: 4.8,
  },
  {
    id: 'west-pavilion-door',
    buildingName: t('buildings.pagoda_west'),
    x: -30.0,
    y: CHINESE_FORTRESS_POS.pavilionFloor1Y,
    z: -156.5 + FZ,
    minX: -31.6,
    maxX: -28.4,
    minZ: -156.95 + FZ,
    maxZ: -156.05 + FZ,
    interactRadius: 4.4,
  },
  {
    id: 'east-pavilion-door',
    buildingName: t('buildings.pagoda_east'),
    x: 30.0,
    y: CHINESE_FORTRESS_POS.pavilionFloor1Y,
    z: -156.5 + FZ,
    minX: 28.4,
    maxX: 31.6,
    minZ: -156.95 + FZ,
    maxZ: -156.05 + FZ,
    interactRadius: 4.4,
  },
  {
    id: 'sw-watchtower-door',
    buildingName: t('buildings.corner_tower_sw'),
    x: -45.5,
    y: CHINESE_FORTRESS_POS.watchtowerFloor1Y,
    z: -134.0 + FZ,
    minX: -46.9,
    maxX: -44.1,
    minZ: -134.45 + FZ,
    maxZ: -133.55 + FZ,
    interactRadius: 4.2,
  },
  {
    id: 'se-watchtower-door',
    buildingName: t('buildings.corner_tower_se'),
    x: 45.5,
    y: CHINESE_FORTRESS_POS.watchtowerFloor1Y,
    z: -134.0 + FZ,
    minX: 44.1,
    maxX: 46.9,
    minZ: -134.45 + FZ,
    maxZ: -133.55 + FZ,
    interactRadius: 4.2,
  },
  {
    id: 'nw-watchtower-door',
    buildingName: t('buildings.corner_tower_nw'),
    x: -45.5,
    y: CHINESE_FORTRESS_POS.watchtowerFloor1Y,
    z: -208.0 + FZ,
    minX: -46.9,
    maxX: -44.1,
    minZ: -208.45 + FZ,
    maxZ: -207.55 + FZ,
    interactRadius: 4.2,
  },
  {
    id: 'ne-watchtower-door',
    buildingName: t('buildings.corner_tower_ne'),
    x: 45.5,
    y: CHINESE_FORTRESS_POS.watchtowerFloor1Y,
    z: -208.0 + FZ,
    minX: 44.1,
    maxX: 46.9,
    minZ: -208.45 + FZ,
    maxZ: -207.55 + FZ,
    interactRadius: 4.2,
  },
  {
    id: 'hunter-lodge-door',
    buildingName: t('buildings.hunter_lodge'),
    x: HUNTER_LODGE_POS.x,
    y: HUNTER_LODGE_POS.height + 0.2,
    z: HUNTER_LODGE_POS.z + HUNTER_LODGE_POS.dirZ * 1.8,
    minX: HUNTER_LODGE_POS.x - 0.95,
    maxX: HUNTER_LODGE_POS.x + 0.95,
    minZ: HUNTER_LODGE_POS.z + HUNTER_LODGE_POS.dirZ * 1.8 - 0.4,
    maxZ: HUNTER_LODGE_POS.z + HUNTER_LODGE_POS.dirZ * 1.8 + 0.4,
    interactRadius: 4.2,
  },
  {
    id: 'farm-west-door',
    buildingName: t('buildings.farm_west'),
    x: VALLEY_FARMS[0].x,
    y: VALLEY_FARMS[0].height + 0.18,
    z: VALLEY_FARMS[0].z + VALLEY_FARMS[0].dirZ * 2.2,
    minX: VALLEY_FARMS[0].x - 0.95,
    maxX: VALLEY_FARMS[0].x + 0.95,
    minZ: VALLEY_FARMS[0].z + VALLEY_FARMS[0].dirZ * 2.2 - 0.4,
    maxZ: VALLEY_FARMS[0].z + VALLEY_FARMS[0].dirZ * 2.2 + 0.4,
    interactRadius: 4.2,
  },
  {
    id: 'farm-south-door',
    buildingName: t('buildings.farm_south'),
    x: VALLEY_FARMS[1].x,
    y: VALLEY_FARMS[1].height + 0.18,
    z: VALLEY_FARMS[1].z + VALLEY_FARMS[1].dirZ * 2.2,
    minX: VALLEY_FARMS[1].x - 0.95,
    maxX: VALLEY_FARMS[1].x + 0.95,
    minZ: VALLEY_FARMS[1].z + VALLEY_FARMS[1].dirZ * 2.2 - 0.4,
    maxZ: VALLEY_FARMS[1].z + VALLEY_FARMS[1].dirZ * 2.2 + 0.4,
    interactRadius: 4.2,
  },
  {
    id: 'farm-east-door',
    buildingName: t('buildings.farm_east'),
    x: VALLEY_FARMS[2].x,
    y: VALLEY_FARMS[2].height + 0.18,
    z: VALLEY_FARMS[2].z + VALLEY_FARMS[2].dirZ * 2.2,
    minX: VALLEY_FARMS[2].x - 0.95,
    maxX: VALLEY_FARMS[2].x + 0.95,
    minZ: VALLEY_FARMS[2].z + VALLEY_FARMS[2].dirZ * 2.2 - 0.4,
    maxZ: VALLEY_FARMS[2].z + VALLEY_FARMS[2].dirZ * 2.2 + 0.4,
    interactRadius: 4.2,
  },
  ...HILL_WATCHTOWERS.map((hw) => ({
    id: hw.doorId,
    buildingName: hw.name,
    x: hw.doorX,
    y: hw.baseY + 0.15,
    z: hw.doorZ,
    minX: hw.doorMinX,
    maxX: hw.doorMaxX,
    minZ: hw.doorMinZ,
    maxZ: hw.doorMaxZ,
    interactRadius: 4.8,
  })),
  {
    id: 'harbor-tavern-door',
    buildingName: t('buildings.harbor_tavern'),
    x: SOUTHEAST_HARBOR_POS.tavernX,
    y: SOUTHEAST_HARBOR_POS.tavernFloorY,
    z: SOUTHEAST_HARBOR_POS.tavernDoorZ,
    minX: SOUTHEAST_HARBOR_POS.tavernX - 1.25,
    maxX: SOUTHEAST_HARBOR_POS.tavernX + 1.25,
    minZ: SOUTHEAST_HARBOR_POS.tavernDoorZ - 0.45,
    maxZ: SOUTHEAST_HARBOR_POS.tavernDoorZ + 0.45,
    interactRadius: 4.6,
  },
  {
    id: SOUTHEAST_HARBOR_POS.lighthouseDoorId,
    buildingName: t('buildings.harbor_lighthouse'),
    x: SOUTHEAST_HARBOR_POS.lighthouseX,
    y: SOUTHEAST_HARBOR_POS.lighthouseBaseY + 0.15,
    z: SOUTHEAST_HARBOR_POS.lighthouseZ + 3.85,
    minX: SOUTHEAST_HARBOR_POS.lighthouseX - 1.15,
    maxX: SOUTHEAST_HARBOR_POS.lighthouseX + 1.15,
    minZ: SOUTHEAST_HARBOR_POS.lighthouseZ + 3.4,
    maxZ: SOUTHEAST_HARBOR_POS.lighthouseZ + 4.3,
    interactRadius: 4.6,
  },
  {
    id: SOUTHEAST_HARBOR_POS.warehouseDoorId,
    buildingName: t('buildings.harbor_warehouse'),
    x: SOUTHEAST_HARBOR_POS.warehouseX,
    y: SOUTHEAST_HARBOR_POS.warehouseFloorY,
    z: SOUTHEAST_HARBOR_POS.warehouseDoorZ,
    minX: SOUTHEAST_HARBOR_POS.warehouseX - 1.35,
    maxX: SOUTHEAST_HARBOR_POS.warehouseX + 1.35,
    minZ: SOUTHEAST_HARBOR_POS.warehouseDoorZ - 0.45,
    maxZ: SOUTHEAST_HARBOR_POS.warehouseDoorZ + 0.45,
    interactRadius: 4.8,
  },
  {
    id: SOUTHEAST_HARBOR_POS.shipCaptainDoorId,
    buildingName: t('buildings.galleon_cabin'),
    x: SOUTHEAST_HARBOR_POS.shipX,
    y: SOUTHEAST_HARBOR_POS.shipDeckY,
    z: SOUTHEAST_HARBOR_POS.shipQuarterdeckStartZ,
    minX: SOUTHEAST_HARBOR_POS.shipX - 1.25,
    maxX: SOUTHEAST_HARBOR_POS.shipX + 1.25,
    minZ: SOUTHEAST_HARBOR_POS.shipQuarterdeckStartZ - 0.45,
    maxZ: SOUTHEAST_HARBOR_POS.shipQuarterdeckStartZ + 0.45,
    interactRadius: 4.6,
  },
  {
    id: SOUTHWEST_OASIS_POS.observatoryDoorId,
    buildingName: t('buildings.oasis_observatory'),
    x: SOUTHWEST_OASIS_POS.observatoryX,
    y: SOUTHWEST_OASIS_POS.observatoryBaseY + 0.15,
    z: SOUTHWEST_OASIS_POS.observatoryDoorZ,
    minX: SOUTHWEST_OASIS_POS.observatoryX - 1.25,
    maxX: SOUTHWEST_OASIS_POS.observatoryX + 1.25,
    minZ: SOUTHWEST_OASIS_POS.observatoryDoorZ - 0.45,
    maxZ: SOUTHWEST_OASIS_POS.observatoryDoorZ + 0.45,
    interactRadius: 4.8,
  },
  {
    id: SOUTHWEST_OASIS_POS.pavilionDoorId,
    buildingName: t('buildings.oasis_silk_pavilion'),
    x: SOUTHWEST_OASIS_POS.pavilionDoorX,
    y: SOUTHWEST_OASIS_POS.pavilionFloorY,
    z: SOUTHWEST_OASIS_POS.pavilionZ,
    minX: SOUTHWEST_OASIS_POS.pavilionDoorX - 0.45,
    maxX: SOUTHWEST_OASIS_POS.pavilionDoorX + 0.45,
    minZ: SOUTHWEST_OASIS_POS.pavilionZ - 1.25,
    maxZ: SOUTHWEST_OASIS_POS.pavilionZ + 1.25,
    interactRadius: 4.8,
  },
  ...DWARVEN_STONE_HOUSES.map((dh) => ({
    id: dh.doorId,
    buildingName: dh.name,
    x: dh.doorX,
    y: dh.floorY,
    z: dh.doorZ,
    minX: dh.doorX - 0.45,
    maxX: dh.doorX + 0.45,
    minZ: dh.doorZ - 1.15,
    maxZ: dh.doorZ + 1.15,
    interactRadius: 4.6,
  })),
] as const;

/**
 * Summary: Computes a directional gaze + proximity alignment score for an interactive world object.
 * Returns -Infinity when out of range, out of vertical reach, or outside the player's forward look cone.
 */
export function computeInteractableGazeScore(
  x: number,
  y: number,
  z: number,
  yaw: number,
  pitch: number,
  targetX: number,
  targetY: number,
  targetZ: number,
  maxHorizDist: number
): number {
  if (Math.abs(y - targetY) > 3.2) return -Infinity;
  if (Math.abs(pitch) > 1.18) return -Infinity;
  const dx = targetX - x;
  const dz = targetZ - z;
  const dist = Math.hypot(dx, dz);
  if (dist > maxHorizDist) return -Infinity;
  const fwdX = -Math.sin(yaw);
  const fwdZ = -Math.cos(yaw);
  const horizDot = dist < 0.22 ? 1.0 : (dx * fwdX + dz * fwdZ) / dist;
  if (horizDot < 0.68) return -Infinity;
  return horizDot * 2.5 - dist / Math.max(0.5, maxHorizDist);
}

/**
 * Summary: Finds the closest enterable building door within interaction radius.
 * Design: Evaluates distance to door center and optional gaze dot product alignment.
 * @param x Observer X.
 * @param y Observer Y.
 * @param z Observer Z.
 * @param yaw Observer gaze yaw.
 * @param pitch Observer gaze pitch (default 0).
 * @returns Nearest interactive IFortressDoorDef, or null.
 */
export function findNearestFortressDoor(
  x: number,
  y: number,
  z: number,
  yaw?: number,
  pitch = 0
): IFortressDoorDef | null {
  let best: IFortressDoorDef | null = null;
  let bestScore = -Infinity;
  let bestDist = Infinity;
  const hasGaze = yaw !== undefined;
  const fwdX = hasGaze ? -Math.sin(yaw) : 0;
  const fwdZ = hasGaze ? -Math.cos(yaw) : 0;

  for (let i = 0; i < FORTRESS_DOORS.length; i++) {
    const d = FORTRESS_DOORS[i];
    if (Math.abs(y - d.y) > 2.25) continue;
    const distCenter = Math.hypot(x - d.x, z - d.z);
    const maxDoorDist = hasGaze ? Math.min(d.interactRadius, 3.4) : d.interactRadius;
    if (distCenter > maxDoorDist) continue;

    if (hasGaze) {
      if (Math.abs(pitch) > 1.18) continue;
      const targetX = Math.max(d.minX, Math.min(d.maxX, x + fwdX * distCenter));
      const targetZ = Math.max(d.minZ, Math.min(d.maxZ, z + fwdZ * distCenter));
      const dx = targetX - x;
      const dz = targetZ - z;
      const len = Math.hypot(dx, dz);
      const horizDot = len > 0.15 ? (dx * fwdX + dz * fwdZ) / len : 1.0;
      if (horizDot < 0.68) continue;
      const score = horizDot * 2.5 - distCenter / maxDoorDist;
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    } else if (distCenter < bestDist) {
      bestDist = distCenter;
      best = d;
    }
  }
  return best;
}

export interface IWorldBedDef {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw?: number;
  readonly interactRadius: number;
}

/** Summary: Registry of sleepable beds across farmhouses, lodges, cabins, and camps (no bed at forest spawn). */
export const WORLD_BEDS: readonly IWorldBedDef[] = [
  {
    id: 'bed-hunter-lodge',
    name: t('beds.hunter_lodge'),
    x: HUNTER_LODGE_POS.x - 3.2,
    y: HUNTER_LODGE_POS.height + 0.2,
    z: HUNTER_LODGE_POS.z + 2.4,
    yaw: 0,
    interactRadius: 3.4,
  },
  {
    id: 'bed-farm-west',
    name: t('beds.farm_west'),
    x: VALLEY_FARMS[0].x + 3.4 * VALLEY_FARMS[0].dirZ,
    y: VALLEY_FARMS[0].height + 0.18,
    z: VALLEY_FARMS[0].z - 4.85 * VALLEY_FARMS[0].dirZ,
    yaw: VALLEY_FARMS[0].dirZ === 1 ? 0 : Math.PI,
    interactRadius: 3.4,
  },
  {
    id: 'bed-farm-south',
    name: t('beds.farm_south'),
    x: VALLEY_FARMS[1].x + 3.4 * VALLEY_FARMS[1].dirZ,
    y: VALLEY_FARMS[1].height + 0.18,
    z: VALLEY_FARMS[1].z - 4.85 * VALLEY_FARMS[1].dirZ,
    yaw: VALLEY_FARMS[1].dirZ === 1 ? 0 : Math.PI,
    interactRadius: 3.4,
  },
  {
    id: 'bed-farm-east',
    name: t('beds.farm_east'),
    x: VALLEY_FARMS[2].x + 3.4 * VALLEY_FARMS[2].dirZ,
    y: VALLEY_FARMS[2].height + 0.18,
    z: VALLEY_FARMS[2].z - 4.85 * VALLEY_FARMS[2].dirZ,
    yaw: VALLEY_FARMS[2].dirZ === 1 ? 0 : Math.PI,
    interactRadius: 3.4,
  },
  ...DWARVEN_STONE_HOUSES.flatMap((dh) => [
    {
      id: `bed-${dh.id}`,
      name: t('beds.stone_house'),
      x: dh.x - 2.0,
      y: dh.floorY,
      z: dh.z + 2.55,
      yaw: 0,
      interactRadius: 3.4,
    },
    {
      id: `bed-${dh.id}-east`,
      name: t('beds.stone_house'),
      x: dh.x + 2.0,
      y: dh.floorY,
      z: dh.z + 2.55,
      yaw: 0,
      interactRadius: 3.4,
    },
  ]),
  ...HILL_WATCHTOWERS.map((hw) => ({
    id: `sleeping-bag-${hw.id}`,
    name: t('beds.sleeping_bag'),
    x: hw.x + 1.85,
    y: hw.baseY + 0.22,
    z: hw.z - hw.doorSideLocalZ * 1.65,
    yaw: hw.doorSideLocalZ === 1 ? 0 : Math.PI,
    interactRadius: 3.2,
  })),
  ...[-30.0, 30.0].flatMap((px) => {
    const isWest = px < 0;
    const sideKey = isWest ? 'west' : 'east';
    const innerDir = isWest ? 1 : -1;
    const pavFloor2Y = CHINESE_FORTRESS_POS.pavilionFloor2Y;
    const pavCenterZ = -164.0 + FZ;
    const pavBackZ = -171.5 + FZ;
    const backRow = [0, 1, 2, 3, 4].map((r) => ({
      id: `sleeping-bag-${sideKey}-pav-back-${r}`,
      name: t('beds.sleeping_bag'),
      x: px + innerDir * (-2.6 + r * 2.1),
      y: pavFloor2Y,
      z: pavBackZ + 1.32,
      yaw: 0,
      interactRadius: 2.8,
    }));
    const sideRow = [0, 1, 2, 3].map((r) => ({
      id: `sleeping-bag-${sideKey}-pav-side-${r}`,
      name: t('beds.sleeping_bag'),
      x: px + innerDir * 7.62,
      y: pavFloor2Y,
      z: pavCenterZ - 2.6 + r * 1.95,
      yaw: isWest ? -Math.PI * 0.5 : Math.PI * 0.5,
      interactRadius: 2.8,
    }));
    return [...backRow, ...sideRow];
  }),
  {
    id: 'bed-floating-sky-sanctuary',
    name: 'Celestial Star-Sanctuary Canopy Bed',
    x: 760.0,
    y: 68.35,
    z: -35.0,
    yaw: 0,
    interactRadius: 3.6,
  },
] as const;

/**
 * Summary: Finds the nearest sleepable bed within interaction range (and gaze cone when yaw is provided).
 */
export function findNearestBed(
  x: number,
  y: number,
  z: number,
  maxDistOverride?: number,
  yaw?: number,
  pitch = 0
): IWorldBedDef | null {
  let best: IWorldBedDef | null = null;
  let bestDist = Infinity;
  let bestScore = -Infinity;
  const hasGaze = yaw !== undefined;
  for (let i = 0; i < WORLD_BEDS.length; i++) {
    const b = WORLD_BEDS[i];
    if (Math.abs(y - b.y) > 2.25) continue;
    const maxR = hasGaze
      ? Math.min(maxDistOverride ?? b.interactRadius, 2.7)
      : (maxDistOverride ?? b.interactRadius);
    if (hasGaze) {
      const score = computeInteractableGazeScore(x, y, z, yaw, pitch, b.x, b.y, b.z, maxR);
      if (score > bestScore) {
        bestScore = score;
        best = b;
      }
    } else {
      const d = Math.hypot(x - b.x, z - b.z);
      if (d <= maxR && d < bestDist) {
        bestDist = d;
        best = b;
      }
    }
  }
  return best;
}

/**
 * Summary: Spawn point inside the Hunter's Lodge cabin (which has a water trough and stable beside it)
 * used when starting a new game in Survival mode.
 */
export const SURVIVAL_CABIN_SPAWN = {
  x: HUNTER_LODGE_POS.x + 1.75,
  y: HUNTER_LODGE_POS.height + 0.2,
  z: HUNTER_LODGE_POS.z + 1.15,
  yaw: -2.356,
  pitch: -0.12,
} as const;

/**
 * Summary: Registry of interactive loot chests in the world.
 * Includes the starter chest inside the Hunter's Lodge cabin containing clothing and a basic sword.
 */
export const WORLD_CHESTS: readonly IWorldChest[] = [
  {
    id: 'chest-hunter-lodge',
    name: "Hunter's Cabin Chest",
    x: HUNTER_LODGE_POS.x + 3.55,
    y: HUNTER_LODGE_POS.height + 0.2,
    z: HUNTER_LODGE_POS.z + 2.95,
    interactRadius: 4.2,
    contents: ['ranger_garb', 'sword', 'woodcutter_axe'],
  },
  // Room 1 — Orderly Dwarven Entry Staging & Mess Hall Supply Crates
  {
    // Ancient Mine: storage yard of the great hall
    id: 'crate-mine-mess-provisions',
    name: 'Mess Hall Provisions Crate',
    x: SOUTHERN_MINE_POS.x + -37.0,
    y: MINE_LEVEL_Y.upperCavern,
    z: SOUTHERN_MINE_POS.entranceZ + 47.0,
    interactRadius: 4.2,
    goldCoins: 14,
    contents: ['fresh_bread_loaf', 'harbor_cheese_wheel', 'roasted_meat', 'dwarven_miner_tunic'],
  },
  {
    // Ancient Mine: hall workbench
    id: 'crate-mine-quartermaster-tools',
    name: "Quartermaster's Tool & Ore Crate",
    x: SOUTHERN_MINE_POS.x + 32.0,
    y: MINE_LEVEL_Y.upperCavern,
    z: SOUTHERN_MINE_POS.entranceZ + 27.0,
    interactRadius: 4.2,
    goldCoins: 19,
    contents: ['dwarven_pickaxe', 'iron_ingots', 'dwarven_gold_ore', 'dwarven_iron_boots'],
  },
  {
    // Ancient Mine: railway control booth
    id: 'crate-mine-staging-gems',
    name: "Foreman's Sealed Supply Crate",
    x: SOUTHERN_MINE_POS.x + 12.0,
    y: MINE_LEVEL_Y.upperCavern,
    z: SOUTHERN_MINE_POS.entranceZ + 92.0,
    interactRadius: 4.2,
    goldCoins: 24,
    contents: ['amethyst_gem', 'sapphire_gem', 'dwarven_gold_ore', 'oak_timber'],
  },
  // Chamber 2 — Deep Waterfall & Bioluminescent Lagoon Lakeside Dock Crate
  {
    // Ancient Mine: lagoon shore
    id: 'crate-mine-lagoon-dock',
    name: 'Lagoon Expedition Crystal Crate',
    x: SOUTHERN_MINE_POS.x + -60.5,
    y: MINE_LEVEL_Y.upperCavern,
    z: SOUTHERN_MINE_POS.entranceZ + 51.0,
    interactRadius: 4.2,
    goldCoins: 28,
    contents: ['sapphire_gem', 'amethyst_gem', 'crystal_gem', 'fresh_bread_loaf'],
  },
  // Chamber 3 — Dwarven Gold & Silver Smelting Foundry Vault Crate
  {
    // Ancient Mine: foundry ore bin
    id: 'crate-mine-foundry-vault',
    name: 'Smelting Foundry Bullion Crate',
    x: SOUTHERN_MINE_POS.x + 114.0,
    y: MINE_LEVEL_Y.upperCavern,
    z: SOUTHERN_MINE_POS.entranceZ + 108.0,
    interactRadius: 4.2,
    goldCoins: 45,
    contents: ['dwarven_gold_ore', 'iron_ingots', 'dwarven_warhammer', 'sapphire_gem'],
  },
  // Chamber 4 — Great Hall of Khazad-dûm South Royal Sanctuary Treasury Chest
  {
    // Ancient Mine: at the first king's feet
    id: 'chest-moria-royal-sanctuary',
    name: 'Royal Treasury Chest of Khazad-dûm',
    x: SOUTHERN_MINE_POS.x + 2.0,
    y: MINE_LEVEL_Y.kingBalcony,
    z: SOUTHERN_MINE_POS.entranceZ + 303.6,
    interactRadius: 4.4,
    goldCoins: 85,
    contents: ['dwarven_warhammer', 'dwarven_gold_ore', 'amethyst_gem', 'sapphire_gem', 'crystal_gem'],
  },
  // Chamber 4A — Hall of the Mountain Kings Royal Throne Coffer (West Split North Branch)
  {
    // Ancient Mine: heroes' cliff path
    id: 'chest-moria-hall-of-kings',
    name: 'Mountain King Throne Coffer',
    x: SOUTHERN_MINE_POS.x + -105.0,
    y: MINE_LEVEL_Y.kingBalcony,
    z: SOUTHERN_MINE_POS.entranceZ + 290.0,
    interactRadius: 4.2,
    goldCoins: 110,
    contents: ['dwarven_warhammer', 'dwarven_gold_ore', 'sapphire_gem', 'amethyst_gem', 'crystal_gem'],
  },
  // Chamber 4C — Dragon-Forge & Titan Anvil Vault Coffer (East Exit)
  {
    // Ancient Mine: dragon forge east wall
    id: 'chest-moria-dragon-forge',
    name: 'Dragon-Forge MasterSmith Chest',
    x: SOUTHERN_MINE_POS.x + 36.5,
    y: MINE_LEVEL_Y.forgeFloor,
    z: SOUTHERN_MINE_POS.entranceZ + 448.0,
    interactRadius: 4.2,
    goldCoins: 95,
    contents: ['dwarven_pickaxe', 'dwarven_warhammer', 'iron_ingots', 'dwarven_gold_ore', 'sapphire_gem'],
  },
  // Area 3 — Hidden Rune Vault Behind the Waterfall Secret Chest
  {
    // Ancient Mine: hidden alcove behind the lagoon waterfall
    id: 'chest-mine-waterfall-secret',
    name: 'Ancient Waterfall Rune Vault Chest',
    x: SOUTHERN_MINE_POS.x + MINE_POI.waterfallAlcove.lx,
    y: MINE_LEVEL_Y.upperCavern,
    z: SOUTHERN_MINE_POS.entranceZ + MINE_POI.waterfallAlcove.lz,
    interactRadius: 4.2,
    goldCoins: 125,
    contents: ['sapphire_gem', 'amethyst_gem', 'crystal_gem', 'dwarven_gold_ore'],
  },
  // Area 11 — Southern Dragon Forge & Treasure Chamber Sanctum Chest
  {
    // Ancient Mine: the treasure island in the lava
    id: 'chest-mine-dragon-forge-sanctum',
    name: 'Ancient Dwarven Dragon-Forge Treasure Chest',
    x: SOUTHERN_MINE_POS.x + MINE_POI.treasureChest.lx,
    y: TREASURE_ISLAND.topY,
    z: SOUTHERN_MINE_POS.entranceZ + MINE_POI.treasureChest.lz,
    interactRadius: 4.4,
    goldCoins: 240,
    contents: ['dwarven_warhammer', 'dwarven_pickaxe', 'dwarven_gold_ore', 'sapphire_gem', 'amethyst_gem', 'crystal_gem'],
  },
] as const;

/**
 * Summary: Finds the nearest interactive loot chest within interaction range (and gaze cone when yaw is provided).
 */
export function findNearestWorldChest(
  x: number,
  y: number,
  z: number,
  openedChestIdsOrMaxDist?: readonly string[] | number,
  maxDistOverride?: number,
  yaw?: number,
  pitch = 0
): IWorldChest | null {
  const openedIds = Array.isArray(openedChestIdsOrMaxDist)
    ? (openedChestIdsOrMaxDist as readonly string[])
    : undefined;
  const distOverride =
    typeof openedChestIdsOrMaxDist === 'number' ? openedChestIdsOrMaxDist : maxDistOverride;

  let best: IWorldChest | null = null;
  let bestDist = Infinity;
  let bestScore = -Infinity;
  const hasGaze = yaw !== undefined;
  for (let i = 0; i < WORLD_CHESTS.length; i++) {
    const c = WORLD_CHESTS[i];
    if (openedIds && openedIds.includes(c.id)) continue;
    if (Math.abs(y - c.y) > 2.25) continue;
    const maxR = hasGaze
      ? Math.min(distOverride ?? c.interactRadius, 2.8)
      : (distOverride ?? c.interactRadius);
    if (hasGaze) {
      const score = computeInteractableGazeScore(x, y, z, yaw, pitch, c.x, c.y, c.z, maxR);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    } else {
      const d = Math.hypot(x - c.x, z - c.z);
      if (d <= maxR && d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
  }
  return best;
}

/** Summary: Trapper's Workbench landmark contract. */
export interface ITrapWorkbench {
  readonly id: string;
  readonly name: string;
  readonly nameHe: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly interactRadius: number;
}

/** Summary: Registry of interactive crafting workbenches across the world. */
export const WORLD_TRAP_WORKBENCHES: readonly ITrapWorkbench[] = [
  {
    id: 'trapper-workbench-cabin',
    name: "Trapper's Workbench",
    nameHe: "Trapper's Workbench",
    x: HUNTER_LODGE_POS.x - 0.2,
    y: HUNTER_LODGE_POS.height + 0.2,
    z: HUNTER_LODGE_POS.z + 2.55,
    minX: HUNTER_LODGE_POS.x - 1.25,
    maxX: HUNTER_LODGE_POS.x + 0.85,
    minZ: HUNTER_LODGE_POS.z + 1.9,
    maxZ: HUNTER_LODGE_POS.z + 3.2,
    interactRadius: 3.8,
  },
] as const;

/**
 * Summary: Computes gaze & proximity score against a workbench bounding box so standing
 * anywhere around the 2m wide workbench table and looking at any part of it registers cleanly.
 */
function computeWorkbenchBoxGazeScore(
  x: number,
  y: number,
  z: number,
  yaw: number,
  pitch: number,
  wb: ITrapWorkbench,
  maxDist: number
): number {
  if (Math.abs(y - wb.y) > 2.4) return -Infinity;
  if (Math.abs(pitch) > 1.38) return -Infinity;
  const clampedX = Math.max(wb.minX, Math.min(wb.maxX, x));
  const clampedZ = Math.max(wb.minZ, Math.min(wb.maxZ, z));
  const boxDist = Math.hypot(x - clampedX, z - clampedZ);
  const centerDist = Math.hypot(x - wb.x, z - wb.z);
  if (centerDist > maxDist && boxDist > maxDist - 0.5) return -Infinity;

  const fwdX = -Math.sin(yaw);
  const fwdZ = -Math.cos(yaw);
  const lookTargetX = Math.max(wb.minX, Math.min(wb.maxX, x + fwdX * Math.max(0.8, centerDist)));
  const lookTargetZ = Math.max(wb.minZ, Math.min(wb.maxZ, z + fwdZ * Math.max(0.8, centerDist)));
  const dx = lookTargetX - x;
  const dz = lookTargetZ - z;
  const len = Math.hypot(dx, dz);
  const horizDot = len > 0.12 ? (dx * fwdX + dz * fwdZ) / len : 1.0;

  // Allow generous gaze cone toward any part of the workbench, or very close proximity (< 1.15m from table edge)
  if (horizDot < 0.28 && !(boxDist <= 1.15 && horizDot >= -0.05)) {
    return -Infinity;
  }
  return Math.max(0.4, horizDot) * 2.6 - boxDist / Math.max(1.0, maxDist);
}

/**
 * Summary: Finds the nearest interactive trap workbench within interaction range and gaze cone.
 */
export function findNearestTrapWorkbench(
  x: number,
  y: number,
  z: number,
  maxDist = 3.8,
  yaw?: number,
  pitch = 0
): ITrapWorkbench | null {
  let best: ITrapWorkbench | null = null;
  let bestDist = Infinity;
  let bestScore = -Infinity;
  const hasGaze = yaw !== undefined;
  for (let i = 0; i < WORLD_TRAP_WORKBENCHES.length; i++) {
    const wb = WORLD_TRAP_WORKBENCHES[i];
    if (Math.abs(y - wb.y) > 2.4) continue;
    const maxR = Math.min(maxDist, wb.interactRadius);
    if (hasGaze) {
      const score = computeWorkbenchBoxGazeScore(x, y, z, yaw, pitch, wb, maxR);
      if (score > bestScore) {
        bestScore = score;
        best = wb;
      }
    } else {
      const clampedX = Math.max(wb.minX, Math.min(wb.maxX, x));
      const clampedZ = Math.max(wb.minZ, Math.min(wb.maxZ, z));
      const d = Math.hypot(x - clampedX, z - clampedZ);
      if (d <= maxR && d < bestDist) {
        bestDist = d;
        best = wb;
      }
    }
  }
  return best;
}

/**
 * Summary: Resolves the single best interactive object (chest, bed, door, or trap workbench) that the player
 * is standing close to AND looking directly at, preventing nearby chests/beds behind or beside
 * the player from hijacking door interactions.
 */
export function resolveBestLookedAtInteraction(
  x: number,
  y: number,
  z: number,
  yaw: number,
  pitch = 0
): {
  kind: 'chest' | 'bed' | 'door' | 'trap_workbench' | 'none';
  chest: IWorldChest | null;
  bed: IWorldBedDef | null;
  door: IFortressDoorDef | null;
  trapWorkbench: ITrapWorkbench | null;
} {
  const chest = findNearestWorldChest(x, y, z, undefined, undefined, yaw, pitch);
  const bed = findNearestBed(x, y, z, undefined, yaw, pitch);
  const door = findNearestFortressDoor(x, y, z, yaw, pitch);
  const trapWorkbench = findNearestTrapWorkbench(x, y, z, 3.8, yaw, pitch);

  const chestScore = chest
    ? computeInteractableGazeScore(x, y, z, yaw, pitch, chest.x, chest.y, chest.z, 2.8)
    : -Infinity;
  const bedScore = bed
    ? computeInteractableGazeScore(x, y, z, yaw, pitch, bed.x, bed.y, bed.z, 2.7)
    : -Infinity;
  const trapWorkbenchScore = trapWorkbench
    ? computeWorkbenchBoxGazeScore(x, y, z, yaw, pitch, trapWorkbench, trapWorkbench.interactRadius)
    : -Infinity;

  let doorScore = -Infinity;
  if (door) {
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);
    const distCenter = Math.hypot(x - door.x, z - door.z);
    const maxDoorDist = Math.min(door.interactRadius, 3.4);
    const targetX = Math.max(door.minX, Math.min(door.maxX, x + fwdX * distCenter));
    const targetZ = Math.max(door.minZ, Math.min(door.maxZ, z + fwdZ * distCenter));
    const dx = targetX - x;
    const dz = targetZ - z;
    const len = Math.hypot(dx, dz);
    const horizDot = len > 0.15 ? (dx * fwdX + dz * fwdZ) / len : 1.0;
    doorScore = horizDot * 2.5 - distCenter / maxDoorDist;
  }

  const maxScore = Math.max(chestScore, bedScore, doorScore, trapWorkbenchScore);
  if (maxScore === -Infinity) {
    return { kind: 'none', chest: null, bed: null, door: null, trapWorkbench: null };
  }
  if (maxScore === doorScore && door) {
    return { kind: 'door', chest: null, bed: null, door, trapWorkbench: null };
  }
  if (maxScore === trapWorkbenchScore && trapWorkbench) {
    return { kind: 'trap_workbench', chest: null, bed: null, door: null, trapWorkbench };
  }
  if (maxScore === chestScore && chest) {
    return { kind: 'chest', chest, bed: null, door: null, trapWorkbench: null };
  }
  if (bed) {
    return { kind: 'bed', chest: null, bed, door: null, trapWorkbench: null };
  }
  return { kind: 'none', chest: null, bed: null, door: null, trapWorkbench: null };
}
// #endregion


