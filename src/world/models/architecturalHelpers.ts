// ============================================================================
// MODULE: World / Models / Architectural Helpers
// DESIGN: Reusable architectural construction primitives, roofs, doors, and lanterns (SRP)
// SUMMARY: Centralizes interactive double doors, Chinese pagoda roofs, perimeter skirt roofs,
//          hanging red lanterns, fluttering imperial flags, and imperial material sets.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import { attachFlagHorizontalWaveShader } from '../builders/shaderAndMaterialBuilders';
import type { WorldModelBuildContext } from './types';
// #endregion

// ======================== ARCHITECTURAL ASSETS INTERFACE ======================== \\
// #region Architectural Assets Interface
export interface IArchitecturalSharedAssets {
  readonly imperialGoldMat: THREE.MeshStandardMaterial;
  readonly imperialDoorWoodMat: THREE.MeshStandardMaterial;
  readonly pagodaTileMat: THREE.MeshStandardMaterial;
  readonly imperialCrimsonMat: THREE.MeshStandardMaterial;
  readonly redLanternMat: THREE.MeshStandardMaterial;
  readonly redFlagMat: THREE.MeshStandardMaterial;
  readonly warmLanternMat: THREE.MeshStandardMaterial;
  readonly mineGoldOreMat: THREE.MeshStandardMaterial;
  readonly carvedMarbleMat: THREE.MeshStandardMaterial;
  readonly jadeBeamMat: THREE.MeshStandardMaterial;
  createInteractiveDoubleDoor: (
    doorId: string,
    centerX: number,
    baseY: number,
    centerZ: number,
    openingWidth: number,
    doorHeight: number
  ) => THREE.Group;
  createChinesePagodaRoof: (width: number, depth: number, height: number) => THREE.Group;
  createChinesePerimeterSkirtRoof: (
    innerWidth: number,
    innerDepth: number,
    overhang?: number,
    skirtHeight?: number
  ) => THREE.Group;
  createRedChineseLantern: (lx: number, ly: number, lz: number) => THREE.Group;
  createRedImperialFlag: (px: number, py: number, pz: number, rotY?: number) => THREE.Group;
  createAngledWatchtowerFlag: (px: number, py: number, pz: number, outwardYaw: number) => THREE.Group;
  createOrnatePaifangGate: (gateZ: number, gateY: number) => THREE.Group;
}
export type ArchitecturalSharedAssets = IArchitecturalSharedAssets;
// #endregion

// ======================== FACTORY FUNCTION ======================== \\
// #region Factory Function
/**
 * Instantiates shared architectural materials and construction helper functions.
 */
