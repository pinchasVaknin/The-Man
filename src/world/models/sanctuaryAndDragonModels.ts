// ============================================================================
// MODULE: World / Models / Sanctuary & Dragon Models
// DESIGN: Flying Imperial Sky Dragon & Mystic Sakura Hot-Spring Sanctuary (SRP)
// SUMMARY: Constructs the 22-segment articulated flying sky dragon, onsen pool,
//          colossal Golden Buddha statue, blooming sakura trees, and Tai-Chi monks.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import {
  FORTRESS_Y_OFFSET,
  SAKURA_SANCTUARY_POS,
  SAKURA_SANCTUARY_YAW,
  SOUTHERN_DRAGON_RUINS_POS,
} from '../domain/landmarksRegistry';
import { hash2D } from '../domain/noiseAndMath';
import { groundHeightAt, isWithinViewDistance, VIEW_DISTANCE } from '../terrainMath';
import { createArchitecturalSharedAssets } from './architecturalHelpers';
import { createReadyDemonDragon } from './DemonDragon';
import { createReadyForestDragon } from './ForestDragon';
import {
  evaluateSouthernDragonTarget,
  getActiveWorldAnimals,
  killGroundAnimal,
} from '../systems/boidsAndWildlifeSystem';
import type { IWorldModelBuildContext } from './types';
// #endregion

// ======================== INTERFACES & TYPES ======================== \\
// #region Interfaces & Types
interface ITaiChiMonk {
  group: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  homeX: number;
  homeY: number;
  homeZ: number;
  baseYaw: number;
  phase: number;
}

/**
 * Summary: Handles to hot spring steam particles and dormant mountain dragon statue.
 * Design: Exposes particle emitters and torii shrine pivots for visual updates.
 */
export interface ISanctuaryAndDragonResult {
  skyDragonGroup: THREE.Group;
  sakuraSanctuaryGroup: THREE.Group;
  updateSanctuaryAndDragon: (elapsedTime: number, playerX: number, playerZ: number) => void;
}
// #endregion

// ======================== FACTORY FUNCTION ======================== \\
// #region Factory Function
/**
 * Summary: Constructs the flying Ice Dragon (DemonDragon) above the Chinese Fortress,
 * the Ancient Southern Ruins and grounded Forest Dragon (ForestDragon) south of the river,
 * and the oriental Sakura Hot-Spring Sanctuary with Golden Buddha and Tai-Chi monks.
 * @param ctx Shared build context (scene, textures, disposal lists).
 * @returns Sanctuary and dragon handles for per-frame updates.
 */
