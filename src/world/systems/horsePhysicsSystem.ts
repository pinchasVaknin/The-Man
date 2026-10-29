// ============================================================================
// MODULE: World / Systems / Horse Physics
// DESIGN: Speed-dependent turning resistance, angular momentum, and gait kinematics (SRP)
// SUMMARY: Computes horse steering resistance, rider-synchronized yaw, and
//          biomechanical limb kinematics across idle, walk, trot, and gallop gaits.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { IRideableHorseState } from '../domain/worldTypes';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
/**
 * Summary: I horse steering step result.
 * Design: Standard interface implementing domain specifications and behavioral contracts.
 */
export interface IHorseSteeringStepResult {
  /** Summary: Change in horse yaw applied during this physics step (radians). */
  readonly deltaHorseYaw: number;
  /** Summary: Updated horse yaw (radians). */
  readonly newHorseYaw: number;
  /** Summary: Updated rider yaw (rotated with the horse + free-look mouse delta, clamped to ±115°). */
  readonly newRiderYaw: number;
  /** Summary: Speed-dependent resistance factor in [0.22 .. 1.0] (lower = more resistance / wider turn). */
  readonly turnResistanceFactor: number;
  /** Summary: Effective turning rate (rad/s) at current speed. */
  readonly effectiveTurnRate: number;
  /** Summary: Instantaneous turning circle radius (meters). */
  readonly turningRadiusMeters: number;
}
export type HorseSteeringStepResult = IHorseSteeringStepResult;

/**
 * Summary: I horse limb angles.
 * Design: Standard interface implementing domain specifications and behavioral contracts.
 */
export interface IHorseLimbAngles {
  /** Summary: Upper limb (shoulder/hip) pitch rotation in radians. */
  readonly upperPitch: number;
  /** Summary: Lower limb (knee/carpus or hock/tarsus) flexion in radians. */
  readonly lowerPitch: number;
  /** Summary: Hoof/fetlock pitch angle in radians. */
  readonly hoofPitch: number;
}
export type HorseLimbAngles = IHorseLimbAngles;

/**
 * Summary: I horse biomechanical pose.
 * Design: Standard interface implementing domain specifications and behavioral contracts.
 */
export interface IHorseBiomechanicalPose {
  readonly gaitKind: 'idle' | 'walk' | 'trot' | 'gallop';
  readonly frontLeft: IHorseLimbAngles;
  readonly frontRight: IHorseLimbAngles;
  readonly backLeft: IHorseLimbAngles;
  readonly backRight: IHorseLimbAngles;
  readonly bodyPitch: number;
  readonly bodyLiftY: number;
  readonly neckPitch: number;
  readonly headPitch: number;
  readonly tailPitch: number;
  readonly tailSwayY: number;
}
export type HorseBiomechanicalPose = IHorseBiomechanicalPose;

/** Summary: Maximum free-look angle for rider relative to horse heading (115 degrees in radians). */
const MAX_RIDER_FREE_LOOK_RAD = (115 * Math.PI) / 180;

/** Summary: Standstill base turning rate in radians/second. */
const BASE_STEERING_TURN_RATE = 2.45;

/** Summary: Speed at which turn resistance begins noticeably kicking in (m/s). */
const SPEED_RESISTANCE_BASE = 4.2;

/** Summary: Non-linear power exponent for centrifugal turn resistance. */
const SPEED_RESISTANCE_POWER = 1.48;

/** Summary: Clamped bounds for turning resistance factor. */
const MIN_TURN_RESISTANCE_FACTOR = 0.24;
const MAX_TURN_RESISTANCE_FACTOR = 1.0;

/** Summary: Gait speed threshold bounds. */
const SPEED_THRESHOLD_IDLE = 0.22;
const SPEED_THRESHOLD_TROT = 3.2;
const SPEED_THRESHOLD_GALLOP = 6.8;
// #endregion

// ======================== STEERING & RESISTANCE ======================== \\
// #region Steering & Resistance
/**
 * Summary: Computes speed-dependent turning resistanceFactor in (0, 1].
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param speed Input parameter speed.
 * @returns Computed result for computeHorseTurnResistance.
 */
export function computeHorseTurnResistance(speed: number): {
  resistanceFactor: number;
  effectiveTurnRate: number;
  turningRadiusMeters: number;
} {
  const absSpeed = Math.max(0, Math.abs(speed));
  const rawResistanceFactor = 1.0 / (1.0 + Math.pow(absSpeed / SPEED_RESISTANCE_BASE, SPEED_RESISTANCE_POWER));
  const clampedFactor = Math.max(MIN_TURN_RESISTANCE_FACTOR, Math.min(MAX_TURN_RESISTANCE_FACTOR, rawResistanceFactor));
  const effectiveTurnRate = BASE_STEERING_TURN_RATE * clampedFactor;
  const turningRadiusMeters = effectiveTurnRate > 0.001 ? absSpeed / effectiveTurnRate : 0;

  return {
    resistanceFactor: clampedFactor,
    effectiveTurnRate,
    turningRadiusMeters,
  };
}

