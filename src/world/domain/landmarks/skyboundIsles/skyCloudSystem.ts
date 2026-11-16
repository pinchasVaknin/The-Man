// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles
// DESIGN: One shared state machine drives every walkable cloud; a per-kind config table
//         (stability, collapse, recovery, sink depth) is the only thing that differs.
//         Load accumulates while the player stands on a cloud (slower while walking) and
//         only drains while the cloud is empty, so tiny steps can never reset the timer.
// SUMMARY: Runtime state, per-frame stepping and the walkable surface query of the sky
//          clouds. Knows nothing about THREE or the player controller; the physics step
//          feeds it the player position and reads the surface back.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import { SKY_CLOUDS } from './skyCloudRoutes';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: The five cloud variants of the archipelago. */
export type SkyCloudKind = 'soft' | 'charged' | 'storm' | 'bounce' | 'phantom';

/** Summary: Lifecycle of a cloud, from fully stable to gone and back. */
export type SkyCloudState =
  | 'stable'
  | 'occupied'
  | 'compressing'
  | 'sinking'
  | 'collapsing'
  | 'gone'
  | 'regenerating';

/** Summary: Static definition of one walkable cloud (placed by the route builder). */
export interface ISkyCloudDef {
  readonly id: string;
  readonly routeId: string;
  readonly kind: SkyCloudKind;
  readonly x: number;
  /** Walkable top of the cloud when it is fully stable, in metres. */
  readonly y: number;
  readonly z: number;
  readonly radius: number;
  /** Seconds added to the shared clock, so storm gusts and phantom cycles do not all sync. */
  readonly phase: number;
  /** Upward launch speed for `bounce` clouds, in m/s. */
  readonly bounceVy?: number;
  /** Unit direction of a `storm` cloud's gust push. */
  readonly gustDirX?: number;
  readonly gustDirZ?: number;
}

/** Summary: Tuning of one cloud kind. Durations are in seconds, distances in metres. */
export interface ISkyCloudKindConfig {
  /** Seconds of standing still before the cloud collapses. Infinity = never collapses. */
  readonly stabilitySec: number;
  readonly collapseSec: number;
  readonly goneSec: number;
  readonly regenerateSec: number;
  readonly maxSinkM: number;
  /** Load gained per second while the occupant walks (1.0 while standing still). */
  readonly movingLoadRate: number;
}

/** Summary: Mutable per-frame state of one cloud, read by physics and by the renderer. */
export interface ISkyCloudRuntime {
  readonly def: ISkyCloudDef;
  state: SkyCloudState;
  /** Accumulated weight-time in seconds; collapse happens at `stabilitySec`. */
  load: number;
  /** Seconds spent in the current collapsing / gone / regenerating state. */
  stateTimer: number;
  sinkOffset: number;
  /** 0 = invisible, 1 = fully dense. */
  opacity: number;
  /** 0 = round, 1 = fully squashed; drives the visual flattening. */
  compression: number;
  playerOnCloud: boolean;
  /** Phantom clouds only: 0 = hidden, 1 = fully present. */
  presence: number;
  gustWarning: boolean;
  gustActive: boolean;
}
// #endregion

// #region Tuning
/**
 * Summary: Per-kind tuning.
 * Design: A soft cloud lasts 2.5 s standing still. Walking across a 6.4 m cloud at 5 m/s
 *         takes about 1.3 s and adds only ~0.7 s of load, so normal walking crosses it
 *         without sprinting.
 */
export const SKY_CLOUD_KIND_CONFIG: Record<SkyCloudKind, ISkyCloudKindConfig> = {
  soft: { stabilitySec: 2.5, collapseSec: 0.7, goneSec: 4.0, regenerateSec: 1.2, maxSinkM: 1.4, movingLoadRate: 0.55 },
  charged: { stabilitySec: 4.0, collapseSec: 0.8, goneSec: 4.0, regenerateSec: 1.2, maxSinkM: 1.2, movingLoadRate: 0.5 },
  storm: { stabilitySec: 1.6, collapseSec: 0.5, goneSec: 3.5, regenerateSec: 1.0, maxSinkM: 1.6, movingLoadRate: 0.65 },
  bounce: { stabilitySec: Infinity, collapseSec: 0, goneSec: 0, regenerateSec: 0, maxSinkM: 0.5, movingLoadRate: 0 },
  phantom: { stabilitySec: 3.0, collapseSec: 0.6, goneSec: 3.0, regenerateSec: 1.0, maxSinkM: 1.2, movingLoadRate: 0.55 },
};

