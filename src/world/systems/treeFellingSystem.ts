// ============================================================================
// MODULE: World / Systems / Tree Felling & Wood Harvesting System
// DESIGN: Pure state machine for chopping trees with the Woodcutter's Axe,
//         falling tree hazard damage to the player, and [E] multi-wood harvesting.
// ============================================================================

import type { IObstacle, IPlayerState, InventoryItemId } from '../domain/worldTypes';
import { groundHeightAt } from './terrainAndBiomeSystem';

export type ChoppableTreeKind = 'pine' | 'oak' | 'birch' | 'palm' | 'acacia';

export interface ITreeFellingRecord {
  id: string;
  obstacleIndex: number;
  kind: ChoppableTreeKind;
  x: number;
  y: number;
  z: number;
  scale: number;
  chops: number;
  maxChops: number;
  status: 'chopping' | 'falling' | 'fallen' | 'harvested';
  shakeTimer: number;
  fallYaw: number;
  fallTimer: number;
  fallDuration: number;
  fallAngleRad: number;
  damagedPlayer: boolean;
  woodYield: number;
  originalRadius: number;
}

export interface IStrikeTreeResult {
  hit: boolean;
  felled: boolean;
  tree: ITreeFellingRecord | null;
  notification: string | null;
}

export interface IStepTreeFellingResult {
  playerDamaged: boolean;
  damageAmount: number;
  hitByTreeId: string | null;
  notification: string | null;
}

export interface IHarvestFallenTreeResult {
  ok: boolean;
  treeId: string | null;
  itemId: InventoryItemId;
  woodCount: number;
  notification: string | null;
}

export const CHOPS_REQUIRED_TO_FELL = 2;
export const TREE_FALL_DURATION_SEC = 2.2;
export const FALLING_TREE_PLAYER_DAMAGE = 32;
export const FALLEN_TREE_INTERACT_RADIUS = 5.2;

const activeTreeRecords = new Map<number, ITreeFellingRecord>();

export function isChoppableTreeKind(kind: string): kind is ChoppableTreeKind {
  return (
    kind === 'pine' ||
    kind === 'oak' ||
    kind === 'birch' ||
    kind === 'palm' ||
    kind === 'acacia'
  );
}

export function resetTreeFellingSystem(obstacles?: IObstacle[]): void {
  if (obstacles) {
    for (const rec of activeTreeRecords.values()) {
      const obs = obstacles[rec.obstacleIndex];
      if (obs && rec.originalRadius > 0) {
        obs.radius = rec.originalRadius;
      }
    }
  }
  activeTreeRecords.clear();
}

export function getActiveTreeFellingRecords(): ReadonlyMap<number, ITreeFellingRecord> {
  return activeTreeRecords;
}

export function getTreeFellingRecordByIndex(
  obstacleIndex: number
): ITreeFellingRecord | undefined {
  return activeTreeRecords.get(obstacleIndex);
}

export function getTreeDisplayName(kind: ChoppableTreeKind): string {
  switch (kind) {
    case 'pine':
      return 'Pine Tree';
    case 'oak':
      return 'Oak Tree';
    case 'birch':
      return 'Autumn Oak Tree';
    case 'palm':
      return 'Palm Tree';
    case 'acacia':
      return 'Acacia Tree';
  }
}

/**
 * Evaluates a Woodcutter's Axe strike against nearby standing trees in the player's aim cone.
 */
