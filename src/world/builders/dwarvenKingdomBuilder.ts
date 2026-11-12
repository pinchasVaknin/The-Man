// ============================================================================
// MODULE: World / Builders / Dwarven Kingdom Builder
// DESIGN: Builder for dwarven entrance arch, guardian statues, houses & miners (SRP)
// SUMMARY: Constructs the colossal twin king statues, 4 enterable stone houses,
//          8 animated dwarven miners, and caravan schedule animation updates.
// ============================================================================

// ======================== IMPORTS & CONTRACTS ======================== \\
// #region Imports & Contracts
import * as THREE from 'three';
import {
  DWARVEN_GUARDIAN_STATUES,
  DWARVEN_STONE_HOUSES,
  VIEW_DISTANCE,
  isWithinViewDistance,
} from '../domain/landmarksRegistry';
import {
  DWARVEN_MINERS_COUNT,
  DWARVEN_MINER_STATIONS,
  computeDwarvenMinerCaravanState,
  evaluateMinecartTrackState,
} from '../systems/dwarvenMineAndCaravanSystem';
import {
  walkableHeightAt,
  getSurfaceNormalAt,
  computeSlopePitchAndRoll, walkableHeightValueAt } from '../systems/terrainAndBiomeSystem';
import { getPlayerState } from '../systems/playerPhysicsSystem';
import {
  createReadyDwarfWarrior,
  type IDwarfWarriorRig,
  type DwarfWarriorState,
} from '../models/Characters/DwarfWarrior_Complete';

import { steerAroundWalls } from '../domain/wallNavigation';
import type { IPlayerState, IArrowProjectile, InventoryItemId } from '../domain/worldTypes';
import { getNearbySolidBuildingBoxes, pointInsideSolidBuildingBox, resolveHorizontalBoxCollision } from '../domain/collisionWorld';

/**
 * Summary: Rig representation for an individual animated dwarven miner mesh.
 * Design: Encapsulates Three.js group, skeletal DwarfWarrior rig, and retaliation combat state.
 */
export interface IDwarvenMinerRig {
  id: number;
  name: string;
  level: number;
  root: THREE.Group;
  ctrl: IDwarfWarriorRig;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  torsoPivot: THREE.Group;
  lanternGlow: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  isDead: boolean;
  isLooted: boolean;
  goldDrop: number;
  lootItems: InventoryItemId[];
  outOfAreaRespawnTimer: number;
  deathTimer: number;
  hitFlashTimer: number;
  hitBarTimer: number;
  isAggro: boolean;
  aggroTimer: number;
  attackCooldown: number;
  currentAttackClip: 'attack1' | 'attack2' | 'attack3';
  lastElapsedTime: number;
}

const activeDwarvenMiners: IDwarvenMinerRig[] = [];

/**
 * Summary: Generates randomized loot for a Dwarven Miner:
 * - Modest random gold coins (7–22 gold)
 * - Strictly mutually exclusive tool/weapon: sometimes a Pickaxe ('dwarven_pickaxe'), sometimes a Warhammer ('dwarven_warhammer'), or neither (never both!)
 * - Small Dwarven garment (non-wearable by the player): 'dwarven_miner_tunic' or 'dwarven_iron_boots'
 * - 1–2 random gemstones, ores, or miner rations
 */
/** Dwarf body radius used for wall routing (metres). */
const DWARF_BODY_RADIUS = 0.6;

export function generateRandomDwarfLoot(seedOffset = 0): {
  goldDrop: number;
  lootItems: InventoryItemId[];
} {
  const r1 = Math.random();
  const r2 = Math.random();
  const r3 = Math.random();
  const r4 = Math.random();
  const r5 = Math.random();
  const goldDrop = 7 + Math.floor(((r1 + seedOffset * 0.13) % 1) * 16);
  const lootItems: InventoryItemId[] = [];

  // 1. Tool/Weapon: Pickaxe OR Warhammer OR neither (strictly mutually exclusive — never both)
  if (r2 < 0.45) {
    lootItems.push('dwarven_pickaxe');
  } else if (r2 < 0.82) {
    lootItems.push('dwarven_warhammer');
  }

  // 2. Small Dwarven Garment (non-wearable by human player)
  if (r3 < 0.55) {
    lootItems.push('dwarven_miner_tunic');
  } else {
    lootItems.push('dwarven_iron_boots');
  }

  // 3. Gemstones / Ores / Supplies (1–2 random items)
  const gemAndOrePool: readonly InventoryItemId[] = [
    'amethyst_gem',
    'sapphire_gem',
    'crystal_gem',
    'dwarven_gold_ore',
    'iron_ingots',
  ];
  lootItems.push(gemAndOrePool[Math.floor(r4 * gemAndOrePool.length)]);

  if (r5 < 0.65) {
    const bonusPool: readonly InventoryItemId[] = [
      'amethyst_gem',
      'sapphire_gem',
      'dwarven_gold_ore',
      'fresh_bread_loaf',
      'harbor_cheese_wheel',
    ];
    lootItems.push(bonusPool[Math.floor(((r5 * 10) % 1) * bonusPool.length)]);
  }

  return { goldDrop, lootItems };
}

export function getActiveDwarvenMiners(): readonly IDwarvenMinerRig[] {
  return activeDwarvenMiners;
}

/**
 * Summary: Finds the nearest dead, unlooted Dwarven Miner within `maxRange` of the player.
 */
export function findNearestDeadLootableDwarf(
  playerX: number,
  playerZ: number,
  maxRange = 3.4,
  playerY?: number
): IDwarvenMinerRig | null {
  let best: IDwarvenMinerRig | null = null;
  let bestDist = maxRange;
  for (let i = 0; i < activeDwarvenMiners.length; i++) {
    const dm = activeDwarvenMiners[i];
    if (!dm.isDead || dm.isLooted) continue;
    if (playerY !== undefined && Math.abs(playerY - dm.y) > 3.2) continue;
    const d = Math.hypot(dm.x - playerX, dm.z - playerZ);
    if (d <= bestDist) {
      bestDist = d;
      best = dm;
    }
  }
  return best;
}

/**
 * Summary: Initializes (if needed) and returns the mutable loot items array for a dead Dwarven Miner,
 *          and recovers any arrows stuck near the dwarf into its corpse container.
 */
export function getOrInitDwarfCorpseLoot(
  dwarf: IDwarvenMinerRig,
  activeArrows?: IArrowProjectile[]
): InventoryItemId[] {
  if (!dwarf.lootItems) {
    const generated = generateRandomDwarfLoot(dwarf.id);
    dwarf.lootItems = generated.lootItems;
    if (!dwarf.goldDrop || dwarf.goldDrop <= 0) {
      dwarf.goldDrop = generated.goldDrop;
    }
  }
  if (activeArrows && activeArrows.length > 0) {
    for (let i = activeArrows.length - 1; i >= 0; i--) {
      const arr = activeArrows[i];
      if (arr.stuck && Math.hypot(arr.x - dwarf.x, arr.z - dwarf.z) <= 2.4) {
        const arrowItemId: InventoryItemId =
          arr.arrowKind === 'fire'
            ? 'arrow_fire'
            : arr.arrowKind === 'wind'
              ? 'arrow_wind'
              : 'arrow_normal';
        dwarf.lootItems.push(arrowItemId);
        activeArrows.splice(i, 1);
      }
    }
  }
  return dwarf.lootItems;
}

/**
 * Summary: Loots a dead Dwarven Miner for all its gold coins and items
 *          and recovers any arrows stuck near the dwarf.
 */
export function lootDeadDwarf(
  playerState: IPlayerState,
  dwarf: IDwarvenMinerRig,
  activeArrows?: IArrowProjectile[]
): {
  looted: boolean;
  goldAdded: number;
  addedItems: InventoryItemId[];
  recoveredArrows: number;
  notification: string | null;
} {
  if (!dwarf.isDead || dwarf.isLooted) {
    return { looted: false, goldAdded: 0, addedItems: [], recoveredArrows: 0, notification: null };
  }
  const items = getOrInitDwarfCorpseLoot(dwarf, activeArrows);
  const goldAdded = Math.max(0, dwarf.goldDrop || 0);
  if (goldAdded > 0) {
    playerState.goldCoins = (playerState.goldCoins ?? 280) + goldAdded;
  }
  if (!playerState.ownedItemIds) {
    playerState.ownedItemIds = [];
  }
  const addedItems = [...items];
  for (const itemId of addedItems) {
    playerState.ownedItemIds.push(itemId);
  }
  dwarf.goldDrop = 0;
  dwarf.lootItems = [];
  dwarf.isLooted = true;

  const notification = `Looted ${dwarf.name}: +${goldAdded} Gold Coins${addedItems.length > 0 ? `, +${addedItems.length} Items` : ''}`;
  playerState.lastLootNotification = { text: notification, timer: 4.5 };
  return {
    looted: true,
    goldAdded,
    addedItems,
    recoveredArrows: 0,
    notification,
  };
}

