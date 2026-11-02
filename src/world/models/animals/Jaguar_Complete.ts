// ============================================================================
// MODULE: World / Models / Animals / Jaguar (GLB-backed model)
// DESIGN: Rig, skinning and clip animator over data decoded from the model's GLB file
//         (public/models/animals/jaguar.glb, loaded by animalModelAssets)
// SUMMARY: Builds and animates the Jaguar model. Imported only through the
//          ../Jaguar.ts facade; gameplay and AI live in the wildlife system.
// ============================================================================

import * as THREE from 'three';
import {
  createAnimalTexture,
  getLoadedAnimalModel,
  requireClipRig,
  type IClipRigModelData,
} from '../animalModelAssets';

export type JaguarState =
  | 'idle'
  | 'walk'
  | 'eat'
  | 'call'
  | 'lie'
  | 'sit'
  | 'stalk'
  | 'trot'
  | 'run'
  | 'flee'
  | 'skip'
  | 'roar'
  | 'attack'
  | 'death';

export interface JaguarOptions {
  scale?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

/** Summary: Decoded model data (see IClipRigModelData). */
export type JaguarUnpackedData = IClipRigModelData;

export const JAGUAR_GAITS: Record<JaguarState, { speed: number }> = {
  idle:   { speed: 0.0 },
  walk:   { speed: 1.55 },
  eat:    { speed: 0.0 },
  call:   { speed: 0.0 },
  lie:    { speed: 0.0 },
  sit:    { speed: 0.0 },
  stalk:  { speed: 0.85 },
  trot:   { speed: 3.6 },
  run:    { speed: 7.4 },
  flee:   { speed: 9.8 },
  skip:   { speed: 6.2 },
  roar:   { speed: 0.0 },
  attack: { speed: 0.0 },
  death:  { speed: 0.0 },
};

const CLIP_ORDER: JaguarState[] = [
  'idle',
  'walk',
  'eat',
  'call',
  'lie',
  'sit',
  'trot',
  'run',
  'flee',
  'skip',
  'roar',
  'attack',
  'death',
];

const NUM_JOINTS = 42;
const NUM_CLIPS = 13;
const NUM_FRAMES = 24;

export class JaguarRig {
  readonly root: THREE.Bone;
  readonly bones: THREE.Bone[] = [];
  readonly boneInverses: THREE.Matrix4[] = [];
  readonly skeleton: THREE.Skeleton;
  private readonly restTranslations: Float32Array;
  private readonly restRotations: Float32Array;

  constructor(data: JaguarUnpackedData) {
    this.restTranslations = data.restTranslations;
    this.restRotations = data.restRotations;
    for (let j = 0; j < NUM_JOINTS; j++) {
      const b = new THREE.Bone();
      b.name = 'JaguarJoint_' + j;
      b.position.set(
        data.restTranslations[j * 3],
        data.restTranslations[j * 3 + 1],
        data.restTranslations[j * 3 + 2],
      );
      b.quaternion.set(
        data.restRotations[j * 4],
        data.restRotations[j * 4 + 1],
        data.restRotations[j * 4 + 2],
        data.restRotations[j * 4 + 3],
      );
      b.scale.set(1, 1, 1);
      this.bones.push(b);

      const ibm = new THREE.Matrix4();
      ibm.fromArray(data.inverseBindMatrices, j * 16);
      this.boneInverses.push(ibm);
    }

    for (let j = 0; j < NUM_JOINTS; j++) {
      const p = data.parents[j];
      if (p >= 0 && p < NUM_JOINTS) {
        this.bones[p].add(this.bones[j]);
      }
    }

    this.root = this.bones[0];
    this.root.updateMatrixWorld(true);
    this.skeleton = new THREE.Skeleton(this.bones, this.boneInverses);
  }

  resetToRest(): void {
    for (let j = 0; j < NUM_JOINTS; j++) {
      const b = this.bones[j];
      b.position.set(
        this.restTranslations[j * 3],
        this.restTranslations[j * 3 + 1],
        this.restTranslations[j * 3 + 2],
      );
      b.quaternion.set(
        this.restRotations[j * 4],
        this.restRotations[j * 4 + 1],
        this.restRotations[j * 4 + 2],
        this.restRotations[j * 4 + 3],
      );
      b.scale.set(1, 1, 1);
    }
    this.root.updateMatrixWorld(true);
  }
}

export class JaguarAnimator {
  readonly rig: JaguarRig;
  readonly data: JaguarUnpackedData;
  state: JaguarState = 'walk';
  prevState: JaguarState = 'walk';
  blend = 1.0;
  blendDuration = 0.42;
  time = 0;
  prevTime = 0;
  moveSpeed = 1.55;
  turn = 0;
  loopDeath = false;

