// ============================================================================
// MODULE: World / Domain / Landmarks / Collision & Terraces
// DESIGN: Axis-aligned collision bounds, building clear zones, and leveled flat terraces (SRP)
// SUMMARY: Exposes SOLID_BUILDING_BOXES for player/projectile obstacle collision,
//          FLAT_BUILDING_TERRACES for procedural terrain leveling, and CLEAR_ZONES
//          to suppress tree and vegetation spawning around structures.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { ICollidableWorldEntity, IObstacleCylinder, ISolidBuildingBox } from '../worldTypes';
import {
  MAGIC_STONE_CIRCLE_POS,
  WATERFALL_CLIFF_POS,
  WATERFALL_POOL_POS,
  VOLCANO_SANCTUM_POS,
  FLOATING_BLOOMING_ISLANDS,
  FLOATING_ISLAND_STAIR_POS,
  SOUTHERN_DRAGON_RUINS_POS,
  DESERT_DRAGON_PASS_POS,
  NORDIC_FROST_SHRINE_POS,
  DESERT_PYRAMID_SANCTUARY_POS,
  SMUGGLER_ISLAND_POS,
  SAILABLE_SHIP_INITIAL_POS,
} from './coreLandmarks';
import {
  HUNTER_LODGE_POS,
  LAKESIDE_TEA_PAVILION_POS,
  RIVERSIDE_WINDMILLS,
  SAKURA_SANCTUARY_POS,
  SAKURA_SANCTUARY_YAW,
  VALLEY_FARMS,
} from './settlementLandmarks';
import {
  HILL_WATCHTOWERS,
  ROPE_BRIDGE_DEF,
} from './highlandBridgeLandmarks';
import {
  DWARVEN_GUARDIAN_STATUES,
  DWARVEN_STONE_HOUSES,
  SOUTHERN_MINE_POS,
} from './dwarvenLandmarks';
import {
  SOUTHEAST_HARBOR_POS,
  SOUTHWEST_OASIS_POS,
} from './oasisAndHarborLandmarks';
import {
  CHINESE_FORTRESS_POS,
  FORTRESS_Y_OFFSET,
  FORTRESS_Z_OFFSET,
} from './fortressLandmarks';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants
const FZ = FORTRESS_Z_OFFSET;
const FY = FORTRESS_Y_OFFSET;
// #endregion

