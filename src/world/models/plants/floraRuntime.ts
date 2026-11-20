// ============================================================================
// MODULE: World / Models / Plants / Flora Runtime
// DESIGN: One shared runtime for every packed plant model (previously copied into each file)
// SUMMARY: Unpacks the quantized plant bundles into submesh arrays and animates them (wind
//          sway, axe hit, tree fall) through FloraModel and FloraLODPair. Holds no model data.
// ============================================================================

import * as THREE from 'three';

export type FloraCategory = 'trees' | 'other_trees' | 'vegetation';

export type FloraKey =
  | 'animtree'
  | 'animtree_wide'
  | 'animtree_compact'
  | 'pinetree'
  | 'oakgreen'
  | 'oakyellow'
  | 'forestbush'
  | 'forestfern'
  | 'cornflower'
  | 'whiteflower';

export type FloraWindState = 'idle' | 'walk' | 'trot' | 'run' | 'flee' | 'roar' | 'attack' | 'calm' | 'hit' | 'fall' | 'chop' | 'death';
export type TreeChopState = 'standing' | 'hit' | 'falling' | 'fallen';

export interface FloraSubmeshData {
  matId: number;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
}

export function createWoodCutRingMaterial(): THREE.MeshStandardMaterial {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#d8a25e';
      ctx.fillRect(0, 0, 256, 256);
      const cx = 128, cy = 128;
      ctx.beginPath();
      ctx.arc(cx, cy, 123, 0, Math.PI * 2);
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#5c3a1e';
      ctx.stroke();
      for (let r = 7; r < 116; r += 5) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.lineWidth = (r % 15 === 0) ? 2.2 : 1.1;
        ctx.strokeStyle = (r % 15 === 0) ? 'rgba(115, 68, 24, 0.55)' : 'rgba(148, 92, 38, 0.34)';
        ctx.stroke();
      }
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * 114, cy + Math.sin(a) * 114);
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = 'rgba(110, 64, 22, 0.20)';
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#683e1b';
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    return new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.78,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
  }
  return new THREE.MeshStandardMaterial({ color: 0xd8a25e, roughness: 0.80, side: THREE.DoubleSide });
}

export class FloraModel {
  public readonly object: THREE.Group;
  public readonly meshes: THREE.Mesh[] = [];
  private readonly restPositions: Float32Array[] = [];
  private readonly isFoliage: boolean[] = [];
  private readonly subMatIds: number[] = [];
  private maxHeight = 1.0;
  public readonly isTree: boolean;
  public time = 0;
  public windStrength = 1.0;
  public windLean = 0.0;
  public chopState: TreeChopState = 'standing';
  public chopTime = 0.0;
  public hitTime = 0.0;
  public readonly cutY = 0.32;
  private trunkCx = 0.0;
  private trunkCz = 0.0;
  private trunkRadius = 0.09;

  constructor(
    name: string,
    submeshes: FloraSubmeshData[],
    materials: Record<number, THREE.Material>,
    scale = 1.0,
  ) {
    this.object = new THREE.Group();
    this.object.name = name;

    if (!materials[7]) {
      materials[7] = createWoodCutRingMaterial();
    }

    let maxY = 0.1;
    let hasBark = false;
    for (const sub of submeshes) {
      if (sub.matId === 0 || sub.matId === 3 || sub.matId === 4) hasBark = true;
      for (let i = 1; i < sub.positions.length; i += 3) {
        if (sub.positions[i] > maxY) maxY = sub.positions[i];
      }
      if (sub.matId === 7 && sub.positions.length >= 27) {
        this.trunkCx = sub.positions[0];
        this.trunkCz = sub.positions[2];
        const ringVerts = Math.min(20, Math.floor(sub.positions.length / 6) - 1);
        if (ringVerts > 0) {
          let rSum = 0.0;
          for (let k = 1; k <= ringVerts; k++) {
            const dx = sub.positions[k * 3] - this.trunkCx;
            const dz = sub.positions[k * 3 + 2] - this.trunkCz;
            rSum += Math.hypot(dx, dz);
          }
          this.trunkRadius = Math.max(0.04, rSum / ringVerts);
        }
      }
    }
    this.maxHeight = maxY;
    this.isTree = hasBark || maxY > 1.8;

    for (const sub of submeshes) {
      const geom = new THREE.BufferGeometry();
      const livePos = sub.positions.slice();
      this.restPositions.push(sub.positions.slice());
      this.isFoliage.push(sub.matId === 1 || sub.matId === 2 || sub.matId === 5 || sub.matId === 6);
      this.subMatIds.push(sub.matId);

      geom.setAttribute('position', new THREE.BufferAttribute(livePos, 3));
      geom.setAttribute('normal', new THREE.BufferAttribute(sub.normals, 3));
      geom.setAttribute('uv', new THREE.BufferAttribute(sub.uvs, 2));
      geom.setIndex(new THREE.BufferAttribute(sub.indices, 1));

      const mat = materials[sub.matId] || materials[7];
      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      if (sub.matId === 7) {
        mesh.visible = false;
      }
      this.meshes.push(mesh);
      this.object.add(mesh);
    }

    this.object.scale.setScalar(scale);
  }

