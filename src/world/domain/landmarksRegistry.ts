import type {
  RideableHorseDef,
  ValleyFarmDef,
  HillWatchtowerDef,
  DwarvenGuardianStatueDef,
  DwarvenStoneHouseDef,
  CornerWatchtowerDef,
  ClimbableLadderInfo,
  FortressDoorDef,
  SolidBuildingBox,
  ArcheryTargetDef,
} from './worldTypes';

export const WATER_LEVEL = 0.0;
export const PLAYER_EYE_HEIGHT = 1.72;
export const PLAYABLE_RADIUS = 680;
export const VIEW_DISTANCE = 225;
export const WORLD_SPAWN = {
  x: 0,
  z: 32,
  yaw: 0.04,
  pitch: -0.04,
};

// Key Landmark Coordinates (All buildings sit on leveled flat terraces)
export const HUNTER_LODGE_POS = { x: -92, z: 72, flatRadius: 24, height: 2.15, dirZ: -1 as const };
export const WATERFALL_CLIFF_POS = { x: -52, z: -42 };
export const WATERFALL_POOL_POS = { x: -42, z: -30 };
export const BIRCH_GROVE_CENTER = { x: 158, z: 118, radius: 108 };
export const RIVERSIDE_WINDMILLS = [
  { id: 'windmill-lower', x: 52, z: -18, flatRadius: 10.5, height: 1.95, rotY: -0.55 },
  { id: 'windmill-upper', x: 106, z: -62, flatRadius: 10.5, height: 2.15, rotY: -0.75 },
] as const;

export const FORTRESS_Z_OFFSET = -170;
export const FORTRESS_Y_OFFSET = 16.0;
const FZ = FORTRESS_Z_OFFSET;
const FY = FORTRESS_Y_OFFSET;

export const SAKURA_SANCTUARY_POS = {
  x: 142,
  z: -148,
  height: 11.5,
  radius: 42,
} as const;

export const SAKURA_SANCTUARY_YAW = Math.atan2(
  106 - SAKURA_SANCTUARY_POS.x,
  -62 - SAKURA_SANCTUARY_POS.z
);

export const LAKESIDE_TEA_PAVILION_POS = {
  x: -126,
  z: 48,
  deckHeight: 0.55,
  halfSize: 3.8,
} as const;

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

export const HILL_BRIDGE_YAW = Math.atan2(-165.0 - -65.0, -335.0 - -172.0);
export const HILL_BRIDGE_COS = Math.cos(HILL_BRIDGE_YAW);
export const HILL_BRIDGE_SIN = Math.sin(HILL_BRIDGE_YAW);

function makeHillWatchtowerDef(
  id: string,
  doorId: string,
  nameHe: string,
  x: number,
  z: number,
  baseY: number,
  deckY: number,
  yaw: number,
  doorSideLocalZ: 1 | -1,
  bridgeSideLocalZ: 1 | -1 | 0,
  localLadderX: number,
  localLadderZ: number,
  connectedToBridge: boolean
): HillWatchtowerDef {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const ladderX = x + localLadderX * c + localLadderZ * s;
  const ladderZ = z - localLadderX * s + localLadderZ * c;
  const localStandX = localLadderX - Math.sign(localLadderX) * 0.52;
  const localStandZ = localLadderZ - Math.sign(localLadderZ) * 0.52;
  const standX = x + localStandX * c + localStandZ * s;
  const standZ = z - localStandX * s + localStandZ * c;

  const localDoorZ = doorSideLocalZ * 3.45;
  const doorX = x + localDoorZ * s;
  const doorZ = z + localDoorZ * c;
  const j1x = doorX - 1.15 * c;
  const j1z = doorZ + 1.15 * s;
  const j2x = doorX + 1.15 * c;
  const j2z = doorZ - 1.15 * s;
  const doorMinX = Math.min(j1x, j2x) - 0.45;
  const doorMaxX = Math.max(j1x, j2x) + 0.45;
  const doorMinZ = Math.min(j1z, j2z) - 0.45;
  const doorMaxZ = Math.max(j1z, j2z) + 0.45;

  return {
    id,
    doorId,
    nameHe,
    x,
    z,
    baseY,
    deckY,
    halfSize: 3.6,
    yaw,
    doorSideLocalZ,
    bridgeSideLocalZ,
    localLadderX,
    localLadderZ,
    ladderX,
    ladderZ,
    standX,
    standZ,
    doorX,
    doorZ,
    doorMinX,
    doorMaxX,
    doorMinZ,
    doorMaxZ,
    isWest: localLadderX < 0,
    isSouth: localLadderZ > 0,
    connectedToBridge,
  };
}

export const HILL_WATCHTOWERS: readonly HillWatchtowerDef[] = [
  makeHillWatchtowerDef(
    'hill-watchtower-sw',
    'hill-watchtower-sw-door',
    'מגדל שמירה דרום־מערבי',
    -65.0,
    -172.0,
    56.5,
    65.5,
    HILL_BRIDGE_YAW,
    1,
    1,
    2.25,
    2.25,
    true
  ),
  makeHillWatchtowerDef(
    'hill-watchtower-west',
    'hill-watchtower-west-door',
    'מגדל שמירה מערבי',
    -165.0,
    -335.0,
    67.5,
    76.5,
    HILL_BRIDGE_YAW,
    -1,
    -1,
    2.25,
    2.25,
    true
  ),
  makeHillWatchtowerDef(
    'hill-watchtower-east',
    'hill-watchtower-east-door',
    'מגדל שמירה מזרחי מבודד',
    160.0,
    -335.0,
    64.0,
    73.0,
    -Math.PI / 2,
    1,
    0,
    2.25,
    2.25,
    false
  ),
] as const;

export const ROPE_BRIDGE_DEF = {
  ax: -65.0,
  az: -172.0,
  ay: 65.5,
  mx: -115.0,
  mz: -253.5,
  my: 71.0,
  bx: -165.0,
  bz: -335.0,
  by: 76.5,
  halfWidth: 1.35,
  sag: 0.55,
  deckEdgeT: 3.55 / Math.hypot(-165.0 - -65.0, -335.0 - -172.0),
} as const;

export function ropeBridgePointInfoAt(
  x: number,
  z: number
): { height: number; perpDist: number; tTotal: number } | null {
  const vx = ROPE_BRIDGE_DEF.bx - ROPE_BRIDGE_DEF.ax;
  const vz = ROPE_BRIDGE_DEF.bz - ROPE_BRIDGE_DEF.az;
  const lenSq = vx * vx + vz * vz;
  const t = ((x - ROPE_BRIDGE_DEF.ax) * vx + (z - ROPE_BRIDGE_DEF.az) * vz) / lenSq;
  const tStart = ROPE_BRIDGE_DEF.deckEdgeT;
  const tEnd = 1.0 - tStart;
  if (t < tStart - 0.003 || t > tEnd + 0.003) return null;
  const projX = ROPE_BRIDGE_DEF.ax + t * vx;
  const projZ = ROPE_BRIDGE_DEF.az + t * vz;
  const perpDist = Math.hypot(x - projX, z - projZ);
  if (perpDist > ROPE_BRIDGE_DEF.halfWidth) return null;

  let height: number;
  if (t <= 0.5) {
    const u = Math.max(0, Math.min(1, (t - tStart) / (0.5 - tStart)));
    const linearY = ROPE_BRIDGE_DEF.ay + u * (ROPE_BRIDGE_DEF.my - ROPE_BRIDGE_DEF.ay);
    height = linearY - 4 * ROPE_BRIDGE_DEF.sag * u * (1 - u);
  } else {
    const u = Math.max(0, Math.min(1, (t - 0.5) / (tEnd - 0.5)));
    const linearY = ROPE_BRIDGE_DEF.my + u * (ROPE_BRIDGE_DEF.by - ROPE_BRIDGE_DEF.my);
    height = linearY - 4 * ROPE_BRIDGE_DEF.sag * u * (1 - u);
  }
  return { height, perpDist, tTotal: t };
}

export const SOUTHERN_MINE_POS = {
  x: -58.0,
  z: 426.0,
  floorY: 2.65,
  entranceY: 2.65,
  entranceFloorY: 2.65,
  cavernFloorY: -9.35,
  catwalkY: -5.15,
  cavernHeight: 10.2,
  corridorHeight: 5.4,
  entranceZ: 420.0,
  shaftStartZ: 423.5,
  shaftEndZ: 454.0,
  backZ: 530.0,
  cavernBackZ: 530.0,
  cavernEndZ: 530.0,
  tunnelHalfW: 3.2,
  cavernHalfW: 52.0,
  mountainCenterZ: 476.0,
  mountainRadius: 96.0,
  mountainHeight: 37.5,
} as const;

export const DWARVEN_GUARDIAN_STATUES: readonly DwarvenGuardianStatueDef[] = [
  {
    id: 'dwarven-statue-west',
    nameHe: 'פסל המלך הגמדי דורין (שומר המכרה המערבי)',
    x: SOUTHERN_MINE_POS.x - 7.5,
    z: SOUTHERN_MINE_POS.entranceZ - 4.2,
    baseY: SOUTHERN_MINE_POS.entranceFloorY,
    pedestalHalfSize: 2.3,
    totalHeight: 9.8,
    yaw: Math.PI - 0.18,
    side: 'west',
  },
  {
    id: 'dwarven-statue-east',
    nameHe: 'פסל המלך הגמדי תרור (שומר המכרה המזרחי)',
    x: SOUTHERN_MINE_POS.x + 7.5,
    z: SOUTHERN_MINE_POS.entranceZ - 4.2,
    baseY: SOUTHERN_MINE_POS.entranceFloorY,
    pedestalHalfSize: 2.3,
    totalHeight: 9.8,
    yaw: Math.PI + 0.18,
    side: 'east',
  },
] as const;

export const DWARVEN_STONE_HOUSES: readonly DwarvenStoneHouseDef[] = [
  {
    id: 'dwarf-house-nw',
    doorId: 'dwarf-house-nw-door',
    nameHe: 'בית האבן של חרשי הגמדים (צפון־מערב)',
    x: -76.0,
    z: 368.0,
    terraceY: 2.65,
    floorY: 2.83,
    halfW: 5.2,
    halfD: 4.4,
    dirX: 1,
    doorX: -70.8,
    doorZ: 368.0,
  },
  {
    id: 'dwarf-house-ne',
    doorId: 'dwarf-house-ne-door',
    nameHe: 'בית האבן של כורי הזהב (צפון־מזרח)',
    x: -40.0,
    z: 368.0,
    terraceY: 2.65,
    floorY: 2.83,
    halfW: 5.2,
    halfD: 4.4,
    dirX: -1,
    doorX: -45.2,
    doorZ: 368.0,
  },
  {
    id: 'dwarf-house-sw',
    doorId: 'dwarf-house-sw-door',
    nameHe: 'בית האבן של שומרי ההר (דרום־מערב)',
    x: -76.0,
    z: 392.0,
    terraceY: 2.65,
    floorY: 2.83,
    halfW: 5.2,
    halfD: 4.4,
    dirX: 1,
    doorX: -70.8,
    doorZ: 392.0,
  },
  {
    id: 'dwarf-house-se',
    doorId: 'dwarf-house-se-door',
    nameHe: 'בית האבן של אומני הרו-נות (דרום־מזרח)',
    x: -40.0,
    z: 392.0,
    terraceY: 2.65,
    floorY: 2.83,
    halfW: 5.2,
    halfD: 4.4,
    dirX: -1,
    doorX: -45.2,
    doorZ: 392.0,
  },
] as const;

