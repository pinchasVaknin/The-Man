// ============================================================================
// MODULE: Lab / 3D Procedural Model & Animation Factory
// DESIGN: Self-contained Three.js Rig Builder, Skin Applicator & Pose Animator
// SUMMARY: Builds authentic 3D models matching the world's characters, humans,
//          animals, and mythic creatures, with static rest pose ('none') and
//          real-time animations.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import {
  computeFirstPersonSwordAttackPose,
  LOCKED_SWORD_GRIP_TRANSFORM,
} from '../world/systems/swordAttackAnimationSystem';
import type { ILabPoseOverrides, ILabSkinDef } from './labCatalog';
import { attachDeerGlbModel } from '../world/models/deerGlbLoader';
import { createReadyBear, type BearState } from '../world/models/Bear';
import { createReadyCrocodile, type CrocodileState } from '../world/models/Crocodile';
import { createReadyJaguar, type JaguarState } from '../world/models/Jaguar';
import { createReadyWolf, type WolfState } from '../world/models/Wolf';
import { createReadyRhino, type RhinoState } from '../world/models/Rhino';
import { createReadyCatLion, type CatLionState } from '../world/models/CatLion';
import { createReadyStag, type StagState } from '../world/models/Stag';
import { createReadyForestDragon, type ForestDragonState } from '../world/models/ForestDragon';
import { createReadyDemonDragon, type DemonDragonState } from '../world/models/DemonDragon';
import { createReadyHorse, type HorseState } from '../world/models/Horse';
import { createReadyDove, type DoveState } from '../world/models/Dove';
import { createReadyHippo, type HippoState } from '../world/models/Hippo';
import { createReadyKoiFish, type KoiFishState } from '../world/models/KoiFish';
import { createReadyDolphin, type DolphinState } from '../world/models/Dolphin';
import {
  createReadyWarriorMonk,
  type WarriorMonkState,
} from '../world/models/Characters/WarriorMonk_Complete';
import {
  createReadyDwarfWarrior,
  type DwarfWarriorState,
} from '../world/models/Characters/DwarfWarrior_Complete';
// #endregion

// ======================== RIG CONTRACT ======================== \\
// #region Rig Contract
/**
 * Summary: A lab-built model with its skin, animation, wireframe and disposal controls.
 * Design: The lab view drives every entity through this one contract, whatever its rig.
 */
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
// #endregion

