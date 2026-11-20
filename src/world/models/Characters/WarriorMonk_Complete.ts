import * as THREE from 'three';
import { createCharacterTexture, getLoadedCharacterModel } from './characterAssets';

export type WarriorMonkClipName = 'idle' | 'walk' | 'run' | 'sleep' | 'sit' | 'pray_kneel' | 'attack1' | 'attack2' | 'attack3' | 'staff_spin' | 'death';
export type WarriorMonkState = WarriorMonkClipName | 'attack' | 'attack_combo';

export const MONK_CLIP_NAMES: WarriorMonkClipName[] = [
  'idle', 'walk', 'run', 'sleep', 'sit', 'pray_kneel', 'attack1', 'attack2', 'attack3', 'staff_spin', 'death'
];

export const MONK_TOTAL_INDICES = 162006;
export const MONK_BODY_INDICES = 133851;

export interface WarriorMonkAssets {
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
  parents: Int8Array;
  restTranslations: Float32Array;
  restRotations: Float32Array;
  inverseBindMatrices: Float32Array;
  clips: Record<WarriorMonkClipName, THREE.AnimationClip>;
}

let cachedAssets: WarriorMonkAssets | null = null;

/**
 * Summary: Builds (once) the shared geometry, material and clips of the WarriorMonk from the loaded GLB.
 * @throws InfrastructureCorruptedException when the model was not loaded yet (see loadCharacterModel).
 */
export function getWarriorMonkAssets(): WarriorMonkAssets {
  if (cachedAssets) return cachedAssets;
  const model = getLoadedCharacterModel('warrior-monk');
  const material = new THREE.MeshStandardMaterial({
    map: createCharacterTexture(model, [215, 145, 55]),
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0.03,
    side: THREE.DoubleSide
  });
  cachedAssets = {
    geometry: model.geometry,
    material,
    parents: model.parents,
    restTranslations: model.restTranslations,
    restRotations: model.restRotations,
    inverseBindMatrices: model.inverseBindMatrices,
    clips: model.clips as Record<WarriorMonkClipName, THREE.AnimationClip>,
  };
  return cachedAssets;
}

export interface WarriorMonkSpawnOptions {
  initialState?: WarriorMonkState;
  weaponVisible?: boolean;
  tintHex?: number;
  scale?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  driveRootMotion?: boolean;
}

export type IWarriorMonkRig = WarriorMonk;

export function createReadyWarriorMonk(options?: WarriorMonkSpawnOptions): WarriorMonk {
  const baseAssets = getWarriorMonkAssets();
  const monk = new WarriorMonk({
    ...baseAssets,
    material: baseAssets.material,
  });
  if (options?.driveRootMotion !== undefined) {
    monk.driveRootMotion = options.driveRootMotion;
  }
  if (options?.initialState !== undefined) {
    monk.setState(options.initialState, 0);
  }
  if (options?.weaponVisible !== undefined) {
    monk.setWeaponVisible(options.weaponVisible);
  }
  if (options?.scale !== undefined && options.scale !== 1) {
    monk.group.scale.setScalar(options.scale);
  }
  if (options?.castShadow !== undefined) {
    monk.skinnedMesh.castShadow = options.castShadow;
  }
  if (options?.receiveShadow !== undefined) {
    monk.skinnedMesh.receiveShadow = options.receiveShadow;
  }
  return monk;
}

export class WarriorMonk {
  public readonly group = new THREE.Group();
  public skinnedMesh!: THREE.SkinnedMesh;
  public skeleton!: THREE.Skeleton;
  public bones: THREE.Bone[] = [];
  public weaponNode: THREE.Bone | null = null;
  public mixer!: THREE.AnimationMixer;
  public actions: Partial<Record<WarriorMonkClipName, THREE.AnimationAction>> = {};

  public state: WarriorMonkState = 'idle';
  public speed: number = 0;
  public turn: number = 0;
  public timeScale: number = 1.0;
  public weaponVisible: boolean = true;
  public driveRootMotion: boolean = true;

  private restTranslations!: Float32Array;
  private restRotations!: Float32Array;
  private currentAction: THREE.AnimationAction | null = null;
  private comboMode: boolean = false;
  private comboStage: number = 0;
  private comboTimer: number = 0;
  private spineBones: THREE.Bone[] = [];
  private neckHeadBones: THREE.Bone[] = [];
  private readonly _steerQ = new THREE.Quaternion();
  private readonly _axisY = new THREE.Vector3(0, 1, 0);

