/**
 * @file src/world/systems/monkTempleSystem.ts
 * @description Manages the WarriorMonk AI across the Northern Temple Palace (Chinese Fortress) and Sakura Sanctuary:
 *              - 2 Entrance Guards at the Temple Palace gate (holding crossed staffs until the player approaches, similar to Floating Islands guards)
 *              - 4 Courtyard Dummy-Training Monks striking the wooden dummies with attack1/attack2/attack3/staff_spin and causing dummy recoil
 *              - Shrine Devotees & Patrol Monks cycling through all non-death animations (idle, walk, run, sleep, sit, pray_kneel, attack1, attack2, attack3, staff_spin)
 *              - Provocation rules: shooting an arrow at the Sacred Temple Statue provokes ALL monks; attacking a single monk provokes ONLY that monk
 *              - Invulnerability: arrow hits trigger `staff_spin` deflection; sword strikes make the monk teleport behind the player and counter-attack.
 */

import * as THREE from 'three';
import {
  WarriorMonk,
  WarriorMonkState,
  createReadyWarriorMonk,
} from '../models/Characters/WarriorMonk_Complete';
import {
  CHINESE_FORTRESS_POS,
  SAKURA_SANCTUARY_POS,
  SAKURA_SANCTUARY_YAW,
  isWithinViewDistance,
} from '../domain/landmarksRegistry';
import { walkableHeightAt } from './terrainAndBiomeSystem';
import { getPlayerState } from './combatAndInventorySystem';

export type MonkRole =
  | 'entrance_guard_left'
  | 'entrance_guard_right'
  | 'dummy_trainer'
  | 'shrine_devotee'
  | 'courtyard_patrol'
  | 'sanctuary_master';

export interface IWoodenDummyHandle {
  group: THREE.Group;
  x: number;
  y: number;
  z: number;
  baseYaw: number;
  hitImpulse: number;
  hitPhase: number;
}

export interface ITempleStatueTarget {
  id: string;
  x: number;
  baseY: number;
  z: number;
  radius: number;
  height: number;
  hitFlashTimer: number;
  group?: THREE.Group;
}

export interface IMonkTeleportShard {
  mesh: THREE.Mesh;
  baseOffX: number;
  baseOffY: number;
  baseOffZ: number;
  scatterX: number;
  scatterY: number;
  scatterZ: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  stagger: number;
}

export interface IMonkTeleportSequence {
  elapsed: number;
  duration: number;
  startX: number;
  startY: number;
  startZ: number;
  ctrlX: number;
  ctrlY: number;
  ctrlZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  targetYaw: number;
}

export interface IActiveTempleMonk {
  id: string;
  role: MonkRole;
  ctrl: WarriorMonk;
  group: THREE.Group;
  x: number;
  y: number;
  z: number;
  yaw: number;
  homeX: number;
  homeY: number;
  homeZ: number;
  baseYaw: number;
  patrolWaypoints?: ReadonlyArray<readonly [number, number, number]>;
  waypointIndex: number;
  dummyIndex?: number;
  phaseOffset: number;
  scheduleTimer: number;
  scheduleStage: number;
  isAggro: boolean;
  isLeashedReturning?: boolean;
  aggroTimer: number;
  forgetTimer: number;
  deflectTimer: number;
  teleportFlashTimer: number;
  attackCooldown: number;
  currentAttackClip: 'attack1' | 'attack2' | 'attack3' | 'staff_spin';
  guardCrossFactor: number;
  teleportRingMesh?: THREE.Mesh;
  teleportPartsGroup?: THREE.Group;
  teleportShards?: IMonkTeleportShard[];
  teleportState?: IMonkTeleportSequence | null;
}

const activeTempleMonks: IActiveTempleMonk[] = [];
const woodenDummies: IWoodenDummyHandle[] = [];
const templeStatues: ITempleStatueTarget[] = [];
let allMonksProvoked = false;
let allMonksAggroTimer = 0;

/**
 * Summary: Resets and clears all registered monks, dummies, and statues when rebuilding the world scene.
 */
export function resetMonkTempleSystem(): void {
  activeTempleMonks.length = 0;
  woodenDummies.length = 0;
  templeStatues.length = 0;
  allMonksProvoked = false;
  allMonksAggroTimer = 0;
}

/**
 * Summary: Resets all existing live monks, temple statues, and wooden dummies back to their peaceful
 *          starting positions and states without destroying their Three.js scene meshes.
 *          Called on every world reset (Survival, Creative/God Mode, or New Game).
 */
export function resetActiveTempleMonksState(): void {
  allMonksProvoked = false;
  allMonksAggroTimer = 0;

  for (let s = 0; s < templeStatues.length; s++) {
    const st = templeStatues[s];
    st.hitFlashTimer = 0;
    if (st.group) {
      st.group.rotation.z = 0;
    }
  }

  for (let d = 0; d < woodenDummies.length; d++) {
    const dm = woodenDummies[d];
    dm.hitImpulse = 0;
    dm.hitPhase = 0;
    dm.group.rotation.set(0, dm.baseYaw, 0);
  }

  for (let i = 0; i < activeTempleMonks.length; i++) {
    const mk = activeTempleMonks[i];
    mk.x = mk.homeX;
    mk.y = mk.homeY;
    mk.z = mk.homeZ;
    mk.yaw = mk.baseYaw;
    mk.waypointIndex = 0;
    mk.scheduleTimer = (mk.phaseOffset * 1.7) % 3.2;
    mk.scheduleStage = Math.floor(mk.phaseOffset * 3) % 5;
    mk.isAggro = false;
    mk.isLeashedReturning = false;
    mk.aggroTimer = 0;
    mk.forgetTimer = 0;
    mk.deflectTimer = 0;
    mk.teleportFlashTimer = 0;
    mk.attackCooldown = 0;
    mk.currentAttackClip = 'attack1';
    mk.guardCrossFactor =
      mk.role === 'entrance_guard_left' || mk.role === 'entrance_guard_right' ? 1.0 : 0.0;
    mk.teleportState = null;
    if (mk.teleportPartsGroup) {
      mk.teleportPartsGroup.visible = false;
    }
    if (mk.teleportRingMesh) {
      mk.teleportRingMesh.visible = false;
    }
      mk.ctrl.group.visible = true;
    mk.ctrl.group.scale.setScalar(1.0);
    mk.ctrl.group.rotation.set(0, 0, 0);
    mk.ctrl.speed = 0;
    mk.ctrl.setState('idle', 0.05);
    mk.group.position.set(mk.homeX, mk.homeY, mk.homeZ);
    mk.group.rotation.set(0, mk.baseYaw, 0);
  }
}

