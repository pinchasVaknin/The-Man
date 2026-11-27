// ============================================================================
// MODULE: World / Domain / Landmarks / Dragon Realm World Queries
// DESIGN: Pure analytical floor heights, portal proximity queries, and collider
//         boxes for both the Surface Dragon Mirror Shrine and Dragon Realm (SRP)
// SUMMARY: Provides walkableHeightAt floor overrides, zero-water masks, solid
//          colliders, and portal traversal triggers without Three.js dependencies.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { ISolidBuildingBox } from '../../worldTypes';
import {
  DRAGON_PORTAL_SHRINE_POS,
  DRAGON_REALM_ARRIVAL_DAIS,
  DRAGON_REALM_BOUNDS,
  DRAGON_REALM_CAUSEWAY,
  DRAGON_REALM_EAST_DAIS,
  DRAGON_REALM_NORTH_THRONE,
  DRAGON_REALM_ORIGIN,
  DRAGON_REALM_PLAZA,
  DRAGON_REALM_RETURN_GATE,
  DRAGON_REALM_WEST_DAIS,
} from './dragonRealmLayout';
// #endregion

// ======================== HELPER FUNCTIONS ======================== \\
// #region Helpers
function smoothstep01(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function linear01(edge0: number, edge1: number, x: number): number {
  return Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
}

/** Summary: Debug override mode controlled from the World Map in God Mode. */
export type DragonPortalDebugOverride = 'auto' | 'open' | 'closed';

let dragonPortalDebugOverride: DragonPortalDebugOverride = 'auto';

export function getDragonPortalDebugOverride(): DragonPortalDebugOverride {
  return dragonPortalDebugOverride;
}

export function setDragonPortalDebugOverride(mode: DragonPortalDebugOverride): void {
  dragonPortalDebugOverride = mode;
}

export function resetDragonPortalDebugOverride(): void {
  dragonPortalDebugOverride = 'auto';
}

/**
 * Summary: Returns true once the colossal Green Dragon (`species === 'dragon'`) in the Southern Ruins
 *          has been slain.
 */
export function isGreenDragonDefeated(
  animals: ReadonlyArray<{ readonly species: string; readonly isDead?: boolean }>
): boolean {
  const greenDragons = animals.filter((a) => a.species === 'dragon');
  return greenDragons.length > 0 && greenDragons.every((d) => Boolean(d.isDead));
}

/**
 * Summary: Returns true when the Northern Dragon Mirror Portal is active and visible,
 *          respecting the Map debug override or Green Dragon defeat status.
 */
export function isSurfaceDragonPortalActive(
  animals: ReadonlyArray<{ readonly species: string; readonly isDead?: boolean }>
): boolean {
  if (dragonPortalDebugOverride === 'open') return true;
  if (dragonPortalDebugOverride === 'closed') return false;
  return isGreenDragonDefeated(animals);
}

/**
 * Summary: Toggles the Northern Dragon Mirror Portal debug override ON/OFF from the Map UI.
 */
export function toggleDragonPortalDebug(
  animals: ReadonlyArray<{ readonly species: string; readonly isDead?: boolean }>
): boolean {
  const currentlyActive = isSurfaceDragonPortalActive(animals);
  dragonPortalDebugOverride = currentlyActive ? 'closed' : 'open';
  return !currentlyActive;
}

/** Summary: Computes the world-space coordinates of the surface statue's mirror portal center. */
export function getSurfaceDragonMirrorPortalWorldPos(): { x: number; y: number; z: number } {
  const yaw = DRAGON_PORTAL_SHRINE_POS.shrineYaw + DRAGON_PORTAL_SHRINE_POS.statueLocalYawOffset;
  const sinY = Math.sin(yaw);
  const cosY = Math.cos(yaw);
  const lx = DRAGON_PORTAL_SHRINE_POS.mirrorCenterLocal.x;
  const lz = DRAGON_PORTAL_SHRINE_POS.mirrorCenterLocal.z;
  return {
    x: DRAGON_PORTAL_SHRINE_POS.x + lx * cosY + lz * sinY,
    y:
      DRAGON_PORTAL_SHRINE_POS.targetH +
      DRAGON_PORTAL_SHRINE_POS.plinthHeight +
      DRAGON_PORTAL_SHRINE_POS.mirrorCenterLocal.y,
    z: DRAGON_PORTAL_SHRINE_POS.z - lx * sinY + lz * cosY,
  };
}

/** Summary: Computes the world-space center of the return mirror portal inside the Dragon Realm. */
export function getRealmReturnMirrorPortalWorldPos(): { x: number; y: number; z: number } {
  // realmReturnGateGroup sits at (lx, ly, lz) with rotation.y = Math.PI (local +Z points toward -Z in world space)
  return {
    x: DRAGON_REALM_ORIGIN.x + DRAGON_REALM_RETURN_GATE.lx - DRAGON_REALM_RETURN_GATE.mirrorCenterLx,
    y: DRAGON_REALM_ORIGIN.y + DRAGON_REALM_RETURN_GATE.ly + DRAGON_REALM_RETURN_GATE.mirrorCenterLy,
    z: DRAGON_REALM_ORIGIN.z + DRAGON_REALM_RETURN_GATE.lz - DRAGON_REALM_RETURN_GATE.mirrorCenterLz,
  };
}

function toSurfaceShrineLocal(x: number, z: number): { lx: number; lz: number } {
  const yaw = DRAGON_PORTAL_SHRINE_POS.shrineYaw + DRAGON_PORTAL_SHRINE_POS.statueLocalYawOffset;
  const dx = x - DRAGON_PORTAL_SHRINE_POS.x;
  const dz = z - DRAGON_PORTAL_SHRINE_POS.z;
  const sinY = Math.sin(yaw);
  const cosY = Math.cos(yaw);
  return {
    lx: dx * cosY - dz * sinY,
    lz: dx * sinY + dz * cosY,
  };
}

/**
 * Summary: Returns true when the player is positioned inside the Astral Wind Thermal updraft column
 *          in front of the Northern Dragon Mirror Shrine.
 */
export function isInsideNorthernShrineGliderThermal(x: number, y: number, z: number): boolean {
  const { lx, lz } = toSurfaceShrineLocal(x, z);
  const dist = Math.hypot(
    lx - DRAGON_PORTAL_SHRINE_POS.thermalLocal.lx,
    lz - DRAGON_PORTAL_SHRINE_POS.thermalLocal.lz
  );
  if (dist > DRAGON_PORTAL_SHRINE_POS.thermalLocal.radius) {
    return false;
  }
  const minY = DRAGON_PORTAL_SHRINE_POS.targetH - 1.5;
  const maxY =
    DRAGON_PORTAL_SHRINE_POS.targetH + DRAGON_PORTAL_SHRINE_POS.thermalLocal.maxHeightAboveTarget;
  return y >= minY && y <= maxY;
}
// #endregion

// ======================== CONTAINMENT & FLOOR HEIGHTS ======================== \\
// #region Containment & Floor Heights
/**
 * Summary: Returns true when the given world coordinates lie within the isolated
 *          Dragon Mirror Sanctum dimension volume.
 */
export function isInsideDragonRealm(x: number, z: number, currentY?: number): boolean {
  if (
    x < DRAGON_REALM_BOUNDS.minX ||
    x > DRAGON_REALM_BOUNDS.maxX ||
    z < DRAGON_REALM_BOUNDS.minZ ||
    z > DRAGON_REALM_BOUNDS.maxZ
  ) {
    return false;
  }
  if (currentY !== undefined) {
    return currentY >= DRAGON_REALM_BOUNDS.minY && currentY <= DRAGON_REALM_BOUNDS.maxY;
  }
  return true;
}

/**
 * Summary: Analytical walkable height inside the Dragon Mirror Sanctum dimension.
 * Returns null over empty void gaps (falling triggers safety recovery), or the top surface Y.
 */
export function dragonRealmWalkableHeightAt(x: number, z: number, currentY?: number): number | null {
  const lx = x - DRAGON_REALM_ORIGIN.x;
  const lz = z - DRAGON_REALM_ORIGIN.z;
  let bestY: number | null = null;

  const take = (y: number) => {
    if (bestY === null || y > bestY) {
      bestY = y;
    }
  };

  // 1. Arrival & Return Mirror Dais (circular basalt sanctuary pad)
  const dArrival = Math.hypot(lx - DRAGON_REALM_ARRIVAL_DAIS.lx, lz - DRAGON_REALM_ARRIVAL_DAIS.lz);
  if (dArrival <= DRAGON_REALM_ARRIVAL_DAIS.radius) {
    take(DRAGON_REALM_ORIGIN.y + DRAGON_REALM_ARRIVAL_DAIS.topLy);
  }

  // 1B. Walkable Return Mirror Ramp rising from Arrival Dais up into the Return Mirror Gate aperture
  if (
    Math.abs(lx) <= DRAGON_REALM_RETURN_GATE.bridgeHalfWidth &&
    lz >= DRAGON_REALM_RETURN_GATE.rampStartLz &&
    lz <= DRAGON_REALM_RETURN_GATE.deckEndLz
  ) {
    const t = linear01(DRAGON_REALM_RETURN_GATE.rampStartLz, DRAGON_REALM_RETURN_GATE.rampTopLz, lz);
    const rampY = DRAGON_REALM_ORIGIN.y + DRAGON_REALM_RETURN_GATE.bridgeTopLy * t;
    if (currentY === undefined || currentY >= rampY - 2.6) {
      take(rampY);
    }
  }

  // 2. Astral Causeway Bridge with smooth arch and bridge ramps (lz: 18..38)
  if (
    Math.abs(lx) <= DRAGON_REALM_CAUSEWAY.halfWidth &&
    lz >= DRAGON_REALM_CAUSEWAY.minLz &&
    lz <= DRAGON_REALM_CAUSEWAY.maxLz
  ) {
    const t = smoothstep01(DRAGON_REALM_CAUSEWAY.maxLz, DRAGON_REALM_CAUSEWAY.minLz, lz);
    const linearSlope =
      DRAGON_REALM_CAUSEWAY.baseLy + (DRAGON_REALM_CAUSEWAY.plazaLy - DRAGON_REALM_CAUSEWAY.baseLy) * t;
    const arch = Math.sin(t * Math.PI) * DRAGON_REALM_CAUSEWAY.archHeight;
    take(DRAGON_REALM_ORIGIN.y + linearSlope + arch);
  }

  // 3. Central Sanctuary Plaza (large obsidian & rune arena)
  const dPlaza = Math.hypot(lx - DRAGON_REALM_PLAZA.lx, lz - DRAGON_REALM_PLAZA.lz);
  if (dPlaza <= DRAGON_REALM_PLAZA.radius) {
    take(DRAGON_REALM_ORIGIN.y + DRAGON_REALM_PLAZA.topLy);
  }

  // 4. Western Necropolis Bone Dais (with smooth 360-degree stepped ramp collar)
  const dWest = Math.hypot(lx - DRAGON_REALM_WEST_DAIS.lx, lz - DRAGON_REALM_WEST_DAIS.lz);
  if (dWest <= DRAGON_REALM_WEST_DAIS.radius) {
    take(DRAGON_REALM_ORIGIN.y + DRAGON_REALM_WEST_DAIS.topLy);
  } else if (dWest <= DRAGON_REALM_WEST_DAIS.rampOuterRadius) {
    const t = 1 - smoothstep01(DRAGON_REALM_WEST_DAIS.radius, DRAGON_REALM_WEST_DAIS.rampOuterRadius, dWest);
    take(
      DRAGON_REALM_ORIGIN.y +
        DRAGON_REALM_PLAZA.topLy +
        (DRAGON_REALM_WEST_DAIS.topLy - DRAGON_REALM_PLAZA.topLy) * t
    );
  }

  // 5. Eastern Abyssal Crystal Basin Dais (with smooth 360-degree stepped ramp collar)
  const dEast = Math.hypot(lx - DRAGON_REALM_EAST_DAIS.lx, lz - DRAGON_REALM_EAST_DAIS.lz);
  if (dEast <= DRAGON_REALM_EAST_DAIS.radius) {
    take(DRAGON_REALM_ORIGIN.y + DRAGON_REALM_EAST_DAIS.topLy);
  } else if (dEast <= DRAGON_REALM_EAST_DAIS.rampOuterRadius) {
    const t = 1 - smoothstep01(DRAGON_REALM_EAST_DAIS.radius, DRAGON_REALM_EAST_DAIS.rampOuterRadius, dEast);
    take(
      DRAGON_REALM_ORIGIN.y +
        DRAGON_REALM_PLAZA.topLy +
        (DRAGON_REALM_EAST_DAIS.topLy - DRAGON_REALM_PLAZA.topLy) * t
    );
  }

  // 6. Northern Astral Crown Spire & Grand Ceremonial Staircase
  const dNorth = Math.hypot(lx - DRAGON_REALM_NORTH_THRONE.lx, lz - DRAGON_REALM_NORTH_THRONE.lz);
  if (dNorth <= DRAGON_REALM_NORTH_THRONE.radius) {
    take(DRAGON_REALM_ORIGIN.y + DRAGON_REALM_NORTH_THRONE.topLy);
  }
  if (
    Math.abs(lx) <= DRAGON_REALM_NORTH_THRONE.stairHalfWidth &&
    lz >= DRAGON_REALM_NORTH_THRONE.stairEndLz &&
    lz <= DRAGON_REALM_NORTH_THRONE.stairStartLz
  ) {
    const t = smoothstep01(
      DRAGON_REALM_NORTH_THRONE.stairStartLz,
      DRAGON_REALM_NORTH_THRONE.stairEndLz,
      lz
    );
    take(
      DRAGON_REALM_ORIGIN.y +
        DRAGON_REALM_PLAZA.topLy +
        (DRAGON_REALM_NORTH_THRONE.topLy - DRAGON_REALM_PLAZA.topLy) * t
    );
  }

  return bestY;
}

/**
 * Summary: Surface plinth elevation for the colossal Northern Dragon Mirror Shrine (plinth only;
 *          no stairway exists — high-altitude mirror access requires the Wind Glider thermal).
 */
export function surfaceDragonShrineHeightAt(
  x: number,
  z: number,
  _currentY?: number
): number | null {
  const { lx, lz } = toSurfaceShrineLocal(x, z);
  const d = Math.hypot(lx, lz);
  if (d > DRAGON_PORTAL_SHRINE_POS.plinthRadius) {
    return null;
  }
  if (d <= DRAGON_PORTAL_SHRINE_POS.plinthTopRadius) {
    return DRAGON_PORTAL_SHRINE_POS.targetH + DRAGON_PORTAL_SHRINE_POS.plinthHeight;
  }
  const t =
    1 -
    smoothstep01(
      DRAGON_PORTAL_SHRINE_POS.plinthTopRadius,
      DRAGON_PORTAL_SHRINE_POS.plinthRadius,
      d
    );
  return DRAGON_PORTAL_SHRINE_POS.targetH + DRAGON_PORTAL_SHRINE_POS.plinthHeight * t;
}

/**
 * Summary: Clamps a horizontal coordinate safely inside the Dragon Realm containment circle.
 */
export function clampInsideDragonRealmBounds(x: number, z: number): { x: number; z: number } {
  const dx = x - DRAGON_REALM_ORIGIN.x;
  const dz = z - DRAGON_REALM_ORIGIN.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= DRAGON_REALM_BOUNDS.maxArenaRadius || dist < 1e-6) {
    return { x, z };
  }
  const s = DRAGON_REALM_BOUNDS.maxArenaRadius / dist;
  return {
    x: DRAGON_REALM_ORIGIN.x + dx * s,
    z: DRAGON_REALM_ORIGIN.z + dz * s,
  };
}
// #endregion