// ======================== SOLID BUILDING BOXES ======================== \\
// #region Solid Building Boxes
/** Summary: Global collection of axis-aligned 3D obstacle bounding boxes across the entire world. */
export const SOLID_BUILDING_BOXES: ISolidBuildingBox[] = [
  // Hunter's Cabin at (-92, 72, height=2.15, rotated PI in settlementModels.ts): Walls, Chimney, Porch Columns/Rails, and Interior Furniture
  {
    id: 'hunter-lodge-back-wall',
    minX: HUNTER_LODGE_POS.x - 4.9,
    maxX: HUNTER_LODGE_POS.x + 4.9,
    minZ: HUNTER_LODGE_POS.z + 3.6,
    maxZ: HUNTER_LODGE_POS.z + 4.0,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 3.7,
  },
  {
    id: 'hunter-lodge-west-wall',
    minX: HUNTER_LODGE_POS.x - 4.8,
    maxX: HUNTER_LODGE_POS.x - 4.4,
    minZ: HUNTER_LODGE_POS.z - 2.0,
    maxZ: HUNTER_LODGE_POS.z + 4.0,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 3.7,
  },
  {
    id: 'hunter-lodge-chimney',
    minX: HUNTER_LODGE_POS.x - 5.85,
    maxX: HUNTER_LODGE_POS.x - 4.35,
    minZ: HUNTER_LODGE_POS.z + 0.4,
    maxZ: HUNTER_LODGE_POS.z + 2.0,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 6.52,
  },
  {
    id: 'hunter-lodge-east-wall',
    minX: HUNTER_LODGE_POS.x + 4.4,
    maxX: HUNTER_LODGE_POS.x + 4.8,
    minZ: HUNTER_LODGE_POS.z - 2.0,
    maxZ: HUNTER_LODGE_POS.z + 4.0,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 3.7,
  },
  {
    id: 'hunter-lodge-front-left',
    minX: HUNTER_LODGE_POS.x - 4.8,
    maxX: HUNTER_LODGE_POS.x - 0.95,
    minZ: HUNTER_LODGE_POS.z - 2.0,
    maxZ: HUNTER_LODGE_POS.z - 1.6,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 3.7,
  },
  {
    id: 'hunter-lodge-front-right',
    minX: HUNTER_LODGE_POS.x + 0.95,
    maxX: HUNTER_LODGE_POS.x + 4.8,
    minZ: HUNTER_LODGE_POS.z - 2.0,
    maxZ: HUNTER_LODGE_POS.z - 1.6,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 3.7,
  },
  {
    id: 'hunter-lodge-front-header',
    minX: HUNTER_LODGE_POS.x - 0.95,
    maxX: HUNTER_LODGE_POS.x + 0.95,
    minZ: HUNTER_LODGE_POS.z - 2.0,
    maxZ: HUNTER_LODGE_POS.z - 1.6,
    minY: HUNTER_LODGE_POS.height + 2.6,
    maxY: HUNTER_LODGE_POS.height + 3.7,
  },
  // Hunter's Cabin 4 Porch Veranda Columns & 2 Porch Rails at z = 72 - 4.1 = 67.9
  ...[-4.8, -1.8, 1.8, 4.8].map((vx, idx) => ({
    id: `hunter-lodge-porch-col-${idx + 1}`,
    minX: HUNTER_LODGE_POS.x + vx - 0.2,
    maxX: HUNTER_LODGE_POS.x + vx + 0.2,
    minZ: HUNTER_LODGE_POS.z - 4.1 - 0.2,
    maxZ: HUNTER_LODGE_POS.z - 4.1 + 0.2,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 3.5,
  })),
  {
    id: 'hunter-lodge-porch-rail-west',
    minX: HUNTER_LODGE_POS.x - 4.8,
    maxX: HUNTER_LODGE_POS.x - 1.8,
    minZ: HUNTER_LODGE_POS.z - 4.24,
    maxZ: HUNTER_LODGE_POS.z - 3.96,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 1.12,
  },
  {
    id: 'hunter-lodge-porch-rail-east',
    minX: HUNTER_LODGE_POS.x + 1.8,
    maxX: HUNTER_LODGE_POS.x + 4.8,
    minZ: HUNTER_LODGE_POS.z - 4.24,
    maxZ: HUNTER_LODGE_POS.z - 3.96,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 1.12,
  },
  // Hunter's Cabin Interior Furniture: Bed, Dining Table, and Rotated Starter Gear Chest (yaw=0.35)
  {
    id: 'hunter-lodge-bed',
    minX: HUNTER_LODGE_POS.x - 3.2 - 0.88,
    maxX: HUNTER_LODGE_POS.x - 3.2 + 0.88,
    minZ: HUNTER_LODGE_POS.z + 2.4 - 1.18,
    maxZ: HUNTER_LODGE_POS.z + 2.4 + 1.18,
    minY: HUNTER_LODGE_POS.height + 0.18,
    maxY: HUNTER_LODGE_POS.height + 0.9,
  },
  {
    id: 'hunter-lodge-table',
    minX: HUNTER_LODGE_POS.x - 0.2 - 0.9,
    maxX: HUNTER_LODGE_POS.x - 0.2 + 0.9,
    minZ: HUNTER_LODGE_POS.z + 2.55 - 0.55,
    maxZ: HUNTER_LODGE_POS.z + 2.55 + 0.55,
    minY: HUNTER_LODGE_POS.height + 0.18,
    maxY: HUNTER_LODGE_POS.height + 1.1,
  },
  {
    id: 'hunter-lodge-starter-chest',
    minX: HUNTER_LODGE_POS.x + 3.55 - 0.68,
    maxX: HUNTER_LODGE_POS.x + 3.55 + 0.68,
    minZ: HUNTER_LODGE_POS.z + 2.95 - 0.44,
    maxZ: HUNTER_LODGE_POS.z + 2.95 + 0.44,
    minY: HUNTER_LODGE_POS.height + 0.18,
    maxY: HUNTER_LODGE_POS.height + 1.15,
    yaw: 0,
  },
  {
    id: 'hunter-water-trough',
    minX: HUNTER_LODGE_POS.x - 10.9,
    maxX: HUNTER_LODGE_POS.x - 8.1,
    minZ: HUNTER_LODGE_POS.z - 3.96,
    maxZ: HUNTER_LODGE_POS.z - 3.04,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 0.9,
  },
  {
    id: 'hunter-water-pump',
    minX: HUNTER_LODGE_POS.x - 7.95 - 0.18,
    maxX: HUNTER_LODGE_POS.x - 7.95 + 0.18,
    minZ: HUNTER_LODGE_POS.z - 3.5 - 0.18,
    maxZ: HUNTER_LODGE_POS.z - 3.5 + 0.18,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 1.55,
  },
  // 3 Valley Farmhouses (farm-west, farm-south, farm-east): Exterior Walls, Porch Columns, Interior Furniture & Workshop, Wheat Field Fences, Hay Bales, and Perimeter Fence + Gate Archway
  ...VALLEY_FARMS.flatMap((farm, fIdx) => {
    const mapBox = (
      idSuffix: string,
      lx1: number,
      lx2: number,
      lz1: number,
      lz2: number,
      minYOff: number,
      maxYOff: number,
      yaw?: number
    ): ISolidBuildingBox => {
      const wx1 = farm.x + lx1 * farm.dirZ;
      const wx2 = farm.x + lx2 * farm.dirZ;
      const wz1 = farm.z + lz1 * farm.dirZ;
      const wz2 = farm.z + lz2 * farm.dirZ;
      return {
        id: `${farm.id}-${idSuffix}`,
        minX: Math.min(wx1, wx2),
        maxX: Math.max(wx1, wx2),
        minZ: Math.min(wz1, wz2),
        maxZ: Math.max(wz1, wz2),
        minY: farm.height + minYOff,
        maxY: farm.height + maxYOff,
        ...(yaw !== undefined ? { yaw } : {}),
      };
    };

    // Workshop station in farmGroup local coordinates (offset by farmFurniture at (0, 0.18, -2.0), flush against West wall at lz = 0.0)
    const workshopBox =
      fIdx === 0
        ? mapBox('workshop-oven', -4.65, -3.3, -0.95, 0.95, 0.18, 2.65)
        : fIdx === 1
          ? mapBox('workshop-churn', -4.65, -3.3, -0.85, 0.85, 0.18, 1.35)
          : mapBox('workshop-loom', -4.65, -3.45, -0.82, 0.82, 0.18, 1.95);

    return [
      // Farmhouse Exterior Walls & Doorway Lintel Header (capped at exact eaves height 3.58m / front plate 4.04m so hitboxes never protrude above the roof!)
      mapBox('back-wall', -5.1, 5.1, -6.36, -5.94, 0, 3.58),
      mapBox('west-wall', -5.16, -4.74, -6.25, 2.35, 0, 3.58),
      mapBox('east-wall', 4.74, 5.16, -6.25, 2.35, 0, 3.58),
      mapBox('front-left', -5.1, -0.95, 1.99, 2.41, 0, 4.04),
      mapBox('front-right', 0.95, 5.1, 1.99, 2.41, 0, 4.04),
      mapBox('front-header', -0.95, 0.95, 1.99, 2.41, 2.53, 4.04),
      // 4 Veranda Porch Columns at lz = +4.1 (capped at exact veranda header height 3.22m)
      ...[-4.6, -1.6, 1.6, 4.6].map((vx, cIdx) =>
        mapBox(`porch-col-${cIdx + 1}`, vx - 0.2, vx + 0.2, 4.1 - 0.2, 4.1 + 0.2, 0, 3.22)
      ),
      // Farmhouse Interior Furniture (Back Hearth, Dining Table & Benches, Panelled Wardrobe, Country Bed, Storage Chest, Workshop Station)
      mapBox('interior-hearth', -1.1, 1.1, -5.9, -4.94, 0.18, 3.65),
      mapBox('interior-table', 1.8, 3.9, -0.6, 1.3, 0.18, 1.02),
      mapBox('interior-wardrobe', -4.45, -2.85, -5.88, -5.06, 0.18, 2.5),
      mapBox('interior-bed', 2.64, 4.16, -5.92, -3.77, 0.18, 1.25),
      mapBox('interior-chest', 3.82, 4.54, -2.8, -1.6, 0.18, 1.05),
      workshopBox,
      // Wheat Field Border Fences (lz = -8.6 and lz = +7.6 on both field sides) & Rotated Hay Bales
      mapBox('field-fence-left-back', -18.1, -7.1, -8.75, -8.45, 0, 0.88),
      mapBox('field-fence-left-front', -18.1, -7.1, 7.45, 7.75, 0, 0.88),
      mapBox('field-fence-right-back', 7.1, 18.1, -8.75, -8.45, 0, 0.88),
      mapBox('field-fence-right-front', 7.1, 18.1, 7.45, 7.75, 0, 0.88),
      mapBox('hay-bale-left', -6.4 - 0.48, -6.4 + 0.48, 3.2 - 0.33, 3.2 + 0.33, 0.15, 0.75, -0.25),
      mapBox('hay-bale-right', 6.4 - 0.48, 6.4 + 0.48, 3.2 - 0.33, 3.2 + 0.33, 0.15, 0.75, 0.25),
      // Perimeter Compound Fence & Tall Entrance Gate Posts + Crossbeam Arch
      mapBox('perimeter-fence-back', -farm.fenceHalfW - 0.18, farm.fenceHalfW + 0.18, -farm.fenceHalfD - 0.18, -farm.fenceHalfD + 0.18, 0, 1.25),
      mapBox('perimeter-fence-west', -farm.fenceHalfW - 0.18, -farm.fenceHalfW + 0.18, -farm.fenceHalfD - 0.18, farm.fenceHalfD + 0.18, 0, 1.25),
      mapBox('perimeter-fence-east', farm.fenceHalfW - 0.18, farm.fenceHalfW + 0.18, -farm.fenceHalfD - 0.18, farm.fenceHalfD + 0.18, 0, 1.25),
      mapBox('perimeter-fence-front-left', -farm.fenceHalfW - 0.18, -farm.gateHalfW, farm.fenceHalfD - 0.18, farm.fenceHalfD + 0.18, 0, 1.25),
      mapBox('perimeter-fence-front-right', farm.gateHalfW, farm.fenceHalfW + 0.18, farm.fenceHalfD - 0.18, farm.fenceHalfD + 0.18, 0, 1.25),
      mapBox('gate-post-left', -farm.gateHalfW - 0.26, -farm.gateHalfW + 0.26, farm.fenceHalfD - 0.26, farm.fenceHalfD + 0.26, 0, 3.65),
      mapBox('gate-post-right', farm.gateHalfW - 0.26, farm.gateHalfW + 0.26, farm.fenceHalfD - 0.26, farm.fenceHalfD + 0.26, 0, 3.65),
      mapBox('gate-crossbeam', -farm.gateHalfW - 0.7, farm.gateHalfW + 0.7, farm.fenceHalfD - 0.2, farm.fenceHalfD + 0.2, 3.28, 3.65),
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
  // Hunter's Horse Stable & Corral at world (-104.5, 2.15, 75.5): Back/Side walls, Center Partition, Hay Bale Stack, and West Corral Fence
  {
    id: 'stable-back-wall',
    minX: HUNTER_LODGE_POS.x - 16.3,
    maxX: HUNTER_LODGE_POS.x - 8.7,
    minZ: HUNTER_LODGE_POS.z + 5.85,
    maxZ: HUNTER_LODGE_POS.z + 6.15,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 3.55,
  },
  {
    id: 'stable-west-wall',
    minX: HUNTER_LODGE_POS.x - 16.28,
    maxX: HUNTER_LODGE_POS.x - 15.92,
    minZ: HUNTER_LODGE_POS.z + 1.1,
    maxZ: HUNTER_LODGE_POS.z + 6.1,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 3.55,
  },
  {
    id: 'stable-east-wall',
    minX: HUNTER_LODGE_POS.x - 9.08,
    maxX: HUNTER_LODGE_POS.x - 8.72,
    minZ: HUNTER_LODGE_POS.z + 1.1,
    maxZ: HUNTER_LODGE_POS.z + 6.1,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 3.55,
  },
  {
    id: 'stable-center-divider',
    minX: HUNTER_LODGE_POS.x - 12.66,
    maxX: HUNTER_LODGE_POS.x - 12.34,
    minZ: HUNTER_LODGE_POS.z + 1.2,
    maxZ: HUNTER_LODGE_POS.z + 6.0,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 2.05,
  },
  {
    id: 'stable-hay-bales',
    minX: HUNTER_LODGE_POS.x - 15.55,
    maxX: HUNTER_LODGE_POS.x - 13.6,
    minZ: HUNTER_LODGE_POS.z + 4.75,
    maxZ: HUNTER_LODGE_POS.z + 5.55,
    minY: HUNTER_LODGE_POS.height + 0.18,
    maxY: HUNTER_LODGE_POS.height + 1.4,
  },
  {
    id: 'stable-corral-fence-west',
    minX: HUNTER_LODGE_POS.x - 16.25,
    maxX: HUNTER_LODGE_POS.x - 12.35,
    minZ: HUNTER_LODGE_POS.z - 2.28,
    maxZ: HUNTER_LODGE_POS.z - 1.92,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 1.1,
  },
  // 2 Octagonal Riverside Windmills wrapped tightly with 8 tangential OBB facets matching CylinderGeometry(2.3, 2.9, ..., 8)
  ...RIVERSIDE_WINDMILLS.flatMap((wm) =>
    Array.from({ length: 8 }, (_, sIdx) => {
      const segSpan = (Math.PI * 2) / 8;
      const ang = wm.rotY + (sIdx + 0.5) * segSpan;
      const rFace = 2.45;
      const cx = wm.x + Math.sin(ang) * rFace;
      const cz = wm.z + Math.cos(ang) * rFace;
      const halfChord = rFace * Math.sin(segSpan * 0.5) + 0.08;
      const halfThick = 0.26;
      return {
        id: `${wm.id}-seg-${sIdx + 1}`,
        minX: cx - halfChord,
        maxX: cx + halfChord,
        minZ: cz - halfThick,
        maxZ: cz + halfThick,
        minY: wm.height,
        maxY: wm.height + 10.8,
        yaw: ang,
      };
    })
  ),
  // Lakeside Chinese Tea Pavilion at (-126, 48): 4 Crimson Corner Pillars, 3 Perimeter Railings (East pier entrance open), and Low Tea Table
  ...[-3.4, 3.4].flatMap((px, xIdx) =>
    [-3.4, 3.4].map((pz, zIdx) => ({
      id: `tea-pavilion-col-${xIdx * 2 + zIdx + 1}`,
      minX: LAKESIDE_TEA_PAVILION_POS.x + px - 0.2,
      maxX: LAKESIDE_TEA_PAVILION_POS.x + px + 0.2,
      minZ: LAKESIDE_TEA_PAVILION_POS.z + pz - 0.2,
      maxZ: LAKESIDE_TEA_PAVILION_POS.z + pz + 0.2,
      minY: LAKESIDE_TEA_PAVILION_POS.deckHeight,
      maxY: LAKESIDE_TEA_PAVILION_POS.deckHeight + 3.65,
    }))
  ),
  {
    id: 'tea-pavilion-rail-west',
    minX: LAKESIDE_TEA_PAVILION_POS.x - 3.6,
    maxX: LAKESIDE_TEA_PAVILION_POS.x - 3.4,
    minZ: LAKESIDE_TEA_PAVILION_POS.z - 3.7,
    maxZ: LAKESIDE_TEA_PAVILION_POS.z + 3.7,
    minY: LAKESIDE_TEA_PAVILION_POS.deckHeight,
    maxY: LAKESIDE_TEA_PAVILION_POS.deckHeight + 0.85,
  },
  {
    id: 'tea-pavilion-rail-north',
    minX: LAKESIDE_TEA_PAVILION_POS.x - 3.7,
    maxX: LAKESIDE_TEA_PAVILION_POS.x + 3.7,
    minZ: LAKESIDE_TEA_PAVILION_POS.z - 3.6,
    maxZ: LAKESIDE_TEA_PAVILION_POS.z - 3.4,
    minY: LAKESIDE_TEA_PAVILION_POS.deckHeight,
    maxY: LAKESIDE_TEA_PAVILION_POS.deckHeight + 0.85,
  },
  {
    id: 'tea-pavilion-rail-south',
    minX: LAKESIDE_TEA_PAVILION_POS.x - 3.7,
    maxX: LAKESIDE_TEA_PAVILION_POS.x + 3.7,
    minZ: LAKESIDE_TEA_PAVILION_POS.z + 3.4,
    maxZ: LAKESIDE_TEA_PAVILION_POS.z + 3.6,
    minY: LAKESIDE_TEA_PAVILION_POS.deckHeight,
    maxY: LAKESIDE_TEA_PAVILION_POS.deckHeight + 0.85,
  },
  {
    id: 'tea-pavilion-table',
    minX: LAKESIDE_TEA_PAVILION_POS.x - 1.1,
    maxX: LAKESIDE_TEA_PAVILION_POS.x + 1.1,
    minZ: LAKESIDE_TEA_PAVILION_POS.z - 1.1,
    maxZ: LAKESIDE_TEA_PAVILION_POS.z + 1.1,
    minY: LAKESIDE_TEA_PAVILION_POS.deckHeight,
    maxY: LAKESIDE_TEA_PAVILION_POS.deckHeight + 0.55,
  },
  { id: 'main-hall-back-wall', minX: -22.3, maxX: 22.3, minZ: -216.3 + FZ, maxZ: -215.2 + FZ, maxY: 42.5 + FY },
  { id: 'main-hall-west-wall', minX: -22.3, maxX: -21.2, minZ: -216.3 + FZ, maxZ: -189.3 + FZ, maxY: 42.5 + FY },
  { id: 'main-hall-east-wall', minX: 21.2, maxX: 22.3, minZ: -216.3 + FZ, maxZ: -189.3 + FZ, maxY: 42.5 + FY },
  { id: 'main-hall-front-west', minX: -22.3, maxX: -2.2, minZ: -190.3 + FZ, maxZ: -189.3 + FZ, maxY: 42.5 + FY },
  { id: 'main-hall-front-east', minX: 2.2, maxX: 22.3, minZ: -190.3 + FZ, maxZ: -189.3 + FZ, maxY: 42.5 + FY },
  { id: 'main-hall-front-window-sill', minX: -5.2, maxX: 5.2, minZ: -190.3 + FZ, maxZ: -189.3 + FZ, minY: 31.2 + FY, maxY: 42.5 + FY },
  { id: 'west-pav-back-wall', minX: -39.3, maxX: -20.7, minZ: -172.0 + FZ, maxZ: -170.9 + FZ, maxY: 38.5 + FY },
  { id: 'west-pav-west-wall', minX: -39.3, maxX: -38.2, minZ: -172.0 + FZ, maxZ: -156.0 + FZ, maxY: 38.5 + FY },
  { id: 'west-pav-east-wall', minX: -21.8, maxX: -20.7, minZ: -172.0 + FZ, maxZ: -156.0 + FZ, maxY: 38.5 + FY },
  { id: 'west-pav-front-left', minX: -39.3, maxX: -31.6, minZ: -157.0 + FZ, maxZ: -156.0 + FZ, maxY: 38.5 + FY },
  { id: 'west-pav-front-right', minX: -28.4, maxX: -20.7, minZ: -157.0 + FZ, maxZ: -156.0 + FZ, maxY: 38.5 + FY },
  { id: 'west-pav-front-upper', minX: -32.2, maxX: -27.8, minZ: -157.0 + FZ, maxZ: -156.0 + FZ, minY: 30.2 + FY, maxY: 38.5 + FY },
  { id: 'east-pav-back-wall', minX: 20.7, maxX: 39.3, minZ: -172.0 + FZ, maxZ: -170.9 + FZ, maxY: 38.5 + FY },
  { id: 'east-pav-west-wall', minX: 20.7, maxX: 21.8, minZ: -172.0 + FZ, maxZ: -156.0 + FZ, maxY: 38.5 + FY },
  { id: 'east-pav-east-wall', minX: 38.2, maxX: 39.3, minZ: -172.0 + FZ, maxZ: -156.0 + FZ, maxY: 38.5 + FY },
  { id: 'east-pav-front-left', minX: 20.7, maxX: 28.4, minZ: -157.0 + FZ, maxZ: -156.0 + FZ, maxY: 38.5 + FY },
  { id: 'east-pav-front-right', minX: 31.6, maxX: 39.3, minZ: -157.0 + FZ, maxZ: -156.0 + FZ, maxY: 38.5 + FY },
  { id: 'east-pav-front-upper', minX: 27.8, maxX: 32.2, minZ: -157.0 + FZ, maxZ: -156.0 + FZ, minY: 30.2 + FY, maxY: 38.5 + FY },
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
    maxY: SAKURA_SANCTUARY_POS.height + 10.5,
  },
  { id: 'harbor-tavern-back-wall', minX: 215.8, maxX: 232.2, minZ: 223.75, maxZ: 224.25, minY: 3.2, maxY: 8.6 },
  { id: 'harbor-tavern-west-wall', minX: 215.75, maxX: 216.25, minZ: 223.8, maxZ: 236.2, minY: 3.2, maxY: 8.6 },
  { id: 'harbor-tavern-east-wall', minX: 231.75, maxX: 232.25, minZ: 223.8, maxZ: 236.2, minY: 3.2, maxY: 8.6 },
  { id: 'harbor-tavern-front-left', minX: 215.95, maxX: 222.7, minZ: 235.75, maxZ: 236.25, minY: 3.2, maxY: 8.6 },
  { id: 'harbor-tavern-front-right', minX: 225.3, maxX: 232.05, minZ: 235.75, maxZ: 236.25, minY: 3.2, maxY: 8.6 },
  { id: 'harbor-tavern-bar', minX: 216.7, maxX: 226.3, minZ: 226.25, maxZ: 227.35, minY: 3.35, maxY: 4.5 },
  { id: 'harbor-tavern-hearth', minX: 227.4, maxX: 230.2, minZ: 224.2, maxZ: 225.4, minY: 3.35, maxY: 12.8 },
  { id: 'harbor-tavern-barrels', minX: 217.2, maxX: 223.9, minZ: 224.4, maxZ: 225.4, minY: 3.35, maxY: 5.3 },
  { id: 'harbor-tavern-table-nw', minX: 218.45, maxX: 220.55, minZ: 230.57, maxZ: 231.83, minY: 3.35, maxY: 4.25 },
  { id: 'harbor-tavern-table-sw', minX: 218.45, maxX: 220.55, minZ: 233.17, maxZ: 234.43, minY: 3.35, maxY: 4.25 },
  { id: 'harbor-tavern-table-ne', minX: 227.15, maxX: 229.25, minZ: 230.57, maxZ: 231.83, minY: 3.35, maxY: 4.25 },
  { id: 'harbor-tavern-table-se', minX: 227.15, maxX: 229.25, minZ: 233.17, maxZ: 234.43, minY: 3.35, maxY: 4.25 },
  ...[216.25, 221.65, 226.35, 231.75].map((px, idx) => ({
    id: `harbor-tavern-porch-post-${idx + 1}`,
    minX: px - 0.16,
    maxX: px + 0.16,
    minZ: 238.2 - 0.16,
    maxZ: 238.2 + 0.16,
    minY: 3.2,
    maxY: 6.8,
  })),
  { id: 'harbor-wall-west-north', minX: 198.8, maxX: 201.2, minZ: 214.0, maxZ: 236.0, minY: 3.2, maxY: 10.75 },
  { id: 'harbor-gate-tower-north-base', minX: 197.2, maxX: 202.8, minZ: 235.2, maxZ: 240.8, minY: 3.2, maxY: 5.8 },
  { id: 'harbor-gate-tower-north', minX: 197.5, maxX: 202.5, minZ: 235.5, maxZ: 240.5, minY: 5.8, maxY: 16.8 },
  { id: 'harbor-gate-tower-south-base', minX: 197.2, maxX: 202.8, minZ: 247.2, maxZ: 252.8, minY: 3.2, maxY: 5.8 },
  { id: 'harbor-gate-tower-south', minX: 197.5, maxX: 202.5, minZ: 247.5, maxZ: 252.5, minY: 5.8, maxY: 16.8 },
  { id: 'harbor-gate-overhead-arch', minX: 197.6, maxX: 202.4, minZ: 240.8, maxZ: 247.2, minY: 8.8, maxY: 14.0 },
  { id: 'harbor-wall-west-south', minX: 198.8, maxX: 201.2, minZ: 252.0, maxZ: 312.0, minY: 3.2, maxY: 10.75 },
  { id: 'harbor-wall-north-west', minX: 200.0, maxX: 235.0, minZ: 212.8, maxZ: 215.2, minY: 3.2, maxY: 10.75 },
  { id: 'harbor-wall-north-east', minX: 241.0, maxX: 255.4, minZ: 212.8, maxZ: 215.2, minY: 3.2, maxY: 10.75 },
  { id: 'harbor-wall-north-arch', minX: 235.0, maxX: 241.0, minZ: 212.7, maxZ: 215.3, minY: 8.0, maxY: 10.2 },
  { id: 'harbor-wall-south', minX: 200.0, maxX: 255.4, minZ: 310.8, maxZ: 313.2, minY: 3.2, maxY: 10.75 },
  // 4 Octagonal Corner Castle Bastion Towers wrapped tightly with 8 tangential OBB facets (matching CylinderGeometry(3.4, 3.8, 13.0, 8))
  ...(
    [
      ['nw', 200.0, 214.0],
      ['sw', 200.0, 312.0],
      ['ne', 255.2, 214.0],
      ['se', 255.2, 312.0],
    ] as const
  ).flatMap(([tag, bx, bz]) =>
    Array.from({ length: 8 }, (_, sIdx) => {
      const segSpan = (Math.PI * 2) / 8;
      const ang = (sIdx + 0.5) * segSpan;
      const rFace = 3.18;
      const cx = bx + Math.sin(ang) * rFace;
      const cz = bz + Math.cos(ang) * rFace;
      const halfChord = rFace * Math.sin(segSpan * 0.5) + 0.08;
      const halfThick = 0.28;
      return {
        id: `harbor-bastion-${tag}-seg-${sIdx + 1}`,
        minX: cx - halfChord,
        maxX: cx + halfChord,
        minZ: cz - halfThick,
        maxZ: cz + halfThick,
        minY: 3.2,
        maxY: 16.5,
        yaw: ang,
      };
    })
  ),
  // Harbor Quayside Cannons & Cannonball Stacks positioned in the embrasure gaps between merlons
  ...[221.0, 239.0, 263.0, 275.0, 293.0].flatMap((cz, idx) => [
    {
      id: `harbor-cannon-${idx + 1}`,
      minX: 253.12,
      maxX: 255.18,
      minZ: cz - 0.36,
      maxZ: cz + 0.36,
      minY: 3.2,
      maxY: 4.06,
    },
    {
      id: `harbor-cannon-balls-${idx + 1}`,
      minX: 253.27,
      maxX: 254.0,
      minZ: cz + 0.52,
      maxZ: cz + 0.9,
      minY: 3.2,
      maxY: 3.84,
    },
  ]),
  // Harbor Quayside Sea-Wall Stone Parapet Merlons (x = 255.1, y = 3.2..3.98, skipping pierZ = 252 and boarding jetty at z = 282)
  ...[218, 224, 230, 236, 242, 260, 266, 272, 278, 290, 296, 302, 308].map((bz, idx) => ({
    id: `harbor-seawall-merlon-${idx + 1}`,
    minX: 254.55,
    maxX: 255.65,
    minZ: bz - 1.3,
    maxZ: bz + 1.3,
    minY: 3.2,
    maxY: 4.0,
  })),
  // Harbor Wooden Pier Pilings (px = 256.0..270.0 step 3.5, pz = 249.4 / 254.6, y = 0.0..5.06)
  ...[256.0, 259.5, 263.0, 266.5, 270.0].flatMap((px, pIdx) =>
    [249.4, 254.6].map((pz, sIdx) => ({
      id: `harbor-pier-piling-${pIdx * 2 + sIdx + 1}`,
      minX: px - 0.28,
      maxX: px + 0.28,
      minZ: pz - 0.28,
      maxZ: pz + 0.28,
      minY: 0.0,
      maxY: 5.06,
    }))
  ),
  // Harbor Sailable Ship Boarding Jetty Pilings (exact match with atlantisAndShipModels.ts: jx = [256.5, 261.5, 266.5, 272.0], jz = SAILABLE_SHIP_INITIAL_POS.homeZ ± 2.4 = [279.6, 284.4])
  ...[256.5, 261.5, 266.5, 272.0].flatMap((jx, jIdx) =>
    [SAILABLE_SHIP_INITIAL_POS.homeZ - 2.4, SAILABLE_SHIP_INITIAL_POS.homeZ + 2.4].map((jz, sIdx) => ({
      id: `harbor-jetty-piling-${jIdx * 2 + sIdx + 1}`,
      minX: jx - 0.28,
      maxX: jx + 0.28,
      minZ: jz - 0.28,
      maxZ: jz + 0.28,
      minY: 0.0,
      maxY: 3.6,
    }))
  ),
  // Harbor Fountain central sculpted spire (outer rim & basin are climbable in walkableHeightAt!)
  { id: 'harbor-fountain-center-spire', minX: 231.1, maxX: 232.9, minZ: 251.1, maxZ: 252.9, minY: 3.2, maxY: 7.95 },
  { id: 'harbor-warehouse-south-wall', minX: 209.3, maxX: 226.7, minZ: 282.25, maxZ: 282.75, minY: 3.2, maxY: 9.0 },
  { id: 'harbor-warehouse-west-wall', minX: 209.25, maxX: 209.75, minZ: 271.3, maxZ: 282.7, minY: 3.2, maxY: 9.0 },
  { id: 'harbor-warehouse-east-wall', minX: 226.25, maxX: 226.75, minZ: 271.3, maxZ: 282.7, minY: 3.2, maxY: 9.0 },
  { id: 'harbor-warehouse-north-left', minX: 209.4, maxX: 216.6, minZ: 271.25, maxZ: 271.75, minY: 3.2, maxY: 9.0 },
  { id: 'harbor-warehouse-north-right', minX: 219.4, maxX: 226.6, minZ: 271.25, maxZ: 271.75, minY: 3.2, maxY: 9.0 },
  { id: 'harbor-warehouse-crates-west', minX: 211.8, maxX: 214.4, minZ: 274.2, maxZ: 278.6, minY: 3.35, maxY: 6.85 },
  { id: 'harbor-warehouse-crates-east', minX: 221.6, maxX: 224.2, minZ: 274.2, maxZ: 278.6, minY: 3.35, maxY: 6.85 },
  { id: 'harbor-warehouse-rack-west', minX: 210.3, maxX: 214.9, minZ: 278.5, maxZ: 279.9, minY: 3.35, maxY: 6.55 },
  { id: 'harbor-warehouse-rack-east', minX: 221.1, maxX: 225.7, minZ: 278.5, maxZ: 279.9, minY: 3.35, maxY: 6.55 },
  { id: 'harbor-warehouse-grain-sacks', minX: 215.2, maxX: 219.3, minZ: 278.4, maxZ: 279.2, minY: 3.35, maxY: 4.55 },
  { id: 'harbor-warehouse-barrels-south', minX: 213.0, maxX: 222.8, minZ: 280.8, maxZ: 281.8, minY: 3.35, maxY: 5.3 },
  { id: 'harbor-warehouse-qm-desk', minX: 216.95, maxX: 219.05, minZ: 275.17, maxZ: 276.43, minY: 3.35, maxY: 4.2 },
  // Harbor Portmaster's House & Maritime Chandlery (at 243.0, 277.0) + Quayside Crane
  { id: 'harbor-shed-south-wall', minX: 236.8, maxX: 249.2, minZ: 281.25, maxZ: 281.75, minY: 3.2, maxY: 7.85 },
  { id: 'harbor-shed-west-wall', minX: 236.75, maxX: 237.25, minZ: 272.3, maxZ: 281.7, minY: 3.2, maxY: 7.85 },
  { id: 'harbor-shed-east-wall', minX: 248.75, maxX: 249.25, minZ: 272.3, maxZ: 281.7, minY: 3.2, maxY: 7.85 },
  { id: 'harbor-shed-north-left', minX: 236.8, maxX: 241.6, minZ: 272.25, maxZ: 272.75, minY: 3.2, maxY: 7.85 },
  { id: 'harbor-shed-north-right', minX: 244.4, maxX: 249.2, minZ: 272.25, maxZ: 272.75, minY: 3.2, maxY: 7.85 },
  { id: 'harbor-shed-crates-west', minX: 238.2, maxX: 239.4, minZ: 274.2, maxZ: 279.8, minY: 3.3, maxY: 5.9 },
  { id: 'harbor-shed-crates-east', minX: 246.6, maxX: 247.8, minZ: 274.2, maxZ: 279.8, minY: 3.3, maxY: 5.9 },
  { id: 'harbor-quayside-crane-pedestal', minX: 250.05, maxX: 251.55, minZ: 273.75, maxZ: 275.25, minY: 3.2, maxY: 10.0 },
  { id: 'harbor-quayside-crane-crate', minX: 253.2, maxX: 254.4, minZ: 273.9, maxZ: 275.1, minY: 3.2, maxY: 4.45 },
  // Harbor Quayside Mooring Bollards (exact match with harborModels.ts: x = 254.35, bz = [220, 232, 245.5, 258.5, 271, 285, 301], y = 3.2..4.4)
  ...[220.0, 232.0, 245.5, 258.5, 271.0, 285.0, 301.0].map((bz, idx) => ({
    id: `harbor-quayside-bollard-${idx + 1}`,
    minX: 254.35 - 0.42,
    maxX: 254.35 + 0.42,
    minZ: bz - 0.42,
    maxZ: bz + 0.42,
    minY: 3.2,
    maxY: 4.4,
  })),
  // Harbor Wrought-Iron Streetlamps (exact 6 positions from harborModels.ts: y = 3.2..7.6)
  ...[
    [206.5, 238.5],
    [206.5, 250.5],
    [252.8, 246.8],
    [252.8, 257.2],
    [225.0, 242.0],
    [239.0, 242.0],
  ].map(([lx, lz], idx) => ({
    id: `harbor-lamp-post-${idx + 1}`,
    minX: lx - 0.22,
    maxX: lx + 0.22,
    minZ: lz - 0.22,
    maxZ: lz + 0.22,
    minY: 3.2,
    maxY: 7.6,
  })),
  // Harbor Marble Amphitheater Arena Stage (centered at 226.0, 294.0, r=6.6m, y=3.2..3.56m)
  { id: 'harbor-amphitheater-stage-core', minX: 221.6, maxX: 230.4, minZ: 289.6, maxZ: 298.4, minY: 3.2, maxY: 3.56 },
  ...Array.from({ length: 12 }, (_, i) => {
    const segSpan = (Math.PI * 2) / 12;
    const ang = (i + 0.5) * segSpan;
    const rStage = 6.25;
    const cx = 226.0 + Math.sin(ang) * rStage;
    const cz = 294.0 + Math.cos(ang) * rStage;
    const halfChord = rStage * Math.sin(segSpan * 0.5) + 0.1;
    const halfThick = 0.42;
    return {
      id: `harbor-amphitheater-stage-seg-${i + 1}`,
      minX: cx - halfChord,
      maxX: cx + halfChord,
      minZ: cz - halfThick,
      maxZ: cz + halfThick,
      minY: 3.2,
      maxY: 3.56,
      yaw: ang,
    };
  }),
  // Harbor Marble Amphitheater 5 Semicircular Seating Tiers (tier=0..4, rad=7.8 + tier*1.65, 9 curved OBB segments each)
  ...[0, 1, 2, 3, 4].flatMap((tier) => {
    const rad = 7.8 + tier * 1.65;
    const tierMaxY = 3.2 + 0.55 + tier * 0.56;
    const segs = 9;
    return Array.from({ length: segs }, (_, s) => {
      const ang = -Math.PI * 0.42 + ((s + 0.5) / segs) * (Math.PI * 0.84);
      const segW = ((rad * (Math.PI * 0.84)) / segs) * 1.06;
      const cx = 226.0 + Math.sin(ang) * rad;
      const cz = 294.0 + Math.cos(ang) * rad;
      const halfW = segW * 0.5;
      const halfDepth = 0.825;
      return {
        id: `harbor-amphitheater-tier-${tier + 1}-seg-${s + 1}`,
        minX: cx - halfW,
        maxX: cx + halfW,
        minZ: cz - halfDepth,
        maxZ: cz + halfDepth,
        minY: 3.2,
        maxY: tierMaxY,
        yaw: ang,
      };
    });
  }),
  // Harbor Marble Amphitheater Colonnade Pillars (6 grounded columns along r=15.6m arc around 226, 294)
  ...[0, 1, 2, 3, 4, 5].map((c) => {
    const ang = -Math.PI * 0.4 + (c / 5) * (Math.PI * 0.8);
    const cx = 226.0 + Math.sin(ang) * 15.6;
    const cz = 294.0 + Math.cos(ang) * 15.6;
    return {
      id: `harbor-amphitheater-col-${c + 1}`,
      minX: cx - 0.45,
      maxX: cx + 0.45,
      minZ: cz - 0.45,
      maxZ: cz + 0.45,
      minY: 3.2,
      maxY: 11.5,
      yaw: ang,
    };
  }),
  // Cylindrical Harbor Lighthouse (centered at 252.0, 202.0, radius 4.05m, 14 tangential OBB wall segments leaving South doorway open at +Z)
  ...Array.from({ length: 14 }, (_, i) => {
    const startAng = 0.36;
    const endAng = Math.PI * 2 - 0.36;
    const segSpan = (endAng - startAng) / 14;
    const ang = startAng + (i + 0.5) * segSpan;
    const rWall = 4.0;
    const cx = SOUTHEAST_HARBOR_POS.lighthouseX + Math.sin(ang) * rWall;
    const cz = SOUTHEAST_HARBOR_POS.lighthouseZ + Math.cos(ang) * rWall;
    const halfChord = rWall * Math.sin(segSpan * 0.5) + 0.14;
    const halfThick = 0.32;
    return {
      id: `harbor-lighthouse-wall-seg-${i + 1}`,
      minX: cx - halfChord,
      maxX: cx + halfChord,
      minZ: cz - halfThick,
      maxZ: cz + halfThick,
      minY: SOUTHEAST_HARBOR_POS.lighthouseBaseY,
      maxY: 25.4,
      yaw: ang,
    };
  }),
  // Cylindrical Harbor Lighthouse Top Observation Gallery Railing (16 tangential OBB segments at r=4.45m, y=25.0..26.5)
  ...Array.from({ length: 16 }, (_, i) => {
    const segSpan = (Math.PI * 2) / 16;
    const ang = (i + 0.5) * segSpan;
    const rRail = 4.45;
    const cx = SOUTHEAST_HARBOR_POS.lighthouseX + Math.sin(ang) * rRail;
    const cz = SOUTHEAST_HARBOR_POS.lighthouseZ + Math.cos(ang) * rRail;
    const halfChord = rRail * Math.sin(segSpan * 0.5) + 0.1;
    const halfThick = 0.22;
    return {
      id: `harbor-lighthouse-top-rail-seg-${i + 1}`,
      minX: cx - halfChord,
      maxX: cx + halfChord,
      minZ: cz - halfThick,
      maxZ: cz + halfThick,
      minY: 25.0,
      maxY: 26.5,
      yaw: ang,
    };
  }),
  // Cylindrical Harbor Lighthouse Central Glass Lantern Room on Top Deck (r=1.55m, leaving North ladder hatch completely unobstructed)
  {
    id: 'harbor-lighthouse-lantern-core',
    minX: SOUTHEAST_HARBOR_POS.lighthouseX - 1.45,
    maxX: SOUTHEAST_HARBOR_POS.lighthouseX + 1.45,
    minZ: SOUTHEAST_HARBOR_POS.lighthouseZ - 1.45,
    maxZ: SOUTHEAST_HARBOR_POS.lighthouseZ + 1.45,
    minY: 25.4,
    maxY: 30.0,
  },
  // Royal Galleon Ship Hull below deck + Stepped Bulwark Railings (Main Deck y=3.65..4.75 vs Quarterdeck y=3.65..7.75) + Cabin Walls + Stepped Stair Stringers + Deck Cannons + Masts + Helm + Shipwright Naval Office
  { id: 'galleon-lower-hull', minX: 275.6, maxX: 288.4, minZ: 233.5, maxZ: 270.5, minY: -0.4, maxY: 3.62 },
  { id: 'galleon-rail-port-bow', minX: 275.68, maxX: 276.02, minZ: 231.8, maxZ: 249.4, minY: 3.65, maxY: 4.75 },
  { id: 'galleon-rail-port-mid', minX: 275.68, maxX: 276.02, minZ: 254.0, maxZ: 259.5, minY: 3.65, maxY: 4.75 },
  { id: 'galleon-rail-port-stern', minX: 275.68, maxX: 276.02, minZ: 259.5, maxZ: 272.8, minY: 3.65, maxY: 7.75 },
  { id: 'galleon-rail-starboard-bow', minX: 287.98, maxX: 288.32, minZ: 231.8, maxZ: 259.5, minY: 3.65, maxY: 4.75 },
  { id: 'galleon-rail-starboard-stern', minX: 287.98, maxX: 288.32, minZ: 259.5, maxZ: 272.8, minY: 3.65, maxY: 7.75 },
  { id: 'galleon-rail-bow', minX: 275.7, maxX: 288.3, minZ: 231.21, maxZ: 231.59, minY: 3.65, maxY: 4.78 },
  { id: 'galleon-rail-stern', minX: 275.7, maxX: 288.3, minZ: 272.4, maxZ: 272.85, minY: 3.65, maxY: 7.75 },
  // Cabin front walls trimmed to the inner span between the Port stairs (x=276.25..278.65) and Starboard stairs (x=285.35..287.75) so they never block the top of the stairs!
  { id: 'galleon-cabin-front-left', minX: 278.65, maxX: 280.8, minZ: 259.29, maxZ: 259.71, minY: 3.65, maxY: 6.65 },
  { id: 'galleon-cabin-front-right', minX: 283.2, maxX: 285.35, minZ: 259.29, maxZ: 259.71, minY: 3.65, maxY: 6.65 },
  // Stepped inner stair side stringers matching the 3D stair slope from z=254.5 (y=3.65) to z=259.5 (y=6.65)
  { id: 'galleon-port-stair-side-low', minX: 278.55, maxX: 278.85, minZ: 254.5, maxZ: 256.2, minY: 3.65, maxY: 4.65 },
  { id: 'galleon-port-stair-side-mid', minX: 278.55, maxX: 278.85, minZ: 256.2, maxZ: 257.85, minY: 3.65, maxY: 5.65 },
  { id: 'galleon-port-stair-side-high', minX: 278.55, maxX: 278.85, minZ: 257.85, maxZ: 259.5, minY: 3.65, maxY: 6.65 },
  { id: 'galleon-stbd-stair-side-low', minX: 285.15, maxX: 285.45, minZ: 254.5, maxZ: 256.2, minY: 3.65, maxY: 4.65 },
  { id: 'galleon-stbd-stair-side-mid', minX: 285.15, maxX: 285.45, minZ: 256.2, maxZ: 257.85, minY: 3.65, maxY: 5.65 },
  { id: 'galleon-stbd-stair-side-high', minX: 285.15, maxX: 285.45, minZ: 257.85, maxZ: 259.5, minY: 3.65, maxY: 6.65 },
  { id: 'galleon-quarterdeck-front-center-rail', minX: 278.7, maxX: 285.3, minZ: 259.41, maxZ: 259.69, minY: 6.65, maxY: 7.95 },
  // 5 Broadside Deck Cannons on the Royal Galleon Main Deck (harborModels.ts lines 2245-2258)
  ...[
    [-5.2, -13.5, -1],
    [5.2, -13.5, 1],
    [-5.2, -7.5, -1],
    [5.2, -7.5, 1],
    [5.2, -1.5, 1],
  ].map(([lx, lz, side], idx) => ({
    id: `galleon-deck-cannon-${idx + 1}`,
    minX: SOUTHEAST_HARBOR_POS.shipX + lx + (side === 1 ? -0.68 : -1.35),
    maxX: SOUTHEAST_HARBOR_POS.shipX + lx + (side === 1 ? 1.35 : 0.68),
    minZ: SOUTHEAST_HARBOR_POS.shipZ + lz - 0.36,
    maxZ: SOUTHEAST_HARBOR_POS.shipZ + lz + 0.36,
    minY: 3.65,
    maxY: 4.5,
  })),
  { id: 'hall-interior-stair-rail-w', minX: 13.2, maxX: 13.55, minZ: -206.0 + FZ, maxZ: -194.2 + FZ, minY: 27.4, maxY: 36.8 },
  { id: 'west-pavilion-stair-rail-inner', minX: -35.15, maxX: -34.8, minZ: -167.4 + FZ, maxZ: -159.6 + FZ, minY: 26.6, maxY: 33.8 },
  { id: 'east-pavilion-stair-rail-inner', minX: 34.8, maxX: 35.15, minZ: -167.4 + FZ, maxZ: -159.6 + FZ, minY: 26.6, maxY: 33.8 },
  { id: 'mine-catwalk-stair-rail-e', minX: SOUTHERN_MINE_POS.x - 9.45, maxX: SOUTHERN_MINE_POS.x - 9.1, minZ: SOUTHERN_MINE_POS.entranceZ + 35.6, maxZ: SOUTHERN_MINE_POS.entranceZ + 44.4, minY: SOUTHERN_MINE_POS.cavernFloorY, maxY: SOUTHERN_MINE_POS.cavernFloorY + 5.2 },
  { id: 'mine-catwalk-stair-rail-w', minX: SOUTHERN_MINE_POS.x - 12.75, maxX: SOUTHERN_MINE_POS.x - 12.4, minZ: SOUTHERN_MINE_POS.entranceZ + 35.6, maxZ: SOUTHERN_MINE_POS.entranceZ + 44.4, minY: SOUTHERN_MINE_POS.cavernFloorY, maxY: SOUTHERN_MINE_POS.cavernFloorY + 5.2 },
  { id: 'galleon-mast-fore', minX: 281.6, maxX: 282.4, minZ: 235.4, maxZ: 236.2, minY: 3.65, maxY: 25.3 },
  { id: 'galleon-mast-main', minX: 281.6, maxX: 282.4, minZ: 243.4, maxZ: 244.2, minY: 3.65, maxY: 29.0 },
  { id: 'galleon-mast-mizzen', minX: 281.6, maxX: 282.4, minZ: 251.0, maxZ: 251.8, minY: 3.65, maxY: 24.8 },
  { id: 'galleon-helm-wheel-stand', minX: 281.25, maxX: 282.75, minZ: 260.2, maxZ: 261.6, minY: 6.65, maxY: 8.65 },
  { id: 'galleon-quarterdeck-chest', minX: 285.05, maxX: 286.55, minZ: 268.97, maxZ: 270.03, minY: 6.65, maxY: 7.75 },
  // Royal Galleon Shipwright's Naval Office inside Captain's Cabin (centered at 282.0, 267.6)
  { id: 'galleon-office-desk', minX: 280.25, maxX: 283.75, minZ: 266.82, maxZ: 268.38, minY: 3.65, maxY: 4.65 },
  { id: 'galleon-office-chair-npc', minX: 281.55, maxX: 282.45, minZ: 268.4, maxZ: 269.3, minY: 3.65, maxY: 5.35 },
  { id: 'galleon-office-bookshelf-port', minX: 276.42, maxX: 277.28, minZ: 261.9, maxZ: 268.1, minY: 3.65, maxY: 6.22 },
  { id: 'galleon-office-drafting-stbd', minX: 286.67, maxX: 287.63, minZ: 262.1, maxZ: 267.9, minY: 3.65, maxY: 4.95 },
  { id: 'galleon-office-strongbox', minX: 277.45, maxX: 278.95, minZ: 269.87, maxZ: 270.93, minY: 3.65, maxY: 4.75 },
  { id: 'galleon-office-globe', minX: 285.25, maxX: 286.35, minZ: 269.65, maxZ: 270.75, minY: 3.65, maxY: 5.48 },
  { id: 'sw-observatory-north-wall', minX: SOUTHWEST_OASIS_POS.observatoryX - 4.8, maxX: SOUTHWEST_OASIS_POS.observatoryX + 4.8, minZ: SOUTHWEST_OASIS_POS.observatoryZ - 5.1, maxZ: SOUTHWEST_OASIS_POS.observatoryZ - 4.65, maxY: 21.4 },
  { id: 'sw-observatory-west-wall', minX: SOUTHWEST_OASIS_POS.observatoryX - 5.1, maxX: SOUTHWEST_OASIS_POS.observatoryX - 4.4, minZ: SOUTHWEST_OASIS_POS.observatoryZ - 4.9, maxZ: SOUTHWEST_OASIS_POS.observatoryZ + 4.9, maxY: 21.4 },
  { id: 'sw-observatory-east-wall', minX: SOUTHWEST_OASIS_POS.observatoryX + 4.4, maxX: SOUTHWEST_OASIS_POS.observatoryX + 5.1, minZ: SOUTHWEST_OASIS_POS.observatoryZ - 4.9, maxZ: SOUTHWEST_OASIS_POS.observatoryZ + 4.9, maxY: 21.4 },
  { id: 'sw-observatory-south-left', minX: SOUTHWEST_OASIS_POS.observatoryX - 4.8, maxX: SOUTHWEST_OASIS_POS.observatoryX - 1.35, minZ: SOUTHWEST_OASIS_POS.observatoryZ + 4.5, maxZ: SOUTHWEST_OASIS_POS.observatoryZ + 5.2, maxY: 21.4 },
  { id: 'sw-observatory-south-right', minX: SOUTHWEST_OASIS_POS.observatoryX + 1.35, maxX: SOUTHWEST_OASIS_POS.observatoryX + 4.8, minZ: SOUTHWEST_OASIS_POS.observatoryZ + 4.5, maxZ: SOUTHWEST_OASIS_POS.observatoryZ + 5.2, maxY: 21.4 },
  { id: 'sw-observatory-top-rail-n', minX: SOUTHWEST_OASIS_POS.observatoryX - 5.2, maxX: SOUTHWEST_OASIS_POS.observatoryX + 5.2, minZ: SOUTHWEST_OASIS_POS.observatoryZ - 5.4, maxZ: SOUTHWEST_OASIS_POS.observatoryZ - 5.0, minY: 21.0, maxY: 22.45 },
  { id: 'sw-observatory-top-rail-s', minX: SOUTHWEST_OASIS_POS.observatoryX - 5.2, maxX: SOUTHWEST_OASIS_POS.observatoryX + 5.2, minZ: SOUTHWEST_OASIS_POS.observatoryZ + 5.0, maxZ: SOUTHWEST_OASIS_POS.observatoryZ + 5.4, minY: 21.0, maxY: 22.45 },
  { id: 'sw-observatory-top-rail-w', minX: SOUTHWEST_OASIS_POS.observatoryX - 5.4, maxX: SOUTHWEST_OASIS_POS.observatoryX - 5.0, minZ: SOUTHWEST_OASIS_POS.observatoryZ - 5.4, maxZ: SOUTHWEST_OASIS_POS.observatoryZ + 5.4, minY: 21.0, maxY: 22.45 },
  { id: 'sw-observatory-top-rail-e', minX: SOUTHWEST_OASIS_POS.observatoryX + 5.0, maxX: SOUTHWEST_OASIS_POS.observatoryX + 5.4, minZ: SOUTHWEST_OASIS_POS.observatoryZ - 5.4, maxZ: SOUTHWEST_OASIS_POS.observatoryZ + 5.4, minY: 21.0, maxY: 22.45 },
  { id: 'sw-alchemist-west-wall', minX: SOUTHWEST_OASIS_POS.pavilionX - 5.5, maxX: SOUTHWEST_OASIS_POS.pavilionX - 4.9, minZ: SOUTHWEST_OASIS_POS.pavilionZ - 6.6, maxZ: SOUTHWEST_OASIS_POS.pavilionZ + 6.6, maxY: 11.2 },
  { id: 'sw-alchemist-north-wall', minX: SOUTHWEST_OASIS_POS.pavilionX - 5.4, maxX: SOUTHWEST_OASIS_POS.pavilionX + 5.4, minZ: SOUTHWEST_OASIS_POS.pavilionZ - 6.7, maxZ: SOUTHWEST_OASIS_POS.pavilionZ - 6.1, maxY: 11.2 },
  { id: 'sw-alchemist-south-wall', minX: SOUTHWEST_OASIS_POS.pavilionX - 5.4, maxX: SOUTHWEST_OASIS_POS.pavilionX + 5.4, minZ: SOUTHWEST_OASIS_POS.pavilionZ + 6.1, maxZ: SOUTHWEST_OASIS_POS.pavilionZ + 6.7, maxY: 11.2 },
  { id: 'sw-alchemist-east-north', minX: SOUTHWEST_OASIS_POS.pavilionX + 4.9, maxX: SOUTHWEST_OASIS_POS.pavilionX + 5.5, minZ: SOUTHWEST_OASIS_POS.pavilionZ - 6.6, maxZ: SOUTHWEST_OASIS_POS.pavilionZ - 1.35, maxY: 11.2 },
  { id: 'sw-alchemist-east-south', minX: SOUTHWEST_OASIS_POS.pavilionX + 4.9, maxX: SOUTHWEST_OASIS_POS.pavilionX + 5.5, minZ: SOUTHWEST_OASIS_POS.pavilionZ + 1.35, maxZ: SOUTHWEST_OASIS_POS.pavilionZ + 6.6, maxY: 11.2 },
  // Oasis Fountain central sculpted spire (outer rim & basin are climbable in walkableHeightAt!)
  { id: 'sw-oasis-fountain-center-spire', minX: SOUTHWEST_OASIS_POS.fountainX - 0.75, maxX: SOUTHWEST_OASIS_POS.fountainX + 0.75, minZ: SOUTHWEST_OASIS_POS.fountainZ - 0.75, maxZ: SOUTHWEST_OASIS_POS.fountainZ + 0.75, maxY: 8.8 },
  // Market Stall solid counters & full Oriented Bounding Box (OBB) booth frames (all 6 Harbor Market Stalls rotated toward Harbor Fountain)
  {
    id: 'market-stall-counter-harbor-1',
    minX: 212.0 - 2.15,
    maxX: 212.0 + 2.15,
    minZ: 254.0 - 1.65,
    maxZ: 254.0 + 1.65,
    minY: 3.2,
    maxY: 6.2,
    yaw: Math.atan2(SOUTHEAST_HARBOR_POS.fountainX - 212.0, SOUTHEAST_HARBOR_POS.fountainZ - 254.0),
  },
  {
    id: 'market-stall-counter-harbor-2',
    minX: 212.0 - 2.15,
    maxX: 212.0 + 2.15,
    minZ: 263.0 - 1.65,
    maxZ: 263.0 + 1.65,
    minY: 3.2,
    maxY: 6.2,
    yaw: Math.atan2(SOUTHEAST_HARBOR_POS.fountainX - 212.0, SOUTHEAST_HARBOR_POS.fountainZ - 263.0),
  },
  {
    id: 'market-stall-counter-harbor-3',
    minX: 224.0 - 2.15,
    maxX: 224.0 + 2.15,
    minZ: 263.0 - 1.65,
    maxZ: 263.0 + 1.65,
    minY: 3.2,
    maxY: 6.2,
    yaw: Math.atan2(SOUTHEAST_HARBOR_POS.fountainX - 224.0, SOUTHEAST_HARBOR_POS.fountainZ - 263.0),
  },
  {
    id: 'market-stall-counter-harbor-4',
    minX: 240.0 - 2.15,
    maxX: 240.0 + 2.15,
    minZ: 263.0 - 1.65,
    maxZ: 263.0 + 1.65,
    minY: 3.2,
    maxY: 6.2,
    yaw: Math.atan2(SOUTHEAST_HARBOR_POS.fountainX - 240.0, SOUTHEAST_HARBOR_POS.fountainZ - 263.0),
  },
  {
    id: 'market-stall-counter-harbor-5',
    minX: 246.0 - 2.15,
    maxX: 246.0 + 2.15,
    minZ: 238.0 - 1.65,
    maxZ: 238.0 + 1.65,
    minY: 3.2,
    maxY: 6.2,
    yaw: Math.atan2(SOUTHEAST_HARBOR_POS.fountainX - 246.0, SOUTHEAST_HARBOR_POS.fountainZ - 238.0),
  },
  {
    id: 'market-stall-counter-harbor-6',
    minX: 246.0 - 2.15,
    maxX: 246.0 + 2.15,
    minZ: 246.0 - 1.65,
    maxZ: 246.0 + 1.65,
    minY: 3.2,
    maxY: 6.2,
    yaw: Math.atan2(SOUTHEAST_HARBOR_POS.fountainX - 246.0, SOUTHEAST_HARBOR_POS.fountainZ - 246.0),
  },
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
  // Grand Southern River Bridge North & South Stone Parapet Guardrails
  {
    id: 'southern-river-bridge-rail-north',
    minX: 154.0,
    maxX: 202.0,
    minZ: 374.55,
    maxZ: 375.0,
    minY: 1.8,
    maxY: 6.2,
  },
  {
    id: 'southern-river-bridge-rail-south',
    minX: 154.0,
    maxX: 202.0,
    minZ: 381.0,
    maxZ: 381.45,
    minY: 1.8,
    maxY: 6.2,
  },
  // Subterranean Mountain Bear Caves: Entrance Tunnel walls (lz: -5.5..+5.5, |lx|=3.8..5.4)
  // and wide Subterranean Cavern walls (lz: -24.5..-5.5, |lx|=10.0..12.2).
  // Baffle rock pillars removed and throat widened to 7.6m so large bears can exit freely!
  // 1) Cave NW Forest (cx=-85, cz=-76, yaw=0: lx = x - (-85), lz = z - (-76))
  { id: 'cave-nw-tunnel-west', minX: -90.6, maxX: -88.8, minZ: -81.5, maxZ: -70.5, maxY: 8.6 },
  { id: 'cave-nw-tunnel-east', minX: -81.2, maxX: -79.4, minZ: -81.5, maxZ: -70.5, maxY: 8.6 },
  { id: 'cave-nw-shoulder-west', minX: -96.5, maxX: -88.8, minZ: -82.5, maxZ: -80.8, maxY: 11.0 },
  { id: 'cave-nw-shoulder-east', minX: -81.2, maxX: -73.5, minZ: -82.5, maxZ: -80.8, maxY: 11.0 },
  { id: 'cave-nw-cavern-west', minX: -97.2, maxX: -95.0, minZ: -100.5, maxZ: -81.5, maxY: 11.0 },
  { id: 'cave-nw-cavern-east', minX: -75.0, maxX: -72.8, minZ: -100.5, maxZ: -81.5, maxY: 11.0 },
  { id: 'cave-nw-cavern-back', minX: -96.5, maxX: -73.5, minZ: -102.2, maxZ: -100.0, maxY: 11.0 },

  // 2) Cave West Ridge (cx=-186, cz=-45, yaw=PI/2: lx = -(z - (-45)), lz = x - (-186))
  { id: 'cave-west-tunnel-south', minX: -191.5, maxX: -180.5, minZ: -41.2, maxZ: -39.4, maxY: 8.8 },
  { id: 'cave-west-tunnel-north', minX: -191.5, maxX: -180.5, minZ: -50.6, maxZ: -48.8, maxY: 8.8 },
  { id: 'cave-west-shoulder-south', minX: -192.5, maxX: -190.8, minZ: -41.2, maxZ: -33.5, maxY: 11.5 },
  { id: 'cave-west-shoulder-north', minX: -192.5, maxX: -190.8, minZ: -56.5, maxZ: -48.8, maxY: 11.5 },
  { id: 'cave-west-cavern-south', minX: -210.5, maxX: -191.5, minZ: -35.0, maxZ: -32.8, maxY: 11.5 },
  { id: 'cave-west-cavern-north', minX: -210.5, maxX: -191.5, minZ: -57.2, maxZ: -55.0, maxY: 11.5 },
  { id: 'cave-west-cavern-back', minX: -212.2, maxX: -210.0, minZ: -56.5, maxZ: -33.5, maxY: 11.5 },

  // 3) Cave South Forest (cx=38, cz=294, yaw=PI: lx = -(x - 38), lz = -(z - 294))
  { id: 'cave-south-tunnel-west', minX: 32.4, maxX: 34.2, minZ: 288.5, maxZ: 299.5, maxY: 8.8 },
  { id: 'cave-south-tunnel-east', minX: 41.8, maxX: 43.6, minZ: 288.5, maxZ: 299.5, maxY: 8.8 },
  { id: 'cave-south-shoulder-west', minX: 26.5, maxX: 34.2, minZ: 298.8, maxZ: 300.5, maxY: 11.5 },
  { id: 'cave-south-shoulder-east', minX: 41.8, maxX: 49.5, minZ: 298.8, maxZ: 300.5, maxY: 11.5 },
  { id: 'cave-south-cavern-west', minX: 25.8, maxX: 28.0, minZ: 299.5, maxZ: 318.5, maxY: 11.5 },
  { id: 'cave-south-cavern-east', minX: 48.0, maxX: 50.2, minZ: 299.5, maxZ: 318.5, maxY: 11.5 },
  { id: 'cave-south-cavern-back', minX: 26.5, maxX: 49.5, minZ: 318.0, maxZ: 320.2, maxY: 11.5 },

  // Ancient Dragon Citadel Ruins at SOUTHERN_DRAGON_RUINS_POS — Shattered curtain walls (+/-37m) with wide breach gaps, gateways & altar
  { id: 'south-ruins-arch-west', minX: SOUTHERN_DRAGON_RUINS_POS.x - 6.2, maxX: SOUTHERN_DRAGON_RUINS_POS.x - 3.2, minZ: SOUTHERN_DRAGON_RUINS_POS.z - 38.5, maxZ: SOUTHERN_DRAGON_RUINS_POS.z - 35.5, maxY: 11.2 },
  { id: 'south-ruins-arch-east', minX: SOUTHERN_DRAGON_RUINS_POS.x + 3.2, maxX: SOUTHERN_DRAGON_RUINS_POS.x + 6.2, minZ: SOUTHERN_DRAGON_RUINS_POS.z - 38.5, maxZ: SOUTHERN_DRAGON_RUINS_POS.z - 35.5, maxY: 11.2 },
  { id: 'south-ruins-wall-nw-outer', minX: SOUTHERN_DRAGON_RUINS_POS.x - 35.0, maxX: SOUTHERN_DRAGON_RUINS_POS.x - 24.5, minZ: SOUTHERN_DRAGON_RUINS_POS.z - 38.4, maxZ: SOUTHERN_DRAGON_RUINS_POS.z - 35.6, maxY: 9.2 },
  { id: 'south-ruins-wall-nw-inner', minX: SOUTHERN_DRAGON_RUINS_POS.x - 17.5, maxX: SOUTHERN_DRAGON_RUINS_POS.x - 7.5, minZ: SOUTHERN_DRAGON_RUINS_POS.z - 38.4, maxZ: SOUTHERN_DRAGON_RUINS_POS.z - 35.6, maxY: 8.6 },
  { id: 'south-ruins-wall-ne-inner', minX: SOUTHERN_DRAGON_RUINS_POS.x + 7.5, maxX: SOUTHERN_DRAGON_RUINS_POS.x + 17.5, minZ: SOUTHERN_DRAGON_RUINS_POS.z - 38.4, maxZ: SOUTHERN_DRAGON_RUINS_POS.z - 35.6, maxY: 8.6 },
  { id: 'south-ruins-wall-ne-outer', minX: SOUTHERN_DRAGON_RUINS_POS.x + 24.5, maxX: SOUTHERN_DRAGON_RUINS_POS.x + 35.0, minZ: SOUTHERN_DRAGON_RUINS_POS.z - 38.4, maxZ: SOUTHERN_DRAGON_RUINS_POS.z - 35.6, maxY: 9.2 },
  { id: 'south-ruins-wall-west-n', minX: SOUTHERN_DRAGON_RUINS_POS.x - 38.4, maxX: SOUTHERN_DRAGON_RUINS_POS.x - 35.6, minZ: SOUTHERN_DRAGON_RUINS_POS.z - 35.0, maxZ: SOUTHERN_DRAGON_RUINS_POS.z - 20.0, maxY: 9.5 },
  { id: 'south-ruins-wall-west-mid', minX: SOUTHERN_DRAGON_RUINS_POS.x - 38.4, maxX: SOUTHERN_DRAGON_RUINS_POS.x - 35.6, minZ: SOUTHERN_DRAGON_RUINS_POS.z - 12.5, maxZ: SOUTHERN_DRAGON_RUINS_POS.z - 2.5, maxY: 8.2 },
  { id: 'south-ruins-wall-west-s', minX: SOUTHERN_DRAGON_RUINS_POS.x - 38.4, maxX: SOUTHERN_DRAGON_RUINS_POS.x - 35.6, minZ: SOUTHERN_DRAGON_RUINS_POS.z + 19.0, maxZ: SOUTHERN_DRAGON_RUINS_POS.z + 34.5, maxY: 9.5 },
  { id: 'south-ruins-wall-east-n', minX: SOUTHERN_DRAGON_RUINS_POS.x + 35.6, maxX: SOUTHERN_DRAGON_RUINS_POS.x + 38.4, minZ: SOUTHERN_DRAGON_RUINS_POS.z - 35.0, maxZ: SOUTHERN_DRAGON_RUINS_POS.z - 20.0, maxY: 9.5 },
  { id: 'south-ruins-wall-east-s', minX: SOUTHERN_DRAGON_RUINS_POS.x + 35.6, maxX: SOUTHERN_DRAGON_RUINS_POS.x + 38.4, minZ: SOUTHERN_DRAGON_RUINS_POS.z + 19.0, maxZ: SOUTHERN_DRAGON_RUINS_POS.z + 34.5, maxY: 9.5 },
  { id: 'south-ruins-wall-south-w', minX: SOUTHERN_DRAGON_RUINS_POS.x - 35.0, maxX: SOUTHERN_DRAGON_RUINS_POS.x - 20.0, minZ: SOUTHERN_DRAGON_RUINS_POS.z + 35.6, maxZ: SOUTHERN_DRAGON_RUINS_POS.z + 38.4, maxY: 9.8 },
  { id: 'south-ruins-wall-south-e', minX: SOUTHERN_DRAGON_RUINS_POS.x + 20.0, maxX: SOUTHERN_DRAGON_RUINS_POS.x + 35.0, minZ: SOUTHERN_DRAGON_RUINS_POS.z + 35.6, maxZ: SOUTHERN_DRAGON_RUINS_POS.z + 38.4, maxY: 9.8 },
  { id: 'south-ruins-altar', minX: SOUTHERN_DRAGON_RUINS_POS.x - 3.6, maxX: SOUTHERN_DRAGON_RUINS_POS.x + 3.6, minZ: SOUTHERN_DRAGON_RUINS_POS.z + 17.5, maxZ: SOUTHERN_DRAGON_RUINS_POS.z + 22.5, maxY: 4.8 },

  // Colossal Volcano Sanctum (centered at VOLCANO_SANCTUM_POS: -620, 115, chamberRadius = 30.0m)
  // 3 Cardinal Entrance Corridors (East +X, North -Z, South +Z) with Chicane Baffle Walls at r = 54.5..59.5m
  // 1) East Corridor (+X: dx in 28..96, pocket at dx in 46..68, baffle wall at dx in 54.5..59.5, |dz| <= 5.8)
  { id: 'volcano-east-inner-wall-n', minX: VOLCANO_SANCTUM_POS.x + 27.5, maxX: VOLCANO_SANCTUM_POS.x + 46.5, minZ: VOLCANO_SANCTUM_POS.z - 6.8, maxZ: VOLCANO_SANCTUM_POS.z - 4.8, maxY: 16.5 },
  { id: 'volcano-east-inner-wall-s', minX: VOLCANO_SANCTUM_POS.x + 27.5, maxX: VOLCANO_SANCTUM_POS.x + 46.5, minZ: VOLCANO_SANCTUM_POS.z + 4.8, maxZ: VOLCANO_SANCTUM_POS.z + 6.8, maxY: 16.5 },
  { id: 'volcano-east-pocket-wall-n', minX: VOLCANO_SANCTUM_POS.x + 45.5, maxX: VOLCANO_SANCTUM_POS.x + 68.5, minZ: VOLCANO_SANCTUM_POS.z - 13.2, maxZ: VOLCANO_SANCTUM_POS.z - 11.2, maxY: 16.5 },
  { id: 'volcano-east-pocket-wall-s', minX: VOLCANO_SANCTUM_POS.x + 45.5, maxX: VOLCANO_SANCTUM_POS.x + 68.5, minZ: VOLCANO_SANCTUM_POS.z + 11.2, maxZ: VOLCANO_SANCTUM_POS.z + 13.2, maxY: 16.5 },
  { id: 'volcano-east-outer-wall-n', minX: VOLCANO_SANCTUM_POS.x + 67.5, maxX: VOLCANO_SANCTUM_POS.x + 96.0, minZ: VOLCANO_SANCTUM_POS.z - 6.8, maxZ: VOLCANO_SANCTUM_POS.z - 4.8, maxY: 16.5 },
  { id: 'volcano-east-outer-wall-s', minX: VOLCANO_SANCTUM_POS.x + 67.5, maxX: VOLCANO_SANCTUM_POS.x + 96.0, minZ: VOLCANO_SANCTUM_POS.z + 4.8, maxZ: VOLCANO_SANCTUM_POS.z + 6.8, maxY: 16.5 },
  { id: 'volcano-baffle-east', minX: VOLCANO_SANCTUM_POS.x + 54.5, maxX: VOLCANO_SANCTUM_POS.x + 59.5, minZ: VOLCANO_SANCTUM_POS.z - 5.8, maxZ: VOLCANO_SANCTUM_POS.z + 5.8, maxY: 16.5 },

  // 2) North Corridor (-Z: dz in -96..-28, pocket at dz in -68..-46, baffle wall at dz in -59.5..-54.5, |dx| <= 5.8)
  { id: 'volcano-north-inner-wall-w', minX: VOLCANO_SANCTUM_POS.x - 6.8, maxX: VOLCANO_SANCTUM_POS.x - 4.8, minZ: VOLCANO_SANCTUM_POS.z - 46.5, maxZ: VOLCANO_SANCTUM_POS.z - 27.5, maxY: 16.5 },
  { id: 'volcano-north-inner-wall-e', minX: VOLCANO_SANCTUM_POS.x + 4.8, maxX: VOLCANO_SANCTUM_POS.x + 6.8, minZ: VOLCANO_SANCTUM_POS.z - 46.5, maxZ: VOLCANO_SANCTUM_POS.z - 27.5, maxY: 16.5 },
  { id: 'volcano-north-pocket-wall-w', minX: VOLCANO_SANCTUM_POS.x - 13.2, maxX: VOLCANO_SANCTUM_POS.x - 11.2, minZ: VOLCANO_SANCTUM_POS.z - 68.5, maxZ: VOLCANO_SANCTUM_POS.z - 45.5, maxY: 16.5 },
  { id: 'volcano-north-pocket-wall-e', minX: VOLCANO_SANCTUM_POS.x + 11.2, maxX: VOLCANO_SANCTUM_POS.x + 13.2, minZ: VOLCANO_SANCTUM_POS.z - 68.5, maxZ: VOLCANO_SANCTUM_POS.z - 45.5, maxY: 16.5 },
  { id: 'volcano-north-outer-wall-w', minX: VOLCANO_SANCTUM_POS.x - 6.8, maxX: VOLCANO_SANCTUM_POS.x - 4.8, minZ: VOLCANO_SANCTUM_POS.z - 96.0, maxZ: VOLCANO_SANCTUM_POS.z - 67.5, maxY: 16.5 },
  { id: 'volcano-north-outer-wall-e', minX: VOLCANO_SANCTUM_POS.x + 4.8, maxX: VOLCANO_SANCTUM_POS.x + 6.8, minZ: VOLCANO_SANCTUM_POS.z - 96.0, maxZ: VOLCANO_SANCTUM_POS.z - 67.5, maxY: 16.5 },
  { id: 'volcano-baffle-north', minX: VOLCANO_SANCTUM_POS.x - 5.8, maxX: VOLCANO_SANCTUM_POS.x + 5.8, minZ: VOLCANO_SANCTUM_POS.z - 59.5, maxZ: VOLCANO_SANCTUM_POS.z - 54.5, maxY: 16.5 },

  // 3) South Corridor (+Z: dz in 28..96, pocket at dz in 46..68, baffle wall at dz in 54.5..59.5, |dx| <= 5.8)
  { id: 'volcano-south-inner-wall-w', minX: VOLCANO_SANCTUM_POS.x - 6.8, maxX: VOLCANO_SANCTUM_POS.x - 4.8, minZ: VOLCANO_SANCTUM_POS.z + 27.5, maxZ: VOLCANO_SANCTUM_POS.z + 46.5, maxY: 16.5 },
  { id: 'volcano-south-inner-wall-e', minX: VOLCANO_SANCTUM_POS.x + 4.8, maxX: VOLCANO_SANCTUM_POS.x + 6.8, minZ: VOLCANO_SANCTUM_POS.z + 27.5, maxZ: VOLCANO_SANCTUM_POS.z + 46.5, maxY: 16.5 },
  { id: 'volcano-south-pocket-wall-w', minX: VOLCANO_SANCTUM_POS.x - 13.2, maxX: VOLCANO_SANCTUM_POS.x - 11.2, minZ: VOLCANO_SANCTUM_POS.z + 45.5, maxZ: VOLCANO_SANCTUM_POS.z + 68.5, maxY: 16.5 },
  { id: 'volcano-south-pocket-wall-e', minX: VOLCANO_SANCTUM_POS.x + 11.2, maxX: VOLCANO_SANCTUM_POS.x + 13.2, minZ: VOLCANO_SANCTUM_POS.z + 45.5, maxZ: VOLCANO_SANCTUM_POS.z + 68.5, maxY: 16.5 },
  { id: 'volcano-south-outer-wall-w', minX: VOLCANO_SANCTUM_POS.x - 6.8, maxX: VOLCANO_SANCTUM_POS.x - 4.8, minZ: VOLCANO_SANCTUM_POS.z + 67.5, maxZ: VOLCANO_SANCTUM_POS.z + 96.0, maxY: 16.5 },
  { id: 'volcano-south-outer-wall-e', minX: VOLCANO_SANCTUM_POS.x + 4.8, maxX: VOLCANO_SANCTUM_POS.x + 6.8, minZ: VOLCANO_SANCTUM_POS.z + 67.5, maxZ: VOLCANO_SANCTUM_POS.z + 96.0, maxY: 16.5 },
  { id: 'volcano-baffle-south', minX: VOLCANO_SANCTUM_POS.x - 5.8, maxX: VOLCANO_SANCTUM_POS.x + 5.8, minZ: VOLCANO_SANCTUM_POS.z + 54.5, maxZ: VOLCANO_SANCTUM_POS.z + 59.5, maxY: 16.5 },

  // 4) Inner Boss Chamber Perimeter Walls (30m radius with openings at East, North, South corridors)
  { id: 'volcano-chamber-west-wall', minX: VOLCANO_SANCTUM_POS.x - 31.5, maxX: VOLCANO_SANCTUM_POS.x - 28.5, minZ: VOLCANO_SANCTUM_POS.z - 29.0, maxZ: VOLCANO_SANCTUM_POS.z + 29.0, maxY: 22.0 },
  { id: 'volcano-chamber-north-west', minX: VOLCANO_SANCTUM_POS.x - 29.5, maxX: VOLCANO_SANCTUM_POS.x - 4.8, minZ: VOLCANO_SANCTUM_POS.z - 31.5, maxZ: VOLCANO_SANCTUM_POS.z - 28.5, maxY: 22.0 },
  { id: 'volcano-chamber-north-east', minX: VOLCANO_SANCTUM_POS.x + 4.8, maxX: VOLCANO_SANCTUM_POS.x + 29.5, minZ: VOLCANO_SANCTUM_POS.z - 31.5, maxZ: VOLCANO_SANCTUM_POS.z - 28.5, maxY: 22.0 },
  { id: 'volcano-chamber-south-west', minX: VOLCANO_SANCTUM_POS.x - 29.5, maxX: VOLCANO_SANCTUM_POS.x - 4.8, minZ: VOLCANO_SANCTUM_POS.z + 28.5, maxZ: VOLCANO_SANCTUM_POS.z + 31.5, maxY: 22.0 },
  { id: 'volcano-chamber-south-east', minX: VOLCANO_SANCTUM_POS.x + 4.8, maxX: VOLCANO_SANCTUM_POS.x + 29.5, minZ: VOLCANO_SANCTUM_POS.z + 28.5, maxZ: VOLCANO_SANCTUM_POS.z + 31.5, maxY: 22.0 },
  { id: 'volcano-chamber-east-north', minX: VOLCANO_SANCTUM_POS.x + 28.5, maxX: VOLCANO_SANCTUM_POS.x + 31.5, minZ: VOLCANO_SANCTUM_POS.z - 29.0, maxZ: VOLCANO_SANCTUM_POS.z - 4.8, maxY: 22.0 },
  { id: 'volcano-chamber-east-south', minX: VOLCANO_SANCTUM_POS.x + 28.5, maxX: VOLCANO_SANCTUM_POS.x + 31.5, minZ: VOLCANO_SANCTUM_POS.z + 4.8, maxZ: VOLCANO_SANCTUM_POS.z + 29.0, maxY: 22.0 },

  // 5) Southern Cliffside Mountain Pass Guardrail Fence along the River Gorge drop-off (x = 101.35, z = 516..678)
  { id: 'southern-cliff-pass-guardrail', minX: 101.1, maxX: 101.7, minZ: 516.0, maxZ: 678.0, maxY: 14.0 },

  // 6) Desert Sun Pyramid Twin Obelisks & Guardian Sphinx Pedestal
  { id: 'desert-pyramid-obelisk-north', minX: DESERT_PYRAMID_SANCTUARY_POS.x + 28.0 - 1.4, maxX: DESERT_PYRAMID_SANCTUARY_POS.x + 28.0 + 1.4, minZ: DESERT_PYRAMID_SANCTUARY_POS.z - 10.5 - 1.4, maxZ: DESERT_PYRAMID_SANCTUARY_POS.z - 10.5 + 1.4, maxY: 18.5 },
  { id: 'desert-pyramid-obelisk-south', minX: DESERT_PYRAMID_SANCTUARY_POS.x + 28.0 - 1.4, maxX: DESERT_PYRAMID_SANCTUARY_POS.x + 28.0 + 1.4, minZ: DESERT_PYRAMID_SANCTUARY_POS.z + 10.5 - 1.4, maxZ: DESERT_PYRAMID_SANCTUARY_POS.z + 10.5 + 1.4, maxY: 18.5 },
  { id: 'desert-pyramid-sphinx', minX: DESERT_PYRAMID_SANCTUARY_POS.sphinxX - 5.2, maxX: DESERT_PYRAMID_SANCTUARY_POS.sphinxX + 5.2, minZ: DESERT_PYRAMID_SANCTUARY_POS.sphinxZ - 14.0 - 2.4, maxZ: DESERT_PYRAMID_SANCTUARY_POS.sphinxZ - 14.0 + 2.4, maxY: 10.5 },

  // 7) Southwest Oasis Amphitheater Colonnade, Twin Obelisks, and Date Palms (oasisModels.ts)
  ...[0, 1, 2, 3, 4, 5].map((c) => {
    const ang = Math.PI * 0.1 + (c / 5) * (Math.PI * 0.8);
    const cx = SOUTHWEST_OASIS_POS.x + Math.sin(ang) * 10.5;
    const cz = SOUTHWEST_OASIS_POS.z - 22.0 - Math.cos(ang) * 10.5;
    return {
      id: `sw-oasis-colonnade-${c + 1}`,
      minX: cx - 0.55,
      maxX: cx + 0.55,
      minZ: cz - 0.55,
      maxZ: cz + 0.55,
      minY: SOUTHWEST_OASIS_POS.terraceY,
      maxY: SOUTHWEST_OASIS_POS.terraceY + 5.2,
    };
  }),
  ...[-8.5, 8.5].map((ox, idx) => ({
    id: `sw-oasis-obelisk-${idx + 1}`,
    minX: SOUTHWEST_OASIS_POS.x + ox - 0.9,
    maxX: SOUTHWEST_OASIS_POS.x + ox + 0.9,
    minZ: SOUTHWEST_OASIS_POS.z + 24.0 - 0.9,
    maxZ: SOUTHWEST_OASIS_POS.z + 24.0 + 0.9,
    minY: SOUTHWEST_OASIS_POS.terraceY,
    maxY: SOUTHWEST_OASIS_POS.terraceY + 7.2,
  })),
  ...[
    [-16, -8, 1.15],
    [-19, 4, 1.0],
    [-15, 16, 1.2],
    [-26, -16, 0.95],
    [-28, 12, 1.1],
    [16, -6, 1.1],
    [18, 6, 1.25],
    [14, 18, 1.0],
    [25, -14, 1.05],
    [27, 14, 0.95],
    [-6, 20, 1.15],
    [6, 20, 1.1],
  ].map(([px, pz, pScale], idx) => ({
    id: `sw-oasis-palm-${idx + 1}`,
    minX: SOUTHWEST_OASIS_POS.x + px - 0.45 * pScale,
    maxX: SOUTHWEST_OASIS_POS.x + px + 0.45 * pScale,
    minZ: SOUTHWEST_OASIS_POS.z + pz - 0.45 * pScale,
    maxZ: SOUTHWEST_OASIS_POS.z + pz + 0.45 * pScale,
    minY: SOUTHWEST_OASIS_POS.terraceY,
    maxY: SOUTHWEST_OASIS_POS.terraceY + 9.2 * pScale,
  })),

  // 8) Sakura Sanctuary Blossom Trees (sanctuaryAndDragonModels.ts)
  ...[
    [-10.5, 14.0, 1.15],
    [10.5, 14.0, 1.15],
    [-16.0, 4.0, 1.25],
    [16.0, 4.0, 1.25],
    [-18.0, -7.0, 1.1],
    [18.0, -7.0, 1.1],
    [-14.0, -18.0, 1.3],
    [14.0, -18.0, 1.3],
    [-6.0, -22.0, 1.05],
    [6.0, -22.0, 1.05],
    [-22.0, 12.0, 0.95],
    [22.0, 12.0, 0.95],
    [-24.0, -2.0, 1.0],
    [24.0, -2.0, 1.0],
  ].map(([lx, lz, sc], idx) => {
    const cosY = Math.cos(SAKURA_SANCTUARY_YAW);
    const sinY = Math.sin(SAKURA_SANCTUARY_YAW);
    const wx = SAKURA_SANCTUARY_POS.x + lx * cosY + lz * sinY;
    const wz = SAKURA_SANCTUARY_POS.z - lx * sinY + lz * cosY;
    const r = 0.48 * sc;
    return {
      id: `sakura-tree-${idx + 1}`,
      minX: wx - r,
      maxX: wx + r,
      minZ: wz - r,
      maxZ: wz + r,
      minY: SAKURA_SANCTUARY_POS.height,
      maxY: SAKURA_SANCTUARY_POS.height + 6.8 * sc,
    };
  }),

  // 9) Floating Blooming Islands Architecture: Twin Watchtowers, Temple Pavilion Columns, Barracks Columns/Chest, North Citadel, East Chest
  ...[-5.2, 5.2].map((zOff, idx) => ({
    id: `floating-sky-watchtower-${idx + 1}`,
    minX: FLOATING_ISLAND_STAIR_POS.topX + 5.5 - 1.45,
    maxX: FLOATING_ISLAND_STAIR_POS.topX + 5.5 + 1.45,
    minZ: FLOATING_ISLAND_STAIR_POS.z + zOff - 1.45,
    maxZ: FLOATING_ISLAND_STAIR_POS.z + zOff + 1.45,
    minY: 68.0,
    maxY: 75.5,
  })),
  ...Array.from({ length: 8 }, (_, c) => {
    const ang = (c / 8) * Math.PI * 2;
    const cx = FLOATING_BLOOMING_ISLANDS[0].x + Math.cos(ang) * 5.2;
    const cz = FLOATING_BLOOMING_ISLANDS[0].z + Math.sin(ang) * 5.2;
    return {
      id: `floating-temple-col-${c + 1}`,
      minX: cx - 0.35,
      maxX: cx + 0.35,
      minZ: cz - 0.35,
      maxZ: cz + 0.35,
      minY: 68.0,
      maxY: 74.2,
    };
  }),
  ...[-4.0, -1.35, 1.35, 4.0].flatMap((bx, bIdx) =>
    [-2.4, 2.4].map((bz, sIdx) => ({
      id: `floating-barracks-col-${bIdx * 2 + sIdx + 1}`,
      minX: FLOATING_BLOOMING_ISLANDS[0].x + bx - 0.32,
      maxX: FLOATING_BLOOMING_ISLANDS[0].x + bx + 0.32,
      minZ: FLOATING_BLOOMING_ISLANDS[0].z + 19.5 + bz - 0.32,
      maxZ: FLOATING_BLOOMING_ISLANDS[0].z + 19.5 + bz + 0.32,
      minY: 68.0,
      maxY: 72.5,
    }))
  ),
  {
    id: 'floating-barracks-chest',
    minX: FLOATING_BLOOMING_ISLANDS[0].x - 0.65,
    maxX: FLOATING_BLOOMING_ISLANDS[0].x + 0.65,
    minZ: FLOATING_BLOOMING_ISLANDS[0].z + 19.5 - 0.45,
    maxZ: FLOATING_BLOOMING_ISLANDS[0].z + 19.5 + 0.45,
    minY: 68.0,
    maxY: 69.2,
  },
  // Floating North Island Citadel Back/Side Walls & 6 Columns (at 228.0, 71.0, -93.5)
  {
    id: 'floating-north-citadel-back-wall',
    minX: FLOATING_BLOOMING_ISLANDS[1].x - 5.2,
    maxX: FLOATING_BLOOMING_ISLANDS[1].x + 5.2,
    minZ: FLOATING_BLOOMING_ISLANDS[1].z - 1.5 - 3.45,
    maxZ: FLOATING_BLOOMING_ISLANDS[1].z - 1.5 - 2.95,
    minY: 71.0,
    maxY: 76.2,
  },
  {
    id: 'floating-north-citadel-west-wall',
    minX: FLOATING_BLOOMING_ISLANDS[1].x - 5.25,
    maxX: FLOATING_BLOOMING_ISLANDS[1].x - 4.75,
    minZ: FLOATING_BLOOMING_ISLANDS[1].z - 1.5 - 3.2,
    maxZ: FLOATING_BLOOMING_ISLANDS[1].z - 1.5 + 1.2,
    minY: 71.0,
    maxY: 76.2,
  },
  {
    id: 'floating-north-citadel-east-wall',
    minX: FLOATING_BLOOMING_ISLANDS[1].x + 4.75,
    maxX: FLOATING_BLOOMING_ISLANDS[1].x + 5.25,
    minZ: FLOATING_BLOOMING_ISLANDS[1].z - 1.5 - 3.2,
    maxZ: FLOATING_BLOOMING_ISLANDS[1].z - 1.5 + 1.2,
    minY: 71.0,
    maxY: 76.2,
  },
  ...[-4.6, 0, 4.6].flatMap((cx, cIdx) =>
    [-2.8, 2.8].map((cz, sIdx) => ({
      id: `floating-north-citadel-col-${cIdx * 2 + sIdx + 1}`,
      minX: FLOATING_BLOOMING_ISLANDS[1].x + cx - 0.35,
      maxX: FLOATING_BLOOMING_ISLANDS[1].x + cx + 0.35,
      minZ: FLOATING_BLOOMING_ISLANDS[1].z - 1.5 + cz - 0.35,
      maxZ: FLOATING_BLOOMING_ISLANDS[1].z - 1.5 + cz + 0.35,
      minY: 71.0,
      maxY: 76.0,
    }))
  ),
  {
    id: 'floating-east-island-chest',
    minX: FLOATING_BLOOMING_ISLANDS[2].x + 5.5 - 0.65,
    maxX: FLOATING_BLOOMING_ISLANDS[2].x + 5.5 + 0.65,
    minZ: FLOATING_BLOOMING_ISLANDS[2].z - 0.45,
    maxZ: FLOATING_BLOOMING_ISLANDS[2].z + 0.45,
    minY: 70.0,
    maxY: 71.2,
  },
];
// #endregion

// ======================== FLAT BUILDING TERRACES ======================== \\
// #region Flat Building Terraces
/** Summary: Leveled terrace targets ensuring 100% flat ground beneath all architecture. */
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
  { x: 152.0, z: 378.0, innerR: 6.5, outerR: 14.0, targetH: 1.85 },
  { x: 204.0, z: 378.0, innerR: 6.5, outerR: 14.0, targetH: 1.85 },
  { x: 105.0, z: 715.0, innerR: 26.0, outerR: 42.0, targetH: 2.15 },
  { x: SOUTHERN_DRAGON_RUINS_POS.x, z: SOUTHERN_DRAGON_RUINS_POS.z, innerR: 54.0, outerR: 68.0, targetH: SOUTHERN_DRAGON_RUINS_POS.height },
  { x: VOLCANO_SANCTUM_POS.entranceX + 8.0, z: VOLCANO_SANCTUM_POS.entranceZ, innerR: 14.0, outerR: 26.0, targetH: VOLCANO_SANCTUM_POS.floorY },
  { x: VOLCANO_SANCTUM_POS.x, z: VOLCANO_SANCTUM_POS.z - 103.0, innerR: 12.0, outerR: 24.0, targetH: VOLCANO_SANCTUM_POS.floorY },
  { x: VOLCANO_SANCTUM_POS.x, z: VOLCANO_SANCTUM_POS.z + 103.0, innerR: 12.0, outerR: 24.0, targetH: VOLCANO_SANCTUM_POS.floorY },
  { x: FLOATING_ISLAND_STAIR_POS.waterfallX - 5.0, z: FLOATING_ISLAND_STAIR_POS.z, innerR: 22.0, outerR: 34.0, targetH: 3.25 },
  { x: NORDIC_FROST_SHRINE_POS.x, z: NORDIC_FROST_SHRINE_POS.z, innerR: 28.0, outerR: 42.0, targetH: NORDIC_FROST_SHRINE_POS.floorY },
  { x: DESERT_PYRAMID_SANCTUARY_POS.x + 8.0, z: DESERT_PYRAMID_SANCTUARY_POS.z, innerR: 42.0, outerR: 58.0, targetH: DESERT_PYRAMID_SANCTUARY_POS.baseY },
] as const;
// #endregion

// ======================== VEGETATION CLEAR ZONES ======================== \\
// #region Vegetation Clear Zones
/** Summary: Spatial exclusion circles suppressing procedural tree and rock generation. */
export const CLEAR_ZONES = [
  { x: 0, z: 32, r: 6.5 },
  { x: -5.5, z: 29.5, r: 5.5 },
  { x: -11.5, z: 16.5, r: 9.5 },
  { x: 18.0, z: 2.0, r: 12.5 },
  { x: 30.0, z: -26.0, r: 8.0 },
  { x: -34.0, z: -16.0, r: 7.5 },
  { x: HUNTER_LODGE_POS.x, z: HUNTER_LODGE_POS.z, r: 19.5 },
  { x: -113.0, z: 48.0, r: 12.0 },
  { x: 78.0, z: -35.0, r: 14.0 },
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
  { x: 154.0, z: 378.0, r: 14.0 },
  { x: 178.0, z: 378.0, r: 26.0 },
  { x: 202.0, z: 378.0, r: 14.0 },
  { x: 132.0, z: 475.0, r: 30.0 },
  { x: 100.0, z: 545.0, r: 14.0 },
  { x: 100.0, z: 580.0, r: 14.0 },
  { x: 100.0, z: 615.0, r: 14.0 },
  { x: 100.0, z: 650.0, r: 14.0 },
  { x: 105.0, z: 715.0, r: 22.0 },
  { x: SOUTHERN_DRAGON_RUINS_POS.x, z: SOUTHERN_DRAGON_RUINS_POS.z, r: 62.0 },
  { x: DESERT_DRAGON_PASS_POS.entryX, z: DESERT_DRAGON_PASS_POS.entryZ, r: 16.0 },
  { x: DESERT_DRAGON_PASS_POS.gorgeX, z: DESERT_DRAGON_PASS_POS.gorgeZ, r: 16.0 },
  { x: DESERT_DRAGON_PASS_POS.exitX, z: DESERT_DRAGON_PASS_POS.exitZ, r: 16.0 },
  { x: -85.0, z: -76.0, r: 16.0 },
  { x: -85.0, z: -90.0, r: 18.0 },
  { x: -85.0, z: -60.0, r: 14.0 },
  { x: -186.0, z: -45.0, r: 16.0 },
  { x: -200.0, z: -45.0, r: 18.0 },
  { x: -170.0, z: -45.0, r: 14.0 },
  { x: 38.0, z: 294.0, r: 16.0 },
  { x: 38.0, z: 308.0, r: 18.0 },
  { x: 38.0, z: 278.0, r: 14.0 },
  { x: VOLCANO_SANCTUM_POS.x, z: VOLCANO_SANCTUM_POS.z, r: VOLCANO_SANCTUM_POS.outerRadius + 8.0 },
  { x: VOLCANO_SANCTUM_POS.entranceX + 10.0, z: VOLCANO_SANCTUM_POS.entranceZ, r: 24.0 },
  { x: VOLCANO_SANCTUM_POS.x, z: VOLCANO_SANCTUM_POS.z - 105.0, r: 24.0 },
  { x: VOLCANO_SANCTUM_POS.x, z: VOLCANO_SANCTUM_POS.z + 105.0, r: 24.0 },
  { x: FLOATING_ISLAND_STAIR_POS.waterfallX - 5.0, z: FLOATING_ISLAND_STAIR_POS.z, r: 36.0 },
  ...FLOATING_BLOOMING_ISLANDS.map((isl) => ({ x: isl.x, z: isl.z, r: isl.radius + 6.0 })),
  { x: NORDIC_FROST_SHRINE_POS.x, z: NORDIC_FROST_SHRINE_POS.z, r: 36.0 },
  { x: DESERT_PYRAMID_SANCTUARY_POS.x + 8.0, z: DESERT_PYRAMID_SANCTUARY_POS.z, r: 48.0 },
  { x: SMUGGLER_ISLAND_POS.x, z: SMUGGLER_ISLAND_POS.z, r: 34.0 },
];
// #endregion

// ======================== ORIENTED BOUNDING BOX (OBB) COLLISION & ENTITY CONTRACT ======================== \\
// #region OBB Collision Helpers & Collidable Entity Registry
/**
 * Summary: Computes the world-space axis-aligned bounding envelope enclosing an AABB or rotated OBB (`ISolidBuildingBox`).
 * Design: Used for spatial hash grid insertion so rotated OBBs are indexed across all grid cells they touch.
 */
export function getSolidBuildingWorldAABB(box: ISolidBuildingBox): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} {
  if (!box.yaw) {
    return { minX: box.minX, maxX: box.maxX, minZ: box.minZ, maxZ: box.maxZ };
  }
  const cx = (box.minX + box.maxX) * 0.5;
  const cz = (box.minZ + box.maxZ) * 0.5;
  const halfW = (box.maxX - box.minX) * 0.5;
  const halfD = (box.maxZ - box.minZ) * 0.5;
  const c = Math.abs(Math.cos(box.yaw));
  const s = Math.abs(Math.sin(box.yaw));
  const extX = halfW * c + halfD * s;
  const extZ = halfW * s + halfD * c;
  return {
    minX: cx - extX,
    maxX: cx + extX,
    minZ: cz - extZ,
    maxZ: cz + extZ,
  };
}