export function strikeTreeWithAxe(
  playerState: IPlayerState,
  obstacles: IObstacle[],
  isHeavyAttack = false,
  overrideFallYaw?: number
): IStrikeTreeResult {
  const reach = isHeavyAttack ? 4.4 : 3.9;
  const fwdX = -Math.sin(playerState.yaw);
  const fwdZ = -Math.cos(playerState.yaw);

  let bestIdx = -1;
  let bestScore = Infinity;

  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    if (!isChoppableTreeKind(obs.kind)) continue;

    const existing = activeTreeRecords.get(i);
    if (existing && (existing.status === 'falling' || existing.status === 'fallen' || existing.status === 'harvested')) {
      continue;
    }

    const dx = obs.x - playerState.x;
    const dz = obs.z - playerState.z;
    const centerDist = Math.hypot(dx, dz);
    const surfaceDist = Math.max(0, centerDist - obs.radius);
    if (surfaceDist > reach) continue;

    const invDist = centerDist > 0.001 ? 1 / centerDist : 1;
    const dot = (dx * fwdX + dz * fwdZ) * invDist;
    if (centerDist > 1.35 && dot < 0.25) continue;

    const score = surfaceDist - dot * 1.15;
    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  if (bestIdx < 0) {
    return { hit: false, felled: false, tree: null, notification: null };
  }

  const obs = obstacles[bestIdx];
  const treeKind = obs.kind as ChoppableTreeKind;
  let rec = activeTreeRecords.get(bestIdx);
  if (!rec) {
    const groundY = groundHeightAt(obs.x, obs.z);
    const woodYield = 3 + (bestIdx % 2); // 3 or 4 pieces of Oak Wood per tree
    rec = {
      id: `tree-${bestIdx}`,
      obstacleIndex: bestIdx,
      kind: treeKind,
      x: obs.x,
      y: groundY,
      z: obs.z,
      scale: obs.scale || 1.0,
      chops: 0,
      maxChops: CHOPS_REQUIRED_TO_FELL,
      status: 'chopping',
      shakeTimer: 0,
      fallYaw: 0,
      fallTimer: 0,
      fallDuration: TREE_FALL_DURATION_SEC,
      fallAngleRad: 0,
      damagedPlayer: false,
      woodYield,
      originalRadius: obs.radius,
    };
    activeTreeRecords.set(bestIdx, rec);
  }

  const chopIncrement = isHeavyAttack ? 2 : 1;
  rec.chops += chopIncrement;
  rec.shakeTimer = 0.42;

  const hitX = obs.x - fwdX * Math.min(0.45, obs.radius * 0.7);
  const hitZ = obs.z - fwdZ * Math.min(0.45, obs.radius * 0.7);
  playerState.lastSwordHitPoint = {
    x: hitX,
    y: playerState.y + 1.15,
    z: hitZ,
    age: 0,
    kind: 'wood',
  };

  if (rec.chops >= rec.maxChops) {
    rec.status = 'falling';
    rec.fallTimer = 0;
    rec.fallAngleRad = 0;
    rec.damagedPlayer = false;
    // Direction from tree to player so the tree can fall toward the player if they don't step aside
    const toPlayerYaw = Math.atan2(playerState.x - obs.x, playerState.z - obs.z);
    rec.fallYaw =
      overrideFallYaw !== undefined
        ? overrideFallYaw
        : toPlayerYaw;
    return {
      hit: true,
      felled: true,
      tree: rec,
      notification: `Timber! ${getTreeDisplayName(rec.kind)} is falling — watch out!`,
    };
  }

  return {
    hit: true,
    felled: false,
    tree: rec,
    notification: `Chopped ${getTreeDisplayName(rec.kind)} (${rec.chops}/${rec.maxChops})`,
  };
}

/**
 * Advances falling tree animations and checks if any falling tree strikes the player.
 */
