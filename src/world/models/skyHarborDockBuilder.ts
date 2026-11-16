// ============================================================================
// MODULE: World / Models / Skybound Isles / Sky Harbor
// DESIGN: Placed from the Sky Dock domain data (pier, airship deck, gangplank, crates, crane),
//         so the walkable decks and the drawn planks always match.
// SUMMARY: Builds the Sky Dock: plank yard, pier, crates, crane, tethered balloons and the
//          moored airship (hull, deck, cabin, mast, envelope, rigging, propellers).
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import {
  SKY_HARBOR,
  SKY_DOCK_PIER,
  MOORED_AIRSHIP_DECK,
  AIRSHIP_GANGPLANK,
  DOCK_CRATES,
  DOCK_CRANE,
} from '../domain/landmarksRegistry';
import { addRope, boxMesh, deckSlab, type IHarborMaterials } from './skyHarborShared';
import type { IWorldModelBuildContext } from './types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: Animated parts of the dock. */
export interface ISkyDockVisual {
  readonly airship: THREE.Group;
  readonly propellers: THREE.Mesh[];
  readonly balloons: THREE.Mesh[];
}

const DECK_Y = SKY_HARBOR.deckY;
/** Thin lift (m) for flat decals laid on the deck, so they never z-fight with it. */
const DECAL_LIFT_M = 0.03;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Sky Dock
/**
 * Summary: Builds the Sky Dock into `group`.
 * @param ctx Shared build context.
 * @param mats Sky Harbor palette.
 * @param box Shared unit box geometry.
 * @param group Parent group.
 * @returns The animated dock parts.
 */
export function buildSkyDock(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  box: THREE.BoxGeometry,
  group: THREE.Group
): ISkyDockVisual {
  // Plank yard on the deck between the tower and the pier.
  group.add(boxMesh(box, mats.wood, 805.0, DECK_Y + DECAL_LIFT_M - 0.04, -9.0, 16.0, 0.1, 12.0));
  group.add(deckSlab(box, mats.wood, SKY_DOCK_PIER, 0.5));
  for (let x = SKY_DOCK_PIER.minX + 2; x < SKY_DOCK_PIER.maxX; x += 6) {
    group.add(boxMesh(box, mats.darkWood, x, DECK_Y - 4.0, -8.0, 0.6, 8.0, 0.6));
  }
  for (const c of DOCK_CRATES) group.add(boxMesh(box, mats.darkWood, c.x, c.top - 0.55, c.z, 1.2, 1.1, 1.2, 0.1));
  for (const px of [820.0, 832.0]) group.add(boxMesh(box, mats.darkWood, px, DECK_Y + 0.5, -5.6, 0.5, 1.0, 0.5));

  // Crane: base, mast, jib and a hanging hook.
  const c = DOCK_CRANE;
  group.add(boxMesh(box, mats.darkStone, c.x, DECK_Y + 0.6, c.z, 2.0, 1.2, 2.0));
  group.add(boxMesh(box, mats.darkWood, c.x, DECK_Y + c.height / 2, c.z, 0.7, c.height, 0.7));
  group.add(boxMesh(box, mats.darkWood, c.x + 4.0, DECK_Y + c.height - 0.3, c.z + 2.5, 9.0, 0.5, 0.5, -0.56));
  addRope(group, mats.rope, ctx, [new THREE.Vector3(c.x + 7.6, DECK_Y + c.height - 0.3, c.z + 4.8), new THREE.Vector3(c.x + 7.6, DECK_Y + 3.5, c.z + 4.8)]);
  group.add(boxMesh(box, mats.gold, c.x + 7.6, DECK_Y + 3.3, c.z + 4.8, 0.4, 0.5, 0.4));

  // Tethered cargo balloons.
  const balloonGeo = new THREE.SphereGeometry(1.4, 14, 10);
  ctx.disposableGeometries.push(balloonGeo);
  const balloons: THREE.Mesh[] = [];
  for (const [bx, bz, h] of [[797.0, -16.0, 9.0], [801.0, -3.0, 11.0]] as const) {
    const balloon = new THREE.Mesh(balloonGeo, mats.canvas);
    balloon.position.set(bx, DECK_Y + h, bz);
    balloon.userData.baseY = DECK_Y + h;
    group.add(balloon);
    balloons.push(balloon);
    addRope(group, mats.rope, ctx, [new THREE.Vector3(bx, DECK_Y, bz), new THREE.Vector3(bx, DECK_Y + h - 1.3, bz)]);
  }

  const { airship, propellers } = buildMooredAirship(ctx, mats, box);
  group.add(airship);
  // Gangplank and mooring ropes.
  const g = AIRSHIP_GANGPLANK;
  const len = Math.hypot(g.bz - g.az, g.by - g.ay);
  const plank = boxMesh(box, mats.wood, g.ax, (g.ay + g.by) / 2 - 0.1, (g.az + g.bz) / 2, g.halfWidth * 2, 0.2, len);
  plank.rotation.x = -Math.atan2(g.by - g.ay, g.bz - g.az);
  group.add(plank);
  for (const px of [820.0, 832.0]) {
    addRope(group, mats.rope, ctx, [new THREE.Vector3(px, DECK_Y + 0.9, -5.6), new THREE.Vector3(px, MOORED_AIRSHIP_DECK.y + 0.5, MOORED_AIRSHIP_DECK.minZ)]);
  }
  return { airship, propellers, balloons };
}