/**
 * Summary: Evaluates whether a horizontal circle at `(px, pz)` with `radius` overlaps an AABB or rotated OBB (`ISolidBuildingBox`).
 * Design: Transforms `(px, pz)` into the box's local coordinate frame when `box.yaw` is defined.
 */
export function pointInsideSolidBuildingBox(
  px: number,
  pz: number,
  radius: number,
  box: ISolidBuildingBox
): boolean {
  if (!box.yaw) {
    return (
      px + radius > box.minX &&
      px - radius < box.maxX &&
      pz + radius > box.minZ &&
      pz - radius < box.maxZ
    );
  }
  const cx = (box.minX + box.maxX) * 0.5;
  const cz = (box.minZ + box.maxZ) * 0.5;
  const halfW = (box.maxX - box.minX) * 0.5;
  const halfD = (box.maxZ - box.minZ) * 0.5;
  const dx = px - cx;
  const dz = pz - cz;
  const cosY = Math.cos(box.yaw);
  const sinY = Math.sin(box.yaw);
  // Inverse Three.js Y-rotation: world -> local
  const lx = dx * cosY - dz * sinY;
  const lz = dx * sinY + dz * cosY;
  return Math.abs(lx) < halfW + radius && Math.abs(lz) < halfD + radius;
}

/**
 * Summary: Resolves horizontal collision between a cylinder of `radius` at `(px, pz)` and an AABB or rotated OBB (`ISolidBuildingBox`).
 * Design: Pushes the point out along the minimum penetration axis in the box's local frame (supporting arbitrary `yaw` rotation)
 *         and transforms the resolved coordinates back to world space.
 */