// ======================== RIG FACTORY ======================== \\
// #region Rig Factory
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

  // 1. RANGER THIRD-PERSON CHARACTER
  if (entityId === 'ranger_third_person') {
    const skinMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xdfb18b, roughness: 0.55 }));
    const hairMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x2c1b10, roughness: 0.78 }));
    const beardMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x24150b, roughness: 0.84 }));
    const tunicMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x3e2a1b, roughness: 0.65 }));
    const cloakMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x2e3627, roughness: 0.84, side: THREE.DoubleSide })
    );
    const leatherMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.52 }));
    const darkLeatherMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x29180c, roughness: 0.58 }));
    const chainmailMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.36, metalness: 0.82 })
    );
    const pantsMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x24201c, roughness: 0.8 }));
    const goldMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xb48a48, roughness: 0.28, metalness: 0.82 })
    );
    const steelMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xdbe4ee, roughness: 0.2, metalness: 0.9 })
    );
    const runeGlowMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        emissive: 0x94a3b8,
        emissiveIntensity: 0.35,
        roughness: 0.25,
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

    // Chainmail lower skirt hem + split weathered leather jerkin skirt
    const chainmailSkirt = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.185, 0.215, 0.26, 14)),
      chainmailMat
    );
    chainmailSkirt.position.y = -0.07;

    const leatherSkirtL = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.17, 0.26, 0.34)),
      tunicMat
    );
    leatherSkirtL.position.set(-0.095, -0.04, 0);
    leatherSkirtL.rotation.z = 0.06;
    const leatherSkirtR = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.17, 0.26, 0.34)),
      tunicMat
    );
    leatherSkirtR.position.set(0.095, -0.04, 0);
    leatherSkirtR.rotation.z = -0.06;

    const skirtTrimL = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.175, 0.024, 0.35)),
      goldMat
    );
    skirtTrimL.position.set(-0.098, -0.16, 0);
    const skirtTrimR = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.175, 0.024, 0.35)),
      goldMat
    );
    skirtTrimR.position.set(0.098, -0.16, 0);

    // Waist belt, brass frame buckle, belt pouches, canteen & hip scabbard
    const belt = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.202, 0.202, 0.085, 14)),
      darkLeatherMat
    );
    belt.position.y = 0.08;
    const buckle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.085, 0.085, 0.035)), goldMat);
    buckle.position.set(0, 0.08, -0.198);
    const beltTongue = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.048, 0.22, 0.022)),
      darkLeatherMat
    );
    beltTongue.position.set(0.035, -0.02, -0.198);
    beltTongue.rotation.z = -0.08;

    const pouchGeo = trackGeo(new THREE.BoxGeometry(0.075, 0.095, 0.065));
    const pouchL = new THREE.Mesh(pouchGeo, leatherMat);
    pouchL.position.set(-0.14, 0.05, -0.155);
    pouchL.rotation.y = 0.45;
    const pouchR = new THREE.Mesh(pouchGeo, leatherMat);
    pouchR.position.set(0.15, 0.05, -0.145);
    pouchR.rotation.y = -0.45;

    const canteen = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.055, 0.055, 0.045, 12)),
      steelMat
    );
    canteen.rotation.z = Math.PI / 2;
    canteen.position.set(0.21, 0.02, 0.06);

    // Hip Sword Scabbard on Left Hip
    const scabbardGroup = new THREE.Group();
    scabbardGroup.position.set(-0.21, 0.04, 0.02);
    scabbardGroup.rotation.set(0.32, 0, 0.14);
    const scabbardBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.032, 0.68, 0.068)),
      darkLeatherMat
    );
    scabbardBody.position.y = -0.32;
    const scabbardLocket = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.038, 0.07, 0.074)),
      steelMat
    );
    scabbardLocket.position.y = 0.0;
    const scabbardChape = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.038, 0.11, 4)),
      steelMat
    );
    scabbardChape.rotation.x = Math.PI;
    scabbardChape.position.y = -0.69;
    scabbardGroup.add(scabbardBody, scabbardLocket, scabbardChape);

    // Weathered Leather Chest Jerkin with Laced V-Collar
    const chest = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.225, 0.19, 0.52, 14)),
      tunicMat
    );
    chest.position.y = 0.34;
    const collarV = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.065, 0.16, 4)),
      darkLeatherMat
    );
    collarV.rotation.x = Math.PI;
    collarV.position.set(0, 0.48, -0.185);
    const laceGeo = trackGeo(new THREE.BoxGeometry(0.075, 0.008, 0.012));
    for (let lc = 0; lc < 3; lc++) {
      const lace = new THREE.Mesh(laceGeo, goldMat);
      lace.position.set(0, 0.43 + lc * 0.038, -0.205);
      lace.rotation.z = lc % 2 === 0 ? 0.28 : -0.28;
      upperTorsoPivot.add(lace);
    }

    // Diagonal Sword Baldric Strap + Buckle across Chest
    const baldric = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.075, 0.58, 0.37)), leatherMat);
    baldric.position.set(0, 0.34, 0);
    baldric.rotation.z = 0.52;
    const baldricBuckle = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.055, 0.055, 0.025)),
      goldMat
    );
    baldricBuckle.position.set(-0.06, 0.42, -0.198);
    baldricBuckle.rotation.z = 0.52;

    // Gondor Ranger Hooded Cloak, Twin Throat Clasps & White Tree of Gondor Back Emblem
    const mantle = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.245, 0.285, 0.17, 14)),
      cloakMat
    );
    mantle.position.set(0, 0.52, 0.02);
    const hoodFold = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.148, 0.044, 8, 16)),
      cloakMat
    );
    hoodFold.rotation.x = Math.PI / 2 - 0.28;
    hoodFold.position.set(0, 0.58, 0.065);

    const claspGeo = trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 0.016, 12));
    claspGeo.rotateX(Math.PI / 2);
    const claspL = new THREE.Mesh(claspGeo, goldMat);
    claspL.position.set(-0.058, 0.53, -0.215);
    const claspR = new THREE.Mesh(claspGeo, goldMat);
    claspR.position.set(0.058, 0.53, -0.215);
    const claspChain = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.09, 0.01, 0.012)),
      goldMat
    );
    claspChain.position.set(0, 0.53, -0.218);

    const cloakBackGroup = new THREE.Group();
    cloakBackGroup.position.set(0, 0.16, 0.22);
    cloakBackGroup.rotation.x = 0.08;
    const cloakBack = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.52, 0.96, 0.032)),
      cloakMat
    );
    cloakBackGroup.add(cloakBack);

    // White Tree of Gondor + 7 Silver Stars Emblem on Back of Cloak
    const treeTrunk = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.018, 0.24, 0.008)),
      runeGlowMat
    );
    treeTrunk.position.set(0, 0.04, 0.02);
    cloakBackGroup.add(treeTrunk);
    for (let b = 0; b < 3; b++) {
      const span = 0.09 + b * 0.045;
      const yPos = 0.04 + b * 0.055;
      const branchL = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(span, 0.01, 0.008)),
        runeGlowMat
      );
      branchL.position.set(-span * 0.42, yPos, 0.02);
      branchL.rotation.z = -0.38;
      const branchR = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(span, 0.01, 0.008)),
        runeGlowMat
      );
      branchR.position.set(span * 0.42, yPos, 0.02);
      branchR.rotation.z = 0.38;
      cloakBackGroup.add(branchL, branchR);
    }
    const starGeo = trackGeo(new THREE.OctahedronGeometry(0.014, 0));
    for (let st = 0; st < 7; st++) {
      const ang = ((st / 6) - 0.5) * Math.PI * 0.82;
      const star = new THREE.Mesh(starGeo, runeGlowMat);
      star.position.set(Math.sin(ang) * 0.16, 0.14 + Math.cos(ang) * 0.11, 0.022);
      cloakBackGroup.add(star);
    }

    // Quiver + Bedroll on Back
    const quiverGroup = new THREE.Group();
    quiverGroup.position.set(0.11, 0.36, 0.25);
    quiverGroup.rotation.z = -0.36;
    const quiverTube = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.064, 0.052, 0.5, 10)),
      leatherMat
    );
    quiverGroup.add(quiverTube);
    const shaftGeo = trackGeo(new THREE.CylinderGeometry(0.009, 0.009, 0.32, 6));
    const fletchGeo = trackGeo(new THREE.BoxGeometry(0.032, 0.075, 0.01));
    for (let q = 0; q < 4; q++) {
      const aShaft = new THREE.Mesh(shaftGeo, leatherMat);
      aShaft.position.set((q - 1.5) * 0.02, 0.24, (q % 2) * 0.016);
      const aFletch = new THREE.Mesh(fletchGeo, runeGlowMat);
      aFletch.position.set((q - 1.5) * 0.02, 0.35, (q % 2) * 0.016);
      quiverGroup.add(aShaft, aFletch);
    }

    // Sculpted LOTR Ranger Head, Wavy Shoulder-Length Hair & Rugged Short Beard
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.69, -0.02);
    const neck = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.074, 0.084, 0.14, 10)),
      skinMat
    );
    const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.144, 16, 16)), skinMat);
    head.scale.set(0.95, 1.06, 0.98);
    head.position.y = 0.145;

    const nose = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.024, 0.068, 5)), skinMat);
    nose.rotation.x = -Math.PI * 0.42;
    nose.position.set(0, 0.142, -0.145);

    const brow = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.13, 0.02, 0.035)), hairMat);
    brow.position.set(0, 0.178, -0.132);

    // Rugged Short Beard, Jawline Stubble & Mustache
    const jawBeard = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.146, 14, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.42)),
      beardMat
    );
    jawBeard.scale.set(0.96, 1.02, 1.04);
    jawBeard.position.set(0, 0.132, -0.012);
    const mustache = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.09, 0.022, 0.035)),
      beardMat
    );
    mustache.position.set(0, 0.105, -0.144);
    const chinGoatee = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.064, 0.054, 0.04)),
      beardMat
    );
    chinGoatee.position.set(0, 0.058, -0.14);

    // Wavy Shoulder-Length Dark Chestnut Hair (Center-Parted Locks, Side Waves & Back Drape)
    const hairCrown = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.156, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.58)),
      hairMat
    );
    hairCrown.position.set(0, 0.16, 0.008);
    hairCrown.rotation.x = -0.18;

    const frontLockGeo = trackGeo(new THREE.CylinderGeometry(0.026, 0.018, 0.17, 7));
    const frontLockL = new THREE.Mesh(frontLockGeo, hairMat);
    frontLockL.position.set(-0.095, 0.155, -0.105);
    frontLockL.rotation.set(0.22, 0, 0.36);
    const frontLockR = new THREE.Mesh(frontLockGeo, hairMat);
    frontLockR.position.set(0.095, 0.155, -0.105);
    frontLockR.rotation.set(0.22, 0, -0.36);

    const sideWaveGeo = trackGeo(new THREE.CylinderGeometry(0.042, 0.03, 0.26, 8));
    const hairWaveL = new THREE.Mesh(sideWaveGeo, hairMat);
    hairWaveL.position.set(-0.132, 0.1, -0.055);
    hairWaveL.rotation.set(0.1, 0, 0.14);
    const hairWaveR = new THREE.Mesh(sideWaveGeo, hairMat);
    hairWaveR.position.set(0.132, 0.1, -0.055);
    hairWaveR.rotation.set(0.1, 0, -0.14);

    const hairBackDrape = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.26, 0.27, 0.095)),
      hairMat
    );
    hairBackDrape.position.set(0, 0.08, 0.11);
    hairBackDrape.rotation.x = 0.16;

    const eyeGeo = trackGeo(new THREE.SphereGeometry(0.017, 8, 8));
    const eyeMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x1e293b }));
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.046, 0.155, -0.134);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.046, 0.155, -0.134);
    headGroup.add(
      neck,
      head,
      nose,
      brow,
      jawBeard,
      mustache,
      chinGoatee,
      hairCrown,
      frontLockL,
      frontLockR,
      hairWaveL,
      hairWaveR,
      hairBackDrape,
      leftEye,
      rightEye
    );

    // Left Arm + Chainmail Shoulder + Embossed Leather Vambrace + Recurve Bow
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.26, 0.52, 0);
    const chainmailShoulderGeo = trackGeo(new THREE.CylinderGeometry(0.076, 0.068, 0.18, 10));
    const uArmGeo = trackGeo(new THREE.CylinderGeometry(0.068, 0.058, 0.28, 10));
    const fArmGeo = trackGeo(new THREE.CylinderGeometry(0.06, 0.05, 0.28, 10));
    const vambraceCuffGeo = trackGeo(new THREE.CylinderGeometry(0.063, 0.054, 0.04, 10));
    const handGeo = trackGeo(new THREE.SphereGeometry(0.052, 10, 10));

    const lMailSleeve = new THREE.Mesh(chainmailShoulderGeo, chainmailMat);
    lMailSleeve.position.set(0, -0.06, -0.03);
    lMailSleeve.rotation.x = 0.45;
    const lUpper = new THREE.Mesh(uArmGeo, tunicMat);
    lUpper.position.set(0, -0.13, -0.06);
    lUpper.rotation.x = 0.45;
    const lFore = new THREE.Mesh(fArmGeo, leatherMat);
    lFore.position.set(0, -0.26, -0.24);
    lFore.rotation.x = 1.15;
    const lCuff = new THREE.Mesh(vambraceCuffGeo, goldMat);
    lCuff.position.set(0, -0.3, -0.32);
    lCuff.rotation.x = 1.15;
    const lHand = new THREE.Mesh(handGeo, darkLeatherMat);
    lHand.position.set(0, -0.32, -0.38);
    leftArmGroup.add(lMailSleeve, lUpper, lFore, lCuff, lHand);

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

    // Right Arm + Chainmail Shoulder + Embossed Leather Vambrace + LOTR Ranger Longsword & Torch
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.26, 0.52, 0);
    const rMailSleeve = new THREE.Mesh(chainmailShoulderGeo, chainmailMat);
    rMailSleeve.position.set(0, -0.06, -0.02);
    const rUpper = new THREE.Mesh(uArmGeo, tunicMat);
    rUpper.position.set(0, -0.14, -0.04);
    const rFore = new THREE.Mesh(fArmGeo, leatherMat);
    rFore.position.set(0, -0.34, -0.12);
    rFore.rotation.x = 0.55;
    const rCuff = new THREE.Mesh(vambraceCuffGeo, goldMat);
    rCuff.position.set(0, -0.4, -0.18);
    rCuff.rotation.x = 0.55;
    const rHand = new THREE.Mesh(handGeo, darkLeatherMat);
    rHand.position.set(0, -0.44, -0.22);
    rightArmGroup.add(rMailSleeve, rUpper, rFore, rCuff, rHand);

    // LOTR Gondor Ranger Longsword (Cruciform Crossguard, Wheel Pommel & Fullered Steel Blade)
    const swordGroup = new THREE.Group();
    swordGroup.position.set(0, -0.44, -0.24);
    swordGroup.rotation.x = -0.85;
    const grip = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.02, 0.24, 10)), darkLeatherMat);
    const wheelPommel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.038, 0.038, 0.022, 14)), steelMat);
    wheelPommel.rotation.z = Math.PI / 2;
    wheelPommel.position.y = -0.14;
    const pommelBoss = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.02, 0.02, 0.028, 10)), goldMat);
    pommelBoss.rotation.z = Math.PI / 2;
    pommelBoss.position.y = -0.14;
    const crossguard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.028, 0.042)), steelMat);
    crossguard.position.y = 0.13;
    const guardEcus = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.028, 0)), goldMat);
    guardEcus.position.y = 0.13;
    const blade = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.058, 0.96, 0.014)), steelMat);
    blade.position.y = 0.62;
    const fullerStrip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.016, 0.74, 0.017)), runeGlowMat);
    fullerStrip.position.y = 0.56;
    swordGroup.add(grip, wheelPommel, pommelBoss, crossguard, guardEcus, blade, fullerStrip);
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
      chainmailSkirt,
      leatherSkirtL,
      leatherSkirtR,
      skirtTrimL,
      skirtTrimR,
      belt,
      buckle,
      beltTongue,
      pouchL,
      pouchR,
      canteen,
      scabbardGroup,
      chest,
      collarV,
      baldric,
      baldricBuckle,
      mantle,
      hoodFold,
      claspL,
      claspR,
      claspChain,
      cloakBackGroup,
      quiverGroup,
      headGroup,
      leftArmGroup,
      rightArmGroup
    );

    // Articulated Left & Right Legs with Tall Cuffed Leather Ranger Boots
    const thighGeo = trackGeo(new THREE.CylinderGeometry(0.095, 0.078, 0.44, 10));
    thighGeo.translate(0, -0.22, 0);
    const bootCuffGeo = trackGeo(new THREE.CylinderGeometry(0.092, 0.082, 0.11, 10));
    bootCuffGeo.translate(0, -0.43, 0);
    const bootGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.07, 0.44, 10));
    bootGeo.translate(0, -0.64, 0);
    const footGeo = trackGeo(new THREE.BoxGeometry(0.125, 0.085, 0.25));
    footGeo.translate(0, -0.86, -0.04);

    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.105, 0.9, 0);
    leftLeg.add(
      new THREE.Mesh(thighGeo, pantsMat),
      new THREE.Mesh(bootCuffGeo, leatherMat),
      new THREE.Mesh(bootGeo, darkLeatherMat),
      new THREE.Mesh(footGeo, darkLeatherMat)
    );
    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.105, 0.9, 0);
    rightLeg.add(
      new THREE.Mesh(thighGeo, pantsMat),
      new THREE.Mesh(bootCuffGeo, leatherMat),
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
      leftArmGroup.position.set(-0.26, 0.52, 0);
      leftArmGroup.rotation.set(-0.14, 0.34, 0.24);
      rightArmGroup.position.set(0.26, 0.52, 0);
      rightArmGroup.rotation.set(-0.18, -0.16, -0.14);
      leftLeg.position.set(-0.105, 0.9, 0);
      leftLeg.rotation.set(0, 0, 0);
      rightLeg.position.set(0.105, 0.9, 0);
      rightLeg.rotation.set(0, 0, 0);
      bowGroup.visible = true;
      bowGroup.rotation.set(0.2, 0.28, -0.22);
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

  // 2. FIRST-PERSON HANDS & WEAPONS VIEWMODEL
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

  // 3. DWARVEN MINER (Full Skinned DwarfWarrior_Complete Model + 11 Built-in Animations)
  else if (entityId === 'dwarven_miner') {
    const dwarfWrapper = new THREE.Group();
    root.add(dwarfWrapper);

    const dwarfCtrl = createReadyDwarfWarrior({
      initialState: 'idle',
      weaponVisible: true,
      driveRootMotion: false,
    });
    dwarfCtrl.group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
        disposableGeometries.push(m.geometry);
        if (Array.isArray(m.material)) {
          for (const mat of m.material) disposableMaterials.push(mat);
        } else if (m.material) {
          disposableMaterials.push(m.material);
        }
      }
    });
    dwarfWrapper.add(dwarfCtrl.group);

    // Crystal Vein Prop (shown during mining animation)
    const crystalMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.65,
        roughness: 0.18,
      })
    );
    const crystalProp = new THREE.Group();
    crystalProp.position.set(0.15, 0, 0.78);
    for (let c = 0; c < 3; c++) {
      const spire = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.14, 0.55 - c * 0.1, 6)),
        crystalMat
      );
      spire.position.set((c - 1) * 0.14, 0.25, 0);
      spire.rotation.z = (c - 1) * 0.25;
      crystalProp.add(spire);
    }
    crystalProp.visible = false;
    dwarfWrapper.add(crystalProp);

    if (dwarfCtrl.weaponNode) {
      editableRigTargets.weaponNodes.push(dwarfCtrl.weaponNode);
    }
    if (dwarfCtrl.bones.length > 0) {
      editableRigTargets.rightLimbNodes.push(dwarfCtrl.bones[14] ?? dwarfCtrl.bones[0]);
      editableRigTargets.leftLimbNodes.push(dwarfCtrl.bones[9] ?? dwarfCtrl.bones[0]);
      editableRigTargets.headNodes.push(dwarfCtrl.bones[4] ?? dwarfCtrl.bones[0]);
    }
    editableRigTargets.bodyNodes.push(dwarfWrapper);

    customApplySkin = (skin) => {
      const mat = dwarfCtrl.skinnedMesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        if (skin.id === 'dwarf_thorin_red') {
          mat.color.setHex(0xffffff);
        } else {
          mat.color.setHex(0xffffff).lerp(new THREE.Color(skin.palette.primaryHex), 0.35);
        }
      }
      if (skin.palette.trimHex) {
        crystalMat.color.setHex(skin.palette.trimHex);
        crystalMat.emissive.setHex(skin.palette.trimHex);
      }
    };

    customApplyAnimation = (animId, _t, p) => {
      dwarfWrapper.position.set(0, 0, 0);
      dwarfWrapper.rotation.set(0, 0, 0);
      crystalProp.visible = false;

      if (animId === 'none') {
        dwarfCtrl.resetToRest();
        return;
      }

      const animMap: Readonly<Record<string, DwarfWarriorState>> = {
        mining_work: 'mine1',
        caravan_march: 'walk',
        miner_idle: 'idle',
        celebrate_gold: 'attack3',
        idle: 'idle',
        walk: 'walk',
        run: 'run',
        sleep: 'sleep',
        sit: 'sit',
        attack1: 'attack1',
        attack2: 'attack2',
        attack3: 'attack3',
        mine1: 'mine1',
        mine2: 'mine2',
        death: 'death',
      };
      const targetState: DwarfWarriorState = animMap[animId] ?? 'idle';
      if (animId === 'mining_work' || animId === 'mine1' || animId === 'mine2') {
        crystalProp.visible = true;
      }
      dwarfCtrl.setNormalizedPhase(targetState, p);
    };
  }

  // 4 & 5. SHAOLIN MONK & TAI-CHI MONK (Full Skinned WarriorMonk_Complete Model + 11 Built-in Animations)
  else if (entityId === 'shaolin_monk' || entityId === 'tai_chi_monk') {
    const hasStaff = entityId === 'shaolin_monk';
    const monkWrapper = new THREE.Group();
    root.add(monkWrapper);

    const monkCtrl = createReadyWarriorMonk({
      initialState: 'idle',
      weaponVisible: hasStaff,
      driveRootMotion: false,
    });
    monkCtrl.group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
        disposableGeometries.push(m.geometry);
        if (Array.isArray(m.material)) {
          for (const mat of m.material) disposableMaterials.push(mat);
        } else if (m.material) {
          disposableMaterials.push(m.material);
        }
      }
    });
    monkWrapper.add(monkCtrl.group);

    if (monkCtrl.weaponNode) {
      editableRigTargets.weaponNodes.push(monkCtrl.weaponNode);
    }
    if (monkCtrl.bones.length > 0) {
      editableRigTargets.rightLimbNodes.push(monkCtrl.bones[14] ?? monkCtrl.bones[0]);
      editableRigTargets.leftLimbNodes.push(monkCtrl.bones[9] ?? monkCtrl.bones[0]);
      editableRigTargets.headNodes.push(monkCtrl.bones[4] ?? monkCtrl.bones[0]);
    }
    editableRigTargets.bodyNodes.push(monkWrapper);

    customApplySkin = (skin) => {
      const mat = monkCtrl.skinnedMesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        if (skin.id === 'monk_saffron_classic' || skin.id === 'taichi_sunrise_orange') {
          mat.color.setHex(0xffffff);
        } else {
          mat.color.setHex(0xffffff).lerp(new THREE.Color(skin.palette.primaryHex), 0.35);
        }
      }
    };

    customApplyAnimation = (animId, _t, p) => {
      monkWrapper.position.set(0, 0, 0);
      monkWrapper.rotation.set(0, 0, 0);

      if (animId === 'none') {
        monkCtrl.resetToRest();
        return;
      }

      const animMap: Readonly<Record<string, WarriorMonkState>> = {
        kung_fu_form: 'attack3',
        staff_whirlwind: 'staff_spin',
        horse_stance_strike: 'attack1',
        shaolin_salute: 'pray_kneel',
        tai_chi_flow: 'attack2',
        cloud_hands: 'staff_spin',
        crane_balance: 'pray_kneel',
        idle: 'idle',
        walk: 'walk',
        run: 'run',
        sleep: 'sleep',
        sit: 'sit',
        pray_kneel: 'pray_kneel',
        attack1: 'attack1',
        attack2: 'attack2',
        attack3: 'attack3',
        staff_spin: 'staff_spin',
        death: 'death',
      };
      const targetState: WarriorMonkState = animMap[animId] ?? 'idle';
      monkCtrl.setNormalizedPhase(targetState, p);
    };
  }

  // 6. HARBOR MARKET MERCHANT & BLACKSMITH
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

  // 7. RIDEABLE HORSE (full 53-joint Horse_Complete.ts skeleton + 14 animations + saddle gear)
  else if (entityId === 'rideable_horse') {
    const horseRoot = new THREE.Group();
    root.add(horseRoot);

    const horse = createReadyHorse({
      scale: 1.05,
      castShadow: true,
      receiveShadow: true,
    });
    horse.animator.loopDeath = true;
    horseRoot.add(horse.object);

    const horseMat = horse.mesh.material;
    if (Array.isArray(horseMat)) {
      for (const m of horseMat) disposableMaterials.push(m);
    } else {
      disposableMaterials.push(horseMat);
    }
    disposableGeometries.push(horse.mesh.geometry);

    const horseSaddleMat = horse.saddleMesh.material;
    if (Array.isArray(horseSaddleMat)) {
      for (const m of horseSaddleMat) disposableMaterials.push(m);
    } else {
      disposableMaterials.push(horseSaddleMat);
    }
    disposableGeometries.push(horse.saddleMesh.geometry);

    const bones = horse.rig.bones;
    editableRigTargets.weaponNodes.push(bones[3]);
    editableRigTargets.leftWeaponNodes.push(horse.saddleMesh);
    editableRigTargets.rightLimbNodes.push(bones[32], bones[14]);
    editableRigTargets.leftLimbNodes.push(bones[26], bones[9]);
    editableRigTargets.headNodes.push(bones[41], bones[45]);
    editableRigTargets.bodyNodes.push(horseRoot);

    customApplySkin = (skin) => {
      const tintHex =
        skin.id === 'horse_bay_stallion' ? 0xffffff : skin.palette.primaryHex;
      const mat = horse.mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        mat.color.setHex(tintHex);
      }
    };

    let lastHorseAnimTime = 0;
    let lastHorseAnimId = '';
    customApplyAnimation = (animId, t, p) => {
      const rawDt = t >= lastHorseAnimTime ? t - lastHorseAnimTime : t;
      const dt = rawDt > 0 ? Math.min(0.1, rawDt) : 0;
      lastHorseAnimTime = t;

      horseRoot.position.set(0, 0, 0);
      horseRoot.rotation.set(0, 0, 0);

      if (animId === 'none') {
        if (lastHorseAnimId !== 'none') {
          horse.rig.resetToRest();
          horse.object.position.set(0, 0, 0);
          horse.object.rotation.set(0, 0, 0);
          horse.setState('idle');
          lastHorseAnimId = 'none';
        }
        return;
      }

      const legacyAliasMap: Record<string, HorseState> = {
        horse_idle: 'idle',
        horse_walk: 'walk',
        horse_trot: 'trot',
        horse_gallop: 'run',
        horse_rear: 'buck_attack',
      };
      const validHorseStates: ReadonlySet<HorseState> = new Set<HorseState>([
        'idle',
        'walk',
        'trot',
        'run',
        'flee',
        'skip',
        'eat',
        'call',
        'buck_attack',
        'roar',
        'attack',
        'sit',
        'lie',
        'death',
      ]);
      const mappedState: HorseState =
        legacyAliasMap[animId] ??
        (validHorseStates.has(animId as HorseState) ? (animId as HorseState) : 'idle');

      if (lastHorseAnimId !== animId) {
        if (mappedState === 'death') {
          horse.restartState('death');
        } else {
          horse.setState(mappedState);
        }
        lastHorseAnimId = animId;
      }

      if (dt > 0) {
        horse.update(dt);
      } else {
        horse.animator.setNormalizedPhase(p);
      }
      horse.object.position.set(0, 0, 0);
      horse.object.rotation.set(0, 0, 0);
    };
  }

  // 8. FOREST DEER / STAG & DOE
  else if (entityId === 'forest_deer') {
    const deerRoot = new THREE.Group();
    root.add(deerRoot);

    const deerGlbCtrl = attachDeerGlbModel(deerRoot, {
      disposableMaterials,
    });
    deerGlbCtrl.deer.animator.loopDeath = true;
    const bones = deerGlbCtrl.deer.rig.bones;

    editableRigTargets.weaponNodes.push(bones.earR);
    editableRigTargets.leftWeaponNodes.push(bones.earL, bones.tail1);
    editableRigTargets.rightLimbNodes.push(bones.upperArmR, bones.thighR);
    editableRigTargets.leftLimbNodes.push(bones.upperArmL, bones.thighL);
    editableRigTargets.headNodes.push(bones.head);
    editableRigTargets.bodyNodes.push(deerRoot);

    customApplySkin = (skin) => {
      const tintHex =
        skin.id === 'deer_stag_classic' ? 0xffffff : skin.palette.primaryHex;
      deerGlbCtrl.setTint(tintHex);
    };

    let lastLabAnimTime = 0;
    let lastAnimId = '';
    customApplyAnimation = (animId, t, p) => {
      const rawDt = t >= lastLabAnimTime ? t - lastLabAnimTime : t;
      const dt = rawDt > 0 ? Math.min(0.1, rawDt) : 0;
      lastLabAnimTime = t;

      deerRoot.position.set(0, 0, 0);
      deerRoot.rotation.set(0, 0, 0);

      if (animId === 'none') {
        if (lastAnimId !== 'none') {
          deerGlbCtrl.deer.rig.resetPose();
          deerGlbCtrl.setState('idle');
          deerGlbCtrl.update(0, 0);
          lastAnimId = 'none';
        }
        return;
      }

      const mappedState =
        animId === 'walk' || animId === 'deer_walk'
          ? 'walk'
          : animId === 'eat' || animId === 'deer_graze'
            ? 'eat'
            : animId === 'call'
              ? 'call'
              : animId === 'lie' || animId === 'deer_sleep'
                ? 'lie'
                : animId === 'run'
                  ? 'run'
                  : animId === 'flee'
                    ? 'flee'
                    : animId === 'skip' || animId === 'deer_leap'
                      ? 'skip'
                      : animId === 'death'
                        ? 'death'
                        : 'idle';

      if (lastAnimId !== animId) {
        if (mappedState === 'death' || lastAnimId === 'death') {
          deerGlbCtrl.deer.rig.resetPose();
        }
        if (mappedState === 'death') {
          deerGlbCtrl.deer.animator.restartState('death');
        } else {
          deerGlbCtrl.setState(mappedState);
        }
        lastAnimId = animId;
      }

      if (dt > 0) {
        deerGlbCtrl.update(dt, 0);
      } else {
        deerGlbCtrl.deer.animator.setNormalizedPhase(p, 3.5);
      }
    };
  }

  // 8B. FOREST BEAR (full 37-bone skeleton + 13 animations)
  else if (entityId === 'forest_bear') {
    const bearRoot = new THREE.Group();
    root.add(bearRoot);

    const bear = createReadyBear({
      castShadow: true,
      receiveShadow: true,
    });
    bear.animator.loopDeath = true;
    bearRoot.add(bear.object);

    const bearMat = bear.mesh.material;
    if (Array.isArray(bearMat)) {
      for (const m of bearMat) disposableMaterials.push(m);
    } else {
      disposableMaterials.push(bearMat);
    }
    disposableGeometries.push(bear.mesh.geometry);

    editableRigTargets.bodyNodes.push(bearRoot);

    customApplySkin = (skin) => {
      const tintHex =
        skin.id === 'bear_grizzly_classic' ? 0xffffff : skin.palette.primaryHex;
      const mat = bear.mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        mat.color.setHex(tintHex);
      }
    };

    let lastBearAnimTime = 0;
    let lastBearAnimId = '';
    customApplyAnimation = (animId, t, p) => {
      const rawDt = t >= lastBearAnimTime ? t - lastBearAnimTime : t;
      const dt = rawDt > 0 ? Math.min(0.1, rawDt) : 0;
      lastBearAnimTime = t;

      bearRoot.position.set(0, 0, 0);
      bearRoot.rotation.set(0, 0, 0);

      if (animId === 'none') {
        if (lastBearAnimId !== 'none') {
          bear.rig.resetToRest();
          bear.object.position.set(0, 0, 0);
          bear.object.rotation.set(0, 0, 0);
          bear.setState('idle');
          lastBearAnimId = 'none';
        }
        return;
      }

      const validBearStates: ReadonlySet<BearState> = new Set<BearState>([
        'idle',
        'walk',
        'eat',
        'call',
        'lie',
        'sit',
        'trot',
        'run',
        'flee',
        'skip',
        'roar',
        'stomp',
        'attack',
        'death',
      ]);
      const mappedState: BearState = validBearStates.has(animId as BearState)
        ? (animId as BearState)
        : 'idle';

      if (lastBearAnimId !== animId) {
        if (mappedState === 'death') {
          bear.animator.restartState('death');
        } else {
          bear.setState(mappedState);
        }
        lastBearAnimId = animId;
      }

      if (dt > 0) {
        bear.update(dt);
      } else {
        bear.animator.setNormalizedPhase(p);
      }
    };
  }

  // 8C. RIVER CROCODILE (full 49-bone skeleton + 13 animations)
  else if (entityId === 'river_crocodile') {
    const crocRoot = new THREE.Group();
    root.add(crocRoot);

    const crocodile = createReadyCrocodile({
      castShadow: true,
      receiveShadow: true,
    });
    crocodile.animator.loopDeath = true;
    crocRoot.add(crocodile.object);

    const crocMat = crocodile.mesh.material;
    if (Array.isArray(crocMat)) {
      for (const m of crocMat) disposableMaterials.push(m);
    } else {
      disposableMaterials.push(crocMat);
    }
    disposableGeometries.push(crocodile.mesh.geometry);

    editableRigTargets.bodyNodes.push(crocRoot);

    customApplySkin = (skin) => {
      const tintHex =
        skin.id === 'crocodile_nile_classic' ? 0xffffff : skin.palette.primaryHex;
      const mat = crocodile.mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        mat.color.setHex(tintHex);
      }
    };

    let lastCrocAnimTime = 0;
    let lastCrocAnimId = '';
    customApplyAnimation = (animId, t, p) => {
      const rawDt = t >= lastCrocAnimTime ? t - lastCrocAnimTime : t;
      const dt = rawDt > 0 ? Math.min(0.1, rawDt) : 0;
      lastCrocAnimTime = t;

      crocRoot.position.set(0, 0, 0);
      crocRoot.rotation.set(0, 0, 0);

      if (animId === 'none') {
        if (lastCrocAnimId !== 'none') {
          crocodile.rig.resetToRest();
          crocodile.object.position.set(0, 0, 0);
          crocodile.object.rotation.set(0, 0, 0);
          crocodile.setState('idle');
          lastCrocAnimId = 'none';
        }
        return;
      }

      const validCrocStates: ReadonlySet<CrocodileState> = new Set<CrocodileState>([
        'idle',
        'walk',
        'eat',
        'call',
        'lie',
        'sit',
        'trot',
        'run',
        'flee',
        'skip',
        'roar',
        'attack',
        'death',
      ]);
      const mappedState: CrocodileState = validCrocStates.has(animId as CrocodileState)
        ? (animId as CrocodileState)
        : 'idle';

      if (lastCrocAnimId !== animId) {
        if (mappedState === 'death') {
          crocodile.animator.restartState('death');
        } else {
          crocodile.setState(mappedState);
        }
        lastCrocAnimId = animId;
      }

      if (dt > 0) {
        crocodile.update(dt);
      } else {
        crocodile.animator.setNormalizedPhase(p);
      }
    };
  }

  // 8D. JUNGLE JAGUAR (full 43-bone skeleton + 14 animations)
  else if (entityId === 'jungle_jaguar') {
    const jagRoot = new THREE.Group();
    root.add(jagRoot);

    const jaguar = createReadyJaguar({
      castShadow: true,
      receiveShadow: true,
    });
    jaguar.animator.loopDeath = true;
    jagRoot.add(jaguar.object);

    const jagMat = jaguar.mesh.material;
    if (Array.isArray(jagMat)) {
      for (const m of jagMat) disposableMaterials.push(m);
    } else {
      disposableMaterials.push(jagMat);
    }
    disposableGeometries.push(jaguar.mesh.geometry);

    editableRigTargets.bodyNodes.push(jagRoot);

    customApplySkin = (skin) => {
      const tintHex =
        skin.id === 'jaguar_rosette_classic' ? 0xffffff : skin.palette.primaryHex;
      const mat = jaguar.mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        mat.color.setHex(tintHex);
      }
    };

    let lastJagAnimTime = 0;
    let lastJagAnimId = '';
    customApplyAnimation = (animId, t, p) => {
      const rawDt = t >= lastJagAnimTime ? t - lastJagAnimTime : t;
      const dt = rawDt > 0 ? Math.min(0.1, rawDt) : 0;
      lastJagAnimTime = t;

      jagRoot.position.set(0, 0, 0);
      jagRoot.rotation.set(0, 0, 0);

      if (animId === 'none') {
        if (lastJagAnimId !== 'none') {
          jaguar.rig.resetToRest();
          jaguar.object.position.set(0, 0, 0);
          jaguar.object.rotation.set(0, 0, 0);
          jaguar.setState('idle');
          lastJagAnimId = 'none';
        }
        return;
      }

      const validJagStates: ReadonlySet<JaguarState> = new Set<JaguarState>([
        'idle',
        'walk',
        'stalk',
        'eat',
        'call',
        'lie',
        'sit',
        'trot',
        'run',
        'flee',
        'skip',
        'roar',
        'attack',
        'death',
      ]);
      const mappedState: JaguarState = validJagStates.has(animId as JaguarState)
        ? (animId as JaguarState)
        : 'idle';

      if (lastJagAnimId !== animId) {
        if (mappedState === 'death') {
          jaguar.animator.restartState('death');
        } else {
          jaguar.setState(mappedState);
        }
        lastJagAnimId = animId;
      }

      if (dt > 0) {
        jaguar.update(dt);
      } else {
        jaguar.animator.setNormalizedPhase(p);
      }
    };
  }

  // 8E. FOREST WOLF (full 59-bone skeleton + 15 animations)
  else if (entityId === 'forest_wolf') {
    const wolfRoot = new THREE.Group();
    root.add(wolfRoot);

    const wolf = createReadyWolf({
      castShadow: true,
      receiveShadow: true,
    });
    wolf.animator.loopDeath = true;
    wolfRoot.add(wolf.object);

    const wolfMat = wolf.mesh.material;
    if (Array.isArray(wolfMat)) {
      for (const m of wolfMat) disposableMaterials.push(m);
    } else {
      disposableMaterials.push(wolfMat);
    }
    disposableGeometries.push(wolf.mesh.geometry);

    editableRigTargets.bodyNodes.push(wolfRoot);

    customApplySkin = (skin) => {
      const tintHex =
        skin.id === 'wolf_timber_classic' ? 0xffffff : skin.palette.primaryHex;
      const mat = wolf.mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        mat.color.setHex(tintHex);
      }
    };

    let lastWolfAnimTime = 0;
    let lastWolfAnimId = '';
    customApplyAnimation = (animId, t, p) => {
      const rawDt = t >= lastWolfAnimTime ? t - lastWolfAnimTime : t;
      const dt = rawDt > 0 ? Math.min(0.1, rawDt) : 0;
      lastWolfAnimTime = t;

      wolfRoot.position.set(0, 0, 0);
      wolfRoot.rotation.set(0, 0, 0);

      if (animId === 'none') {
        if (lastWolfAnimId !== 'none') {
          wolf.rig.resetToRest();
          wolf.object.position.set(0, 0, 0);
          wolf.object.rotation.set(0, 0, 0);
          wolf.setState('idle');
          lastWolfAnimId = 'none';
        }
        return;
      }

      const validWolfStates: ReadonlySet<WolfState> = new Set<WolfState>([
        'idle',
        'walk',
        'trot',
        'stalk',
        'run',
        'flee',
        'skip',
        'eat',
        'call',
        'howl',
        'roar',
        'sit',
        'lie',
        'attack',
        'death',
      ]);
      const mappedState: WolfState = validWolfStates.has(animId as WolfState)
        ? (animId as WolfState)
        : 'idle';

      if (lastWolfAnimId !== animId) {
        if (mappedState === 'death') {
          wolf.animator.restartState('death');
        } else {
          wolf.setState(mappedState);
        }
        lastWolfAnimId = animId;
      }

      if (dt > 0) {
        wolf.update(dt);
      } else {
        wolf.animator.setNormalizedPhase(p);
      }
    };
  }

  // 8F. SAVANNA RHINO (full 47-bone skeleton + 13 animations)
  else if (entityId === 'savanna_rhino') {
    const rhinoRoot = new THREE.Group();
    root.add(rhinoRoot);

    const rhino = createReadyRhino({
      castShadow: true,
      receiveShadow: true,
    });
    rhino.animator.loopDeath = true;
    rhinoRoot.add(rhino.object);

    const rhinoMat = rhino.mesh.material;
    if (Array.isArray(rhinoMat)) {
      for (const m of rhinoMat) disposableMaterials.push(m);
    } else {
      disposableMaterials.push(rhinoMat);
    }
    disposableGeometries.push(rhino.mesh.geometry);

    editableRigTargets.bodyNodes.push(rhinoRoot);

    customApplySkin = (skin) => {
      const tintHex =
        skin.id === 'rhino_savanna_classic' ? 0xffffff : skin.palette.primaryHex;
      const mat = rhino.mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        mat.color.setHex(tintHex);
      }
    };

    let lastRhinoAnimTime = 0;
    let lastRhinoAnimId = '';
    customApplyAnimation = (animId, t, p) => {
      const rawDt = t >= lastRhinoAnimTime ? t - lastRhinoAnimTime : t;
      const dt = rawDt > 0 ? Math.min(0.1, rawDt) : 0;
      lastRhinoAnimTime = t;

      rhinoRoot.position.set(0, 0, 0);
      rhinoRoot.rotation.set(0, 0, 0);

      if (animId === 'none') {
        if (lastRhinoAnimId !== 'none') {
          rhino.rig.resetToRest();
          rhino.object.position.set(0, 0, 0);
          rhino.object.rotation.set(0, 0, 0);
          rhino.setState('idle');
          lastRhinoAnimId = 'none';
        }
        return;
      }

      const validRhinoStates: ReadonlySet<RhinoState> = new Set<RhinoState>([
        'idle',
        'walk',
        'trot',
        'run',
        'flee',
        'skip',
        'eat',
        'call',
        'roar',
        'sit',
        'lie',
        'attack',
        'death',
      ]);
      const mappedState: RhinoState = validRhinoStates.has(animId as RhinoState)
        ? (animId as RhinoState)
        : 'idle';

      if (lastRhinoAnimId !== animId) {
        if (mappedState === 'death') {
          rhino.animator.restartState('death');
        } else {
          rhino.setState(mappedState);
        }
        lastRhinoAnimId = animId;
      }

      if (dt > 0) {
        rhino.update(dt);
      } else {
        rhino.animator.setNormalizedPhase(p);
      }
    };
  }

  // 8G. SAVANNA LION (full 61-bone skeleton + 11 animations)
  else if (entityId === 'savanna_lion') {
    const lionRoot = new THREE.Group();
    root.add(lionRoot);

    const lion = createReadyCatLion({
      castShadow: true,
      receiveShadow: true,
    });
    lion.animator.loopDeath = true;
    lionRoot.add(lion.object);

    const lionMat = lion.mesh.material;
    if (Array.isArray(lionMat)) {
      for (const m of lionMat) disposableMaterials.push(m);
    } else {
      disposableMaterials.push(lionMat);
    }
    disposableGeometries.push(lion.mesh.geometry);

    const lionSaddleMat = lion.saddleMesh.material;
    if (Array.isArray(lionSaddleMat)) {
      for (const m of lionSaddleMat) disposableMaterials.push(m);
    } else {
      disposableMaterials.push(lionSaddleMat);
    }
    disposableGeometries.push(lion.saddleMesh.geometry);

    editableRigTargets.leftWeaponNodes.push(lion.saddleMesh);
    editableRigTargets.bodyNodes.push(lionRoot);

    customApplySkin = (skin) => {
      const tintHex =
        skin.id === 'lion_savanna_gold' ? 0xffffff : skin.palette.primaryHex;
      const mat = lion.mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        mat.color.setHex(tintHex);
      }
    };

    let lastLionAnimTime = 0;
    let lastLionAnimId = '';
    customApplyAnimation = (animId, t, p) => {
      const rawDt = t >= lastLionAnimTime ? t - lastLionAnimTime : t;
      const dt = rawDt > 0 ? Math.min(0.1, rawDt) : 0;
      lastLionAnimTime = t;

      lionRoot.position.set(0, 0, 0);
      lionRoot.rotation.set(0, 0, 0);

      if (animId === 'none') {
        if (lastLionAnimId !== 'none') {
          lion.rig.resetToRest();
          lion.object.position.set(0, 0, 0);
          lion.object.rotation.set(0, 0, 0);
          lion.setState('idle');
          lastLionAnimId = 'none';
        }
        return;
      }

      const validLionStates: ReadonlySet<CatLionState> = new Set<CatLionState>([
        'idle',
        'walk',
        'trot',
        'run',
        'eat',
        'call',
        'roar',
        'bite_attack',
        'sit',
        'lie',
        'death',
      ]);
      const mappedState: CatLionState = validLionStates.has(animId as CatLionState)
        ? (animId as CatLionState)
        : 'idle';

      if (lastLionAnimId !== animId) {
        if (mappedState === 'death') {
          lion.animator.restartState('death');
        } else {
          lion.setState(mappedState);
        }
        lastLionAnimId = animId;
      }

      if (dt > 0) {
        lion.update(dt);
      } else {
        lion.animator.setNormalizedPhase(p);
      }
    };
  }

  // 8H. ROYAL FOREST STAG (full 61-bone skeleton + 14 animations)
  else if (entityId === 'royal_stag') {
    const stagRoot = new THREE.Group();
    root.add(stagRoot);

    const stag = createReadyStag({
      castShadow: true,
      receiveShadow: true,
    });
    stag.animator.loopDeath = true;
    stagRoot.add(stag.object);

    const stagMat = stag.mesh.material;
    if (Array.isArray(stagMat)) {
      for (const m of stagMat) disposableMaterials.push(m);
    } else {
      disposableMaterials.push(stagMat);
    }
    disposableGeometries.push(stag.mesh.geometry);

    const stagSaddleMat = stag.saddleMesh.material;
    if (Array.isArray(stagSaddleMat)) {
      for (const m of stagSaddleMat) disposableMaterials.push(m);
    } else {
      disposableMaterials.push(stagSaddleMat);
    }
    disposableGeometries.push(stag.saddleMesh.geometry);

    editableRigTargets.leftWeaponNodes.push(stag.saddleMesh);
    editableRigTargets.bodyNodes.push(stagRoot);

    customApplySkin = (skin) => {
      const tintHex =
        skin.id === 'stag_royal_chestnut' ? 0xffffff : skin.palette.primaryHex;
      const mat = stag.mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        mat.color.setHex(tintHex);
      }
    };

    let lastStagAnimTime = 0;
    let lastStagAnimId = '';
    customApplyAnimation = (animId, t, p) => {
      const rawDt = t >= lastStagAnimTime ? t - lastStagAnimTime : t;
      const dt = rawDt > 0 ? Math.min(0.1, rawDt) : 0;
      lastStagAnimTime = t;

      stagRoot.position.set(0, 0, 0);
      stagRoot.rotation.set(0, 0, 0);

      if (animId === 'none') {
        if (lastStagAnimId !== 'none') {
          stag.rig.resetToRest();
          stag.object.position.set(0, 0, 0);
          stag.object.rotation.set(0, 0, 0);
          stag.setState('idle');
          lastStagAnimId = 'none';
        }
        return;
      }

      const validStagStates: ReadonlySet<StagState> = new Set<StagState>([
        'idle',
        'walk',
        'trot',
        'stalk',
        'run',
        'flee',
        'skip',
        'eat',
        'call',
        'roar',
        'sit',
        'lie',
        'attack',
        'death',
      ]);
      const mappedState: StagState = validStagStates.has(animId as StagState)
        ? (animId as StagState)
        : 'idle';

      if (lastStagAnimId !== animId) {
        if (mappedState === 'death') {
          stag.animator.restartState('death');
        } else {
          stag.setState(mappedState);
        }
        lastStagAnimId = animId;
      }

      if (dt > 0) {
        stag.update(dt);
      } else {
        stag.animator.setNormalizedPhase(p);
      }
    };
  }

  // 8I. SOUTHERN FOREST DRAGON (full 74-bone skeleton + 13 animations)
  else if (entityId === 'forest_dragon') {
    const dragonRoot = new THREE.Group();
    root.add(dragonRoot);

    const dragon = createReadyForestDragon({
      scale: 0.42,
      castShadow: true,
      receiveShadow: true,
    });
    dragon.loopDeath = true;
    dragonRoot.add(dragon.object);

    const dragonMat = dragon.mesh.material;
    if (Array.isArray(dragonMat)) {
      for (const m of dragonMat) disposableMaterials.push(m);
    } else {
      disposableMaterials.push(dragonMat);
    }
    disposableGeometries.push(dragon.mesh.geometry);

    editableRigTargets.bodyNodes.push(dragonRoot);

    customApplySkin = (skin) => {
      const tintHex =
        skin.id === 'forest_dragon_emerald' ? 0xffffff : skin.palette.primaryHex;
      const mat = dragon.mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        mat.color.setHex(tintHex);
      }
    };

    let lastDragonAnimTime = 0;
    let lastDragonAnimId = '';
    customApplyAnimation = (animId, t, p) => {
      const rawDt = t >= lastDragonAnimTime ? t - lastDragonAnimTime : t;
      const dt = rawDt > 0 ? Math.min(0.1, rawDt) : 0;
      lastDragonAnimTime = t;

      dragonRoot.position.set(0, 0, 0);
      dragonRoot.rotation.set(0, 0, 0);

      if (animId === 'none') {
        if (lastDragonAnimId !== 'none') {
          dragon.rig.resetToRest();
          dragon.object.position.set(0, 0, 0);
          dragon.object.rotation.set(0, 0, 0);
          dragon.setState('idle');
          lastDragonAnimId = 'none';
        }
        return;
      }

      const validDragonStates: ReadonlySet<ForestDragonState> = new Set<ForestDragonState>([
        'idle',
        'walk',
        'trot',
        'run',
        'fly',
        'stalk',
        'roar',
        'call',
        'attack',
        'sit',
        'lie',
        'sleep',
        'death',
      ]);
      const mappedState: ForestDragonState = validDragonStates.has(animId as ForestDragonState)
        ? (animId as ForestDragonState)
        : 'idle';

      if (lastDragonAnimId !== animId) {
        dragon.setState(mappedState);
        if (mappedState === 'death') {
          dragon.restartState();
        }
        lastDragonAnimId = animId;
      }

      if (dt > 0) {
        dragon.update(dt);
      } else {
        dragon.setNormalizedPhase(p);
      }
    };
  }

  // 8J. NORTHERN DEMON & FROST DRAGON (full 120-joint skeleton + 16 animations)
  else if (entityId === 'demon_dragon') {
    const dragonRoot = new THREE.Group();
    root.add(dragonRoot);

    const dragon = createReadyDemonDragon({
      scale: 0.42,
      castShadow: true,
      receiveShadow: true,
    });
    dragon.loopDeath = true;
    dragonRoot.add(dragon.object);

    const dragonMat = dragon.mesh.material;
    if (Array.isArray(dragonMat)) {
      for (const m of dragonMat) disposableMaterials.push(m);
    } else {
      disposableMaterials.push(dragonMat);
    }
    disposableGeometries.push(dragon.mesh.geometry);

    editableRigTargets.bodyNodes.push(dragonRoot);

    customApplySkin = (skin) => {
      const tintHex =
        skin.id === 'demon_dragon_classic' ? 0xffffff : skin.palette.primaryHex;
      const mat = dragon.mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        mat.color.setHex(tintHex);
      }
    };

    let lastDemonAnimTime = 0;
    let lastDemonAnimId = '';
    customApplyAnimation = (animId, t, p) => {
      const rawDt = t >= lastDemonAnimTime ? t - lastDemonAnimTime : t;
      const dt = rawDt > 0 ? Math.min(0.1, rawDt) : 0;
      lastDemonAnimTime = t;

      dragonRoot.position.set(0, 0, 0);
      dragonRoot.rotation.set(0, 0, 0);

      if (animId === 'none') {
        if (lastDemonAnimId !== 'none') {
          dragon.rig.resetToRest();
          dragon.object.position.set(0, 0, 0);
          dragon.object.rotation.set(0, 0, 0);
          dragon.setState('idle');
          lastDemonAnimId = 'none';
        }
        return;
      }

      const validDemonStates: ReadonlySet<DemonDragonState> = new Set<DemonDragonState>([
        'idle',
        'walk',
        'trot',
        'run',
        'fly',
        'stalk',
        'roar',
        'call',
        'attack',
        'eat',
        'sit',
        'lie',
        'sleep',
        'flee',
        'skip',
        'death',
      ]);
      const mappedState: DemonDragonState = validDemonStates.has(animId as DemonDragonState)
        ? (animId as DemonDragonState)
        : 'idle';

      if (lastDemonAnimId !== animId) {
        dragon.setState(mappedState);
        if (mappedState === 'death') {
          dragon.restartState();
        }
        lastDemonAnimId = animId;
      }

      if (dt > 0) {
        dragon.update(dt);
      } else {
        dragon.setNormalizedPhase(p);
      }
    };
  }

  // 9. GRAZING SHEEP
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

  // 10 & 11. FOREST RABBIT & WOODLAND SQUIRREL
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

  // 12. GOLDEN MOUNTAIN EAGLE
  else if (entityId === 'mountain_eagle') {
    const bodyMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x3b2616,
        roughness: 0.6,
        side: THREE.DoubleSide,
      })
    );
    const headMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xc8963e,
        roughness: 0.55,
      })
    );
    const beakMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4 }));

    const birdGroup = new THREE.Group();
    birdGroup.position.y = 0.85;
    birdGroup.scale.setScalar(1.35);

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

    const wingInnerGeo = trackGeo(new THREE.BoxGeometry(0.85, 0.03, 0.26));
    wingInnerGeo.translate(-0.42, 0, 0);
    const leftWing = new THREE.Group();
    leftWing.position.set(-0.08, 0.04, 0.04);
    leftWing.add(new THREE.Mesh(wingInnerGeo, bodyMat));

    const rightWingGeo = trackGeo(new THREE.BoxGeometry(0.85, 0.03, 0.26));
    rightWingGeo.translate(0.42, 0, 0);
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
      birdGroup.position.set(0, 0.85, 0);
      birdGroup.rotation.set(0, 0, 0);
      leftWing.rotation.set(0, 0, 0.06);
      rightWing.rotation.set(0, 0, -0.06);
      tailFan.scale.x = 1.1;

      if (animId === 'none') return;
      const phase = p * Math.PI * 2;

      if (animId === 'eagle_soar') {
        const flap = Math.sin(phase) * 0.35;
        leftWing.rotation.z = flap;
        rightWing.rotation.z = -flap;
        birdGroup.position.y = 0.85 + Math.cos(phase) * 0.08;
      } else if (animId === 'eagle_dive') {
        birdGroup.rotation.x = 0.45;
        leftWing.rotation.set(0, 0.35, -0.2);
        rightWing.rotation.set(0, -0.35, 0.2);
      } else if (animId === 'eagle_power_flap') {
        const flap = Math.sin(phase * 2) * 0.72;
        leftWing.rotation.z = flap;
        rightWing.rotation.z = -flap;
        tailFan.scale.x = 1.45;
      }
    };
  }

  // 13. FLOCK BIRD / DOVE (full 75-joint Dove_Complete.ts skeleton + 14 animations)
  else if (entityId === 'flock_bird') {
    const doveRoot = new THREE.Group();
    root.add(doveRoot);

    const dove = createReadyDove({
      scale: 0.95,
      castShadow: true,
      receiveShadow: true,
    });
    dove.animator.loopDeath = true;
    doveRoot.add(dove.object);

    const doveMat = dove.mesh.material;
    if (Array.isArray(doveMat)) {
      for (const m of doveMat) disposableMaterials.push(m);
    } else {
      disposableMaterials.push(doveMat);
    }
    disposableGeometries.push(dove.mesh.geometry);

    const bones = dove.rig.bones;
    editableRigTargets.weaponNodes.push(bones[23]);
    editableRigTargets.leftWeaponNodes.push(bones[43]);
    editableRigTargets.rightLimbNodes.push(bones[48]);
    editableRigTargets.leftLimbNodes.push(bones[37]);
    editableRigTargets.headNodes.push(bones[43]);
    editableRigTargets.bodyNodes.push(doveRoot);

    customApplySkin = (skin) => {
      const tintHex =
        skin.id === 'bird_forest_swallow' ? 0xffffff : skin.palette.primaryHex;
      const mat = dove.mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        mat.color.setHex(tintHex);
      }
    };

    let lastDoveAnimTime = 0;
    let lastDoveAnimId = '';
    customApplyAnimation = (animId, t, p) => {
      const rawDt = t >= lastDoveAnimTime ? t - lastDoveAnimTime : t;
      const dt = rawDt > 0 ? Math.min(0.1, rawDt) : 0;
      lastDoveAnimTime = t;

      doveRoot.position.set(0, 0, 0);
      doveRoot.rotation.set(0, 0, 0);

      if (animId === 'none') {
        if (lastDoveAnimId !== 'none') {
          dove.rig.resetToRest();
          dove.object.position.set(0, 0, 0);
          dove.object.rotation.set(0, 0, 0);
          dove.setState('idle');
          lastDoveAnimId = 'none';
        }
        return;
      }

      const legacyBirdMap: Record<string, DoveState> = {
        bird_cruise: 'fly',
        bird_startled: 'flee',
        bird_glide_bank: 'fly',
      };
      const validDoveStates: ReadonlySet<DoveState> = new Set<DoveState>([
        'idle',
        'walk',
        'trot',
        'run',
        'flee',
        'skip',
        'eat',
        'call',
        'roar',
        'attack',
        'sit',
        'lie',
        'death',
        'fly',
      ]);
      const mappedState: DoveState =
        legacyBirdMap[animId] ??
        (validDoveStates.has(animId as DoveState) ? (animId as DoveState) : 'fly');

      if (lastDoveAnimId !== animId) {
        if (mappedState === 'death') {
          dove.restartState('death');
        } else {
          dove.setState(mappedState);
        }
        lastDoveAnimId = animId;
      }

      if (dt > 0) {
        dove.update(dt);
      } else {
        dove.animator.setNormalizedPhase(p);
      }
      dove.object.position.set(0, 0, 0);
      dove.object.rotation.set(0, 0, 0);
    };
  }

  // 14. HARBOR SEAGULL
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

  // 15. LAKESIDE KOI FISH — ARTICULATED 29-BONE SKELETAL CARP
  else if (entityId === 'koi_fish') {
    const koiRoot = new THREE.Group();
    koiRoot.position.y = 0.44;
    root.add(koiRoot);

    const koi = createReadyKoiFish({
      scale: 1.05,
      castShadow: true,
      receiveShadow: true,
    });
    koi.loopDeath = true;
    koiRoot.add(koi.object);

    const koiMat = koi.mesh.material;
    if (Array.isArray(koiMat)) {
      for (const m of koiMat) disposableMaterials.push(m);
    } else {
      disposableMaterials.push(koiMat);
    }
    disposableGeometries.push(koi.mesh.geometry);

    const rippleMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.35,
        roughness: 0.2,
      })
    );
    const rippleRing = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(0.32, 0.52, 28)),
      rippleMat
    );
    rippleRing.rotation.x = -Math.PI / 2;
    rippleRing.position.y = 0.03;
    root.add(rippleRing);

    editableRigTargets.weaponNodes.push(koi.rig.bones[5] ?? koi.rig.root);
    editableRigTargets.leftWeaponNodes.push(koi.rig.bones[6] ?? koi.rig.root);
    editableRigTargets.rightLimbNodes.push(koi.rig.bones[7] ?? koi.rig.root);
    editableRigTargets.leftLimbNodes.push(koi.rig.bones[8] ?? koi.rig.root);
    editableRigTargets.headNodes.push(koi.rig.bones[1] ?? koi.rig.root);
    editableRigTargets.bodyNodes.push(koiRoot);

    customApplySkin = (skin) => {
      const tintHex =
        skin.id === 'koi_imperial_gold' ? 0xffffff : skin.palette.primaryHex;
      const mat = koi.mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        mat.color.setHex(tintHex);
      }
    };

    let lastKoiAnimTime = 0;
    let lastKoiAnimId = '';
    customApplyAnimation = (animId, t, p) => {
      const rawDt = t >= lastKoiAnimTime ? t - lastKoiAnimTime : t;
      const dt = rawDt > 0 ? Math.min(0.1, rawDt) : 0;
      lastKoiAnimTime = t;

      koiRoot.position.set(0, 0.44, 0);
      koiRoot.rotation.set(0, 0, 0);
      rippleRing.scale.setScalar(1.0);

      if (animId === 'none') {
        if (lastKoiAnimId !== 'none') {
          koi.rig.resetToRest();
          koi.object.position.set(0, 0, 0);
          koi.object.rotation.set(0, 0, 0);
          koi.setState('idle');
          lastKoiAnimId = 'none';
        }
        return;
      }

      const legacyMap: Readonly<Record<string, KoiFishState>> = {
        koi_pond_swim: 'walk',
        koi_fast_dart: 'run',
        koi_surface_feed: 'eat',
      };
      const validKoiStates: ReadonlySet<KoiFishState> = new Set<KoiFishState>([
        'idle',
        'walk',
        'trot',
        'run',
        'stalk',
        'flee',
        'skip',
        'fly',
        'eat',
        'call',
        'roar',
        'sit',
        'lie',
        'attack',
        'death',
      ]);
      const mappedState: KoiFishState =
        legacyMap[animId] ??
        (validKoiStates.has(animId as KoiFishState) ? (animId as KoiFishState) : 'idle');

      if (lastKoiAnimId !== animId) {
        koi.setState(mappedState);
        if (mappedState === 'death') {
          koi.restartState();
        }
        lastKoiAnimId = animId;
      }

      if (dt > 0) {
        koi.update(dt);
      } else {
        koi.setNormalizedPhase(p);
      }

      const phase = p * Math.PI * 2;
      rippleRing.scale.setScalar(1.0 + Math.sin(phase * 2) * 0.14);
    };
  }

  // 16. MEADOW BUTTERFLY — STANDALONE
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

  // 15. IMPERIAL SKY DRAGON — 22 SEGMENTS
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

  // 15B. OASIS & RIVER HIPPOPOTAMUS (full 48-joint skeleton + 14 animations)
  else if (entityId === 'oasis_hippo') {
    const hippoRoot = new THREE.Group();
    root.add(hippoRoot);

    const hippo = createReadyHippo({
      scale: 0.72,
      castShadow: true,
      receiveShadow: true,
    });
    hippo.loopDeath = false;
    hippoRoot.add(hippo.object);

    const hippoMat = hippo.mesh.material;
    if (Array.isArray(hippoMat)) {
      for (const m of hippoMat) disposableMaterials.push(m);
    } else {
      disposableMaterials.push(hippoMat);
    }
    disposableGeometries.push(hippo.mesh.geometry);

    editableRigTargets.weaponNodes.push(hippo.rig.bones[5] ?? hippo.rig.root);
    editableRigTargets.leftWeaponNodes.push(hippo.rig.bones[6] ?? hippo.rig.root);
    editableRigTargets.rightLimbNodes.push(hippo.rig.bones[8] ?? hippo.rig.root);
    editableRigTargets.leftLimbNodes.push(hippo.rig.bones[12] ?? hippo.rig.root);
    editableRigTargets.headNodes.push(hippo.rig.bones[3] ?? hippo.rig.root);
    editableRigTargets.bodyNodes.push(hippoRoot);

    customApplySkin = (skin) => {
      const tintHex =
        skin.id === 'hippo_oasis_slate' ? 0xffffff : skin.palette.primaryHex;
      const mat = hippo.mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        mat.color.setHex(tintHex);
      }
    };

    let lastHippoAnimTime = 0;
    let lastHippoAnimId = '';
    customApplyAnimation = (animId, t, p) => {
      const rawDt = t >= lastHippoAnimTime ? t - lastHippoAnimTime : t;
      const dt = rawDt > 0 ? Math.min(0.1, rawDt) : 0;
      lastHippoAnimTime = t;

      hippoRoot.position.set(0, 0, 0);
      hippoRoot.rotation.set(0, 0, 0);

      if (animId === 'none') {
        if (lastHippoAnimId !== 'none') {
          hippo.rig.resetToRest();
          hippo.object.position.set(0, 0, 0);
          hippo.object.rotation.set(0, 0, 0);
          hippo.setState('idle');
          lastHippoAnimId = 'none';
        }
        return;
      }

      const validHippoStates: ReadonlySet<HippoState> = new Set<HippoState>([
        'idle',
        'walk',
        'trot',
        'run',
        'stalk',
        'flee',
        'skip',
        'eat',
        'call',
        'roar',
        'sit',
        'lie',
        'attack',
        'death',
      ]);
      const mappedState: HippoState = validHippoStates.has(animId as HippoState)
        ? (animId as HippoState)
        : 'idle';

      if (lastHippoAnimId !== animId) {
        hippo.setState(mappedState);
        if (mappedState === 'death' || mappedState === 'lie') {
          hippo.restartState(mappedState);
        }
        lastHippoAnimId = animId;
      }

      if (dt > 0) {
        hippo.update(dt);
      } else {
        hippo.setNormalizedPhase(p);
      }
    };
  }

  // 15C. COASTAL BOTTLENOSE DOLPHIN (full 25-joint skeleton + 14 animations)
  else if (entityId === 'ocean_dolphin') {
    const dolphinRoot = new THREE.Group();
    dolphinRoot.position.y = 0.56;
    root.add(dolphinRoot);

    const dolphin = createReadyDolphin({
      scale: 0.92,
      castShadow: true,
      receiveShadow: true,
    });
    dolphin.loopDeath = true;
    dolphinRoot.add(dolphin.object);

    const dolphinMat = dolphin.mesh.material;
    if (Array.isArray(dolphinMat)) {
      for (const m of dolphinMat) disposableMaterials.push(m);
    } else {
      disposableMaterials.push(dolphinMat);
    }
    disposableGeometries.push(dolphin.mesh.geometry);

    const oceanRingMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        transparent: true,
        opacity: 0.32,
        roughness: 0.18,
      })
    );
    const oceanRing = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(0.45, 0.72, 32)),
      oceanRingMat
    );
    oceanRing.rotation.x = -Math.PI / 2;
    oceanRing.position.y = 0.03;
    root.add(oceanRing);

    editableRigTargets.weaponNodes.push(dolphin.rig.bones[6] ?? dolphin.rig.root);
    editableRigTargets.leftWeaponNodes.push(dolphin.rig.bones[7] ?? dolphin.rig.root);
    editableRigTargets.rightLimbNodes.push(dolphin.rig.bones[8] ?? dolphin.rig.root);
    editableRigTargets.leftLimbNodes.push(dolphin.rig.bones[9] ?? dolphin.rig.root);
    editableRigTargets.headNodes.push(dolphin.rig.bones[2] ?? dolphin.rig.root);
    editableRigTargets.bodyNodes.push(dolphinRoot);

    customApplySkin = (skin) => {
      const tintHex =
        skin.id === 'dolphin_bottlenose_classic' ? 0xffffff : skin.palette.primaryHex;
      const mat = dolphin.mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        mat.color.setHex(tintHex);
      }
    };

    let lastDolphinAnimTime = 0;
    let lastDolphinAnimId = '';
    customApplyAnimation = (animId, t, p) => {
      const rawDt = t >= lastDolphinAnimTime ? t - lastDolphinAnimTime : t;
      const dt = rawDt > 0 ? Math.min(0.1, rawDt) : 0;
      lastDolphinAnimTime = t;

      dolphinRoot.position.set(0, 0.56, 0);
      dolphinRoot.rotation.set(0, 0, 0);
      oceanRing.scale.setScalar(1.0);

      if (animId === 'none') {
        if (lastDolphinAnimId !== 'none') {
          dolphin.rig.resetToRest();
          dolphin.object.position.set(0, 0, 0);
          dolphin.object.rotation.set(0, 0, 0);
          dolphin.setState('idle');
          lastDolphinAnimId = 'none';
        }
        return;
      }

      const validDolphinStates: ReadonlySet<DolphinState> = new Set<DolphinState>([
        'idle',
        'walk',
        'trot',
        'run',
        'stalk',
        'flee',
        'skip',
        'fly',
        'eat',
        'call',
        'roar',
        'sit',
        'lie',
        'attack',
        'death',
      ]);
      const mappedState: DolphinState = validDolphinStates.has(animId as DolphinState)
        ? (animId as DolphinState)
        : 'idle';

      if (lastDolphinAnimId !== animId) {
        dolphin.setState(mappedState);
        if (mappedState === 'death') {
          dolphin.restartState();
        }
        lastDolphinAnimId = animId;
      }

      if (dt > 0) {
        dolphin.update(dt);
      } else {
        dolphin.setNormalizedPhase(p);
      }

      const phase = p * Math.PI * 2;
      oceanRing.scale.setScalar(1.0 + Math.sin(phase * 2) * 0.16);
    };
  }

  // 16. COLOSSAL DWARVEN KING GUARDIAN STATUE
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

  // 17. SEATED GOLDEN BUDDHA ON LOTUS THRONE
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
    if (obj !== root && !(obj instanceof THREE.Bone)) {
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
// #endregion