  public hitTree(): void {
    if (!this.isTree) return;
    this.chopState = 'hit';
    this.hitTime = 0.0;
  }

  public fellTree(): void {
    if (!this.isTree) return;
    this.chopState = 'falling';
    this.chopTime = 0.0;
  }

  public chopTree(): void {
    this.fellTree();
  }

  public resetTree(): void {
    this.chopState = 'standing';
    this.chopTime = 0.0;
    this.hitTime = 0.0;
  }

  public setWindFromState(state: string): void {
    if ((state === 'hit' || state === 'attack') && this.isTree) {
      this.hitTree();
      return;
    }
    if ((state === 'fall' || state === 'chop' || state === 'death') && this.isTree) {
      this.fellTree();
      return;
    }
    if (this.chopState !== 'standing') {
      this.resetTree();
    }
    if (state === 'calm' || state === 'lie') this.windStrength = 0.0;
    else if (state === 'idle' || state === 'eat' || state === 'sit') this.windStrength = 0.55;
    else if (state === 'walk' || state === 'stalk') this.windStrength = 1.0;
    else if (state === 'trot' || state === 'skip') this.windStrength = 1.45;
    else if (state === 'run' || state === 'flee' || state === 'fly' || state === 'roar') this.windStrength = 2.15;
    else this.windStrength = 1.0;
  }

