// ============================================================================
// MODULE: World / Builders / Visual Collider Debug Wireframe Builder
// DESIGN: Toggleable 3D wireframe overlay for AABB boxes, cylinders, doors & stairs
// SUMMARY: Renders color-coded wireframe colliders in the 3D scene to inspect
//          stair corridors, ship walls, building boxes, and obstacle cylinders.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import {
  SOLID_BUILDING_BOXES,
  getHillWatchtowerLocalWalls,
  FORTRESS_DOORS,
  HILL_WATCHTOWERS,
  CHINESE_FORTRESS_POS,
  SOUTHEAST_HARBOR_POS,
  SOUTHERN_MINE_POS,
  getObstacleColliderMetrics,
  groundHeightAt,
} from '../terrainMath';
import type { IObstacleCylinder } from '../domain/worldTypes';

// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
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
// #endregion

// ======================== PUBLIC BUILDER ======================== \\
// #region Build Collider Debug Wireframes
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
    if (b.yaw) {
      mesh.rotation.y = b.yaw;
    }
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

  // 3. HILL_WATCHTOWERS walls: the same local walls the physics blocks on (lower deck, and upper deck)
  for (const tw of HILL_WATCHTOWERS) {
    const cosY = Math.cos(tw.yaw);
    const sinY = Math.sin(tw.yaw);
    for (const onUpper of [false, true]) {
      const bottom = onUpper ? tw.deckY : tw.baseY;
      for (const wall of getHillWatchtowerLocalWalls(tw, onUpper, false)) {
        const height = Math.max(0.12, (wall.maxY ?? bottom) - bottom);
        const width = Math.max(0.08, wall.maxX - wall.minX);
        const depth = Math.max(0.08, wall.maxZ - wall.minZ);
        const geo = new THREE.BoxGeometry(width, height, depth);
        disposableGeometries.push(geo);
        const lx = (wall.minX + wall.maxX) * 0.5;
        const lz = (wall.minZ + wall.maxZ) * 0.5;
        const mesh = new THREE.Mesh(geo, stairGuardWireMat);
        // Same transform as the physics: local (lx, lz) -> world offset via the tower yaw.
        mesh.position.set(tw.x + lx * cosY + lz * sinY, bottom + height * 0.5, tw.z - lx * sinY + lz * cosY);
        mesh.rotation.y = tw.yaw;
        group.add(mesh);
      }
    }
  }

  // 4. OBSTACLE CYLINDERS (Green — 100% of world obstacles using exact getObstacleColliderMetrics)
  const unitCylGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
  disposableGeometries.push(unitCylGeo);
  const maxObs = obstacles.length;
  const obsInstanced = new THREE.InstancedMesh(unitCylGeo, cylWireMat, maxObs);
  obsInstanced.frustumCulled = false;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < maxObs; i++) {
    const o = obstacles[i];
    const gy = groundHeightAt(o.x, o.z);
    const metrics = getObstacleColliderMetrics(o);
    dummy.position.set(o.x, gy + metrics.height * 0.5, o.z);
    dummy.scale.set(metrics.radius, metrics.height, metrics.radius);
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

  // Ship Gangplank (X-aligned slope from x=270.8 y=3.25 to x=276.2 y=3.65, z in 250.1..253.9)
  {
    const gangGeo = new THREE.BoxGeometry(5.4, 0.2, 3.8);
    disposableGeometries.push(gangGeo);
    const gangMesh = new THREE.Mesh(gangGeo, walkableRampWireMat);
    gangMesh.position.set(273.5, 3.45, 252.0);
    gangMesh.rotation.z = Math.atan2(0.4, 5.0);
    group.add(gangMesh);

    const pierGeo = new THREE.BoxGeometry(17.5, 0.35, 6.2);
    disposableGeometries.push(pierGeo);
    const pierMesh = new THREE.Mesh(pierGeo, walkableRampWireMat);
    pierMesh.position.set(262.75, 3.12, 252.0);
    group.add(pierMesh);

    const jettyGeo = new THREE.BoxGeometry(20.0, 0.35, 5.6);
    disposableGeometries.push(jettyGeo);
    const jettyMesh = new THREE.Mesh(jettyGeo, walkableRampWireMat);
    jettyMesh.position.set(264.2, 3.02, 282.0);
    group.add(jettyMesh);
  }

  // Ship Quarterdeck Port & Starboard Stairs (z: 254.5..259.5, y: 3.65..6.65)
  const shipX = SOUTHEAST_HARBOR_POS.shipX;
  addSlopeRampWireframe(shipX - 5.65, shipX - 3.45, 254.5, 259.5, 3.65, 6.65);
  addSlopeRampWireframe(shipX + 3.45, shipX + 5.65, 254.5, 259.5, 3.65, 6.65);

  // Fortress Grand Approach Stairs & Main Hall Interior Stairs
  const fz = CHINESE_FORTRESS_POS.z - -170;
  const fy = CHINESE_FORTRESS_POS.summitHeight - 26.0;
  addSlopeRampWireframe(-4.2, 4.2, -122 + fz, -78 + fz, 26.0 + fy, 12.2 + fy);
  addSlopeRampWireframe(13.55, 18.5, -206 + fz, -194 + fz, 34.15 + fy, 26.35 + fy);
  addSlopeRampWireframe(-38.6, -35.15, -167.5 + fz, -159.5 + fz, 31.6 + fy, 26.3 + fy);
  addSlopeRampWireframe(35.15, 38.6, -167.5 + fz, -159.5 + fz, 31.6 + fy, 26.3 + fy);

  // Southern Mine NE Cliffside Scaffolding Stairs
  const mx = SOUTHERN_MINE_POS.x;
  const mz = SOUTHERN_MINE_POS.entranceZ;
  const mfY = SOUTHERN_MINE_POS.cavernFloorY;
  addSlopeRampWireframe(mx + 8.5, mx + 12.5, mz + 49.0, mz + 57.5, mfY + 3.8, mfY);

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
// #endregion
