import * as THREE from 'three';
import {
  createAnimalTexture,
  getLoadedAnimalModel,
  requireClipRig,
  type IClipRigModelData,
} from '../animalModelAssets';

export const KOIFISH_STATES = [
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

export type KoiFishState = (typeof KOIFISH_STATES)[number];

export interface KoiFishOptions {
  scale?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  initialState?: KoiFishState;
  tintHex?: number;
  wireframe?: boolean;
}

export type UnpackedKoiFishData = IClipRigModelData;

export const KOIFISH_GAITS: Record<KoiFishState, { speed: number }> = { idle: { speed: 0.2 }, walk: { speed: 1.4 }, eat: { speed: 0.2 }, call: { speed: 0.2 }, lie: { speed: 0.0 }, sit: { speed: 0.4 }, stalk: { speed: 0.5 }, trot: { speed: 2.8 }, run: { speed: 5.5 }, flee: { speed: 7.8 }, skip: { speed: 4.5 }, roar: { speed: 0.0 }, attack: { speed: 2.5 }, fly: { speed: 6.2 }, death: { speed: 0.0 } };

const CLIP_ORDER: KoiFishState[] = [
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

export class KoiFishRig {
  public readonly root: THREE.Bone;
  public readonly bones: THREE.Bone[] = [];
  public readonly boneInverses: THREE.Matrix4[] = [];
  public readonly skeleton: THREE.Skeleton;
  public readonly restLocalQuats: THREE.Quaternion[] = [];
  public readonly restRootPos = new THREE.Vector3();
  private readonly data: UnpackedKoiFishData;

  constructor(data: UnpackedKoiFishData) {
    this.data = data;
    for (let j = 0; j < NUM_JOINTS; j++) {
      const b = new THREE.Bone();
      b.name = 'KoiFishJoint_' + j;
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
      this.restLocalQuats.push(b.quaternion.clone());

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
    this.restRootPos.copy(this.bones[2].position);
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
      b.quaternion.copy(this.restLocalQuats[j]);
      b.scale.set(1, 1, 1);
    }
    this.root.updateMatrixWorld(true);
  }
}

const KOI_TAU = Math.PI * 2;

export class KoiFishAnimator {
  public readonly rig: KoiFishRig;
  public readonly data: UnpackedKoiFishData;
  public state: KoiFishState = 'walk';
  private prevState: KoiFishState = 'walk';
  private blend = 1.0;
  private blendDuration = 0.22;
  public time = 0;
  private prevTime = 0;
  public moveSpeed = 1.5;
  public turn = 0;
  public loopDeath = false;

  private readonly curQuats: THREE.Quaternion[] = [];
  private readonly prevQuats: THREE.Quaternion[] = [];
  private readonly curRootPos = new THREE.Vector3();
  private readonly prevRootPos = new THREE.Vector3();
  private readonly eScratch = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly qDelta = new THREE.Quaternion();
  private readonly qTurn = new THREE.Quaternion();
  private readonly turnAxis = new THREE.Vector3(0, 1, 0);

  constructor(rig: KoiFishRig, data: UnpackedKoiFishData, initialState: KoiFishState = 'walk') {
    this.rig = rig;
    this.data = data;
    for (let j = 0; j < NUM_JOINTS; j++) {
      this.curQuats.push(rig.restLocalQuats[j].clone());
      this.prevQuats.push(rig.restLocalQuats[j].clone());
    }
    this.state = initialState;
    this.prevState = initialState;
    this.moveSpeed = KOIFISH_GAITS[initialState] ? KOIFISH_GAITS[initialState].speed : 0.0;
    this.applyBlendedPose(0, 1.0, false);
  }

  public setState(next: KoiFishState): void {
    if (next === this.state && next !== 'attack' && next !== 'fly' && next !== 'death') return;
    this.prevState = this.state;
    this.prevTime = this.time;
    this.state = next;
    this.blend = 0.0;
    this.moveSpeed = KOIFISH_GAITS[next] ? KOIFISH_GAITS[next].speed : 0.0;
    if (next === 'call' || next === 'roar' || next === 'attack' || next === 'fly' || next === 'death') {
      this.time = 0.0;
    }
  }

  public restartState(next: KoiFishState): void {
    this.prevState = this.state;
    this.prevTime = this.time;
    this.state = next;
    this.blend = 0.0;
    this.time = 0.0;
    this.moveSpeed = KOIFISH_GAITS[next] ? KOIFISH_GAITS[next].speed : 0.0;
  }

  public setNormalizedPhase(phase01: number): void {
    this.blend = 1.0;
    const dur = this.getStateDuration(this.state);
    const wrapped = ((phase01 % 1) + 1) % 1;
    this.time = wrapped * dur;
    this.applyBlendedPose(this.time, 1.0, false);
    this.rig.root.updateMatrixWorld(true);
  }

  private getClipIndex(st: KoiFishState): number {
    if (st === 'stalk') return 5;
    const idx = CLIP_ORDER.indexOf(st);
    return idx >= 0 ? idx : 0;
  }

  private getStateDuration(st: KoiFishState): number {
    const clipIdx = this.getClipIndex(st);
    return Math.max(0.1, this.data.clipDurations[clipIdx] || 1.2);
  }

  private setBoneDeltaEuler(
    targetQuats: THREE.Quaternion[],
    j: number,
    rx: number,
    ry: number,
    rz: number,
  ): void {
    this.eScratch.set(rx, ry, rz, 'YXZ');
    this.qDelta.setFromEuler(this.eScratch);
    targetQuats[j].copy(this.rig.restLocalQuats[j]).multiply(this.qDelta);
  }

  private evaluateStatePose(
    st: KoiFishState,
    t: number,
    outRootPos: THREE.Vector3,
    outQuats: THREE.Quaternion[],
  ): void {
    const dur = this.getStateDuration(st);
    let u = st === 'death' && !this.loopDeath ? Math.min(1.0, Math.max(0.0, t / dur)) : (t % dur) / dur;
    if (u < 0) u += 1.0;
    const p = u * KOI_TAU;

    outRootPos.copy(this.rig.restRootPos);
    for (let j = 0; j < NUM_JOINTS; j++) {
      outQuats[j].copy(this.rig.restLocalQuats[j]);
    }

    if (st === 'death') {
      const k = Math.min(1.0, u / 0.7);
      const ease = k * k * (3.0 - 2.0 * k);
      outRootPos.y -= 0.04 * ease;
      // Gently roll onto side when dead
      this.setBoneDeltaEuler(outQuats, 2, 0.06 * ease, 0, 1.48 * ease);
      this.setBoneDeltaEuler(outQuats, 5, 0, 0.12 * ease, 0);
      this.setBoneDeltaEuler(outQuats, 6, 0, 0.15 * ease, 0);
      this.setBoneDeltaEuler(outQuats, 7, 0, 0.18 * ease, 0);
      this.setBoneDeltaEuler(outQuats, 8, 0, 0.15 * ease, 0);
      return;
    }

    // Travelling carangiform S-wave along the straight spine relative to restLocalQuats
    let waveAmp = 0.14;
    let cycles = 1.0;
    let finAmp = 0.22;
    let pitchTrim = 0.0;
    let surgeZ = 0.0;

    if (st === 'idle' || st === 'sit' || st === 'lie') {
      waveAmp = st === 'lie' ? 0.05 : 0.08;
      finAmp = 0.28;
      outRootPos.y += Math.sin(p) * 0.008;
    } else if (st === 'walk' || st === 'stalk') {
      waveAmp = 0.14;
      finAmp = 0.22;
    } else if (st === 'trot') {
      waveAmp = 0.20;
      cycles = 2.0;
      finAmp = 0.28;
    } else if (st === 'run' || st === 'flee') {
      waveAmp = 0.26;
      cycles = 2.0;
      finAmp = 0.34;
    } else if (st === 'eat' || st === 'call' || st === 'roar') {
      waveAmp = 0.11;
      finAmp = 0.30;
      // Gentle upward surface nibble pitch without rolling sideways
      pitchTrim = -0.10 * Math.sin(u * Math.PI);
      outRootPos.y += 0.025 * Math.sin(u * Math.PI);
    } else if (st === 'attack' || st === 'fly' || st === 'skip') {
      waveAmp = 0.24;
      cycles = 2.0;
      finAmp = 0.32;
      const arc = Math.sin(u * Math.PI);
      outRootPos.y += (st === 'fly' ? 0.16 : 0.06) * arc;
      pitchTrim = -0.18 * Math.cos(u * Math.PI);
      surgeZ = 0.05 * arc;
    }

    const wp = p * cycles;
    outRootPos.x += Math.cos(wp) * waveAmp * 0.035;
    outRootPos.z += surgeZ;

    // Head/Body counter-yaw + upright pitch (zero sideways roll!)
    const headYaw = -Math.sin(wp) * waveAmp * 0.32;
    this.setBoneDeltaEuler(outQuats, 2, pitchTrim, headYaw, 0);
    // Anterior spine
    this.setBoneDeltaEuler(outQuats, 3, 0, Math.sin(wp - 0.55) * waveAmp * 0.55, 0);
    // Head / gill gentle counter-stabilization
    this.setBoneDeltaEuler(outQuats, 4, -pitchTrim * 0.3, -headYaw * 0.35, 0);
    // Progressive tail wave (MidTail -> RearTail -> CaudalPeduncle -> TailFin)
    this.setBoneDeltaEuler(outQuats, 5, 0, Math.sin(wp - 1.15) * waveAmp * 0.95, 0);
    this.setBoneDeltaEuler(outQuats, 6, 0, Math.sin(wp - 1.75) * waveAmp * 1.30, 0);
    this.setBoneDeltaEuler(outQuats, 7, 0, Math.sin(wp - 2.35) * waveAmp * 1.65, 0);
    this.setBoneDeltaEuler(outQuats, 8, 0, Math.sin(wp - 2.95) * waveAmp * 1.90, 0);
    // Dorsal fin stays upright with subtle secondary sway
    this.setBoneDeltaEuler(outQuats, 9, 0, Math.sin(wp - 1.4) * waveAmp * 0.35, 0);
    // Pectoral fins scull symmetrically
    const finFlap = Math.sin(wp) * finAmp;
    this.setBoneDeltaEuler(outQuats, 10, 0, finFlap, finFlap * 0.45);
    this.setBoneDeltaEuler(outQuats, 11, 0, -finFlap, -finFlap * 0.45);
  }

  private applyBlendedPose(t: number, blendAlpha: number, hasPrev: boolean): void {
    this.evaluateStatePose(this.state, t, this.curRootPos, this.curQuats);
    if (hasPrev && blendAlpha < 1.0) {
      this.evaluateStatePose(this.prevState, this.prevTime, this.prevRootPos, this.prevQuats);
      this.curRootPos.lerpVectors(this.prevRootPos, this.curRootPos, blendAlpha);
      for (let j = 0; j < NUM_JOINTS; j++) {
        this.rig.bones[j].quaternion.slerpQuaternions(this.prevQuats[j], this.curQuats[j], blendAlpha);
      }
    } else {
      for (let j = 0; j < NUM_JOINTS; j++) {
        this.rig.bones[j].quaternion.copy(this.curQuats[j]);
      }
    }
    this.rig.bones[2].position.copy(this.curRootPos);

    if (Math.abs(this.turn) > 0.001 && this.state !== 'death') {
      const bend = THREE.MathUtils.clamp(this.turn, -1, 1) * 0.14;
      const bendJoints = [3, 5, 6, 7, 8];
      this.qTurn.setFromAxisAngle(this.turnAxis, -bend);
      for (let k = 0; k < bendJoints.length; k++) {
        const jIdx = bendJoints[k];
        this.rig.bones[jIdx].quaternion.multiply(this.qTurn);
      }
    }
  }

  public update(dt: number): void {
    const clamped = Math.min(dt, 0.1);
    const targetSpeed = KOIFISH_GAITS[this.state] ? KOIFISH_GAITS[this.state].speed : 0.0;
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

    this.applyBlendedPose(this.time, alpha, hasPrev);
    this.rig.root.updateMatrixWorld(true);
  }
}

export class KoiFish {
  public readonly object: THREE.Group;
  public readonly mesh: THREE.SkinnedMesh;
  public readonly rig: KoiFishRig;
  public readonly animator: KoiFishAnimator;

  constructor(data: UnpackedKoiFishData, texture: THREE.Texture, options: KoiFishOptions = {}) {
    const scale = options.scale ?? 1.0;
    const castShadow = options.castShadow ?? true;
    const receiveShadow = options.receiveShadow ?? true;

    this.object = new THREE.Group();
    this.object.name = 'KoiFish';

    this.rig = new KoiFishRig(data);
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
      roughness: 0.58,
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
    this.animator = new KoiFishAnimator(this.rig, data, options.initialState ?? 'walk');
  }

  public setState(state: KoiFishState): void {
    this.animator.setState(state);
  }

  public restartState(state: KoiFishState = this.animator.state): void {
    this.animator.restartState(state);
  }

  public getState(): KoiFishState {
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

  public set loopDeath(v: boolean) {
    this.animator.loopDeath = v;
  }

  public get loopDeath(): boolean {
    return this.animator.loopDeath;
  }

  public setNormalizedPhase(phase01: number): void {
    this.animator.setNormalizedPhase(phase01);
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
 * Summary: Builds a KoiFish from the loaded GLB data.
 * @param options Scale, shadows, tint and wireframe.
 * @returns A ready, animatable KoiFish.
 * @throws InfrastructureCorruptedException when the model was not loaded yet (see loadAnimalModel).
 */
export function createReadyKoiFish(options: KoiFishOptions = {}): KoiFish {
  const asset = getLoadedAnimalModel('koi-fish');
  cachedTexture ??= createAnimalTexture(asset, { colorSpace: THREE.SRGBColorSpace });
  return new KoiFish(requireClipRig(asset), cachedTexture, options);
}
