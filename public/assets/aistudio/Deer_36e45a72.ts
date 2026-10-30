/**
 * Deer.ts — Auto-rigged & animated GLB Deer (Stag) for three.js (r128–r186).
 *
 * Takes the normalized `deer.glb` mesh (with surgical mouth cut along the black lip line and inner
 * palate/tongue geometry), binds every vertex to a 27-bone anatomical cervid skeleton (`DeerRig`),
 * keeps the belly 100% isolated from limb bones, keeps the antlers rigid on the skull bone, and drives
 * full procedural animations with foot IK (`solveLeg2`):
 *
 *   - 'idle'  (עמידה)   : alert standing, breathing, ear twitches, calm head look
 *   - 'walk'  (הליכה)   : 4-beat lateral walk with planted hooves (no foot sliding)
 *   - 'eat'   (אכילה)   : lowers neck & head to graze grass, opens cut mouth to chew, periodic look-up
 *   - 'call'  (קריאה)   : stag bugle/bellow — braced stance, arched neck, head tilted back, open mouth
 *   - 'lie'   (שכיבה)   : bedded-down rest pose with all four legs folded cleanly underneath the body
 *   - 'run'   (ריצה)    : fast rotary gallop with spine flexion and antler balance
 *   - 'flee'  (בריחה)   : high-speed evasive sprint, alarm tail flagged upright, darting weave & head checks
 *   - 'skip'  (דילוג)   : classic cervid pronking/stotting — springy 4-legged leaps high into the air
 *   - 'death' (מוות)    : agony cry, buckling legs, and lateral collapse onto the ground
 *
 * Sections: 1. Rig (skeleton)  2. Auto-Skinning & GLB Binding  3. Animator  4. Deer (public API)
 */
import * as THREE from 'three';


// =============================================================================
// 1. RIG
// =============================================================================
export type Side = 'L' | 'R';

export type BoneName =
  | 'root' | 'pelvis' | 'spine1' | 'spine2' | 'chest'
  | 'neck1' | 'neck2' | 'head' | 'jaw' | 'earL' | 'earR'
  | 'tail1' | 'tail2'
  | `scapula${Side}` | `upperArm${Side}` | `foreArm${Side}` | `metacarpus${Side}` | `frontPaw${Side}`
  | `thigh${Side}` | `shin${Side}` | `metatarsus${Side}` | `hindPaw${Side}`;

export type BoneGroup = 'spine' | 'head' | 'tail' | 'frontLeg' | 'hindLeg';

interface BoneDef {
  name: BoneName;
  parent: BoneName | null;
  at: [number, number, number];
  tip: [number, number, number];
  group: BoneGroup;
}

function leftLegDefs(): BoneDef[] {
  return [
    { name: 'scapulaL',    parent: 'chest',      at: [0.078, 0.86, 0.30],  tip: [0.098, 0.56, 0.36],  group: 'frontLeg' },
    { name: 'upperArmL',   parent: 'scapulaL',   at: [0.098, 0.56, 0.36],  tip: [0.102, 0.42, 0.365], group: 'frontLeg' },
    { name: 'foreArmL',    parent: 'upperArmL',  at: [0.102, 0.42, 0.365], tip: [0.096, 0.20, 0.375], group: 'frontLeg' },
    { name: 'metacarpusL', parent: 'foreArmL',   at: [0.096, 0.20, 0.375], tip: [0.094, 0.045, 0.40], group: 'frontLeg' },
    { name: 'frontPawL',   parent: 'metacarpusL',at: [0.094, 0.045, 0.40], tip: [0.094, 0.0, 0.45],   group: 'frontLeg' },

    { name: 'thighL',      parent: 'pelvis',     at: [0.078, 0.60, -0.35], tip: [0.060, 0.43, -0.43], group: 'hindLeg' },
    { name: 'shinL',       parent: 'thighL',     at: [0.060, 0.43, -0.43], tip: [0.056, 0.28, -0.49], group: 'hindLeg' },
    { name: 'metatarsusL', parent: 'shinL',      at: [0.056, 0.28, -0.49], tip: [0.056, 0.045, -0.465],group: 'hindLeg' },
    { name: 'hindPawL',    parent: 'metatarsusL',at: [0.056, 0.045, -0.465],tip:[0.056, 0.0, -0.42],  group: 'hindLeg' },
  ];
}

function mirror(def: BoneDef): BoneDef {
  const flip = (n: string) => n.replace(/L$/, 'R') as BoneName;
  return {
    name: flip(def.name),
    parent: def.parent && /L$/.test(def.parent) ? flip(def.parent) : def.parent,
    at: [-def.at[0], def.at[1], def.at[2]],
    tip: [-def.tip[0], def.tip[1], def.tip[2]],
    group: def.group,
  };
}

export const DEER_BONES: readonly BoneDef[] = (() => {
  const core: BoneDef[] = [
    { name: 'root',   parent: null,     at: [0, 0, 0],            tip: [0, 0.86, -0.34],    group: 'spine' },
    { name: 'pelvis', parent: 'root',   at: [0, 0.86, -0.34],     tip: [0, 0.89, -0.14],    group: 'spine' },
    { name: 'spine1', parent: 'pelvis', at: [0, 0.89, -0.14],     tip: [0, 0.90, 0.06],     group: 'spine' },
    { name: 'spine2', parent: 'spine1', at: [0, 0.90, 0.06],      tip: [0, 0.91, 0.22],     group: 'spine' },
    { name: 'chest',  parent: 'spine2', at: [0, 0.91, 0.22],      tip: [0, 0.78, 0.36],     group: 'spine' },
    { name: 'neck1',  parent: 'chest',  at: [0, 0.78, 0.36],      tip: [0, 1.00, 0.47],     group: 'head' },
    { name: 'neck2',  parent: 'neck1',  at: [0, 1.00, 0.47],      tip: [0, 1.20, 0.56],     group: 'head' },
    { name: 'head',   parent: 'neck2',  at: [0, 1.20, 0.56],      tip: [0, 1.23, 0.90],     group: 'head' },
    { name: 'jaw',    parent: 'head',   at: [0, 1.205, 0.802],    tip: [0, 1.185, 0.890],   group: 'head' },
    { name: 'earL',   parent: 'head',   at: [0.10, 1.35, 0.55],   tip: [0.23, 1.44, 0.52],  group: 'head' },
    { name: 'earR',   parent: 'head',   at: [-0.10, 1.35, 0.55],  tip: [-0.23, 1.44, 0.52], group: 'head' },
    { name: 'tail1',  parent: 'pelvis', at: [0, 0.94, -0.44],     tip: [0, 0.88, -0.50],    group: 'tail' },
    { name: 'tail2',  parent: 'tail1',  at: [0, 0.88, -0.50],     tip: [0, 0.81, -0.56],    group: 'tail' },
  ];
  const legs = leftLegDefs();
  return [...core, ...legs, ...legs.map(mirror)];
})();