  private fromPoseQuats = new Float32Array(NUM_JOINTS * 4);
  private lastPoseQuats = new Float32Array(NUM_JOINTS * 4);
  private fromRootPos = new THREE.Vector3();
  private lastRootPos = new THREE.Vector3();
  private hasPoseSnapshot = false;

  private qA = new THREE.Quaternion();
  private qB = new THREE.Quaternion();
  private qPrev = new THREE.Quaternion();
  private qTurn = new THREE.Quaternion();
  private vA = new THREE.Vector3();
  private vPrev = new THREE.Vector3();
  private turnAxis = new THREE.Vector3(0, 0, 1);

  private qEuler = new THREE.Euler();
  private qMod = new THREE.Quaternion();

  private addLocalRot(jointIdx: number, rx: number, ry: number, rz: number): void {
    const b = this.rig.bones[jointIdx];
    if (!b) return;
    this.qEuler.set(rx, ry, rz, 'XYZ');
    this.qMod.setFromEuler(this.qEuler);
    b.quaternion.multiply(this.qMod);
  }

  private static isLocomotionState(s: JaguarState): boolean {
    return s === 'walk' || s === 'trot' || s === 'run' || s === 'flee' || s === 'stalk' || s === 'skip';
  }

  private static isPostureChangeState(s: JaguarState): boolean {
    return s === 'lie' || s === 'sit' || s === 'stalk' || s === 'eat' || s === 'roar' || s === 'call';
  }

  private computeBlendDuration(from: JaguarState, to: JaguarState): number {
    if (to === 'attack' || from === 'attack') return 0.20;
    if (to === 'death') return 0.38;
    if (from === 'lie' || to === 'lie' || from === 'sit' || to === 'sit') return 0.56;
    if (from === 'stalk' || to === 'stalk' || from === 'eat' || to === 'eat' || from === 'roar' || to === 'roar' || from === 'call' || to === 'call') {
      return 0.48;
    }
    if (JaguarAnimator.isLocomotionState(from) && JaguarAnimator.isLocomotionState(to)) {
      return 0.36;
    }
    return 0.40;
  }

  constructor(rig: JaguarRig, data: JaguarUnpackedData) {
    this.rig = rig;
    this.data = data;
    this.applyClipPose(this.getClipIndex(this.state), 0, 1.0, false);
  }

  setState(next: JaguarState): void {
    if (next === this.state) return;

    if (this.hasPoseSnapshot) {
      this.fromPoseQuats.set(this.lastPoseQuats);
      this.fromRootPos.copy(this.lastRootPos);
    } else {
      for (let j = 0; j < NUM_JOINTS; j++) {
        const q = this.rig.bones[j].quaternion;
        this.fromPoseQuats[j * 4 + 0] = q.x;
        this.fromPoseQuats[j * 4 + 1] = q.y;
        this.fromPoseQuats[j * 4 + 2] = q.z;
        this.fromPoseQuats[j * 4 + 3] = q.w;
      }
      this.fromRootPos.copy(this.rig.bones[2].position);
      this.hasPoseSnapshot = true;
    }

    const prev = this.state;
    this.prevState = prev;
    this.prevTime = this.time;
    this.blendDuration = this.computeBlendDuration(prev, next);

    if (JaguarAnimator.isLocomotionState(prev) && JaguarAnimator.isLocomotionState(next)) {
      const oldDur = Math.max(0.1, this.data.clipDurations[this.getClipIndex(prev)]);
      const newDur = Math.max(0.1, this.data.clipDurations[this.getClipIndex(next)]);
      const normPhase = (((this.time % oldDur) + oldDur) % oldDur) / oldDur;
      this.time = normPhase * newDur;
    } else if (next === 'call' || next === 'roar' || next === 'attack' || next === 'death' || next === 'lie' || next === 'sit' || next === 'eat') {
      this.time = 0.0;
    }

    this.state = next;
    this.blend = 0.0;
    this.moveSpeed = JAGUAR_GAITS[next] ? JAGUAR_GAITS[next].speed : 0.0;
  }

