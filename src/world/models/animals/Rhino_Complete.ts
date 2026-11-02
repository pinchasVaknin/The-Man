// ============================================================================
// MODULE: World / Models / Animals / Rhino (GLB-backed model)
// DESIGN: Rig, skinning and clip animator over data decoded from the model's GLB file
//         (public/models/animals/rhino.glb, loaded by animalModelAssets)
// SUMMARY: Builds and animates the Rhino model. Imported only through the
//          ../Rhino.ts facade; gameplay and AI live in the wildlife system.
// ============================================================================

import * as THREE from 'three';
import {
  createAnimalTexture,
  getLoadedAnimalModel,
  requireClipRig,
  type IClipRigModelData,
} from '../animalModelAssets';

export type RhinoState =
  | 'idle'
  | 'walk'
  | 'eat'
  | 'call'
  | 'lie'
  | 'sit'
  | 'trot'
  | 'run'
  | 'flee'
  | 'skip'
  | 'roar'
  | 'attack'
  | 'death';

export interface RhinoOptions {
  scale?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  tintHex?: number;
  wireframe?: boolean;
}

/** Summary: Decoded model data (see IClipRigModelData). */
export type RhinoUnpackedData = IClipRigModelData;

export const RHINO_GAITS: Record<RhinoState, { speed: number }> = {
  idle:   { speed: 0.0 },
  walk:   { speed: 1.35 },
  eat:    { speed: 0.0 },
  call:   { speed: 0.0 },
  lie:    { speed: 0.0 },
  sit:    { speed: 0.0 },
  trot:   { speed: 3.1 },
  run:    { speed: 6.2 },
  flee:   { speed: 8.4 },
  skip:   { speed: 4.6 },
  roar:   { speed: 0.0 },
  attack: { speed: 0.0 },
  death:  { speed: 0.0 },
};

