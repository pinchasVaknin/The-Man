// ============================================================================
// MODULE: World / Domain / Landmarks / Settlements
// DESIGN: Farmsteads, mills, pavilions, and horse stables configuration (SRP)
// SUMMARY: Declares locations, orientations, and boundary profiles for valley farms,
//          the hunter lodge, riverside windmills, sakura sanctuary, and horses.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { RideableHorseDef, ValleyFarmDef } from '../worldTypes';
// #endregion

// ======================== LODGES & PAVILIONS ======================== \\
// #region Lodges & Pavilions
/** Summary: Hunter's woodland lodge position and leveled terrace configuration. */
export const HUNTER_LODGE_POS = {
  x: -92,
  z: 72,
  flatRadius: 24,
  height: 2.15,
  dirZ: -1 as const,
};

/** Summary: Riverside scenic windmills with terrace heights and rotation angles. */
export const RIVERSIDE_WINDMILLS = [
  { id: 'windmill-lower', x: 52, z: -18, flatRadius: 10.5, height: 1.95, rotY: -0.55 },
  { id: 'windmill-upper', x: 106, z: -62, flatRadius: 10.5, height: 2.15, rotY: -0.75 },
] as const;

/** Summary: Hot-spring mountain sakura sanctuary terrace position. */
export const SAKURA_SANCTUARY_POS = {
  x: 142,
  z: -148,
  height: 11.5,
  radius: 42,
} as const;

/** Summary: Facing yaw angle of the sakura sanctuary oriented toward the valley approach. */
export const SAKURA_SANCTUARY_YAW = Math.atan2(
  106 - SAKURA_SANCTUARY_POS.x,
  -62 - SAKURA_SANCTUARY_POS.z
);

/** Summary: Lakeside tea pavilion deck and boundary position. */
export const LAKESIDE_TEA_PAVILION_POS = {
  x: -126,
  z: 48,
  deckHeight: 0.55,
  halfSize: 3.8,
} as const;
// #endregion

// ======================== VALLEY FARMS ======================== \\
// #region Valley Farms
/** Summary: Enclosed valley farmhouses with perimeter fences and enterable doors. */
export const VALLEY_FARMS: readonly ValleyFarmDef[] = [
  {
    id: 'farm-west',
    doorId: 'farm-west-door',
    nameHe: 'חוות העמק המערבית',
    x: -136,
    z: 158,
    height: 2.35,
    clearRadius: 36,
    fenceHalfW: 22.0,
    fenceHalfD: 11.5,
    gateHalfW: 3.2,
    dirZ: -1,
  },
  {
    id: 'farm-south',
    doorId: 'farm-south-door',
    nameHe: 'חוות שדות החיטה הדרומית',
    x: 8,
    z: 196,
    height: 2.45,
    clearRadius: 36,
    fenceHalfW: 22.0,
    fenceHalfD: 11.5,
    gateHalfW: 3.2,
    dirZ: -1,
  },
  {
    id: 'farm-east',
    doorId: 'farm-east-door',
    nameHe: 'חוות העמק המזרחית',
    x: 112,
    z: 18,
    height: 2.55,
    clearRadius: 36,
    fenceHalfW: 22.0,
    fenceHalfD: 11.5,
    gateHalfW: 3.2,
    dirZ: 1,
  },
] as const;
// #endregion

// ======================== RIDEABLE HORSES ======================== \\
// #region Rideable Horses
/** Summary: Persistent mountable horse definitions and their home spawn stables. */
export const RIDEABLE_HORSES: readonly RideableHorseDef[] = [
  {
    id: 'horse-spawn-meadow',
    nameHe: 'סוס רכיבה מלכותי (ערמוני)',
    coatColorHex: 0x7c3f1d,
    maneColorHex: 0x26150b,
    saddleColorHex: 0x991b1b,
    homeX: 6.5,
    homeZ: 26.5,
    homeYaw: -0.45,
  },
  {
    id: 'horse-hunter-stable',
    nameHe: 'סוס ציידים שחור (אורוות הצייד)',
    coatColorHex: 0x292524,
    maneColorHex: 0x0c0a09,
    saddleColorHex: 0x78350f,
    homeX: HUNTER_LODGE_POS.x - 10.5,
    homeZ: HUNTER_LODGE_POS.z + 5.5,
    homeYaw: 0.25,
  },
  {
    id: 'horse-south-farm',
    nameHe: 'סוסת חווה לבנה (חוות החיטה)',
    coatColorHex: 0xe7e5e4,
    maneColorHex: 0xd6d3d1,
    saddleColorHex: 0x92400e,
    homeX: 15.5,
    homeZ: 181.5,
    homeYaw: -0.8,
  },
  {
    id: 'horse-harbor-gate',
    nameHe: 'סוס מסע זהוב (שער נמל המזרח)',
    coatColorHex: 0xc28135,
    maneColorHex: 0xfef3c7,
    saddleColorHex: 0x991b1b,
    homeX: 193.5,
    homeZ: 244.0,
    homeYaw: -Math.PI / 2,
  },
  {
    id: 'horse-southwest-oasis',
    nameHe: 'סוס ערבי לבן (נווה המדבר המערבי)',
    coatColorHex: 0xfafaf9,
    maneColorHex: 0xfde68a,
    saddleColorHex: 0x1d4ed8,
    homeX: -275.5,
    homeZ: 294.0,
    homeYaw: Math.PI / 2,
  },
] as const;
// #endregion