// ======================== PORTAL PROXIMITY & TRIGGERS ======================== \\
// #region Portal Proximity & Triggers
/**
 * Summary: Projects world coordinates into the Surface Dragon Mirror's aperture plane.
 * localAcross: sideways offset in mirror plane, localVert: vertical offset from center,
 * localDepth: distance perpendicular to the mirror face (+ in front, 0 inside, - behind).
 */
function getSurfaceMirrorPlaneOffset(x: number, y: number, z: number) {
  const portal = getSurfaceDragonMirrorPortalWorldPos();
  const yaw =
    DRAGON_PORTAL_SHRINE_POS.shrineYaw +
    DRAGON_PORTAL_SHRINE_POS.statueLocalYawOffset +
    DRAGON_PORTAL_SHRINE_POS.mirrorYawOffset;
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  const dx = x - portal.x;
  const dz = z - portal.z;
  return {
    localAcross: dx * rx + dz * rz,
    localVert: (y + 1.05 - portal.y) / DRAGON_PORTAL_SHRINE_POS.mirrorOvalScaleY,
    localDepth: dx * fx + dz * fz,
  };
}

/**
 * Summary: True when the player stands close in front of the elevated colossal mirror portal
 *          on the upper portal bridge (for non-interactive guidance hint only).
 */
