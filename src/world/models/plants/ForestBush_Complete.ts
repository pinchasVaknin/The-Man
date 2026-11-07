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

export function unpackFloraBundle(b64: string): FloraSubmeshData[] {
  const binStr = atob(b64);
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
  const buf = bytes.buffer;
  const dv = new DataView(buf);
  let off = 0;
  const numSubs = dv.getUint32(off, true);
  off += 4;
  const subs: FloraSubmeshData[] = [];

  for (let s = 0; s < numSubs; s++) {
    const matId = dv.getUint16(off, true);
    const nv = dv.getUint16(off + 2, true);
    const ni = dv.getUint32(off + 4, true);
    const pminX = dv.getFloat32(off + 8, true);
    const pminY = dv.getFloat32(off + 12, true);
    const pminZ = dv.getFloat32(off + 16, true);
    const pspanX = dv.getFloat32(off + 20, true);
    const pspanY = dv.getFloat32(off + 24, true);
    const pspanZ = dv.getFloat32(off + 28, true);
    const uminU = dv.getFloat32(off + 32, true);
    const uminV = dv.getFloat32(off + 36, true);
    const uspanU = dv.getFloat32(off + 40, true);
    const uspanV = dv.getFloat32(off + 44, true);
    off += 48;

    const pq = new Uint16Array(buf, off, nv * 3);
    off = (off + nv * 3 * 2 + 3) & ~3;
    const nq = new Int8Array(buf, off, nv * 3);
    off = (off + nv * 3 + 3) & ~3;
    const uq = new Uint16Array(buf, off, nv * 2);
    off = (off + nv * 2 * 2 + 3) & ~3;
    const idx = new Uint16Array(buf, off, ni);
    off = (off + ni * 2 + 3) & ~3;

    const positions = new Float32Array(nv * 3);
    const normals = new Float32Array(nv * 3);
    const uvs = new Float32Array(nv * 2);

    for (let i = 0; i < nv; i++) {
      const i3 = i * 3;
      const i2 = i * 2;
      positions[i3] = pminX + (pq[i3] / 65535.0) * pspanX;
      positions[i3 + 1] = pminY + (pq[i3 + 1] / 65535.0) * pspanY;
      positions[i3 + 2] = pminZ + (pq[i3 + 2] / 65535.0) * pspanZ;
      normals[i3] = nq[i3] / 127.0;
      normals[i3 + 1] = nq[i3 + 1] / 127.0;
      normals[i3 + 2] = nq[i3 + 2] / 127.0;
      uvs[i2] = uminU + (uq[i2] / 65535.0) * uspanU;
      uvs[i2 + 1] = uminV + (uq[i2 + 1] / 65535.0) * uspanV;
    }

    subs.push({
      matId,
      positions,
      normals,
      uvs,
      indices: idx.slice(),
    });
  }
  return subs;
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
      if (sub.matId === 7 && sub.positions.length >= 63) {
        this.trunkCx = sub.positions[0];
        this.trunkCz = sub.positions[2];
        let rSum = 0.0;
        for (let k = 1; k <= 20; k++) {
          const dx = sub.positions[k * 3] - this.trunkCx;
          const dz = sub.positions[k * 3 + 2] - this.trunkCz;
          rSum += Math.hypot(dx, dz);
        }
        this.trunkRadius = Math.max(0.04, rSum / 20.0);
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
        const rx = rest[i], ry = rest[i + 1], rz = rest[i + 2];
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

// ============================================================================
// Embedded Standalone ForestBush — High Quality (126 verts, 144 tris)
// + Companion Low Quality / LOD (54 verts, 36 tris, -75%)
// ============================================================================
export const FORESTBUSH_PACK_B64 = "AQAAAAYAfgCwAQAA+HGOvwAAAACb5zO/X/8VQAAAoD+grMo/Jt2APgAAAABtkT8/UvUfPwAA2l1OhFsXJG1SzC0RhbOyi2URBqr6gYwKSl6eNUYS4bOrTVcXWqqCR/QnX8KrmoUj2tnFeEMoacA6hzEl9J6+bBQohGOfaa8uAADZlw4oDNqpVXAuOQB/cSYvG5+OT4IyVgDiXOI5RWiwjoUypGOtUKs4RuB/d/U7gKRNhQ1GQODTd6NITeDhbUROScD/kTtHVgB2Vt9Pj6TEdKZNrqTSYCtLEtqgRqxPkWP1VBtQDJ8AUPhVWWjueDdbUMJCleJThGirXLBaAQBAikRNArR7JWdbbMDqdRdSaar9K/hfOQCjYpdljMKlaf5bVF5+FjF6HG1mtPaJmG2CW6tXHWvQ67yTkHz//1Fo48xU2ppiDcIk058vnWsIpqJDTM3erIFDbcLLoYWB1t3OxudpovigtP91mduauNJjarXiqfxjlHHYo5iEAADmu+lX2/i3lUFtQQAEoUJZl7X/h7BjYgABjQGHAXeVplRcuXFUhCN49/+9l8+CvrstndSB8P9Chqh9///Ie3aXdNv0jYRuYgAHbfKG0LsXd1N587vja75n4/iVXJhzo3HKYOhwhbWzXMmNGHf6cZ+ixd0ifz17SHexYJmbAQAGeDZVcc1KQtKPndumaJFcfcKHQGuHQQDuVKOPCd53UptWqGssJGfLh3w8bOegFX1OGPbm0Fu8qv//xWrvZQbhnq9gkrTbVKa2l9i2PVyxyz+/+K/MtAm5pqZqsunbJb4Xb1nMHdXLh1fROrzrefbEgJvDjKHBWmEui4fWAADUaPq2TtWzli3COAAyf6GvppvokdG0VABNhjDLAWb/YEquemFRjX6/ZtvFb/nE7KD4Y/a3YNvpXymxbdudYjjBGrw6R3WlVAC9ca2w+6AtVkynGqFDZLqaVdU/dsufZ2G4aOWcl5sSa2SvFGakTIK7Fr4xNn2hPmZbX+61AQAlPc+HGLDfhqaqPrwESIOItKZ6fbmdOADFTTueUb4nQ1N3R1xDflC6vWoAALyBNmu2IDgAcqD5rU/eXUPsas8Ade7eedzseKblqyXhdcW6qCrudyUGeZUOvcDhaR0Pe8LvbrcPZpcCuL0GbJjdwJrrt7LdXhPceKC5LZAQxqnqWgvqfY7i0IwGzYvv06oBXZ/kTQ0Bfq4OYIXf/+O5ZYTt7hINffrkfIUB4aD5U//4f3wAG4P5F3re/H3sDj4Ab1TeWkjsZ4XlEXPhLJa693fuKXYGL4kOKivhc3IPNjDvdCMPeYcCJSoGeI3dKojrIhndd2rcPOi5Z40QNBHqfGjqRZTiO5AGO5TvQBMBff/kfGsBRBkOfLPfYD65VqTtVm0NP13kUpsBTQX5f2P4UDsAkPX5fh3eiS/sjHsA4m3ex3bs1vDle0nhndu6Y0fumE0GmwkOfnvh9VIPoX3v8X4P/wQCf38G9wrdegHrfXrdCFbcqV25MxMQfXzqEV7qrhzieBsGfCHven4BD3fkIl4Bq34OCUjfZGO53Drtb1oNqGjkvC8Bdnv5HWf4tgAAAACXaP//6XrTHOfMlx85wQAAl2jTHOfMlx85wa27wd0qQn34habq2xRIVbP9TSxuXrMAACpCffhpVwAAFEhVs2lXAABFn/1z/U0sbgOH//8kk/65A4f//wOH//+FpurbaVcAACST/rkkk/65KkJ9+P1NLG4USFWzRZ/9c627wd1Fn/1zXrMAANMc58yFpurblx85wV6zAACtu8HdAACXaP//6Xr//+l6AACXaP//6XrTHOfMlx85wQAAl2jTHOfMlx85wa27wd0qQn34habq2xRIVbP9TSxuXrMAACpCffhpVwAAFEhVs2lXAABFn/1z/U0sbgOH//8kk/65A4f//wOH//+FpurbaVcAACST/rkkk/65KkJ9+P1NLG4USFWzRZ/9c627wd1Fn/1zXrMAANMc58yFpurblx85wV6zAACtu8HdAACXaP//6Xr//+l6AACXaP//6XrTHOfMlx85wQAAl2jTHOfMlx85wa27wd0qQn34habq2xRIVbP9TSxuXrMAACpCffhpVwAAFEhVs2lXAABFn/1z/U0sbgOH//8kk/65A4f//wOH//+FpurbaVcAACST/rkkk/65KkJ9+P1NLG4USFWzRZ/9c627wd1Fn/1zXrMAANMc58yFpurblx85wV6zAACtu8HdAACXaP//6Xr//+l6DgALAAAAKQAgACUAEAASAAQAKAAeACEAGAAcACcAAQARAAwAAAALAAoAAAAKAAMACwAgABoACwAaAAoAKQAmABoAKQAaACAAJQAgAAsAJQALAA4AGgAmACMAGgAjABYACgAaABYACgAWAAgAAwAKAAgAAwAIAAIABAASAA8ABAAPAAYAEgAeABkAEgAZAA8AKAAfABkAKAAZAB4AIQAeABIAIQASABAAGQAfABcAGQAXABUADwAZABUADwAVAA0ABgAPAA0ABgANAAUAJwAcAB0AJwAdACQAHAARABQAHAAUAB0AAQAHABQAAQAUABEADAARABwADAAcABgAFAAHAAkAFAAJABMAHQAUABMAHQATABsAJAAdABsAJAAbACIAOAA1ACoAUwBKAE8AOgA8AC4AUgBIAEsAQgBGAFEAKwA7ADYAKgA1ADQAKgA0AC0ANQBKAEQANQBEADQAUwBQAEQAUwBEAEoATwBKADUATwA1ADgARABQAE0ARABNAEAANABEAEAANABAADIALQA0ADIALQAyACwALgA8ADkALgA5ADAAPABIAEMAPABDADkAUgBJAEMAUgBDAEgASwBIADwASwA8ADoAQwBJAEEAQwBBAD8AOQBDAD8AOQA/ADcAMAA5ADcAMAA3AC8AUQBGAEcAUQBHAE4ARgA7AD4ARgA+AEcAKwAxAD4AKwA+ADsANgA7AEYANgBGAEIAPgAxADMAPgAzAD0ARwA+AD0ARwA9AEUATgBHAEUATgBFAEwAYgBfAFQAfQB0AHkAZABmAFgAfAByAHUAbABwAHsAVQBlAGAAVABfAF4AVABeAFcAXwB0AG4AXwBuAF4AfQB6AG4AfQBuAHQAeQB0AF8AeQBfAGIAbgB6AHcAbgB3AGoAXgBuAGoAXgBqAFwAVwBeAFwAVwBcAFYAWABmAGMAWABjAFoAZgByAG0AZgBtAGMAfABzAG0AfABtAHIAdQByAGYAdQBmAGQAbQBzAGsAbQBrAGkAYwBtAGkAYwBpAGEAWgBjAGEAWgBhAFkAewBwAHEAewBxAHgAcABlAGgAcABoAHEAVQBbAGgAVQBoAGUAYABlAHAAYABwAGwAaABbAF0AaABdAGcAcQBoAGcAcQBnAG8AeABxAG8AeABvAHYA";
export const FORESTBUSH_LOD_PACK_B64 = "AQAAAAYANgBsAAAA+HGOvwAAAACb5zO/X/8VQAAAoD+grMo/Jt2APgAAAABtkT8/UvUfPwAA2l1OhIUj2tnFeHAuOQB/caNITeDhbfhfOQCjYvaJmG2CW1sXJG1SzK8uAADZl6s4RuB/dztHVgB2VitLEtqgRv5bVF5+FowKSl6eNQ4oDNqpVYIyVgDiXA1GQODTd7BaAQBAijF6HG1mtKtXHWvQ6+dpovigtEFtQQAEoah9///Ie2uHQQDuVOegFX1OGLyTkHz//5iEAADmuyN49/+9l4RuYgAHbb5n4/iVXJtWqGssJJ8vnWsIpulX2/i3lbBjYgABjdSB8P9ChpmbAQAGeGfLh3w8bPbm0Fu8qlnMHdXLhy3COAAyfymxbdudYrmdOADFTbyBNmu2IP//xWrvZYfWAADUaH6/ZtvFb3WlVAC9cbqaVdU/dlN3R1xDfti2PVyxy/q2TtWzltG0VABNhva3YNvpX+61AQAlPVC6vWoAADgAciXhdR0PexPceBINff/4f6D5rZUOvZjdwJAQxo7i0IUB4c8AdcDhabcPZrLdXq4OYKD5U3wAG3PhLHIPNmrcPG0NP2P4UIP5F4kOKo3dKo0QNJTiO5sBTT4AbyvhcyMPeRnddxkOfAX5fzsAkEnhnVIPoVbcqVoNqGf4tvX5fgkOfgrdehMQfRzieC8BdnsA4nvh9X4P/3rdCH4OCXv5HQAAAACXaCpCffhpVwAAA4f//16zAAD//+l6///pel6zAAADh///aVcAACpCffgAAJdoAACXaCpCffhpVwAAA4f//16zAAD//+l6AACXaCpCffhpVwAAA4f//16zAAD//+l6///pel6zAAADh///aVcAACpCffgAAJdoAACXaCpCffhpVwAAA4f//16zAAD//+l6AACXaCpCffhpVwAAA4f//16zAAD//+l6///pel6zAAADh///aVcAACpCffgAAJdoAACXaCpCffhpVwAAA4f//16zAAD//+l6BAAFAAAABAAAAAIAAAAFAAMAAAADAAEABwAGAAsABwALAAkACwAGAAgACwAIAAoAEAARAAwAEAAMAA4ADAARAA8ADAAPAA0AFgAXABIAFgASABQAEgAXABUAEgAVABMAGQAYAB0AGQAdABsAHQAYABoAHQAaABwAIgAjAB4AIgAeACAAHgAjACEAHgAhAB8AKAApACQAKAAkACYAJAApACcAJAAnACUAKwAqAC8AKwAvAC0ALwAqACwALwAsAC4ANAA1ADAANAAwADIAMAA1ADMAMAAzADEA";
export const FORESTBUSH_TEXTURES: Record<number, string> = {
  6: "data:image/webp;base64,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"
};

export function createReadyForestBush(scale = 1.0, quality: FloraQuality = 'high'): FloraModel {
  const b64 = quality === 'low' ? FORESTBUSH_LOD_PACK_B64 : FORESTBUSH_PACK_B64;
  const subs = unpackFloraBundle(b64);
  const mats: Record<number, THREE.Material> = { 7: createWoodCutRingMaterial() };
  for (const [midStr, uri] of Object.entries(FORESTBUSH_TEXTURES)) {
    const mid = Number(midStr);
    const img = new Image();
    img.src = uri;
    const tex = new THREE.Texture(img);
    tex.flipY = false;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    img.onload = () => { tex.needsUpdate = true; };
    const isAlpha = mid === 1 || mid === 2 || mid === 5 || mid === 6;
    mats[mid] = new THREE.MeshStandardMaterial({ map: tex, roughness: isAlpha ? 0.78 : 0.90, metalness: 0.02, alphaTest: isAlpha ? 0.35 : 0.0, transparent: isAlpha, side: THREE.DoubleSide });
  }
  return new FloraModel(quality === 'low' ? 'ForestBush_LOD' : 'ForestBush', subs, mats, scale);
}

export function createReadyForestBushLOD(scale = 1.0): FloraModel {
  return createReadyForestBush(scale, 'low');
}
