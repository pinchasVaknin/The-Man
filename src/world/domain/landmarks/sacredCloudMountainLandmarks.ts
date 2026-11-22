// ============================================================================
// MODULE: World / Domain / Landmarks / Sacred Cloud Mountain
// DESIGN: Pure geometric & analytical contract for the natural sandy stepped Chinese mountain,
//         round sacred lotus pond, wooden perimeter railings, and relocated Chinese Bagua terrace.
// SUMMARY: Single unified analytical heightfield `sacredMountainTerrainHeightAt` where the mountain
//          rises naturally out of the ground (30.8m -> 104.0m), cuts flat terraced benches along the
//          2-turn spiral path & stairs, then rises naturally again up to a grassy/sandy summit
//          with a round lotus pond, large pink tree, synced gates, and perimeter guard fences.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { ISolidBuildingBox } from '../worldTypes';
import type { DemonDragonState } from '../../models/animals/DemonDragon_Complete';
import { distToSegment } from '../noiseAndMath';
// #endregion

// ======================== CONSTANTS & LANDMARK POSITIONS ======================== \\
// #region Constants & Landmark Positions
/**
 * Summary: Spatial constants for the Sacred Cloud Mountain north of the Chinese Fortress.
 * Design: Natural base starts at `footY = 30.8m` (zero sunken ground), rises smoothly to `104.0m`
 *         above the clouds, and integrates a round lotus pond (`poolRadius = 5.8m`) at the peak.
 */
export const SACRED_CLOUD_MOUNTAIN_POS = {
  x: 104.0,
  z: -760.0,
  footY: 30.8,
  footHullRadius: 72.0,
  footGatewayX: 104.0,
  footGatewayZ: -688.0,
  cloudBaseY: 66.0,
  cloudTopY: 85.0,
  summitY: 104.0,
  summitRadius: 20.5,
  spiralStartRadius: 72.0,
  spiralEndRadius: 20.5,
  spiralTurns: 2.0,
  pathHalfWidth: 2.45,
  paifangX: 100.16,
  paifangZ: -739.86,
  summitTreeX: 112.5,
  summitTreeZ: -764.5,
  poolCx: 97.5,
  poolCz: -760.0,
  poolRadius: 5.8,
  poolWaterY: 104.0,
  poolFloorY: 103.42,
  incenseCenserX: 104.0,
  incenseCenserZ: -746.0,
  dragonPerchX: 97.5,
  dragonPerchZ: -774.5,
  dragonPerchYaw: -0.28,
  noSnowRadius: 126.0,
  zoneRadius: 94.0,
} as const;

/**
 * Summary: Relocated Octagonal Yin-Yang Bagua Platform positioned directly east of the
 *          Northern Geothermal Hot Spring (-320, -290) so monks spar face-to-face beside it.
 */
export const CHINESE_BAGUA_PLATFORM_POS = {
  x: -294.0,
  z: -290.0,
  baseY: 18.5,
  deckY: 19.7,
  radius: 6.4,
} as const;

