import * as THREE from 'three';

export type BearState =
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

export interface BearOptions {
  scale?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export interface BearUnpackedData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  skinIndices: Uint8Array;
  skinWeights: Float32Array;
  indices: Uint16Array;
  parents: Int8Array;
  restTranslations: Float32Array;
  restRotations: Float32Array;
  inverseBindMatrices: Float32Array;
  clipDurations: Float32Array;
  clipPelvisTranslations: Float32Array;
  clipJointRotations: Float32Array;
}

export const BEAR_GAITS: Record<BearState, { speed: number }> = {
  idle:   { speed: 0.0 },
  walk:   { speed: 1.45 },
  eat:    { speed: 0.0 },
  call:   { speed: 0.0 },
  lie:    { speed: 0.0 },
  sit:    { speed: 0.0 },
  trot:   { speed: 3.2 },
  run:    { speed: 6.5 },
  flee:   { speed: 8.9 },
  skip:   { speed: 5.2 },
  roar:   { speed: 0.0 },
  attack: { speed: 0.0 },
  death:  { speed: 0.0 },
};

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

const NUM_VERTS = 4664;
const NUM_INDICES = 22884;
const NUM_JOINTS = 37;
const NUM_CLIPS = 13;
const NUM_FRAMES = 24;

export function unpackBearBundle(b64: string): BearUnpackedData {
  const binStr = atob(b64);
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  const buf = bytes.buffer;
  let off = 0;

  const positions = new Float32Array(buf, off, NUM_VERTS * 3);
  off += NUM_VERTS * 3 * 4;

  const normalsI8 = new Int8Array(buf, off, NUM_VERTS * 3);
  off += NUM_VERTS * 3;
  const normals = new Float32Array(NUM_VERTS * 3);
  for (let i = 0; i < normals.length; i++) {
    normals[i] = normalsI8[i] / 127.0;
  }

  const uvsU16 = new Uint16Array(buf, off, NUM_VERTS * 2);
  off += NUM_VERTS * 2 * 2;
  const uvs = new Float32Array(NUM_VERTS * 2);
  for (let i = 0; i < uvs.length; i++) {
    uvs[i] = uvsU16[i] / 65535.0;
  }

  const skinIndices = new Uint8Array(buf, off, NUM_VERTS * 4);
  off += NUM_VERTS * 4;

  const skinWeightsU8 = new Uint8Array(buf, off, NUM_VERTS * 4);
  off += NUM_VERTS * 4;
  const skinWeights = new Float32Array(NUM_VERTS * 4);
  for (let v = 0; v < NUM_VERTS; v++) {
    const i4 = v * 4;
    const w0 = skinWeightsU8[i4] / 255.0;
    const w1 = skinWeightsU8[i4 + 1] / 255.0;
    const w2 = skinWeightsU8[i4 + 2] / 255.0;
    const w3 = skinWeightsU8[i4 + 3] / 255.0;
    const sum = w0 + w1 + w2 + w3;
    const inv = sum > 1e-6 ? 1.0 / sum : 1.0;
    skinWeights[i4] = w0 * inv;
    skinWeights[i4 + 1] = w1 * inv;
    skinWeights[i4 + 2] = w2 * inv;
    skinWeights[i4 + 3] = w3 * inv;
  }

  const indices = new Uint16Array(buf, off, NUM_INDICES);
  off += NUM_INDICES * 2;

  const parentsFull = new Int8Array(buf, off, 40);
  off += 40;
  const parents = parentsFull.subarray(0, NUM_JOINTS);

  const restTranslations = new Float32Array(buf, off, NUM_JOINTS * 3);
  off += NUM_JOINTS * 3 * 4;

  const restRotations = new Float32Array(buf, off, NUM_JOINTS * 4);
  off += NUM_JOINTS * 4 * 4;

  const inverseBindMatrices = new Float32Array(buf, off, NUM_JOINTS * 16);
  off += NUM_JOINTS * 16 * 4;

  const clipDurationsFull = new Float32Array(buf, off, 16);
  off += 16 * 4;
  const clipDurations = clipDurationsFull.subarray(0, NUM_CLIPS);

  const clipPelvisTranslations = new Float32Array(buf, off, NUM_CLIPS * NUM_FRAMES * 3);
  off += NUM_CLIPS * NUM_FRAMES * 3 * 4;

  const clipJointRotsI16 = new Int16Array(buf, off, NUM_CLIPS * NUM_FRAMES * NUM_JOINTS * 4);
  const clipJointRotations = new Float32Array(clipJointRotsI16.length);
  for (let i = 0; i < clipJointRotsI16.length; i++) {
    clipJointRotations[i] = clipJointRotsI16[i] / 32767.0;
  }

  return {
    positions,
    normals,
    uvs,
    skinIndices,
    skinWeights,
    indices,
    parents,
    restTranslations,
    restRotations,
    inverseBindMatrices,
    clipDurations,
    clipPelvisTranslations,
    clipJointRotations,
  };
}

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
  }
}