/**
 * Summary: Returns the Dwarven Miner currently in active combat or recently hit by the player,
 *          used to display the top-center Enemy Health Bar & Level in the HUD.
 */
export function findActiveCombatDwarf(
  playerX: number,
  playerZ: number
): IDwarvenMinerRig | null {
  let best: IDwarvenMinerRig | null = null;
  let bestScore = -1;
  for (let i = 0; i < activeDwarvenMiners.length; i++) {
    const dm = activeDwarvenMiners[i];
    const dist = Math.hypot(dm.x - playerX, dm.z - playerZ);
    if (dm.hitBarTimer > 0) {
      const score = 100 + dm.hitBarTimer - dist * 0.1;
      if (score > bestScore) {
        bestScore = score;
        best = dm;
      }
    } else if (dm.isAggro && !dm.isDead && dist <= 28.0) {
      const score = 50 - dist;
      if (score > bestScore) {
        bestScore = score;
        best = dm;
      }
    }
  }
  return best;
}

/**
 * Summary: Finds a live Dwarven Miner that the player is aiming/looking at within `maxRange`,
 *          used to display the targeted creature HUD badge with name, level, and HP bar.
 */
export function findTargetedLiveDwarf(
  playerX: number,
  playerY: number,
  playerZ: number,
  playerYaw: number,
  playerPitch: number,
  maxRange = 18.0
): IDwarvenMinerRig | null {
  const fwdX = -Math.sin(playerYaw) * Math.cos(playerPitch);
  const fwdY = Math.sin(playerPitch);
  const fwdZ = -Math.cos(playerYaw) * Math.cos(playerPitch);
  const eyeY = playerY + 1.55;

  let best: IDwarvenMinerRig | null = null;
  let bestDot = 0.92;
  for (let i = 0; i < activeDwarvenMiners.length; i++) {
    const dm = activeDwarvenMiners[i];
    if (dm.isDead) continue;
    const dx = dm.x - playerX;
    const dy = dm.y + 0.9 - eyeY;
    const dz = dm.z - playerZ;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.2 || dist > maxRange) continue;
    const dot = (dx * fwdX + dy * fwdY + dz * fwdZ) / dist;
    if (dot > bestDot) {
      bestDot = dot;
      best = dm;
    }
  }
  return best;
}

/**
 * Summary: Checks if a player sword strike hits any Dwarven Miner, applies damage, and provokes or kills that dwarf.
 */
export function checkSwordHitDwarf(
  strikeX: number,
  strikeY: number,
  strikeZ: number,
  damage = 35
): IDwarvenMinerRig | null {
  for (let i = 0; i < activeDwarvenMiners.length; i++) {
    const dm = activeDwarvenMiners[i];
    if (dm.isDead) continue;
    const dHoriz = Math.hypot(strikeX - dm.x, strikeZ - dm.z);
    const inVert = strikeY >= dm.y - 0.35 && strikeY <= dm.y + 2.15;
    if (dHoriz <= 1.55 && inVert) {
      dm.hp = Math.max(0, dm.hp - Math.max(1, damage));
      dm.hitFlashTimer = 0.35;
      if (dm.hp <= 0) {
        const freshLoot = generateRandomDwarfLoot(dm.id);
        dm.isDead = true;
        dm.isLooted = false;
        dm.goldDrop = freshLoot.goldDrop;
        dm.lootItems = freshLoot.lootItems;
        dm.outOfAreaRespawnTimer = 0;
        dm.isAggro = false;
        dm.aggroTimer = 0;
        dm.deathTimer = 999999.0;
        dm.hitBarTimer = 2.4;
        dm.ctrl.speed = 0;
        dm.ctrl.setState('death', 0.12);
      } else {
        dm.isAggro = true;
        dm.aggroTimer = 40.0;
        dm.hitBarTimer = 8.0;
      }
      return dm;
    }
  }
  return null;
}

/**
 * Summary: Checks if a flying arrow hits any Dwarven Miner, applies damage, and provokes or kills that dwarf.
 */
export function checkArrowHitDwarf(
  arrowX: number,
  arrowY: number,
  arrowZ: number,
  damage = 35
): IDwarvenMinerRig | null {
  for (let i = 0; i < activeDwarvenMiners.length; i++) {
    const dm = activeDwarvenMiners[i];
    if (dm.isDead) continue;
    const dHoriz = Math.hypot(arrowX - dm.x, arrowZ - dm.z);
    const inVert = arrowY >= dm.y - 0.35 && arrowY <= dm.y + 2.15;
    if (dHoriz <= 1.42 && inVert) {
      dm.hp = Math.max(0, dm.hp - Math.max(1, damage));
      dm.hitFlashTimer = 0.35;
      if (dm.hp <= 0) {
        const freshLoot = generateRandomDwarfLoot(dm.id);
        dm.isDead = true;
        dm.isLooted = false;
        dm.goldDrop = freshLoot.goldDrop;
        dm.lootItems = freshLoot.lootItems;
        dm.outOfAreaRespawnTimer = 0;
        dm.isAggro = false;
        dm.aggroTimer = 0;
        dm.deathTimer = 999999.0;
        dm.hitBarTimer = 2.4;
        dm.ctrl.speed = 0;
        dm.ctrl.setState('death', 0.12);
      } else {
        dm.isAggro = true;
        dm.aggroTimer = 40.0;
        dm.hitBarTimer = 8.0;
      }
      return dm;
    }
  }
  return null;
}

/**
 * Summary: Construction context for generating the dwarven kingdom environment.
 * Design: Supplies Three.js scene, textures, and asset factories to dwarven kingdom builder.
 */
export interface IDwarvenKingdomBuilderContext {
  scene: THREE.Scene;
  mineGroup: THREE.Group;
  mineX: number;
  mineEntY: number;
  mineEntZ: number;
  cavernBackZ: number;
  stonePatternTex: THREE.Texture;
  mineGoldOreMat: THREE.Material;
  mineMoltenCoalMat: THREE.Material;
  barkMat: THREE.Material;
  timberMat: THREE.Material;
  darkIronMat: THREE.Material;
  forgeBrazierBaseGeo: THREE.BufferGeometry;
  forgeCoalMoundGeo: THREE.BufferGeometry;
  createLanternAssembly: (x: number, y: number, z: number, addLight?: boolean) => THREE.Group;
  disposableGeometries: THREE.BufferGeometry[];
  disposableMaterials: THREE.Material[];
  distanceCulledObjects: { obj: THREE.Object3D; cx: number; cz: number; radius: number }[];
  doorPivotHandles: {
    id: string;
    leftPivot: THREE.Group;
    rightPivot: THREE.Group;
    currentAngle: number;
  }[];
}

/**
 * Summary: Runtime handle for ticking dwarven kingdom animations and caravan movements.
 * Design: Exposes update callback invoked per frame within the main rendering loop.
 */
export interface IDwarvenKingdomHandle {
  dwarvenMiners: IDwarvenMinerRig[];
  updateDwarvenMiners: (
    worldHours: number,
    elapsedTime: number,
    playerX: number,
    playerZ: number
  ) => void;
}
// #endregion

// ======================== BUILD DWARVEN KINGDOM ======================== \\
// #region Build Dwarven Kingdom

/**
 * Builder Pattern for the Southern Dwarven Kingdom:
 * - Monumental Carved Dwarven Stone Portal Arch framing the Mine Entrance
 * - Twin Colossal LOTR-Style Dwarven King Guardian Statues (`DWARVEN_GUARDIAN_STATUES`)
 * - 4 Enterable Hollow Dwarven Stone Houses (`DWARVEN_STONE_HOUSES`) with interactive [E] doors
 * - 8 Animated LOTR-Style Dwarven Miners (`dwarvenMiners`) & per-frame Caravan/Mining animator
 */
/**
 * Summary: Instantiates dwarven stone houses, guardian statues, mines, and miner rigs.
 * Design: Assembles architectural models into scene and binds caravan schedule animator.
 * @param ctx The builder context holding scene, textures, and materials.
 * @returns IDwarvenKingdomHandle containing per-frame update loop for miner rigs.
 */
/** Dwarf body radius used when keeping a dwarf out of furniture (metres). */
const DWARF_FURNITURE_RADIUS = 0.35;

/**
 * Summary: Pushes a dwarf out of any solid box at its height (DW1). The daily route passes near benches, tables and
 * carts; standing inside one would clip the dwarf through it.
 */
function keepDwarfOutOfFurniture(x: number, z: number, y: number): { x: number; z: number } {
  let px = x;
  let pz = z;
  const boxes = getNearbySolidBuildingBoxes(px, pz, 2.0);
  for (let pass = 0; pass < 4; pass++) {
    for (const box of boxes) {
      if (box.minY !== undefined && y + 0.5 < box.minY) continue;
      if (box.maxY !== undefined && y + 0.5 > box.maxY) continue;
      const r = resolveHorizontalBoxCollision(px, pz, DWARF_FURNITURE_RADIUS, box);
      px = r.x;
      pz = r.z;
    }
  }
  return { x: px, z: pz };
}