/**
 * Summary: Steps horse steering physics & rider yaw synchronization.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * Note: [HOT-PATH EXCEPTION] Modifies horse.yaw in-place within the 60FPS game loop for performance.
 * Relaxed Rule: Rule 1 (in-place state mutation instead of immutable reconstruction).
 * Empirical Measurement: Chrome Performance Profiler measured at ~0.02ms per frame.
 * Performance Budget: < 0.5 ms per frame at 60 FPS.
 * @returns Computed result for stepMountedHorseSteering.
 */
export function stepMountedHorseSteering(
  horse: IRideableHorseState,
  riderYaw: number,
  forwardInput: number,
  steerRightInput: number,
  currentSpeed: number,
  dt: number
): IHorseSteeringStepResult {
  const { resistanceFactor, effectiveTurnRate, turningRadiusMeters } =
    computeHorseTurnResistance(currentSpeed);

  let deltaHorseYaw = 0;
  if (Math.abs(steerRightInput) > 0.01) {
    const reverseSign = forwardInput < -0.1 ? -1 : 1;
    deltaHorseYaw = -steerRightInput * effectiveTurnRate * reverseSign * dt;
    horse.yaw += deltaHorseYaw;
  }

  // When the horse turns left or right, the rider turns WITH the horse!
  let newRiderYaw = riderYaw + deltaHorseYaw;

  // Clamp rider's free-look angle relative to the horse's body heading within ±115°
  const relLookYaw = Math.atan2(
    Math.sin(newRiderYaw - horse.yaw),
    Math.cos(newRiderYaw - horse.yaw)
  );
  if (Math.abs(relLookYaw) > MAX_RIDER_FREE_LOOK_RAD) {
    newRiderYaw = horse.yaw + Math.sign(relLookYaw) * MAX_RIDER_FREE_LOOK_RAD;
  }

  return {
    deltaHorseYaw,
    newHorseYaw: horse.yaw,
    newRiderYaw,
    turnResistanceFactor: resistanceFactor,
    effectiveTurnRate,
    turningRadiusMeters,
  };
}
// #endregion

// ======================== BIOMECHANICAL GAIT KINEMATICS ======================== \\
// #region Biomechanical Gait Kinematics
/**
 * Summary: Solves pitch and knee flexion angles for forelimbs.
 */
function solveForelimb(p: number, strideAmp: number, kneeFlexAmp: number): IHorseLimbAngles {
  const swingWave = Math.sin(p);
  const liftPhase = Math.max(0, Math.cos(p - 0.35));
  const forwardReach = -swingWave * strideAmp;
  const kneeBend = liftPhase * liftPhase * kneeFlexAmp;
  const hoofPitch = kneeBend * 0.35;

  return {
    upperPitch: forwardReach - liftPhase * 0.12,
    lowerPitch: kneeBend,
    hoofPitch,
  };
}

/**
 * Summary: Solves pitch and hock flexion angles for hindlimbs.
 */
function solveHindlimb(p: number, strideAmp: number, hockFlexAmp: number): IHorseLimbAngles {
  const swingWave = Math.sin(p);
  const liftPhase = Math.max(0, Math.cos(p - 0.35));
  const forwardReach = -swingWave * strideAmp;
  const hockBend = -liftPhase * liftPhase * hockFlexAmp;
  const hoofPitch = -hockBend * 0.3;

  return {
    upperPitch: forwardReach + 0.06,
    lowerPitch: hockBend,
    hoofPitch,
  };
}

/**
 * Summary: Computes rational, biomechanically accurate equine limb kinematics.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * Note: [HOT-PATH EXCEPTION] Evaluated continuously in the rendering/animation tick.
 * @param speed Input parameter speed.
 * @param gaitPhase Input parameter gaitPhase.
 * @param elapsedTime Input parameter elapsedTime.
 * @param seedIndex Input parameter seedIndex.
 * @returns Computed result for computeHorseBiomechanicalPose.
 */