export class DeerRig {
  readonly root: THREE.Bone;
  readonly bones: Readonly<Record<BoneName, THREE.Bone>>;
  readonly skeleton: THREE.Skeleton;
  readonly rest: Readonly<Record<BoneName, { at: THREE.Vector3; tip: THREE.Vector3; group: BoneGroup }>>;

  constructor() {
    const bones = {} as Record<BoneName, THREE.Bone>;
    const rest = {} as Record<BoneName, { at: THREE.Vector3; tip: THREE.Vector3; group: BoneGroup }>;

    for (const def of DEER_BONES) {
      const bone = new THREE.Bone();
      bone.name = def.name;
      const world = new THREE.Vector3(...def.at);
      if (def.parent) {
        const parentAt = new THREE.Vector3(...DEER_BONES.find(b => b.name === def.parent)!.at);
        bone.position.copy(world).sub(parentAt);
        bones[def.parent].add(bone);
      } else {
        bone.position.copy(world);
      }
      bones[def.name] = bone;
      rest[def.name] = { at: world, tip: new THREE.Vector3(...def.tip), group: def.group };
    }

    this.root = bones.root;
    this.bones = bones;
    this.rest = rest;
    this.root.updateMatrixWorld(true);
    this.skeleton = new THREE.Skeleton(DEER_BONES.map(d => bones[d.name]));
  }

  resetPose(): void {
    for (const b of Object.values(this.bones)) b.quaternion.identity();
  }

  tipWorld(name: BoneName, target = new THREE.Vector3()): THREE.Vector3 {
    const bone = this.bones[name];
    const r = this.rest[name];
    target.copy(r.tip).sub(r.at);
    bone.updateWorldMatrix(true, false);
    return target.applyMatrix4(bone.matrixWorld);
  }
}


// =============================================================================
// 2. AUTO-SKINNING & GLB BINDING
// =============================================================================
type Weights = [BoneName, number][];

const ss = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);