export const SOUTHWEST_OASIS_POS = {
  x: -310.0,
  z: 300.0,
  terraceY: 5.5,
  clearRadius: 56.0,
  observatoryX: -310.0,
  observatoryZ: 280.0,
  observatoryBaseY: 5.5,
  observatoryTopDeckY: 21.5,
  observatoryRadius: 5.0,
  observatoryDoorId: 'sw-observatory-door',
  observatoryDoorZ: 284.85,
  observatoryLadderId: 'sw-observatory-ladder',
  observatoryLadderX: -310.0,
  observatoryLadderZ: 276.3,
  observatoryStandX: -310.0,
  observatoryStandZ: 276.85,
  pavilionX: -336.0,
  pavilionZ: 300.0,
  pavilionFloorY: 5.68,
  pavilionHalfW: 5.2,
  pavilionHalfD: 6.4,
  pavilionDoorId: 'sw-alchemist-door',
  pavilionDoorX: -330.8,
  fountainX: -310.0,
  fountainZ: 300.0,
  lagoonX: -310.0,
  lagoonZ: 324.0,
  lagoonRadiusX: 19.0,
  lagoonRadiusZ: 13.5,
  lagoonWaterY: 5.35,
  gazeboX: -310.0,
  gazeboZ: 324.0,
  gazeboDeckY: 5.85,
  gazeboHalfSize: 4.4,
  bridgeMinZ: 309.5,
  bridgeMaxZ: 338.5,
  bridgeHalfW: 2.2,
  colonnadeX: -286.0,
  colonnadeZ: 300.0,
  gateX: -274.0,
  gateZ: 296.0,
} as const;

export const MAGIC_STONE_CIRCLE_POS = {
  x: -58.0,
  z: 128.0,
  height: 14.5,
  hillRadius: 38.0,
  topFlatRadius: 10.5,
  entryStartX: -16.0,
  entryStartZ: 112.0,
} as const;

export const SOUTHEAST_HARBOR_POS = {
  x: 235.0,
  z: 252.0,
  plazaY: 3.2,
  waterY: 1.25,
  gateX: 200.0,
  gateZ: 244.0,
  wallWestX: 200.0,
  wallNorthZ: 214.0,
  wallSouthZ: 312.0,
  tavernX: 224.0,
  tavernZ: 230.0,
  tavernFloorY: 3.35,
  tavernHalfW: 8.0,
  tavernHalfD: 6.0,
  tavernDoorZ: 236.0,
  fountainX: 232.0,
  fountainZ: 252.0,
  warehouseX: 218.0,
  warehouseZ: 277.0,
  warehouseFloorY: 3.35,
  warehouseHalfW: 8.5,
  warehouseHalfD: 5.5,
  warehouseDoorId: 'harbor-warehouse-door',
  warehouseDoorZ: 271.5,
  cargoShedX: 243.0,
  cargoShedZ: 277.0,
  amphitheaterX: 226.0,
  amphitheaterZ: 294.0,
  pierStartX: 254.0,
  pierEndX: 271.5,
  pierZ: 252.0,
  pierHalfW: 2.8,
  pierY: 3.25,
  shipX: 282.0,
  shipZ: 252.0,
  shipDeckY: 3.65,
  shipQuarterdeckY: 6.65,
  shipQuarterdeckStartZ: 259.5,
  shipHalfW: 6.4,
  shipHalfL: 21.0,
  shipCaptainDoorId: 'galleon-captain-door',
  lighthouseX: 252.0,
  lighthouseZ: 202.0,
  lighthouseBaseY: 9.5,
  lighthouseTopDeckY: 25.5,
  lighthouseRadius: 4.2,
  lighthouseDoorId: 'harbor-lighthouse-door',
  lighthouseLadderId: 'harbor-lighthouse-ladder',
  lighthouseLadderX: 252.0,
  lighthouseLadderZ: 199.1,
  lighthouseStandX: 252.0,
  lighthouseStandZ: 199.65,
} as const;

export const CHINESE_FORTRESS_POS = {
  x: 0,
  z: -171 + FZ,
  stairFootZ: -78 + FZ,
  stairMidZ: -104 + FZ,
  stairBaseHeight: 9.0 + FY,
  midLandingMinZ: -114 + FZ,
  midLandingMaxZ: -104 + FZ,
  midLandingHalfWidth: 14.5,
  midLandingHeight: 22.0 + FY,
  lowerGateZ: -104.8 + FZ,
  upperStairFootZ: -114 + FZ,
  upperStairTopZ: -122 + FZ,
  stairTopZ: -122 + FZ,
  upperGateZ: -122.4 + FZ,
  summitHeight: 26.0 + FY,
  rampartHeight: 31.2 + FY,
  rampartStairFootZ: -142.0 + FZ,
  rampartStairTopZ: -152.0 + FZ,
  rampartLandingMinZ: -156.6 + FZ,
  mainHallFloor1Y: 26.35 + FY,
  mainHallFloor2Y: 32.2 + FY,
  pavilionFloor1Y: 26.3 + FY,
  pavilionFloor2Y: 31.4 + FY,
  watchtowerFloor1Y: 26.25 + FY,
  watchtowerFloor2Y: 31.2 + FY,
  watchtowerFloor3Y: 36.0 + FY,
  stairHalfWidth: 3.85,
  plazaHalfWidth: 52.0,
  plazaMinZ: -220.0 + FZ,
  plazaMaxZ: -122.0 + FZ,
} as const;

export const CORNER_WATCHTOWERS: readonly CornerWatchtowerDef[] = [
  {
    id: 'sw-watchtower',
    doorId: 'sw-watchtower-door',
    nameHe: 'מגדל הפינה הדרום־מערבי',
    cx: -45.5,
    cz: -128.5 + FZ,
    doorX: -45.5,
    doorZ: -134.0 + FZ,
    ladderX: -41.2,
    ladderZ: -132.8 + FZ,
    isWest: true,
    isSouth: true,
  },
  {
    id: 'se-watchtower',
    doorId: 'se-watchtower-door',
    nameHe: 'מגדל הפינה הדרום־מזרחי',
    cx: 45.5,
    cz: -128.5 + FZ,
    doorX: 45.5,
    doorZ: -134.0 + FZ,
    ladderX: 41.2,
    ladderZ: -132.8 + FZ,
    isWest: false,
    isSouth: true,
  },
  {
    id: 'nw-watchtower',
    doorId: 'nw-watchtower-door',
    nameHe: 'מגדל הפינה הצפון־מערבי',
    cx: -45.5,
    cz: -213.5 + FZ,
    doorX: -45.5,
    doorZ: -208.0 + FZ,
    ladderX: -41.2,
    ladderZ: -209.2 + FZ,
    isWest: true,
    isSouth: false,
  },
  {
    id: 'ne-watchtower',
    doorId: 'ne-watchtower-door',
    nameHe: 'מגדל הפינה הצפון־מזרחי',
    cx: 45.5,
    cz: -213.5 + FZ,
    doorX: 45.5,
    doorZ: -208.0 + FZ,
    ladderX: 41.2,
    ladderZ: -209.2 + FZ,
    isWest: false,
    isSouth: false,
  },
] as const;

export function getLadderById(id: string | null | undefined): ClimbableLadderInfo | null {
  if (!id) return null;
  for (let i = 0; i < CORNER_WATCHTOWERS.length; i++) {
    const wt = CORNER_WATCHTOWERS[i];
    if (wt.id === id) {
      return {
        id: wt.id,
        nameHe: wt.nameHe,
        ladderX: wt.ladderX,
        ladderZ: wt.ladderZ,
        standX: wt.ladderX + (wt.isWest ? -0.42 : 0.42),
        standZ: wt.ladderZ + (wt.isSouth ? 0.42 : -0.42),
        isWest: wt.isWest,
        isSouth: wt.isSouth,
        minY: CHINESE_FORTRESS_POS.watchtowerFloor1Y,
        maxY: CHINESE_FORTRESS_POS.watchtowerFloor3Y,
        floors: [
          CHINESE_FORTRESS_POS.watchtowerFloor1Y,
          CHINESE_FORTRESS_POS.watchtowerFloor2Y,
          CHINESE_FORTRESS_POS.watchtowerFloor3Y,
        ],
      };
    }
  }
  for (let i = 0; i < HILL_WATCHTOWERS.length; i++) {
    const hw = HILL_WATCHTOWERS[i];
    if (hw.id === id) {
      return {
        id: hw.id,
        nameHe: hw.nameHe,
        ladderX: hw.ladderX,
        ladderZ: hw.ladderZ,
        standX: hw.standX,
        standZ: hw.standZ,
        isWest: hw.isWest,
        isSouth: hw.isSouth,
        minY: hw.baseY + 0.15,
        maxY: hw.deckY,
        floors: [hw.baseY + 0.15, hw.deckY],
      };
    }
  }
  if (id === SOUTHEAST_HARBOR_POS.lighthouseLadderId) {
    return {
      id: SOUTHEAST_HARBOR_POS.lighthouseLadderId,
      nameHe: 'המגדלור המלכותי של נמל הדרום־מזרח',
      ladderX: SOUTHEAST_HARBOR_POS.lighthouseLadderX,
      ladderZ: SOUTHEAST_HARBOR_POS.lighthouseLadderZ,
      standX: SOUTHEAST_HARBOR_POS.lighthouseStandX,
      standZ: SOUTHEAST_HARBOR_POS.lighthouseStandZ,
      isWest: false,
      isSouth: false,
      minY: SOUTHEAST_HARBOR_POS.lighthouseBaseY + 0.15,
      maxY: SOUTHEAST_HARBOR_POS.lighthouseTopDeckY,
      floors: [SOUTHEAST_HARBOR_POS.lighthouseBaseY + 0.15, SOUTHEAST_HARBOR_POS.lighthouseTopDeckY],
    };
  }
  if (id === SOUTHWEST_OASIS_POS.observatoryLadderId) {
    return {
      id: SOUTHWEST_OASIS_POS.observatoryLadderId,
      nameHe: 'מגדל המצפה האסטרונומי של נווה המדבר',
      ladderX: SOUTHWEST_OASIS_POS.observatoryLadderX,
      ladderZ: SOUTHWEST_OASIS_POS.observatoryLadderZ,
      standX: SOUTHWEST_OASIS_POS.observatoryStandX,
      standZ: SOUTHWEST_OASIS_POS.observatoryStandZ,
      isWest: true,
      isSouth: true,
      minY: SOUTHWEST_OASIS_POS.observatoryBaseY + 0.15,
      maxY: SOUTHWEST_OASIS_POS.observatoryTopDeckY,
      floors: [SOUTHWEST_OASIS_POS.observatoryBaseY + 0.15, SOUTHWEST_OASIS_POS.observatoryTopDeckY],
    };
  }
  return null;
}

export function findWatchtowerLadderAt(x: number, z: number): ClimbableLadderInfo | null {
  for (let i = 0; i < CORNER_WATCHTOWERS.length; i++) {
    const wt = CORNER_WATCHTOWERS[i];
    if (Math.abs(x - wt.ladderX) <= 1.15 && Math.abs(z - wt.ladderZ) <= 1.15) {
      return getLadderById(wt.id);
    }
  }
  for (let i = 0; i < HILL_WATCHTOWERS.length; i++) {
    const hw = HILL_WATCHTOWERS[i];
    if (Math.hypot(x - hw.ladderX, z - hw.ladderZ) <= 1.25) {
      return getLadderById(hw.id);
    }
  }
  if (
    Math.hypot(
      x - SOUTHEAST_HARBOR_POS.lighthouseLadderX,
      z - SOUTHEAST_HARBOR_POS.lighthouseLadderZ
    ) <= 1.25
  ) {
    return getLadderById(SOUTHEAST_HARBOR_POS.lighthouseLadderId);
  }
  if (
    Math.hypot(
      x - SOUTHWEST_OASIS_POS.observatoryLadderX,
      z - SOUTHWEST_OASIS_POS.observatoryLadderZ
    ) <= 1.25
  ) {
    return getLadderById(SOUTHWEST_OASIS_POS.observatoryLadderId);
  }
  return null;
}

export function isOnWatchtowerLadder(x: number, z: number): boolean {
  return findWatchtowerLadderAt(x, z) !== null;
}