export function isPlayerNearSurfaceDragonPortal(x: number, y: number, z: number): boolean {
  const { localAcross, localVert, localDepth } = getSurfaceMirrorPlaneOffset(x, y, z);
  const inPlaneDist = Math.hypot(localAcross, localVert);
  return (
    inPlaneDist <= DRAGON_PORTAL_SHRINE_POS.mirrorRadius + 2.2 &&
    localDepth >= -1.5 &&
    localDepth <= DRAGON_PORTAL_SHRINE_POS.interactRadius
  );
}

/**
 * Summary: True ONLY when the player physically steps/flies right inside the swirling
 *          mirror circle aperture on the colossal statue (never at the statue base or outside).
 */
export function isPlayerInsideSurfacePortalThreshold(x: number, y: number, z: number): boolean {
  const { localAcross, localVert, localDepth } = getSurfaceMirrorPlaneOffset(x, y, z);
  const inPlaneDist = Math.hypot(localAcross, localVert);
  return (
    Math.abs(localDepth) <= DRAGON_PORTAL_SHRINE_POS.portalPlaneDepthTol &&
    inPlaneDist <=
      DRAGON_PORTAL_SHRINE_POS.mirrorRadius * DRAGON_PORTAL_SHRINE_POS.portalApertureTolerance
  );
}