  restartState(next: JaguarState): void {
    this.prevState = next;
    this.state = next;
    this.blend = 1.0;
    this.time = 0.0;
    this.prevTime = 0.0;
    this.moveSpeed = JAGUAR_GAITS[next] ? JAGUAR_GAITS[next].speed : 0.0;
    this.applyClipPose(this.getClipIndex(next), 0.0, 1.0, false);
    this.rig.root.updateMatrixWorld(true);
  }

  setNormalizedPhase(normalizedPhase: number): void {
    const clipIdx = this.getClipIndex(this.state);
    const dur = Math.max(0.1, this.data.clipDurations[clipIdx]);
    this.blend = 1.0;
    this.time = Math.max(0, Math.min(1, normalizedPhase)) * dur;
    this.applyClipPose(clipIdx, this.time, 1.0, false);
    this.rig.root.updateMatrixWorld(true);
  }

  private getClipIndex(st: JaguarState): number {
    if (st === 'sit' || st === 'eat') return 0; // Upright sit & crouched feeding layered over base idle (Clip 0)
    if (st === 'stalk') return 5;               // Clip 5 is the low stealth prowl (stalk)
    const idx = CLIP_ORDER.indexOf(st);
    return idx >= 0 ? idx : 0;
  }

  private sampleClipFrame(clipIdx: number, t: number, st: JaguarState) {
    const dur = Math.max(0.1, this.data.clipDurations[clipIdx]);
    let u: number;
    if (st === 'death' && !this.loopDeath) {
      u = Math.min(1.0, Math.max(0.0, t / dur));
    } else if (st === 'attack') {
      // Keep attack sampling strictly inside the dynamic strike frames (0..0.64 of clip) with a brisk 0.68s cycle
      // so the jaguar never hits static end frames or freezes at the end of its pounce!
      const attackCycle = 0.68;
      const cycleU = (((t % attackCycle) + attackCycle) % attackCycle) / attackCycle;
      u = Math.sin(cycleU * Math.PI) * 0.62;
    } else {
      u = (t % dur) / dur;
      if (u < 0) u += 1.0;
    }
    const pos = u * (NUM_FRAMES - 1);
    const f0 = Math.min(NUM_FRAMES - 1, Math.floor(pos));
    const f1 = Math.min(NUM_FRAMES - 1, f0 + 1);
    const frac = pos - f0;
    return { f0, f1, frac };
  }

  private readRootPos(clipIdx: number, f0: number, f1: number, frac: number, out: THREE.Vector3): void {
    const base0 = (clipIdx * NUM_FRAMES + f0) * 3;
    const base1 = (clipIdx * NUM_FRAMES + f1) * 3;
    const arr = this.data.clipRootTranslations;
    out.set(
      arr[base0] + (arr[base1] - arr[base0]) * frac,
      arr[base0 + 1] + (arr[base1 + 1] - arr[base0 + 1]) * frac,
      arr[base0 + 2] + (arr[base1 + 2] - arr[base0 + 2]) * frac,
    );
  }

  private readJointQuat(clipIdx: number, f0: number, f1: number, frac: number, jointIdx: number, out: THREE.Quaternion): void {
    const base0 = ((clipIdx * NUM_FRAMES + f0) * NUM_JOINTS + jointIdx) * 4;
    const base1 = ((clipIdx * NUM_FRAMES + f1) * NUM_JOINTS + jointIdx) * 4;
    const arr = this.data.clipJointRotations;
    this.qA.set(arr[base0], arr[base0 + 1], arr[base0 + 2], arr[base0 + 3]).normalize();
    this.qB.set(arr[base1], arr[base1 + 1], arr[base1 + 2], arr[base1 + 3]).normalize();
    out.copy(this.qA).slerp(this.qB, frac);
  }

