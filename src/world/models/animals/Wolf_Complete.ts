// ============================================================================
// MODULE: World / Models / Animals / Wolf (GLB-backed model)
// DESIGN: Rig, skinning and clip animator over data decoded from the model's GLB file
//         (public/models/animals/wolf.glb, loaded by animalModelAssets)
// SUMMARY: Builds and animates the Wolf model. Imported only through the
//          ../Wolf.ts facade; gameplay and AI live in the wildlife system.
// ============================================================================

import * as THREE from 'three';
import {
  createAnimalTexture,
  getLoadedAnimalModel,
  requireClipRig,
  type IClipRigModelData,
} from '../animalModelAssets';

export type WolfState =
  | 'idle'
  | 'walk'
  | 'eat'
  | 'call'
  | 'howl'
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

export interface WolfOptions {
  scale?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  tintHex?: number;
  wireframe?: boolean;
}

/** Summary: Decoded model data (see IClipRigModelData). */
export type WolfUnpackedData = IClipRigModelData;

export const WOLF_GAITS: Record<WolfState, { speed: number }> = {
  idle:   { speed: 0.0 },
  walk:   { speed: 1.55 },
  eat:    { speed: 0.0 },
  call:   { speed: 0.0 },
  howl:   { speed: 0.0 },
  lie:    { speed: 0.0 },
  sit:    { speed: 0.0 },
  stalk:  { speed: 0.90 },
  trot:   { speed: 3.5 },
  run:    { speed: 7.2 },
  flee:   { speed: 9.6 },
  skip:   { speed: 6.0 },
  roar:   { speed: 0.0 },
  attack: { speed: 1.45 },
  death:  { speed: 0.0 },
};