export function stepTreeFellingSystem(
  dt: number,
  playerState: IPlayerState,
  obstacles: IObstacle[]
): IStepTreeFellingResult {
  let playerDamaged = false;
  let totalDamage = 0;
  let hitByTreeId: string | null = null;
  let notification: string | null = null;

  for (const rec of activeTreeRecords.values()) {
    if (rec.shakeTimer > 0) {
      rec.shakeTimer = Math.max(0, rec.shakeTimer - dt);
    }

    if (rec.status === 'falling') {
      rec.fallTimer = Math.min(rec.fallDuration, rec.fallTimer + dt);
      const u = Math.min(1, rec.fallTimer / Math.max(0.1, rec.fallDuration));
      // Accelerating gravity-like fall curve (slow start, fast crash at the end)
      const accelCurve = u * u * (2.2 - 1.2 * u);
      rec.fallAngleRad = Math.min(1.42, Math.max(0, accelCurve * 1.42));

      // Check if falling trunk/canopy hits the player while crashing down (between 35% and 96% fall progress)
      if (!rec.damagedPlayer && u >= 0.35 && u <= 0.96) {
        const dirX = Math.sin(rec.fallYaw);
        const dirZ = Math.cos(rec.fallYaw);
        const relX = playerState.x - rec.x;
        const relZ = playerState.z - rec.z;

        // Projection along the falling trunk axis [0.4m .. trunkLength]
        const trunkLength = 7.8 * Math.max(0.75, rec.scale);
        const along = relX * dirX + relZ * dirZ;
        const perp = Math.abs(relX * dirZ - relZ * dirX);
        const corridorHalfWidth = 1.65 * Math.max(0.8, rec.scale);

        if (along >= -0.35 && along <= trunkLength && perp <= corridorHalfWidth) {
          rec.damagedPlayer = true;
          const dmg = FALLING_TREE_PLAYER_DAMAGE;
          playerState.hp = Math.max(0, (playerState.hp ?? 100) - dmg);
          playerState.damageFlashTimer = 0.95;
          playerDamaged = true;
          totalDamage += dmg;
          hitByTreeId = rec.id;
          notification = `Crushed by falling ${getTreeDisplayName(rec.kind)}! (-${dmg} HP)`;
        }
      }

      if (rec.fallTimer >= rec.fallDuration) {
        rec.status = 'fallen';
        rec.fallAngleRad = 1.42;
        const obs = obstacles[rec.obstacleIndex];
        if (obs) {
          // Leave a small stump collider or clear trunk passability
          obs.radius = Math.min(obs.radius, 0.32);
        }
      }
    }
  }

  return {
    playerDamaged,
    damageAmount: totalDamage,
    hitByTreeId,
    notification,
  };
}

/**
 * Finds the nearest fallen (unharvested) tree within interaction range of the player.
 * Checks both the tree stump base and the fallen trunk midpoint so the player can press [E]
 * anywhere along the fallen trunk.
 */
export function findNearestFallenTree(
  playerX: number,
  playerZ: number,
  maxDist = FALLEN_TREE_INTERACT_RADIUS
): ITreeFellingRecord | null {
  let nearest: ITreeFellingRecord | null = null;
  let bestDist = maxDist;

  for (const rec of activeTreeRecords.values()) {
    if (rec.status !== 'fallen') continue;

    const dirX = Math.sin(rec.fallYaw);
    const dirZ = Math.cos(rec.fallYaw);
    const trunkLength = 6.8 * Math.max(0.75, rec.scale);

    // Distance to closest point on the fallen log segment from (rec.x, rec.z) to (rec.x + dirX*L, rec.z + dirZ*L)
    const relX = playerX - rec.x;
    const relZ = playerZ - rec.z;
    const t = Math.max(0, Math.min(trunkLength, relX * dirX + relZ * dirZ));
    const closestX = rec.x + dirX * t;
    const closestZ = rec.z + dirZ * t;
    const dist = Math.hypot(playerX - closestX, playerZ - closestZ);

    if (dist <= bestDist) {
      bestDist = dist;
      nearest = rec;
    }
  }

  return nearest;
}

/**
 * Harvests a fallen tree when the player presses [E], awarding multiple pieces of Oak Wood.
 */
export function harvestFallenTree(
  playerState: IPlayerState,
  tree: ITreeFellingRecord | null | undefined,
  obstacles?: IObstacle[]
): IHarvestFallenTreeResult {
  if (!tree || tree.status !== 'fallen') {
    return {
      ok: false,
      treeId: null,
      itemId: 'oak_timber',
      woodCount: 0,
      notification: null,
    };
  }

  tree.status = 'harvested';
  if (obstacles && obstacles[tree.obstacleIndex]) {
    obstacles[tree.obstacleIndex].radius = 0;
  }

  const woodCount = Math.max(3, tree.woodYield);
  if (!playerState.ownedItemIds) {
    playerState.ownedItemIds = [];
  }
  for (let i = 0; i < woodCount; i++) {
    playerState.ownedItemIds.push('oak_timber');
  }

  const treeLabel = getTreeDisplayName(tree.kind);
  const notification = `Harvested ${treeLabel}: Oak Wood x${woodCount}`;
  playerState.lastLootNotification = {
    text: notification,
    timer: 3.6,
  };

  return {
    ok: true,
    treeId: tree.id,
    itemId: 'oak_timber',
    woodCount,
    notification,
  };
}
