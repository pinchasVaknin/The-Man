// ============================================================================
// MODULE: Lab / 3D Procedural Model & Animation Factory
// DESIGN: Self-contained Three.js Rig Builder, Skin Applicator & Pose Animator
// SUMMARY: Builds authentic 3D models matching the world's characters, humans,
//          animals, and mythic creatures, with static rest pose ('none') and
//          real-time animations.
// ============================================================================

import * as THREE from 'three';
import { computeHorseBiomechanicalPose } from '../world/systems/horsePhysicsSystem';
import {
  computeFirstPersonSwordAttackPose,
  LOCKED_SWORD_GRIP_TRANSFORM,
} from '../world/systems/swordAttackAnimationSystem';
import type { ILabPoseOverrides, ILabSkinDef } from './labCatalog';

export interface ILabEntityRig {
  readonly entityId: string;
  readonly root: THREE.Group;
  readonly applySkin: (skin: ILabSkinDef) => void;
  readonly applyAnimation: (
    animationId: string,
    elapsedTime: number,
    cycleProgress: number,
    overrides?: ILabPoseOverrides
  ) => void;
  readonly setWireframe: (enabled: boolean) => void;
  readonly dispose: () => void;
  readonly stats: {
    readonly meshCount: number;
    readonly triangleCount: number;
  };
}

/**
 * Summary: Helper to count meshes and triangles inside a constructed Three.js Group.
 */
function computeGroupStats(root: THREE.Object3D): { meshCount: number; triangleCount: number } {
  let meshCount = 0;
  let triangleCount = 0;
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry) {
      meshCount += 1;
      const geo = obj.geometry as THREE.BufferGeometry;
      if (geo.index) {
        triangleCount += Math.round(geo.index.count / 3);
      } else {
        const pos = geo.getAttribute('position');
        if (pos) {
          triangleCount += Math.round(pos.count / 3);
        }
      }
    }
  });
  return { meshCount, triangleCount };
}

/**
 * Summary: Builds a complete, self-contained 3D rig for the given Lab entity ID.
 */
