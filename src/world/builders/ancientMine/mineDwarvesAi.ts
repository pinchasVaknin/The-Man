// ============================================================================
// MODULE: World / Builders / Ancient Mine / Mine Dwarves AI
// DESIGN: Autonomous AI simulation for cooperative 3-portion minecart crews, the dedicated
//         2nd-floor Toolsmith, the Dwarven Tavern/Pub bartender & beer-drinking patrons, and
//         multi-level patrolling dwarves inside the Ancient Dwarven Mine.
//         - Cooperative 3-portion minecarts (0/3 -> 1/3 -> 2/3 -> 3/3): miners extract ore from
//           real wall mineral veins, carry portions to the cart, wait in queue if the cart is busy
//           or away, and the miner who deposits the 3rd portion rides the cart to the Central Gold
//           Funnel (or Crusher) where the cart tilts up to dump all 3 portions.
//         - Safe structure/stair pathfinding: dwarves never walk through elevated platform walls,
//           never step into the Lagoon water, and always use stairs to enter/exit elevated decks.
//         - Nighttime schedule: all underground dwarves commute along obstacle-safe corridors to the
//           4 Underground Dwarven Stone Rooms in `dwarven-quarters-hall` (lx: -76..-42, lz: 131..158).
//         - Strictly forbidden from entering the Golem Chamber (`lz <= 301`).
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import { sampleAncientMineFloor } from '../../domain/landmarks/ancientMine/ancientMineFloor';
import { ANCIENT_MINE_ORIGIN, MINE_LEVEL_Y } from '../../domain/landmarks/ancientMine/ancientMineLayout';
import {
  generateRandomDwarfLoot,
  registerMineCombatDwarves,
  type IDwarvenMinerRig,
} from '../dwarvenKingdomBuilder';
import {
  createReadyDwarfWarrior,
  type DwarfWarriorState,
} from '../../models/Characters/DwarfWarrior_Complete';
import { getPlayerState } from '../../systems/playerPhysicsSystem';
import { walkableHeightValueAt } from '../../systems/terrainAndBiomeSystem';
import { MINE_PALETTE, buildPropGeometry } from './propGeometries';
import type { ISetPieceContext } from './upperLevelSetPieces';
// #endregion

// ======================== TYPES & CONFIGURATIONS ======================== \\
// #region Types
export type IMineDwarvesAiUpdate = (
  elapsedTime: number,
  worldHours?: number,
  playerX?: number,
  playerZ?: number
) => void;

interface IMinerAssignment {
  readonly dwarfId: number;
  readonly name: string;
  readonly scale: number;
  readonly tintHex: number;
  /** Wall mineral vein location where this dwarf mines 1 portion of ore. */
  readonly veinLx: number;
  readonly veinLz: number;
  readonly veinYaw: number;
  readonly mineDurationSec: number;
  /** Bed position inside `dwarven-quarters-hall` (lx: -76..-42, lz: 131..158). */
  readonly bedLx: number;
  readonly bedLz: number;
}

interface ICooperativeCartConfig {
  readonly id: string;
  readonly waypoints: readonly (readonly [number, number])[];
  readonly speed: number;
  readonly oreTint: number;
  /** Offset from track start (u = 0) where a miner stands to dump his portion into the cart. */
  readonly loadLx: number;
  readonly loadLz: number;
  /** Offset where a second miner waits in line holding his ore if the cart is busy or away. */
  readonly queueLx: number;
  readonly queueLz: number;
  /** Offset at track end (u = 1) where the 3rd-portion rider steps off briefly while the cart tilts to dump. */
  readonly unloadSideOffset: number;
  readonly miners: readonly [IMinerAssignment, IMinerAssignment];
}

interface IPatrolWaypoint {
  readonly lx: number;
  readonly lz: number;
  readonly hintY: number;
  readonly pauseSec: number;
  readonly action: DwarfWarriorState;
  readonly faceYaw?: number;
  /** Vertical offset added to floorY when sitting on a bar stool (`0.34`) or tavern bench (`0.16`). */
  readonly seatYOffset?: number;
  /** When true, the dwarf holds a frothy Dwarven beer mug (`beerMug`) in hand during this waypoint pause. */
  readonly drinkingBeer?: boolean;
}

interface IWanderingDwarfConfig {
  readonly dwarfId: number;
  readonly id: string;
  readonly name: string;
  readonly speed: number;
  readonly phaseOffsetSec: number;
  readonly scale: number;
  readonly tintHex: number;
  readonly bedLx: number;
  readonly bedLz: number;
  readonly waypoints: readonly IPatrolWaypoint[];
}
// #endregion

// #region AI Schedules & Routes
const U = MINE_LEVEL_Y.upperCavern;
const S = MINE_LEVEL_Y.hubScaffolding;
const L = MINE_LEVEL_Y.chasmLedge;
/** Strict southern limit so no dwarf ever enters the Golem Chamber (`lz >= 314`). */
const MAX_DWARF_LZ = 301.0;

/**
 * Summary: Computes the exact `dwRoot.rotation.y` yaw so a dwarf at `(fromLx, fromLz)` faces `(toLx, toLz)`
 *           directly (`dwRoot` uses `-Z` forward convention because `ctrl.group.rotation.y = Math.PI`).
 */
const yawToward = (fromLx: number, fromLz: number, toLx: number, toLz: number): number =>
  Math.atan2(-(toLx - fromLx), -(toLz - fromLz));

/**
 * Summary: 4 cooperative 3-portion minecart lines operated by 8 miners (2 miners per cart).
 * Design: Loading station is at waypoint[0] right next to the Gold/Silver/Gem wall mineral veins;
 *         unloading destination is at the last waypoint at the Central Gold Funnel (`(0, 80)`) or
 *         East Gallery Switch, where the minecart tilts upward to pour its 3 portions into the funnel!
 */
const COOPERATIVE_CARTS: readonly ICooperativeCartConfig[] = [
  // 1. North-West Gold & Silver Wall Line (loads at [-56, 26], routes west of 2nd-floor scaffolding, dumps into Central Gold Funnel [-6, 80])
  {
    id: 'coop-cart-west-gold',
    waypoints: [
      [-56, 26],
      [-46, 26],
      [-46, 38],
      [-44, 54],
      [-32, 66],
      [-18, 75],
      [-6, 80],
    ],
    speed: 6.8,
    oreTint: MINE_PALETTE.gold,
    loadLx: -55.4,
    loadLz: 24.85,
    queueLx: -53.2,
    queueLz: 24.4,
    unloadSideOffset: 1.45,
    miners: [
      {
        dwarfId: 100,
        name: 'Balin Ironvein',
        scale: 1.01,
        tintHex: 0xd97706,
        veinLx: -46.0,
        veinLz: 22.95,
        veinYaw: yawToward(-46.0, 22.95, -46.0, 22.1),
        mineDurationSec: 3.4,
        bedLx: -73.5,
        bedLz: 134.5,
      },
      {
        dwarfId: 101,
        name: 'Dwalin Goldpick',
        scale: 0.99,
        tintHex: 0x94a3b8,
        veinLx: -56.0,
        veinLz: 23.65,
        veinYaw: yawToward(-56.0, 23.65, -56.0, 22.8),
        mineDurationSec: 3.7,
        bedLx: -73.5,
        bedLz: 140.5,
      },
    ],
  },
  // 2. North-East Gold & Silver Wall Line (loads at [86, 29], routes along open north corridor, dumps into Central Gold Funnel [4, 74])
  {
    id: 'coop-cart-north-gold',
    waypoints: [
      [86, 29],
      [75, 31],
      [54, 31],
      [34, 40],
      [16, 56],
      [4, 74],
    ],
    speed: 6.8,
    oreTint: MINE_PALETTE.gold,
    loadLx: 85.4,
    loadLz: 27.85,
    queueLx: 83.2,
    queueLz: 27.5,
    unloadSideOffset: -1.45,
    miners: [
      {
        dwarfId: 102,
        name: 'Bifur Deepdelver',
        scale: 1.03,
        tintHex: 0x94a3b8,
        veinLx: 75.0,
        veinLz: 23.95,
        veinYaw: yawToward(75.0, 23.95, 75.0, 23.1),
        mineDurationSec: 3.3,
        bedLx: -66.0,
        bedLz: 134.5,
      },
      {
        dwarfId: 103,
        name: 'Bofur Crystalhand',
        scale: 1.0,
        tintHex: 0xd97706,
        veinLx: 82.0,
        veinLz: 25.95,
        veinYaw: yawToward(82.0, 25.95, 82.0, 25.1),
        mineDurationSec: 3.6,
        bedLx: -66.0,
        bedLz: 140.5,
      },
    ],
  },
  // 3. East Gallery Pit Ore Line (loads in the pit at [70, 54], climbs ramp to dump into Central Gold Funnel [6, 80])
  {
    id: 'coop-cart-gallery-pit',
    waypoints: [
      [70, 54],
      [70, 60],
      [70, 72],
      [70, 76],
      [56, 78],
      [30, 80],
      [6, 80],
    ],
    speed: 6.8,
    oreTint: MINE_PALETTE.gold,
    loadLx: 68.85,
    loadLz: 54.0,
    queueLx: 66.8,
    queueLz: 54.0,
    unloadSideOffset: 1.45,
    miners: [
      {
        dwarfId: 104,
        name: 'Gloin Stonebreaker',
        scale: 1.04,
        tintHex: 0xb91c1c,
        veinLx: 59.35,
        veinLz: 55.0,
        veinYaw: yawToward(59.35, 55.0, 58.5, 55.0),
        mineDurationSec: 3.2,
        bedLx: -52.0,
        bedLz: 134.5,
      },
      {
        dwarfId: 105,
        name: 'Oin Copperbeard',
        scale: 0.98,
        tintHex: 0x92400e,
        veinLx: 75.0,
        veinLz: 51.35,
        veinYaw: yawToward(75.0, 51.35, 75.0, 50.5),
        mineDurationSec: 3.5,
        bedLx: -52.0,
        bedLz: 140.5,
      },
    ],
  },
  // 4. East Wall & Stone Crusher Spur (loads at East Wall [118, 72], unloads at Switch Junction [70, 76])
  {
    id: 'coop-cart-east-wall',
    waypoints: [
      [118, 72],
      [98, 72],
      [84, 74],
      [70, 76],
    ],
    speed: 6.4,
    oreTint: MINE_PALETTE.gold,
    loadLx: 117.4,
    loadLz: 73.15,
    queueLx: 115.6,
    queueLz: 74.2,
    unloadSideOffset: -1.45,
    miners: [
      {
        dwarfId: 106,
        name: 'Dori Hammerhand',
        scale: 1.02,
        tintHex: 0xa16207,
        veinLx: 118.65,
        veinLz: 60.0,
        veinYaw: yawToward(118.65, 60.0, 119.5, 60.0),
        mineDurationSec: 3.3,
        bedLx: -44.5,
        bedLz: 134.5,
      },
      {
        dwarfId: 107,
        name: 'Nori Deepforge',
        scale: 1.05,
        tintHex: 0x78350f,
        veinLx: 119.55,
        veinLz: 75.0,
        veinYaw: yawToward(119.55, 75.0, 120.5, 75.0),
        mineDurationSec: 3.6,
        bedLx: -44.5,
        bedLz: 140.5,
      },
    ],
  },
];

