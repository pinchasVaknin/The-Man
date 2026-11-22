// ============================================================================
// MODULE: World / Systems / Sword Attack Animation
// DESIGN: Realistic 2-bone biomechanical first-person sword kinematics (SRP)
// SUMMARY: Drives 3 realistic sword attacks (Combo 0: V-chamber diagonal cut,
//          Combo 1: right-chambered horizontal sweep, Combo 2: forward thrust)
//          with torso shoulder twist, 2-bone shoulder-elbow-wrist IK,
//          quaternion slerp, and active off-hand counterbalance.
// ============================================================================

import * as THREE from 'three';

// ======================== KEYFRAME CONFIG ======================== \\
// #region Keyframe Config
export type Vec3Tuple = readonly [number, number, number];

export interface ISwordPoseKeyframe {
  /** Right wrist (handle pivot) target in camera space (+X right, +Y up, -Z forward). */
  readonly pos: Vec3Tuple;
  /** Desired blade direction in camera space (converted once to quaternion; never Euler-lerped). */
  readonly bladeAim: Vec3Tuple;
  /** Edge direction hint in camera space for roll alignment. */
  readonly edgeAim: Vec3Tuple;
  /** Right shoulder origin in camera space (shifts with torso coil & lunge). */
  readonly shoulder: Vec3Tuple;
  /** Elbow pole bias direction for 2-bone arm IK (controls V-bend vs flare). */
  readonly elbowPole: Vec3Tuple;
  /** Left counterbalance wrist target in camera space. */
  readonly leftPos: Vec3Tuple;
  /** Left shoulder origin in camera space (counter-rotates opposite right shoulder). */
  readonly leftShoulder: Vec3Tuple;
  /** Left hand orientation Euler [rx, ry, rz] (converted once to quaternion). */
  readonly leftEuler: Vec3Tuple;
  /** Left finger curl (0 open guard .. 0.92 braced). */
  readonly leftFingerCurl: number;
}

export interface IComboSwingKeyframeSet {
  readonly windup: ISwordPoseKeyframe;
  readonly impact: ISwordPoseKeyframe;
  readonly endStrike: ISwordPoseKeyframe;
  readonly followThrough: ISwordPoseKeyframe;
}

/**
 * Biomechanical keyframe configuration in local camera space (+X right, +Y up, -Z forward).
 * Upper arm (0.31m) + forearm (0.34m) articulate cleanly from shoulder to wrist;
 * sword pivot is at the right hand grip.
 */
