// ============================================================================
// MODULE: World / Systems / Camera Rig System
// DESIGN: Pure camera math, written into a reused pose object (zero per-frame allocation)
// SUMMARY: Smooths aim, zoom and crouch offsets, then computes the camera pose for the
//          bed (lying down), third-person over-the-shoulder and first-person views, the
//          field of view target, and the title-screen orbit. Does not touch three.js.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { IPlayerState } from '../domain/worldTypes';
import { PLAYER_EYE_HEIGHT } from '../domain/landmarks/coreLandmarks';
import { getRoofHeightAt, walkableHeightAt } from './terrainAndBiomeSystem';
import { computeFirstPersonSwordAttackPose } from './swordAttackAnimationSystem';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: Smoothed camera values carried from frame to frame. */
export interface ICameraRigState {
  smoothAimZoom: number;
  smoothRightClickZoom: number;
  smoothCrouchOffset: number;
}

/** Summary: Per-frame inputs of the camera rig. */
export interface ICameraRigFrameInput {
  readonly player: IPlayerState;
  readonly dt: number;
  readonly elapsedSeconds: number;
  readonly landingDip: number;
  readonly isSleepingInBed: boolean;
}

/**
 * Summary: Camera placement for one frame.
 * Design: 'euler' poses use pitch/yaw/roll in YXZ order; 'lookAt' poses aim at lookX/Y/Z.
 */
export interface ICameraPose {
  x: number;
  y: number;
  z: number;
  mode: 'euler' | 'lookAt';
  pitch: number;
  yaw: number;
  roll: number;
  lookX: number;
  lookY: number;
  lookZ: number;
}
// #endregion

// ======================== CONSTANTS ======================== \\
// #region Constants
/** FOV reduction while drawing the bow (degrees). */
const BOW_DRAW_FOV_DROP = 6.5;
/** FOV reduction while holding the right-click bow zoom (degrees). */
const RIGHT_CLICK_FOV_DROP = 11.5;
/** FOV reduction at full sword block (degrees). */
const BLOCK_FOV_DROP = 4.5;
/** FOV boost while a dash is active (degrees). */
const DASH_FOV_BOOST = 6.5;
/** FOV changes smaller than this are ignored, to avoid rebuilding the projection every frame. */
const FOV_EPSILON = 0.05;
// #endregion

// ======================== FACTORIES ======================== \\
// #region Factories
/** Summary: Creates the rig state at rest (no zoom, standing). */
export function createCameraRigState(): ICameraRigState {
  return { smoothAimZoom: 0, smoothRightClickZoom: 0, smoothCrouchOffset: 0 };
}

/** Summary: Creates a reusable pose object. */
export function createCameraPose(): ICameraPose {
  return { x: 0, y: 0, z: 0, mode: 'euler', pitch: 0, yaw: 0, roll: 0, lookX: 0, lookY: 0, lookZ: 0 };
}
// #endregion

// ======================== GAMEPLAY CAMERA ======================== \\
// #region Gameplay Camera
/**
 * Summary: Advances the smoothed offsets and writes this frame's gameplay camera pose.
 * Design: Mounted riding, swimming and crouching change eye height and head bob; the
 *         third-person camera never dips below walkable ground.
 */
