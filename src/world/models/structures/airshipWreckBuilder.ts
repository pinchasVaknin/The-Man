// ============================================================================
// MODULE: World / Models / Skybound Isles / Forgotten Airship wreck
// DESIGN: Crashed Royal Celestial Sky-Galleon sister ship resting on the Forgotten Airship isle:
//         sculpted curved timber hull with exposed broken ribs, weathered deck planks, north
//         boarding gangway, splintered bowsprit & winged figurehead with hanging anchor chain,
//         snapped foremast & tilted mainmast with billowing tattered sails, ruined stern gallery
//         with broken brass helm wheel, crashed brass engine nacelle with cracked aether core,
//         collapsed dirigible envelope ribs, navigation throttle lever, sunken cargo hatch &
//         push crate, and open captain's journal lectern — preserving every collision & gameplay spot.
// SUMMARY: Builds and animates the Sky-Galleon wreck on Forgotten Airship Island.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import {
  AIRSHIP_BOARDING_RAMP,
  AIRSHIP_CRATE_PUSH_POINT,
  AIRSHIP_CRATE_SIZE_M,
  AIRSHIP_CRATE_SLIDE_M,
  AIRSHIP_HATCH_CHEST,
  AIRSHIP_JOURNAL,
  AIRSHIP_NAVIGATION_LEVER,
  AIRSHIP_WRECK_HULL,
} from '../../domain/landmarks/skyboundIsles/airshipWreckLayout';
import { isSkyPuzzleSolved } from '../../domain/landmarks/skyboundIsles/skyPuzzles';
import { addRope, boxMesh } from './skyHarborShared';
import type { IWorldModelBuildContext } from '../types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What the wreck builder hands back to the frame loop. */
export interface IAirshipWreckBuildResult {
  readonly group: THREE.Group;
  /** Animates swaying sails, flickering lanterns, leaking aether core, and puzzle state. */
  readonly update: (elapsedSec: number) => void;
}
// #endregion

