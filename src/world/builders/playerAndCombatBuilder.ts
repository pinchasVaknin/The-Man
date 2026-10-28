// ============================================================================
// MODULE: World / Builders / Player & Combat Builder
// DESIGN: Viewmodel, ranger character rig, archery targets & combat systems (SRP)
// SUMMARY: Constructs 3rd-person ranger, 1st-person viewmodels (hands, bow, sword,
//          torch), archery target stands, arrow projectiles, and animations.
// ============================================================================

// ======================== IMPORTS & CONTRACTS ======================== \\
// #region Imports & Contracts
import * as THREE from 'three';
import {
  ARCHERY_TARGETS,
  ARROW_TRAIL_MAX_AGE,
  ArrowElementKind,
  ArrowProjectile,
  LOCKED_SWORD_GRIP_TRANSFORM,
  PLAYER_EYE_HEIGHT,
  PlayerState,
  computeFirstPersonSwordAttackPose,
  walkableHeightAt,
} from '../terrainMath';

export interface PlayerAndCombatBuilderContext {
  scene: THREE.Scene;
  furnitureWoodMat: THREE.Material;
  disposableGeometries: THREE.BufferGeometry[];
  disposableMaterials: THREE.Material[];
  distanceCulledObjects: { obj: THREE.Object3D; cx: number; cz: number; radius: number }[];
}

export interface PlayerAndCombatHandle {
  playerCharacterGroup: THREE.Group;
  updatePlayerAndCombat: (
    elapsedTime: number,
    playerState?: PlayerState,
    activeArrows?: readonly ArrowProjectile[]
  ) => void;
}
// #endregion

// ======================== BUILD PLAYER & COMBAT ======================== \\
// #region Build Player & Combat
/**
 * Builder Pattern for Player Character, First-Person Viewmodel, Weapons & Archery Systems:
 * - 5 World Archery Bullseye Target Stands
 * - 3D Feathered Arrow Pool & Fading Gray Smoke/Air Wake Trails
 * - Articulated 3rd-Person Ranger Character
 * - Skyrim-Style 1st-Person Viewmodel (Sculpted Gloved Hands with Signet Ring, Layered Green-and-Gold Vambraces,
 *   90° Bow Riser Grip, Nocked Arrow, Ornate Rune-Engraved Greatsword with 3-Phase Full-Viewport Cleave & Forward Crescent Air-Wave, Torch)
 */
