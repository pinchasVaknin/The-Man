// ============================================================================
// MODULE: World / Domain / Mathematics
// DESIGN: Pure deterministic procedural noise, spatial interpolation and distance geometry (SRP)
// SUMMARY: Provides seedable 2D hash, value noise, fractal Brownian motion (fBm),
//          smoothstep curve interpolation, and segment distance calculations.
//          Does not retain mutable state; all functions are pure.
// ============================================================================

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants
/** Summary: First integer hash multiplier prime. */
const HASH_PRIME_1 = 374761393;

/** Summary: Second integer hash multiplier prime. */
const HASH_PRIME_2 = 668265263;

/** Summary: Avalanche integer multiplier prime. */
const HASH_PRIME_3 = 1274126177;

/** Summary: Maximum 32-bit unsigned integer divisor for [0, 1) normalization. */
const MAX_UINT32 = 4294967295;

/** Summary: Default fBm lacunarity frequency multiplier. */
const FBM_LACUNARITY = 2.03;

/** Summary: Default fBm persistence amplitude multiplier. */
const FBM_PERSISTENCE = 0.5;

/** Summary: Minimum squared segment length threshold for distance calculation. */
const MIN_SEGMENT_LENGTH_SQ = 1e-6;
// #endregion

// ======================== PROCEDURAL NOISE ======================== \\
// #region Procedural Noise
/**
 * Summary: Generates a deterministic pseudo-random float in [0, 1] for 2D integer coordinates.
 * Design: High-dispersion integer multiplication and bit-shift hashing without memory allocation.
 * @param ix Integer X coordinate.
 * @param iz Integer Z coordinate.
 * @returns Normalized float between 0.0 and 1.0.
 */
export function hash2D(ix: number, iz: number): number {
  let n = (Math.imul(ix, HASH_PRIME_1) + Math.imul(iz, HASH_PRIME_2)) | 0;
  n = Math.imul(n ^ (n >>> 13), HASH_PRIME_3);
  return ((n ^ (n >>> 16)) >>> 0) / MAX_UINT32;
}

/**
 * Summary: Computes 2D value noise with cubic Hermite spline interpolation.
 * Design: Evaluates 4 cell corner hashes and blends them with smoothstep curves.
 * @param x World X coordinate.
 * @param z World Z coordinate.
 * @returns Interpolated noise value in [0, 1].
 */
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

/**
 * Summary: Computes multi-octave Fractal Brownian Motion (fBm) noise.
 * Design: Accumulates value noise octaves with progressive frequency doubling and amplitude decay.
 * @param x World X coordinate.
 * @param z World Z coordinate.
 * @param octaves Number of noise layers (default 4).
 * @returns Normalized fBm value in [-1, 1].
 */
export function fbm2D(x: number, z: number, octaves = 4): number {
  let value = 0.0;
  let amplitude = 0.5;
  let freq = 1.0;
  let maxAmp = 0.0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * (valueNoise2D(x * freq, z * freq) * 2.0 - 1.0);
    maxAmp += amplitude;
    freq *= FBM_LACUNARITY;
    amplitude *= FBM_PERSISTENCE;
  }
  return value / maxAmp;
}
// #endregion

// ======================== INTERPOLATION & GEOMETRY ======================== \\
// #region Interpolation & Geometry
/**
 * Summary: Standard smoothstep interpolation between edge0 and edge1.
 * Design: Hermite interpolation clamping to [0, 1] range to avoid overshoot.
 * @param edge0 Lower bound.
 * @param edge1 Upper bound.
 * @param x Input value.
 * @returns Smoothly interpolated value between 0.0 and 1.0.
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Summary: Calculates the shortest 2D distance from a point to a finite line segment.
 * Design: Projects point onto segment with vector dot product, clamped to [0, 1].
 * @param px Point X.
 * @param pz Point Z.
 * @param ax Segment start X.
 * @param az Segment start Z.
 * @param bx Segment end X.
 * @param bz Segment end Z.
 * @returns Euclidean distance to closest point on segment.
 */
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
  if (lenSq < MIN_SEGMENT_LENGTH_SQ) return Math.hypot(px - ax, pz - az);
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / lenSq));
  return Math.hypot(px - (ax + t * abx), pz - (az + t * abz));
}

/**
 * Summary: Linear interpolation between two numeric values.
 * Design: Unclamped standard lerp a + (b - a) * t.
 * @param a Start value.
 * @param b End value.
 * @param t Interpolation alpha.
 * @returns Interpolated number.
 */
export function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Summary: Linearly interpolates RGB channels between two hexadecimal colors.
 * Design: Unpacks 24-bit RGB channels, lerps each channel independently, and repacks.
 * @param hexA Source 24-bit color hex.
 * @param hexB Target 24-bit color hex.
 * @param t Interpolation alpha in [0, 1].
 * @returns Interpolated 24-bit hex color integer.
 */
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
// #endregion