/**
 * Summary: True when the player stands on the Return Bridge right in front of the Return Mirror Gate.
 */
export function isPlayerNearRealmReturnPortal(x: number, y: number, z: number): boolean {
  const gate = getRealmReturnMirrorPortalWorldPos();
  const inPlaneDist = Math.hypot(x - gate.x, y + 1.05 - gate.y);
  const localDepth = gate.z - z;
  return (
    inPlaneDist <= DRAGON_REALM_RETURN_GATE.mirrorRadius + 1.8 &&
    localDepth >= -1.2 &&
    localDepth <= DRAGON_REALM_RETURN_GATE.interactRadius
  );
}

/**
 * Summary: True ONLY when the player steps right inside the swirling Return Mirror vortex
 *          aperture inside the Dragon Realm.
 */
export function isPlayerInsideRealmReturnThreshold(x: number, y: number, z: number): boolean {
  const gate = getRealmReturnMirrorPortalWorldPos();
  const inPlaneDist = Math.hypot(x - gate.x, y + 1.05 - gate.y);
  const localDepth = gate.z - z;
  return (
    Math.abs(localDepth) <= DRAGON_REALM_RETURN_GATE.portalPlaneDepthTol &&
    inPlaneDist <= DRAGON_REALM_RETURN_GATE.mirrorRadius * 1.05
  );
}
// #endregion