/**
 * Summary: Returns the live list of active temple monks for inspection, testing, and combat checks.
 */
export function getActiveTempleMonks(): readonly IActiveTempleMonk[] {
  return activeTempleMonks;
}

/**
 * Summary: Returns the registered sacred temple statues (Palace Golden Statue & Sakura Buddha).
 */
export function getTempleStatues(): readonly ITempleStatueTarget[] {
  return templeStatues;
}

/**
 * Summary: Returns whether all monks have been globally provoked by shooting the temple statue.
 */
export function areAllMonksProvoked(): boolean {
  return allMonksProvoked;
}

/**
 * Summary: Registers a wooden training dummy so dummy-training monks can make it shudder on impact.
 */
export function registerWoodenDummy(handle: IWoodenDummyHandle): number {
  woodenDummies.push(handle);
  return woodenDummies.length - 1;
}

/**
 * Summary: Registers a sacred temple statue that provokes nearby monks when struck by an arrow or sword.
 */
export function registerTempleStatue(statue: ITempleStatueTarget): void {
  const existingIdx = templeStatues.findIndex((s) => s.id === statue.id);
  if (existingIdx >= 0) {
    templeStatues[existingIdx] = statue;
  } else {
    templeStatues.push(statue);
  }
}

/**
 * Summary: Spawns and registers a WarriorMonk instance with a role, home coordinates, and optional tint/waypoints.
 */
