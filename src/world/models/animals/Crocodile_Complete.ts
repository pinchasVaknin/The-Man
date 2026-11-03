// ============================================================================
// MODULE: World / Models / Animals / Crocodile (GLB-backed model)
// DESIGN: Rig, skinning and clip animator over data decoded from the model's GLB file
//         (public/models/animals/crocodile.glb, loaded by animalModelAssets)
// SUMMARY: Builds and animates the Crocodile model. Imported only through the
//          ../Crocodile.ts facade; gameplay and AI live in the wildlife system.
// ============================================================================

import * as THREE from 'three';
import {
  createAnimalTexture,
  getLoadedAnimalModel,
  requireClipRig,
  type IClipRigModelData,
} from '../animalModelAssets';

export type CrocodileState =
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

export interface CrocodileOptions {
  scale?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  tintHex?: number;
  wireframe?: boolean;
}

/** Summary: Decoded model data (see IClipRigModelData). */
export type CrocodileUnpackedData = IClipRigModelData;

export const CROCODILE_GAITS: Record<CrocodileState, { speed: number }> = {
  idle:   { speed: 0.0 },
  walk:   { speed: 1.15 },
  eat:    { speed: 0.0 },
  call:   { speed: 0.0 },
  lie:    { speed: 0.0 },
  sit:    { speed: 0.0 },
  trot:   { speed: 2.9 },
  run:    { speed: 5.4 },
  flee:   { speed: 7.8 },
  skip:   { speed: 4.2 },
  roar:   { speed: 0.0 },
  attack: { speed: 0.0 },
  death:  { speed: 0.0 },
};

export const CROCODILE_STATES: CrocodileState[] = [
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

const CLIP_ORDER: CrocodileState[] = CROCODILE_STATES;

const NUM_JOINTS = 49;
const NUM_CLIPS = 13;
const NUM_FRAMES = 24;

export class CrocodileRig {
  readonly root: THREE.Bone;
  readonly bones: THREE.Bone[] = [];
  readonly boneInverses: THREE.Matrix4[] = [];
  readonly skeleton: THREE.Skeleton;

  constructor(data: CrocodileUnpackedData) {
    for (let j = 0; j < NUM_JOINTS; j++) {
      const b = new THREE.Bone();
      b.name = 'CrocJoint_' + j;
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
    this.restData = data;
  }

  private readonly restData: CrocodileUnpackedData;

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
    }
    this.root.updateMatrixWorld(true);
  }
}

export class CrocodileAnimator {
  readonly rig: CrocodileRig;
  readonly data: CrocodileUnpackedData;
  state: CrocodileState = 'idle';
  prevState: CrocodileState = 'idle';
  blend = 1.0;
  blendDuration = 0.44;
  time = 0;
  prevTime = 0;
  moveSpeed = 0.0;
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

  private static isLocomotionState(s: CrocodileState): boolean {
    return s === 'walk' || s === 'trot' || s === 'run' || s === 'flee' || s === 'skip';
  }

  private computeBlendDuration(from: CrocodileState, to: CrocodileState): number {
    if (to === 'attack' || from === 'attack') return 0.24;
    if (to === 'death') return 0.38;
    if (from === 'lie' || to === 'lie' || from === 'sit' || to === 'sit' || from === 'roar' || to === 'roar' || from === 'call' || to === 'call' || from === 'eat' || to === 'eat') {
      return 0.52;
    }
    if (CrocodileAnimator.isLocomotionState(from) && CrocodileAnimator.isLocomotionState(to)) {
      return 0.42;
    }
    return 0.45;
  }

  constructor(rig: CrocodileRig, data: CrocodileUnpackedData) {
    this.rig = rig;
    this.data = data;
    this.applyClipPose(this.getClipIndex(this.state), 0, 1.0, false);
  }

  setState(next: CrocodileState): void {
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
      this.fromRootPos.copy(this.rig.bones[1].position);
      this.hasPoseSnapshot = true;
    }

    const prev = this.state;
    this.prevState = prev;
    this.prevTime = this.time;
    this.blendDuration = this.computeBlendDuration(prev, next);

    if (CrocodileAnimator.isLocomotionState(prev) && CrocodileAnimator.isLocomotionState(next)) {
      const oldDur = Math.max(0.1, this.data.clipDurations[this.getClipIndex(prev)]);
      const newDur = Math.max(0.1, this.data.clipDurations[this.getClipIndex(next)]);
      const normPhase = (((this.time % oldDur) + oldDur) % oldDur) / oldDur;
      this.time = normPhase * newDur;
    } else if (next === 'call' || next === 'roar' || next === 'attack' || next === 'death' || next === 'lie' || next === 'sit' || next === 'eat') {
      this.time = 0.0;
    }