export function resolveHorizontalBoxCollision(
  px: number,
  pz: number,
  radius: number,
  box: ISolidBuildingBox
): { x: number; z: number; collided: boolean } {
  if (!box.yaw) {
    if (
      px + radius > box.minX &&
      px - radius < box.maxX &&
      pz + radius > box.minZ &&
      pz - radius < box.maxZ
    ) {
      const overlapLeft = px + radius - box.minX;
      const overlapRight = box.maxX - (px - radius);
      const overlapNorth = pz + radius - box.minZ;
      const overlapSouth = box.maxZ - (pz - radius);
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapNorth, overlapSouth);
      if (minOverlap === overlapLeft) return { x: box.minX - radius, z: pz, collided: true };
      if (minOverlap === overlapRight) return { x: box.maxX + radius, z: pz, collided: true };
      if (minOverlap === overlapNorth) return { x: px, z: box.minZ - radius, collided: true };
      return { x: px, z: box.maxZ + radius, collided: true };
    }
    return { x: px, z: pz, collided: false };
  }

  const cx = (box.minX + box.maxX) * 0.5;
  const cz = (box.minZ + box.maxZ) * 0.5;
  const halfW = (box.maxX - box.minX) * 0.5;
  const halfD = (box.maxZ - box.minZ) * 0.5;
  const dx = px - cx;
  const dz = pz - cz;
  const cosY = Math.cos(box.yaw);
  const sinY = Math.sin(box.yaw);
  // Inverse Three.js Y-rotation: world -> local
  let lx = dx * cosY - dz * sinY;
  let lz = dx * sinY + dz * cosY;

  const limitX = halfW + radius;
  const limitZ = halfD + radius;
  if (Math.abs(lx) < limitX && Math.abs(lz) < limitZ) {
    const overlapLeft = lx + limitX;
    const overlapRight = limitX - lx;
    const overlapNorth = lz + limitZ;
    const overlapSouth = limitZ - lz;
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapNorth, overlapSouth);
    if (minOverlap === overlapLeft) lx = -limitX;
    else if (minOverlap === overlapRight) lx = limitX;
    else if (minOverlap === overlapNorth) lz = -limitZ;
    else lz = limitZ;

    // Forward Three.js Y-rotation: local -> world
    return {
      x: cx + lx * cosY + lz * sinY,
      z: cz - lx * sinY + lz * cosY,
      collided: true,
    };
  }
  return { x: px, z: pz, collided: false };
}