function smoothstep01(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Summary: Exact inverse radius of the natural sand/earth mountain cone at elevation `y`.
 *          Ensures `coneH(sacredMountainHullRadiusAtY(y)) === y` everywhere on the spiral!
 */
export function sacredMountainHullRadiusAtY(y: number): number {
  const span = SACRED_CLOUD_MOUNTAIN_POS.summitY - SACRED_CLOUD_MOUNTAIN_POS.footY;
  const ty = Math.max(0, Math.min(1, (y - SACRED_CLOUD_MOUNTAIN_POS.footY) / span));
  // Smooth natural concave-up mountain slope: r = summitR + (footR - summitR) * (1 - ty^0.92)
  const invU = 1.0 - Math.pow(ty, 1.0 / 0.92);
  return (
    SACRED_CLOUD_MOUNTAIN_POS.summitRadius +
    (SACRED_CLOUD_MOUNTAIN_POS.footHullRadius - SACRED_CLOUD_MOUNTAIN_POS.summitRadius) * invU
  );
}

/**
 * Summary: Evaluates the un-carved natural mountain cone height at radial distance `r` from (104, -618).
 */
export function sacredMountainBaseConeHeightAtR(r: number): number {
  if (r <= SACRED_CLOUD_MOUNTAIN_POS.summitRadius) {
    return SACRED_CLOUD_MOUNTAIN_POS.summitY;
  }
  if (r >= SACRED_CLOUD_MOUNTAIN_POS.footHullRadius) {
    return SACRED_CLOUD_MOUNTAIN_POS.footY;
  }
  const u =
    (SACRED_CLOUD_MOUNTAIN_POS.footHullRadius - r) /
    (SACRED_CLOUD_MOUNTAIN_POS.footHullRadius - SACRED_CLOUD_MOUNTAIN_POS.summitRadius);
  return (
    SACRED_CLOUD_MOUNTAIN_POS.footY +
    (SACRED_CLOUD_MOUNTAIN_POS.summitY - SACRED_CLOUD_MOUNTAIN_POS.footY) * Math.pow(u, 0.92)
  );
}

export interface IApproachWaypoint {
  readonly x: number;
  readonly z: number;
  readonly elevY: number;
}

/**
 * Summary: Accessible snowy-bright mountain approach trail leading from east of the Chinese Fortress
 *          Stair Foot northward over highlands into the synced Foot Gateway at (104, -688).
 */
export const SACRED_MOUNTAIN_APPROACH_WAYPOINTS: readonly IApproachWaypoint[] = [
  { x: 14.0, z: -248.0, elevY: 25.0 },
  { x: 42.0, z: -256.0, elevY: 26.2 },
  { x: 68.0, z: -278.0, elevY: 27.6 },
  { x: 86.0, z: -320.0, elevY: 29.4 },
  { x: 90.0, z: -372.0, elevY: 30.5 },
  { x: 82.0, z: -428.0, elevY: 30.8 },
  { x: 82.0, z: -486.0, elevY: 30.8 },
  { x: 84.0, z: -552.0, elevY: 30.8 },
  { x: 90.0, z: -616.0, elevY: 30.8 },
  { x: 97.0, z: -664.0, elevY: 30.8 },
  {
    x: SACRED_CLOUD_MOUNTAIN_POS.footGatewayX,
    z: SACRED_CLOUD_MOUNTAIN_POS.footGatewayZ,
    elevY: SACRED_CLOUD_MOUNTAIN_POS.footY,
  },
] as const;

export interface ISacredMountainCairnMarker {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly sideSign: 1 | -1;
  readonly flagYaw: number;
  readonly seed: number;
}

function buildApproachCairns(): readonly ISacredMountainCairnMarker[] {
  const markers: ISacredMountainCairnMarker[] = [];
  let accumDist = 0;
  let nextMarkAt = 16.0;
  const interval = 25.0;
  let idx = 0;

  for (let i = 0; i < SACRED_MOUNTAIN_APPROACH_WAYPOINTS.length - 1; i++) {
    const a = SACRED_MOUNTAIN_APPROACH_WAYPOINTS[i];
    const b = SACRED_MOUNTAIN_APPROACH_WAYPOINTS[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.z - a.z);
    if (segLen < 0.001) continue;
    const tx = (b.x - a.x) / segLen;
    const tz = (b.z - a.z) / segLen;
    const nx = -tz;
    const nz = tx;

    while (accumDist + segLen >= nextMarkAt) {
      const localD = nextMarkAt - accumDist;
      const frac = localD / segLen;
      const cx = a.x + tx * localD;
      const cz = a.z + tz * localD;
      const sideSign: 1 | -1 = idx % 2 === 0 ? 1 : -1;
      const vergeOffset = 3.15;
      markers.push({
        id: `sacred-mtn-cairn-${idx + 1}`,
        x: Number((cx + nx * vergeOffset * sideSign).toFixed(2)),
        z: Number((cz + nz * vergeOffset * sideSign).toFixed(2)),
        sideSign,
        flagYaw: Math.atan2(tx, tz) + (sideSign > 0 ? 0.35 : -0.35),
        seed: Number(((idx * 0.37 + frac * 0.63) % 1.0).toFixed(3)),
      });
      idx++;
      nextMarkAt += interval;
    }
    accumDist += segLen;
  }
  return markers;
}

/**
 * Summary: Small stacked-stone cairns topped with crimson triangular Fortress-colored pennant flags
 *          marking the approach route from the Fortress area to the Sacred Cloud Mountain foot.
 */
export const SACRED_MOUNTAIN_CAIRN_MARKERS: readonly ISacredMountainCairnMarker[] = buildApproachCairns();

export type TSacredSpiralSegmentKind = 'trail' | 'stair';

export interface ISacredSpiralSegment {
  readonly index: number;
  readonly kind: TSacredSpiralSegmentKind;
  readonly sStart: number;
  readonly sEnd: number;
  readonly yStart: number;
  readonly yEnd: number;
  readonly stepCount: number;
}

/**
 * Summary: 13 continuous alternating perimeter ascent segments (trail <-> stair) ending with a spacious
 *          level arrival trail terrace (`seg 12`, s = 0.96..1.0) at 104.0m through the Crimson Paifang Gate!
 */
export const SACRED_MOUNTAIN_SPIRAL_SEGMENTS: readonly ISacredSpiralSegment[] = [
  { index: 0, kind: 'trail', sStart: 0.0, sEnd: 0.06, yStart: 30.8, yEnd: 32.6, stepCount: 0 },
  { index: 1, kind: 'stair', sStart: 0.06, sEnd: 0.14, yStart: 32.6, yEnd: 42.2, stepCount: 34 },
  { index: 2, kind: 'trail', sStart: 0.14, sEnd: 0.22, yStart: 42.2, yEnd: 44.8, stepCount: 0 },
  { index: 3, kind: 'stair', sStart: 0.22, sEnd: 0.31, yStart: 44.8, yEnd: 55.0, stepCount: 36 },
  { index: 4, kind: 'trail', sStart: 0.31, sEnd: 0.4, yStart: 55.0, yEnd: 57.8, stepCount: 0 },
  { index: 5, kind: 'stair', sStart: 0.4, sEnd: 0.49, yStart: 57.8, yEnd: 67.6, stepCount: 34 },
  { index: 6, kind: 'trail', sStart: 0.49, sEnd: 0.58, yStart: 67.6, yEnd: 70.4, stepCount: 0 },
  { index: 7, kind: 'stair', sStart: 0.58, sEnd: 0.68, yStart: 70.4, yEnd: 81.2, stepCount: 38 },
  { index: 8, kind: 'trail', sStart: 0.68, sEnd: 0.76, yStart: 81.2, yEnd: 84.0, stepCount: 0 },
  { index: 9, kind: 'stair', sStart: 0.76, sEnd: 0.85, yStart: 84.0, yEnd: 93.4, stepCount: 34 },
  { index: 10, kind: 'trail', sStart: 0.85, sEnd: 0.90, yStart: 93.4, yEnd: 95.8, stepCount: 0 },
  { index: 11, kind: 'stair', sStart: 0.90, sEnd: 0.96, yStart: 95.8, yEnd: 104.0, stepCount: 28 },
  { index: 12, kind: 'trail', sStart: 0.96, sEnd: 1.0, yStart: 104.0, yEnd: 104.0, stepCount: 0 },
] as const;

export interface ILotusSteppingStoneDef {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly radius: number;
  readonly topY: number;
}

/**
 * Summary: Clean aligned arc of circular lotus stepping stones walking straight in from the East sandy shore
 *          (`x = 102.6, z = -760.0`) across the round sacred pool onto the Central Lotus Dais (`x = 97.0, z = -760.0`).
 */
export const SACRED_LOTUS_STEPPING_STONES: readonly ILotusSteppingStoneDef[] = [
  { id: 'lotus-step-1', x: 102.6, z: -760.0, radius: 0.85, topY: 104.07 },
  { id: 'lotus-step-2', x: 100.95, z: -760.0, radius: 0.85, topY: 104.08 },
  { id: 'lotus-step-3', x: 99.3, z: -760.0, radius: 0.85, topY: 104.09 },
  { id: 'lotus-dais-center', x: 97.0, z: -760.0, radius: 1.95, topY: 104.14 },
] as const;
// #endregion

// ======================== PURE GEOMETRY & TERRAIN QUERIES ======================== \\
// #region Pure Geometry & Terrain Queries
/**
 * Summary: Returns true when `(x, z)` is within the explicit Zero-Snow zone covering the Sacred Cloud Mountain
 *          itself so the mountain crown & flanks remain warm sand and green meadow while the approach trail stays snowy-bright.
 */
export function isInsideSacredCloudMountainNoSnowZone(x: number, z: number): boolean {
  const dx = x - SACRED_CLOUD_MOUNTAIN_POS.x;
  const dz = z - SACRED_CLOUD_MOUNTAIN_POS.z;
  return dx * dx + dz * dz <= SACRED_CLOUD_MOUNTAIN_POS.noSnowRadius * SACRED_CLOUD_MOUNTAIN_POS.noSnowRadius;
}

/**
 * Summary: Returns true when `(x, z)` lies within the widened mountain footprint & foothill skirt.
 */
export function isInsideSacredCloudMountainZone(x: number, z: number): boolean {
  const dx = x - SACRED_CLOUD_MOUNTAIN_POS.x;
  const dz = z - SACRED_CLOUD_MOUNTAIN_POS.z;
  return dx * dx + dz * dz <= SACRED_CLOUD_MOUNTAIN_POS.zoneRadius * SACRED_CLOUD_MOUNTAIN_POS.zoneRadius;
}

/**
 * Summary: Computes minimum distance from `(x, z)` to the Fortress-to-Mountain Approach Trail and natural target elevation.
 */
export function sacredMountainApproachDistanceAt(
  x: number,
  z: number
): { dist: number; targetElevY: number } {
  if (x < 6.0 || x > 125.0 || z > -240.0 || z < -706.0) {
    return { dist: 999.0, targetElevY: SACRED_CLOUD_MOUNTAIN_POS.footY };
  }
  let minD = 999.0;
  let bestElevY = SACRED_CLOUD_MOUNTAIN_POS.footY;

  for (let i = 0; i < SACRED_MOUNTAIN_APPROACH_WAYPOINTS.length - 1; i++) {
    const a = SACRED_MOUNTAIN_APPROACH_WAYPOINTS[i];
    const b = SACRED_MOUNTAIN_APPROACH_WAYPOINTS[i + 1];
    const d = distToSegment(x, z, a.x, a.z, b.x, b.z);
    if (d < minD) {
      minD = d;
      const vx = b.x - a.x;
      const vz = b.z - a.z;
      const lenSq = vx * vx + vz * vz;
      const t = lenSq > 1e-6 ? Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / lenSq)) : 0;
      bestElevY = a.elevY + (b.elevY - a.elevY) * t;
    }
  }
  return { dist: minD, targetElevY: bestElevY };
}