export function buildSanctuaryAndDragonModels(ctx: IWorldModelBuildContext): ISanctuaryAndDragonResult {
  const { scene, textures, disposableGeometries, disposableMaterials, distanceCulledObjects } = ctx;
  const archAssets = ctx.archAssets ?? createArchitecturalSharedAssets(ctx);

  // --- 1) TWO DISTINCT 3D DRAGONS ---
  // Dragon #1: Flying Ice Dragon (DemonDragon_Complete) soaring above the Northern Chinese Fortress
  const demonDragonCtrl = createReadyDemonDragon({
    scale: 4.2,
    castShadow: !ctx.isSoftwareGl,
    receiveShadow: !ctx.isSoftwareGl,
  });
  demonDragonCtrl.setState('fly');

  const skyDragonGroup = new THREE.Group();
  skyDragonGroup.position.set(22.0, 72.0 + FORTRESS_Y_OFFSET, -265.0);
  skyDragonGroup.add(demonDragonCtrl.object);
  scene.add(skyDragonGroup);

  // Ancient Southern Ruins at SOUTHERN_DRAGON_RUINS_POS (x: 56, z: 716, y: 2.15)
  const ruinsBaseX = SOUTHERN_DRAGON_RUINS_POS.x;
  const ruinsBaseZ = SOUTHERN_DRAGON_RUINS_POS.z;
  const ruinsBaseY = SOUTHERN_DRAGON_RUINS_POS.height;

  const southernRuinsGroup = new THREE.Group();
  southernRuinsGroup.position.set(ruinsBaseX, ruinsBaseY, ruinsBaseZ);

  const ruinsStoneMat = new THREE.MeshStandardMaterial({
    color: 0x787469,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.06,
    roughness: 0.88,
    metalness: 0.06,
  });
  const ruinsMossStoneMat = new THREE.MeshStandardMaterial({
    color: 0x4f6246,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.05,
    roughness: 0.92,
    metalness: 0.04,
  });
  const ruinsDarkCarvedMat = new THREE.MeshStandardMaterial({
    color: 0x43413a,
    roughness: 0.84,
    metalness: 0.14,
  });
  const runeGlowMat = new THREE.MeshStandardMaterial({
    color: 0x55ff88,
    emissive: 0x22aa44,
    emissiveIntensity: 1.8,
    roughness: 0.25,
  });
  const fireCoreMat = new THREE.MeshBasicMaterial({
    color: 0xfff7cc,
    transparent: true,
    opacity: 0.94,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const fireMidMat = new THREE.MeshBasicMaterial({
    color: 0xff7711,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const fireOuterMat = new THREE.MeshBasicMaterial({
    color: 0xd9260f,
    transparent: true,
    opacity: 0.64,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const emberGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffaa22,
    emissive: 0xff4500,
    emissiveIntensity: 2.6,
    roughness: 0.2,
  });
  disposableMaterials.push(
    ruinsStoneMat,
    ruinsMossStoneMat,
    ruinsDarkCarvedMat,
    runeGlowMat,
    fireCoreMat,
    fireMidMat,
    fireOuterMat,
    emberGlowMat
  );

  // Sunken circular stone courtyard plinth, outer paving flags & mossy carved inner rings
  const templePlinthGeo = new THREE.CylinderGeometry(39.0, 41.5, 0.44, 32);
  const outerSanctumRingGeo = new THREE.RingGeometry(24.0, 36.5, 32);
  const innerRingGeo = new THREE.RingGeometry(11.5, 22.5, 28);
  const archPillarGeo = new THREE.BoxGeometry(3.0, 10.4, 3.0);
  const archCapGeo = new THREE.BoxGeometry(3.6, 1.05, 3.6);
  const lintelHalfGeo = new THREE.BoxGeometry(6.8, 1.35, 2.6);
  const colBaseGeo = new THREE.BoxGeometry(2.3, 0.76, 2.3);
  const colCapitalGeo = new THREE.BoxGeometry(2.2, 0.65, 2.2);
  const fallenDrumGeo = new THREE.CylinderGeometry(0.82, 0.88, 2.8, 12);
  const wallFragmentPierGeo = new THREE.BoxGeometry(2.75, 1.0, 2.55);
  const merlonBlockGeo = new THREE.BoxGeometry(2.2, 1.85, 2.5);
  const cornerBastionArcGeo = new THREE.CylinderGeometry(4.2, 4.8, 1.0, 10, 1, false, 0, Math.PI * 1.35);
  const rubbleBoulderGeo = new THREE.DodecahedronGeometry(1.45, 1);
  const brokenArchSpanGeo = new THREE.BoxGeometry(8.2, 1.15, 1.9);
  const viaductPierGeo = new THREE.BoxGeometry(2.8, 9.2, 2.8);
  const viaductHalfArchGeo = new THREE.BoxGeometry(4.6, 1.25, 2.4);
  const outerFlagstoneGeo = new THREE.CylinderGeometry(3.2, 3.5, 0.22, 7);
  const altarStepsGeo = new THREE.BoxGeometry(8.2, 1.15, 5.4);
  const altarMonolithGeo = new THREE.BoxGeometry(6.0, 3.8, 3.4);
  const brazierPedestalGeo = new THREE.CylinderGeometry(0.68, 0.88, 2.2, 8);
  const brazierCrystalGeo = new THREE.OctahedronGeometry(0.58, 0);
  disposableGeometries.push(
    templePlinthGeo,
    outerSanctumRingGeo,
    innerRingGeo,
    archPillarGeo,
    archCapGeo,
    lintelHalfGeo,
    colBaseGeo,
    colCapitalGeo,
    fallenDrumGeo,
    wallFragmentPierGeo,
    merlonBlockGeo,
    cornerBastionArcGeo,
    rubbleBoulderGeo,
    brokenArchSpanGeo,
    viaductPierGeo,
    viaductHalfArchGeo,
    outerFlagstoneGeo,
    altarStepsGeo,
    altarMonolithGeo,
    brazierPedestalGeo,
    brazierCrystalGeo
  );

  const templePlinth = new THREE.Mesh(templePlinthGeo, ruinsStoneMat);
  templePlinth.position.set(0, 0.14, 0);
  templePlinth.receiveShadow = !ctx.isSoftwareGl;
  southernRuinsGroup.add(templePlinth);

  const outerSanctumRing = new THREE.Mesh(outerSanctumRingGeo, ruinsMossStoneMat);
  outerSanctumRing.rotation.x = -Math.PI / 2;
  outerSanctumRing.position.set(0, 0.37, 0);
  outerSanctumRing.receiveShadow = !ctx.isSoftwareGl;
  southernRuinsGroup.add(outerSanctumRing);

  const innerRing = new THREE.Mesh(innerRingGeo, ruinsMossStoneMat);
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.set(0, 0.38, 0);
  innerRing.receiveShadow = !ctx.isSoftwareGl;
  southernRuinsGroup.add(innerRing);

  // 1. Towering Northern & Eastern Twin-Pillar Ruined Gateways pushed outward to +/-37.0m
  for (const side of [-1, 1] as const) {
    const archPillar = new THREE.Mesh(archPillarGeo, ruinsStoneMat);
    archPillar.position.set(side * 4.8, 5.1, -37.0);
    archPillar.rotation.z = side * 0.03;
    archPillar.castShadow = !ctx.isSoftwareGl;
    archPillar.receiveShadow = !ctx.isSoftwareGl;
    southernRuinsGroup.add(archPillar);

    const archCap = new THREE.Mesh(archCapGeo, ruinsDarkCarvedMat);
    archCap.position.set(side * 4.8, 10.4, -37.0);
    southernRuinsGroup.add(archCap);

    // Shattered half-lintel jutting inward with a broken gap in the center
    const lintelHalf = new THREE.Mesh(lintelHalfGeo, side < 0 ? ruinsMossStoneMat : ruinsStoneMat);
    lintelHalf.position.set(side * 4.2, 11.2, -37.0);
    lintelHalf.rotation.z = side * 0.12;
    southernRuinsGroup.add(lintelHalf);

    // East Gateway Pillars facing the Traveler's Refuge trail (x = +37.0, z = +/-6.8)
    const eastGatePillar = new THREE.Mesh(archPillarGeo, ruinsMossStoneMat);
    eastGatePillar.position.set(37.0, 4.7, side * 6.8);
    eastGatePillar.rotation.x = side * 0.04;
    eastGatePillar.castShadow = !ctx.isSoftwareGl;
    eastGatePillar.receiveShadow = !ctx.isSoftwareGl;
    southernRuinsGroup.add(eastGatePillar);
  }

  // 2. Shattered, Breached, Stepped Ruined Citadel Walls moved outward to +/-37.0m (NO intact flat walls!)
  // Helper builds a jagged wall run out of individual stepped piers with wide collapsed breaches and fallen rubble
  const buildShatteredWallRun = (
    startX: number,
    startZ: number,
    endX: number,
    endZ: number,
    stepHeights: ReadonlyArray<number>,
    seedOffset: number
  ) => {
    const dx = endX - startX;
    const dz = endZ - startZ;
    const wallYaw = Math.atan2(-dz, dx);
    const count = stepHeights.length;
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0.5;
      const px = startX + dx * t;
      const pz = startZ + dz * t;
      const h = stepHeights[i];

      if (h <= 0.2) {
        // Collapsed breach gap: scatter low tumbled wall stones on the ground so the breach looks violently shattered
        for (let b = -1; b <= 1; b++) {
          const fallenBlock = new THREE.Mesh(
            rubbleBoulderGeo,
            (i + b + seedOffset) % 2 === 0 ? ruinsMossStoneMat : ruinsStoneMat
          );
          const offPerp = b * 1.45 + ((i % 2 === 0 ? 1 : -1) * 0.4);
          const bx = px - Math.sin(wallYaw) * offPerp;
          const bz = pz - Math.cos(wallYaw) * offPerp;
          fallenBlock.scale.set(1.15, 0.42 + Math.abs(b) * 0.18, 0.95);
          fallenBlock.position.set(bx, 0.35, bz);
          fallenBlock.rotation.set(b * 0.3, wallYaw + i * 0.6, b * 0.25);
          southernRuinsGroup.add(fallenBlock);
        }
        continue;
      }

      // Standing jagged stone pier segment
      const pier = new THREE.Mesh(
        wallFragmentPierGeo,
        (i + seedOffset) % 2 === 0 ? ruinsStoneMat : ruinsMossStoneMat
      );
      pier.scale.set(1.04, h, 1.0 + ((i + seedOffset) % 3) * 0.08);
      pier.position.set(px, h * 0.5, pz);
      const tiltAlong = (((i * 7 + seedOffset) % 5) - 2) * 0.028;
      const tiltSide = (((i * 3 + seedOffset) % 5) - 2) * 0.022;
      pier.rotation.set(tiltSide, wallYaw, tiltAlong);
      pier.castShadow = !ctx.isSoftwareGl;
      pier.receiveShadow = !ctx.isSoftwareGl;
      southernRuinsGroup.add(pier);

      // Jagged broken stone cap / shattered merlon on top so no wall segment has a clean flat top
      const capRock = new THREE.Mesh(
        (i + seedOffset) % 3 === 0 ? merlonBlockGeo : rubbleBoulderGeo,
        (i + seedOffset) % 2 === 0 ? ruinsDarkCarvedMat : ruinsMossStoneMat
      );
      if ((i + seedOffset) % 3 === 0) {
        capRock.scale.set(0.92, 0.65 + (i % 3) * 0.25, 0.92);
      } else {
        capRock.scale.set(1.15, 0.55 + (i % 2) * 0.25, 0.95);
      }
      capRock.position.set(px, h + 0.32, pz);
      capRock.rotation.set(tiltSide * 1.6, wallYaw + (i % 2) * 0.4, tiltAlong * 1.8);
      capRock.castShadow = !ctx.isSoftwareGl;
      southernRuinsGroup.add(capRock);

      // Tumbled masonry blocks at the base of fractured transitions
      if (i % 2 === 1) {
        const baseRubble = new THREE.Mesh(rubbleBoulderGeo, ruinsMossStoneMat);
        const sideSign = i % 4 === 1 ? 1 : -1;
        baseRubble.scale.set(1.25, 0.68, 1.05);
        baseRubble.position.set(
          px - Math.sin(wallYaw) * sideSign * 1.85,
          0.48,
          pz - Math.cos(wallYaw) * sideSign * 1.85
        );
        baseRubble.rotation.set(0.25, i * 1.1, -0.3);
        southernRuinsGroup.add(baseRubble);
      }
    }
  };

  // North-West Shattered Wall (x: -34.5 .. -8.5, z: -37.0) — breached in the middle!
  buildShatteredWallRun(-34.5, -37.0, -8.5, -37.0, [7.2, 5.6, 3.4, 1.8, 0.0, 0.0, 2.6, 5.2, 6.8, 4.2], 1);
  // North-East Shattered Wall (x: +8.5 .. +34.5, z: -37.0) — breached in the middle!
  buildShatteredWallRun(8.5, -37.0, 34.5, -37.0, [4.5, 6.6, 4.8, 2.2, 0.0, 0.0, 2.4, 4.4, 6.2, 7.0], 2);
  // West Shattered Wall (x: -37.0, z: -34.0 .. +34.0) — two major collapsed breaches!
  buildShatteredWallRun(
    -37.0,
    -34.0,
    -37.0,
    34.0,
    [7.4, 6.1, 4.5, 2.8, 5.4, 3.2, 0.0, 0.0, 2.4, 5.8, 6.6, 3.8, 1.9, 0.0, 0.0, 0.0, 2.6, 4.9, 6.8, 7.2, 4.6],
    3
  );
  // East Shattered Wall (x: +37.0, z: -34.0 .. +34.0) — wide central approach gap & broken northern/southern runs
  buildShatteredWallRun(
    37.0,
    -34.0,
    37.0,
    -9.5,
    [6.8, 5.2, 3.6, 6.2, 4.1, 2.2, 0.0, 2.8, 5.4],
    4
  );
  buildShatteredWallRun(
    37.0,
    9.5,
    37.0,
    34.0,
    [5.2, 2.6, 0.0, 0.0, 2.4, 4.8, 6.5, 5.1, 7.0],
    5
  );
  // South Shattered Wall (x: -34.5 .. +34.5, z: +37.0) — huge central collapsed breach opening to the southern ruins!
  buildShatteredWallRun(
    -34.5,
    37.0,
    34.5,
    37.0,
    [7.2, 6.0, 4.2, 6.6, 4.8, 2.5, 0.0, 0.0, 0.0, 1.6, 0.0, 0.0, 0.0, 2.8, 5.2, 6.8, 4.4, 6.2, 7.1],
    6
  );

  // 3. Four Half-Collapsed Ruined Corner Bastions at (+/-37.0, +/-37.0) (shattered outer shell + stepped inner ruins)
  const cornerBastionCoords: ReadonlyArray<[number, number, number, number]> = [
    [-37.0, -37.0, 1.08, Math.PI * 0.65],
    [37.0, -37.0, 0.94, Math.PI * 1.15],
    [-37.0, 37.0, 1.14, Math.PI * 0.15],
    [37.0, 37.0, 0.88, Math.PI * 1.65],
  ];
  for (let b = 0; b < cornerBastionCoords.length; b++) {
    const [bx, bz, bScaleY, arcRot] = cornerBastionCoords[b];
    const tallH = 9.8 * bScaleY;
    const midH = 5.4 * bScaleY;
    const lowH = 2.6 * bScaleY;

    // Surviving tall outer arc of the corner tower
    const outerArc = new THREE.Mesh(
      cornerBastionArcGeo,
      b % 2 === 0 ? ruinsMossStoneMat : ruinsStoneMat
    );
    outerArc.scale.set(1.0, tallH, 1.0);
    outerArc.position.set(bx, tallH * 0.5, bz);
    outerArc.rotation.y = arcRot;
    outerArc.castShadow = !ctx.isSoftwareGl;
    outerArc.receiveShadow = !ctx.isSoftwareGl;
    southernRuinsGroup.add(outerArc);

    // Fractured mid-height tier rotated opposite to create a stepped broken bastion silhouette
    const midArc = new THREE.Mesh(
      cornerBastionArcGeo,
      b % 2 === 0 ? ruinsStoneMat : ruinsDarkCarvedMat
    );
    midArc.scale.set(0.92, midH, 0.92);
    midArc.position.set(bx, midH * 0.5, bz);
    midArc.rotation.y = arcRot + Math.PI * 0.75;
    midArc.castShadow = !ctx.isSoftwareGl;
    southernRuinsGroup.add(midArc);

    // Jagged boulders crowning the broken bastion rim & spilled around the base
    for (let k = 0; k < 5; k++) {
      const kang = arcRot + k * 0.55;
      const topBoulder = new THREE.Mesh(rubbleBoulderGeo, ruinsDarkCarvedMat);
      const topH = k < 3 ? tallH : midH;
      topBoulder.scale.set(1.2, 0.75 + (k % 2) * 0.35, 1.0);
      topBoulder.position.set(
        bx + Math.cos(kang) * 3.6,
        topH + 0.2,
        bz + Math.sin(kang) * 3.6
      );
      topBoulder.rotation.set(k * 0.4, kang, k * 0.3);
      southernRuinsGroup.add(topBoulder);

      const fallenBastionRock = new THREE.Mesh(rubbleBoulderGeo, ruinsMossStoneMat);
      fallenBastionRock.scale.set(1.45, 0.85, 1.25);
      fallenBastionRock.position.set(
        bx + Math.cos(kang + 2.2) * (4.4 + (k % 2) * 1.4),
        lowH * 0.25,
        bz + Math.sin(kang + 2.2) * (4.4 + (k % 2) * 1.4)
      );
      fallenBastionRock.rotation.set(k * 0.5, k * 1.2, 0.35);
      southernRuinsGroup.add(fallenBastionRock);
    }
  }

  // 4. Expanded Triple Concentric Colonnade Rings (28 Standing, Tilted & Shattered Columns + Fallen Drums)
  const colonnadeSpots: ReadonlyArray<[number, number, number, boolean]> = [
    // Outer Sanctum Colonnade Ring (r ~ 28..31m)
    [-28.5, -25.5, 8.4, false],
    [-16.5, -29.0, 6.2, true],
    [16.5, -29.0, 7.9, false],
    [28.5, -25.5, 5.1, true],
    [-30.5, -11.5, 8.6, false],
    [30.5, -11.5, 6.8, true],
    [-30.5, 11.5, 5.4, true],
    [30.5, 11.5, 8.2, false],
    [-28.0, 25.5, 7.6, false],
    [-15.0, 29.5, 4.6, true],
    [15.0, 29.5, 7.4, false],
    [28.0, 25.5, 5.8, true],
    // Middle Temple Ring (r ~ 20..22m)
    [-19.5, -17.5, 7.2, true],
    [-10.5, -20.5, 6.4, false],
    [10.5, -20.5, 4.9, true],
    [19.5, -17.5, 7.5, false],
    [-21.5, 0.0, 5.2, true],
    [21.5, 0.0, 7.8, false],
    [-19.5, 17.5, 6.8, false],
    [19.5, 17.5, 4.2, true],
    // Inner Dragon Courtyard Ring (r ~ 13..15m)
    [-13.5, -11.5, 6.2, false],
    [13.5, -11.5, 4.4, true],
    [-15.2, 0.0, 3.8, true],
    [15.2, 0.0, 6.8, false],
    [-13.5, 11.5, 5.8, false],
    [13.5, 11.5, 3.5, true],
    [-7.5, 17.5, 5.4, true],
    [7.5, 17.5, 6.4, false],
  ];
  for (let i = 0; i < colonnadeSpots.length; i++) {
    const [cx, cz, colH, broken] = colonnadeSpots[i];
    const colBase = new THREE.Mesh(colBaseGeo, ruinsDarkCarvedMat);
    colBase.position.set(cx, 0.52, cz);
    southernRuinsGroup.add(colBase);

    const colShaftGeo = new THREE.CylinderGeometry(0.78, 0.94, colH, 12);
    disposableGeometries.push(colShaftGeo);
    const colShaft = new THREE.Mesh(colShaftGeo, i % 2 === 0 ? ruinsStoneMat : ruinsMossStoneMat);
    colShaft.position.set(cx, 0.82 + colH * 0.5, cz);
    if (broken && i % 2 === 0) {
      colShaft.rotation.z = (cx > 0 ? -1 : 1) * 0.11;
    }
    colShaft.castShadow = !ctx.isSoftwareGl;
    colShaft.receiveShadow = !ctx.isSoftwareGl;
    southernRuinsGroup.add(colShaft);

    if (broken) {
      const fallenDrum = new THREE.Mesh(fallenDrumGeo, ruinsMossStoneMat);
      fallenDrum.position.set(cx + (cx > 0 ? -2.6 : 2.6), 0.78, cz + ((i % 2 === 0 ? 1 : -1) * 1.7));
      fallenDrum.rotation.z = Math.PI * 0.46;
      fallenDrum.rotation.y = i * 0.9;
      southernRuinsGroup.add(fallenDrum);
    } else {
      const colCapital = new THREE.Mesh(colCapitalGeo, ruinsDarkCarvedMat);
      colCapital.position.set(cx, 0.82 + colH + 0.28, cz);
      southernRuinsGroup.add(colCapital);
    }
  }

  // Overhead Broken Stone Architrave Spans connecting surviving outer columns
  const archSpanPlacements: ReadonlyArray<[number, number, number, number]> = [
    [-29.5, 9.2, -18.5, Math.PI / 2],
    [29.5, 8.6, 0.0, Math.PI / 2],
    [-22.5, 8.1, -27.2, 0.28],
    [22.5, 8.0, 27.2, -0.28],
    [-15.0, 7.6, -19.0, 0.42],
    [17.2, 7.9, -8.5, 1.35],
  ];
  for (let s = 0; s < archSpanPlacements.length; s++) {
    const [sx, sy, sz, syaw] = archSpanPlacements[s];
    const spanMesh = new THREE.Mesh(brokenArchSpanGeo, ruinsMossStoneMat);
    spanMesh.position.set(sx, sy, sz);
    spanMesh.rotation.y = syaw;
    spanMesh.rotation.z = (s % 2 === 0 ? 1 : -1) * 0.05;
    spanMesh.castShadow = !ctx.isSoftwareGl;
    southernRuinsGroup.add(spanMesh);
  }

  // 5. EXTENSIVE SURROUNDING OUTER RUINS (r = 40m .. 58m around the Citadel so the entire area is a vast ruined complex!)
  // 5A. Ruined Western Stone Viaduct / Aqueduct Arcade (lx = -47.5, lz = -30 .. +30)
  for (let v = 0; v < 6; v++) {
    const vz = -27.5 + v * 11.0;
    const vx = -47.5 + (v % 2) * 1.2;
    const pierH = 7.4 + (v % 3) * 1.35;
    const vPier = new THREE.Mesh(viaductPierGeo, v % 2 === 0 ? ruinsMossStoneMat : ruinsStoneMat);
    vPier.scale.set(1.0, pierH / 9.2, 1.0);
    vPier.position.set(vx, pierH * 0.5, vz);
    vPier.rotation.z = (v % 2 === 0 ? 1 : -1) * 0.04;
    vPier.castShadow = !ctx.isSoftwareGl;
    vPier.receiveShadow = !ctx.isSoftwareGl;
    southernRuinsGroup.add(vPier);

    // Broken half-arch springing from the top of each viaduct pier
    const halfArch = new THREE.Mesh(viaductHalfArchGeo, ruinsDarkCarvedMat);
    halfArch.position.set(vx, pierH + 0.35, vz + (v % 2 === 0 ? 2.2 : -2.2));
    halfArch.rotation.y = Math.PI / 2;
    halfArch.rotation.z = (v % 2 === 0 ? -1 : 1) * 0.24;
    halfArch.castShadow = !ctx.isSoftwareGl;
    southernRuinsGroup.add(halfArch);

    // Fallen viaduct arch voussoirs on the ground between piers
    const fallenArchStone = new THREE.Mesh(rubbleBoulderGeo, ruinsMossStoneMat);
    fallenArchStone.scale.set(1.65, 0.85, 1.35);
    fallenArchStone.position.set(vx + 2.4, 0.55, vz + 4.2);
    fallenArchStone.rotation.set(0.3, v * 0.8, 0.4);
    southernRuinsGroup.add(fallenArchStone);
  }

  // 5B. Four Outer Collapsed Watchtower Keeps & Sunken Crypt Foundations in the surrounding valley
  const outerKeepFoundations: ReadonlyArray<[number, number, number]> = [
    [-46.0, -45.0, 0.4],
    [42.0, -46.0, 1.9],
    [-46.0, 45.0, 2.7],
    [42.0, 46.0, 3.8],
  ];
  for (let k = 0; k < outerKeepFoundations.length; k++) {
    const [kx, kz, kRot] = outerKeepFoundations[k];
    const keepShell = new THREE.Mesh(cornerBastionArcGeo, ruinsMossStoneMat);
    keepShell.scale.set(1.18, 5.2 + (k % 2) * 1.4, 1.18);
    keepShell.position.set(kx, 2.6 + (k % 2) * 0.7, kz);
    keepShell.rotation.y = kRot;
    keepShell.castShadow = !ctx.isSoftwareGl;
    keepShell.receiveShadow = !ctx.isSoftwareGl;
    southernRuinsGroup.add(keepShell);

    // Stepped broken wall stub radiating from each outer keep
    buildShatteredWallRun(
      kx - Math.cos(kRot) * 5.5,
      kz - Math.sin(kRot) * 5.5,
      kx + Math.cos(kRot) * 5.5,
      kz + Math.sin(kRot) * 5.5,
      [4.6, 2.8, 0.0, 3.4, 5.1],
      10 + k
    );
  }

  // 5C. Outer Processional Ruined Avenue (North & South approaches at z = -43..-54 and z = +43..+54)
  const outerAvenueColumns: ReadonlyArray<[number, number, number, boolean]> = [
    [-8.5, -44.0, 6.4, true],
    [8.5, -44.0, 7.2, false],
    [-8.5, -52.0, 4.8, true],
    [8.5, -52.0, 5.6, true],
    [-18.0, -48.5, 5.2, true],
    [18.0, -48.5, 6.1, false],
    [-10.5, 45.0, 6.6, false],
    [10.5, 45.0, 4.5, true],
    [-10.5, 53.0, 5.4, true],
    [10.5, 53.0, 6.8, false],
    [-24.0, 48.0, 4.9, true],
    [24.0, 48.0, 5.8, true],
  ];
  for (let oc = 0; oc < outerAvenueColumns.length; oc++) {
    const [ox, oz, oh, isBroken] = outerAvenueColumns[oc];
    const oBase = new THREE.Mesh(colBaseGeo, ruinsDarkCarvedMat);
    oBase.position.set(ox, 0.42, oz);
    southernRuinsGroup.add(oBase);

    const oShaftGeo = new THREE.CylinderGeometry(0.76, 0.92, oh, 12);
    disposableGeometries.push(oShaftGeo);
    const oShaft = new THREE.Mesh(oShaftGeo, oc % 2 === 0 ? ruinsMossStoneMat : ruinsStoneMat);
    oShaft.position.set(ox, 0.72 + oh * 0.5, oz);
    oShaft.rotation.z = isBroken ? (ox > 0 ? -0.14 : 0.14) : 0;
    oShaft.castShadow = !ctx.isSoftwareGl;
    oShaft.receiveShadow = !ctx.isSoftwareGl;
    southernRuinsGroup.add(oShaft);

    if (isBroken) {
      const oDrum = new THREE.Mesh(fallenDrumGeo, ruinsStoneMat);
      oDrum.position.set(ox + (oc % 2 === 0 ? 2.5 : -2.5), 0.72, oz + 1.4);
      oDrum.rotation.z = Math.PI * 0.47;
      oDrum.rotation.y = oc * 1.1;
      southernRuinsGroup.add(oDrum);
    }
  }

  // 5D. Cracked Outer Flagstone Pavements & 48 Scattered Masonry Boulders across the 38m..56m Outer Ruins Belt
  for (let r = 0; r < 48; r++) {
    const rAng = (r / 48) * Math.PI * 2 + 0.13;
    // Keep eastern trail toward Traveler's Refuge passable
    if (Math.cos(rAng) > 0.9 && Math.abs(Math.sin(rAng)) < 0.28) continue;

    const rRad = 39.5 + (r % 5) * 3.8;
    const rx = Math.cos(rAng) * rRad;
    const rz = Math.sin(rAng) * rRad;

    if (r % 2 === 0) {
      const flagstone = new THREE.Mesh(
        outerFlagstoneGeo,
        r % 4 === 0 ? ruinsMossStoneMat : ruinsStoneMat
      );
      flagstone.position.set(rx, 0.09, rz);
      flagstone.rotation.y = r * 0.6;
      flagstone.receiveShadow = !ctx.isSoftwareGl;
      southernRuinsGroup.add(flagstone);
    }

    const rubble = new THREE.Mesh(
      rubbleBoulderGeo,
      r % 3 === 0 ? ruinsMossStoneMat : r % 2 === 0 ? ruinsStoneMat : ruinsDarkCarvedMat
    );
    const sx = 1.2 + (r % 4) * 0.42;
    const sy = 0.65 + (r % 3) * 0.38;
    const sz = 1.1 + ((r + 1) % 4) * 0.35;
    rubble.scale.set(sx, sy, sz);
    rubble.position.set(rx + Math.sin(r) * 1.5, sy * 0.6, rz + Math.cos(r) * 1.5);
    rubble.rotation.set((r % 3) * 0.25, r * 0.75, (r % 2) * 0.3);
    rubble.castShadow = !ctx.isSoftwareGl;
    rubble.receiveShadow = !ctx.isSoftwareGl;
    southernRuinsGroup.add(rubble);
  }

  // 6. Grand Southern Dragon Altar Dais (matches SOLID_BUILDING_BOXES south-ruins-altar at x: 0, z: +20.0)
  const altarSteps = new THREE.Mesh(altarStepsGeo, ruinsDarkCarvedMat);
  altarSteps.position.set(0, 0.68, 20.0);
  southernRuinsGroup.add(altarSteps);

  const altarMonolith = new THREE.Mesh(altarMonolithGeo, ruinsMossStoneMat);
  altarMonolith.position.set(0, 2.55, 20.0);
  altarMonolith.castShadow = !ctx.isSoftwareGl;
  altarMonolith.receiveShadow = !ctx.isSoftwareGl;
  southernRuinsGroup.add(altarMonolith);

  // 10 Glowing Ancient Braziers around the Altar, Inner Ring, and Moved-Out Gateways
  const brazierCoords: ReadonlyArray<[number, number]> = [
    [-5.8, 20.0],
    [5.8, 20.0],
    [-6.8, -34.5],
    [6.8, -34.5],
    [34.5, -7.8],
    [34.5, 7.8],
    [-18.0, -8.0],
    [18.0, -8.0],
    [-18.0, 10.0],
    [18.0, 10.0],
  ];
  for (let b = 0; b < brazierCoords.length; b++) {
    const [bx, bz] = brazierCoords[b];
    const pedestal = new THREE.Mesh(brazierPedestalGeo, ruinsDarkCarvedMat);
    pedestal.position.set(bx, 1.18, bz);
    southernRuinsGroup.add(pedestal);

    const runeCrystal = new THREE.Mesh(
      brazierCrystalGeo,
      b % 2 === 0 ? emberGlowMat : runeGlowMat
    );
    runeCrystal.position.set(bx, 2.68, bz);
    southernRuinsGroup.add(runeCrystal);
  }

  scene.add(southernRuinsGroup);
  distanceCulledObjects.push({
    obj: southernRuinsGroup,
    cx: ruinsBaseX,
    cz: ruinsBaseZ,
    radius: 135,
  });

  // Dragon #2: Colossal Forest Dragon (scale: 7.8 -> ~14.5m long, ~7m tall!) patrolling & soaring over the Ancient Southern Citadel Ruins
  const forestDragonCtrl = createReadyForestDragon({
    scale: 7.8,
    castShadow: !ctx.isSoftwareGl,
    receiveShadow: !ctx.isSoftwareGl,
  });
  forestDragonCtrl.setState('walk');

  const gorgeDragonGroup = new THREE.Group();
  gorgeDragonGroup.position.set(ruinsBaseX, ruinsBaseY + 0.36, ruinsBaseZ - 2.0);
  gorgeDragonGroup.add(forestDragonCtrl.object);

  // 3D Volumetric Dragon Fire-Breath Plume & Hurtling Fireball Stream attached to the Dragon's Jaws
  const dragonFireBreathGroup = new THREE.Group();
  dragonFireBreathGroup.visible = false;

  const fireCoreConeGeo = new THREE.ConeGeometry(0.95, 11.5, 14, 1, true);
  fireCoreConeGeo.rotateX(Math.PI / 2);
  fireCoreConeGeo.translate(0, 0, 5.75);

  const fireMidConeGeo = new THREE.ConeGeometry(1.85, 14.2, 16, 1, true);
  fireMidConeGeo.rotateX(Math.PI / 2);
  fireMidConeGeo.translate(0, 0, 7.1);

  const fireOuterConeGeo = new THREE.ConeGeometry(2.75, 16.5, 16, 1, true);
  fireOuterConeGeo.rotateX(Math.PI / 2);
  fireOuterConeGeo.translate(0, 0, 8.25);

  const fireMouthOrbGeo = new THREE.SphereGeometry(0.85, 12, 12);
  const fireStreamBallGeo = new THREE.IcosahedronGeometry(0.58, 1);
  disposableGeometries.push(
    fireCoreConeGeo,
    fireMidConeGeo,
    fireOuterConeGeo,
    fireMouthOrbGeo,
    fireStreamBallGeo
  );

  const fireCoreMesh = new THREE.Mesh(fireCoreConeGeo, fireCoreMat);
  const fireMidMesh = new THREE.Mesh(fireMidConeGeo, fireMidMat);
  const fireOuterMesh = new THREE.Mesh(fireOuterConeGeo, fireOuterMat);
  const fireMouthOrb = new THREE.Mesh(fireMouthOrbGeo, fireCoreMat);
  dragonFireBreathGroup.add(fireCoreMesh, fireMidMesh, fireOuterMesh, fireMouthOrb);

  const dragonFireStreamBalls: THREE.Mesh[] = [];
  for (let f = 0; f < 16; f++) {
    const fb = new THREE.Mesh(
      fireStreamBallGeo,
      f % 3 === 0 ? fireCoreMat : f % 2 === 0 ? fireMidMat : emberGlowMat
    );
    dragonFireBreathGroup.add(fb);
    dragonFireStreamBalls.push(fb);
  }

  let dragonFireLight: THREE.PointLight | null = null;
  if (!ctx.isSoftwareGl) {
    dragonFireLight = new THREE.PointLight(0xff5500, 0, 36, 1.5);
    dragonFireLight.position.set(0, 0, 4.5);
    dragonFireBreathGroup.add(dragonFireLight);
  }

  gorgeDragonGroup.add(dragonFireBreathGroup);
  scene.add(gorgeDragonGroup);


  // --- 2) SAKURA HOT-SPRING SANCTUARY & BUDDHA ---
  const sCx = SAKURA_SANCTUARY_POS.x;
  const sCz = SAKURA_SANCTUARY_POS.z;
  const sY = SAKURA_SANCTUARY_POS.height;
  const sakuraSanctuaryGroup = new THREE.Group();
  sakuraSanctuaryGroup.position.set(sCx, sY, sCz);
  sakuraSanctuaryGroup.rotation.y = SAKURA_SANCTUARY_YAW;

  const sakuraBlossomMat = new THREE.MeshStandardMaterial({
    color: 0xffb7d5,
    roughness: 0.55,
    emissive: 0x4a152b,
    emissiveIntensity: 0.22,
  });
  const hotSpringWaterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x075985,
    emissiveIntensity: 0.42,
    roughness: 0.14,
    metalness: 0.12,
    transparent: true,
    opacity: 0.88,
  });
  const monkRobeMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    roughness: 0.65,
  });
  const monkSkinMat = new THREE.MeshStandardMaterial({
    color: 0xf1c27d,
    roughness: 0.55,
  });
  const monkPantsMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.78,
  });
  const monkWrapMat = new THREE.MeshStandardMaterial({
    color: 0xf4f4f5,
    roughness: 0.82,
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x2d3748,
    roughness: 0.45,
    metalness: 0.85,
  });
  const sanctuaryStoneMat = new THREE.MeshStandardMaterial({
    color: 0x9c9891,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.08,
    roughness: 0.86,
    metalness: 0.05,
  });

  disposableMaterials.push(
    sakuraBlossomMat,
    hotSpringWaterMat,
    monkRobeMat,
    monkSkinMat,
    monkPantsMat,
    monkWrapMat,
    darkIronMat,
    sanctuaryStoneMat
  );

  const hotSpringPoolGeo = new THREE.CylinderGeometry(13.5, 14.5, 0.22, 28);
  const hotSpringRimRockGeo = new THREE.DodecahedronGeometry(1.65, 1);
  const lotusPadGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.05, 10);
  const lotusFlowerGeo = new THREE.ConeGeometry(0.32, 0.42, 7);
  const steppingSlabGeo = new THREE.CylinderGeometry(1.45, 1.55, 0.14, 8);
  const buddhaLotusTier1Geo = new THREE.CylinderGeometry(5.6, 6.2, 1.3, 16);
  const buddhaLotusTier2Geo = new THREE.CylinderGeometry(4.5, 5.1, 1.1, 16);
  const buddhaLotusTier3Geo = new THREE.CylinderGeometry(3.8, 4.3, 0.9, 16);
  const buddhaLegsGeo = new THREE.CylinderGeometry(2.6, 3.3, 1.8, 14);
  const buddhaTorsoGeo = new THREE.CylinderGeometry(1.75, 2.35, 4.4, 14);
  const buddhaShouldersGeo = new THREE.SphereGeometry(2.25, 14, 12);
  buddhaShouldersGeo.scale(1.25, 0.55, 0.82);
  const buddhaHeadGeo = new THREE.SphereGeometry(1.38, 14, 14);
  const buddhaUshnishaGeo = new THREE.SphereGeometry(0.55, 10, 10);
  const buddhaHaloRingGeo = new THREE.TorusGeometry(3.4, 0.22, 10, 32);
  const buddhaArmGeo = new THREE.CylinderGeometry(0.46, 0.42, 2.8, 10);
  const sakuraTrunkGeo = new THREE.CylinderGeometry(0.28, 0.48, 4.6, 8);
  sakuraTrunkGeo.translate(0, 2.3, 0);
  const sakuraCrownGeo = new THREE.DodecahedronGeometry(2.8, 1);
  sakuraCrownGeo.scale(1.35, 0.72, 1.35);

  disposableGeometries.push(
    hotSpringPoolGeo,
    hotSpringRimRockGeo,
    lotusPadGeo,
    lotusFlowerGeo,
    steppingSlabGeo,
    buddhaLotusTier1Geo,
    buddhaLotusTier2Geo,
    buddhaLotusTier3Geo,
    buddhaLegsGeo,
    buddhaTorsoGeo,
    buddhaShouldersGeo,
    buddhaHeadGeo,
    buddhaUshnishaGeo,
    buddhaHaloRingGeo,
    buddhaArmGeo,
    sakuraTrunkGeo,
    sakuraCrownGeo
  );

  const localPoolZ = 1.5;
  const hotPoolMesh = new THREE.Mesh(hotSpringPoolGeo, hotSpringWaterMat);
  hotPoolMesh.position.set(0, 0.04, localPoolZ);
  sakuraSanctuaryGroup.add(hotPoolMesh);

  for (let r = 0; r < 24; r++) {
    if (r === 4 || r === 5 || r === 6 || r === 7 || r === 8) continue;
    const ang = (r / 24) * Math.PI * 2;
    const rx = Math.cos(ang) * 14.2;
    const rz = localPoolZ + Math.sin(ang) * 14.2;
    const rimRock = new THREE.Mesh(hotSpringRimRockGeo, sanctuaryStoneMat);
    const sc = 0.75 + hash2D(r, 91) * 0.65;
    rimRock.scale.set(sc * 1.2, sc * 0.7, sc);
    rimRock.position.set(rx, 0.25, rz);
    rimRock.rotation.y = ang;
    sakuraSanctuaryGroup.add(rimRock);
  }

  for (let sz = 15.5; sz <= 25.5; sz += 2.0) {
    const stepSlab = new THREE.Mesh(steppingSlabGeo, archAssets.carvedMarbleMat);
    stepSlab.position.set(0, 0.04, sz);
    sakuraSanctuaryGroup.add(stepSlab);
  }

  for (let l = 0; l < 12; l++) {
    const lang = l * 1.9 + 0.4;
    const lrad = 3.2 + (l % 4) * 2.4;
    const lx = Math.cos(lang) * lrad;
    const lz = localPoolZ + Math.sin(lang) * lrad;
    const pad = new THREE.Mesh(lotusPadGeo, archAssets.jadeBeamMat);
    pad.position.set(lx, 0.16, lz);
    const blossom = new THREE.Mesh(lotusFlowerGeo, sakuraBlossomMat);
    blossom.position.set(lx, 0.36, lz);
    sakuraSanctuaryGroup.add(pad, blossom);
  }

  // Golden Buddha Statue
  const buddhaGroup = new THREE.Group();
  buddhaGroup.position.set(0, 0, -14.0);
  const bTier1 = new THREE.Mesh(buddhaLotusTier1Geo, archAssets.carvedMarbleMat);
  bTier1.position.y = 0.65;
  const bTier2 = new THREE.Mesh(buddhaLotusTier2Geo, archAssets.imperialCrimsonMat);
  bTier2.position.y = 1.85;
  const bTier3 = new THREE.Mesh(buddhaLotusTier3Geo, archAssets.carvedMarbleMat);
  bTier3.position.y = 2.85;

  const bLegs = new THREE.Mesh(buddhaLegsGeo, archAssets.imperialGoldMat);
  bLegs.position.y = 4.2;
  const bTorso = new THREE.Mesh(buddhaTorsoGeo, archAssets.imperialGoldMat);
  bTorso.position.y = 6.9;
  const bShoulders = new THREE.Mesh(buddhaShouldersGeo, archAssets.imperialGoldMat);
  bShoulders.position.y = 8.6;
  const bHead = new THREE.Mesh(buddhaHeadGeo, archAssets.imperialGoldMat);
  bHead.position.y = 10.35;
  const bUshnisha = new THREE.Mesh(buddhaUshnishaGeo, archAssets.imperialGoldMat);
  bUshnisha.position.y = 11.75;
  const bHalo = new THREE.Mesh(buddhaHaloRingGeo, archAssets.imperialGoldMat);
  bHalo.position.set(0, 9.6, -1.35);

  for (const side of [-1, 1]) {
    const bArm = new THREE.Mesh(buddhaArmGeo, archAssets.imperialGoldMat);
    bArm.position.set(side * 2.05, 6.7, 0.55);
    bArm.rotation.z = side * 0.42;
    bArm.rotation.x = -0.35;
    buddhaGroup.add(bArm);
  }

  buddhaGroup.add(
    bTier1,
    bTier2,
    bTier3,
    bLegs,
    bTorso,
    bShoulders,
    bHead,
    bUshnisha,
    bHalo,
    archAssets.createRedChineseLantern(-4.8, 3.8, 3.2),
    archAssets.createRedChineseLantern(4.8, 3.8, 3.2)
  );
  sakuraSanctuaryGroup.add(buddhaGroup);

  const sanctuaryGate = archAssets.createOrnatePaifangGate(22.5, 0);
  sakuraSanctuaryGroup.add(sanctuaryGate);

  for (let t = 0; t < 14; t++) {
    const tang = (t / 14) * Math.PI * 2 + 0.22;
    const trad = 21.0 + (t % 2) * 2.8;
    const ltx = Math.cos(tang) * trad;
    const ltz = Math.sin(tang) * trad;
    if (ltz > 10.0 && Math.abs(ltx) < 9.5) continue;

    const sTree = new THREE.Group();
    sTree.position.set(ltx, 0, ltz);
    const trunk = new THREE.Mesh(sakuraTrunkGeo, darkIronMat);
    sTree.add(trunk);

    for (const [cx, cy, cz, sc] of [
      [0, 5.2, 0, 1.15],
      [-1.8, 4.6, 0.9, 0.85],
      [1.8, 4.7, -0.8, 0.88],
      [0.4, 5.8, 1.4, 0.78],
    ]) {
      const crown = new THREE.Mesh(sakuraCrownGeo, sakuraBlossomMat);
      crown.position.set(cx, cy, cz);
      crown.scale.setScalar(sc);
      sTree.add(crown);
    }
    sakuraSanctuaryGroup.add(sTree);
  }

  scene.add(sakuraSanctuaryGroup);
  distanceCulledObjects.push({
    obj: sakuraSanctuaryGroup,
    cx: sCx,
    cz: sCz,
    radius: 54,
  });

  // --- 3) 4 TAI-CHI MONKS AROUND SAKURA SANCTUARY ---
  const monkTorsoGeo = new THREE.CylinderGeometry(0.24, 0.31, 0.82, 8);
  monkTorsoGeo.translate(0, 1.08, 0);
  const monkHeadGeo = new THREE.SphereGeometry(0.2, 10, 10);
  monkHeadGeo.translate(0, 1.68, 0);
  const monkSashGeo = new THREE.BoxGeometry(0.54, 0.14, 0.54);
  const monkArmGeo = new THREE.CylinderGeometry(0.075, 0.065, 0.68, 6);
  monkArmGeo.translate(0, -0.28, 0);
  const monkUpperLegGeo = new THREE.CylinderGeometry(0.105, 0.088, 0.46, 7);
  monkUpperLegGeo.translate(0, -0.22, 0);
  const monkLowerLegGeo = new THREE.CylinderGeometry(0.082, 0.068, 0.38, 7);
  monkLowerLegGeo.translate(0, -0.56, 0);
  const monkShoeGeo = new THREE.BoxGeometry(0.15, 0.1, 0.28);
  monkShoeGeo.translate(0, -0.74, 0.05);

  disposableGeometries.push(
    monkTorsoGeo,
    monkHeadGeo,
    monkSashGeo,
    monkArmGeo,
    monkUpperLegGeo,
    monkLowerLegGeo,
    monkShoeGeo
  );

  const cosSakura = Math.cos(SAKURA_SANCTUARY_YAW);
  const sinSakura = Math.sin(SAKURA_SANCTUARY_YAW);
  const toSakuraWorld = (lx: number, lz: number): [number, number] => [
    sCx + lx * cosSakura + lz * sinSakura,
    sCz - lx * sinSakura + lz * cosSakura,
  ];
  const [m1x, m1z] = toSakuraWorld(-8.5, -6.5);
  const [m2x, m2z] = toSakuraWorld(8.5, -6.5);
  const [m3x, m3z] = toSakuraWorld(-6.5, 16.5);
  const [m4x, m4z] = toSakuraWorld(6.5, 16.5);

  const taiChiMonks: ITaiChiMonk[] = [];
  const monkPlacements: Array<[number, number, number, number]> = [
    [m1x, sY, m1z, SAKURA_SANCTUARY_YAW],
    [m2x, sY, m2z, SAKURA_SANCTUARY_YAW],
    [m3x, sY, m3z, SAKURA_SANCTUARY_YAW + Math.PI],
    [m4x, sY, m4z, SAKURA_SANCTUARY_YAW + Math.PI],
  ];

  for (let m = 0; m < monkPlacements.length; m++) {
    const [mx, my, mz, myaw] = monkPlacements[m];
    const mGroup = new THREE.Group();
    mGroup.position.set(mx, my, mz);
    mGroup.rotation.y = myaw;

    const torso = new THREE.Mesh(monkTorsoGeo, monkRobeMat);
    const head = new THREE.Mesh(monkHeadGeo, monkSkinMat);
    const sash = new THREE.Mesh(monkSashGeo, archAssets.imperialCrimsonMat);
    sash.position.y = 0.88;

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.32, 1.38, 0);
    leftArm.add(new THREE.Mesh(monkArmGeo, monkRobeMat));

    const rightArm = new THREE.Group();
    rightArm.position.set(0.32, 1.38, 0);
    rightArm.add(new THREE.Mesh(monkArmGeo, monkRobeMat));

    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.14, 0.78, 0);
    leftLeg.add(
      new THREE.Mesh(monkUpperLegGeo, monkPantsMat),
      new THREE.Mesh(monkLowerLegGeo, monkWrapMat),
      new THREE.Mesh(monkShoeGeo, monkPantsMat)
    );

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.14, 0.78, 0);
    rightLeg.add(
      new THREE.Mesh(monkUpperLegGeo, monkPantsMat),
      new THREE.Mesh(monkLowerLegGeo, monkWrapMat),
      new THREE.Mesh(monkShoeGeo, monkPantsMat)
    );

    mGroup.add(torso, head, sash, leftArm, rightArm, leftLeg, rightLeg);
    scene.add(mGroup);
    taiChiMonks.push({
      group: mGroup,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      homeX: mx,
      homeY: my,
      homeZ: mz,
      baseYaw: myaw,
      phase: (m + 4) * 0.85,
    });
  }

  let lastDragonElapsedTime = 0;
  type SouthernDragonBehaviorMode =
    | 'patrol_walk'
    | 'fire_breath'
    | 'takeoff_ascend'
    | 'sky_soar'
    | 'sky_fire_strafe'
    | 'landing_descend'
    | 'prowl_trot'
    | 'claw_attack'
    | 'territorial_call'
    | 'stalk_prowl'
    | 'ancient_rest'
    | 'dragon_lie'
    | 'dragon_sleep'
    | 'dragon_dead';
  let forestDragonMode: SouthernDragonBehaviorMode = 'patrol_walk';
  let forestDragonModeTimer = 4.0;
  let forestDragonCycleIndex = 0;
  let patrolPhase = 0;
  let dragonFlightAltitude = 0;
  const _headWorldPos = new THREE.Vector3();
  const _headLocalPos = new THREE.Vector3();

  return {
    skyDragonGroup,
    sakuraSanctuaryGroup,
    updateSanctuaryAndDragon: (elapsedTime: number, playerX: number, playerZ: number) => {
      const dt =
        lastDragonElapsedTime > 0
          ? Math.min(0.1, Math.max(0.001, elapsedTime - lastDragonElapsedTime))
          : 0.016;
      lastDragonElapsedTime = elapsedTime;

      // 1. Flying Ice Dragon (DemonDragon) above the Northern Chinese Fortress
      const d1Time = elapsedTime * 0.16;
      const d1X = Math.sin(d1Time) * 78.0 + 22.0;
      const d1Z = -265.0 + Math.sin(d1Time * 2.0) * 58.0;
      const d1Vis = isWithinViewDistance(d1X, d1Z, playerX, playerZ, 110, VIEW_DISTANCE + 80);
      skyDragonGroup.visible = d1Vis;
      if (d1Vis) {
        const d1Y = 72.0 + FORTRESS_Y_OFFSET + Math.cos(d1Time * 1.5) * 4.5;
        const d1VelX = Math.cos(d1Time) * 78.0 * 0.16;
        const d1VelZ = Math.cos(d1Time * 2.0) * 58.0 * 0.32;
        const d1Yaw = Math.atan2(d1VelX, d1VelZ);
        const d1Bank = -Math.sin(d1Time) * 0.22;
        skyDragonGroup.position.set(d1X, d1Y, d1Z);
        skyDragonGroup.rotation.order = 'YXZ';
        skyDragonGroup.rotation.y = d1Yaw;
        skyDragonGroup.rotation.z = d1Bank;
        demonDragonCtrl.setState('fly');
        demonDragonCtrl.update(dt, d1Bank);
      }

      // 2. Colossal Forest Dragon (ForestDragon) inside & soaring above the Ancient Southern Citadel Ruins
      const worldAnimals = getActiveWorldAnimals();
      let dragonAnimal = null;
      for (let i = 0; i < worldAnimals.length; i++) {
        if (worldAnimals[i].species === 'dragon') {
          dragonAnimal = worldAnimals[i];
          break;
        }
      }

      if (dragonAnimal?.isLooted) {
        gorgeDragonGroup.visible = false;
      } else {
        const d2Vis = isWithinViewDistance(ruinsBaseX, ruinsBaseZ, playerX, playerZ, 130, VIEW_DISTANCE + 115);
        gorgeDragonGroup.visible = d2Vis;
        if (d2Vis) {
          if (dragonAnimal?.isDead) {
            // Slain after its 250 HP pool is depleted: descend to ground, play death animation, and turn off fire breath
            dragonFlightAltitude = Math.max(0, dragonFlightAltitude - dt * 14.0);
            gorgeDragonGroup.rotation.x = 0;
            gorgeDragonGroup.rotation.z = 0;
            if (forestDragonMode !== 'dragon_dead') {
              forestDragonMode = 'dragon_dead';
              forestDragonCtrl.setState('death');
            }
            const groundY = Math.max(
              ruinsBaseY + 0.36,
              groundHeightAt(gorgeDragonGroup.position.x, gorgeDragonGroup.position.z) + 0.12
            );
            gorgeDragonGroup.position.y = groundY + dragonFlightAltitude;
            forestDragonCtrl.update(dt, 0);
            dragonFireBreathGroup.visible = false;
            if (dragonFireLight) {
              dragonFireLight.intensity = 0;
            }
            dragonAnimal.x = gorgeDragonGroup.position.x;
            dragonAnimal.y = gorgeDragonGroup.position.y;
            dragonAnimal.z = gorgeDragonGroup.position.z;
            dragonAnimal.yaw = gorgeDragonGroup.rotation.y;
          } else {
            const targetInfo = evaluateSouthernDragonTarget(
              gorgeDragonGroup.position.x,
              gorgeDragonGroup.position.z,
              playerX,
              playerZ,
              worldAnimals,
              dragonAnimal?.wokenUpTimer ?? 0
            );
            forestDragonModeTimer = Math.max(0, forestDragonModeTimer - dt);
            let dragonNeckTurn = 0;

            // When NO target (neither player nor prey animal like a deer) is nearby, NEVER breathe fire or claw-attack empty air!
            if (!targetInfo.hasTarget) {
              if (
                forestDragonMode === 'fire_breath' ||
                forestDragonMode === 'claw_attack' ||
                forestDragonMode === 'territorial_call'
              ) {
                forestDragonModeTimer = 0;
              } else if (forestDragonMode === 'sky_fire_strafe') {
                forestDragonMode = 'landing_descend';
                forestDragonModeTimer = 3.6;
                forestDragonCtrl.setState('fly');
              }
            }

            const isAerialMode =
              forestDragonMode === 'takeoff_ascend' ||
              forestDragonMode === 'sky_soar' ||
              forestDragonMode === 'sky_fire_strafe' ||
              forestDragonMode === 'landing_descend';

            if (isAerialMode) {
              // Sequential Aerial Flight State Machine:
              // - With target (player or deer): Takeoff -> Sky Soar -> Aerial Fire Strafe -> Smooth Landing -> Fire Breath!
              // - Without target (peaceful): Takeoff -> Sky Soar -> Smooth Landing -> Peaceful Walk/Rest!
              if (forestDragonModeTimer <= 0) {
                if (forestDragonMode === 'takeoff_ascend') {
                  forestDragonMode = 'sky_soar';
                  forestDragonModeTimer = targetInfo.hasTarget ? 3.4 : 5.4;
                  forestDragonCtrl.setState('fly');
                } else if (forestDragonMode === 'sky_soar') {
                  if (targetInfo.hasTarget) {
                    forestDragonMode = 'sky_fire_strafe';
                    forestDragonModeTimer = 3.8;
                    forestDragonCtrl.setState('fly');
                  } else {
                    forestDragonMode = 'landing_descend';
                    forestDragonModeTimer = 3.6;
                    forestDragonCtrl.setState('fly');
                  }
                } else if (forestDragonMode === 'sky_fire_strafe') {
                  forestDragonMode = 'landing_descend';
                  forestDragonModeTimer = 3.6;
                  forestDragonCtrl.setState('fly');
                } else {
                  // Touchdown complete! Transition smoothly to ground behavior
                  dragonFlightAltitude = 0;
                  if (targetInfo.hasTarget) {
                    forestDragonMode = 'fire_breath';
                    forestDragonModeTimer = 2.8;
                    forestDragonCtrl.setState('roar');
                  } else {
                    forestDragonMode = 'patrol_walk';
                    forestDragonModeTimer = 4.8;
                    forestDragonCtrl.setState('walk');
                  }
                }
              }

              // Advance aerial flight trajectory and altitude
              if (forestDragonMode === 'takeoff_ascend') {
                patrolPhase += dt * 0.42;
                const climbProgress = 1.0 - Math.min(1.0, forestDragonModeTimer / 3.4);
                const targetAlt = 22.0 * climbProgress;
                dragonFlightAltitude += (targetAlt - dragonFlightAltitude) * Math.min(1.0, dt * 3.5);
                const orbitR = 14.5 + climbProgress * 15.5;
                const nextPhase = patrolPhase + 0.06;
                const currX = ruinsBaseX + Math.sin(patrolPhase) * orbitR;
                const currZ = ruinsBaseZ - 2.0 + Math.cos(patrolPhase) * (orbitR * 0.88);
                const nextX = ruinsBaseX + Math.sin(nextPhase) * orbitR;
                const nextZ = ruinsBaseZ - 2.0 + Math.cos(nextPhase) * (orbitR * 0.88);
                gorgeDragonGroup.position.x += (currX - gorgeDragonGroup.position.x) * Math.min(1.0, dt * 4.0);
                gorgeDragonGroup.position.z += (currZ - gorgeDragonGroup.position.z) * Math.min(1.0, dt * 4.0);
                gorgeDragonGroup.rotation.order = 'YXZ';
                gorgeDragonGroup.rotation.y = Math.atan2(nextX - currX, nextZ - currZ);
                gorgeDragonGroup.rotation.x = -0.22 * (1.0 - climbProgress * 0.35);
                gorgeDragonGroup.rotation.z = -Math.cos(patrolPhase) * 0.18;
                dragonNeckTurn = Math.cos(patrolPhase) * 0.25;
              } else if (forestDragonMode === 'sky_soar' || forestDragonMode === 'sky_fire_strafe') {
                patrolPhase += dt * 0.48;
                const nextPhase = patrolPhase + 0.06;
                const targetAlt =
                  forestDragonMode === 'sky_fire_strafe'
                    ? 17.5 + Math.sin(patrolPhase * 1.5) * 1.8
                    : 23.5 + Math.sin(patrolPhase * 1.5) * 2.8;
                dragonFlightAltitude += (targetAlt - dragonFlightAltitude) * Math.min(1.0, dt * 3.0);

                const currX = ruinsBaseX + Math.sin(patrolPhase) * 31.0;
                const currZ = ruinsBaseZ + Math.sin(patrolPhase * 2.0) * 22.0;
                const nextX = ruinsBaseX + Math.sin(nextPhase) * 31.0;
                const nextZ = ruinsBaseZ + Math.sin(nextPhase * 2.0) * 22.0;
                gorgeDragonGroup.position.x += (currX - gorgeDragonGroup.position.x) * Math.min(1.0, dt * 4.5);
                gorgeDragonGroup.position.z += (currZ - gorgeDragonGroup.position.z) * Math.min(1.0, dt * 4.5);
                gorgeDragonGroup.rotation.order = 'YXZ';
                gorgeDragonGroup.rotation.y = Math.atan2(nextX - currX, nextZ - currZ);
                gorgeDragonGroup.rotation.x = forestDragonMode === 'sky_fire_strafe' ? 0.22 : 0.04;
                gorgeDragonGroup.rotation.z = -Math.sin(patrolPhase) * 0.26;
                dragonNeckTurn =
                  forestDragonMode === 'sky_fire_strafe'
                    ? Math.sin(elapsedTime * 2.8) * 0.65
                    : -Math.sin(patrolPhase) * 0.32;
              } else if (forestDragonMode === 'landing_descend') {
                patrolPhase += dt * 0.34;
                const descendFrac = Math.max(0.0, Math.min(1.0, forestDragonModeTimer / 3.6));
                const targetAlt = 18.0 * descendFrac * descendFrac;
                dragonFlightAltitude += (targetAlt - dragonFlightAltitude) * Math.min(1.0, dt * 4.2);

                const orbitR = 14.5 + descendFrac * 15.0;
                const nextPhase = patrolPhase + 0.06;
                const currX = ruinsBaseX + Math.sin(patrolPhase) * orbitR;
                const currZ = ruinsBaseZ - 2.0 + Math.cos(patrolPhase) * (orbitR * 0.85);
                const nextX = ruinsBaseX + Math.sin(nextPhase) * orbitR;
                const nextZ = ruinsBaseZ - 2.0 + Math.cos(nextPhase) * (orbitR * 0.85);
                gorgeDragonGroup.position.x += (currX - gorgeDragonGroup.position.x) * Math.min(1.0, dt * 4.2);
                gorgeDragonGroup.position.z += (currZ - gorgeDragonGroup.position.z) * Math.min(1.0, dt * 4.2);
                gorgeDragonGroup.rotation.order = 'YXZ';
                gorgeDragonGroup.rotation.y = Math.atan2(nextX - currX, nextZ - currZ);
                // Flare wings upward near touchdown, pitch slightly down during initial glide
                gorgeDragonGroup.rotation.x = descendFrac > 0.35 ? 0.16 : -0.16;
                gorgeDragonGroup.rotation.z = -Math.cos(patrolPhase) * 0.14 * descendFrac;
                dragonNeckTurn = Math.cos(patrolPhase) * 0.2;
              }
            } else if (targetInfo.hasTarget && targetInfo.distToTarget < 14.5) {
              dragonFlightAltitude = Math.max(0, dragonFlightAltitude - dt * 8.0);
              // Close-range combat repertoire against player or prey animal (e.g. deer):
              // alternates between claw/bite attacks, sweeping fire breath, and territorial roars!
              if (
                forestDragonModeTimer <= 0 ||
                (forestDragonMode !== 'claw_attack' &&
                  forestDragonMode !== 'fire_breath' &&
                  forestDragonMode !== 'territorial_call')
              ) {
                forestDragonCycleIndex = (forestDragonCycleIndex + 1) % 4;
                if (forestDragonCycleIndex === 0 || forestDragonCycleIndex === 2) {
                  forestDragonMode = 'claw_attack';
                  forestDragonModeTimer = 2.1;
                  forestDragonCtrl.setState('attack');
                } else if (forestDragonCycleIndex === 1) {
                  forestDragonMode = 'fire_breath';
                  forestDragonModeTimer = 2.8;
                  forestDragonCtrl.setState('roar');
                } else {
                  forestDragonMode = 'territorial_call';
                  forestDragonModeTimer = 2.0;
                  forestDragonCtrl.setState('call');
                }
              }
              const toTargetYaw = Math.atan2(
                targetInfo.targetX - gorgeDragonGroup.position.x,
                targetInfo.targetZ - gorgeDragonGroup.position.z
              );
              gorgeDragonGroup.rotation.order = 'YXZ';
              gorgeDragonGroup.rotation.y = toTargetYaw;
              gorgeDragonGroup.rotation.x = 0;
              gorgeDragonGroup.rotation.z = 0;
              if (forestDragonMode === 'fire_breath') {
                dragonNeckTurn = Math.sin(elapsedTime * 2.8) * 0.72;
              }
            } else if (targetInfo.hasTarget) {
              dragonFlightAltitude = Math.max(0, dragonFlightAltitude - dt * 8.0);
              // Mid-range engagement repertoire against player or prey animal (e.g. deer):
              // alternates between ground fire breath, stalking/trotting toward target, and taking off for an aerial fire-strafe pass!
              if (
                forestDragonModeTimer <= 0 ||
                (forestDragonMode !== 'stalk_prowl' &&
                  forestDragonMode !== 'fire_breath' &&
                  forestDragonMode !== 'prowl_trot')
              ) {
                forestDragonCycleIndex = (forestDragonCycleIndex + 1) % 4;
                if (forestDragonCycleIndex === 0) {
                  forestDragonMode = 'fire_breath';
                  forestDragonModeTimer = 2.7;
                  forestDragonCtrl.setState('roar');
                } else if (forestDragonCycleIndex === 1) {
                  forestDragonMode = 'stalk_prowl';
                  forestDragonModeTimer = 3.2;
                  forestDragonCtrl.setState('stalk');
                } else if (forestDragonCycleIndex === 2) {
                  forestDragonMode = 'prowl_trot';
                  forestDragonModeTimer = 2.6;
                  forestDragonCtrl.setState('trot');
                } else {
                  forestDragonMode = 'takeoff_ascend';
                  forestDragonModeTimer = 3.4;
                  forestDragonCtrl.setState('fly');
                }
              }

              if (forestDragonMode !== 'takeoff_ascend') {
                const toTargetYaw = Math.atan2(
                  targetInfo.targetX - gorgeDragonGroup.position.x,
                  targetInfo.targetZ - gorgeDragonGroup.position.z
                );
                gorgeDragonGroup.rotation.order = 'YXZ';
                gorgeDragonGroup.rotation.y = toTargetYaw;
                gorgeDragonGroup.rotation.x = 0;
                gorgeDragonGroup.rotation.z = 0;

                if (forestDragonMode === 'stalk_prowl' || forestDragonMode === 'prowl_trot') {
                  const moveSpd = forestDragonMode === 'prowl_trot' ? 4.4 : 2.8;
                  const nextX = gorgeDragonGroup.position.x + Math.sin(toTargetYaw) * moveSpd * dt;
                  const nextZ = gorgeDragonGroup.position.z + Math.cos(toTargetYaw) * moveSpd * dt;
                  if (Math.hypot(nextX - ruinsBaseX, nextZ - ruinsBaseZ) <= 26.5) {
                    gorgeDragonGroup.position.x = nextX;
                    gorgeDragonGroup.position.z = nextZ;
                  }
                } else if (forestDragonMode === 'fire_breath') {
                  dragonNeckTurn = Math.sin(elapsedTime * 2.6) * 0.75;
                }
              }
            } else {
              dragonFlightAltitude = Math.max(0, dragonFlightAltitude - dt * 8.0);
              // Peaceful Sanctum Guardian Repertoire (when NO player or prey animal is nearby):
              // Never fights or breathes fire at empty air! Smoothly cycles through walking, sitting,
              // taking off into soaring flight, landing, trotting, lying down, and sleeping!
              if (forestDragonModeTimer <= 0) {
                const peacefulSchedule: ReadonlyArray<{
                  mode: SouthernDragonBehaviorMode;
                  clip: 'walk' | 'fly' | 'trot' | 'sit' | 'lie' | 'sleep';
                  dur: number;
                }> = [
                  { mode: 'patrol_walk', clip: 'walk', dur: 5.0 },
                  { mode: 'ancient_rest', clip: 'sit', dur: 4.2 },
                  { mode: 'takeoff_ascend', clip: 'fly', dur: 3.4 },
                  { mode: 'prowl_trot', clip: 'trot', dur: 4.2 },
                  { mode: 'dragon_lie', clip: 'lie', dur: 4.6 },
                  { mode: 'dragon_sleep', clip: 'sleep', dur: 5.2 },
                  { mode: 'patrol_walk', clip: 'walk', dur: 4.6 },
                  { mode: 'takeoff_ascend', clip: 'fly', dur: 3.4 },
                ];
                forestDragonCycleIndex = (forestDragonCycleIndex + 1) % peacefulSchedule.length;
                const nextEntry = peacefulSchedule[forestDragonCycleIndex];
                forestDragonMode = nextEntry.mode;
                forestDragonModeTimer = nextEntry.dur;
                forestDragonCtrl.setState(nextEntry.clip);
              }

              if (
                forestDragonMode === 'patrol_walk' ||
                forestDragonMode === 'prowl_trot' ||
                forestDragonMode === 'stalk_prowl'
              ) {
                const angularSpd =
                  forestDragonMode === 'prowl_trot'
                    ? 0.32
                    : forestDragonMode === 'stalk_prowl'
                      ? 0.16
                      : 0.22;
                patrolPhase += dt * angularSpd;
                const nextPatrolPhase = patrolPhase + 0.05;
                const currX = ruinsBaseX + Math.sin(patrolPhase) * 15.5;
                const currZ = ruinsBaseZ - 2.0 + Math.cos(patrolPhase) * 12.5;
                const nextX = ruinsBaseX + Math.sin(nextPatrolPhase) * 15.5;
                const nextZ = ruinsBaseZ - 2.0 + Math.cos(nextPatrolPhase) * 12.5;
                gorgeDragonGroup.position.x = currX;
                gorgeDragonGroup.position.z = currZ;
                gorgeDragonGroup.rotation.order = 'YXZ';
                gorgeDragonGroup.rotation.y = Math.atan2(nextX - currX, nextZ - currZ);
                gorgeDragonGroup.rotation.x = 0;
                gorgeDragonGroup.rotation.z = 0;
                dragonNeckTurn = Math.cos(patrolPhase) * 0.28;
              } else {
                // Sitting, lying down, or sleeping peacefully in the ruins courtyard
                gorgeDragonGroup.rotation.x = 0;
                gorgeDragonGroup.rotation.z = 0;
                dragonNeckTurn = Math.sin(elapsedTime * 0.8) * 0.12;
              }
            }

            // If the dragon is breathing fire or claw-attacking a nearby prey animal (like a deer), roast/kill the prey!
            if (
              targetInfo.hasTarget &&
              targetInfo.targetKind === 'prey' &&
              targetInfo.targetPrey &&
              !targetInfo.targetPrey.isDead &&
              (forestDragonMode === 'fire_breath' ||
                forestDragonMode === 'sky_fire_strafe' ||
                forestDragonMode === 'claw_attack') &&
              forestDragonModeTimer < 1.8 &&
              targetInfo.distToTarget < 24.0
            ) {
              killGroundAnimal(targetInfo.targetPrey);
            }

            const groundY = Math.max(
              ruinsBaseY + 0.36,
              groundHeightAt(gorgeDragonGroup.position.x, gorgeDragonGroup.position.z) + 0.12
            );
            gorgeDragonGroup.position.y = groundY + dragonFlightAltitude;
            forestDragonCtrl.update(dt, dragonNeckTurn);

            if (dragonAnimal) {
              dragonAnimal.x = gorgeDragonGroup.position.x;
              dragonAnimal.y = gorgeDragonGroup.position.y;
              dragonAnimal.z = gorgeDragonGroup.position.z;
              dragonAnimal.yaw = gorgeDragonGroup.rotation.y;
            }

            // Animate 3D Volumetric Dragon Fire-Breath Stream ONLY when actively breathing fire at a target!
            const isBreathingFire =
              targetInfo.hasTarget &&
              (forestDragonMode === 'fire_breath' || forestDragonMode === 'sky_fire_strafe');
            dragonFireBreathGroup.visible = isBreathingFire;
        if (isBreathingFire) {
          const headBone = forestDragonCtrl.rig.bones[34];
          if (headBone) {
            headBone.getWorldPosition(_headWorldPos);
            _headLocalPos.copy(_headWorldPos);
            gorgeDragonGroup.worldToLocal(_headLocalPos);
            dragonFireBreathGroup.position.set(
              _headLocalPos.x - dragonNeckTurn * 0.65,
              Math.max(2.2, _headLocalPos.y + 0.25),
              _headLocalPos.z + 1.35
            );
          } else {
            dragonFireBreathGroup.position.set(-dragonNeckTurn * 1.2, 4.4, 5.2);
          }

          const sweepYaw = -dragonNeckTurn * 0.55 + Math.sin(elapsedTime * 14.0) * 0.04;
          const sweepPitch =
            (forestDragonMode === 'sky_fire_strafe' ? 0.34 : 0.16) +
            Math.sin(elapsedTime * 9.5) * 0.05;
          dragonFireBreathGroup.rotation.set(sweepPitch, sweepYaw, elapsedTime * 4.5);

          const flicker = 0.88 + Math.sin(elapsedTime * 28.0) * 0.16;
          fireCoreMesh.scale.set(flicker, flicker, 0.92 + Math.cos(elapsedTime * 22.0) * 0.12);
          fireMidMesh.scale.set(
            1.0 + Math.cos(elapsedTime * 24.0) * 0.18,
            1.0 + Math.sin(elapsedTime * 20.0) * 0.18,
            1.0 + Math.sin(elapsedTime * 18.0) * 0.14
          );
          fireOuterMesh.scale.set(
            1.05 + Math.sin(elapsedTime * 19.0) * 0.22,
            1.05 + Math.cos(elapsedTime * 17.0) * 0.22,
            1.02 + Math.cos(elapsedTime * 15.0) * 0.15
          );
          fireMouthOrb.scale.setScalar(0.95 + Math.sin(elapsedTime * 32.0) * 0.22);

          for (let f = 0; f < dragonFireStreamBalls.length; f++) {
            const fb = dragonFireStreamBalls[f];
            const prog = (elapsedTime * 2.8 + f / dragonFireStreamBalls.length) % 1.0;
            const distZ = 0.8 + prog * 15.2;
            const spread = prog * 1.65;
            const swirlAng = elapsedTime * 9.0 + f * 1.35;
            fb.position.set(
              Math.cos(swirlAng) * spread,
              Math.sin(swirlAng) * spread - prog * prog * 0.85,
              distZ
            );
            const ballScale = (0.45 + prog * 1.55) * (1.0 - prog * 0.35);
            fb.scale.setScalar(ballScale);
            fb.rotation.set(elapsedTime * 6.0 + f, elapsedTime * 8.0, f);
          }

          if (dragonFireLight) {
            dragonFireLight.intensity = 5.8 + Math.sin(elapsedTime * 30.0) * 1.8;
          }
        } else if (dragonFireLight) {
          dragonFireLight.intensity = 0;
        }
          }
        }
      }

      // Tai-Chi monks animation
      for (let m = 0; m < taiChiMonks.length; m++) {
        const mk = taiChiMonks[m];
        const vis = isWithinViewDistance(mk.homeX, mk.homeZ, playerX, playerZ, 8, 125);
        mk.group.visible = vis;
        if (!vis) continue;
        const formT = elapsedTime * 1.85 + mk.phase;
        mk.group.position.y = mk.homeY + Math.abs(Math.sin(formT)) * 0.05;
        mk.group.rotation.y = mk.baseYaw + Math.sin(formT * 0.5) * 0.38;
        mk.leftArm.rotation.x = -0.65 + Math.sin(formT) * 0.75;
        mk.leftArm.rotation.z = 0.25 + Math.cos(formT * 0.7) * 0.25;
        mk.rightArm.rotation.x = -0.85 + Math.cos(formT) * 0.85;
        mk.rightArm.rotation.z = -0.25 + Math.sin(formT * 0.7) * 0.32;
        const legStance = Math.sin(formT * 0.5) * 0.26;
        mk.leftLeg.rotation.x = legStance;
        mk.rightLeg.rotation.x = -legStance;
      }
    },
  };
}
// #endregion
