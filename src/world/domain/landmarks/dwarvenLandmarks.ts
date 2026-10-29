// ============================================================================
// MODULE: World / Domain / Landmarks / Dwarven Kingdom
// DESIGN: Far-south subterranean dwarven mine, guardian statues, and stone town (SRP)
// SUMMARY: Exposes coordinates and boundary specifications for the deep southern mine,
//          underground chambers, twin king statues, and 4 enterable stone houses.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { IDwarvenGuardianStatueDef, IDwarvenStoneHouseDef } from '../worldTypes';
import { t } from '../../../locales';
// #endregion

// ======================== SOUTHERN DWARVEN MINE ======================== \\
// #region Southern Dwarven Mine
/** Summary: Spatial parameters for the southern dwarven underground mine complex. */
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
// #endregion

// ======================== GUARDIAN STATUES ======================== \\
// #region Guardian Statues
/** Summary: Monumental stone statues of King Durin and King Thror guarding the mine gate. */
export const DWARVEN_GUARDIAN_STATUES: readonly IDwarvenGuardianStatueDef[] = [
  {
    id: 'dwarven-statue-west',
    name: t('landmarks.dwarven_statue_durin'),
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
    name: t('landmarks.dwarven_statue_thror'),
    x: SOUTHERN_MINE_POS.x + 7.5,
    z: SOUTHERN_MINE_POS.entranceZ - 4.2,
    baseY: SOUTHERN_MINE_POS.entranceFloorY,
    pedestalHalfSize: 2.3,
    totalHeight: 9.8,
    yaw: Math.PI + 0.18,
    side: 'east',
  },
] as const;
// #endregion

// ======================== STONE HOUSES ======================== \\
// #region Stone Houses
/** Summary: Four enterable carved granite houses of the dwarven craftsmen along the mine road. */
export const DWARVEN_STONE_HOUSES: readonly IDwarvenStoneHouseDef[] = [
  {
    id: 'dwarf-house-nw',
    doorId: 'dwarf-house-nw-door',
    name: t('landmarks.dwarven_house_nw'),
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
    name: t('landmarks.dwarven_house_ne'),
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
    name: t('landmarks.dwarven_house_sw'),
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
    name: t('landmarks.dwarven_house_se'),
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
// #endregion