export class BearAnimator {
  readonly rig: BearRig;
  readonly data: BearUnpackedData;
  state: BearState = 'walk';
  prevState: BearState = 'walk';
  blend = 1.0;
  blendDuration = 0.26;
  time = 0;
  prevTime = 0;
  moveSpeed = 1.45;
  turn = 0;

  private qA = new THREE.Quaternion();
  private qB = new THREE.Quaternion();
  private qPrev = new THREE.Quaternion();
  private qTurn = new THREE.Quaternion();
  private vA = new THREE.Vector3();
  private vPrev = new THREE.Vector3();
  private turnAxis = new THREE.Vector3(0, 0, 1);

  constructor(rig: BearRig, data: BearUnpackedData) {
    this.rig = rig;
    this.data = data;
    this.applyClipPose(this.getClipIndex(this.state), 0, 1.0, false);
  }

  setState(next: BearState): void {
    if (next === this.state && next !== 'attack' && next !== 'death') return;
    this.prevState = this.state;
    this.prevTime = this.time;
    this.state = next;
    this.blend = 0.0;
    this.moveSpeed = BEAR_GAITS[next] ? BEAR_GAITS[next].speed : 0.0;
    if (next === 'call' || next === 'roar' || next === 'attack' || next === 'death') {
      this.time = 0.0;
    }
  }

  private getClipIndex(st: BearState): number {
    const idx = CLIP_ORDER.indexOf(st);
    return idx >= 0 ? idx : 0;
  }

  private sampleClipFrame(clipIdx: number, t: number, st: BearState) {
    const dur = Math.max(0.1, this.data.clipDurations[clipIdx]);
    let u = st === 'death' ? Math.min(1.0, Math.max(0.0, t / dur)) : (t % dur) / dur;
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
    const arr = this.data.clipPelvisTranslations;
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

    this.readPelvis(clipIdx, cur.f0, cur.f1, cur.frac, this.vA);
    if (hasPrev && blendAlpha < 1.0) {
      this.readPelvis(prevClipIdx, prv.f0, prv.f1, prv.frac, this.vPrev);
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
      const bendJoints = [11, 12, 19, 20, 21];
      for (let k = 0; k < bendJoints.length; k++) {
        const jIdx = bendJoints[k];
        this.qTurn.setFromAxisAngle(this.turnAxis, -bend);
        this.rig.bones[jIdx].quaternion.multiply(this.qTurn);
      }
    }
  }

  update(dt: number): void {
    const clamped = Math.min(dt, 0.1);
    const targetSpeed = BEAR_GAITS[this.state] ? BEAR_GAITS[this.state].speed : 0.0;
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

export class Bear {
  readonly object: THREE.Group;
  readonly mesh: THREE.SkinnedMesh;
  readonly rig: BearRig;
  readonly animator: BearAnimator;

  constructor(data: BearUnpackedData, texture: THREE.Texture, options: BearOptions = {}) {
    const scale = options.scale ?? 0.78;
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
      roughness: 0.78,
      metalness: 0.04,
      skinning: true,
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

  update(dt: number): void {
    this.animator.update(dt);
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