export function findLookedAtWatchtowerLadder(
  x: number,
  y: number,
  z: number,
  yaw: number,
  pitch = 0
): ClimbableLadderInfo | null {
  if (Math.abs(pitch) > 1.28) return null;

  const fwdX = -Math.sin(yaw);
  const fwdZ = -Math.cos(yaw);

  for (let i = 0; i < CORNER_WATCHTOWERS.length; i++) {
    const wt = CORNER_WATCHTOWERS[i];
    if (
      y < CHINESE_FORTRESS_POS.watchtowerFloor1Y - 0.6 ||
      y > CHINESE_FORTRESS_POS.watchtowerFloor3Y + 1.5
    ) {
      continue;
    }
    const dx = wt.ladderX - x;
    const dz = wt.ladderZ - z;
    const dist = Math.hypot(dx, dz);
    if (dist > 3.6) continue;
    if (dist < 0.45 || (dx * fwdX + dz * fwdZ) / dist >= 0.5) {
      return getLadderById(wt.id);
    }
  }

  for (let i = 0; i < HILL_WATCHTOWERS.length; i++) {
    const hw = HILL_WATCHTOWERS[i];
    if (y < hw.baseY - 0.6 || y > hw.deckY + 1.5) continue;
    const dx = hw.ladderX - x;
    const dz = hw.ladderZ - z;
    const dist = Math.hypot(dx, dz);
    if (dist > 3.8) continue;
    if (dist < 0.45 || (dx * fwdX + dz * fwdZ) / dist >= 0.5) {
      return getLadderById(hw.id);
    }
  }

  if (
    y >= SOUTHEAST_HARBOR_POS.lighthouseBaseY - 0.6 &&
    y <= SOUTHEAST_HARBOR_POS.lighthouseTopDeckY + 1.5
  ) {
    const dx = SOUTHEAST_HARBOR_POS.lighthouseLadderX - x;
    const dz = SOUTHEAST_HARBOR_POS.lighthouseLadderZ - z;
    const dist = Math.hypot(dx, dz);
    if (dist <= 3.8 && (dist < 0.45 || (dx * fwdX + dz * fwdZ) / dist >= 0.5)) {
      return getLadderById(SOUTHEAST_HARBOR_POS.lighthouseLadderId);
    }
  }

  if (
    y >= SOUTHWEST_OASIS_POS.observatoryBaseY - 0.6 &&
    y <= SOUTHWEST_OASIS_POS.observatoryTopDeckY + 1.5
  ) {
    const dx = SOUTHWEST_OASIS_POS.observatoryLadderX - x;
    const dz = SOUTHWEST_OASIS_POS.observatoryLadderZ - z;
    const dist = Math.hypot(dx, dz);
    if (dist <= 3.8 && (dist < 0.45 || (dx * fwdX + dz * fwdZ) / dist >= 0.5)) {
      return getLadderById(SOUTHWEST_OASIS_POS.observatoryLadderId);
    }
  }
  return null;
}

export const FORTRESS_DOORS: readonly FortressDoorDef[] = [
  {
    id: 'main-hall-door',
    buildingNameHe: 'היכל המצודה הקיסרי הראשי',
    x: 0,
    y: CHINESE_FORTRESS_POS.mainHallFloor1Y,
    z: -189.8 + FZ,
    minX: -2.2,
    maxX: 2.2,
    minZ: -190.25 + FZ,
    maxZ: -189.35 + FZ,
    interactRadius: 4.8,
  },
  {
    id: 'west-pavilion-door',
    buildingNameHe: 'ביתן הפגודה המערבי',
    x: -30.0,
    y: CHINESE_FORTRESS_POS.pavilionFloor1Y,
    z: -156.5 + FZ,
    minX: -31.6,
    maxX: -28.4,
    minZ: -156.95 + FZ,
    maxZ: -156.05 + FZ,
    interactRadius: 4.4,
  },
  {
    id: 'east-pavilion-door',
    buildingNameHe: 'ביתן הפגודה המזרחי',
    x: 30.0,
    y: CHINESE_FORTRESS_POS.pavilionFloor1Y,
    z: -156.5 + FZ,
    minX: 28.4,
    maxX: 31.6,
    minZ: -156.95 + FZ,
    maxZ: -156.05 + FZ,
    interactRadius: 4.4,
  },
  {
    id: 'sw-watchtower-door',
    buildingNameHe: 'מגדל הפינה הדרום־מערבי',
    x: -45.5,
    y: CHINESE_FORTRESS_POS.watchtowerFloor1Y,
    z: -134.0 + FZ,
    minX: -46.9,
    maxX: -44.1,
    minZ: -134.45 + FZ,
    maxZ: -133.55 + FZ,
    interactRadius: 4.2,
  },
  {
    id: 'se-watchtower-door',
    buildingNameHe: 'מגדל הפינה הדרום־מזרחי',
    x: 45.5,
    y: CHINESE_FORTRESS_POS.watchtowerFloor1Y,
    z: -134.0 + FZ,
    minX: 44.1,
    maxX: 46.9,
    minZ: -134.45 + FZ,
    maxZ: -133.55 + FZ,
    interactRadius: 4.2,
  },
  {
    id: 'nw-watchtower-door',
    buildingNameHe: 'מגדל הפינה הצפון־מערבי',
    x: -45.5,
    y: CHINESE_FORTRESS_POS.watchtowerFloor1Y,
    z: -208.0 + FZ,
    minX: -46.9,
    maxX: -44.1,
    minZ: -208.45 + FZ,
    maxZ: -207.55 + FZ,
    interactRadius: 4.2,
  },
  {
    id: 'ne-watchtower-door',
    buildingNameHe: 'מגדל הפינה הצפון־מזרחי',
    x: 45.5,
    y: CHINESE_FORTRESS_POS.watchtowerFloor1Y,
    z: -208.0 + FZ,
    minX: 44.1,
    maxX: 46.9,
    minZ: -208.45 + FZ,
    maxZ: -207.55 + FZ,
    interactRadius: 4.2,
  },
  {
    id: 'hunter-lodge-door',
    buildingNameHe: 'בקתת הציידים והיערן',
    x: HUNTER_LODGE_POS.x,
    y: HUNTER_LODGE_POS.height + 0.2,
    z: HUNTER_LODGE_POS.z + HUNTER_LODGE_POS.dirZ * 1.8,
    minX: HUNTER_LODGE_POS.x - 0.95,
    maxX: HUNTER_LODGE_POS.x + 0.95,
    minZ: HUNTER_LODGE_POS.z + HUNTER_LODGE_POS.dirZ * 1.8 - 0.4,
    maxZ: HUNTER_LODGE_POS.z + HUNTER_LODGE_POS.dirZ * 1.8 + 0.4,
    interactRadius: 4.2,
  },
  {
    id: 'farm-west-door',
    buildingNameHe: 'חוות העמק המערבית',
    x: VALLEY_FARMS[0].x,
    y: VALLEY_FARMS[0].height + 0.18,
    z: VALLEY_FARMS[0].z + VALLEY_FARMS[0].dirZ * 2.2,
    minX: VALLEY_FARMS[0].x - 0.95,
    maxX: VALLEY_FARMS[0].x + 0.95,
    minZ: VALLEY_FARMS[0].z + VALLEY_FARMS[0].dirZ * 2.2 - 0.4,
    maxZ: VALLEY_FARMS[0].z + VALLEY_FARMS[0].dirZ * 2.2 + 0.4,
    interactRadius: 4.2,
  },
  {
    id: 'farm-south-door',
    buildingNameHe: 'חוות שדות החיטה הדרומית',
    x: VALLEY_FARMS[1].x,
    y: VALLEY_FARMS[1].height + 0.18,
    z: VALLEY_FARMS[1].z + VALLEY_FARMS[1].dirZ * 2.2,
    minX: VALLEY_FARMS[1].x - 0.95,
    maxX: VALLEY_FARMS[1].x + 0.95,
    minZ: VALLEY_FARMS[1].z + VALLEY_FARMS[1].dirZ * 2.2 - 0.4,
    maxZ: VALLEY_FARMS[1].z + VALLEY_FARMS[1].dirZ * 2.2 + 0.4,
    interactRadius: 4.2,
  },
  {
    id: 'farm-east-door',
    buildingNameHe: 'חוות העמק המזרחית',
    x: VALLEY_FARMS[2].x,
    y: VALLEY_FARMS[2].height + 0.18,
    z: VALLEY_FARMS[2].z + VALLEY_FARMS[2].dirZ * 2.2,
    minX: VALLEY_FARMS[2].x - 0.95,
    maxX: VALLEY_FARMS[2].x + 0.95,
    minZ: VALLEY_FARMS[2].z + VALLEY_FARMS[2].dirZ * 2.2 - 0.4,
    maxZ: VALLEY_FARMS[2].z + VALLEY_FARMS[2].dirZ * 2.2 + 0.4,
    interactRadius: 4.2,
  },
  ...HILL_WATCHTOWERS.map((hw) => ({
    id: hw.doorId,
    buildingNameHe: hw.nameHe,
    x: hw.doorX,
    y: hw.baseY + 0.15,
    z: hw.doorZ,
    minX: hw.doorMinX,
    maxX: hw.doorMaxX,
    minZ: hw.doorMinZ,
    maxZ: hw.doorMaxZ,
    interactRadius: 4.8,
  })),
  {
    id: 'harbor-tavern-door',
    buildingNameHe: 'פונדק המלחים של נמל הדרום־מזרח',
    x: SOUTHEAST_HARBOR_POS.tavernX,
    y: SOUTHEAST_HARBOR_POS.tavernFloorY,
    z: SOUTHEAST_HARBOR_POS.tavernDoorZ,
    minX: SOUTHEAST_HARBOR_POS.tavernX - 1.25,
    maxX: SOUTHEAST_HARBOR_POS.tavernX + 1.25,
    minZ: SOUTHEAST_HARBOR_POS.tavernDoorZ - 0.45,
    maxZ: SOUTHEAST_HARBOR_POS.tavernDoorZ + 0.45,
    interactRadius: 4.6,
  },
  {
    id: SOUTHEAST_HARBOR_POS.lighthouseDoorId,
    buildingNameHe: 'המגדלור המלכותי של נמל הדרום־מזרח',
    x: SOUTHEAST_HARBOR_POS.lighthouseX,
    y: SOUTHEAST_HARBOR_POS.lighthouseBaseY + 0.15,
    z: SOUTHEAST_HARBOR_POS.lighthouseZ + 3.85,
    minX: SOUTHEAST_HARBOR_POS.lighthouseX - 1.15,
    maxX: SOUTHEAST_HARBOR_POS.lighthouseX + 1.15,
    minZ: SOUTHEAST_HARBOR_POS.lighthouseZ + 3.4,
    maxZ: SOUTHEAST_HARBOR_POS.lighthouseZ + 4.3,
    interactRadius: 4.6,
  },
  {
    id: SOUTHEAST_HARBOR_POS.warehouseDoorId,
    buildingNameHe: 'מחסן הסחורות הקיסרי של הנמל',
    x: SOUTHEAST_HARBOR_POS.warehouseX,
    y: SOUTHEAST_HARBOR_POS.warehouseFloorY,
    z: SOUTHEAST_HARBOR_POS.warehouseDoorZ,
    minX: SOUTHEAST_HARBOR_POS.warehouseX - 1.35,
    maxX: SOUTHEAST_HARBOR_POS.warehouseX + 1.35,
    minZ: SOUTHEAST_HARBOR_POS.warehouseDoorZ - 0.45,
    maxZ: SOUTHEAST_HARBOR_POS.warehouseDoorZ + 0.45,
    interactRadius: 4.8,
  },
  {
    id: SOUTHEAST_HARBOR_POS.shipCaptainDoorId,
    buildingNameHe: 'תא השינה והפיקוד של קפטן הגליאון',
    x: SOUTHEAST_HARBOR_POS.shipX,
    y: SOUTHEAST_HARBOR_POS.shipDeckY,
    z: SOUTHEAST_HARBOR_POS.shipQuarterdeckStartZ,
    minX: SOUTHEAST_HARBOR_POS.shipX - 1.25,
    maxX: SOUTHEAST_HARBOR_POS.shipX + 1.25,
    minZ: SOUTHEAST_HARBOR_POS.shipQuarterdeckStartZ - 0.45,
    maxZ: SOUTHEAST_HARBOR_POS.shipQuarterdeckStartZ + 0.45,
    interactRadius: 4.6,
  },
  {
    id: SOUTHWEST_OASIS_POS.observatoryDoorId,
    buildingNameHe: 'מגדל המצפה האסטרונומי של נווה המדבר',
    x: SOUTHWEST_OASIS_POS.observatoryX,
    y: SOUTHWEST_OASIS_POS.observatoryBaseY + 0.15,
    z: SOUTHWEST_OASIS_POS.observatoryDoorZ,
    minX: SOUTHWEST_OASIS_POS.observatoryX - 1.25,
    maxX: SOUTHWEST_OASIS_POS.observatoryX + 1.25,
    minZ: SOUTHWEST_OASIS_POS.observatoryDoorZ - 0.45,
    maxZ: SOUTHWEST_OASIS_POS.observatoryDoorZ + 0.45,
    interactRadius: 4.8,
  },
  {
    id: SOUTHWEST_OASIS_POS.pavilionDoorId,
    buildingNameHe: 'ביתן האלכימאי ואורגי המשי (נווה המדבר)',
    x: SOUTHWEST_OASIS_POS.pavilionDoorX,
    y: SOUTHWEST_OASIS_POS.pavilionFloorY,
    z: SOUTHWEST_OASIS_POS.pavilionZ,
    minX: SOUTHWEST_OASIS_POS.pavilionDoorX - 0.45,
    maxX: SOUTHWEST_OASIS_POS.pavilionDoorX + 0.45,
    minZ: SOUTHWEST_OASIS_POS.pavilionZ - 1.25,
    maxZ: SOUTHWEST_OASIS_POS.pavilionZ + 1.25,
    interactRadius: 4.8,
  },
  ...DWARVEN_STONE_HOUSES.map((dh) => ({
    id: dh.doorId,
    buildingNameHe: dh.nameHe,
    x: dh.doorX,
    y: dh.floorY,
    z: dh.doorZ,
    minX: dh.doorX - 0.45,
    maxX: dh.doorX + 0.45,
    minZ: dh.doorZ - 1.15,
    maxZ: dh.doorZ + 1.15,
    interactRadius: 4.6,
  })),
] as const;