/**
 * Summary: Evaluates exact world position, centerline radius (coupled directly to `sacredMountainHullRadiusAtY`),
 *          angle, elevation, and tangent yaw at spiral parameter `s in [0, 1]`.
 */
export function sampleSacredSpiralAtS(sRaw: number): {
  s: number;
  x: number;
  z: number;
  y: number;
  r: number;
  theta: number;
  tangentYaw: number;
  segment: ISacredSpiralSegment;
} {
  const s = Math.max(0, Math.min(1, sRaw));
  const theta = Math.PI * 0.5 - s * Math.PI * 2.0 * SACRED_CLOUD_MOUNTAIN_POS.spiralTurns;

  let seg = SACRED_MOUNTAIN_SPIRAL_SEGMENTS[SACRED_MOUNTAIN_SPIRAL_SEGMENTS.length - 1];
  for (let i = 0; i < SACRED_MOUNTAIN_SPIRAL_SEGMENTS.length; i++) {
    if (s <= SACRED_MOUNTAIN_SPIRAL_SEGMENTS[i].sEnd + 1e-9) {
      seg = SACRED_MOUNTAIN_SPIRAL_SEGMENTS[i];
      break;
    }
  }
  const span = Math.max(1e-6, seg.sEnd - seg.sStart);
  const localT = Math.max(0, Math.min(1, (s - seg.sStart) / span));
  const y = seg.yStart + (seg.yEnd - seg.yStart) * localT;

  const r = sacredMountainHullRadiusAtY(y);
  const x = SACRED_CLOUD_MOUNTAIN_POS.x + Math.cos(theta) * r;
  const z = SACRED_CLOUD_MOUNTAIN_POS.z + Math.sin(theta) * r;

  const eps = 0.0015;
  const evalXZ = (sv: number): [number, number] => {
    const th = Math.PI * 0.5 - sv * Math.PI * 2.0 * SACRED_CLOUD_MOUNTAIN_POS.spiralTurns;
    let sg = SACRED_MOUNTAIN_SPIRAL_SEGMENTS[SACRED_MOUNTAIN_SPIRAL_SEGMENTS.length - 1];
    for (let i = 0; i < SACRED_MOUNTAIN_SPIRAL_SEGMENTS.length; i++) {
      if (sv <= SACRED_MOUNTAIN_SPIRAL_SEGMENTS[i].sEnd + 1e-9) {
        sg = SACRED_MOUNTAIN_SPIRAL_SEGMENTS[i];
        break;
      }
    }
    const lt = Math.max(0, Math.min(1, (sv - sg.sStart) / Math.max(1e-6, sg.sEnd - sg.sStart)));
    const yv = sg.yStart + (sg.yEnd - sg.yStart) * lt;
    const rv = sacredMountainHullRadiusAtY(yv);
    return [Math.cos(th) * rv, Math.sin(th) * rv];
  };
  const [ax, az] = evalXZ(Math.max(0, s - eps));
  const [bx, bz] = evalXZ(Math.min(1, s + eps));
  const tangentYaw = Math.atan2(bx - ax, bz - az);

  return { s, x, z, y, r, theta, tangentYaw, segment: seg };
}

/**
 * Summary: Signed distance to the clean circular Sacred Summit Pond (`<= 0` inside water, `> 0` outside).
 */
export function teardropPoolSignedDist(x: number, z: number): number {
  return (
    Math.hypot(x - SACRED_CLOUD_MOUNTAIN_POS.poolCx, z - SACRED_CLOUD_MOUNTAIN_POS.poolCz) -
    SACRED_CLOUD_MOUNTAIN_POS.poolRadius
  );
}

/**
 * Summary: Single unified analytical heightfield for the entire Sacred Cloud Mountain:
 *          natural sandy/earthy cone rising from 30.8m -> 104.0m with flat terraced benches
 *          carved along the 2-turn spiral path so the mountain never climbs onto the stairs
 *          and slopes smoothly upward again between turns up to the carved round summit pond.
 */