/**
 * Summary: Canonical registry of world structures and props implementing `ICollidableWorldEntity`.
 * Design: Enforces that every world object either binds to valid `SOLID_BUILDING_BOXES` IDs or declares an explicit exemption reason.
 */
export const COLLIDABLE_WORLD_ENTITY_REGISTRY: readonly ICollidableWorldEntity[] = [
  {
    entityId: 'harbor-market-stalls',
    category: 'stall',
    collidable: true,
    solidBoxIds: [
      'market-stall-counter-harbor-1',
      'market-stall-counter-harbor-2',
      'market-stall-counter-harbor-3',
      'market-stall-counter-harbor-4',
      'market-stall-counter-harbor-5',
      'market-stall-counter-harbor-6',
    ],
  },
  {
    entityId: 'harbor-cylindrical-lighthouse',
    category: 'tower',
    collidable: true,
    solidBoxIds: [
      ...Array.from({ length: 14 }, (_, i) => `harbor-lighthouse-wall-seg-${i + 1}`),
      ...Array.from({ length: 16 }, (_, i) => `harbor-lighthouse-top-rail-seg-${i + 1}`),
      'harbor-lighthouse-lantern-core',
    ],
  },
  {
    entityId: 'harbor-perimeter-castle',
    category: 'wall',
    collidable: true,
    solidBoxIds: [
      'harbor-wall-west-north',
      'harbor-gate-tower-north-base',
      'harbor-gate-tower-north',
      'harbor-gate-tower-south-base',
      'harbor-gate-tower-south',
      'harbor-wall-west-south',
      'harbor-wall-north-west',
      'harbor-wall-north-east',
      'harbor-wall-south',
      ...(['nw', 'sw', 'ne', 'se'] as const).flatMap((tag) =>
        Array.from({ length: 8 }, (_, sIdx) => `harbor-bastion-${tag}-seg-${sIdx + 1}`)
      ),
    ],
  },
  {
    entityId: 'harbor-marble-amphitheater',
    category: 'building',
    collidable: true,
    solidBoxIds: [
      'harbor-amphitheater-stage-core',
      ...Array.from({ length: 12 }, (_, i) => `harbor-amphitheater-stage-seg-${i + 1}`),
      ...[0, 1, 2, 3, 4].flatMap((tier) =>
        Array.from({ length: 9 }, (_, s) => `harbor-amphitheater-tier-${tier + 1}-seg-${s + 1}`)
      ),
      ...Array.from({ length: 6 }, (_, i) => `harbor-amphitheater-col-${i + 1}`),
    ],
  },
  {
    entityId: 'harbor-royal-galleon-and-office',
    category: 'ship',
    collidable: true,
    solidBoxIds: [
      'galleon-lower-hull',
      'galleon-cabin-front-left',
      'galleon-cabin-front-right',
      'galleon-office-desk',
      'galleon-office-bookshelf-port',
      'galleon-office-drafting-stbd',
      'galleon-office-strongbox',
      'galleon-office-globe',
    ],
  },
  {
    entityId: 'harbor-portmaster-house',
    category: 'building',
    collidable: true,
    solidBoxIds: [
      'harbor-shed-south-wall',
      'harbor-shed-west-wall',
      'harbor-shed-east-wall',
      'harbor-shed-north-left',
      'harbor-shed-north-right',
    ],
  },
  {
    entityId: 'harbor-warehouse',
    category: 'building',
    collidable: true,
    solidBoxIds: [
      'harbor-warehouse-south-wall',
      'harbor-warehouse-west-wall',
      'harbor-warehouse-east-wall',
      'harbor-warehouse-north-left',
      'harbor-warehouse-north-right',
    ],
  },
  {
    entityId: 'harbor-tavern',
    category: 'building',
    collidable: true,
    solidBoxIds: [
      'harbor-tavern-back-wall',
      'harbor-tavern-west-wall',
      'harbor-tavern-east-wall',
      'harbor-tavern-front-left',
      'harbor-tavern-front-right',
    ],
  },
  {
    entityId: 'harbor-plaza-cobblestone-pavement',
    category: 'walkable_surface',
    collidable: false,
    exemptionReason: 'walkable_floor_or_stair',
  },
  {
    entityId: 'harbor-fountain-water-jets',
    category: 'water_or_particle_fx' as 'prop',
    collidable: false,
    exemptionReason: 'water_or_particle_fx',
  },
  {
    entityId: 'hunter-lodge-and-stable-compound',
    category: 'building',
    collidable: true,
    solidBoxIds: [
      'hunter-lodge-back-wall',
      'hunter-lodge-west-wall',
      'hunter-lodge-chimney',
      'hunter-lodge-east-wall',
      'hunter-lodge-front-left',
      'hunter-lodge-front-right',
      'hunter-lodge-front-header',
      'hunter-lodge-porch-col-1',
      'hunter-lodge-porch-col-2',
      'hunter-lodge-porch-col-3',
      'hunter-lodge-porch-col-4',
      'hunter-lodge-porch-rail-west',
      'hunter-lodge-porch-rail-east',
      'hunter-lodge-bed',
      'hunter-lodge-table',
      'hunter-lodge-starter-chest',
      'hunter-water-trough',
      'hunter-water-pump',
      'stable-back-wall',
      'stable-west-wall',
      'stable-east-wall',
      'stable-center-divider',
      'stable-hay-bales',
      'stable-corral-fence-west',
    ],
  },
  {
    entityId: 'valley-farmhouses-and-compounds',
    category: 'building',
    collidable: true,
    solidBoxIds: VALLEY_FARMS.flatMap((f, idx) => [
      `${f.id}-back-wall`,
      `${f.id}-west-wall`,
      `${f.id}-east-wall`,
      `${f.id}-front-left`,
      `${f.id}-front-right`,
      `${f.id}-front-header`,
      `${f.id}-porch-col-1`,
      `${f.id}-porch-col-2`,
      `${f.id}-porch-col-3`,
      `${f.id}-porch-col-4`,
      `${f.id}-interior-hearth`,
      `${f.id}-interior-table`,
      `${f.id}-interior-wardrobe`,
      `${f.id}-interior-bed`,
      `${f.id}-interior-chest`,
      idx === 0 ? `${f.id}-workshop-oven` : idx === 1 ? `${f.id}-workshop-churn` : `${f.id}-workshop-loom`,
      `${f.id}-field-fence-left-back`,
      `${f.id}-field-fence-left-front`,
      `${f.id}-field-fence-right-back`,
      `${f.id}-field-fence-right-front`,
      `${f.id}-hay-bale-left`,
      `${f.id}-hay-bale-right`,
      `${f.id}-perimeter-fence-back`,
      `${f.id}-perimeter-fence-west`,
      `${f.id}-perimeter-fence-east`,
      `${f.id}-perimeter-fence-front-left`,
      `${f.id}-perimeter-fence-front-right`,
      `${f.id}-gate-post-left`,
      `${f.id}-gate-post-right`,
      `${f.id}-gate-crossbeam`,
    ]),
  },
  {
    entityId: 'riverside-windmills',
    category: 'tower',
    collidable: true,
    solidBoxIds: RIVERSIDE_WINDMILLS.flatMap((wm) =>
      Array.from({ length: 8 }, (_, sIdx) => `${wm.id}-seg-${sIdx + 1}`)
    ),
  },
] as const;