export const SWORD_SWING_KEYFRAMES = {
  /** Toggle to draw the blade-tip debug trail in first-person camera space. */
  debugDrawTipTrail: false,

  anatomy: {
    upperArmLength: 0.31,
    forearmLength: 0.34,
    maxReach: 0.642,
    minReach: 0.08,
    swordMeshTipYLocal: 0.87,
  },

  timing: {
    windupEnd: 0.22,
    strikeEnd: 0.52,
    followThroughEnd: 0.68,
    activeStrikeWindowStart: 0.30,
    activeStrikeWindowEnd: 0.52,
    impactFractionInStrike: 0.58,
    impactProgress: 0.38,
    impactHoldSeconds: 0.05,
    strikeEaseInExponent: 1.38,
    strikeExitExponent: 1.25,
  },

  ready: {
    pos: [0.25, -0.21, -0.45] as Vec3Tuple,
    bladeAim: [-0.22, 0.62, -0.75] as Vec3Tuple,
    edgeAim: [-0.46, -0.56, -0.69] as Vec3Tuple,
    shoulder: [0.26, -0.28, -0.04] as Vec3Tuple,
    elbowPole: [0.55, -0.82, 0.15] as Vec3Tuple,
    leftPos: [-0.22, -0.23, -0.44] as Vec3Tuple,
    leftShoulder: [-0.26, -0.28, -0.04] as Vec3Tuple,
    leftEuler: [0.28, -0.30, -0.40] as Vec3Tuple,
    leftFingerCurl: 0.48,
  } satisfies ISwordPoseKeyframe,

  block: {
    pos: [0.22, -0.10, -0.43] as Vec3Tuple,
    bladeAim: [-0.68, 0.46, -0.56] as Vec3Tuple,
    edgeAim: [-0.25, -0.42, -0.87] as Vec3Tuple,
    shoulder: [0.24, -0.28, -0.06] as Vec3Tuple,
    elbowPole: [0.58, -0.80, 0.10] as Vec3Tuple,
    leftPos: [-0.12, -0.08, -0.42] as Vec3Tuple,
    leftShoulder: [-0.24, -0.28, -0.06] as Vec3Tuple,
    leftEuler: [0.22, 0.15, 0.22] as Vec3Tuple,
    leftFingerCurl: 0.85,
  } satisfies ISwordPoseKeyframe,

  combos: {
    // 0: V-chamber windup (elbow folds into a V, tip pulled high outside upper-right)
    //    then full arm unfolds diagonally down-left slicing through crosshair.
    0: {
      windup: {
        pos: [0.33, 0.02, -0.37],
        bladeAim: [0.46, 0.72, -0.52],
        edgeAim: [-0.42, -0.30, -0.86],
        shoulder: [0.28, -0.28, -0.04],
        elbowPole: [0.65, -0.85, -0.15],
        leftPos: [-0.14, -0.14, -0.52],
        leftShoulder: [-0.22, -0.28, -0.12],
        leftEuler: [0.38, -0.18, -0.15],
        leftFingerCurl: 0.34,
      },
      impact: {
        pos: [0.23, 0.03, -0.58],
        bladeAim: [-0.205, -0.02, -0.978],
        edgeAim: [-0.58, -0.78, 0.22],
        shoulder: [0.21, -0.27, -0.16],
        elbowPole: [0.60, -0.80, 0.05],
        leftPos: [-0.28, -0.22, -0.38],
        leftShoulder: [-0.27, -0.29, -0.01],
        leftEuler: [0.20, -0.42, -0.55],
        leftFingerCurl: 0.68,
      },
      endStrike: {
        pos: [-0.13, -0.21, -0.69],
        bladeAim: [-0.52, -0.36, -0.77],
        edgeAim: [-0.45, -0.78, 0.43],
        shoulder: [0.19, -0.28, -0.16],
        elbowPole: [0.50, -0.90, 0.10],
        leftPos: [-0.35, -0.28, -0.30],
        leftShoulder: [-0.28, -0.29, 0.02],
        leftEuler: [0.14, -0.55, -0.68],
        leftFingerCurl: 0.78,
      },
      followThrough: {
        pos: [-0.16, -0.26, -0.58],
        bladeAim: [-0.56, -0.38, -0.735],
        edgeAim: [-0.42, -0.76, 0.49],
        shoulder: [0.20, -0.28, -0.14],
        elbowPole: [0.45, -0.90, 0.15],
        leftPos: [-0.36, -0.30, -0.28],
        leftShoulder: [-0.28, -0.29, 0.03],
        leftEuler: [0.12, -0.58, -0.72],
        leftFingerCurl: 0.76,
      },
    } satisfies IComboSwingKeyframeSet,

    // 1: Right-side chambered slash (blade drawn wide right, then sweeps across chest left)
    1: {
      windup: {
        pos: [0.37, -0.14, -0.42],
        bladeAim: [0.64, 0.24, -0.73],
        edgeAim: [-0.65, -0.15, -0.74],
        shoulder: [0.28, -0.28, -0.04],
        elbowPole: [0.50, -0.70, 0.40],
        leftPos: [-0.08, -0.17, -0.48],
        leftShoulder: [-0.21, -0.28, -0.12],
        leftEuler: [0.32, 0.05, -0.20],
        leftFingerCurl: 0.36,
      },
      impact: {
        pos: [0.25, -0.11, -0.58],
        bladeAim: [-0.26, 0.13, -0.957],
        edgeAim: [-0.88, -0.45, 0.15],
        shoulder: [0.20, -0.28, -0.16],
        elbowPole: [0.60, -0.70, 0.20],
        leftPos: [-0.28, -0.22, -0.38],
        leftShoulder: [-0.27, -0.29, 0.0],
        leftEuler: [0.20, -0.45, -0.58],
        leftFingerCurl: 0.72,
      },
      endStrike: {
        pos: [-0.18, -0.17, -0.62],
        bladeAim: [-0.72, -0.08, -0.69],
        edgeAim: [-0.60, -0.40, 0.69],
        shoulder: [0.18, -0.28, -0.15],
        elbowPole: [0.30, -0.90, 0.20],
        leftPos: [-0.36, -0.26, -0.28],
        leftShoulder: [-0.28, -0.29, 0.03],
        leftEuler: [0.14, -0.62, -0.74],
        leftFingerCurl: 0.80,
      },
      followThrough: {
        pos: [-0.22, -0.20, -0.56],
        bladeAim: [-0.76, -0.12, -0.64],
        edgeAim: [-0.55, -0.40, 0.73],
        shoulder: [0.19, -0.28, -0.14],
        elbowPole: [0.25, -0.90, 0.25],
        leftPos: [-0.37, -0.28, -0.26],
        leftShoulder: [-0.28, -0.29, 0.04],
        leftEuler: [0.12, -0.64, -0.76],
        leftFingerCurl: 0.78,
      },
    } satisfies IComboSwingKeyframeSet,

    // 2: Thrust / stab (chamber back at right ribs aiming straight, lunge forward along blade axis)
    2: {
      windup: {
        pos: [0.20, -0.20, -0.26],
        bladeAim: [-0.18, 0.20, -0.963],
        edgeAim: [-0.15, -0.98, -0.17],
        shoulder: [0.27, -0.29, -0.04],
        elbowPole: [0.75, -0.60, 0.35],
        leftPos: [-0.11, -0.17, -0.46],
        leftShoulder: [-0.21, -0.28, -0.10],
        leftEuler: [0.30, 0.12, -0.25],
        leftFingerCurl: 0.52,
      },
      impact: {
        pos: [0.06, -0.09, -0.71],
        bladeAim: [-0.045, 0.11, -0.993],
        edgeAim: [-0.15, -0.98, -0.10],
        shoulder: [0.20, -0.27, -0.18],
        elbowPole: [0.60, -0.70, 0.20],
        leftPos: [-0.29, -0.22, -0.34],
        leftShoulder: [-0.27, -0.29, 0.02],
        leftEuler: [0.16, -0.48, -0.60],
        leftFingerCurl: 0.75,
      },
      endStrike: {
        pos: [0.04, -0.09, -0.76],
        bladeAim: [-0.03, 0.10, -0.9945],
        edgeAim: [-0.15, -0.98, -0.09],
        shoulder: [0.19, -0.27, -0.20],
        elbowPole: [0.60, -0.70, 0.20],
        leftPos: [-0.34, -0.24, -0.26],
        leftShoulder: [-0.28, -0.29, 0.04],
        leftEuler: [0.12, -0.56, -0.68],
        leftFingerCurl: 0.80,
      },
      followThrough: {
        pos: [0.04, -0.10, -0.78],
        bladeAim: [-0.03, 0.09, -0.995],
        edgeAim: [-0.15, -0.98, -0.08],
        shoulder: [0.19, -0.27, -0.20],
        elbowPole: [0.60, -0.70, 0.20],
        leftPos: [-0.35, -0.25, -0.25],
        leftShoulder: [-0.28, -0.29, 0.04],
        leftEuler: [0.10, -0.58, -0.70],
        leftFingerCurl: 0.78,
      },
    } satisfies IComboSwingKeyframeSet,
  },
} as const;
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
export type SwordAttackPhase =
  | 'ready'
  | 'windup'
  | 'strike'
  | 'follow_through'
  | 'recovery';

