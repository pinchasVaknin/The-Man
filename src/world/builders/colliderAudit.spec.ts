import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { auditColliderCoverage } from './colliderAudit';
import type { ISolidBuildingBox } from '../domain/worldTypes';

function makeMesh(name: string, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
  mesh.name = name;
  mesh.position.set(x, y, z);
  return mesh;
}

describe('colliderAudit - coverage report', () => {
  it('should flag a collider with no mesh behind it and a tall mesh with no collider', () => {
    const scene = new THREE.Group();
    scene.add(makeMesh('wallA', 0, 1, 0));
    scene.add(makeMesh('stray', 50, 1, 0));

    const boxes: ISolidBuildingBox[] = [
      { id: 'a', minX: -1, maxX: 1, minZ: -1, maxZ: 1, minY: 0, maxY: 2 },
      { id: 'b', minX: 20, maxX: 22, minZ: 20, maxZ: 22, minY: 0, maxY: 2 },
    ];

    const report = auditColliderCoverage(scene, boxes);
    assert.deepEqual(report.unmatchedBoxes, ['b']);
    assert.deepEqual(report.unmatchedMeshes.map((m) => m.name), ['stray']);
    assert.equal(report.checkedMeshes, 2);
  });

  it('should report nothing when every mesh and collider pair up', () => {
    const scene = new THREE.Group();
    scene.add(makeMesh('wallA', 0, 1, 0));
    const boxes: ISolidBuildingBox[] = [{ id: 'a', minX: -1, maxX: 1, minZ: -1, maxZ: 1, minY: 0, maxY: 2 }];

    const report = auditColliderCoverage(scene, boxes);
    assert.deepEqual(report.unmatchedBoxes, []);
    assert.deepEqual(report.unmatchedMeshes, []);
  });

  it('should audit long walls up to 150 m, such as the 78 m mine chamber walls', () => {
    const scene = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 15, 100));
    wall.position.set(0, 5, 0);
    scene.add(wall);

    const report = auditColliderCoverage(scene, []);
    assert.equal(report.checkedMeshes, 1);
    assert.equal(report.unmatchedMeshes.length, 1);
  });

  it('should ignore terrain-sized meshes', () => {
    const scene = new THREE.Group();
    const terrain = new THREE.Mesh(new THREE.BoxGeometry(400, 2, 400));
    terrain.position.set(0, 1, 0);
    scene.add(terrain);

    const report = auditColliderCoverage(scene, []);
    assert.equal(report.checkedMeshes, 0);
  });
});