    this.state = next;
    this.blend = 0.0;
    this.moveSpeed = CROCODILE_GAITS[next] ? CROCODILE_GAITS[next].speed : 0.0;
  }

  restartState(next: CrocodileState): void {
    this.prevState = next;
    this.state = next;
    this.time = 0.0;
    this.blend = 1.0;
    this.moveSpeed = CROCODILE_GAITS[next] ? CROCODILE_GAITS[next].speed : 0.0;
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

  private getClipIndex(st: CrocodileState): number {
    const idx = CLIP_ORDER.indexOf(st);
    return idx >= 0 ? idx : 0;
  }

  private sampleClipFrame(clipIdx: number, t: number, st: CrocodileState) {
    const dur = Math.max(0.1, this.data.clipDurations[clipIdx]);
    let u =
      st === 'death' && !this.loopDeath
        ? Math.min(1.0, Math.max(0.0, t / dur))
        : st === 'sit' || st === 'lie'
          ? Math.min(0.92, Math.max(0.0, t / dur))
          : (t % dur) / dur;
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
    this.rig.bones[1].position.copy(this.vA);

    for (let j = 0; j < NUM_JOINTS; j++) {
      this.readJointQuat(clipIdx, cur.f0, cur.f1, cur.frac, j, this.rig.bones[j].quaternion);
    }

    // Upright snapping bite & tail whip during 'attack' (no upside-down barrel roll)
    if (this.state === 'attack') {
      const snapEnv = Math.sin(cur.u * Math.PI);
      const headThrash = Math.sin(cur.u * Math.PI * 2.0) * 0.16 * snapEnv * blendAlpha;
      const tailWhip = -Math.sin(cur.u * Math.PI * 2.0) * 0.18 * snapEnv * blendAlpha;
      const headJoints = [26, 27];
      for (let k = 0; k < headJoints.length; k++) {
        this.qTurn.setFromAxisAngle(this.turnAxis, headThrash);
        this.rig.bones[headJoints[k]].quaternion.multiply(this.qTurn);
      }
      const tailJoints = [7, 10, 13];
      for (let k = 0; k < tailJoints.length; k++) {
        this.qTurn.setFromAxisAngle(this.turnAxis, tailWhip);
        this.rig.bones[tailJoints[k]].quaternion.multiply(this.qTurn);
      }
    }

    if (Math.abs(this.turn) > 0.001 && this.state !== 'death') {
      const bend = THREE.MathUtils.clamp(this.turn, -1, 1) * 0.12;
      const bendJoints = [26, 27, 33, 34, 7, 10, 13];
      for (let k = 0; k < bendJoints.length; k++) {
        const jIdx = bendJoints[k];
        this.qTurn.setFromAxisAngle(this.turnAxis, k < 4 ? -bend : bend);
        this.rig.bones[jIdx].quaternion.multiply(this.qTurn);
      }
    }

    // Unified pose-snapshot crossfade
    if (hasPrev && blendAlpha < 1.0 && this.hasPoseSnapshot) {
      for (let j = 0; j < NUM_JOINTS; j++) {
        this.qPrev.set(
          this.fromPoseQuats[j * 4 + 0],
          this.fromPoseQuats[j * 4 + 1],
          this.fromPoseQuats[j * 4 + 2],
          this.fromPoseQuats[j * 4 + 3],
        );
        this.rig.bones[j].quaternion.slerpQuaternions(this.qPrev, this.rig.bones[j].quaternion, blendAlpha);
      }
      this.vPrev.copy(this.fromRootPos).lerp(this.rig.bones[1].position, blendAlpha);
      this.rig.bones[1].position.copy(this.vPrev);
    }

    for (let j = 0; j < NUM_JOINTS; j++) {
      const q = this.rig.bones[j].quaternion;
      this.lastPoseQuats[j * 4 + 0] = q.x;
      this.lastPoseQuats[j * 4 + 1] = q.y;
      this.lastPoseQuats[j * 4 + 2] = q.z;
      this.lastPoseQuats[j * 4 + 3] = q.w;
    }
    this.lastRootPos.copy(this.rig.bones[1].position);
    this.hasPoseSnapshot = true;
  }

  update(dt: number, turn?: number): void {
    if (typeof turn === 'number') {
      this.turn = turn;
    }
    const clamped = Math.min(dt, 0.1);
    const targetSpeed = CROCODILE_GAITS[this.state] ? CROCODILE_GAITS[this.state].speed : 0.0;
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

export class Crocodile {
  readonly object: THREE.Group;
  readonly mesh: THREE.SkinnedMesh;
  readonly rig: CrocodileRig;
  readonly animator: CrocodileAnimator;

  constructor(data: CrocodileUnpackedData, texture: THREE.Texture, options: CrocodileOptions = {}) {
    const scale = options.scale ?? 0.78;
    const castShadow = options.castShadow ?? true;
    const receiveShadow = options.receiveShadow ?? true;

    this.object = new THREE.Group();
    this.object.name = 'Crocodile';

    this.rig = new CrocodileRig(data);
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
      roughness: 0.68,
      metalness: 0.08,
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
    this.animator = new CrocodileAnimator(this.rig, data);
  }

  get state(): CrocodileState {
    return this.animator.state;
  }

  setState(state: CrocodileState): void {
    this.animator.setState(state);
  }

  getState(): CrocodileState {
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
// Embedded Self-Contained Nile Crocodile GLB Geometry, 49-Joint Skeleton, Texture & 13 Animations (incl. Death Roll & Open-Mouth Shore Basking)
// ============================================================================

let cachedTexture: THREE.Texture | null = null;

/**
 * Summary: Builds a Crocodile from the loaded GLB data.
 * @param options Scale, shadows, tint and wireframe.
 * @returns A ready, animatable Crocodile.
 * @throws InfrastructureCorruptedException when the model was not loaded yet (see loadAnimalModel).
 */
export function createReadyCrocodile(options: CrocodileOptions = {}): Crocodile {
  const asset = getLoadedAnimalModel('crocodile');
  cachedTexture ??= createAnimalTexture(asset, { colorSpace: THREE.SRGBColorSpace, wrap: THREE.RepeatWrapping });
  return new Crocodile(requireClipRig(asset), cachedTexture, options);
}