export type SwordImpactKind = 'none' | 'target' | 'obstacle' | 'wall' | 'wood';

export interface IVec3Tuple {
  x: number;
  y: number;
  z: number;
}

export interface IFirstPersonArmPose {
  readonly shoulderX: number;
  readonly shoulderY: number;
  readonly shoulderZ: number;
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

export interface IFirstPersonSwordGripTransform {
  readonly posX: number;
  readonly posY: number;
  readonly posZ: number;
  readonly rotX: number;
  readonly rotY: number;
  readonly rotZ: number;
}

export interface IFirstPersonSlashRibbonPose {
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

export interface IFirstPersonSwordCameraImpulse {
  readonly pitchOffset: number;
  readonly yawOffset: number;
  readonly rollOffset: number;
}

export interface IFirstPersonSwordAttackPoseResult {
  readonly phase: SwordAttackPhase;
  readonly phaseProgress: number;
  readonly swingProgress: number;
  readonly isInActiveStrikeWindow: boolean;
  readonly rightArm: IFirstPersonArmPose;
  readonly leftArm: IFirstPersonArmPose;
  readonly swordGrip: IFirstPersonSwordGripTransform;
  readonly bladeDirCamera: IVec3Tuple;
  readonly edgeDirCamera: IVec3Tuple;
  readonly swordTipCamera: IVec3Tuple;
  readonly swordCrossguardCamera: IVec3Tuple;
  readonly slashRibbon: IFirstPersonSlashRibbonPose;
  readonly cameraImpulse: IFirstPersonSwordCameraImpulse;
}

export interface IFirstPersonSwordPoseInput {
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

export const SWORD_PHASE_WINDUP_END = SWORD_SWING_KEYFRAMES.timing.windupEnd;
export const SWORD_PHASE_STRIKE_END = SWORD_SWING_KEYFRAMES.timing.strikeEnd;
export const SWORD_PHASE_FOLLOW_THROUGH_END = SWORD_SWING_KEYFRAMES.timing.followThroughEnd;

export const SWORD_ACTIVE_STRIKE_WINDOW_START =
  SWORD_SWING_KEYFRAMES.timing.activeStrikeWindowStart;
export const SWORD_ACTIVE_STRIKE_WINDOW_END =
  SWORD_SWING_KEYFRAMES.timing.activeStrikeWindowEnd;
export const SWORD_STRIKE_CONTACT_APEX = SWORD_SWING_KEYFRAMES.timing.impactProgress;
export const SWORD_IMPACT_HOLD_SECONDS = SWORD_SWING_KEYFRAMES.timing.impactHoldSeconds;

const SWORD_GRIP_FORWARD_TILT = 0.24;
const COS_TILT = Math.cos(SWORD_GRIP_FORWARD_TILT);
const SIN_TILT = Math.sin(SWORD_GRIP_FORWARD_TILT);

export const LOCKED_SWORD_GRIP_TRANSFORM: IFirstPersonSwordGripTransform = {
  posX: -0.078,
  posY: -0.018,
  posZ: -0.046,
  rotX: -0.34,
  rotY: -SWORD_GRIP_FORWARD_TILT,
  rotZ: Math.PI / 2,
};

const UPPER_ARM_LENGTH = SWORD_SWING_KEYFRAMES.anatomy.upperArmLength;
const FOREARM_LENGTH = SWORD_SWING_KEYFRAMES.anatomy.forearmLength;
const MAX_ARM_REACH = SWORD_SWING_KEYFRAMES.anatomy.maxReach;
const MIN_ARM_REACH = SWORD_SWING_KEYFRAMES.anatomy.minReach;
const SWORD_MESH_TIP_Y_LOCAL = SWORD_SWING_KEYFRAMES.anatomy.swordMeshTipYLocal;
// #endregion

// ======================== PRECOMPUTED QUATERNION RIGS ======================== \\
// #region Precomputed Quaternion Rigs
interface ICompiledKeyframe {
  readonly pos: THREE.Vector3;
  readonly quat: THREE.Quaternion;
  readonly shoulder: THREE.Vector3;
  readonly elbowPole: THREE.Vector3;
  readonly leftPos: THREE.Vector3;
  readonly leftShoulder: THREE.Vector3;
  readonly leftQuat: THREE.Quaternion;
  readonly leftFingerCurl: number;
}

interface ICompiledComboSet {
  readonly windup: ICompiledKeyframe;
  readonly impact: ICompiledKeyframe;
  readonly endStrike: ICompiledKeyframe;
  readonly followThrough: ICompiledKeyframe;
}

function buildHandQuaternion(bladeRaw: Vec3Tuple, edgeHintRaw: Vec3Tuple): THREE.Quaternion {
  const b = new THREE.Vector3(bladeRaw[0], bladeRaw[1], bladeRaw[2]).normalize();
  const k0 = new THREE.Vector3(edgeHintRaw[0], edgeHintRaw[1], edgeHintRaw[2]);
  const k = k0.addScaledVector(b, -k0.dot(b)).normalize();
  const d = new THREE.Vector3().crossVectors(k, b).normalize();

  const xHand = new THREE.Vector3(
    -COS_TILT * b.x + SIN_TILT * k.x,
    -COS_TILT * b.y + SIN_TILT * k.y,
    -COS_TILT * b.z + SIN_TILT * k.z
  );
  const yHand = d;
  const zHand = new THREE.Vector3(
    -SIN_TILT * b.x - COS_TILT * k.x,
    -SIN_TILT * b.y - COS_TILT * k.y,
    -SIN_TILT * b.z - COS_TILT * k.z
  );

  const basis = new THREE.Matrix4().makeBasis(xHand, yHand, zHand);
  return new THREE.Quaternion().setFromRotationMatrix(basis).normalize();
}

function compileKeyframe(kf: ISwordPoseKeyframe): ICompiledKeyframe {
  return {
    pos: new THREE.Vector3(kf.pos[0], kf.pos[1], kf.pos[2]),
    quat: buildHandQuaternion(kf.bladeAim, kf.edgeAim),
    shoulder: new THREE.Vector3(kf.shoulder[0], kf.shoulder[1], kf.shoulder[2]),
    elbowPole: new THREE.Vector3(kf.elbowPole[0], kf.elbowPole[1], kf.elbowPole[2]),
    leftPos: new THREE.Vector3(kf.leftPos[0], kf.leftPos[1], kf.leftPos[2]),
    leftShoulder: new THREE.Vector3(kf.leftShoulder[0], kf.leftShoulder[1], kf.leftShoulder[2]),
    leftQuat: new THREE.Quaternion().setFromEuler(
      new THREE.Euler(kf.leftEuler[0], kf.leftEuler[1], kf.leftEuler[2], 'YXZ')
    ),
    leftFingerCurl: kf.leftFingerCurl,
  };
}

function compileComboSet(set: IComboSwingKeyframeSet): ICompiledComboSet {
  return {
    windup: compileKeyframe(set.windup),
    impact: compileKeyframe(set.impact),
    endStrike: compileKeyframe(set.endStrike),
    followThrough: compileKeyframe(set.followThrough),
  };
}

const COMPILED_READY = compileKeyframe(SWORD_SWING_KEYFRAMES.ready);
const COMPILED_BLOCK = compileKeyframe(SWORD_SWING_KEYFRAMES.block);
const COMPILED_SPRINT_READY_QUAT = buildHandQuaternion(
  [
    SWORD_SWING_KEYFRAMES.ready.bladeAim[0] - 0.14,
    SWORD_SWING_KEYFRAMES.ready.bladeAim[1] - 0.10,
    SWORD_SWING_KEYFRAMES.ready.bladeAim[2],
  ],
  SWORD_SWING_KEYFRAMES.ready.edgeAim
);

const COMPILED_COMBOS: Record<0 | 1 | 2, ICompiledComboSet> = {
  0: compileComboSet(SWORD_SWING_KEYFRAMES.combos[0]),
  1: compileComboSet(SWORD_SWING_KEYFRAMES.combos[1]),
  2: compileComboSet(SWORD_SWING_KEYFRAMES.combos[2]),
};

const _gripLocalPos = new THREE.Vector3(
  LOCKED_SWORD_GRIP_TRANSFORM.posX,
  LOCKED_SWORD_GRIP_TRANSFORM.posY,
  LOCKED_SWORD_GRIP_TRANSFORM.posZ
);
const _gripLocalQuat = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(
    LOCKED_SWORD_GRIP_TRANSFORM.rotX,
    LOCKED_SWORD_GRIP_TRANSFORM.rotY,
    LOCKED_SWORD_GRIP_TRANSFORM.rotZ,
    'YXZ'
  )
);
const _bladeLocalAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(_gripLocalQuat).normalize();
const _edgeLocalAxis = new THREE.Vector3(0, 0, -1).applyQuaternion(_gripLocalQuat).normalize();
const _tipInHandLocal = new THREE.Vector3(0, SWORD_MESH_TIP_Y_LOCAL, 0)
  .applyQuaternion(_gripLocalQuat)
  .add(_gripLocalPos);

// Scratch temporaries reused inside hot-path evaluation
const _readyPos = new THREE.Vector3();
const _readyQuat = new THREE.Quaternion();
const _readyShoulder = new THREE.Vector3();
const _readyPole = new THREE.Vector3();
const _readyLeftPos = new THREE.Vector3();
const _readyLeftShoulder = new THREE.Vector3();
const _readyLeftQuat = new THREE.Quaternion();

const _wristPos = new THREE.Vector3();
const _handQuat = new THREE.Quaternion();
const _shoulderPos = new THREE.Vector3();
const _elbowPole = new THREE.Vector3();
const _elbowR = new THREE.Vector3();

const _leftWristPos = new THREE.Vector3();
const _leftShoulderPos = new THREE.Vector3();
const _leftHandQuat = new THREE.Quaternion();
const _leftPole = new THREE.Vector3(-0.60, -0.80, 0.15);
const _elbowL = new THREE.Vector3();
const _pommelTarget = new THREE.Vector3();
const _pommelQuat = new THREE.Quaternion();
const _pommelEuler = new THREE.Euler(0, 0, 0, 'YXZ');

const _ikDiff = new THREE.Vector3();
const _ikDir = new THREE.Vector3();
const _ikPole = new THREE.Vector3();

const _handEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _leftEulerOut = new THREE.Euler(0, 0, 0, 'YXZ');
const _bladeDir = new THREE.Vector3();
const _edgeDir = new THREE.Vector3();
const _crossguardCam = new THREE.Vector3();
const _tipCam = new THREE.Vector3();
// #endregion

// ======================== MATH & 2-BONE IK UTILITIES ======================== \\
// #region Math & 2-Bone IK Utilities
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

/**
 * Analytic 2-bone arm IK: keeps upper arm = 0.31m and forearm = 0.34m exact
 * while clamping wrist target within human reach from the shoulder.
 */
function solveTwoBoneArmIK(
  shoulder: THREE.Vector3,
  wristTarget: THREE.Vector3,
  poleHint: THREE.Vector3,
  outElbow: THREE.Vector3,
  fallbackPoleX: number
): void {
  _ikDiff.subVectors(wristTarget, shoulder);
  let d = _ikDiff.length();
  if (d > 1e-5) {
    _ikDir.copy(_ikDiff).divideScalar(d);
  } else {
    _ikDir.set(0, 0, -1);
  }
  if (d > MAX_ARM_REACH) {
    d = MAX_ARM_REACH;
    wristTarget.copy(shoulder).addScaledVector(_ikDir, d);
  } else if (d < MIN_ARM_REACH) {
    d = MIN_ARM_REACH;
    wristTarget.copy(shoulder).addScaledVector(_ikDir, d);
  }

  const a =
    (UPPER_ARM_LENGTH * UPPER_ARM_LENGTH - FOREARM_LENGTH * FOREARM_LENGTH + d * d) /
    (2 * d);
  const h = Math.sqrt(Math.max(0, UPPER_ARM_LENGTH * UPPER_ARM_LENGTH - a * a));
  _ikPole.copy(poleHint).addScaledVector(_ikDir, -poleHint.dot(_ikDir));
  if (_ikPole.lengthSq() < 1e-6) {
    _ikPole.set(fallbackPoleX, -1, 0);
  }
  _ikPole.normalize();
  outElbow
    .copy(shoulder)
    .addScaledVector(_ikDir, a)
    .addScaledVector(_ikPole, h);
}

/**
 * Camera recoil envelope across the strike phase.
 */
function strikeCameraCurve(u: number): number {
  const t = clamp(u, 0, 1);
  const whip = 1 - Math.pow(1 - t, 2.35);
  return smoothstep(t) * 0.35 + whip * 0.65;
}

/**
 * Classifies normalized swingProgress into discrete attack phase and local progress.
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

// ======================== POSE EVALUATION & INTEGRATION ======================== \\
// #region Pose Evaluation & Integration
function copyCompiledKeyframeToRightAndLeft(kf: ICompiledKeyframe): void {
  _wristPos.copy(kf.pos);
  _handQuat.copy(kf.quat);
  _shoulderPos.copy(kf.shoulder);
  _elbowPole.copy(kf.elbowPole);
  _leftWristPos.copy(kf.leftPos);
  _leftShoulderPos.copy(kf.leftShoulder);
  _leftHandQuat.copy(kf.leftQuat);
}

function interpolateRightAndLeft(
  aPos: THREE.Vector3,
  bPos: THREE.Vector3,
  aQuat: THREE.Quaternion,
  bQuat: THREE.Quaternion,
  aShoulder: THREE.Vector3,
  bShoulder: THREE.Vector3,
  aPole: THREE.Vector3,
  bPole: THREE.Vector3,
  aLeftPos: THREE.Vector3,
  bLeftPos: THREE.Vector3,
  aLeftShoulder: THREE.Vector3,
  bLeftShoulder: THREE.Vector3,
  aLeftQuat: THREE.Quaternion,
  bLeftQuat: THREE.Quaternion,
  t: number
): void {
  _wristPos.lerpVectors(aPos, bPos, t);
  _handQuat.slerpQuaternions(aQuat, bQuat, t);
  _shoulderPos.lerpVectors(aShoulder, bShoulder, t);
  _elbowPole.lerpVectors(aPole, bPole, t);
  _leftWristPos.lerpVectors(aLeftPos, bLeftPos, t);
  _leftShoulderPos.lerpVectors(aLeftShoulder, bLeftShoulder, t);
  _leftHandQuat.slerpQuaternions(aLeftQuat, bLeftQuat, t);
}

/**
 * Computes the complete first-person sword, arm, and camera-impulse pose.
 * Positions interpolate exclusively with Vector3.lerpVectors; rotations interpolate
 * exclusively with Quaternion.slerpQuaternions.
 */
export function computeFirstPersonSwordAttackPose(
  input: IFirstPersonSwordPoseInput
): IFirstPersonSwordAttackPoseResult {
  const p = clamp(input.swingProgress, 0, 1);
  const { phase, phaseProgress } = classifySwordAttackPhase(p);
  const isHeavyOrThrust = input.isHeavy || input.comboIndex === 2;
  const comboSet =
    input.comboIndex === 2 || input.isHeavy
      ? COMPILED_COMBOS[2]
      : input.comboIndex === 1
        ? COMPILED_COMBOS[1]
        : COMPILED_COMBOS[0];

  const swayScale = p > 0.001 ? Math.max(0.15, 1 - Math.sin(p * Math.PI) * 0.85) : 1.0;
  _readyPos.set(
    COMPILED_READY.pos.x + input.swayX * swayScale - input.sprintCarry * 0.04,
    COMPILED_READY.pos.y - input.swayY * swayScale + input.breathY * swayScale - input.sprintCarry * 0.03,
    COMPILED_READY.pos.z
  );
  _readyQuat.slerpQuaternions(
    COMPILED_READY.quat,
    COMPILED_SPRINT_READY_QUAT,
    clamp(input.sprintCarry, 0, 1)
  );
  _readyShoulder.copy(COMPILED_READY.shoulder);
  _readyPole.copy(COMPILED_READY.elbowPole);

  _readyLeftPos.set(
    COMPILED_READY.leftPos.x + input.swayX * 0.65 * swayScale,
    COMPILED_READY.leftPos.y - input.swayY * 0.65 * swayScale + input.breathY * swayScale,
    COMPILED_READY.leftPos.z
  );
  _readyLeftShoulder.copy(COMPILED_READY.leftShoulder);
  _readyLeftQuat.copy(COMPILED_READY.leftQuat);
  let leftFingerCurl = COMPILED_READY.leftFingerCurl;

  const charge = p <= 0.001 ? clamp(input.chargeProgress, 0, 1) : 0;
  if (charge > 0.001) {
    const chEase = smoothstep(charge);
    _readyPos.lerpVectors(_readyPos, COMPILED_COMBOS[2].windup.pos, chEase);
    _readyQuat.slerpQuaternions(_readyQuat, COMPILED_COMBOS[2].windup.quat, chEase);
    _readyShoulder.lerpVectors(_readyShoulder, COMPILED_COMBOS[2].windup.shoulder, chEase);
    _readyPole.lerpVectors(_readyPole, COMPILED_COMBOS[2].windup.elbowPole, chEase);
    _readyLeftPos.lerpVectors(_readyLeftPos, COMPILED_COMBOS[2].windup.leftPos, chEase);
    _readyLeftShoulder.lerpVectors(
      _readyLeftShoulder,
      COMPILED_COMBOS[2].windup.leftShoulder,
      chEase
    );
    _readyLeftQuat.slerpQuaternions(_readyLeftQuat, COMPILED_COMBOS[2].windup.leftQuat, chEase);
    leftFingerCurl = lerp(leftFingerCurl, COMPILED_COMBOS[2].windup.leftFingerCurl, chEase);
  }

  const blk = p <= 0.001 ? clamp(input.blockProgress, 0, 1) : 0;
  if (blk > 0.001) {
    const bEase = smoothstep(blk);
    _readyPos.set(
      lerp(_readyPos.x, COMPILED_BLOCK.pos.x + input.swayX * 0.35, bEase),
      lerp(_readyPos.y, COMPILED_BLOCK.pos.y - input.swayY * 0.35 + input.breathY * 0.4, bEase),
      lerp(_readyPos.z, COMPILED_BLOCK.pos.z, bEase)
    );
    _readyQuat.slerpQuaternions(_readyQuat, COMPILED_BLOCK.quat, bEase);
    _readyShoulder.lerpVectors(_readyShoulder, COMPILED_BLOCK.shoulder, bEase);
    _readyPole.lerpVectors(_readyPole, COMPILED_BLOCK.elbowPole, bEase);
    _readyLeftPos.set(
      lerp(_readyLeftPos.x, COMPILED_BLOCK.leftPos.x + input.swayX * 0.35, bEase),
      lerp(_readyLeftPos.y, COMPILED_BLOCK.leftPos.y - input.swayY * 0.35, bEase),
      lerp(_readyLeftPos.z, COMPILED_BLOCK.leftPos.z, bEase)
    );
    _readyLeftShoulder.lerpVectors(_readyLeftShoulder, COMPILED_BLOCK.leftShoulder, bEase);
    _readyLeftQuat.slerpQuaternions(_readyLeftQuat, COMPILED_BLOCK.leftQuat, bEase);
    leftFingerCurl = lerp(leftFingerCurl, COMPILED_BLOCK.leftFingerCurl, bEase);
  }

  if (phase === 'ready') {
    _wristPos.copy(_readyPos);
    _handQuat.copy(_readyQuat);
    _shoulderPos.copy(_readyShoulder);
    _elbowPole.copy(_readyPole);
    _leftWristPos.copy(_readyLeftPos);
    _leftShoulderPos.copy(_readyLeftShoulder);
    _leftHandQuat.copy(_readyLeftQuat);
  } else if (phase === 'windup') {
    const u = smoothstep(phaseProgress);
    interpolateRightAndLeft(
      _readyPos, comboSet.windup.pos,
      _readyQuat, comboSet.windup.quat,
      _readyShoulder, comboSet.windup.shoulder,
      _readyPole, comboSet.windup.elbowPole,
      _readyLeftPos, comboSet.windup.leftPos,
      _readyLeftShoulder, comboSet.windup.leftShoulder,
      _readyLeftQuat, comboSet.windup.leftQuat,
      u
    );
    leftFingerCurl = lerp(leftFingerCurl, comboSet.windup.leftFingerCurl, u);
  } else if (phase === 'strike') {
    const u = clamp(phaseProgress, 0, 1);
    const impactU = SWORD_SWING_KEYFRAMES.timing.impactFractionInStrike;
    if (u <= impactU) {
      const t = u / impactU;
      const e = Math.pow(t, SWORD_SWING_KEYFRAMES.timing.strikeEaseInExponent);
      copyCompiledKeyframeToRightAndLeft(comboSet.windup);
      interpolateRightAndLeft(
        comboSet.windup.pos, comboSet.impact.pos,
        comboSet.windup.quat, comboSet.impact.quat,
        comboSet.windup.shoulder, comboSet.impact.shoulder,
        comboSet.windup.elbowPole, comboSet.impact.elbowPole,
        comboSet.windup.leftPos, comboSet.impact.leftPos,
        comboSet.windup.leftShoulder, comboSet.impact.leftShoulder,
        comboSet.windup.leftQuat, comboSet.impact.leftQuat,
        e
      );
      leftFingerCurl = lerp(comboSet.windup.leftFingerCurl, comboSet.impact.leftFingerCurl, e);
    } else {
      const t = (u - impactU) / (1 - impactU);
      const e = 1 - Math.pow(1 - t, SWORD_SWING_KEYFRAMES.timing.strikeExitExponent);
      interpolateRightAndLeft(
        comboSet.impact.pos, comboSet.endStrike.pos,
        comboSet.impact.quat, comboSet.endStrike.quat,
        comboSet.impact.shoulder, comboSet.endStrike.shoulder,
        comboSet.impact.elbowPole, comboSet.endStrike.elbowPole,
        comboSet.impact.leftPos, comboSet.endStrike.leftPos,
        comboSet.impact.leftShoulder, comboSet.endStrike.leftShoulder,
        comboSet.impact.leftQuat, comboSet.endStrike.leftQuat,
        e
      );
      leftFingerCurl = lerp(comboSet.impact.leftFingerCurl, comboSet.endStrike.leftFingerCurl, e);
    }
  } else if (phase === 'follow_through') {
    const u = 1 - Math.pow(1 - clamp(phaseProgress, 0, 1), 1.8);
    interpolateRightAndLeft(
      comboSet.endStrike.pos, comboSet.followThrough.pos,
      comboSet.endStrike.quat, comboSet.followThrough.quat,
      comboSet.endStrike.shoulder, comboSet.followThrough.shoulder,
      comboSet.endStrike.elbowPole, comboSet.followThrough.elbowPole,
      comboSet.endStrike.leftPos, comboSet.followThrough.leftPos,
      comboSet.endStrike.leftShoulder, comboSet.followThrough.leftShoulder,
      comboSet.endStrike.leftQuat, comboSet.followThrough.leftQuat,
      u
    );
    leftFingerCurl = lerp(
      comboSet.endStrike.leftFingerCurl,
      comboSet.followThrough.leftFingerCurl,
      u
    );
  } else {
    const u = smoothstep(phaseProgress);
    interpolateRightAndLeft(
      comboSet.followThrough.pos, _readyPos,
      comboSet.followThrough.quat, _readyQuat,
      comboSet.followThrough.shoulder, _readyShoulder,
      comboSet.followThrough.elbowPole, _readyPole,
      comboSet.followThrough.leftPos, _readyLeftPos,
      comboSet.followThrough.leftShoulder, _readyLeftShoulder,
      comboSet.followThrough.leftQuat, _readyLeftQuat,
      u
    );
    leftFingerCurl = lerp(comboSet.followThrough.leftFingerCurl, leftFingerCurl, u);
  }

  // Tactile impact recoil deflection when hitting a solid target/surface
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
    _wristPos.x += reboundSign * 0.020 * hitRecoilPulse * surfaceMult;
    _wristPos.y += 0.015 * hitRecoilPulse * surfaceMult;
    _wristPos.z += 0.028 * hitRecoilPulse * surfaceMult;
  }