function normalizeWeights(w: Weights): Weights {
  const merged = new Map<BoneName, number>();
  for (const [b, v] of w) merged.set(b, (merged.get(b) ?? 0) + v);
  const list = [...merged].filter(([, v]) => v > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const sum = list.reduce((s, [, v]) => s + v, 0) || 1;
  return list.map(([b, v]) => [b, v / sum]);
}

const SPINE_KEYS: [number, BoneName][] = [
  [-0.34, 'pelvis'], [-0.14, 'spine1'], [0.06, 'spine2'], [0.24, 'chest'],
];

function spineWeightsAtZ(z: number): Weights {
  if (z <= SPINE_KEYS[0][0]) return [[SPINE_KEYS[0][1], 1]];
  for (let i = 0; i < SPINE_KEYS.length - 1; i++) {
    const [z0, b0] = SPINE_KEYS[i], [z1, b1] = SPINE_KEYS[i + 1];
    if (z <= z1) { const t = (z - z0) / (z1 - z0); return [[b0, 1 - t], [b1, t]]; }
  }
  return [[SPINE_KEYS[SPINE_KEYS.length - 1][1], 1]];
}

export function computeDeerSkinWeights(x: number, y: number, z: number, vertexIndex = 0, jawStartIdx = 999999): Weights {
  if (vertexIndex >= jawStartIdx) {
    const wJaw = ss(z, 0.795, 0.812);
    return [['jaw', wJaw], ['head', 1 - wJaw]];
  }

  if (jawStartIdx === 999999 && y > 1.15 && y < 1.211 && z > 0.805 && Math.abs(x) < 0.055) {
    const wJaw = ss(1.211 - y, 0.0, 0.008) * ss(z, 0.800, 0.815);
    return [['jaw', wJaw], ['head', 1 - wJaw]];
  }

  if (y > 1.40 || (y > 1.29 && z < 0.48)) {
    return [['head', 1]];
  }

  if (y > 1.27 && y <= 1.42 && z > 0.44 && z < 0.64 && Math.abs(x) > 0.11) {
    const earBone: BoneName = x >= 0 ? 'earL' : 'earR';
    const wEar = ss(Math.abs(x), 0.11, 0.18);
    return [[earBone, wEar], ['head', 1 - wEar]];
  }

  const pNeck = y + 1.35 * z;
  if (pNeck > 1.16 && y > 0.60 && z > 0.14) {
    const neckBlend = ss(pNeck, 1.16, 1.40) * ss(y, 0.60, 0.72) * ss(z, 0.14, 0.28);
    if (neckBlend > 0.01) {
      const u = THREE.MathUtils.clamp((y - 0.74) / (1.22 - 0.74) * 0.78 + (z - 0.34) / (0.64 - 0.34) * 0.22, 0, 1);
      let neckW: Weights;
      if (u < 0.36) {
        const t = u / 0.36;
        neckW = [['chest', 1 - t], ['neck1', t]];
      } else if (u < 0.72) {
        const t = (u - 0.36) / 0.36;
        neckW = [['neck1', 1 - t], ['neck2', t]];
      } else {
        const t = (u - 0.72) / 0.28;
        neckW = [['neck2', 1 - t], ['head', t]];
      }
      if (neckBlend >= 0.99) return neckW;
      const torsoW = spineWeightsAtZ(z);
      return normalizeWeights([
        ...neckW.map(([b, w]) => [b, w * neckBlend] as [BoneName, number]),
        ...torsoW.map(([b, w]) => [b, w * (1 - neckBlend)] as [BoneName, number]),
      ]);
    }
  }

  if (z < -0.43 && y > 0.74 && y < 0.98 && Math.abs(x) < 0.10) {
    const wTail = ss(-z, 0.43, 0.48);
    const wTip = ss(-z, 0.49, 0.55);
    return normalizeWeights([
      ['pelvis', 1 - wTail],
      ['tail1', wTail * (1 - wTip)],
      ['tail2', wTail * wTip],
    ]);
  }

  const s: Side = x >= 0 ? 'L' : 'R';
  if (z > 0.23 && y < 0.58) {
    const zGate = ss(z, 0.23, 0.29);
    const xGate = ss(Math.abs(x), 0.030, 0.055);
    const yGate = 1 - ss(y, 0.48, 0.58);
    const legGate = y < 0.45 ? 1.0 : zGate * xGate * yGate;
    if (legGate > 0.005) {
      const paw = `frontPaw${s}` as BoneName;
      const meta = `metacarpus${s}` as BoneName;
      const fore = `foreArm${s}` as BoneName;
      const upper = `upperArm${s}` as BoneName;
      const scap = `scapula${s}` as BoneName;
      let legW: Weights;
      if (y < 0.055) {
        const t = ss(y, 0.02, 0.055);
        legW = [[paw, 1 - t], [meta, t]];
      } else if (y < 0.21) {
        const t = ss(y, 0.17, 0.21);
        legW = [[meta, 1 - t], [fore, t]];
      } else if (y < 0.42) {
        const t = ss(y, 0.37, 0.42);
        legW = [[fore, 1 - t], [upper, t]];
      } else {
        const t = ss(y, 0.49, 0.57);
        legW = [[upper, 1 - t], [scap, t]];
      }
      if (legGate >= 0.995) return legW;
      const torsoW = spineWeightsAtZ(z);
      return normalizeWeights([
        ...legW.map(([b, w]) => [b, w * legGate] as [BoneName, number]),
        ...torsoW.map(([b, w]) => [b, w * (1 - legGate)] as [BoneName, number]),
      ]);
    }
  } else if (z < -0.24 && y < 0.64) {
    const zGate = ss(-z, 0.25, 0.31);
    const xGate = ss(Math.abs(x), 0.022, 0.045);
    const yGate = 1 - ss(y, 0.54, 0.64);
    const legGate = y < 0.50 ? 1.0 : zGate * xGate * yGate;
    if (legGate > 0.005) {
      const paw = `hindPaw${s}` as BoneName;
      const meta = `metatarsus${s}` as BoneName;
      const shin = `shin${s}` as BoneName;
      const thigh = `thigh${s}` as BoneName;
      let legW: Weights;
      if (y < 0.055) {
        const t = ss(y, 0.02, 0.055);
        legW = [[paw, 1 - t], [meta, t]];
      } else if (y < 0.31) {
        const t = ss(y, 0.23, 0.31);
        legW = [[meta, 1 - t], [shin, t]];
      } else if (y < 0.47) {
        const t = ss(y, 0.38, 0.47);
        legW = [[shin, 1 - t], [thigh, t]];
      } else {
        legW = [[thigh, 1]];
      }
      if (legGate >= 0.995) return legW;
      const torsoW = spineWeightsAtZ(z);
      return normalizeWeights([
        ...legW.map(([b, w]) => [b, w * legGate] as [BoneName, number]),
        ...torsoW.map(([b, w]) => [b, w * (1 - legGate)] as [BoneName, number]),
      ]);
    }
  }

  return spineWeightsAtZ(z);
}

export function skinDeerGeometry(geometry: THREE.BufferGeometry, rig: DeerRig): void {
  const pos = geometry.getAttribute('position');
  const count = pos.count;
  const jawStartIdx = (geometry.userData && typeof geometry.userData.jawStartIdx === 'number')
    ? geometry.userData.jawStartIdx
    : 999999;
  const boneIndex = new Map(rig.skeleton.bones.map((b, i) => [b.name as BoneName, i]));
  const skinIndex = new Uint16Array(count * 4);
  const skinWeight = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ws = normalizeWeights(computeDeerSkinWeights(x, y, z, i, jawStartIdx));
    for (let k = 0; k < 4; k++) {
      const e = ws[k];
      skinIndex[i * 4 + k] = e ? boneIndex.get(e[0])! : 0;
      skinWeight[i * 4 + k] = e ? e[1] : 0;
    }
  }

  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
  if (!geometry.getAttribute('normal')) {
    geometry.computeVertexNormals();
  }
  geometry.computeBoundingSphere();
}


// =============================================================================
// 3. ANIMATOR
// =============================================================================
export type DeerState =
  | 'idle' | 'walk' | 'eat' | 'call' | 'lie' | 'run' | 'flee' | 'skip'
  | 'trot' | 'sit' | 'roar' | 'howl' | 'attack' | 'death';

interface Gait {
  speed: number;
  duty: number;
  step: number;
  lift: number;
  offsets: Record<'LH' | 'LF' | 'RH' | 'RF', number>;
  bob: number;
  pitch: number;
  spineFlex: number;
  headBob: number;
  bend: number;
  roll: number;
}

export const DEER_GAITS: Record<'walk' | 'trot' | 'run' | 'flee' | 'skip', Gait> = {
  walk: { speed: 1.35, duty: 0.62, step: 0.40, lift: 0.085, offsets: { LH: 0, LF: 0.25, RH: 0.5, RF: 0.75 },   bob: 0.012, pitch: 0.014, spineFlex: 0.018, headBob: 0.04, bend: 0.025, roll: 0.014 },
  trot: { speed: 3.2,  duty: 0.45, step: 0.48, lift: 0.11,  offsets: { LH: 0, RF: 0, LF: 0.5, RH: 0.5 },       bob: 0.022, pitch: 0.020, spineFlex: 0.035, headBob: 0.03, bend: 0.04,  roll: 0.025 },
  run:  { speed: 6.8,  duty: 0.34, step: 0.56, lift: 0.13,  offsets: { LH: 0, RH: 0.18, RF: 0.5, LF: 0.68 },   bob: 0.030, pitch: 0.040, spineFlex: 0.18,  headBob: 0.03, bend: 0.035, roll: 0.025 },
  flee: { speed: 9.2,  duty: 0.28, step: 0.64, lift: 0.16,  offsets: { LH: 0, RH: 0.14, RF: 0.48, LF: 0.64 },  bob: 0.040, pitch: 0.050, spineFlex: 0.22,  headBob: 0.04, bend: 0.05,  roll: 0.035 },
  skip: { speed: 4.2,  duty: 0.38, step: 0.46, lift: 0.20,  offsets: { LH: 0, RH: 0.04, LF: 0.08, RF: 0.12 },  bob: 0.240, pitch: 0.075, spineFlex: 0.14,  headBob: 0.05, bend: 0.02,  roll: 0.015 },
};