  private applyClipPose(clipIdx: number, t: number, blendAlpha: number, hasPrev: boolean): void {
    const cur = this.sampleClipFrame(clipIdx, t, this.state);

    this.readRootPos(clipIdx, cur.f0, cur.f1, cur.frac, this.vA);
    this.rig.bones[2].position.copy(this.vA);

    for (let j = 0; j < NUM_JOINTS; j++) {
      this.readJointQuat(clipIdx, cur.f0, cur.f1, cur.frac, j, this.rig.bones[j].quaternion);
    }

    // Apply state-specific posture & articulation refinements
    const bones = this.rig.bones;
    if (this.state === 'sit') {
      // Upright feline seated observation posture:
      const breath = Math.sin(t * 1.8) * 0.012;
      const scanYaw = Math.sin(t * 0.55) * 0.14;
      bones[2].position.y = 0.54 + breath * 0.4;
      bones[2].position.z = -0.34;
      this.addLocalRot(2, 0, 0, -0.46);
      this.addLocalRot(3, -0.08 + breath, 0, 0);
      this.addLocalRot(4, -0.08, 0, 0);
      this.addLocalRot(5, -0.06, 0, 0);
      this.addLocalRot(6, 0.68 + breath, 0, 0);
      this.addLocalRot(7, -0.18, scanYaw * 0.4, 0);
      this.addLocalRot(8, -0.10, scanYaw * 0.4, 0);
      this.addLocalRot(9, -0.06, 0, 0);
      this.addLocalRot(10, 0, scanYaw * 0.6, 0.16);

      this.addLocalRot(24, 0.72, 0, 0);
      this.addLocalRot(25, -1.25, 0, 0);
      this.addLocalRot(26, 0.85, 0, 0);
      this.addLocalRot(27, -0.30, 0, 0);
      this.addLocalRot(28, -0.72, 0, 0);
      this.addLocalRot(29, 1.25, 0, 0);
      this.addLocalRot(30, -0.85, 0, 0);
      this.addLocalRot(31, 0.30, 0, 0);

      this.addLocalRot(32, -0.32, 0, 0);
      this.addLocalRot(33, -0.22, Math.sin(t * 1.4) * 0.08, 0);
      for (let ti = 34; ti <= 41; ti++) {
        this.addLocalRot(ti, 0.06, Math.sin(t * 1.8 - (ti - 34) * 0.35) * 0.09, 0);
      }
    } else if (this.state === 'stalk') {
      // Predatory low stealth prowl: Clip 5 + deep shoulder crouch, lowered head, intense forward stare
      bones[2].position.y -= 0.10;
      this.addLocalRot(2, 0, 0, 0.10);
      this.addLocalRot(3, 0.12, 0, 0);
      this.addLocalRot(6, 0.16, 0, 0);
      this.addLocalRot(7, 0.28, 0, 0);
      this.addLocalRot(8, 0.18, 0, 0);
      this.addLocalRot(10, 0, 0, -0.38);
      this.addLocalRot(11, 0.18 + Math.sin(t * 3.0) * 0.04, 0, 0);
      this.addLocalRot(12, -0.35, 0, 0.22);
      this.addLocalRot(13, -0.35, 0, -0.22);
    } else if (this.state === 'eat') {
      // Crouched feeding posture: lowered forequarters, neck & head dipped down to the prey, rhythmic jaw chewing
      const tear = Math.sin(t * 3.2) * 0.08;
      const chew = Math.sin(t * 6.8) * 0.5 + 0.5;
      bones[2].position.y -= 0.14;
      this.addLocalRot(2, 0, 0, 0.18);
      this.addLocalRot(3, 0.16, 0, 0);
      this.addLocalRot(5, 0.22, 0, 0);
      this.addLocalRot(6, 0.28, 0, 0);
      this.addLocalRot(7, 0.42 + tear, Math.sin(t * 1.7) * 0.07, 0);
      this.addLocalRot(8, 0.36 - tear * 0.5, 0, 0);
      this.addLocalRot(9, 0.28, 0, 0);
      this.addLocalRot(10, 0, 0, 0.22 + tear * 0.6);
      this.addLocalRot(11, 0.14 + chew * 0.36, 0, 0);
      this.addLocalRot(15, -0.28, 0, 0);
      this.addLocalRot(16, 0.48, 0, 0);
      this.addLocalRot(20, -0.28, 0, 0);
      this.addLocalRot(21, 0.48, 0, 0);
    } else if (this.state === 'roar' || this.state === 'call') {
      // Ferocious jaguar roar: wide open jaws showing fangs, ears pinned back, chest heaving, tail lashing
      const isRoar = this.state === 'roar';
      const dur = Math.max(0.1, this.data.clipDurations[clipIdx] || 3.43);
      const u = ((t % dur) + dur) % dur / dur;
      const env = Math.sin(Math.min(1, u * 1.15) * Math.PI);
      const vib = Math.sin(t * (isRoar ? 28 : 18)) * 0.025 * env;
      this.addLocalRot(6, (isRoar ? -0.14 : -0.06) * env + vib, 0, 0);
      this.addLocalRot(7, (isRoar ? -0.18 : -0.08) * env, 0, 0);
      this.addLocalRot(10, 0, Math.sin(t * 4.5) * 0.06 * env, (isRoar ? -0.22 : -0.10) * env + vib);
      this.addLocalRot(11, (isRoar ? 0.58 : 0.40) * env + Math.sin(t * 12) * 0.07 * env, 0, 0);
      this.addLocalRot(12, -0.48 * env, 0, 0.28 * env);
      this.addLocalRot(13, -0.48 * env, 0, -0.28 * env);
      for (let ti = 33; ti <= 40; ti++) {
        this.addLocalRot(ti, 0, Math.sin(t * 6.5 - (ti - 33) * 0.4) * 0.14 * env, 0);
      }
    } else if (this.state === 'attack') {
      // Aggressive pounce & claw/bite strike: brisk 0.68s cycle with zero static end-frames
      const dur = 0.68;
      const u = (((t % dur) + dur) % dur) / dur;
      const lunge = Math.sin(u * Math.PI);
      const biteOpen = Math.sin(u * Math.PI);
      const swipeL = Math.sin(Math.min(1, u * 1.25) * Math.PI);
      const swipeR = Math.sin(Math.max(0, Math.min(1, (u - 0.12) * 1.25)) * Math.PI);
      bones[2].position.z += 0.12 * lunge;
      bones[2].position.y += 0.06 * lunge;
      this.addLocalRot(6, -0.14 * lunge, 0, 0);
      this.addLocalRot(7, -0.16 * lunge, 0, 0);
      this.addLocalRot(10, 0, 0, -0.20 * lunge);
      this.addLocalRot(11, 0.65 * biteOpen, 0, 0);
      this.addLocalRot(12, -0.50 * lunge, 0, 0.30 * lunge);
      this.addLocalRot(13, -0.50 * lunge, 0, -0.30 * lunge);
      this.addLocalRot(15, 0.42 * swipeL, 0, -0.14 * swipeL);
      this.addLocalRot(16, -0.28 * swipeL, 0, 0);
      this.addLocalRot(20, 0.38 * swipeR, 0, 0.14 * swipeR);
      this.addLocalRot(21, -0.25 * swipeR, 0, 0);
    }

    if (Math.abs(this.turn) > 0.001 && this.state !== 'death') {
      const bend = THREE.MathUtils.clamp(this.turn, -1, 1) * 0.14;
      const bendJoints = [3, 4, 5, 7, 8, 9];
      for (let k = 0; k < bendJoints.length; k++) {
        const jIdx = bendJoints[k];
        this.qTurn.setFromAxisAngle(this.turnAxis, -bend);
        this.rig.bones[jIdx].quaternion.multiply(this.qTurn);
      }
    }

    // Unified pose-snapshot crossfade + intermediate weight-shift arc
    // Executed AFTER all procedural posture layers so transitions into/out of sit/stalk/eat/roar/attack never snap
    if (hasPrev && blendAlpha < 1.0 && this.hasPoseSnapshot) {
      for (let j = 0; j < NUM_JOINTS; j++) {
        this.qPrev.set(
          this.fromPoseQuats[j * 4 + 0],
          this.fromPoseQuats[j * 4 + 1],
          this.fromPoseQuats[j * 4 + 2],
          this.fromPoseQuats[j * 4 + 3],
        );
        bones[j].quaternion.slerpQuaternions(this.qPrev, bones[j].quaternion, blendAlpha);
      }
      this.vPrev.copy(this.fromRootPos).lerp(bones[2].position, blendAlpha);
      if (JaguarAnimator.isPostureChangeState(this.prevState) || JaguarAnimator.isPostureChangeState(this.state)) {
        const transitionArc = Math.sin(blendAlpha * Math.PI);
        this.vPrev.y -= 0.036 * transitionArc;
      }
      bones[2].position.copy(this.vPrev);
    }

    for (let j = 0; j < NUM_JOINTS; j++) {
      const q = bones[j].quaternion;
      this.lastPoseQuats[j * 4 + 0] = q.x;
      this.lastPoseQuats[j * 4 + 1] = q.y;
      this.lastPoseQuats[j * 4 + 2] = q.z;
      this.lastPoseQuats[j * 4 + 3] = q.w;
    }
    this.lastRootPos.copy(bones[2].position);
    this.hasPoseSnapshot = true;
  }

