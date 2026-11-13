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
  entrance: { ambientSky: 0x6e563c, ambientGround: 0x261a10, ambientIntensity: 0.78, fogColor: 0x0c0906, fogDensity: 0.005 },
  upperCavern: { ambientSky: 0x7a5c3e, ambientGround: 0x2c2015, ambientIntensity: 0.82, fogColor: 0x120c08, fogDensity: 0.0045 },
  lagoon: { ambientSky: 0x38849a, ambientGround: 0x122c36, ambientIntensity: 0.80, fogColor: 0x06161c, fogDensity: 0.005 },
  galleries: { ambientSky: 0x6e5a44, ambientGround: 0x261c14, ambientIntensity: 0.74, fogColor: 0x100c09, fogDensity: 0.005 },
  foundry: { ambientSky: 0x984a20, ambientGround: 0x36160a, ambientIntensity: 0.84, fogColor: 0x1c0a04, fogDensity: 0.0055 },
  descent: { ambientSky: 0x585862, ambientGround: 0x1c1612, ambientIntensity: 0.68, fogColor: 0x10131a, fogDensity: 0.0045 },
  chasm: { ambientSky: 0x2c3446, ambientGround: 0x080a10, ambientIntensity: 0.44, fogColor: 0x07090f, fogDensity: 0.0042 },
  bridge: { ambientSky: 0x303648, ambientGround: 0x090b12, ambientIntensity: 0.42, fogColor: 0x07090f, fogDensity: 0.0042 },
  heroesPath: { ambientSky: 0x483824, ambientGround: 0x100c08, ambientIntensity: 0.48, fogColor: 0x08090e, fogDensity: 0.0045 },
  kingBalcony: { ambientSky: 0x564428, ambientGround: 0x140e08, ambientIntensity: 0.54, fogColor: 0x090a10, fogDensity: 0.0045 },
  golemChamber: { ambientSky: 0x3c5e92, ambientGround: 0x121c30, ambientIntensity: 0.72, fogColor: 0x060c18, fogDensity: 0.006 },
  ancientPassage: { ambientSky: 0x524236, ambientGround: 0x1c1410, ambientIntensity: 0.64, fogColor: 0x0a0806, fogDensity: 0.006 },
  dragonForge: { ambientSky: 0xb85224, ambientGround: 0xc03a12, ambientIntensity: 1.15, fogColor: 0x220a05, fogDensity: 0.0048 },
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