const FADE: Record<DeerState, number> = {
  idle: 0.35, walk: 0.32, eat: 0.65, call: 0.55, lie: 0.90, run: 0.35, flee: 0.30, skip: 0.35,
  trot: 0.32, sit: 0.80, roar: 0.55, howl: 0.55, attack: 0.35, death: 0.25,
};

type Pose = Map<BoneName, THREE.Quaternion>;
interface Track { state: DeerState; weight: number; target: number }

const _m = new THREE.Matrix4();
const _inv = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

interface Chain {
  root: BoneName;
  joints: BoneName[];
  effector: BoneName;
  paw: BoneName;
  limits: [number, number][];
}

const CHAINS: Record<'LF' | 'RF' | 'LH' | 'RH', Chain> = (() => {
  const front = (s: Side): Chain => ({
    root: `upperArm${s}`, joints: [`upperArm${s}`, `foreArm${s}`, `metacarpus${s}`], effector: `frontPaw${s}`, paw: `frontPaw${s}`,
    limits: [[-1.7, 1.1], [-2.1, 0.15], [-0.35, 2.3]],
  });
  const hind = (s: Side): Chain => ({
    root: `thigh${s}`, joints: [`thigh${s}`, `shin${s}`, `metatarsus${s}`], effector: `hindPaw${s}`, paw: `hindPaw${s}`,
    limits: [[-1.9, 1.0], [-0.25, 2.5], [-2.5, 0.35]],
  });
  return { LF: front('L'), RF: front('R'), LH: hind('L'), RH: hind('R') };
})();

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp = THREE.MathUtils.clamp;

export class DeerAnimator {
  moveSpeed = 0;
  turn = 0;

  private tracks: Track[] = [{ state: 'idle', weight: 1, target: 1 }];
  private current: DeerState = 'idle';
  private phase = 0;
  private time = 0;
  private stateTime = 0;
  private poses = new Map<DeerState, Pose>();
  private rootPos = new Map<DeerState, THREE.Vector3>();
  private rootRot = new Map<DeerState, THREE.Quaternion>();
  private names: BoneName[];
  private earTwitch = { L: 0, R: 0, next: 1.8 };
  private lookYaw = 0; private lookTarget = 0; private lookNext = 2.8;
  private turnSmooth = 0;

  constructor(private rig: DeerRig, private mesh: THREE.Object3D) {
    this.names = Object.keys(rig.bones) as BoneName[];
  }

  get state(): DeerState { return this.current; }

  setState(state: DeerState) {
    if (state === this.current && state !== 'death') return;
    this.current = state;
    this.stateTime = 0;
    let t = this.tracks.find(x => x.state === state);
    if (!t) { t = { state, weight: 0, target: 1 }; this.tracks.push(t); }
    for (const x of this.tracks) x.target = x.state === state ? 1 : 0;
  }

  update(dt: number) {
    dt = Math.min(dt, 0.1);
    this.time += dt;
    this.stateTime += dt;

    for (const t of this.tracks) {
      const rate = dt / FADE[t.target > 0 ? t.state : this.current];
      t.weight = t.target > t.weight ? Math.min(1, t.weight + rate) : Math.max(0, t.weight - rate);
    }
    this.tracks = this.tracks.filter(t => t.weight > 0 || t.target > 0);
    const total = this.tracks.reduce((s, t) => s + t.weight, 0) || 1;

    let freq = 0, speed = 0;
    for (const t of this.tracks) {
      const w = t.weight / total;
      if (t.state in DEER_GAITS) {
        const g = DEER_GAITS[t.state as keyof typeof DEER_GAITS];
        freq += w * g.speed / (g.step / g.duty);
        speed += w * g.speed;
      }
    }
    this.phase = (this.phase + freq * dt) % 1;
    this.moveSpeed = speed;
    this.turnSmooth += (this.turn - this.turnSmooth) * Math.min(1, dt * 4);
    this.tickIdleLife(dt);

    for (const t of this.tracks) this.capture(t.state);
    this.blend(total);
  }

  private capture(state: DeerState) {
    const rig = this.rig;
    rig.resetPose();
    rig.root.position.set(0, 0, 0);
    rig.root.quaternion.identity();
    switch (state) {
      case 'idle': this.poseIdle(); break;
      case 'walk': case 'trot': case 'run': case 'flee': case 'skip':
        this.poseGait(DEER_GAITS[state], state);
        break;
      case 'eat':    this.poseEat(); break;
      case 'call': case 'roar': case 'howl': case 'attack':
        this.poseCall();
        break;
      case 'lie':    this.poseLie(); break;
      case 'sit':    this.poseSit(); break;
      case 'death':  this.poseDeath(); break;
    }
    let pose = this.poses.get(state);
    if (!pose) { pose = new Map(); this.poses.set(state, pose); }
    for (const n of this.names) {
      let q = pose.get(n); if (!q) pose.set(n, q = new THREE.Quaternion());
      q.copy(rig.bones[n].quaternion);
    }
    let rp = this.rootPos.get(state); if (!rp) this.rootPos.set(state, rp = new THREE.Vector3());
    rp.copy(rig.root.position);
    let rr = this.rootRot.get(state); if (!rr) this.rootRot.set(state, rr = new THREE.Quaternion());
    rr.copy(rig.root.quaternion);
  }

  private blend(total: number) {
    const rig = this.rig;
    const acc = new Map<BoneName, THREE.Quaternion>();
    const pos = new THREE.Vector3();
    const rot = new THREE.Quaternion();
    let wsum = 0;
    for (const t of this.tracks) {
      if (t.weight <= 0) continue;
      const w = t.weight / total;
      const f = w / (wsum + w);
      const pose = this.poses.get(t.state)!;
      for (const n of this.names) {
        const q = pose.get(n)!;
        const a = acc.get(n);
        if (!a) acc.set(n, q.clone()); else a.slerp(q, f);
      }
      pos.lerp(this.rootPos.get(t.state)!, wsum === 0 ? 1 : f);
      if (wsum === 0) rot.copy(this.rootRot.get(t.state)!); else rot.slerp(this.rootRot.get(t.state)!, f);
      wsum += w;
    }
    for (const n of this.names) rig.bones[n].quaternion.copy(acc.get(n)!);
    rig.root.position.copy(pos);
    rig.root.quaternion.copy(rot);
  }

