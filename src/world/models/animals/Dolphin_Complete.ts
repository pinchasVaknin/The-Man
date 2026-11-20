import * as THREE from 'three';
import {
  createAnimalTexture,
  getLoadedAnimalModel,
  requireClipRig,
  type IClipRigModelData,
} from '../animalModelAssets';

export const DOLPHIN_STATES = [
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
  'fly',
  'death',
] as const;

export type DolphinState = (typeof DOLPHIN_STATES)[number];

export interface DolphinOptions {
  scale?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  initialState?: DolphinState;
  tintHex?: number;
  wireframe?: boolean;
}

export type UnpackedDolphinData = IClipRigModelData;

export const DOLPHIN_GAITS: Record<DolphinState, { speed: number }> = {
  idle: { speed: 0.3 },
  walk: { speed: 1.8 },
  eat: { speed: 0.4 },
  call: { speed: 0.3 },
  lie: { speed: 0.0 },
  sit: { speed: 0.5 },
  stalk: { speed: 0.9 },
  trot: { speed: 3.4 },
  run: { speed: 6.4 },
  flee: { speed: 8.8 },
  skip: { speed: 5.2 },
  roar: { speed: 0.0 },
  attack: { speed: 4.2 },
  fly: { speed: 7.2 },
  death: { speed: 0.0 },
};

const CLIP_ORDER: DolphinState[] = [
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
  'fly',
];

const NUM_JOINTS = 14;
const NUM_CLIPS = 14;
const NUM_FRAMES = 16;

export class DolphinRig {
  public readonly root: THREE.Bone;
  public readonly bones: THREE.Bone[] = [];
  public readonly boneInverses: THREE.Matrix4[] = [];
  public readonly skeleton: THREE.Skeleton;
  private readonly data: UnpackedDolphinData;