// ======================== SOLID COLLISION BOXES ======================== \\
// #region Solid Collision Boxes
function makePillarCollider(
  id: string,
  wx: number,
  wy: number,
  wz: number,
  halfW: number,
  height: number
): ISolidBuildingBox {
  return {
    id,
    minX: wx - halfW,
    maxX: wx + halfW,
    minZ: wz - halfW,
    maxZ: wz + halfW,
    minY: wy,
    maxY: wy + height,
  };
}

function shrineLocalToWorld(lx: number, lz: number): { wx: number; wz: number } {
  const yaw = DRAGON_PORTAL_SHRINE_POS.shrineYaw;
  return {
    wx: DRAGON_PORTAL_SHRINE_POS.x + lx * Math.cos(yaw) + lz * Math.sin(yaw),
    wz: DRAGON_PORTAL_SHRINE_POS.z - lx * Math.sin(yaw) + lz * Math.cos(yaw),
  };
}

/**
 * Summary: Solid collision boxes for the Colossal Surface Shrine rune pillars & high bridge
 *          guard rails (leaving the stairway center & mirror aperture unobstructed!) plus
 *          Dragon Realm monolith pillars and return bridge rails.
 */
export const DRAGON_REALM_COLLIDER_BOXES: readonly ISolidBuildingBox[] = [
  // Colossal Surface Shrine 4 giant outer obsidian rune obelisk pillars
  ...[-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) => {
      const { wx, wz } = shrineLocalToWorld(sx * 24.5, sz * 20.5);
      return makePillarCollider(
        `dragon-shrine-pillar-${sx > 0 ? 'e' : 'w'}-${sz > 0 ? 's' : 'n'}`,
        wx,
        DRAGON_PORTAL_SHRINE_POS.targetH,
        wz,
        1.45,
        19.0
      );
    })
  ),
  // Dragon Realm Arrival & Return Gate flanking rune pillars (leaving center portal & ramp open!)
  makePillarCollider(
    'dragon-realm-return-pillar-west',
    DRAGON_REALM_ORIGIN.x - 4.2,
    DRAGON_REALM_ORIGIN.y,
    DRAGON_REALM_ORIGIN.z + DRAGON_REALM_RETURN_GATE.lz,
    0.75,
    10.5
  ),
  makePillarCollider(
    'dragon-realm-return-pillar-east',
    DRAGON_REALM_ORIGIN.x + 4.2,
    DRAGON_REALM_ORIGIN.y,
    DRAGON_REALM_ORIGIN.z + DRAGON_REALM_RETURN_GATE.lz,
    0.75,
    10.5
  ),
  // Dragon Realm Return Ramp upper bridge safety guard rails
  {
    id: 'dragon-realm-return-rail-west',
    minX: DRAGON_REALM_ORIGIN.x - DRAGON_REALM_RETURN_GATE.bridgeHalfWidth - 0.65,
    maxX: DRAGON_REALM_ORIGIN.x - DRAGON_REALM_RETURN_GATE.bridgeHalfWidth - 0.05,
    minZ: DRAGON_REALM_ORIGIN.z + DRAGON_REALM_RETURN_GATE.rampTopLz - 1.5,
    maxZ: DRAGON_REALM_ORIGIN.z + DRAGON_REALM_RETURN_GATE.deckEndLz,
    minY: DRAGON_REALM_ORIGIN.y + DRAGON_REALM_RETURN_GATE.bridgeTopLy - 1.0,
    maxY: DRAGON_REALM_ORIGIN.y + DRAGON_REALM_RETURN_GATE.bridgeTopLy + 2.4,
  },
  {
    id: 'dragon-realm-return-rail-east',
    minX: DRAGON_REALM_ORIGIN.x + DRAGON_REALM_RETURN_GATE.bridgeHalfWidth + 0.05,
    maxX: DRAGON_REALM_ORIGIN.x + DRAGON_REALM_RETURN_GATE.bridgeHalfWidth + 0.65,
    minZ: DRAGON_REALM_ORIGIN.z + DRAGON_REALM_RETURN_GATE.rampTopLz - 1.5,
    maxZ: DRAGON_REALM_ORIGIN.z + DRAGON_REALM_RETURN_GATE.deckEndLz,
    minY: DRAGON_REALM_ORIGIN.y + DRAGON_REALM_RETURN_GATE.bridgeTopLy - 1.0,
    maxY: DRAGON_REALM_ORIGIN.y + DRAGON_REALM_RETURN_GATE.bridgeTopLy + 2.4,
  },
  // Causeway bridge side guard curbstones (prevents accidental step-off while keeping wide 8.4m lane)
  {
    id: 'dragon-realm-causeway-rail-west',
    minX: DRAGON_REALM_ORIGIN.x - 4.7,
    maxX: DRAGON_REALM_ORIGIN.x - 4.15,
    minZ: DRAGON_REALM_ORIGIN.z + DRAGON_REALM_CAUSEWAY.minLz,
    maxZ: DRAGON_REALM_ORIGIN.z + DRAGON_REALM_CAUSEWAY.maxLz,
    minY: DRAGON_REALM_ORIGIN.y,
    maxY: DRAGON_REALM_ORIGIN.y + 3.2,
  },
  {
    id: 'dragon-realm-causeway-rail-east',
    minX: DRAGON_REALM_ORIGIN.x + 4.15,
    maxX: DRAGON_REALM_ORIGIN.x + 4.7,
    minZ: DRAGON_REALM_ORIGIN.z + DRAGON_REALM_CAUSEWAY.minLz,
    maxZ: DRAGON_REALM_ORIGIN.z + DRAGON_REALM_CAUSEWAY.maxLz,
    minY: DRAGON_REALM_ORIGIN.y,
    maxY: DRAGON_REALM_ORIGIN.y + 3.2,
  },
  // Ring of 8 Sanctuary Obelisk Pillars around outer plaza perimeter (radius ~29.5m)
  ...Array.from({ length: 8 }, (_, idx) => {
    const angle = (idx / 8) * Math.PI * 2 + Math.PI / 8;
    const wx = DRAGON_REALM_ORIGIN.x + Math.cos(angle) * 29.2;
    const wz = DRAGON_REALM_ORIGIN.z + DRAGON_REALM_PLAZA.lz + Math.sin(angle) * 29.2;
    return makePillarCollider(
      `dragon-realm-plaza-obelisk-${idx}`,
      wx,
      DRAGON_REALM_ORIGIN.y + DRAGON_REALM_PLAZA.topLy,
      wz,
      0.9,
      8.5
    );
  }),
  // Astral Crown Spire crystal core pedestal (back of northern throne dais)
  makePillarCollider(
    'dragon-realm-north-throne-core',
    DRAGON_REALM_ORIGIN.x,
    DRAGON_REALM_ORIGIN.y + DRAGON_REALM_NORTH_THRONE.topLy,
    DRAGON_REALM_ORIGIN.z + DRAGON_REALM_NORTH_THRONE.lz - 5.2,
    1.6,
    9.0
  ),
];
// #endregion
