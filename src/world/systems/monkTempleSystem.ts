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
} from '../domain/landmarksRegistry';
import { walkableHeightAt } from './terrainAndBiomeSystem';
import { isWithinViewDistance } from './boidsAndWildlifeSystem';
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
  id: 'palace_golden_guardian' | 'sakura_golden_buddha';
  x: number;
  baseY: number;
  z: number;
  radius: number;
  height: number;
  hitFlashTimer: number;
  group?: THREE.Group;
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
  aggroTimer: number;
  deflectTimer: number;
  teleportFlashTimer: number;
  attackCooldown: number;
  currentAttackClip: 'attack1' | 'attack2' | 'attack3' | 'staff_spin';
  guardCrossFactor: number;
  teleportRingMesh?: THREE.Mesh;
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
 * Summary: Registers a sacred temple statue that provokes all monks when struck by an arrow.
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

  if (config.disposableGeometries) {
    config.disposableGeometries.push(ctrl.skinnedMesh.geometry, ringGeo);
  }
  if (config.disposableMaterials) {
    const mat = ctrl.skinnedMesh.material;
    if (Array.isArray(mat)) {
      for (const m of mat) config.disposableMaterials.push(m);
    } else {
      config.disposableMaterials.push(mat);
    }
    config.disposableMaterials.push(ringMat);
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
    deflectTimer: 0,
    teleportFlashTimer: 0,
    attackCooldown: 0,
    currentAttackClip: 'attack1',
    guardCrossFactor: config.role === 'entrance_guard_left' || config.role === 'entrance_guard_right' ? 1.0 : 0.0,
    teleportRingMesh: ringMesh,
  };

  activeTempleMonks.push(monk);
  return monk;
}

/**
 * Summary: Provokes ALL monks across the Temple Palace and Sanctuary (triggered when shooting the Sacred Temple Statue).
 */
export function provokeAllMonks(): void {
  allMonksProvoked = true;
  allMonksAggroTimer = 45.0;
  for (let i = 0; i < activeTempleMonks.length; i++) {
    const mk = activeTempleMonks[i];
    mk.isAggro = true;
    mk.aggroTimer = 45.0;
    mk.ctrl.setWeaponVisible(true);
  }
}

/**
 * Summary: Provokes ONLY a single specific monk (triggered when attacking that monk directly).
 */
export function provokeSingleMonk(monk: IActiveTempleMonk): void {
  monk.isAggro = true;
  monk.aggroTimer = 35.0;
  monk.ctrl.setWeaponVisible(true);
}

/**
 * Summary: Checks if a flying arrow hit a Sacred Temple Statue. If so, provokes ALL monks!
 */
export function checkArrowHitTempleStatue(arrowX: number, arrowY: number, arrowZ: number): boolean {
  for (let i = 0; i < templeStatues.length; i++) {
    const st = templeStatues[i];
    const dHoriz = Math.hypot(arrowX - st.x, arrowZ - st.z);
    if (dHoriz <= st.radius && arrowY >= st.baseY - 0.5 && arrowY <= st.baseY + st.height) {
      st.hitFlashTimer = 1.2;
      provokeAllMonks();
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
    const dHoriz = Math.hypot(arrowX - mk.x, arrowZ - mk.z);
    if (dHoriz <= 1.25 && arrowY >= mk.y - 0.25 && arrowY <= mk.y + 2.25) {
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
 *          Monks are invulnerable: when struck with a sword, the monk teleports behind the player,
 *          faces the player's back, and counter-attacks! Only that monk becomes hostile.
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
    const dHoriz = Math.hypot(strikeX - mk.x, strikeZ - mk.z);
    const dPlayer = Math.hypot(playerX - mk.x, playerZ - mk.z);
    if ((dHoriz <= hitRadius || dPlayer <= 2.4) && Math.abs(strikeY - (mk.y + 1.0)) <= 2.1) {
      provokeSingleMonk(mk);
      // Teleport directly behind the player relative to the player's facing direction
      // Note: player forward direction in combatAndInventorySystem is (-Math.sin(playerYaw), -Math.cos(playerYaw)),
      // so behind the player is (+Math.sin(playerYaw), +Math.cos(playerYaw))!
      const behindDist = 2.15;
      const targetX = playerX + Math.sin(playerYaw) * behindDist;
      const targetZ = playerZ + Math.cos(playerYaw) * behindDist;
      const walkInfo = walkableHeightAt(targetX, targetZ);
      mk.x = targetX;
      mk.z = targetZ;
      mk.y = Math.max(walkInfo.height, playerY - 0.6);
      mk.yaw = Math.atan2(playerX - mk.x, playerZ - mk.z);
      mk.group.position.set(mk.x, mk.y, mk.z);
      mk.group.rotation.y = mk.yaw;

      mk.teleportFlashTimer = 0.85;
      mk.deflectTimer = 0;
      mk.attackCooldown = 1.05;
      mk.currentAttackClip = 'attack2';
      mk.ctrl.setWeaponVisible(true);
      mk.ctrl.setState('attack2', 0.06);
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
    if (!vis) continue;

    // Update golden chi ring flash
    if (mk.teleportFlashTimer > 0) {
      mk.teleportFlashTimer = Math.max(0, mk.teleportFlashTimer - safeDt);
      if (mk.teleportRingMesh) {
        mk.teleportRingMesh.visible = true;
        const prog = 1.0 - mk.teleportFlashTimer / 0.85;
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

    // Check if aggro expired or player moved very far away (> 95m)
    const distToPlayer = Math.hypot(playerX - mk.x, playerZ - mk.z);
    if (mk.isAggro && !allMonksProvoked) {
      mk.aggroTimer = Math.max(0, mk.aggroTimer - safeDt);
      if (mk.aggroTimer <= 0 || distToPlayer > 95.0) {
        mk.isAggro = false;
      }
    } else if (allMonksProvoked) {
      mk.isAggro = true;
    }

    // =========================================================================
    // A. HOSTILE / AGGRO COMBAT AI
    // =========================================================================
    if (mk.isAggro) {
      mk.guardCrossFactor = Math.max(0, mk.guardCrossFactor - safeDt * 5.0);
      mk.ctrl.group.rotation.z = 0;
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
            playerState.health = Math.max(1, (playerState.health ?? 100) - 6);
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
    // B. PEACEFUL RETURN TO HOME POST (if returning from aggro)
    // =========================================================================
    const distToHome = Math.hypot(mk.homeX - mk.x, mk.homeZ - mk.z);
    if (mk.role !== 'courtyard_patrol' && distToHome > 0.35) {
      const toHx = mk.homeX - mk.x;
      const toHz = mk.homeZ - mk.z;
      const moveSpd = distToHome > 4.0 ? 4.2 : 1.85;
      const step = Math.min(distToHome, moveSpd * safeDt);
      mk.x += (toHx / distToHome) * step;
      mk.z += (toHz / distToHome) * step;
      mk.y += (mk.homeY - mk.y) * Math.min(1, safeDt * 10.0);
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
