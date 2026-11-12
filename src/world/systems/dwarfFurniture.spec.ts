import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildDwarvenKingdomAndMiners } from '../builders/dwarvenKingdomBuilder';
import { getNearbySolidBuildingBoxes, pointInsideSolidBuildingBox } from '../domain/collisionWorld';

describe('dwarves do not clip through furniture on their route (DW1)', () => {
  it('should keep every non-fighting dwarf out of solid boxes over a full day', () => {
    const scene = new THREE.Scene();
    const mineGroup = new THREE.Group();
    scene.add(mineGroup);
    const mat = new THREE.MeshBasicMaterial();
    const geo = new THREE.BoxGeometry(1, 1, 1);
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

    let inside = 0;
    let samples = 0;
    let t = 0;
    for (let hours = 6.0; hours < 19.0; hours += 0.1) {
      // Each dwarf in turn gets the player standing right beside it, so it is visible and runs its home (seat, bed) logic.
      for (let i = 0; i < handle.dwarvenMiners.length; i++) {
        const dm = handle.dwarvenMiners[i];
        handle.updateDwarvenMiners(hours, t, dm.x + 1.5, dm.z);
        if (dm.isAggro) continue;
        samples++;
        const boxes = getNearbySolidBuildingBoxes(dm.x, dm.z, 0.5);
        const hit = boxes.some((b) => {
          if (b.minY !== undefined && dm.y + 0.5 < b.minY) return false;
          if (b.maxY !== undefined && dm.y + 0.5 > b.maxY) return false;
          return pointInsideSolidBuildingBox(dm.x, dm.z, 0.2, b);
        });
        if (hit) { inside++; const bb = boxes.find((b) => pointInsideSolidBuildingBox(dm.x, dm.z, 0.2, b)); console.log("HIT", i, hours.toFixed(2), dm.x.toFixed(2), dm.y.toFixed(2), dm.z.toFixed(2), bb?.id, bb?.minY, bb?.maxY); }
      }
      t += 0.1;
    }
    assert.ok(samples > 0, 'expected dwarf samples');
    assert.equal(inside, 0, `${inside} of ${samples} dwarf samples were inside furniture`);
  });
});
