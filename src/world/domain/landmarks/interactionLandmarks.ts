// ============================================================================
// MODULE: World / Domain / Landmarks / Interactions
// DESIGN: Ladder climbing queries and door gaze raycasting detection (SRP)
// SUMMARY: Manages runtime detection for climbable vertical ladders and enterable doors
//          across watchtowers, farmhouses, dwarven mines, and harbor structures.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { IClimbableLadderInfo, IFortressDoorDef } from '../worldTypes';
import { t } from '../../../locales';
import { CHINESE_FORTRESS_POS, CORNER_WATCHTOWERS, FORTRESS_Z_OFFSET } from './fortressLandmarks';
import { HILL_WATCHTOWERS } from './highlandBridgeLandmarks';
import { SOUTHEAST_HARBOR_POS, SOUTHWEST_OASIS_POS } from './oasisAndHarborLandmarks';
import { HUNTER_LODGE_POS, VALLEY_FARMS } from './settlementLandmarks';
import { DWARVEN_STONE_HOUSES } from './dwarvenLandmarks';
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
 * Design: Standard domain component following SRP and clean architectural contracts.
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
 * Design: Standard domain component following SRP and clean architectural contracts.
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
  let bestDist = Infinity;
  const hasGaze = yaw !== undefined;
  const fwdX = hasGaze ? -Math.sin(yaw) : 0;
  const fwdZ = hasGaze ? -Math.cos(yaw) : 0;

  for (let i = 0; i < FORTRESS_DOORS.length; i++) {
    const d = FORTRESS_DOORS[i];
    if (Math.abs(y - d.y) > 3.5) continue;
    const distCenter = Math.hypot(x - d.x, z - d.z);
    if (distCenter > d.interactRadius) continue;

    if (hasGaze) {
      if (Math.abs(pitch) > 1.18) continue;
      const targetX = Math.max(d.minX, Math.min(d.maxX, x + fwdX * distCenter));
      const targetZ = Math.max(d.minZ, Math.min(d.maxZ, z + fwdZ * distCenter));
      const dx = targetX - x;
      const dz = targetZ - z;
      const len = Math.hypot(dx, dz);
      if (len > 0.15) {
        const horizDot = (dx * fwdX + dz * fwdZ) / len;
        if (horizDot < 0.56) continue;
      }
    }

    if (distCenter < bestDist) {
      bestDist = distCenter;
      best = d;
    }
  }
  return best;
}
// #endregion
