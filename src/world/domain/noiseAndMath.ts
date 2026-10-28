// Pure deterministic procedural noise, interpolation, and geometric math utilities

export function hash2D(ix: number, iz: number): number {
  let n = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

export function valueNoise2D(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;

  const u = fx * fx * (3.0 - 2.0 * fx);
  const v = fz * fz * (3.0 - 2.0 * fz);

  const a = hash2D(ix, iz);
  const b = hash2D(ix + 1, iz);
  const c = hash2D(ix, iz + 1);
  const d = hash2D(ix + 1, iz + 1);

  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm2D(x: number, z: number, octaves = 4): number {
  let value = 0.0;
  let amplitude = 0.5;
  let freq = 1.0;
  let maxAmp = 0.0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * (valueNoise2D(x * freq, z * freq) * 2.0 - 1.0);
    maxAmp += amplitude;
    freq *= 2.03;
    amplitude *= 0.5;
  }
  return value / maxAmp;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function distToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): number {
  const abx = bx - ax;
  const abz = bz - az;
  const lenSq = abx * abx + abz * abz;
  if (lenSq < 1e-6) return Math.hypot(px - ax, pz - az);
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / lenSq));
  return Math.hypot(px - (ax + t * abx), pz - (az + t * abz));
}

export function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColorHex(hexA: number, hexB: number, t: number): number {
  const rA = (hexA >> 16) & 255;
  const gA = (hexA >> 8) & 255;
  const bA = hexA & 255;

  const rB = (hexB >> 16) & 255;
  const gB = (hexB >> 8) & 255;
  const bB = hexB & 255;

  const r = Math.round(lerpNum(rA, rB, t));
  const g = Math.round(lerpNum(gA, gB, t));
  const b = Math.round(lerpNum(bA, bB, t));
  return (r << 16) | (g << 8) | b;
}
