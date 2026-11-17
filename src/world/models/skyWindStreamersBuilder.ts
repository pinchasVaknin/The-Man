// ============================================================================
// MODULE: World / Models / Skybound Isles / Wind streamers
// DESIGN: Each wind current shows a few motes that travel along its path, so the air's movement is
//         visible. The motes appear only while their current is running (cores, lever or flower opened),
//         and are hidden otherwise. One point cloud, updated in place each frame.
// SUMMARY: Builds and animates the visible streamers of every Skybound Isles wind current.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import { SKY_WIND_CURRENTS, isWindCurrentActive } from '../domain/landmarks/skyboundIsles/skyWindSystem';
import type { IWorldModelBuildContext } from './types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What the streamer builder hands back to the frame loop. */
export interface ISkyWindStreamersBuildResult {
  readonly group: THREE.Group;
  /** Moves the motes along their currents and hides the ones whose current is off; call once per frame. */
  readonly update: (elapsedSec: number) => void;
}

interface IStreamer {
  readonly currentIndex: number;
  readonly phase: number;
  readonly lateral: number;
}
// #endregion

// #region Tuning
/** Motes per wind current. */
const MOTES_PER_CURRENT = 5;
/** Hidden position, far below the world. */
const HIDDEN_Y = -10000;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Build
/**
 * Summary: Builds the streamer motes and returns their frame update.
 * @param ctx Shared build context.
 * @returns The root group (not yet added to the scene) and the per-frame update.
 */
export function buildSkyWindStreamers(ctx: IWorldModelBuildContext): ISkyWindStreamersBuildResult {
  const group = new THREE.Group();
  group.name = 'sky-wind-streamers';
  const streamers: IStreamer[] = [];
  SKY_WIND_CURRENTS.forEach((_, ci) => {
    for (let m = 0; m < MOTES_PER_CURRENT; m++) {
      streamers.push({ currentIndex: ci, phase: m / MOTES_PER_CURRENT, lateral: ((m * 0.61) % 1) - 0.5 });
    }
  });
  const count = streamers.length;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) positions[i * 3 + 1] = HIDDEN_Y;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xe0f2fe,
    size: 0.2,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    sizeAttenuation: true,
  });
  group.add(new THREE.Points(geo, mat));
  ctx.disposableGeometries.push(geo);
  ctx.disposableMaterials.push(mat);

  return {
    group,
    update: (elapsedSec: number) => {
      for (let i = 0; i < count; i++) {
        const s = streamers[i];
        const current = SKY_WIND_CURRENTS[s.currentIndex];
        if (!isWindCurrentActive(current)) {
          positions[i * 3 + 1] = HIDDEN_Y;
          continue;
        }
        const path = current.path;
        const segments = path.length - 1;
        const t = (elapsedSec * 0.4 * (current.speed / 6) + s.phase) % 1;
        const along = t * segments;
        const seg = Math.min(segments - 1, Math.floor(along));
        const u = along - seg;
        const a = path[seg];
        const b = path[seg + 1];
        const wob = s.lateral * current.radius * 0.8;
        positions[i * 3] = a.x + (b.x - a.x) * u + Math.sin(elapsedSec * 2 + i) * wob;
        positions[i * 3 + 1] = a.y + (b.y - a.y) * u;
        positions[i * 3 + 2] = a.z + (b.z - a.z) * u + Math.cos(elapsedSec * 2 + i) * wob;
      }
      geo.getAttribute('position').needsUpdate = true;
    },
  };
}
// #endregion