/** Moored airship: hull under the walkable deck, cabin, mast, envelope, rigging and propellers. */
function buildMooredAirship(ctx: IWorldModelBuildContext, mats: IHarborMaterials, box: THREE.BoxGeometry): { airship: THREE.Group; propellers: THREE.Mesh[] } {
  const d = MOORED_AIRSHIP_DECK;
  const cx = (d.minX + d.maxX) / 2;
  const cz = (d.minZ + d.maxZ) / 2;
  const airship = new THREE.Group();
  airship.name = 'moored-airship';
  const hullGeo = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const envelopeGeo = new THREE.SphereGeometry(1, 28, 16);
  const propGeo = new THREE.BoxGeometry(0.15, 3.0, 0.4);
  ctx.disposableGeometries.push(hullGeo, envelopeGeo, propGeo);

  const hull = new THREE.Mesh(hullGeo, mats.darkWood);
  hull.scale.set((d.maxX - d.minX) / 2 + 0.6, 4.2, (d.maxZ - d.minZ) / 2 + 0.5);
  hull.position.set(cx, d.y - 0.25, cz);
  airship.add(hull, deckSlab(box, mats.wood, d, 0.3));
  airship.add(boxMesh(box, mats.wood, 833.5, d.y + 1.3, 4.0, 5.0, 2.6, 4.8));
  airship.add(boxMesh(box, mats.gold, 833.5, d.y + 2.7, 4.0, 5.4, 0.2, 5.2));
  airship.add(boxMesh(box, mats.darkWood, 826.0, d.y + 5.5, 4.0, 0.8, 11.0, 0.8));

  const envelope = new THREE.Mesh(envelopeGeo, mats.canvas);
  envelope.scale.set(13.0, 4.2, 5.2);
  envelope.position.set(cx, d.y + 13.5, cz);
  airship.add(envelope);
  for (const [ox, oz] of [[-9, -2.6], [-9, 2.6], [9, -2.6], [9, 2.6], [0, -3.2], [0, 3.2]] as const) {
    addRope(airship, mats.rope, ctx, [new THREE.Vector3(cx + ox, d.y + 1.0, cz + oz * 0.9), new THREE.Vector3(cx + ox * 0.95, d.y + 10.0, cz + oz)]);
  }
  const propellers: THREE.Mesh[] = [];
  for (const oz of [-3.0, 3.0]) {
    const prop = new THREE.Mesh(propGeo, mats.gold);
    prop.position.set(d.minX - 1.2, d.y + 1.0, cz + oz);
    airship.add(prop);
    propellers.push(prop);
  }
  return { airship, propellers };
}
// #endregion
