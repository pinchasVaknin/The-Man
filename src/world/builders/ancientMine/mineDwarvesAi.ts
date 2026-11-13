// ============================================================================
// MODULE: World / Builders / Ancient Mine / Mine Dwarves AI
// DESIGN: Autonomous AI simulation for minecart-riding dwarves and multi-level wandering/working
//         dwarves inside the Ancient Dwarven Mine. Uses sampleAncientMineFloor(lx, lz, hintY) so
//         every dwarf and minecart follows stairs, ramps, bridges, and balconies accurately.
// SUMMARY: Populates the entire Ancient Mine with lively AI dwarves who ride minecarts along the
//          rail tracks (loading/unloading at stations and riding between hubs) and patrol/work
//          across the Upper Cavern, Lagoon, Galleries, Foundry, Grand Descent, Great Bridge,
//          Heroes' Cliff Path, King's Balcony, Golem Chamber, and Dragon Forge.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import { sampleAncientMineFloor } from '../../domain/landmarks/ancientMine/ancientMineFloor';
import { MINE_LEVEL_Y } from '../../domain/landmarks/ancientMine/ancientMineLayout';
import {
  createReadyDwarfWarrior,
  type DwarfWarrior,
  type DwarfWarriorState,
} from '../../models/Characters/DwarfWarrior_Complete';
import { MINE_PALETTE, buildPropGeometry } from './propGeometries';
import type { ISetPieceContext, ISetPieceUpdate } from './upperLevelSetPieces';
// #endregion

// ======================== TYPES & CONFIGURATIONS ======================== \\
// #region Types
interface ITrackTrainConfig {
  readonly id: string;
  readonly waypoints: readonly (readonly [number, number])[];
  readonly speed: number;
  readonly stationPauseSec: number;
  readonly phaseOffsetSec: number;
  readonly oreTint: number;
  /** Offset where the dwarf stands when dismounted at start/end station to load/unload ore. */
  readonly dismountSideOffset: number;
}

interface IPatrolWaypoint {
  readonly lx: number;
  readonly lz: number;
  readonly hintY: number;
  readonly pauseSec: number;
  readonly action: DwarfWarriorState;
  readonly faceYaw?: number;
}

interface IWanderingDwarfConfig {
  readonly id: string;
  readonly speed: number;
  readonly phaseOffsetSec: number;
  readonly scale: number;
  readonly waypoints: readonly IPatrolWaypoint[];
}
// #endregion

// #region AI Schedules & Routes
const U = MINE_LEVEL_Y.upperCavern;
const S = MINE_LEVEL_Y.hubScaffolding;
const L = MINE_LEVEL_Y.chasmLedge;

/**
 * Summary: 4 autonomous minecart trains operated by AI Dwarves on the upper cavern rail network.
 */
const AI_MINECART_TRAINS: readonly ITrackTrainConfig[] = [
  // 1. West Storage Yard Haul Line
  {
    id: 'ai-train-storage-west',
    waypoints: [
      [-6, 80],
      [-20, 74],
      [-30, 69],
      [-40, 64],
    ],
    speed: 6.2,
    stationPauseSec: 3.8,
    phaseOffsetSec: 0.0,
    oreTint: 0x38bdf8,
    dismountSideOffset: 1.45,
  },
  // 2. Foundry Bullion Express Line
  {
    id: 'ai-train-foundry-southeast',
    waypoints: [
      [4, 85],
      [20, 100],
      [40, 108],
      [56, 108],
      [68, 114],
    ],
    speed: 7.0,
    stationPauseSec: 3.5,
    phaseOffsetSec: 5.2,
    oreTint: MINE_PALETTE.gold,
    dismountSideOffset: -1.45,
  },
  // 3. East Gallery Ramp & Pit Ore Haul
  {
    id: 'ai-train-gallery-pit',
    waypoints: [
      [6, 80],
      [30, 80],
      [56, 78],
      [70, 76],
      [70, 72],
      [70, 60],
      [70, 54],
    ],
    speed: 6.8,
    stationPauseSec: 4.0,
    phaseOffsetSec: 11.0,
    oreTint: MINE_PALETTE.ember,
    dismountSideOffset: 1.45,
  },
  // 4. Gallery Crusher Spur Shuttle
  {
    id: 'ai-train-crusher-spur',
    waypoints: [
      [70, 76],
      [84, 74],
      [90, 72],
    ],
    speed: 4.8,
    stationPauseSec: 3.2,
    phaseOffsetSec: 2.7,
    oreTint: MINE_PALETTE.ore,
    dismountSideOffset: -1.35,
  },
];