export function findNearestFortressDoor(
  x: number,
  y: number,
  z: number,
  yaw?: number,
  pitch = 0
): FortressDoorDef | null {
  let best: FortressDoorDef | null = null;
  let bestDist = Infinity;
  const hasGaze = yaw !== undefined;
  const fwdX = hasGaze ? -Math.sin(yaw) : 0;
  const fwdZ = hasGaze ? -Math.cos(yaw) : 0;

  for (let i = 0; i < FORTRESS_DOORS.length; i++) {
    const d = FORTRESS_DOORS[i];
    if (Math.abs(y - d.y) > 3.5) continue;
    const distCenter = Math.hypot(x - d.x, z - d.z);
    if (distCenter > d.interactRadius) continue;

    if (hasGaze) {
      if (Math.abs(pitch) > 1.18) continue;
      const targetX = Math.max(d.minX, Math.min(d.maxX, x + fwdX * distCenter));
      const targetZ = Math.max(d.minZ, Math.min(d.maxZ, z + fwdZ * distCenter));
      const dx = targetX - x;
      const dz = targetZ - z;
      const len = Math.hypot(dx, dz);
      if (len > 0.15) {
        const horizDot = (dx * fwdX + dz * fwdZ) / len;
        if (horizDot < 0.56) continue;
      }
    }

    if (distCenter < bestDist) {
      bestDist = distCenter;
      best = d;
    }
  }
  return best;
}

export const SNOW_LINE_ALTITUDE = 16.5;