export function sacredMountainTerrainHeightAt(x: number, z: number, ambientGroundY: number): number {
  const dx = x - SACRED_CLOUD_MOUNTAIN_POS.x;
  const dz = z - SACRED_CLOUD_MOUNTAIN_POS.z;
  const r = Math.hypot(dx, dz);
  if (r >= 90.0) return ambientGroundY;

  // Natural cone + subtle craggy organic undulation strictly away from the carved spiral
  const rawCone = sacredMountainBaseConeHeightAtR(r);
  const skirtBlend = 1.0 - smoothstep01(SACRED_CLOUD_MOUNTAIN_POS.footHullRadius, 90.0, r);
  let h = ambientGroundY * (1.0 - skirtBlend) + Math.max(ambientGroundY, rawCone) * skirtBlend;

  // Gentle sandy foothill swell outside footHullRadius (except flat South Foot Gateway entry apron)
  if (r >= SACRED_CLOUD_MOUNTAIN_POS.footHullRadius) {
    const gateMask =
      Math.abs(dx) < 10.0 && dz > 62.0 ? smoothstep01(4.0, 10.0, Math.abs(dx)) : 1.0;
    const foothillBump =
      (Math.sin(x * 0.08 + z * 0.05) * 0.6 + 0.6) * skirtBlend * (1.0 - skirtBlend) * 3.5 * gateMask;
    h += foothillBump;
  }

  // Carve flat terraced path bench smoothly into the natural slope at (theta, turn 0/1)
  const theta = Math.atan2(dz, dx);
  let phiBase = (Math.PI * 0.5 - theta) % (Math.PI * 2.0);
  if (phiBase < 0) phiBase += Math.PI * 2.0;

  let bestBenchW = 0.0;
  let bestBenchY = h;
  const flatHalfW = SACRED_CLOUD_MOUNTAIN_POS.pathHalfWidth + 0.35;
  const blendHalfW = flatHalfW + 3.6;

  for (let turn = 0; turn < 2; turn++) {
    const candS = (turn * Math.PI * 2.0 + phiBase) / (Math.PI * 4.0);
    if (candS < -0.02 || candS > 1.02) continue;
    const sp = sampleSacredSpiralAtS(candS);
    const dr = Math.abs(r - sp.r);
    if (dr < blendHalfW) {
      const endFlare = candS < 0.04 || candS > 0.96 ? 1.25 : 0.0;
      const w = 1.0 - smoothstep01(flatHalfW + endFlare, blendHalfW + endFlare, dr);
      if (w > bestBenchW) {
        bestBenchW = w;
        bestBenchY = sp.y;
      }
    }
  }

  // Handle s = 1.0 & s = 0.0 wrap seams symmetrically so both sides of Foot & Summit Gates sit level
  if (phiBase > Math.PI * 1.80) {
    const seamEndS = Math.min(1.0, (Math.PI * 2.0 + phiBase) / (Math.PI * 4.0));
    const spEnd = sampleSacredSpiralAtS(seamEndS);
    const drEnd = Math.abs(r - spEnd.r);
    if (drEnd < blendHalfW + 1.25) {
      const w = 1.0 - smoothstep01(flatHalfW + 1.25, blendHalfW + 1.25, drEnd);
      if (w > bestBenchW) {
        bestBenchW = w;
        bestBenchY = spEnd.y;
      }
    }
    const seamStartFade = smoothstep01(Math.PI * 1.80, Math.PI * 2.0, phiBase);
    const spStart = sampleSacredSpiralAtS(0.0);
    const drStart = Math.abs(r - spStart.r);
    if (drStart < blendHalfW + 1.25) {
      const w = (1.0 - smoothstep01(flatHalfW + 1.25, blendHalfW + 1.25, drStart)) * seamStartFade;
      if (w > bestBenchW) {
        bestBenchW = w;
        bestBenchY = spStart.y;
      }
    }
  } else if (phiBase < Math.PI * 0.20) {
    const seamEndFade = 1.0 - smoothstep01(0.0, Math.PI * 0.20, phiBase);
    const spEnd = sampleSacredSpiralAtS(1.0);
    const drEnd = Math.abs(r - spEnd.r);
    if (drEnd < blendHalfW + 1.25) {
      const w = (1.0 - smoothstep01(flatHalfW + 1.25, blendHalfW + 1.25, drEnd)) * seamEndFade;
      if (w > bestBenchW) {
        bestBenchW = w;
        bestBenchY = spEnd.y;
      }
    }
  }

  if (bestBenchW > 0.0) {
    h = h * (1.0 - bestBenchW) + bestBenchY * bestBenchW;
  }

  // Spacious flattened post-gate summit arrival shelf (theta in [0.75, 2.05], r <= 24.5m -> blend to 28.5m)
  // ensures comfortable flat room after climbing the final stairs & passing through the Crimson Paifang Gate.
  if (r <= 28.5 && theta >= 0.72 && theta <= 2.08) {
    const radShelf = 1.0 - smoothstep01(24.5, 28.5, r);
    const angShelf =
      smoothstep01(0.72, 0.92, theta) * (1.0 - smoothstep01(1.88, 2.08, theta));
    const shelfW = radShelf * angShelf;
    if (shelfW > 0.0) {
      h = h * (1.0 - shelfW) + SACRED_CLOUD_MOUNTAIN_POS.summitY * shelfW;
    }
  }

  // Keep immediate South Foot Gateway threshold flush & level at footY (30.8m)
  if (Math.abs(dx) <= 9.0 && dz >= 64.0 && dz <= 80.0) {
    const gw =
      (1.0 - smoothstep01(4.0, 9.0, Math.abs(dx))) *
      (1.0 - smoothstep01(4.0, 8.0, Math.abs(dz - SACRED_CLOUD_MOUNTAIN_POS.footHullRadius)));
    h = h * (1.0 - gw) + SACRED_CLOUD_MOUNTAIN_POS.footY * gw;
  }

  // On summit crown (r <= 20.5m): carve the smooth circular Sacred Lotus Pond basin
  if (r <= SACRED_CLOUD_MOUNTAIN_POS.summitRadius + 1.2) {
    const poolDist = teardropPoolSignedDist(x, z);
    if (poolDist < 0.25) {
      const basinT = smoothstep01(0.25, -1.25, poolDist);
      const targetPoolY =
        SACRED_CLOUD_MOUNTAIN_POS.summitY -
        basinT * (SACRED_CLOUD_MOUNTAIN_POS.summitY - SACRED_CLOUD_MOUNTAIN_POS.poolFloorY);
      h = Math.min(h, targetPoolY);
    }
  }

  return h;
}