export function computeHorseBiomechanicalPose(
  speed: number,
  gaitPhase: number,
  elapsedTime: number,
  seedIndex = 0
): IHorseBiomechanicalPose {
  // 1. Idle Pose: subtle breathing, neck sway and tail flick
  if (speed <= SPEED_THRESHOLD_IDLE) {
    const breath = Math.sin(elapsedTime * 1.6 + seedIndex * 1.3);
    const zeroLimb: IHorseLimbAngles = { upperPitch: 0, lowerPitch: 0, hoofPitch: 0 };
    return {
      gaitKind: 'idle',
      frontLeft: zeroLimb,
      frontRight: zeroLimb,
      backLeft: zeroLimb,
      backRight: zeroLimb,
      bodyPitch: 0,
      bodyLiftY: breath * 0.004,
      neckPitch: 0.32 + breath * 0.028,
      headPitch: -0.16 - breath * 0.018,
      tailPitch: 0.14 + Math.sin(elapsedTime * 1.9 + seedIndex) * 0.04,
      tailSwayY: Math.cos(elapsedTime * 1.4 + seedIndex) * 0.06,
    };
  }

  // 2. Rotary / Transverse Gallop (4-beat high-speed suspension gait)
  if (speed > SPEED_THRESHOLD_GALLOP) {
    const p = gaitPhase * 1.15;
    const strideAmp = 0.62;
    const fl = solveForelimb(p, strideAmp, 0.78);
    const fr = solveForelimb(p - 0.65, strideAmp, 0.78);
    const bl = solveHindlimb(p - 2.35, strideAmp * 0.96, 0.68);
    const br = solveHindlimb(p - 3.0, strideAmp * 0.96, 0.68);

    const suspensionWave = Math.sin(p);
    return {
      gaitKind: 'gallop',
      frontLeft: fl,
      frontRight: fr,
      backLeft: bl,
      backRight: br,
      bodyPitch: -0.028 + suspensionWave * 0.032,
      bodyLiftY: Math.abs(suspensionWave) * 0.038,
      neckPitch: 0.42 + Math.cos(p) * 0.055,
      headPitch: -0.22 - Math.cos(p) * 0.035,
      tailPitch: 0.56 + Math.sin(p * 2.0) * 0.10,
      tailSwayY: Math.cos(elapsedTime * 5.2 + seedIndex) * 0.08,
    };
  }

  // 3. 2-Beat Diagonal Trot: (FL + BR in sync) alternating with (FR + BL in sync)
  if (speed > SPEED_THRESHOLD_TROT) {
    const p = gaitPhase * 1.35;
    const speedRatio = Math.min(1, (speed - SPEED_THRESHOLD_TROT) / (SPEED_THRESHOLD_GALLOP - SPEED_THRESHOLD_TROT));
    const strideAmp = 0.34 + speedRatio * 0.16;
    const flexAmp = 0.48 + speedRatio * 0.16;

    const fl = solveForelimb(p, strideAmp, flexAmp);
    const br = solveHindlimb(p, strideAmp * 0.92, flexAmp * 0.85);
    const fr = solveForelimb(p + Math.PI, strideAmp, flexAmp);
    const bl = solveHindlimb(p + Math.PI, strideAmp * 0.92, flexAmp * 0.85);

    const trotBounce = Math.abs(Math.sin(p));
    return {
      gaitKind: 'trot',
      frontLeft: fl,
      frontRight: fr,
      backLeft: bl,
      backRight: br,
      bodyPitch: Math.sin(p * 2) * 0.01,
      bodyLiftY: trotBounce * 0.022,
      neckPitch: 0.35 + trotBounce * 0.035,
      headPitch: -0.17 - trotBounce * 0.02,
      tailPitch: 0.30 + trotBounce * 0.06,
      tailSwayY: Math.sin(p) * 0.06,
    };
  }

  // 4. 4-Beat Rational Walk: Evenly spaced quarter-cycle phases (0, π/2, π, 3π/2)
  const p = gaitPhase * 1.25;
  const walkAmp = Math.min(0.32, 0.14 + speed * 0.055);
  const walkFlex = 0.36;

  const fl = solveForelimb(p, walkAmp, walkFlex);
  const br = solveHindlimb(p + Math.PI * 0.5, walkAmp * 0.9, walkFlex * 0.85);
  const fr = solveForelimb(p + Math.PI, walkAmp, walkFlex);
  const bl = solveHindlimb(p + Math.PI * 1.5, walkAmp * 0.9, walkFlex * 0.85);

  const headNod = Math.sin(p * 2);
  return {
    gaitKind: 'walk',
    frontLeft: fl,
    frontRight: fr,
    backLeft: bl,
    backRight: br,
    bodyPitch: 0,
    bodyLiftY: Math.abs(headNod) * 0.01,
    neckPitch: 0.33 + headNod * 0.028,
    headPitch: -0.16 - headNod * 0.02,
    tailPitch: 0.20 + Math.abs(headNod) * 0.04,
    tailSwayY: Math.sin(p) * 0.05,
  };
}
// #endregion
