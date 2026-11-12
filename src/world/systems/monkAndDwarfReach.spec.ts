import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  getActiveTempleMonks,
  provokeSingleMonk,
  resetMonkTempleSystem,
  spawnTempleMonk,
  updateMonkTempleSystem,
} from './monkTempleSystem';
import { CHINESE_FORTRESS_POS, FORTRESS_Z_OFFSET } from '../domain/landmarksRegistry';
import { createInitialPlayerState } from './playerPhysicsSystem';
import { buildDwarvenKingdomAndMiners } from '../builders/dwarvenKingdomBuilder';

const FZ = FORTRESS_Z_OFFSET;

/** Spawns one aggro monk on the fortress hall floor and places the player `dy` metres above the floor, `dx` metres away. */
function monkVersusPlayer(dx: number, dy: number, steps: number): { attacks: number; monkX: number } {
  resetMonkTempleSystem();
  const parent = new THREE.Group();
  const homeY = CHINESE_FORTRESS_POS.mainHallFloor1Y;
  const homeX = -5.2;
  const homeZ = -195.0 + FZ;
  spawnTempleMonk({
    id: 'reach-test-monk',
    role: 'shrine_devotee',
    parent,
    homeX,
    homeY,
    homeZ,
    baseYaw: Math.PI,
    phaseOffset: 0,
  });
  const monk = getActiveTempleMonks().find((m) => m.id === 'reach-test-monk');
  assert.ok(monk, 'expected the test monk to be registered');
  provokeSingleMonk(monk);

  const player = createInitialPlayerState();
  player.x = homeX + dx;
  player.z = homeZ;
  player.y = homeY + dy;
  player.hp = 100;
  player.maxHp = 100;

  let attacks = 0;
  let lastCooldown = 0;
  for (let s = 0; s < steps; s++) {
    updateMonkTempleSystem(0.1, 10 + s * 0.1, player.x, player.z);
    // A new swing sets the cooldown to about one second; count each time it jumps up.
    if (monk.attackCooldown > 0.9 && lastCooldown <= 0.9) attacks++;
    lastCooldown = monk.attackCooldown;
  }
  return { attacks, monkX: monk.x };
}

describe('monk reach and attacks (N2)', () => {
  it('should not swing at a player hovering 3 m above the floor', () => {
    const r = monkVersusPlayer(2.0, 3.0, 40);
    assert.equal(r.attacks, 0);
  });

  it('should swing at a player standing on the floor within reach', () => {
    const r = monkVersusPlayer(2.0, 0.0, 40);
    assert.ok(r.attacks > 0, 'expected at least one swing at a player on the floor');
  });
});

// ======================== DWARVES (N3) ======================== \
/** Builds the dwarf kingdom, makes the first dwarf aggro, and places the player `dy` above it, `dx` away. */
function dwarfVersusPlayer(dx: number, dy: number, steps: number): { attacks: number } {
  const scene = new THREE.Scene();
  const mineGroup = new THREE.Group();
  scene.add(mineGroup);
  const mat = new THREE.MeshBasicMaterial();
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const doorPivotHandles: { id: string; leftPivot: THREE.Group; rightPivot: THREE.Group; currentAngle: number }[] = [];
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
  const dwarf = handle.dwarvenMiners[0];
  dwarf.isAggro = true;
  dwarf.aggroTimer = 60;

  const player = createInitialPlayerState();
  player.x = dwarf.x + dx;
  player.z = dwarf.z;
  player.y = dwarf.y + dy;
  player.hp = 100;
  player.maxHp = 100;

  let attacks = 0;
  let lastCooldown = 0;
  for (let s = 0; s < steps; s++) {
    handle.updateDwarvenMiners(12, 10 + s * 0.1, player.x, player.z);
    if (dwarf.attackCooldown > 0.9 && lastCooldown <= 0.9) attacks++;
    lastCooldown = dwarf.attackCooldown;
  }
  return { attacks };
}

describe('dwarf reach and attacks (N3)', () => {
  it('should not swing at a player hovering 3 m above the dwarf', () => {
    assert.equal(dwarfVersusPlayer(2.0, 3.0, 40).attacks, 0);
  });

  it('should swing at a player on the same level within reach', () => {
    assert.ok(dwarfVersusPlayer(2.0, 0.0, 40).attacks > 0);
  });
});