export function spawnTempleMonk(config: {
  id: string;
  role: MonkRole;
  parent: THREE.Object3D;
  homeX: number;
  homeY: number;
  homeZ: number;
  baseYaw: number;
  phaseOffset: number;
  weaponVisible?: boolean;
  tintHex?: number;
  scale?: number;
  dummyIndex?: number;
  patrolWaypoints?: ReadonlyArray<readonly [number, number, number]>;
  isSoftwareGl?: boolean;
  disposableGeometries?: THREE.BufferGeometry[];
  disposableMaterials?: THREE.Material[];
}): IActiveTempleMonk {
  const ctrl = createReadyWarriorMonk({
    weaponVisible: config.weaponVisible ?? true,
    tintHex: config.tintHex,
    scale: config.scale ?? 1.0,
    castShadow: !config.isSoftwareGl,
    receiveShadow: !config.isSoftwareGl,
  });
  ctrl.driveRootMotion = false;

  const wrapper = new THREE.Group();
  wrapper.name = `TempleMonk_${config.id}`;
  wrapper.position.set(config.homeX, config.homeY, config.homeZ);
  wrapper.rotation.y = config.baseYaw;
  wrapper.add(ctrl.group);

  // Subtle golden chi ring shown briefly when teleporting behind the player or deflecting arrows
  const ringGeo = new THREE.RingGeometry(0.45, 0.92, 20);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.position.y = 0.08;
  ringMesh.visible = false;
  wrapper.add(ringMesh);

  // Disassembly teleport shards group (24 anatomical, staff & golden trajectory-ribbon fragments that stream along the path behind the player)
  const teleportPartsGroup = new THREE.Group();
  teleportPartsGroup.name = `TempleMonkTeleportShards_${config.id}`;
  teleportPartsGroup.visible = false;
  wrapper.add(teleportPartsGroup);

  const robeShardMat = new THREE.MeshStandardMaterial({
    color: config.tintHex ?? 0xd97706,
    emissive: 0xd97706,
    emissiveIntensity: 0.65,
    roughness: 0.35,
  });
  const crimsonShardMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xb91c1c,
    emissiveIntensity: 0.6,
    roughness: 0.35,
  });
  const goldShardMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.95,
    metalness: 0.7,
    roughness: 0.2,
  });
  const skinShardMat = new THREE.MeshStandardMaterial({
    color: 0xe6b88a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.42,
    roughness: 0.45,
  });

  const headShardGeo = new THREE.SphereGeometry(0.23, 8, 8);
  const torsoShardGeo = new THREE.BoxGeometry(0.38, 0.34, 0.26);
  const limbShardGeo = new THREE.CylinderGeometry(0.095, 0.08, 0.44, 7);
  const staffShardGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.72, 6);
  const chiStreakGeo = new THREE.BoxGeometry(0.14, 0.14, 0.78);

  if (config.disposableGeometries) {
    config.disposableGeometries.push(
      ctrl.skinnedMesh.geometry,
      ringGeo,
      headShardGeo,
      torsoShardGeo,
      limbShardGeo,
      staffShardGeo,
      chiStreakGeo
    );
  }
  if (config.disposableMaterials) {
    const mat = ctrl.skinnedMesh.material;
    if (Array.isArray(mat)) {
      for (const m of mat) config.disposableMaterials.push(m);
    } else {
      config.disposableMaterials.push(mat);
    }
    config.disposableMaterials.push(
      ringMat,
      robeShardMat,
      crimsonShardMat,
      goldShardMat,
      skinShardMat
    );
  }

  const shardDefs: ReadonlyArray<{
    geo: THREE.BufferGeometry;
    mat: THREE.Material;
    ox: number;
    oy: number;
    oz: number;
    sx: number;
    sy: number;
    sz: number;
    stagger: number;
  }> = [
    // Head & golden prayer beads / crown
    { geo: headShardGeo, mat: skinShardMat, ox: 0, oy: 1.62, oz: 0, sx: 0.18, sy: 0.58, sz: 0.14, stagger: 0.0 },
    { geo: torsoShardGeo, mat: goldShardMat, ox: 0, oy: 1.76, oz: 0, sx: -0.22, sy: 0.72, sz: -0.18, stagger: 0.03 },
    // Upper, middle, and lower robe torso
    { geo: torsoShardGeo, mat: robeShardMat, ox: -0.14, oy: 1.28, oz: 0.05, sx: -0.58, sy: 0.38, sz: 0.32, stagger: 0.06 },
    { geo: torsoShardGeo, mat: crimsonShardMat, ox: 0.14, oy: 1.24, oz: -0.05, sx: 0.62, sy: 0.42, sz: -0.28, stagger: 0.09 },
    { geo: torsoShardGeo, mat: robeShardMat, ox: 0, oy: 0.96, oz: 0, sx: 0.26, sy: 0.22, sz: 0.48, stagger: 0.12 },
    // Arms & forearms
    { geo: limbShardGeo, mat: robeShardMat, ox: -0.34, oy: 1.32, oz: 0, sx: -0.82, sy: 0.45, sz: 0.25, stagger: 0.15 },
    { geo: limbShardGeo, mat: skinShardMat, ox: -0.42, oy: 1.02, oz: 0.14, sx: -0.96, sy: 0.28, sz: 0.52, stagger: 0.18 },
    { geo: limbShardGeo, mat: robeShardMat, ox: 0.34, oy: 1.32, oz: 0, sx: 0.82, sy: 0.46, sz: -0.25, stagger: 0.21 },
    { geo: limbShardGeo, mat: skinShardMat, ox: 0.42, oy: 1.02, oz: 0.14, sx: 0.96, sy: 0.30, sz: 0.52, stagger: 0.24 },
    // Legs & greaves
    { geo: limbShardGeo, mat: crimsonShardMat, ox: -0.16, oy: 0.62, oz: 0, sx: -0.62, sy: -0.12, sz: -0.38, stagger: 0.27 },
    { geo: limbShardGeo, mat: robeShardMat, ox: -0.16, oy: 0.28, oz: 0, sx: -0.48, sy: -0.22, sz: 0.35, stagger: 0.30 },
    { geo: limbShardGeo, mat: crimsonShardMat, ox: 0.16, oy: 0.62, oz: 0, sx: 0.62, sy: -0.12, sz: -0.38, stagger: 0.33 },
    { geo: limbShardGeo, mat: robeShardMat, ox: 0.16, oy: 0.28, oz: 0, sx: 0.48, sy: -0.22, sz: 0.35, stagger: 0.36 },
    // 3 Golden Staff segments
    { geo: staffShardGeo, mat: goldShardMat, ox: 0.38, oy: 1.52, oz: 0.24, sx: 0.88, sy: 0.68, sz: 0.58, stagger: 0.08 },
    { geo: staffShardGeo, mat: goldShardMat, ox: 0.38, oy: 1.02, oz: 0.24, sx: 1.08, sy: 0.28, sz: 0.38, stagger: 0.20 },
    { geo: staffShardGeo, mat: goldShardMat, ox: 0.38, oy: 0.52, oz: 0.24, sx: 0.78, sy: -0.16, sz: 0.65, stagger: 0.32 },
    // 8 Radiant Chi Trajectory Streaks distributed along the full flight path so the player clearly sees the teleport trail
    { geo: chiStreakGeo, mat: goldShardMat, ox: -0.18, oy: 1.38, oz: -0.12, sx: -0.32, sy: 0.25, sz: -0.28, stagger: 0.04 },
    { geo: chiStreakGeo, mat: crimsonShardMat, ox: 0.18, oy: 1.22, oz: 0.12, sx: 0.32, sy: 0.18, sz: 0.28, stagger: 0.11 },
    { geo: chiStreakGeo, mat: goldShardMat, ox: -0.22, oy: 1.08, oz: -0.16, sx: -0.38, sy: 0.15, sz: -0.32, stagger: 0.17 },
    { geo: chiStreakGeo, mat: robeShardMat, ox: 0.22, oy: 0.95, oz: 0.16, sx: 0.38, sy: 0.12, sz: 0.32, stagger: 0.23 },
    { geo: chiStreakGeo, mat: goldShardMat, ox: -0.16, oy: 1.18, oz: 0.08, sx: -0.28, sy: 0.20, sz: 0.22, stagger: 0.29 },
    { geo: chiStreakGeo, mat: crimsonShardMat, ox: 0.16, oy: 0.82, oz: -0.08, sx: 0.28, sy: 0.08, sz: -0.22, stagger: 0.35 },
    { geo: chiStreakGeo, mat: goldShardMat, ox: -0.12, oy: 1.02, oz: -0.14, sx: -0.22, sy: 0.14, sz: -0.18, stagger: 0.41 },
    { geo: chiStreakGeo, mat: goldShardMat, ox: 0.12, oy: 0.74, oz: 0.14, sx: 0.22, sy: 0.06, sz: 0.18, stagger: 0.46 },
  ];

  const teleportShards: IMonkTeleportShard[] = [];
  for (let sIdx = 0; sIdx < shardDefs.length; sIdx++) {
    const d = shardDefs[sIdx];
    const m = new THREE.Mesh(d.geo, d.mat);
    m.position.set(d.ox, d.oy, d.oz);
    teleportPartsGroup.add(m);
    teleportShards.push({
      mesh: m,
      baseOffX: d.ox,
      baseOffY: d.oy,
      baseOffZ: d.oz,
      scatterX: d.sx,
      scatterY: d.sy,
      scatterZ: d.sz,
      spinX: (sIdx % 2 === 0 ? 1 : -1) * (5.5 + (sIdx % 5) * 1.2),
      spinY: (sIdx % 3 === 0 ? -1 : 1) * (7.0 + (sIdx % 4) * 1.4),
      spinZ: (sIdx % 2 === 1 ? 1 : -1) * (4.8 + (sIdx % 3) * 1.3),
      stagger: d.stagger,
    });
  }

  config.parent.add(wrapper);

  const monk: IActiveTempleMonk = {
    id: config.id,
    role: config.role,
    ctrl,
    group: wrapper,
    x: config.homeX,
    y: config.homeY,
    z: config.homeZ,
    yaw: config.baseYaw,
    homeX: config.homeX,
    homeY: config.homeY,
    homeZ: config.homeZ,
    baseYaw: config.baseYaw,
    patrolWaypoints: config.patrolWaypoints,
    waypointIndex: 0,
    dummyIndex: config.dummyIndex,
    phaseOffset: config.phaseOffset,
    scheduleTimer: (config.phaseOffset * 1.7) % 3.2,
    scheduleStage: Math.floor(config.phaseOffset * 3) % 5,
    isAggro: false,
    aggroTimer: 0,
    forgetTimer: 0,
    deflectTimer: 0,
    teleportFlashTimer: 0,
    attackCooldown: 0,
    currentAttackClip: 'attack1',
    guardCrossFactor: config.role === 'entrance_guard_left' || config.role === 'entrance_guard_right' ? 1.0 : 0.0,
    teleportRingMesh: ringMesh,
    teleportPartsGroup,
    teleportShards,
    teleportState: null,
  };

  activeTempleMonks.push(monk);
  return monk;
}