/** Below this horizontal speed (m/s) the occupant counts as standing still. */
const STILL_SPEED_MPS = 1.0;
/** Load drained per second while nobody stands on the cloud. */
const EMPTY_LOAD_DRAIN_PER_SEC = 0.45;
/** Vertical distance (m) between feet and cloud top that still counts as standing on it. */
const OCCUPANCY_TOLERANCE_M = 0.6;
/** Small dip (m) as soon as someone steps on the cloud. */
const OCCUPIED_DIP_M = 0.12;
/** Load fraction where the cloud stops being "occupied" and starts compressing / sinking. */
const COMPRESSING_FROM = 0.25;
const SINKING_FROM = 0.6;
/** Downward speed (m/s) of a collapsing cloud. */
const COLLAPSE_DROP_MPS = 3.0;
/** A collapsing cloud stays solid for this fraction of its collapse, then the player drops. */
const COLLAPSE_SOLID_FRACTION = 0.5;
/** Feet may be at most this far (m) below a cloud top and still land on it. */
const LANDING_TOLERANCE_M = 1.5;
/** Raised centre of the cloud top (m) compared with its rim. */
const CROWN_M = 0.15;

/** Storm gust cycle, in seconds. */
const STORM_GUST_PERIOD_SEC = 5.0;
const STORM_GUST_WARNING_SEC = 1.2;
const STORM_GUST_ACTIVE_SEC = 0.7;
/** Push speed of a storm gust, in m/s. */
export const STORM_GUST_SPEED_MPS = 3.0;

/** Phantom presence cycle, in seconds: present, fading out, hidden, fading in. */
const PHANTOM_PRESENT_SEC = 4.0;
const PHANTOM_FADE_SEC = 1.0;
const PHANTOM_HIDDEN_SEC = 2.5;
/** Phantom clouds are solid only above this presence. */
const PHANTOM_SOLID_PRESENCE = 0.5;

/** Launch speed (m/s) for bounce clouds that do not set their own. */
export const DEFAULT_BOUNCE_VY = 14.0;
// #endregion

// ======================== MODULE STATE ======================== \\
// #region Runtime State
const cloudRuntimes: ISkyCloudRuntime[] = SKY_CLOUDS.map((def) => createCloudRuntime(def));
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Runtime Access
/** Summary: Live state of every cloud, in `SKY_CLOUDS` order. */
export function getSkyCloudRuntimes(): ReadonlyArray<ISkyCloudRuntime> {
  return cloudRuntimes;
}

/** Summary: Puts every cloud back to fully stable (used by tests and world reset). */
export function resetSkyClouds(): void {
  for (let i = 0; i < cloudRuntimes.length; i++) {
    cloudRuntimes[i] = createCloudRuntime(SKY_CLOUDS[i]);
  }
}

/**
 * Summary: Creates a fresh, fully stable runtime for one cloud.
 * @param def The cloud definition.
 */
export function createCloudRuntime(def: ISkyCloudDef): ISkyCloudRuntime {
  return {
    def,
    state: 'stable',
    load: 0,
    stateTimer: 0,
    sinkOffset: 0,
    opacity: 1,
    compression: 0,
    playerOnCloud: false,
    presence: 1,
    gustWarning: false,
    gustActive: false,
  };
}
// #endregion

// #region Stepping
/**
 * Summary: Advances every cloud by one frame given where the player is.
 * @param dt Frame time in seconds (clamped to 0.1).
 * @param elapsedSec Shared clock in seconds, used for storm gusts and phantom cycles.
 * @param playerX Player feet position X.
 * @param playerY Player feet position Y.
 * @param playerZ Player feet position Z.
 * @param playerHorizSpeed Player horizontal speed in m/s.
 */