export const WOLF_STATES: readonly WolfState[] = [
  'idle',
  'walk',
  'eat',
  'call',
  'howl',
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

const CLIP_ORDER: WolfState[] = [
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

const NUM_JOINTS = 59;
const NUM_CLIPS = 13;
const NUM_FRAMES = 24;

export class WolfRig {
  readonly root: THREE.Bone;
  readonly bones: THREE.Bone[] = [];
  readonly boneInverses: THREE.Matrix4[] = [];
  readonly skeleton: THREE.Skeleton;
  private readonly restData: WolfUnpackedData;

  constructor(data: WolfUnpackedData) {
    this.restData = data;
    for (let j = 0; j < NUM_JOINTS; j++) {
      const b = new THREE.Bone();
      b.name = 'WolfJoint_' + j;
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
    const data = this.restData;
    for (let j = 0; j < NUM_JOINTS; j++) {
      const b = this.bones[j];
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
    }
    this.root.updateMatrixWorld(true);
  }

  resetPose(): void {
    this.resetToRest();
  }
}

export class WolfAnimator {
  readonly rig: WolfRig;
  readonly data: WolfUnpackedData;
  state: WolfState = 'walk';
  prevState: WolfState = 'walk';
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

  private static isLocomotionState(s: WolfState): boolean {
    return s === 'walk' || s === 'trot' || s === 'run' || s === 'flee' || s === 'stalk' || s === 'skip';
  }

  private static isPostureChangeState(s: WolfState): boolean {
    return s === 'lie' || s === 'sit' || s === 'stalk' || s === 'eat' || s === 'roar' || s === 'call' || s === 'howl';
  }

  private computeBlendDuration(from: WolfState, to: WolfState): number {
    if (to === 'attack') return 0.30;
    if (to === 'death') return 0.36;
    if (from === 'lie' || to === 'lie' || from === 'sit' || to === 'sit') return 0.54;
    if (from === 'howl' || to === 'howl' || from === 'call' || to === 'call' || from === 'roar' || to === 'roar' || from === 'eat' || to === 'eat' || from === 'stalk' || to === 'stalk') {
      return 0.46;
    }
    if (WolfAnimator.isLocomotionState(from) && WolfAnimator.isLocomotionState(to)) {
      return 0.40;
    }
    return 0.42;
  }

  constructor(rig: WolfRig, data: WolfUnpackedData) {
    this.rig = rig;
    this.data = data;
    this.applyClipPose(this.getClipIndex(this.state), 0, 1.0, false);
  }

  setState(next: WolfState): void {
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

    if (WolfAnimator.isLocomotionState(prev) && WolfAnimator.isLocomotionState(next)) {
      const oldDur = Math.max(0.1, this.data.clipDurations[this.getClipIndex(prev)]);
      const newDur = Math.max(0.1, this.data.clipDurations[this.getClipIndex(next)]);
      const normPhase = (((this.time % oldDur) + oldDur) % oldDur) / oldDur;
      this.time = normPhase * newDur;
    } else if (next === 'call' || next === 'howl' || next === 'roar' || next === 'attack' || next === 'death' || next === 'lie' || next === 'sit' || next === 'eat') {
      this.time = 0.0;
    }

    this.state = next;
    this.blend = 0.0;
    this.moveSpeed = WOLF_GAITS[next] ? WOLF_GAITS[next].speed : 0.0;
  }

  restartState(next: WolfState): void {
    this.prevState = next;
    this.state = next;
    this.blend = 1.0;
    this.time = 0.0;
    this.prevTime = 0.0;
    this.moveSpeed = WOLF_GAITS[next] ? WOLF_GAITS[next].speed : 0.0;
    this.applyClipPose(this.getClipIndex(next), 0.0, 1.0, false);
    this.rig.root.updateMatrixWorld(true);
  }

  setNormalizedPhase(normalizedPhase: number): void {
    const clipIdx = this.getClipIndex(this.state);
    const dur = Math.max(0.1, this.data.clipDurations[clipIdx]);
    this.blend = 1.0;
    const u = ((normalizedPhase % 1) + 1) % 1;
    this.time = u * dur;
    this.applyClipPose(clipIdx, this.time, 1.0, false);
    this.rig.root.updateMatrixWorld(true);
  }

  private getClipIndex(st: WolfState): number {
    if (st === 'howl') return 3; // Clip 3 ('call') is the skyward wolf howl
    if (st === 'sit') return 0;  // Seated posture layered over base idle
    if (st === 'stalk') return 5; // Clip 5 is the low stealth prowl
    const idx = CLIP_ORDER.indexOf(st);
    return idx >= 0 ? idx : 0;
  }

  private sampleClipFrame(clipIdx: number, t: number, st: WolfState) {
    const dur = Math.max(0.1, this.data.clipDurations[clipIdx]);
    let u = st === 'death' && !this.loopDeath ? Math.min(1.0, Math.max(0.0, t / dur)) : (t % dur) / dur;
    if (u < 0) u += 1.0;
    const pos = u * (NUM_FRAMES - 1);
    const f0 = Math.min(NUM_FRAMES - 1, Math.floor(pos));
    const f1 = Math.min(NUM_FRAMES - 1, f0 + 1);
    const frac = pos - f0;
    return { f0, f1, frac, u };
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

    const bones = this.rig.bones;
    if (this.state === 'sit') {
      // Canine seated observation posture: lower pelvis, fold hind legs, keep chest & head upright
      const breath = Math.sin(t * 2.0) * 0.012;
      const scanYaw = Math.sin(t * 0.65) * 0.14;
      bones[2].position.y = 0.56 + breath * 0.4;
      bones[2].position.z = -0.32;
      this.addLocalRot(2, 0, 0, -0.44);
      this.addLocalRot(3, -0.08 + breath, 0, 0);
      this.addLocalRot(4, -0.08, 0, 0);
      this.addLocalRot(5, 0.58 + breath, 0, 0);
      this.addLocalRot(6, -0.16, scanYaw * 0.4, 0);
      this.addLocalRot(8, -0.08, scanYaw * 0.4, 0);
      this.addLocalRot(9, 0, scanYaw * 0.5, 0.14);
      // Fold hind legs (49..52 R, 54..57 L)
      this.addLocalRot(49, -0.68, 0, 0);
      this.addLocalRot(50, 1.18, 0, 0);
      this.addLocalRot(51, -0.78, 0, 0);
      this.addLocalRot(54, 0.68, 0, 0);
      this.addLocalRot(55, -1.18, 0, 0);
      this.addLocalRot(56, 0.78, 0, 0);
    } else if (this.state === 'stalk') {
      // Low stealth prowl: crouch body & shoulders, intense forward head gaze
      bones[2].position.y -= 0.09;
      this.addLocalRot(5, 0.14, 0, 0);
      this.addLocalRot(6, 0.24, 0, 0);
      this.addLocalRot(9, 0, 0, -0.28);
    } else if (this.state === 'attack') {
      // Controlled forward bite lunge during attack
      const lunge = Math.sin(cur.u * Math.PI);
      bones[2].position.z += 0.12 * lunge;
      bones[2].position.y += 0.04 * lunge;
    }

    if (Math.abs(this.turn) > 0.001 && this.state !== 'death') {
      const bend = THREE.MathUtils.clamp(this.turn, -1, 1) * 0.14;
      const bendJoints = [3, 4, 5, 6, 7, 8, 9];
      for (let k = 0; k < bendJoints.length; k++) {
        const jIdx = bendJoints[k];
        this.qTurn.setFromAxisAngle(this.turnAxis, -bend);
        this.rig.bones[jIdx].quaternion.multiply(this.qTurn);
      }
    }

    // Unified pose-snapshot crossfade + intermediate weight-shift arc
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
      if (WolfAnimator.isPostureChangeState(this.prevState) || WolfAnimator.isPostureChangeState(this.state)) {
        const transitionArc = Math.sin(blendAlpha * Math.PI);
        this.vPrev.y -= 0.032 * transitionArc;
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
    const targetSpeed = WOLF_GAITS[this.state] ? WOLF_GAITS[this.state].speed : 0.0;
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

export class Wolf {
  readonly object: THREE.Group;
  readonly mesh: THREE.SkinnedMesh;
  readonly rig: WolfRig;
  readonly animator: WolfAnimator;

  constructor(data: WolfUnpackedData, texture: THREE.Texture, options: WolfOptions = {}) {
    const scale = options.scale ?? 0.90;
    const castShadow = options.castShadow ?? true;
    const receiveShadow = options.receiveShadow ?? true;

    this.object = new THREE.Group();
    this.object.name = 'Wolf';

    this.rig = new WolfRig(data);
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
      color: options.tintHex ?? 0xffffff,
      roughness: 0.80,
      metalness: 0.04,
      wireframe: options.wireframe ?? false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.SkinnedMesh(geom, mat);
    this.mesh.castShadow = castShadow;
    this.mesh.receiveShadow = receiveShadow;
    this.mesh.frustumCulled = false;

    this.mesh.bind(this.rig.skeleton, new THREE.Matrix4());
    this.object.add(this.mesh);

    this.object.scale.setScalar(scale);
    this.animator = new WolfAnimator(this.rig, data);
  }

  get state(): WolfState {
    return this.animator.state;
  }

  setState(state: WolfState): void {
    this.animator.setState(state);
  }

  getState(): WolfState {
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
// Embedded Self-Contained Realistic Wolf GLB Geometry, 59-Joint Skeleton, Texture & 13 Animations (incl. Howl, Stalk, Bite Attack, Lie & 3-Stage Death)
// ============================================================================

let cachedTexture: THREE.Texture | null = null;

/**
 * Summary: Builds a Wolf from the loaded GLB data.
 * @param options Scale, shadows, tint and wireframe.
 * @returns A ready, animatable Wolf.
 * @throws InfrastructureCorruptedException when the model was not loaded yet (see loadAnimalModel).
 */
export function createReadyWolf(options: WolfOptions = {}): Wolf {
  const asset = getLoadedAnimalModel('wolf');
  cachedTexture ??= createAnimalTexture(asset, { colorSpace: THREE.SRGBColorSpace });
  return new Wolf(requireClipRig(asset), cachedTexture, options);
}