const CLIP_ORDER: RhinoState[] = [
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

export const RHINO_STATES: readonly RhinoState[] = [
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
] as const;

const NUM_JOINTS = 43;
const NUM_CLIPS = 13;
const NUM_FRAMES = 24;

export class RhinoRig {
  readonly root: THREE.Bone;
  readonly bones: THREE.Bone[] = [];
  readonly boneInverses: THREE.Matrix4[] = [];
  readonly skeleton: THREE.Skeleton;
  private readonly restTranslations: Float32Array;
  private readonly restRotations: Float32Array;

  constructor(data: RhinoUnpackedData) {
    this.restTranslations = data.restTranslations;
    this.restRotations = data.restRotations;

    for (let j = 0; j < NUM_JOINTS; j++) {
      const b = new THREE.Bone();
      b.name = 'RhinoJoint_' + j;
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

  resetPose(): void {
    this.resetToRest();
  }
}

export class RhinoAnimator {
  readonly rig: RhinoRig;
  readonly data: RhinoUnpackedData;
  state: RhinoState = 'walk';
  prevState: RhinoState = 'walk';
  blend = 1.0;
  blendDuration = 0.44;
  time = 0;
  prevTime = 0;
  moveSpeed = 1.35;
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
  private turnAxis = new THREE.Vector3(0, 1, 0);

  private static isLocomotionState(s: RhinoState): boolean {
    return s === 'walk' || s === 'trot' || s === 'run' || s === 'flee' || s === 'skip';
  }

  private static isUpperBodyAttackJoint(j: number): boolean {
    return j >= 8 && j <= 19;
  }

  private computeBlendDuration(from: RhinoState, to: RhinoState): number {
    if (to === 'attack') return 0.28;
    if (to === 'death') return 0.36;
    if (from === 'lie' || to === 'lie' || from === 'sit' || to === 'sit') return 0.56;
    if (from === 'roar' || to === 'roar' || from === 'call' || to === 'call' || from === 'eat' || to === 'eat') {
      return 0.48;
    }
    if (RhinoAnimator.isLocomotionState(from) && RhinoAnimator.isLocomotionState(to)) {
      return 0.42;
    }
    return 0.44;
  }

  constructor(rig: RhinoRig, data: RhinoUnpackedData) {
    this.rig = rig;
    this.data = data;
    this.applyClipPose(this.getClipIndex(this.state), 0, 1.0, false);
  }

  setState(next: RhinoState): void {
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
      this.fromRootPos.copy(this.rig.bones[4].position);
      this.hasPoseSnapshot = true;
    }

    const prev = this.state;
    this.prevState = prev;
    this.prevTime = this.time;
    this.blendDuration = this.computeBlendDuration(prev, next);

    if (RhinoAnimator.isLocomotionState(prev) && RhinoAnimator.isLocomotionState(next)) {
      const oldDur = Math.max(0.1, this.data.clipDurations[this.getClipIndex(prev)]);
      const newDur = Math.max(0.1, this.data.clipDurations[this.getClipIndex(next)]);
      const normPhase = (((this.time % oldDur) + oldDur) % oldDur) / oldDur;
      this.time = normPhase * newDur;
    } else if (next === 'call' || next === 'roar' || next === 'attack' || next === 'death' || next === 'lie' || next === 'sit' || next === 'eat') {
      this.time = 0.0;
    }

    this.state = next;
    this.blend = 0.0;
    if (next !== 'attack') {
      this.moveSpeed = RHINO_GAITS[next] ? RHINO_GAITS[next].speed : 0.0;
    }
  }

  restartState(next: RhinoState): void {
    this.prevState = next;
    this.state = next;
    this.time = 0.0;
    this.blend = 1.0;
    this.moveSpeed = RHINO_GAITS[next] ? RHINO_GAITS[next].speed : 0.0;
    this.applyClipPose(this.getClipIndex(next), 0, 1.0, false);
    this.rig.root.updateMatrixWorld(true);
  }

  setNormalizedPhase(uNorm: number): void {
    const clipIdx = this.getClipIndex(this.state);
    const dur = Math.max(0.1, this.data.clipDurations[clipIdx]);
    const u = ((uNorm % 1) + 1) % 1;
    this.time = u * dur;
    this.blend = 1.0;
    this.applyClipPose(clipIdx, this.time, 1.0, false);
    this.rig.root.updateMatrixWorld(true);
  }

  private getClipIndex(st: RhinoState): number {
    const idx = CLIP_ORDER.indexOf(st);
    return idx >= 0 ? idx : 0;
  }

  private sampleClipFrame(clipIdx: number, t: number, st: RhinoState) {
    const dur = Math.max(0.1, this.data.clipDurations[clipIdx]);
    let u = st === 'death' && !this.loopDeath ? Math.min(1.0, Math.max(0.0, t / dur)) : (t % dur) / dur;
    if (u < 0) u += 1.0;
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
    const isRunningAttack = this.state === 'attack' && this.moveSpeed > 1.25;
    const runClipIdx = this.getClipIndex('run');
    const runSample = isRunningAttack ? this.sampleClipFrame(runClipIdx, t * 1.15, 'run') : cur;

    if (isRunningAttack) {
      this.readRootPos(runClipIdx, runSample.f0, runSample.f1, runSample.frac, this.vA);
    } else {
      this.readRootPos(clipIdx, cur.f0, cur.f1, cur.frac, this.vA);
    }
    this.rig.bones[4].position.copy(this.vA);

    for (let j = 0; j < NUM_JOINTS; j++) {
      if (isRunningAttack && !RhinoAnimator.isUpperBodyAttackJoint(j)) {
        this.readJointQuat(runClipIdx, runSample.f0, runSample.f1, runSample.frac, j, this.rig.bones[j].quaternion);
      } else {
        this.readJointQuat(clipIdx, cur.f0, cur.f1, cur.frac, j, this.rig.bones[j].quaternion);
      }
    }

    if (Math.abs(this.turn) > 0.001 && this.state !== 'death') {
      const bend = THREE.MathUtils.clamp(this.turn, -1, 1) * 0.16;
      const bendJoints = [6, 7, 8, 9, 10];
      for (let k = 0; k < bendJoints.length; k++) {
        const jIdx = bendJoints[k];
        this.qTurn.setFromAxisAngle(this.turnAxis, -bend);
        this.rig.bones[jIdx].quaternion.multiply(this.qTurn);
      }
    }

    if (hasPrev && blendAlpha < 1.0 && this.hasPoseSnapshot) {
      this.rig.bones[4].position.lerpVectors(this.fromRootPos, this.rig.bones[4].position, blendAlpha);
      for (let j = 0; j < NUM_JOINTS; j++) {
        this.qPrev.set(
          this.fromPoseQuats[j * 4 + 0],
          this.fromPoseQuats[j * 4 + 1],
          this.fromPoseQuats[j * 4 + 2],
          this.fromPoseQuats[j * 4 + 3]
        );
        this.rig.bones[j].quaternion.slerpQuaternions(this.qPrev, this.rig.bones[j].quaternion, blendAlpha);
      }
    }

    for (let j = 0; j < NUM_JOINTS; j++) {
      const q = this.rig.bones[j].quaternion;
      this.lastPoseQuats[j * 4 + 0] = q.x;
      this.lastPoseQuats[j * 4 + 1] = q.y;
      this.lastPoseQuats[j * 4 + 2] = q.z;
      this.lastPoseQuats[j * 4 + 3] = q.w;
    }
    this.lastRootPos.copy(this.rig.bones[4].position);
    this.hasPoseSnapshot = true;
  }

  update(dt: number, turn?: number): void {
    if (typeof turn === 'number') {
      this.turn = turn;
    }
    const clamped = Math.min(dt, 0.1);
    if (this.state !== 'attack') {
      const targetSpeed = RHINO_GAITS[this.state] ? RHINO_GAITS[this.state].speed : 0.0;
      this.moveSpeed += (targetSpeed - this.moveSpeed) * Math.min(1.0, clamped * 8.0);
    }

    this.time += clamped;
    this.prevTime += clamped;

    let alpha = 1.0;
    let hasPrev = false;
    if (this.blend < 1.0) {
      this.blend = Math.min(1.0, this.blend + clamped / this.blendDuration);
      alpha = this.blend * this.blend * (3.0 - 2.0 * this.blend);
      hasPrev = true;
    }

    const clipIdx = this.getClipIndex(this.state);
    this.applyClipPose(clipIdx, this.time, alpha, hasPrev);
    this.rig.root.updateMatrixWorld(true);
  }
}

export class Rhino {
  readonly object: THREE.Group;
  readonly mesh: THREE.SkinnedMesh;
  readonly rig: RhinoRig;
  readonly animator: RhinoAnimator;

  constructor(data: RhinoUnpackedData, texture: THREE.Texture, options: RhinoOptions = {}) {
    const scale = options.scale ?? 0.0352;
    const castShadow = options.castShadow ?? true;
    const receiveShadow = options.receiveShadow ?? true;

    this.object = new THREE.Group();
    this.object.name = 'Rhino';

    this.rig = new RhinoRig(data);
    this.object.add(this.rig.root);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
    geom.setAttribute('skinIndex', new THREE.Uint8BufferAttribute(data.skinIndices, 4));
    geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(data.skinWeights, 4));
    geom.setIndex(new THREE.BufferAttribute(data.indices, 1));

    texture.flipY = false;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;

    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      color: options.tintHex ?? 0xffffff,
      roughness: 0.82,
      metalness: 0.05,
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
    this.animator = new RhinoAnimator(this.rig, data);
  }

  get state(): RhinoState {
    return this.animator.state;
  }

  setState(state: RhinoState): void {
    this.animator.setState(state);
  }

  restartState(state: RhinoState): void {
    this.animator.restartState(state);
  }

  setNormalizedPhase(normalizedPhase: number): void {
    this.animator.setNormalizedPhase(normalizedPhase);
  }

  getState(): RhinoState {
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
// Embedded Self-Contained Rhino GLB Geometry, 43-Joint Skeleton, Texture & 13 Animations
// ============================================================================

let cachedTexture: THREE.Texture | null = null;

/**
 * Summary: Builds a Rhino from the loaded GLB data.
 * @param options Scale, shadows, tint and wireframe.
 * @returns A ready, animatable Rhino.
 * @throws InfrastructureCorruptedException when the model was not loaded yet (see loadAnimalModel).
 */
export function createReadyRhino(options: RhinoOptions = {}): Rhino {
  const asset = getLoadedAnimalModel('rhino');
  cachedTexture ??= createAnimalTexture(asset, { colorSpace: THREE.SRGBColorSpace, wrap: THREE.RepeatWrapping });
  return new Rhino(requireClipRig(asset), cachedTexture, options);
}