export const SOLID_BUILDING_BOXES: SolidBuildingBox[] = [
  {
    id: 'hunter-lodge-back-wall',
    minX: HUNTER_LODGE_POS.x - 4.85,
    maxX: HUNTER_LODGE_POS.x + 4.85,
    minZ: HUNTER_LODGE_POS.z + 3.45,
    maxZ: HUNTER_LODGE_POS.z + 4.15,
  },
  {
    id: 'hunter-lodge-west-wall',
    minX: HUNTER_LODGE_POS.x - 5.75,
    maxX: HUNTER_LODGE_POS.x - 4.3,
    minZ: HUNTER_LODGE_POS.z - 2.05,
    maxZ: HUNTER_LODGE_POS.z + 4.1,
  },
  {
    id: 'hunter-lodge-east-wall',
    minX: HUNTER_LODGE_POS.x + 4.3,
    maxX: HUNTER_LODGE_POS.x + 4.9,
    minZ: HUNTER_LODGE_POS.z - 2.05,
    maxZ: HUNTER_LODGE_POS.z + 4.1,
  },
  {
    id: 'hunter-lodge-front-left',
    minX: HUNTER_LODGE_POS.x - 4.85,
    maxX: HUNTER_LODGE_POS.x - 0.95,
    minZ: HUNTER_LODGE_POS.z - 2.1,
    maxZ: HUNTER_LODGE_POS.z - 1.5,
  },
  {
    id: 'hunter-lodge-front-right',
    minX: HUNTER_LODGE_POS.x + 0.95,
    maxX: HUNTER_LODGE_POS.x + 4.85,
    minZ: HUNTER_LODGE_POS.z - 2.1,
    maxZ: HUNTER_LODGE_POS.z - 1.5,
  },
  {
    id: 'hunter-water-trough',
    minX: HUNTER_LODGE_POS.x - 11.0,
    maxX: HUNTER_LODGE_POS.x - 7.8,
    minZ: HUNTER_LODGE_POS.z - 4.1,
    maxZ: HUNTER_LODGE_POS.z - 2.9,
    maxY: HUNTER_LODGE_POS.height + 0.95,
  },
  ...VALLEY_FARMS.flatMap((farm) => {
    const backWallZ = farm.z - farm.dirZ * 6.15;
    const frontWallZ = farm.z + farm.dirZ * 2.2;
    const wallMinZ = Math.min(backWallZ, frontWallZ) - 0.3;
    const wallMaxZ = Math.max(backWallZ, frontWallZ) + 0.3;
    const backFenceZ = farm.z - farm.dirZ * farm.fenceHalfD;
    const frontFenceZ = farm.z + farm.dirZ * farm.fenceHalfD;
    return [
      {
        id: `${farm.id}-back-wall`,
        minX: farm.x - 5.25,
        maxX: farm.x + 5.25,
        minZ: backWallZ - 0.3,
        maxZ: backWallZ + 0.3,
      },
      {
        id: `${farm.id}-west-wall`,
        minX: farm.x - 5.25,
        maxX: farm.x - 4.65,
        minZ: wallMinZ,
        maxZ: wallMaxZ,
      },
      {
        id: `${farm.id}-east-wall`,
        minX: farm.x + 4.65,
        maxX: farm.x + 5.25,
        minZ: wallMinZ,
        maxZ: wallMaxZ,
      },
      {
        id: `${farm.id}-front-left`,
        minX: farm.x - 5.25,
        maxX: farm.x - 0.95,
        minZ: frontWallZ - 0.3,
        maxZ: frontWallZ + 0.3,
      },
      {
        id: `${farm.id}-front-right`,
        minX: farm.x + 0.95,
        maxX: farm.x + 5.25,
        minZ: frontWallZ - 0.3,
        maxZ: frontWallZ + 0.3,
      },
      {
        id: `${farm.id}-perimeter-fence-back`,
        minX: farm.x - farm.fenceHalfW - 0.25,
        maxX: farm.x + farm.fenceHalfW + 0.25,
        minZ: backFenceZ - 0.25,
        maxZ: backFenceZ + 0.25,
        maxY: farm.height + 1.15,
      },
      {
        id: `${farm.id}-perimeter-fence-west`,
        minX: farm.x - farm.fenceHalfW - 0.25,
        maxX: farm.x - farm.fenceHalfW + 0.25,
        minZ: farm.z - farm.fenceHalfD - 0.25,
        maxZ: farm.z + farm.fenceHalfD + 0.25,
        maxY: farm.height + 1.15,
      },
      {
        id: `${farm.id}-perimeter-fence-east`,
        minX: farm.x + farm.fenceHalfW - 0.25,
        maxX: farm.x + farm.fenceHalfW + 0.25,
        minZ: farm.z - farm.fenceHalfD - 0.25,
        maxZ: farm.z + farm.fenceHalfD + 0.25,
        maxY: farm.height + 1.15,
      },
      {
        id: `${farm.id}-perimeter-fence-front-left`,
        minX: farm.x - farm.fenceHalfW - 0.25,
        maxX: farm.x - farm.gateHalfW,
        minZ: frontFenceZ - 0.25,
        maxZ: frontFenceZ + 0.25,
        maxY: farm.height + 1.15,
      },
      {
        id: `${farm.id}-perimeter-fence-front-right`,
        minX: farm.x + farm.gateHalfW,
        maxX: farm.x + farm.fenceHalfW + 0.25,
        minZ: frontFenceZ - 0.25,
        maxZ: frontFenceZ + 0.25,
        maxY: farm.height + 1.15,
      },
    ];
  }),
  {
    id: 'southern-mine-shaft-west-wall',
    minX: SOUTHERN_MINE_POS.x - SOUTHERN_MINE_POS.tunnelHalfW - 1.4,
    maxX: SOUTHERN_MINE_POS.x - SOUTHERN_MINE_POS.tunnelHalfW,
    minZ: SOUTHERN_MINE_POS.entranceZ - 0.5,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 34.2,
    maxY: 6.8,
  },
  {
    id: 'southern-mine-shaft-east-wall',
    minX: SOUTHERN_MINE_POS.x + SOUTHERN_MINE_POS.tunnelHalfW,
    maxX: SOUTHERN_MINE_POS.x + SOUTHERN_MINE_POS.tunnelHalfW + 1.4,
    minZ: SOUTHERN_MINE_POS.entranceZ - 0.5,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 34.2,
    maxY: 6.8,
  },
  {
    id: 'southern-mine-r1-north-west',
    minX: SOUTHERN_MINE_POS.x - 15.0,
    maxX: SOUTHERN_MINE_POS.x - SOUTHERN_MINE_POS.tunnelHalfW,
    minZ: SOUTHERN_MINE_POS.entranceZ + 33.0,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 34.2,
    maxY: 2.0,
  },
  {
    id: 'southern-mine-r1-north-east',
    minX: SOUTHERN_MINE_POS.x + SOUTHERN_MINE_POS.tunnelHalfW,
    maxX: SOUTHERN_MINE_POS.x + 15.0,
    minZ: SOUTHERN_MINE_POS.entranceZ + 33.0,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 34.2,
    maxY: 2.0,
  },
  {
    id: 'southern-mine-partition-west-north',
    minX: SOUTHERN_MINE_POS.x - 26.0,
    maxX: SOUTHERN_MINE_POS.x - 14.0,
    minZ: SOUTHERN_MINE_POS.entranceZ + 34.0,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 45.0,
    maxY: 2.0,
  },
  {
    id: 'southern-mine-partition-west-mid',
    minX: SOUTHERN_MINE_POS.x - 26.0,
    maxX: SOUTHERN_MINE_POS.x - 14.0,
    minZ: SOUTHERN_MINE_POS.entranceZ + 53.0,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 85.0,
    maxY: 2.0,
  },
  {
    id: 'southern-mine-partition-west-south',
    minX: SOUTHERN_MINE_POS.x - 26.0,
    maxX: SOUTHERN_MINE_POS.x - 16.0,
    minZ: SOUTHERN_MINE_POS.entranceZ + 93.0,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 110.5,
    maxY: 2.0,
  },
  {
    id: 'southern-mine-partition-east-north',
    minX: SOUTHERN_MINE_POS.x + 14.0,
    maxX: SOUTHERN_MINE_POS.x + 26.0,
    minZ: SOUTHERN_MINE_POS.entranceZ + 34.0,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 45.0,
    maxY: 2.0,
  },
  {
    id: 'southern-mine-partition-east-mid',
    minX: SOUTHERN_MINE_POS.x + 14.0,
    maxX: SOUTHERN_MINE_POS.x + 26.0,
    minZ: SOUTHERN_MINE_POS.entranceZ + 53.0,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 85.0,
    maxY: 2.0,
  },
  {
    id: 'southern-mine-partition-east-south',
    minX: SOUTHERN_MINE_POS.x + 16.0,
    maxX: SOUTHERN_MINE_POS.x + 26.0,
    minZ: SOUTHERN_MINE_POS.entranceZ + 93.0,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 110.5,
    maxY: 2.0,
  },
  {
    id: 'southern-mine-partition-center-west',
    minX: SOUTHERN_MINE_POS.x - 16.0,
    maxX: SOUTHERN_MINE_POS.x - 4.5,
    minZ: SOUTHERN_MINE_POS.entranceZ + 64.0,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 78.0,
    maxY: 2.0,
  },
  {
    id: 'southern-mine-partition-center-east',
    minX: SOUTHERN_MINE_POS.x + 4.5,
    maxX: SOUTHERN_MINE_POS.x + 16.0,
    minZ: SOUTHERN_MINE_POS.entranceZ + 64.0,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 78.0,
    maxY: 2.0,
  },
  {
    id: 'southern-mine-r2-north-wall',
    minX: SOUTHERN_MINE_POS.x - 53.5,
    maxX: SOUTHERN_MINE_POS.x - 25.5,
    minZ: SOUTHERN_MINE_POS.entranceZ + 34.5,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 36.0,
    maxY: 2.0,
  },
  {
    id: 'southern-mine-r2-west-wall',
    minX: SOUTHERN_MINE_POS.x - 53.5,
    maxX: SOUTHERN_MINE_POS.x - 52.0,
    minZ: SOUTHERN_MINE_POS.entranceZ + 34.5,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 97.5,
    maxY: 2.0,
  },
  {
    id: 'southern-mine-r2-south-wall',
    minX: SOUTHERN_MINE_POS.x - 53.5,
    maxX: SOUTHERN_MINE_POS.x - 25.5,
    minZ: SOUTHERN_MINE_POS.entranceZ + 96.0,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 97.5,
    maxY: 2.0,
  },
  {
    id: 'southern-mine-r3-north-wall',
    minX: SOUTHERN_MINE_POS.x + 25.5,
    maxX: SOUTHERN_MINE_POS.x + 53.5,
    minZ: SOUTHERN_MINE_POS.entranceZ + 34.5,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 36.0,
    maxY: 2.0,
  },
  {
    id: 'southern-mine-r3-east-wall',
    minX: SOUTHERN_MINE_POS.x + 52.0,
    maxX: SOUTHERN_MINE_POS.x + 53.5,
    minZ: SOUTHERN_MINE_POS.entranceZ + 34.5,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 97.5,
    maxY: 2.0,
  },
  {
    id: 'southern-mine-r3-south-wall',
    minX: SOUTHERN_MINE_POS.x + 25.5,
    maxX: SOUTHERN_MINE_POS.x + 53.5,
    minZ: SOUTHERN_MINE_POS.entranceZ + 96.0,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 97.5,
    maxY: 2.0,
  },
  {
    id: 'southern-mine-r4-west-wall',
    minX: SOUTHERN_MINE_POS.x - 17.5,
    maxX: SOUTHERN_MINE_POS.x - 16.0,
    minZ: SOUTHERN_MINE_POS.entranceZ + 93.0,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 111.5,
    maxY: 2.0,
  },
  {
    id: 'southern-mine-r4-east-wall',
    minX: SOUTHERN_MINE_POS.x + 16.0,
    maxX: SOUTHERN_MINE_POS.x + 17.5,
    minZ: SOUTHERN_MINE_POS.entranceZ + 93.0,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 111.5,
    maxY: 2.0,
  },
  {
    id: 'southern-mine-r4-back-wall',
    minX: SOUTHERN_MINE_POS.x - 17.5,
    maxX: SOUTHERN_MINE_POS.x + 17.5,
    minZ: SOUTHERN_MINE_POS.entranceZ + 110.0,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 111.8,
    maxY: 2.0,
  },
  {
    id: 'stable-back-wall',
    minX: HUNTER_LODGE_POS.x - 16.4,
    maxX: HUNTER_LODGE_POS.x - 8.6,
    minZ: HUNTER_LODGE_POS.z + 5.7,
    maxZ: HUNTER_LODGE_POS.z + 6.3,
  },
  {
    id: 'stable-west-wall',
    minX: HUNTER_LODGE_POS.x - 16.35,
    maxX: HUNTER_LODGE_POS.x - 15.85,
    minZ: HUNTER_LODGE_POS.z + 1.1,
    maxZ: HUNTER_LODGE_POS.z + 6.0,
  },
  {
    id: 'stable-east-wall',
    minX: HUNTER_LODGE_POS.x - 9.15,
    maxX: HUNTER_LODGE_POS.x - 8.65,
    minZ: HUNTER_LODGE_POS.z + 1.1,
    maxZ: HUNTER_LODGE_POS.z + 6.0,
  },
  {
    id: 'windmill-lower-tower',
    minX: RIVERSIDE_WINDMILLS[0].x - 2.95,
    maxX: RIVERSIDE_WINDMILLS[0].x + 2.95,
    minZ: RIVERSIDE_WINDMILLS[0].z - 2.95,
    maxZ: RIVERSIDE_WINDMILLS[0].z + 2.95,
  },
  {
    id: 'windmill-upper-tower',
    minX: RIVERSIDE_WINDMILLS[1].x - 2.95,
    maxX: RIVERSIDE_WINDMILLS[1].x + 2.95,
    minZ: RIVERSIDE_WINDMILLS[1].z - 2.95,
    maxZ: RIVERSIDE_WINDMILLS[1].z + 2.95,
  },
  { id: 'main-hall-back-wall', minX: -22.3, maxX: 22.3, minZ: -216.3 + FZ, maxZ: -215.2 + FZ },
  { id: 'main-hall-west-wall', minX: -22.3, maxX: -21.2, minZ: -216.3 + FZ, maxZ: -189.3 + FZ },
  { id: 'main-hall-east-wall', minX: 21.2, maxX: 22.3, minZ: -216.3 + FZ, maxZ: -189.3 + FZ },
  { id: 'main-hall-front-west', minX: -22.3, maxX: -2.2, minZ: -190.3 + FZ, maxZ: -189.3 + FZ },
  { id: 'main-hall-front-east', minX: 2.2, maxX: 22.3, minZ: -190.3 + FZ, maxZ: -189.3 + FZ },
  { id: 'main-hall-front-window-sill', minX: -5.2, maxX: 5.2, minZ: -190.3 + FZ, maxZ: -189.3 + FZ, minY: 31.2 + FY },
  { id: 'west-pav-back-wall', minX: -39.3, maxX: -20.7, minZ: -172.0 + FZ, maxZ: -170.9 + FZ },
  { id: 'west-pav-west-wall', minX: -39.3, maxX: -38.2, minZ: -172.0 + FZ, maxZ: -156.0 + FZ },
  { id: 'west-pav-east-wall', minX: -21.8, maxX: -20.7, minZ: -172.0 + FZ, maxZ: -156.0 + FZ },
  { id: 'west-pav-front-left', minX: -39.3, maxX: -31.6, minZ: -157.0 + FZ, maxZ: -156.0 + FZ },
  { id: 'west-pav-front-right', minX: -28.4, maxX: -20.7, minZ: -157.0 + FZ, maxZ: -156.0 + FZ },
  { id: 'west-pav-front-upper', minX: -32.2, maxX: -27.8, minZ: -157.0 + FZ, maxZ: -156.0 + FZ, minY: 30.2 + FY },
  { id: 'east-pav-back-wall', minX: 20.7, maxX: 39.3, minZ: -172.0 + FZ, maxZ: -170.9 + FZ },
  { id: 'east-pav-west-wall', minX: 20.7, maxX: 21.8, minZ: -172.0 + FZ, maxZ: -156.0 + FZ },
  { id: 'east-pav-east-wall', minX: 38.2, maxX: 39.3, minZ: -172.0 + FZ, maxZ: -156.0 + FZ },
  { id: 'east-pav-front-left', minX: 20.7, maxX: 28.4, minZ: -157.0 + FZ, maxZ: -156.0 + FZ },
  { id: 'east-pav-front-right', minX: 31.6, maxX: 39.3, minZ: -157.0 + FZ, maxZ: -156.0 + FZ },
  { id: 'east-pav-front-upper', minX: 27.8, maxX: 32.2, minZ: -157.0 + FZ, maxZ: -156.0 + FZ, minY: 30.2 + FY },
  { id: 'sw-wt-outer-west', minX: -52.2, maxX: -50.4, minZ: -134.5 + FZ, maxZ: -122.5 + FZ, maxY: 32.15 + FY },
  { id: 'sw-wt-outer-south', minX: -51.5, maxX: -39.6, minZ: -123.6 + FZ, maxZ: -122.0 + FZ, maxY: 32.15 + FY },
  { id: 'sw-wt-inner-east-courtyard', minX: -40.5, maxX: -39.5, minZ: -134.4 + FZ, maxZ: -126.6 + FZ, maxY: 32.15 + FY },
  { id: 'sw-wt-inner-east-rampart-f1', minX: -40.5, maxX: -39.5, minZ: -126.6 + FZ, maxZ: -122.8 + FZ, maxY: 30.6 + FY },
  { id: 'sw-wt-inner-east-f3', minX: -40.5, maxX: -39.5, minZ: -134.4 + FZ, maxZ: -122.8 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'sw-wt-door-left-f1', minX: -51.2, maxX: -46.9, minZ: -134.5 + FZ, maxZ: -133.5 + FZ, maxY: 30.6 + FY },
  { id: 'sw-wt-door-right-ladder-wall', minX: -44.1, maxX: -39.5, minZ: -134.5 + FZ, maxZ: -133.5 + FZ, maxY: 32.15 + FY },
  { id: 'sw-wt-north-upper-parapet', minX: -46.8, maxX: -39.5, minZ: -134.5 + FZ, maxZ: -133.5 + FZ, minY: 30.6 + FY, maxY: 32.15 + FY },
  { id: 'sw-wt-north-f3', minX: -51.2, maxX: -39.5, minZ: -134.5 + FZ, maxZ: -133.5 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'sw-wt-west-f3', minX: -52.2, maxX: -50.4, minZ: -134.5 + FZ, maxZ: -122.5 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'sw-wt-south-f3', minX: -51.5, maxX: -39.6, minZ: -123.6 + FZ, maxZ: -122.0 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'se-wt-outer-east', minX: 50.4, maxX: 52.2, minZ: -134.5 + FZ, maxZ: -122.5 + FZ, maxY: 32.15 + FY },
  { id: 'se-wt-outer-south', minX: 39.6, maxX: 51.5, minZ: -123.6 + FZ, maxZ: -122.0 + FZ, maxY: 32.15 + FY },
  { id: 'se-wt-inner-west-courtyard', minX: 39.5, maxX: 40.5, minZ: -134.4 + FZ, maxZ: -126.6 + FZ, maxY: 32.15 + FY },
  { id: 'se-wt-inner-west-rampart-f1', minX: 39.5, maxX: 40.5, minZ: -126.6 + FZ, maxZ: -122.8 + FZ, maxY: 30.6 + FY },
  { id: 'se-wt-inner-west-f3', minX: 39.5, maxX: 40.5, minZ: -134.4 + FZ, maxZ: -122.8 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'se-wt-door-left-ladder-wall', minX: 39.5, maxX: 44.1, minZ: -134.5 + FZ, maxZ: -133.5 + FZ, maxY: 32.15 + FY },
  { id: 'se-wt-door-right-f1', minX: 46.9, maxX: 51.2, minZ: -134.5 + FZ, maxZ: -133.5 + FZ, maxY: 30.6 + FY },
  { id: 'se-wt-north-upper-parapet', minX: 39.5, maxX: 46.8, minZ: -134.5 + FZ, maxZ: -133.5 + FZ, minY: 30.6 + FY, maxY: 32.15 + FY },
  { id: 'se-wt-north-f3', minX: 39.5, maxX: 51.2, minZ: -134.5 + FZ, maxZ: -133.5 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'se-wt-east-f3', minX: 50.4, maxX: 52.2, minZ: -134.5 + FZ, maxZ: -122.5 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'se-wt-south-f3', minX: 39.6, maxX: 51.5, minZ: -123.6 + FZ, maxZ: -122.0 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'nw-wt-outer-west', minX: -52.2, maxX: -50.4, minZ: -219.5 + FZ, maxZ: -207.5 + FZ, maxY: 32.15 + FY },
  { id: 'nw-wt-outer-north', minX: -51.5, maxX: -39.6, minZ: -220.0 + FZ, maxZ: -218.4 + FZ, maxY: 32.15 + FY },
  { id: 'nw-wt-inner-east-courtyard', minX: -40.5, maxX: -39.5, minZ: -215.4 + FZ, maxZ: -207.6 + FZ, maxY: 32.15 + FY },
  { id: 'nw-wt-inner-east-rampart-f1', minX: -40.5, maxX: -39.5, minZ: -219.2 + FZ, maxZ: -215.4 + FZ, maxY: 30.6 + FY },
  { id: 'nw-wt-inner-east-f3', minX: -40.5, maxX: -39.5, minZ: -219.2 + FZ, maxZ: -207.6 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'nw-wt-door-left-f1', minX: -51.2, maxX: -46.9, minZ: -208.5 + FZ, maxZ: -207.5 + FZ, maxY: 30.6 + FY },
  { id: 'nw-wt-door-right-ladder-wall', minX: -44.1, maxX: -39.5, minZ: -208.5 + FZ, maxZ: -207.5 + FZ, maxY: 32.15 + FY },
  { id: 'nw-wt-south-upper-parapet', minX: -46.8, maxX: -39.5, minZ: -208.5 + FZ, maxZ: -207.5 + FZ, minY: 30.6 + FY, maxY: 32.15 + FY },
  { id: 'nw-wt-south-f3', minX: -51.2, maxX: -39.5, minZ: -208.5 + FZ, maxZ: -207.5 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'nw-wt-west-f3', minX: -52.2, maxX: -50.4, minZ: -219.5 + FZ, maxZ: -207.5 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'nw-wt-north-f3', minX: -51.5, maxX: -39.6, minZ: -220.0 + FZ, maxZ: -218.4 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'ne-wt-outer-east', minX: 50.4, maxX: 52.2, minZ: -219.5 + FZ, maxZ: -207.5 + FZ, maxY: 32.15 + FY },
  { id: 'ne-wt-outer-north', minX: 39.6, maxX: 51.5, minZ: -220.0 + FZ, maxZ: -218.4 + FZ, maxY: 32.15 + FY },
  { id: 'ne-wt-inner-west-courtyard', minX: 39.5, maxX: 40.5, minZ: -215.4 + FZ, maxZ: -207.6 + FZ, maxY: 32.15 + FY },
  { id: 'ne-wt-inner-west-rampart-f1', minX: 39.5, maxX: 40.5, minZ: -219.2 + FZ, maxZ: -215.4 + FZ, maxY: 30.6 + FY },
  { id: 'ne-wt-inner-west-f3', minX: 39.5, maxX: 40.5, minZ: -219.2 + FZ, maxZ: -207.6 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'ne-wt-door-left-ladder-wall', minX: 39.5, maxX: 44.1, minZ: -208.5 + FZ, maxZ: -207.5 + FZ, maxY: 32.15 + FY },
  { id: 'ne-wt-door-right-f1', minX: 46.9, maxX: 51.2, minZ: -208.5 + FZ, maxZ: -207.5 + FZ, maxY: 30.6 + FY },
  { id: 'ne-wt-south-upper-parapet', minX: 39.5, maxX: 46.8, minZ: -208.5 + FZ, maxZ: -207.5 + FZ, minY: 30.6 + FY, maxY: 32.15 + FY },
  { id: 'ne-wt-south-f3', minX: 39.5, maxX: 51.2, minZ: -208.5 + FZ, maxZ: -207.5 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'ne-wt-east-f3', minX: 50.4, maxX: 52.2, minZ: -219.5 + FZ, maxZ: -207.5 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'ne-wt-north-f3', minX: 39.6, maxX: 51.5, minZ: -220.0 + FZ, maxZ: -218.4 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'fortress-thick-wall-south-west', minX: -40.0, maxX: -4.2, minZ: -126.2 + FZ, maxZ: -121.8 + FZ, maxY: 30.7 + FY },
  { id: 'fortress-thick-wall-south-east', minX: 4.2, maxX: 40.0, minZ: -126.2 + FZ, maxZ: -121.8 + FZ, maxY: 30.7 + FY },
  { id: 'fortress-thick-wall-west', minX: -52.2, maxX: -47.8, minZ: -208.0 + FZ, maxZ: -134.0 + FZ, maxY: 30.7 + FY },
  { id: 'fortress-thick-wall-east', minX: 47.8, maxX: 52.2, minZ: -208.0 + FZ, maxZ: -134.0 + FZ, maxY: 30.7 + FY },
  { id: 'fortress-thick-wall-north', minX: -40.0, maxX: 40.0, minZ: -220.2 + FZ, maxZ: -215.8 + FZ, maxY: 30.7 + FY },
  { id: 'rampart-outer-west', minX: -52.8, maxX: -51.4, minZ: -220.8 + FZ, maxZ: -121.5 + FZ, minY: 30.5 + FY, maxY: 32.15 + FY },
  { id: 'rampart-outer-east', minX: 51.4, maxX: 52.8, minZ: -220.8 + FZ, maxZ: -121.5 + FZ, minY: 30.5 + FY, maxY: 32.15 + FY },
  { id: 'rampart-outer-north', minX: -52.8, maxX: 52.8, minZ: -220.8 + FZ, maxZ: -219.4 + FZ, minY: 30.5 + FY, maxY: 32.15 + FY },
  { id: 'rampart-outer-south-west', minX: -52.8, maxX: -4.2, minZ: -122.6 + FZ, maxZ: -121.4 + FZ, minY: 30.5 + FY, maxY: 32.15 + FY },
  { id: 'rampart-outer-south-east', minX: 4.2, maxX: 52.8, minZ: -122.6 + FZ, maxZ: -121.4 + FZ, minY: 30.5 + FY, maxY: 32.15 + FY },
  { id: 'rampart-stair-top-fence-north-west', minX: -48.0, maxX: -44.0, minZ: -157.0 + FZ, maxZ: -156.2 + FZ, minY: 28.0 + FY, maxY: 32.15 + FY },
  { id: 'rampart-stair-top-fence-north-east', minX: 44.0, maxX: 48.0, minZ: -157.0 + FZ, maxZ: -156.2 + FZ, minY: 28.0 + FY, maxY: 32.15 + FY },
  { id: 'rampart-stair-side-fence-west', minX: -44.6, maxX: -43.9, minZ: -157.0 + FZ, maxZ: -142.2 + FZ, minY: 26.8 + FY, maxY: 32.15 + FY },
  { id: 'rampart-stair-side-fence-east', minX: 43.9, maxX: 44.6, minZ: -157.0 + FZ, maxZ: -142.2 + FZ, minY: 26.8 + FY, maxY: 32.15 + FY },
  { id: 'mid-terrace-fence-front-west', minX: -14.8, maxX: -3.95, minZ: -104.35 + FZ, maxZ: -103.65 + FZ, maxY: 23.0 + FY },
  { id: 'mid-terrace-fence-front-east', minX: 3.95, maxX: 14.8, minZ: -104.35 + FZ, maxZ: -103.65 + FZ, maxY: 23.0 + FY },
  { id: 'mid-terrace-fence-side-west', minX: -14.9, maxX: -14.1, minZ: -114.4 + FZ, maxZ: -103.6 + FZ, maxY: 23.0 + FY },
  { id: 'mid-terrace-fence-side-east', minX: 14.1, maxX: 14.9, minZ: -114.4 + FZ, maxZ: -103.6 + FZ, maxY: 23.0 + FY },
  { id: 'mid-terrace-fence-back-west', minX: -14.8, maxX: -3.95, minZ: -114.4 + FZ, maxZ: -113.7 + FZ, maxY: 23.0 + FY },
  { id: 'mid-terrace-fence-back-east', minX: 3.95, maxX: 14.8, minZ: -114.4 + FZ, maxZ: -113.7 + FZ, maxY: 23.0 + FY },
  { id: 'fortress-stair-rail-west-lower', minX: -4.7, maxX: -3.85, minZ: -104.2 + FZ, maxZ: -77.8 + FZ, maxY: 23.0 + FY },
  { id: 'fortress-stair-rail-east-lower', minX: 3.85, maxX: 4.7, minZ: -104.2 + FZ, maxZ: -77.8 + FZ, maxY: 23.0 + FY },
  { id: 'fortress-stair-rail-west-upper', minX: -4.7, maxX: -3.85, minZ: -122.2 + FZ, maxZ: -113.8 + FZ, maxY: 27.0 + FY },
  { id: 'fortress-stair-rail-east-upper', minX: 3.85, maxX: 4.7, minZ: -122.2 + FZ, maxZ: -113.8 + FZ, maxY: 27.0 + FY },
  { id: 'fortress-incense-west', minX: -10.4, maxX: -8.6, minZ: -152.9 + FZ, maxZ: -151.1 + FZ, maxY: 27.15 + FY },
  { id: 'fortress-incense-east', minX: 8.6, maxX: 10.4, minZ: -152.9 + FZ, maxZ: -151.1 + FZ, maxY: 27.15 + FY },
  {
    id: 'sakura-buddha-pedestal',
    minX: SAKURA_SANCTUARY_POS.x + Math.sin(SAKURA_SANCTUARY_YAW) * -14.0 - 4.2,
    maxX: SAKURA_SANCTUARY_POS.x + Math.sin(SAKURA_SANCTUARY_YAW) * -14.0 + 4.2,
    minZ: SAKURA_SANCTUARY_POS.z + Math.cos(SAKURA_SANCTUARY_YAW) * -14.0 - 4.2,
    maxZ: SAKURA_SANCTUARY_POS.z + Math.cos(SAKURA_SANCTUARY_YAW) * -14.0 + 4.2,
  },
  { id: 'harbor-tavern-back-wall', minX: 215.8, maxX: 232.2, minZ: 223.7, maxZ: 224.3, maxY: 9.8 },
  { id: 'harbor-tavern-west-wall', minX: 215.7, maxX: 216.3, minZ: 223.8, maxZ: 236.2, maxY: 9.8 },
  { id: 'harbor-tavern-east-wall', minX: 231.7, maxX: 232.3, minZ: 223.8, maxZ: 236.2, maxY: 9.8 },
  { id: 'harbor-tavern-front-left', minX: 215.8, maxX: 222.8, minZ: 235.7, maxZ: 236.3, maxY: 9.8 },
  { id: 'harbor-tavern-front-right', minX: 225.2, maxX: 232.2, minZ: 235.7, maxZ: 236.3, maxY: 9.8 },
  { id: 'harbor-tavern-bar', minX: 217.5, maxX: 227.5, minZ: 226.2, maxZ: 227.4, maxY: 4.5 },
  { id: 'harbor-wall-west-north', minX: 199.1, maxX: 200.9, minZ: 213.5, maxZ: 235.6, maxY: 10.5 },
  { id: 'harbor-gate-tower-north', minX: 197.5, maxX: 202.5, minZ: 235.5, maxZ: 240.2, maxY: 15.5 },
  { id: 'harbor-gate-tower-south', minX: 197.5, maxX: 202.5, minZ: 247.8, maxZ: 252.5, maxY: 15.5 },
  { id: 'harbor-wall-west-south', minX: 199.1, maxX: 200.9, minZ: 252.4, maxZ: 312.5, maxY: 10.5 },
  { id: 'harbor-wall-north-west', minX: 199.5, maxX: 234.2, minZ: 213.2, maxZ: 214.8, maxY: 10.5 },
  { id: 'harbor-wall-north-east', minX: 241.8, maxX: 255.6, minZ: 213.2, maxZ: 214.8, maxY: 10.5 },
  { id: 'harbor-wall-south', minX: 199.5, maxX: 255.6, minZ: 311.2, maxZ: 312.8, maxY: 10.5 },
  { id: 'harbor-fountain-basin', minX: 227.8, maxX: 236.2, minZ: 247.8, maxZ: 256.2, maxY: 4.25 },
  { id: 'harbor-warehouse-south-wall', minX: 209.3, maxX: 226.7, minZ: 282.2, maxZ: 282.8, maxY: 10.2 },
  { id: 'harbor-warehouse-west-wall', minX: 209.2, maxX: 209.8, minZ: 271.3, maxZ: 282.7, maxY: 10.2 },
  { id: 'harbor-warehouse-east-wall', minX: 226.2, maxX: 226.8, minZ: 271.3, maxZ: 282.7, maxY: 10.2 },
  { id: 'harbor-warehouse-north-left', minX: 209.3, maxX: 216.6, minZ: 271.2, maxZ: 271.8, maxY: 10.2 },
  { id: 'harbor-warehouse-north-right', minX: 219.4, maxX: 226.7, minZ: 271.2, maxZ: 271.8, maxY: 10.2 },
  { id: 'harbor-lighthouse-north-wall', minX: 248.0, maxX: 256.0, minZ: 197.8, maxZ: 198.5, maxY: 25.4 },
  { id: 'harbor-lighthouse-west-wall', minX: 247.8, maxX: 248.5, minZ: 198.0, maxZ: 206.0, maxY: 25.4 },
  { id: 'harbor-lighthouse-east-wall', minX: 255.5, maxX: 256.2, minZ: 198.0, maxZ: 206.0, maxY: 25.4 },
  { id: 'harbor-lighthouse-south-left', minX: 247.8, maxX: 250.9, minZ: 205.5, maxZ: 206.2, maxY: 25.4 },
  { id: 'harbor-lighthouse-south-right', minX: 253.1, maxX: 256.2, minZ: 205.5, maxZ: 206.2, maxY: 25.4 },
  { id: 'harbor-lighthouse-top-rail-n', minX: 247.6, maxX: 256.4, minZ: 197.4, maxZ: 197.8, minY: 25.0, maxY: 26.45 },
  { id: 'harbor-lighthouse-top-rail-s', minX: 247.6, maxX: 256.4, minZ: 206.2, maxZ: 206.6, minY: 25.0, maxY: 26.45 },
  { id: 'harbor-lighthouse-top-rail-w', minX: 247.4, maxX: 247.8, minZ: 197.4, maxZ: 206.6, minY: 25.0, maxY: 26.45 },
  { id: 'harbor-lighthouse-top-rail-e', minX: 256.2, maxX: 256.6, minZ: 197.4, maxZ: 206.6, minY: 25.0, maxY: 26.45 },
  { id: 'galleon-rail-port-bow', minX: 275.4, maxX: 276.0, minZ: 231.0, maxZ: 249.6, minY: 3.4, maxY: 4.7 },
  { id: 'galleon-rail-port-stern', minX: 275.4, maxX: 276.0, minZ: 254.4, maxZ: 272.8, minY: 3.4, maxY: 7.7 },
  { id: 'galleon-rail-starboard', minX: 288.0, maxX: 288.6, minZ: 231.0, maxZ: 272.8, minY: 3.4, maxY: 7.7 },
  { id: 'galleon-rail-bow', minX: 275.4, maxX: 288.6, minZ: 230.8, maxZ: 231.4, minY: 3.4, maxY: 4.8 },
  { id: 'galleon-rail-stern', minX: 275.4, maxX: 288.6, minZ: 272.5, maxZ: 273.1, minY: 3.4, maxY: 7.8 },
  { id: 'galleon-cabin-front-left', minX: 278.9, maxX: 280.7, minZ: 259.2, maxZ: 259.8, minY: 3.5, maxY: 6.45 },
  { id: 'galleon-cabin-front-right', minX: 283.3, maxX: 285.1, minZ: 259.2, maxZ: 259.8, minY: 3.5, maxY: 6.45 },
  { id: 'sw-observatory-north-wall', minX: SOUTHWEST_OASIS_POS.observatoryX - 4.8, maxX: SOUTHWEST_OASIS_POS.observatoryX + 4.8, minZ: SOUTHWEST_OASIS_POS.observatoryZ - 5.1, maxZ: SOUTHWEST_OASIS_POS.observatoryZ - 4.4, maxY: 21.4 },
  { id: 'sw-observatory-west-wall', minX: SOUTHWEST_OASIS_POS.observatoryX - 5.1, maxX: SOUTHWEST_OASIS_POS.observatoryX - 4.4, minZ: SOUTHWEST_OASIS_POS.observatoryZ - 4.9, maxZ: SOUTHWEST_OASIS_POS.observatoryZ + 4.9, maxY: 21.4 },
  { id: 'sw-observatory-east-wall', minX: SOUTHWEST_OASIS_POS.observatoryX + 4.4, maxX: SOUTHWEST_OASIS_POS.observatoryX + 5.1, minZ: SOUTHWEST_OASIS_POS.observatoryZ - 4.9, maxZ: SOUTHWEST_OASIS_POS.observatoryZ + 4.9, maxY: 21.4 },
  { id: 'sw-observatory-south-left', minX: SOUTHWEST_OASIS_POS.observatoryX - 4.8, maxX: SOUTHWEST_OASIS_POS.observatoryX - 1.25, minZ: SOUTHWEST_OASIS_POS.observatoryZ + 4.5, maxZ: SOUTHWEST_OASIS_POS.observatoryZ + 5.2, maxY: 21.4 },
  { id: 'sw-observatory-south-right', minX: SOUTHWEST_OASIS_POS.observatoryX + 1.25, maxX: SOUTHWEST_OASIS_POS.observatoryX + 4.8, minZ: SOUTHWEST_OASIS_POS.observatoryZ + 4.5, maxZ: SOUTHWEST_OASIS_POS.observatoryZ + 5.2, maxY: 21.4 },
  { id: 'sw-observatory-top-rail-n', minX: SOUTHWEST_OASIS_POS.observatoryX - 5.2, maxX: SOUTHWEST_OASIS_POS.observatoryX + 5.2, minZ: SOUTHWEST_OASIS_POS.observatoryZ - 5.4, maxZ: SOUTHWEST_OASIS_POS.observatoryZ - 5.0, minY: 21.0, maxY: 22.45 },
  { id: 'sw-observatory-top-rail-s', minX: SOUTHWEST_OASIS_POS.observatoryX - 5.2, maxX: SOUTHWEST_OASIS_POS.observatoryX + 5.2, minZ: SOUTHWEST_OASIS_POS.observatoryZ + 5.0, maxZ: SOUTHWEST_OASIS_POS.observatoryZ + 5.4, minY: 21.0, maxY: 22.45 },
  { id: 'sw-observatory-top-rail-w', minX: SOUTHWEST_OASIS_POS.observatoryX - 5.4, maxX: SOUTHWEST_OASIS_POS.observatoryX - 5.0, minZ: SOUTHWEST_OASIS_POS.observatoryZ - 5.4, maxZ: SOUTHWEST_OASIS_POS.observatoryZ + 5.4, minY: 21.0, maxY: 22.45 },
  { id: 'sw-observatory-top-rail-e', minX: SOUTHWEST_OASIS_POS.observatoryX + 5.0, maxX: SOUTHWEST_OASIS_POS.observatoryX + 5.4, minZ: SOUTHWEST_OASIS_POS.observatoryZ - 5.4, maxZ: SOUTHWEST_OASIS_POS.observatoryZ + 5.4, minY: 21.0, maxY: 22.45 },
  { id: 'sw-alchemist-west-wall', minX: SOUTHWEST_OASIS_POS.pavilionX - 5.5, maxX: SOUTHWEST_OASIS_POS.pavilionX - 4.9, minZ: SOUTHWEST_OASIS_POS.pavilionZ - 6.6, maxZ: SOUTHWEST_OASIS_POS.pavilionZ + 6.6, maxY: 11.2 },
  { id: 'sw-alchemist-north-wall', minX: SOUTHWEST_OASIS_POS.pavilionX - 5.4, maxX: SOUTHWEST_OASIS_POS.pavilionX + 5.4, minZ: SOUTHWEST_OASIS_POS.pavilionZ - 6.7, maxZ: SOUTHWEST_OASIS_POS.pavilionZ - 6.1, maxY: 11.2 },
  { id: 'sw-alchemist-south-wall', minX: SOUTHWEST_OASIS_POS.pavilionX - 5.4, maxX: SOUTHWEST_OASIS_POS.pavilionX + 5.4, minZ: SOUTHWEST_OASIS_POS.pavilionZ + 6.1, maxZ: SOUTHWEST_OASIS_POS.pavilionZ + 6.7, maxY: 11.2 },
  { id: 'sw-alchemist-east-north', minX: SOUTHWEST_OASIS_POS.pavilionX + 4.9, maxX: SOUTHWEST_OASIS_POS.pavilionX + 5.5, minZ: SOUTHWEST_OASIS_POS.pavilionZ - 6.6, maxZ: SOUTHWEST_OASIS_POS.pavilionZ - 1.25, maxY: 11.2 },
  { id: 'sw-alchemist-east-south', minX: SOUTHWEST_OASIS_POS.pavilionX + 4.9, maxX: SOUTHWEST_OASIS_POS.pavilionX + 5.5, minZ: SOUTHWEST_OASIS_POS.pavilionZ + 1.25, maxZ: SOUTHWEST_OASIS_POS.pavilionZ + 6.6, maxY: 11.2 },
  { id: 'sw-oasis-fountain-basin', minX: SOUTHWEST_OASIS_POS.fountainX - 3.4, maxX: SOUTHWEST_OASIS_POS.fountainX + 3.4, minZ: SOUTHWEST_OASIS_POS.fountainZ - 3.4, maxZ: SOUTHWEST_OASIS_POS.fountainZ + 3.4, maxY: 6.45 },
  ...DWARVEN_GUARDIAN_STATUES.map((st) => ({
    id: `${st.id}-pedestal`,
    minX: st.x - st.pedestalHalfSize,
    maxX: st.x + st.pedestalHalfSize,
    minZ: st.z - st.pedestalHalfSize,
    maxZ: st.z + st.pedestalHalfSize,
    maxY: st.baseY + st.totalHeight,
  })),
  ...DWARVEN_STONE_HOUSES.flatMap((dh) => {
    const backWallX = dh.x - dh.dirX * dh.halfW;
    const frontWallX = dh.x + dh.dirX * dh.halfW;
    return [
      {
        id: `${dh.id}-back-wall`,
        minX: backWallX - 0.35,
        maxX: backWallX + 0.35,
        minZ: dh.z - dh.halfD - 0.25,
        maxZ: dh.z + dh.halfD + 0.25,
        maxY: dh.terraceY + 6.2,
      },
      {
        id: `${dh.id}-north-wall`,
        minX: dh.x - dh.halfW - 0.25,
        maxX: dh.x + dh.halfW + 0.25,
        minZ: dh.z - dh.halfD - 0.35,
        maxZ: dh.z - dh.halfD + 0.35,
        maxY: dh.terraceY + 6.2,
      },
      {
        id: `${dh.id}-south-wall`,
        minX: dh.x - dh.halfW - 0.25,
        maxX: dh.x + dh.halfW + 0.25,
        minZ: dh.z + dh.halfD - 0.35,
        maxZ: dh.z + dh.halfD + 0.35,
        maxY: dh.terraceY + 6.2,
      },
      {
        id: `${dh.id}-front-north`,
        minX: frontWallX - 0.35,
        maxX: frontWallX + 0.35,
        minZ: dh.z - dh.halfD - 0.25,
        maxZ: dh.z - 1.15,
        maxY: dh.terraceY + 6.2,
      },
      {
        id: `${dh.id}-front-south`,
        minX: frontWallX - 0.35,
        maxX: frontWallX + 0.35,
        minZ: dh.z + 1.15,
        maxZ: dh.z + dh.halfD + 0.25,
        maxY: dh.terraceY + 6.2,
      },
    ];
  }),
];