/**
 * Summary: Provokes monks within `radius` (default 34m) of a specific point (e.g. a Sacred Temple Statue).
 *          Only monks close enough to that statue charge the player!
 */
export function provokeMonksNearStatue(statueX: number, statueZ: number, radius = 34.0): number {
  let count = 0;
  for (let i = 0; i < activeTempleMonks.length; i++) {
    const mk = activeTempleMonks[i];
    const d = Math.hypot(mk.x - statueX, mk.z - statueZ);
    const dHome = Math.hypot(mk.homeX - statueX, mk.homeZ - statueZ);
    if (d <= radius || dHome <= radius) {
      mk.isAggro = true;
      mk.isLeashedReturning = false;
      mk.aggroTimer = 60.0;
      mk.forgetTimer = 0;
      mk.ctrl.setWeaponVisible(true);
      count++;
    }
  }
  return count;
}

/**
 * Summary: Legacy helper — provokes all monks across the world.
 */
export function provokeAllMonks(): void {
  allMonksProvoked = true;
  allMonksAggroTimer = 60.0;
  for (let i = 0; i < activeTempleMonks.length; i++) {
    const mk = activeTempleMonks[i];
    mk.isAggro = true;
    mk.isLeashedReturning = false;
    mk.aggroTimer = 60.0;
    mk.forgetTimer = 0;
    mk.ctrl.setWeaponVisible(true);
  }
}

/**
 * Summary: Provokes ONLY a single specific monk (triggered when attacking that monk directly).
 */
export function provokeSingleMonk(monk: IActiveTempleMonk): void {
  monk.isAggro = true;
  monk.isLeashedReturning = false;
  monk.aggroTimer = 60.0;
  monk.forgetTimer = 0;
  monk.ctrl.setWeaponVisible(true);
}

/**
 * Summary: Checks if a flying arrow hit a Sacred Temple Statue using a tight 2-tier silhouette hitbox
 *          (pedestal base 0..1.55m at st.radius, sculpted guardian figure 1.55..5.1m at 1.05m radius).
 *          If so, flashes the statue and provokes ONLY the monks close to that statue (<= 34m)!
 */
export function checkArrowHitTempleStatue(arrowX: number, arrowY: number, arrowZ: number): boolean {
  for (let i = 0; i < templeStatues.length; i++) {
    const st = templeStatues[i];
    const relY = arrowY - st.baseY;
    if (relY < -0.25 || relY > st.height) continue;
    const dHoriz = Math.hypot(arrowX - st.x, arrowZ - st.z);
    const effectiveRadius = relY <= 1.55 ? st.radius : Math.min(st.radius, 1.05);
    if (dHoriz <= effectiveRadius) {
      st.hitFlashTimer = 1.2;
      provokeMonksNearStatue(st.x, st.z, 34.0);
      return true;
    }
  }
  return false;
}

/**
 * Summary: Checks if a sword slash hit a Sacred Temple Statue using a tight silhouette hitbox.
 *          Provokes ONLY the monks within proximity (<= 34m) of that statue.
 */
export function checkSwordHitTempleStatue(strikeX: number, strikeY: number, strikeZ: number): boolean {
  for (let i = 0; i < templeStatues.length; i++) {
    const st = templeStatues[i];
    const relY = strikeY - st.baseY;
    if (relY < -0.45 || relY > st.height) continue;
    const dHoriz = Math.hypot(strikeX - st.x, strikeZ - st.z);
    if (dHoriz <= st.radius + 0.55) {
      st.hitFlashTimer = 1.2;
      provokeMonksNearStatue(st.x, st.z, 34.0);
      return true;
    }
  }
  return false;
}

/**
 * Summary: Checks if a flying arrow hit any monk.
 *          Monks are invulnerable: they deflect the arrow by activating `staff_spin`, and ONLY that monk becomes hostile.
 */
export function checkArrowHitMonk(arrowX: number, arrowY: number, arrowZ: number): IActiveTempleMonk | null {
  for (let i = 0; i < activeTempleMonks.length; i++) {
    const mk = activeTempleMonks[i];
    if (mk.teleportState) continue;
    const dHoriz = Math.hypot(arrowX - mk.x, arrowZ - mk.z);
    if (dHoriz <= 1.45 && arrowY >= mk.y - 0.35 && arrowY <= mk.y + 2.45) {
      provokeSingleMonk(mk);
      mk.deflectTimer = 1.35;
      mk.teleportFlashTimer = 0.65;
      mk.ctrl.setWeaponVisible(true);
      mk.ctrl.setState('staff_spin', 0.08);
      const pState = getPlayerState();
      if (pState) {
        mk.yaw = Math.atan2(pState.x - mk.x, pState.z - mk.z);
      }
      return mk;
    }
  }
  return null;
}

/**
 * Summary: Checks if a player sword strike hit any monk.
 *          Monks are invulnerable: when struck with a sword, the monk disassembles into 3D body & staff fragments
 *          that stream along a clearly visible curved trajectory to behind the player over ~0.92s, then reassembles and counter-attacks!
 */