/**
 * Summary: 10 working, tavern-visiting, seated bar/table patrons, and patrolling dwarves across the
 *          2nd-Floor Toolsmith Mezzanine, the Grand Dwarven Tavern/Pub ("The Molten Tankard"), the Foundry,
 *          the Overlook, the Grand Descent, the Great Bridge, and the Heroes' Cliff Path (strictly lz <= 301).
 */
const AI_WANDERING_DWARVES: readonly IWanderingDwarfConfig[] = [
  // 1. Overlook & Grand Entry Stairs Sentry
  {
    dwarfId: 108,
    id: 'dwarf-entry-sentry',
    name: 'Thorin Gatewarden',
    speed: 2.3,
    phaseOffsetSec: 0.0,
    scale: 1.03,
    tintHex: 0xd97706,
    bedLx: -73.5,
    bedLz: 148.0,
    waypoints: [
      { lx: -2.8, lz: 13.5, hintY: MINE_LEVEL_Y.overlook, pauseSec: 3.0, action: 'idle', faceYaw: 0 },
      { lx: -2.8, lz: 20.0, hintY: MINE_LEVEL_Y.overlook, pauseSec: 1.2, action: 'idle', faceYaw: Math.PI },
      { lx: -2.8, lz: 47.0, hintY: U, pauseSec: 3.2, action: 'idle', faceYaw: Math.PI },
      { lx: 2.8, lz: 47.0, hintY: U, pauseSec: 2.0, action: 'attack2', faceYaw: Math.PI },
      { lx: 2.8, lz: 14.0, hintY: MINE_LEVEL_Y.overlook, pauseSec: 3.5, action: 'idle', faceYaw: 0 },
    ],
  },
  // 2. Dedicated 2nd-Floor Mezzanine Toolsmith (`hub-scaffolding-deck`, y = S = -4.85):
  //    Stands right in front of the Anvil (-28, 31.5), West Pickaxe Rack (-34.5, 27.2), Center Pickaxe Rack (-29, 27.2),
  //    East Weapon Rack (-23, 27.2), East Workbench (-21, 30.5), and West Workbench (-33.5, 32.0), facing each directly!
  {
    dwarfId: 109,
    id: 'dwarf-scaffolding-toolsmith',
    name: 'Fili Anvilwright',
    speed: 2.1,
    phaseOffsetSec: 1.2,
    scale: 1.01,
    tintHex: 0xb45309,
    bedLx: -73.5,
    bedLz: 154.0,
    waypoints: [
      {
        lx: -28.0,
        lz: 32.35,
        hintY: S,
        pauseSec: 4.8,
        action: 'mine1',
        faceYaw: yawToward(-28.0, 32.35, -28.0, 31.5),
      }, // Hammering at the 2nd-floor Anvil (-28, 31.5)
      {
        lx: -34.5,
        lz: 28.05,
        hintY: S,
        pauseSec: 3.4,
        action: 'mine2',
        faceYaw: yawToward(-34.5, 28.05, -34.5, 27.2),
      }, // Arranging pickaxes on West Rack (-34.5, 27.2)
      {
        lx: -29.0,
        lz: 28.05,
        hintY: S,
        pauseSec: 3.4,
        action: 'mine2',
        faceYaw: yawToward(-29.0, 28.05, -29.0, 27.2),
      }, // Sharpening pickaxes on Center Rack (-29, 27.2)
      {
        lx: -33.5,
        lz: 32.95,
        hintY: S,
        pauseSec: 3.6,
        action: 'mine1',
        faceYaw: yawToward(-33.5, 32.95, -33.5, 32.0),
      }, // Working at West Toolsmith Workbench (-33.5, 32.0)
      {
        lx: -28.0,
        lz: 32.35,
        hintY: S,
        pauseSec: 4.5,
        action: 'mine1',
        faceYaw: yawToward(-28.0, 32.35, -28.0, 31.5),
      }, // Back to hammering at the Anvil (-28, 31.5)
      {
        lx: -23.0,
        lz: 28.05,
        hintY: S,
        pauseSec: 3.2,
        action: 'mine2',
        faceYaw: yawToward(-23.0, 28.05, -23.0, 27.2),
      }, // Arranging tools on East Rack (-23, 27.2)
      {
        lx: -21.0,
        lz: 31.45,
        hintY: S,
        pauseSec: 3.6,
        action: 'mine1',
        faceYaw: yawToward(-21.0, 31.45, -21.0, 30.5),
      }, // Working at East Toolsmith Workbench (-21, 30.5)
    ],
  },
  // 3. Smelting Foundry Master Blacksmith (works the Foundry anvils/molds & sits at the Tavern bench for a beer break!)
  {
    dwarfId: 110,
    id: 'dwarf-foundry-smith',
    name: 'Kili Forgehammer',
    speed: 2.3,
    phaseOffsetSec: 4.8,
    scale: 1.04,
    tintHex: 0xb91c1c,
    bedLx: -66.0,
    bedLz: 148.0,
    waypoints: [
      {
        lx: 80.0,
        lz: 113.85,
        hintY: U,
        pauseSec: 4.5,
        action: 'mine1',
        faceYaw: yawToward(80.0, 113.85, 80.0, 115.0),
      }, // Foundry West Anvil (80, 115)
      {
        lx: 100.0,
        lz: 114.85,
        hintY: U,
        pauseSec: 4.5,
        action: 'mine1',
        faceYaw: yawToward(100.0, 114.85, 100.0, 116.0),
      }, // Foundry East Anvil (100, 116)
      {
        lx: 72.0,
        lz: 122.95,
        hintY: U,
        pauseSec: 3.8,
        action: 'mine2',
        faceYaw: yawToward(72.0, 122.95, 72.0, 124.5),
      }, // Foundry Ingot Mold (72, 124.5)
      { lx: 22.0, lz: 112.0, hintY: U, pauseSec: 0.3, action: 'idle', faceYaw: Math.PI / 2 },
      {
        lx: -28.0,
        lz: 105.4,
        hintY: U,
        pauseSec: 6.2,
        action: 'sit',
        seatYOffset: 0.16,
        faceYaw: yawToward(-28.0, 105.4, -28.0, 104.0),
        drinkingBeer: true,
      }, // Sitting on East-North Tavern Table bench drinking beer!
      { lx: 22.0, lz: 112.0, hintY: U, pauseSec: 0.3, action: 'idle', faceYaw: -Math.PI / 2 },
    ],
  },
  // 4. Grand Descent Staircase Patrol
  {
    dwarfId: 111,
    id: 'dwarf-grand-descent-patrol',
    name: 'Bombur Stairguard',
    speed: 2.35,
    phaseOffsetSec: 2.1,
    scale: 1.02,
    tintHex: 0x92400e,
    bedLx: -52.0,
    bedLz: 148.0,
    waypoints: [
      { lx: -2.2, lz: 121.0, hintY: U, pauseSec: 2.5, action: 'idle', faceYaw: Math.PI },
      { lx: -2.2, lz: 141.0, hintY: MINE_LEVEL_Y.descentLanding1, pauseSec: 2.5, action: 'idle', faceYaw: Math.PI },
      { lx: -2.2, lz: 168.0, hintY: MINE_LEVEL_Y.descentLanding2, pauseSec: 2.8, action: 'idle', faceYaw: Math.PI },
      { lx: -2.2, lz: 193.0, hintY: L, pauseSec: 3.5, action: 'idle', faceYaw: Math.PI },
      { lx: 2.2, lz: 168.0, hintY: MINE_LEVEL_Y.descentLanding2, pauseSec: 2.2, action: 'idle', faceYaw: 0 },
      { lx: 2.2, lz: 141.0, hintY: MINE_LEVEL_Y.descentLanding1, pauseSec: 2.2, action: 'idle', faceYaw: 0 },
    ],
  },
  // 5. Great Bridge Chasm Warden (strictly stays on the bridge & landing, lz <= 296, never enters Golem Chamber)
  {
    dwarfId: 112,
    id: 'dwarf-great-bridge-warden',
    name: 'Fundin Bridgewatch',
    speed: 2.2,
    phaseOffsetSec: 5.5,
    scale: 1.05,
    tintHex: 0x0f766e,
    bedLx: -52.0,
    bedLz: 154.0,
    waypoints: [
      { lx: -2.0, lz: 205.0, hintY: L, pauseSec: 3.0, action: 'idle', faceYaw: Math.PI },
      { lx: -2.4, lz: 236.0, hintY: L, pauseSec: 3.2, action: 'idle', faceYaw: Math.PI / 2 },
      { lx: 2.4, lz: 264.0, hintY: L, pauseSec: 3.2, action: 'idle', faceYaw: -Math.PI / 2 },
      { lx: 2.0, lz: 295.0, hintY: L, pauseSec: 3.5, action: 'idle', faceYaw: 0 },
      { lx: 0.0, lz: 250.0, hintY: L, pauseSec: 2.8, action: 'attack2', faceYaw: Math.PI / 2 },
    ],
  },
  // 6. Heroes' Cliff Path & King's Balcony Scout (mines the cliff wall gold vein at -105.9, 294, stays at lz <= 300)
  {
    dwarfId: 113,
    id: 'dwarf-heroes-path-scout',
    name: 'Gimli Cliffseeker',
    speed: 2.3,
    phaseOffsetSec: 8.4,
    scale: 0.99,
    tintHex: 0xa16207,
    bedLx: -44.5,
    bedLz: 148.0,
    waypoints: [
      { lx: -72.0, lz: 196.0, hintY: L, pauseSec: 2.5, action: 'idle', faceYaw: Math.PI / 2 },
      { lx: -101.0, lz: 203.0, hintY: L, pauseSec: 2.2, action: 'idle', faceYaw: Math.PI },
      { lx: -101.0, lz: 248.0, hintY: MINE_LEVEL_Y.heroesMidLanding, pauseSec: 2.0, action: 'idle', faceYaw: Math.PI / 2 },
      {
        lx: -104.85,
        lz: 294.0,
        hintY: MINE_LEVEL_Y.kingBalcony,
        pauseSec: 4.5,
        action: 'mine1',
        faceYaw: yawToward(-104.85, 294.0, -105.9, 294.0),
      }, // Mining cliff wall gold vein at (-105.9, 294)
      { lx: -5.5, lz: 298.5, hintY: MINE_LEVEL_Y.kingBalcony, pauseSec: 3.5, action: 'idle', faceYaw: Math.PI },
      { lx: -101.0, lz: 248.0, hintY: MINE_LEVEL_Y.heroesMidLanding, pauseSec: 2.0, action: 'idle', faceYaw: 0 },
    ],
  },
  // 7. Dwarven Tavern Master / Bartender ("The Molten Tankard", tends keg taps at lz = 121.0 and serves across bar at lz = 118.6)
  {
    dwarfId: 114,
    id: 'dwarf-tavern-bartender',
    name: 'Ori Alekeeper',
    speed: 2.05,
    phaseOffsetSec: 0.7,
    scale: 1.02,
    tintHex: 0xd97706,
    bedLx: -44.5,
    bedLz: 154.0,
    waypoints: [
      {
        lx: -41.7,
        lz: 119.85,
        hintY: U,
        pauseSec: 3.8,
        action: 'mine2',
        faceYaw: yawToward(-41.7, 119.85, -41.7, 121.0),
        drinkingBeer: true,
      }, // Drawing ale from giant keg taps (faces South toward keg rack at lz = 121)
      {
        lx: -40.0,
        lz: 119.55,
        hintY: U,
        pauseSec: 4.5,
        action: 'idle',
        faceYaw: yawToward(-40.0, 119.55, -40.0, 117.05),
        drinkingBeer: true,
      }, // Serving patrons across the main bar counter (faces North toward bar stools at lz = 117.05)
      {
        lx: -37.9,
        lz: 119.55,
        hintY: U,
        pauseSec: 4.2,
        action: 'idle',
        faceYaw: yawToward(-37.9, 119.55, -37.9, 117.05),
        drinkingBeer: true,
      }, // Serving east end of bar counter
      { lx: -32.2, lz: 118.2, hintY: U, pauseSec: 0.4, action: 'idle', faceYaw: 0, drinkingBeer: true },
      {
        lx: -28.0,
        lz: 113.4,
        hintY: U,
        pauseSec: 3.6,
        action: 'idle',
        faceYaw: yawToward(-28.0, 113.4, -28.0, 112.0),
        drinkingBeer: true,
      }, // Serving East-South Table (-28, 112)
      {
        lx: -41.0,
        lz: 113.4,
        hintY: U,
        pauseSec: 3.6,
        action: 'idle',
        faceYaw: yawToward(-41.0, 113.4, -41.0, 112.0),
        drinkingBeer: true,
      }, // Serving West-South Table (-41, 112)
      { lx: -32.2, lz: 118.2, hintY: U, pauseSec: 0.4, action: 'idle', faceYaw: Math.PI, drinkingBeer: true },
    ],
  },
  // 8. Tavern Patron & Tool-Fetcher (sits on Bar Stools & Tavern Benches drinking beer, then walks up stairs to 2nd-floor Toolsmith)
  {
    dwarfId: 115,
    id: 'dwarf-tavern-patron-miner',
    name: 'Bofur Tankardson',
    speed: 2.25,
    phaseOffsetSec: 3.4,
    scale: 1.01,
    tintHex: 0x0f766e,
    bedLx: -66.0,
    bedLz: 140.5,
    waypoints: [
      {
        lx: -40.0,
        lz: 117.05,
        hintY: U,
        pauseSec: 6.5,
        action: 'sit',
        seatYOffset: 0.34,
        faceYaw: yawToward(-40.0, 117.05, -40.0, 118.6),
        drinkingBeer: true,
      }, // Sitting on center Bar Stool facing the bar counter!
      {
        lx: -41.0,
        lz: 102.6,
        hintY: U,
        pauseSec: 5.8,
        action: 'sit',
        seatYOffset: 0.16,
        faceYaw: yawToward(-41.0, 102.6, -41.0, 104.0),
        drinkingBeer: true,
      }, // Sitting on West-North Tavern Table bench (-41, 104)!
      { lx: -19.0, lz: 82.0, hintY: U, pauseSec: 0.3, action: 'idle', faceYaw: 0 },
      { lx: -19.0, lz: 50.8, hintY: U, pauseSec: 0.4, action: 'idle', faceYaw: 0 }, // Foot of 2nd-floor scaffolding stairs
      { lx: -19.0, lz: 37.5, hintY: S, pauseSec: 0.5, action: 'idle', faceYaw: Math.PI / 2 }, // Top of 2nd-floor scaffolding stairs
      {
        lx: -26.2,
        lz: 32.35,
        hintY: S,
        pauseSec: 3.8,
        action: 'mine2',
        faceYaw: yawToward(-26.2, 32.35, -28.0, 31.5),
      }, // Inspecting sharpened pickaxes at the 2nd-floor Anvil with Fili!
      { lx: -19.0, lz: 37.5, hintY: S, pauseSec: 0.4, action: 'idle', faceYaw: Math.PI }, // Top of stairs
      { lx: -19.0, lz: 50.8, hintY: U, pauseSec: 0.4, action: 'idle', faceYaw: Math.PI }, // Foot of stairs
      {
        lx: -7.8,
        lz: 78.5,
        hintY: U,
        pauseSec: 3.2,
        action: 'idle',
        faceYaw: yawToward(-7.8, 78.5, 0.0, 80.0),
      }, // Checking the Central Gold Funnel
    ],
  },
  // 9. Seated Bar-Stool & Tavern Table Regular #1 (alternates sitting on the Bar Stools and West-South / East-North Tavern Benches)
  {
    dwarfId: 116,
    id: 'dwarf-tavern-barstool-patron-1',
    name: 'Bombur Alebelly',
    speed: 1.95,
    phaseOffsetSec: 1.8,
    scale: 1.04,
    tintHex: 0xd97706,
    bedLx: -66.0,
    bedLz: 134.5,
    waypoints: [
      {
        lx: -42.1,
        lz: 117.05,
        hintY: U,
        pauseSec: 8.5,
        action: 'sit',
        seatYOffset: 0.34,
        faceYaw: yawToward(-42.1, 117.05, -42.1, 118.6),
        drinkingBeer: true,
      }, // Sitting on Bar Stool #2 facing the bar counter
      {
        lx: -41.0,
        lz: 110.6,
        hintY: U,
        pauseSec: 7.5,
        action: 'sit',
        seatYOffset: 0.16,
        faceYaw: yawToward(-41.0, 110.6, -41.0, 112.0),
        drinkingBeer: true,
      }, // Sitting on West-South Table north bench facing table (-41, 112)
      {
        lx: -35.8,
        lz: 117.05,
        hintY: U,
        pauseSec: 8.0,
        action: 'sit',
        seatYOffset: 0.34,
        faceYaw: yawToward(-35.8, 117.05, -35.8, 118.6),
        drinkingBeer: true,
      }, // Sitting on Bar Stool #5 facing the bar counter
      {
        lx: -28.0,
        lz: 102.6,
        hintY: U,
        pauseSec: 7.2,
        action: 'sit',
        seatYOffset: 0.16,
        faceYaw: yawToward(-28.0, 102.6, -28.0, 104.0),
        drinkingBeer: true,
      }, // Sitting on East-North Table north bench facing table (-28, 104)
    ],
  },
  // 10. Seated Bar-Stool & Tavern Table Regular #2 (alternates sitting on Bar Stools and East-South / West-North Tavern Benches)
  {
    dwarfId: 117,
    id: 'dwarf-tavern-barstool-patron-2',
    name: 'Nain Goldmug',
    speed: 1.95,
    phaseOffsetSec: 6.2,
    scale: 1.0,
    tintHex: 0xb45309,
    bedLx: -52.0,
    bedLz: 140.5,
    waypoints: [
      {
        lx: -37.9,
        lz: 117.05,
        hintY: U,
        pauseSec: 8.2,
        action: 'sit',
        seatYOffset: 0.34,
        faceYaw: yawToward(-37.9, 117.05, -37.9, 118.6),
        drinkingBeer: true,
      }, // Sitting on Bar Stool #4 facing the bar counter
      {
        lx: -28.0,
        lz: 110.6,
        hintY: U,
        pauseSec: 7.8,
        action: 'sit',
        seatYOffset: 0.16,
        faceYaw: yawToward(-28.0, 110.6, -28.0, 112.0),
        drinkingBeer: true,
      }, // Sitting on East-South Table north bench facing table (-28, 112)
      {
        lx: -44.2,
        lz: 117.05,
        hintY: U,
        pauseSec: 8.0,
        action: 'sit',
        seatYOffset: 0.34,
        faceYaw: yawToward(-44.2, 117.05, -44.2, 118.6),
        drinkingBeer: true,
      }, // Sitting on Bar Stool #1 facing the bar counter
      {
        lx: -41.0,
        lz: 105.4,
        hintY: U,
        pauseSec: 7.5,
        action: 'sit',
        seatYOffset: 0.16,
        faceYaw: yawToward(-41.0, 105.4, -41.0, 104.0),
        drinkingBeer: true,
      }, // Sitting on West-North Table south bench facing table (-41, 104)
    ],
  },
];
// #endregion