/**
 * Summary: Validates that every registered `ICollidableWorldEntity` either references existing `SOLID_BUILDING_BOXES`
 *          or provides a valid `NonCollidableExemptionReason`.
 */
export function validateWorldEntityColliders(): { valid: boolean; errors: string[] } {
  const boxIdSet = new Set(SOLID_BUILDING_BOXES.map((b) => b.id));
  const errors: string[] = [];
  for (const entity of COLLIDABLE_WORLD_ENTITY_REGISTRY) {
    if (entity.collidable) {
      if (!entity.solidBoxIds || entity.solidBoxIds.length === 0) {
        errors.push(`Collidable entity '${entity.entityId}' has no solidBoxIds.`);
      } else {
        for (const boxId of entity.solidBoxIds) {
          if (!boxIdSet.has(boxId)) {
            errors.push(`Collidable entity '${entity.entityId}' references missing boxId '${boxId}'.`);
          }
        }
      }
    } else if (!entity.exemptionReason) {
      errors.push(`Non-collidable entity '${entity.entityId}' is missing a required exemptionReason.`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Summary: Computes the exact 3D collision cylinder radius and vertical trunk/pillar/rock height for an `IObstacleCylinder`.
 * Design: Ensures 100% agreement between 3D procedural meshes (`vegetationModels.ts`), projectile/sword collision (`combatAndInventorySystem.ts`),
 *         and the `[H]` debug collider wireframe overlay (`colliderDebugBuilder.ts`).
 */
export function getObstacleColliderMetrics(obs: IObstacleCylinder): {
  readonly radius: number;
  readonly height: number;
} {
  if (obs.treeVariant) {
    switch (obs.treeVariant) {
      case 'pinetree':
        return { radius: obs.radius, height: 14.5 * obs.scale };
      case 'oakgreen':
        return { radius: obs.radius, height: 11.0 * obs.scale };
      case 'oakyellow':
        return { radius: obs.radius, height: 10.8 * obs.scale };
      case 'animtree':
        return { radius: obs.radius, height: 10.0 * obs.scale };
      case 'animtree_wide':
        return { radius: obs.radius, height: 8.8 * obs.scale };
      case 'animtree_compact':
        return { radius: obs.radius, height: 7.9 * obs.scale };
    }
  }
  switch (obs.kind) {
    case 'pine':
      return { radius: obs.radius, height: 12.4 * obs.scale };
    case 'birch':
      return { radius: obs.radius, height: 9.4 * obs.scale };
    case 'palm':
      return { radius: obs.radius, height: 9.2 * obs.scale };
    case 'oak':
      return { radius: obs.radius, height: 8.6 * obs.scale };
    case 'acacia':
      return { radius: obs.radius, height: 7.4 * obs.scale };
    case 'boulder':
      return { radius: obs.radius, height: 1.25 * obs.scale };
    case 'pillar':
      return { radius: obs.radius, height: 3.5 * obs.scale };
  }
}

const SOLID_BOX_GRID_CELL_SIZE = 32.0;
const EMPTY_SOLID_BOX_LIST: readonly ISolidBuildingBox[] = [];
const _nearbySolidBoxesScratch: ISolidBuildingBox[] = [];
let cachedSolidBoxGrid: Map<number, ISolidBuildingBox[]> | null = null;

function encodeSolidBoxCellKey(cx: number, cz: number): number {
  return ((cx + 512) << 10) | ((cz + 512) & 1023);
}

function getOrBuildSolidBoxGrid(): Map<number, ISolidBuildingBox[]> {
  if (cachedSolidBoxGrid) return cachedSolidBoxGrid;
  const grid = new Map<number, ISolidBuildingBox[]>();
  for (let i = 0; i < SOLID_BUILDING_BOXES.length; i++) {
    const box = SOLID_BUILDING_BOXES[i];
    const aabb = getSolidBuildingWorldAABB(box);
    const minCx = Math.floor(aabb.minX / SOLID_BOX_GRID_CELL_SIZE);
    const maxCx = Math.floor(aabb.maxX / SOLID_BOX_GRID_CELL_SIZE);
    const minCz = Math.floor(aabb.minZ / SOLID_BOX_GRID_CELL_SIZE);
    const maxCz = Math.floor(aabb.maxZ / SOLID_BOX_GRID_CELL_SIZE);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const key = encodeSolidBoxCellKey(cx, cz);
        let bucket = grid.get(key);
        if (!bucket) {
          bucket = [];
          grid.set(key, bucket);
        }
        bucket.push(box);
      }
    }
  }
  cachedSolidBoxGrid = grid;
  return grid;
}

/**
 * Summary: O(1) spatial hash query returning candidate `SOLID_BUILDING_BOXES` overlapping `(x ± radius, z ± radius)`.
 * Design: Eliminates linear scans over all 400+ world building boxes during per-frame wildlife and player collision checks.
 */
export function getNearbySolidBuildingBoxes(
  x: number,
  z: number,
  radius = 1.5
): readonly ISolidBuildingBox[] {
  const grid = getOrBuildSolidBoxGrid();
  const minCx = Math.floor((x - radius) / SOLID_BOX_GRID_CELL_SIZE);
  const maxCx = Math.floor((x + radius) / SOLID_BOX_GRID_CELL_SIZE);
  const minCz = Math.floor((z - radius) / SOLID_BOX_GRID_CELL_SIZE);
  const maxCz = Math.floor((z + radius) / SOLID_BOX_GRID_CELL_SIZE);

  if (minCx === maxCx && minCz === maxCz) {
    return grid.get(encodeSolidBoxCellKey(minCx, minCz)) ?? EMPTY_SOLID_BOX_LIST;
  }

  _nearbySolidBoxesScratch.length = 0;
  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cz = minCz; cz <= maxCz; cz++) {
      const bucket = grid.get(encodeSolidBoxCellKey(cx, cz));
      if (!bucket) continue;
      for (let i = 0; i < bucket.length; i++) {
        const b = bucket[i];
        if (!_nearbySolidBoxesScratch.includes(b)) {
          _nearbySolidBoxesScratch.push(b);
        }
      }
    }
  }
  return _nearbySolidBoxesScratch;
}
// #endregion

