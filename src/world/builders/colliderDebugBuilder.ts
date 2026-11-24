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
  ROPE_BRIDGE_DEF,
  ropeBridgePointInfoAt,
  CHINESE_FORTRESS_POS,
  SOUTHEAST_HARBOR_POS,
  SOUTHERN_MINE_POS,
  getObstacleColliderMetrics,
  groundHeightAt,
} from '../terrainMath';
import {
  SHIP_GLB_DECK_METRICS,
  getActiveSailableShip,
  getSailableShipLocalCollisionBoxes,
} from '../systems/sailableShipSystem';
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
  readonly syncDynamicColliders?: () => void;
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

  const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  disposableGeometries.push(unitBoxGeo);

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

    const isStairOrShip =
      b.id.includes('stair') || b.id.includes('galleon') || b.id.includes('harbor');
    const mesh = new THREE.Mesh(unitBoxGeo, isStairOrShip ? stairGuardWireMat : boxWireMat);
    mesh.position.set(cx, minY + h * 0.5, cz);
    mesh.scale.set(w, h, d);
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
    const mesh = new THREE.Mesh(unitBoxGeo, doorWireMat);
    mesh.position.set(cx, minY + h * 0.5, cz);
    mesh.scale.set(w, h, depth);
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
        const lx = (wall.minX + wall.maxX) * 0.5;
        const lz = (wall.minZ + wall.maxZ) * 0.5;
        const mesh = new THREE.Mesh(unitBoxGeo, stairGuardWireMat);
        // Same transform as the physics: local (lx, lz) -> world offset via the tower yaw.
        mesh.position.set(tw.x + lx * cosY + lz * sinY, bottom + height * 0.5, tw.z - lx * sinY + lz * cosY);
        mesh.scale.set(width, height, depth);
        mesh.rotation.y = tw.yaw;
        group.add(mesh);
      }
    }
  }

  // 3b. ROPE_BRIDGE_DEF side guardrail colliders (Orange wireframes matching player physics)
  {
    const rbVx = ROPE_BRIDGE_DEF.bx - ROPE_BRIDGE_DEF.ax;
    const rbVz = ROPE_BRIDGE_DEF.bz - ROPE_BRIDGE_DEF.az;
    const rbLen = Math.hypot(rbVx, rbVz);
    const rbYaw = Math.atan2(rbVx, rbVz);
    const rightX = Math.cos(rbYaw);
    const rightZ = -Math.sin(rbYaw);
    const tMin = ROPE_BRIDGE_DEF.deckEdgeT;
    const tMax = 1.0 - tMin;
    const segCount = 24;
    const segLen = ((tMax - tMin) * rbLen) / segCount;
    for (let s = 0; s < segCount; s++) {
      const tMid = tMin + ((s + 0.5) / segCount) * (tMax - tMin);
      const cx = ROPE_BRIDGE_DEF.ax + tMid * rbVx;
      const cz = ROPE_BRIDGE_DEF.az + tMid * rbVz;
      const info = ropeBridgePointInfoAt(cx, cz);
      const cy = info ? info.height : ROPE_BRIDGE_DEF.my;
      for (const sideSign of [-1, 1]) {
        const mesh = new THREE.Mesh(unitBoxGeo, stairGuardWireMat);
        mesh.position.set(cx + sideSign * 1.24 * rightX, cy + 0.58, cz + sideSign * 1.24 * rightZ);
        mesh.scale.set(0.12, 1.16, segLen);
        mesh.rotation.y = rbYaw;
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

    const jettyGeo = new THREE.BoxGeometry(21.2, 0.35, 5.8);
    disposableGeometries.push(jettyGeo);
    const jettyMesh = new THREE.Mesh(jettyGeo, walkableRampWireMat);
    jettyMesh.position.set(264.8, 3.02, 282.0);
    group.add(jettyMesh);

    const jettyApronGeo = new THREE.BoxGeometry(4.4, 0.25, 2.2);
    disposableGeometries.push(jettyApronGeo);
    const jettyApronMesh = new THREE.Mesh(jettyApronGeo, walkableRampWireMat);
    jettyApronMesh.position.set(273.8, 2.83, 285.25);
    group.add(jettyApronMesh);
  }

  // 5b. Live Sailable Ship (ship.glb) rotated colliders & 1F / Forecastle / Stairs / 2F walkable deck wireframes
  const sailableShipDebugGroup = new THREE.Group();
  sailableShipDebugGroup.name = 'SailableShipDebugWireframes';
  const defaultBoxes = getSailableShipLocalCollisionBoxes({
    ...getActiveSailableShip(),
    scale: 1.0,
    deckY: 0,
  });
  for (let i = 0; i < defaultBoxes.length; i++) {
    const b = defaultBoxes[i];
    const w = Math.max(0.08, b.maxX - b.minX);
    const h = Math.max(0.12, b.maxY - b.minY);
    const d = Math.max(0.08, b.maxZ - b.minZ);
    const m = new THREE.Mesh(unitBoxGeo, stairGuardWireMat);
    m.position.set((b.minX + b.maxX) * 0.5, b.minY + h * 0.5, (b.minZ + b.maxZ) * 0.5);
    m.scale.set(w, h, d);
    sailableShipDebugGroup.add(m);
  }
  const addShipWalkPlane = (minX: number, maxX: number, minZ: number, maxZ: number, yMinZ: number, yMaxZ: number) => {
    const dz = maxZ - minZ;
    const dy = yMaxZ - yMinZ;
    const slopeLen = Math.hypot(dz, dy);
    const geo = new THREE.BoxGeometry(maxX - minX, 0.1, slopeLen);
    disposableGeometries.push(geo);
    const mesh = new THREE.Mesh(geo, walkableRampWireMat);
    mesh.position.set((minX + maxX) * 0.5, (yMinZ + yMaxZ) * 0.5, (minZ + maxZ) * 0.5);
    mesh.rotation.x = -Math.atan2(dy, dz);
    sailableShipDebugGroup.add(mesh);
  };
  // Forecastle, 1F Main Deck, Port/Stbd Stairs, and 2F Quarterdeck
  addShipWalkPlane(-2.2, 2.2, SHIP_GLB_DECK_METRICS.forecastleMinBz, SHIP_GLB_DECK_METRICS.forecastleMaxBz, SHIP_GLB_DECK_METRICS.forecastleOffsetY, SHIP_GLB_DECK_METRICS.forecastleOffsetY);
  addShipWalkPlane(-2.95, 2.95, SHIP_GLB_DECK_METRICS.forecastleMaxBz, SHIP_GLB_DECK_METRICS.stairStartBz, 0, 0);
  addShipWalkPlane(-2.85, -SHIP_GLB_DECK_METRICS.stairInnerHalfX, SHIP_GLB_DECK_METRICS.stairStartBz, SHIP_GLB_DECK_METRICS.stairEndBz, 0, SHIP_GLB_DECK_METRICS.quarterdeckOffsetY);
  addShipWalkPlane(SHIP_GLB_DECK_METRICS.stairInnerHalfX, 2.85, SHIP_GLB_DECK_METRICS.stairStartBz, SHIP_GLB_DECK_METRICS.stairEndBz, 0, SHIP_GLB_DECK_METRICS.quarterdeckOffsetY);
  addShipWalkPlane(-2.6, 2.6, SHIP_GLB_DECK_METRICS.quarterdeckStartBz, SHIP_GLB_DECK_METRICS.quarterdeckEndBz, SHIP_GLB_DECK_METRICS.quarterdeckOffsetY, SHIP_GLB_DECK_METRICS.quarterdeckOffsetY);
  group.add(sailableShipDebugGroup);

  const syncDynamicColliders = () => {
    const activeShip = getActiveSailableShip();
    sailableShipDebugGroup.visible = activeShip.spawned;
    if (activeShip.spawned) {
      sailableShipDebugGroup.position.set(activeShip.x, activeShip.deckY, activeShip.z);
      sailableShipDebugGroup.rotation.y = activeShip.yaw;
      sailableShipDebugGroup.scale.set(activeShip.scale || 1.0, 1.0, activeShip.scale || 1.0);
    }
  };
  syncDynamicColliders();

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

  // Southern Mine Walkable Entrance Steps, Grand Entry Stairs, Scaffolding Stairs, Grand Descent, and Great Bridge
  const mx = SOUTHERN_MINE_POS.x;
  const mz = SOUTHERN_MINE_POS.entranceZ;
  const mfY = SOUTHERN_MINE_POS.cavernFloorY;
  const moriaY = SOUTHERN_MINE_POS.moriaHallFloorY;
  // Entrance threshold steps (lz: 4..8, y: 2.65 -> 1.45) & Grand Entry Stairs (lz: 20..44, y: 1.45 -> -9.35)
  addSlopeRampWireframe(mx - 4.0, mx + 4.0, mz + 4.0, mz + 8.0, SOUTHERN_MINE_POS.entranceY, 1.45);
  addSlopeRampWireframe(mx - 4.0, mx + 4.0, mz + 20.0, mz + 44.0, 1.45, mfY);
  // 2nd-Floor Toolsmith Mezzanine Stairs (`hub-scaffolding-stairs`, lx: -22..-16, lz: 38..50)
  addSlopeRampWireframe(mx - 22.0, mx - 16.0, mz + 38.0, mz + 50.0, -4.85, mfY);
  // Grand Descent Flights A, B, C (lx: -7..7, lz: 122..192)
  addSlopeRampWireframe(mx - 7.0, mx + 7.0, mz + 122.0, mz + 140.0, mfY, -18.35);
  addSlopeRampWireframe(mx - 7.0, mx + 7.0, mz + 146.0, mz + 166.0, -18.35, -27.35);
  addSlopeRampWireframe(mx - 7.0, mx + 7.0, mz + 172.0, mz + 192.0, -27.35, moriaY);
  // Great Bridge across the Deep Chasm (lx: -3.5..3.5, lz: 204..294)
  addSlopeRampWireframe(mx - 3.5, mx + 3.5, mz + 204.0, mz + 294.0, moriaY, moriaY);

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
    syncDynamicColliders,
  };
}
// #endregion