export function stepSkyClouds(
  dt: number,
  elapsedSec: number,
  playerX: number,
  playerY: number,
  playerZ: number,
  playerHorizSpeed: number
): void {
  const safeDt = Math.max(0, Math.min(0.1, dt));
  for (let i = 0; i < cloudRuntimes.length; i++) {
    const rt = cloudRuntimes[i];
    const occupied =
      isCloudSolid(rt) &&
      isInsideFootprint(rt.def, playerX, playerZ) &&
      Math.abs(playerY - cloudTopY(rt, playerX, playerZ)) <= OCCUPANCY_TOLERANCE_M;
    advanceCloud(rt, safeDt, elapsedSec, occupied, playerHorizSpeed);
  }
}

/**
 * Summary: Advances one cloud's state machine by `dt` seconds.
 * Design: Exposed for unit tests so the state machine can be driven without the module's
 *         shared runtime array.
 * @param rt The cloud runtime to mutate.
 * @param dt Frame time in seconds.
 * @param elapsedSec Shared clock in seconds.
 * @param occupied Whether the player is standing on this cloud this frame.
 * @param occupantSpeed Player horizontal speed in m/s.
 */
export function advanceCloud(
  rt: ISkyCloudRuntime,
  dt: number,
  elapsedSec: number,
  occupied: boolean,
  occupantSpeed: number
): void {
  const cfg = SKY_CLOUD_KIND_CONFIG[rt.def.kind];
  updateStormGust(rt, elapsedSec);
  updatePhantomPresence(rt, elapsedSec);
  rt.playerOnCloud = occupied;

  if (rt.def.kind === 'bounce') {
    rt.state = occupied ? 'occupied' : 'stable';
    rt.sinkOffset += ((occupied ? cfg.maxSinkM : 0) - rt.sinkOffset) * Math.min(1, dt * 12);
    rt.compression = rt.sinkOffset / cfg.maxSinkM;
    rt.opacity = 1;
    return;
  }

  switch (rt.state) {
    case 'collapsing':
      rt.stateTimer += dt;
      rt.sinkOffset += COLLAPSE_DROP_MPS * dt;
      rt.opacity = Math.max(0, 0.55 * (1 - rt.stateTimer / cfg.collapseSec));
      rt.compression = 1;
      if (rt.stateTimer >= cfg.collapseSec) {
        enterState(rt, 'gone');
        rt.opacity = 0;
      }
      return;
    case 'gone':
      rt.stateTimer += dt;
      if (rt.stateTimer >= cfg.goneSec) {
        enterState(rt, 'regenerating');
        rt.load = 0;
        rt.sinkOffset = 0;
        rt.compression = 0;
      }
      return;
    case 'regenerating':
      rt.stateTimer += dt;
      rt.opacity = Math.min(1, rt.stateTimer / cfg.regenerateSec);
      if (rt.stateTimer >= cfg.regenerateSec) {
        enterState(rt, 'stable');
        rt.opacity = 1;
      }
      return;
    default:
      advanceLoadedCloud(rt, cfg, dt, occupied, occupantSpeed);
  }
}
// #endregion

// #region Surface Query
/**
 * Summary: The highest solid cloud top under (x, z) that the feet can stand on.
 * @param x World X.
 * @param z World Z.
 * @param currentY Feet height; when given, cloud tops more than 1.5 m above it are ignored
 *                 so a player below a cloud is never snapped up onto it.
 * @returns The walkable height and the cloud, or `null` when no cloud is there.
 */
export function skyCloudSurfaceAt(
  x: number,
  z: number,
  currentY?: number
): { y: number; cloud: ISkyCloudRuntime } | null {
  let best: { y: number; cloud: ISkyCloudRuntime } | null = null;
  for (let i = 0; i < cloudRuntimes.length; i++) {
    const rt = cloudRuntimes[i];
    if (!isCloudSolid(rt) || !isInsideFootprint(rt.def, x, z)) continue;
    const top = cloudTopY(rt, x, z);
    if (currentY !== undefined && currentY < top - LANDING_TOLERANCE_M) continue;
    if (best === null || top > best.y) best = { y: top, cloud: rt };
  }
  return best;
}

/**
 * Summary: Whether the player can stand on this cloud right now.
 * @param rt The cloud runtime.
 */
