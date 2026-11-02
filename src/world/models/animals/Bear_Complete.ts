// ============================================================================
// MODULE: World / Models / Animals / Bear (GLB-backed model)
// DESIGN: Rig, skinning and clip animator over data decoded from the model's GLB file
//         (public/models/animals/bear.glb, loaded by animalModelAssets)
// SUMMARY: Builds and animates the Bear model. Imported only through the
//          ../Bear.ts facade; gameplay and AI live in the wildlife system.
// ============================================================================

import * as THREE from 'three';
import {
  createAnimalTexture,
  getLoadedAnimalModel,
  requireClipRig,
  type IClipRigModelData,
} from '../animalModelAssets';

export type BearState =
  | 'idle'
  | 'walk'
  | 'eat'
  | 'call'
  | 'stomp'
  | 'lie'
  | 'sit'
  | 'trot'
  | 'run'
  | 'flee'
  | 'skip'
  | 'roar'
  | 'attack'
  | 'death';

export interface BearOptions {
  scale?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  tintHex?: number;
  wireframe?: boolean;
}

/** Summary: Decoded model data (see IClipRigModelData). */
export type BearUnpackedData = IClipRigModelData;

export const BEAR_GAITS: Record<BearState, { speed: number }> = {
  idle:   { speed: 0.0 },
  walk:   { speed: 1.45 },
  eat:    { speed: 0.0 },
  call:   { speed: 0.0 },
  stomp:  { speed: 0.0 },
  lie:    { speed: 0.0 },
  sit:    { speed: 0.0 },
  trot:   { speed: 3.2 },
  run:    { speed: 6.5 },
  flee:   { speed: 8.9 },
  skip:   { speed: 5.2 },
  roar:   { speed: 0.0 },
  attack: { speed: 1.35 },
  death:  { speed: 0.0 },
};

export const BEAR_STATES: BearState[] = [
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
  'stomp',
  'attack',
  'death',
];

