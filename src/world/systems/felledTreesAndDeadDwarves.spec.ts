import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import type { IObstacle } from '../domain/worldTypes';
import {
  getFelledTreesForSave,
  resetTreeFellingSystem,
  restoreFelledTrees,
  type ISavedFelledTree,
} from './treeFellingSystem';
import { buildDwarvenKingdomAndMiners, setPendingDeadDwarfIds } from '../builders/dwarvenKingdomBuilder';

function obstacleList(count: number): IObstacle[] {
  const list: IObstacle[] = [];
  for (let i = 0; i < count; i++) {
    list.push({ x: i * 3, z: 0, radius: 1.0, kind: 'oak', scale: 1, height: 8 } as unknown as IObstacle);
  }
  return list;
}

describe('felled trees are saved and restored (S2)', () => {
  it('should restore a fallen tree as a stump and a harvested tree as nothing', () => {
    resetTreeFellingSystem();
    const obstacles = obstacleList(3);
    const saved: ISavedFelledTree[] = [
      { obstacleIndex: 0, kind: 'oak', x: 0, y: 0, z: 0, scale: 1, originalRadius: 1.0, woodYield: 3, status: 'fallen' },
      { obstacleIndex: 1, kind: 'oak', x: 3, y: 0, z: 0, scale: 1, originalRadius: 1.0, woodYield: 4, status: 'harvested' },
    ];
    restoreFelledTrees(saved, obstacles);
    assert.ok(obstacles[0].radius <= 0.32, 'a fallen tree leaves a stump collider');
    assert.equal(obstacles[1].radius, 0, 'a harvested tree leaves no collider');
    assert.equal(obstacles[2].radius, 1.0, 'a standing tree is untouched');
    const again = getFelledTreesForSave();
    assert.equal(again.length, 2);
    resetTreeFellingSystem();
  });
});

describe('dead dwarves are saved and restored (S2)', () => {
  it('should build a dwarf saved as dead already dead, with its loot', () => {
    const scene = new THREE.Scene();
    const mineGroup = new THREE.Group();
    scene.add(mineGroup);
    const mat = new THREE.MeshBasicMaterial();
    const geo = new THREE.BoxGeometry(1, 1, 1);
    setPendingDeadDwarfIds([2]);
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
      doorPivotHandles: [],
    });
    setPendingDeadDwarfIds([]);
    const dead = handle.dwarvenMiners.filter((d) => d.isDead);
    assert.equal(dead.length, 1, 'exactly the saved dwarf is dead');
    assert.equal(dead[0].id, 2);
    assert.equal(dead[0].hp, 0);
  });
});