export const WALKABLE_MOUNTAINS = [
  { id: 'nw-waterfall-peak', x: -60, z: -52, radius: 46, height: 24.0 },
  { id: 'north-foothill-west', x: -85, z: -105, radius: 68, height: 18.5 },
  { id: 'north-foothill-center', x: 68, z: -102, radius: 54, height: 14.5 },
  { id: 'north-snow-alpine-center', x: -65, z: -172, radius: 72, height: 29.0 },
  { id: 'north-snow-alpine-west', x: -165, z: -335, radius: 92, height: 36.0 },
  { id: 'north-snow-alpine-east', x: 160, z: -335, radius: 90, height: 33.0 },
  { id: 'ne-summit', x: 212, z: -148, radius: 92, height: 34.0 },
  { id: 'west-ridge', x: -245, z: -45, radius: 92, height: 33.0 },
  { id: 'south-distant-peak', x: -135, z: 245, radius: 88, height: 29.0 },
] as const;

export const SMALL_MEADOW_HILLS = [
  { x: 38, z: 72, r: 22, h: 3.6 },
  { x: -28, z: 96, r: 25, h: 4.1 },
  { x: 75, z: 125, r: 28, h: 4.8 },
  { x: 148, z: 95, r: 24, h: 3.9 },
  { x: -155, z: 115, r: 26, h: 4.2 },
  { x: 162, z: -18, r: 22, h: 3.5 },
] as const;

