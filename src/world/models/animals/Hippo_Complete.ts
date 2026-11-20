import * as THREE from 'three';
import {
  createAnimalTexture,
  getLoadedAnimalModel,
  requireClipRig,
  type IClipRigModelData,
} from '../animalModelAssets';

export const HIPPO_STATES = [
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
  'bite_attack',
  'death',
] as const;

export type HippoState = (typeof HIPPO_STATES)[number];

export interface HippoOptions {
  scale?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  initialState?: HippoState;
  tintHex?: number;
  wireframe?: boolean;
}

export type UnpackedHippoData = IClipRigModelData;

export const HIPPO_GAITS: Record<HippoState, { speed: number }> = { idle: { speed: 0.0 }, walk: { speed: 1.3 }, eat: { speed: 0.0 }, call: { speed: 0.0 }, lie: { speed: 0.0 }, sit: { speed: 0.7 }, stalk: { speed: 0.7 }, trot: { speed: 2.8 }, run: { speed: 5.4 }, flee: { speed: 7.2 }, skip: { speed: 4.2 }, roar: { speed: 0.0 }, attack: { speed: 1.6 }, bite_attack: { speed: 1.6 }, death: { speed: 0.0 } };

const CLIP_ORDER: HippoState[] = [
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
  'bite_attack',
];

const NUM_JOINTS = 35;
const NUM_CLIPS = 14;
const NUM_FRAMES = 16;

export class HippoRig {
  public readonly root: THREE.Bone;
  public readonly bones: THREE.Bone[] = [];
  public readonly boneInverses: THREE.Matrix4[] = [];
  public readonly skeleton: THREE.Skeleton;
  public readonly restLocalQuats: THREE.Quaternion[] = [];
  public readonly restWorldQuats: THREE.Quaternion[] = [];
  public readonly restWorldQuatInvs: THREE.Quaternion[] = [];
  public readonly restRootPos = new THREE.Vector3();
  private readonly data: UnpackedHippoData;