export function buildLabEntityRig(entityId: string, initialSkin: ILabSkinDef): ILabEntityRig {
  const disposableGeometries: THREE.BufferGeometry[] = [];
  const disposableMaterials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposableMaterials.push(m);
    return m;
  };

  const root = new THREE.Group();
  let customApplySkin: (skin: ILabSkinDef) => void = () => {};
  let customApplyAnimation: (animId: string, t: number, p: number) => void = () => {};

  const editableRigTargets: {
    weaponNodes: THREE.Object3D[];
    leftWeaponNodes: THREE.Object3D[];
    rightLimbNodes: THREE.Object3D[];
    leftLimbNodes: THREE.Object3D[];
    headNodes: THREE.Object3D[];
    bodyNodes: THREE.Object3D[];
  } = {
    weaponNodes: [],
    leftWeaponNodes: [],
    rightLimbNodes: [],
    leftLimbNodes: [],
    headNodes: [],
    bodyNodes: [],
  };

  // ==========================================================================
  // 1. RANGER THIRD-PERSON CHARACTER (סייר השמורה)
  // ==========================================================================
  if (entityId === 'ranger_third_person') {
    const skinMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xe8be9e, roughness: 0.55 }));
    const hairMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.75 }));
    const tunicMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1e4d3b, roughness: 0.68 }));
    const cloakMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x143829, roughness: 0.8, side: THREE.DoubleSide })
    );
    const leatherMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x5c3818, roughness: 0.5 }));
    const darkLeatherMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x36200d, roughness: 0.58 }));
    const pantsMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x2c3539, roughness: 0.78 }));
    const goldMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xd9a838, roughness: 0.25, metalness: 0.82 })
    );
    const steelMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.88 })
    );
    const runeGlowMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.9,
        roughness: 0.2,
      })
    );
    const flameMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff8c24,
        emissive: 0xff6b00,
        emissiveIntensity: 1.4,
      })
    );

    const upperTorsoPivot = new THREE.Group();
    upperTorsoPivot.position.set(0, 0.92, 0);

    const pelvis = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.17, 0.22, 12)), pantsMat);
    pelvis.position.y = -0.02;
    const belt = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.195, 0.195, 0.08, 12)), darkLeatherMat);
    belt.position.y = 0.06;
    const buckle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.08, 0.03)), goldMat);
    buckle.position.set(0, 0.06, -0.19);
    const chest = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.22, 0.18, 0.52, 12)), tunicMat);
    chest.position.y = 0.34;
    const mantle = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.26, 0.29, 0.18, 12)), cloakMat);
    mantle.position.y = 0.54;
    const baldric = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.56, 0.34)), leatherMat);
    baldric.position.set(0, 0.34, 0);
    baldric.rotation.z = 0.48;
    const cloakBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.76, 0.03)), cloakMat);
    cloakBack.position.set(0, 0.22, 0.21);
    cloakBack.rotation.x = 0.08;

    // Quiver + Feathered Arrows on Back
    const quiverGroup = new THREE.Group();
    quiverGroup.position.set(0.1, 0.36, 0.24);
    quiverGroup.rotation.z = -0.36;
    const quiverTube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.068, 0.055, 0.52, 10)), leatherMat);
    quiverGroup.add(quiverTube);
    const shaftGeo = trackGeo(new THREE.CylinderGeometry(0.01, 0.01, 0.32, 6));
    const fletchGeo = trackGeo(new THREE.BoxGeometry(0.035, 0.08, 0.01));
    for (let q = 0; q < 4; q++) {
      const aShaft = new THREE.Mesh(shaftGeo, leatherMat);
      aShaft.position.set((q - 1.5) * 0.022, 0.24, (q % 2) * 0.018);
      const aFletch = new THREE.Mesh(fletchGeo, runeGlowMat);
      aFletch.position.set((q - 1.5) * 0.022, 0.36, (q % 2) * 0.018);
      quiverGroup.add(aShaft, aFletch);
    }

    // Head & Hair
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.64, 0);
    const neck = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.075, 0.085, 0.14, 10)), skinMat);
    const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.145, 16, 16)), skinMat);
    head.position.y = 0.14;
    const hair = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.154, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.62)),
      hairMat
    );
    hair.position.y = 0.15;
    hair.rotation.x = -0.22;
    const eyeGeo = trackGeo(new THREE.SphereGeometry(0.018, 8, 8));
    const eyeMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x1e293b }));
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.048, 0.15, -0.132);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.048, 0.15, -0.132);
    headGroup.add(neck, head, hair, leftEye, rightEye);

    // Left Arm + Recurve Bow
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.25, 0.52, 0);
    const uArmGeo = trackGeo(new THREE.CylinderGeometry(0.068, 0.058, 0.3, 10));
    const fArmGeo = trackGeo(new THREE.CylinderGeometry(0.058, 0.048, 0.28, 10));
    const handGeo = trackGeo(new THREE.SphereGeometry(0.052, 10, 10));
    const lUpper = new THREE.Mesh(uArmGeo, tunicMat);
    lUpper.position.set(0, -0.12, -0.06);
    lUpper.rotation.x = 0.45;
    const lFore = new THREE.Mesh(fArmGeo, leatherMat);
    lFore.position.set(0, -0.26, -0.24);
    lFore.rotation.x = 1.15;
    const lHand = new THREE.Mesh(handGeo, skinMat);
    lHand.position.set(0, -0.32, -0.38);
    leftArmGroup.add(lUpper, lFore, lHand);

    // Recurve Bow in Left Hand
    const bowGroup = new THREE.Group();
    bowGroup.position.set(0, -0.32, -0.4);
    const riser = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.022, 0.024, 0.36, 8)), leatherMat);
    const limbGeo = trackGeo(new THREE.BoxGeometry(0.022, 0.48, 0.032));
    const uLimb = new THREE.Mesh(limbGeo, darkLeatherMat);
    uLimb.position.set(0, 0.36, 0.04);
    uLimb.rotation.x = 0.22;
    const lLimb = new THREE.Mesh(limbGeo, darkLeatherMat);
    lLimb.position.set(0, -0.36, 0.04);
    lLimb.rotation.x = -0.22;
    const tipGeo = trackGeo(new THREE.CylinderGeometry(0.014, 0.018, 0.16, 6));
    const uTip = new THREE.Mesh(tipGeo, goldMat);
    uTip.position.set(0, 0.62, 0.06);
    uTip.rotation.x = -0.38;
    const lTip = new THREE.Mesh(tipGeo, goldMat);
    lTip.position.set(0, -0.62, 0.06);
    lTip.rotation.x = 0.38;
    const bowString = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.005, 0.005, 1.3, 6)),
      trackMat(new THREE.MeshBasicMaterial({ color: 0xfef3c7 }))
    );
    bowString.position.set(0, 0, 0.12);
    const nockedArrow = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.01, 0.01, 0.85, 6)),
      goldMat
    );
    nockedArrow.rotation.x = Math.PI / 2;
    nockedArrow.position.set(0, 0, -0.2);
    nockedArrow.visible = false;
    bowGroup.add(riser, uLimb, lLimb, uTip, lTip, bowString, nockedArrow);
    leftArmGroup.add(bowGroup);

    // Right Arm + Greatsword & Torch
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.25, 0.52, 0);
    const rUpper = new THREE.Mesh(uArmGeo, tunicMat);
    rUpper.position.set(0, -0.14, -0.04);
    const rFore = new THREE.Mesh(fArmGeo, leatherMat);
    rFore.position.set(0, -0.34, -0.12);
    rFore.rotation.x = 0.55;
    const rHand = new THREE.Mesh(handGeo, skinMat);
    rHand.position.set(0, -0.44, -0.22);
    rightArmGroup.add(rUpper, rFore, rHand);

    // Ornate Rune Greatsword
    const swordGroup = new THREE.Group();
    swordGroup.position.set(0, -0.44, -0.24);
    swordGroup.rotation.x = -0.85;
    const grip = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.02, 0.022, 0.26, 8)), darkLeatherMat);
    const pommel = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.042, 0)), goldMat);
    pommel.position.y = -0.15;
    const crossguard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.035, 0.05)), goldMat);
    crossguard.position.y = 0.14;
    const blade = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.068, 0.96, 0.016)), steelMat);
    blade.position.y = 0.64;
    const runeStrip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.022, 0.78, 0.02)), runeGlowMat);
    runeStrip.position.y = 0.62;
    swordGroup.add(grip, pommel, crossguard, blade, runeStrip);
    rightArmGroup.add(swordGroup);

    // Torch in Right Hand
    const torchGroup = new THREE.Group();
    torchGroup.position.set(0, -0.44, -0.24);
    torchGroup.rotation.x = -0.45;
    const tStick = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.024, 0.018, 0.48, 8)), leatherMat);
    const tHead = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.03, 0.12, 8)), darkLeatherMat);
    tHead.position.y = 0.24;
    const tFlame = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.065, 0.22, 8)), flameMat);
    tFlame.position.y = 0.38;
    torchGroup.add(tStick, tHead, tFlame);
    torchGroup.visible = false;
    rightArmGroup.add(torchGroup);

    upperTorsoPivot.add(
      pelvis,
      belt,
      buckle,
      chest,
      mantle,
      baldric,
      cloakBack,
      quiverGroup,
      headGroup,
      leftArmGroup,
      rightArmGroup
    );

    // Articulated Left & Right Legs
    const thighGeo = trackGeo(new THREE.CylinderGeometry(0.095, 0.078, 0.44, 10));
    thighGeo.translate(0, -0.22, 0);
    const bootGeo = trackGeo(new THREE.CylinderGeometry(0.078, 0.068, 0.44, 10));
    bootGeo.translate(0, -0.64, 0);
    const footGeo = trackGeo(new THREE.BoxGeometry(0.12, 0.08, 0.24));
    footGeo.translate(0, -0.86, -0.04);

    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.1, 0.9, 0);
    leftLeg.add(
      new THREE.Mesh(thighGeo, pantsMat),
      new THREE.Mesh(bootGeo, darkLeatherMat),
      new THREE.Mesh(footGeo, darkLeatherMat)
    );
    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.1, 0.9, 0);
    rightLeg.add(
      new THREE.Mesh(thighGeo, pantsMat),
      new THREE.Mesh(bootGeo, darkLeatherMat),
      new THREE.Mesh(footGeo, darkLeatherMat)
    );

    // Water Ripple Ring for Swim Animation
    const swimRing = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(0.38, 0.65, 24)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: 0x7dd3fc,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
        })
      )
    );
    swimRing.rotation.x = -Math.PI / 2;
    swimRing.position.y = 0.85;
    swimRing.visible = false;

    root.add(upperTorsoPivot, leftLeg, rightLeg, swimRing);
    // Face forward toward +Z in Lab studio
    root.rotation.y = Math.PI;

    editableRigTargets.weaponNodes.push(swordGroup, torchGroup);
    editableRigTargets.leftWeaponNodes.push(bowGroup);
    editableRigTargets.rightLimbNodes.push(rightArmGroup);
    editableRigTargets.leftLimbNodes.push(leftArmGroup);
    editableRigTargets.headNodes.push(headGroup);
    editableRigTargets.bodyNodes.push(upperTorsoPivot);

    customApplySkin = (skin) => {
      tunicMat.color.setHex(skin.palette.primaryHex);
      cloakMat.color.setHex(skin.palette.secondaryHex);
      leatherMat.color.setHex(skin.palette.accentHex);
      if (skin.palette.trimHex) goldMat.color.setHex(skin.palette.trimHex);
      if (skin.palette.emissiveHex) {
        runeGlowMat.color.setHex(skin.palette.emissiveHex);
        runeGlowMat.emissive.setHex(skin.palette.emissiveHex);
      }
    };

    customApplyAnimation = (animId, t, p) => {
      // Reset to clean static pose first
      upperTorsoPivot.position.set(0, 0.92, 0);
      upperTorsoPivot.rotation.set(0, 0, 0);
      headGroup.rotation.set(0, 0, 0);
      leftArmGroup.position.set(-0.25, 0.52, 0);
      leftArmGroup.rotation.set(-0.2, 0.1, 0.1);
      rightArmGroup.position.set(0.25, 0.52, 0);
      rightArmGroup.rotation.set(-0.2, -0.1, -0.1);
      leftLeg.position.set(-0.1, 0.9, 0);
      leftLeg.rotation.set(0, 0, 0);
      rightLeg.position.set(0.1, 0.9, 0);
      rightLeg.rotation.set(0, 0, 0);
      bowGroup.visible = true;
      bowGroup.rotation.set(0.25, 0, -0.35);
      nockedArrow.visible = false;
      swordGroup.visible = true;
      torchGroup.visible = false;
      swimRing.visible = false;

      if (animId === 'none') return;

      const phase = p * Math.PI * 2;
      if (animId === 'idle') {
        const breath = Math.sin(phase);
        upperTorsoPivot.position.y = 0.92 + breath * 0.015;
        leftArmGroup.rotation.x = -0.2 + breath * 0.04;
        rightArmGroup.rotation.x = -0.2 - breath * 0.04;
        headGroup.rotation.y = Math.sin(phase * 0.5) * 0.12;
      } else if (animId === 'walk') {
        const swing = Math.sin(phase);
        upperTorsoPivot.position.y = 0.92 + Math.abs(Math.cos(phase)) * 0.035;
        upperTorsoPivot.rotation.x = -0.05;
        leftLeg.rotation.x = swing * 0.52;
        rightLeg.rotation.x = -swing * 0.52;
        leftArmGroup.rotation.x = -0.35 - swing * 0.38;
        rightArmGroup.rotation.x = -0.35 + swing * 0.38;
      } else if (animId === 'sprint') {
        const swing = Math.sin(phase);
        upperTorsoPivot.position.y = 0.92 + Math.abs(Math.cos(phase)) * 0.065;
        upperTorsoPivot.rotation.x = -0.18;
        leftLeg.rotation.x = swing * 0.82;
        rightLeg.rotation.x = -swing * 0.82;
        leftArmGroup.rotation.x = -0.55 - swing * 0.65;
        rightArmGroup.rotation.x = -0.55 + swing * 0.65;
      } else if (animId === 'bow_draw') {
        swordGroup.visible = false;
        nockedArrow.visible = true;
        const draw = Math.max(0, Math.min(1, Math.sin(phase * 0.5) * 1.3));
        upperTorsoPivot.rotation.y = -0.22;
        headGroup.rotation.y = 0.22;
        leftArmGroup.rotation.set(0.55, 0.15, 0);
        bowGroup.rotation.set(-0.35, 0, 0);
        rightArmGroup.rotation.set(0.62, -0.35, -0.25);
        rightArmGroup.position.z = draw * 0.18;
        nockedArrow.position.z = -0.2 + draw * 0.22;
      } else if (animId === 'sword_slash') {
        bowGroup.visible = false;
        swordGroup.visible = true;
        const slash = Math.sin(phase);
        upperTorsoPivot.rotation.y = slash * 0.45;
        rightArmGroup.rotation.set(-0.85 + Math.cos(phase) * 0.75, -0.25 + slash * 0.65, -0.35);
        leftArmGroup.rotation.set(-0.45, 0.35, 0.25);
        leftLeg.rotation.x = 0.22;
        rightLeg.rotation.x = -0.22;
      } else if (animId === 'torch_carry') {
        swordGroup.visible = false;
        torchGroup.visible = true;
        const flicker = 1 + Math.sin(t * 16) * 0.15;
        tFlame.scale.set(1, flicker, 1);
        rightArmGroup.rotation.set(0.75 + Math.sin(phase) * 0.08, -0.15, -0.1);
        leftArmGroup.rotation.x = -0.25 + Math.cos(phase) * 0.12;
      } else if (animId === 'swim') {
        swordGroup.visible = false;
        bowGroup.visible = false;
        swimRing.visible = true;
        swimRing.scale.setScalar(1 + Math.sin(phase * 2) * 0.12);
        upperTorsoPivot.position.y = 0.82 + Math.sin(phase) * 0.04;
        upperTorsoPivot.rotation.x = -0.45;
        leftArmGroup.rotation.set(Math.sin(phase) * 0.65, 0.3, -0.4);
        rightArmGroup.rotation.set(-Math.sin(phase) * 0.65, -0.3, 0.4);
        leftLeg.rotation.x = 0.35 + Math.cos(phase * 2) * 0.25;
        rightLeg.rotation.x = 0.35 - Math.cos(phase * 2) * 0.25;
      } else if (animId === 'horse_mount_pose') {
        swordGroup.visible = false;
        const rideBob = Math.sin(phase * 2) * 0.03;
        upperTorsoPivot.position.y = 0.94 + rideBob;
        leftLeg.position.set(-0.22, 0.88, -0.05);
        rightLeg.position.set(0.22, 0.88, -0.05);
        leftLeg.rotation.set(0.55, 0, 0.28);
        rightLeg.rotation.set(0.55, 0, -0.28);
        leftArmGroup.rotation.set(0.52, -0.16, 0.14);
        rightArmGroup.rotation.set(0.52, 0.16, -0.14);
      }
    };
  }

  // ==========================================================================
  // 2. FIRST-PERSON HANDS & WEAPONS VIEWMODEL (ידיים וכלי נשק בגוף ראשון)
  // ==========================================================================
  else if (entityId === 'ranger_first_person') {
    const skinMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xe8be9e, roughness: 0.52 }));
    const vambraceMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x1b4d3e, roughness: 0.35, metalness: 0.35 })
    );
    const leatherMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x36200d, roughness: 0.58 }));
    const goldMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.22, metalness: 0.88 })
    );
    const steelMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.92 })
    );
    const runeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.0,
      })
    );

    const stageHolder = new THREE.Group();
    stageHolder.position.set(0, 1.35, 0.25);
    stageHolder.rotation.y = Math.PI;
    stageHolder.scale.setScalar(1.85);
    root.add(stageHolder);

    const buildHandUnit = (side: -1 | 1) => {
      const unit = new THREE.Group();
      const forearm = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.046, 0.058, 0.36, 12)),
        vambraceMat
      );
      forearm.rotation.x = Math.PI / 2;
      forearm.position.set(0, -0.02, 0.2);
      const goldCuff = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.049, 0.051, 0.04, 12)),
        goldMat
      );
      goldCuff.rotation.x = Math.PI / 2;
      goldCuff.position.set(0, -0.02, 0.04);

      const palm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.078, 0.028, 0.082)), skinMat);
      const gloveBack = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.08, 0.018, 0.068)),
        leatherMat
      );
      gloveBack.position.y = 0.012;
      unit.add(forearm, goldCuff, palm, gloveBack);

      for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.0085, 0.0075, 0.056, 8)),
          skinMat
        );
        finger.rotation.x = Math.PI / 2 + 0.35;
        finger.position.set(side * (-0.024 + f * 0.016), -0.008, -0.055);
        unit.add(finger);
        if (side === 1 && f === 0) {
          const ring = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.01, 0.003, 8, 14)), goldMat);
          ring.position.set(side * -0.024, -0.004, -0.042);
          unit.add(ring);
        }
      }
      return unit;
    };

    const leftArm = buildHandUnit(-1);
    leftArm.position.set(-0.24, -0.22, -0.38);
    const rightArm = buildHandUnit(1);
    rightArm.position.set(0.24, -0.22, -0.38);

    // Ornate Sword attached to Right Hand
    const swordGroup = new THREE.Group();
    swordGroup.position.set(
      LOCKED_SWORD_GRIP_TRANSFORM.posX,
      LOCKED_SWORD_GRIP_TRANSFORM.posY,
      LOCKED_SWORD_GRIP_TRANSFORM.posZ
    );
    const sGrip = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.016, 0.018, 0.22, 10)), leatherMat);
    const sGuard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.028, 0.042)), goldMat);
    sGuard.position.y = 0.12;
    const sBlade = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.056, 0.82, 0.014)), steelMat);
    sBlade.position.y = 0.54;
    const sRune = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.018, 0.68, 0.018)), runeMat);
    sRune.position.y = 0.52;
    swordGroup.add(sGrip, sGuard, sBlade, sRune);
    rightArm.add(swordGroup);

    // Recurve Bow attached to Left Hand
    const bowGroup = new THREE.Group();
    bowGroup.position.set(0, 0, -0.05);
    const bRiser = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.02, 0.55, 10)), goldMat);
    const bString = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.004, 0.004, 0.54, 6)),
      trackMat(new THREE.MeshBasicMaterial({ color: 0xfef3c7 }))
    );
    bString.position.z = 0.08;
    bowGroup.add(bRiser, bString);
    bowGroup.visible = false;
    leftArm.add(bowGroup);

    // Slash Arc Ribbon
    const slashRibbon = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(0.28, 0.48, 24, 1, -Math.PI * 0.4, Math.PI * 0.8)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.75,
          side: THREE.DoubleSide,
        })
      )
    );
    slashRibbon.position.set(0, -0.1, -0.55);
    slashRibbon.visible = false;

    stageHolder.add(leftArm, rightArm, slashRibbon);

    editableRigTargets.weaponNodes.push(swordGroup);
    editableRigTargets.leftWeaponNodes.push(bowGroup);
    editableRigTargets.rightLimbNodes.push(rightArm);
    editableRigTargets.leftLimbNodes.push(leftArm);
    editableRigTargets.headNodes.push(slashRibbon);
    editableRigTargets.bodyNodes.push(stageHolder);

    customApplySkin = (skin) => {
      vambraceMat.color.setHex(skin.palette.primaryHex);
      leatherMat.color.setHex(skin.palette.secondaryHex);
      goldMat.color.setHex(skin.palette.accentHex);
      if (skin.palette.emissiveHex) {
        runeMat.color.setHex(skin.palette.emissiveHex);
        runeMat.emissive.setHex(skin.palette.emissiveHex);
      }
    };

    customApplyAnimation = (animId, _t, p) => {
      swordGroup.visible = true;
      bowGroup.visible = false;
      slashRibbon.visible = false;
      leftArm.position.set(-0.24, -0.2, -0.36);
      leftArm.rotation.set(0.15, -0.25, -0.25);
      rightArm.position.set(0.24, -0.2, -0.36);
      rightArm.rotation.set(0.15, 0.25, 0.25);
      swordGroup.rotation.set(0.2, 0, -0.15);

      if (animId === 'none') return;

      if (animId === 'fp_sword_combo' || animId === 'fp_sword_heavy' || animId === 'fp_sword_block') {
        const isHeavy = animId === 'fp_sword_heavy';
        const isBlock = animId === 'fp_sword_block';
        const comboIdx = Math.floor(p * 3) % 3;
        const swingProg = isBlock ? 0 : (p * (isHeavy ? 1 : 3)) % 1;
        const pose = computeFirstPersonSwordAttackPose({
          swingProgress: swingProg,
          comboIndex: comboIdx,
          isHeavy,
          chargeProgress: 0,
          blockProgress: isBlock ? Math.sin(p * Math.PI) : 0,
          swayX: 0,
          swayY: 0,
          breathY: 0,
          sprintCarry: 0,
          impactKind: 'none',
          impactAge: 99,
        });
        rightArm.position.set(pose.rightArm.wristX, pose.rightArm.wristY, pose.rightArm.wristZ);
        rightArm.rotation.set(pose.rightArm.handRx, pose.rightArm.handRy, pose.rightArm.handRz);
        leftArm.position.set(pose.leftArm.wristX, pose.leftArm.wristY, pose.leftArm.wristZ);
        leftArm.rotation.set(pose.leftArm.handRx, pose.leftArm.handRy, pose.leftArm.handRz);
        slashRibbon.visible = pose.slashRibbon.visible;
        if (pose.slashRibbon.visible) {
          slashRibbon.rotation.z = pose.slashRibbon.rotZ;
        }
      } else if (animId === 'fp_bow_aim') {
        swordGroup.visible = false;
        bowGroup.visible = true;
        const draw = Math.sin(p * Math.PI);
        leftArm.position.set(-0.08, -0.14, -0.45);
        leftArm.rotation.set(0.1, 0.2, -1.2);
        rightArm.position.set(0.06, -0.14, -0.42 + draw * 0.24);
        rightArm.rotation.set(0.1, 0.4, -0.8);
      } else if (animId === 'fp_torch_hold') {
        const sway = Math.sin(p * Math.PI * 2) * 0.04;
        rightArm.position.set(0.22 + sway, -0.16 + Math.abs(sway), -0.4);
        leftArm.position.set(-0.24, -0.24, -0.36);
      }
    };
  }

  // ==========================================================================
  // 3. DWARVEN MINER (גמד כורה מממלכת הגמדים)
  // ==========================================================================
  else if (entityId === 'dwarven_miner') {
    const skinMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xe0ac8b, roughness: 0.58 }));
    const tunicMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x8b261d, roughness: 0.72 }));
    const beardMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x8c3b16, roughness: 0.82 }));
    const armorMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xb8860b, roughness: 0.32, metalness: 0.78 })
    );
    const ironMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.82 })
    );
    const lanternGlowMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.3,
      })
    );
    const crystalMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.65,
        roughness: 0.18,
      })
    );

    const bodyPivot = new THREE.Group();
    const torso = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.25, 0.29, 0.64, 12)),
      tunicMat
    );
    torso.position.y = 0.68;
    const belt = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.285, 0.285, 0.11, 12)),
      ironMat
    );
    belt.position.y = 0.52;
    const buckle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 0.12, 0.05)), armorMat);
    buckle.position.set(0, 0.52, 0.28);

    const pauldronGeo = trackGeo(new THREE.SphereGeometry(0.15, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6));
    const pauldronL = new THREE.Mesh(pauldronGeo, armorMat);
    pauldronL.position.set(-0.26, 0.92, 0);
    pauldronL.rotation.z = 0.45;
    const pauldronR = new THREE.Mesh(pauldronGeo, armorMat);
    pauldronR.position.set(0.26, 0.92, 0);
    pauldronR.rotation.z = -0.45;

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.16, 0);
    const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.19, 14, 12)), skinMat);
    const nose = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.048, 8, 8)), skinMat);
    nose.position.set(0, 0, 0.19);
    const helm = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.22, 0.26, 12)), ironMat);
    helm.position.y = 0.14;
    const helmRim = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.225, 0.225, 0.045, 12)),
      armorMat
    );
    helmRim.position.y = 0.04;

    // 3-Braided Dwarven Beard
    const beardCenter = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.15, 0.42, 8)),
      beardMat
    );
    beardCenter.rotation.x = Math.PI;
    beardCenter.position.set(0, -0.2, 0.13);
    const beardSideGeo = trackGeo(new THREE.ConeGeometry(0.08, 0.34, 6));
    beardSideGeo.rotateX(Math.PI);
    const beardL = new THREE.Mesh(beardSideGeo, beardMat);
    beardL.position.set(-0.1, -0.18, 0.11);
    beardL.rotation.z = -0.2;
    const beardR = new THREE.Mesh(beardSideGeo, beardMat);
    beardR.position.set(0.1, -0.18, 0.11);
    beardR.rotation.z = 0.2;
    const beardRing = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 8)),
      armorMat
    );
    beardRing.position.set(0, -0.3, 0.13);
    headGroup.add(head, nose, helm, helmRim, beardCenter, beardL, beardR, beardRing);

    // Left Arm + Miner Lantern
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.29, 0.94, 0);
    const armMeshGeo = trackGeo(new THREE.CylinderGeometry(0.075, 0.065, 0.42, 10));
    armMeshGeo.translate(0, -0.18, 0);
    leftArm.add(new THREE.Mesh(armMeshGeo, tunicMat));
    const lantern = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.065, 0.055, 0.16, 8)),
      lanternGlowMat
    );
    lantern.position.set(0, -0.44, 0.14);
    leftArm.add(lantern);

    // Right Arm + Iron Pickaxe
    const rightArm = new THREE.Group();
    rightArm.position.set(0.29, 0.94, 0);
    rightArm.add(new THREE.Mesh(armMeshGeo, tunicMat));
    const pickGroup = new THREE.Group();
    pickGroup.position.set(0, -0.36, 0.12);
    const pickHandle = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.024, 0.024, 0.65, 8)),
      beardMat
    );
    pickHandle.rotation.x = Math.PI / 2;
    pickHandle.position.z = 0.2;
    const pickHead = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.055, 0.42, 6)),
      ironMat
    );
    pickHead.rotation.z = Math.PI / 2;
    pickHead.position.set(0, 0, 0.48);
    pickGroup.add(pickHandle, pickHead);
    rightArm.add(pickGroup);

    // Legs & Boots
    const legGeo = trackGeo(new THREE.CylinderGeometry(0.095, 0.085, 0.38, 10));
    legGeo.translate(0, -0.19, 0);
    const bootGeo = trackGeo(new THREE.BoxGeometry(0.15, 0.11, 0.24));
    bootGeo.translate(0, -0.36, 0.04);
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.12, 0.4, 0);
    leftLeg.add(new THREE.Mesh(legGeo, armorMat), new THREE.Mesh(bootGeo, ironMat));
    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.12, 0.4, 0);
    rightLeg.add(new THREE.Mesh(legGeo, armorMat), new THREE.Mesh(bootGeo, ironMat));

    // Crystal Vein Prop (shown during mining animation)
    const crystalProp = new THREE.Group();
    crystalProp.position.set(0.22, 0, 0.68);
    for (let c = 0; c < 3; c++) {
      const spire = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.14, 0.55 - c * 0.1, 6)), crystalMat);
      spire.position.set((c - 1) * 0.14, 0.25, 0);
      spire.rotation.z = (c - 1) * 0.25;
      crystalProp.add(spire);
    }
    crystalProp.visible = false;

    bodyPivot.add(torso, belt, buckle, pauldronL, pauldronR, headGroup, leftArm, rightArm);
    root.add(bodyPivot, leftLeg, rightLeg, crystalProp);

    editableRigTargets.weaponNodes.push(pickGroup);
    editableRigTargets.leftWeaponNodes.push(lantern);
    editableRigTargets.rightLimbNodes.push(rightArm);
    editableRigTargets.leftLimbNodes.push(leftArm);
    editableRigTargets.headNodes.push(headGroup);
    editableRigTargets.bodyNodes.push(bodyPivot);

    customApplySkin = (skin) => {
      tunicMat.color.setHex(skin.palette.primaryHex);
      beardMat.color.setHex(skin.palette.secondaryHex);
      armorMat.color.setHex(skin.palette.accentHex);
      if (skin.palette.trimHex) {
        crystalMat.color.setHex(skin.palette.trimHex);
        crystalMat.emissive.setHex(skin.palette.trimHex);
      }
    };

    customApplyAnimation = (animId, _t, p) => {
      bodyPivot.position.set(0, 0, 0);
      bodyPivot.rotation.set(0, 0, 0);
      headGroup.rotation.set(0, 0, 0);
      leftArm.rotation.set(-0.35, 0, 0);
      rightArm.rotation.set(-0.45, 0, 0);
      leftLeg.rotation.set(0, 0, 0);
      rightLeg.rotation.set(0, 0, 0);
      crystalProp.visible = false;

      if (animId === 'none') return;
      const phase = p * Math.PI * 2;

      if (animId === 'mining_work') {
        crystalProp.visible = true;
        const strike = Math.sin(phase);
        bodyPivot.rotation.x = Math.max(0, strike) * 0.22;
        rightArm.rotation.x = -1.1 + strike * 1.15;
        leftArm.rotation.x = -0.55 - strike * 0.2;
        headGroup.rotation.x = strike * 0.15;
      } else if (animId === 'caravan_march') {
        const swing = Math.sin(phase);
        bodyPivot.position.y = Math.abs(Math.cos(phase)) * 0.04;
        bodyPivot.rotation.z = swing * 0.06;
        leftLeg.rotation.x = swing * 0.6;
        rightLeg.rotation.x = -swing * 0.6;
        leftArm.rotation.x = -0.5 - swing * 0.35;
        rightArm.rotation.x = -0.4 + swing * 0.45;
      } else if (animId === 'miner_idle') {
        bodyPivot.position.y = Math.sin(phase) * 0.015;
        headGroup.rotation.y = Math.sin(phase) * 0.22;
        leftArm.rotation.x = -0.45 + Math.cos(phase) * 0.1;
      } else if (animId === 'celebrate_gold') {
        const jump = Math.abs(Math.sin(phase * 2));
        bodyPivot.position.y = jump * 0.18;
        leftArm.rotation.x = -2.4 + Math.sin(phase * 2) * 0.3;
        rightArm.rotation.x = -2.5 - Math.sin(phase * 2) * 0.3;
      }
    };
  }

  // ==========================================================================
  // 4 & 5. SHAOLIN MONK & TAI-CHI MONK (נזיר שאולין / נזיר טאי־צ׳י)
  // ==========================================================================
  else if (entityId === 'shaolin_monk' || entityId === 'tai_chi_monk') {
    const hasStaff = entityId === 'shaolin_monk';
    const skinMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xe2b897, roughness: 0.6 }));
    const robeMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xd96b27, roughness: 0.78 }));
    const pantsMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x262626, roughness: 0.85 }));
    const sashMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5 }));
    const wrapMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.8 }));
    const staffMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.82 })
    );

    const bodyGroup = new THREE.Group();
    const torsoGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.31, 0.82, 12));
    torsoGeo.translate(0, 1.08, 0);
    const headGeo = trackGeo(new THREE.SphereGeometry(0.2, 14, 14));
    headGeo.translate(0, 1.68, 0);
    const sashGeo = trackGeo(new THREE.BoxGeometry(0.54, 0.14, 0.54));

    const torso = new THREE.Mesh(torsoGeo, robeMat);
    const head = new THREE.Mesh(headGeo, skinMat);
    const sash = new THREE.Mesh(sashGeo, sashMat);
    sash.position.y = 0.88;

    const armGeo = trackGeo(new THREE.CylinderGeometry(0.075, 0.065, 0.68, 10));
    armGeo.translate(0, -0.28, 0);
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.32, 1.38, 0);
    leftArm.add(new THREE.Mesh(armGeo, robeMat));

    const rightArm = new THREE.Group();
    rightArm.position.set(0.32, 1.38, 0);
    rightArm.add(new THREE.Mesh(armGeo, robeMat));

    let staffMesh: THREE.Mesh | null = null;
    if (hasStaff) {
      const staffGeo = trackGeo(new THREE.CylinderGeometry(0.026, 0.026, 2.25, 10));
      staffMesh = new THREE.Mesh(staffGeo, staffMat);
      staffMesh.position.set(0, -0.52, 0.16);
      staffMesh.rotation.x = Math.PI * 0.38;
      rightArm.add(staffMesh);
    }

    const uLegGeo = trackGeo(new THREE.CylinderGeometry(0.105, 0.088, 0.46, 10));
    uLegGeo.translate(0, -0.22, 0);
    const lLegGeo = trackGeo(new THREE.CylinderGeometry(0.082, 0.068, 0.38, 10));
    lLegGeo.translate(0, -0.56, 0);
    const shoeGeo = trackGeo(new THREE.BoxGeometry(0.15, 0.1, 0.28));
    shoeGeo.translate(0, -0.74, 0.05);

    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.14, 0.78, 0);
    leftLeg.add(
      new THREE.Mesh(uLegGeo, pantsMat),
      new THREE.Mesh(lLegGeo, wrapMat),
      new THREE.Mesh(shoeGeo, pantsMat)
    );

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.14, 0.78, 0);
    rightLeg.add(
      new THREE.Mesh(uLegGeo, pantsMat),
      new THREE.Mesh(lLegGeo, wrapMat),
      new THREE.Mesh(shoeGeo, pantsMat)
    );

    bodyGroup.add(torso, head, sash, leftArm, rightArm, leftLeg, rightLeg);
    root.add(bodyGroup);

    if (staffMesh) {
      editableRigTargets.weaponNodes.push(staffMesh);
      editableRigTargets.leftWeaponNodes.push(sash);
    } else {
      editableRigTargets.weaponNodes.push(sash);
      editableRigTargets.leftWeaponNodes.push(leftLeg);
    }
    editableRigTargets.rightLimbNodes.push(rightArm);
    editableRigTargets.leftLimbNodes.push(leftArm);
    editableRigTargets.headNodes.push(head);
    editableRigTargets.bodyNodes.push(bodyGroup);

    customApplySkin = (skin) => {
      robeMat.color.setHex(skin.palette.primaryHex);
      pantsMat.color.setHex(skin.palette.secondaryHex);
      sashMat.color.setHex(skin.palette.accentHex);
      if (skin.palette.trimHex) staffMat.color.setHex(skin.palette.trimHex);
    };

    customApplyAnimation = (animId, _t, p) => {
      bodyGroup.position.set(0, 0, 0);
      bodyGroup.rotation.set(0, 0, 0);
      leftArm.rotation.set(-0.15, 0, 0.12);
      rightArm.rotation.set(-0.25, 0, -0.12);
      leftLeg.rotation.set(0, 0, 0);
      rightLeg.rotation.set(0, 0, 0);
      if (staffMesh) {
        staffMesh.rotation.set(Math.PI * 0.38, 0, 0);
      }

      if (animId === 'none') return;
      const phase = p * Math.PI * 2;

      if (animId === 'kung_fu_form' || animId === 'tai_chi_flow') {
        bodyGroup.position.y = Math.abs(Math.sin(phase)) * 0.05;
        bodyGroup.rotation.y = Math.sin(phase * 0.5) * 0.38;
        leftArm.rotation.x = -0.65 + Math.sin(phase) * 0.75;
        leftArm.rotation.z = 0.25 + Math.cos(phase * 0.7) * 0.25;
        rightArm.rotation.x = -0.85 + Math.cos(phase) * 0.85;
        rightArm.rotation.z = -0.25 + Math.sin(phase * 0.7) * 0.32;
        const legStance = Math.sin(phase * 0.5) * 0.26;
        leftLeg.rotation.x = legStance;
        rightLeg.rotation.x = -legStance;
      } else if (animId === 'staff_whirlwind') {
        bodyGroup.rotation.y = Math.sin(phase) * 0.45;
        rightArm.rotation.x = -1.2;
        if (staffMesh) {
          staffMesh.rotation.z = phase * 2;
        }
        leftArm.rotation.set(-0.8, 0, 0.55);
      } else if (animId === 'horse_stance_strike') {
        const dip = Math.sin(phase) * 0.5 + 0.5;
        bodyGroup.position.y = -dip * 0.14;
        leftLeg.rotation.z = dip * 0.22;
        rightLeg.rotation.z = -dip * 0.22;
        rightArm.rotation.x = -0.4 - Math.sin(phase) * 0.9;
        leftArm.rotation.x = -0.8 + Math.sin(phase) * 0.6;
      } else if (animId === 'shaolin_salute') {
        const bow = Math.sin(phase * 0.5);
        bodyGroup.rotation.x = bow * 0.35;
        leftArm.rotation.set(-1.1, 0.4, 0.45);
        rightArm.rotation.set(-1.1, -0.4, -0.45);
      } else if (animId === 'cloud_hands') {
        bodyGroup.rotation.y = Math.sin(phase) * 0.32;
        leftArm.rotation.set(-1.0 + Math.sin(phase) * 0.35, 0, 0.35 + Math.cos(phase) * 0.35);
        rightArm.rotation.set(-1.0 - Math.sin(phase) * 0.35, 0, -0.35 + Math.cos(phase) * 0.35);
      } else if (animId === 'crane_balance') {
        const lift = Math.sin(phase * 0.5);
        leftLeg.rotation.x = -lift * 0.85;
        leftArm.rotation.z = 0.3 + lift * 0.95;
        rightArm.rotation.z = -0.3 - lift * 0.95;
      }
    };
  }

  // ==========================================================================
  // 6. HARBOR MARKET MERCHANT & BLACKSMITH (סוחרי שוק הנמל והנפח)
  // ==========================================================================
  else if (entityId === 'harbor_merchant') {
    const skinMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xe5b895, roughness: 0.58 }));
    const robeMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.65 }));
    const vestMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 }));
    const goldMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.28, metalness: 0.8 })
    );
    const ironMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.35, metalness: 0.82 })
    );

    const bodyGroup = new THREE.Group();
    const robe = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.24, 0.34, 1.05, 12)),
      robeMat
    );
    robe.position.y = 0.82;
    const vest = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.255, 0.28, 0.56, 12)),
      vestMat
    );
    vest.position.y = 1.04;
    const belt = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.275, 0.275, 0.1, 12)),
      goldMat
    );
    belt.position.y = 0.82;

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.54, 0);
    const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.19, 14, 14)), skinMat);
    const hatCap = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.21, 0.22, 0.14, 12)),
      vestMat
    );
    hatCap.position.y = 0.14;
    const hatGem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.04, 0)), goldMat);
    hatGem.position.set(0, 0.14, 0.21);
    headGroup.add(head, hatCap, hatGem);

    const armGeo = trackGeo(new THREE.CylinderGeometry(0.075, 0.068, 0.62, 10));
    armGeo.translate(0, -0.26, 0);
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.32, 1.28, 0);
    leftArm.add(new THREE.Mesh(armGeo, robeMat));
    const scrollProp = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 0.28, 8)),
      goldMat
    );
    scrollProp.rotation.z = Math.PI / 2;
    scrollProp.position.set(0, -0.52, 0.1);
    leftArm.add(scrollProp);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.32, 1.28, 0);
    rightArm.add(new THREE.Mesh(armGeo, robeMat));
    const hammerGroup = new THREE.Group();
    hammerGroup.position.set(0, -0.52, 0.1);
    const hShaft = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.02, 0.02, 0.38, 8)),
      vestMat
    );
    hShaft.rotation.x = Math.PI / 2;
    const hHead = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 0.12, 0.22)), ironMat);
    hHead.position.z = 0.16;
    hammerGroup.add(hShaft, hHead);
    rightArm.add(hammerGroup);

    const bootGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.3, 0.24));
    const leftBoot = new THREE.Mesh(bootGeo, vestMat);
    leftBoot.position.set(-0.12, 0.15, 0.02);
    const rightBoot = new THREE.Mesh(bootGeo, vestMat);
    rightBoot.position.set(0.12, 0.15, 0.02);

    bodyGroup.add(robe, vest, belt, headGroup, leftArm, rightArm, leftBoot, rightBoot);
    root.add(bodyGroup);

    editableRigTargets.weaponNodes.push(hammerGroup);
    editableRigTargets.leftWeaponNodes.push(scrollProp);
    editableRigTargets.rightLimbNodes.push(rightArm);
    editableRigTargets.leftLimbNodes.push(leftArm);
    editableRigTargets.headNodes.push(headGroup);
    editableRigTargets.bodyNodes.push(bodyGroup);

    customApplySkin = (skin) => {
      robeMat.color.setHex(skin.palette.primaryHex);
      vestMat.color.setHex(skin.palette.secondaryHex);
      goldMat.color.setHex(skin.palette.accentHex);
    };

    customApplyAnimation = (animId, _t, p) => {
      bodyGroup.position.set(0, 0, 0);
      bodyGroup.rotation.set(0, 0, 0);
      headGroup.rotation.set(0, 0, 0);
      leftArm.rotation.set(-0.25, 0, 0.12);
      rightArm.rotation.set(-0.25, 0, -0.12);

      if (animId === 'none') return;
      const phase = p * Math.PI * 2;

      if (animId === 'merchant_welcome') {
        bodyGroup.rotation.x = Math.max(0, Math.sin(phase)) * 0.22;
        leftArm.rotation.set(-0.75 - Math.sin(phase) * 0.35, 0, 0.45);
        rightArm.rotation.set(-0.75 - Math.sin(phase) * 0.35, 0, -0.45);
      } else if (animId === 'blacksmith_forge') {
        const strike = Math.sin(phase);
        rightArm.rotation.x = -1.1 + strike * 0.95;
        bodyGroup.rotation.x = Math.max(0, strike) * 0.15;
      } else if (animId === 'market_call') {
        rightArm.rotation.set(-2.3, 0, -0.25 + Math.sin(phase * 2) * 0.35);
        headGroup.rotation.y = Math.sin(phase) * 0.25;
      }
    };
  }

  // ==========================================================================
  // 7. RIDEABLE HORSE (סוס רכיבה אצילי — עם קינמטיקה מ־horsePhysicsSystem)
  // ==========================================================================
  else if (entityId === 'rideable_horse') {
    const coatMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x7c3f1d, roughness: 0.62 }));
    const maneMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x26150b, roughness: 0.78 }));
    const saddleMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5 }));
    const hoofMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.45 }));
    const goldMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.85 })
    );

    const bodyPivot = new THREE.Group();
    bodyPivot.position.set(0, 1.18, 0);

    // Sculpted Barrel Chest, Flank & Croup
    const torso = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.36, 0.38, 1.32, 14)),
      coatMat
    );
    torso.rotation.x = Math.PI / 2;
    const chestSphere = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.38, 14, 12)), coatMat);
    chestSphere.position.set(0, 0.02, 0.56);
    const rumpSphere = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.37, 14, 12)), coatMat);
    rumpSphere.position.set(0, 0.04, -0.56);

    // Saddle, Blanket & Stirrups
    const saddleBlanket = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.82, 0.28, 0.68)),
      saddleMat
    );
    saddleBlanket.position.set(0, 0.28, 0.05);
    const pommel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.16, 0.14)), goldMat);
    pommel.position.set(0, 0.44, 0.3);
    const cantle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.14, 0.16)), saddleMat);
    cantle.position.set(0, 0.43, -0.2);

    // Neck & Head Group
    const neckPivot = new THREE.Group();
    neckPivot.position.set(0, 0.24, 0.68);
    neckPivot.rotation.x = 0.32;
    const neckMesh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.18, 0.28, 0.78, 12)),
      coatMat
    );
    neckMesh.position.set(0, 0.32, 0.12);
    const maneMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.72, 0.18)), maneMat);
    maneMesh.position.set(0, 0.34, 0.0);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.68, 0.22);
    headPivot.rotation.x = -0.16;
    const skull = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.26, 0.26, 0.38)), coatMat);
    const muzzle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.19, 0.18, 0.36)), coatMat);
    muzzle.position.set(0, -0.05, 0.28);
    const bridle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.21, 0.2, 0.06)), goldMat);
    bridle.position.set(0, -0.04, 0.22);
    const earGeo = trackGeo(new THREE.ConeGeometry(0.048, 0.16, 6));
    const earL = new THREE.Mesh(earGeo, coatMat);
    earL.position.set(-0.09, 0.18, -0.04);
    const earR = new THREE.Mesh(earGeo, coatMat);
    earR.position.set(0.09, 0.18, -0.04);
    headPivot.add(skull, muzzle, bridle, earL, earR);
    neckPivot.add(neckMesh, maneMesh, headPivot);

    // Tail Pivot
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.14, -0.84);
    const tailMesh = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.12, 0.78, 8)),
      maneMat
    );
    tailMesh.rotation.x = Math.PI - 0.25;
    tailMesh.position.set(0, -0.34, -0.1);
    tailPivot.add(tailMesh);

    // 4 Articulated 3-Segment Equine Limbs
    const uLimbGeo = trackGeo(new THREE.CylinderGeometry(0.105, 0.078, 0.56, 10));
    uLimbGeo.translate(0, -0.28, 0);
    const lLimbGeo = trackGeo(new THREE.CylinderGeometry(0.072, 0.056, 0.48, 10));
    lLimbGeo.translate(0, -0.24, 0);
    const hoofGeo = trackGeo(new THREE.CylinderGeometry(0.068, 0.082, 0.14, 10));
    hoofGeo.translate(0, -0.07, 0.01);

    const buildEquineLeg = (lx: number, lz: number) => {
      const upper = new THREE.Group();
      upper.position.set(lx, -0.08, lz);
      upper.add(new THREE.Mesh(uLimbGeo, coatMat));
      const lower = new THREE.Group();
      lower.position.set(0, -0.54, 0);
      lower.add(new THREE.Mesh(lLimbGeo, coatMat));
      const hoof = new THREE.Group();
      hoof.position.set(0, -0.46, 0);
      hoof.add(new THREE.Mesh(hoofGeo, hoofMat));
      lower.add(hoof);
      upper.add(lower);
      bodyPivot.add(upper);
      return { upper, lower, hoof };
    };

    const fl = buildEquineLeg(-0.22, 0.54);
    const fr = buildEquineLeg(0.22, 0.54);
    const bl = buildEquineLeg(-0.22, -0.54);
    const br = buildEquineLeg(0.22, -0.54);

    bodyPivot.add(
      torso,
      chestSphere,
      rumpSphere,
      saddleBlanket,
      pommel,
      cantle,
      neckPivot,
      tailPivot
    );
    root.add(bodyPivot);

    editableRigTargets.weaponNodes.push(tailPivot);
    editableRigTargets.leftWeaponNodes.push(saddleBlanket, pommel, cantle);
    editableRigTargets.rightLimbNodes.push(fr.upper, br.upper);
    editableRigTargets.leftLimbNodes.push(fl.upper, bl.upper);
    editableRigTargets.headNodes.push(neckPivot, headPivot);
    editableRigTargets.bodyNodes.push(bodyPivot);

    customApplySkin = (skin) => {
      coatMat.color.setHex(skin.palette.primaryHex);
      maneMat.color.setHex(skin.palette.secondaryHex);
      saddleMat.color.setHex(skin.palette.accentHex);
    };

    customApplyAnimation = (animId, t, p) => {
      // Static neutral pose
      bodyPivot.position.set(0, 1.18, 0);
      bodyPivot.rotation.set(0, 0, 0);
      neckPivot.rotation.set(0.32, 0, 0);
      headPivot.rotation.set(-0.16, 0, 0);
      tailPivot.rotation.set(0.14, 0, 0);
      for (const leg of [fl, fr, bl, br]) {
        leg.upper.rotation.set(0, 0, 0);
        leg.lower.rotation.set(0, 0, 0);
        leg.hoof.rotation.set(0, 0, 0);
      }

      if (animId === 'none') return;

      if (animId === 'horse_rear') {
        const rear = Math.sin(p * Math.PI);
        bodyPivot.rotation.x = -rear * 0.68;
        bodyPivot.position.y = 1.18 + rear * 0.35;
        fl.upper.rotation.x = -rear * 0.95;
        fl.lower.rotation.x = rear * 0.85;
        fr.upper.rotation.x = -rear * 0.75 + Math.sin(p * Math.PI * 4) * 0.25;
        fr.lower.rotation.x = rear * 0.75;
        bl.upper.rotation.x = rear * 0.55;
        br.upper.rotation.x = rear * 0.55;
        return;
      }

      const simSpeed =
        animId === 'horse_idle'
          ? 0
          : animId === 'horse_walk'
            ? 2.2
            : animId === 'horse_trot'
              ? 4.8
              : 8.5;
      const gaitPhase = p * Math.PI * 2;
      const pose = computeHorseBiomechanicalPose(simSpeed, gaitPhase, t, 0);

      bodyPivot.position.y = 1.18 + pose.bodyLiftY;
      bodyPivot.rotation.x = pose.bodyPitch;
      neckPivot.rotation.x = pose.neckPitch;
      headPivot.rotation.x = pose.headPitch;
      tailPivot.rotation.x = pose.tailPitch;
      tailPivot.rotation.y = pose.tailSwayY;

      const applyLeg = (leg: typeof fl, angles: typeof pose.frontLeft) => {
        leg.upper.rotation.x = angles.upperPitch;
        leg.lower.rotation.x = angles.lowerPitch;
        leg.hoof.rotation.x = angles.hoofPitch;
      };
      applyLeg(fl, pose.frontLeft);
      applyLeg(fr, pose.frontRight);
      applyLeg(bl, pose.backLeft);
      applyLeg(br, pose.backRight);
    };
  }

  // ==========================================================================
  // 8. FOREST DEER / STAG & DOE (אייל היער המלכותי)
  // ==========================================================================
  else if (entityId === 'forest_deer') {
    const coatMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x8c583a, roughness: 0.75 }));
    const antlerMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xd8c8b4, roughness: 0.6 }));
    const noseMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.5 }));

    const deerRoot = new THREE.Group();
    const body = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.28, 0.32, 1.15, 12)),
      coatMat
    );
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.95;

    const tail = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.08, 0.22, 6)), antlerMat);
    tail.position.set(0, 1.02, -0.58);
    tail.rotation.x = -0.5;

    const neckPivot = new THREE.Group();
    neckPivot.position.set(0, 1.12, 0.48);
    const neck = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.12, 0.18, 0.55, 10)),
      coatMat
    );
    neck.position.set(0, 0.22, 0.1);
    neck.rotation.x = 0.35;
    const head = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.22, 0.42)), coatMat);
    head.position.set(0, 0.46, 0.25);
    const nose = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.045, 8, 8)), noseMat);
    nose.position.set(0, 0.46, 0.46);

    const antlersGroup = new THREE.Group();
    const buildAntlerBranch = (side: -1 | 1) => {
      const b = new THREE.Group();
      const mainBeam = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.02, 0.032, 0.52, 6)),
        antlerMat
      );
      mainBeam.position.set(side * 0.14, 0.72, 0.18);
      mainBeam.rotation.z = -side * 0.38;
      mainBeam.rotation.x = -0.2;
      const tine1 = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.022, 0.26, 6)),
        antlerMat
      );
      tine1.position.set(side * 0.22, 0.82, 0.28);
      tine1.rotation.x = 0.45;
      const tine2 = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.022, 0.28, 6)),
        antlerMat
      );
      tine2.position.set(side * 0.28, 0.94, 0.12);
      tine2.rotation.z = -side * 0.55;
      b.add(mainBeam, tine1, tine2);
      return b;
    };
    antlersGroup.add(buildAntlerBranch(-1), buildAntlerBranch(1));
    neckPivot.add(neck, head, nose, antlersGroup);

    const legGeo = trackGeo(new THREE.CylinderGeometry(0.055, 0.04, 0.82, 8));
    legGeo.translate(0, -0.41, 0);
    const fl = new THREE.Mesh(legGeo, coatMat);
    fl.position.set(-0.2, 0.82, 0.42);
    const fr = new THREE.Mesh(legGeo, coatMat);
    fr.position.set(0.2, 0.82, 0.42);
    const bl = new THREE.Mesh(legGeo, coatMat);
    bl.position.set(-0.2, 0.82, -0.42);
    const br = new THREE.Mesh(legGeo, coatMat);
    br.position.set(0.2, 0.82, -0.42);

    deerRoot.add(body, tail, neckPivot, fl, fr, bl, br);
    root.add(deerRoot);

    editableRigTargets.weaponNodes.push(antlersGroup);
    editableRigTargets.leftWeaponNodes.push(tail);
    editableRigTargets.rightLimbNodes.push(fr, br);
    editableRigTargets.leftLimbNodes.push(fl, bl);
    editableRigTargets.headNodes.push(neckPivot);
    editableRigTargets.bodyNodes.push(deerRoot);

    customApplySkin = (skin) => {
      coatMat.color.setHex(skin.palette.primaryHex);
      antlerMat.color.setHex(skin.palette.secondaryHex);
      antlersGroup.visible = skin.palette.hasAntlers !== false;
    };

    customApplyAnimation = (animId, _t, p) => {
      deerRoot.position.set(0, 0, 0);
      deerRoot.rotation.set(0, 0, 0);
      body.position.y = 0.95;
      neckPivot.position.set(0, 1.12, 0.48);
      neckPivot.rotation.set(0, 0, 0);
      for (const l of [fl, fr, bl, br]) {
        l.visible = true;
        l.rotation.set(0, 0, 0);
      }

      if (animId === 'none') return;
      const phase = p * Math.PI * 2;

      if (animId === 'deer_walk') {
        const swing = Math.sin(phase) * 0.36;
        fl.rotation.x = swing;
        br.rotation.x = swing;
        fr.rotation.x = -swing;
        bl.rotation.x = -swing;
        neckPivot.rotation.x = Math.sin(phase * 2) * 0.08;
      } else if (animId === 'deer_graze') {
        neckPivot.rotation.x = 0.65 + Math.sin(phase * 2) * 0.12;
      } else if (animId === 'deer_sleep') {
        body.position.y = 0.38 + Math.sin(phase) * 0.015;
        neckPivot.position.y = 0.55;
        neckPivot.rotation.x = 0.35;
        for (const l of [fl, fr, bl, br]) l.visible = false;
      } else if (animId === 'deer_leap') {
        const arc = Math.sin(p * Math.PI);
        deerRoot.position.y = arc * 0.55;
        deerRoot.rotation.x = -Math.cos(p * Math.PI) * 0.32;
        fl.rotation.x = -arc * 0.65;
        fr.rotation.x = -arc * 0.65;
        bl.rotation.x = arc * 0.65;
        br.rotation.x = arc * 0.65;
      }
    };
  }

  // ==========================================================================
  // 9. GRAZING SHEEP (כבשה רועה בחווה)
  // ==========================================================================
  else if (entityId === 'grazing_sheep') {
    const woolMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.92 }));
    const darkMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x3a322c, roughness: 0.85 }));

    const sheepGroup = new THREE.Group();
    const bodyGeo = trackGeo(new THREE.SphereGeometry(0.45, 14, 12));
    bodyGeo.scale(0.95, 0.85, 1.35);
    const body = new THREE.Mesh(bodyGeo, woolMat);
    body.position.y = 0.58;

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.68, 0.48);
    const head = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.24, 0.36)), darkMat);
    head.position.set(0, 0.06, 0.14);
    const woolCap = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.14, 10, 8)), woolMat);
    woolCap.position.set(0, 0.18, 0.08);
    const earGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.06, 0.08));
    const earL = new THREE.Mesh(earGeo, darkMat);
    earL.position.set(-0.16, 0.1, 0.08);
    earL.rotation.z = 0.35;
    const earR = new THREE.Mesh(earGeo, darkMat);
    earR.position.set(0.16, 0.1, 0.08);
    earR.rotation.z = -0.35;
    headPivot.add(head, woolCap, earL, earR);

    const legGeo = trackGeo(new THREE.CylinderGeometry(0.045, 0.038, 0.42, 8));
    legGeo.translate(0, -0.21, 0);
    const fl = new THREE.Mesh(legGeo, darkMat);
    fl.position.set(-0.16, 0.42, 0.28);
    const fr = new THREE.Mesh(legGeo, darkMat);
    fr.position.set(0.16, 0.42, 0.28);
    const bl = new THREE.Mesh(legGeo, darkMat);
    bl.position.set(-0.16, 0.42, -0.28);
    const br = new THREE.Mesh(legGeo, darkMat);
    br.position.set(0.16, 0.42, -0.28);

    sheepGroup.add(body, headPivot, fl, fr, bl, br);
    root.add(sheepGroup);

    editableRigTargets.weaponNodes.push(earR);
    editableRigTargets.leftWeaponNodes.push(earL);
    editableRigTargets.rightLimbNodes.push(fr, br);
    editableRigTargets.leftLimbNodes.push(fl, bl);
    editableRigTargets.headNodes.push(headPivot);
    editableRigTargets.bodyNodes.push(sheepGroup);

    customApplySkin = (skin) => {
      woolMat.color.setHex(skin.palette.primaryHex);
      darkMat.color.setHex(skin.palette.secondaryHex);
    };

    customApplyAnimation = (animId, _t, p) => {
      sheepGroup.position.set(0, 0, 0);
      sheepGroup.rotation.set(0, 0, 0);
      headPivot.rotation.set(0, 0, 0);
      for (const l of [fl, fr, bl, br]) l.rotation.set(0, 0, 0);

      if (animId === 'none') return;
      const phase = p * Math.PI * 2;

      if (animId === 'sheep_graze_walk') {
        const w = Math.sin(phase) * 0.28;
        fl.rotation.x = w;
        br.rotation.x = w;
        fr.rotation.x = -w;
        bl.rotation.x = -w;
        headPivot.rotation.x = 0.2 + Math.sin(phase * 2) * 0.14;
      } else if (animId === 'sheep_nibble') {
        headPivot.rotation.x = 0.55 + Math.sin(phase * 3) * 0.12;
      } else if (animId === 'sheep_joy_hop') {
        const hop = Math.abs(Math.sin(phase));
        sheepGroup.position.y = hop * 0.28;
        sheepGroup.rotation.x = Math.cos(phase) * 0.18;
      }
    };
  }

  // ==========================================================================
  // 10 & 11. FOREST RABBIT & WOODLAND SQUIRREL (ארנב בר / סנאי העצים)
  // ==========================================================================
  else if (entityId === 'forest_rabbit' || entityId === 'woodland_squirrel') {
    const isRabbit = entityId === 'forest_rabbit';
    const furMat = trackMat(
      new THREE.MeshStandardMaterial({ color: isRabbit ? 0x8d7966 : 0x8c4a27, roughness: 0.85 })
    );
    const tailMat = trackMat(
      new THREE.MeshStandardMaterial({ color: isRabbit ? 0xf7f4ef : 0x7c2d12, roughness: 0.9 })
    );
    const eyeMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 }));

    const critterGroup = new THREE.Group();
    critterGroup.scale.setScalar(1.35);

    const torsoGeo = trackGeo(new THREE.SphereGeometry(0.16, 12, 10));
    torsoGeo.scale(0.88, 0.82, 1.38);
    const torso = new THREE.Mesh(torsoGeo, furMat);
    torso.position.set(0, 0.18, 0);

    const haunchGeo = trackGeo(new THREE.SphereGeometry(0.14, 10, 10));
    haunchGeo.scale(1.08, 0.95, 1.15);
    const haunch = new THREE.Mesh(haunchGeo, furMat);
    haunch.position.set(0, 0.19, -0.1);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.28, 0.18);
    const headGeo = trackGeo(new THREE.SphereGeometry(0.11, 10, 10));
    headGeo.scale(0.88, 0.88, 1.18);
    headGroup.add(new THREE.Mesh(headGeo, furMat));

    const eyeGeo = trackGeo(new THREE.SphereGeometry(0.022, 8, 8));
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.075, 0.03, 0.06);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.075, 0.03, 0.06);
    headGroup.add(eyeL, eyeR);

    const earGeo = trackGeo(
      isRabbit
        ? new THREE.CylinderGeometry(0.015, 0.032, 0.24, 8)
        : new THREE.CylinderGeometry(0.012, 0.024, 0.09, 8)
    );
    earGeo.translate(0, isRabbit ? 0.12 : 0.045, 0);
    const leftEar = new THREE.Mesh(earGeo, furMat);
    leftEar.position.set(-0.048, 0.08, -0.02);
    leftEar.rotation.z = 0.18;
    const rightEar = new THREE.Mesh(earGeo, furMat);
    rightEar.position.set(0.048, 0.08, -0.02);
    rightEar.rotation.z = -0.18;
    headGroup.add(leftEar, rightEar);

    let tail: THREE.Mesh;
    if (isRabbit) {
      tail = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.065, 10, 10)), tailMat);
      tail.position.set(0, 0.22, -0.28);
    } else {
      const sqTailGeo = trackGeo(new THREE.SphereGeometry(0.13, 10, 10));
      sqTailGeo.scale(0.55, 1.65, 0.95);
      tail = new THREE.Mesh(sqTailGeo, tailMat);
      tail.position.set(0, 0.34, -0.22);
      tail.rotation.x = 0.52;
    }

    critterGroup.add(torso, haunch, headGroup, tail);
    root.add(critterGroup);

    editableRigTargets.weaponNodes.push(tail);
    editableRigTargets.leftWeaponNodes.push(haunch);
    editableRigTargets.rightLimbNodes.push(rightEar);
    editableRigTargets.leftLimbNodes.push(leftEar);
    editableRigTargets.headNodes.push(headGroup);
    editableRigTargets.bodyNodes.push(critterGroup);

    customApplySkin = (skin) => {
      furMat.color.setHex(skin.palette.primaryHex);
      tailMat.color.setHex(skin.palette.secondaryHex);
    };

    customApplyAnimation = (animId, _t, p) => {
      critterGroup.position.set(0, 0, 0);
      critterGroup.rotation.set(0, 0, 0);
      headGroup.rotation.set(0, 0, 0);
      leftEar.rotation.x = -0.15;
      rightEar.rotation.x = -0.15;
      if (!isRabbit) tail.rotation.x = 0.52;

      if (animId === 'none') return;
      const phase = p * Math.PI * 2;

      if (animId === 'rabbit_sniff' || animId === 'squirrel_tail_flick') {
        headGroup.rotation.x = Math.sin(phase * 2) * 0.16;
        leftEar.rotation.x = -0.15 + Math.sin(phase * 3) * 0.22;
        rightEar.rotation.x = -0.15 + Math.cos(phase * 3) * 0.22;
        if (!isRabbit) tail.rotation.x = 0.52 + Math.sin(phase * 4) * 0.28;
      } else if (animId === 'rabbit_alert') {
        headGroup.rotation.x = -0.28;
        leftEar.rotation.x = 0.12;
        rightEar.rotation.x = 0.12;
        critterGroup.position.y = 0.04;
      } else if (animId === 'rabbit_hop' || animId === 'squirrel_forage_hop') {
        const hop = Math.abs(Math.sin(phase));
        critterGroup.position.y = hop * 0.24;
        critterGroup.rotation.x = -Math.sin(phase) * 0.28;
        leftEar.rotation.x = -0.45;
        rightEar.rotation.x = -0.45;
      } else if (animId === 'squirrel_spiral_climb') {
        critterGroup.position.set(Math.sin(phase) * 0.18, Math.sin(phase * 0.5) * 0.15, Math.cos(phase) * 0.18);
        critterGroup.rotation.y = phase + Math.PI / 2;
        tail.rotation.x = 0.65 + Math.sin(phase * 4) * 0.25;
      }
    };
  }

  // ==========================================================================
  // 12 & 13. GOLDEN MOUNTAIN EAGLE & FLOCK BIRD (עיט הרים / ציפור שיר)
  // ==========================================================================
  else if (entityId === 'mountain_eagle' || entityId === 'flock_bird') {
    const isEagle = entityId === 'mountain_eagle';
    const bodyMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: isEagle ? 0x3b2616 : 0x3a4450,
        roughness: 0.6,
        side: THREE.DoubleSide,
      })
    );
    const headMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: isEagle ? 0xc8963e : 0xc8beae,
        roughness: 0.55,
      })
    );
    const beakMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4 }));

    const birdGroup = new THREE.Group();
    birdGroup.position.y = isEagle ? 0.85 : 0.65;
    birdGroup.scale.setScalar(isEagle ? 1.35 : 1.75);

    const bodyGeo = trackGeo(new THREE.ConeGeometry(0.14, 0.56, 10));
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.12, 12, 10)), headMat);
    head.position.set(0, 0.04, 0.26);
    const beak = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.04, 0.14, 6)), beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.02, 0.4);

    const tailGeo = trackGeo(new THREE.ConeGeometry(0.18, 0.28, 6));
    tailGeo.rotateX(-Math.PI / 2);
    tailGeo.scale(1.3, 0.22, 1.0);
    const tailFan = new THREE.Mesh(tailGeo, bodyMat);
    tailFan.position.set(0, 0.02, -0.34);

    const wingInnerGeo = trackGeo(new THREE.BoxGeometry(isEagle ? 0.85 : 0.45, 0.03, 0.26));
    wingInnerGeo.translate(isEagle ? -0.42 : -0.22, 0, 0);
    const leftWing = new THREE.Group();
    leftWing.position.set(-0.08, 0.04, 0.04);
    leftWing.add(new THREE.Mesh(wingInnerGeo, bodyMat));

    const rightWingGeo = trackGeo(new THREE.BoxGeometry(isEagle ? 0.85 : 0.45, 0.03, 0.26));
    rightWingGeo.translate(isEagle ? 0.42 : 0.22, 0, 0);
    const rightWing = new THREE.Group();
    rightWing.position.set(0.08, 0.04, 0.04);
    rightWing.add(new THREE.Mesh(rightWingGeo, bodyMat));

    birdGroup.add(body, head, beak, tailFan, leftWing, rightWing);
    root.add(birdGroup);

    editableRigTargets.weaponNodes.push(tailFan);
    editableRigTargets.leftWeaponNodes.push(beak);
    editableRigTargets.rightLimbNodes.push(rightWing);
    editableRigTargets.leftLimbNodes.push(leftWing);
    editableRigTargets.headNodes.push(head);
    editableRigTargets.bodyNodes.push(birdGroup);

    customApplySkin = (skin) => {
      bodyMat.color.setHex(skin.palette.primaryHex);
      headMat.color.setHex(skin.palette.secondaryHex);
      beakMat.color.setHex(skin.palette.accentHex);
    };

    customApplyAnimation = (animId, _t, p) => {
      birdGroup.position.set(0, isEagle ? 0.85 : 0.65, 0);
      birdGroup.rotation.set(0, 0, 0);
      leftWing.rotation.set(0, 0, 0.06);
      rightWing.rotation.set(0, 0, -0.06);
      tailFan.scale.x = 1.1;

      if (animId === 'none') return;
      const phase = p * Math.PI * 2;

      if (animId === 'eagle_soar' || animId === 'bird_cruise') {
        const flap = Math.sin(phase) * (isEagle ? 0.35 : 0.55);
        leftWing.rotation.z = flap;
        rightWing.rotation.z = -flap;
        birdGroup.position.y = (isEagle ? 0.85 : 0.65) + Math.cos(phase) * 0.08;
      } else if (animId === 'eagle_dive') {
        birdGroup.rotation.x = 0.45;
        leftWing.rotation.set(0, 0.35, -0.2);
        rightWing.rotation.set(0, -0.35, 0.2);
      } else if (animId === 'eagle_power_flap' || animId === 'bird_startled') {
        const flap = Math.sin(phase * 2) * 0.72;
        leftWing.rotation.z = flap;
        rightWing.rotation.z = -flap;
        tailFan.scale.x = 1.45;
      } else if (animId === 'bird_glide_bank') {
        birdGroup.rotation.z = Math.sin(phase) * 0.38;
        birdGroup.rotation.y = Math.cos(phase) * 0.25;
      }
    };
  }

  // ==========================================================================
  // 14. HARBOR SEAGULL (שחף הנמל הלבן)
  // ==========================================================================
  else if (entityId === 'harbor_seagull') {
    const plumageMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 }));
    const mantleMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.55, side: THREE.DoubleSide })
    );
    const wingTipMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 }));
    const beakMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.38 }));
    const eyeMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 }));

    const gullGroup = new THREE.Group();
    gullGroup.position.y = 0.72;
    gullGroup.scale.setScalar(1.65);

    const torsoGeo = trackGeo(new THREE.SphereGeometry(0.14, 14, 12));
    torsoGeo.scale(0.95, 0.88, 2.05);
    const torso = new THREE.Mesh(torsoGeo, plumageMat);

    const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.105, 12, 10)), plumageMat);
    head.position.set(0, 0.08, 0.26);

    const eyeGeo = trackGeo(new THREE.SphereGeometry(0.018, 8, 8));
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.075, 0.1, 0.31);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.075, 0.1, 0.31);

    const beak = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.032, 0.16, 8)), beakMat);
    beak.rotation.x = Math.PI / 2 + 0.08;
    beak.position.set(0, 0.06, 0.41);

    const tailGeo = trackGeo(new THREE.ConeGeometry(0.15, 0.24, 6));
    tailGeo.rotateX(-Math.PI / 2);
    tailGeo.scale(1.25, 0.2, 1.0);
    const tail = new THREE.Mesh(tailGeo, plumageMat);
    tail.position.set(0, 0.02, -0.32);

    const buildGullWing = (side: -1 | 1) => {
      const wingRoot = new THREE.Group();
      wingRoot.position.set(side * 0.1, 0.05, 0.04);
      const innerGeo = trackGeo(new THREE.BoxGeometry(0.36, 0.026, 0.2));
      innerGeo.translate(side * 0.18, 0, 0);
      const innerMesh = new THREE.Mesh(innerGeo, mantleMat);

      const outerPivot = new THREE.Group();
      outerPivot.position.set(side * 0.35, 0, 0);
      const outerGeo = trackGeo(new THREE.BoxGeometry(0.28, 0.02, 0.15));
      outerGeo.translate(side * 0.14, 0, -0.02);
      const outerMesh = new THREE.Mesh(outerGeo, wingTipMat);
      outerPivot.add(outerMesh);

      wingRoot.add(innerMesh, outerPivot);
      return { wingRoot, outerPivot };
    };

    const leftWing = buildGullWing(-1);
    const rightWing = buildGullWing(1);

    const footGeo = trackGeo(new THREE.BoxGeometry(0.04, 0.08, 0.07));
    const footL = new THREE.Mesh(footGeo, beakMat);
    footL.position.set(-0.06, -0.13, -0.04);
    const footR = new THREE.Mesh(footGeo, beakMat);
    footR.position.set(0.06, -0.13, -0.04);

    gullGroup.add(
      torso,
      head,
      eyeL,
      eyeR,
      beak,
      tail,
      leftWing.wingRoot,
      rightWing.wingRoot,
      footL,
      footR
    );
    root.add(gullGroup);

    editableRigTargets.weaponNodes.push(tail);
    editableRigTargets.leftWeaponNodes.push(beak);
    editableRigTargets.rightLimbNodes.push(rightWing.wingRoot);
    editableRigTargets.leftLimbNodes.push(leftWing.wingRoot);
    editableRigTargets.headNodes.push(head);
    editableRigTargets.bodyNodes.push(gullGroup);

    customApplySkin = (skin) => {
      plumageMat.color.setHex(skin.palette.primaryHex);
      mantleMat.color.setHex(skin.palette.secondaryHex);
      beakMat.color.setHex(skin.palette.accentHex);
      if (skin.palette.trimHex) {
        wingTipMat.color.setHex(skin.palette.trimHex);
      }
    };

    customApplyAnimation = (animId, _t, p) => {
      gullGroup.position.set(0, 0.72, 0);
      gullGroup.rotation.set(0, 0, 0);
      leftWing.wingRoot.rotation.set(0, 0, 0.08);
      rightWing.wingRoot.rotation.set(0, 0, -0.08);
      leftWing.outerPivot.rotation.set(0, 0, -0.12);
      rightWing.outerPivot.rotation.set(0, 0, 0.12);

      if (animId === 'none') return;
      const phase = p * Math.PI * 2;

      if (animId === 'seagull_harbor_soar') {
        const flap = Math.sin(phase) * 0.42;
        leftWing.wingRoot.rotation.z = flap;
        rightWing.wingRoot.rotation.z = -flap;
        leftWing.outerPivot.rotation.z = Math.cos(phase) * 0.25 - 0.1;
        rightWing.outerPivot.rotation.z = -Math.cos(phase) * 0.25 + 0.1;
        gullGroup.position.y = 0.72 + Math.cos(phase) * 0.07;
      } else if (animId === 'seagull_wave_skim') {
        gullGroup.rotation.z = Math.sin(phase) * 0.42;
        gullGroup.position.x = Math.cos(phase) * 0.18;
        gullGroup.position.y = 0.64 + Math.sin(phase * 2) * 0.05;
      } else if (animId === 'seagull_fish_dive') {
        const dive = Math.sin(phase);
        gullGroup.rotation.x = dive * 0.55;
        gullGroup.position.y = 0.72 - dive * 0.22;
        leftWing.wingRoot.rotation.set(0, 0.35, -0.22);
        rightWing.wingRoot.rotation.set(0, -0.35, 0.22);
      }
    };
  }

  // ==========================================================================
  // 15. LAKESIDE KOI FISH — STANDALONE (דג קוי מלכותי)
  // ==========================================================================
  else if (entityId === 'koi_fish') {
    const koiBodyMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xff6b2b, roughness: 0.22, metalness: 0.12 })
    );
    const koiFinMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.28,
        side: THREE.DoubleSide,
      })
    );
    const koiSpotMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.25 })
    );
    const eyeMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15 }));
    const rippleMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.35,
        roughness: 0.2,
      })
    );

    const koiGroup = new THREE.Group();
    koiGroup.position.y = 0.44;
    koiGroup.scale.setScalar(1.35);

    // Sculpted Koi Carp Torso & Head
    const kBodyGeo = trackGeo(new THREE.ConeGeometry(0.2, 0.82, 16));
    kBodyGeo.rotateX(Math.PI / 2);
    kBodyGeo.scale(0.88, 1.05, 1.0);
    const kBody = new THREE.Mesh(kBodyGeo, koiBodyMat);

    const kHeadGeo = trackGeo(new THREE.SphereGeometry(0.19, 14, 12));
    kHeadGeo.scale(0.88, 0.96, 1.25);
    const kHead = new THREE.Mesh(kHeadGeo, koiBodyMat);
    kHead.position.z = 0.36;

    // Decorative dorsal pattern patches
    const patch1 = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.13, 10, 8)), koiSpotMat);
    patch1.scale.set(0.95, 0.45, 1.35);
    patch1.position.set(0, 0.15, 0.18);
    const patch2 = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.1, 10, 8)), koiSpotMat);
    patch2.scale.set(0.85, 0.4, 1.2);
    patch2.position.set(0, 0.12, -0.08);

    // Eyes & Carp Barbels (Whiskers)
    const eyeGeo = trackGeo(new THREE.SphereGeometry(0.026, 8, 8));
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.14, 0.05, 0.44);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.14, 0.05, 0.44);

    const barbelGeo = trackGeo(new THREE.ConeGeometry(0.014, 0.12, 6));
    const barbelL = new THREE.Mesh(barbelGeo, koiFinMat);
    barbelL.position.set(-0.1, -0.05, 0.56);
    barbelL.rotation.set(0.6, 0, 0.45);
    const barbelR = new THREE.Mesh(barbelGeo, koiFinMat);
    barbelR.position.set(0.1, -0.05, 0.56);
    barbelR.rotation.set(0.6, 0, -0.45);

    // Dorsal Fin
    const dorsalGeo = trackGeo(new THREE.BoxGeometry(0.025, 0.18, 0.38));
    const dorsalFin = new THREE.Mesh(dorsalGeo, koiFinMat);
    dorsalFin.position.set(0, 0.22, 0.02);
    dorsalFin.rotation.x = -0.22;

    // Articulated Tail Peduncle & Double-Lobed Caudal Fin
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0, -0.38);
    const kTailGeo = trackGeo(new THREE.ConeGeometry(0.24, 0.38, 6));
    kTailGeo.rotateX(-Math.PI / 2);
    kTailGeo.scale(0.28, 1.25, 1.0);
    const kTail = new THREE.Mesh(kTailGeo, koiFinMat);
    kTail.position.z = -0.14;
    tailPivot.add(kTail);

    // Pectoral & Pelvic Fins
    const sideFinGeo = trackGeo(new THREE.BoxGeometry(0.26, 0.02, 0.16));
    sideFinGeo.translate(-0.12, 0, 0);
    const finL = new THREE.Mesh(sideFinGeo, koiFinMat);
    finL.position.set(-0.14, -0.06, 0.22);
    finL.rotation.y = 0.35;

    const sideFinRGeo = trackGeo(new THREE.BoxGeometry(0.26, 0.02, 0.16));
    sideFinRGeo.translate(0.12, 0, 0);
    const finR = new THREE.Mesh(sideFinRGeo, koiFinMat);
    finR.position.set(0.14, -0.06, 0.22);
    finR.rotation.y = -0.35;

    // Subtle Pond Water Ripple Ring on the Floor
    const rippleRing = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(0.32, 0.52, 28)),
      rippleMat
    );
    rippleRing.rotation.x = -Math.PI / 2;
    rippleRing.position.y = 0.03;

    koiGroup.add(
      kBody,
      kHead,
      patch1,
      patch2,
      eyeL,
      eyeR,
      barbelL,
      barbelR,
      dorsalFin,
      tailPivot,
      finL,
      finR
    );
    root.add(koiGroup, rippleRing);

    editableRigTargets.weaponNodes.push(tailPivot);
    editableRigTargets.leftWeaponNodes.push(dorsalFin);
    editableRigTargets.rightLimbNodes.push(finR);
    editableRigTargets.leftLimbNodes.push(finL);
    editableRigTargets.headNodes.push(kHead);
    editableRigTargets.bodyNodes.push(koiGroup);

    customApplySkin = (skin) => {
      koiBodyMat.color.setHex(skin.palette.primaryHex);
      koiFinMat.color.setHex(skin.palette.secondaryHex);
      koiSpotMat.color.setHex(skin.palette.accentHex);
    };

    customApplyAnimation = (animId, _t, p) => {
      koiGroup.position.set(0, 0.44, 0);
      koiGroup.rotation.set(0, 0, 0);
      tailPivot.rotation.set(0, 0, 0);
      finL.rotation.set(0, 0.35, -0.15);
      finR.rotation.set(0, -0.35, 0.15);
      rippleRing.scale.setScalar(1.0);

      if (animId === 'none') return;
      const phase = p * Math.PI * 2;

      if (animId === 'koi_pond_swim') {
        koiGroup.rotation.y = Math.sin(phase) * 0.22;
        koiGroup.position.x = Math.cos(phase) * 0.08;
        tailPivot.rotation.y = Math.sin(phase * 2 - 0.8) * 0.48;
        finL.rotation.z = -0.15 + Math.sin(phase * 2) * 0.22;
        finR.rotation.z = 0.15 - Math.sin(phase * 2) * 0.22;
        rippleRing.scale.setScalar(1.0 + Math.sin(phase * 2) * 0.12);
      } else if (animId === 'koi_fast_dart') {
        koiGroup.rotation.y = Math.sin(phase * 2) * 0.32;
        koiGroup.rotation.z = Math.cos(phase * 2) * 0.12;
        tailPivot.rotation.y = Math.sin(phase * 4) * 0.65;
        finL.rotation.z = -0.2 + Math.sin(phase * 4) * 0.3;
        finR.rotation.z = 0.2 - Math.sin(phase * 4) * 0.3;
      } else if (animId === 'koi_surface_feed') {
        const rise = Math.sin(phase) * 0.5 + 0.5;
        koiGroup.position.y = 0.44 + rise * 0.16;
        koiGroup.rotation.x = -rise * 0.35;
        tailPivot.rotation.y = Math.sin(phase * 3) * 0.4;
        rippleRing.scale.setScalar(0.85 + rise * 0.45);
      }
    };
  }

  // ==========================================================================
  // 16. MEADOW BUTTERFLY — STANDALONE (פרפר האחו הזוהר)
  // ==========================================================================
  else if (entityId === 'meadow_butterfly') {
    const forewingMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x22d3ee,
        emissiveIntensity: 0.38,
        roughness: 0.3,
        side: THREE.DoubleSide,
      })
    );
    const hindwingMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x67e8f9,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.28,
        roughness: 0.35,
        side: THREE.DoubleSide,
      })
    );
    const bodyMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 }));
    const flowerStemMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 })
    );
    const flowerPetalMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xfdf2f8, roughness: 0.55 })
    );

    // Subtle Meadow Flower Perch on Stage Floor
    const flowerGroup = new THREE.Group();
    const stem = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.018, 0.024, 0.42, 8)),
      flowerStemMat
    );
    stem.position.y = 0.21;
    const flowerCenter = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.055, 10, 8)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 }))
    );
    flowerCenter.position.y = 0.42;
    flowerGroup.add(stem, flowerCenter);
    for (let pIdx = 0; pIdx < 6; pIdx++) {
      const ang = (pIdx / 6) * Math.PI * 2;
      const petal = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.055, 8, 6)),
        flowerPetalMat
      );
      petal.scale.set(0.8, 0.25, 1.5);
      petal.position.set(Math.sin(ang) * 0.08, 0.42, Math.cos(ang) * 0.08);
      petal.rotation.y = ang;
      flowerGroup.add(petal);
    }

    const bflyGroup = new THREE.Group();
    bflyGroup.position.set(0, 0.56, 0);
    bflyGroup.scale.setScalar(1.55);

    // Thorax, Abdomen, Head & Antennae
    const thorax = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.048, 10, 10)), bodyMat);
    thorax.scale.set(0.85, 0.85, 1.6);
    const abdomen = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.032, 0.018, 0.26, 10)),
      bodyMat
    );
    abdomen.rotation.x = Math.PI / 2;
    abdomen.position.set(0, -0.01, -0.16);
    const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.038, 10, 10)), bodyMat);
    head.position.set(0, 0.01, 0.09);

    const antGeo = trackGeo(new THREE.CylinderGeometry(0.004, 0.006, 0.16, 6));
    antGeo.translate(0, 0.08, 0);
    const antL = new THREE.Mesh(antGeo, bodyMat);
    antL.position.set(-0.018, 0.03, 0.1);
    antL.rotation.set(0.65, 0, 0.38);
    const antR = new THREE.Mesh(antGeo, bodyMat);
    antR.position.set(0.018, 0.03, 0.1);
    antR.rotation.set(0.65, 0, -0.38);

    // Left & Right Articulated Wing Pairs (Forewing + Hindwing + Accent Spot)
    const buildButterflyWingSide = (side: -1 | 1) => {
      const wingPivot = new THREE.Group();
      wingPivot.position.set(side * 0.03, 0.02, 0);

      const foreGeo = trackGeo(new THREE.CircleGeometry(0.24, 16));
      foreGeo.scale(1.15, 0.78, 1);
      foreGeo.rotateX(-Math.PI / 2);
      foreGeo.translate(side * 0.2, 0, 0.07);
      const foreMesh = new THREE.Mesh(foreGeo, forewingMat);

      const hindGeo = trackGeo(new THREE.CircleGeometry(0.17, 14));
      hindGeo.scale(1.0, 0.95, 1);
      hindGeo.rotateX(-Math.PI / 2);
      hindGeo.translate(side * 0.14, -0.005, -0.11);
      const hindMesh = new THREE.Mesh(hindGeo, hindwingMat);

      const spotGeo = trackGeo(new THREE.CircleGeometry(0.05, 12));
      spotGeo.rotateX(-Math.PI / 2);
      spotGeo.translate(side * 0.24, 0.005, 0.09);
      const spotMesh = new THREE.Mesh(spotGeo, bodyMat);

      wingPivot.add(foreMesh, hindMesh, spotMesh);
      return wingPivot;
    };

    const leftWingPivot = buildButterflyWingSide(-1);
    const rightWingPivot = buildButterflyWingSide(1);

    bflyGroup.add(thorax, abdomen, head, antL, antR, leftWingPivot, rightWingPivot);
    root.add(flowerGroup, bflyGroup);

    editableRigTargets.weaponNodes.push(antR);
    editableRigTargets.leftWeaponNodes.push(antL);
    editableRigTargets.rightLimbNodes.push(rightWingPivot);
    editableRigTargets.leftLimbNodes.push(leftWingPivot);
    editableRigTargets.headNodes.push(head);
    editableRigTargets.bodyNodes.push(bflyGroup);

    customApplySkin = (skin) => {
      forewingMat.color.setHex(skin.palette.primaryHex);
      hindwingMat.color.setHex(skin.palette.secondaryHex);
      bodyMat.color.setHex(skin.palette.accentHex);
      if (skin.palette.emissiveHex) {
        forewingMat.emissive.setHex(skin.palette.emissiveHex);
        hindwingMat.emissive.setHex(skin.palette.primaryHex);
      }
    };

    customApplyAnimation = (animId, _t, p) => {
      bflyGroup.position.set(0, 0.56, 0);
      bflyGroup.rotation.set(0, 0, 0);
      leftWingPivot.rotation.set(0, 0, -0.18);
      rightWingPivot.rotation.set(0, 0, 0.18);

      if (animId === 'none') return;
      const phase = p * Math.PI * 2;

      if (animId === 'butterfly_meadow_flutter') {
        const flap = Math.sin(phase * 3) * 0.78;
        leftWingPivot.rotation.z = -flap;
        rightWingPivot.rotation.z = flap;
        bflyGroup.position.y = 0.64 + Math.sin(phase) * 0.08;
        bflyGroup.rotation.x = Math.cos(phase) * 0.12;
      } else if (animId === 'butterfly_flower_bask') {
        const fold = (Math.sin(phase) * 0.5 + 0.5) * 1.15;
        leftWingPivot.rotation.z = -fold;
        rightWingPivot.rotation.z = fold;
        bflyGroup.position.y = 0.5;
      } else if (animId === 'butterfly_spiral_dance') {
        const flap = Math.sin(phase * 4) * 0.85;
        leftWingPivot.rotation.z = -flap;
        rightWingPivot.rotation.z = flap;
        bflyGroup.position.set(
          Math.sin(phase) * 0.18,
          0.68 + Math.sin(phase * 2) * 0.1,
          Math.cos(phase) * 0.18
        );
        bflyGroup.rotation.y = phase + Math.PI / 2;
      }
    };
  }

  // ==========================================================================
  // 15. IMPERIAL SKY DRAGON — 22 SEGMENTS (דרקון השמיים הקיסרי)
  // ==========================================================================
  else if (entityId === 'imperial_sky_dragon') {
    const scaleMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.85 })
    );
    const spineMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.45 }));
    const hornMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 }));
    const eyeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff3311,
        emissive: 0xff3311,
        emissiveIntensity: 1.5,
      })
    );

    const dragonContainer = new THREE.Group();
    dragonContainer.position.set(0, 1.35, 1.8);
    dragonContainer.scale.setScalar(0.24);

    const headGroup = new THREE.Group();
    const snout = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.75, 1.15, 2.35)), scaleMat);
    const jaw = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.5, 0.42, 2.0)), spineMat);
    jaw.position.set(0, -0.58, 0.15);
    headGroup.add(snout, jaw);

    const hornGeo = trackGeo(new THREE.ConeGeometry(0.22, 1.95, 6));
    const eyeGeo = trackGeo(new THREE.SphereGeometry(0.22, 8, 8));
    const whiskerGeo = trackGeo(new THREE.CylinderGeometry(0.04, 0.02, 2.4, 5));
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(hornGeo, hornMat);
      horn.position.set(side * 0.65, 0.95, -0.5);
      horn.rotation.set(-0.55, 0, side * -0.28);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.72, 0.25, 0.78);
      const whisker = new THREE.Mesh(whiskerGeo, scaleMat);
      whisker.position.set(side * 0.85, -0.1, 1.1);
      whisker.rotation.set(0.3, 0, side * 1.15);
      headGroup.add(horn, eye, whisker);
    }
    dragonContainer.add(headGroup);

    const segGeo = trackGeo(new THREE.SphereGeometry(0.88, 10, 8));
    const finGeo = trackGeo(new THREE.ConeGeometry(0.28, 0.95, 4));
    const legGeo = trackGeo(new THREE.CylinderGeometry(0.2, 0.12, 1.45, 6));
    const segments: THREE.Group[] = [];
    const numSegments = 22;

    for (let s = 0; s < numSegments; s++) {
      const seg = new THREE.Group();
      const taper = Math.max(0.25, 1.0 - (s / numSegments) * 0.72);
      const bodyBall = new THREE.Mesh(segGeo, scaleMat);
      bodyBall.scale.set(taper, taper * 0.9, taper * 1.25);
      const dorsalFin = new THREE.Mesh(finGeo, spineMat);
      dorsalFin.position.set(0, 0.85 * taper, 0);
      dorsalFin.rotation.x = -0.35;
      dorsalFin.scale.setScalar(taper);
      seg.add(bodyBall, dorsalFin);

      if (s === 4 || s === 13) {
        for (const side of [-1, 1]) {
          const leg = new THREE.Mesh(legGeo, scaleMat);
          leg.position.set(side * 0.85 * taper, -0.65 * taper, 0);
          leg.rotation.set(0.4, 0, side * 0.45);
          seg.add(leg);
        }
      }
      seg.position.set(0, 0, -(s + 1) * 0.95);
      dragonContainer.add(seg);
      segments.push(seg);
    }

    root.add(dragonContainer);

    editableRigTargets.weaponNodes.push(jaw);
    editableRigTargets.leftWeaponNodes.push(snout);
    editableRigTargets.rightLimbNodes.push(...segments.slice(0, 6));
    editableRigTargets.leftLimbNodes.push(...segments.slice(6, 14));
    editableRigTargets.headNodes.push(headGroup);
    editableRigTargets.bodyNodes.push(dragonContainer);

    customApplySkin = (skin) => {
      scaleMat.color.setHex(skin.palette.primaryHex);
      spineMat.color.setHex(skin.palette.secondaryHex);
      hornMat.color.setHex(skin.palette.accentHex);
      if (skin.palette.emissiveHex) {
        eyeMat.color.setHex(skin.palette.emissiveHex);
        eyeMat.emissive.setHex(skin.palette.emissiveHex);
      }
    };

    customApplyAnimation = (animId, _t, p) => {
      headGroup.position.set(0, 0, 0);
      headGroup.rotation.set(0, 0, 0);
      jaw.rotation.x = 0;
      for (let s = 0; s < segments.length; s++) {
        segments[s].position.set(0, 0, -(s + 1) * 0.95);
        segments[s].rotation.set(0, 0, 0);
      }

      if (animId === 'none') return;
      const phase = p * Math.PI * 2;

      if (animId === 'dragon_sky_flight') {
        headGroup.position.y = Math.sin(phase) * 0.45;
        headGroup.rotation.x = Math.cos(phase) * 0.16;
        for (let s = 0; s < segments.length; s++) {
          const wave = phase - (s + 1) * 0.38;
          segments[s].position.set(
            Math.sin(wave * 0.7) * 0.65,
            Math.sin(wave) * 0.75,
            -(s + 1) * 0.95
          );
          segments[s].rotation.x = Math.cos(wave) * 0.22;
          segments[s].rotation.y = Math.sin(wave * 0.7) * 0.18;
        }
      } else if (animId === 'dragon_coiled_hover') {
        for (let s = 0; s < segments.length; s++) {
          const ang = phase + s * 0.32;
          const rad = 3.2;
          segments[s].position.set(
            Math.sin(ang) * rad,
            Math.cos(ang * 2) * 0.5 - s * 0.18,
            Math.cos(ang) * rad - 4.0
          );
        }
      } else if (animId === 'dragon_roar_surge') {
        headGroup.rotation.x = -0.35;
        jaw.rotation.x = 0.35 + Math.sin(phase * 3) * 0.15;
        for (let s = 0; s < segments.length; s++) {
          const wave = phase * 2 - (s + 1) * 0.45;
          segments[s].position.y = Math.sin(wave) * 0.9;
        }
      }
    };
  }

  // ==========================================================================
  // 16. COLOSSAL DWARVEN KING GUARDIAN STATUE (פסל שומר מלך הגמדים הענק)
  // ==========================================================================
  else if (entityId === 'dwarven_king_statue') {
    const stoneMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x6e6a64, roughness: 0.75 }));
    const bronzeMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x9c6631, roughness: 0.32, metalness: 0.78 })
    );
    const goldMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.22, metalness: 0.88 })
    );
    const eyeGlowMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffb732,
        emissive: 0xff9d00,
        emissiveIntensity: 1.5,
      })
    );

    const statueGroup = new THREE.Group();
    statueGroup.scale.setScalar(0.32);

    const pedestal = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.8, 1.4, 2.8)), stoneMat);
    pedestal.position.y = 0.7;
    const torso = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.1, 1.35, 3.2, 8)),
      stoneMat
    );
    torso.position.y = 3.0;
    const belt = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.26, 1.26, 0.42, 8)),
      goldMat
    );
    belt.position.y = 2.4;

    const head = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.3, 1.3, 1.3)), stoneMat);
    head.position.y = 5.1;
    const helm = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.95, 1.25, 8)), bronzeMat);
    helm.position.y = 6.1;
    const crest = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.85, 1.5)), goldMat);
    crest.position.y = 6.35;

    const eyeGeo = trackGeo(new THREE.BoxGeometry(0.22, 0.1, 0.1));
    const eyeL = new THREE.Mesh(eyeGeo, eyeGlowMat);
    eyeL.position.set(-0.3, 5.25, 0.66);
    const eyeR = new THREE.Mesh(eyeGeo, eyeGlowMat);
    eyeR.position.set(0.3, 5.25, 0.66);

    const beard = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.65, 2.2, 6)), stoneMat);
    beard.rotation.x = Math.PI;
    beard.position.set(0, 3.8, 0.62);

    const axeArmPivot = new THREE.Group();
    axeArmPivot.position.set(1.25, 4.1, 0.2);
    const rArm = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.36, 0.32, 2.2, 8)),
      stoneMat
    );
    rArm.position.y = -0.6;
    const axeHandle = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.11, 0.11, 5.2, 8)),
      bronzeMat
    );
    axeHandle.position.set(0.1, -0.5, 0.6);
    const axeBlade = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.6, 1.1, 0.16)), goldMat);
    axeBlade.position.set(0.1, 1.4, 0.6);
    axeArmPivot.add(rArm, axeHandle, axeBlade);

    const lanternPivot = new THREE.Group();
    lanternPivot.position.set(-1.35, 3.5, 0.8);
    const lArm = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.36, 0.32, 2.2, 8)),
      stoneMat
    );
    lArm.position.set(-1.25, 3.5, 0.2);
    const lanternCore = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.28, 0.22, 0.65, 8)),
      eyeGlowMat
    );
    lanternCore.position.y = -0.5;
    lanternPivot.add(lanternCore);

    statueGroup.add(
      pedestal,
      torso,
      belt,
      head,
      helm,
      crest,
      eyeL,
      eyeR,
      beard,
      axeArmPivot,
      lArm,
      lanternPivot
    );
    root.add(statueGroup);

    editableRigTargets.weaponNodes.push(axeHandle, axeBlade);
    editableRigTargets.leftWeaponNodes.push(lanternPivot);
    editableRigTargets.rightLimbNodes.push(axeArmPivot);
    editableRigTargets.leftLimbNodes.push(lArm);
    editableRigTargets.headNodes.push(head, helm, crest);
    editableRigTargets.bodyNodes.push(statueGroup);

    customApplySkin = (skin) => {
      stoneMat.color.setHex(skin.palette.primaryHex);
      bronzeMat.color.setHex(skin.palette.secondaryHex);
      goldMat.color.setHex(skin.palette.accentHex);
      if (skin.palette.emissiveHex) {
        eyeGlowMat.color.setHex(skin.palette.emissiveHex);
        eyeGlowMat.emissive.setHex(skin.palette.emissiveHex);
      }
    };

    customApplyAnimation = (animId, _t, p) => {
      axeArmPivot.rotation.set(0, 0, 0);
      lanternPivot.rotation.set(0, 0, 0);
      eyeGlowMat.emissiveIntensity = 1.4;

      if (animId === 'none') return;
      const phase = p * Math.PI * 2;

      if (animId === 'statue_lantern_pulse') {
        lanternPivot.rotation.z = Math.sin(phase) * 0.25;
        eyeGlowMat.emissiveIntensity = 1.2 + Math.sin(phase * 2) * 0.8;
      } else if (animId === 'statue_awakened_guard') {
        axeArmPivot.rotation.x = -Math.abs(Math.sin(phase)) * 0.75;
        lanternPivot.rotation.z = Math.cos(phase) * 0.25;
      }
    };
  }

  // ==========================================================================
  // 17. SEATED GOLDEN BUDDHA ON LOTUS THRONE (פסל הבודהה המוזהב)
  // ==========================================================================
  else {
    const goldMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.22, metalness: 0.88 })
    );
    const crimsonMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.45 }));
    const marbleMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }));
    const haloGlowMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.9,
      })
    );

    const monumentGroup = new THREE.Group();
    monumentGroup.scale.setScalar(0.3);

    const tier1 = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(4.2, 4.8, 0.9, 16)),
      marbleMat
    );
    tier1.position.y = 0.45;
    const tier2 = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(3.4, 3.9, 0.85, 16)),
      crimsonMat
    );
    tier2.position.y = 1.25;
    const tier3 = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(2.7, 3.2, 0.75, 16)),
      goldMat
    );
    tier3.position.y = 1.95;

    const buddhaBody = new THREE.Group();
    const legs = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(2.3, 2.5, 1.1, 14)),
      goldMat
    );
    legs.scale.set(1.2, 0.7, 0.95);
    legs.position.y = 2.65;
    const torso = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.15, 1.65, 2.5, 14)),
      goldMat
    );
    torso.position.y = 4.15;
    const shoulders = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.4, 14, 10)), goldMat);
    shoulders.scale.set(1.3, 0.55, 0.85);
    shoulders.position.y = 5.15;
    const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.92, 16, 14)), goldMat);
    head.position.y = 6.35;
    const ushnisha = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.38, 12, 10)), goldMat);
    ushnisha.position.y = 7.22;

    const halo = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(2.15, 0.14, 12, 32)),
      haloGlowMat
    );
    halo.position.set(0, 6.1, -0.88);
    buddhaBody.add(legs, torso, shoulders, head, ushnisha, halo);

    monumentGroup.add(tier1, tier2, tier3, buddhaBody);
    root.add(monumentGroup);

    editableRigTargets.weaponNodes.push(halo);
    editableRigTargets.leftWeaponNodes.push(tier3);
    editableRigTargets.rightLimbNodes.push(shoulders);
    editableRigTargets.leftLimbNodes.push(legs);
    editableRigTargets.headNodes.push(head, ushnisha);
    editableRigTargets.bodyNodes.push(buddhaBody);

    customApplySkin = (skin) => {
      goldMat.color.setHex(skin.palette.primaryHex);
      crimsonMat.color.setHex(skin.palette.secondaryHex);
      marbleMat.color.setHex(skin.palette.accentHex);
      if (skin.palette.emissiveHex) {
        haloGlowMat.color.setHex(skin.palette.emissiveHex);
        haloGlowMat.emissive.setHex(skin.palette.emissiveHex);
      }
    };

    customApplyAnimation = (animId, _t, p) => {
      buddhaBody.position.set(0, 0, 0);
      halo.rotation.set(0, 0, 0);

      if (animId === 'none') return;
      const phase = p * Math.PI * 2;

      if (animId === 'buddha_halo_spin') {
        halo.rotation.z = phase;
        haloGlowMat.emissiveIntensity = 0.8 + Math.sin(phase * 2) * 0.4;
      } else if (animId === 'buddha_levitation') {
        buddhaBody.position.y = 0.45 + Math.sin(phase) * 0.35;
        halo.rotation.z = phase;
      }
    };
  }

  // Apply initial skin and static 'none' animation pose
  customApplySkin(initialSkin);
  customApplyAnimation('none', 0, 0);

  // Record neutral transform snapshots of all hierarchy nodes so overrides
  // and animation amplitude adjustments never drift across frames
  interface INodeTransformSnapshot {
    readonly obj: THREE.Object3D;
    readonly posX: number;
    readonly posY: number;
    readonly posZ: number;
    readonly rotX: number;
    readonly rotY: number;
    readonly rotZ: number;
    readonly scaleX: number;
    readonly scaleY: number;
    readonly scaleZ: number;
  }

  const neutralSnapshots: INodeTransformSnapshot[] = [];
  root.traverse((obj) => {
    if (obj !== root) {
      neutralSnapshots.push({
        obj,
        posX: obj.position.x,
        posY: obj.position.y,
        posZ: obj.position.z,
        rotX: obj.rotation.x,
        rotY: obj.rotation.y,
        rotZ: obj.rotation.z,
        scaleX: obj.scale.x,
        scaleY: obj.scale.y,
        scaleZ: obj.scale.z,
      });
    }
  });

  // Enable shadow casting on meshes
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  const stats = computeGroupStats(root);

  return {
    entityId,
    root,
    applySkin: (skin) => customApplySkin(skin),
    applyAnimation: (animId, elapsedTime, cycleProgress, overrides) => {
      // 1. Restore neutral baseline transforms
      for (const snap of neutralSnapshots) {
        snap.obj.position.set(snap.posX, snap.posY, snap.posZ);
        snap.obj.rotation.set(snap.rotX, snap.rotY, snap.rotZ);
        snap.obj.scale.set(snap.scaleX, snap.scaleY, snap.scaleZ);
      }

      // 2. Apply entity's procedural animation
      customApplyAnimation(animId, elapsedTime, cycleProgress);

      // 3. Apply user lab fine-tuning & pose overrides if provided
      if (!overrides) return;

      // Apply Equipment Visibility Override if set ('both' | 'right_only' | 'left_only' | 'none')
      const visMode = overrides.equipmentVisibilityMode ?? 'auto';
      if (visMode !== 'auto') {
        const showRight = visMode === 'both' || visMode === 'right_only';
        const showLeft = visMode === 'both' || visMode === 'left_only';
        editableRigTargets.weaponNodes.forEach((node, idx) => {
          // If an entity has multiple right-hand props (e.g., sword at idx 0, torch at idx 1),
          // show idx 0 unless torch is active in torch_carry
          if (editableRigTargets.weaponNodes.length > 1 && entityId === 'ranger_third_person') {
            if (animId === 'torch_carry') {
              node.visible = showRight && idx === 1;
            } else {
              node.visible = showRight && idx === 0;
            }
          } else {
            node.visible = showRight;
          }
        });
        for (const node of editableRigTargets.leftWeaponNodes) {
          node.visible = showLeft;
        }
      }

      if (animId !== 'none' && Math.abs(overrides.amplitudeMultiplier - 1.0) > 0.001) {
        const amp = overrides.amplitudeMultiplier;
        for (const snap of neutralSnapshots) {
          snap.obj.position.x = snap.posX + (snap.obj.position.x - snap.posX) * amp;
          snap.obj.position.y = snap.posY + (snap.obj.position.y - snap.posY) * amp;
          snap.obj.position.z = snap.posZ + (snap.obj.position.z - snap.posZ) * amp;
          snap.obj.rotation.x = snap.rotX + (snap.obj.rotation.x - snap.rotX) * amp;
          snap.obj.rotation.y = snap.rotY + (snap.obj.rotation.y - snap.rotY) * amp;
          snap.obj.rotation.z = snap.rotZ + (snap.obj.rotation.z - snap.rotZ) * amp;
        }
      }

      const d2r = THREE.MathUtils.degToRad;

      // Right-Hand Weapon / Primary Prop Overrides
      if (
        overrides.weaponRotXDeg !== 0 ||
        overrides.weaponRotYDeg !== 0 ||
        overrides.weaponRotZDeg !== 0 ||
        overrides.weaponScale !== 1
      ) {
        for (const node of editableRigTargets.weaponNodes) {
          node.rotation.x += d2r(overrides.weaponRotXDeg);
          node.rotation.y += d2r(overrides.weaponRotYDeg);
          node.rotation.z += d2r(overrides.weaponRotZDeg);
          node.scale.multiplyScalar(overrides.weaponScale);
        }
      }

      // Left-Hand Weapon / Secondary Prop Overrides (Independent from Right-Hand Weapon!)
      const lwX = overrides.leftWeaponRotXDeg ?? 0;
      const lwY = overrides.leftWeaponRotYDeg ?? 0;
      const lwZ = overrides.leftWeaponRotZDeg ?? 0;
      const lwScale = overrides.leftWeaponScale ?? 1.0;
      if (lwX !== 0 || lwY !== 0 || lwZ !== 0 || lwScale !== 1) {
        for (const node of editableRigTargets.leftWeaponNodes) {
          node.rotation.x += d2r(lwX);
          node.rotation.y += d2r(lwY);
          node.rotation.z += d2r(lwZ);
          node.scale.multiplyScalar(lwScale);
        }
      }

      if (
        overrides.rightLimbRotXDeg !== 0 ||
        overrides.rightLimbRotYDeg !== 0 ||
        overrides.rightLimbRotZDeg !== 0
      ) {
        for (const node of editableRigTargets.rightLimbNodes) {
          node.rotation.x += d2r(overrides.rightLimbRotXDeg);
          node.rotation.y += d2r(overrides.rightLimbRotYDeg);
          node.rotation.z += d2r(overrides.rightLimbRotZDeg);
        }
      }

      if (
        overrides.leftLimbRotXDeg !== 0 ||
        overrides.leftLimbRotYDeg !== 0 ||
        overrides.leftLimbRotZDeg !== 0
      ) {
        for (const node of editableRigTargets.leftLimbNodes) {
          node.rotation.x += d2r(overrides.leftLimbRotXDeg);
          node.rotation.y += d2r(overrides.leftLimbRotYDeg);
          node.rotation.z += d2r(overrides.leftLimbRotZDeg);
        }
      }

      if (
        overrides.headRotXDeg !== 0 ||
        overrides.headRotYDeg !== 0 ||
        overrides.headRotZDeg !== 0
      ) {
        for (const node of editableRigTargets.headNodes) {
          node.rotation.x += d2r(overrides.headRotXDeg);
          node.rotation.y += d2r(overrides.headRotYDeg);
          node.rotation.z += d2r(overrides.headRotZDeg);
        }
      }

      if (
        overrides.bodyRotXDeg !== 0 ||
        overrides.bodyRotYDeg !== 0 ||
        overrides.bodyRotZDeg !== 0 ||
        overrides.bodyOffsetY !== 0
      ) {
        for (const node of editableRigTargets.bodyNodes) {
          node.rotation.x += d2r(overrides.bodyRotXDeg);
          node.rotation.y += d2r(overrides.bodyRotYDeg);
          node.rotation.z += d2r(overrides.bodyRotZDeg);
          node.position.y += overrides.bodyOffsetY;
        }
      }
    },
    setWireframe: (enabled) => {
      for (const mat of disposableMaterials) {
        if ('wireframe' in mat) {
          (mat as THREE.MeshStandardMaterial).wireframe = enabled;
        }
      }
    },
    dispose: () => {
      for (const geo of disposableGeometries) geo.dispose();
      for (const mat of disposableMaterials) mat.dispose();
    },
    stats,
  };
}
