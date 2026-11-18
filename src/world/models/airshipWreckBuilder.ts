// ============================================================================
// MODULE: World / Models / Skybound Isles / Forgotten Airship wreck
// DESIGN: Clean, well-proportioned wooden hull deck matching `AIRSHIP_WRECK_HULL` with
//         subtle side gunwale kerbs, brass navigation lever, pushable crate, hatch chest,
//         and captain's journal (free of visual clutter on the small lower island).
// SUMMARY: Builds the broken sky-galleon hull and navigation lever of the Forgotten Airship wreck.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import {
  AIRSHIP_JOURNAL,
  AIRSHIP_CRATE_PUSH_POINT,
  AIRSHIP_CRATE_SIZE_M,
  AIRSHIP_CRATE_SLIDE_M,
  AIRSHIP_HATCH_CHEST,
  AIRSHIP_NAVIGATION_LEVER,
  AIRSHIP_WRECK_HULL,
} from '../domain/landmarks/skyboundIsles/airshipWreckLayout';
import { isSkyPuzzleSolved } from '../domain/landmarks/skyboundIsles/skyPuzzles';
import type { IWorldModelBuildContext } from './types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What the wreck builder hands back to the frame loop. */
export interface IAirshipWreckBuildResult {
  readonly group: THREE.Group;
  /** Lights the lever once the navigation puzzle is solved; call once per frame while nearby. */
  readonly update: (elapsedSec: number) => void;
}
// #endregion

// #region Tuning
const HULL_THICKNESS_M = 1.0;
const LEVER_POST_HEIGHT_M = 1.3;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Build
/**
 * Summary: Builds the broken sky-galleon hull and the navigation lever.
 * @param ctx Shared build context.
 * @returns The root group (not yet added to the scene) and the per-frame update.
 */
export function buildAirshipWreck(ctx: IWorldModelBuildContext): IAirshipWreckBuildResult {
  const group = new THREE.Group();
  group.name = 'airship-wreck';
  const h = AIRSHIP_WRECK_HULL;
  const cx = (h.minX + h.maxX) / 2;
  const cz = (h.minZ + h.maxZ) / 2;
  const sx = h.maxX - h.minX;
  const sz = h.maxZ - h.minZ;

  const hullGeo = new THREE.BoxGeometry(sx, HULL_THICKNESS_M, sz);
  const gunwaleGeo = new THREE.BoxGeometry(0.24, 0.28, sz);
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.88, bumpMap: ctx.textures.rockBump, bumpScale: 0.04 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x4a3119, roughness: 0.9 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xb08d3a, metalness: 0.7, roughness: 0.35 });
  const litMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfacc15, emissiveIntensity: 1.6, roughness: 0.3 });
  const postGeo = new THREE.CylinderGeometry(0.08, 0.1, LEVER_POST_HEIGHT_M, 8);
  const knobGeo = new THREE.SphereGeometry(0.22, 10, 8);
  ctx.disposableGeometries.push(hullGeo, gunwaleGeo, postGeo, knobGeo);
  ctx.disposableMaterials.push(hullMat, darkWoodMat, brassMat, litMat);

  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.position.set(cx, h.y - HULL_THICKNESS_M / 2, cz);
  group.add(hull);

  // Clean low wooden side gunwales framing the hull deck without protruding clutter
  for (const side of [-1, 1]) {
    const gunwale = new THREE.Mesh(gunwaleGeo, darkWoodMat);
    gunwale.position.set(cx + side * (sx / 2 - 0.12), h.y + 0.14, cz);
    group.add(gunwale);
  }

  const lever = AIRSHIP_NAVIGATION_LEVER;
  const post = new THREE.Mesh(postGeo, brassMat);
  post.position.set(lever.x, lever.y + LEVER_POST_HEIGHT_M / 2, lever.z);
  const knob = new THREE.Mesh(knobGeo, brassMat);
  knob.position.set(lever.x, lever.y + LEVER_POST_HEIGHT_M + 0.1, lever.z);
  group.add(post, knob);

  // Crate and hatch chest: the crate slides along the hull once the hatch puzzle is solved.
  const crateGeo = new THREE.BoxGeometry(AIRSHIP_CRATE_SIZE_M, AIRSHIP_CRATE_SIZE_M, AIRSHIP_CRATE_SIZE_M);
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8b5e34, roughness: 0.85 });
  const chestBodyGeo = new THREE.BoxGeometry(1.45, 0.85, 0.95);
  const chestBandGeo = new THREE.BoxGeometry(1.5, 0.12, 1.0);
  ctx.disposableGeometries.push(crateGeo, chestBodyGeo, chestBandGeo);
  ctx.disposableMaterials.push(crateMat);
  const crate = new THREE.Mesh(crateGeo, crateMat);
  const crateStartZ = AIRSHIP_CRATE_PUSH_POINT.z;
  crate.position.set(AIRSHIP_CRATE_PUSH_POINT.x, AIRSHIP_WRECK_HULL.y + AIRSHIP_CRATE_SIZE_M / 2, crateStartZ);
  const chestBody = new THREE.Mesh(chestBodyGeo, brassMat);
  chestBody.position.set(AIRSHIP_HATCH_CHEST.x, AIRSHIP_HATCH_CHEST.y + 0.43, AIRSHIP_HATCH_CHEST.z);
  const chestBand = new THREE.Mesh(chestBandGeo, brassMat);
  chestBand.position.set(AIRSHIP_HATCH_CHEST.x, AIRSHIP_HATCH_CHEST.y + 0.7, AIRSHIP_HATCH_CHEST.z);
  chestBody.visible = false;
  chestBand.visible = false;
  group.add(crate, chestBody, chestBand);

  // The captain's journal: a small leather book lying on the hull.
  const bookGeo = new THREE.BoxGeometry(0.5, 0.08, 0.36);
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x5b3a1e, roughness: 0.8 });
  ctx.disposableGeometries.push(bookGeo);
  ctx.disposableMaterials.push(leatherMat);
  const book = new THREE.Mesh(bookGeo, leatherMat);
  book.position.set(AIRSHIP_JOURNAL.x, AIRSHIP_JOURNAL.y + 0.04, AIRSHIP_JOURNAL.z);
  group.add(book);

  return {
    group,
    update: () => {
      const solved = isSkyPuzzleSolved('airship-navigation');
      knob.material = solved ? litMat : brassMat;
      const hatchOpen = isSkyPuzzleSolved('airship-hatch');
      crate.position.z = hatchOpen ? crateStartZ + AIRSHIP_CRATE_SLIDE_M : crateStartZ;
      chestBody.visible = hatchOpen;
      chestBand.visible = hatchOpen;
    },
  };
}
// #endregion