/** Summary: True when a dwarf standing at (x, z, y) would overlap any solid box (DW1). */
function dwarfOverlapsFurniture(x: number, z: number, y: number): boolean {
  const boxes = getNearbySolidBuildingBoxes(x, z, DWARF_FURNITURE_RADIUS + 1.0);
  return boxes.some((b) => {
    if (b.minY !== undefined && y + 0.5 < b.minY) return false;
    if (b.maxY !== undefined && y + 0.5 > b.maxY) return false;
    return pointInsideSolidBuildingBox(x, z, DWARF_FURNITURE_RADIUS, b);
  });
}

/**
 * Summary: The nearest spot to an authored seat or bed where a dwarf does not overlap furniture (DW1). The seat is kept
 * if it is clear; otherwise the spot is moved in rings around it. Falls back to the push-out when no ring is clear.
 */
function findClearSeat(x: number, z: number, y: number): { x: number; z: number } {
  if (!dwarfOverlapsFurniture(x, z, y)) return { x, z };
  for (const r of [0.3, 0.6, 0.9, 1.2]) {
    for (let k = 0; k < 16; k++) {
      const ang = (k / 16) * Math.PI * 2;
      const cx = x + Math.cos(ang) * r;
      const cz = z + Math.sin(ang) * r;
      if (!dwarfOverlapsFurniture(cx, cz, y)) return { x: cx, z: cz };
    }
  }
  return keepDwarfOutOfFurniture(x, z, y);
}

