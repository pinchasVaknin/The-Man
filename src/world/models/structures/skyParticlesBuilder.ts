// ============================================================================
// MODULE: World / Models / Skybound Isles / Ambient particles
// DESIGN: Drifting motes around two landmarks: spores rising around the Giant Sky Tree's canopy, and
//         crystal sparkles over the Crystal Isles. One point cloud, updated in place each frame, so
//         nothing is allocated during play.
// SUMMARY: Builds and animates the ambient spore and sparkle particles of the Skybound Isles.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import { SKY_TREE } from '../../domain/landmarks/skyboundIsles/skyTreeLayout';
import { CRYSTAL_ISLETS } from '../../domain/landmarks/skyboundIsles/crystalIslesLayout';
import type { IWorldModelBuildContext } from '../types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What the particle builder hands back to the frame loop. */
export interface ISkyParticlesBuildResult {
  readonly group: THREE.Group;
  /** Moves every particle; call once per frame while nearby. */
  readonly update: (elapsedSec: number) => void;
}

interface IMote {
  readonly cx: number;
  readonly cy: number;
  readonly cz: number;
  readonly spread: number;
  readonly rise: number;
  readonly phase: number;
}
// #endregion

// #region Tuning
const SPORE_COUNT = 90;
const SPARKLE_COUNT = 60;
const RISE_HEIGHT_M = 14.0;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Build
/**
 * Summary: Builds the ambient particles and returns their frame update.
 * @param ctx Shared build context.
 * @returns The root group (not yet added to the scene) and the per-frame update.
 */
export function buildSkyParticles(ctx: IWorldModelBuildContext): ISkyParticlesBuildResult {
  const group = new THREE.Group();
  group.name = 'sky-particles';
  const motes: IMote[] = [];
  const crystal = CRYSTAL_ISLETS[0];
  for (let i = 0; i < SPORE_COUNT; i++) {
    const a = (i / SPORE_COUNT) * Math.PI * 2 * 7.3;
    const r = 2.0 + ((i * 37) % 11) * 0.45;
    motes.push({ cx: SKY_TREE.x + Math.cos(a) * r, cy: SKY_TREE.topY - 4, cz: SKY_TREE.z + Math.sin(a) * r, spread: 0.6, rise: RISE_HEIGHT_M, phase: i * 0.37 });
  }
  for (let i = 0; i < SPARKLE_COUNT; i++) {
    const a = (i / SPARKLE_COUNT) * Math.PI * 2 * 3.1;
    const r = 3.0 + ((i * 29) % 9) * 1.1;
    motes.push({ cx: crystal.x + Math.cos(a) * r, cy: crystal.y + 1.0, cz: crystal.z + Math.sin(a) * r, spread: 0.3, rise: 6.0, phase: i * 0.61 });
  }
  const count = motes.length;
  const positions = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xd9f99d,
    size: 0.22,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  group.add(points);
  ctx.disposableGeometries.push(geo);
  ctx.disposableMaterials.push(mat);

  return {
    group,
    update: (elapsedSec: number) => {
      for (let i = 0; i < count; i++) {
        const m = motes[i];
        const t = (elapsedSec * 0.35 + m.phase) % 1;
        positions[i * 3] = m.cx + Math.sin(elapsedSec * 0.8 + m.phase * 5) * m.spread;
        positions[i * 3 + 1] = m.cy + t * m.rise;
        positions[i * 3 + 2] = m.cz + Math.cos(elapsedSec * 0.7 + m.phase * 3) * m.spread;
      }
      geo.getAttribute('position').needsUpdate = true;
    },
  };
}
// #endregion
