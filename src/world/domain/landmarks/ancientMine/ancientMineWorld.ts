// ============================================================================
// MODULE: World / Domain / Landmarks / Ancient Mine
// DESIGN: Thin adapter from world space to the mine's local frame (ANCIENT_MINE_ORIGIN), so
//         physics, water and culling keep calling world-space functions.
// SUMMARY: World-space inside test, floor height, ceiling height and water surface for the
//          Ancient Dwarven Mine, plus the solid boxes generated from its guard rails.
//          Does not build meshes and holds no state.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import type { ISolidBuildingBox } from '../../worldTypes';
import { ANCIENT_MINE_ORIGIN, MINE_GUARD_RAILS, MINE_LEVEL_Y, MINE_POI, MINE_SOLID_FIXTURES } from './ancientMineLayout';
import { sampleAncientMineFloor } from './ancientMineFloor';
import { ALL_MINE_PROPS, MINE_PROP_KINDS, propHalfExtents } from './ancientMineProps';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants
/** Summary: How far above its rock ceiling an asker counts as "on the surface", meters. */
const ABOVE_CEILING_MARGIN = 0.5;

/** Summary: Half thickness of a guard rail collider, meters. */
const RAIL_HALF_THICKNESS = 0.2;
// #endregion

// ======================== PUBLIC WORLD QUERIES ======================== \\
// #region Inside Test
/**
 * Summary: Whether a world point belongs to the mine, as opposed to the surface above it.
 * @param x World X, meters.
 * @param z World Z, meters.
 * @param currentY World Y of the asker's feet; above the local rock ceiling means outside.
 * @returns True inside any mine surface (and below its ceiling when currentY is given).
 */
export function isInsideAncientMine(x: number, z: number, currentY?: number): boolean {
  const sample = sampleAncientMineFloor(x - ANCIENT_MINE_ORIGIN.x, z - ANCIENT_MINE_ORIGIN.z, currentY);
  if (sample === null) return false;
  return currentY === undefined || currentY <= sample.ceilingY + ABOVE_CEILING_MARGIN;
}
// #endregion

// #region Heights
/**
 * Summary: Solid floor height under a world point (lagoon bed, lava bed and abyss bottom included).
 * @param x World X, meters.
 * @param z World Z, meters.
 * @param currentY World Y of the asker's feet, to choose between stacked floors.
 * @returns Floor height in meters; the upper cavern floor when the point is solid rock.
 */
export function ancientMineWalkableHeightAt(x: number, z: number, currentY?: number): number {
  const sample = sampleAncientMineFloor(x - ANCIENT_MINE_ORIGIN.x, z - ANCIENT_MINE_ORIGIN.z, currentY);
  return sample === null ? MINE_LEVEL_Y.upperCavern : sample.height;
}

/**
 * Summary: Rock ceiling height above a world point (the highest floor's ceiling where floors stack).
 * @param x World X, meters.
 * @param z World Z, meters.
 * @returns Ceiling height in meters; the upper cavern ceiling when the point is solid rock.
 */
export function ancientMineCeilingHeightAt(x: number, z: number): number {
  const sample = sampleAncientMineFloor(x - ANCIENT_MINE_ORIGIN.x, z - ANCIENT_MINE_ORIGIN.z);
  return sample === null ? MINE_LEVEL_Y.upperCavern + 8 : sample.ceilingY;
}

/**
 * Summary: Water surface height under a world point inside the mine, or null when dry.
 * @param x World X, meters.
 * @param z World Z, meters.
 * @param currentY World Y of the asker's feet.
 * @returns The water surface in meters, or null.
 */
export function ancientMineWaterSurfaceAt(x: number, z: number, currentY?: number): number | null {
  const sample = sampleAncientMineFloor(x - ANCIENT_MINE_ORIGIN.x, z - ANCIENT_MINE_ORIGIN.z, currentY);
  return sample === null ? null : sample.waterSurfaceY;
}

/** Summary: World position the player is returned to after falling into the forge lava. */
export const ANCIENT_MINE_LAVA_RESPAWN = {
  x: ANCIENT_MINE_ORIGIN.x + MINE_POI.forgeEntrance.lx,
  y: MINE_LEVEL_Y.forgeFloor,
  z: ANCIENT_MINE_ORIGIN.z + MINE_POI.forgeEntrance.lz,
} as const;
// #endregion

// #region Colliders
/**
 * Summary: One thin solid box per guard rail, plus one box per solid fixture and solid prop, in world space.
 * Design: Each box straddles its boundary line by RAIL_HALF_THICKNESS and keeps the rail's
 *         vertical band, so a balcony rail does not block the bridge beneath it.
 */
export const ANCIENT_MINE_COLLIDER_BOXES: readonly ISolidBuildingBox[] = MINE_GUARD_RAILS.map((rail) => {
  const isAcrossX = rail.axis === 'lx';
  const lineWorld = (isAcrossX ? ANCIENT_MINE_ORIGIN.x : ANCIENT_MINE_ORIGIN.z) + rail.at;
  const spanOrigin = isAcrossX ? ANCIENT_MINE_ORIGIN.z : ANCIENT_MINE_ORIGIN.x;
  const lineMin = lineWorld - RAIL_HALF_THICKNESS;
  const lineMax = lineWorld + RAIL_HALF_THICKNESS;
  const spanMin = spanOrigin + rail.from;
  const spanMax = spanOrigin + rail.to;
  return {
    id: `ancient-mine-rail-${rail.id}`,
    minX: isAcrossX ? lineMin : spanMin,
    maxX: isAcrossX ? lineMax : spanMax,
    minZ: isAcrossX ? spanMin : lineMin,
    maxZ: isAcrossX ? spanMax : lineMax,
    minY: rail.minY,
    maxY: rail.maxY,
  };
}).concat(
  MINE_SOLID_FIXTURES.map((f) => ({
    id: `ancient-mine-fixture-${f.id}`,
    minX: ANCIENT_MINE_ORIGIN.x + f.lx - f.halfX,
    maxX: ANCIENT_MINE_ORIGIN.x + f.lx + f.halfX,
    minZ: ANCIENT_MINE_ORIGIN.z + f.lz - f.halfZ,
    maxZ: ANCIENT_MINE_ORIGIN.z + f.lz + f.halfZ,
    minY: f.baseY,
    maxY: f.baseY + f.height,
  })),
  ALL_MINE_PROPS.flatMap((p, i) => {
    const spec = MINE_PROP_KINDS[p.kind];
    if (!spec.isSolid) return [];
    const floor = sampleAncientMineFloor(p.lx, p.lz);
    if (floor === null) return [];
    const { halfX, halfZ } = propHalfExtents(p);
    return [
      {
        id: `ancient-mine-prop-${i}-${p.kind}`,
        minX: ANCIENT_MINE_ORIGIN.x + p.lx - halfX,
        maxX: ANCIENT_MINE_ORIGIN.x + p.lx + halfX,
        minZ: ANCIENT_MINE_ORIGIN.z + p.lz - halfZ,
        maxZ: ANCIENT_MINE_ORIGIN.z + p.lz + halfZ,
        minY: floor.height,
        maxY: floor.height + spec.height,
      },
    ];
  })
);
// #endregion