  constructor(assets: WarriorMonkAssets) {
    this.buildFromAssets(assets);
  }

  private buildFromAssets(assets: WarriorMonkAssets): void {
    this.restTranslations = assets.restTranslations;
    this.restRotations = assets.restRotations;
    const numJoints = assets.parents.length;
    this.bones = new Array(numJoints);
    const boneInverses: THREE.Matrix4[] = new Array(numJoints);

    for (let j = 0; j < numJoints; j++) {
      const bone = new THREE.Bone();
      bone.name = `J${j}`;
      bone.position.set(
        assets.restTranslations[j * 3 + 0],
        assets.restTranslations[j * 3 + 1],
        assets.restTranslations[j * 3 + 2]
      );
      bone.quaternion.set(
        assets.restRotations[j * 4 + 0],
        assets.restRotations[j * 4 + 1],
        assets.restRotations[j * 4 + 2],
        assets.restRotations[j * 4 + 3]
      );
      this.bones[j] = bone;

      const ibm = new THREE.Matrix4();
      ibm.fromArray(assets.inverseBindMatrices, j * 16);
      boneInverses[j] = ibm;
    }

    for (let j = 0; j < numJoints; j++) {
      const p = assets.parents[j];
      if (p >= 0) {
        this.bones[p].add(this.bones[j]);
      }
    }

    this.skeleton = new THREE.Skeleton(this.bones, boneInverses);
    this.skinnedMesh = new THREE.SkinnedMesh(assets.geometry.clone(), assets.material);
    this.skinnedMesh.castShadow = true;
    this.skinnedMesh.receiveShadow = true;
    this.skinnedMesh.frustumCulled = false;

    this.skinnedMesh.add(this.bones[0]);
    this.skinnedMesh.bind(this.skeleton);
    this.group.add(this.skinnedMesh);
    this.weaponNode = this.bones[18] ?? null;

    this.spineBones = [this.bones[1], this.bones[2], this.bones[3]];
    this.neckHeadBones = [this.bones[4], this.bones[5]];

    this.mixer = new THREE.AnimationMixer(this.skinnedMesh);
    for (const name of MONK_CLIP_NAMES) {
      const clip = assets.clips[name];
      if (clip) {
        const action = this.mixer.clipAction(clip);
        if (name === 'death') {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        }
        this.actions[name] = action;
      }
    }

    this.setState('idle', 0);
  }

  public resetToRest(): void {
    this.mixer.stopAllAction();
    this.currentAction = null;
    for (let j = 0; j < this.bones.length; j++) {
      this.bones[j].position.set(
        this.restTranslations[j * 3 + 0],
        this.restTranslations[j * 3 + 1],
        this.restTranslations[j * 3 + 2]
      );
      this.bones[j].quaternion.set(
        this.restRotations[j * 4 + 0],
        this.restRotations[j * 4 + 1],
        this.restRotations[j * 4 + 2],
        this.restRotations[j * 4 + 3]
      );
    }
    this.skeleton.update();
  }

  public setNormalizedPhase(stateOrPhase: WarriorMonkState | number, maybePhase?: number): void {
    let u = 0;
    if (typeof stateOrPhase === 'string') {
      if (this.state !== stateOrPhase || !this.currentAction) {
        this.setState(stateOrPhase, 0);
      }
      u = maybePhase ?? 0;
    } else {
      u = stateOrPhase;
    }
    if (!this.currentAction) return;
    const clip = this.currentAction.getClip();
    if (!clip || clip.duration <= 0) return;
    const clamped = ((u % 1) + 1) % 1;
    this.currentAction.time = clamped * clip.duration;
    this.mixer.update(0);
    if (!this.driveRootMotion && this.bones[0] && this.restTranslations) {
      this.bones[0].position.x = this.restTranslations[0];
      this.bones[0].position.z = this.restTranslations[2];
    }
  }

  public setWeaponVisible(visible: boolean): void {
    this.weaponVisible = visible;
    if (this.skinnedMesh && this.skinnedMesh.geometry) {
      this.skinnedMesh.geometry.setDrawRange(0, visible ? MONK_TOTAL_INDICES : MONK_BODY_INDICES);
    }
  }

  private playClipAction(clipName: WarriorMonkClipName, fadeDuration: number = 0.22): void {
    const nextAction = this.actions[clipName];
    if (!nextAction) return;
    nextAction.reset();
    nextAction.enabled = true;
    nextAction.setEffectiveTimeScale(1);
    nextAction.setEffectiveWeight(1);
    if (this.currentAction && this.currentAction !== nextAction && fadeDuration > 0) {
      this.currentAction.crossFadeTo(nextAction, fadeDuration, true);
      nextAction.play();
    } else {
      if (this.currentAction) this.currentAction.stop();
      nextAction.play();
    }
    this.currentAction = nextAction;
  }