export const FLAT_BUILDING_TERRACES = [
  { x: HUNTER_LODGE_POS.x, z: HUNTER_LODGE_POS.z, innerR: 21.0, outerR: 32.0, targetH: HUNTER_LODGE_POS.height },
  { x: RIVERSIDE_WINDMILLS[0].x, z: RIVERSIDE_WINDMILLS[0].z, innerR: 8.5, outerR: 15.0, targetH: RIVERSIDE_WINDMILLS[0].height },
  { x: RIVERSIDE_WINDMILLS[1].x, z: RIVERSIDE_WINDMILLS[1].z, innerR: 8.5, outerR: 15.0, targetH: RIVERSIDE_WINDMILLS[1].height },
  { x: 30.0, z: -26.0, innerR: 6.5, outerR: 14.0, targetH: 6.4 },
  { x: -34.0, z: -16.0, innerR: 6.5, outerR: 13.0, targetH: 2.35 },
  { x: MAGIC_STONE_CIRCLE_POS.x, z: MAGIC_STONE_CIRCLE_POS.z, innerR: MAGIC_STONE_CIRCLE_POS.topFlatRadius, outerR: 16.5, targetH: MAGIC_STONE_CIRCLE_POS.height },
  { x: SOUTHERN_MINE_POS.x, z: SOUTHERN_MINE_POS.entranceZ - 8.0, innerR: 11.5, outerR: 20.0, targetH: SOUTHERN_MINE_POS.entranceFloorY },
  { x: SOUTHERN_MINE_POS.x, z: 380.0, innerR: 28.0, outerR: 42.0, targetH: SOUTHERN_MINE_POS.entranceFloorY },
  ...DWARVEN_STONE_HOUSES.map((dh) => ({
    x: dh.x,
    z: dh.z,
    innerR: 9.5,
    outerR: 16.0,
    targetH: dh.terraceY,
  })),
  { x: 0.0, z: 32.0, innerR: 5.0, outerR: 11.0, targetH: 1.95 },
  { x: 0.0, z: -73.0 + FZ, innerR: 10.0, outerR: 24.0, targetH: CHINESE_FORTRESS_POS.stairBaseHeight },
  { x: SAKURA_SANCTUARY_POS.x, z: SAKURA_SANCTUARY_POS.z, innerR: 32.0, outerR: 46.0, targetH: SAKURA_SANCTUARY_POS.height },
  { x: VALLEY_FARMS[0].x, z: VALLEY_FARMS[0].z, innerR: 25.0, outerR: 36.0, targetH: VALLEY_FARMS[0].height },
  { x: VALLEY_FARMS[1].x, z: VALLEY_FARMS[1].z, innerR: 25.0, outerR: 36.0, targetH: VALLEY_FARMS[1].height },
  { x: VALLEY_FARMS[2].x, z: VALLEY_FARMS[2].z, innerR: 25.0, outerR: 36.0, targetH: VALLEY_FARMS[2].height },
  { x: SOUTHEAST_HARBOR_POS.lighthouseX, z: SOUTHEAST_HARBOR_POS.lighthouseZ, innerR: 8.5, outerR: 18.0, targetH: SOUTHEAST_HARBOR_POS.lighthouseBaseY },
  { x: SOUTHWEST_OASIS_POS.x, z: SOUTHWEST_OASIS_POS.z, innerR: 46.0, outerR: 66.0, targetH: SOUTHWEST_OASIS_POS.terraceY },
] as const;

