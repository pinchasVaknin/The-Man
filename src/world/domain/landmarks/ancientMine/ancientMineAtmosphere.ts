// ============================================================================
// MODULE: World / Domain / Landmarks / Ancient Mine
// DESIGN: Data presets per area plus one query. The open upper cavern has no area borders, so
//         its lagoon, galleries and foundry zones blend by distance into the hall preset.
// SUMMARY: The lighting identity of each part of the mine: ambient sky/ground colours and
//          intensity, fog colour and density. Holds no THREE objects; the atmosphere
//          controller applies and smooths the result.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import { sampleAncientMineFloor } from './ancientMineFloor';
import type { IMineAreaId } from './ancientMineLayout';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: Ambient light and fog of one place in the mine; colours are 0xRRGGBB. */
export interface IMineAtmosphere {
  readonly ambientSky: number;
  readonly ambientGround: number;
  readonly ambientIntensity: number;
  readonly fogColor: number;
  readonly fogDensity: number;
}
// #endregion

// #region Presets
/**
 * Summary: Lighting identity per area, following section 15 of the mine specification.
 * Design: Warm industrial up top, cool turquoise at the water, orange heat at the furnaces,
 *         blue-grey depth in the chasm, gold around the heroes and the king, magic blue at the
 *         golem, red-orange at the dragon forge.
 */
export const MINE_ATMOSPHERE_PRESETS: Record<IMineAreaId, IMineAtmosphere> = {
  entrance: { ambientSky: 0x5a4630, ambientGround: 0x1a120c, ambientIntensity: 0.55, fogColor: 0x0c0906, fogDensity: 0.006 },
  upperCavern: { ambientSky: 0x6e5236, ambientGround: 0x22180f, ambientIntensity: 0.62, fogColor: 0x120c08, fogDensity: 0.005 },
  lagoon: { ambientSky: 0x2f7488, ambientGround: 0x0c2028, ambientIntensity: 0.62, fogColor: 0x06161c, fogDensity: 0.006 },
  galleries: { ambientSky: 0x5e4c3a, ambientGround: 0x1c1410, ambientIntensity: 0.52, fogColor: 0x100c09, fogDensity: 0.006 },
  foundry: { ambientSky: 0x8a4018, ambientGround: 0x2a1006, ambientIntensity: 0.62, fogColor: 0x1c0a04, fogDensity: 0.007 },
  descent: { ambientSky: 0x4a4a52, ambientGround: 0x14100c, ambientIntensity: 0.55, fogColor: 0x141820, fogDensity: 0.005 },
  chasm: { ambientSky: 0x5a6a88, ambientGround: 0x121820, ambientIntensity: 0.8, fogColor: 0x1a2232, fogDensity: 0.0055 },
  bridge: { ambientSky: 0x5c6278, ambientGround: 0x141820, ambientIntensity: 0.75, fogColor: 0x182030, fogDensity: 0.0055 },
  heroesPath: { ambientSky: 0x786038, ambientGround: 0x1c140a, ambientIntensity: 0.7, fogColor: 0x1a1a22, fogDensity: 0.006 },
  kingBalcony: { ambientSky: 0x80683a, ambientGround: 0x1e160a, ambientIntensity: 0.72, fogColor: 0x1a1a22, fogDensity: 0.006 },
  golemChamber: { ambientSky: 0x2e4e80, ambientGround: 0x0a1220, ambientIntensity: 0.55, fogColor: 0x060c18, fogDensity: 0.008 },
  ancientPassage: { ambientSky: 0x3e3228, ambientGround: 0x100c0a, ambientIntensity: 0.42, fogColor: 0x0a0806, fogDensity: 0.008 },
  dragonForge: { ambientSky: 0xb04a20, ambientGround: 0xc03a12, ambientIntensity: 1.25, fogColor: 0x2a0c06, fogDensity: 0.006 },
};

/**
 * Summary: Zones inside the open upper cavern, as circles in the local frame. Inside `core` a
 *          zone is at full strength; it fades out by `edge`.
 */
const UPPER_ZONES: ReadonlyArray<{ area: IMineAreaId; lx: number; lz: number; core: number; edge: number }> = [
  { area: 'lagoon', lx: -82, lz: 74, core: 26, edge: 42 },
  { area: 'galleries', lx: 92, lz: 58, core: 22, edge: 38 },
  { area: 'foundry', lx: 90, lz: 128, core: 14, edge: 30 },
];
// #endregion

// ======================== PUBLIC QUERY ======================== \\
// #region Atmosphere At
/**
 * Summary: Atmosphere at a local mine point.
 * Design: Areas other than the open upper cavern return their preset as is. In the upper
 *         cavern (and its lagoon and gallery surfaces) each zone weighs in by distance; what is
 *         left goes to the hall preset.
 * @param lx Local X, meters.
 * @param lz Local Z, meters.
 * @param y World Y of the viewer, to pick between stacked floors.
 * @returns The preset or the blend for that point; the hall preset in solid rock.
 */
export function mineAtmosphereAt(lx: number, lz: number, y: number): IMineAtmosphere {
  const sample = sampleAncientMineFloor(lx, lz, y);
  const area = sample?.area ?? 'upperCavern';
  if (area !== 'upperCavern' && area !== 'lagoon' && area !== 'galleries') return MINE_ATMOSPHERE_PRESETS[area];

  const weights = UPPER_ZONES.map((z) => {
    const d = Math.hypot(lx - z.lx, lz - z.lz);
    return { preset: MINE_ATMOSPHERE_PRESETS[z.area], w: 1 - smoothstep(z.core, z.edge, d) };
  });
  const zoneSum = weights.reduce((s, x) => s + x.w, 0);
  if (zoneSum <= 0) return MINE_ATMOSPHERE_PRESETS.upperCavern;
  const scale = zoneSum > 1 ? 1 / zoneSum : 1;
  const parts = weights.map((x) => ({ preset: x.preset, w: x.w * scale }));
  parts.push({ preset: MINE_ATMOSPHERE_PRESETS.upperCavern, w: Math.max(0, 1 - zoneSum * scale) });
  const dominant = parts.find((p) => p.w >= 0.999);
  return dominant !== undefined ? dominant.preset : blend(parts);
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Blending
function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function blend(parts: ReadonlyArray<{ preset: IMineAtmosphere; w: number }>): IMineAtmosphere {
  const mixColor = (pick: (a: IMineAtmosphere) => number): number => {
    let r = 0;
    let g = 0;
    let b = 0;
    for (const { preset, w } of parts) {
      const c = pick(preset);
      r += ((c >> 16) & 0xff) * w;
      g += ((c >> 8) & 0xff) * w;
      b += (c & 0xff) * w;
    }
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
  };
  const mix = (pick: (a: IMineAtmosphere) => number): number => parts.reduce((s, p) => s + pick(p.preset) * p.w, 0);
  return {
    ambientSky: mixColor((a) => a.ambientSky),
    ambientGround: mixColor((a) => a.ambientGround),
    ambientIntensity: mix((a) => a.ambientIntensity),
    fogColor: mixColor((a) => a.fogColor),
    fogDensity: mix((a) => a.fogDensity),
  };
}
// #endregion