export function createArchitecturalSharedAssets(ctx: WorldModelBuildContext): ArchitecturalSharedAssets {
  const {
    textures,
    isSoftwareGl,
    disposableGeometries,
    disposableMaterials,
    swayMaterials,
    doorPivotHandles,
  } = ctx;

  const imperialGoldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.28,
    metalness: 0.85,
  });
  const imperialDoorWoodMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    map: textures.timberAlbedo,
    bumpMap: textures.barkBump,
    bumpScale: 0.04,
    roughness: 0.65,
    metalness: 0.05,
  });
  const pagodaTileMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.38,
    metalness: 0.25,
  });
  const imperialCrimsonMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.62,
    metalness: 0.08,
  });
  const redLanternMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xd97706,
    emissiveIntensity: 0.72,
    roughness: 0.35,
  });
  const warmLanternMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.95,
    roughness: 0.22,
  });
  const mineGoldOreMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.92,
    roughness: 0.22,
  });

  const redFlagMat = new THREE.MeshStandardMaterial({
    color: 0xc91e14,
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
  const flagWidth = 1.35;
  attachFlagHorizontalWaveShader(redFlagMat, flagWidth, 0.24, 5.2, swayMaterials);

  const carvedMarbleMat = new THREE.MeshStandardMaterial({
    color: 0xd8d4cc,
    map: textures.rockAlbedo,
    roughness: 0.68,
    metalness: 0.06,
  });
  const jadeBeamMat = new THREE.MeshStandardMaterial({
    color: 0x166534,
    roughness: 0.35,
    metalness: 0.18,
  });

  disposableMaterials.push(
    imperialGoldMat,
    imperialDoorWoodMat,
    pagodaTileMat,
    imperialCrimsonMat,
    redLanternMat,
    warmLanternMat,
    mineGoldOreMat,
    redFlagMat,
    carvedMarbleMat,
    jadeBeamMat
  );

  const doorRingGeo = new THREE.TorusGeometry(0.11, 0.025, 6, 12);
  const roofHornGeo = new THREE.ConeGeometry(0.24, 1.05, 5);
  const cLanternSphereGeo = new THREE.SphereGeometry(0.36, 12, 10);
  cLanternSphereGeo.scale(1.15, 0.88, 1.15);
  const cLanternCapGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 8);
  const cLanternTasselGeo = new THREE.CylinderGeometry(0.03, 0.08, 0.42, 6);

  const flagPoleGeo = new THREE.CylinderGeometry(0.048, 0.058, 3.9, 8);
  flagPoleGeo.translate(0, 1.95, 0);
  const flagFinialGeo = new THREE.SphereGeometry(0.1, 8, 8);
  flagFinialGeo.translate(0, 3.95, 0);
  const flagBannerGeo = new THREE.PlaneGeometry(flagWidth, 1.65, 14, 4);
  flagBannerGeo.translate(flagWidth * 0.5, 2.88, 0);

  const angledPoleLen = 2.85;
  const angledPoleGeo = new THREE.CylinderGeometry(0.042, 0.055, angledPoleLen, 8);
  angledPoleGeo.rotateZ(-Math.PI / 2);
  angledPoleGeo.translate(angledPoleLen * 0.5, 0, 0);
  const angledFinialGeo = new THREE.SphereGeometry(0.095, 8, 8);
  angledFinialGeo.translate(angledPoleLen + 0.05, 0, 0);
  const angledBracketGeo = new THREE.BoxGeometry(0.24, 0.34, 0.24);
  const angledBannerGeo = new THREE.PlaneGeometry(1.85, 1.35, 14, 4);
  angledBannerGeo.translate(1.32, -0.74, 0);

  const paifangDrumGeo = new THREE.CylinderGeometry(0.56, 0.64, 1.1, 12);
  paifangDrumGeo.translate(0, 0.55, 0);
  const paifangColMainGeo = new THREE.CylinderGeometry(0.36, 0.38, 7.8, 12);
  paifangColMainGeo.translate(0, 3.9, 0);
  const paifangColSideGeo = new THREE.CylinderGeometry(0.32, 0.34, 6.4, 12);
  paifangColSideGeo.translate(0, 3.2, 0);
  const paifangBeamCenterGeo = new THREE.BoxGeometry(5.6, 1.15, 0.85);
  const paifangBeamSideGeo = new THREE.BoxGeometry(3.4, 0.95, 0.78);
  const paifangPlaqueGeo = new THREE.BoxGeometry(2.8, 1.25, 0.96);
  const guardianPedestalGeo = new THREE.BoxGeometry(0.95, 0.95, 1.15);
  guardianPedestalGeo.translate(0, 0.47, 0);
  const guardianLionBodyGeo = new THREE.DodecahedronGeometry(0.48, 1);

  disposableGeometries.push(
    doorRingGeo,
    roofHornGeo,
    cLanternSphereGeo,
    cLanternCapGeo,
    cLanternTasselGeo,
    flagPoleGeo,
    flagFinialGeo,
    flagBannerGeo,
    angledPoleGeo,
    angledFinialGeo,
    angledBracketGeo,
    angledBannerGeo,
    paifangDrumGeo,
    paifangColMainGeo,
    paifangColSideGeo,
    paifangBeamCenterGeo,
    paifangBeamSideGeo,
    paifangPlaqueGeo,
    guardianPedestalGeo,
    guardianLionBodyGeo
  );

  function createInteractiveDoubleDoor(
    doorId: string,
    centerX: number,
    baseY: number,
    centerZ: number,
    openingWidth: number,
    doorHeight: number
  ): THREE.Group {
    const doorRoot = new THREE.Group();
    doorRoot.position.set(centerX, baseY, centerZ);

    const leafW = openingWidth * 0.5 - 0.02;
    const leafGeo = new THREE.BoxGeometry(leafW, doorHeight, 0.14);
    leafGeo.translate(leafW * 0.5, doorHeight * 0.5, 0);
    const framePostGeo = new THREE.BoxGeometry(0.22, doorHeight + 0.2, 0.62);
    framePostGeo.translate(0, (doorHeight + 0.2) * 0.5, 0);
    const frameLintelGeo = new THREE.BoxGeometry(openingWidth + 0.5, 0.28, 0.66);
    disposableGeometries.push(leafGeo, framePostGeo, frameLintelGeo);

    // Ornate Gold-Trimmed Door Frame
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(framePostGeo, imperialGoldMat);
      post.position.set(sx * (openingWidth * 0.5 + 0.08), 0, 0);
      doorRoot.add(post);
    }
    const lintel = new THREE.Mesh(frameLintelGeo, imperialGoldMat);
    lintel.position.set(0, doorHeight + 0.12, 0);
    doorRoot.add(lintel);

    // Left Hinged Door Leaf
    const leftPivot = new THREE.Group();
    leftPivot.position.set(-openingWidth * 0.5, 0, 0);
    const leftLeaf = new THREE.Mesh(leafGeo, imperialDoorWoodMat);
    leftLeaf.castShadow = !isSoftwareGl;
    leftPivot.add(leftLeaf);

    // Right Hinged Door Leaf
    const rightPivot = new THREE.Group();
    rightPivot.position.set(openingWidth * 0.5, 0, 0);
    const rightLeaf = new THREE.Mesh(leafGeo, imperialDoorWoodMat);
    rightLeaf.scale.x = -1;
    rightLeaf.castShadow = !isSoftwareGl;
    rightPivot.add(rightLeaf);

    const studRowBarGeo = new THREE.BoxGeometry(Math.max(0.2, leafW - 0.36), 0.06, 0.04);
    disposableGeometries.push(studRowBarGeo);
    for (const faceZ of [-0.08, 0.08]) {
      for (const rowY of [0.65, 1.2, doorHeight - 0.65, doorHeight - 0.35]) {
        const barL = new THREE.Mesh(studRowBarGeo, imperialGoldMat);
        barL.position.set(leafW * 0.5, rowY, faceZ);
        leftPivot.add(barL);
        const barR = new THREE.Mesh(studRowBarGeo, imperialGoldMat);
        barR.position.set(-leafW * 0.5, rowY, faceZ);
        rightPivot.add(barR);
      }
      const ringL = new THREE.Mesh(doorRingGeo, imperialGoldMat);
      ringL.position.set(leafW - 0.22, doorHeight * 0.46, faceZ);
      leftPivot.add(ringL);
      const ringR = new THREE.Mesh(doorRingGeo, imperialGoldMat);
      ringR.position.set(-(leafW - 0.22), doorHeight * 0.46, faceZ);
      rightPivot.add(ringR);
    }

    doorRoot.add(leftPivot, rightPivot);
    doorPivotHandles.push({ id: doorId, leftPivot, rightPivot, currentAngle: 0 });
    return doorRoot;
  }

  function createChinesePagodaRoof(width: number, depth: number, height: number): THREE.Group {
    const rGroup = new THREE.Group();
    const mainRoofGeo = new THREE.ConeGeometry(1.0, height, 4);
    mainRoofGeo.rotateY(Math.PI / 4);
    mainRoofGeo.scale(width * 0.74, 1.0, depth * 0.74);

    const lowerFlangeGeo = new THREE.BoxGeometry(width * 1.06, 0.26, depth * 1.06);
    const ridgeBarGeo = new THREE.BoxGeometry(width * 0.62, 0.34, 0.38);
    disposableGeometries.push(mainRoofGeo, lowerFlangeGeo, ridgeBarGeo);

    const roofMesh = new THREE.Mesh(mainRoofGeo, pagodaTileMat);
    roofMesh.position.y = height * 0.5;
    roofMesh.castShadow = !isSoftwareGl;
    roofMesh.receiveShadow = !isSoftwareGl;
    rGroup.add(roofMesh);

    const flangeMesh = new THREE.Mesh(lowerFlangeGeo, pagodaTileMat);
    flangeMesh.position.y = 0.13;
    rGroup.add(flangeMesh);

    const ridgeMesh = new THREE.Mesh(ridgeBarGeo, imperialGoldMat);
    ridgeMesh.position.y = height * 0.92;
    rGroup.add(ridgeMesh);

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const horn = new THREE.Mesh(roofHornGeo, imperialGoldMat);
        horn.position.set(sx * width * 0.52, 0.4, sz * depth * 0.52);
        horn.rotation.z = -sx * 0.55;
        horn.rotation.x = sz * 0.55;
        rGroup.add(horn);
      }
    }
    return rGroup;
  }

  function createChinesePerimeterSkirtRoof(
    innerWidth: number,
    innerDepth: number,
    overhang = 2.2,
    skirtHeight = 1.1
  ): THREE.Group {
    const sGroup = new THREE.Group();
    const inW = Math.max(1.0, innerWidth - 0.36);
    const inD = Math.max(1.0, innerDepth - 0.36);
    const outerW = innerWidth + overhang * 2;
    const outerD = innerDepth + overhang * 2;

    const frustumGeo = new THREE.CylinderGeometry(1, 1, skirtHeight, 4, 1, true);
    frustumGeo.rotateY(Math.PI / 4);
    const posAttr = frustumGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      if (vy > 0) {
        posAttr.setXYZ(
          i,
          (vx >= 0 ? 1 : -1) * (inW * 0.5),
          0,
          (vz >= 0 ? 1 : -1) * (inD * 0.5)
        );
      } else {
        posAttr.setXYZ(
          i,
          (vx >= 0 ? 1 : -1) * (outerW * 0.5),
          -skirtHeight,
          (vz >= 0 ? 1 : -1) * (outerD * 0.5)
        );
      }
    }
    frustumGeo.computeVertexNormals();

    const soffitGeo = new THREE.CylinderGeometry(1, 1, 0.08, 4, 1, true);
    soffitGeo.rotateY(Math.PI / 4);
    const sofAttr = soffitGeo.attributes.position;
    for (let i = 0; i < sofAttr.count; i++) {
      const vx = sofAttr.getX(i);
      const vy = sofAttr.getY(i);
      const vz = sofAttr.getZ(i);
      const halfW = vy > 0 ? outerW * 0.5 : inW * 0.5;
      const halfD = vy > 0 ? outerD * 0.5 : inD * 0.5;
      sofAttr.setXYZ(
        i,
        (vx >= 0 ? 1 : -1) * halfW,
        -skirtHeight + 0.04,
        (vz >= 0 ? 1 : -1) * halfD
      );
    }
    soffitGeo.computeVertexNormals();

    const fbFlangeGeo = new THREE.BoxGeometry(outerW + 0.36, 0.22, 0.42);
    const weFlangeGeo = new THREE.BoxGeometry(0.42, 0.22, outerD + 0.36);
    disposableGeometries.push(frustumGeo, soffitGeo, fbFlangeGeo, weFlangeGeo);

    const skirtMat = pagodaTileMat.clone();
    skirtMat.side = THREE.DoubleSide;
    disposableMaterials.push(skirtMat);

    const frustumMesh = new THREE.Mesh(frustumGeo, skirtMat);
    frustumMesh.castShadow = !isSoftwareGl;
    frustumMesh.receiveShadow = !isSoftwareGl;
    const soffitMesh = new THREE.Mesh(soffitGeo, imperialCrimsonMat);
    sGroup.add(frustumMesh, soffitMesh);

    for (const sz of [-1, 1]) {
      const flangeMesh = new THREE.Mesh(fbFlangeGeo, pagodaTileMat);
      flangeMesh.position.set(0, -skirtHeight + 0.11, sz * (outerD * 0.5));
      sGroup.add(flangeMesh);
    }
    for (const sx of [-1, 1]) {
      const flangeMesh = new THREE.Mesh(weFlangeGeo, pagodaTileMat);
      flangeMesh.position.set(sx * (outerW * 0.5), -skirtHeight + 0.11, 0);
      sGroup.add(flangeMesh);
    }

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const horn = new THREE.Mesh(roofHornGeo, imperialGoldMat);
        horn.position.set(sx * outerW * 0.5, -skirtHeight + 0.34, sz * outerD * 0.5);
        horn.rotation.z = -sx * 0.55;
        horn.rotation.x = sz * 0.55;
        sGroup.add(horn);
      }
    }

    return sGroup;
  }

  function createRedChineseLantern(lx: number, ly: number, lz: number): THREE.Group {
    const lg = new THREE.Group();
    lg.position.set(lx, ly, lz);
    lg.add(new THREE.Mesh(cLanternSphereGeo, redLanternMat));
    const topCap = new THREE.Mesh(cLanternCapGeo, imperialGoldMat);
    topCap.position.y = 0.32;
    const botCap = new THREE.Mesh(cLanternCapGeo, imperialGoldMat);
    botCap.position.y = -0.32;
    const tassel = new THREE.Mesh(cLanternTasselGeo, imperialGoldMat);
    tassel.position.y = -0.56;
    lg.add(topCap, botCap, tassel);
    return lg;
  }

  function createRedImperialFlag(px: number, py: number, pz: number, rotY = 0): THREE.Group {
    const flagGroup = new THREE.Group();
    flagGroup.position.set(px, py, pz);
    flagGroup.rotation.y = rotY;

    const pole = new THREE.Mesh(flagPoleGeo, imperialGoldMat);
    pole.castShadow = !isSoftwareGl;
    const finial = new THREE.Mesh(flagFinialGeo, imperialGoldMat);
    const banner = new THREE.Mesh(flagBannerGeo, redFlagMat);
    banner.castShadow = !isSoftwareGl;

    flagGroup.add(pole, finial, banner);
    return flagGroup;
  }

  function createAngledWatchtowerFlag(
    fx: number,
    fy: number,
    fz: number,
    outwardYaw: number
  ): THREE.Group {
    const fg = new THREE.Group();
    fg.position.set(fx, fy, fz);
    fg.rotation.y = outwardYaw;
    const bracket = new THREE.Mesh(angledBracketGeo, imperialGoldMat);
    const polePivot = new THREE.Group();
    // Tilt pole 22 degrees above horizontal so it projects diagonally outward from the pillar, clear of the roof
    polePivot.rotation.z = 0.38;
    polePivot.add(
      new THREE.Mesh(angledPoleGeo, imperialGoldMat),
      new THREE.Mesh(angledFinialGeo, imperialGoldMat),
      new THREE.Mesh(angledBannerGeo, redFlagMat)
    );
    fg.add(bracket, polePivot);
    return fg;
  }

  function createOrnatePaifangGate(gateZ: number, gateY: number): THREE.Group {
    const paifangGroup = new THREE.Group();
    paifangGroup.position.set(0, gateY, gateZ);

    for (const px of [-2.6, 2.6]) {
      const drum = new THREE.Mesh(paifangDrumGeo, carvedMarbleMat);
      drum.position.x = px;
      const col = new THREE.Mesh(paifangColMainGeo, imperialCrimsonMat);
      col.position.x = px;
      col.castShadow = !isSoftwareGl;
      paifangGroup.add(drum, col);
    }
    for (const px of [-5.6, 5.6]) {
      const drum = new THREE.Mesh(paifangDrumGeo, carvedMarbleMat);
      drum.position.x = px;
      const col = new THREE.Mesh(paifangColSideGeo, imperialCrimsonMat);
      col.position.x = px;
      col.castShadow = !isSoftwareGl;
      paifangGroup.add(drum, col);
    }

    const centerBeam = new THREE.Mesh(paifangBeamCenterGeo, jadeBeamMat);
    centerBeam.position.set(0, 6.35, 0);
    const plaque = new THREE.Mesh(paifangPlaqueGeo, imperialGoldMat);
    plaque.position.set(0, 6.95, 0);
    paifangGroup.add(centerBeam, plaque);

    for (const sx of [-4.1, 4.1]) {
      const sideBeam = new THREE.Mesh(paifangBeamSideGeo, jadeBeamMat);
      sideBeam.position.set(sx, 5.2, 0);
      paifangGroup.add(sideBeam);
    }

    const centerGateRoof = createChinesePagodaRoof(7.2, 3.5, 2.3);
    centerGateRoof.position.set(0, 7.65, 0);
    paifangGroup.add(centerGateRoof);

    for (const sx of [-4.1, 4.1]) {
      const sideGateRoof = createChinesePagodaRoof(4.4, 3.0, 1.8);
      sideGateRoof.position.set(sx, 5.9, 0);
      paifangGroup.add(sideGateRoof);
    }

    for (const lx of [-4.1, -1.3, 1.3, 4.1]) {
      paifangGroup.add(createRedChineseLantern(lx, lx === -1.3 || lx === 1.3 ? 5.35 : 4.35, 0));
    }

    for (const lx of [-3.1, 3.1]) {
      const ped = new THREE.Mesh(guardianPedestalGeo, carvedMarbleMat);
      ped.position.set(lx, 0, 1.35);
      const lion = new THREE.Mesh(guardianLionBodyGeo, carvedMarbleMat);
      lion.position.set(lx, 1.35, 1.35);
      lion.scale.set(0.9, 1.35, 1.15);
      paifangGroup.add(ped, lion);
    }
    return paifangGroup;
  }

  return {
    imperialGoldMat,
    imperialDoorWoodMat,
    pagodaTileMat,
    imperialCrimsonMat,
    redLanternMat,
    warmLanternMat,
    mineGoldOreMat,
    redFlagMat,
    carvedMarbleMat,
    jadeBeamMat,
    createInteractiveDoubleDoor,
    createChinesePagodaRoof,
    createChinesePerimeterSkirtRoof,
    createRedChineseLantern,
    createRedImperialFlag,
    createAngledWatchtowerFlag,
    createOrnatePaifangGate,
  };
}
// #endregion