export function buildDwarvenKingdomAndMiners(
  ctx: IDwarvenKingdomBuilderContext
): IDwarvenKingdomHandle {
  const {
    scene,
    mineGroup,
    mineX,
    mineEntY,
    mineEntZ,
    cavernBackZ,
    stonePatternTex,
    mineGoldOreMat,
    mineMoltenCoalMat,
    barkMat,
    timberMat,
    darkIronMat,
    forgeBrazierBaseGeo,
    forgeCoalMoundGeo,
    createLanternAssembly,
    disposableGeometries,
    disposableMaterials,
    distanceCulledObjects,
    doorPivotHandles,
  } = ctx;

  const dwarvenBronzeMat = new THREE.MeshStandardMaterial({
    color: 0xb47b38,
    roughness: 0.34,
    metalness: 0.82,
  });
  const dwarvenGraniteMat = new THREE.MeshStandardMaterial({
    color: 0x6b7280,
    map: stonePatternTex,
    bumpMap: stonePatternTex,
    bumpScale: 0.06,
    roughness: 0.78,
    metalness: 0.12,
  });
  const dwarvenScaleArmorMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.32,
    metalness: 0.85,
  });
  disposableMaterials.push(dwarvenBronzeMat, dwarvenGraniteMat, dwarvenScaleArmorMat);

  // Monumental Carved Dwarven Stone Portal Arch framing the Mine Entrance
  const dwarvenPortalArchGroup = new THREE.Group();
  const portalArchPillarGeo = new THREE.BoxGeometry(1.45, 5.4, 1.45);
  portalArchPillarGeo.translate(0, 2.7, 0);
  const portalArchHeaderGeo = new THREE.BoxGeometry(9.6, 1.35, 1.65);
  const portalArchCrestGeo = new THREE.OctahedronGeometry(0.85, 0);
  const portalGoldBandGeo = new THREE.BoxGeometry(1.58, 0.32, 1.58);
  disposableGeometries.push(portalArchPillarGeo, portalArchHeaderGeo, portalArchCrestGeo, portalGoldBandGeo);
  for (const side of [-1, 1]) {
    const archPil = new THREE.Mesh(portalArchPillarGeo, dwarvenGraniteMat);
    archPil.position.set(side * 3.85, mineEntY, -0.35);
    const goldBand = new THREE.Mesh(portalGoldBandGeo, mineGoldOreMat);
    goldBand.position.set(side * 3.85, mineEntY + 3.8, -0.35);
    dwarvenPortalArchGroup.add(archPil, goldBand);
  }
  const archHeader = new THREE.Mesh(portalArchHeaderGeo, dwarvenGraniteMat);
  archHeader.position.set(0, mineEntY + 5.2, -0.35);
  const archCrest = new THREE.Mesh(portalArchCrestGeo, mineGoldOreMat);
  archCrest.scale.set(1.2, 1.0, 0.5);
  archCrest.position.set(0, mineEntY + 5.35, -1.2);
  dwarvenPortalArchGroup.add(archHeader, archCrest);
  mineGroup.add(dwarvenPortalArchGroup);

  scene.add(mineGroup);
  distanceCulledObjects.push({
    obj: mineGroup,
    cx: mineX,
    cz: (mineEntZ + cavernBackZ) * 0.5 + 102.0,
    radius: 280,
  });

  // 1) TWIN COLOSSAL SCULPTED DWARVEN KING GUARDIAN STATUES FLANKING THE MINE ENTRANCE
  const statuePlinthFoundationGeo = new THREE.BoxGeometry(4.65, 0.9, 4.65);
  statuePlinthFoundationGeo.translate(0, 0.05, 0); // Extends -0.4m below baseY so it never floats on slopes
  const statuePedestalStepGeo = new THREE.CylinderGeometry(2.38, 2.52, 0.48, 8);
  statuePedestalStepGeo.translate(0, 0.74, 0);
  const statuePedestalBaseGeo = new THREE.CylinderGeometry(1.98, 2.18, 1.56, 8);
  statuePedestalBaseGeo.translate(0, 1.76, 0);
  const statuePedestalRuneBandGeo = new THREE.CylinderGeometry(2.08, 2.08, 0.24, 8);
  statuePedestalRuneBandGeo.translate(0, 1.82, 0);
  const statuePedestalCapGeo = new THREE.CylinderGeometry(2.22, 1.98, 0.34, 8);
  statuePedestalCapGeo.translate(0, 2.71, 0);
  const statueDaisTopGeo = new THREE.CylinderGeometry(1.68, 1.82, 0.18, 8);
  statueDaisTopGeo.translate(0, 2.95, 0);

  const statueCrownBandGeo = new THREE.CylinderGeometry(0.56, 0.52, 0.28, 8);
  const statueCrownSpikeGeo = new THREE.ConeGeometry(0.11, 0.34, 4);
  const statueCapeCloakGeo = new THREE.BoxGeometry(2.15, 3.85, 0.28);
  const statueGreatAxeShaftGeo = new THREE.CylinderGeometry(0.11, 0.13, 5.4, 10);
  statueGreatAxeShaftGeo.translate(0, 2.7, 0);
  const statueGreatAxeHeadHubGeo = new THREE.BoxGeometry(0.42, 0.68, 0.42);
  const statueGreatAxeBladeGeo = new THREE.ConeGeometry(1.12, 1.45, 4);
  statueGreatAxeBladeGeo.scale(0.24, 1.0, 1.18);
  const statueRoyalShieldGeo = new THREE.CylinderGeometry(1.08, 1.08, 0.16, 8);
  statueRoyalShieldGeo.rotateX(Math.PI / 2);
  const statueShieldBossGeo = new THREE.SphereGeometry(0.32, 10, 8);
  const statueCornerBrazierBowlGeo = new THREE.CylinderGeometry(0.36, 0.24, 0.42, 8);
  const statueCornerBrazierEmberGeo = new THREE.SphereGeometry(0.26, 8, 6);
  const statuePedestalBracketBarGeo = new THREE.BoxGeometry(0.14, 0.14, 0.58);
  const statuePedestalBracketPostGeo = new THREE.BoxGeometry(0.16, 1.15, 0.16);

  const statueCarvedGraniteMat = new THREE.MeshStandardMaterial({
    color: 0x57606f,
    roughness: 0.58,
    metalness: 0.28,
  });
  const statueAntiqueGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    emissive: 0x451a03,
    emissiveIntensity: 0.18,
    roughness: 0.3,
    metalness: 0.82,
  });
  disposableMaterials.push(statueCarvedGraniteMat, statueAntiqueGoldMat);

  disposableGeometries.push(
    statuePlinthFoundationGeo,
    statuePedestalStepGeo,
    statuePedestalBaseGeo,
    statuePedestalRuneBandGeo,
    statuePedestalCapGeo,
    statueDaisTopGeo,
    statueCrownBandGeo,
    statueCrownSpikeGeo,
    statueCapeCloakGeo,
    statueGreatAxeShaftGeo,
    statueGreatAxeHeadHubGeo,
    statueGreatAxeBladeGeo,
    statueRoyalShieldGeo,
    statueShieldBossGeo,
    statueCornerBrazierBowlGeo,
    statueCornerBrazierEmberGeo,
    statuePedestalBracketBarGeo,
    statuePedestalBracketPostGeo
  );

  for (let s = 0; s < DWARVEN_GUARDIAN_STATUES.length; s++) {
    const st = DWARVEN_GUARDIAN_STATUES[s];
    const stGroup = new THREE.Group();
    stGroup.position.set(st.x, st.baseY, st.z);
    stGroup.rotation.y = st.yaw;

    const plinthFoundation = new THREE.Mesh(statuePlinthFoundationGeo, dwarvenGraniteMat);
    const pedStep = new THREE.Mesh(statuePedestalStepGeo, dwarvenGraniteMat);
    const pedBase = new THREE.Mesh(statuePedestalBaseGeo, dwarvenGraniteMat);
    const pedRuneBand = new THREE.Mesh(statuePedestalRuneBandGeo, statueAntiqueGoldMat);
    const pedCap = new THREE.Mesh(statuePedestalCapGeo, dwarvenBronzeMat);
    const pedDais = new THREE.Mesh(statueDaisTopGeo, statueAntiqueGoldMat);
    stGroup.add(plinthFoundation, pedStep, pedBase, pedRuneBand, pedCap, pedDais);

    // Sculpted 3D Colossal Dwarven King figure using the articulated DwarfWarrior rig
    const kingStatueRig = createReadyDwarfWarrior({
      initialState: 'idle',
      weaponVisible: true,
      tintHex: 0xd4af37,
      driveRootMotion: false,
      scale: 3.15,
    });
    kingStatueRig.driveRootMotion = false;
    kingStatueRig.setState('idle', 0.01);
    kingStatueRig.update(0.2);
    kingStatueRig.group.position.set(0, 3.02, -0.08);
    kingStatueRig.group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat && mat.color) {
          const hsl = { h: 0, s: 0, l: 0 };
          mat.color.getHSL(hsl);
          // Preserve golden trim & glowing eyes, turn flesh/cloth/iron into sculpted dark granite & bronze
          if (hsl.h > 0.08 && hsl.h < 0.16 && hsl.s > 0.45) {
            mesh.material = statueAntiqueGoldMat;
          } else {
            mesh.material = statueCarvedGraniteMat;
          }
        }
      }
    });
    stGroup.add(kingStatueRig.group);

    // Royal Dwarven King Crown & Flowing Carved Stone Cloak
    const crownGroup = new THREE.Group();
    crownGroup.position.set(0, 8.22, 0.08);
    crownGroup.add(new THREE.Mesh(statueCrownBandGeo, statueAntiqueGoldMat));
    for (let c = 0; c < 8; c++) {
      const cAng = (c / 8) * Math.PI * 2;
      const spike = new THREE.Mesh(statueCrownSpikeGeo, statueAntiqueGoldMat);
      spike.position.set(Math.sin(cAng) * 0.52, 0.26, Math.cos(cAng) * 0.52);
      crownGroup.add(spike);
    }
    const royalCloak = new THREE.Mesh(statueCapeCloakGeo, dwarvenGraniteMat);
    royalCloak.position.set(0, 5.25, -0.78);
    royalCloak.rotation.x = 0.12;
    stGroup.add(crownGroup, royalCloak);

    // Planted Colossal Double-Bitted Runic Greataxe & Carved Royal Shield
    const plantedAxeGroup = new THREE.Group();
    plantedAxeGroup.position.set(s === 0 ? 0.88 : -0.88, 2.98, 1.12);
    const axeShaft = new THREE.Mesh(statueGreatAxeShaftGeo, dwarvenBronzeMat);
    const axeHub = new THREE.Mesh(statueGreatAxeHeadHubGeo, statueAntiqueGoldMat);
    axeHub.position.set(0, 4.35, 0);
    const axeBladeL = new THREE.Mesh(statueGreatAxeBladeGeo, statueCarvedGraniteMat);
    axeBladeL.position.set(-0.76, 4.35, 0);
    axeBladeL.rotation.z = Math.PI / 2;
    const axeBladeR = new THREE.Mesh(statueGreatAxeBladeGeo, statueCarvedGraniteMat);
    axeBladeR.position.set(0.76, 4.35, 0);
    axeBladeR.rotation.z = -Math.PI / 2;
    const axeBladeTrimL = new THREE.Mesh(statueGreatAxeBladeGeo, statueAntiqueGoldMat);
    axeBladeTrimL.scale.set(0.26, 0.82, 0.88);
    axeBladeTrimL.position.set(-0.62, 4.35, 0);
    axeBladeTrimL.rotation.z = Math.PI / 2;
    const axeBladeTrimR = new THREE.Mesh(statueGreatAxeBladeGeo, statueAntiqueGoldMat);
    axeBladeTrimR.scale.set(0.26, 0.82, 0.88);
    axeBladeTrimR.position.set(0.62, 4.35, 0);
    axeBladeTrimR.rotation.z = -Math.PI / 2;
    plantedAxeGroup.add(axeShaft, axeHub, axeBladeL, axeBladeR, axeBladeTrimL, axeBladeTrimR);

    const shieldGroup = new THREE.Group();
    shieldGroup.position.set(s === 0 ? -1.05 : 1.05, 4.45, 0.78);
    shieldGroup.rotation.y = s === 0 ? -0.35 : 0.35;
    const shieldDisc = new THREE.Mesh(statueRoyalShieldGeo, dwarvenGraniteMat);
    const shieldRim = new THREE.Mesh(statueRoyalShieldGeo, statueAntiqueGoldMat);
    shieldRim.scale.set(1.06, 1.06, 0.75);
    const shieldBoss = new THREE.Mesh(statueShieldBossGeo, statueAntiqueGoldMat);
    shieldBoss.position.z = 0.1;
    shieldGroup.add(shieldDisc, shieldRim, shieldBoss);
    stGroup.add(plantedAxeGroup, shieldGroup);

    // 2 Grounded Corner Fire Braziers on the Stepped Plinth + Grounded Front Pedestal Lantern Bracket
    for (const bx of [-1.72, 1.72]) {
      const brazierBowl = new THREE.Mesh(statueCornerBrazierBowlGeo, dwarvenBronzeMat);
      brazierBowl.position.set(bx, 0.71, 1.72);
      const brazierEmber = new THREE.Mesh(statueCornerBrazierEmberGeo, mineGoldOreMat);
      brazierEmber.position.set(bx, 0.94, 1.72);
      stGroup.add(brazierBowl, brazierEmber);
    }
    const bracketPost = new THREE.Mesh(statuePedestalBracketPostGeo, dwarvenBronzeMat);
    bracketPost.position.set(0, 2.45, 2.02);
    const bracketBar = new THREE.Mesh(statuePedestalBracketBarGeo, dwarvenBronzeMat);
    bracketBar.position.set(0, 2.98, 2.24);
    stGroup.add(bracketPost, bracketBar, createLanternAssembly(0, 2.94, 2.46, true));

    scene.add(stGroup);
    distanceCulledObjects.push({ obj: stGroup, cx: st.x, cz: st.z, radius: 32 });
  }

  // 2) 4 ENTERABLE DWARVEN STONE HOUSES ALONG THE DWARVEN KING'S ROAD (z = 368..392)
  const dhWallFBGeo = new THREE.BoxGeometry(0.55, 4.4, 8.8);
  dhWallFBGeo.translate(0, 2.2, 0);
  const dhWallSideGeo = new THREE.BoxGeometry(10.4, 4.4, 0.55);
  dhWallSideGeo.translate(0, 2.2, 0);
  const dhFrontWingGeo = new THREE.BoxGeometry(0.55, 4.4, 3.25);
  dhFrontWingGeo.translate(0, 2.2, 0);
  const dhDoorHeaderGeo = new THREE.BoxGeometry(0.62, 1.45, 2.4);
  dhDoorHeaderGeo.translate(0, 3.68, 0);
  const dhButtressGeo = new THREE.BoxGeometry(0.95, 4.6, 0.95);
  dhButtressGeo.translate(0, 2.3, 0);
  const dhRoofLowerGeo = new THREE.BoxGeometry(11.6, 0.65, 9.8);
  dhRoofLowerGeo.translate(0, 4.65, 0);
  const dhRoofMidGeo = new THREE.BoxGeometry(9.4, 0.65, 7.8);
  dhRoofMidGeo.translate(0, 5.25, 0);
  const dhRoofTopGeo = new THREE.BoxGeometry(7.0, 0.55, 5.6);
  dhRoofTopGeo.translate(0, 5.8, 0);
  const dhChimneyGeo = new THREE.CylinderGeometry(0.55, 0.72, 2.6, 6);
  dhChimneyGeo.translate(0, 6.4, 0);
  const dhFloorGeo = new THREE.BoxGeometry(10.6, 0.52, 8.8);
  dhFloorGeo.translate(0, -0.06, 0); // Grounded into terrace so house base never floats
  const dhDoorLeafGeo = new THREE.BoxGeometry(0.14, 2.85, 1.12);
  const dhStepSlabGeo = new THREE.BoxGeometry(1.6, 0.36, 3.2);
  const dhCapGeo = new THREE.BoxGeometry(1.08, 0.28, 1.08);
  const dhRidgeCrestGeo = new THREE.BoxGeometry(6.8, 0.36, 0.36);
  const dhTableTopGeo = new THREE.BoxGeometry(2.1, 0.1, 0.85);
  const dhTableLegGeo = new THREE.BoxGeometry(0.12, 0.68, 0.12);
  const dhOutdoorAnvilGeo = new THREE.BoxGeometry(0.95, 0.75, 0.52);
  const dhChestBodyGeo = new THREE.BoxGeometry(0.72, 0.56, 1.25);
  dhChestBodyGeo.translate(0, 0.28, 0);

  // Dwarven Bed geometries (2 beds per house along the South wall)
  const dhBedFrameGeo = new THREE.BoxGeometry(1.55, 0.26, 2.32);
  const dhBedHeadboardGeo = new THREE.BoxGeometry(1.58, 0.78, 0.14);
  const dhBedPostGeo = new THREE.BoxGeometry(0.16, 0.92, 0.16);
  const dhBedMattressGeo = new THREE.BoxGeometry(1.38, 0.18, 2.12);
  const dhBedBlanketGeo = new THREE.BoxGeometry(1.4, 0.08, 1.38);
  const dhBedPillowGeo = new THREE.BoxGeometry(0.96, 0.14, 0.42);

  // Proper Dwarven Wooden Bench geometries (`ספסלים נורמליים` with seat, 4 legs, stretcher & backrest)
  const dhBenchSeatGeo = new THREE.BoxGeometry(1.85, 0.09, 0.54);
  const dhBenchBackGeo = new THREE.BoxGeometry(1.85, 0.46, 0.08);
  const dhBenchLegGeo = new THREE.BoxGeometry(0.11, 0.44, 0.11);
  const dhBenchStretcherGeo = new THREE.BoxGeometry(1.62, 0.07, 0.08);

  const dhMattressMat = new THREE.MeshStandardMaterial({
    color: 0xd6cfc2,
    roughness: 0.88,
  });
  const dhBlanketMat = new THREE.MeshStandardMaterial({
    color: 0x7c2d12,
    roughness: 0.84,
  });
  const dhPillowMat = new THREE.MeshStandardMaterial({
    color: 0xf1ede4,
    roughness: 0.82,
  });
  disposableMaterials.push(dhMattressMat, dhBlanketMat, dhPillowMat);

  disposableGeometries.push(
    dhWallFBGeo,
    dhWallSideGeo,
    dhFrontWingGeo,
    dhDoorHeaderGeo,
    dhButtressGeo,
    dhRoofLowerGeo,
    dhRoofMidGeo,
    dhRoofTopGeo,
    dhChimneyGeo,
    dhFloorGeo,
    dhDoorLeafGeo,
    dhStepSlabGeo,
    dhCapGeo,
    dhRidgeCrestGeo,
    dhTableTopGeo,
    dhTableLegGeo,
    dhOutdoorAnvilGeo,
    dhChestBodyGeo,
    dhBedFrameGeo,
    dhBedHeadboardGeo,
    dhBedPostGeo,
    dhBedMattressGeo,
    dhBedBlanketGeo,
    dhBedPillowGeo,
    dhBenchSeatGeo,
    dhBenchBackGeo,
    dhBenchLegGeo,
    dhBenchStretcherGeo
  );

  const createDwarvenWoodenBench = (): THREE.Group => {
    const bench = new THREE.Group();
    const seat = new THREE.Mesh(dhBenchSeatGeo, timberMat);
    seat.position.set(0, 0.46, 0);
    const back = new THREE.Mesh(dhBenchBackGeo, timberMat);
    back.position.set(0, 0.72, -0.23);
    const stretcher = new THREE.Mesh(dhBenchStretcherGeo, barkMat);
    stretcher.position.set(0, 0.18, 0);
    bench.add(seat, back, stretcher);
    for (const lx of [-0.8, 0.8]) {
      for (const lz of [-0.19, 0.19]) {
        const leg = new THREE.Mesh(dhBenchLegGeo, barkMat);
        leg.position.set(lx, 0.22, lz);
        bench.add(leg);
      }
    }
    return bench;
  };

  const createDwarvenBed = (): THREE.Group => {
    const bed = new THREE.Group();
    const frame = new THREE.Mesh(dhBedFrameGeo, barkMat);
    frame.position.set(0, 0.22, 0);
    const headboard = new THREE.Mesh(dhBedHeadboardGeo, timberMat);
    headboard.position.set(0, 0.56, 1.12);
    const mattress = new THREE.Mesh(dhBedMattressGeo, dhMattressMat);
    mattress.position.set(0, 0.4, -0.04);
    const blanket = new THREE.Mesh(dhBedBlanketGeo, dhBlanketMat);
    blanket.position.set(0, 0.48, -0.38);
    const pillow = new THREE.Mesh(dhBedPillowGeo, dhPillowMat);
    pillow.position.set(0, 0.52, 0.74);
    bed.add(frame, headboard, mattress, blanket, pillow);
    for (const px of [-0.72, 0.72]) {
      for (const pz of [-1.1, 1.1]) {
        const post = new THREE.Mesh(dhBedPostGeo, barkMat);
        post.position.set(px, 0.46, pz);
        bed.add(post);
      }
    }
    return bed;
  };

  for (let hIdx = 0; hIdx < DWARVEN_STONE_HOUSES.length; hIdx++) {
    const dh = DWARVEN_STONE_HOUSES[hIdx];
    const dhGroup = new THREE.Group();
    dhGroup.position.set(dh.x, dh.terraceY, dh.z);

    const floorSlab = new THREE.Mesh(dhFloorGeo, dwarvenGraniteMat);
    const stepSlab = new THREE.Mesh(dhStepSlabGeo, dwarvenGraniteMat);
    stepSlab.position.set(dh.dirX * (dh.halfW + 0.55), -0.02, 0);
    dhGroup.add(floorSlab, stepSlab);

    const backWall = new THREE.Mesh(dhWallFBGeo, dwarvenGraniteMat);
    backWall.position.set(-dh.dirX * dh.halfW, 0, 0);
    const northWall = new THREE.Mesh(dhWallSideGeo, dwarvenGraniteMat);
    northWall.position.set(0, 0, -dh.halfD);
    const southWall = new THREE.Mesh(dhWallSideGeo, dwarvenGraniteMat);
    southWall.position.set(0, 0, dh.halfD);
    const frontNorthWing = new THREE.Mesh(dhFrontWingGeo, dwarvenGraniteMat);
    frontNorthWing.position.set(dh.dirX * dh.halfW, 0, -2.78);
    const frontSouthWing = new THREE.Mesh(dhFrontWingGeo, dwarvenGraniteMat);
    frontSouthWing.position.set(dh.dirX * dh.halfW, 0, 2.78);
    const doorHeader = new THREE.Mesh(dhDoorHeaderGeo, dwarvenBronzeMat);
    doorHeader.position.set(dh.dirX * dh.halfW, 0, 0);
    dhGroup.add(backWall, northWall, southWall, frontNorthWing, frontSouthWing, doorHeader);

    for (const bx of [-dh.halfW, dh.halfW]) {
      for (const bz of [-dh.halfD, dh.halfD]) {
        const buttress = new THREE.Mesh(dhButtressGeo, dwarvenGraniteMat);
        buttress.position.set(bx, 0, bz);
        const cap = new THREE.Mesh(dhCapGeo, dwarvenBronzeMat);
        cap.position.set(bx, 4.65, bz);
        dhGroup.add(buttress, cap);
      }
    }

    const roof1 = new THREE.Mesh(dhRoofLowerGeo, dwarvenGraniteMat);
    const roof2 = new THREE.Mesh(dhRoofMidGeo, dwarvenGraniteMat);
    const roof3 = new THREE.Mesh(dhRoofTopGeo, dwarvenGraniteMat);
    const ridgeCrest = new THREE.Mesh(dhRidgeCrestGeo, dwarvenBronzeMat);
    ridgeCrest.position.set(0, 6.2, 0);
    const chimney = new THREE.Mesh(dhChimneyGeo, dwarvenGraniteMat);
    chimney.position.set(-dh.dirX * 2.8, 0, -1.8);
    dhGroup.add(roof1, roof2, roof3, ridgeCrest, chimney);

    const leftDoorPivot = new THREE.Group();
    leftDoorPivot.position.set(dh.dirX * dh.halfW, 0.18, -1.12);
    const leftDoorMesh = new THREE.Mesh(dhDoorLeafGeo, barkMat);
    leftDoorMesh.position.set(0, 1.42, 0.56);
    leftDoorPivot.add(leftDoorMesh);

    const rightDoorPivot = new THREE.Group();
    rightDoorPivot.position.set(dh.dirX * dh.halfW, 0.18, 1.12);
    const rightDoorMesh = new THREE.Mesh(dhDoorLeafGeo, barkMat);
    rightDoorMesh.position.set(0, 1.42, -0.56);
    rightDoorPivot.add(rightDoorMesh);
    dhGroup.add(leftDoorPivot, rightDoorPivot);

    doorPivotHandles.push({
      id: dh.doorId,
      leftPivot: leftDoorPivot,
      rightPivot: rightDoorPivot,
      currentAngle: 0,
    });

    const hearthRing = new THREE.Mesh(forgeBrazierBaseGeo, dwarvenGraniteMat);
    hearthRing.scale.set(0.85, 0.65, 0.85);
    hearthRing.position.set(-dh.dirX * 2.8, 0.18, -1.8);
    const hearthCoals = new THREE.Mesh(forgeCoalMoundGeo, mineMoltenCoalMat);
    hearthCoals.scale.set(0.75, 0.45, 0.75);
    hearthCoals.position.set(-dh.dirX * 2.8, 0.72, -1.8);

    // Interior Iron-Bound Dwarven Storage Chest against back wall
    const backChest = new THREE.Mesh(dhChestBodyGeo, timberMat);
    backChest.position.set(-dh.dirX * 4.2, 0.18, 0.2);

    // 2 Real Dwarven Beds along the South interior wall (`lz = 2.55`, `lx = -2.0` and `lx = +2.0`)
    for (const bedLx of [-2.0, 2.0]) {
      const bed = createDwarvenBed();
      bed.position.set(bedLx, 0.18, 2.55);
      dhGroup.add(bed);
    }

    // 2 Proper Indoor Wooden Benches (`ספסלים נורמליים`) + 4-Legged Oak Table in the North-Front nook
    const benchNorth = createDwarvenWoodenBench();
    benchNorth.position.set(dh.dirX * 1.55, 0.18, -2.55);
    benchNorth.rotation.y = 0; // Backrest toward North (-Z), faces South (+Z)

    const benchSouth = createDwarvenWoodenBench();
    benchSouth.position.set(dh.dirX * 1.55, 0.18, -0.75);
    benchSouth.rotation.y = Math.PI; // Backrest toward South (+Z), faces North (-Z)

    const oakTableGroup = new THREE.Group();
    oakTableGroup.position.set(dh.dirX * 1.55, 0.18, -1.65);
    const tableTop = new THREE.Mesh(dhTableTopGeo, timberMat);
    tableTop.position.set(0, 0.72, 0);
    oakTableGroup.add(tableTop);
    for (const tlx of [-0.9, 0.9]) {
      for (const tlz of [-0.32, 0.32]) {
        const tLeg = new THREE.Mesh(dhTableLegGeo, barkMat);
        tLeg.position.set(tlx, 0.34, tlz);
        oakTableGroup.add(tLeg);
      }
    }

    // Outdoor Porch Wooden Bench (`ספסל עץ נורמלי`) facing the Dwarven King's Road
    const porchBench = createDwarvenWoodenBench();
    porchBench.position.set(dh.dirX * (dh.halfW + 1.35), 0.02, -2.45);
    porchBench.rotation.y = dh.dirX === 1 ? Math.PI / 2 : -Math.PI / 2;

    const outdoorAnvil = new THREE.Mesh(dhOutdoorAnvilGeo, darkIronMat);
    outdoorAnvil.position.set(dh.dirX * (dh.halfW + 1.8), 0.38, 2.8);
    dhGroup.add(
      hearthRing,
      hearthCoals,
      backChest,
      benchNorth,
      benchSouth,
      oakTableGroup,
      porchBench,
      outdoorAnvil,
      createLanternAssembly(dh.dirX * (dh.halfW + 0.65), 3.1, -1.65, hIdx === 0),
      createLanternAssembly(dh.dirX * (dh.halfW + 0.65), 3.1, 1.65, false)
    );

    scene.add(dhGroup);
    distanceCulledObjects.push({ obj: dhGroup, cx: dh.x, cz: dh.z, radius: 26 });
  }

  // 3) 8 ANIMATED LOTR-STYLE DWARVEN MINERS (Upgraded per LOTR Dwarf Character Sheet)
  const dwarfSkinMat = new THREE.MeshStandardMaterial({ color: 0xdca482, roughness: 0.56 });
  const dwarfLeatherMat = new THREE.MeshStandardMaterial({ color: 0x472814, roughness: 0.55 });
  const dwarfDarkLeatherMat = new THREE.MeshStandardMaterial({ color: 0x2b190d, roughness: 0.62 });
  const dwarfCloakMat = new THREE.MeshStandardMaterial({
    color: 0x2d241c,
    roughness: 0.84,
    side: THREE.DoubleSide,
  });
  const dwarfBeardMats = [
    new THREE.MeshStandardMaterial({ color: 0x8c3b16, roughness: 0.78 }),
    new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.78 }),
    new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.72 }),
  ];
  const dwarfTunicMats = [
    new THREE.MeshStandardMaterial({ color: 0x333629, roughness: 0.72 }),
    new THREE.MeshStandardMaterial({ color: 0x3f3629, roughness: 0.72 }),
    new THREE.MeshStandardMaterial({ color: 0x2d3a2e, roughness: 0.72 }),
    new THREE.MeshStandardMaterial({ color: 0x452218, roughness: 0.72 }),
  ];
  disposableMaterials.push(
    dwarfSkinMat,
    dwarfLeatherMat,
    dwarfDarkLeatherMat,
    dwarfCloakMat,
    ...dwarfBeardMats,
    ...dwarfTunicMats
  );

  const dwMailSkirtGeo = new THREE.CylinderGeometry(0.285, 0.31, 0.22, 10);
  dwMailSkirtGeo.translate(0, 0.08, 0);
  const dwTorsoGeo = new THREE.CylinderGeometry(0.27, 0.305, 0.58, 10);
  dwTorsoGeo.translate(0, 0.31, 0);
  const dwHemTrimGeo = new THREE.CylinderGeometry(0.308, 0.312, 0.045, 10);
  dwHemTrimGeo.translate(0, 0.06, 0);
  const dwShoulderGeo = new THREE.BoxGeometry(0.74, 0.18, 0.4);
  dwShoulderGeo.translate(0, 0.52, 0);
  const dwCloakBackGeo = new THREE.BoxGeometry(0.56, 0.64, 0.035);
  const dwHeadGeo = new THREE.SphereGeometry(0.19, 12, 12);
  dwHeadGeo.translate(0, 0.74, 0);
  const dwHairCapGeo = new THREE.SphereGeometry(0.202, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58);
  const dwBackBraidGeo = new THREE.CylinderGeometry(0.04, 0.024, 0.42, 7);
  const dwBeardMainGeo = new THREE.ConeGeometry(0.18, 0.52, 8);
  dwBeardMainGeo.rotateX(Math.PI);
  const dwBeardBraidGeo = new THREE.CylinderGeometry(0.038, 0.022, 0.5, 7);
  const dwMustacheGeo = new THREE.ConeGeometry(0.045, 0.15, 6);
  const dwLegGeo = new THREE.CylinderGeometry(0.11, 0.095, 0.4, 8);
  dwLegGeo.translate(0, -0.2, 0);
  const dwBootGeo = new THREE.BoxGeometry(0.165, 0.14, 0.26);
  dwBootGeo.translate(0, -0.39, -0.04);
  const dwArmGeo = new THREE.CylinderGeometry(0.085, 0.075, 0.42, 8);
  dwArmGeo.translate(0, -0.18, 0);
  const dwPickHandleGeo = new THREE.CylinderGeometry(0.022, 0.024, 0.78, 7);
  const dwAxeBladeGeo = new THREE.ConeGeometry(0.14, 0.24, 4);
  dwAxeBladeGeo.scale(0.24, 1.0, 1.15);
  const dwLanternBodyGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.16, 6);
  const dwBeltGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 10);
  const dwBuckleGeo = new THREE.BoxGeometry(0.115, 0.115, 0.04);
  const dwBroochGeo = new THREE.CylinderGeometry(0.046, 0.046, 0.02, 10);
  dwBroochGeo.rotateX(Math.PI / 2);
  const dwNoseGeo = new THREE.SphereGeometry(0.05, 8, 8);
  const dwBeardRingGeo = new THREE.TorusGeometry(0.065, 0.015, 6, 10);

  disposableGeometries.push(
    dwMailSkirtGeo,
    dwTorsoGeo,
    dwHemTrimGeo,
    dwShoulderGeo,
    dwCloakBackGeo,
    dwHeadGeo,
    dwHairCapGeo,
    dwBackBraidGeo,
    dwBeardMainGeo,
    dwBeardBraidGeo,
    dwMustacheGeo,
    dwLegGeo,
    dwBootGeo,
    dwArmGeo,
    dwPickHandleGeo,
    dwAxeBladeGeo,
    dwLanternBodyGeo,
    dwBeltGeo,
    dwBuckleGeo,
    dwBroochGeo,
    dwNoseGeo,
    dwBeardRingGeo
  );

  const dwarvenMiners: IDwarvenMinerRig[] = [];
  activeDwarvenMiners.length = 0;

  const dwarfTintPalette = [
    0xd97706,
    0xb45309,
    0x92400e,
    0x78350f,
    0xb91c1c,
    0x0f766e,
    0x4338ca,
    0xa16207,
  ];

  for (let d = 0; d < DWARVEN_MINERS_COUNT; d++) {
    const dwRoot = new THREE.Group();
    const ctrl = createReadyDwarfWarrior({
      initialState: 'idle',
      weaponVisible: true,
      tintHex: dwarfTintPalette[d % dwarfTintPalette.length],
      driveRootMotion: false,
    });
    // Orient glTF +Z forward rig to match the dwarven caravan -Z yaw convention
    ctrl.group.rotation.y = Math.PI;
    ctrl.group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    dwRoot.add(ctrl.group);

    // Miner's belt lantern glow mesh
    const lanternMesh = new THREE.Mesh(dwLanternBodyGeo, mineGoldOreMat);
    lanternMesh.position.set(-0.28, 0.62, -0.18);
    dwRoot.add(lanternMesh);

    const torsoPivot = new THREE.Group();
    const leftLeg = new THREE.Group();
    const rightLeg = new THREE.Group();
    const leftArm = new THREE.Group();
    const rightArm = new THREE.Group();

    const initSt = computeDwarvenMinerCaravanState(8.5, d, 0);
    dwRoot.position.set(initSt.x, initSt.y, initSt.z);
    dwRoot.rotation.order = 'YXZ';
    dwRoot.rotation.y = initSt.yaw;

    scene.add(dwRoot);
    const initLoot = generateRandomDwarfLoot(d);
    const rigEntry: IDwarvenMinerRig = {
      id: d,
      name: initSt.name,
      level: 6 + (d % 3),
      root: dwRoot,
      ctrl,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      torsoPivot,
      lanternGlow: lanternMesh,
      x: initSt.x,
      y: initSt.y,
      z: initSt.z,
      yaw: initSt.yaw,
      hp: 100 + (d % 3) * 15,
      maxHp: 100 + (d % 3) * 15,
      isDead: false,
      isLooted: false,
      goldDrop: initLoot.goldDrop,
      lootItems: initLoot.lootItems,
      outOfAreaRespawnTimer: 0,
      deathTimer: 0,
      hitFlashTimer: 0,
      hitBarTimer: 0,
      isAggro: false,
      aggroTimer: 0,
      attackCooldown: 0,
      currentAttackClip: 'attack1',
      lastElapsedTime: 0,
    };
    dwarvenMiners.push(rigEntry);
    activeDwarvenMiners.push(rigEntry);
  }

  const rotateAngleToward = (curr: number, target: number, maxStep: number): number => {
    let diff = ((target - curr + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) <= maxStep) return target;
    return curr + Math.sign(diff) * maxStep;
  };

  // Map each of the 8 dwarves to their house (0..3) and resident slot (0 or 1)
  const getDwarfHomeAssignment = (d: number): { houseIdx: number; slot: 0 | 1 } => {
    const houseIdx = d === 0 || d === 2 ? 0 : d === 1 || d === 4 ? 1 : d === 3 || d === 6 ? 2 : 3;
    const slot: 0 | 1 = d === 0 || d === 1 || d === 3 || d === 5 ? 0 : 1;
    return { houseIdx, slot };
  };

  const updateDwarvenMiners = (
    worldHours: number,
    elapsedTime: number,
    playerX: number,
    playerZ: number
  ) => {
    const playerState = getPlayerState();
    const playerY = playerState ? playerState.y : walkableHeightValueAt(playerX, playerZ);

    for (let d = 0; d < dwarvenMiners.length; d++) {
      const dm = dwarvenMiners[d];
      const safeDt =
        dm.lastElapsedTime > 0
          ? Math.min(0.1, Math.max(0.001, elapsedTime - dm.lastElapsedTime))
          : 1 / 60;
      dm.lastElapsedTime = elapsedTime;

      if (dm.hitFlashTimer > 0) {
        dm.hitFlashTimer = Math.max(0, dm.hitFlashTimer - safeDt);
      }
      if (dm.hitBarTimer > 0) {
        dm.hitBarTimer = Math.max(0, dm.hitBarTimer - safeDt);
      }

      // 0. Dead State: play death animation once, allow corpse looting, and respawn after 25s while player is out of area!
      if (dm.isDead) {
        const distPlayerToDeadDwarf = Math.hypot(playerX - dm.x, playerZ - dm.z);
        if (distPlayerToDeadDwarf > 38.0) {
          dm.outOfAreaRespawnTimer += safeDt;
          if (dm.outOfAreaRespawnTimer >= 25.0) {
            const respawnSt = computeDwarvenMinerCaravanState(worldHours, d, elapsedTime);
            const respawnLoot = generateRandomDwarfLoot(d);
            dm.isDead = false;
            dm.isLooted = false;
            dm.goldDrop = respawnLoot.goldDrop;
            dm.lootItems = respawnLoot.lootItems;
            dm.outOfAreaRespawnTimer = 0;
            dm.deathTimer = 0;
            dm.hp = dm.maxHp;
            dm.isAggro = false;
            dm.aggroTimer = 0;
            const respawnClear = keepDwarfOutOfFurniture(respawnSt.x, respawnSt.z, respawnSt.y);
            dm.x = respawnClear.x;
            dm.y = respawnSt.y;
            dm.z = respawnClear.z;
            dm.yaw = respawnSt.yaw;
            dm.root.position.set(dm.x, dm.y, dm.z);
            dm.ctrl.setState('idle', 0.12);
            continue;
          }
        }
        const vis = isWithinViewDistance(dm.x, dm.z, playerX, playerZ, 18, VIEW_DISTANCE);
        dm.root.visible = vis;
        dm.lanternGlow.visible = false;
        dm.ctrl.speed = 0;
        if (dm.ctrl.state !== 'death') {
          dm.ctrl.setState('death', 0.12);
        }
        dm.ctrl.update(safeDt);
        continue;
      }

      const st = computeDwarvenMinerCaravanState(worldHours, d, elapsedTime, (x, z, hintY) => walkableHeightValueAt(x, z, hintY));

      // Always keep dm.x, dm.y, dm.z updated even when culled so flying arrows hit accurately at long range
      if (!dm.isAggro) {
        const clear = keepDwarfOutOfFurniture(st.x, st.z, st.y);
        dm.x = clear.x;
        dm.y = st.y;
        dm.z = clear.z;
        dm.yaw = st.yaw;
      }

      const vis = isWithinViewDistance(dm.x, dm.z, playerX, playerZ, 18, VIEW_DISTANCE);
      dm.root.visible = vis;
      if (!vis && !dm.isAggro) continue;

      if (dm.attackCooldown > 0) {
        dm.attackCooldown = Math.max(0, dm.attackCooldown - safeDt);
      }

      // 1. Retaliation Combat AI (ONLY active when the player has attacked this dwarf!)
      if (dm.isAggro) {
        dm.aggroTimer = Math.max(0, dm.aggroTimer - safeDt);
        const toPx = playerX - dm.x;
        const toPz = playerZ - dm.z;
        const dPlayer = Math.hypot(toPx, toPz) || 0.001;

        if (dm.aggroTimer <= 0 || dPlayer > 48.0) {
          dm.isAggro = false;
        } else {
          dm.hitBarTimer = Math.max(dm.hitBarTimer, 1.5);
          // Remember `dwRoot` uses -Z forward convention because `ctrl.group.rotation.y = Math.PI`
          const targetYaw = Math.atan2(-toPx, -toPz);
          dm.yaw = rotateAngleToward(dm.yaw, targetYaw, safeDt * 7.5);

          if (dPlayer > 2.05) {
            const runSpd = 4.5;
            // N3: the dwarf routes around solid walls (no walking through the mine wall). With no route it holds still.
            const steer = steerAroundWalls(dm.x, dm.z, playerX, playerZ, dm.y + 0.8, DWARF_BODY_RADIUS);
            if (steer === null) {
              dm.ctrl.speed = 0;
              dm.ctrl.setState('idle', 0.2);
            } else {
              const sx = steer.x - dm.x;
              const sz = steer.z - dm.z;
              const sLen = Math.hypot(sx, sz) || 0.001;
              const goalDist = steer.x === playerX && steer.z === playerZ ? dPlayer - 1.75 : sLen;
              const step = Math.min(goalDist, runSpd * safeDt);
              dm.x += (sx / sLen) * step;
              dm.z += (sz / sLen) * step;
              const walkInfo = walkableHeightAt(dm.x, dm.z, dm.y);
              dm.y += (walkInfo.height - dm.y) * Math.min(1, safeDt * 12.0);
              dm.ctrl.speed = runSpd;
              dm.ctrl.setState('run', 0.16);
            }
          } else if (Math.abs(playerY - dm.y) > 2.3) {
            // N3: a player out of reach above (or below) is not attacked; the dwarf does not swing at empty air.
            dm.ctrl.speed = 0;
            dm.ctrl.setState('idle', 0.2);
          } else {
            dm.ctrl.speed = 0;
            if (dm.attackCooldown <= 0) {
              const attackClips: ReadonlyArray<'attack1' | 'attack2' | 'attack3'> = [
                'attack1',
                'attack2',
                'attack3',
              ];
              const nextIdx = (attackClips.indexOf(dm.currentAttackClip) + 1) % attackClips.length;
              dm.currentAttackClip = attackClips[nextIdx];
              dm.attackCooldown = 1.05;
              dm.ctrl.setState(dm.currentAttackClip, 0.12);

              if (playerState && dPlayer <= 2.35 && Math.abs(playerY - dm.y) <= 2.3) {
                playerState.stamina = Math.max(0, (playerState.stamina ?? 100) - 9);
                playerState.hp = Math.max(1, (playerState.hp ?? 100) - 7);
              }
            } else {
              dm.ctrl.setState(dm.currentAttackClip, 0.12);
            }
          }

          dm.root.position.set(dm.x, dm.y, dm.z);
          dm.root.rotation.order = 'YXZ';
          dm.root.rotation.y = dm.yaw;
          dm.root.rotation.x *= 0.8;
          dm.root.rotation.z *= 0.8;
          dm.lanternGlow.visible = true;
          dm.ctrl.update(safeDt);
          continue;
        }
      }

      // 2. Peaceful Scheduled Caravan, Mining Rock Walls (`mine1` / `mine2`) + Loading Minecarts, & Home Rest
      let targetAnim: DwarfWarriorState = 'idle';
      if (st.activity === 'caravan_to_mine' || st.activity === 'caravan_to_home') {
        const isMoving = st.walkCycle > 0;
        if (isMoving) {
          dm.ctrl.speed = 2.1;
          targetAnim = 'walk';
        } else if (st.miningSwing > 0) {
          dm.ctrl.speed = 0;
          targetAnim = d % 2 === 0 ? 'mine1' : 'mine2';
        } else {
          dm.ctrl.speed = 0;
          targetAnim = 'idle';
        }
      } else if (st.activity === 'mining_work') {
        const stCfg = DWARVEN_MINER_STATIONS[d];
        const cartIdx = stCfg.pairedCartIdx;
        const cartSt =
          cartIdx !== undefined ? evaluateMinecartTrackState(cartIdx, elapsedTime) : null;

        if (
          cartSt &&
          cartSt.isLoadingAtStart &&
          stCfg.cartLoadLocalX !== undefined &&
          stCfg.cartLoadLocalZ !== undefined &&
          stCfg.cartLoadYaw !== undefined
        ) {
          const loadWorldX = mineX + stCfg.cartLoadLocalX;
          const loadWorldZ = mineEntZ + stCfg.cartLoadLocalZ;
          const lp = cartSt.loadingProgress;
          if (lp < 0.22) {
            const walkT = lp / 0.22;
            dm.x = st.x + (loadWorldX - st.x) * walkT;
            dm.z = st.z + (loadWorldZ - st.z) * walkT;
            dm.yaw = Math.atan2(-(loadWorldX - st.x), -(loadWorldZ - st.z));
            dm.ctrl.speed = 2.1;
            targetAnim = 'walk';
          } else if (lp <= 0.78) {
            dm.x = loadWorldX;
            dm.z = loadWorldZ;
            dm.yaw = stCfg.cartLoadYaw;
            dm.ctrl.speed = 0;
            targetAnim = 'mine1';
          } else {
            const walkBackT = (lp - 0.78) / 0.22;
            dm.x = loadWorldX + (st.x - loadWorldX) * walkBackT;
            dm.z = loadWorldZ + (st.z - loadWorldZ) * walkBackT;
            dm.yaw = Math.atan2(-(st.x - loadWorldX), -(st.z - loadWorldZ));
            dm.ctrl.speed = 2.1;
            targetAnim = 'walk';
          }
        } else {
          // Strike directly into the glowing rock / crystal / gold wall vein right in front of the dwarf!
          dm.ctrl.speed = 0;
          const mineCycle = Math.floor((elapsedTime * 0.35 + d * 0.7) % 2);
          targetAnim = mineCycle === 0 ? 'mine1' : 'mine2';
        }
      } else {
        // Resting at home inside the Dwarven Stone Houses:
        // Place sleeping dwarves ON TOP OF their Bed mattress (`house.floorY + 0.54`) and sitting dwarves on their Wooden Bench!
        dm.ctrl.speed = 0;
        const { houseIdx, slot } = getDwarfHomeAssignment(d);
        const house = DWARVEN_STONE_HOUSES[houseIdx];
        const hNorm = ((worldHours % 24) + 24) % 24;
        const isDeepNight = hNorm >= 21.2 || hNorm < 5.2;
        const slowRestFlip = Math.floor((elapsedTime * 0.02 + houseIdx * 0.7) % 2);
        const shouldSleep = isDeepNight || (slot === 0 ? slowRestFlip === 0 : slowRestFlip === 1);

        if (shouldSleep) {
          targetAnim = 'sleep';
          const bedLocalX = slot === 0 ? -2.0 : 2.0;
          dm.x = house.x + bedLocalX;
          dm.y = house.floorY + 0.54;
          dm.z = house.z + 2.55;
          dm.yaw = 0; // Head toward headboard (+Z), feet toward -Z
        } else {
          targetAnim = 'sit';
          const benchLocalZ = slot === 0 ? -2.55 : -0.75;
          dm.x = house.x + house.dirX * 1.55;
          dm.y = house.floorY;
          dm.z = house.z + benchLocalZ;
          // dwRoot uses -Z forward convention (ctrl.group.rotation.y = Math.PI):
          // Bench at -2.55 faces South (+Z -> yaw = Math.PI), Bench at -0.75 faces North (-Z -> yaw = 0)
          dm.yaw = slot === 0 ? Math.PI : 0;
        }
        // DW1: a seat or bed next to a table must not overlap it.
        const seat = findClearSeat(dm.x, dm.z, dm.y);
        dm.x = seat.x;
        dm.z = seat.z;
      }

      // DW1: nothing about the walking, sitting or sleeping placement may leave a dwarf inside furniture.
      if (!dm.isAggro) {
        const clear = findClearSeat(dm.x, dm.z, dm.y);
        dm.x = clear.x;
        dm.z = clear.z;
      }
      dm.root.position.set(dm.x, dm.y, dm.z);
      dm.root.rotation.order = 'YXZ';
      dm.root.rotation.y = dm.yaw;
      const dwSurf = walkableHeightAt(dm.x, dm.z, dm.y);
      if (st.activity !== 'resting_home' && dwSurf.surface === 'ground') {
        const n = getSurfaceNormalAt(dm.x, dm.z);
        const slope = computeSlopePitchAndRoll(n.nx, n.ny, n.nz, dm.yaw, 0.42);
        dm.root.rotation.x += (slope.pitch - dm.root.rotation.x) * 0.25;
        dm.root.rotation.z += (slope.roll - dm.root.rotation.z) * 0.25;
      } else {
        dm.root.rotation.x *= 0.8;
        dm.root.rotation.z *= 0.8;
      }
      dm.lanternGlow.visible = st.lanternLit;

      dm.ctrl.setState(targetAnim, 0.22);
      dm.ctrl.update(safeDt);
    }

    // Automatically swing open Dwarven Stone House doors when a dwarf walks through the doorway
    for (let hIdx = 0; hIdx < DWARVEN_STONE_HOUSES.length; hIdx++) {
      const dh = DWARVEN_STONE_HOUSES[hIdx];
      let dwarfNearDoor = false;
      for (let d = 0; d < dwarvenMiners.length; d++) {
        const dm = dwarvenMiners[d];
        if (dm.isDead) continue;
        if (Math.hypot(dm.x - dh.doorX, dm.z - dh.doorZ) <= 3.6) {
          dwarfNearDoor = true;
          break;
        }
      }
      if (dwarfNearDoor) {
        for (let p = 0; p < doorPivotHandles.length; p++) {
          const dp = doorPivotHandles[p];
          if (dp.id === dh.doorId) {
            const openAngle = Math.PI * 0.48;
            dp.currentAngle += (openAngle - dp.currentAngle) * 0.18;
            dp.leftPivot.rotation.y = -dp.currentAngle;
            dp.rightPivot.rotation.y = dp.currentAngle;
          }
        }
      }
    }
  };

  return {
    dwarvenMiners,
    updateDwarvenMiners,
  };
}
// #endregion