/**
 * Summary: Evaluates exact walkable height on the relocated Octagonal Yin-Yang Bagua Platform & SW stairs
 *          in the Chinese Fortress / Warrior Monks valley.
 */
export function chineseBaguaPlatformWalkableHeightAt(
  x: number,
  z: number,
  currentY?: number
): { height: number; surface: 'bridge' } | null {
  const dx = x - CHINESE_BAGUA_PLATFORM_POS.x;
  const dz = z - CHINESE_BAGUA_PLATFORM_POS.z;
  if (Math.abs(dx) > 10.5 || Math.abs(dz) > 10.5) return null;

  const cos8 = Math.cos(Math.PI / 8);
  const absDx = Math.abs(dx);
  const absDz = Math.abs(dz);
  const octR = Math.max(absDx, absDz, (absDx + absDz) * Math.SQRT1_2) / cos8;

  const stairDirX = -Math.SQRT1_2;
  const stairDirZ = Math.SQRT1_2;
  const along = dx * stairDirX + dz * stairDirZ;
  const perp = -dx * stairDirZ + dz * stairDirX;
  if (along >= 5.2 && along <= 8.5 && Math.abs(perp) <= 1.85) {
    const t = Math.max(0, Math.min(1, (8.5 - along) / 3.3));
    const stairY =
      CHINESE_BAGUA_PLATFORM_POS.baseY +
      t * (CHINESE_BAGUA_PLATFORM_POS.deckY - CHINESE_BAGUA_PLATFORM_POS.baseY);
    if (currentY === undefined || currentY >= CHINESE_BAGUA_PLATFORM_POS.baseY - 1.5) {
      return { height: stairY, surface: 'bridge' };
    }
  }

  if (octR <= CHINESE_BAGUA_PLATFORM_POS.radius + 0.15) {
    if (currentY === undefined || currentY >= CHINESE_BAGUA_PLATFORM_POS.baseY - 1.5) {
      const dCenter = Math.hypot(dx, dz);
      let topY: number = CHINESE_BAGUA_PLATFORM_POS.deckY;
      if (dCenter <= 2.9) {
        topY = CHINESE_BAGUA_PLATFORM_POS.deckY + 0.34;
      } else if (dCenter <= 3.35) {
        topY = CHINESE_BAGUA_PLATFORM_POS.deckY + 0.17;
      }
      return { height: topY, surface: 'bridge' };
    }
  }
  return null;
}

/**
 * Summary: Resolves walkable height & surface kind anywhere on the Sacred Cloud Mountain spiral,
 *          circular lotus stepping stones, pond basin, or natural grass/sand summit.
 */
export function sacredCloudMountainWalkableHeightAt(
  x: number,
  z: number,
  currentY?: number
): { height: number; surface: 'bridge' | 'ground' } | null {
  const dx = x - SACRED_CLOUD_MOUNTAIN_POS.x;
  const dz = z - SACRED_CLOUD_MOUNTAIN_POS.z;
  const r = Math.hypot(dx, dz);
  if (r > SACRED_CLOUD_MOUNTAIN_POS.footHullRadius + 6.0) return null;

  const theta = Math.atan2(dz, dx);

  // 1) Inner Summit Crown & Round Sacred Pond + Stepping Stones (clear of upper spiral stairs at r ~ 20.5m)
  if (r <= SACRED_CLOUD_MOUNTAIN_POS.summitRadius - 1.0 && (currentY === undefined || currentY >= 101.0)) {
    for (let i = 0; i < SACRED_LOTUS_STEPPING_STONES.length; i++) {
      const st = SACRED_LOTUS_STEPPING_STONES[i];
      if (Math.hypot(x - st.x, z - st.z) <= st.radius + 0.18) {
        return { height: st.topY, surface: 'bridge' };
      }
    }
    const poolDist = teardropPoolSignedDist(x, z);
    if (poolDist <= 0.0) {
      return { height: SACRED_CLOUD_MOUNTAIN_POS.poolFloorY, surface: 'ground' };
    }
    return { height: SACRED_CLOUD_MOUNTAIN_POS.summitY, surface: 'ground' };
  }

  // 2) Foot Gateway Transition Apron at s = 0 (local (0, +72.0))
  if (
    Math.abs(dx) <= 4.2 &&
    Math.abs(dz - SACRED_CLOUD_MOUNTAIN_POS.spiralStartRadius) <= 3.8 &&
    (currentY === undefined || currentY <= 35.0)
  ) {
    return { height: SACRED_CLOUD_MOUNTAIN_POS.footY, surface: 'bridge' };
  }

  // 3) 2-Turn Alternating Spiral Ascent (including flat 104.0m arrival landing seg 12)
  let phiBase = (Math.PI * 0.5 - theta) % (Math.PI * 2.0);
  if (phiBase < 0) phiBase += Math.PI * 2.0;

  let bestHeight: number | null = null;
  let bestScore = Infinity;

  for (let turn = 0; turn < 2; turn++) {
    const candS = (turn * Math.PI * 2.0 + phiBase) / (Math.PI * 4.0);
    if (candS < -0.01 || candS > 1.01) continue;
    const sample = sampleSacredSpiralAtS(candS);
    const radialErr = Math.abs(r - sample.r);
    if (radialErr <= SACRED_CLOUD_MOUNTAIN_POS.pathHalfWidth + 0.45) {
      const yDiff = currentY !== undefined ? Math.abs(currentY - sample.y) : 0;
      if (currentY !== undefined && yDiff > 9.5) continue;
      const score = yDiff * 4.0 + radialErr;
      if (score < bestScore) {
        bestScore = score;
        bestHeight = sample.y;
      }
    }
  }

  if (bestHeight === null && phiBase > Math.PI * 1.85) {
    const seamS = Math.min(1.0, (Math.PI * 2.0 + phiBase) / (Math.PI * 4.0));
    const sample = sampleSacredSpiralAtS(seamS);
    if (Math.abs(r - sample.r) <= SACRED_CLOUD_MOUNTAIN_POS.pathHalfWidth + 0.45) {
      if (currentY === undefined || Math.abs(currentY - sample.y) <= 9.5) {
        bestHeight = sample.y;
      }
    }
  }

  if (bestHeight !== null) {
    return { height: bestHeight, surface: 'bridge' };
  }

  // 4) Flattened Post-Gate Summit Arrival Shelf & Outer Summit Grass Rim (only when at summit elevation >= 103.5m)
  const inPostGateShelf = theta >= 0.72 && theta <= 1.92 && r <= 24.5;
  if (
    (r <= SACRED_CLOUD_MOUNTAIN_POS.summitRadius + 0.5 || inPostGateShelf) &&
    (currentY === undefined || currentY >= 103.5)
  ) {
    return { height: SACRED_CLOUD_MOUNTAIN_POS.summitY, surface: 'ground' };
  }

  return null;
}