  constructor(data: UnpackedDolphinData) {
    this.data = data;
    for (let j = 0; j < NUM_JOINTS; j++) {
      const b = new THREE.Bone();
      b.name = 'DolphinJoint_' + j;
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

  public resetToRest(): void {
    for (let j = 0; j < NUM_JOINTS; j++) {
      const b = this.bones[j];
      b.position.set(
        this.data.restTranslations[j * 3],
        this.data.restTranslations[j * 3 + 1],
        this.data.restTranslations[j * 3 + 2],
      );
      b.quaternion.set(
        this.data.restRotations[j * 4],
        this.data.restRotations[j * 4 + 1],
        this.data.restRotations[j * 4 + 2],
        this.data.restRotations[j * 4 + 3],
      );
      b.scale.set(1, 1, 1);
    }
    this.root.updateMatrixWorld(true);
  }
}

export class DolphinAnimator {
  public readonly rig: DolphinRig;
  public readonly data: UnpackedDolphinData;
  public state: DolphinState = 'walk';
  private prevState: DolphinState = 'walk';
  private blend = 1.0;
  private blendDuration = 0.24;
  public time = 0;
  private prevTime = 0;
  public moveSpeed = 1.8;
  public turn = 0;
  public loopDeath = false;

  private readonly qA = new THREE.Quaternion();
  private readonly qB = new THREE.Quaternion();
  private readonly qPrev = new THREE.Quaternion();
  private readonly qTurn = new THREE.Quaternion();
  private readonly vA = new THREE.Vector3();
  private readonly vPrev = new THREE.Vector3();
  private readonly turnAxis = new THREE.Vector3(0, 1, 0);

  constructor(rig: DolphinRig, data: UnpackedDolphinData, initialState: DolphinState = 'walk') {
    this.rig = rig;
    this.data = data;
    this.state = initialState;
    this.prevState = initialState;
    this.moveSpeed = DOLPHIN_GAITS[initialState] ? DOLPHIN_GAITS[initialState].speed : 0.0;
    this.applyClipPose(this.getClipIndex(this.state), 0, 1.0, false);
  }

  public setState(next: DolphinState): void {
    if (next === this.state && next !== 'attack' && next !== 'fly' && next !== 'death') return;
    this.prevState = this.state;
    this.prevTime = this.time;
    this.state = next;
    this.blend = 0.0;
    this.moveSpeed = DOLPHIN_GAITS[next] ? DOLPHIN_GAITS[next].speed : 0.0;
    if (next === 'call' || next === 'roar' || next === 'attack' || next === 'fly' || next === 'death') {
      this.time = 0.0;
    }
  }

  public restartState(next: DolphinState): void {
    this.prevState = this.state;
    this.prevTime = this.time;
    this.state = next;
    this.blend = 0.0;
    this.time = 0.0;
    this.moveSpeed = DOLPHIN_GAITS[next] ? DOLPHIN_GAITS[next].speed : 0.0;
  }

  public setNormalizedPhase(phase01: number): void {
    this.blend = 1.0;
    const clipIdx = this.getClipIndex(this.state);
    const dur = Math.max(0.1, this.data.clipDurations[clipIdx]);
    const wrapped = ((phase01 % 1) + 1) % 1;
    this.time = wrapped * dur;
    this.applyClipPose(clipIdx, this.time, 1.0, false);
    this.rig.root.updateMatrixWorld(true);
  }

  private getClipIndex(st: DolphinState): number {
    if (st === 'stalk') return 5;
    const idx = CLIP_ORDER.indexOf(st);
    return idx >= 0 ? idx : 0;
  }

  private sampleClipFrame(clipIdx: number, t: number, st: DolphinState): { f0: number; f1: number; frac: number } {
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
    this.rig.bones[0].position.copy(this.vA);

    for (let j = 0; j < NUM_JOINTS; j++) {
      this.readJointQuat(clipIdx, cur.f0, cur.f1, cur.frac, j, this.rig.bones[j].quaternion);
      if (hasPrev && blendAlpha < 1.0) {
        this.readJointQuat(prevClipIdx, prv.f0, prv.f1, prv.frac, j, this.qPrev);
        this.rig.bones[j].quaternion.slerpQuaternions(this.qPrev, this.rig.bones[j].quaternion, blendAlpha);
      }
    }

    if (Math.abs(this.turn) > 0.001 && this.state !== 'death') {
      const bend = THREE.MathUtils.clamp(this.turn, -1, 1) * 0.09;
      const bendJoints = [1, 2, 3, 4];
      for (let k = 0; k < bendJoints.length; k++) {
        const jIdx = bendJoints[k];
        this.qTurn.setFromAxisAngle(this.turnAxis, -bend);
        this.rig.bones[jIdx].quaternion.multiply(this.qTurn);
      }
    }
  }

  public update(dt: number): void {
    const clamped = Math.min(dt, 0.1);
    const targetSpeed = DOLPHIN_GAITS[this.state] ? DOLPHIN_GAITS[this.state].speed : 0.0;
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
}

export class Dolphin {
  public readonly object: THREE.Group;
  public readonly mesh: THREE.SkinnedMesh;
  public readonly rig: DolphinRig;
  public readonly animator: DolphinAnimator;

  constructor(data: UnpackedDolphinData, texture: THREE.Texture, options: DolphinOptions = {}) {
    const scale = options.scale ?? 1.0;
    const castShadow = options.castShadow ?? true;
    const receiveShadow = options.receiveShadow ?? true;

    this.object = new THREE.Group();
    this.object.name = 'Dolphin';

    this.rig = new DolphinRig(data);
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
      roughness: 0.42,
      metalness: 0.08,
      side: THREE.DoubleSide,
      wireframe: options.wireframe ?? false,
    });

    this.mesh = new THREE.SkinnedMesh(geom, mat);
    this.mesh.castShadow = castShadow;
    this.mesh.receiveShadow = receiveShadow;
    this.mesh.frustumCulled = false;

    this.mesh.bind(this.rig.skeleton, new THREE.Matrix4());
    this.object.add(this.mesh);

    this.object.scale.setScalar(scale);
    this.animator = new DolphinAnimator(this.rig, data, options.initialState ?? 'walk');
  }

  public setState(state: DolphinState): void {
    this.animator.setState(state);
  }

  public restartState(state: DolphinState = this.animator.state): void {
    this.animator.restartState(state);
  }

  public getState(): DolphinState {
    return this.animator.state;
  }

  public set moveSpeed(v: number) {
    this.animator.moveSpeed = v;
  }

  public get moveSpeed(): number {
    return this.animator.moveSpeed;
  }

  public set turn(v: number) {
    this.animator.turn = v;
  }

  public get turn(): number {
    return this.animator.turn;
  }

  public loopDeath = false;

  public setNormalizedPhase(phase01: number): void {
    this.animator.time = ((phase01 % 1) + 1) % 1;
    this.animator.update(0);
  }

  public update(dt: number, turn?: number): void {
    if (turn !== undefined) this.animator.turn = turn;
    this.animator.update(dt);
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((m) => m.dispose());
    } else {
      this.mesh.material.dispose();
    }
  }
}

let cachedTexture: THREE.Texture | null = null;

/**
 * Summary: Builds a Dolphin from the loaded GLB data.
 * @param options Scale, shadows, tint and wireframe.
 * @returns A ready, animatable Dolphin.
 * @throws InfrastructureCorruptedException when the model was not loaded yet (see loadAnimalModel).
 */
export function createReadyDolphin(options: DolphinOptions = {}): Dolphin {
  const asset = getLoadedAnimalModel('dolphin');
  cachedTexture ??= createAnimalTexture(asset, { colorSpace: THREE.SRGBColorSpace });
  return new Dolphin(requireClipRig(asset), cachedTexture, options);
}