// ======================== PUBLIC BUILD ======================== \\
// #region Build Mine Dwarves AI
/**
 * Summary: Builds all cooperative 3-portion minecart systems and working/wandering AI Dwarves,
 *          registers every underground dwarf into `registerMineCombatDwarves`, and returns the
 *          per-frame update callback.
 */
export function buildMineDwarvesAi(ctx: ISetPieceContext): IMineDwarvesAiUpdate {
  const lanternBulbGeo = ctx.own(new THREE.OctahedronGeometry(0.09, 1));
  const lanternHaloGeo = ctx.own(new THREE.SphereGeometry(0.18, 8, 6));
  const carriedOreGeo = ctx.own(new THREE.DodecahedronGeometry(0.24, 0));
  const cartPortionGeo = ctx.own(new THREE.DodecahedronGeometry(0.38, 0));
  const heldBeerMugGeo = ctx.own(buildPropGeometry('beerMug', MINE_PALETTE.gold));
  const lanternBulbMat = new THREE.MeshBasicMaterial({ color: 0xffb84a, fog: false });
  const lanternHaloMat = new THREE.MeshBasicMaterial({
    color: 0xff7a18,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  ctx.ownMaterial(lanternBulbMat, lanternHaloMat);

  const attachBeltLantern = (parent: THREE.Object3D, x: number, y: number, z: number): THREE.Mesh => {
    const bulb = new THREE.Mesh(lanternBulbGeo, lanternBulbMat);
    bulb.position.set(x, y, z);
    parent.add(bulb);
    const halo = new THREE.Mesh(lanternHaloGeo, lanternHaloMat);
    // Keep halo at (0, 0, 0) in bulb local space so it surrounds the belt lantern rather than floating beside the head!
    halo.position.set(0, 0, 0);
    bulb.add(halo);
    return bulb;
  };

  const combatRigs: IDwarvenMinerRig[] = [];

  const createCombatDwarfRig = (
    dwarfId: number,
    name: string,
    scale: number,
    tintHex: number,
    initLx: number,
    initY: number,
    initLz: number
  ): {
    rig: IDwarvenMinerRig;
    setClip: (clip: DwarfWarriorState) => void;
    carriedOre: THREE.Mesh;
    heldBeerMug: THREE.Mesh;
  } => {
    const dwRoot = new THREE.Group();
    dwRoot.name = `ancient-mine-dwarf-${dwarfId}`;
    const ctrl = createReadyDwarfWarrior({
      initialState: 'idle',
      weaponVisible: true,
      tintHex,
      driveRootMotion: false,
      scale,
      castShadow: false,
      receiveShadow: true,
    });
    // Use -Z forward convention on dwRoot to match dwarvenKingdomBuilder combat & rotation conventions
    ctrl.group.rotation.y = Math.PI;
    dwRoot.add(ctrl.group);

    const lanternGlow = attachBeltLantern(dwRoot, -0.22, 0.58, -0.08);
    const oreMat = new THREE.MeshStandardMaterial({
      color: tintHex,
      emissive: new THREE.Color(tintHex),
      emissiveIntensity: 0.25,
      roughness: 0.4,
      metalness: 0.6,
    });
    ctx.ownMaterial(oreMat);
    const carriedOre = new THREE.Mesh(carriedOreGeo, oreMat);
    carriedOre.position.set(0.0, 0.92, -0.38);
    carriedOre.visible = false;
    dwRoot.add(carriedOre);

    const heldBeerMug = new THREE.Mesh(heldBeerMugGeo, ctx.materials.statue);
    heldBeerMug.position.set(0.28, 0.96, -0.36);
    heldBeerMug.scale.setScalar(1.08);
    heldBeerMug.visible = false;
    dwRoot.add(heldBeerMug);

    dwRoot.position.set(initLx, initY, initLz);
    dwRoot.rotation.order = 'YXZ';
    ctx.group.add(dwRoot);

    const loot = generateRandomDwarfLoot(dwarfId);
    const rig: IDwarvenMinerRig = {
      id: dwarfId,
      name,
      level: 7 + (dwarfId % 3),
      root: dwRoot,
      ctrl,
      leftLeg: new THREE.Group(),
      rightLeg: new THREE.Group(),
      leftArm: new THREE.Group(),
      rightArm: new THREE.Group(),
      torsoPivot: new THREE.Group(),
      lanternGlow,
      x: ANCIENT_MINE_ORIGIN.x + initLx,
      y: initY,
      z: ANCIENT_MINE_ORIGIN.z + initLz,
      yaw: 0,
      hp: 110 + (dwarfId % 3) * 15,
      maxHp: 110 + (dwarfId % 3) * 15,
      isDead: false,
      isLooted: false,
      goldDrop: loot.goldDrop,
      lootItems: loot.lootItems,
      outOfAreaRespawnTimer: 0,
      deathTimer: 0,
      hitFlashTimer: 0,
      hitBarTimer: 0,
      isAggro: false,
      aggroTimer: 0,
      attackCooldown: 0,
      currentAttackClip: 'attack1',
      lastElapsedTime: 0,
    };
    combatRigs.push(rig);

    let currentClip: DwarfWarriorState | null = 'idle';
    const setClip = (clip: DwarfWarriorState): void => {
      if (currentClip !== clip) {
        currentClip = clip;
        ctrl.setState(clip, 0.16);
      }
    };

    return { rig, setClip, carriedOre, heldBeerMug };
  };

  // 1) BUILD COOPERATIVE 3-PORTION MINECART TEAMS (4 carts, 8 miners)
  const coopUpdaters = COOPERATIVE_CARTS.map((cfg) =>
    buildCooperativeCartTeam(ctx, cfg, cartPortionGeo, attachBeltLantern, createCombatDwarfRig)
  );

  // 2) BUILD WANDERING, TOOLSMITH & TAVERN DWARVES (8 dwarves)
  const wanderUpdaters = AI_WANDERING_DWARVES.map((cfg) =>
    buildSingleWanderingDwarf(cfg, createCombatDwarfRig)
  );

  // Register all 16 underground dwarves into the shared combat/targeting/looting registry
  registerMineCombatDwarves(combatRigs);

  let lastTime: number | null = null;
  return (elapsedTime: number, worldHours = 12, playerX = 0, playerZ = 0): void => {
    const rawDt = lastTime === null ? 1 / 60 : elapsedTime - lastTime;
    lastTime = elapsedTime;
    const dt = Math.max(0.001, Math.min(0.1, rawDt));

    for (let i = 0; i < coopUpdaters.length; i++) {
      coopUpdaters[i](elapsedTime, dt, worldHours, playerX, playerZ);
    }
    for (let i = 0; i < wanderUpdaters.length; i++) {
      wanderUpdaters[i](elapsedTime, dt, worldHours, playerX, playerZ);
    }
  };
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Safe Obstacle-Aware Pathing & Step Checks
/**
 * Summary: Checks whether a dwarf at `(curLx, curLz, curY)` can safely step to `(nextLx, nextLz)`:
 *          - Never steps into water (`lagoon-basin`, `lagoon-channel`) or lava/abyss.
 *          - Never steps through the side wall of an elevated platform (`|nextFloor.height - curY| <= 1.25`).
 */
function resolveSafeDwarfStepFloor(
  curY: number,
  nextLx: number,
  nextLz: number
): number | null {
  // Never enter the Lagoon water basin (`lx < -61, lz: 43..95`) or water channel (`lx: -72..-66, lz: 94..126` except bridge `106..110`)
  if (nextLx < -61.0 && nextLz >= 43.0 && nextLz <= 95.0) return null;
  if (
    nextLx >= -72.5 &&
    nextLx <= -65.5 &&
    nextLz >= 94.0 &&
    nextLz <= 126.0 &&
    (nextLz < 106.0 || nextLz > 110.0)
  ) {
    return null;
  }
  const hit = sampleAncientMineFloor(nextLx, nextLz, curY + 0.9);
  if (hit === null || hit.material === 'abyss' || hit.material === 'lava') return null;
  if (Math.abs(hit.height - curY) > 1.25) return null;
  return hit.height;
}

/**
 * Summary: Builds an obstacle-safe commute waypoint sequence between a dwarf's work station and
 *          his bed inside `dwarven-quarters-hall` (`lx: -76..-42, lz: 131..158`) so no dwarf ever
 *          walks through the side of `hub-scaffolding-deck`, `gallery-platform`, `gallery-pit`, or the Lagoon.
 */
function buildSafeCommuteWaypoints(
  workLx: number,
  workLz: number,
  workY: number,
  bedLx: number,
  bedLz: number
): [number, number, number][] {
  const clampedLz = Math.min(MAX_DWARF_LZ, workLz);
  const route: [number, number, number][] = [[workLx, workY, clampedLz]];

  // 1) If working on the 2nd-floor Toolsmith Mezzanine (`hub-scaffolding-deck`, y ~ S):
  //    must exit via `hub-scaffolding-stairs` at `lx = -19.0, lz = 37.5 -> 50.8`!
  if (workY > U + 2.0 && workLx < 0 && clampedLz < 45) {
    route.push([-19.0, S, 37.5]);
    route.push([-19.0, U, 50.8]);
    route.push([-52.0, U, 96.0]);
  } else if (workLx < -35 && clampedLz < 45) {
    // 2) North-West Gold/Silver Wall (`lx < -35, lz < 45`): route west of 2nd-floor scaffolding and east of Lagoon
    route.push([-48.0, U, 42.0]);
    route.push([-54.0, U, 96.0]);
  } else if (workLx >= 56 && workLx <= 82 && clampedLz >= 45 && clampedLz <= 63 && workY < U - 1.0) {
    // 3) Inside Gallery Pit (`y = galleryPit`): climb `pit-stairs-west` (`lx = 58 -> 44, lz = 54`)
    route.push([58.0, MINE_LEVEL_Y.galleryPit, 54.0]);
    route.push([44.0, U, 54.0]);
    route.push([-14.0, U, 94.0]);
  } else if (workLx > 20 && clampedLz < 65) {
    // 4) North-East Gallery (`lx > 20, lz < 65`): route along open north corridor clear of pit & stairs
    route.push([36.0, U, 44.0]);
    route.push([-12.0, U, 72.0]);
    route.push([-52.0, U, 98.0]);
  } else if (clampedLz > 130 && workY < U - 2.0) {
    // 5) Deep Chasm / Grand Descent / Heroes' Path (`lz > 130, y < U - 2`): climb Grand Descent stairs to Upper Cavern
    if (workLx < -30) {
      route.push([-101.0, workY, 203.0]);
      route.push([-2.0, L, 195.0]);
    }
    route.push([0.0, L, 192.0]);
    route.push([0.0, U, 120.0]);
  } else if (workLx > 15) {
    // 6) East Wall / Foundry: pass south of the Central Gold Funnel & north of Tavern
    route.push([16.0, U, 98.0]);
    route.push([-52.0, U, 98.0]);
  }

  // Enter through `dwarven-quarters-entry` (`lx = -59.0, lz = 123.5 -> 131.5`), then down central hall to bed
  route.push([-59.0, U, 123.5]);
  route.push([-59.0, U, 131.5]);
  route.push([-59.0, U, bedLz]);
  route.push([bedLx, U, bedLz]);
  return route;
}

function sampleSafeCommutePath(
  pts: readonly (readonly [number, number, number])[],
  u: number
): { lx: number; y: number; lz: number; yaw: number } {
  const clamped = Math.max(0, Math.min(1, u));
  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
    segLens.push(len);
    totalLen += len;
  }
  const target = clamped * totalLen;
  let acc = 0;
  for (let i = 0; i < segLens.length; i++) {
    const segLen = segLens[i];
    if (acc + segLen >= target || i === segLens.length - 1) {
      const a = pts[i];
      const b = pts[i + 1];
      const t = segLen > 1e-5 ? Math.max(0, Math.min(1, (target - acc) / segLen)) : 0;
      const lx = a[0] + (b[0] - a[0]) * t;
      const hintY = a[1] + (b[1] - a[1]) * t;
      const lz = a[2] + (b[2] - a[2]) * t;
      const floorY = sampleAncientMineFloor(lx, lz, hintY + 0.8)?.height ?? hintY;
      // Note: dwRoot uses -Z forward convention (ctrl.group.rotation.y = Math.PI)
      const yaw = Math.atan2(-(b[0] - a[0]), -(b[2] - a[2]));
      return { lx, y: floorY, lz, yaw };
    }
    acc += segLen;
  }
  const last = pts[pts.length - 1];
  return { lx: last[0], y: last[1], lz: last[2], yaw: 0 };
}
// #endregion

// #region Shared Combat, Mortality & Night Sleep Helper
/**
 * Summary: Handles death/corpse-looting, out-of-area respawn, retaliation combat when attacked by
 *          the player, and nighttime sleeping/commuting to the Underground Dwarven Quarters.
 * @returns `true` if this dwarf is handled by death, combat, or night sleep this frame; `false`
 *          if the dwarf should run its daytime work routine.
 */
function updateDwarfMortalityCombatAndSleep(
  rig: IDwarvenMinerRig,
  setClip: (clip: DwarfWarriorState) => void,
  carriedOre: THREE.Mesh,
  heldBeerMug: THREE.Mesh,
  dt: number,
  worldHours: number,
  playerX: number,
  playerZ: number,
  workAnchorLx: number,
  workAnchorLz: number,
  workAnchorY: number,
  bedLx: number,
  bedLz: number
): boolean {
  if (rig.hitFlashTimer > 0) rig.hitFlashTimer = Math.max(0, rig.hitFlashTimer - dt);
  if (rig.hitBarTimer > 0) rig.hitBarTimer = Math.max(0, rig.hitBarTimer - dt);
  if (rig.attackCooldown > 0) rig.attackCooldown = Math.max(0, rig.attackCooldown - dt);

  // 1. Dead state: remain on floor for looting; respawn if player leaves (> 38m) for 25s
  if (rig.isDead) {
    carriedOre.visible = false;
    heldBeerMug.visible = false;
    rig.lanternGlow.visible = false;
    const distToPlayer = Math.hypot(playerX - rig.x, playerZ - rig.z);
    if (distToPlayer > 38.0) {
      rig.outOfAreaRespawnTimer += dt;
      if (rig.outOfAreaRespawnTimer >= 25.0) {
        const freshLoot = generateRandomDwarfLoot(rig.id);
        rig.isDead = false;
        rig.isLooted = false;
        rig.hp = rig.maxHp;
        rig.goldDrop = freshLoot.goldDrop;
        rig.lootItems = freshLoot.lootItems;
        rig.outOfAreaRespawnTimer = 0;
        rig.deathTimer = 0;
        rig.isAggro = false;
        rig.aggroTimer = 0;
        rig.root.position.set(workAnchorLx, workAnchorY, Math.min(MAX_DWARF_LZ, workAnchorLz));
        rig.x = ANCIENT_MINE_ORIGIN.x + workAnchorLx;
        rig.y = workAnchorY;
        rig.z = ANCIENT_MINE_ORIGIN.z + Math.min(MAX_DWARF_LZ, workAnchorLz);
        setClip('idle');
        return true;
      }
    }
    rig.ctrl.speed = 0;
    setClip('death');
    rig.ctrl.update(dt);
    return true;
  }

  // 2. Retaliation Combat AI when attacked by the player
  if (rig.isAggro) {
    carriedOre.visible = false;
    heldBeerMug.visible = false;
    rig.lanternGlow.visible = true;
    rig.aggroTimer = Math.max(0, rig.aggroTimer - dt);
    const toPx = playerX - rig.x;
    const toPz = playerZ - rig.z;
    const dPlayer = Math.hypot(toPx, toPz) || 0.001;

    if (rig.aggroTimer <= 0 || dPlayer > 46.0) {
      rig.isAggro = false;
    } else {
      rig.hitBarTimer = Math.max(rig.hitBarTimer, 1.5);
      const playerState = getPlayerState();
      const playerY = playerState ? playerState.y : walkableHeightValueAt(playerX, playerZ);
      rig.yaw = Math.atan2(-toPx, -toPz);
      let lx = rig.x - ANCIENT_MINE_ORIGIN.x;
      let lz = rig.z - ANCIENT_MINE_ORIGIN.z;

      if (dPlayer > 2.05) {
        const runSpd = 4.4;
        const step = Math.min(dPlayer - 1.75, runSpd * dt);
        const nextLx = lx + (toPx / dPlayer) * step;
        const nextLz = Math.min(MAX_DWARF_LZ, lz + (toPz / dPlayer) * step);
        const safeY = resolveSafeDwarfStepFloor(rig.y, nextLx, nextLz);
        if (safeY !== null) {
          lx = nextLx;
          lz = nextLz;
          rig.y += (safeY - rig.y) * Math.min(1, dt * 14);
          rig.ctrl.speed = runSpd;
          setClip('run');
        } else {
          rig.ctrl.speed = 0;
          setClip('idle');
        }
      } else if (Math.abs(playerY - rig.y) > 2.4) {
        rig.ctrl.speed = 0;
        setClip('idle');
      } else {
        rig.ctrl.speed = 0;
        if (rig.attackCooldown <= 0) {
          const clips: ReadonlyArray<'attack1' | 'attack2' | 'attack3'> = ['attack1', 'attack2', 'attack3'];
          rig.currentAttackClip = clips[(clips.indexOf(rig.currentAttackClip) + 1) % clips.length];
          rig.attackCooldown = 1.05;
          setClip(rig.currentAttackClip);
          if (playerState && dPlayer <= 2.35 && Math.abs(playerY - rig.y) <= 2.4) {
            playerState.stamina = Math.max(0, (playerState.stamina ?? 100) - 9);
            playerState.hp = Math.max(1, (playerState.hp ?? 100) - 7);
          }
        } else {
          setClip(rig.currentAttackClip);
        }
      }

      rig.x = ANCIENT_MINE_ORIGIN.x + lx;
      rig.z = ANCIENT_MINE_ORIGIN.z + lz;
      rig.root.position.set(lx, rig.y, lz);
      rig.root.rotation.y = rig.yaw;
      rig.ctrl.update(dt);
      return true;
    }
  }

  // 3. Nighttime Sleep & Safe Commute Schedule (18:00..07:30) in the Underground Dwarven Sleeping Quarters
  const hNorm = ((worldHours % 24) + 24) % 24;

  if (hNorm >= 19.5 || hNorm < 6.0) {
    carriedOre.visible = false;
    heldBeerMug.visible = false;
    rig.lanternGlow.visible = false;
    const bedY = U + 0.52;
    rig.x = ANCIENT_MINE_ORIGIN.x + bedLx;
    rig.y = bedY;
    rig.z = ANCIENT_MINE_ORIGIN.z + bedLz;
    rig.yaw = 0;
    rig.root.position.set(bedLx, bedY, bedLz);
    rig.root.rotation.y = rig.yaw;
    rig.ctrl.speed = 0;
    setClip('sleep');
    rig.ctrl.update(dt);
    return true;
  }

  if (hNorm >= 18.0 && hNorm < 19.5) {
    carriedOre.visible = false;
    heldBeerMug.visible = false;
    rig.lanternGlow.visible = true;
    const u = (hNorm - 18.0) / 1.5;
    const routeToBed = buildSafeCommuteWaypoints(workAnchorLx, workAnchorLz, workAnchorY, bedLx, bedLz);
    const pos = sampleSafeCommutePath(routeToBed, u);
    rig.x = ANCIENT_MINE_ORIGIN.x + pos.lx;
    rig.y = pos.y;
    rig.z = ANCIENT_MINE_ORIGIN.z + pos.lz;
    rig.yaw = pos.yaw;
    rig.root.position.set(pos.lx, pos.y, pos.lz);
    rig.root.rotation.y = pos.yaw;
    rig.ctrl.speed = 2.2;
    setClip('walk');
    rig.ctrl.update(dt);
    return true;
  }

  if (hNorm >= 6.0 && hNorm < 7.5) {
    carriedOre.visible = false;
    heldBeerMug.visible = false;
    rig.lanternGlow.visible = true;
    const u = (hNorm - 6.0) / 1.5;
    const routeFromBed = buildSafeCommuteWaypoints(workAnchorLx, workAnchorLz, workAnchorY, bedLx, bedLz).reverse();
    const pos = sampleSafeCommutePath(routeFromBed, u);
    rig.x = ANCIENT_MINE_ORIGIN.x + pos.lx;
    rig.y = pos.y;
    rig.z = ANCIENT_MINE_ORIGIN.z + pos.lz;
    rig.yaw = pos.yaw;
    rig.root.position.set(pos.lx, pos.y, pos.lz);
    rig.root.rotation.y = pos.yaw;
    rig.ctrl.speed = 2.2;
    setClip('walk');
    rig.ctrl.update(dt);
    return true;
  }

  rig.lanternGlow.visible = true;
  return false;
}
// #endregion

// #region Cooperative 3-Portion Minecart Team AI
type MinerPhase =
  | 'walk_to_vein'
  | 'mining_vein'
  | 'carry_to_cart'
  | 'waiting_in_queue'
  | 'dumping_portion'
  | 'riding_cart';

type CartPhase = 'waiting_for_ore' | 'delivering' | 'unloading' | 'returning';

function buildCooperativeCartTeam(
  ctx: ISetPieceContext,
  cfg: ICooperativeCartConfig,
  cartPortionGeo: THREE.BufferGeometry,
  attachLantern: (parent: THREE.Object3D, x: number, y: number, z: number) => THREE.Mesh,
  createCombatDwarfRig: (
    dwarfId: number,
    name: string,
    scale: number,
    tintHex: number,
    initLx: number,
    initY: number,
    initLz: number
  ) => {
    rig: IDwarvenMinerRig;
    setClip: (clip: DwarfWarriorState) => void;
    carriedOre: THREE.Mesh;
    heldBeerMug: THREE.Mesh;
  }
): (elapsedTime: number, dt: number, worldHours: number, playerX: number, playerZ: number) => void {
  const pts = cfg.waypoints.map(([lx, lz]) => {
    const y = sampleAncientMineFloor(lx, lz)?.height ?? U;
    return { lx, y, lz };
  });
  const segLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b.lx - a.lx, b.y - a.y, b.lz - a.lz);
    segLengths.push(len);
    totalLength += len;
  }
  const travelDuration = Math.max(1.5, totalLength / cfg.speed);

  const sampleTrackAtU = (u: number): { lx: number; y: number; lz: number; yaw: number; pitch: number } => {
    const clampedU = Math.max(0, Math.min(1, u));
    const targetDist = clampedU * totalLength;
    let acc = 0;
    for (let i = 0; i < segLengths.length; i++) {
      const len = segLengths[i];
      if (acc + len >= targetDist || i === segLengths.length - 1) {
        const a = pts[i];
        const b = pts[i + 1];
        const t = len > 1e-5 ? Math.max(0, Math.min(1, (targetDist - acc) / len)) : 0;
        const dx = b.lx - a.lx;
        const dy = b.y - a.y;
        const dz = b.lz - a.lz;
        const lx = a.lx + dx * t;
        const lz = a.lz + dz * t;
        const y = sampleAncientMineFloor(lx, lz)?.height ?? a.y + dy * t;
        const yaw = Math.atan2(dx, dz);
        const horiz = Math.hypot(dx, dz) || 1;
        const pitch = -Math.atan2(dy, horiz);
        return { lx, y, lz, yaw, pitch };
      }
      acc += len;
    }
    const last = pts[pts.length - 1];
    return { lx: last.lx, y: last.y, lz: last.lz, yaw: 0, pitch: 0 };
  };

  // Build the Minecart mesh with 3 distinct ore-portion mounds (1/3, 2/3, 3/3)
  const cartGroup = new THREE.Group();
  cartGroup.name = `ancient-mine-${cfg.id}`;
  cartGroup.rotation.order = 'YXZ';
  ctx.group.add(cartGroup);

  // Inner tilt pivot so the cart body tilts upward at the Central Gold Funnel rim to dump its gold!
  const cartTiltPivot = new THREE.Group();
  cartGroup.add(cartTiltPivot);

  const cartGeo = ctx.own(buildPropGeometry('oreCart', MINE_PALETTE.coal));
  const cartMesh = new THREE.Mesh(cartGeo, ctx.materials.statue);
  cartTiltPivot.add(cartMesh);
  attachLantern(cartTiltPivot, 0, 0.86, 0.98);

  const portionMat = new THREE.MeshStandardMaterial({
    color: cfg.oreTint,
    emissive: new THREE.Color(cfg.oreTint),
    emissiveIntensity: 0.35,
    roughness: 0.32,
    metalness: 0.72,
  });
  ctx.ownMaterial(portionMat);

  // 3 prominent gold/silver ore mounds inside the cart bed representing 1/3, 2/3, and 3/3 capacity
  const portionMounds: THREE.Mesh[] = [-0.46, 0.0, 0.46].map((zOff, idx) => {
    const mound = new THREE.Mesh(cartPortionGeo, portionMat);
    mound.position.set((idx % 2 === 0 ? -1 : 1) * 0.07, 1.24 + idx * 0.06, zOff);
    mound.scale.set(1.38, 0.96, 1.18);
    mound.visible = false;
    cartTiltPivot.add(mound);
    return mound;
  });

  // Cart state machine
  let cartPhase: CartPhase = 'waiting_for_ore';
  let cartPortions = 0; // 0, 1, 2, or 3
  let cartPhaseTimer = 0;
  let cartTrackU = 0;
  let activeLoaderDwarfId: number | null = null;
  let riderDwarfId: number | null = null;

  // Build the 2 cooperative miners for this cart
  const minerActors = cfg.miners.map((mCfg, idx) => {
    const initY = sampleAncientMineFloor(mCfg.veinLx, mCfg.veinLz)?.height ?? U;
    const { rig, setClip, carriedOre, heldBeerMug } = createCombatDwarfRig(
      mCfg.dwarfId,
      mCfg.name,
      mCfg.scale,
      mCfg.tintHex,
      mCfg.veinLx,
      initY,
      mCfg.veinLz
    );
    return {
      cfg: mCfg,
      rig,
      setClip,
      carriedOre,
      heldBeerMug,
      phase: (idx === 0 ? 'mining_vein' : 'walk_to_vein') as MinerPhase,
      phaseTimer: idx === 0 ? 1.4 : 0,
      lx: mCfg.veinLx,
      y: initY,
      lz: mCfg.veinLz,
    };
  });

  const moveMinerToward = (
    actor: (typeof minerActors)[number],
    targetLx: number,
    targetLz: number,
    speed: number,
    dt: number
  ): boolean => {
    const dx = targetLx - actor.lx;
    const dz = targetLz - actor.lz;
    const dist = Math.hypot(dx, dz);
    if (dist <= 0.15) {
      actor.lx = targetLx;
      actor.lz = targetLz;
      actor.y = sampleAncientMineFloor(actor.lx, actor.lz, actor.y + 0.9)?.height ?? actor.y;
      return true;
    }
    const step = Math.min(dist, speed * dt);
    const nextLx = actor.lx + (dx / dist) * step;
    const nextLz = Math.min(MAX_DWARF_LZ, actor.lz + (dz / dist) * step);
    const safeY = resolveSafeDwarfStepFloor(actor.y, nextLx, nextLz);
    actor.lx = nextLx;
    actor.lz = nextLz;
    if (safeY !== null) {
      actor.y = safeY;
    }
    actor.rig.yaw = Math.atan2(-dx, -dz);
    actor.rig.ctrl.speed = speed;
    actor.setClip('walk');
    return dist <= step + 0.05;
  };

  return (_elapsedTime: number, dt: number, worldHours: number, playerX: number, playerZ: number): void => {
    // 1. Update Cart Movement when delivering (3/3), unloading at the Central Gold Funnel, or returning empty (0/3)
    let goingForward = true;
    let dumpTiltAngle = 0;
    if (cartPhase === 'waiting_for_ore') {
      cartTrackU = 0;
      goingForward = true;
    } else if (cartPhase === 'delivering') {
      cartPhaseTimer += dt;
      const raw = Math.min(1, cartPhaseTimer / travelDuration);
      cartTrackU = raw * raw * (3 - 2 * raw);
      goingForward = true;
      if (raw >= 1) {
        cartPhase = 'unloading';
        cartPhaseTimer = 0;
      }
    } else if (cartPhase === 'unloading') {
      cartTrackU = 1;
      goingForward = true;
      cartPhaseTimer += dt;
      // Smoothly tilt the minecart bed forward (`+X` pitch in local space) to pour its gold into the Central Gold Funnel!
      const tiltProgress = Math.min(1, cartPhaseTimer / 2.2);
      dumpTiltAngle = Math.sin(tiltProgress * Math.PI) * 0.52;
      if (cartPhaseTimer >= 1.1) {
        cartPortions = 0;
      }
      if (cartPhaseTimer >= 2.2) {
        cartPhase = 'returning';
        cartPhaseTimer = 0;
      }
    } else if (cartPhase === 'returning') {
      cartPhaseTimer += dt;
      const raw = Math.min(1, cartPhaseTimer / travelDuration);
      cartTrackU = 1 - raw * raw * (3 - 2 * raw);
      goingForward = false;
      if (raw >= 1) {
        cartTrackU = 0;
        cartPhase = 'waiting_for_ore';
        cartPhaseTimer = 0;
        const returningRiderId = riderDwarfId;
        riderDwarfId = null;
        for (const actor of minerActors) {
          if (actor.cfg.dwarfId === returningRiderId && actor.phase === 'riding_cart') {
            actor.phase = 'walk_to_vein';
            actor.phaseTimer = 0;
          }
        }
      }
    }

    // Update cart transform, dump tilt, and 1/3, 2/3, 3/3 ore portion visibility
    const cartPose = sampleTrackAtU(cartTrackU);
    cartGroup.position.set(cartPose.lx, cartPose.y, cartPose.lz);
    cartGroup.rotation.y = cartPose.yaw;
    cartGroup.rotation.x = cartPose.pitch;
    cartTiltPivot.rotation.x = dumpTiltAngle;
    for (let m = 0; m < 3; m++) {
      portionMounds[m].visible = cartPortions >= m + 1;
    }

    // 2. Update each of the 2 Cooperative Miners
    for (const actor of minerActors) {
      const mCfg = actor.cfg;
      const startY = sampleAncientMineFloor(mCfg.veinLx, mCfg.veinLz)?.height ?? U;

      // If this dwarf is dead, aggroed, or sleeping/commuting at night:
      if (
        updateDwarfMortalityCombatAndSleep(
          actor.rig,
          actor.setClip,
          actor.carriedOre,
          actor.heldBeerMug,
          dt,
          worldHours,
          playerX,
          playerZ,
          mCfg.veinLx,
          mCfg.veinLz,
          startY,
          mCfg.bedLx,
          mCfg.bedLz
        )
      ) {
        if (activeLoaderDwarfId === mCfg.dwarfId) activeLoaderDwarfId = null;
        if (riderDwarfId === mCfg.dwarfId) {
          riderDwarfId = null;
          cartPhase = 'waiting_for_ore';
          cartTrackU = 0;
        }
        continue;
      }

      if (actor.phase === 'walk_to_vein') {
        actor.carriedOre.visible = false;
        actor.carriedOre.position.set(0.0, 0.92, -0.38);
        actor.rig.ctrl.setWeaponVisible(true);
        if (moveMinerToward(actor, mCfg.veinLx, mCfg.veinLz, 2.45, dt)) {
          actor.phase = 'mining_vein';
          actor.phaseTimer = 0;
        }
      } else if (actor.phase === 'mining_vein') {
        // Mine the real wall mineral vein (facing directly into the vein!)
        actor.carriedOre.visible = false;
        actor.carriedOre.position.set(0.0, 0.92, -0.38);
        actor.rig.ctrl.setWeaponVisible(true);
        actor.lx = mCfg.veinLx;
        actor.lz = mCfg.veinLz;
        actor.y = sampleAncientMineFloor(actor.lx, actor.lz, actor.y + 0.9)?.height ?? U;
        actor.rig.yaw = mCfg.veinYaw;
        actor.rig.ctrl.speed = 0;
        actor.phaseTimer += dt;
        actor.setClip(Math.floor(actor.phaseTimer * 0.85) % 2 === 0 ? 'mine1' : 'mine2');
        if (actor.phaseTimer >= mCfg.mineDurationSec) {
          actor.phase = 'carry_to_cart';
          actor.phaseTimer = 0;
        }
      } else if (actor.phase === 'carry_to_cart') {
        // Carry the mined portion of ore in both hands toward the cart loading station
        actor.carriedOre.visible = true;
        actor.carriedOre.position.set(0.0, 0.92, -0.38);
        actor.rig.ctrl.setWeaponVisible(false);
        const cartIsFreeToLoad =
          cartPhase === 'waiting_for_ore' &&
          cartPortions < 3 &&
          (activeLoaderDwarfId === null || activeLoaderDwarfId === mCfg.dwarfId);

        const targetLx = cartIsFreeToLoad ? cfg.loadLx : cfg.queueLx;
        const targetLz = cartIsFreeToLoad ? cfg.loadLz : cfg.queueLz;
        if (moveMinerToward(actor, targetLx, targetLz, 2.4, dt)) {
          if (
            cartPhase === 'waiting_for_ore' &&
            cartPortions < 3 &&
            (activeLoaderDwarfId === null || activeLoaderDwarfId === mCfg.dwarfId)
          ) {
            activeLoaderDwarfId = mCfg.dwarfId;
            actor.phase = 'dumping_portion';
            actor.phaseTimer = 0;
          } else {
            actor.phase = 'waiting_in_queue';
            actor.phaseTimer = 0;
          }
        }
      } else if (actor.phase === 'waiting_in_queue') {
        // Wait at the queue spot holding the ore portion; the moment the cart is free, switch to carry_to_cart!
        actor.carriedOre.visible = true;
        actor.carriedOre.position.set(0.0, 0.92, -0.38);
        actor.rig.ctrl.setWeaponVisible(false);

        if (
          cartPhase === 'waiting_for_ore' &&
          cartPortions < 3 &&
          (activeLoaderDwarfId === null || activeLoaderDwarfId === mCfg.dwarfId)
        ) {
          actor.phase = 'carry_to_cart';
          actor.phaseTimer = 0;
        } else if (!moveMinerToward(actor, cfg.queueLx, cfg.queueLz, 2.2, dt)) {
          // Still walking to the queue spot
        } else {
          const startPt = pts[0];
          actor.rig.yaw = yawToward(actor.lx, actor.lz, startPt.lx, startPt.lz);
          actor.rig.ctrl.speed = 0;
          actor.setClip('idle');
        }
      } else if (actor.phase === 'dumping_portion') {
        // Stand right beside the cart at u = 0 and actively heave/throw the ore portion into the cart bed!
        actor.lx = cfg.loadLx;
        actor.lz = cfg.loadLz;
        actor.y = sampleAncientMineFloor(actor.lx, actor.lz, actor.y + 0.9)?.height ?? U;
        const startPt = pts[0];
        actor.rig.yaw = yawToward(actor.lx, actor.lz, startPt.lx, startPt.lz);
        actor.rig.ctrl.speed = 0;
        actor.rig.ctrl.setWeaponVisible(false);
        actor.setClip('attack1');
        actor.phaseTimer += dt;

        // Parabolic throw trajectory from dwarf's hands (0, 0.92, -0.38) into the cart bed (0, 1.32, -0.95)
        const throwFrac = Math.min(1, actor.phaseTimer / 0.72);
        actor.carriedOre.visible = actor.phaseTimer < 0.75;
        actor.carriedOre.position.set(
          0.0,
          0.92 + throwFrac * 0.4 + Math.sin(throwFrac * Math.PI) * 0.44,
          -0.38 - throwFrac * 0.58
        );

        if (actor.phaseTimer >= 0.95) {
          actor.carriedOre.visible = false;
          actor.carriedOre.position.set(0.0, 0.92, -0.38);
          actor.rig.ctrl.setWeaponVisible(true);
          cartPortions = Math.min(3, cartPortions + 1);
          activeLoaderDwarfId = null;

          if (cartPortions >= 3) {
            // 3rd (final) portion loaded! This dwarf climbs onto the cart and rides it to the Central Gold Funnel!
            riderDwarfId = mCfg.dwarfId;
            actor.phase = 'riding_cart';
            actor.phaseTimer = 0;
            cartPhase = 'delivering';
            cartPhaseTimer = 0;
          } else {
            // 1/3 or 2/3 full: return to the wall mineral vein to mine another portion
            actor.phase = 'walk_to_vein';
            actor.phaseTimer = 0;
          }
        }
      } else if (actor.phase === 'riding_cart') {
        actor.carriedOre.visible = false;
        if (cartPhase === 'unloading') {
          // Step off beside the Central Gold Funnel rim and pull the tipper lever while the cart tilts up!
          const perpX = Math.cos(cartPose.yaw) * cfg.unloadSideOffset;
          const perpZ = -Math.sin(cartPose.yaw) * cfg.unloadSideOffset;
          actor.lx = cartPose.lx + perpX;
          actor.lz = cartPose.lz + perpZ;
          actor.y = sampleAncientMineFloor(actor.lx, actor.lz, cartPose.y + 0.9)?.height ?? cartPose.y;
          actor.rig.yaw = Math.atan2(-(cartPose.lx - actor.lx), -(cartPose.lz - actor.lz));
          actor.rig.ctrl.speed = 0;
          actor.setClip('mine2');
        } else {
          // Standing inside the minecart bed facing the direction of travel
          actor.lx = cartPose.lx;
          actor.lz = cartPose.lz;
          actor.y = cartPose.y + 0.36;
          const travelYaw = goingForward ? cartPose.yaw : cartPose.yaw + Math.PI;
          actor.rig.yaw = travelYaw + Math.PI;
          actor.rig.ctrl.speed = 0;
          actor.setClip('idle');
        }
      }

      actor.rig.x = ANCIENT_MINE_ORIGIN.x + actor.lx;
      actor.rig.y = actor.y;
      actor.rig.z = ANCIENT_MINE_ORIGIN.z + actor.lz;
      actor.rig.root.position.set(actor.lx, actor.y, actor.lz);
      actor.rig.root.rotation.y = actor.rig.yaw;
      actor.rig.ctrl.update(dt);
    }
  };
}
// #endregion