  private tickIdleLife(dt: number) {
    const e = this.earTwitch;
    e.next -= dt;
    if (e.next <= 0) { (Math.random() < 0.5 ? (e.L = 1) : (e.R = 1)); e.next = 1.4 + Math.random() * 3.5; }
    e.L = Math.max(0, e.L - dt * 4); e.R = Math.max(0, e.R - dt * 4);
    this.lookNext -= dt;
    if (this.lookNext <= 0) { this.lookTarget = (Math.random() - 0.5) * 0.36; this.lookNext = 2.5 + Math.random() * 3.5; }
    this.lookYaw += (this.lookTarget - this.lookYaw) * Math.min(1, dt * 1.5);
  }

  private rotX(name: BoneName, a: number) { this.rig.bones[name].rotation.x += a; }
  private rot(name: BoneName, x: number, y = 0, z = 0) {
    const b = this.rig.bones[name];
    b.rotation.set(b.rotation.x + x, b.rotation.y + y, b.rotation.z + z);
  }

  private ears(back = 0) {
    const e = this.earTwitch;
    this.rot('earL', back * 0.55 + e.L * 0.24 * Math.sin(this.time * 42), -back * 0.25, -e.L * 0.18);
    this.rot('earR', back * 0.55 + e.R * 0.24 * Math.sin(this.time * 42),  back * 0.25,  e.R * 0.18);
  }

  private breathe(rate: number, amount: number) {
    const b = Math.sin(this.time * Math.PI * 2 * rate) * amount;
    this.rotX('spine2', -b * 0.5);
    this.rotX('chest', b * 0.45);
    this.rotX('neck1', b * 0.3);
  }

  private jointPos(name: BoneName, out = new THREE.Vector3()) {
    this.mesh.updateMatrixWorld(true);
    _inv.copy(this.mesh.matrixWorld).invert();
    this.rig.bones[name].getWorldPosition(out);
    return out.applyMatrix4(_inv);
  }

  private bonePitch(name: BoneName) {
    _m.copy(this.mesh.matrixWorld).invert().multiply(this.rig.bones[name].matrixWorld);
    _q.setFromRotationMatrix(_m);
    _e.setFromQuaternion(_q, 'XYZ');
    return _e.x;
  }

  private seg(name: BoneName) {
    const r = this.rig.rest[name];
    const dy = r.tip.y - r.at.y, dz = r.tip.z - r.at.z;
    return { psi: Math.atan2(dz, dy), len: Math.hypot(dy, dz) };
  }

  private solveLeg2(key: keyof typeof CHAINS, paw: THREE.Vector3, distal: number, pawPitch = 0) {
    const ch = CHAINS[key];
    const front = key.endsWith('F');
    const [n0, n1, n2] = ch.joints;
    this.rig.root.updateMatrixWorld(true);
    const parent = this.rig.bones[n0].parent as THREE.Bone;
    const parentPitch = this.bonePitch(parent.name as BoneName);
    const P = this.jointPos(n0);

    if (!front) {
      const home = this.home(key);
      const restP = this.rig.rest[n0].at;
      const restPsi = Math.atan2(home.z - restP.z, home.y - restP.y);
      const curPsi = Math.atan2(paw.z - P.z, paw.y - P.y);
      const legSwing = Math.atan2(Math.sin(curPsi - restPsi), Math.cos(curPsi - restPsi));
      const flex = clamp((paw.y - home.y) / 0.14, 0, 1.35);

      const wThigh = legSwing * 0.88 - flex * 0.28;
      const wShin  = legSwing * 0.96 + flex * 0.34;
      const wMeta  = legSwing * 1.02 - flex * 0.18 + distal * 0.35;

      const d0 = wThigh - parentPitch;
      const d1 = wShin - wThigh;
      const d2 = wMeta - wShin;
      this.rig.bones[n0].rotation.x = d0;
      this.rig.bones[n1].rotation.x = d1;
      this.rig.bones[n2].rotation.x = d2;
      this.rig.bones[ch.paw].rotation.x = -wMeta + pawPitch;
      return;
    }

    const s0 = this.seg(n0), s1 = this.seg(n1), s2 = this.seg(n2);
    const psi2 = s2.psi + distal;
    const Wy = paw.y - Math.cos(psi2) * s2.len, Wz = paw.z - Math.sin(psi2) * s2.len;
    const dy = Wy - P.y, dz = Wz - P.z;
    const a = s0.len, b = s1.len;
    const L = a + b, soft = L * 0.94;
    let d = Math.hypot(dy, dz);
    if (d > soft) d = soft + (L - soft) * (1 - Math.exp(-(d - soft) / (L - soft)));
    d = Math.max(d, Math.abs(a - b) + 1e-4);
    const base = Math.atan2(dz, dy);
    const off = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
    const side = (psi: number) => dy * Math.sin(psi) - dz * Math.cos(psi);
    let psi0 = base + off;
    if (side(psi0) < 0) psi0 = base - off;
    const Ey = P.y + Math.cos(psi0) * a, Ez = P.z + Math.sin(psi0) * a;
    const psi1 = Math.atan2(Wz - Ez, Wy - Ey);

    const d0 = psi0 - s0.psi - parentPitch;
    const d1 = psi1 - s1.psi - (parentPitch + d0);
    const d2 = psi2 - s2.psi - (parentPitch + d0 + d1);
    this.rig.bones[n0].rotation.x = d0;
    this.rig.bones[n1].rotation.x = d1;
    this.rig.bones[n2].rotation.x = d2;
    this.rig.bones[ch.paw].rotation.x = -(parentPitch + d0 + d1 + d2) + pawPitch;
  }

  private home(key: keyof typeof CHAINS) {
    const p = this.rig.rest[CHAINS[key].effector].at;
    return new THREE.Vector3(p.x, p.y, p.z);
  }

  private standLegs(dz = 0) {
    for (const k of ['LF', 'RF', 'LH', 'RH'] as const) {
      const h = this.home(k); h.z += dz;
      this.solveLeg2(k, h, 0);
    }
  }

