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
  findNearestDeadLootableDwarf,
  lootDeadDwarf,
} from '../../builders/dwarvenKingdomBuilder';
import {
  DWARVEN_MINER_STATIONS,
  evaluateMinecartTrackState,
} from '../dwarvenMineAndCaravanSystem';
import { getWaterSurfaceHeightAt, walkableHeightAt } from '../terrainAndBiomeSystem';
import { SOUTHERN_MINE_POS, CHINESE_FORTRESS_POS, FORTRESS_Z_OFFSET } from '../../domain/landmarksRegistry';
import { createInitialSmallAnimals, stepSmallAnimals } from '../boidsAndWildlifeSystem';
import { createInitialPlayerState } from '../../terrainMath';

describe('7 User Fixes + 5 Follow-up Fixes + New 13 Mine/Dwarf/Hippo/Palace Fixes Verification Suite', () => {
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

  it('4, 5 & 7) Pairwise Guard Shift Handover arrives to the side of the post, waits for on-duty guard to vacate, and steps into post', () => {
    resetMonkTempleSystem();
    const parent = new THREE.Group();
    const FZ = FORTRESS_Z_OFFSET;
    const summitY = CHINESE_FORTRESS_POS.summitHeight;
    const bedTopY = CHINESE_FORTRESS_POS.pavilionFloor1Y + 0.38;

    const routeToPost: ReadonlyArray<readonly [number, number, number]> = [
      [-32.2, bedTopY, -168.5 + FZ],
      [-30.0, CHINESE_FORTRESS_POS.pavilionFloor1Y, -159.0 + FZ],
      [-30.0, summitY + 0.3, -156.5 + FZ],
      [-30.0, summitY, -153.5 + FZ],
      [-2.0, summitY, -128.0 + FZ],
      [-1.35, summitY, CHINESE_FORTRESS_POS.upperGateZ - 1.35],
    ];

    const onDutyGuard = spawnTempleMonk({
      id: 'test-gate-guard-on-duty',
      role: 'entrance_guard_left',
      parent,
      postId: 'gate_left',
      shiftStartOnDuty: true,
      routeToPost,
      homeX: -1.35,
      homeY: summitY,
      homeZ: CHINESE_FORTRESS_POS.upperGateZ - 1.35,
      baseYaw: 0,
      bedX: -32.2,
      bedY: bedTopY,
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
      homeX: -1.35,
      homeY: summitY,
      homeZ: CHINESE_FORTRESS_POS.upperGateZ - 1.35,
      baseYaw: 0,
      bedX: -32.2,
      bedY: bedTopY,
      bedZ: -168.5 + FZ,
      bedYaw: 0,
      phaseOffset: 0,
    });
    // Verify sleeping monk lies ON TOP of the mattress (pavilionFloor1Y + 0.38)
    assert.ok(
      Math.abs(reliefGuard.y - bedTopY) < 0.02,
      `Sleeping monk must lie ON TOP of mattress (${bedTopY}), got ${reliefGuard.y}`
    );
    reliefGuard.nextShiftChangeTime = 5.0;

    const patrolMonk = spawnTempleMonk({
      id: 'test-patrol-monk',
      role: 'courtyard_patrol',
      parent,
      homeX: 0,
      homeY: summitY,
      homeZ: -145.0 + FZ,
      baseYaw: 0,
      phaseOffset: 0,
      patrolWaypoints: [
        [-6, summitY, -145 + FZ],
        [6, summitY, -145 + FZ],
      ],
    });

    // Also spawn a shrine devotee on a bench to verify forward offset when praying and monk-to-monk collision separation
    const devoteeMonk = spawnTempleMonk({
      id: 'test-shrine-devotee',
      role: 'shrine_devotee',
      parent,
      homeX: -5.2,
      homeY: CHINESE_FORTRESS_POS.mainHallFloor1Y,
      homeZ: -195.0 + FZ,
      baseYaw: Math.PI, // facing North toward altar (-Z)
      phaseOffset: 0,
    });

    // Trigger shift wake-up and advance until relief guard arrives at the post and takes over
    let sawDoorActive = false;
    let sawDevoteePraySteppedForward = false;
    for (let step = 1; step <= 420; step++) {
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

      // Verify devotee monk steps forward (in -Z direction for baseYaw=PI) out of the bench when kneeling to pray
      if (devoteeMonk.ctrl.state === 'pray_kneel' && devoteeMonk.z < devoteeMonk.homeZ - 0.65) {
        sawDevoteePraySteppedForward = true;
      }

      // Verify monks never stack on top of each other (distance >= 0.80m when on same floor)
      if (Math.abs(onDutyGuard.y - reliefGuard.y) < 1.2) {
        const pairDist = Math.hypot(onDutyGuard.x - reliefGuard.x, onDutyGuard.z - reliefGuard.z);
        assert.ok(
          pairDist >= 0.78,
          `Monks must not climb/stack on each other during shift handover, got dist=${pairDist.toFixed(3)}`
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
      Math.hypot(reliefGuard.x - reliefGuard.homeX, reliefGuard.z - reliefGuard.homeZ) < 0.15,
      'Relief guard should step into the exact post coordinates after partner vacates'
    );
    assert.ok(
      onDutyGuard.shiftState === 'returning_to_bed' || onDutyGuard.shiftState === 'sleeping_in_bed',
      'Previous guard should only leave for bed after relief guard takes the post'
    );
    assert.ok(
      sawDevoteePraySteppedForward,
      'Shrine devotee sitting on bench must step forward out of the bench before kneeling to pray'
    );
  });

  it('8) Hippo reaction, warning, and chase checks depend strictly on direct relative distance to the player regardless of map location', () => {
    const animals = createInitialSmallAnimals();
    const hippo = animals.find((a) => a.species === 'hippo')!;
    assert.ok(hippo, 'Expected hippo in initial small animals');

    // Move the hippo far away from its home coordinates (e.g. x = 140, z = 140, >200m from homeX/homeZ)
    hippo.x = 140.0;
    hippo.z = 140.0;
    hippo.y = walkableHeightAt(hippo.x, hippo.z).height;
    hippo.isDead = false;
    hippo.alertLevel = 'grazing';

    // 1) Place player 13.5m from hippo's current position (within 15m warning radius, outside 10.5m charge radius)
    stepSmallAnimals(animals, 0.1, 10.0, 140.0, 153.5, [], 1.0);
    assert.equal(
      hippo.aiBehavior,
      'roaring',
      'Hippo must enter roaring warning state based on relative distance (13.5m <= 15m) even when far from home'
    );

    // 2) Move player 8.5m from hippo's current position (within 10.5m charge radius)
    stepSmallAnimals(animals, 0.1, 10.2, 140.0, 148.5, [], 1.0);
    assert.equal(
      hippo.aiBehavior,
      'charging',
      'Hippo must charge player based on relative distance (8.5m <= 10.5m) regardless of where the hippo is on the map'
    );
    assert.ok(
      Math.hypot(hippo.vx, hippo.vz) > 3.5,
      'Charging hippo must actively run toward the player'
    );

    // 3) Move player 28m away from hippo (> 26.0m hippoChaseRange): hippo stops chasing
    stepSmallAnimals(animals, 0.1, 10.4, 140.0, 168.0, [], 1.0);
    assert.equal(
      hippo.aiBehavior,
      'wandering',
      'Hippo should stop charging and return to wandering when relative distance to player exceeds 26m'
    );
    assert.equal(hippo.alertLevel, 'grazing');
  });

  it('6 & Follow-up 1, 2, 5 + Dead Dwarf Gold Looting & Out-of-Area Respawn) Dwarven Miners have HP/Level HUD queries, lootable gold on death, and respawn when player leaves area', () => {
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
        distToRock <= st.rockRadius + 0.85,
        `Dwarf station ${st.name} must stand right against its rock vein (dist=${distToRock}, radius=${st.rockRadius})`
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

    // Verify dead dwarf can be found and looted for gold coins
    const nearDeadDwarf = findNearestDeadLootableDwarf(d0.x + 1.0, d0.z + 1.0, d0.y);
    assert.equal(nearDeadDwarf, d0, 'Dead unlooted dwarf should be detected within loot radius');

    const player = createInitialPlayerState();
    const startGold = player.goldCoins ?? 0;
    const lootRes = lootDeadDwarf(player, d0);
    assert.ok(lootRes.goldAdded >= 6 && lootRes.goldAdded <= 14, `Expected modest gold drop (6..14), got ${lootRes.goldAdded}`);
    assert.equal(player.goldCoins, startGold + lootRes.goldAdded, 'Looting dead dwarf must add gold coins to player purse');
    assert.equal(d0.isLooted, true, 'Dwarf should be marked isLooted = true after looting');
    assert.equal(findNearestDeadLootableDwarf(d0.x + 1.0, d0.z + 1.0, d0.y), null, 'Looted dwarf should no longer prompt for looting');

    // Verify dead dwarf does NOT respawn while player remains close (< 38m), then respawns after 25s when player is out of the area (> 38m)
    handle.updateDwarvenMiners(12.0, 100.0, d0.x + 5.0, d0.z + 5.0);
    assert.equal(d0.isDead, true, 'Dead dwarf must NOT respawn while player is still in the area');

    // Move player far away (e.g. x = 0, z = 0, > 38m from dwarf) for 26 seconds total
    for (let s = 0; s < 260; s++) {
      handle.updateDwarvenMiners(12.0, 100.1 + s * 0.1, 0, 0);
    }
    assert.equal(d0.isDead, false, 'Dead dwarf must respawn after ~25s when player is out of the area');
    assert.equal(d0.isLooted, false, 'Respawned dwarf must reset isLooted = false');
    assert.equal(d0.hp, d0.maxHp, 'Respawned dwarf must have full HP');
  });
});