  public update(dt: number): void {
    const clampedDt = Math.min(dt, 0.1);
    this.time += clampedDt;
    const w = this.windStrength;
    const lean = this.windLean * 0.18;
    const t = this.time;
    const invH = 1.0 / Math.max(0.2, this.maxHeight);

    const isCutActive = (this.chopState === 'falling' || this.chopState === 'fallen') && this.isTree;
    for (let m = 0; m < this.meshes.length; m++) {
      if (this.subMatIds[m] === 7) {
        this.meshes[m].visible = isCutActive;
      }
    }

    if (this.chopState === 'hit' && this.isTree) {
      this.hitTime += clampedDt;
      const ht = this.hitTime;
      const hitDur = 0.62;
      if (ht >= hitDur) {
        this.chopState = 'standing';
        this.hitTime = 0.0;
      } else {
        const env = Math.exp(-ht * 7.2);
        const vibX = Math.sin(ht * 64.0) * 0.062 * env;
        const vibZ = Math.cos(ht * 72.0) * 0.062 * env;
        const joltY = -Math.sin(ht * 44.0) * 0.024 * env;
        const radialPulse = 1.0 + Math.sin(ht * 52.0) * 0.042 * env;
        const swayX = (Math.sin(t * 1.45) * 0.055 + Math.sin(t * 3.1) * 0.022) * w + lean;
        const swayZ = (Math.cos(t * 1.15) * 0.042 + Math.sin(t * 2.6) * 0.018) * w;

        for (let m = 0; m < this.meshes.length; m++) {
          const posAttr = this.meshes[m].geometry.getAttribute('position') as THREE.BufferAttribute;
          const arr = posAttr.array as Float32Array;
          const rest = this.restPositions[m];
          const foliage = this.isFoliage[m];
          const n = rest.length;
          for (let i = 0; i < n; i += 3) {
            const rx = rest[i], ry = rest[i + 1], rz = rest[i + 2];
            const hNorm = Math.max(0.0, ry * invH);
            const bend = hNorm * hNorm;
            const amp = Math.min(1.0, Math.max(0.0, (ry - 0.08) * invH)) * (0.35 + 0.85 * hNorm);
            let dx = swayX * ry * bend + vibX * amp;
            let dz = swayZ * ry * bend + vibZ * amp;
            let dy = joltY * hNorm;
            if (foliage) {
              const phase = rx * 4.8 + rz * 4.8 + ry * 3.3;
              const rustle = Math.sin(ht * 86.0 + phase) * 0.058 * env * (0.4 + 0.6 * hNorm);
              dx += rustle;
              dz += Math.cos(ht * 80.0 + phase) * 0.058 * env * (0.4 + 0.6 * hNorm);
              dy += Math.sin(ht * 74.0 + phase * 1.2) * 0.032 * env * hNorm;
            }
            arr[i] = rx * (1.0 + (radialPulse - 1.0) * hNorm) + dx;
            arr[i + 1] = Math.max(0.0, ry + dy);
            arr[i + 2] = rz * (1.0 + (radialPulse - 1.0) * hNorm) + dz;
          }
          posAttr.needsUpdate = true;
        }
        return;
      }
    }

    if (isCutActive) {
      this.chopTime += clampedDt;
      const ft = this.chopTime;
      const cutY = this.cutY;
      const cx = this.trunkCx;
      const rMed = this.trunkRadius;
      const maxFallAngle = 1.69; // ~96.8 deg so the trunk slopes downward from the elevated cut base to the ground!
      const fallDur = 0.88;
      let fallAngle = 0.0;
      let ease = 1.0;
      let leafDrag = 0.0;

      if (ft < fallDur) {
        this.chopState = 'falling';
        const u = ft / fallDur;
        ease = u * u * (0.30 + 0.70 * u);
        fallAngle = ease * maxFallAngle;
        leafDrag = Math.sin(u * Math.PI) * 0.14;
      } else {
        const bt = ft - fallDur;
        this.chopState = bt < 1.0 ? 'falling' : 'fallen';
        const bounce = Math.abs(Math.sin(bt * 7.5)) * Math.exp(-bt * 4.5) * 0.075;
        fallAngle = maxFallAngle - bounce;
        ease = 1.0;
        leafDrag = Math.sin(bt * 11.0) * Math.exp(-bt * 4.0) * 0.05;
      }

      const cosA = Math.cos(-fallAngle);
      const sinA = Math.sin(-fallAngle);
      const shiftX = 0.82 * rMed * ease;
      const liftY = 1.35 * rMed * ease;

      for (let m = 0; m < this.meshes.length; m++) {
        const posAttr = this.meshes[m].geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const rest = this.restPositions[m];
        const foliage = this.isFoliage[m];
        const n = rest.length;
        for (let i = 0; i < n; i += 3) {
          const rx = rest[i], ry = rest[i + 1], rz = rest[i + 2];
          if (ry < cutY) {
            arr[i] = rx;
            arr[i + 1] = ry;
            arr[i + 2] = rz;
            continue;
          }
          const hNorm = Math.max(0.0, (ry - cutY) * invH);
          let xLoc = rx, yLoc = ry, zLoc = rz;
          if (foliage) {
            if (Math.abs(leafDrag) > 0.0001) yLoc += leafDrag * hNorm * 0.25;
            const phase = rx * 3.2 + rz * 3.2 + ry * 2.1;
            zLoc += Math.cos(t * 4.2 + phase) * 0.006;
          }
          const dx = xLoc - cx;
          const dy = yLoc - cutY;
          const nx = cx + shiftX + dx * cosA - dy * sinA;
          let ny = cutY + liftY + dx * sinA + dy * cosA;
          if (dy > 0.45 && ny < 0.01) {
            ny = 0.01 + (0.01 - ny) * 0.04;
          }
          arr[i] = nx;
          arr[i + 1] = ny;
          arr[i + 2] = zLoc;
        }
        posAttr.needsUpdate = true;
      }
      return;
    }

    const swayX = (Math.sin(t * 1.45) * 0.055 + Math.sin(t * 3.1) * 0.022) * w + lean;
    const swayZ = (Math.cos(t * 1.15) * 0.042 + Math.sin(t * 2.6) * 0.018) * w;
    for (let m = 0; m < this.meshes.length; m++) {
      const posAttr = this.meshes[m].geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const rest = this.restPositions[m];
      const foliage = this.isFoliage[m];
      const n = rest.length;
      for (let i = 0; i < n; i += 3) {
        const rx = rest[i], ryRaw = rest[i + 1], rz = rest[i + 2];
        const ry = !foliage && Math.abs(ryRaw - this.cutY) < 0.0035 ? this.cutY : ryRaw;
        const hNorm = Math.max(0.0, ry * invH);
        const bend = hNorm * hNorm;
        let dx = swayX * ry * bend;
        let dz = swayZ * ry * bend;
        let dy = 0.0;
        if (foliage && w > 0.01) {
          const phase = rx * 3.2 + rz * 3.2 + ry * 2.1;
          const flutter = Math.sin(t * 4.8 + phase) * 0.024 * w * Math.min(1.0, hNorm + 0.25);
          dx += flutter;
          dz += Math.cos(t * 4.2 + phase) * 0.020 * w * Math.min(1.0, hNorm + 0.25);
          dy = Math.sin(t * 5.4 + phase * 1.3) * 0.012 * w * hNorm;
        }
        arr[i] = rx + dx;
        arr[i + 1] = ry + dy;
        arr[i + 2] = rz + dz;
      }
      posAttr.needsUpdate = true;
    }
  }