  update(dt: number, turn?: number): void {
    if (typeof turn === 'number') {
      this.turn = turn;
    }
    const clamped = Math.min(dt, 0.1);
    const targetSpeed = JAGUAR_GAITS[this.state] ? JAGUAR_GAITS[this.state].speed : 0.0;
    this.moveSpeed += (targetSpeed - this.moveSpeed) * Math.min(1.0, clamped * 8.0);

    this.time += clamped;
    this.prevTime += clamped;

    let alpha = 1.0;
    let hasPrev = false;
    if (this.blend < 1.0) {
      this.blend = Math.min(1.0, this.blend + clamped / Math.max(0.001, this.blendDuration));
      const b = this.blend;
      alpha = b * b * b * (b * (b * 6.0 - 15.0) + 10.0);
      hasPrev = true;
    }

    const clipIdx = this.getClipIndex(this.state);
    this.applyClipPose(clipIdx, this.time, alpha, hasPrev);
    this.rig.root.updateMatrixWorld(true);
  }
}

export const JAGUAR_STATES: readonly JaguarState[] = [
  'idle',
  'walk',
  'eat',
  'call',
  'lie',
  'sit',
  'stalk',
  'trot',
  'run',
  'flee',
  'skip',
  'roar',
  'attack',
  'death',
] as const;

export class Jaguar {
  readonly object: THREE.Group;
  readonly mesh: THREE.SkinnedMesh;
  readonly rig: JaguarRig;
  readonly animator: JaguarAnimator;

