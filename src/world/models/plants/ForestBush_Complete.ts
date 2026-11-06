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

// ============================================================================
// Embedded Standalone ForestBush (126 verts, 144 tris) & Textures
// ============================================================================
export const FORESTBUSH_PACK_B64 = "AQAAAAYAfgCwAQAA+HGOvwAAAACb5zO/X/8VQAAAoD+grMo/Jt2APgAAAABtkT8/UvUfPwAA2l1OhFsXJG1SzC0RhbOyi2URBqr6gYwKSl6eNUYS4bOrTVcXWqqCR/QnX8KrmoUj2tnFeEMoacA6hzEl9J6+bBQohGOfaa8uAADZlw4oDNqpVXAuOQB/cSYvG5+OT4IyVgDiXOI5RWiwjoUypGOtUKs4RuB/d/U7gKRNhQ1GQODTd6NITeDhbUROScD/kTtHVgB2Vt9Pj6TEdKZNrqTSYCtLEtqgRqxPkWP1VBtQDJ8AUPhVWWjueDdbUMJCleJThGirXLBaAQBAikRNArR7JWdbbMDqdRdSaar9K/hfOQCjYpdljMKlaf5bVF5+FjF6HG1mtPaJmG2CW6tXHWvQ67yTkHz//1Fo48xU2ppiDcIk058vnWsIpqJDTM3erIFDbcLLoYWB1t3OxudpovigtP91mduauNJjarXiqfxjlHHYo5iEAADmu+lX2/i3lUFtQQAEoUJZl7X/h7BjYgABjQGHAXeVplRcuXFUhCN49/+9l8+CvrstndSB8P9Chqh9///Ie3aXdNv0jYRuYgAHbfKG0LsXd1N587vja75n4/iVXJhzo3HKYOhwhbWzXMmNGHf6cZ+ixd0ifz17SHexYJmbAQAGeDZVcc1KQtKPndumaJFcfcKHQGuHQQDuVKOPCd53UptWqGssJGfLh3w8bOegFX1OGPbm0Fu8qv//xWrvZQbhnq9gkrTbVKa2l9i2PVyxyz+/+K/MtAm5pqZqsunbJb4Xb1nMHdXLh1fROrzrefbEgJvDjKHBWmEui4fWAADUaPq2TtWzli3COAAyf6GvppvokdG0VABNhjDLAWb/YEquemFRjX6/ZtvFb/nE7KD4Y/a3YNvpXymxbdudYjjBGrw6R3WlVAC9ca2w+6AtVkynGqFDZLqaVdU/dsufZ2G4aOWcl5sSa2SvFGakTIK7Fr4xNn2hPmZbX+61AQAlPc+HGLDfhqaqPrwESIOItKZ6fbmdOADFTTueUb4nQ1N3R1xDflC6vWoAALyBNmu2IDgAcqD5rU/eXUPsas8Ade7eedzseKblqyXhdcW6qCrudyUGeZUOvcDhaR0Pe8LvbrcPZpcCuL0GbJjdwJrrt7LdXhPceKC5LZAQxqnqWgvqfY7i0IwGzYvv06oBXZ/kTQ0Bfq4OYIXf/+O5ZYTt7hINffrkfIUB4aD5U//4f3wAG4P5F3re/H3sDj4Ab1TeWkjsZ4XlEXPhLJa693fuKXYGL4kOKivhc3IPNjDvdCMPeYcCJSoGeI3dKojrIhndd2rcPOi5Z40QNBHqfGjqRZTiO5AGO5TvQBMBff/kfGsBRBkOfLPfYD65VqTtVm0NP13kUpsBTQX5f2P4UDsAkPX5fh3eiS/sjHsA4m3ex3bs1vDle0nhndu6Y0fumE0GmwkOfnvh9VIPoX3v8X4P/wQCf38G9wrdegHrfXrdCFbcqV25MxMQfXzqEV7qrhzieBsGfCHven4BD3fkIl4Bq34OCUjfZGO53Drtb1oNqGjkvC8Bdnv5HWf4tgAAAACXaP//6XrTHOfMlx85wQAAl2jTHOfMlx85wa27wd0qQn34habq2xRIVbP9TSxuXrMAACpCffhpVwAAFEhVs2lXAABFn/1z/U0sbgOH//8kk/65A4f//wOH//+FpurbaVcAACST/rkkk/65KkJ9+P1NLG4USFWzRZ/9c627wd1Fn/1zXrMAANMc58yFpurblx85wV6zAACtu8HdAACXaP//6Xr//+l6AACXaP//6XrTHOfMlx85wQAAl2jTHOfMlx85wa27wd0qQn34habq2xRIVbP9TSxuXrMAACpCffhpVwAAFEhVs2lXAABFn/1z/U0sbgOH//8kk/65A4f//wOH//+FpurbaVcAACST/rkkk/65KkJ9+P1NLG4USFWzRZ/9c627wd1Fn/1zXrMAANMc58yFpurblx85wV6zAACtu8HdAACXaP//6Xr//+l6AACXaP//6XrTHOfMlx85wQAAl2jTHOfMlx85wa27wd0qQn34habq2xRIVbP9TSxuXrMAACpCffhpVwAAFEhVs2lXAABFn/1z/U0sbgOH//8kk/65A4f//wOH//+FpurbaVcAACST/rkkk/65KkJ9+P1NLG4USFWzRZ/9c627wd1Fn/1zXrMAANMc58yFpurblx85wV6zAACtu8HdAACXaP//6Xr//+l6DgALAAAAKQAgACUAEAASAAQAKAAeACEAGAAcACcAAQARAAwAAAALAAoAAAAKAAMACwAgABoACwAaAAoAKQAmABoAKQAaACAAJQAgAAsAJQALAA4AGgAmACMAGgAjABYACgAaABYACgAWAAgAAwAKAAgAAwAIAAIABAASAA8ABAAPAAYAEgAeABkAEgAZAA8AKAAfABkAKAAZAB4AIQAeABIAIQASABAAGQAfABcAGQAXABUADwAZABUADwAVAA0ABgAPAA0ABgANAAUAJwAcAB0AJwAdACQAHAARABQAHAAUAB0AAQAHABQAAQAUABEADAARABwADAAcABgAFAAHAAkAFAAJABMAHQAUABMAHQATABsAJAAdABsAJAAbACIAOAA1ACoAUwBKAE8AOgA8AC4AUgBIAEsAQgBGAFEAKwA7ADYAKgA1ADQAKgA0AC0ANQBKAEQANQBEADQAUwBQAEQAUwBEAEoATwBKADUATwA1ADgARABQAE0ARABNAEAANABEAEAANABAADIALQA0ADIALQAyACwALgA8ADkALgA5ADAAPABIAEMAPABDADkAUgBJAEMAUgBDAEgASwBIADwASwA8ADoAQwBJAEEAQwBBAD8AOQBDAD8AOQA/ADcAMAA5ADcAMAA3AC8AUQBGAEcAUQBHAE4ARgA7AD4ARgA+AEcAKwAxAD4AKwA+ADsANgA7AEYANgBGAEIAPgAxADMAPgAzAD0ARwA+AD0ARwA9AEUATgBHAEUATgBFAEwAYgBfAFQAfQB0AHkAZABmAFgAfAByAHUAbABwAHsAVQBlAGAAVABfAF4AVABeAFcAXwB0AG4AXwBuAF4AfQB6AG4AfQBuAHQAeQB0AF8AeQBfAGIAbgB6AHcAbgB3AGoAXgBuAGoAXgBqAFwAVwBeAFwAVwBcAFYAWABmAGMAWABjAFoAZgByAG0AZgBtAGMAfABzAG0AfABtAHIAdQByAGYAdQBmAGQAbQBzAGsAbQBrAGkAYwBtAGkAYwBpAGEAWgBjAGEAWgBhAFkAewBwAHEAewBxAHgAcABlAGgAcABoAHEAVQBbAGgAVQBoAGUAYABlAHAAYABwAGwAaABbAF0AaABdAGcAcQBoAGcAcQBnAG8AeABxAG8AeABvAHYA";
export const FORESTBUSH_TEXTURES: Record<number, string> = {
  6: "data:image/webp;base64,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"
};