  public setState(nextState: WarriorMonkState, fadeDuration: number = 0.24): void {
    if (nextState === 'attack' || nextState === 'attack_combo') {
      this.state = nextState;
      this.comboMode = true;
      this.comboStage = 0;
      this.comboTimer = 0;
      this.playClipAction('attack1', fadeDuration);
      return;
    }
    this.comboMode = false;
    const clipName = nextState as WarriorMonkClipName;
    if (
      this.state === nextState &&
      this.currentAction === this.actions[clipName] &&
      (nextState === 'death' || this.currentAction?.isRunning() || this.currentAction?.paused)
    ) {
      return;
    }
    this.state = nextState;
    this.playClipAction(clipName, fadeDuration);
  }

  public update(dt: number): void {
    let animRate = this.timeScale;
    if (this.state === 'walk' && this.speed > 0.01) {
      animRate *= THREE.MathUtils.clamp(this.speed / 1.8, 0.5, 2.0);
    } else if (this.state === 'run' && this.speed > 0.01) {
      animRate *= THREE.MathUtils.clamp(this.speed / 5.2, 0.5, 2.2);
    }

    if (this.comboMode) {
      const stages: WarriorMonkClipName[] = ['attack1', 'attack2', 'attack3'];
      const curClip = this.actions[stages[this.comboStage]]?.getClip();
      const stageDur = curClip ? Math.max(0.2, curClip.duration * 0.88) : 0.9;
      this.comboTimer += dt * animRate;
      if (this.comboTimer >= stageDur) {
        this.comboTimer = 0;
        this.comboStage = (this.comboStage + 1) % 3;
        this.playClipAction(stages[this.comboStage], 0.14);
      }
    }

    if (this.state === 'death' && this.currentAction) {
      const clip = this.currentAction.getClip();
      if (clip && clip.duration > 0) {
        const nextTime = this.currentAction.time + dt * animRate;
        if (nextTime >= clip.duration * 0.96) {
          this.currentAction.paused = false;
          this.currentAction.time = clip.duration * 0.99;
          this.mixer.update(0);
        } else {
          this.mixer.update(dt * animRate);
        }
      } else {
        this.mixer.update(dt * animRate);
      }
    } else if (
      (this.state === 'sleep' || this.state === 'sit' || this.state === 'pray_kneel') &&
      this.currentAction
    ) {
      const clip = this.currentAction.getClip();
      if (clip && clip.duration > 0) {
        const nextTime = this.currentAction.time + dt * animRate;
        if (nextTime >= clip.duration * 0.92) {
          this.comboTimer += dt;
          this.currentAction.time =
            clip.duration * (0.91 + 0.04 * Math.sin(this.comboTimer * 2.0));
          this.mixer.update(0);
        } else {
          this.mixer.update(dt * animRate);
        }
      } else {
        this.mixer.update(dt * animRate);
      }
    } else {
      this.mixer.update(dt * animRate);
    }

    if (!this.driveRootMotion && this.bones[0] && this.restTranslations) {
      this.bones[0].position.x = this.restTranslations[0];
      this.bones[0].position.z = this.restTranslations[2];
    }

    if (Math.abs(this.turn) > 0.001 && this.state !== 'death' && this.state !== 'sleep') {
      const bend = THREE.MathUtils.clamp(this.turn, -1, 1) * 0.12;
      this._steerQ.setFromAxisAngle(this._axisY, bend * 0.55);
      for (let i = 0; i < this.spineBones.length; i++) {
        this.spineBones[i].quaternion.multiply(this._steerQ);
      }
      this._steerQ.setFromAxisAngle(this._axisY, bend * 0.85);
      for (let i = 0; i < this.neckHeadBones.length; i++) {
        this.neckHeadBones[i].quaternion.multiply(this._steerQ);
      }
    }

    if (this.driveRootMotion && this.speed > 0.001 && this.state !== 'death' && this.state !== 'sleep' && this.state !== 'sit') {
      this.group.rotation.y += this.turn * dt * 1.8;
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(this._axisY, this.group.rotation.y);
      this.group.position.addScaledVector(forward, this.speed * dt);
    }
  }

  public dispose(): void {
    this.mixer.stopAllAction();
    this.skinnedMesh.geometry.dispose();
  }
}