  // Solve 2-bone right arm IK from dynamic shoulder to wrist
  solveTwoBoneArmIK(_shoulderPos, _wristPos, _elbowPole, _elbowR, 0.55);

  _handEuler.setFromQuaternion(_handQuat, 'YXZ');
  _bladeDir.copy(_bladeLocalAxis).applyQuaternion(_handQuat).normalize();
  _edgeDir.copy(_edgeLocalAxis).applyQuaternion(_handQuat).normalize();
  _crossguardCam.copy(_gripLocalPos).applyQuaternion(_handQuat).add(_wristPos);
  _tipCam.copy(_tipInHandLocal).applyQuaternion(_handQuat).add(_wristPos);

  // Heavy attack blends left hand onto the pommel for a two-handed power lunge
  let twoHandBlend = 0;
  if (input.isHeavy && p > 0.001) {
    if (phase === 'windup') {
      twoHandBlend = smoothstep(phaseProgress);
    } else if (phase === 'strike' || phase === 'follow_through') {
      twoHandBlend = 1.0;
    } else if (phase === 'recovery') {
      twoHandBlend = 1.0 - smoothstep(phaseProgress);
    }
  } else if (charge > 0.001) {
    twoHandBlend = smoothstep(charge) * 0.75;
  }

  if (twoHandBlend > 0.001) {
    _pommelTarget.set(
      _wristPos.x - _bladeDir.x * 0.11 - 0.02,
      _wristPos.y - _bladeDir.y * 0.11 - 0.03,
      _wristPos.z - _bladeDir.z * 0.11 + 0.02
    );
    _pommelEuler.set(_handEuler.x + 0.06, _handEuler.y - 0.22, _handEuler.z - 0.14, 'YXZ');
    _pommelQuat.setFromEuler(_pommelEuler);
    _leftWristPos.lerpVectors(_leftWristPos, _pommelTarget, twoHandBlend);
    _leftHandQuat.slerpQuaternions(_leftHandQuat, _pommelQuat, twoHandBlend);
    leftFingerCurl = lerp(leftFingerCurl, 0.92, twoHandBlend);
  }