export function stepCameraRig(rig: ICameraRigState, input: ICameraRigFrameInput, out: ICameraPose): void {
  const { player, dt, elapsedSeconds, landingDip } = input;
  const isMountedOnHorse = Boolean(player.mountedHorseId);
  const saddleHeightBonus = isMountedOnHorse ? 0.68 : 0;
  const bobScale = isMountedOnHorse ? 0.022 : player.isSwimming ? 0.045 : 0.055;
  const bobY = isMountedOnHorse
    ? Math.sin(player.bobPhase) * bobScale * player.bobAmount
    : Math.sin(player.bobPhase * 2) * bobScale * player.bobAmount;
  const bobRoll = Math.cos(player.bobPhase) * (isMountedOnHorse ? 0.0045 : 0.008) * player.bobAmount;
  const horsePitchSway = isMountedOnHorse ? Math.sin(player.bobPhase) * 0.011 * player.bobAmount : 0;

  const targetAimZoom = player.bowDrawn ? 1.0 : 0.0;
  rig.smoothAimZoom += (targetAimZoom - rig.smoothAimZoom) * (1 - Math.exp(-10 * dt));
  const targetRightZoom =
    !player.isSwimming && (player.equippedTool ?? 'bow') === 'bow' && Boolean(player.bowZoomHeld) ? 1.0 : 0.0;
  rig.smoothRightClickZoom += (targetRightZoom - rig.smoothRightClickZoom) * (1 - Math.exp(-12 * dt));
  const combinedThirdPersonZoom = Math.min(1.0, rig.smoothAimZoom * 0.7 + rig.smoothRightClickZoom * 0.8);

  const targetCrouchOffset =
    player.isCrouching && !isMountedOnHorse && !player.isSwimming && !player.isFlying ? -0.48 : 0.0;
  rig.smoothCrouchOffset += (targetCrouchOffset - rig.smoothCrouchOffset) * (1 - Math.exp(-12 * dt));

  if (input.isSleepingInBed) {
    // Lying on the back on the bed pillow (+0.22 m above the mattress), looking up at the ceiling.
    out.mode = 'euler';
    out.x = player.x - Math.sin(player.yaw) * 0.58;
    out.y = player.y + 0.22 + Math.sin(elapsedSeconds * 1.6) * 0.008;
    out.z = player.z - Math.cos(player.yaw) * 0.58;
    out.pitch = Math.max(1.05, Math.min(1.53, player.pitch));
    out.yaw = player.yaw + Math.PI;
    out.roll = Math.sin(elapsedSeconds * 0.9) * 0.012;
    return;
  }

  if (player.cameraPerspective === 'third_person') {
    writeThirdPersonPose(rig, player, bobY, landingDip, horsePitchSway, combinedThirdPersonZoom, out);
    return;
  }

  // Phase-synchronized first-person sword camera impulse (wind-up, strike, follow-through, recovery).
  const swingProgress = player.swordSwingProgress ?? 0;
  let combatPitch = 0;
  let combatYaw = 0;
  let combatRoll = 0;
  if (swingProgress > 0.0001) {
    const swordPose = computeFirstPersonSwordAttackPose({
      swingProgress,
      comboIndex: player.swordComboIndex ?? 0,
      isHeavy: Boolean(player.swordHeavyAttack),
      chargeProgress: player.swordChargeTime ?? 0,
      blockProgress: player.swordBlockProgress ?? 0,
      swayX: 0,
      swayY: 0,
      breathY: 0,
      sprintCarry: 0,
      impactKind: player.lastSwordHitPoint?.kind ?? 'none',
      impactAge: player.lastSwordHitPoint?.age ?? 99,
    });
    combatPitch = swordPose.cameraImpulse.pitchOffset;
    combatYaw = swordPose.cameraImpulse.yawOffset;
    combatRoll = swordPose.cameraImpulse.rollOffset;
  }
  out.mode = 'euler';
  out.x = player.x;
  out.y = player.y + PLAYER_EYE_HEIGHT + saddleHeightBonus + rig.smoothCrouchOffset + bobY - landingDip;
  out.z = player.z;
  out.pitch = player.pitch + combatPitch + horsePitchSway;
  out.yaw = player.yaw + combatYaw;
  out.roll = bobRoll + combatRoll;
}

/**
 * Summary: Over-the-right-shoulder camera that pulls closer while aiming.
 */