export const CLEAR_ZONES = [
  { x: 0, z: 32, r: 6.5 },
  { x: -14.5, z: 19.5, r: 6.5 },
  { x: 18.0, z: 2.0, r: 6.5 },
  { x: 30.0, z: -26.0, r: 8.0 },
  { x: -34.0, z: -16.0, r: 7.5 },
  { x: HUNTER_LODGE_POS.x, z: HUNTER_LODGE_POS.z, r: 19.5 },
  { x: -116.0, z: 48.0, r: 6.5 },
  { x: 78.0, z: -42.0, r: 7.5 },
  { x: RIVERSIDE_WINDMILLS[0].x, z: RIVERSIDE_WINDMILLS[0].z, r: 9.5 },
  { x: RIVERSIDE_WINDMILLS[1].x, z: RIVERSIDE_WINDMILLS[1].z, r: 9.5 },
  { x: MAGIC_STONE_CIRCLE_POS.x, z: MAGIC_STONE_CIRCLE_POS.z, r: 11.2 },
  { x: SOUTHERN_MINE_POS.x, z: SOUTHERN_MINE_POS.entranceZ - 5.0, r: 18.0 },
  { x: SOUTHERN_MINE_POS.x, z: 380.0, r: 34.0 },
  ...DWARVEN_STONE_HOUSES.map((dh) => ({ x: dh.x, z: dh.z, r: 12.0 })),
  { x: HILL_WATCHTOWERS[0].x, z: HILL_WATCHTOWERS[0].z, r: 10.5 },
  { x: HILL_WATCHTOWERS[1].x, z: HILL_WATCHTOWERS[1].z, r: 10.5 },
  { x: HILL_WATCHTOWERS[2].x, z: HILL_WATCHTOWERS[2].z, r: 10.5 },
  { x: ROPE_BRIDGE_DEF.mx, z: ROPE_BRIDGE_DEF.mz, r: 6.5 },
  { x: -55.0, z: -225.0, r: 9.0 },
  { x: 0.0, z: -171.0 + FZ, r: 78.0 },
  { x: 0.0, z: -102.0 + FZ, r: 26.0 },
  { x: WATERFALL_CLIFF_POS.x, z: WATERFALL_CLIFF_POS.z, r: 12.0 },
  { x: WATERFALL_POOL_POS.x, z: WATERFALL_POOL_POS.z, r: 13.5 },
  { x: SAKURA_SANCTUARY_POS.x, z: SAKURA_SANCTUARY_POS.z, r: 42.0 },
  { x: VALLEY_FARMS[0].x, z: VALLEY_FARMS[0].z, r: VALLEY_FARMS[0].clearRadius },
  { x: VALLEY_FARMS[1].x, z: VALLEY_FARMS[1].z, r: VALLEY_FARMS[1].clearRadius },
  { x: VALLEY_FARMS[2].x, z: VALLEY_FARMS[2].z, r: VALLEY_FARMS[2].clearRadius },
  { x: 232.0, z: 262.0, r: 68.0 },
  { x: SOUTHEAST_HARBOR_POS.lighthouseX, z: SOUTHEAST_HARBOR_POS.lighthouseZ, r: 22.0 },
  { x: SOUTHWEST_OASIS_POS.x, z: SOUTHWEST_OASIS_POS.z, r: SOUTHWEST_OASIS_POS.clearRadius },
];

export const ARCHERY_TARGETS: readonly ArcheryTargetDef[] = [
  {
    id: 'target-fortress-hall-nw-outer',
    nameHe: 'מטרת ההיכל הקיסרי — מערב חיצוני',
    x: -18.0,
    z: -182.0 + FZ,
    yaw: 0.0,
    bullseyeRadius: 0.95,
  },
  {
    id: 'target-fortress-hall-nw-inner',
    nameHe: 'מטרת ההיכל הקיסרי — מערב פנימי',
    x: -12.5,
    z: -182.0 + FZ,
    yaw: 0.0,
    bullseyeRadius: 0.95,
  },
  {
    id: 'target-fortress-hall-ne-inner',
    nameHe: 'מטרת ההיכל הקיסרי — מזרח פנימי',
    x: 12.5,
    z: -182.0 + FZ,
    yaw: 0.0,
    bullseyeRadius: 0.95,
  },
  {
    id: 'target-fortress-hall-ne-outer',
    nameHe: 'מטרת ההיכל הקיסרי — מזרח חיצוני',
    x: 18.0,
    z: -182.0 + FZ,
    yaw: 0.0,
    bullseyeRadius: 0.95,
  },
] as const;

export const MARKET_STALL_LOCATIONS = [
  { id: 'market-harbor-1', nameHe: 'שוק הנמל — דוכן חרבות ולהבים (הסוחר ליאנג)', x: 212.0, z: 254.0, radius: 4.5 },
  { id: 'market-harbor-2', nameHe: 'שוק הנמל — דוכן קשתות וחצים (הסוחרת מיי)', x: 212.0, z: 263.0, radius: 4.5 },
  { id: 'market-harbor-3', nameHe: 'שוק הנמל — דוכן חומרי בנייה ועץ (הסוחר דורין)', x: 224.0, z: 263.0, radius: 4.5 },
  { id: 'market-harbor-4', nameHe: 'שוק הנמל — דוכן אבן ושיש (הסוחר קארים)', x: 240.0, z: 263.0, radius: 4.5 },
  { id: 'market-harbor-5', nameHe: 'שוק הנמל — נפחיית הנמל ומטילי מתכת (הנפח בורין)', x: 246.0, z: 238.0, radius: 4.5 },
  { id: 'market-harbor-6', nameHe: 'שוק הנמל — דוכן מחצבים ואוצרות (הסוחר האן)', x: 246.0, z: 246.0, radius: 4.5 },
] as const;

export function findNearestMarketStall(px: number, pz: number): (typeof MARKET_STALL_LOCATIONS)[number] | null {
  let best: (typeof MARKET_STALL_LOCATIONS)[number] | null = null;
  let bestDist = Infinity;
  for (let i = 0; i < MARKET_STALL_LOCATIONS.length; i++) {
    const st = MARKET_STALL_LOCATIONS[i];
    const d = Math.hypot(px - st.x, pz - st.z);
    if (d <= st.radius && d < bestDist) {
      bestDist = d;
      best = st;
    }
  }
  return best;
}

export function isWithinViewDistance(
  objX: number,
  objZ: number,
  playerX: number,
  playerZ: number,
  margin = 0,
  maxDist = VIEW_DISTANCE
): boolean {
  const dx = objX - playerX;
  const dz = objZ - playerZ;
  const limit = maxDist + margin;
  return dx * dx + dz * dz <= limit * limit;
}
