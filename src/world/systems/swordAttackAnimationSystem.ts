// ============================================================================
// MODULE: World / Systems / Sword Attack Animation
// DESIGN: 5-phase first-person sword kinematics and camera recoil impulse (SRP)
// SUMMARY: Computes analytical first-person sword, wrist, forearm, off-hand poses,
//          whip acceleration curves, and synchronized strike windows across 3-hit combos.
// ============================================================================

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
export type SwordAttackPhase =
  | 'ready'
  | 'windup'
  | 'strike'
  | 'follow_through'
  | 'recovery';

export type SwordImpactKind = 'none' | 'target' | 'obstacle' | 'wall';

export interface Vec3Tuple {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface FirstPersonArmPose {
  readonly elbowX: number;
  readonly elbowY: number;
  readonly elbowZ: number;
  readonly wristX: number;
  readonly wristY: number;
  readonly wristZ: number;
  readonly handRx: number;
  readonly handRy: number;
  readonly handRz: number;
  readonly fingerCurl: number;
}

export interface FirstPersonSwordGripTransform {
  readonly posX: number;
  readonly posY: number;
  readonly posZ: number;
  readonly rotX: number;
  readonly rotY: number;
  readonly rotZ: number;
}

export interface FirstPersonSlashRibbonPose {
  readonly visible: boolean;
  readonly opacity: number;
  readonly posX: number;
  readonly posY: number;
  readonly posZ: number;
  readonly rotX: number;
  readonly rotY: number;
  readonly rotZ: number;
  readonly scale: number;
}

export interface FirstPersonSwordCameraImpulse {
  readonly pitchOffset: number;
  readonly yawOffset: number;
  readonly rollOffset: number;
}

export interface FirstPersonSwordAttackPoseResult {
  readonly phase: SwordAttackPhase;
  readonly phaseProgress: number;
  readonly swingProgress: number;
  readonly isInActiveStrikeWindow: boolean;
  readonly rightArm: FirstPersonArmPose;
  readonly leftArm: FirstPersonArmPose;
  readonly swordGrip: FirstPersonSwordGripTransform;
  readonly bladeDirCamera: Vec3Tuple;
  readonly edgeDirCamera: Vec3Tuple;
  readonly swordTipCamera: Vec3Tuple;
  readonly swordCrossguardCamera: Vec3Tuple;
  readonly slashRibbon: FirstPersonSlashRibbonPose;
  readonly cameraImpulse: FirstPersonSwordCameraImpulse;
}

export interface FirstPersonSwordPoseInput {
  readonly swingProgress: number;
  readonly comboIndex: number;
  readonly isHeavy: boolean;
  readonly chargeProgress: number;
  readonly blockProgress: number;
  readonly swayX: number;
  readonly swayY: number;
  readonly breathY: number;
  readonly sprintCarry: number;
  readonly impactKind?: SwordImpactKind;
  readonly impactAge?: number;
}

/** Summary: Phase boundary thresholds across normalized swingProgress p in [0, 1]. */
export const SWORD_PHASE_WINDUP_END = 0.24;
export const SWORD_PHASE_STRIKE_END = 0.50;
export const SWORD_PHASE_FOLLOW_THROUGH_END = 0.72;

/** Summary: Active combat hit-detection window within Phase C (Acceleration & Strike). */
export const SWORD_ACTIVE_STRIKE_WINDOW_START = 0.30;
export const SWORD_ACTIVE_STRIKE_WINDOW_END = 0.50;
export const SWORD_STRIKE_CONTACT_APEX = 0.34;

/** Summary: Internal mechanical constants for sword grip tilt and dimensions. */
const SWORD_GRIP_FORWARD_TILT = 0.24;
const COS_TILT = Math.cos(SWORD_GRIP_FORWARD_TILT);
const SIN_TILT = Math.sin(SWORD_GRIP_FORWARD_TILT);

export const LOCKED_SWORD_GRIP_TRANSFORM: FirstPersonSwordGripTransform = {
  posX: -0.078,
  posY: -0.018,
  posZ: -0.046,
  rotX: -0.34,
  rotY: -SWORD_GRIP_FORWARD_TILT,
  rotZ: Math.PI / 2,
};

const FOREARM_LENGTH = 0.34;
const BLADE_TIP_LENGTH = 0.86;
// #endregion

// ======================== MATH & CURVE UTILITIES ======================== \\
// #region Math & Curve Utilities
function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  const u = clamp(t, 0, 1);
  return u * u * (3 - 2 * u);
}