  constructor(data: JaguarUnpackedData, texture: THREE.Texture, options: JaguarOptions = {}) {
    const scale = options.scale ?? 0.92;
    const castShadow = options.castShadow ?? true;
    const receiveShadow = options.receiveShadow ?? true;

    this.object = new THREE.Group();
    this.object.name = 'Jaguar';

    this.rig = new JaguarRig(data);
    this.object.add(this.rig.root);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
    geom.setAttribute('skinIndex', new THREE.Uint8BufferAttribute(data.skinIndices, 4));
    geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(data.skinWeights, 4));
    geom.setIndex(new THREE.BufferAttribute(data.indices, 1));

    texture.flipY = false;
    texture.needsUpdate = true;

    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.76,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.SkinnedMesh(geom, mat);
    this.mesh.castShadow = castShadow;
    this.mesh.receiveShadow = receiveShadow;
    this.mesh.frustumCulled = false;

    this.mesh.bind(this.rig.skeleton, new THREE.Matrix4());
    this.object.add(this.mesh);

    this.object.scale.setScalar(scale);
    this.animator = new JaguarAnimator(this.rig, data);
  }

  get state(): JaguarState {
    return this.animator.state;
  }

  setState(state: JaguarState): void {
    this.animator.setState(state);
  }

  restartState(state: JaguarState): void {
    this.animator.restartState(state);
  }

  setNormalizedPhase(normalizedPhase: number): void {
    this.animator.setNormalizedPhase(normalizedPhase);
  }

  getState(): JaguarState {
    return this.animator.state;
  }

  set moveSpeed(v: number) {
    this.animator.moveSpeed = v;
  }

  get moveSpeed(): number {
    return this.animator.moveSpeed;
  }

  set turn(v: number) {
    this.animator.turn = v;
  }

  get turn(): number {
    return this.animator.turn;
  }

  update(dt: number, turn?: number): void {
    this.animator.update(dt, turn);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((m) => m.dispose());
    } else {
      this.mesh.material.dispose();
    }
  }
}

// ============================================================================
// Embedded Self-Contained Jaguar GLB Geometry, 42-Joint Skeleton, Texture & 13 Animations
// ============================================================================

let cachedTexture: THREE.Texture | null = null;

/**
 * Summary: Builds a Jaguar from the loaded GLB data.
 * @param options Scale, shadows, tint and wireframe.
 * @returns A ready, animatable Jaguar.
 * @throws InfrastructureCorruptedException when the model was not loaded yet (see loadAnimalModel).
 */
export function createReadyJaguar(options: JaguarOptions = {}): Jaguar {
  const asset = getLoadedAnimalModel('jaguar');
  cachedTexture ??= createAnimalTexture(asset, { colorSpace: THREE.SRGBColorSpace });
  return new Jaguar(requireClipRig(asset), cachedTexture, options);
}

