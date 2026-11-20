import * as THREE from 'three';
import {
  createAnimalTexture,
  getLoadedAnimalModel,
  requireClipRig,
  type IClipRigModelData,
} from '../animalModelAssets';
import { mountReadyWesternSaddleOnCreature } from '../equipment/WesternSaddle_Complete';

export type HorseState =
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
  | 'buck_attack'
  | 'death';

export interface HorseOptions {
  scale?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  tintHex?: number;
  wireframe?: boolean;
}

export type HorseUnpackedData = IClipRigModelData;

export const HORSE_STATES: readonly HorseState[] = [
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
  'buck_attack',
  'death',
];

export const HORSE_GAITS: Record<HorseState, { speed: number }> = {
  idle:        { speed: 0.0 },
  walk:        { speed: 1.55 },
  eat:         { speed: 0.0 },
  call:        { speed: 0.0 },
  lie:         { speed: 0.0 },
  sit:         { speed: 0.90 },
  stalk:       { speed: 0.90 },
  trot:        { speed: 3.5 },
  run:         { speed: 7.2 },
  flee:        { speed: 9.6 },
  skip:        { speed: 6.0 },
  roar:        { speed: 0.0 },
  attack:      { speed: 1.45 },
  buck_attack: { speed: 0.0 },
  death:       { speed: 0.0 },
};

const CLIP_ORDER: HorseState[] = [
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
  'buck_attack',
];

const NUM_JOINTS = 53;
const NUM_CLIPS = 14;
const NUM_FRAMES = 24;

export class HorseRig {
  readonly data: HorseUnpackedData;
  readonly root: THREE.Bone;
  readonly bones: THREE.Bone[] = [];
  readonly boneInverses: THREE.Matrix4[] = [];
  readonly skeleton: THREE.Skeleton;

  constructor(data: HorseUnpackedData) {
    this.data = data;
    for (let j = 0; j < NUM_JOINTS; j++) {
      const b = new THREE.Bone();
      b.name = 'HorseJoint_' + j;
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
    const clipIdx = 0;
    const arr = this.data.clipRootTranslations;
    this.bones[2].position.set(arr[0], arr[1], arr[2]);
    const rotArr = this.data.clipJointRotations;
    for (let j = 0; j < NUM_JOINTS; j++) {
      const base = ((clipIdx * NUM_FRAMES + 0) * NUM_JOINTS + j) * 4;
      this.bones[j].quaternion.set(rotArr[base], rotArr[base + 1], rotArr[base + 2], rotArr[base + 3]).normalize();
    }
    this.root.updateMatrixWorld(true);
  }
}

export class HorseAnimator {
  readonly rig: HorseRig;
  readonly data: HorseUnpackedData;
  state: HorseState = 'walk';
  prevState: HorseState = 'walk';
  blend = 1.0;
  blendDuration = 0.24;
  time = 0;
  prevTime = 0;
  moveSpeed = 1.55;
  turn = 0;
  loopDeath = false;

  private qA = new THREE.Quaternion();
  private qB = new THREE.Quaternion();
  private qPrev = new THREE.Quaternion();
  private qTurn = new THREE.Quaternion();
  private vA = new THREE.Vector3();
  private vPrev = new THREE.Vector3();
  private turnAxis = new THREE.Vector3(0, 0, 1);

  constructor(rig: HorseRig, data: HorseUnpackedData) {
    this.rig = rig;
    this.data = data;
    this.applyClipPose(this.getClipIndex(this.state), 0, 1.0, false);
  }

  setState(next: HorseState): void {
    if (next === this.state && next !== 'attack' && next !== 'buck_attack' && next !== 'death') return;
    this.prevState = this.state;
    this.prevTime = this.time;
    this.state = next;
    this.blend = 0.0;
    this.moveSpeed = HORSE_GAITS[next] ? HORSE_GAITS[next].speed : 0.0;
    if (next === 'call' || next === 'roar' || next === 'attack' || next === 'buck_attack' || next === 'death') {
      this.time = 0.0;
    }
  }

  restartState(next: HorseState): void {
    this.prevState = this.state;
    this.prevTime = this.time;
    this.state = next;
    this.time = 0.0;
    this.blend = 1.0;
    this.moveSpeed = HORSE_GAITS[next] ? HORSE_GAITS[next].speed : 0.0;
    this.applyClipPose(this.getClipIndex(this.state), 0, 1.0, false);
    this.rig.root.updateMatrixWorld(true);
  }

  private getClipIndex(st: HorseState): number {
    if (st === 'stalk') return 5;
    const idx = CLIP_ORDER.indexOf(st);
    return idx >= 0 ? idx : 0;
  }