export function checkSwordHitMonk(
  strikeX: number,
  strikeY: number,
  strikeZ: number,
  playerX: number,
  playerY: number,
  playerZ: number,
  playerYaw: number,
  isHeavy: boolean
): IActiveTempleMonk | null {
  const hitRadius = isHeavy ? 2.35 : 1.95;
  for (let i = 0; i < activeTempleMonks.length; i++) {
    const mk = activeTempleMonks[i];
    if (mk.teleportState) continue;
    const dHoriz = Math.hypot(strikeX - mk.x, strikeZ - mk.z);
    const dPlayer = Math.hypot(playerX - mk.x, playerZ - mk.z);
    if ((dHoriz <= hitRadius || dPlayer <= 2.4) && Math.abs(strikeY - (mk.y + 1.0)) <= 2.1) {
      provokeSingleMonk(mk);
      // Destination behind the player relative to player's facing direction
      const behindDist = 2.45;
      const targetX = playerX + Math.sin(playerYaw) * behindDist;
      const targetZ = playerZ + Math.cos(playerYaw) * behindDist;
      const walkInfo = walkableHeightAt(targetX, targetZ);
      const targetY = Math.max(walkInfo.height, playerY - 0.6);
      const targetYaw = Math.atan2(playerX - targetX, playerZ - targetZ);

      // Compute a curved side control point around the player so the flying parts stream visibly across the camera arc
      const sideSign = i % 2 === 0 ? 1 : -1;
      const rightX = Math.cos(playerYaw) * sideSign;
      const rightZ = -Math.sin(playerYaw) * sideSign;
      const midX = (mk.x + targetX) * 0.5 + rightX * 3.1;
      const midZ = (mk.z + targetZ) * 0.5 + rightZ * 3.1;
      const midY = Math.max(mk.y, targetY) + 0.65;

      mk.teleportState = {
        elapsed: 0,
        duration: 0.92,
        startX: mk.x,
        startY: mk.y,
        startZ: mk.z,
        ctrlX: midX,
        ctrlY: midY,
        ctrlZ: midZ,
        targetX,
        targetY,
        targetZ,
        targetYaw,
      };

      mk.teleportFlashTimer = 0.95;
      mk.deflectTimer = 0;
      mk.attackCooldown = 1.25;
      mk.currentAttackClip = 'attack2';
      mk.ctrl.setWeaponVisible(true);
      return mk;
    }
  }
  return null;
}

function rotateAngleToward(current: number, target: number, maxStep: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
}

/**
 * Summary: Returns true if the given coordinates (x, z) are inside the monk's home territory
 *          (either the Northern Monastery/Castle compound inside the gate walls, or the Sakura Sanctuary Pond area).
 */
export function isPlayerInsideMonkTerritory(
  playerX: number,
  playerZ: number,
  monk: IActiveTempleMonk
): boolean {
  const isSanctuaryMonk =
    monk.role === 'sanctuary_master' ||
    Math.hypot(monk.homeX - SAKURA_SANCTUARY_POS.x, monk.homeZ - SAKURA_SANCTUARY_POS.z) < 48.0;
  if (isSanctuaryMonk) {
    return Math.hypot(playerX - SAKURA_SANCTUARY_POS.x, playerZ - SAKURA_SANCTUARY_POS.z) <= 32.0;
  }
  return (
    Math.abs(playerX - CHINESE_FORTRESS_POS.x) <= 52.0 &&
    playerZ >= CHINESE_FORTRESS_POS.plazaMinZ - 8.0 &&
    playerZ <= CHINESE_FORTRESS_POS.upperGateZ + 6.0
  );
}

/**
 * Summary: Steps all Temple Palace and Sakura Sanctuary monks, wooden training dummies, and temple statues.
 */