const CLIP_ORDER: BearState[] = [
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

const NUM_JOINTS = 37;
const NUM_CLIPS = 13;
const NUM_FRAMES = 24;

export class BearRig {
  readonly root: THREE.Bone;
  readonly bones: THREE.Bone[] = [];
  readonly boneInverses: THREE.Matrix4[] = [];
  readonly skeleton: THREE.Skeleton;

  constructor(data: BearUnpackedData) {
    for (let j = 0; j < NUM_JOINTS; j++) {
      const b = new THREE.Bone();
      b.name = 'BearJoint_' + j;
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
      if (j === 0) {
        b.scale.set(0.012, 0.012, 0.011);
      } else {
        b.scale.set(1, 1, 1);
      }
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

  private readonly restData: BearUnpackedData;

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

export class BearAnimator {
  readonly rig: BearRig;
  readonly data: BearUnpackedData;
  state: BearState = 'walk';
  prevState: BearState = 'walk';
  blend = 1.0;
  blendDuration = 0.44;
  time = 0;
  prevTime = 0;
  moveSpeed = 1.45;
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

  private static isLocomotionState(s: BearState): boolean {
    return s === 'walk' || s === 'trot' || s === 'run' || s === 'flee' || s === 'skip';
  }

  private static isPostureChangeState(s: BearState): boolean {
    return s === 'lie' || s === 'sit' || s === 'roar' || s === 'call' || s === 'stomp' || s === 'eat';
  }

  private computeBlendDuration(from: BearState, to: BearState): number {
    if (to === 'attack') return 0.34;
    if (to === 'death') return 0.38;
    if (from === 'roar' || to === 'roar') return 0.56;
    if (from === 'lie' || to === 'lie' || from === 'sit' || to === 'sit') return 0.58;
    if (from === 'stomp' || to === 'stomp' || from === 'call' || to === 'call' || from === 'eat' || to === 'eat') return 0.48;
    if (BearAnimator.isLocomotionState(from) && BearAnimator.isLocomotionState(to)) return 0.42;
    return 0.45;
  }

  constructor(rig: BearRig, data: BearUnpackedData) {
    this.rig = rig;
    this.data = data;
    this.applyClipPose(this.getClipIndex(this.state), 0, 1.0, false);
  }

  setState(next: BearState): void {
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

    if (BearAnimator.isLocomotionState(prev) && BearAnimator.isLocomotionState(next)) {
      const oldDur = Math.max(0.1, this.data.clipDurations[this.getClipIndex(prev)]);
      const newDur = Math.max(0.1, this.data.clipDurations[this.getClipIndex(next)]);
      const normPhase = (((this.time % oldDur) + oldDur) % oldDur) / oldDur;
      this.time = normPhase * newDur;
    } else if (next === 'call' || next === 'stomp' || next === 'roar' || next === 'attack' || next === 'death' || next === 'lie' || next === 'sit' || next === 'eat') {
      this.time = 0.0;
    }

    this.state = next;
    this.blend = 0.0;
    this.moveSpeed = BEAR_GAITS[next] ? BEAR_GAITS[next].speed : 0.0;
  }

  restartState(next: BearState): void {
    this.prevState = next;
    this.state = next;
    this.time = 0.0;
    this.blend = 1.0;
    this.moveSpeed = BEAR_GAITS[next] ? BEAR_GAITS[next].speed : 0.0;
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

  private getClipIndex(st: BearState): number {
    if (st === 'stomp') return 3; // Clip 3 ('call') is the 4-legged ground-stomp & growl intimidation clip
    const idx = CLIP_ORDER.indexOf(st);
    return idx >= 0 ? idx : 0;
  }

  private sampleClipFrame(clipIdx: number, t: number, st: BearState) {
    const dur = Math.max(0.1, this.data.clipDurations[clipIdx]);
    let u = st === 'death' && !this.loopDeath ? Math.min(1.0, Math.max(0.0, t / dur)) : (t % dur) / dur;
    if (u < 0) u += 1.0;
    const pos = u * (NUM_FRAMES - 1);
    const f0 = Math.min(NUM_FRAMES - 1, Math.floor(pos));
    const f1 = Math.min(NUM_FRAMES - 1, f0 + 1);
    const frac = pos - f0;
    return { f0, f1, frac };
  }

  private readPelvis(clipIdx: number, f0: number, f1: number, frac: number, out: THREE.Vector3): void {
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

    this.readPelvis(clipIdx, cur.f0, cur.f1, cur.frac, this.vA);
    this.rig.bones[2].position.copy(this.vA);

    for (let j = 0; j < NUM_JOINTS; j++) {
      this.readJointQuat(clipIdx, cur.f0, cur.f1, cur.frac, j, this.rig.bones[j].quaternion);
    }

    if (this.state === 'stomp' || this.state === 'call') {
      // Heavy 4-legged intimidation ground-stomp: alternate front paw lift & heavy ground slam with shoulder drop
      const stompPhase = (t * 1.65) % 1.0;
      const slam = Math.pow(Math.max(0, Math.sin(stompPhase * Math.PI * 2)), 2);
      const lift = Math.max(0, -Math.sin(stompPhase * Math.PI * 2));
      const leftTurn = Math.sin(t * 0.825 * Math.PI * 2) >= 0;
      this.rig.bones[2].position.y -= slam * 0.08;
      this.addLocalRot(11, slam * 0.14 - lift * 0.08, 0, (leftTurn ? -1 : 1) * (slam * 0.09 - lift * 0.06));
      this.addLocalRot(19, slam * 0.16, 0, 0);
      this.addLocalRot(23, 0.32 + slam * 0.24, 0, 0);
      if (leftTurn) {
        this.addLocalRot(14, -lift * 0.42 + slam * 0.18, 0, 0);
        this.addLocalRot(15, lift * 0.55 - slam * 0.15, 0, 0);
      } else {
        this.addLocalRot(26, -lift * 0.42 + slam * 0.18, 0, 0);
        this.addLocalRot(27, lift * 0.55 - slam * 0.15, 0, 0);
      }
    } else if (this.state === 'roar') {
      // Powerful chest expansion, head thrash, and wide roaring jaw so 'roar' never looks static
      const roarWave = Math.sin(t * 5.2);
      const roarSwell = 0.5 + 0.5 * Math.sin(t * 3.4);
      this.rig.bones[2].position.y += roarSwell * 0.045;
      this.addLocalRot(11, -0.14 * roarSwell, roarWave * 0.11, 0);
      this.addLocalRot(19, -0.18 * roarSwell, roarWave * 0.16, 0);
      this.addLocalRot(21, -0.12 * roarSwell, -roarWave * 0.14, roarWave * 0.08);
      this.addLocalRot(23, 0.42 + roarSwell * 0.28, 0, 0);
    } else if (this.state === 'attack') {
      // Forward lunge & heavy dual-paw maul sweep on bear attack so the strike never stalls
      const dur = Math.max(0.1, this.data.clipDurations[clipIdx] || 1.6);
      const u = ((t % dur) + dur) % dur / dur;
      const lunge = Math.sin(u * Math.PI);
      const swipe = Math.sin(u * Math.PI * 2);
      this.rig.bones[2].position.z += 0.14 * lunge;
      this.addLocalRot(11, lunge * 0.16, swipe * 0.10, 0);
      this.addLocalRot(19, -lunge * 0.12, swipe * 0.12, 0);
      this.addLocalRot(23, 0.28 + lunge * 0.30, 0, 0);
      this.addLocalRot(14, -lunge * 0.38 + swipe * 0.24, 0, 0);
      this.addLocalRot(26, -lunge * 0.38 - swipe * 0.24, 0, 0);
    } else if (this.state === 'idle' || this.state === 'sit' || this.state === 'eat' || this.state === 'lie') {
      // Continuous natural breathing, weight shift, and head scanning so stationary bears never freeze
      const breath = Math.sin(t * 2.4);
      const lookYaw = Math.sin(t * 1.15) * 0.18 + Math.cos(t * 0.65) * 0.09;
      const lookPitch = Math.sin(t * 1.7) * 0.09;
      this.rig.bones[2].position.y += breath * 0.016;
      this.addLocalRot(11, breath * 0.035, lookYaw * 0.35, Math.sin(t * 1.2) * 0.025);
      this.addLocalRot(19, lookPitch + (this.state === 'eat' ? 0.22 + Math.abs(Math.sin(t * 4.2)) * 0.16 : 0), lookYaw * 0.65, 0);
      this.addLocalRot(21, lookPitch * 0.8, lookYaw * 0.5, Math.cos(t * 1.5) * 0.04);
      if (this.state === 'eat') {
        this.addLocalRot(23, 0.18 + Math.abs(Math.sin(t * 6.5)) * 0.22, 0, 0);
      }
    }

    if (Math.abs(this.turn) > 0.001 && this.state !== 'death') {
      const bend = THREE.MathUtils.clamp(this.turn, -1, 1) * 0.14;
      const bendJoints = [11, 12, 19, 20, 21];
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
        this.rig.bones[j].quaternion.slerpQuaternions(this.qPrev, this.rig.bones[j].quaternion, blendAlpha);
      }
      this.vPrev.copy(this.fromRootPos).lerp(this.rig.bones[2].position, blendAlpha);
      if (BearAnimator.isPostureChangeState(this.prevState) || BearAnimator.isPostureChangeState(this.state)) {
        const transitionArc = Math.sin(blendAlpha * Math.PI);
        this.vPrev.y -= 0.042 * transitionArc;
      }
      this.rig.bones[2].position.copy(this.vPrev);
    }

    for (let j = 0; j < NUM_JOINTS; j++) {
      const q = this.rig.bones[j].quaternion;
      this.lastPoseQuats[j * 4 + 0] = q.x;
      this.lastPoseQuats[j * 4 + 1] = q.y;
      this.lastPoseQuats[j * 4 + 2] = q.z;
      this.lastPoseQuats[j * 4 + 3] = q.w;
    }
    this.lastRootPos.copy(this.rig.bones[2].position);
    this.hasPoseSnapshot = true;
  }

  update(dt: number, turn?: number): void {
    if (typeof turn === 'number') {
      this.turn = turn;
    }
    const clamped = Math.min(dt, 0.1);
    const targetSpeed = BEAR_GAITS[this.state] ? BEAR_GAITS[this.state].speed : 0.0;
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

export class Bear {
  readonly object: THREE.Group;
  readonly mesh: THREE.SkinnedMesh;
  readonly rig: BearRig;
  readonly animator: BearAnimator;

  constructor(data: BearUnpackedData, texture: THREE.Texture, options: BearOptions = {}) {
    const scale = options.scale ?? 1.58;
    const castShadow = options.castShadow ?? true;
    const receiveShadow = options.receiveShadow ?? true;

    this.object = new THREE.Group();
    this.object.name = 'Bear';

    this.rig = new BearRig(data);
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
      roughness: 0.78,
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
    this.animator = new BearAnimator(this.rig, data);
  }

  get state(): BearState {
    return this.animator.state;
  }

  setState(state: BearState): void {
    this.animator.setState(state);
  }

  getState(): BearState {
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
// Embedded Self-Contained Bear GLB Geometry, 37-Joint Skeleton, Texture & 13 Animations
// ============================================================================

let cachedTexture: THREE.Texture | null = null;

/**
 * Summary: Builds a Bear from the loaded GLB data.
 * @param options Scale, shadows, tint and wireframe.
 * @returns A ready, animatable Bear.
 * @throws InfrastructureCorruptedException when the model was not loaded yet (see loadAnimalModel).
 */
export function createReadyBear(options: BearOptions = {}): Bear {
  const asset = getLoadedAnimalModel('bear');
  cachedTexture ??= createAnimalTexture(asset, { colorSpace: THREE.SRGBColorSpace });
  return new Bear(requireClipRig(asset), cachedTexture, options);
}