  constructor(data: UnpackedHippoData) {
    this.data = data;
    for (let j = 0; j < NUM_JOINTS; j++) {
      const b = new THREE.Bone();
      b.name = 'HippoJoint_' + j;
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

    for (let j = 0; j < NUM_JOINTS; j++) {
      const wq = new THREE.Quaternion();
      this.bones[j].getWorldQuaternion(wq);
      this.restWorldQuats.push(wq);
      this.restWorldQuatInvs.push(wq.clone().invert());
    }

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

const HIPPO_TAU = Math.PI * 2;
const HIPPO_UPPER_BODY_JOINTS = new Set<number>([6, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]);

export class HippoAnimator {
  public readonly rig: HippoRig;
  public readonly data: UnpackedHippoData;
  public state: HippoState = 'walk';
  private prevState: HippoState = 'walk';
  private blend = 1.0;
  private blendDuration = 0.24;
  public time = 0;
  private prevTime = 0;
  public moveSpeed = 1.5;
  public turn = 0;
  public loopDeath = false;

  private readonly curQuats: THREE.Quaternion[] = [];
  private readonly prevQuats: THREE.Quaternion[] = [];
  private readonly atkQuats: THREE.Quaternion[] = [];
  private readonly curRootPos = new THREE.Vector3();
  private readonly prevRootPos = new THREE.Vector3();
  private readonly atkRootPos = new THREE.Vector3();
  private readonly qA = new THREE.Quaternion();
  private readonly qB = new THREE.Quaternion();
  private readonly eScratch = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly qDelta = new THREE.Quaternion();
  private readonly qTurn = new THREE.Quaternion();

  constructor(rig: HippoRig, data: UnpackedHippoData, initialState: HippoState = 'walk') {
    this.rig = rig;
    this.data = data;
    for (let j = 0; j < NUM_JOINTS; j++) {
      this.curQuats.push(rig.restLocalQuats[j].clone());
      this.prevQuats.push(rig.restLocalQuats[j].clone());
      this.atkQuats.push(rig.restLocalQuats[j].clone());
    }
    this.state = initialState;
    this.prevState = initialState;
    this.moveSpeed = HIPPO_GAITS[initialState] ? HIPPO_GAITS[initialState].speed : 0.0;
    this.applyBlendedPose(0, 1.0, false);
  }

  public lieLoopCount = 0;
  private lastNormPhase = 0;

  public setState(next: HippoState): void {
    if (next === this.state) return;
    for (let j = 0; j < NUM_JOINTS; j++) {
      this.prevQuats[j].copy(this.rig.bones[j].quaternion);
    }
    this.prevRootPos.copy(this.rig.bones[2].position);
    this.prevState = this.state;
    this.prevTime = this.time;
    this.state = next;
    this.blend = 0.0;
    this.blendDuration = next === 'attack' || next === 'bite_attack' ? 0.14 : next === 'death' ? 0.22 : 0.24;
    this.moveSpeed = HIPPO_GAITS[next] ? HIPPO_GAITS[next].speed : 0.0;
    this.lieLoopCount = 0;
    this.lastNormPhase = 0;
    if (
      next === 'call' ||
      next === 'roar' ||
      next === 'attack' ||
      next === 'bite_attack' ||
      next === 'death' ||
      next === 'skip' ||
      next === 'lie'
    ) {
      this.time = 0.0;
    }
  }

  public restartState(next: HippoState): void {
    for (let j = 0; j < NUM_JOINTS; j++) {
      this.prevQuats[j].copy(this.rig.bones[j].quaternion);
    }
    this.prevRootPos.copy(this.rig.bones[2].position);
    this.prevState = this.state;
    this.prevTime = this.time;
    this.state = next;
    this.blend = 0.0;
    this.time = 0.0;
    this.lieLoopCount = 0;
    this.lastNormPhase = 0;
    this.moveSpeed = HIPPO_GAITS[next] ? HIPPO_GAITS[next].speed : 0.0;
  }

  public setNormalizedPhase(phase01: number): void {
    this.blend = 1.0;
    const dur = this.getStateDuration(this.state);
    const wrapped = ((phase01 % 1) + 1) % 1;
    if (this.state === 'lie' || this.state === 'death') {
      if (wrapped < 0.25 && this.lastNormPhase > 0.75) {
        this.lieLoopCount++;
      }
      this.lastNormPhase = wrapped;
      this.time = this.lieLoopCount > 0 ? dur : wrapped * dur;
    } else {
      this.time = wrapped * dur;
    }
    this.applyBlendedPose(this.time, 1.0, false);
    this.rig.root.updateMatrixWorld(true);
  }

  private getClipIndex(st: HippoState): number {
    if (st === 'stalk') return 1; // Use baked walk clip as base for stalk
    if (st === 'sit') return 0; // Use baked idle clip as base for sit (clip 5 in pack was exported identical to walk)
    const idx = CLIP_ORDER.indexOf(st);
    return idx >= 0 ? idx : 0;
  }

  private getStateDuration(st: HippoState): number {
    const clipIdx = this.getClipIndex(st);
    return Math.max(0.1, this.data.clipDurations[clipIdx] || 1.2);
  }

  private setBoneModelRot(
    targetQuats: THREE.Quaternion[],
    j: number,
    pitchX: number,
    yawY: number,
    rollZ: number,
  ): void {
    this.eScratch.set(pitchX, yawY, rollZ, 'YXZ');
    this.qDelta.setFromEuler(this.eScratch);
    targetQuats[j]
      .copy(this.rig.restLocalQuats[j])
      .multiply(this.rig.restWorldQuatInvs[j])
      .multiply(this.qDelta)
      .multiply(this.rig.restWorldQuats[j]);
  }

  private addBoneModelRot(
    targetQuats: THREE.Quaternion[],
    j: number,
    pitchX: number,
    yawY: number,
    rollZ: number,
  ): void {
    this.eScratch.set(pitchX, yawY, rollZ, 'YXZ');
    this.qDelta.setFromEuler(this.eScratch);
    this.qTurn
      .copy(this.rig.restWorldQuatInvs[j])
      .multiply(this.qDelta)
      .multiply(this.rig.restWorldQuats[j]);
    targetQuats[j].multiply(this.qTurn);
  }

  private sampleBakedClipPose(
    clipIdx: number,
    localTime: number,
    loop: boolean,
    outRootPos: THREE.Vector3,
    outQuats: THREE.Quaternion[],
  ): void {
    const dur = Math.max(0.05, this.data.clipDurations[clipIdx] || 1.0);
    let norm = localTime / dur;
    if (clipIdx === 4 || clipIdx === 12) {
      // Clip 4 ('lie' / sleep) and Clip 12 ('death') transition from standing (0.0) to lying down (1.0).
      // Play once from 0.0 -> 1.0 and stay clamped on the final frame (1.0) so the Hippo never stands back up!
      if (localTime < dur && this.lieLoopCount === 0) {
        norm = Math.min(1.0, Math.max(0.0, norm));
      } else {
        norm = 1.0;
      }
    } else if (loop) {
      norm = norm - Math.floor(norm);
    } else {
      norm = Math.min(1.0, Math.max(0.0, norm));
    }

    const fExact = norm * (NUM_FRAMES - 1);
    const f0 = Math.min(NUM_FRAMES - 1, Math.floor(fExact));
    const noWrapToZero = !loop || clipIdx === 4 || clipIdx === 12;
    const f1 = noWrapToZero ? Math.min(NUM_FRAMES - 1, f0 + 1) : (f0 + 1) % NUM_FRAMES;
    const alpha = fExact - f0;

    const rBase0 = (clipIdx * NUM_FRAMES + f0) * 3;
    const rBase1 = (clipIdx * NUM_FRAMES + f1) * 3;
    const rt = this.data.clipRootTranslations;

    outRootPos.set(
      rt[rBase0] + (rt[rBase1] - rt[rBase0]) * alpha,
      rt[rBase0 + 1] + (rt[rBase1 + 1] - rt[rBase0 + 1]) * alpha,
      rt[rBase0 + 2] + (rt[rBase1 + 2] - rt[rBase0 + 2]) * alpha,
    );

    const jr = this.data.clipJointRotations;
    const jStride = NUM_JOINTS * 4;
    const jBase0 = (clipIdx * NUM_FRAMES + f0) * jStride;
    const jBase1 = (clipIdx * NUM_FRAMES + f1) * jStride;

    for (let j = 0; j < NUM_JOINTS; j++) {
      const o0 = jBase0 + j * 4;
      const o1 = jBase1 + j * 4;
      this.qA.set(jr[o0], jr[o0 + 1], jr[o0 + 2], jr[o0 + 3]);
      this.qB.set(jr[o1], jr[o1 + 1], jr[o1 + 2], jr[o1 + 3]);
      if (this.qA.dot(this.qB) < 0) {
        this.qB.set(-this.qB.x, -this.qB.y, -this.qB.z, -this.qB.w);
      }
      outQuats[j].slerpQuaternions(this.qA, this.qB, alpha);
    }
  }

  private evaluateStatePose(
    st: HippoState,
    t: number,
    outRootPos: THREE.Vector3,
    outQuats: THREE.Quaternion[],
  ): void {
    const dur = this.getStateDuration(st);
    let u = st === 'death' && !this.loopDeath ? Math.min(1.0, Math.max(0.0, t / dur)) : (t % dur) / dur;
    if (u < 0) u += 1.0;
    const p = u * HIPPO_TAU;

    if (st === 'sit') {
      // Sample baked idle clip as base, then fold hindquarters into a natural seated posture
      this.sampleBakedClipPose(0, t, true, outRootPos, outQuats);
      const breath = Math.sin(p) * 0.015;
      outRootPos.y = this.rig.restRootPos.y - 0.19 + breath;
      outRootPos.x = this.rig.restRootPos.x;
      outRootPos.z = this.rig.restRootPos.z;
      this.setBoneModelRot(outQuats, 2, -0.24, 0, 0);
      this.setBoneModelRot(outQuats, 6, 0.08, 0, 0);
      this.setBoneModelRot(outQuats, 15, 0.12, 0, 0);
      this.setBoneModelRot(outQuats, 17, 0.06 + breath, Math.sin(p * 0.5) * 0.04, 0);
      this.setBoneModelRot(outQuats, 19, 0.05, Math.sin(p * 0.5) * 0.05, 0);
      this.setBoneModelRot(outQuats, 7, -0.45, 0, 0);
      this.setBoneModelRot(outQuats, 8, 0.82, 0, 0);
      this.setBoneModelRot(outQuats, 9, -0.35, 0, 0);
      this.setBoneModelRot(outQuats, 11, -0.45, 0, 0);
      this.setBoneModelRot(outQuats, 12, 0.82, 0, 0);
      this.setBoneModelRot(outQuats, 13, -0.35, 0, 0);
      this.setBoneModelRot(outQuats, 26, 0.18, 0, 0);
      this.setBoneModelRot(outQuats, 27, 0.08, 0, 0);
      this.setBoneModelRot(outQuats, 31, 0.18, 0, 0);
      this.setBoneModelRot(outQuats, 32, 0.08, 0, 0);
      return;
    }

    if (st === 'stalk') {
      // Sample baked walk clip at slower cadence with lowered stalking head & crouched root
      this.sampleBakedClipPose(1, t * 0.72, true, outRootPos, outQuats);
      outRootPos.x = this.rig.restRootPos.x;
      outRootPos.z = this.rig.restRootPos.z;
      outRootPos.y -= 0.045;
      this.addBoneModelRot(outQuats, 15, 0.06, 0, 0);
      this.addBoneModelRot(outQuats, 17, 0.12, 0, 0);
      this.addBoneModelRot(outQuats, 18, 0.10, 0, 0);
      this.addBoneModelRot(outQuats, 19, 0.08, 0, 0);
      return;
    }

    const clipIdx = this.getClipIndex(st);
    const loop = st !== 'death' && st !== 'lie';
    this.sampleBakedClipPose(clipIdx, t, loop, outRootPos, outQuats);

    // Keep horizontal root translation anchored at restRootPos for locomotion loops so world AI drives position cleanly,
    // while preserving the baked vertical bounce, baked attack lunge, and baked death collapse.
    if (st === 'walk' || st === 'trot' || st === 'run' || st === 'flee' || st === 'skip' || st === 'idle' || st === 'eat') {
      outRootPos.x = this.rig.restRootPos.x;
      outRootPos.z = this.rig.restRootPos.z;
    } else if (st === 'attack' || st === 'bite_attack') {
      // If attacking while moving forward, blend the baked attack upper-body gore/bite onto the running legs
      // and anchor root X/Z at restRootPos so world AI velocity moves the Hippo cleanly forward!
      if (this.moveSpeed > 0.35) {
        const baseClipIdx = this.getClipIndex(this.moveSpeed > 2.6 ? 'run' : 'trot');
        this.sampleBakedClipPose(baseClipIdx, t, true, this.atkRootPos, this.atkQuats);
        for (let j = 0; j < NUM_JOINTS; j++) {
          if (!HIPPO_UPPER_BODY_JOINTS.has(j)) {
            outQuats[j].copy(this.atkQuats[j]);
          }
        }
        outRootPos.x = this.rig.restRootPos.x;
        outRootPos.z = this.rig.restRootPos.z;
        outRootPos.y = Math.max(outRootPos.y, this.atkRootPos.y);
      }
      // Accentuate lower jaw gape during peak lunge of attack / bite_attack so the tusks & open mouth read unmistakably
      const lungeEnv = Math.sin(u * Math.PI);
      this.addBoneModelRot(outQuats, 24, (st === 'bite_attack' ? 0.42 : 0.28) * lungeEnv, 0, 0);
    }

    // Subtle secondary ear & tail life on non-death states
    if (st !== 'death') {
      const earFlick = Math.sin(p * 2.0) * 0.08;
      this.addBoneModelRot(outQuats, 22, 0, 0, earFlick);
      this.addBoneModelRot(outQuats, 23, 0, 0, -earFlick);
      const tailSwish = Math.sin(p) * 0.1;
      this.addBoneModelRot(outQuats, 3, 0, tailSwish, 0);
      this.addBoneModelRot(outQuats, 4, 0, tailSwish * 1.15, 0);
    }
  }

  private applyBlendedPose(t: number, blendAlpha: number, hasPrev: boolean): void {
    this.evaluateStatePose(this.state, t, this.curRootPos, this.curQuats);
    if (hasPrev && blendAlpha < 1.0) {
      this.curRootPos.lerpVectors(this.prevRootPos, this.curRootPos, blendAlpha);
      for (let j = 0; j < NUM_JOINTS; j++) {
        this.qA.copy(this.prevQuats[j]);
        this.qB.copy(this.curQuats[j]);
        if (this.qA.dot(this.qB) < 0) {
          this.qB.set(-this.qB.x, -this.qB.y, -this.qB.z, -this.qB.w);
        }
        this.rig.bones[j].quaternion.slerpQuaternions(this.qA, this.qB, blendAlpha);
      }
    } else {
      for (let j = 0; j < NUM_JOINTS; j++) {
        this.rig.bones[j].quaternion.copy(this.curQuats[j]);
      }
    }
    this.rig.bones[2].position.copy(this.curRootPos);

    if (Math.abs(this.turn) > 0.001 && this.state !== 'death') {
      const bend = THREE.MathUtils.clamp(this.turn, -1, 1) * 0.12;
      const bendJoints = [6, 15, 17, 18, 19];
      this.eScratch.set(0, -bend, 0, 'YXZ');
      this.qDelta.setFromEuler(this.eScratch);
      for (let k = 0; k < bendJoints.length; k++) {
        const jIdx = bendJoints[k];
        this.qTurn
          .copy(this.rig.restWorldQuatInvs[jIdx])
          .multiply(this.qDelta)
          .multiply(this.rig.restWorldQuats[jIdx]);
        this.rig.bones[jIdx].quaternion.multiply(this.qTurn);
      }
    }
  }

  public update(dt: number): void {
    const clamped = Math.min(dt, 0.1);
    const targetSpeed = HIPPO_GAITS[this.state] ? HIPPO_GAITS[this.state].speed : 0.0;
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

export class Hippo {
  public readonly object: THREE.Group;
  public readonly mesh: THREE.SkinnedMesh;
  public readonly rig: HippoRig;
  public readonly animator: HippoAnimator;

  constructor(data: UnpackedHippoData, texture: THREE.Texture, options: HippoOptions = {}) {
    const scale = options.scale ?? 1.0;
    const castShadow = options.castShadow ?? true;
    const receiveShadow = options.receiveShadow ?? true;

    this.object = new THREE.Group();
    this.object.name = 'Hippo';

    this.rig = new HippoRig(data);
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
      metalness: 0.05,
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
    this.animator = new HippoAnimator(this.rig, data, options.initialState ?? 'walk');
  }

  public setState(state: HippoState): void {
    this.animator.setState(state);
  }

  public restartState(state: HippoState = this.animator.state): void {
    this.animator.restartState(state);
  }

  public getState(): HippoState {
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
 * Summary: Builds a Hippo from the loaded GLB data.
 * @param options Scale, shadows, tint and wireframe.
 * @returns A ready, animatable Hippo.
 * @throws InfrastructureCorruptedException when the model was not loaded yet (see loadAnimalModel).
 */
export function createReadyHippo(options: HippoOptions = {}): Hippo {
  const asset = getLoadedAnimalModel('hippo');
  cachedTexture ??= createAnimalTexture(asset, { colorSpace: THREE.SRGBColorSpace });
  return new Hippo(requireClipRig(asset), cachedTexture, options);
}