export function buildPlayerAndCombatSystems(
  ctx: PlayerAndCombatBuilderContext
): PlayerAndCombatHandle {
  const {
    scene,
    furnitureWoodMat,
    disposableGeometries,
    disposableMaterials,
    distanceCulledObjects,
  } = ctx;

  // Note: The 4 Imperial Archery Bullseye Targets next to the Grand Hall in the Chinese Fortress
  // are built directly in proceduralModels.ts (at [-18, -12.5, 12.5, 18], z = -182 + FZ).
  void ARCHERY_TARGETS;
  void walkableHeightAt;
  void furnitureWoodMat;
  void distanceCulledObjects;

  // 10B) Reusable 3D Feathered Arrow Geometry & Pool of 28 Active Arrow Meshes
  const arrowWoodMat = new THREE.MeshStandardMaterial({ color: 0xc29b61, roughness: 0.55 });
  const arrowSteelTipMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.22,
    metalness: 0.88,
  });
  const arrowFletchRedMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  const arrowFletchWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  disposableMaterials.push(
    arrowWoodMat,
    arrowSteelTipMat,
    arrowFletchRedMat,
    arrowFletchWhiteMat
  );

  // Arrow aligned along local -Z (tip at z = -0.52, nock tail at z = +0.38, total length 0.90m)
  const arrowShaftGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.86, 6);
  arrowShaftGeo.rotateX(Math.PI / 2);
  arrowShaftGeo.translate(0, 0, -0.05);
  const arrowHeadGeo = new THREE.ConeGeometry(0.026, 0.11, 4);
  arrowHeadGeo.rotateX(-Math.PI / 2);
  arrowHeadGeo.translate(0, 0, -0.51);
  const arrowFeatherGeo = new THREE.PlaneGeometry(0.042, 0.14);
  arrowFeatherGeo.rotateX(Math.PI / 2);
  disposableGeometries.push(arrowShaftGeo, arrowHeadGeo, arrowFeatherGeo);

  const arrowFireTipMat = new THREE.MeshBasicMaterial({ color: 0xff7b00 });
  const arrowFireAuraMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.78,
  });
  const arrowWindTipMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const arrowWindAuraMat = new THREE.MeshBasicMaterial({
    color: 0x67e8f9,
    transparent: true,
    opacity: 0.72,
  });
  const arrowAuraConeGeo = new THREE.ConeGeometry(0.044, 0.19, 6);
  arrowAuraConeGeo.rotateX(-Math.PI / 2);
  arrowAuraConeGeo.translate(0, 0, -0.48);
  disposableMaterials.push(
    arrowFireTipMat,
    arrowFireAuraMat,
    arrowWindTipMat,
    arrowWindAuraMat
  );
  disposableGeometries.push(arrowAuraConeGeo);

  const createFeatheredArrowMesh = (): THREE.Group => {
    const aGroup = new THREE.Group();
    const shaft = new THREE.Mesh(arrowShaftGeo, arrowWoodMat);
    const tip = new THREE.Mesh(arrowHeadGeo, arrowSteelTipMat);
    const aura = new THREE.Mesh(arrowAuraConeGeo, arrowFireAuraMat);
    aura.visible = false;
    aGroup.add(shaft, tip, aura);
    aGroup.userData.tipMesh = tip;
    aGroup.userData.auraMesh = aura;
    for (let f = 0; f < 3; f++) {
      const fAng = (f / 3) * Math.PI * 2;
      const feather = new THREE.Mesh(
        arrowFeatherGeo,
        f === 0 ? arrowFletchRedMat : arrowFletchWhiteMat
      );
      feather.position.set(Math.cos(fAng) * 0.016, Math.sin(fAng) * 0.016, 0.30);
      feather.rotation.z = fAng;
      aGroup.add(feather);
    }
    return aGroup;
  };

  const applyArrowElementStyle = (arrowGroup: THREE.Group, kind: ArrowElementKind = 'normal') => {
    const tipMesh = arrowGroup.userData.tipMesh as THREE.Mesh | undefined;
    const auraMesh = arrowGroup.userData.auraMesh as THREE.Mesh | undefined;
    if (!tipMesh || !auraMesh) return;
    if (kind === 'fire') {
      tipMesh.material = arrowFireTipMat;
      auraMesh.material = arrowFireAuraMat;
      auraMesh.visible = true;
    } else if (kind === 'wind') {
      tipMesh.material = arrowWindTipMat;
      auraMesh.material = arrowWindAuraMat;
      auraMesh.visible = true;
    } else {
      tipMesh.material = arrowSteelTipMat;
      auraMesh.visible = false;
    }
  };

  const MAX_RENDERED_ARROWS = 28;
  const arrowMeshPool: THREE.Group[] = [];
  for (let i = 0; i < MAX_RENDERED_ARROWS; i++) {
    const am = createFeatheredArrowMesh();
    am.visible = false;
    scene.add(am);
    arrowMeshPool.push(am);
  }

  // 10C) HIGH-QUALITY ARTICULATED 3D RANGER CHARACTER & PROPER RECURVE BOW RIG
  const playerCharacterGroup = new THREE.Group();
  const rangerBodyGroup = new THREE.Group();
  const rangerUpperTorsoPivot = new THREE.Group();
  rangerUpperTorsoPivot.position.set(0, 0.92, 0);

  const rangerSkinMat = new THREE.MeshStandardMaterial({ color: 0xe8be9e, roughness: 0.58 });
  const rangerHairMat = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.78 });
  const rangerTunicMat = new THREE.MeshStandardMaterial({ color: 0x1e4d3b, roughness: 0.72 });
  const rangerCloakMat = new THREE.MeshStandardMaterial({
    color: 0x143829,
    roughness: 0.82,
    side: THREE.DoubleSide,
  });
  const rangerLeatherMat = new THREE.MeshStandardMaterial({ color: 0x5c3818, roughness: 0.52 });
  const rangerDarkLeatherMat = new THREE.MeshStandardMaterial({ color: 0x36200d, roughness: 0.58 });
  const rangerPantsMat = new THREE.MeshStandardMaterial({ color: 0x2c3539, roughness: 0.78 });
  const bowWoodMat = new THREE.MeshStandardMaterial({
    color: 0x7c3f14,
    roughness: 0.36,
    metalness: 0.08,
  });
  const bowHornMat = new THREE.MeshStandardMaterial({
    color: 0xd9a838,
    roughness: 0.28,
    metalness: 0.65,
  });
  const bowStringMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
  disposableMaterials.push(
    rangerSkinMat,
    rangerHairMat,
    rangerTunicMat,
    rangerCloakMat,
    rangerLeatherMat,
    rangerDarkLeatherMat,
    rangerPantsMat,
    bowWoodMat,
    bowHornMat,
    bowStringMat
  );

  // Sculpted Torso, Belt, Baldric Strap, Cloak & Quiver (relative to rangerUpperTorsoPivot at y = 0.92)
  const rPelvisGeo = new THREE.CylinderGeometry(0.18, 0.17, 0.22, 10);
  const rChestGeo = new THREE.CylinderGeometry(0.22, 0.18, 0.52, 10);
  const rShoulderMantleGeo = new THREE.CylinderGeometry(0.26, 0.29, 0.18, 10);
  const rBeltGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.08, 10);
  const rBaldricGeo = new THREE.BoxGeometry(0.08, 0.56, 0.34);
  const rNeckGeo = new THREE.CylinderGeometry(0.075, 0.085, 0.14, 8);
  const rHeadGeo = new THREE.SphereGeometry(0.145, 14, 14);
  const rHairCapGeo = new THREE.SphereGeometry(0.154, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62);
  const rCloakBackGeo = new THREE.PlaneGeometry(0.46, 0.74, 4, 6);
  const rQuiverTubeGeo = new THREE.CylinderGeometry(0.068, 0.055, 0.52, 8);
  const rUpperArmGeo = new THREE.CylinderGeometry(0.068, 0.058, 0.30, 8);
  const rForearmGeo = new THREE.CylinderGeometry(0.058, 0.048, 0.28, 8);
  const rHandGeo = new THREE.SphereGeometry(0.052, 8, 8);
  const rThighGeo = new THREE.CylinderGeometry(0.095, 0.078, 0.44, 8);
  rThighGeo.translate(0, -0.22, 0);
  const rBootGeo = new THREE.CylinderGeometry(0.078, 0.068, 0.44, 8);
  rBootGeo.translate(0, -0.64, 0);
  const rFootGeo = new THREE.BoxGeometry(0.12, 0.08, 0.24);
  rFootGeo.translate(0, -0.86, -0.04);

  // Sculpted Recurve Bow Geometries (Held vertically in the Left Hand, facing -Z)
  const bowRiserGeo = new THREE.CylinderGeometry(0.022, 0.024, 0.36, 8);
  const bowShelfGeo = new THREE.BoxGeometry(0.036, 0.028, 0.065);
  const bowLimbGeo = new THREE.BoxGeometry(0.022, 0.48, 0.032);
  const bowRecurveTipGeo = new THREE.CylinderGeometry(0.014, 0.018, 0.16, 6);
  const bowStringSegGeo = new THREE.CylinderGeometry(0.0045, 0.0045, 1.0, 5);
  bowStringSegGeo.translate(0, 0.5, 0);

  disposableGeometries.push(
    rPelvisGeo,
    rChestGeo,
    rShoulderMantleGeo,
    rBeltGeo,
    rBaldricGeo,
    rNeckGeo,
    rHeadGeo,
    rHairCapGeo,
    rCloakBackGeo,
    rQuiverTubeGeo,
    rUpperArmGeo,
    rForearmGeo,
    rHandGeo,
    rThighGeo,
    rBootGeo,
    rFootGeo,
    bowRiserGeo,
    bowShelfGeo,
    bowLimbGeo,
    bowRecurveTipGeo,
    bowStringSegGeo
  );

  const pelvisMesh = new THREE.Mesh(rPelvisGeo, rangerTunicMat);
  pelvisMesh.position.y = 0.02;
  const beltMesh = new THREE.Mesh(rBeltGeo, rangerDarkLeatherMat);
  beltMesh.position.y = 0.08;
  const buckleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.04), bowHornMat);
  buckleMesh.position.set(0, 0.08, -0.19);
  const chestMesh = new THREE.Mesh(rChestGeo, rangerTunicMat);
  chestMesh.position.y = 0.34;
  const mantleMesh = new THREE.Mesh(rShoulderMantleGeo, rangerCloakMat);
  mantleMesh.position.y = 0.54;
  const baldricMesh = new THREE.Mesh(rBaldricGeo, rangerLeatherMat);
  baldricMesh.position.set(0, 0.34, 0);
  baldricMesh.rotation.z = 0.52;
  const cloakBackMesh = new THREE.Mesh(rCloakBackGeo, rangerCloakMat);
  cloakBackMesh.position.set(0, 0.20, 0.21);
  cloakBackMesh.rotation.x = 0.12;

  // Leather Back Quiver with 4 visible feathered arrows
  const quiverGroup = new THREE.Group();
  quiverGroup.position.set(0.11, 0.38, 0.22);
  quiverGroup.rotation.z = -0.38;
  quiverGroup.rotation.x = -0.12;
  quiverGroup.add(new THREE.Mesh(rQuiverTubeGeo, rangerLeatherMat));
  for (let q = 0; q < 4; q++) {
    const qArr = createFeatheredArrowMesh();
    qArr.rotation.x = -Math.PI / 2;
    qArr.position.set((q - 1.5) * 0.022, -0.05, (q % 2 - 0.5) * 0.02);
    quiverGroup.add(qArr);
  }

  // Stowed Recurve Bow mounted diagonally on the Ranger's Back
  const stowedBackBowGroup = new THREE.Group();
  stowedBackBowGroup.position.set(-0.04, 0.36, 0.24);
  stowedBackBowGroup.rotation.set(0.12, Math.PI * 0.5, 0.58);
  const stowedRiser = new THREE.Mesh(bowRiserGeo, bowWoodMat);
  const stowedUpperLimb = new THREE.Mesh(bowLimbGeo, bowWoodMat);
  stowedUpperLimb.position.set(0, 0.36, 0.03);
  stowedUpperLimb.rotation.x = -0.14;
  const stowedLowerLimb = new THREE.Mesh(bowLimbGeo, bowWoodMat);
  stowedLowerLimb.position.set(0, -0.36, 0.03);
  stowedLowerLimb.rotation.x = 0.14;
  const stowedString = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 1.18, 5),
    bowStringMat
  );
  stowedString.position.set(0, 0, 0.08);
  stowedBackBowGroup.add(stowedRiser, stowedUpperLimb, stowedLowerLimb, stowedString);
  stowedBackBowGroup.visible = false;

  // Head & Hair Pivot
  const rangerHeadGroup = new THREE.Group();
  rangerHeadGroup.position.set(0, 0.62, 0);
  const neckMesh = new THREE.Mesh(rNeckGeo, rangerSkinMat);
  neckMesh.position.y = 0.04;
  const headSphere = new THREE.Mesh(rHeadGeo, rangerSkinMat);
  headSphere.position.y = 0.16;
  const hairCap = new THREE.Mesh(rHairCapGeo, rangerHairMat);
  hairCap.position.set(0, 0.17, 0.015);
  hairCap.rotation.x = 0.25;
  rangerHeadGroup.add(neckMesh, headSphere, hairCap);

  rangerBodyGroup.add(
    pelvisMesh,
    beltMesh,
    buckleMesh,
    chestMesh,
    mantleMesh,
    baldricMesh,
    cloakBackMesh,
    quiverGroup,
    stowedBackBowGroup,
    rangerHeadGroup
  );
  rangerUpperTorsoPivot.add(rangerBodyGroup);

  // LEFT ARM & PROPER RECURVE BOW GRIP
  const rangerLeftArmGroup = new THREE.Group();
  rangerLeftArmGroup.position.set(-0.25, 0.52, 0);
  const lUpperArm = new THREE.Mesh(rUpperArmGeo, rangerTunicMat);
  lUpperArm.position.set(0, -0.04, -0.14);
  lUpperArm.rotation.x = Math.PI / 2;
  const lForearm = new THREE.Mesh(rForearmGeo, rangerLeatherMat);
  lForearm.position.set(0, -0.04, -0.40);
  lForearm.rotation.x = Math.PI / 2;
  const lHand = new THREE.Mesh(rHandGeo, rangerSkinMat);
  lHand.position.set(0, -0.04, -0.56);
  rangerLeftArmGroup.add(lUpperArm, lForearm, lHand);

  // Upgraded Skyrim-Style Curved Composite Recurve Limb Geometries
  const upperLimbCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.0, 0.0),
    new THREE.Vector3(0, 0.14, -0.062),
    new THREE.Vector3(0, 0.30, -0.028),
    new THREE.Vector3(0, 0.43, 0.075),
  ]);
  const lowerLimbCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.0, 0.0),
    new THREE.Vector3(0, -0.14, -0.062),
    new THREE.Vector3(0, -0.30, -0.028),
    new THREE.Vector3(0, -0.43, 0.075),
  ]);
  const curvedUpperLimbGeo = new THREE.TubeGeometry(upperLimbCurve, 16, 0.016, 8, false);
  const curvedLowerLimbGeo = new THREE.TubeGeometry(lowerLimbCurve, 16, 0.016, 8, false);
  const bowCollarGeo = new THREE.CylinderGeometry(0.028, 0.024, 0.048, 8);
  const bowRiserFlareGeo = new THREE.BoxGeometry(0.032, 0.11, 0.052);

  // Sculpted Skyrim-Style Ornate Rune-Engraved Greatsword Geometries & Materials
  const swordSteelMat = new THREE.MeshStandardMaterial({
    color: 0xdbe4ee,
    roughness: 0.18,
    metalness: 0.92,
  });
  const swordFullerMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.32,
    metalness: 0.85,
  });
  const swordGoldFiligreeMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    roughness: 0.24,
    metalness: 0.88,
  });
  const swordRuneMat = new THREE.MeshBasicMaterial({
    color: 0xc084fc,
  });
  const swordElvenGreenMat = new THREE.MeshStandardMaterial({
    color: 0x2f5e41,
    roughness: 0.36,
    metalness: 0.35,
  });
  const swordBladeGeo = new THREE.BoxGeometry(0.014, 0.72, 0.048);
  swordBladeGeo.translate(0, 0.36, 0);
  const swordTipGeo = new THREE.ConeGeometry(0.028, 0.15, 4);
  swordTipGeo.rotateY(Math.PI / 4);
  swordTipGeo.scale(0.36, 1.0, 1.0);
  swordTipGeo.translate(0, 0.795, 0);
  const swordFullerGeo = new THREE.BoxGeometry(0.016, 0.54, 0.016);
  swordFullerGeo.translate(0, 0.28, 0);
  const swordRuneChannelGeo = new THREE.BoxGeometry(0.0175, 0.44, 0.0045);
  swordRuneChannelGeo.translate(0, 0.27, 0);
  const swordRuneGlyphGeo = new THREE.BoxGeometry(0.018, 0.012, 0.022);
  const swordGuardCenterGeo = new THREE.OctahedronGeometry(0.032, 1);
  swordGuardCenterGeo.scale(0.65, 0.85, 1.15);
  const swordQuillonGeo = new THREE.CylinderGeometry(0.007, 0.015, 0.125, 6);
  swordQuillonGeo.translate(0, 0.0625, 0);
  const swordGemGeo = new THREE.OctahedronGeometry(0.016, 0);
  const swordGripGeo = new THREE.CylinderGeometry(0.017, 0.015, 0.17, 8);
  swordGripGeo.translate(0, -0.085, 0);
  const swordGripRingGeo = new THREE.TorusGeometry(0.0175, 0.0035, 6, 12);
  swordGripRingGeo.rotateX(Math.PI / 2);
  const swordPommelGeo = new THREE.OctahedronGeometry(0.028, 1);
  swordPommelGeo.translate(0, -0.185, 0);

  disposableMaterials.push(
    swordSteelMat,
    swordFullerMat,
    swordGoldFiligreeMat,
    swordRuneMat,
    swordElvenGreenMat
  );
  disposableGeometries.push(
    curvedUpperLimbGeo,
    curvedLowerLimbGeo,
    bowCollarGeo,
    bowRiserFlareGeo,
    swordBladeGeo,
    swordTipGeo,
    swordFullerGeo,
    swordRuneChannelGeo,
    swordRuneGlyphGeo,
    swordGuardCenterGeo,
    swordQuillonGeo,
    swordGemGeo,
    swordGripGeo,
    swordGripRingGeo,
    swordPommelGeo
  );

  const createRangerSwordAssembly = () => {
    const sGroup = new THREE.Group();
    const blade = new THREE.Mesh(swordBladeGeo, swordSteelMat);
    const tip = new THREE.Mesh(swordTipGeo, swordSteelMat);
    const fuller = new THREE.Mesh(swordFullerGeo, swordFullerMat);
    const runeLine = new THREE.Mesh(swordRuneChannelGeo, swordRuneMat);
    sGroup.add(blade, tip, fuller, runeLine);

    for (let r = 0; r < 4; r++) {
      const glyph = new THREE.Mesh(swordRuneGlyphGeo, swordRuneMat);
      glyph.position.set(0, 0.11 + r * 0.105, 0);
      glyph.rotation.x = r % 2 === 0 ? 0.42 : -0.42;
      sGroup.add(glyph);
    }

    const guardBoss = new THREE.Mesh(swordGuardCenterGeo, swordGoldFiligreeMat);
    const guardGem = new THREE.Mesh(swordGemGeo, swordRuneMat);
    guardGem.scale.set(1.25, 1.0, 0.8);

    const leftQuillon = new THREE.Mesh(swordQuillonGeo, swordGoldFiligreeMat);
    leftQuillon.rotation.x = Math.PI * 0.42;
    const rightQuillon = new THREE.Mesh(swordQuillonGeo, swordGoldFiligreeMat);
    rightQuillon.rotation.x = -Math.PI * 0.42;

    const leftSubWing = new THREE.Mesh(swordQuillonGeo, bowHornMat);
    leftSubWing.scale.set(0.72, 0.68, 0.72);
    leftSubWing.position.y = -0.008;
    leftSubWing.rotation.x = Math.PI * 0.48;
    const rightSubWing = new THREE.Mesh(swordQuillonGeo, bowHornMat);
    rightSubWing.scale.set(0.72, 0.68, 0.72);
    rightSubWing.position.y = -0.008;
    rightSubWing.rotation.x = -Math.PI * 0.48;

    const grip = new THREE.Mesh(swordGripGeo, rangerDarkLeatherMat);
    const gripRing1 = new THREE.Mesh(swordGripRingGeo, swordGoldFiligreeMat);
    gripRing1.position.y = -0.045;
    const gripRing2 = new THREE.Mesh(swordGripRingGeo, swordGoldFiligreeMat);
    gripRing2.position.y = -0.095;
    const gripRing3 = new THREE.Mesh(swordGripRingGeo, swordGoldFiligreeMat);
    gripRing3.position.y = -0.14;
    const pommel = new THREE.Mesh(swordPommelGeo, swordGoldFiligreeMat);

    sGroup.add(
      guardBoss,
      guardGem,
      leftQuillon,
      rightQuillon,
      leftSubWing,
      rightSubWing,
      grip,
      gripRing1,
      gripRing2,
      gripRing3,
      pommel
    );
    return sGroup;
  };

  const createRecurveBowRig = () => {
    const bGroup = new THREE.Group();
    const bRiser = new THREE.Mesh(bowRiserGeo, bowWoodMat);
    const bGripWrap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.025, 0.14, 10),
      rangerDarkLeatherMat
    );
    const uFlare = new THREE.Mesh(bowRiserFlareGeo, rangerDarkLeatherMat);
    uFlare.position.set(0, 0.11, -0.014);
    uFlare.rotation.x = -0.22;
    const lFlare = new THREE.Mesh(bowRiserFlareGeo, rangerDarkLeatherMat);
    lFlare.position.set(0, -0.11, -0.014);
    lFlare.rotation.x = 0.22;
    const uCollar = new THREE.Mesh(bowCollarGeo, bowHornMat);
    uCollar.position.set(0, 0.155, -0.008);
    const lCollar = new THREE.Mesh(bowCollarGeo, bowHornMat);
    lCollar.position.set(0, -0.155, -0.008);
    const bShelf = new THREE.Mesh(bowShelfGeo, bowHornMat);
    bShelf.position.set(0.024, 0.05, -0.012);
    bGroup.add(bRiser, bGripWrap, uFlare, lFlare, uCollar, lCollar, bShelf);

    const uLimbPivot = new THREE.Group();
    uLimbPivot.position.set(0, 0.16, 0);
    const uLimbMesh = new THREE.Mesh(curvedUpperLimbGeo, bowWoodMat);
    const uTipMesh = new THREE.Mesh(bowRecurveTipGeo, bowHornMat);
    uTipMesh.position.set(0, 0.45, 0.082);
    uTipMesh.rotation.x = 0.34;
    uLimbPivot.add(uLimbMesh, uTipMesh);

    const lLimbPivot = new THREE.Group();
    lLimbPivot.position.set(0, -0.16, 0);
    const lLimbMesh = new THREE.Mesh(curvedLowerLimbGeo, bowWoodMat);
    const lTipMesh = new THREE.Mesh(bowRecurveTipGeo, bowHornMat);
    lTipMesh.position.set(0, -0.45, 0.082);
    lTipMesh.rotation.x = -0.34;
    lLimbPivot.add(lLimbMesh, lTipMesh);
    bGroup.add(uLimbPivot, lLimbPivot);

    const strUpper = new THREE.Mesh(bowStringSegGeo, bowStringMat);
    const strLower = new THREE.Mesh(bowStringSegGeo, bowStringMat);
    bGroup.add(strUpper, strLower);

    return {
      bowGroup: bGroup,
      upperLimbPivot: uLimbPivot,
      lowerLimbPivot: lLimbPivot,
      bowStringUpper: strUpper,
      bowStringLower: strLower,
    };
  };

  const tpBowRig = createRecurveBowRig();
  const bowGroup = tpBowRig.bowGroup;
  bowGroup.position.set(0, -0.04, -0.58);
  bowGroup.rotation.z = -0.12;

  const nockedArrowGroup = createFeatheredArrowMesh();
  nockedArrowGroup.position.set(0.025, 0.055, 0.12);
  bowGroup.add(nockedArrowGroup);
  rangerLeftArmGroup.add(bowGroup);
  rangerUpperTorsoPivot.add(rangerLeftArmGroup);

  // Helper to construct a Flaming Explorer's Torch Mesh
  const torchHandleGeo = new THREE.CylinderGeometry(0.024, 0.018, 0.46, 8);
  const torchCageGeo = new THREE.CylinderGeometry(0.042, 0.026, 0.10, 8);
  const torchFlameOuterGeo = new THREE.ConeGeometry(0.055, 0.22, 7);
  torchFlameOuterGeo.translate(0, 0.11, 0);
  const torchFlameInnerGeo = new THREE.ConeGeometry(0.032, 0.14, 6);
  torchFlameInnerGeo.translate(0, 0.07, 0);
  const torchFlameOuterMat = new THREE.MeshBasicMaterial({
    color: 0xff6b00,
    transparent: true,
    opacity: 0.9,
  });
  const torchFlameInnerMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
  });
  disposableGeometries.push(
    torchHandleGeo,
    torchCageGeo,
    torchFlameOuterGeo,
    torchFlameInnerGeo
  );
  disposableMaterials.push(torchFlameOuterMat, torchFlameInnerMat);

  const createTorchAssembly = () => {
    const tGroup = new THREE.Group();
    const handle = new THREE.Mesh(torchHandleGeo, bowWoodMat);
    const cage = new THREE.Mesh(torchCageGeo, rangerDarkLeatherMat);
    cage.position.y = 0.22;
    const flameOuter = new THREE.Mesh(torchFlameOuterGeo, torchFlameOuterMat);
    flameOuter.position.y = 0.26;
    const flameInner = new THREE.Mesh(torchFlameInnerGeo, torchFlameInnerMat);
    flameInner.position.y = 0.27;
    tGroup.add(handle, cage, flameOuter, flameInner);
    return { tGroup, flameOuter, flameInner };
  };

  const tpTorch = createTorchAssembly();
  const thirdPersonTorchGroup = tpTorch.tGroup;
  thirdPersonTorchGroup.visible = false;

  const thirdPersonSwordGroup = createRangerSwordAssembly();
  thirdPersonSwordGroup.position.set(0, 0.06, -0.04);
  thirdPersonSwordGroup.rotation.x = -Math.PI * 0.42;
  thirdPersonSwordGroup.visible = false;

  const playerTorchLight = new THREE.PointLight(0xff8c24, 0, 28, 1.35);
  scene.add(playerTorchLight);

  // RIGHT ARM & STRING-DRAWING HAND
  const rangerRightArmGroup = new THREE.Group();
  const rUpperArmUnitGeo = new THREE.CylinderGeometry(0.052, 0.044, 1.0, 10);
  rUpperArmUnitGeo.translate(0, 0.5, 0);
  const rForearmUnitGeo = new THREE.CylinderGeometry(0.042, 0.036, 1.0, 10);
  rForearmUnitGeo.translate(0, 0.5, 0);
  disposableGeometries.push(rUpperArmUnitGeo, rForearmUnitGeo);

  const rUpperArmMesh = new THREE.Mesh(rUpperArmUnitGeo, rangerTunicMat);
  const rForearmMesh = new THREE.Mesh(rForearmUnitGeo, rangerLeatherMat);
  const rRightHandMesh = new THREE.Mesh(rHandGeo, rangerSkinMat);
  rRightHandMesh.add(thirdPersonTorchGroup, thirdPersonSwordGroup);
  thirdPersonTorchGroup.position.set(0, 0.12, -0.04);
  thirdPersonTorchGroup.rotation.x = -0.35;
  rangerRightArmGroup.add(rUpperArmMesh, rForearmMesh, rRightHandMesh);
  rangerUpperTorsoPivot.add(rangerRightArmGroup);

  const _rShoulderPos = new THREE.Vector3();
  const _rElbowPos = new THREE.Vector3();
  const _rHandPos = new THREE.Vector3();
  const _segVec = new THREE.Vector3();
  const _yAxis = new THREE.Vector3(0, 1, 0);

  function poseRightArmSegments(
    sx: number,
    sy: number,
    sz: number,
    ex: number,
    ey: number,
    ez: number,
    hx: number,
    hy: number,
    hz: number
  ) {
    _rShoulderPos.set(sx, sy, sz);
    _rElbowPos.set(ex, ey, ez);
    _rHandPos.set(hx, hy, hz);

    _segVec.subVectors(_rElbowPos, _rShoulderPos);
    const uLen = Math.max(0.05, _segVec.length());
    rUpperArmMesh.position.copy(_rShoulderPos);
    rUpperArmMesh.scale.set(1, uLen, 1);
    rUpperArmMesh.quaternion.setFromUnitVectors(_yAxis, _segVec.normalize());

    _segVec.subVectors(_rHandPos, _rElbowPos);
    const fLen = Math.max(0.05, _segVec.length());
    rForearmMesh.position.copy(_rElbowPos);
    rForearmMesh.scale.set(1, fLen, 1);
    rForearmMesh.quaternion.setFromUnitVectors(_yAxis, _segVec.normalize());

    rRightHandMesh.position.copy(_rHandPos);
  }

  // ARTICULATED LEFT & RIGHT LEGS
  const rangerLeftLeg = new THREE.Group();
  rangerLeftLeg.position.set(-0.10, 0.90, 0);
  rangerLeftLeg.add(
    new THREE.Mesh(rThighGeo, rangerPantsMat),
    new THREE.Mesh(rBootGeo, rangerDarkLeatherMat),
    new THREE.Mesh(rFootGeo, rangerDarkLeatherMat)
  );
  const rangerRightLeg = new THREE.Group();
  rangerRightLeg.position.set(0.10, 0.90, 0);
  rangerRightLeg.add(
    new THREE.Mesh(rThighGeo, rangerPantsMat),
    new THREE.Mesh(rBootGeo, rangerDarkLeatherMat),
    new THREE.Mesh(rFootGeo, rangerDarkLeatherMat)
  );

  // Animated Water Swim Ripple Ring around the character when swimming in water
  const swimRippleGeo = new THREE.RingGeometry(0.42, 0.78, 24);
  swimRippleGeo.rotateX(-Math.PI / 2);
  const swimRippleMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
  disposableGeometries.push(swimRippleGeo);
  disposableMaterials.push(swimRippleMat);
  const swimRippleMesh = new THREE.Mesh(swimRippleGeo, swimRippleMat);
  swimRippleMesh.visible = false;

  playerCharacterGroup.add(
    rangerUpperTorsoPivot,
    rangerLeftLeg,
    rangerRightLeg,
    swimRippleMesh
  );
  scene.add(playerCharacterGroup);

  // 10D) DEDICATED SKYRIM STYLE FIRST-PERSON HANDS & WEAPONS VIEWMODEL
  const fpViewModelGroup = new THREE.Group();
  fpViewModelGroup.visible = false;
  scene.add(fpViewModelGroup);

  const fpSleeveGeo = new THREE.CylinderGeometry(0.036, 0.048, 0.86, 10);
  fpSleeveGeo.translate(0, 0.03, 0);
  const fpBracerGeo = new THREE.CylinderGeometry(0.029, 0.037, 0.56, 10);
  fpBracerGeo.translate(0, 0.72, 0);
  const fpVambracePlateGeo = new THREE.BoxGeometry(0.048, 0.42, 0.018);
  fpVambracePlateGeo.translate(0, 0.73, 0.024);
  const fpVambraceTrimGeo = new THREE.BoxGeometry(0.014, 0.44, 0.022);
  fpVambraceTrimGeo.translate(0, 0.73, 0.025);
  const fpStrapGeo = new THREE.CylinderGeometry(0.033, 0.035, 0.034, 10);
  const fpWristCuffGeo = new THREE.CylinderGeometry(0.033, 0.031, 0.052, 10);
  fpWristCuffGeo.translate(0, 0.975, 0);
  const fpPalmGeo = new THREE.BoxGeometry(0.062, 0.022, 0.072);
  const fpGloveBackGeo = new THREE.BoxGeometry(0.065, 0.012, 0.060);
  const fpKnuckleGeo = new THREE.SphereGeometry(0.0072, 7, 7);
  const fpSignetRingGeo = new THREE.TorusGeometry(0.0082, 0.0022, 6, 12);
  fpSignetRingGeo.rotateY(Math.PI / 2);
  const fpWristGeo = new THREE.SphereGeometry(0.028, 10, 10);
  fpWristGeo.scale(1.12, 0.62, 1.05);
  const fpProxFingerGeo = new THREE.CylinderGeometry(0.0070, 0.0080, 0.032, 7);
  fpProxFingerGeo.rotateX(Math.PI / 2);
  fpProxFingerGeo.translate(0, 0, -0.016);
  const fpDistFingerGeo = new THREE.CylinderGeometry(0.0058, 0.0070, 0.026, 7);
  fpDistFingerGeo.rotateX(Math.PI / 2);
  fpDistFingerGeo.translate(0, 0, -0.013);
  const fpThumbGeo = new THREE.CylinderGeometry(0.0078, 0.0092, 0.034, 7);
  fpThumbGeo.rotateX(Math.PI / 2);
  fpThumbGeo.translate(0, 0, -0.017);

  disposableGeometries.push(
    fpSleeveGeo,
    fpBracerGeo,
    fpVambracePlateGeo,
    fpVambraceTrimGeo,
    fpStrapGeo,
    fpWristCuffGeo,
    fpPalmGeo,
    fpGloveBackGeo,
    fpKnuckleGeo,
    fpSignetRingGeo,
    fpWristGeo,
    fpProxFingerGeo,
    fpDistFingerGeo,
    fpThumbGeo
  );

  const createFirstPersonArmRig = (side: -1 | 1) => {
    const root = new THREE.Group();

    const forearmUnit = new THREE.Group();
    const sleeveMesh = new THREE.Mesh(fpSleeveGeo, rangerTunicMat);
    const bracerMesh = new THREE.Mesh(fpBracerGeo, rangerLeatherMat);
    const vambracePlate = new THREE.Mesh(fpVambracePlateGeo, swordElvenGreenMat);
    const vambraceGoldTrim = new THREE.Mesh(fpVambraceTrimGeo, swordGoldFiligreeMat);
    const wristCuff = new THREE.Mesh(fpWristCuffGeo, swordGoldFiligreeMat);
    const strap1 = new THREE.Mesh(fpStrapGeo, swordGoldFiligreeMat);
    strap1.position.y = 0.52;
    const strap2 = new THREE.Mesh(fpStrapGeo, swordGoldFiligreeMat);
    strap2.position.y = 0.74;
    const strap3 = new THREE.Mesh(fpStrapGeo, swordGoldFiligreeMat);
    strap3.position.y = 0.92;
    forearmUnit.add(
      sleeveMesh,
      bracerMesh,
      vambracePlate,
      vambraceGoldTrim,
      wristCuff,
      strap1,
      strap2,
      strap3
    );

    const handGroup = new THREE.Group();
    const wristMesh = new THREE.Mesh(fpWristGeo, rangerSkinMat);
    const palmMesh = new THREE.Mesh(fpPalmGeo, rangerSkinMat);
    palmMesh.position.set(0, -0.002, -0.034);
    const gloveBack = new THREE.Mesh(fpGloveBackGeo, rangerDarkLeatherMat);
    gloveBack.position.set(0, 0.007, -0.030);
    const gloveGoldTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.058, 0.006, 0.012),
      swordGoldFiligreeMat
    );
    gloveGoldTrim.position.set(0, 0.012, -0.052);
    handGroup.add(wristMesh, palmMesh, gloveBack, gloveGoldTrim);

    const fingerPivots: Array<{ prox: THREE.Group; dist: THREE.Group }> = [];
    const fingerXOffsets = [-0.022, -0.0075, 0.0075, 0.022];
    const fingerLengths = [0.96, 1.05, 1.0, 0.84];
    for (let f = 0; f < 4; f++) {
      const knuckle = new THREE.Mesh(fpKnuckleGeo, rangerSkinMat);
      knuckle.position.set(side * fingerXOffsets[f], 0.005, -0.064);
      handGroup.add(knuckle);

      const proxPivot = new THREE.Group();
      proxPivot.position.set(side * fingerXOffsets[f], 0.001, -0.066);
      proxPivot.scale.setScalar(fingerLengths[f]);
      const proxMesh = new THREE.Mesh(fpProxFingerGeo, rangerSkinMat);

      if (side === 1 && f === 0) {
        const ringMesh = new THREE.Mesh(fpSignetRingGeo, swordGoldFiligreeMat);
        ringMesh.position.set(0, 0, -0.014);
        proxPivot.add(ringMesh);
      }

      const distPivot = new THREE.Group();
      distPivot.position.set(0, 0, -0.030);
      const distMesh = new THREE.Mesh(fpDistFingerGeo, rangerSkinMat);
      distPivot.add(distMesh);
      proxPivot.add(proxMesh, distPivot);
      handGroup.add(proxPivot);
      fingerPivots.push({ prox: proxPivot, dist: distPivot });
    }

    const thumbPivot = new THREE.Group();
    thumbPivot.position.set(-side * 0.031, -0.003, -0.028);
    thumbPivot.rotation.set(0.18, side * 0.58, 0);
    const thumbProx = new THREE.Mesh(fpThumbGeo, rangerSkinMat);
    const thumbDist = new THREE.Mesh(fpDistFingerGeo, rangerSkinMat);
    thumbDist.position.set(0, 0, -0.030);
    thumbDist.rotation.y = side * 0.35;
    thumbPivot.add(thumbProx, thumbDist);
    handGroup.add(thumbPivot);

    root.add(forearmUnit, handGroup);
    return {
      root,
      forearmUnit,
      handGroup,
      fingerPivots,
      thumbPivot,
      side,
    };
  };

  const _fpArmVec = new THREE.Vector3();
  const _fpArmX = new THREE.Vector3();
  const _fpArmZ = new THREE.Vector3();
  const _fpHandDorsal = new THREE.Vector3();
  const _fpForearmBasis = new THREE.Matrix4();
  const _qBowGripLocal = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0.06, -0.16, Math.PI / 2, 'YXZ')
  );
  const _localBowFistCenter = new THREE.Vector3(0.004, -0.018, -0.048);
  const _bowFistWorldOffset = new THREE.Vector3();

  const applyFingerCurl = (
    arm: ReturnType<typeof createFirstPersonArmRig>,
    fingerCurl: number
  ) => {
    for (let f = 0; f < 4; f++) {
      const fp = arm.fingerPivots[f];
      fp.prox.rotation.x = -fingerCurl * (0.95 + f * 0.05);
      fp.dist.rotation.x = -fingerCurl * 1.15;
    }
    arm.thumbPivot.rotation.x = 0.18 - fingerCurl * 0.55;
    arm.thumbPivot.rotation.z = -arm.side * fingerCurl * 0.45;
  };

  const alignForearmToWrist = (
    arm: ReturnType<typeof createFirstPersonArmRig>,
    elbowX: number,
    elbowY: number,
    elbowZ: number,
    wristX: number,
    wristY: number,
    wristZ: number
  ) => {
    arm.forearmUnit.position.set(elbowX, elbowY, elbowZ);
    _fpArmVec.set(wristX - elbowX, wristY - elbowY, wristZ - elbowZ);
    const len = Math.max(0.05, _fpArmVec.length());
    _fpArmVec.divideScalar(len);
    _fpHandDorsal.set(0, 1, 0).applyQuaternion(arm.handGroup.quaternion);
    _fpArmX.crossVectors(_fpArmVec, _fpHandDorsal);
    if (_fpArmX.lengthSq() < 1e-4) {
      _fpArmX.set(1, 0, 0);
    } else {
      _fpArmX.normalize();
    }
    _fpArmZ.crossVectors(_fpArmX, _fpArmVec).normalize();
    _fpForearmBasis.makeBasis(_fpArmX, _fpArmVec, _fpArmZ);
    arm.forearmUnit.scale.set(1, len, 1);
    arm.forearmUnit.quaternion.setFromRotationMatrix(_fpForearmBasis);
  };

  const poseFpArm = (
    arm: ReturnType<typeof createFirstPersonArmRig>,
    elbowX: number,
    elbowY: number,
    elbowZ: number,
    wristX: number,
    wristY: number,
    wristZ: number,
    handRx: number,
    handRy: number,
    handRz: number,
    fingerCurl: number
  ) => {
    arm.handGroup.position.set(wristX, wristY, wristZ);
    arm.handGroup.rotation.order = 'YXZ';
    arm.handGroup.rotation.set(handRx, handRy, handRz);
    alignForearmToWrist(arm, elbowX, elbowY, elbowZ, wristX, wristY, wristZ);
    applyFingerCurl(arm, fingerCurl);
  };

  const fpLeftArm = createFirstPersonArmRig(-1);
  const fpRightArm = createFirstPersonArmRig(1);
  fpViewModelGroup.add(fpLeftArm.root, fpRightArm.root);

  const fpBowRig = createRecurveBowRig();
  fpBowRig.bowGroup.scale.setScalar(0.56);
  fpViewModelGroup.add(fpBowRig.bowGroup);

  const fpNockedArrowGroup = createFeatheredArrowMesh();
  fpNockedArrowGroup.scale.set(0.76, 0.76, 0.56);
  fpNockedArrowGroup.visible = false;
  fpViewModelGroup.add(fpNockedArrowGroup);

  const fpTorch = createTorchAssembly();
  fpTorch.tGroup.position.set(-0.025, -0.018, -0.048);
  fpTorch.tGroup.rotation.set(0, 0, Math.PI / 2);
  fpTorch.tGroup.visible = false;
  fpRightArm.handGroup.add(fpTorch.tGroup);

  const fpSwordGroup = createRangerSwordAssembly();
  fpSwordGroup.position.set(
    LOCKED_SWORD_GRIP_TRANSFORM.posX,
    LOCKED_SWORD_GRIP_TRANSFORM.posY,
    LOCKED_SWORD_GRIP_TRANSFORM.posZ
  );
  fpSwordGroup.rotation.order = 'YXZ';
  fpSwordGroup.rotation.set(
    LOCKED_SWORD_GRIP_TRANSFORM.rotX,
    LOCKED_SWORD_GRIP_TRANSFORM.rotY,
    LOCKED_SWORD_GRIP_TRANSFORM.rotZ
  );
  fpSwordGroup.visible = false;
  fpRightArm.handGroup.add(fpSwordGroup);

  const fpSlashArcGeo = new THREE.RingGeometry(0.32, 0.56, 24, 1, -Math.PI * 0.42, Math.PI * 0.84);
  const fpSlashArcMat = new THREE.MeshBasicMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const fpSlashArcMesh = new THREE.Mesh(fpSlashArcGeo, fpSlashArcMat);
  fpSlashArcMesh.position.set(0, -0.04, -0.68);
  fpSlashArcMesh.visible = false;
  fpViewModelGroup.add(fpSlashArcMesh);

  const swordAirWaveGeo = new THREE.RingGeometry(0.42, 0.78, 24, 1, -Math.PI * 0.40, Math.PI * 0.80);
  const swordAirWaveMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const swordAirWaveMesh = new THREE.Mesh(swordAirWaveGeo, swordAirWaveMat);
  swordAirWaveMesh.visible = false;
  swordAirWaveMesh.frustumCulled = false;
  scene.add(swordAirWaveMesh);
  disposableGeometries.push(swordAirWaveGeo);
  disposableMaterials.push(swordAirWaveMat);

  const SWORD_SPARK_COUNT = 18;
  const swordSparkGeo = new THREE.OctahedronGeometry(0.032, 0);
  swordSparkGeo.scale(0.45, 2.4, 0.45);
  const swordSparkMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.95,
  });
  const swordClashSparkMesh = new THREE.InstancedMesh(
    swordSparkGeo,
    swordSparkMat,
    SWORD_SPARK_COUNT
  );
  swordClashSparkMesh.count = 0;
  swordClashSparkMesh.frustumCulled = false;
  scene.add(swordClashSparkMesh);
  const _sparkDummy = new THREE.Object3D();

  disposableGeometries.push(fpSlashArcGeo, swordSparkGeo);
  disposableMaterials.push(fpSlashArcMat, swordSparkMat);

  // 10E) FADING GRAY SMOKE / AIR WAKE TRAIL BEHIND FLYING ARROWS
  const MAX_TRAIL_VERTS = 28;
  const arrowTrailLinesPool: Array<{
    line: THREE.Line;
    posAttr: THREE.BufferAttribute;
    mat: THREE.LineBasicMaterial;
  }> = [];
  for (let i = 0; i < MAX_RENDERED_ARROWS; i++) {
    const positions = new Float32Array(MAX_TRAIL_VERTS * 3);
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    geo.setAttribute('position', posAttr);
    geo.setDrawRange(0, 0);
    const mat = new THREE.LineBasicMaterial({
      color: 0xd1d5db,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
    });
    disposableGeometries.push(geo);
    disposableMaterials.push(mat);
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    line.visible = false;
    scene.add(line);
    arrowTrailLinesPool.push({ line, posAttr, mat });
  }

  const MAX_SMOKE_PUFFS = MAX_RENDERED_ARROWS * 16;
  const smokePuffGeo = new THREE.IcosahedronGeometry(0.042, 1);
  const smokePuffMat = new THREE.MeshBasicMaterial({
    color: 0xcbd5e1,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  disposableGeometries.push(smokePuffGeo);
  disposableMaterials.push(smokePuffMat);
  const arrowSmokePuffMesh = new THREE.InstancedMesh(smokePuffGeo, smokePuffMat, MAX_SMOKE_PUFFS);
  arrowSmokePuffMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  arrowSmokePuffMesh.frustumCulled = false;
  arrowSmokePuffMesh.count = 0;
  scene.add(arrowSmokePuffMesh);
  const _puffDummy = new THREE.Object3D();

  const _strTop = new THREE.Vector3();
  const _strBot = new THREE.Vector3();
  const _strNock = new THREE.Vector3();
  const _strDir = new THREE.Vector3();
  const _upVec = new THREE.Vector3(0, 1, 0);
  const _fpTargetPos = new THREE.Vector3();
  const _fpArrowDir = new THREE.Vector3();
  const _fpNockPos = new THREE.Vector3();
  const _fpLocalNock = new THREE.Vector3();
  const _invBowQuat = new THREE.Quaternion();
  const _arrowLookMat = new THREE.Matrix4();
  const _arrowUp = new THREE.Vector3(0, 1, 0);

  const updateBowRigString = (
    rig: ReturnType<typeof createRecurveBowRig>,
    drawAmount: number,
    isFirstPersonRig = false,
    customLocalNock?: THREE.Vector3
  ) => {
    const limbFlex = drawAmount * 0.26;
    rig.upperLimbPivot.rotation.x = limbFlex;
    rig.lowerLimbPivot.rotation.x = -limbFlex;

    const tipZ = 0.095 + drawAmount * 0.12;
    const tipY = 0.59 - drawAmount * 0.04;
    _strTop.set(0, tipY, tipZ);
    _strBot.set(0, -tipY, tipZ);

    if (customLocalNock) {
      _strNock.copy(customLocalNock);
    } else {
      const nockZ = 0.095 + drawAmount * (isFirstPersonRig ? 0.34 : 0.45);
      const nockX = isFirstPersonRig ? 0.015 : 0.02 + drawAmount * 0.06;
      _strNock.set(nockX, 0.055, nockZ);
    }

    _strDir.subVectors(_strTop, _strNock);
    const len1 = _strDir.length();
    rig.bowStringUpper.position.copy(_strNock);
    rig.bowStringUpper.scale.set(1, len1, 1);
    rig.bowStringUpper.quaternion.setFromUnitVectors(_upVec, _strDir.normalize());

    _strDir.subVectors(_strBot, _strNock);
    const len2 = _strDir.length();
    rig.bowStringLower.position.copy(_strNock);
    rig.bowStringLower.scale.set(1, len2, 1);
    rig.bowStringLower.quaternion.setFromUnitVectors(_upVec, _strDir.normalize());

    if (!isFirstPersonRig) {
      const nockX = _strNock.x;
      const nockZ = _strNock.z;
      nockedArrowGroup.position.set(nockX * 0.5 + 0.015, 0.055, nockZ - 0.36);
      nockedArrowGroup.rotation.y = -Math.atan2(nockX - 0.02, 0.45);
    }
  };
  updateBowRigString(tpBowRig, 0, false);
  updateBowRigString(fpBowRig, 0, true);

  const updatePlayerAndCombat = (
    elapsedTime: number,
    playerState?: PlayerState,
    activeArrows?: readonly ArrowProjectile[]
  ) => {
    // 15. Update Active 3D Feathered Arrow Projectiles + Fading Gray Smoke/Air Wake Trails!
    let puffIdx = 0;
    if (activeArrows) {
      for (let i = 0; i < MAX_RENDERED_ARROWS; i++) {
        const arrowMesh = arrowMeshPool[i];
        const trailEntry = arrowTrailLinesPool[i];
        const arrowData = activeArrows[i];
        if (!arrowData) {
          arrowMesh.visible = false;
          trailEntry.line.visible = false;
          continue;
        }
        arrowMesh.visible = true;
        applyArrowElementStyle(arrowMesh, arrowData.arrowKind ?? 'normal');
        arrowMesh.position.set(arrowData.x, arrowData.y, arrowData.z);
        arrowMesh.rotation.order = 'YXZ';
        arrowMesh.rotation.y = arrowData.yaw;
        arrowMesh.rotation.x = arrowData.pitch;
        arrowMesh.rotation.z = 0;

        const trailPts = arrowData.trail;
        if (trailPts && trailPts.length >= 2) {
          const count = Math.min(MAX_TRAIL_VERTS, trailPts.length);
          const startIdx = trailPts.length - count;
          let youngestAge = 1.0;
          for (let t = 0; t < count; t++) {
            const tp = trailPts[startIdx + t];
            if (tp.age < youngestAge) youngestAge = tp.age;
            const driftY = tp.age * 0.12;
            trailEntry.posAttr.setXYZ(t, tp.x, tp.y + driftY, tp.z);

            if (puffIdx < MAX_SMOKE_PUFFS && t % 2 === 0) {
              const lifeFrac = Math.max(0, 1 - tp.age / ARROW_TRAIL_MAX_AGE);
              if (lifeFrac > 0.05) {
                _puffDummy.position.set(tp.x, tp.y + driftY, tp.z);
                const puffScale = (0.55 + (1 - lifeFrac) * 1.45) * lifeFrac;
                _puffDummy.scale.setScalar(puffScale);
                _puffDummy.updateMatrix();
                arrowSmokePuffMesh.setMatrixAt(puffIdx++, _puffDummy.matrix);
              }
            }
          }
          trailEntry.posAttr.needsUpdate = true;
          trailEntry.line.geometry.setDrawRange(0, count);
          const fadeOpacity = Math.max(0, 1 - youngestAge / ARROW_TRAIL_MAX_AGE);
          trailEntry.mat.opacity = 0.68 * fadeOpacity;
          trailEntry.mat.color.setHex(
            arrowData.arrowKind === 'fire'
              ? 0x9ca3af
              : arrowData.arrowKind === 'wind'
                ? 0xe2e8f0
                : 0xcbd5e1
          );
          trailEntry.line.visible = fadeOpacity > 0.02;
        } else {
          trailEntry.line.visible = false;
        }
      }
    }
    arrowSmokePuffMesh.count = puffIdx;
    if (puffIdx > 0) {
      arrowSmokePuffMesh.instanceMatrix.needsUpdate = true;
    }

    // 16. Update Articulated 3D Ranger Character, Skyrim-Style First-Person Hands & Weapons, Swimming Pose & Abilities
    if (!playerState) return;

    const isFirstPerson = playerState.cameraPerspective === 'first_person';
    const isMounted = Boolean(playerState.mountedHorseId);
    const isSwim = Boolean(playerState.isSwimming);
    const equippedTool = playerState.equippedTool ?? 'bow';
    const arrowKind = playerState.arrowKind ?? 'normal';
    const swordSwing = playerState.swordSwingProgress ?? 0;
    const swordComboIdx = playerState.swordComboIndex ?? 0;
    const blockProg = playerState.swordBlockProgress ?? (playerState.swordBlocking ? 1 : 0);
    const releaseKick = playerState.bowReleaseKick ?? 0;
    const lookSwayX = playerState.weaponSwayX ?? 0;
    const lookSwayY = playerState.weaponSwayY ?? 0;
    const horizSpd = Math.hypot(playerState.vx, playerState.vz);
    const isSprinting = horizSpd > 6.5 && !isSwim && !isMounted;
    const drawProg =
      !isSwim && playerState.bowDrawn
        ? Math.max(0.08, playerState.bowDrawProgress ?? 0)
        : !isSwim
          ? (playerState.bowDrawProgress ?? 0)
          : 0;
    const isAimingBow = !isSwim && (Boolean(playerState.bowDrawn) || drawProg > 0.02);

    applyArrowElementStyle(nockedArrowGroup, arrowKind);
    applyArrowElementStyle(fpNockedArrowGroup, arrowKind);
    swordRuneMat.color.setHex(
      arrowKind === 'fire'
        ? 0xfb923c
        : arrowKind === 'wind'
          ? 0x38bdf8
          : 0xc084fc
    );

    const hitPt = playerState.lastSwordHitPoint;
    if (hitPt) {
      const sparkAge = hitPt.age ?? 0;
      if (sparkAge >= 0 && sparkAge < 0.42) {
        const life = 1 - sparkAge / 0.42;
        swordSparkMat.opacity = life;
        swordClashSparkMesh.count = SWORD_SPARK_COUNT;
        for (let s = 0; s < SWORD_SPARK_COUNT; s++) {
          const angle = (s / SWORD_SPARK_COUNT) * Math.PI * 2 + s * 0.618;
          const elev = ((s % 5) - 1.5) * 0.45;
          const spd = 2.2 + (s % 4) * 0.95;
          const sx = hitPt.x + Math.cos(angle) * spd * sparkAge;
          const sy = hitPt.y + elev * spd * sparkAge - 4.8 * sparkAge * sparkAge;
          const sz = hitPt.z + Math.sin(angle) * spd * sparkAge;
          _sparkDummy.position.set(sx, sy, sz);
          _sparkDummy.rotation.set(angle, sparkAge * 12, s);
          _sparkDummy.scale.setScalar(Math.max(0.15, life * 1.15));
          _sparkDummy.updateMatrix();
          swordClashSparkMesh.setMatrixAt(s, _sparkDummy.matrix);
        }
        swordClashSparkMesh.instanceMatrix.needsUpdate = true;
      } else {
        swordClashSparkMesh.count = 0;
      }
    } else {
      swordClashSparkMesh.count = 0;
    }

    const airWave = playerState.lastSwordAirWave;
    if (airWave && airWave.age >= 0 && airWave.age < 0.46) {
      const waveLife = 1 - airWave.age / 0.46;
      const dist = airWave.age * 21.0;
      swordAirWaveMesh.visible = true;
      swordAirWaveMesh.position.set(
        airWave.startX + airWave.dirX * dist,
        airWave.startY + airWave.dirY * dist,
        airWave.startZ + airWave.dirZ * dist
      );
      swordAirWaveMesh.rotation.order = 'YXZ';
      swordAirWaveMesh.rotation.set(airWave.pitch, airWave.yaw, -0.35);
      swordAirWaveMesh.scale.setScalar(0.85 + airWave.age * 2.4);
      swordAirWaveMat.opacity = waveLife * 0.78;
      swordAirWaveMat.color.setHex(
        arrowKind === 'fire'
          ? 0xfb923c
          : arrowKind === 'wind'
            ? 0x38bdf8
            : 0xc084fc
      );
    } else {
      swordAirWaveMesh.visible = false;
    }

    const flameFlicker =
      1.0 + Math.sin(elapsedTime * 19.0) * 0.14 + Math.cos(elapsedTime * 27.0) * 0.08;
    tpTorch.flameOuter.scale.set(1.0, flameFlicker, 1.0);
    tpTorch.flameInner.scale.set(1.0, 2.0 - flameFlicker, 1.0);
    fpTorch.flameOuter.scale.set(1.0, flameFlicker, 1.0);
    fpTorch.flameInner.scale.set(1.0, 2.0 - flameFlicker, 1.0);

    const torchActive = !isSwim && equippedTool === 'torch' && !isAimingBow;
    const swordActive = !isSwim && equippedTool === 'sword' && !isAimingBow;
    const fireArrowActive = !isSwim && arrowKind === 'fire' && isAimingBow;
    if (torchActive || fireArrowActive) {
      playerTorchLight.intensity = (torchActive ? 3.8 : 2.6) * flameFlicker;
      playerTorchLight.color.setHex(torchActive ? 0xff8c24 : 0xff6b00);
      const fwdX = -Math.sin(playerState.yaw);
      const fwdZ = -Math.cos(playerState.yaw);
      playerTorchLight.position.set(
        playerState.x + fwdX * 0.65,
        playerState.y + (isMounted ? 2.3 : 1.65),
        playerState.z + fwdZ * 0.65
      );
    } else {
      playerTorchLight.intensity = 0;
    }

    const mountLift = isMounted ? 0.72 : 0.0;
    const horseBaseYaw = isMounted
      ? (playerState.mountedHorseYaw ?? playerState.yaw)
      : playerState.yaw;
    const mountedRelLookYaw = isMounted
      ? Math.atan2(
          Math.sin(playerState.yaw - horseBaseYaw),
          Math.cos(playerState.yaw - horseBaseYaw)
        )
      : 0;

    playerCharacterGroup.position.set(playerState.x, playerState.y + mountLift, playerState.z);
    playerCharacterGroup.rotation.y = horseBaseYaw;

    swimRippleMesh.visible = isSwim;
    if (isSwim) {
      swimRippleMesh.position.set(0, 1.05, 0);
      const rPulse = 1.0 + Math.sin(elapsedTime * 4.2) * 0.16;
      swimRippleMesh.scale.setScalar(rPulse);
    }

    if (isFirstPerson) {
      rangerUpperTorsoPivot.visible = false;
      rangerLeftLeg.visible = false;
      rangerRightLeg.visible = false;
      fpViewModelGroup.visible = true;

      const saddleHeightBonus = isMounted ? 0.68 : 0;
      const bobScale = isMounted ? 0.014 : isSwim ? 0.042 : 0.048;
      const bobY = isMounted
        ? Math.sin(playerState.bobPhase) * bobScale * playerState.bobAmount
        : Math.sin(playerState.bobPhase * 2) * bobScale * playerState.bobAmount;
      const bobRoll =
        Math.cos(playerState.bobPhase) * (isMounted ? 0.0025 : 0.006) * playerState.bobAmount;

      fpViewModelGroup.position.set(
        playerState.x,
        playerState.y + PLAYER_EYE_HEIGHT + saddleHeightBonus + bobY,
        playerState.z
      );
      fpViewModelGroup.rotation.order = 'YXZ';
      fpViewModelGroup.rotation.set(playerState.pitch, playerState.yaw, bobRoll);

      // When mounted on a horse, do NOT swing arms left/right with walking bobPhase!
      const swayX =
        (isMounted ? 0 : Math.cos(playerState.bobPhase) * 0.012 * playerState.bobAmount) +
        lookSwayX;
      const swayY =
        (isMounted
          ? Math.sin(playerState.bobPhase) * 0.003 * playerState.bobAmount
          : Math.abs(Math.sin(playerState.bobPhase * 2)) * 0.014 * playerState.bobAmount) +
        lookSwayY;
      const breathY = Math.sin(elapsedTime * 2.1) * 0.005;

      fpNockedArrowGroup.visible = false;
      fpSlashArcMesh.visible = false;

      if (isSwim) {
        fpBowRig.bowGroup.visible = false;
        fpTorch.tGroup.visible = false;
        fpSwordGroup.visible = false;
        fpLeftArm.root.visible = true;
        fpRightArm.root.visible = true;

        const swimPhase = elapsedTime * (horizSpd > 0.18 ? 4.4 : 2.0);
        const reachZ = -0.46 - Math.sin(swimPhase) * (horizSpd > 0.18 ? 0.16 : 0.05);
        const sweepX = 0.20 + Math.max(0, Math.cos(swimPhase)) * (horizSpd > 0.18 ? 0.18 : 0.05);
        const dipY = -0.26 + Math.sin(swimPhase) * 0.04;

        poseFpArm(
          fpLeftArm,
          -0.46, -0.44, -0.14,
          -sweepX, dipY, reachZ,
          0.12, -Math.cos(swimPhase) * 0.35, -0.22,
          0.15
        );
        poseFpArm(
          fpRightArm,
          0.46, -0.44, -0.14,
          sweepX, dipY, reachZ,
          0.12, Math.cos(swimPhase) * 0.35, 0.22,
          0.15
        );
      } else if (isAimingBow || equippedTool === 'bow') {
        fpBowRig.bowGroup.visible = true;
        fpTorch.tGroup.visible = false;
        fpSwordGroup.visible = false;
        fpLeftArm.root.visible = true;

        const tAim = isAimingBow ? Math.min(1, 0.55 + drawProg * 0.45) : 0;

        const bowX =
          -0.24 * (1 - tAim) +
          -0.03 * tAim +
          swayX * (1 - tAim * 0.65) -
          releaseKick * 0.018;
        const bowY =
          -0.22 * (1 - tAim) +
          -0.20 * tAim -
          swayY * (1 - tAim * 0.75) +
          breathY +
          releaseKick * 0.036;
        const bowZ = -0.56 * (1 - tAim) + -0.50 * tAim - releaseKick * 0.042;
        fpBowRig.bowGroup.position.set(bowX, bowY, bowZ);
        fpBowRig.bowGroup.rotation.set(
          0.06 * (1 - tAim) + 0.22 * tAim + releaseKick * 0.16,
          0.58 * (1 - tAim) + 0.26 * tAim,
          -0.20 * (1 - tAim) + -1.28 * tAim + releaseKick * 0.22
        );

        fpLeftArm.handGroup.quaternion
          .copy(fpBowRig.bowGroup.quaternion)
          .multiply(_qBowGripLocal);
        _bowFistWorldOffset
          .copy(_localBowFistCenter)
          .applyQuaternion(fpLeftArm.handGroup.quaternion);
        const lwX = bowX - _bowFistWorldOffset.x;
        const lwY = bowY - _bowFistWorldOffset.y;
        const lwZ = bowZ - _bowFistWorldOffset.z;
        fpLeftArm.handGroup.position.set(lwX, lwY, lwZ);
        alignForearmToWrist(
          fpLeftArm,
          -0.38 * (1 - tAim) + -0.50 * tAim,
          -0.66 * (1 - tAim) + -0.36 * tAim,
          -0.34 * (1 - tAim) + -0.30 * tAim,
          lwX,
          lwY,
          lwZ
        );
        applyFingerCurl(fpLeftArm, 0.92);

        if (isAimingBow) {
          fpNockedArrowGroup.visible = true;
          const nockX = (bowX + 0.010) * (1 - drawProg) + 0.016 * drawProg;
          const nockY = (bowY + 0.032) * (1 - drawProg) + -0.165 * drawProg;
          const nockZ = (bowZ + 0.04) * (1 - drawProg) + -0.28 * drawProg;
          _fpNockPos.set(nockX, nockY, nockZ);
          _fpTargetPos.set(0.0, -0.004, -1.35);
          _fpArrowDir.subVectors(_fpTargetPos, _fpNockPos).normalize();

          fpNockedArrowGroup.position.copy(_fpNockPos).addScaledVector(_fpArrowDir, 0.2128);
          _arrowLookMat.lookAt(_fpNockPos, _fpTargetPos, _arrowUp);
          fpNockedArrowGroup.quaternion.setFromRotationMatrix(_arrowLookMat);

          _invBowQuat.copy(fpBowRig.bowGroup.quaternion).invert();
          _fpLocalNock
            .copy(_fpNockPos)
            .sub(fpBowRig.bowGroup.position)
            .applyQuaternion(_invBowQuat)
            .divideScalar(0.56);
          updateBowRigString(fpBowRig, drawProg, true, _fpLocalNock);

          fpRightArm.root.visible = true;
          poseFpArm(
            fpRightArm,
            0.44, -0.58, -0.14,
            _fpNockPos.x + 0.028, _fpNockPos.y - 0.018, _fpNockPos.z + 0.024,
            0.18, 0.45, -0.88,
            0.88
          );
        } else {
          updateBowRigString(fpBowRig, 0, true);
          fpNockedArrowGroup.visible = false;
          fpRightArm.root.visible = false;
        }
      } else if (swordActive) {
        fpNockedArrowGroup.visible = false;
        fpBowRig.bowGroup.visible = false;
        fpTorch.tGroup.visible = false;
        fpSwordGroup.visible = true;
        fpLeftArm.root.visible = true;
        fpRightArm.root.visible = true;

        const isHeavySwing = Boolean(playerState.swordHeavyAttack);
        const chargeProg = playerState.swordChargeTime ?? 0;
        const sprintCarry =
          !isMounted && isSprinting && swordSwing <= 0.01 && blockProg < 0.1 && chargeProg < 0.05
            ? 1.0
            : 0.0;

        const poseResult = computeFirstPersonSwordAttackPose({
          swingProgress: swordSwing,
          comboIndex: swordComboIdx,
          isHeavy: isHeavySwing,
          chargeProgress: chargeProg,
          blockProgress: blockProg,
          swayX,
          swayY,
          breathY,
          sprintCarry,
          impactKind: playerState.lastSwordHitPoint?.kind ?? 'none',
          impactAge: playerState.lastSwordHitPoint?.age ?? 99,
        });

        fpSlashArcMesh.visible = poseResult.slashRibbon.visible;
        fpSlashArcMat.opacity = poseResult.slashRibbon.opacity;
        fpSlashArcMat.color.setHex(
          arrowKind === 'fire'
            ? 0xfb923c
            : arrowKind === 'wind'
              ? 0x38bdf8
              : isHeavySwing
                ? 0xc084fc
                : 0xe2e8f0
        );
        if (poseResult.slashRibbon.visible) {
          fpSlashArcMesh.position.set(
            poseResult.slashRibbon.posX,
            poseResult.slashRibbon.posY,
            poseResult.slashRibbon.posZ
          );
          fpSlashArcMesh.scale.setScalar(poseResult.slashRibbon.scale);
          fpSlashArcMesh.rotation.set(
            poseResult.slashRibbon.rotX,
            poseResult.slashRibbon.rotY,
            poseResult.slashRibbon.rotZ
          );
        }

        poseFpArm(
          fpRightArm,
          poseResult.rightArm.elbowX,
          poseResult.rightArm.elbowY,
          poseResult.rightArm.elbowZ,
          poseResult.rightArm.wristX,
          poseResult.rightArm.wristY,
          poseResult.rightArm.wristZ,
          poseResult.rightArm.handRx,
          poseResult.rightArm.handRy,
          poseResult.rightArm.handRz,
          poseResult.rightArm.fingerCurl
        );
        poseFpArm(
          fpLeftArm,
          poseResult.leftArm.elbowX,
          poseResult.leftArm.elbowY,
          poseResult.leftArm.elbowZ,
          poseResult.leftArm.wristX,
          poseResult.leftArm.wristY,
          poseResult.leftArm.wristZ,
          poseResult.leftArm.handRx,
          poseResult.leftArm.handRy,
          poseResult.leftArm.handRz,
          poseResult.leftArm.fingerCurl
        );
      } else if (torchActive) {
        fpBowRig.bowGroup.visible = false;
        fpTorch.tGroup.visible = true;
        fpSwordGroup.visible = false;
        fpLeftArm.root.visible = true;
        fpRightArm.root.visible = true;

        poseFpArm(
          fpRightArm,
          0.44, -0.44, -0.18,
          0.26 + swayX, -0.24 - swayY + breathY, -0.46,
          0.22, 0.28, -1.28,
          0.90
        );
        poseFpArm(
          fpLeftArm,
          -0.46, -0.44, -0.18,
          -0.28 + swayX * 0.6, -0.28 - swayY + breathY, -0.44,
          0.25, -0.32, -0.42,
          0.38
        );
      } else {
        fpBowRig.bowGroup.visible = false;
        fpTorch.tGroup.visible = false;
        fpSwordGroup.visible = false;
        fpLeftArm.root.visible = true;
        fpRightArm.root.visible = true;

        poseFpArm(
          fpLeftArm,
          -0.46, -0.46, -0.18,
          -0.26 + swayX, -0.28 - swayY + breathY, -0.44,
          0.22, -0.28, -0.38,
          0.35
        );
        poseFpArm(
          fpRightArm,
          0.46, -0.46, -0.18,
          0.26 + swayX, -0.28 - swayY + breathY, -0.44,
          0.22, 0.28, 0.38,
          0.35
        );
      }
      return;
    }

    // B) THIRD-PERSON MODE: Show Full Articulated Ranger Character & Hide FP Viewmodel
    fpViewModelGroup.visible = false;
    rangerUpperTorsoPivot.visible = true;
    rangerBodyGroup.visible = true;
    rangerLeftLeg.visible = !isSwim;
    rangerRightLeg.visible = !isSwim;

    const bowInHands = !isSwim && (isAimingBow || equippedTool === 'bow');
    bowGroup.visible = bowInHands;
    stowedBackBowGroup.visible = !bowInHands;
    thirdPersonTorchGroup.visible = torchActive;
    thirdPersonSwordGroup.visible = swordActive;

    if (isMounted) {
      rangerLeftLeg.position.set(-0.22, 0.88, 0.05);
      rangerRightLeg.position.set(0.22, 0.88, 0.05);
      rangerLeftLeg.rotation.set(-0.55, 0, 0.28);
      rangerRightLeg.rotation.set(-0.55, 0, -0.28);
    } else {
      rangerLeftLeg.position.set(-0.10, 0.90, 0);
      rangerRightLeg.position.set(0.10, 0.90, 0);
      const legSwing =
        horizSpd > 0.18
          ? Math.sin(playerState.bobPhase * 2.0) * Math.min(0.68, horizSpd * 0.11)
          : 0;
      rangerLeftLeg.rotation.set(legSwing, 0, 0);
      rangerRightLeg.rotation.set(-legSwing, 0, 0);
    }

    rangerHeadGroup.rotation.x = playerState.pitch * 0.65;
    rangerHeadGroup.rotation.y = isMounted ? mountedRelLookYaw * 0.38 : 0;

    if (isSwim) {
      const swimCycle = elapsedTime * 3.8;
      rangerUpperTorsoPivot.position.set(0, 0.92, 0);
      rangerUpperTorsoPivot.rotation.set(-0.35, 0, 0);
      rangerLeftArmGroup.position.set(-0.25, 0.52, 0);
      rangerLeftArmGroup.rotation.set(Math.sin(swimCycle) * 0.45, 0.25, -0.35);
      poseRightArmSegments(
        0.25,
        0.52,
        0,
        0.38,
        0.44,
        -0.18 + Math.cos(swimCycle) * 0.14,
        0.28 + Math.sin(swimCycle) * 0.18,
        0.38,
        -0.44 + Math.cos(swimCycle) * 0.18
      );
      nockedArrowGroup.visible = false;
      updateBowRigString(tpBowRig, 0, false);
      return;
    }

    rangerUpperTorsoPivot.position.set(
      0,
      0.92 +
        (isMounted
          ? 0
          : Math.abs(Math.sin(playerState.bobPhase * 2.0)) * playerState.bobAmount * 0.035),
      0
    );
    rangerUpperTorsoPivot.rotation.set(
      isAimingBow ? playerState.pitch * 0.35 : -Math.min(0.10, horizSpd * 0.010),
      (isMounted ? mountedRelLookYaw * 0.68 : 0) + (isAimingBow ? -0.16 : 0),
      0
    );

    if (isAimingBow) {
      rangerLeftArmGroup.position.set(-0.24, 0.55, -0.04);
      rangerLeftArmGroup.rotation.set(playerState.pitch * 0.55, 0.14, 0);
      bowGroup.rotation.set(0, 0, -0.08);

      nockedArrowGroup.visible = true;
      updateBowRigString(tpBowRig, drawProg, false);

      const handX = -0.20 + drawProg * 0.14;
      const handY = 0.57;
      const handZ = -0.52 + drawProg * 0.44;
      const elbowX = 0.34;
      const elbowY = 0.58;
      const elbowZ = -0.04 + drawProg * 0.28;
      poseRightArmSegments(0.24, 0.54, 0.0, elbowX, elbowY, elbowZ, handX, handY, handZ);
    } else if (isMounted) {
      // Mounted on horse: hands hold the reins steadily in front of the saddle pommel (ZERO walking arm swing!)
      rangerLeftArmGroup.position.set(-0.23, 0.50, -0.04);
      rangerLeftArmGroup.rotation.set(-0.72, -0.16, 0.14);
      bowGroup.rotation.set(0.35, 0, -0.45);
      nockedArrowGroup.visible = false;
      updateBowRigString(tpBowRig, 0, false);

      if (torchActive) {
        poseRightArmSegments(0.25, 0.52, 0.0, 0.30, 0.44, -0.22, 0.26, 0.64, -0.46);
      } else if (swordActive) {
        const slashArc = Math.sin(swordSwing * Math.PI);
        poseRightArmSegments(
          0.25,
          0.52,
          0.0,
          0.32 - slashArc * 0.12,
          0.38,
          -0.18 - slashArc * 0.18,
          0.28 - slashArc * 0.36,
          0.42 - slashArc * 0.12,
          -0.44 - slashArc * 0.16
        );
      } else {
        // Right hand also gripping the reins in front of the saddle
        poseRightArmSegments(0.23, 0.50, -0.04, 0.24, 0.32, -0.18, 0.12, 0.24, -0.34);
      }
    } else {
      const armSwing =
        horizSpd > 0.18
          ? Math.sin(playerState.bobPhase * 2.0) * Math.min(0.42, horizSpd * 0.07)
          : Math.sin(elapsedTime * 1.6) * 0.03;
      rangerLeftArmGroup.position.set(-0.25, 0.52, 0);
      rangerLeftArmGroup.rotation.set(-0.55 - armSwing * 0.45, 0.12, 0.15);
      bowGroup.rotation.set(0.35, 0, -0.45);
      nockedArrowGroup.visible = false;
      updateBowRigString(tpBowRig, 0, false);

      if (torchActive) {
        poseRightArmSegments(0.25, 0.52, 0.0, 0.30, 0.44, -0.22, 0.26, 0.64, -0.46);
      } else if (swordActive) {
        const slashArc = Math.sin(swordSwing * Math.PI);
        poseRightArmSegments(
          0.25,
          0.52,
          0.0,
          0.32 - slashArc * 0.12,
          0.38,
          -0.18 - slashArc * 0.18,
          0.28 - slashArc * 0.36,
          0.42 - slashArc * 0.12,
          -0.44 - slashArc * 0.16
        );
      } else {
        poseRightArmSegments(
          0.25,
          0.52,
          0.0,
          0.27,
          0.26,
          0.04 + armSwing * 0.14,
          0.26,
          0.02,
          -0.08 + armSwing * 0.28
        );
      }
    }
  };

  return {
    playerCharacterGroup,
    updatePlayerAndCombat,
  };
}
// #endregion
