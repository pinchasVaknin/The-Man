import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createReadyWarriorMonk } from '../../models/Characters/WarriorMonk_Complete';
import { createReadyDwarfWarrior } from '../../models/Characters/DwarfWarrior_Complete';
import { createReadyHippo } from '../../models/animals/Hippo_Complete';
import {
  resetMonkTempleSystem,
  spawnTempleMonk,
  updateMonkTempleSystem,
  isMonkDoorwayActive,
} from '../monkTempleSystem';
import {
  buildDwarvenKingdomAndMiners,
  checkArrowHitDwarf,
  checkSwordHitDwarf,
  findActiveCombatDwarf,
  findTargetedLiveDwarf,
} from '../../builders/dwarvenKingdomBuilder';
import {
  DWARVEN_MINER_STATIONS,
  evaluateMinecartTrackState,
} from '../dwarvenMineAndCaravanSystem';
import { getWaterSurfaceHeightAt } from '../terrainAndBiomeSystem';
import { SOUTHERN_MINE_POS } from '../../domain/landmarksRegistry';

describe('7 User Fixes + 5 Follow-up Fixes Verification Suite', () => {
  it('1) WarriorMonk and DwarfWarrior retain natural 0xffffff texture color (not painted black)', () => {
    const monk = createReadyWarriorMonk({ tintHex: 0x1e293b, initialState: 'idle' });
    const dwarf = createReadyDwarfWarrior({ tintHex: 0x78350f, initialState: 'idle' });

    const monkMat = monk.skinnedMesh.material as THREE.MeshStandardMaterial;
    const dwarfMat = dwarf.skinnedMesh.material as THREE.MeshStandardMaterial;

    assert.equal(monkMat.color.getHex(), 0xffffff, 'Monk material color should be pure 0xffffff');
    assert.equal(dwarfMat.color.getHex(), 0xffffff, 'Dwarf material color should be pure 0xffffff');
    assert.ok(monkMat.metalness <= 0.1, 'Monk metalness must stay low so it never renders black');
    assert.ok(dwarfMat.metalness <= 0.1, 'Dwarf metalness must stay low so it never renders black');
  });

  it('2 & 4) Hippo lie and death animations transition once from standing to lying down and stay locked on the final frame', () => {
    const hippo = createReadyHippo({ initialState: 'idle' });
    hippo.update(0.1);
    const standingSpineY = hippo.rig.bones[2].position.y;

    hippo.setState('lie');
    for (let i = 0; i < 40; i++) {
      hippo.update(0.1);
    }
    const lyingSpineYAfterFirstCycle = hippo.rig.bones[2].position.y;
    assert.ok(
      lyingSpineYAfterFirstCycle < standingSpineY - 0.11,
      `Hippo spine Y should drop when lying down (${lyingSpineYAfterFirstCycle} vs ${standingSpineY})`
    );

    // Advance 80 more steps: verify it stays locked on the final frame and NEVER stands back up!
    let maxSpineYOnRepeat = -Infinity;
    for (let i = 0; i < 80; i++) {
      hippo.setState('lie');
      hippo.update(0.1);
      if (hippo.rig.bones[2].position.y > maxSpineYOnRepeat) {
        maxSpineYOnRepeat = hippo.rig.bones[2].position.y;
      }
    }
    assert.ok(
      maxSpineYOnRepeat < standingSpineY - 0.2,
      `Hippo lie must stay locked on final frame (max spine Y ${maxSpineYOnRepeat} vs standing ${standingSpineY})`
    );

    // Now test Hippo death animation lock on final frame
    const deadHippo = createReadyHippo({ initialState: 'idle' });
    deadHippo.setState('death');
    for (let i = 0; i < 40; i++) {
      deadHippo.update(0.1);
    }
    let maxDeadSpineY = -Infinity;
    for (let i = 0; i < 80; i++) {
      deadHippo.setState('death');
      deadHippo.update(0.1);
      if (deadHippo.rig.bones[2].position.y > maxDeadSpineY) {
        maxDeadSpineY = deadHippo.rig.bones[2].position.y;
      }
    }
    assert.ok(
      maxDeadSpineY < standingSpineY - 0.25,
      `Hippo death must stay locked on final frame (max spine Y ${maxDeadSpineY} vs standing ${standingSpineY})`
    );
  });

  it('3) Dwarf death animation stays locked on the final frame and never resets to standing', () => {
    const dwarf = createReadyDwarfWarrior({ initialState: 'idle' });
    dwarf.update(0.05);
    const rootBone = dwarf.bones[0];
    assert.ok(rootBone, 'Dwarf root bone J0 should exist');
    const standingRootY = rootBone.position.y;

    dwarf.setState('death');
    for (let i = 0; i < 45; i++) {
      dwarf.setState('death');
      dwarf.update(0.1);
    }
    const deadRootY = rootBone.position.y;
    assert.ok(
      deadRootY < standingRootY * 0.45,
      `Dwarf root Y should be lying on the ground (${deadRootY} vs standing ${standingRootY})`
    );

    // Continue calling setState('death') and update(0.1) for 60 more frames: must never reset to standing!
    let maxRootYAfterDeath = -Infinity;
    for (let i = 0; i < 60; i++) {
      dwarf.setState('death');
      dwarf.update(0.1);
      const y = rootBone.position.y;
      if (y > maxRootYAfterDeath) maxRootYAfterDeath = y;
    }
    assert.ok(
      maxRootYAfterDeath < standingRootY * 0.45,
      `Dwarf death animation must stay clamped on final frame (maxRootY=${maxRootYAfterDeath} vs standing=${standingRootY})`
    );
  });

  it('4, 5 & 7) Pairwise Guard Shift Handover keeps post guarded until relief arrives, opens barracks doors, and never attacks empty air', () => {
    resetMonkTempleSystem();
    const parent = new THREE.Group();
    const FZ = -170.0; // FORTRESS_Z_OFFSET

    const routeToPost: ReadonlyArray<readonly [number, number, number]> = [
      [-32.2, 20.6, -168.5 + FZ],
      [-30.0, 20.6, -159.0 + FZ],
      [-30.0, 20.3, -156.5 + FZ],
      [-30.0, 20.0, -153.5 + FZ],
      [-7.2, 20.0, -113.5 + FZ],
    ];

    const onDutyGuard = spawnTempleMonk({
      id: 'test-gate-guard-on-duty',
      role: 'entrance_guard_left',
      parent,
      postId: 'gate_left',
      shiftStartOnDuty: true,
      routeToPost,
      homeX: -7.2,
      homeY: 20.0,
      homeZ: -113.5 + FZ,
      baseYaw: 0,
      bedX: -32.2,
      bedY: 20.6,
      bedZ: -168.5 + FZ,
      bedYaw: 0,
      phaseOffset: 0,
    });

    const reliefGuard = spawnTempleMonk({
      id: 'test-gate-guard-relief',
      role: 'entrance_guard_left',
      parent,
      postId: 'gate_left',
      shiftStartOnDuty: false,
      routeToPost,
      homeX: -7.2,
      homeY: 20.0,
      homeZ: -113.5 + FZ,
      baseYaw: 0,
      bedX: -32.2,
      bedY: 20.6,
      bedZ: -168.5 + FZ,
      bedYaw: 0,
      phaseOffset: 0,
    });
    reliefGuard.nextShiftChangeTime = 5.0;

    const patrolMonk = spawnTempleMonk({
      id: 'test-patrol-monk',
      role: 'courtyard_patrol',
      parent,
      homeX: 0,
      homeY: 20.0,
      homeZ: -145.0 + FZ,
      baseYaw: 0,
      phaseOffset: 0,
      patrolWaypoints: [
        [-6, 20, -145 + FZ],
        [6, 20, -145 + FZ],
      ],
    });

    // Trigger shift wake-up and advance until relief guard arrives at the post
    let sawDoorActive = false;
    for (let step = 1; step <= 320; step++) {
      const dt = 0.1;
      const elapsedTime = 6.0 + step * dt;
      updateMonkTempleSystem(dt, elapsedTime, 0, -140 + FZ);

      if (isMonkDoorwayActive('west-pavilion-door')) {
        sawDoorActive = true;
      }

      // While reliefGuard is still walking to the post, onDutyGuard MUST remain 'on_post'!
      if (reliefGuard.shiftState === 'relieving_to_post') {
        assert.equal(
          onDutyGuard.shiftState,
          'on_post',
          'On-duty guard must NEVER leave post before relief guard arrives'
        );
      }

      // Non-dummy patrol monk must NEVER play attack animations into empty air
      assert.ok(
        !patrolMonk.ctrl.state.startsWith('attack') && patrolMonk.ctrl.state !== 'staff_spin',
        `Patrol monk must not attack empty air (got ${patrolMonk.ctrl.state})`
      );
    }

    assert.ok(sawDoorActive, 'West pavilion barracks door must open as relief guard walks through doorway');
    assert.equal(reliefGuard.shiftState, 'on_post', 'Relief guard should now be on_post');
    assert.ok(
      onDutyGuard.shiftState === 'returning_to_bed' || onDutyGuard.shiftState === 'sleeping_in_bed',
      'Previous guard should only leave for bed after relief guard takes the post'
    );
  });

  it('6 & Follow-up 1, 2, 5) Dwarven Miners have HP/Level HUD queries, mine stairs exclude surface water, and minecarts move & load', () => {
    // Follow-up 1: Surface water is excluded from the Southern Mine shaft stairs
    const stairWater = getWaterSurfaceHeightAt(
      SOUTHERN_MINE_POS.x,
      SOUTHERN_MINE_POS.entranceZ + 18.0,
      -4.2
    );
    assert.equal(stairWater, null, 'Southern Mine stairs must not have water');

    // Follow-up 5: Every Dwarven Miner station stands directly in front of its rock/ore outcrop
    for (const st of DWARVEN_MINER_STATIONS) {
      const distToRock = Math.hypot(st.rockLocalX - st.workLocalX, st.rockLocalZ - st.workLocalZ);
      assert.ok(
        distToRock <= 1.45,
        `Dwarf station ${st.name} must stand right against its rock vein (dist=${distToRock})`
      );
    }

    // Follow-up 5: Minecarts move along their rail tracks and pause at loading stations
    const c0Start = evaluateMinecartTrackState(0, 0.5);
    const c0Moving = evaluateMinecartTrackState(0, 8.0);
    assert.equal(c0Start.isLoadingAtStart, true, 'Cart 0 pauses for loading at t=0.5');
    assert.equal(c0Moving.isLoadingAtStart, false, 'Cart 0 moves along track at t=8.0');
    assert.ok(
      Math.hypot(c0Moving.localX - c0Start.localX, c0Moving.localZ - c0Start.localZ) > 2.0,
      'Minecart position changes along track'
    );

    const scene = new THREE.Scene();
    const mineGroup = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial();
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const doorPivotHandles: {
      id: string;
      leftPivot: THREE.Group;
      rightPivot: THREE.Group;
      currentAngle: number;
    }[] = [];

    const handle = buildDwarvenKingdomAndMiners({
      scene,
      mineGroup,
      mineX: -58,
      mineEntY: 2.65,
      mineEntZ: 423.5,
      cavernBackZ: 530,
      stonePatternTex: new THREE.Texture(),
      mineGoldOreMat: mat,
      mineMoltenCoalMat: mat,
      barkMat: mat,
      timberMat: mat,
      darkIronMat: mat,
      forgeBrazierBaseGeo: geo,
      forgeCoalMoundGeo: geo,
      createLanternAssembly: () => new THREE.Group(),
      disposableGeometries: [],
      disposableMaterials: [],
      distanceCulledObjects: [],
      doorPivotHandles,
    });

    assert.equal(handle.dwarvenMiners.length, 8);
    const d0 = handle.dwarvenMiners[0];
    assert.equal(d0.hp, 100);
    assert.ok(d0.level >= 6 && d0.level <= 8, 'Dwarf has valid combat level');
    assert.equal(d0.isDead, false);

    // Hit dwarf with an arrow: reduces HP, triggers aggro, and exposes active combat HUD health bar
    const hit1 = checkArrowHitDwarf(d0.x, d0.y + 0.9, d0.z, 40);
    assert.equal(hit1, d0);
    assert.equal(d0.hp, 60);
    assert.equal(d0.isAggro, true);

    const activeHudDwarf = findActiveCombatDwarf(d0.x, d0.z + 2.0);
    assert.equal(activeHudDwarf, d0, 'findActiveCombatDwarf returns the aggroed dwarf for the HUD health bar');

    const targetedHudDwarf = findTargetedLiveDwarf(d0.x, d0.y + 0.2, d0.z + 3.0, 0, 0, 15.0);
    assert.equal(targetedHudDwarf, d0, 'findTargetedLiveDwarf returns the aimed-at dwarf for the HUD target bar');

    // Hit dwarf with a heavy sword strike: reduces HP to 0 and triggers death animation
    const hit2 = checkSwordHitDwarf(d0.x, d0.y + 0.9, d0.z, 70);
    assert.equal(hit2, d0);
    assert.equal(d0.hp, 0);
    assert.equal(d0.isDead, true);
    assert.equal(d0.ctrl.state, 'death');
  });
});