function writeThirdPersonPose(
  rig: ICameraRigState,
  player: IPlayerState,
  bobY: number,
  landingDip: number,
  horsePitchSway: number,
  zoom: number,
  out: ICameraPose
): void {
  const isMountedOnHorse = Boolean(player.mountedHorseId);
  const pivotY =
    player.y +
    (isMountedOnHorse ? 2.22 : player.isSwimming ? 1.25 : 1.54) +
    rig.smoothCrouchOffset * 0.72 +
    bobY -
    landingDip;
  const effPitch = player.pitch + horsePitchSway;
  const cosP = Math.cos(effPitch);
  const sinP = Math.sin(effPitch);
  const fwdX = -Math.sin(player.yaw) * cosP;
  const fwdY = sinP;
  const fwdZ = -Math.cos(player.yaw) * cosP;
  const rightX = Math.cos(player.yaw);
  const rightZ = -Math.sin(player.yaw);

  const baseDist = isMountedOnHorse ? 4.15 : 2.95;
  const aimDist = isMountedOnHorse ? 2.55 : 1.78;
  const camDist = baseDist + (aimDist - baseDist) * zoom;
  const shoulderSide = 0.44 - 0.86 * zoom;
  const shoulderUp = 0.28 - 0.12 * zoom;

  const camX = player.x - fwdX * camDist + rightX * shoulderSide;
  const camZ = player.z - fwdZ * camDist + rightZ * shoulderSide;
  const minCamFloorY = walkableHeightAt(camX, camZ, player.y).height + 0.45;
  const rawCamY = Math.max(minCamFloorY, pivotY - fwdY * camDist + shoulderUp);
  const overheadRoofY = getRoofHeightAt(camX, camZ);
  const camY =
    overheadRoofY !== null && player.y < overheadRoofY - 1.2
      ? Math.min(rawCamY, Math.max(minCamFloorY, overheadRoofY - 0.45))
      : rawCamY;

  const lookSideOffset = 0.16 * (1.0 - zoom);
  out.mode = 'lookAt';
  out.x = camX;
  out.y = camY;
  out.z = camZ;
  out.lookX = player.x + fwdX * 32.0 + rightX * lookSideOffset;
  out.lookY = pivotY + fwdY * 32.0;
  out.lookZ = player.z + fwdZ * 32.0 + rightZ * lookSideOffset;
}
// #endregion

// ======================== FIELD OF VIEW ======================== \\
// #region Field of View
/**
 * Summary: Target vertical FOV (degrees) for speed, riding, aiming, blocking and dashing.
 */
export function computeTargetFov(rig: ICameraRigState, player: IPlayerState): number {
  const isMountedOnHorse = Boolean(player.mountedHorseId);
  const horizSpeed = Math.hypot(player.vx, player.vz);
  const baseFov = player.isFlying
    ? 76
    : isMountedOnHorse && horizSpeed > 11.0
      ? 77.5
      : isMountedOnHorse && horizSpeed > 4.0
        ? 72.5
        : player.walkPace === 'fast' && horizSpeed > 5.2
          ? 73.5
          : player.walkPace === 'relaxed' && horizSpeed > 0.5
            ? 65.5
            : 68;
  const blockZoomDrop = (player.swordBlockProgress ?? 0) * BLOCK_FOV_DROP;
  const dashFovBoost = (player.dashTimer ?? 0) > 0 ? DASH_FOV_BOOST : 0.0;
  return (
    baseFov +
    dashFovBoost -
    rig.smoothAimZoom * BOW_DRAW_FOV_DROP -
    rig.smoothRightClickZoom * RIGHT_CLICK_FOV_DROP -
    blockZoomDrop
  );
}

/**
 * Summary: Eases the current FOV toward the target.
 * @returns The new FOV, or null when the change is too small to apply.
 */
export function easeFovToward(currentFov: number, targetFov: number, dt: number): number | null {
  if (Math.abs(currentFov - targetFov) <= FOV_EPSILON) return null;
  return currentFov + (targetFov - currentFov) * (1 - Math.exp(-9 * dt));
}
// #endregion

// ======================== TITLE SCREEN ORBIT ======================== \\
// #region Title Screen Orbit
/**
 * Summary: Slow orbit around the village used behind the title screen.
 */
export function writeTitleOrbitPose(elapsedSeconds: number, out: ICameraPose): void {
  const tourAngle = elapsedSeconds * 0.09 - 0.65;
  const tourRadius = 34;
  out.mode = 'lookAt';
  out.x = Math.sin(tourAngle) * tourRadius;
  out.y = 8.5 + Math.sin(elapsedSeconds * 0.25) * 1.4;
  out.z = Math.cos(tourAngle) * tourRadius + 6;
  out.lookX = 4;
  out.lookY = 1.8;
  out.lookZ = -4;
}
// #endregion