  public dispose(): void {
    for (const m of this.meshes) {
      m.geometry.dispose();
    }
  }
}

export type FloraQuality = 'high' | 'low';

export class FloraLODPair {
  public readonly object: THREE.Group;
  public readonly high: FloraModel;
  public readonly low: FloraModel;
  public lodDistance: number;
  public activeQuality: FloraQuality = 'high';

  constructor(high: FloraModel, low: FloraModel, lodDistance = 18.0) {
    this.object = new THREE.Group();
    this.object.name = high.object.name + '_LODGroup';
    this.high = high;
    this.low = low;
    this.lodDistance = lodDistance;
    this.low.object.visible = false;
    this.object.add(this.high.object);
    this.object.add(this.low.object);
  }

  public setQuality(q: FloraQuality): void {
    this.activeQuality = q;
    this.high.object.visible = q === 'high';
    this.low.object.visible = q === 'low';
  }

  public updateByDistance(cameraPosition: THREE.Vector3, dt: number): void {
    const worldPos = new THREE.Vector3();
    this.object.getWorldPosition(worldPos);
    const dist = worldPos.distanceTo(cameraPosition);
    const q: FloraQuality = dist >= this.lodDistance ? 'low' : 'high';
    if (q !== this.activeQuality) {
      this.setQuality(q);
    }
    if (this.activeQuality === 'high') {
      this.high.update(dt);
    } else {
      this.low.update(dt);
    }
  }

  public setWindFromState(state: string): void {
    this.high.setWindFromState(state);
    this.low.setWindFromState(state);
  }

  public hitTree(): void {
    this.high.hitTree();
    this.low.hitTree();
  }

  public fellTree(): void {
    this.high.fellTree();
    this.low.fellTree();
  }

  public resetTree(): void {
    this.high.resetTree();
    this.low.resetTree();
  }

  public dispose(): void {
    this.high.dispose();
    this.low.dispose();
  }
}