  // Solve 2-bone left arm IK from counter-rotating left shoulder to counterbalance wrist
  solveTwoBoneArmIK(_leftShoulderPos, _leftWristPos, _leftPole, _elbowL, -0.55);
  _leftEulerOut.setFromQuaternion(_leftHandQuat, 'YXZ');

  const dirSign = input.comboIndex === 1 ? -1 : 1;
  const heavyMult = isHeavyOrThrust ? 1.25 : 1.0;
  const slashRibbon: IFirstPersonSlashRibbonPose = {
    visible: false,
    opacity: 0,
    posX: 0,
    posY: 0,
    posZ: -0.95,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    scale: 1,
  };

  let camPitch = 0;
  let camYaw = 0;
  let camRoll = 0;

  if (phase === 'windup') {
    const wEnv = Math.sin(phaseProgress * (Math.PI * 0.5));
    camPitch = 0.0055 * wEnv * heavyMult;
    camYaw = -0.0050 * dirSign * wEnv * heavyMult;
    camRoll = -0.0045 * dirSign * wEnv * heavyMult;
  } else if (phase === 'strike') {
    const sEnv = strikeCameraCurve(phaseProgress);
    camPitch = lerp(0.0055, -0.011, sEnv) * heavyMult;
    camYaw = lerp(-0.0050, 0.012, sEnv) * dirSign * heavyMult;
    camRoll = lerp(-0.0045, 0.014, sEnv) * dirSign * heavyMult;
  } else if (phase === 'follow_through') {
    const fEnv = smoothstep(phaseProgress);
    camPitch = lerp(-0.011, -0.006, fEnv) * heavyMult;
    camYaw = lerp(0.012, 0.007, fEnv) * dirSign * heavyMult;
    camRoll = lerp(0.014, 0.008, fEnv) * dirSign * heavyMult;
  } else if (phase === 'recovery') {
    const rEnv = 1 - (phaseProgress * phaseProgress * phaseProgress * (phaseProgress * (phaseProgress * 6 - 15) + 10));
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
      shoulderX: _shoulderPos.x,
      shoulderY: _shoulderPos.y,
      shoulderZ: _shoulderPos.z,
      elbowX: _elbowR.x,
      elbowY: _elbowR.y,
      elbowZ: _elbowR.z,
      wristX: _wristPos.x,
      wristY: _wristPos.y,
      wristZ: _wristPos.z,
      handRx: _handEuler.x,
      handRy: _handEuler.y,
      handRz: _handEuler.z,
      fingerCurl: 0.92,
    },
    leftArm: {
      shoulderX: _leftShoulderPos.x,
      shoulderY: _leftShoulderPos.y,
      shoulderZ: _leftShoulderPos.z,
      elbowX: _elbowL.x,
      elbowY: _elbowL.y,
      elbowZ: _elbowL.z,
      wristX: _leftWristPos.x,
      wristY: _leftWristPos.y,
      wristZ: _leftWristPos.z,
      handRx: _leftEulerOut.x,
      handRy: _leftEulerOut.y,
      handRz: _leftEulerOut.z,
      fingerCurl: leftFingerCurl,
    },
    swordGrip: LOCKED_SWORD_GRIP_TRANSFORM,
    bladeDirCamera: { x: _bladeDir.x, y: _bladeDir.y, z: _bladeDir.z },
    edgeDirCamera: { x: _edgeDir.x, y: _edgeDir.y, z: _edgeDir.z },
    swordTipCamera: { x: _tipCam.x, y: _tipCam.y, z: _tipCam.z },
    swordCrossguardCamera: {
      x: _crossguardCam.x,
      y: _crossguardCam.y,
      z: _crossguardCam.z,
    },
    slashRibbon,
    cameraImpulse: {
      pitchOffset: camPitch,
      yawOffset: camYaw,
      rollOffset: camRoll,
    },
  };
}
// #endregion