  private headLook(yaw: number, pitch = 0) {
    this.rot('neck1', pitch * 0.35, yaw * 0.35);
    this.rot('neck2', pitch * 0.35, yaw * 0.35);
    this.rot('head', pitch * 0.30, yaw * 0.30);
  }

  private tail(lift: number, swayAmp: number, swayRate: number) {
    this.rot('tail1', lift * 0.6, swayAmp * Math.sin(this.time * swayRate));
    this.rot('tail2', lift * 0.4, swayAmp * 1.2 * Math.sin(this.time * swayRate - 0.5));
  }

  private turnBody(k: number, extraTurn = 0) {
    const t = (this.turnSmooth + extraTurn) * k;
    this.rot('spine1', 0, t * 0.12); this.rot('spine2', 0, t * 0.12); this.rot('chest', 0, t * 0.10);
    this.rot('neck1', 0, t * 0.22); this.rot('head', 0, t * 0.16);
    this.rot('tail1', 0, -t * 0.25);
  }

  // ---------------------------------------------------------------------------
  // States: idle, walk, eat, call, lie, sit, death, run, flee, skip
  // ---------------------------------------------------------------------------
  private poseIdle() {
    const t = this.time;
    this.rig.root.position.y = Math.sin(t * Math.PI * 2 * 0.25) * 0.004;
    this.breathe(0.25, 0.02);
    this.headLook(this.lookYaw * 0.5 + this.turnSmooth * 0.3, Math.sin(t * 0.4) * 0.03);
    this.ears();
    this.tail(0, 0.10, 1.6);
    this.rig.root.updateMatrixWorld(true);
    this.standLegs();
  }

  private poseEat() {
    const t = this.time;
    const cycle = t % 7.5;
    const lookUp = ss(cycle, 5.2, 5.7) * (1 - ss(cycle, 6.6, 7.2));
    const graze = 1 - lookUp;

    this.rig.root.position.y = -0.05 * graze;
    this.rig.root.rotation.x = 0.12 * graze;
    this.rotX('spine1', 0.04 * graze);
    this.rotX('spine2', 0.10 * graze);
    this.rotX('chest', 0.18 * graze);

    const nibblePitch = graze * (0.04 * Math.sin(t * 7.2) + 0.02 * Math.cos(t * 11.3));
    const sweepYaw = graze * 0.10 * Math.sin(t * 1.3) + lookUp * 0.22 * Math.sin(t * 2.0) + this.turnSmooth * 0.25;
    this.rot('neck1', 0.56 * graze + 0.12 * lookUp, sweepYaw * 0.40);
    this.rot('neck2', 0.52 * graze + 0.08 * lookUp + nibblePitch * 0.5, sweepYaw * 0.35);
    this.rot('head', -0.22 * graze - 0.04 * lookUp + nibblePitch, sweepYaw * 0.25);

    this.rotX('jaw', 0.14 + 0.26 * (0.5 + 0.5 * Math.sin(t * 9.0)));
    this.ears(0.12 * graze);
    this.tail(-0.15, 0.22, 4.5);

    this.rig.root.updateMatrixWorld(true);
    const lf = this.home('LF'); lf.z += 0.06;
    const rf = this.home('RF'); rf.z -= 0.04;
    const lh = this.home('LH');
    const rh = this.home('RH');
    this.solveLeg2('LF', lf, 0);
    this.solveLeg2('RF', rf, 0);
    this.solveLeg2('LH', lh, 0);
    this.solveLeg2('RH', rh, 0);
  }

  private poseCall() {
    const t = this.time;
    const pulse = Math.sin(t * 5.5);
    this.rig.root.position.y = -0.02 + 0.008 * pulse;
    this.rig.root.rotation.x = -0.06;

    this.rotX('spine1', 0.04);
    this.rotX('spine2', -0.05 + 0.02 * pulse);
    this.rotX('chest', -0.10 + 0.03 * pulse);
    this.rot('neck1', 0.18, this.turnSmooth * 0.2);
    this.rot('neck2', -0.22, 0);
    this.rot('head', -0.42 + 0.03 * Math.sin(t * 9.0), 0);
    this.rotX('jaw', 0.42 + 0.10 * Math.sin(t * 8.5));
    this.ears(0.68);
    this.tail(-0.35, 0.18, 3.8);

    this.rig.root.updateMatrixWorld(true);
    for (const k of ['LF', 'RF'] as const) {
      const h = this.home(k); h.z += 0.05;
      this.solveLeg2(k, h, 0);
    }
    for (const k of ['LH', 'RH'] as const) {
      const h = this.home(k); h.z -= 0.04;
      this.solveLeg2(k, h, 0);
    }
  }

  private poseLie() {
    const rig = this.rig;
    rig.root.position.y = -0.48;
    rig.root.rotation.x = -0.02;
    this.rotX('spine1', 0.04);
    this.rotX('spine2', 0.04);
    this.rotX('chest', -0.04);
    this.rotX('neck1', -0.14);
    this.rotX('neck2', 0.08);
    this.rotX('head', 0.08);
    this.breathe(0.20, 0.025);
    this.headLook(this.lookYaw * 0.5 + this.turnSmooth * 0.3, Math.sin(this.time * 0.5) * 0.025);
    this.ears(0.08);
    this.tail(0.35, 0.06, 1.2);

    for (const [s, sign] of [['L', 1], ['R', -1]] as const) {
      rig.bones[`upperArm${s}` as BoneName].rotation.set(-0.95, 0, -0.06 * sign);
      rig.bones[`foreArm${s}` as BoneName].rotation.set(2.15, 0, 0);
      rig.bones[`metacarpus${s}` as BoneName].rotation.set(-0.35, 0, 0);
      rig.bones[`frontPaw${s}` as BoneName].rotation.set(-0.65, 0, 0);

      rig.bones[`thigh${s}` as BoneName].rotation.set(-1.10, 0, -0.08 * sign);
      rig.bones[`shin${s}` as BoneName].rotation.set(-0.35, 0, 0);
      rig.bones[`metatarsus${s}` as BoneName].rotation.set(0.10, 0, 0);
      rig.bones[`hindPaw${s}` as BoneName].rotation.set(1.30, 0, 0);
    }
  }

