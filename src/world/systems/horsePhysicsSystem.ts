// ============================================================================
// HORSE PHYSICS & BIOMECHANICAL GAIT KINEMATICS SYSTEM
// Pure, decoupled physics for speed-dependent turning resistance, angular
// momentum, rider-synced rotation, and 4-beat/2-beat/3-beat equine leg gaits.
// ============================================================================

import { RideableHorseState } from '../domain/worldTypes';

export interface HorseSteeringStepResult {
  /** Change in horse yaw applied during this physics step (radians) */
  deltaHorseYaw: number;
  /** Updated horse yaw (radians) */
  newHorseYaw: number;
  /** Updated rider yaw (rotated with the horse + free-look mouse delta, clamped to ±115°) */
  newRiderYaw: number;
  /** Speed-dependent resistance factor in [0.22 .. 1.0] (lower = more resistance / wider turn) */
  turnResistanceFactor: number;
  /** Effective turning rate (rad/s) at current speed */
  effectiveTurnRate: number;
  /** Instantaneous turning circle radius (meters) */
  turningRadiusMeters: number;
}

export interface HorseLimbAngles {
  /** Upper limb (shoulder/hip) pitch rotation in radians */
  upperPitch: number;
  /** Lower limb (knee/carpus or hock/tarsus) flexion in radians */
  lowerPitch: number;
  /** Hoof/fetlock pitch angle in radians */
  hoofPitch: number;
}

export interface HorseBiomechanicalPose {
  gaitKind: 'idle' | 'walk' | 'trot' | 'gallop';
  frontLeft: HorseLimbAngles;
  frontRight: HorseLimbAngles;
  backLeft: HorseLimbAngles;
  backRight: HorseLimbAngles;
  bodyPitch: number;
  bodyLiftY: number;
  neckPitch: number;
  headPitch: number;
  tailPitch: number;
  tailSwayY: number;
}

const MAX_RIDER_FREE_LOOK_RAD = (115 * Math.PI) / 180;

/**
 * Computes speed-dependent turning resistanceFactor in (0, 1].
 * As the horse runs faster, momentum resists sharp turns, forcing wider, smoother arcs.
 */
export function computeHorseTurnResistance(speed: number): {
  resistanceFactor: number;
  effectiveTurnRate: number;
  turningRadiusMeters: number;
} {
  const absSpeed = Math.max(0, Math.abs(speed));
  const baseTurnRate = 2.45; // rad/s at standstill / slow walk
  // Nonlinear centrifugal/momentum resistance: higher speed -> stronger resistance -> wider turn radius
  const resistanceFactor = 1.0 / (1.0 + Math.pow(absSpeed / 4.2, 1.48));
  const clampedFactor = Math.max(0.24, Math.min(1.0, resistanceFactor));
  const effectiveTurnRate = baseTurnRate * clampedFactor;
  const turningRadiusMeters =
    effectiveTurnRate > 0.001 ? absSpeed / effectiveTurnRate : 0;

  return {
    resistanceFactor: clampedFactor,
    effectiveTurnRate,
    turningRadiusMeters,
  };
}

/**
 * Steps horse steering physics & rider yaw synchronization:
 * 1. Turning the horse left/right (`steerRightInput`) faces speed-dependent resistance
 *    (faster gallop = wider turning radius) AND rotates the rider (`riderYaw`) by the exact same `deltaHorseYaw`.
 * 2. Moving the rider's mouse (`riderYaw` already includes `lookYawDelta`) does NOT rotate the horse (`horse.yaw`).
 */
export function stepMountedHorseSteering(
  horse: RideableHorseState,
  riderYaw: number,
  forwardInput: number,
  steerRightInput: number,
  currentSpeed: number,
  dt: number
): HorseSteeringStepResult {
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

/**
 * Computes rational, biomechanically accurate equine limb kinematics for:
 * - Idle breathing & weight shift
 * - 4-beat lateral walk (FL -> BL -> FR -> BR)
 * - 2-beat diagonal trot (FL+BR together, FR+BL together)
 * - 3/4-beat suspension gallop with natural knee (carpus) & hock (tarsus) flexion during swing phase
 */
export function computeHorseBiomechanicalPose(
  speed: number,
  gaitPhase: number,
  elapsedTime: number,
  seedIndex = 0
): HorseBiomechanicalPose {
  if (speed <= 0.22) {
    const breath = Math.sin(elapsedTime * 1.6 + seedIndex * 1.3);
    const zeroLimb: HorseLimbAngles = { upperPitch: 0, lowerPitch: 0, hoofPitch: 0 };
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

  // Helper to compute a single limb's rational swing/stance cycle from its phase angle `p`
  // During stance (sin(p) < 0): leg sweeps smoothly from front to back with straight knee/hock.
  // During swing/recovery (sin(p) > 0): leg lifts forward while knee/hock flexes smoothly.
  const solveForelimb = (p: number, strideAmp: number, kneeFlexAmp: number): HorseLimbAngles => {
    const swingWave = Math.sin(p);
    const liftPhase = Math.max(0, Math.cos(p - 0.35)); // Peaks as leg lifts off the ground
    const upperPitch = swingWave * strideAmp - liftPhase * 0.14;
    // Forelimb knee (carpus) bends backward (+X rotation in our rig or -X depending on axis: in proceduralModels +X swings back, -X swings forward)
    // Note: in our horse rig, horse faces +Z locally, so negative rotation.x swings leg FORWARD (+Z), positive rotation.x swings leg BACKWARD (-Z)
    const forwardReach = -swingWave * strideAmp;
    const kneeBend = liftPhase * liftPhase * kneeFlexAmp; // Bends backward (+X) during forward lift
    const hoofPitch = kneeBend * 0.35;
    return {
      upperPitch: forwardReach - liftPhase * 0.12,
      lowerPitch: kneeBend,
      hoofPitch,
    };
  };

  const solveHindlimb = (p: number, strideAmp: number, hockFlexAmp: number): HorseLimbAngles => {
    const swingWave = Math.sin(p);
    const liftPhase = Math.max(0, Math.cos(p - 0.35));
    const forwardReach = -swingWave * strideAmp;
    // Hindlimb hock flexes during recovery lift
    const hockBend = -liftPhase * liftPhase * hockFlexAmp;
    const hoofPitch = -hockBend * 0.3;
    return {
      upperPitch: forwardReach + 0.06,
      lowerPitch: hockBend,
      hoofPitch,
    };
  };

  if (speed > 6.8) {
    // Rotary / Transverse Gallop (4-beat high-speed suspension gait)
    // Sequence: BL (0) -> BR (0.7) -> FL (2.1) -> FR (2.8)
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

  if (speed > 3.2) {
    // 2-Beat Diagonal Trot: (FL + BR in sync) alternating with (FR + BL in sync)
    const p = gaitPhase * 1.35;
    const speedRatio = Math.min(1, (speed - 3.2) / 3.6);
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

  // 4-Beat Rational Walk: Evenly spaced quarter-cycle phases (0, π/2, π, 3π/2)
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
