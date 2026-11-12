// ============================================================================
// MODULE: World / Controllers / Underground Culling
// DESIGN: Outdoor scene roots live on their own render layer; the camera drops that layer underground (SRP)
// SUMMARY: Hides the outdoor environment (terrain, vegetation, landmarks, sky-facing meshes) while the player is inside
//          the southern mine. Layers are used rather than `visible`, because the sky, sun and distance culling already
//          set `visible` each frame. A layer also removes lights that belong to outdoor roots from the light list.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import { SOUTHERN_MINE_POS } from '../domain/landmarksRegistry';
import { isInsideSouthernMine } from '../systems/dwarvenMineAndCaravanSystem';
// #endregion

// ======================== CULLING ======================== \\
// #region Culling
/** Summary: Render layer used by every outdoor scene root. Layer 0 is the default and stays on everywhere. */
export const OUTDOOR_LAYER = 1;

const ALWAYS_VISIBLE_ROOT_PREFIXES = [
  'southern-mine',
  'ColliderDebugWireframes',
  'WildlifeAndFootprintsLayer',
  'dwarven-miner',
  'rideable-horse',
  'TempleMonk',
] as const;

function shouldStayVisibleUnderground(root: THREE.Object3D, keep: ReadonlySet<THREE.Object3D>): boolean {
  if (keep.has(root) || root instanceof THREE.Light || root instanceof THREE.Camera) return true;
  if (!root.name) return false;
  return ALWAYS_VISIBLE_ROOT_PREFIXES.some((prefix) => root.name === prefix || root.name.startsWith(prefix));
}

/**
 * Summary: Moves every top-level scene object (and its descendants) to the outdoor layer, except the ones that must
 *          stay visible underground: lights and the camera, the mine group, dwarves, living creatures, F3 collider
 *          wireframes, and the objects in `keep`.
 * @returns Number of outdoor roots moved.
 */
export function markOutdoorRoots(scene: THREE.Scene, keep: ReadonlySet<THREE.Object3D>): number {
  let moved = 0;
  for (const root of scene.children) {
    if (shouldStayVisibleUnderground(root, keep)) continue;
    root.traverse((obj) => {
      obj.layers.set(OUTDOOR_LAYER);
    });
    moved++;
  }
  return moved;
}

/**
 * Summary: True when the player is below the mine entrance threshold and inside the mine's shaft or chambers.
 * Design: Activates as soon as the player descends into the entrance shaft so outdoor terrain and sky are culled cleanly.
 */
export function isPlayerUnderground(x: number, y: number, z: number): boolean {
  return y < SOUTHERN_MINE_POS.entranceY - 0.6 && isInsideSouthernMine(x, z, y);
}

/** Summary: Shows (surface) or hides (underground) the outdoor layer for the camera that renders the scene. */
export function setCameraUndergroundMask(camera: THREE.Camera, underground: boolean): void {
  if (underground) {
    camera.layers.disable(OUTDOOR_LAYER);
  } else {
    camera.layers.enable(OUTDOOR_LAYER);
  }
}
// #endregion