export function isCloudSolid(rt: ISkyCloudRuntime): boolean {
  if (rt.state === 'gone' || rt.state === 'regenerating') return false;
  if (rt.def.kind === 'phantom' && rt.presence < PHANTOM_SOLID_PRESENCE) return false;
  if (rt.state === 'collapsing') {
    const cfg = SKY_CLOUD_KIND_CONFIG[rt.def.kind];
    return rt.stateTimer < cfg.collapseSec * COLLAPSE_SOLID_FRACTION;
  }
  return true;
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region State Machine Helpers
function advanceLoadedCloud(
  rt: ISkyCloudRuntime,
  cfg: ISkyCloudKindConfig,
  dt: number,
  occupied: boolean,
  occupantSpeed: number
): void {
  if (occupied) {
    rt.load += dt * (occupantSpeed < STILL_SPEED_MPS ? 1 : cfg.movingLoadRate);
  } else {
    rt.load = Math.max(0, rt.load - dt * EMPTY_LOAD_DRAIN_PER_SEC);
  }

  const fraction = rt.load / cfg.stabilitySec;
  if (fraction >= 1) {
    enterState(rt, 'collapsing');
    return;
  }

  if (!occupied && rt.load <= 0) rt.state = 'stable';
  else if (fraction < COMPRESSING_FROM) rt.state = occupied ? 'occupied' : 'stable';
  else if (fraction < SINKING_FROM) rt.state = 'compressing';
  else rt.state = 'sinking';

  const sinkFraction = smoothstep(COMPRESSING_FROM, 1, fraction);
  const targetSink = (occupied ? OCCUPIED_DIP_M : 0) + cfg.maxSinkM * sinkFraction;
  rt.sinkOffset += (targetSink - rt.sinkOffset) * Math.min(1, dt * 6);
  rt.compression = sinkFraction;
  rt.opacity = 1 - 0.45 * sinkFraction;
}

function enterState(rt: ISkyCloudRuntime, state: SkyCloudState): void {
  rt.state = state;
  rt.stateTimer = 0;
}

function updateStormGust(rt: ISkyCloudRuntime, elapsedSec: number): void {
  if (rt.def.kind !== 'storm') return;
  const cycle = positiveModulo(elapsedSec + rt.def.phase, STORM_GUST_PERIOD_SEC);
  const activeFrom = STORM_GUST_PERIOD_SEC - STORM_GUST_ACTIVE_SEC;
  rt.gustActive = cycle >= activeFrom;
  rt.gustWarning = !rt.gustActive && cycle >= activeFrom - STORM_GUST_WARNING_SEC;
}

function updatePhantomPresence(rt: ISkyCloudRuntime, elapsedSec: number): void {
  if (rt.def.kind !== 'phantom') return;
  const period = PHANTOM_PRESENT_SEC + PHANTOM_HIDDEN_SEC + PHANTOM_FADE_SEC * 2;
  const t = positiveModulo(elapsedSec + rt.def.phase, period);
  if (t < PHANTOM_PRESENT_SEC) rt.presence = 1;
  else if (t < PHANTOM_PRESENT_SEC + PHANTOM_FADE_SEC) rt.presence = 1 - (t - PHANTOM_PRESENT_SEC) / PHANTOM_FADE_SEC;
  else if (t < PHANTOM_PRESENT_SEC + PHANTOM_FADE_SEC + PHANTOM_HIDDEN_SEC) rt.presence = 0;
  else rt.presence = (t - PHANTOM_PRESENT_SEC - PHANTOM_FADE_SEC - PHANTOM_HIDDEN_SEC) / PHANTOM_FADE_SEC;
}
// #endregion

// #region Geometry Helpers
function isInsideFootprint(def: ISkyCloudDef, x: number, z: number): boolean {
  const dx = x - def.x;
  const dz = z - def.z;
  return dx * dx + dz * dz <= def.radius * def.radius;
}

function cloudTopY(rt: ISkyCloudRuntime, x: number, z: number): number {
  const dx = (x - rt.def.x) / rt.def.radius;
  const dz = (z - rt.def.z) / rt.def.radius;
  const crown = Math.max(0, 1 - (dx * dx + dz * dz)) * CROWN_M;
  return rt.def.y - rt.sinkOffset + crown;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}
// #endregion