  private poseSit() {
    const rig = this.rig;
    rig.root.rotation.x = -0.76;
    rig.root.updateMatrixWorld(true);
    const pelvis = this.jointPos('pelvis');
    rig.root.position.set(0, 0.34 - pelvis.y, -0.18 - pelvis.z);
    this.rotX('spine1', 0.08); this.rotX('spine2', 0.08); this.rotX('chest', 0.14);
    this.rotX('neck1', 0.35); this.rotX('neck2', 0.18); this.rotX('head', 0.16);
    this.breathe(0.22, 0.02);
    this.headLook(this.lookYaw * 0.5, 0);
    this.ears();
    this.tail(0.45, 0.08, 1.2);
    rig.root.updateMatrixWorld(true);
    for (const k of ['LF', 'RF'] as const) {
      const shoulder = this.jointPos(CHAINS[k].root);
      const h = this.home(k); h.z = shoulder.z + 0.02;
      this.solveLeg2(k, h, 0);
    }
    for (const [s, sign] of [['L', 1], ['R', -1]] as const) {
      rig.bones[`thigh${s}` as BoneName].rotation.set(-0.65, 0, -0.08 * sign);
      rig.bones[`shin${s}` as BoneName].rotation.set(-0.20, 0, 0);
      rig.bones[`metatarsus${s}` as BoneName].rotation.set(0.10, 0, 0);
      rig.bones[`hindPaw${s}` as BoneName].rotation.set(0.75, 0, 0);
    }
  }

  /**
   * מוות ('death') — Dramatic stag collapse: initial rear-back & open-mouth cry, buckling knees,
   * and lateral roll onto the ground (clamped at completion so the deer remains fallen on the ground).
   */
  private poseDeath() {
    const rig = this.rig;
    const t = Math.min(this.stateTime, 1.8);
    const uBuckle = ss(t, 0.0, 0.45);
    const uFall = ss(t, 0.30, 1.15);
    const uSettle = ss(t, 1.0, 1.55);

    rig.root.position.set(
      0.72 * uFall,
      -0.18 * uBuckle * (1 - uFall) + 0.10 * uFall,
      0,
    );
    rig.root.rotation.set(
      0.06 * uBuckle * (1 - uFall),
      0,
      1.48 * uFall,
    );

    this.rot('spine1', 0.06 * (1 - uFall), 0, -0.06 * uFall);
    this.rot('spine2', -0.08 * uBuckle * (1 - uFall), 0, -0.06 * uFall);
    this.rot('chest', -0.12 * uBuckle * (1 - uFall), 0, -0.05 * uFall);

    this.rot('neck1', -0.22 * uBuckle * (1 - 0.5 * uFall) + 0.25 * uSettle, 0.18 * uFall, -0.12 * uFall);
    this.rot('neck2', -0.20 * uBuckle * (1 - 0.6 * uFall) + 0.22 * uSettle, 0.15 * uFall, -0.10 * uFall);
    this.rot('head', -0.35 * uBuckle * (1 - 0.7 * uFall) + 0.15 * uSettle, 0.10 * uFall, -0.08 * uFall);
    this.rotX('jaw', 0.46 * uBuckle * (1 - 0.55 * uSettle));

    this.rot('earL', 0.65 * uBuckle, -0.25 * uFall, 0);
    this.rot('earR', 0.65 * uBuckle,  0.25 * uFall, 0);
    this.rot('tail1', 0.35 * uFall, 0, 0);

    for (const [s, sign] of [['L', 1], ['R', -1]] as const) {
      const twitch = (1 - uSettle) * uFall * 0.18 * Math.sin(t * 14.0 + sign);
      rig.bones[`upperArm${s}` as BoneName].rotation.set(-0.65 * uBuckle * (1 - 0.5 * uFall) + twitch, 0, -0.06 * sign);
      rig.bones[`foreArm${s}` as BoneName].rotation.set(1.45 * uBuckle * (1 - 0.65 * uFall), 0, 0);
      rig.bones[`metacarpus${s}` as BoneName].rotation.set(-0.25 * uFall, 0, 0);
      rig.bones[`frontPaw${s}` as BoneName].rotation.set(-0.40 * uFall, 0, 0);

      rig.bones[`thigh${s}` as BoneName].rotation.set(-0.55 * uBuckle * (1 - 0.4 * uFall) - twitch, 0, -0.06 * sign);
      rig.bones[`shin${s}` as BoneName].rotation.set(-0.28 * uBuckle * (1 - 0.5 * uFall), 0, 0);
      rig.bones[`metatarsus${s}` as BoneName].rotation.set(0.15 * uFall, 0, 0);
      rig.bones[`hindPaw${s}` as BoneName].rotation.set(0.55 * uFall, 0, 0);
    }
  }