export function updateMonkTempleSystem(
  dt: number,
  elapsedTime: number,
  playerX: number,
  playerZ: number
): void {
  const safeDt = Math.min(0.1, Math.max(0.001, dt));
  const playerState = getPlayerState();
  const playerY = playerState ? playerState.y : walkableHeightAt(playerX, playerZ).height;

  if (allMonksProvoked) {
    allMonksAggroTimer = Math.max(0, allMonksAggroTimer - safeDt);
    if (allMonksAggroTimer <= 0) {
      allMonksProvoked = false;
    }
  }

  // 1. Update sacred temple statue hit glow
  for (let s = 0; s < templeStatues.length; s++) {
    const st = templeStatues[s];
    if (st.hitFlashTimer > 0) {
      st.hitFlashTimer = Math.max(0, st.hitFlashTimer - safeDt);
      if (st.group) {
        const shake = Math.sin(elapsedTime * 42.0) * 0.04 * st.hitFlashTimer;
        st.group.rotation.z = shake;
      }
    } else if (st.group) {
      st.group.rotation.z = 0;
    }
  }

  // 2. Step each monk's AI and skeletal animations
  for (let i = 0; i < activeTempleMonks.length; i++) {
    const mk = activeTempleMonks[i];
    const vis = isWithinViewDistance(mk.x, mk.z, playerX, playerZ, 12, 145);
    mk.group.visible = vis;
    if (!vis && !mk.isAggro && Math.hypot(mk.x - mk.homeX, mk.z - mk.homeZ) < 0.5) continue;

    // Update golden chi ring flash
    if (mk.teleportFlashTimer > 0) {
      mk.teleportFlashTimer = Math.max(0, mk.teleportFlashTimer - safeDt);
      if (mk.teleportRingMesh) {
        mk.teleportRingMesh.visible = true;
        const prog = 1.0 - mk.teleportFlashTimer / 0.95;
        mk.teleportRingMesh.scale.setScalar(0.85 + prog * 1.45);
        const rMat = mk.teleportRingMesh.material as THREE.MeshBasicMaterial;
        rMat.opacity = Math.max(0, mk.teleportFlashTimer * 0.95);
      }
    } else if (mk.teleportRingMesh) {
      mk.teleportRingMesh.visible = false;
    }

    if (mk.deflectTimer > 0) {
      mk.deflectTimer = Math.max(0, mk.deflectTimer - safeDt);
    }
    if (mk.attackCooldown > 0) {
      mk.attackCooldown = Math.max(0, mk.attackCooldown - safeDt);
    }

    // =========================================================================
    // 0. ACTIVE DISASSEMBLY & PARTICLE-STREAM TELEPORT ANIMATION
    // =========================================================================
    if (mk.teleportState) {
      const ts = mk.teleportState;
      ts.elapsed += safeDt;
      const rawNorm = Math.min(1.0, ts.elapsed / ts.duration);

      // Lead point along quadratic Bezier trajectory from start -> ctrl -> target
      const invL = 1.0 - rawNorm;
      const leadX = invL * invL * ts.startX + 2 * invL * rawNorm * ts.ctrlX + rawNorm * rawNorm * ts.targetX;
      const leadY = invL * invL * ts.startY + 2 * invL * rawNorm * ts.ctrlY + rawNorm * rawNorm * ts.targetY;
      const leadZ = invL * invL * ts.startZ + 2 * invL * rawNorm * ts.ctrlZ + rawNorm * rawNorm * ts.targetZ;

      mk.x = leadX;
      mk.y = leadY;
      mk.z = leadZ;
      mk.yaw = rotateAngleToward(mk.yaw, ts.targetYaw, safeDt * 9.0);
      // Keep wrapper un-rotated in world space during disassembly so all 24 flying shards follow exact world-space Bezier coordinates!
      mk.group.position.set(leadX, leadY, leadZ);
      mk.group.rotation.y = 0;
      mk.ctrl.group.rotation.y = mk.yaw;

      if (rawNorm < 1.0) {
        // Disassemble solid monk at start (0..0.16) and reassemble at destination (0.84..1.0)
        if (rawNorm < 0.16) {
          mk.ctrl.group.visible = true;
          mk.ctrl.group.scale.setScalar(Math.max(0.12, 1.0 - rawNorm / 0.16));
        } else if (rawNorm > 0.84) {
          mk.ctrl.group.visible = true;
          mk.ctrl.group.scale.setScalar(Math.min(1.0, (rawNorm - 0.84) / 0.16));
        } else {
          mk.ctrl.group.visible = false;
        }

        if (mk.teleportPartsGroup && mk.teleportShards) {
          mk.teleportPartsGroup.visible = true;
          for (let sIdx = 0; sIdx < mk.teleportShards.length; sIdx++) {
            const sh = mk.teleportShards[sIdx];
            const span = Math.max(0.38, 1.0 - sh.stagger);
            const uRaw = Math.max(0, Math.min(1, (rawNorm - sh.stagger) / span));
            const uSmooth = uRaw * uRaw * (3.0 - 2.0 * uRaw);
            const invU = 1.0 - uSmooth;

            // World position of this specific fragment along the Bezier trajectory
            const wx = invU * invU * ts.startX + 2 * invU * uSmooth * ts.ctrlX + uSmooth * uSmooth * ts.targetX;
            const wy = invU * invU * ts.startY + 2 * invU * uSmooth * ts.ctrlY + uSmooth * uSmooth * ts.targetY;
            const wz = invU * invU * ts.startZ + 2 * invU * uSmooth * ts.ctrlZ + uSmooth * uSmooth * ts.targetZ;

            const dxW = wx - leadX;
            const dyW = wy - leadY;
            const dzW = wz - leadZ;

            const burstEnv = Math.sin(uSmooth * Math.PI);
            sh.mesh.position.set(
              dxW + sh.baseOffX + sh.scatterX * burstEnv,
              dyW + sh.baseOffY + sh.scatterY * burstEnv,
              dzW + sh.baseOffZ + sh.scatterZ * burstEnv
            );
            sh.mesh.rotation.set(
              sh.spinX * burstEnv,
              sh.spinY * burstEnv,
              sh.spinZ * burstEnv
            );
          }
        }
        continue;
      } else {
        // Teleport complete: reassemble solid monk behind the player and unleash counter-attack!
        mk.teleportState = null;
        if (mk.teleportPartsGroup) {
          mk.teleportPartsGroup.visible = false;
        }
        mk.ctrl.group.visible = true;
        mk.ctrl.group.scale.setScalar(1.0);
        mk.ctrl.group.rotation.y = 0;
        mk.x = ts.targetX;
        mk.y = ts.targetY;
        mk.z = ts.targetZ;
        mk.yaw = ts.targetYaw;
        mk.group.position.set(mk.x, mk.y, mk.z);
        mk.group.rotation.y = mk.yaw;
        mk.teleportFlashTimer = 0.65;
        mk.ctrl.setState('attack2', 0.06);
      }
    }

    // Check territory leash & aggro grudge memory rules:
    // A monk ONLY stops chasing when BOTH:
    //   1) The player has moved far outside the monk's large chase range (`distToPlayer > 52.0`)
    //   2) AND the monk itself is outside its home territory (`!monkInTerritory && distToHome > 44.0`) AND the player is outside the territory (`!playerInTerritory`).
    // When it stops chasing and walks back to its post, it remembers for 45 seconds (`forgetTimer < 45.0`) that it hates the player —
    // so if the player returns to the territory or comes back within 42m during that time, it immediately resumes chasing!
    const distToPlayer = Math.hypot(playerX - mk.x, playerZ - mk.z);
    const distToHome = Math.hypot(mk.homeX - mk.x, mk.homeZ - mk.z);
    const playerInTerritory = isPlayerInsideMonkTerritory(playerX, playerZ, mk);
    const monkInTerritory = isPlayerInsideMonkTerritory(mk.x, mk.z, mk);

    if (mk.isAggro) {
      if (!mk.isLeashedReturning) {
        if (!playerInTerritory && !monkInTerritory && distToHome > 44.0 && distToPlayer > 52.0) {
          mk.isLeashedReturning = true;
        }
      } else {
        // Monk is walking back with a grudge: if player returns to territory or within 42m of the monk, immediately resume chasing!
        if (playerInTerritory || distToPlayer <= 42.0) {
          mk.isLeashedReturning = false;
          mk.forgetTimer = 0;
        }
      }

      if (mk.isLeashedReturning || (!playerInTerritory && distToPlayer > 52.0)) {
        mk.forgetTimer += safeDt;
        if (mk.forgetTimer >= 45.0) {
          mk.isAggro = false;
          mk.isLeashedReturning = false;
          mk.aggroTimer = 0;
          mk.forgetTimer = 0;
        }
      } else {
        mk.forgetTimer = Math.max(0, mk.forgetTimer - safeDt * 2.0);
      }
    } else if (allMonksProvoked && (playerInTerritory || distToPlayer <= 42.0)) {
      mk.isAggro = true;
      mk.isLeashedReturning = false;
    }

    const leashedOutOfTerritory = Boolean(mk.isLeashedReturning);

    // =========================================================================
    // A. HOSTILE / AGGRO COMBAT AI (Chases until BOTH out of range AND out of territory!)
    // =========================================================================
    if (mk.isAggro && !leashedOutOfTerritory) {
      mk.guardCrossFactor = Math.max(0, mk.guardCrossFactor - safeDt * 5.0);
      mk.ctrl.group.rotation.set(0, 0, 0);
      const toPx = playerX - mk.x;
      const toPz = playerZ - mk.z;
      const dPlayer = Math.hypot(toPx, toPz) || 0.001;
      const targetYaw = Math.atan2(toPx, toPz);
      mk.yaw = rotateAngleToward(mk.yaw, targetYaw, safeDt * 7.5);

      if (mk.deflectTimer > 0) {
        // Deflecting incoming arrow with rapid staff spin
        mk.ctrl.speed = 0;
        mk.ctrl.setState('staff_spin', 0.08);
      } else if (dPlayer > 2.25) {
        // Chase player with `run` animation
        const runSpd = 5.4;
        const stepDist = Math.min(dPlayer - 1.85, runSpd * safeDt);
        const nx = mk.x + (toPx / dPlayer) * stepDist;
        const nz = mk.z + (toPz / dPlayer) * stepDist;
        const walkInfo = walkableHeightAt(nx, nz);
        mk.x = nx;
        mk.z = nz;
        mk.y += (walkInfo.height - mk.y) * Math.min(1, safeDt * 12.0);
        mk.ctrl.speed = runSpd;
        mk.ctrl.setState('run', 0.16);
      } else {
        // In melee range: cycle through attack1, attack2, attack3, and staff_spin
        mk.ctrl.speed = 0;
        if (mk.attackCooldown <= 0) {
          const attackChoices: ReadonlyArray<'attack1' | 'attack2' | 'attack3' | 'staff_spin'> = [
            'attack1',
            'attack2',
            'attack3',
            'staff_spin',
          ];
          const nextIdx = (attackChoices.indexOf(mk.currentAttackClip) + 1) % attackChoices.length;
          mk.currentAttackClip = attackChoices[nextIdx];
          mk.attackCooldown = mk.currentAttackClip === 'staff_spin' ? 1.25 : 0.95;
          mk.ctrl.setState(mk.currentAttackClip, 0.12);

          // Apply light stamina/health pressure when striking the player in melee range
          if (playerState && dPlayer <= 2.45 && Math.abs(playerY - mk.y) <= 2.4) {
            playerState.stamina = Math.max(0, (playerState.stamina ?? 100) - 10);
            playerState.hp = Math.max(1, (playerState.hp ?? 100) - 6);
          }
        } else {
          mk.ctrl.setState(mk.currentAttackClip, 0.12);
        }
      }

      mk.group.position.set(mk.x, mk.y, mk.z);
      mk.group.rotation.y = mk.yaw;
      mk.ctrl.update(safeDt);
      continue;
    }

    // =========================================================================
    // B. PEACEFUL / LEASHED RETURN TO HOME POST (if returning from aggro)
    // =========================================================================
    if ((mk.role !== 'courtyard_patrol' || leashedOutOfTerritory) && distToHome > 0.35) {
      const toHx = mk.homeX - mk.x;
      const toHz = mk.homeZ - mk.z;
      const moveSpd = distToHome > 4.0 ? 4.4 : 1.85;
      const step = Math.min(distToHome, moveSpd * safeDt);
      mk.x += (toHx / distToHome) * step;
      mk.z += (toHz / distToHome) * step;
      const walkInfo = walkableHeightAt(mk.x, mk.z);
      const targetGroundY = distToHome < 3.5 ? mk.homeY : walkInfo.height;
      mk.y += (targetGroundY - mk.y) * Math.min(1, safeDt * 10.0);
      mk.yaw = rotateAngleToward(mk.yaw, Math.atan2(toHx, toHz), safeDt * 6.0);
      mk.ctrl.speed = moveSpd;
      mk.ctrl.setState(distToHome > 4.0 ? 'run' : 'walk', 0.2);
      mk.group.position.set(mk.x, mk.y, mk.z);
      mk.group.rotation.y = mk.yaw;
      mk.ctrl.update(safeDt);
      continue;
    }

    // =========================================================================
    // C. NORMAL PEACEFUL ROLE AI (Uses all 10 non-death animations!)
    // =========================================================================
    if (mk.role === 'entrance_guard_left' || mk.role === 'entrance_guard_right') {
      // 2 Entrance Guards at the Temple Palace Upper Gate (similar to Floating Islands guards)
      const isLeft = mk.role === 'entrance_guard_left';
      const gateCenterX = CHINESE_FORTRESS_POS.x;
      const gateCenterZ = CHINESE_FORTRESS_POS.upperGateZ;
      const distPlayerToGate = Math.hypot(playerX - gateCenterX, playerZ - gateCenterZ);
      const playerApproaching = distPlayerToGate < 5.0 && Math.abs(playerY - mk.homeY) < 4.0;

      const targetCross = playerApproaching ? 0.0 : 1.0;
      mk.guardCrossFactor += (targetCross - mk.guardCrossFactor) * Math.min(1.0, safeDt * 6.0);

      mk.x = mk.homeX;
      mk.y = mk.homeY;
      mk.z = mk.homeZ;

      if (playerApproaching) {
        // Step slightly aside, uncross staffs, and perform a respectful temple salute (`pray_kneel` / `idle`)
        const sideShift = (isLeft ? -0.42 : 0.42) * (1.0 - mk.guardCrossFactor);
        mk.x = mk.homeX + sideShift;
        mk.yaw = rotateAngleToward(mk.yaw, Math.atan2(playerX - mk.x, playerZ - mk.z), safeDt * 5.0);
        mk.ctrl.speed = 0;
        mk.ctrl.setState(distPlayerToGate < 3.4 ? 'pray_kneel' : 'idle', 0.22);
      } else {
        // Stand guard facing outward (+Z) with staffs tilted inward to form an "X" barrier across the entrance
        mk.yaw = rotateAngleToward(mk.yaw, mk.baseYaw, safeDt * 5.0);
        mk.ctrl.speed = 0;
        mk.ctrl.setState('idle', 0.22);
      }

      mk.group.position.set(mk.x, mk.y, mk.z);
      mk.group.rotation.y = mk.yaw;
      mk.ctrl.update(safeDt);

      // Tilt the right forearm/hand joint slightly when `guardCrossFactor > 0` so the two staffs cross in an "X" in front of the gate
      if (mk.guardCrossFactor > 0.01 && mk.ctrl.bones.length > 18) {
        const crossAngle = (isLeft ? -0.52 : 0.52) * mk.guardCrossFactor;
        const armBone = mk.ctrl.bones[15] ?? mk.ctrl.bones[14];
        if (armBone) {
          armBone.rotation.z += crossAngle;
        }
      }
      continue;
    }

    if (mk.role === 'dummy_trainer') {
      // 4 Courtyard Monks training on the wooden dummies using attack1, attack2, attack3, staff_spin, and idle
      mk.x = mk.homeX;
      mk.y = mk.homeY;
      mk.z = mk.homeZ;
      mk.yaw = mk.baseYaw;
      mk.ctrl.speed = 0;

      mk.scheduleTimer -= safeDt;
      const dummyStages: ReadonlyArray<{ state: WarriorMonkState; dur: number; hitsDummy: boolean }> = [
        { state: 'attack1', dur: 1.15, hitsDummy: true },
        { state: 'attack2', dur: 1.15, hitsDummy: true },
        { state: 'attack3', dur: 1.25, hitsDummy: true },
        { state: 'staff_spin', dur: 1.55, hitsDummy: true },
        { state: 'idle', dur: 1.1, hitsDummy: false },
      ];
      if (mk.scheduleTimer <= 0) {
        mk.scheduleStage = (mk.scheduleStage + 1) % dummyStages.length;
        const st = dummyStages[mk.scheduleStage];
        mk.scheduleTimer = st.dur;
        mk.ctrl.setState(st.state, 0.14);
      } else {
        const st = dummyStages[mk.scheduleStage];
        mk.ctrl.setState(st.state, 0.14);
        if (st.hitsDummy && mk.dummyIndex !== undefined && woodenDummies[mk.dummyIndex]) {
          // Trigger dummy impact shudder during the middle of each strike
          const dummy = woodenDummies[mk.dummyIndex];
          const strikeWave = Math.sin((elapsedTime * 9.5 + mk.phaseOffset) * 2.0);
          if (strikeWave > 0.55) {
            dummy.hitImpulse = Math.max(dummy.hitImpulse, 0.85);
          }
        }
      }

      mk.group.position.set(mk.x, mk.y, mk.z);
      mk.group.rotation.y = mk.yaw;
      mk.ctrl.update(safeDt);
      continue;
    }

    if (mk.role === 'courtyard_patrol') {
      // Patrol monk cycling through walk, run, staff_spin kata, sit meditation, and pray_kneel
      const waypoints = mk.patrolWaypoints;
      if (waypoints && waypoints.length >= 2) {
        mk.scheduleTimer -= safeDt;
        // Pause at waypoint for kata / prayer before walking/running to next waypoint
        if (mk.scheduleTimer > 0) {
          mk.ctrl.speed = 0;
          const pauseAnims: ReadonlyArray<WarriorMonkState> = ['staff_spin', 'pray_kneel', 'sit', 'idle'];
          const pauseState = pauseAnims[mk.waypointIndex % pauseAnims.length];
          mk.ctrl.setState(pauseState, 0.22);
          mk.group.position.set(mk.x, mk.y, mk.z);
          mk.group.rotation.y = mk.yaw;
          mk.ctrl.update(safeDt);
          continue;
        }

        const targetWp = waypoints[mk.waypointIndex % waypoints.length];
        const dx = targetWp[0] - mk.x;
        const dz = targetWp[2] - mk.z;
        const distWp = Math.hypot(dx, dz);
        const isJogLeg = mk.waypointIndex % 2 === 1;
        const moveSpd = isJogLeg ? 3.8 : 1.75;

        if (distWp <= 0.35) {
          mk.waypointIndex = (mk.waypointIndex + 1) % waypoints.length;
          mk.scheduleTimer = 2.8;
        } else {
          const step = Math.min(distWp, moveSpd * safeDt);
          mk.x += (dx / distWp) * step;
          mk.z += (dz / distWp) * step;
          mk.y = targetWp[1];
          mk.yaw = rotateAngleToward(mk.yaw, Math.atan2(dx, dz), safeDt * 6.0);
          mk.ctrl.speed = moveSpd;
          mk.ctrl.setState(isJogLeg ? 'run' : 'walk', 0.2);
        }
      }
      mk.group.position.set(mk.x, mk.y, mk.z);
      mk.group.rotation.y = mk.yaw;
      mk.ctrl.update(safeDt);
      continue;
    }

    // `shrine_devotee` & `sanctuary_master`: cycle through `pray_kneel`, `sit`, `sleep`, `staff_spin`, `attack1`, `idle`
    mk.x = mk.homeX;
    mk.y = mk.homeY;
    mk.z = mk.homeZ;
    mk.yaw = mk.baseYaw;
    mk.ctrl.speed = 0;

    mk.scheduleTimer -= safeDt;
    const devoteeStages: ReadonlyArray<{ state: WarriorMonkState; dur: number }> =
      mk.role === 'shrine_devotee'
        ? [
            { state: 'pray_kneel', dur: 4.2 },
            { state: 'sit', dur: 4.5 },
            { state: 'sleep', dur: 4.0 },
            { state: 'idle', dur: 2.4 },
          ]
        : [
            { state: 'pray_kneel', dur: 3.4 },
            { state: 'staff_spin', dur: 2.2 },
            { state: 'sit', dur: 3.8 },
            { state: 'attack1', dur: 1.4 },
            { state: 'attack2', dur: 1.4 },
            { state: 'attack3', dur: 1.5 },
            { state: 'idle', dur: 2.2 },
          ];

    if (mk.scheduleTimer <= 0) {
      mk.scheduleStage = (mk.scheduleStage + 1) % devoteeStages.length;
      mk.scheduleTimer = devoteeStages[mk.scheduleStage].dur;
    }
    mk.ctrl.setState(devoteeStages[mk.scheduleStage].state, 0.24);
    mk.group.position.set(mk.x, mk.y, mk.z);
    mk.group.rotation.y = mk.yaw;
    mk.ctrl.update(safeDt);
  }

  // 3. Step wooden training dummy shudder / recoil physics
  for (let d = 0; d < woodenDummies.length; d++) {
    const dm = woodenDummies[d];
    if (dm.hitImpulse > 0.001) {
      dm.hitPhase += safeDt * 34.0;
      const tilt = Math.sin(dm.hitPhase) * 0.11 * dm.hitImpulse;
      const twist = Math.cos(dm.hitPhase * 1.3) * 0.08 * dm.hitImpulse;
      dm.group.rotation.set(tilt, dm.baseYaw + twist, 0);
      dm.hitImpulse = Math.max(0, dm.hitImpulse - safeDt * 2.8);
    } else {
      dm.group.rotation.set(0, dm.baseYaw, 0);
    }
  }
}

// Re-export SAKURA_SANCTUARY_POS & SAKURA_SANCTUARY_YAW for convenience
export { SAKURA_SANCTUARY_POS, SAKURA_SANCTUARY_YAW };