/**
 * Summary: 13 wandering and working AI Dwarves patrolling from the Entrance down to the Golem Chamber
 *          (strictly lz <= 342, never entering the Ancient Passage or Dragon Forge).
 *          Every mining station ('mine1'/'mine2') stands directly in front of a real mineralVein or
 *          crystalCluster prop, and Central Hub miners climb the 2nd-floor scaffolding stairs to swap
 *          tools and dump mined gold into the Gold Collection Hopper chute at (lx = 18, lz = 62).
 */
const AI_WANDERING_DWARVES: readonly IWanderingDwarfConfig[] = [
  // 1. Overlook & Grand Entry Stairs Sentry
  {
    id: 'dwarf-entry-sentry',
    speed: 2.3,
    phaseOffsetSec: 0.0,
    scale: 1.15,
    waypoints: [
      { lx: -2.8, lz: 13.5, hintY: MINE_LEVEL_Y.overlook, pauseSec: 3.0, action: 'idle', faceYaw: 0 },
      { lx: -2.8, lz: 20.0, hintY: MINE_LEVEL_Y.overlook, pauseSec: 1.2, action: 'idle', faceYaw: 0 },
      { lx: -2.8, lz: 47.0, hintY: U, pauseSec: 3.2, action: 'idle', faceYaw: 0 },
      { lx: 2.8, lz: 47.0, hintY: U, pauseSec: 2.0, action: 'attack2', faceYaw: Math.PI },
      { lx: 2.8, lz: 14.0, hintY: MINE_LEVEL_Y.overlook, pauseSec: 3.5, action: 'idle', faceYaw: Math.PI },
    ],
  },
  // 2. Central Hub 2nd-Floor Scaffolding Toolsmith & Gold Hopper Miner
  {
    id: 'dwarf-scaffolding-toolsmith',
    speed: 2.25,
    phaseOffsetSec: 1.5,
    scale: 1.17,
    waypoints: [
      // Climb onto the 2nd-floor scaffolding deck to swap tools at the toolRack (-34.5, 27.2) & anvil (-28.0, 31.5)
      { lx: -19.0, lz: 50.5, hintY: U, pauseSec: 0.8, action: 'idle', faceYaw: Math.PI },
      { lx: -19.0, lz: 37.5, hintY: S, pauseSec: 1.0, action: 'idle', faceYaw: -Math.PI / 2 },
      { lx: -29.0, lz: 28.8, hintY: S, pauseSec: 3.8, action: 'mine2', faceYaw: Math.PI }, // Swapping tools at toolRack
      { lx: -28.0, lz: 33.2, hintY: S, pauseSec: 3.5, action: 'mine1', faceYaw: Math.PI }, // Hammering at 2nd-floor anvil
      { lx: -19.0, lz: 37.5, hintY: S, pauseSec: 0.8, action: 'idle', faceYaw: 0 },
      { lx: -19.0, lz: 50.5, hintY: U, pauseSec: 0.8, action: 'idle', faceYaw: -Math.PI / 2 },
      // Walk to the rich West Gold Vein (-45.5, 60.0) and mine gold
      { lx: -43.5, lz: 60.0, hintY: U, pauseSec: 4.5, action: 'mine1', faceYaw: -Math.PI / 2 },
      // Haul the mined gold across the Central Hub to dump into the Gold Collection Hopper (18.0, 62.0)
      { lx: 15.2, lz: 62.0, hintY: U, pauseSec: 4.0, action: 'mine2', faceYaw: Math.PI / 2 },
    ],
  },
  // 3. Turntable Hub & Gold Chute Hauler
  {
    id: 'dwarf-turntable-foreman',
    speed: 2.2,
    phaseOffsetSec: 3.4,
    scale: 1.18,
    waypoints: [
      // Mine the North Gold Vein at (18.0, 21.2)
      { lx: 18.0, lz: 23.2, hintY: U, pauseSec: 4.2, action: 'mine1', faceYaw: Math.PI },
      // Dump the gold into the Central Hub Gold Hopper Chute at (18.0, 62.0)
      { lx: 20.8, lz: 62.0, hintY: U, pauseSec: 3.8, action: 'mine2', faceYaw: -Math.PI / 2 },
      // Inspect turntable switches & climb 2nd-floor scaffolding to sharpen pickaxe
      { lx: 9.2, lz: 87.5, hintY: U, pauseSec: 3.0, action: 'idle', faceYaw: 0 },
      { lx: -19.0, lz: 50.5, hintY: U, pauseSec: 0.8, action: 'idle', faceYaw: Math.PI },
      { lx: -19.0, lz: 37.5, hintY: S, pauseSec: 0.8, action: 'idle', faceYaw: -Math.PI / 2 },
      { lx: -23.0, lz: 28.8, hintY: S, pauseSec: 3.6, action: 'mine2', faceYaw: Math.PI }, // Weapon/tool rack on 2nd floor
      { lx: -19.0, lz: 37.5, hintY: S, pauseSec: 0.8, action: 'idle', faceYaw: 0 },
      { lx: -19.0, lz: 50.5, hintY: U, pauseSec: 0.8, action: 'idle', faceYaw: Math.PI / 2 },
    ],
  },
  // 4. Crystal Lagoon & Waterworks Engineer (mines the crystal clusters & purple vein along the lagoon)
  {
    id: 'dwarf-lagoon-engineer',
    speed: 2.1,
    phaseOffsetSec: 7.1,
    scale: 1.14,
    waypoints: [
      { lx: -43.5, lz: 72.0, hintY: U, pauseSec: 4.0, action: 'mine1', faceYaw: -Math.PI / 2 }, // West wall gold vein (-45.5, 72)
      { lx: -59.5, lz: 96.0, hintY: U, pauseSec: 4.2, action: 'mine2', faceYaw: -Math.PI / 2 }, // Lagoon purple vein & crystal (-61.5, 96)
      { lx: -68.0, lz: 82.0, hintY: U, pauseSec: 3.0, action: 'idle', faceYaw: -Math.PI / 2 },
      { lx: -60.2, lz: 56.0, hintY: U, pauseSec: 4.0, action: 'mine1', faceYaw: -Math.PI / 2 }, // Lagoon blue crystal cluster (-62.2, 56)
      { lx: -55.0, lz: 108.0, hintY: U, pauseSec: 2.2, action: 'idle', faceYaw: Math.PI / 2 },
    ],
  },
  // 5. East Galleries & Vein Miner (mines the north & east gallery mineral veins)
  {
    id: 'dwarf-gallery-miner',
    speed: 2.25,
    phaseOffsetSec: 1.9,
    scale: 1.15,
    waypoints: [
      { lx: 75.0, lz: 25.0, hintY: U, pauseSec: 4.0, action: 'mine1', faceYaw: Math.PI }, // Blue mineral vein (75, 23.2)
      { lx: 92.0, lz: 28.0, hintY: U, pauseSec: 4.2, action: 'mine2', faceYaw: Math.PI }, // Purple mineral vein (92, 26.2)
      { lx: 117.5, lz: 60.0, hintY: U, pauseSec: 4.5, action: 'mine1', faceYaw: Math.PI / 2 }, // East iron vein (119.5, 60)
      { lx: 117.5, lz: 86.0, hintY: U, pauseSec: 4.2, action: 'mine2', faceYaw: Math.PI / 2 }, // East gold vein (119.5, 86)
      { lx: 88.0, lz: 84.0, hintY: U, pauseSec: 2.8, action: 'idle', faceYaw: -Math.PI / 2 },
    ],
  },
  // 6. Gallery Pit Deep Excavator (mines the copper, dark, and gold veins inside the pit)
  {
    id: 'dwarf-gallery-pit-worker',
    speed: 2.0,
    phaseOffsetSec: 9.3,
    scale: 1.16,
    waypoints: [
      { lx: 60.0, lz: 54.0, hintY: MINE_LEVEL_Y.galleryPit, pauseSec: 4.2, action: 'mine1', faceYaw: -Math.PI / 2 }, // Pit west copper vein (58.3, 54)
      { lx: 60.0, lz: 60.0, hintY: MINE_LEVEL_Y.galleryPit, pauseSec: 4.0, action: 'mine2', faceYaw: -Math.PI / 2 }, // Pit west dark vein (58.2, 60)
      { lx: 75.0, lz: 52.0, hintY: MINE_LEVEL_Y.galleryPit, pauseSec: 4.2, action: 'mine1', faceYaw: Math.PI }, // Pit north gold vein (75.0, 50.3)
      { lx: 79.8, lz: 64.0, hintY: MINE_LEVEL_Y.galleryPit, pauseSec: 4.5, action: 'mine2', faceYaw: Math.PI / 2 }, // Pit east gold vein (81.8, 64)
    ],
  },
  // 7. Smelting Foundry Master Blacksmith (hammers at the foundry anvils & casting molds, then dumps bullion in Gold Hopper)
  {
    id: 'dwarf-foundry-smith',
    speed: 2.15,
    phaseOffsetSec: 4.8,
    scale: 1.2,
    waypoints: [
      { lx: 72.0, lz: 123.2, hintY: U, pauseSec: 3.8, action: 'mine2', faceYaw: 0 }, // West casting mold (72, 125)
      { lx: 80.0, lz: 113.5, hintY: U, pauseSec: 4.2, action: 'mine1', faceYaw: 0 }, // West anvil (80, 115)
      { lx: 90.0, lz: 123.2, hintY: U, pauseSec: 3.5, action: 'idle', faceYaw: 0 }, // Middle casting mold (90, 125)
      { lx: 100.0, lz: 114.5, hintY: U, pauseSec: 4.2, action: 'mine1', faceYaw: 0 }, // East anvil (100, 116)
      { lx: 108.0, lz: 123.2, hintY: U, pauseSec: 3.6, action: 'mine2', faceYaw: 0 }, // East casting mold (108, 125)
    ],
  },
  // 8. South-West Mess Hall & Hearth Quartermaster
  {
    id: 'dwarf-hearth-quartermaster',
    speed: 1.85,
    phaseOffsetSec: 6.2,
    scale: 1.15,
    waypoints: [
      { lx: -41.0, lz: 119.5, hintY: U, pauseSec: 4.5, action: 'idle', faceYaw: 0 },
      { lx: -34.0, lz: 111.5, hintY: U, pauseSec: 3.5, action: 'sit', faceYaw: Math.PI / 2 },
      { lx: -25.5, lz: 118.0, hintY: U, pauseSec: 3.8, action: 'idle', faceYaw: 0 },
      { lx: -30.0, lz: 104.0, hintY: U, pauseSec: 3.0, action: 'idle', faceYaw: -Math.PI / 2 },
    ],
  },
  // 9. Grand Descent Staircase Patrol
  {
    id: 'dwarf-grand-descent-patrol',
    speed: 2.35,
    phaseOffsetSec: 2.1,
    scale: 1.16,
    waypoints: [
      { lx: -2.2, lz: 121.0, hintY: U, pauseSec: 2.5, action: 'idle', faceYaw: 0 },
      { lx: -2.2, lz: 141.0, hintY: MINE_LEVEL_Y.descentLanding1, pauseSec: 2.5, action: 'idle', faceYaw: 0 },
      { lx: -2.2, lz: 168.0, hintY: MINE_LEVEL_Y.descentLanding2, pauseSec: 2.8, action: 'idle', faceYaw: 0 },
      { lx: -2.2, lz: 193.0, hintY: L, pauseSec: 3.5, action: 'idle', faceYaw: 0 },
      { lx: 2.2, lz: 168.0, hintY: MINE_LEVEL_Y.descentLanding2, pauseSec: 2.2, action: 'idle', faceYaw: Math.PI },
      { lx: 2.2, lz: 141.0, hintY: MINE_LEVEL_Y.descentLanding1, pauseSec: 2.2, action: 'idle', faceYaw: Math.PI },
    ],
  },
  // 10. Great Bridge Chasm Warden
  {
    id: 'dwarf-great-bridge-warden',
    speed: 2.2,
    phaseOffsetSec: 5.5,
    scale: 1.18,
    waypoints: [
      { lx: -2.0, lz: 205.0, hintY: L, pauseSec: 3.0, action: 'idle', faceYaw: 0 },
      { lx: -2.4, lz: 236.0, hintY: L, pauseSec: 3.2, action: 'idle', faceYaw: -Math.PI / 2 },
      { lx: 2.4, lz: 264.0, hintY: L, pauseSec: 3.2, action: 'idle', faceYaw: Math.PI / 2 },
      { lx: 2.0, lz: 295.0, hintY: L, pauseSec: 3.5, action: 'idle', faceYaw: Math.PI },
      { lx: 0.0, lz: 250.0, hintY: L, pauseSec: 2.8, action: 'attack2', faceYaw: -Math.PI / 2 },
    ],
  },
  // 11. Heroes' Cliff Path & Gold Vein Scout (mines the gold vein & crystal cluster at -105.5, 294)
  {
    id: 'dwarf-heroes-path-scout',
    speed: 2.3,
    phaseOffsetSec: 8.4,
    scale: 1.15,
    waypoints: [
      { lx: -72.0, lz: 196.0, hintY: L, pauseSec: 2.5, action: 'idle', faceYaw: -Math.PI / 2 },
      { lx: -101.0, lz: 203.0, hintY: L, pauseSec: 2.2, action: 'idle', faceYaw: 0 },
      { lx: -101.0, lz: 248.0, hintY: MINE_LEVEL_Y.heroesMidLanding, pauseSec: 2.0, action: 'idle', faceYaw: -Math.PI / 2 },
      { lx: -103.5, lz: 294.0, hintY: MINE_LEVEL_Y.kingBalcony, pauseSec: 4.5, action: 'mine1', faceYaw: -Math.PI / 2 }, // Gold vein (-105.5, 294)
      { lx: -101.0, lz: 248.0, hintY: MINE_LEVEL_Y.heroesMidLanding, pauseSec: 2.0, action: 'idle', faceYaw: Math.PI },
      { lx: -101.0, lz: 203.0, hintY: L, pauseSec: 2.0, action: 'idle', faceYaw: Math.PI / 2 },
    ],
  },
  // 12. Golden King's Balcony & Side Loop Stairs Royal Guard (patrols from King Balcony down king-loop-stairs into Golem Chamber)
  {
    id: 'dwarf-king-balcony-guard',
    speed: 2.0,
    phaseOffsetSec: 1.2,
    scale: 1.22,
    waypoints: [
      { lx: -5.5, lz: 298.5, hintY: MINE_LEVEL_Y.kingBalcony, pauseSec: 4.0, action: 'idle', faceYaw: 0 },
      { lx: 5.5, lz: 298.5, hintY: MINE_LEVEL_Y.kingBalcony, pauseSec: 4.0, action: 'attack2', faceYaw: 0 },
      { lx: 17.0, lz: 302.0, hintY: MINE_LEVEL_Y.kingBalcony, pauseSec: 1.5, action: 'idle', faceYaw: 0 },
      { lx: 17.0, lz: 336.5, hintY: L, pauseSec: 3.5, action: 'idle', faceYaw: -Math.PI / 2 }, // Inside Golem Chamber at foot of loop stairs
      { lx: 17.0, lz: 302.0, hintY: MINE_LEVEL_Y.kingBalcony, pauseSec: 1.5, action: 'idle', faceYaw: -Math.PI / 2 },
    ],
  },
  // 13. Golem Chamber Warden & Crystal Vein Miner (patrols up to the Golem area lz <= 342 and NEVER goes beyond it!)
  {
    id: 'dwarf-golem-chamber-warden',
    speed: 2.15,
    phaseOffsetSec: 4.0,
    scale: 1.18,
    waypoints: [
      { lx: 0.0, lz: 318.0, hintY: L, pauseSec: 3.0, action: 'idle', faceYaw: 0 },
      { lx: -27.4, lz: 326.0, hintY: L, pauseSec: 4.5, action: 'mine1', faceYaw: -Math.PI / 2 }, // West Golem Chamber blue mineral vein (-29.4, 326)
      { lx: -14.0, lz: 338.0, hintY: L, pauseSec: 3.2, action: 'idle', faceYaw: Math.PI / 2 }, // Observing the Stone Golem
      { lx: 14.0, lz: 338.0, hintY: L, pauseSec: 3.2, action: 'attack2', faceYaw: -Math.PI / 2 },
      { lx: 27.4, lz: 336.0, hintY: L, pauseSec: 4.5, action: 'mine2', faceYaw: Math.PI / 2 }, // East Golem Chamber gold mineral vein (29.4, 336)
    ],
  },
];
// #endregion