function smootherstep(t: number): number {
  const u = clamp(t, 0, 1);
  return u * u * u * (u * (u * 6 - 15) + 10);
}

/**
 * Summary: Non-linear whip acceleration curve for Phase C (Acceleration & Strike).
 */
function strikeWhipCurve(u: number): number {
  const t = clamp(u, 0, 1);
  const whip = 1 - Math.pow(1 - t, 2.35);
  const smooth = smoothstep(t);
  return smooth * 0.35 + whip * 0.65;
}

function normalize3(x: number, y: number, z: number): Vec3Tuple {
  const len = Math.hypot(x, y, z);
  if (len < 1e-7) return { x: 0, y: 0, z: -1 };
  return { x: x / len, y: y / len, z: z / len };
}

function lerpVec3(a: Vec3Tuple, b: Vec3Tuple, t: number): Vec3Tuple {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

function bezier3(p0: Vec3Tuple, p1: Vec3Tuple, p2: Vec3Tuple, t: number): Vec3Tuple {
  const inv = 1 - t;
  const c0 = inv * inv;
  const c1 = 2 * inv * t;
  const c2 = t * t;
  return {
    x: c0 * p0.x + c1 * p1.x + c2 * p2.x,
    y: c0 * p0.y + c1 * p1.y + c2 * p2.y,
    z: c0 * p0.z + c1 * p1.z + c2 * p2.z,
  };
}
// #endregion

// ======================== KINEMATIC SOLVERS ======================== \\
// #region Kinematic Solvers
function solveRightHandEulerFromBladeAndEdge(
  bladeRaw: Vec3Tuple,
  knuckleHintRaw: Vec3Tuple
): {
  handRx: number;
  handRy: number;
  handRz: number;
  bladeDir: Vec3Tuple;
  edgeDir: Vec3Tuple;
  knuckleDir: Vec3Tuple;
} {
  const B = normalize3(bladeRaw.x, bladeRaw.y, bladeRaw.z);
  const dotKB = knuckleHintRaw.x * B.x + knuckleHintRaw.y * B.y + knuckleHintRaw.z * B.z;
  const K = normalize3(
    knuckleHintRaw.x - dotKB * B.x,
    knuckleHintRaw.y - dotKB * B.y,
    knuckleHintRaw.z - dotKB * B.z
  );

  // Dorsal back of hand D = K x B
  const D: Vec3Tuple = {
    x: K.y * B.z - K.z * B.y,
    y: K.z * B.x - K.x * B.z,
    z: K.x * B.y - K.y * B.x,
  };

  // Columns of R_hand = [X_hand | Y_hand | Z_hand]
  const col0x = -COS_TILT * B.x + SIN_TILT * K.x;
  const col0y = -COS_TILT * B.y + SIN_TILT * K.y;
  const col1y = D.y;
  const col2x = -SIN_TILT * B.x - COS_TILT * K.x;
  const col2y = -SIN_TILT * B.y - COS_TILT * K.y;
  const col2z = -SIN_TILT * B.z - COS_TILT * K.z;

  const handRx = Math.asin(-clamp(col2y, -1, 1));
  let handRy: number;
  let handRz: number;
  if (Math.abs(col2y) < 0.99999) {
    handRy = Math.atan2(col2x, col2z);
    handRz = Math.atan2(col0y, col1y);
  } else {
    handRy = Math.atan2(-(-COS_TILT * B.z + SIN_TILT * K.z), col0x);
    handRz = 0;
  }

  return {
    handRx,
    handRy,
    handRz,
    bladeDir: B,
    edgeDir: K,
    knuckleDir: { x: -col2x, y: -col2y, z: -col2z },
  };
}

/**
 * Summary: Classifies normalized swingProgress into discrete attack phase and local progress.
 */
export function classifySwordAttackPhase(swingProgress: number): {
  phase: SwordAttackPhase;
  phaseProgress: number;
} {
  const p = clamp(swingProgress, 0, 1);
  if (p <= 0.0001) {
    return { phase: 'ready', phaseProgress: 0 };
  }
  if (p <= SWORD_PHASE_WINDUP_END) {
    return {
      phase: 'windup',
      phaseProgress: p / SWORD_PHASE_WINDUP_END,
    };
  }
  if (p <= SWORD_PHASE_STRIKE_END) {
    return {
      phase: 'strike',
      phaseProgress:
        (p - SWORD_PHASE_WINDUP_END) / (SWORD_PHASE_STRIKE_END - SWORD_PHASE_WINDUP_END),
    };
  }
  if (p <= SWORD_PHASE_FOLLOW_THROUGH_END) {
    return {
      phase: 'follow_through',
      phaseProgress:
        (p - SWORD_PHASE_STRIKE_END) /
        (SWORD_PHASE_FOLLOW_THROUGH_END - SWORD_PHASE_STRIKE_END),
    };
  }
  return {
    phase: 'recovery',
    phaseProgress:
      (p - SWORD_PHASE_FOLLOW_THROUGH_END) / (1.0 - SWORD_PHASE_FOLLOW_THROUGH_END),
  };
}
// #endregion

// ======================== COMBO TRAJECTORY KEYFRAMES ======================== \\
// #region Combo Trajectory Keyframes
interface AttackTrajectoryKeyframes {
  readyWrist: Vec3Tuple;
  readyBlade: Vec3Tuple;
  readyEdge: Vec3Tuple;
  readyShoulder: Vec3Tuple;

  chamberWrist: Vec3Tuple;
  chamberBlade: Vec3Tuple;
  chamberEdge: Vec3Tuple;
  chamberShoulder: Vec3Tuple;

  midStrikeWrist: Vec3Tuple;
  midStrikeBlade: Vec3Tuple;
  midStrikeEdge: Vec3Tuple;

  endStrikeWrist: Vec3Tuple;
  endStrikeBlade: Vec3Tuple;
  endStrikeEdge: Vec3Tuple;
  endStrikeShoulder: Vec3Tuple;

  followWrist: Vec3Tuple;
  followBlade: Vec3Tuple;
  followEdge: Vec3Tuple;
  followShoulder: Vec3Tuple;

  recoveryMidWrist: Vec3Tuple;
  recoveryMidBlade: Vec3Tuple;
  recoveryMidEdge: Vec3Tuple;
}

const READY_POSE = {
  wrist: { x: 0.25, y: -0.22, z: -0.45 },
  blade: { x: -0.22, y: 0.62, z: -0.75 },
  edge: { x: -0.46, y: -0.56, z: -0.69 },
  shoulder: { x: 0.42, y: -0.42, z: -0.21 },
};

const COMBO_0_KEYFRAMES: AttackTrajectoryKeyframes = {
  readyWrist: READY_POSE.wrist,
  readyBlade: READY_POSE.blade,
  readyEdge: READY_POSE.edge,
  readyShoulder: READY_POSE.shoulder,

  chamberWrist: { x: 0.33, y: -0.07, z: -0.40 },
  chamberBlade: { x: 0.30, y: 0.68, z: -0.67 },
  chamberEdge: { x: -0.52, y: -0.42, z: -0.74 },
  chamberShoulder: { x: 0.49, y: -0.27, z: -0.17 },

  midStrikeWrist: { x: 0.04, y: -0.13, z: -0.56 },
  midStrikeBlade: { x: -0.46, y: 0.24, z: -0.85 },
  midStrikeEdge: { x: -0.44, y: -0.58, z: -0.68 },

  endStrikeWrist: { x: -0.12, y: -0.15, z: -0.50 },
  endStrikeBlade: { x: -0.72, y: 0.14, z: -0.68 },
  endStrikeEdge: { x: -0.32, y: -0.68, z: -0.66 },
  endStrikeShoulder: { x: 0.34, y: -0.52, z: -0.22 },

  followWrist: { x: -0.16, y: -0.17, z: -0.48 },
  followBlade: { x: -0.76, y: 0.08, z: -0.64 },
  followEdge: { x: -0.28, y: -0.70, z: -0.66 },
  followShoulder: { x: 0.32, y: -0.54, z: -0.22 },

  recoveryMidWrist: { x: 0.06, y: -0.23, z: -0.47 },
  recoveryMidBlade: { x: -0.46, y: 0.36, z: -0.81 },
  recoveryMidEdge: { x: -0.38, y: -0.64, z: -0.67 },
};

const COMBO_1_KEYFRAMES: AttackTrajectoryKeyframes = {
  readyWrist: READY_POSE.wrist,
  readyBlade: READY_POSE.blade,
  readyEdge: READY_POSE.edge,
  readyShoulder: READY_POSE.shoulder,

  chamberWrist: { x: -0.16, y: -0.15, z: -0.45 },
  chamberBlade: { x: -0.68, y: 0.24, z: -0.69 },
  chamberEdge: { x: -0.32, y: -0.68, z: -0.66 },
  chamberShoulder: { x: 0.30, y: -0.50, z: -0.21 },

  midStrikeWrist: { x: 0.05, y: -0.13, z: -0.56 },
  midStrikeBlade: { x: 0.06, y: 0.36, z: -0.93 },
  midStrikeEdge: { x: -0.24, y: -0.72, z: -0.65 },

  endStrikeWrist: { x: 0.28, y: -0.15, z: -0.47 },
  endStrikeBlade: { x: 0.56, y: 0.32, z: -0.76 },
  endStrikeEdge: { x: -0.14, y: -0.76, z: -0.63 },
  endStrikeShoulder: { x: 0.48, y: -0.46, z: -0.22 },

  followWrist: { x: 0.32, y: -0.17, z: -0.45 },
  followBlade: { x: 0.62, y: 0.28, z: -0.73 },
  followEdge: { x: -0.12, y: -0.76, z: -0.64 },
  followShoulder: { x: 0.50, y: -0.48, z: -0.22 },

  recoveryMidWrist: { x: 0.29, y: -0.21, z: -0.45 },
  recoveryMidBlade: { x: 0.16, y: 0.48, z: -0.86 },
  recoveryMidEdge: { x: -0.32, y: -0.66, z: -0.68 },
};

const COMBO_2_HEAVY_KEYFRAMES: AttackTrajectoryKeyframes = {
  readyWrist: READY_POSE.wrist,
  readyBlade: READY_POSE.blade,
  readyEdge: READY_POSE.edge,
  readyShoulder: READY_POSE.shoulder,

  chamberWrist: { x: 0.20, y: -0.02, z: -0.40 },
  chamberBlade: { x: 0.10, y: 0.74, z: -0.66 },
  chamberEdge: { x: -0.48, y: -0.52, z: -0.71 },
  chamberShoulder: { x: 0.42, y: -0.36, z: -0.18 },

  midStrikeWrist: { x: 0.02, y: -0.12, z: -0.60 },
  midStrikeBlade: { x: -0.26, y: 0.28, z: -0.92 },
  midStrikeEdge: { x: -0.44, y: -0.62, z: -0.65 },

  endStrikeWrist: { x: -0.10, y: -0.16, z: -0.50 },
  endStrikeBlade: { x: -0.58, y: 0.14, z: -0.80 },
  endStrikeEdge: { x: -0.36, y: -0.66, z: -0.66 },
  endStrikeShoulder: { x: 0.34, y: -0.52, z: -0.22 },

  followWrist: { x: -0.14, y: -0.18, z: -0.48 },
  followBlade: { x: -0.64, y: 0.08, z: -0.76 },
  followEdge: { x: -0.34, y: -0.68, z: -0.65 },
  followShoulder: { x: 0.32, y: -0.54, z: -0.22 },

  recoveryMidWrist: { x: 0.06, y: -0.23, z: -0.47 },
  recoveryMidBlade: { x: -0.40, y: 0.36, z: -0.84 },
  recoveryMidEdge: { x: -0.42, y: -0.62, z: -0.66 },
};
// #endregion

// ======================== POSE EVALUATION & INTEGRATION ======================== \\
// #region Pose Evaluation & Integration
/**
 * Summary: Computes the complete 5-phase first-person sword, wrist, forearm, off-hand,
 *          and synchronized camera response pose.
 * Note: [HOT-PATH EXCEPTION] Evaluated continuously during attack swings in 60FPS render loop.
 */
export function computeFirstPersonSwordAttackPose(
  input: FirstPersonSwordPoseInput
): FirstPersonSwordAttackPoseResult {
  const p = clamp(input.swingProgress, 0, 1);
  const { phase, phaseProgress } = classifySwordAttackPhase(p);
  const isHeavyOrFinisher = input.isHeavy || input.comboIndex === 2;
  const kf = isHeavyOrFinisher
    ? COMBO_2_HEAVY_KEYFRAMES
    : input.comboIndex === 1
      ? COMBO_1_KEYFRAMES
      : COMBO_0_KEYFRAMES;

  const swayScale = p > 0.001 ? Math.max(0.15, 1 - Math.sin(p * Math.PI) * 0.85) : 1.0;
  const baseReadyWrist: { x: number; y: number; z: number } = {
    x:
      READY_POSE.wrist.x +
      input.swayX * swayScale -
      input.sprintCarry * 0.04,
    y:
      READY_POSE.wrist.y -
      input.swayY * swayScale +
      input.breathY * swayScale -
      input.sprintCarry * 0.03,
    z: READY_POSE.wrist.z,
  };
  const baseReadyBlade: { x: number; y: number; z: number } = {
    x: READY_POSE.blade.x - input.sprintCarry * 0.14,
    y: READY_POSE.blade.y - input.sprintCarry * 0.10,
    z: READY_POSE.blade.z,
  };
  const baseReadyEdge: { x: number; y: number; z: number } = { ...READY_POSE.edge };
  const baseReadyShoulder: Vec3Tuple = { ...READY_POSE.shoulder };

  // Blend in hold-charge anticipation when holding mouse button before swing starts
  const charge = p <= 0.001 ? clamp(input.chargeProgress, 0, 1) : 0;
  if (charge > 0.001) {
    const chEase = smoothstep(charge);
    baseReadyWrist.x = lerp(baseReadyWrist.x, COMBO_2_HEAVY_KEYFRAMES.chamberWrist.x, chEase);
    baseReadyWrist.y = lerp(baseReadyWrist.y, COMBO_2_HEAVY_KEYFRAMES.chamberWrist.y, chEase);
    baseReadyWrist.z = lerp(baseReadyWrist.z, COMBO_2_HEAVY_KEYFRAMES.chamberWrist.z, chEase);
    baseReadyBlade.x = lerp(baseReadyBlade.x, COMBO_2_HEAVY_KEYFRAMES.chamberBlade.x, chEase);
    baseReadyBlade.y = lerp(baseReadyBlade.y, COMBO_2_HEAVY_KEYFRAMES.chamberBlade.y, chEase);
    baseReadyBlade.z = lerp(baseReadyBlade.z, COMBO_2_HEAVY_KEYFRAMES.chamberBlade.z, chEase);
  }

  // Blend in horizontal parry/block stance if blocking while not swinging
  const blk = p <= 0.001 ? clamp(input.blockProgress, 0, 1) : 0;
  if (blk > 0.001) {
    const bEase = smoothstep(blk);
    baseReadyWrist.x = lerp(baseReadyWrist.x, 0.22 + input.swayX * 0.35, bEase);
    baseReadyWrist.y = lerp(
      baseReadyWrist.y,
      -0.10 - input.swayY * 0.35 + input.breathY * 0.4,
      bEase
    );
    baseReadyWrist.z = lerp(baseReadyWrist.z, -0.43, bEase);
    baseReadyBlade.x = lerp(baseReadyBlade.x, -0.68, bEase);
    baseReadyBlade.y = lerp(baseReadyBlade.y, 0.46, bEase);
    baseReadyBlade.z = lerp(baseReadyBlade.z, -0.56, bEase);
    baseReadyEdge.x = lerp(baseReadyEdge.x, -0.25, bEase);
    baseReadyEdge.y = lerp(baseReadyEdge.y, -0.42, bEase);
    baseReadyEdge.z = lerp(baseReadyEdge.z, -0.87, bEase);
  }

  let wristR: Vec3Tuple;
  let bladeVec: Vec3Tuple;
  let edgeVec: Vec3Tuple;
  let shoulderBias: Vec3Tuple;

  if (phase === 'ready') {
    wristR = baseReadyWrist;
    bladeVec = baseReadyBlade;
    edgeVec = baseReadyEdge;
    shoulderBias = baseReadyShoulder;
  } else if (phase === 'windup') {
    const u = smootherstep(phaseProgress);
    const windupMidWrist: Vec3Tuple = {
      x: (baseReadyWrist.x + kf.chamberWrist.x) * 0.5 + (input.comboIndex === 1 ? -0.03 : 0.03),
      y: (baseReadyWrist.y + kf.chamberWrist.y) * 0.5 + 0.025,
      z: (baseReadyWrist.z + kf.chamberWrist.z) * 0.5 + 0.015,
    };
    wristR = bezier3(baseReadyWrist, windupMidWrist, kf.chamberWrist, u);
    bladeVec = lerpVec3(baseReadyBlade, kf.chamberBlade, u);
    edgeVec = lerpVec3(baseReadyEdge, kf.chamberEdge, u);
    shoulderBias = lerpVec3(baseReadyShoulder, kf.chamberShoulder, u);
  } else if (phase === 'strike') {
    const u = strikeWhipCurve(phaseProgress);
    wristR = bezier3(kf.chamberWrist, kf.midStrikeWrist, kf.endStrikeWrist, u);
    bladeVec = bezier3(kf.chamberBlade, kf.midStrikeBlade, kf.endStrikeBlade, u);
    edgeVec = bezier3(kf.chamberEdge, kf.midStrikeEdge, kf.endStrikeEdge, u);
    shoulderBias = lerpVec3(kf.chamberShoulder, kf.endStrikeShoulder, u);
  } else if (phase === 'follow_through') {
    const u = 1 - Math.pow(1 - clamp(phaseProgress, 0, 1), 2.8);
    wristR = lerpVec3(kf.endStrikeWrist, kf.followWrist, u);
    bladeVec = lerpVec3(kf.endStrikeBlade, kf.followBlade, u);
    edgeVec = lerpVec3(kf.endStrikeEdge, kf.followEdge, u);
    shoulderBias = lerpVec3(kf.endStrikeShoulder, kf.followShoulder, u);
  } else {
    const u = smootherstep(phaseProgress);
    wristR = bezier3(kf.followWrist, kf.recoveryMidWrist, baseReadyWrist, u);
    bladeVec = bezier3(kf.followBlade, kf.recoveryMidBlade, baseReadyBlade, u);
    edgeVec = bezier3(kf.followEdge, kf.recoveryMidEdge, baseReadyEdge, u);
    shoulderBias = lerpVec3(kf.followShoulder, baseReadyShoulder, u);
  }

  // Apply physical impact deflection recoil when a solid surface or target was struck
  const impactKind = input.impactKind ?? 'none';
  const impactAge = input.impactAge ?? 99;
  let hitRecoilPulse = 0;
  if (
    impactKind !== 'none' &&
    impactAge >= 0 &&
    impactAge < 0.28 &&
    p > SWORD_ACTIVE_STRIKE_WINDOW_START
  ) {
    const decay = Math.exp(-impactAge * 14.0);
    hitRecoilPulse = Math.sin(Math.min(1, impactAge / 0.09) * Math.PI) * decay;
    const reboundSign = input.comboIndex === 1 ? -1 : 1;
    const surfaceMult = impactKind === 'obstacle' || impactKind === 'wall' ? 1.35 : 0.65;
    wristR = {
      x: wristR.x + reboundSign * 0.032 * hitRecoilPulse * surfaceMult,
      y: wristR.y + 0.022 * hitRecoilPulse * surfaceMult,
      z: wristR.z + 0.036 * hitRecoilPulse * surfaceMult,
    };
  }

  const solvedR = solveRightHandEulerFromBladeAndEdge(bladeVec, edgeVec);

  const forearmBackDir = normalize3(
    shoulderBias.x - wristR.x,
    Math.min(-0.18, shoulderBias.y - wristR.y),
    shoulderBias.z - wristR.z
  );
  const elbowR: Vec3Tuple = {
    x: wristR.x + forearmBackDir.x * FOREARM_LENGTH,
    y: wristR.y + forearmBackDir.y * FOREARM_LENGTH,
    z: wristR.z + forearmBackDir.z * FOREARM_LENGTH,
  };

  let twoHandBlend = 0;
  if (isHeavyOrFinisher && p > 0.001) {
    if (phase === 'windup') {
      twoHandBlend = smoothstep(phaseProgress);
    } else if (phase === 'strike' || phase === 'follow_through') {
      twoHandBlend = 1.0;
    } else if (phase === 'recovery') {
      twoHandBlend = 1.0 - smoothstep(phaseProgress);
    }
  } else if (charge > 0.001) {
    twoHandBlend = smoothstep(charge);
  }

  const counterBalanceEnv =
    !isHeavyOrFinisher && p > 0.001 ? Math.sin(p * Math.PI) : 0;
  let guardLeftWrist: Vec3Tuple = {
    x: -0.22 + input.swayX * 0.65 * swayScale - counterBalanceEnv * 0.13,
    y:
      -0.25 -
      input.swayY * 0.65 * swayScale +
      input.breathY * swayScale -
      counterBalanceEnv * 0.08,
    z: -0.44 + counterBalanceEnv * 0.06,
  };
  if (blk > 0.001) {
    const bEase = smoothstep(blk);
    guardLeftWrist = {
      x: lerp(guardLeftWrist.x, -0.14 + input.swayX * 0.35, bEase),
      y: lerp(guardLeftWrist.y, -0.08 - input.swayY * 0.35, bEase),
      z: lerp(guardLeftWrist.z, -0.42, bEase),
    };
  }

  const pommelGripWrist: Vec3Tuple = {
    x: wristR.x - solvedR.bladeDir.x * 0.11 - 0.02,
    y: wristR.y - solvedR.bladeDir.y * 0.11 - 0.03,
    z: wristR.z - solvedR.bladeDir.z * 0.11 + 0.02,
  };

  const wristL = lerpVec3(guardLeftWrist, pommelGripWrist, twoHandBlend);
  const leftShoulderRef: Vec3Tuple = { x: -0.44, y: -0.45, z: -0.20 };
  const leftForearmDir = normalize3(
    leftShoulderRef.x - wristL.x,
    leftShoulderRef.y - wristL.y,
    leftShoulderRef.z - wristL.z
  );
  const elbowL: Vec3Tuple = {
    x: wristL.x + leftForearmDir.x * FOREARM_LENGTH,
    y: wristL.y + leftForearmDir.y * FOREARM_LENGTH,
    z: wristL.z + leftForearmDir.z * FOREARM_LENGTH,
  };

  const leftHandRx = lerp(0.28, solvedR.handRx + 0.06, twoHandBlend);
  const leftHandRy = lerp(-0.30, solvedR.handRy - 0.22, twoHandBlend);
  const leftHandRz = lerp(-0.40 + blk * 0.55, solvedR.handRz - 0.14, twoHandBlend);
  const leftFingerCurl = lerp(0.45 + blk * 0.42, 0.92, twoHandBlend);

  const swordCrossguardCamera: Vec3Tuple = {
    x: wristR.x + solvedR.bladeDir.x * 0.08,
    y: wristR.y + solvedR.bladeDir.y * 0.08,
    z: wristR.z + solvedR.bladeDir.z * 0.08,
  };
  const swordTipCamera: Vec3Tuple = {
    x: swordCrossguardCamera.x + solvedR.bladeDir.x * BLADE_TIP_LENGTH,
    y: swordCrossguardCamera.y + solvedR.bladeDir.y * BLADE_TIP_LENGTH,
    z: swordCrossguardCamera.z + solvedR.bladeDir.z * BLADE_TIP_LENGTH,
  };

  const slashRibbon: FirstPersonSlashRibbonPose = {
    visible: false,
    opacity: 0,
    posX: 0,
    posY: 0,
    posZ: -0.74,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    scale: 1,
  };

  const dirSign = input.comboIndex === 1 ? -1 : 1;
  const heavyMult = isHeavyOrFinisher ? 1.35 : 1.0;
  let camPitch = 0;
  let camYaw = 0;
  let camRoll = 0;

  if (phase === 'windup') {
    const wEnv = Math.sin(phaseProgress * (Math.PI * 0.5));
    camPitch = 0.0055 * wEnv * heavyMult;
    camYaw = -0.0050 * dirSign * wEnv * heavyMult;
    camRoll = -0.0045 * dirSign * wEnv * heavyMult;
  } else if (phase === 'strike') {
    const sEnv = strikeWhipCurve(phaseProgress);
    camPitch = lerp(0.0055, -0.011, sEnv) * heavyMult;
    camYaw = lerp(-0.0050, 0.012, sEnv) * dirSign * heavyMult;
    camRoll = lerp(-0.0045, 0.014, sEnv) * dirSign * heavyMult;
  } else if (phase === 'follow_through') {
    const fEnv = smoothstep(phaseProgress);
    camPitch = lerp(-0.011, -0.006, fEnv) * heavyMult;
    camYaw = lerp(0.012, 0.007, fEnv) * dirSign * heavyMult;
    camRoll = lerp(0.014, 0.008, fEnv) * dirSign * heavyMult;
  } else if (phase === 'recovery') {
    const rEnv = 1 - smootherstep(phaseProgress);
    camPitch = -0.006 * rEnv * heavyMult;
    camYaw = 0.007 * dirSign * rEnv * heavyMult;
    camRoll = 0.008 * dirSign * rEnv * heavyMult;
  }

  if (hitRecoilPulse > 0.001) {
    const joltMult = impactKind === 'obstacle' || impactKind === 'wall' ? 1.25 : 0.85;
    camPitch += 0.0075 * hitRecoilPulse * joltMult;
    camYaw -= 0.0060 * dirSign * hitRecoilPulse * joltMult;
    camRoll -= 0.0085 * dirSign * hitRecoilPulse * joltMult;
  }

  const isInActiveStrikeWindow =
    p >= SWORD_ACTIVE_STRIKE_WINDOW_START && p <= SWORD_ACTIVE_STRIKE_WINDOW_END;

  return {
    phase,
    phaseProgress,
    swingProgress: p,
    isInActiveStrikeWindow,
    rightArm: {
      elbowX: elbowR.x,
      elbowY: elbowR.y,
      elbowZ: elbowR.z,
      wristX: wristR.x,
      wristY: wristR.y,
      wristZ: wristR.z,
      handRx: solvedR.handRx,
      handRy: solvedR.handRy,
      handRz: solvedR.handRz,
      fingerCurl: 0.92,
    },
    leftArm: {
      elbowX: elbowL.x,
      elbowY: elbowL.y,
      elbowZ: elbowL.z,
      wristX: wristL.x,
      wristY: wristL.y,
      wristZ: wristL.z,
      handRx: leftHandRx,
      handRy: leftHandRy,
      handRz: leftHandRz,
      fingerCurl: leftFingerCurl,
    },
    swordGrip: LOCKED_SWORD_GRIP_TRANSFORM,
    bladeDirCamera: solvedR.bladeDir,
    edgeDirCamera: solvedR.edgeDir,
    swordTipCamera,
    swordCrossguardCamera,
    slashRibbon,
    cameraImpulse: {
      pitchOffset: camPitch,
      yawOffset: camYaw,
      rollOffset: camRoll,
    },
  };
}
// #endregion