/**
 * Summary: Returns water surface elevation (`104.0m`) inside the round summit Lotus Pond when near summit altitude.
 */
export function sacredCloudMountainWaterSurfaceAt(
  x: number,
  z: number,
  currentY?: number
): number | null {
  if (currentY !== undefined && currentY < 99.0) return null;
  if (teardropPoolSignedDist(x, z) <= 0.0) {
    return SACRED_CLOUD_MOUNTAIN_POS.poolWaterY;
  }
  return null;
}
// #endregion

// ======================== SOLID OBB COLLIDERS ======================== \\
// #region Solid OBB Colliders
function buildSacredCloudMountainSolidBoxes(): readonly ISolidBuildingBox[] {
  const boxes: ISolidBuildingBox[] = [];

  // 1) Outer safety wooden guardrail fence wrapping around the 2-turn climb up to the Paifang gate (s = 0..0.985)
  const railSegCount = 64;
  const railMaxS = 0.985;
  for (let i = 0; i < railSegCount; i++) {
    const sMid = ((i + 0.5) / railSegCount) * railMaxS;
    const sample = sampleSacredSpiralAtS(sMid);
    const outX = Math.cos(sample.theta);
    const outZ = Math.sin(sample.theta);
    const rx = SACRED_CLOUD_MOUNTAIN_POS.x + outX * (sample.r + SACRED_CLOUD_MOUNTAIN_POS.pathHalfWidth);
    const rz = SACRED_CLOUD_MOUNTAIN_POS.z + outZ * (sample.r + SACRED_CLOUD_MOUNTAIN_POS.pathHalfWidth);
    const arcLen = (Math.PI * 4.0 * railMaxS * sample.r) / railSegCount;
    const halfAlong = arcLen * 0.52;
    const halfThick = 0.22;
    boxes.push({
      id: `sacred-mtn-spiral-outer-rail-${i + 1}`,
      minX: rx - halfThick,
      maxX: rx + halfThick,
      minZ: rz - halfAlong,
      maxZ: rz + halfAlong,
      minY: sample.y - 0.5,
      maxY: sample.y + 1.2,
      yaw: sample.tangentYaw,
    });
  }

  // 2) Synced Foot Gateway Archway pillars straddling s = 0 cleanly on level ground
  const footSample = sampleSacredSpiralAtS(0);
  const footAxisX = Math.cos(footSample.tangentYaw);
  const footAxisZ = -Math.sin(footSample.tangentYaw);
  for (const [idx, side] of [
    [1, -2.7],
    [2, 2.7],
  ] as const) {
    const px = footSample.x + footAxisX * side;
    const pz = footSample.z + footAxisZ * side;
    boxes.push({
      id: `sacred-mtn-foot-gate-pillar-${idx}`,
      minX: px - 0.42,
      maxX: px + 0.42,
      minZ: pz - 0.42,
      maxZ: pz + 0.42,
      minY: SACRED_CLOUD_MOUNTAIN_POS.footY - 0.5,
      maxY: SACRED_CLOUD_MOUNTAIN_POS.footY + 4.8,
    });
  }

  // 3) Summit Crimson Paifang Gate pillars aligned along tangentYaw(0.985) on the level 104.0m landing
  const sumSample = sampleSacredSpiralAtS(0.985);
  const sumAxisX = Math.cos(sumSample.tangentYaw);
  const sumAxisZ = -Math.sin(sumSample.tangentYaw);
  for (const [idx, side] of [
    [1, -2.55],
    [2, 2.55],
  ] as const) {
    const px = sumSample.x + sumAxisX * side;
    const pz = sumSample.z + sumAxisZ * side;
    boxes.push({
      id: `sacred-mtn-paifang-pillar-${idx}`,
      minX: px - 0.45,
      maxX: px + 0.45,
      minZ: pz - 0.45,
      maxZ: pz + 0.45,
      minY: SACRED_CLOUD_MOUNTAIN_POS.summitY - 0.5,
      maxY: SACRED_CLOUD_MOUNTAIN_POS.summitY + 5.0,
    });
  }

  // 4) Relocated Octagonal Yin-Yang Bagua Platform X-lattice perimeter railings (Chinese/Monks valley)
  const octR = CHINESE_BAGUA_PLATFORM_POS.radius - 0.12;
  for (let side = 0; side < 8; side++) {
    const ang = (side * Math.PI) / 4;
    if (side === 3) continue;
    const nx = Math.cos(ang);
    const nz = Math.sin(ang);
    const midDist = octR * Math.cos(Math.PI / 8);
    const halfSpan = octR * Math.sin(Math.PI / 8) * 0.96;
    const rx = CHINESE_BAGUA_PLATFORM_POS.x + nx * midDist;
    const rz = CHINESE_BAGUA_PLATFORM_POS.z + nz * midDist;
    const sideYaw = Math.atan2(-nz, nx);
    boxes.push({
      id: `chinese-bagua-rail-${side + 1}`,
      minX: rx - 0.18,
      maxX: rx + 0.18,
      minZ: rz - halfSpan,
      maxZ: rz + halfSpan,
      minY: CHINESE_BAGUA_PLATFORM_POS.deckY,
      maxY: CHINESE_BAGUA_PLATFORM_POS.deckY + 1.12,
      yaw: sideYaw,
    });
  }

  // 5) Sacred Summit Pink Blossom Tree trunk + Bronze Incense Censer
  boxes.push({
    id: 'sacred-mtn-summit-sakura-trunk',
    minX: SACRED_CLOUD_MOUNTAIN_POS.summitTreeX - 0.72,
    maxX: SACRED_CLOUD_MOUNTAIN_POS.summitTreeX + 0.72,
    minZ: SACRED_CLOUD_MOUNTAIN_POS.summitTreeZ - 0.72,
    maxZ: SACRED_CLOUD_MOUNTAIN_POS.summitTreeZ + 0.72,
    minY: SACRED_CLOUD_MOUNTAIN_POS.summitY,
    maxY: SACRED_CLOUD_MOUNTAIN_POS.summitY + 3.2,
  });
  boxes.push({
    id: 'sacred-mtn-incense-censer',
    minX: SACRED_CLOUD_MOUNTAIN_POS.incenseCenserX - 0.72,
    maxX: SACRED_CLOUD_MOUNTAIN_POS.incenseCenserX + 0.72,
    minZ: SACRED_CLOUD_MOUNTAIN_POS.incenseCenserZ - 0.72,
    maxZ: SACRED_CLOUD_MOUNTAIN_POS.incenseCenserZ + 0.72,
    minY: SACRED_CLOUD_MOUNTAIN_POS.summitY,
    maxY: SACRED_CLOUD_MOUNTAIN_POS.summitY + 1.65,
  });

  return boxes;
}