  private sampleClipFrame(clipIdx: number, t: number, st: HorseState) {
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
    const prevClipIdx = this.getClipIndex(this.prevState);
    const prv = hasPrev ? this.sampleClipFrame(prevClipIdx, this.prevTime, this.prevState) : cur;

    this.readRootPos(clipIdx, cur.f0, cur.f1, cur.frac, this.vA);
    if (hasPrev && blendAlpha < 1.0) {
      this.readRootPos(prevClipIdx, prv.f0, prv.f1, prv.frac, this.vPrev);
      this.vA.lerpVectors(this.vPrev, this.vA, blendAlpha);
    }
    this.rig.bones[2].position.copy(this.vA);

    for (let j = 0; j < NUM_JOINTS; j++) {
      this.readJointQuat(clipIdx, cur.f0, cur.f1, cur.frac, j, this.rig.bones[j].quaternion);
      if (hasPrev && blendAlpha < 1.0) {
        this.readJointQuat(prevClipIdx, prv.f0, prv.f1, prv.frac, j, this.qPrev);
        this.rig.bones[j].quaternion.slerpQuaternions(this.qPrev, this.rig.bones[j].quaternion, blendAlpha);
      }
    }

    if (Math.abs(this.turn) > 0.001 && this.state !== 'death') {
      const bend = THREE.MathUtils.clamp(this.turn, -1, 1) * 0.14;
      const bendJoints = [8, 19, 21, 25, 41, 45];
      for (let k = 0; k < bendJoints.length; k++) {
        const jIdx = bendJoints[k];
        this.qTurn.setFromAxisAngle(this.turnAxis, -bend);
        this.rig.bones[jIdx].quaternion.multiply(this.qTurn);
      }
    }
  }

  update(dt: number): void {
    const clamped = Math.min(dt, 0.1);
    const targetSpeed = HORSE_GAITS[this.state] ? HORSE_GAITS[this.state].speed : 0.0;
    this.moveSpeed += (targetSpeed - this.moveSpeed) * Math.min(1.0, clamped * 8.0);

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

  setNormalizedPhase(phase: number): void {
    const clipIdx = this.getClipIndex(this.state);
    const dur = Math.max(0.1, this.data.clipDurations[clipIdx]);
    this.time = (((phase % 1) + 1) % 1) * dur;
    this.blend = 1.0;
    this.applyClipPose(clipIdx, this.time, 1.0, false);
    this.rig.root.updateMatrixWorld(true);
  }
}

export class Horse {
  readonly object: THREE.Group;
  readonly mesh: THREE.SkinnedMesh;
  readonly saddleMesh: THREE.SkinnedMesh;
  readonly rig: HorseRig;
  readonly animator: HorseAnimator;

  constructor(data: HorseUnpackedData, texture: THREE.Texture, options: HorseOptions = {}) {
    const scale = options.scale ?? 1.0;
    const castShadow = options.castShadow ?? true;
    const receiveShadow = options.receiveShadow ?? true;

    this.object = new THREE.Group();
    this.object.name = 'Horse';

    this.rig = new HorseRig(data);
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

    this.saddleMesh = mountReadyWesternSaddleOnCreature(this, 'horse', {
      castShadow,
      receiveShadow,
      wireframe: options.wireframe,
    });

    this.object.scale.setScalar(scale);
    this.animator = new HorseAnimator(this.rig, data);
  }

  get state(): HorseState {
    return this.animator.state;
  }

  setState(state: HorseState): void {
    this.animator.setState(state);
  }

  restartState(state: HorseState): void {
    this.animator.restartState(state);
  }

  getState(): HorseState {
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
    if (turn !== undefined) {
      this.animator.turn = turn;
    }
    this.animator.update(dt);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((m) => m.dispose());
    } else {
      this.mesh.material.dispose();
    }
    this.saddleMesh.geometry.dispose();
    if (Array.isArray(this.saddleMesh.material)) {
      this.saddleMesh.material.forEach((m) => m.dispose());
    } else {
      this.saddleMesh.material.dispose();
    }
  }
}

let cachedTexture: THREE.Texture | null = null;

/**
 * Summary: Builds a Horse from the loaded GLB data.
 * @param options Scale, shadows, tint and wireframe.
 * @returns A ready, animatable Horse.
 * @throws InfrastructureCorruptedException when the model was not loaded yet (see loadAnimalModel).
 */
export function createReadyHorse(options: HorseOptions = {}): Horse {
  const asset = getLoadedAnimalModel('horse');
  cachedTexture ??= createAnimalTexture(asset, { colorSpace: THREE.SRGBColorSpace });
  return new Horse(requireClipRig(asset), cachedTexture, options);
}