  private poseGait(g: Gait, name: 'walk' | 'trot' | 'run' | 'flee' | 'skip') {
    const rig = this.rig, ph = this.phase, tau = Math.PI * 2;
    const isGallop = name === 'run' || name === 'flee';
    const isSkip = name === 'skip';
    const beats = isGallop || isSkip ? 1 : 2;
    const wave = Math.sin(ph * tau * beats);

    let fleeWeave = 0;
    if (isSkip) {
      const leapArc = Math.max(0, Math.sin((ph - 0.18) * tau));
      rig.root.position.y = -0.03 + g.bob * leapArc;
      rig.root.rotation.x = g.pitch * Math.cos((ph - 0.18) * tau);
      const arch = Math.sin((ph - 0.18) * tau);
      this.rotX('spine1', -g.spineFlex * arch);
      this.rotX('spine2', -g.spineFlex * 0.6 * arch);
      this.rotX('chest', g.spineFlex * 0.5 * arch);
    } else if (isGallop) {
      rig.root.position.y = -0.04 + g.bob * 0.5 * (1 + Math.cos(tau * 2 * (ph - 0.4)));
      rig.root.rotation.x = g.pitch * Math.sin(tau * (ph - 0.4));
      const gather = Math.cos(tau * (ph - 0.95));
      this.rotX('spine1', g.spineFlex * gather);
      this.rotX('spine2', g.spineFlex * 0.5 * gather);
      this.rotX('chest', -g.spineFlex * 0.9 * gather);
      if (name === 'flee') {
        fleeWeave = 0.35 * Math.sin(this.time * 3.8);
        rig.root.position.x = 0.10 * Math.sin(this.time * 3.8);
      }
    } else {
      rig.root.position.y = -g.bob * 0.5 + g.bob * 0.5 * Math.cos(ph * tau * beats) - (name === 'trot' ? 0.02 : 0.012);
      rig.root.rotation.x = g.pitch * Math.sin(ph * tau);
      const flex = g.spineFlex * Math.sin(ph * tau + 1.2);
      this.rotX('spine1', -flex * 0.6);
      this.rotX('spine2', -flex * 0.4);
      this.rotX('chest', flex * 0.3);
    }

    const headDrop = name === 'flee' ? 0.28 : name === 'run' ? 0.22 : name === 'skip' ? -0.08 : name === 'trot' ? 0.10 : 0.05;
    const alertGlance = name === 'flee' ? 0.24 * Math.sin(this.time * 4.5 + 0.9) : 0;
    this.rot('neck1', headDrop * 0.55, alertGlance * 0.4);
    this.rot('neck2', headDrop * 0.25, alertGlance * 0.3);
    this.rot('head', -headDrop * 0.50 - g.headBob * wave, alertGlance * 0.3);
    if (isGallop) this.rotX('jaw', (name === 'flee' ? 0.20 : 0.10) + 0.04 * Math.sin(this.time * 12));

    this.ears(name === 'flee' ? 0.80 : name === 'run' ? 0.55 : name === 'skip' ? 0.15 : 0);
    const tailLift = name === 'flee' ? -1.25 : name === 'skip' ? -0.95 : name === 'run' ? -0.55 : -0.15;
    this.tail(tailLift, name === 'flee' ? 0.25 : 0.12, tau * (g.speed / (g.step / g.duty)));

    this.spineWave(g);
    this.turnBody(isGallop ? 0.7 : 1, fleeWeave);
    rig.root.updateMatrixWorld(true);

    for (const key of ['LF', 'RF', 'LH', 'RH'] as const) {
      const p = (ph + g.offsets[key]) % 1;
      const home = this.home(key);
      const reach = g.step;
      const front = key.endsWith('F');
      const target = home.clone();
      const swingAngle = (dz: number) => Math.atan2(dz, 0.58);
      const k = front ? 0.3 : 0.45;
      const peel = front ? 0.42 : 0.14;
      const fold = front ? (isGallop || isSkip ? 0.95 : 0.80) : (isGallop || isSkip ? 0.28 : 0.20);
      const toePeel = front ? 0.42 : 0.28, toeFold = front ? 0.32 : 0.22;
      let distal: number, pawPitch: number;

      if (p < g.duty) {
        const s = p / g.duty;
        target.z += reach * (0.5 - s);
        const lift = smooth(clamp((s - 0.72) / 0.28, 0, 1));
        distal = -swingAngle(target.z - home.z) * k + lift * peel;
        pawPitch = lift * toePeel;
      } else {
        const s = (p - g.duty) / (1 - g.duty);
        const e = smooth(s);
        target.z += reach * (e - 0.5);
        target.y += g.lift * Math.sin(Math.PI * s);
        const bell = Math.sin(Math.PI * s);
        const carry = 1 - smooth(clamp(s / 0.6, 0, 1));
        distal = -swingAngle(target.z - home.z) * k + carry * peel + bell * fold;
        pawPitch = carry * toePeel + bell * toeFold;
      }
      if (isGallop) target.z += front ? 0.04 : 0.02;
      this.solveLeg2(key, target, distal, pawPitch);
    }
  }

  private spineWave(g: Gait) {
    const tau = Math.PI * 2, ph = this.phase;
    const hipYaw = -g.bend * Math.cos(tau * (ph - g.offsets.LH));
    const shoulderYaw = -g.bend * Math.cos(tau * (ph - g.offsets.LF));
    const rel = shoulderYaw - hipYaw;
    const root = this.rig.root;
    root.rotation.y += hipYaw;
    root.rotation.z += g.roll * Math.sin(tau * (ph - g.offsets.LH));
    this.rot('spine1', 0, rel * 0.3, -g.roll * 0.3 * Math.sin(tau * (ph - g.offsets.LH)));
    this.rot('spine2', 0, rel * 0.35);
    this.rot('chest', 0, rel * 0.35, g.roll * 0.5 * Math.sin(tau * (ph - g.offsets.LF)));
    this.rot('neck1', 0, -shoulderYaw * 0.45);
    this.rot('neck2', 0, -shoulderYaw * 0.35);
    this.rot('head', 0, -shoulderYaw * 0.20);
    this.rot('tail1', 0, -hipYaw * 1.4);
  }
}


// =============================================================================
// 4. DEER (PUBLIC API)
// =============================================================================
export class Deer {
  readonly object: THREE.Group;
  readonly mesh: THREE.SkinnedMesh;
  readonly rig: DeerRig;
  readonly animator: DeerAnimator;

  constructor(geometry: THREE.BufferGeometry, material: THREE.Material, scale = 1) {
    this.rig = new DeerRig();
    const geom = geometry.clone();
    if (geometry.userData && typeof geometry.userData.jawStartIdx === 'number') {
      geom.userData = { ...geometry.userData };
    }
    skinDeerGeometry(geom, this.rig);

    this.mesh = new THREE.SkinnedMesh(geom, material);
    this.mesh.name = 'DeerGLB';
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;

    this.rig.resetPose();
    this.mesh.add(this.rig.root);
    this.mesh.updateMatrixWorld(true);
    this.rig.skeleton.calculateInverses();
    this.mesh.bind(this.rig.skeleton, this.mesh.matrixWorld);

    this.object = new THREE.Group();
    this.object.name = 'DeerRoot';
    this.object.add(this.mesh);
    if (scale !== 1) this.object.scale.setScalar(scale);

    this.animator = new DeerAnimator(this.rig, this.mesh);
    this.animator.update(0);
  }

  get state(): DeerState { return this.animator.state; }
  setState(state: DeerState) { this.animator.setState(state); }

  get moveSpeed() { return this.animator.moveSpeed * this.object.scale.z; }

  get turn() { return this.animator.turn; }
  set turn(v: number) { this.animator.turn = THREE.MathUtils.clamp(v, -1, 1); }

  update(dt: number) { this.animator.update(dt); }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.rig.skeleton.dispose();
  }
}