/**
 * Summary: All solid OBB colliders for the Sacred Cloud Mountain spiral fences, synced gates,
 *          summit pink tree trunk, censer, and relocated Chinese Bagua platform rails.
 */
export const SACRED_CLOUD_MOUNTAIN_SOLID_BOXES: readonly ISolidBuildingBox[] =
  buildSacredCloudMountainSolidBoxes();
// #endregion

// ======================== SKY DRAGON PATROL (FORTRESS <-> MOUNTAIN SUMMIT) ======================== \\
// #region Sky Dragon Patrol
export type TSkyDragonPatrolPhase =
  | 'fortress_soar'
  | 'fly_to_mountain'
  | 'circle_descend'
  | 'perched_summit'
  | 'takeoff_ascend'
  | 'fly_to_fortress';

export type TSkyDragonNonAttackState = Exclude<DemonDragonState, 'attack' | 'death'>;

export interface ISkyDragonPatrolSample {
  readonly phase: TSkyDragonPatrolPhase;
  readonly animState: TSkyDragonNonAttackState;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly pitch: number;
  readonly bank: number;
}

function hermite3D(
  p0: readonly [number, number, number],
  v0: readonly [number, number, number],
  p1: readonly [number, number, number],
  v1: readonly [number, number, number],
  u: number
): [number, number, number] {
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  return [
    h00 * p0[0] + h10 * v0[0] + h01 * p1[0] + h11 * v1[0],
    h00 * p0[1] + h10 * v0[1] + h01 * p1[1] + h11 * v1[1],
    h00 * p0[2] + h10 * v0[2] + h01 * p1[2] + h11 * v1[2],
  ];
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

const SKY_DRAGON_CYCLE_SEC = 72.0;
const FORT_HOVER_X = 22.0;
const FORT_HOVER_Y = 95.0;
const FORT_HOVER_Z = -265.0;

function sampleSkyDragonPos(tRaw: number): {
  phase: TSkyDragonPatrolPhase;
  animState: TSkyDragonNonAttackState;
  x: number;
  y: number;
  z: number;
  bank: number;
  forcedYaw?: number;
  pitchOverride?: number;
} {
  const t = ((tRaw % SKY_DRAGON_CYCLE_SEC) + SKY_DRAGON_CYCLE_SEC) % SKY_DRAGON_CYCLE_SEC;
  const perchX = SACRED_CLOUD_MOUNTAIN_POS.dragonPerchX;
  const perchY = SACRED_CLOUD_MOUNTAIN_POS.summitY + 0.14;
  const perchZ = SACRED_CLOUD_MOUNTAIN_POS.dragonPerchZ;
  const perchYaw = SACRED_CLOUD_MOUNTAIN_POS.dragonPerchYaw;

  const orbitStart: readonly [number, number, number] = [perchX - 32.0, 134.0, perchZ];
  const takeoffEnd: readonly [number, number, number] = [
    perchX - 36.0,
    140.0,
    perchZ + 44.0,
  ];
  const fortEntry: readonly [number, number, number] = [FORT_HOVER_X, FORT_HOVER_Y + 4.5, FORT_HOVER_Z];
  const fortTangent: readonly [number, number, number] = [245.0, 0.0, 365.0];

  if (t < 20.0) {
    const phi = (t / 20.0) * Math.PI * 2.0;
    const airAnim: TSkyDragonNonAttackState = t < 11.5 ? 'fly' : t < 16.5 ? 'skip' : 'fly';
    return {
      phase: 'fortress_soar',
      animState: airAnim,
      x: FORT_HOVER_X + Math.sin(phi) * 78.0,
      y: FORT_HOVER_Y + Math.cos(phi * 2.0) * 4.5,
      z: FORT_HOVER_Z + Math.sin(phi * 2.0) * 58.0,
      bank: -Math.sin(phi) * 0.22,
    };
  }
  if (t < 30.0) {
    const u = (t - 20.0) / 10.0;
    const [x, y, z] = hermite3D(
      fortEntry,
      fortTangent,
      orbitStart,
      [0.0, -10.0, -220.0],
      u
    );
    return {
      phase: 'fly_to_mountain',
      animState: 'fly',
      x,
      y,
      z,
      bank: Math.sin(u * Math.PI) * 0.16,
    };
  }
  if (t < 38.0) {
    const u = (t - 30.0) / 8.0;
    const ease = smoothstep01(0.0, 1.0, u);
    const radius = 32.0 * (1.0 - ease);
    const ang = Math.PI + u * Math.PI * 2.0;
    const x = perchX + Math.cos(ang) * radius;
    const z = perchZ + Math.sin(ang) * radius;
    const y = 134.0 * (1.0 - ease) + perchY * ease;
    const flarePitch = u > 0.72 ? -0.22 * Math.sin(((u - 0.72) / 0.28) * Math.PI) : 0.14;
    const orbitYaw = Math.atan2(-Math.sin(ang), Math.cos(ang));
    const yawBlend = smoothstep01(0.72, 1.0, u);
    return {
      phase: 'circle_descend',
      animState: 'fly',
      x,
      y,
      z,
      bank: 0.24 * (1.0 - yawBlend),
      forcedYaw: lerpAngle(orbitYaw, perchYaw, yawBlend),
      pitchOverride: flarePitch,
    };
  }
  if (t < 53.8) {
    // Showcase ALL non-attack grounded animations along the clear northwest summit meadow (keeping dry & clear of tree/pond)
    if (t < 40.5) {
      return {
        phase: 'perched_summit',
        animState: 'idle',
        x: perchX,
        y: perchY,
        z: perchZ,
        bank: 0,
        forcedYaw: perchYaw,
        pitchOverride: 0,
      };
    }
    const wpA: readonly [number, number] = [perchX, perchZ]; // (97.5, -774.5)
    const wpB: readonly [number, number] = [93.5, -773.0];
    const wpC: readonly [number, number] = [90.8, -770.8];
    const wpD: readonly [number, number] = [89.6, -768.2];
    const wpE: readonly [number, number] = [93.2, -771.6];

    if (t < 41.8) {
      const u = smoothstep01(40.5, 41.8, t);
      const x = wpA[0] + (wpB[0] - wpA[0]) * u;
      const z = wpA[1] + (wpB[1] - wpA[1]) * u;
      return {
        phase: 'perched_summit',
        animState: 'walk',
        x,
        y: perchY,
        z,
        bank: 0,
        forcedYaw: Math.atan2(wpB[0] - wpA[0], wpB[1] - wpA[1]),
        pitchOverride: 0,
      };
    }
    if (t < 43.0) {
      const u = smoothstep01(41.8, 43.0, t);
      const x = wpB[0] + (wpC[0] - wpB[0]) * u;
      const z = wpB[1] + (wpC[1] - wpB[1]) * u;
      return {
        phase: 'perched_summit',
        animState: 'stalk',
        x,
        y: perchY,
        z,
        bank: 0,
        forcedYaw: Math.atan2(wpC[0] - wpB[0], wpC[1] - wpB[1]),
        pitchOverride: 0,
      };
    }
    if (t < 44.6) {
      return {
        phase: 'perched_summit',
        animState: 'roar',
        x: wpC[0],
        y: perchY,
        z: wpC[1],
        bank: 0,
        forcedYaw: 0.55,
        pitchOverride: 0,
      };
    }
    if (t < 45.8) {
      const u = smoothstep01(44.6, 45.8, t);
      const x = wpC[0] + (wpD[0] - wpC[0]) * u;
      const z = wpC[1] + (wpD[1] - wpC[1]) * u;
      return {
        phase: 'perched_summit',
        animState: 'trot',
        x,
        y: perchY,
        z,
        bank: 0,
        forcedYaw: Math.atan2(wpD[0] - wpC[0], wpD[1] - wpC[1]),
        pitchOverride: 0,
      };
    }
    if (t < 46.9) {
      const u = smoothstep01(45.8, 46.9, t);
      const x = wpD[0] + (wpE[0] - wpD[0]) * u;
      const z = wpD[1] + (wpE[1] - wpD[1]) * u;
      return {
        phase: 'perched_summit',
        animState: 'run',
        x,
        y: perchY,
        z,
        bank: 0,
        forcedYaw: Math.atan2(wpE[0] - wpD[0], wpE[1] - wpD[1]),
        pitchOverride: 0,
      };
    }
    if (t < 47.9) {
      const u = smoothstep01(46.9, 47.9, t);
      const x = wpE[0] + (wpA[0] - wpE[0]) * u;
      const z = wpE[1] + (wpA[1] - wpE[1]) * u;
      return {
        phase: 'perched_summit',
        animState: 'flee',
        x,
        y: perchY,
        z,
        bank: 0,
        forcedYaw: lerpAngle(Math.atan2(wpA[0] - wpE[0], wpA[1] - wpE[1]), perchYaw, Math.max(0, (u - 0.6) / 0.4)),
        pitchOverride: 0,
      };
    }

    const stationaryClip: TSkyDragonNonAttackState =
      t < 49.1 ? 'eat' : t < 50.2 ? 'sit' : t < 51.3 ? 'lie' : t < 52.5 ? 'sleep' : 'call';
    return {
      phase: 'perched_summit',
      animState: stationaryClip,
      x: perchX,
      y: perchY,
      z: perchZ,
      bank: 0,
      forcedYaw: perchYaw,
      pitchOverride: 0,
    };
  }
  if (t < 60.8) {
    const u = (t - 53.8) / 7.0;
    const [x, y, z] = hermite3D(
      [perchX, perchY, perchZ],
      [Math.sin(perchYaw) * 28.0, 18.0, Math.cos(perchYaw) * 28.0],
      takeoffEnd,
      [15.0, 24.0, 110.0],
      u
    );
    const climbPitch = -0.26 * Math.sin(u * Math.PI * 0.85);
    return {
      phase: 'takeoff_ascend',
      animState: 'fly',
      x,
      y,
      z,
      bank: Math.sin(u * Math.PI) * 0.14,
      pitchOverride: climbPitch,
    };
  }
  const u = (t - 60.8) / 11.2;
  const [x, y, z] = hermite3D(
    takeoffEnd,
    [15.0, 24.0, 110.0],
    fortEntry,
    fortTangent,
    u
  );
  return {
    phase: 'fly_to_fortress',
    animState: 'fly',
    x,
    y,
    z,
    bank: -Math.sin(u * Math.PI) * 0.16,
  };
}

/**
 * Summary: Evaluates the continuous 72s Sky Dragon patrol connecting Fortress aerial figure-8,
 *          northbound flight, spiral descent onto Sacred Cloud Mountain summit (103, 104.28, -773.5),
 *          summit perch (idle/roar/call), wing-spread takeoff, and return flight.
 */
export function evaluateSkyDragonPatrol(elapsedTime: number): ISkyDragonPatrolSample {
  const cur = sampleSkyDragonPos(elapsedTime);
  let yaw = cur.forcedYaw ?? 0;
  let pitch = cur.pitchOverride ?? 0;

  if (cur.forcedYaw === undefined || cur.pitchOverride === undefined) {
    const dtEps = 0.04;
    const next = sampleSkyDragonPos(elapsedTime + dtEps);
    const vx = next.x - cur.x;
    const vy = next.y - cur.y;
    const vz = next.z - cur.z;
    const horiz = Math.hypot(vx, vz);
    if (cur.forcedYaw === undefined && horiz > 1e-4) {
      yaw = Math.atan2(vx, vz);
    }
    if (cur.pitchOverride === undefined && horiz > 1e-4) {
      pitch = -Math.atan2(vy, horiz);
    }
  }

  return {
    phase: cur.phase,
    animState: cur.animState,
    x: cur.x,
    y: cur.y,
    z: cur.z,
    yaw,
    pitch,
    bank: cur.bank,
  };
}
// #endregion