// #region Wandering, Toolsmith & Tavern Dwarf AI
function buildSingleWanderingDwarf(
  cfg: IWanderingDwarfConfig,
  createCombatDwarfRig: (
    dwarfId: number,
    name: string,
    scale: number,
    tintHex: number,
    initLx: number,
    initY: number,
    initLz: number
  ) => {
    rig: IDwarvenMinerRig;
    setClip: (clip: DwarfWarriorState) => void;
    carriedOre: THREE.Mesh;
    heldBeerMug: THREE.Mesh;
  }
): (elapsedTime: number, dt: number, worldHours: number, playerX: number, playerZ: number) => void {
  const wps = cfg.waypoints;
  const legCount = wps.length;
  const legInfos: Array<{
    readonly a: IPatrolWaypoint;
    readonly b: IPatrolWaypoint;
    readonly walkSec: number;
    readonly pauseSec: number;
    readonly walkYaw: number;
  }> = [];

  let totalCycleSec = 0;
  for (let i = 0; i < legCount; i++) {
    const a = wps[i];
    const b = wps[(i + 1) % legCount];
    const dist = Math.hypot(b.lx - a.lx, b.lz - a.lz);
    const walkSec = Math.max(0.5, dist / cfg.speed);
    const walkYaw = Math.atan2(-(b.lx - a.lx), -(b.lz - a.lz));
    legInfos.push({ a, b, walkSec, pauseSec: a.pauseSec, walkYaw });
    totalCycleSec += a.pauseSec + walkSec;
  }

  const firstWp = wps[0];
  const initY = sampleAncientMineFloor(firstWp.lx, firstWp.lz, firstWp.hintY)?.height ?? firstWp.hintY;
  const { rig, setClip, carriedOre, heldBeerMug } = createCombatDwarfRig(
    cfg.dwarfId,
    cfg.name,
    cfg.scale,
    cfg.tintHex,
    firstWp.lx,
    initY,
    firstWp.lz
  );

  return (elapsedTime: number, dt: number, worldHours: number, playerX: number, playerZ: number): void => {
    if (
      updateDwarfMortalityCombatAndSleep(
        rig,
        setClip,
        carriedOre,
        heldBeerMug,
        dt,
        worldHours,
        playerX,
        playerZ,
        firstWp.lx,
        firstWp.lz,
        initY,
        cfg.bedLx,
        cfg.bedLz
      )
    ) {
      return;
    }

    const cycleT = ((elapsedTime + cfg.phaseOffsetSec) % totalCycleSec + totalCycleSec) % totalCycleSec;
    let acc = 0;
    let chosenLeg = legInfos[0];
    let localT = 0;

    for (let i = 0; i < legInfos.length; i++) {
      const leg = legInfos[i];
      const span = leg.pauseSec + leg.walkSec;
      if (cycleT < acc + span || i === legInfos.length - 1) {
        chosenLeg = leg;
        localT = cycleT - acc;
        break;
      }
      acc += span;
    }

    let lx: number;
    let lz: number;
    let hintY: number;
    let yaw: number;
    let yOffset = 0;

    if (localT < chosenLeg.pauseSec) {
      lx = chosenLeg.a.lx;
      lz = Math.min(MAX_DWARF_LZ, chosenLeg.a.lz);
      hintY = chosenLeg.a.hintY;
      yaw = chosenLeg.a.faceYaw ?? chosenLeg.walkYaw;
      yOffset = chosenLeg.a.seatYOffset ?? 0;
      rig.ctrl.speed = 0;
      setClip(chosenLeg.a.action);
      const isDrinking = Boolean(chosenLeg.a.drinkingBeer);
      const isSitting = chosenLeg.a.action === 'sit';
      rig.ctrl.setWeaponVisible(!isSitting && !isDrinking);
      heldBeerMug.visible = isDrinking;
      if (heldBeerMug.visible) {
        // Gentle toasting/sipping motion with the beer mug in hand
        const baseMugY = isSitting ? 0.72 : 0.96;
        heldBeerMug.position.set(0.26, baseMugY + Math.sin(elapsedTime * 3.2 + cfg.dwarfId) * 0.06, -0.38);
      }
    } else {
      const walkProgress = Math.max(0, Math.min(1, (localT - chosenLeg.pauseSec) / chosenLeg.walkSec));
      lx = chosenLeg.a.lx + (chosenLeg.b.lx - chosenLeg.a.lx) * walkProgress;
      lz = Math.min(MAX_DWARF_LZ, chosenLeg.a.lz + (chosenLeg.b.lz - chosenLeg.a.lz) * walkProgress);
      hintY = chosenLeg.a.hintY + (chosenLeg.b.hintY - chosenLeg.a.hintY) * walkProgress;
      yaw = chosenLeg.walkYaw;
      rig.ctrl.speed = cfg.speed;
      setClip('walk');
      // Bartender carries beer mugs between bar and tables; patrons set their mug down when walking
      const carryMugWhileWalking = Boolean(chosenLeg.a.drinkingBeer && chosenLeg.b.drinkingBeer && cfg.dwarfId === 114);
      rig.ctrl.setWeaponVisible(!carryMugWhileWalking);
      heldBeerMug.visible = carryMugWhileWalking;
      heldBeerMug.position.set(0.28, 0.94, -0.36);
    }

    const floorHit = sampleAncientMineFloor(lx, lz, hintY + 0.8);
    const floorY = (floorHit !== null ? floorHit.height : hintY) + yOffset;

    rig.x = ANCIENT_MINE_ORIGIN.x + lx;
    rig.y = floorY;
    rig.z = ANCIENT_MINE_ORIGIN.z + lz;
    rig.yaw = yaw;
    rig.root.position.set(lx, floorY, lz);
    rig.root.rotation.y = yaw;
    rig.ctrl.update(dt);
  };
}
// #endregion