// ======================== PUBLIC BUILD ======================== \\
// #region Build Mine Dwarves AI
/**
 * Summary: Builds all AI-driven minecart trains (with Dwarf riders) and wandering/working AI Dwarves
 *          throughout the Ancient Mine, returning their per-frame update callback.
 */
export function buildMineDwarvesAi(ctx: ISetPieceContext): ISetPieceUpdate {
  const lanternBulbGeo = ctx.own(new THREE.OctahedronGeometry(0.11, 1));
  const lanternHaloGeo = ctx.own(new THREE.SphereGeometry(0.28, 8, 6));
  const lanternBulbMat = new THREE.MeshBasicMaterial({ color: 0xffb84a, fog: false });
  const lanternHaloMat = new THREE.MeshBasicMaterial({
    color: 0xff7a18,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  ctx.ownMaterial(lanternBulbMat, lanternHaloMat);

  const attachBeltLantern = (parent: THREE.Object3D, x: number, y: number, z: number): void => {
    const bulb = new THREE.Mesh(lanternBulbGeo, lanternBulbMat);
    bulb.position.set(x, y, z);
    parent.add(bulb);
    const halo = new THREE.Mesh(lanternHaloGeo, lanternHaloMat);
    halo.position.set(x, y, z);
    parent.add(halo);
  };

  // 1) BUILD AI MINECART TRAINS WITH DWARF RIDERS
  const trainUpdaters: Array<(elapsedTime: number, dt: number) => void> = [];
  for (const cfg of AI_MINECART_TRAINS) {
    trainUpdaters.push(buildSingleAiMinecartTrain(ctx, cfg, attachBeltLantern));
  }

  // 2) BUILD WANDERING & WORKING AI DWARVES ACROSS ALL LEVELS
  const dwarfUpdaters: Array<(elapsedTime: number, dt: number) => void> = [];
  for (const cfg of AI_WANDERING_DWARVES) {
    dwarfUpdaters.push(buildSingleWanderingDwarf(ctx, cfg, attachBeltLantern));
  }

  let lastTime: number | null = null;
  return (elapsedTime: number): void => {
    const rawDt = lastTime === null ? 1 / 60 : elapsedTime - lastTime;
    lastTime = elapsedTime;
    const dt = Math.max(0.001, Math.min(0.1, rawDt));

    for (let i = 0; i < trainUpdaters.length; i++) {
      trainUpdaters[i](elapsedTime, dt);
    }
    for (let i = 0; i < dwarfUpdaters.length; i++) {
      dwarfUpdaters[i](elapsedTime, dt);
    }
  };
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Minecart Train AI
function buildSingleAiMinecartTrain(
  ctx: ISetPieceContext,
  cfg: ITrackTrainConfig,
  attachLantern: (parent: THREE.Object3D, x: number, y: number, z: number) => void
): (elapsedTime: number, dt: number) => void {
  // Precompute segment lengths and elevations along the track polyline.
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
  const travelDuration = Math.max(1.0, totalLength / cfg.speed);
  const fullCycleSec = (travelDuration + cfg.stationPauseSec) * 2;

  const trainRoot = new THREE.Group();
  trainRoot.name = `ancient-mine-${cfg.id}`;
  ctx.group.add(trainRoot);

  // Cart mesh with ore load and front lantern.
  const cartGroup = new THREE.Group();
  cartGroup.rotation.order = 'YXZ';
  trainRoot.add(cartGroup);

  const cartGeo = ctx.own(buildPropGeometry('oreCart', cfg.oreTint));
  const cartMesh = new THREE.Mesh(cartGeo, ctx.materials.statue);
  cartGroup.add(cartMesh);
  attachLantern(cartGroup, 0, 1.18, 1.15);

  // Articulated DwarfWarrior conductor/rider.
  const dwarf: DwarfWarrior = createReadyDwarfWarrior({
    driveRootMotion: false,
    castShadow: false,
    receiveShadow: true,
  });
  dwarf.group.scale.setScalar(1.08);
  attachLantern(dwarf.group, 0.22, 0.72, 0.18);
  trainRoot.add(dwarf.group);

  let currentClip: DwarfWarriorState | null = null;
  const setClip = (clip: DwarfWarriorState): void => {
    if (currentClip !== clip) {
      currentClip = clip;
      dwarf.setState(clip, 0.18);
    }
  };
  setClip('idle');

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

  return (elapsedTime: number, dt: number): void => {
    const cycleT = ((elapsedTime + cfg.phaseOffsetSec) % fullCycleSec + fullCycleSec) % fullCycleSec;
    const halfCycle = travelDuration + cfg.stationPauseSec;

    let u = 0;
    let isRiding = true;
    let goingForward = true;
    let stationProgress = 0;

    if (cycleT < travelDuration) {
      // Riding forward from station 0 -> station 1 (smooth ease-in-out at ends)
      const raw = cycleT / travelDuration;
      u = raw * raw * (3 - 2 * raw);
      isRiding = true;
      goingForward = true;
    } else if (cycleT < halfCycle) {
      // Stopped at end station (u = 1): dwarf steps off to unload/load ore
      u = 1;
      isRiding = false;
      goingForward = true;
      stationProgress = (cycleT - travelDuration) / cfg.stationPauseSec;
    } else if (cycleT < halfCycle + travelDuration) {
      // Riding backward from station 1 -> station 0
      const raw = (cycleT - halfCycle) / travelDuration;
      u = 1 - raw * raw * (3 - 2 * raw);
      isRiding = true;
      goingForward = false;
    } else {
      // Stopped at start station (u = 0): dwarf steps off to load ore
      u = 0;
      isRiding = false;
      goingForward = false;
      stationProgress = (cycleT - (halfCycle + travelDuration)) / cfg.stationPauseSec;
    }

    const pose = sampleTrackAtU(u);
    cartGroup.position.set(pose.lx, pose.y, pose.lz);
    cartGroup.rotation.y = pose.yaw;
    cartGroup.rotation.x = pose.pitch;

    if (isRiding) {
      // Dwarf stands inside the ore cart bed facing the direction of travel!
      const riderYaw = goingForward ? pose.yaw : pose.yaw + Math.PI;
      dwarf.group.position.set(pose.lx, pose.y + 0.36, pose.lz);
      dwarf.group.rotation.y = riderYaw;
      setClip('idle');
    } else {
      // Dwarf steps out beside the cart and swings his pickaxe/hammer to load the cart.
      const perpX = Math.cos(pose.yaw) * cfg.dismountSideOffset;
      const perpZ = -Math.sin(pose.yaw) * cfg.dismountSideOffset;
      const standX = pose.lx + perpX;
      const standZ = pose.lz + perpZ;
      const standY = sampleAncientMineFloor(standX, standZ, pose.y)?.height ?? pose.y;
      dwarf.group.position.set(standX, standY, standZ);
      // Face toward the cart
      dwarf.group.rotation.y = Math.atan2(pose.lx - standX, pose.lz - standZ);
      setClip(stationProgress > 0.15 && stationProgress < 0.85 ? 'mine1' : 'idle');
    }

    dwarf.update(dt);
  };
}
// #endregion

// #region Wandering Dwarf AI
function buildSingleWanderingDwarf(
  ctx: ISetPieceContext,
  cfg: IWanderingDwarfConfig,
  attachLantern: (parent: THREE.Object3D, x: number, y: number, z: number) => void
): (elapsedTime: number, dt: number) => void {
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
    const walkSec = Math.max(0.8, dist / cfg.speed);
    const walkYaw = Math.atan2(b.lx - a.lx, b.lz - a.lz);
    legInfos.push({ a, b, walkSec, pauseSec: a.pauseSec, walkYaw });
    totalCycleSec += a.pauseSec + walkSec;
  }

  const dwarf: DwarfWarrior = createReadyDwarfWarrior({
    driveRootMotion: false,
    castShadow: false,
    receiveShadow: true,
  });
  dwarf.group.name = `ancient-mine-${cfg.id}`;
  dwarf.group.scale.setScalar(cfg.scale);
  attachLantern(dwarf.group, 0.22, 0.72, 0.18);
  ctx.group.add(dwarf.group);

  let currentClip: DwarfWarriorState | null = null;
  const setClip = (clip: DwarfWarriorState): void => {
    if (currentClip !== clip) {
      currentClip = clip;
      dwarf.setState(clip, 0.18);
    }
  };
  setClip('idle');

  return (elapsedTime: number, dt: number): void => {
    const cycleT = ((elapsedTime + cfg.phaseOffsetSec) % totalCycleSec + totalCycleSec) % totalCycleSec;
    let acc = 0;

    for (let i = 0; i < legInfos.length; i++) {
      const leg = legInfos[i];
      const segTotal = leg.pauseSec + leg.walkSec;
      if (cycleT <= acc + segTotal || i === legInfos.length - 1) {
        const localT = cycleT - acc;
        if (localT < leg.pauseSec) {
          // Stationary at waypoint `a`, performing station work/guard action
          const y = sampleAncientMineFloor(leg.a.lx, leg.a.lz, leg.a.hintY)?.height ?? leg.a.hintY;
          dwarf.group.position.set(leg.a.lx, y, leg.a.lz);
          dwarf.group.rotation.y = leg.a.faceYaw ?? leg.walkYaw;
          setClip(leg.a.action);
        } else {
          // Walking from waypoint `a` to waypoint `b`
          const u = Math.max(0, Math.min(1, (localT - leg.pauseSec) / leg.walkSec));
          const lx = leg.a.lx + (leg.b.lx - leg.a.lx) * u;
          const lz = leg.a.lz + (leg.b.lz - leg.a.lz) * u;
          const hintY = leg.a.hintY + (leg.b.hintY - leg.a.hintY) * u;
          const y = sampleAncientMineFloor(lx, lz, hintY)?.height ?? hintY;
          dwarf.group.position.set(lx, y, lz);
          dwarf.group.rotation.y = leg.walkYaw;
          setClip('walk');
        }
        break;
      }
      acc += segTotal;
    }

    dwarf.update(dt);
  };
}
// #endregion
