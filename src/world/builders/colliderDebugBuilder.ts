// ============================================================================
// MODULE: World / Builders / Visual Collider Debug Wireframe Builder
// DESIGN: Toggleable 3D wireframe overlay for AABB boxes, cylinders, doors & stairs
// SUMMARY: Renders color-coded wireframe colliders in the 3D scene to inspect
//          stair corridors, ship walls, building boxes, and obstacle cylinders.
// ============================================================================

import * as THREE from 'three';
import {
  SOLID_BUILDING_BOXES,
  FORTRESS_DOORS,
  HILL_WATCHTOWERS,
  CHINESE_FORTRESS_POS,
  SOUTHEAST_HARBOR_POS,
  SOUTHERN_MINE_POS,
  groundHeightAt,
} from '../terrainMath';
import type { IObstacleCylinder } from '../domain/worldTypes';

export interface IColliderDebugHandles {
  readonly group: THREE.Group;
  readonly setVisible: (visible: boolean) => boolean;
  readonly toggleVisible: () => boolean;
  readonly toggle: (visible?: boolean) => boolean;
  readonly isVisible: () => boolean;
}

/**
 * Summary: Builds a toggleable 3D wireframe group visualizing all physics colliders and stair ramps.
 */
export function buildColliderDebugWireframes(
  scene: THREE.Scene,
  obstacles: readonly IObstacleCylinder[],
  disposableGeometries: THREE.BufferGeometry[],
  disposableMaterials: THREE.Material[]
): IColliderDebugHandles {
  const group = new THREE.Group();
  group.name = 'ColliderDebugWireframes';
  group.visible = false;

  const boxWireMat = new THREE.MeshBasicMaterial({
    color: 0xff3b30,
    wireframe: true,
    transparent: true,
    opacity: 0.85,
    depthTest: true,
  });
  const stairGuardWireMat = new THREE.MeshBasicMaterial({
    color: 0xff9500,
    wireframe: true,
    transparent: true,
    opacity: 0.92,
    depthTest: true,
  });
  const cylWireMat = new THREE.MeshBasicMaterial({
    color: 0x34c759,
    wireframe: true,
    transparent: true,
    opacity: 0.72,
    depthTest: true,
  });
  const doorWireMat = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    wireframe: true,
    transparent: true,
    opacity: 0.9,
    depthTest: true,
  });
  const walkableRampWireMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    wireframe: true,
    transparent: true,
    opacity: 0.88,
    depthTest: true,
  });

  disposableMaterials.push(
    boxWireMat,
    stairGuardWireMat,
    cylWireMat,
    doorWireMat,
    walkableRampWireMat
  );

  // 1. SOLID_BUILDING_BOXES (Red / Orange for stair guards & ship walls)
  for (let i = 0; i < SOLID_BUILDING_BOXES.length; i++) {
    const b = SOLID_BUILDING_BOXES[i];
    const cx = (b.minX + b.maxX) * 0.5;
    const cz = (b.minZ + b.maxZ) * 0.5;
    const baseGroundY = groundHeightAt(cx, cz);
    const minY = b.minY !== undefined ? b.minY : baseGroundY - 0.5;
    const maxY = b.maxY !== undefined ? b.maxY : baseGroundY + 8.0;
    const w = Math.max(0.08, b.maxX - b.minX);
    const h = Math.max(0.12, maxY - minY);
    const d = Math.max(0.08, b.maxZ - b.minZ);

    const geo = new THREE.BoxGeometry(w, h, d);
    disposableGeometries.push(geo);
    const isStairOrShip =
      b.id.includes('stair') || b.id.includes('galleon') || b.id.includes('harbor');
    const mesh = new THREE.Mesh(geo, isStairOrShip ? stairGuardWireMat : boxWireMat);
    mesh.position.set(cx, minY + h * 0.5, cz);
    group.add(mesh);
  }

  // 2. FORTRESS_DOORS (Cyan)
  for (let i = 0; i < FORTRESS_DOORS.length; i++) {
    const d = FORTRESS_DOORS[i];
    const cx = (d.minX + d.maxX) * 0.5;
    const cz = (d.minZ + d.maxZ) * 0.5;
    const minY = groundHeightAt(cx, cz);
    const maxY = minY + 3.6;
    const w = Math.max(0.12, d.maxX - d.minX);
    const h = Math.max(0.2, maxY - minY);
    const depth = Math.max(0.12, d.maxZ - d.minZ);
    const geo = new THREE.BoxGeometry(w, h, depth);
    disposableGeometries.push(geo);
    const mesh = new THREE.Mesh(geo, doorWireMat);
    mesh.position.set(cx, minY + h * 0.5, cz);
    group.add(mesh);
  }

  // 3. HILL_WATCHTOWERS local wall segments (Orange)
  for (let t = 0; t < HILL_WATCHTOWERS.length; t++) {
    const tw = HILL_WATCHTOWERS[t];
    const ty = groundHeightAt(tw.x, tw.z);
    const towerGroup = new THREE.Group();
    towerGroup.position.set(tw.x, ty, tw.z);
    towerGroup.rotation.y = tw.yaw;

    const wallDefs: Array<[number, number, number, number, number, number]> = [
      [-1.95, 2.3, 0, 0.3, 4.6, 4.2],
      [1.95, 2.3, 0, 0.3, 4.6, 4.2],
      [0, 2.3, -1.95, 4.2, 4.6, 0.3],
      [-1.375, 2.3, 1.95, 1.45, 4.6, 0.3],
      [1.375, 2.3, 1.95, 1.45, 4.6, 0.3],
      [0, 4.7, 0, 5.2, 0.3, 5.2],
    ];
    for (const [wx, wy, wz, ww, wh, wd] of wallDefs) {
      const geo = new THREE.BoxGeometry(ww, wh, wd);
      disposableGeometries.push(geo);
      const m = new THREE.Mesh(geo, stairGuardWireMat);
      m.position.set(wx, wy, wz);
      towerGroup.add(m);
    }
    group.add(towerGroup);
  }

  // 4. OBSTACLE CYLINDERS (Green)
  const unitCylGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
  disposableGeometries.push(unitCylGeo);
  const maxObs = Math.min(obstacles.length, 600);
  const obsInstanced = new THREE.InstancedMesh(unitCylGeo, cylWireMat, maxObs);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < maxObs; i++) {
    const o = obstacles[i];
    const gy = groundHeightAt(o.x, o.z);
    const h = o.kind === 'boulder' ? 2.4 : 5.5;
    dummy.position.set(o.x, gy + h * 0.5, o.z);
    dummy.scale.set(o.radius, h, o.radius);
    dummy.updateMatrix();
    obsInstanced.setMatrixAt(i, dummy.matrix);
  }
  obsInstanced.count = maxObs;
  obsInstanced.instanceMatrix.needsUpdate = true;
  group.add(obsInstanced);

  // 5. WALKABLE STAIR CORRIDORS & DECKS (Yellow wireframes)
  const addSlopeRampWireframe = (
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    yAtMinZ: number,
    yAtMaxZ: number
  ) => {
    const w = maxX - minX;
    const dz = maxZ - minZ;
    const dy = yAtMaxZ - yAtMinZ;
    const slopeLen = Math.hypot(dz, dy);
    const geo = new THREE.BoxGeometry(w, 0.12, slopeLen);
    disposableGeometries.push(geo);
    const mesh = new THREE.Mesh(geo, walkableRampWireMat);
    mesh.position.set((minX + maxX) * 0.5, (yAtMinZ + yAtMaxZ) * 0.5, (minZ + maxZ) * 0.5);
    mesh.rotation.x = -Math.atan2(dy, dz);
    group.add(mesh);
  };

  // Ship Gangplank (X-aligned slope from x=268.2 y=2.65 to x=276.2 y=3.65, z in 250.38..253.62)
  {
    const gangGeo = new THREE.BoxGeometry(8.1, 0.14, 3.2);
    disposableGeometries.push(gangGeo);
    const gangMesh = new THREE.Mesh(gangGeo, walkableRampWireMat);
    gangMesh.position.set(272.2, 3.15, 252.0);
    gangMesh.rotation.z = Math.atan2(1.0, 8.0);
    group.add(gangMesh);
  }

  // Ship Quarterdeck Port & Starboard Stairs (z: 254.5..259.5, y: 3.65..6.45)
  const shipX = SOUTHEAST_HARBOR_POS.shipX;
  addSlopeRampWireframe(shipX - 5.65, shipX - 3.45, 254.5, 259.5, 3.65, 6.45);
  addSlopeRampWireframe(shipX + 3.45, shipX + 5.65, 254.5, 259.5, 3.65, 6.45);

  // Fortress Grand Approach Stairs & Main Hall Interior Stairs
  const fz = CHINESE_FORTRESS_POS.z - -170;
  addSlopeRampWireframe(-9.5, 9.5, -132 + fz, -102 + fz, 26.0, 12.2);
  addSlopeRampWireframe(13.55, 18.5, -206 + fz, -194 + fz, 27.6, 35.8);
  addSlopeRampWireframe(-38.6, -35.15, -167.5 + fz, -159.5 + fz, 26.8, 32.8);
  addSlopeRampWireframe(35.15, 38.6, -167.5 + fz, -159.5 + fz, 26.8, 32.8);

  // Southern Mine Catwalk Stairs
  const mx = SOUTHERN_MINE_POS.x;
  const mz = SOUTHERN_MINE_POS.entranceZ;
  const mfY = SOUTHERN_MINE_POS.cavernFloorY;
  addSlopeRampWireframe(mx - 12.5, mx - 9.3, mz + 35.5, mz + 44.5, mfY, mfY + 4.2);

  scene.add(group);

  return {
    group,
    setVisible: (visible: boolean) => {
      group.visible = Boolean(visible);
      return group.visible;
    },
    toggleVisible: () => {
      group.visible = !group.visible;
      return group.visible;
    },
    toggle: (visible?: boolean) => {
      group.visible = visible !== undefined ? Boolean(visible) : !group.visible;
      return group.visible;
    },
    isVisible: () => group.visible,
  };
}
