// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles (test support)
// DESIGN: A small stand-in for the on-foot player controller: same gravity, jump speed,
//         walking speed and air control as playerPhysicsSystem.ts, the same wind application
//         (`applySkyWind`), bounce pads, wind-flower triggering and height-aware solid boxes.
//         Used only by the traversal specs, so routes are proven by "walking" them.
// SUMMARY: Simulated player for Skybound Isles traversal tests. Not used by the game.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import { pointInsideSolidBuildingBox } from '../../collisionWorld';
import { SKY_HARBOR_SOLID_BOXES, skyBouncePadAt } from './skyHarborLayout';
import { applySkyWind, sampleSkyWindAt, stepSkyWindFlowers } from './skyWindSystem';
import { skyboundSurfaceAt, type ISkySurfaceHit } from './skyboundSurface';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Player Limits
/**
 * Summary: Player movement numbers copied from playerPhysicsSystem.ts (unmounted, on foot).
 * Design: Copied rather than imported because they are private constants of the physics hot path.
 */
export const SIM_PLAYER = {
  jumpVy: 6.25,
  gravity: 14.8,
  walkSpeed: 5.0,
  groundAccel: 15.0,
  airAccel: 5.5,
  radius: 0.44,
  maxStepUp: 0.56,
  fallDamageFromMps: 12.0,
} as const;

const FRAME_SEC = 1 / 60;
/** Boxes whose top is within this much (m) of the feet are stepped over, as in the game. */
const BOX_STEP_CLEARANCE_M = 0.28;
// #endregion

// #region Types
/** Summary: State of the simulated player. */
export interface ISimBody {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  vy: number;
  grounded: boolean;
  surface: ISkySurfaceHit | null;
  /** Fastest landing speed seen, in m/s. */
  hardestLandingMps: number;
}

/** Summary: Each frame: where to walk (null = no input) and whether to jump. */
export type SimPilot = (body: ISimBody, t: number) => { towardX: number; towardZ: number; jump?: boolean } | null;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Simulation
/** Summary: A pilot that never touches the controls. */
export const STAND_STILL: SimPilot = () => null;

/**
 * Summary: Steps the simulated player until it has stood still on the ground for 1 s
 *          (outside any wind), falls into the sea, or `maxSec` runs out.
 * @param start Feet position to start from (standing).
 * @param pilot Controls for each frame.
 * @param maxSec Time limit in seconds.
 * @returns The final body.
 */
export function simulateSkyPlayer(start: { x: number; y: number; z: number }, pilot: SimPilot, maxSec: number): ISimBody {
  const body: ISimBody = {
    ...start,
    vx: 0,
    vz: 0,
    vy: 0,
    grounded: true,
    surface: skyboundSurfaceAt(start.x, start.z, start.y),
    hardestLandingMps: 0,
  };
  let restSec = 0;
  for (let t = 0; t < maxSec; t += FRAME_SEC) {
    stepSkyWindFlowers(FRAME_SEC, body.x, body.y, body.z);
    const cmd = pilot(body, t);
    let targetVx = 0;
    let targetVz = 0;
    if (cmd) {
      const dx = cmd.towardX - body.x;
      const dz = cmd.towardZ - body.z;
      const len = Math.hypot(dx, dz);
      if (len > 0.3) {
        targetVx = (dx / len) * SIM_PLAYER.walkSpeed;
        targetVz = (dz / len) * SIM_PLAYER.walkSpeed;
      }
      if (cmd.jump && body.grounded) {
        body.vy = SIM_PLAYER.jumpVy;
        body.grounded = false;
      }
    }
    const damp = 1 - Math.exp(-(body.grounded ? SIM_PLAYER.groundAccel : SIM_PLAYER.airAccel) * FRAME_SEC);
    body.vx += (targetVx - body.vx) * damp;
    body.vz += (targetVz - body.vz) * damp;
    body.vy -= SIM_PLAYER.gravity * FRAME_SEC;

    const pad = skyBouncePadAt(body.x, body.y, body.z);
    if (pad && body.vy <= 1.5) {
      body.vy = pad.bounceVy;
      body.grounded = false;
    }
    const wind = sampleSkyWindAt(body.x, body.y, body.z, t);
    if (wind) applySkyWind(body, wind, FRAME_SEC, SIM_PLAYER.gravity);

    moveHorizontally(body);
    const prevY = body.y;
    body.y += body.vy * FRAME_SEC;
    const floor = skyboundSurfaceAt(body.x, body.z, prevY);
    if (floor && body.y <= floor.y && body.vy <= 0) {
      if (!body.grounded) body.hardestLandingMps = Math.max(body.hardestLandingMps, -body.vy);
      body.y = floor.y;
      body.vy = 0;
      body.grounded = true;
      body.surface = floor;
    } else if (floor && body.grounded && body.vy <= 0 && body.y - floor.y <= 0.85) {
      body.y = floor.y;
      body.vy = 0;
      body.surface = floor;
    } else {
      body.grounded = false;
      body.surface = null;
    }
    if (body.y < 0) return body;
    restSec = body.grounded && Math.hypot(body.vx, body.vz) < 0.2 && !wind ? restSec + FRAME_SEC : 0;
    if (restSec > 1) return body;
  }
  return body;
}

/**
 * Summary: Whether a standing player at (x, y, z) would be pushed by any Sky Harbor solid box.
 * @param x Feet X.
 * @param y Feet Y.
 * @param z Feet Z.
 * @returns The id of the first blocking box, or `null`.
 */
export function blockingSkyHarborBox(x: number, y: number, z: number): string | null {
  for (const box of SKY_HARBOR_SOLID_BOXES) {
    if (y + 1.55 < box.minY || y >= box.maxY - BOX_STEP_CLEARANCE_M) continue;
    if (pointInsideSolidBuildingBox(x, z, SIM_PLAYER.radius, box)) return box.id;
  }
  return null;
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Movement
/** Moves one frame horizontally; a box or a too-high step cancels that axis, like the game's slide. */
function moveHorizontally(body: ISimBody): void {
  const nx = body.x + body.vx * FRAME_SEC;
  const nz = body.z + body.vz * FRAME_SEC;
  if (canStandAt(body, nx, nz)) {
    body.x = nx;
    body.z = nz;
  } else if (canStandAt(body, nx, body.z)) {
    body.x = nx;
  } else if (canStandAt(body, body.x, nz)) {
    body.z = nz;
  }
}

function canStandAt(body: ISimBody, x: number, z: number): boolean {
  if (blockingSkyHarborBox(x, body.y, z) !== null) return false;
  const floor = skyboundSurfaceAt(x, z, body.y);
  return floor === null || floor.y - body.y <= SIM_PLAYER.maxStepUp;
}
// #endregion