// #region Tuning
const LEVER_POST_HEIGHT_M = 1.25;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Build
/**
 * Summary: Builds the wrecked Royal Sky-Galleon, boarding ramp, lever, crate, hatch chest, and journal.
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
  const deckY = h.y;

  // Shared unit geometries
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const hullBowlGeo = new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
  const coneGeo = new THREE.ConeGeometry(1, 1, 10);
  const torusGeo = new THREE.TorusGeometry(1, 0.1, 8, 22);
  const arcRibGeo = new THREE.TorusGeometry(1, 0.08, 6, 16, Math.PI * 0.85);
  const portholeGeo = new THREE.CircleGeometry(0.38, 12);
  const crystalGeo = new THREE.OctahedronGeometry(0.45, 0);
  crystalGeo.scale(0.85, 1.45, 0.85);
  const chestLidGeo = new THREE.CylinderGeometry(0.48, 0.48, 1.46, 12, 1, false, 0, Math.PI);
  chestLidGeo.rotateZ(Math.PI / 2);
  const knobGeo = new THREE.SphereGeometry(0.22, 12, 10);
  const sailClothGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 4, true, -Math.PI * 0.22, Math.PI * 0.44);

  ctx.disposableGeometries.push(
    boxGeo,
    hullBowlGeo,
    cylGeo,
    coneGeo,
    torusGeo,
    arcRibGeo,
    portholeGeo,
    crystalGeo,
    chestLidGeo,
    knobGeo,
    sailClothGeo
  );

  // Weathered galleon materials
  const std = (params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial => {
    const m = new THREE.MeshStandardMaterial(params);
    ctx.disposableMaterials.push(m);
    return m;
  };
  const hullMat = std({
    color: 0x5c3e24,
    map: ctx.textures.timberAlbedo,
    bumpMap: ctx.textures.barkBump,
    bumpScale: 0.06,
    roughness: 0.86,
  });
  const plankMat = std({
    color: 0x7c5838,
    map: ctx.textures.timberAlbedo,
    bumpMap: ctx.textures.barkBump,
    bumpScale: 0.04,
    roughness: 0.8,
  });
  const darkWoodMat = std({
    color: 0x3b2614,
    map: ctx.textures.timberAlbedo,
    bumpMap: ctx.textures.barkBump,
    bumpScale: 0.075,
    roughness: 0.9,
  });
  const brassMat = std({
    color: 0xb08a38,
    metalness: 0.74,
    roughness: 0.34,
    bumpMap: ctx.textures.rockBump,
    bumpScale: 0.02,
  });
  const ironMat = std({ color: 0x3f444e, metalness: 0.68, roughness: 0.58 });
  const royalBlueMat = std({
    color: 0x1e3a6d,
    emissive: 0x0f172a,
    emissiveIntensity: 0.25,
    roughness: 0.78,
    side: THREE.DoubleSide,
  });
  const canvasMat = std({ color: 0xd9d0bb, roughness: 0.9, side: THREE.DoubleSide });
  const lanternMat = std({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.35,
    roughness: 0.25,
  });
  const aetherMat = std({
    color: 0x7dd3fc,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.75,
    roughness: 0.14,
    transparent: true,
    opacity: 0.92,
  });
  const litMat = std({
    color: 0xe0f2fe,
    emissive: 0x38bdf8,
    emissiveIntensity: 2.1,
    roughness: 0.2,
  });
  const leatherMat = std({ color: 0x542c1a, roughness: 0.82 });
  const parchmentMat = std({ color: 0xf4ead0, roughness: 0.85 });
  const ropeMat = new THREE.LineBasicMaterial({ color: 0x6b563c });
  ctx.disposableMaterials.push(ropeMat);

  // ==========================================================================
  // 1. SCULPTED CRASHED HULL, PLANKED DECK & BOARDING GANGWAY
  // ==========================================================================
  const hullCradle = new THREE.Mesh(hullBowlGeo, darkWoodMat);
  hullCradle.scale.set(sx * 0.54, 2.85, sz * 0.57);
  hullCradle.position.set(cx, deckY - 0.16, cz);
  hullCradle.rotation.x = 0.03;

  const upperStrake = new THREE.Mesh(hullBowlGeo, hullMat);
  upperStrake.scale.set(sx * 0.555, 1.35, sz * 0.59);
  upperStrake.position.set(cx, deckY - 0.02, cz);

  const brassStrake = new THREE.Mesh(hullBowlGeo, brassMat);
  brassStrake.scale.set(sx * 0.562, 0.42, sz * 0.6);
  brassStrake.position.set(cx, deckY + 0.04, cz);

  group.add(hullCradle, upperStrake, brassStrake);

  // Deep ventral keel & broken stern rudder blade
  const rudder = boxMesh(boxGeo, darkWoodMat, h.maxX + 1.15, deckY - 1.45, cz, 1.65, 1.8, 0.24, 0.35);
  rudder.rotation.z = -0.18;
  group.add(
    boxMesh(boxGeo, darkWoodMat, cx, deckY - 2.65, cz, sx * 0.78, 0.58, 0.44),
    boxMesh(boxGeo, brassMat, cx, deckY - 2.95, cz, sx * 0.8, 0.14, 0.5),
    rudder
  );

  // Planked main deck flush with `AIRSHIP_WRECK_HULL.y` (11 longitudinal deck strips, zero Z-fighting)
  const plankSubCount = 8;
  const plankWidth = (sz - 0.36) / plankSubCount;
  for (let i = 0; i < plankSubCount; i++) {
    const pz = h.minZ + 0.18 + (i + 0.5) * plankWidth;
    group.add(
      boxMesh(
        boxGeo,
        i % 2 === 0 ? plankMat : hullMat,
        cx,
        deckY - 0.09,
        pz,
        sx - 0.16,
        0.18,
        plankWidth * 0.94
      )
    );
  }
  // Structural sub-deck backing slab
  group.add(boxMesh(boxGeo, darkWoodMat, cx, deckY - 0.34, cz, sx - 0.3, 0.34, sz - 0.3));

  // Exposed curved oak ribs + broken gunwale stanchions along port and starboard edges
  for (let i = 0; i < 8; i++) {
    const rx = h.minX + 1.4 + i * ((sx - 2.8) / 7);
    const rib = new THREE.Mesh(arcRibGeo, darkWoodMat);
    rib.rotation.y = Math.PI / 2;
    rib.rotation.z = Math.PI * 1.075;
    rib.scale.set(sz * 0.57, 2.35, 1.2);
    rib.position.set(rx, deckY - 0.12, cz);
    group.add(rib);

    for (const side of [-1, 1]) {
      // Leave boarding gap on the north side around x = 834.5..837.5
      if (side < 0 && Math.abs(rx - AIRSHIP_BOARDING_RAMP.ax) < 1.8) continue;
      // Vary heights & occasional snapped posts for authentic wreck silhouette
      const brokenH = i % 3 === 1 ? 0.38 : 0.76;
      const post = boxMesh(
        boxGeo,
        i % 2 === 0 ? darkWoodMat : brassMat,
        rx,
        deckY + brokenH / 2,
        cz + side * (sz / 2 - 0.12),
        0.2,
        brokenH,
        0.2
      );
      post.rotation.z = side * (i % 2 === 0 ? 0.08 : -0.06);
      group.add(post);
    }
  }

  // Gunwale rails (north side split cleanly at boarding ramp)
  group.add(
    boxMesh(boxGeo, darkWoodMat, h.minX + 2.4, deckY + 0.16, h.minZ + 0.12, 4.8, 0.24, 0.24),
    boxMesh(boxGeo, darkWoodMat, h.maxX - 7.1, deckY + 0.16, h.minZ + 0.12, 14.2, 0.24, 0.24),
    boxMesh(boxGeo, darkWoodMat, cx, deckY + 0.16, h.maxZ - 0.12, sx, 0.24, 0.24)
  );

  // Side bulwark timber strakes + brass portholes raised cleanly above island ground (`deckY - 0.45`)
  group.add(
    boxMesh(boxGeo, darkWoodMat, cx, deckY - 0.52, h.minZ - 0.04, sx * 0.88, 0.88, 0.24),
    boxMesh(boxGeo, darkWoodMat, cx, deckY - 0.52, h.maxZ + 0.04, sx * 0.88, 0.88, 0.24)
  );
  for (const px of [cx - 7.0, cx - 3.5, cx, cx + 3.5, cx + 7.0]) {
    for (const side of [-1, 1]) {
      const zFace = cz + side * (sz / 2 + 0.19);
      const frame = new THREE.Mesh(torusGeo, brassMat);
      frame.scale.setScalar(0.28);
      frame.position.set(px, deckY - 0.45, zFace);
      const pane = new THREE.Mesh(portholeGeo, lanternMat);
      pane.scale.setScalar(0.68);
      pane.position.set(px, deckY - 0.45, zFace + side * 0.02);
      pane.rotation.y = side > 0 ? 0 : Math.PI;
      group.add(frame, pane);
    }
  }

  // Walkable wooden boarding gangplank (`AIRSHIP_BOARDING_RAMP`) from island deck onto wreck hull
  {
    const r = AIRSHIP_BOARDING_RAMP;
    const dx = r.bx - r.ax;
    const dy = r.by - r.ay;
    const dz = r.bz - r.az;
    const horiz = Math.hypot(dx, dz) || 1;
    const len = Math.hypot(horiz, dy);
    const pitch = Math.atan2(dy, horiz);
    const gangGroup = new THREE.Group();
    gangGroup.position.set((r.ax + r.bx) / 2, (r.ay + r.by) / 2 - 0.08, (r.az + r.bz) / 2);
    gangGroup.rotation.x = -pitch;
    gangGroup.add(
      boxMesh(boxGeo, plankMat, 0, 0, 0, r.halfWidth * 2, 0.18, len),
      boxMesh(boxGeo, darkWoodMat, -r.halfWidth + 0.09, 0.12, 0, 0.16, 0.14, len),
      boxMesh(boxGeo, darkWoodMat, r.halfWidth - 0.09, 0.12, 0, 0.16, 0.14, len)
    );
    for (let cIdx = -2; cIdx <= 2; cIdx++) {
      gangGroup.add(boxMesh(boxGeo, brassMat, 0, 0.1, (cIdx / 3) * len * 0.85, r.halfWidth * 1.75, 0.05, 0.11));
    }
    group.add(gangGroup);
    for (const side of [-1, 1]) {
      const rx = r.ax + side * (r.halfWidth - 0.08);
      group.add(
        boxMesh(boxGeo, darkWoodMat, rx, r.ay + 0.5, r.az + 0.15, 0.14, 1.0, 0.14),
        boxMesh(boxGeo, darkWoodMat, rx, r.by + 0.5, r.bz - 0.08, 0.14, 1.0, 0.14)
      );
      addRope(group, ropeMat, ctx, [
        new THREE.Vector3(rx, r.ay + 0.95, r.az + 0.15),
        new THREE.Vector3(rx, r.by + 0.95, r.bz - 0.08),
      ]);
    }
  }

  // ==========================================================================
  // 2. SPLINTERED BOWSPRIT, WINGED FIGUREHEAD & HANGING ANCHOR (`x < 830`)
  // ==========================================================================
  const bowX = h.minX - 0.6;
  const bowsprit = new THREE.Mesh(coneGeo, brassMat);
  bowsprit.rotation.z = Math.PI / 2 - 0.18;
  bowsprit.scale.set(0.32, 5.4, 0.32);
  bowsprit.position.set(bowX - 2.3, deckY + 0.52, cz);

  const crackedCrystal = new THREE.Mesh(crystalGeo, aetherMat);
  crackedCrystal.position.set(bowX - 1.35, deckY - 0.15, cz);
  crackedCrystal.rotation.z = 0.25;

  const figHead = boxMesh(boxGeo, brassMat, bowX - 0.4, deckY - 0.32, cz, 1.35, 1.0, 0.52);
  const wingL = boxMesh(boxGeo, brassMat, bowX - 0.1, deckY + 0.12, cz - 0.68, 1.35, 0.5, 0.12, 0.38);
  const wingR = boxMesh(boxGeo, brassMat, bowX - 0.1, deckY + 0.05, cz + 0.65, 1.05, 0.45, 0.12, -0.45);
  wingR.rotation.x = 0.22; // one wing bent from the crash
  group.add(bowsprit, crackedCrystal, figHead, wingL, wingR);

  // Hanging rusted iron anchor off the starboard bow
  const anchorX = h.minX + 1.2;
  const anchorZ = h.minZ - 0.35;
  addRope(group, ropeMat, ctx, [
    new THREE.Vector3(anchorX, deckY + 0.25, h.minZ + 0.15),
    new THREE.Vector3(anchorX, deckY - 1.9, anchorZ),
  ]);
  const anchorGroup = new THREE.Group();
  anchorGroup.position.set(anchorX, deckY - 2.1, anchorZ);
  anchorGroup.rotation.z = 0.22;
  anchorGroup.add(
    boxMesh(boxGeo, ironMat, 0, 0, 0, 0.16, 0.9, 0.16),
    boxMesh(boxGeo, ironMat, 0, 0.35, 0, 0.65, 0.14, 0.14),
    boxMesh(boxGeo, ironMat, 0, -0.42, 0, 0.85, 0.16, 0.16)
  );
  group.add(anchorGroup);

  // ==========================================================================
  // 3. SNAPPED FOREMAST, TILTED MAINMAST & TATTERED SWAYING SAILS
  // ==========================================================================
  // Snapped foremast mounted along the south gunwale (`x = 834.8, z = 71.75`) so the deck stays clear
  const foreStumpX = h.minX + 4.8;
  const foreStumpZ = h.maxZ - 0.22;
  const foreStump = new THREE.Mesh(cylGeo, darkWoodMat);
  foreStump.scale.set(0.32, 3.6, 0.32);
  foreStump.position.set(foreStumpX, deckY + 1.7, foreStumpZ);
  foreStump.rotation.z = 0.1;

  // Snapped upper mast piece resting downward from the foremast stump toward the bow gunwale
  const fallenMast = new THREE.Mesh(cylGeo, hullMat);
  fallenMast.scale.set(0.22, 4.8, 0.22);
  fallenMast.position.set(foreStumpX - 2.0, deckY + 2.35, foreStumpZ - 0.35);
  fallenMast.rotation.z = 1.24;
  fallenMast.rotation.x = -0.14;
  group.add(foreStump, fallenMast);

  // Mainmast (`x = 842.6, z = 71.75`) tilted backward from crash impact, complete with crow's nest & tattered sails
  const mainMastGroup = new THREE.Group();
  mainMastGroup.position.set(cx + 1.6, deckY - 0.1, h.maxZ - 0.22);
  mainMastGroup.rotation.z = -0.15;
  mainMastGroup.rotation.x = 0.05;

  const mainMast = new THREE.Mesh(cylGeo, darkWoodMat);
  mainMast.scale.set(0.38, 11.4, 0.38);
  mainMast.position.y = 5.7;
  const mastBandA = boxMesh(boxGeo, brassMat, 0, 4.4, 0, 0.86, 0.22, 0.86);
  const mastBandB = boxMesh(boxGeo, brassMat, 0, 8.2, 0, 1.9, 0.24, 1.9);
  const crowsNest = boxMesh(boxGeo, darkWoodMat, 0, 8.65, 0, 1.75, 0.68, 1.75);
  const lowerYard = boxMesh(boxGeo, hullMat, 0, 5.2, 0, 0.26, 0.26, 6.4);
  lowerYard.rotation.x = -0.06;
  const upperYard = boxMesh(boxGeo, hullMat, 0, 9.5, 0, 0.22, 0.22, 4.6);
  upperYard.rotation.x = 0.08;
  mainMastGroup.add(mainMast, mastBandA, mastBandB, crowsNest, lowerYard, upperYard);

  // Tattered billowing canvas sails + weathered royal-blue pennant anchored right to the yardarms
  const swaySails: THREE.Mesh[] = [];
  const lowerSail = new THREE.Mesh(sailClothGeo, canvasMat);
  lowerSail.scale.set(1.05, 2.8, 4.4);
  lowerSail.rotation.y = Math.PI / 2;
  lowerSail.position.set(0.28, 3.85, 0);
  const lowerSailStripe = new THREE.Mesh(sailClothGeo, royalBlueMat);
  lowerSailStripe.scale.set(1.08, 0.58, 4.44);
  lowerSailStripe.rotation.y = Math.PI / 2;
  lowerSailStripe.position.set(0.28, 4.25, 0);

  const upperSail = new THREE.Mesh(sailClothGeo, canvasMat);
  upperSail.scale.set(0.85, 2.1, 3.2);
  upperSail.rotation.y = Math.PI / 2;
  upperSail.position.set(0.24, 8.45, 0);

  const pennant = boxMesh(boxGeo, royalBlueMat, 0.85, 11.1, 0, 1.7, 0.42, 0.06);
  mainMastGroup.add(lowerSail, lowerSailStripe, upperSail, pennant);
  swaySails.push(lowerSail, upperSail, pennant);
  group.add(mainMastGroup);

  // Rigging lines tying bowsprit -> foremast stump -> mainmast -> stern gallery
  addRope(group, ropeMat, ctx, [
    new THREE.Vector3(bowX - 3.6, deckY + 1.0, cz),
    new THREE.Vector3(foreStumpX, deckY + 3.4, foreStumpZ),
    new THREE.Vector3(cx + 0.15, deckY + 10.2, h.maxZ - 0.1),
  ]);
  addRope(group, ropeMat, ctx, [
    new THREE.Vector3(cx + 0.3, deckY + 9.4, h.maxZ - 0.1),
    new THREE.Vector3(h.maxX + 0.2, deckY + 2.3, cz + 2.2),
  ]);
  addRope(group, ropeMat, ctx, [
    new THREE.Vector3(cx + 0.3, deckY + 9.4, h.maxZ - 0.1),
    new THREE.Vector3(h.minX + 1.0, deckY + 0.7, h.minZ + 0.2),
  ]);

  // ==========================================================================
  // 4. CRASHED DIRIGIBLE RIB ARCHES & NACELLE ENGINE WITH LEAKING CORE
  // ==========================================================================
  // Collapsed brass dirigible hull arches spanning port-to-starboard above the aft hull,
  // with both feet anchored firmly on the gunwale stanchions (`y = deckY`) and torn canopy draped across.
  for (const [ax, archH, roll] of [
    [cx + 3.6, 3.85, 0.08],
    [cx + 6.2, 4.15, -0.05],
    [cx + 8.6, 3.55, -0.14],
  ] as const) {
    const hoopGroup = new THREE.Group();
    hoopGroup.position.set(ax, deckY + 0.05, cz);
    hoopGroup.rotation.y = Math.PI / 2;
    hoopGroup.rotation.z = roll;
    const archSpan = new THREE.Mesh(arcRibGeo, brassMat);
    archSpan.scale.set(sz * 0.5, archH, 1.15);
    archSpan.rotation.z = Math.PI * 0.075;
    hoopGroup.add(archSpan);
    group.add(hoopGroup);
  }
  // Draped torn royal-blue dirigible envelope canopy resting directly across the aft ribs (`y = deckY + 3.4..4.2`)
  const tornCanopy = new THREE.Mesh(sailClothGeo, royalBlueMat);
  tornCanopy.scale.set(2.55, 5.4, 2.35);
  tornCanopy.rotation.z = Math.PI / 2;
  tornCanopy.position.set(cx + 6.1, deckY + 2.65, cz);
  group.add(tornCanopy);

  // Crashed starboard brass turbine engine nacelle on the north hull flank (`x = 842.0, z = 64.9`)
  const engGroup = new THREE.Group();
  engGroup.position.set(cx + 1.0, deckY - 0.2, h.minZ - 1.15);
  engGroup.rotation.z = -0.22; // impact-bent downward
  engGroup.rotation.y = 0.12;
  const engBody = new THREE.Mesh(cylGeo, brassMat);
  engBody.rotation.z = Math.PI / 2;
  engBody.scale.set(0.62, 3.2, 0.62);
  const engBracket = boxMesh(boxGeo, ironMat, 0, 0.15, 0.9, 1.2, 0.36, 1.6);
  const engCore = new THREE.Mesh(crystalGeo, aetherMat);
  engCore.scale.setScalar(1.35);
  engCore.position.set(0, 0.3, 0);
  const propHub = new THREE.Mesh(knobGeo, ironMat);
  propHub.position.set(-1.75, 0, 0);
  const bladeA = boxMesh(boxGeo, brassMat, -1.8, 0, 0, 0.1, 2.8, 0.34);
  const bladeB = boxMesh(boxGeo, brassMat, -1.8, 0, 0, 0.1, 0.34, 1.9); // one blade snapped shorter
  engGroup.add(engBody, engBracket, engCore, propHub, bladeA, bladeB);
  group.add(engGroup);

  // ==========================================================================
  // 5. RUINED STERN GALLERY, TILTED HELM WHEEL & DECK LANTERNS
  // ==========================================================================
  // Ornate stern gallery facade & arched balcony jutting slightly aft (`x = 852.1..853.2`),
  // staying behind the crate slide zone (`849.0..850.8, z: 66.2..70.6`)
  const sternX = h.maxX + 0.45;
  group.add(
    boxMesh(boxGeo, darkWoodMat, sternX, deckY + 1.15, cz, 0.55, 2.3, sz - 0.4),
    boxMesh(boxGeo, brassMat, sternX + 0.1, deckY + 2.35, cz, 0.72, 0.24, sz - 0.2),
    boxMesh(boxGeo, royalBlueMat, sternX + 0.05, deckY + 2.55, cz, 0.58, 0.2, sz - 0.5),
    // Inner cabin door & glowing brass-trimmed stern windows visible from the main deck
    boxMesh(boxGeo, hullMat, sternX - 0.26, deckY + 1.05, cz, 0.1, 1.75, 1.35),
    boxMesh(boxGeo, brassMat, sternX - 0.27, deckY + 1.05, cz, 0.12, 1.85, 0.12),
    boxMesh(boxGeo, lanternMat, sternX - 0.25, deckY + 1.38, cz - 1.55, 0.08, 0.72, 0.85),
    boxMesh(boxGeo, lanternMat, sternX - 0.25, deckY + 1.38, cz + 1.55, 0.08, 0.72, 0.85),
    boxMesh(boxGeo, brassMat, sternX - 0.26, deckY + 1.38, cz - 1.55, 0.1, 0.76, 0.08),
    boxMesh(boxGeo, brassMat, sternX - 0.26, deckY + 1.38, cz + 1.55, 0.1, 0.76, 0.08),
    boxMesh(boxGeo, lanternMat, sternX + 0.3, deckY + 1.32, cz, 0.08, 1.0, 3.2),
    boxMesh(boxGeo, brassMat, sternX + 0.33, deckY + 1.32, cz - 0.65, 0.1, 1.06, 0.12),
    boxMesh(boxGeo, brassMat, sternX + 0.33, deckY + 1.32, cz + 0.65, 0.1, 1.06, 0.12)
  );
  // Twin stern lanterns + fore deck lantern
  for (const [lx, ly, lz] of [
    [sternX + 0.48, deckY + 2.0, cz - 2.1],
    [sternX + 0.48, deckY + 2.0, cz + 2.1],
    [h.minX + 2.2, deckY + 1.7, h.minZ + 0.35],
    [AIRSHIP_JOURNAL.x - 0.55, deckY + 0.62, AIRSHIP_JOURNAL.z + 0.25],
  ] as const) {
    const cap = boxMesh(boxGeo, brassMat, lx, ly + 0.25, lz, 0.34, 0.12, 0.34);
    const glass = boxMesh(boxGeo, lanternMat, lx, ly, lz, 0.26, 0.38, 0.26);
    group.add(cap, glass);
  }
  // Post holding the bow deck lantern
  group.add(boxMesh(boxGeo, darkWoodMat, h.minX + 2.2, deckY + 0.85, h.minZ + 0.35, 0.2, 1.7, 0.2));

  // Crooked brass ship's helm wheel on the south-aft deck (`x = 847.2, z = 71.15`, clear of crate!)
  const helmX = h.maxX - 4.8;
  const helmZ = h.maxZ - 0.82;
  const helmStand = boxMesh(boxGeo, darkWoodMat, helmX, deckY + 0.55, helmZ, 0.34, 1.1, 0.34);
  const helmWheel = new THREE.Mesh(torusGeo, brassMat);
  helmWheel.rotation.y = Math.PI / 2;
  helmWheel.rotation.x = 0.22; // tilted from impact
  helmWheel.scale.setScalar(0.56);
  helmWheel.position.set(helmX - 0.24, deckY + 1.05, helmZ);
  const helmSpokeA = boxMesh(boxGeo, brassMat, helmX - 0.24, deckY + 1.05, helmZ, 0.08, 1.08, 0.08);
  const helmSpokeB = boxMesh(boxGeo, brassMat, helmX - 0.24, deckY + 1.05, helmZ, 0.08, 0.08, 1.08);
  group.add(helmStand, helmWheel, helmSpokeA, helmSpokeB);

  // Decorative fore cargo barrels tucked against the south-west corner (`x = 832.8, z = 71.0`)
  for (const [bx, bz] of [
    [h.minX + 3.0, h.maxZ - 0.85],
    [h.minX + 3.7, h.maxZ - 0.72],
  ] as const) {
    const barrel = new THREE.Mesh(cylGeo, hullMat);
    barrel.scale.set(0.32, 0.84, 0.32);
    barrel.position.set(bx, deckY + 0.42, bz);
    const hoopA = boxMesh(boxGeo, ironMat, bx, deckY + 0.22, bz, 0.66, 0.06, 0.66);
    const hoopB = boxMesh(boxGeo, ironMat, bx, deckY + 0.64, bz, 0.66, 0.06, 0.66);
    group.add(barrel, hoopA, hoopB);
  }

  // ==========================================================================
  // 6. NAVIGATION LEVER, PUSH CRATE, HATCH CHEST & CAPTAIN'S JOURNAL
  // ==========================================================================
  const lever = AIRSHIP_NAVIGATION_LEVER;
  const leverPedestal = boxMesh(boxGeo, ironMat, lever.x, lever.y + 0.16, lever.z, 0.72, 0.32, 0.72, Math.PI / 4);
  const leverTrim = boxMesh(boxGeo, brassMat, lever.x, lever.y + 0.34, lever.z, 0.56, 0.12, 0.56);
  const post = new THREE.Mesh(cylGeo, brassMat);
  post.scale.set(0.08, LEVER_POST_HEIGHT_M, 0.08);
  post.position.set(lever.x, lever.y + LEVER_POST_HEIGHT_M / 2 + 0.25, lever.z);
  const knob = new THREE.Mesh(knobGeo, brassMat);
  knob.position.set(lever.x, lever.y + LEVER_POST_HEIGHT_M + 0.35, lever.z);
  group.add(leverPedestal, leverTrim, post, knob);

  // Pushable Iron-Bound Expedition Crate & Recessed Hatch Chest
  const crateGroup = new THREE.Group();
  const crateStartZ = AIRSHIP_CRATE_PUSH_POINT.z;
  crateGroup.position.set(AIRSHIP_CRATE_PUSH_POINT.x, deckY + AIRSHIP_CRATE_SIZE_M / 2, crateStartZ);
  crateGroup.add(
    boxMesh(boxGeo, hullMat, 0, 0, 0, AIRSHIP_CRATE_SIZE_M, AIRSHIP_CRATE_SIZE_M, AIRSHIP_CRATE_SIZE_M),
    boxMesh(boxGeo, darkWoodMat, 0, 0, 0, AIRSHIP_CRATE_SIZE_M + 0.04, 0.2, AIRSHIP_CRATE_SIZE_M + 0.04),
    boxMesh(boxGeo, ironMat, 0, AIRSHIP_CRATE_SIZE_M * 0.44, 0, AIRSHIP_CRATE_SIZE_M + 0.05, 0.14, AIRSHIP_CRATE_SIZE_M + 0.05),
    boxMesh(boxGeo, ironMat, 0, -AIRSHIP_CRATE_SIZE_M * 0.44, 0, AIRSHIP_CRATE_SIZE_M + 0.05, 0.14, AIRSHIP_CRATE_SIZE_M + 0.05)
  );
  // Sunken hatch coaming + slide rail tracks beneath the crate (`y = deckY + 0.02`)
  group.add(
    boxMesh(boxGeo, ironMat, AIRSHIP_HATCH_CHEST.x, deckY + 0.03, AIRSHIP_HATCH_CHEST.z, 1.85, 0.06, 1.45),
    boxMesh(boxGeo, darkWoodMat, AIRSHIP_HATCH_CHEST.x, deckY + 0.04, AIRSHIP_HATCH_CHEST.z, 1.65, 0.04, 1.25),
    boxMesh(boxGeo, brassMat, AIRSHIP_HATCH_CHEST.x - 0.6, deckY + 0.02, crateStartZ + AIRSHIP_CRATE_SLIDE_M * 0.5, 0.12, 0.04, AIRSHIP_CRATE_SLIDE_M + 1.2),
    boxMesh(boxGeo, brassMat, AIRSHIP_HATCH_CHEST.x + 0.6, deckY + 0.02, crateStartZ + AIRSHIP_CRATE_SLIDE_M * 0.5, 0.12, 0.04, AIRSHIP_CRATE_SLIDE_M + 1.2)
  );

  // Ornate vaulted hatch chest (hidden until the crate slides off the hatch)
  const hatchChest = new THREE.Group();
  hatchChest.position.set(AIRSHIP_HATCH_CHEST.x, AIRSHIP_HATCH_CHEST.y, AIRSHIP_HATCH_CHEST.z);
  const chestBody = boxMesh(boxGeo, hullMat, 0, 0.34, 0, 1.45, 0.58, 0.95);
  const chestLid = new THREE.Mesh(chestLidGeo, hullMat);
  chestLid.position.set(0, 0.63, 0);
  const chestBand = boxMesh(boxGeo, brassMat, 0, 0.61, 0, 1.5, 0.12, 1.0);
  const chestLock = boxMesh(boxGeo, aetherMat, 0, 0.61, 0.46, 0.24, 0.28, 0.16);
  hatchChest.add(chestBody, chestLid, chestBand, chestLock);
  hatchChest.visible = false;
  group.add(crateGroup, hatchChest);

  // Captain's Journal open on a compact weathered wooden chest lectern (`AIRSHIP_JOURNAL`)
  const jx = AIRSHIP_JOURNAL.x;
  const jy = AIRSHIP_JOURNAL.y;
  const jz = AIRSHIP_JOURNAL.z;
  group.add(
    boxMesh(boxGeo, darkWoodMat, jx, jy + 0.16, jz, 0.85, 0.32, 0.62),
    boxMesh(boxGeo, brassMat, jx, jy + 0.33, jz, 0.88, 0.05, 0.65),
    boxMesh(boxGeo, leatherMat, jx, jy + 0.38, jz, 0.58, 0.05, 0.42, 0.18),
    boxMesh(boxGeo, parchmentMat, jx - 0.12, jy + 0.415, jz, 0.24, 0.04, 0.35, 0.18),
    boxMesh(boxGeo, parchmentMat, jx + 0.12, jy + 0.415, jz, 0.24, 0.04, 0.35, 0.18),
    // Small brass lamp stand next to the journal
    boxMesh(boxGeo, brassMat, jx - 0.55, jy + 0.34, jz + 0.25, 0.14, 0.56, 0.14)
  );

  return {
    group,
    update: (elapsedSec: number) => {
      const solved = isSkyPuzzleSolved('airship-navigation');
      knob.material = solved ? litMat : brassMat;
      post.rotation.z = solved ? 0.38 : -0.25;
      knob.position.set(
        lever.x - Math.sin(post.rotation.z) * (LEVER_POST_HEIGHT_M * 0.6),
        lever.y + LEVER_POST_HEIGHT_M + 0.3,
        lever.z
      );

      const hatchOpen = isSkyPuzzleSolved('airship-hatch');
      crateGroup.position.z = hatchOpen ? crateStartZ + AIRSHIP_CRATE_SLIDE_M : crateStartZ;
      hatchChest.visible = hatchOpen;

      // Ambient animations: pulsing cracked aether cores, gentle wind sway on tattered sails & flickering lanterns
      const corePulse = 1.45 + Math.sin(elapsedSec * 3.1) * 0.55;
      aetherMat.emissiveIntensity = corePulse;
      engCore.rotation.y = elapsedSec * 1.1;
      crackedCrystal.rotation.y = -elapsedSec * 0.7;

      const sway = Math.sin(elapsedSec * 2.1) * 0.07;
      for (let i = 0; i < swaySails.length; i++) {
        swaySails[i].rotation.z = sway * (i % 2 === 0 ? 1 : -1.2);
      }

      const flicker = 1.2 + Math.sin(elapsedSec * 6.5) * 0.18 + Math.cos(elapsedSec * 11.3) * 0.1;
      lanternMat.emissiveIntensity = flicker;
    },
  };
}
// #endregion
