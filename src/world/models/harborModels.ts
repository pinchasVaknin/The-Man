// ============================================================================
// MODULE: World / Models / Harbor Models
// DESIGN: Far south-east coastal harbor town, galleon ship, and lighthouse (SRP)
// SUMMARY: Constructs walled harbor quay, bazaar market, cargo warehouses,
//          amphitheater, 42m 3-masted galleon, 26m lighthouse, and soaring seagulls.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import {
  SOUTHEAST_HARBOR_POS,
  isWithinViewDistance,
} from '../terrainMath';
import { createArchitecturalSharedAssets } from './architecturalHelpers';
import type { IWorldModelBuildContext } from './types';
// #endregion

// ======================== HARBOR MODEL INTERFACES ======================== \\
// #region Harbor Model Interfaces
/**
 * Summary: Interactive handles and beacon rotation pivots for coastal harbor town.
 * Design: Exposes lighthouse beacon light pivot and galleon ship captain cabin doors.
 */
export interface IHarborModelHandles {
  readonly harborGroup: THREE.Group;
  readonly lighthouseBeaconGroup: THREE.Group;
  readonly harborSeagullsGroup: THREE.Group;
  readonly updateHarbor: (elapsedTime: number, playerX: number, playerZ: number) => void;
}
// #endregion

// ======================== BUILD HARBOR MODELS ======================== \\
// #region Build Harbor Models
/**
 * Summary: Constructs the grand walled coastal harbor town, galleon ship, and imperial lighthouse.
 * @param ctx Shared build context (scene, textures, disposal lists).
 * @returns Handles for animating the harbor each frame.
 */
export function buildHarborModels(ctx: IWorldModelBuildContext): IHarborModelHandles {
  const {
    scene,
    textures,
    isSoftwareGl,
    disposableGeometries,
    disposableMaterials,
    distanceCulledObjects,
  } = ctx;

  const archAssets = ctx.archAssets ?? createArchitecturalSharedAssets(ctx);
  const {
    imperialGoldMat,
    imperialCrimsonMat,
    pagodaTileMat,
    warmLanternMat,
    mineGoldOreMat,
    createInteractiveDoubleDoor,
    createRedChineseLantern,
    createRedImperialFlag,
  } = archAssets;

  const harborGroup = new THREE.Group();
  const hPlazaY = SOUTHEAST_HARBOR_POS.plazaY;
  const hWaterY = SOUTHEAST_HARBOR_POS.waterY;

  // Materials
  const fortressStoneMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.08,
    roughness: 0.78,
  });
  const carvedMarbleMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.45,
    metalness: 0.05,
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.42,
    metalness: 0.85,
  });
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.timberAlbedo,
    bumpMap: textures.barkBump,
    bumpScale: 0.05,
    roughness: 0.76,
  });
  const imperialWoodFloorMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    map: textures.timberAlbedo,
    bumpMap: textures.barkBump,
    roughness: 0.68,
  });
  const furnitureWoodMat = new THREE.MeshStandardMaterial({
    color: 0x5c3a21,
    map: textures.timberAlbedo,
    bumpMap: textures.barkBump,
    roughness: 0.72,
  });
  const barkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.barkAlbedo,
    bumpMap: textures.barkBump,
    bumpScale: 0.07,
    roughness: 0.88,
  });
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x1b566b,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.86,
  });
  const foamRingMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const waterfallMat = new THREE.MeshBasicMaterial({
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.65,
  });
  const roastDuckMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.38 });
  const mineMoltenCoalMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xd97706,
    emissiveIntensity: 0.9,
    roughness: 0.65,
  });
  const sailClothMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.78,
    side: THREE.DoubleSide,
  });
  const lhBeamMat = new THREE.MeshBasicMaterial({
    color: 0xfffbeb,
    transparent: true,
    opacity: 0.26,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const seagullMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });

  // High-detail procedural Harbor textures (Plaza Cobblestone, Coastal Stucco Masonry & Striped Awning Cloth)
  const createHarborCobbleTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const c = canvas.getContext('2d');
    if (c) {
      c.fillStyle = '#57534e';
      c.fillRect(0, 0, 256, 256);
      const rows = 8;
      const rowH = 256 / rows;
      for (let r = 0; r < rows; r++) {
        const cols = r % 2 === 0 ? 6 : 7;
        const colW = 256 / cols;
        const offsetX = r % 2 === 0 ? 0 : -colW * 0.35;
        for (let col = 0; col <= cols; col++) {
          const bx = offsetX + col * colW;
          const by = r * rowH;
          const shade = 205 + (((r * 17 + col * 31) % 33) - 16);
          const warm = (r + col) % 3 === 0 ? 8 : -4;
          c.fillStyle = `rgb(${shade + warm}, ${shade + 2}, ${shade - warm})`;
          c.fillRect(bx + 2, by + 2, colW - 4, rowH - 4);
          c.strokeStyle = 'rgba(255,255,255,0.22)';
          c.lineWidth = 1;
          c.strokeRect(bx + 3, by + 3, colW - 6, rowH - 6);
        }
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(14, 24);
    ctx.disposableTextures.push(tex);
    return tex;
  };

  const createHarborStuccoTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const c = canvas.getContext('2d');
    if (c) {
      c.fillStyle = '#efe6d5';
      c.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 16) {
        c.fillStyle = y % 32 === 0 ? 'rgba(120, 95, 70, 0.10)' : 'rgba(255, 255, 255, 0.14)';
        c.fillRect(0, y, 256, 2);
        for (let x = (y % 32 === 0 ? 0 : 16); x < 256; x += 32) {
          const delta = ((x * 13 + y * 7) % 18) - 9;
          c.fillStyle = `rgb(${236 + delta}, ${226 + delta}, ${208 + delta})`;
          c.fillRect(x + 1, y + 2, 30, 13);
        }
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 2);
    ctx.disposableTextures.push(tex);
    return tex;
  };

  const createAwningStripeTexture = (primaryHex: string, secondaryHex: string): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const c = canvas.getContext('2d');
    if (c) {
      const stripes = 8;
      const sw = 256 / stripes;
      for (let i = 0; i < stripes; i++) {
        c.fillStyle = i % 2 === 0 ? primaryHex : secondaryHex;
        c.fillRect(i * sw, 0, sw, 256);
        c.fillStyle = 'rgba(212, 175, 55, 0.38)';
        c.fillRect(i * sw, 0, 2, 256);
      }
      c.fillStyle = '#d4af37';
      c.fillRect(0, 0, 256, 10);
      c.fillRect(0, 246, 256, 10);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 1);
    ctx.disposableTextures.push(tex);
    return tex;
  };

  const harborCobbleTex = createHarborCobbleTexture();
  const harborStuccoTex = createHarborStuccoTexture();

  const harborPlazaPavingMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f4,
    map: harborCobbleTex,
    bumpMap: textures.rockBump,
    bumpScale: 0.05,
    roughness: 0.62,
    metalness: 0.04,
  });
  const harborStuccoWallMat = new THREE.MeshStandardMaterial({
    color: 0xfdf8ee,
    map: harborStuccoTex,
    bumpMap: textures.rockBump,
    bumpScale: 0.04,
    roughness: 0.74,
  });
  const harborSlateRoofMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.06,
    roughness: 0.58,
    metalness: 0.14,
  });
  const harborTerracottaRoofMat = new THREE.MeshStandardMaterial({
    color: 0x9a3412,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.06,
    roughness: 0.64,
  });
  const hempRopeMat = new THREE.MeshStandardMaterial({
    color: 0xc29b61,
    map: textures.barkAlbedo,
    roughness: 0.88,
  });

  const stallAwningMaterials = [
    new THREE.MeshStandardMaterial({
      map: createAwningStripeTexture('#991b1b', '#fef3c7'),
      bumpMap: textures.foliageBump,
      bumpScale: 0.02,
      roughness: 0.78,
    }),
    new THREE.MeshStandardMaterial({
      map: createAwningStripeTexture('#1e3a8a', '#f8fafc'),
      bumpMap: textures.foliageBump,
      bumpScale: 0.02,
      roughness: 0.78,
    }),
    new THREE.MeshStandardMaterial({
      map: createAwningStripeTexture('#14532d', '#fef3c7'),
      bumpMap: textures.foliageBump,
      bumpScale: 0.02,
      roughness: 0.78,
    }),
    new THREE.MeshStandardMaterial({
      map: createAwningStripeTexture('#78350f', '#fde68a'),
      bumpMap: textures.foliageBump,
      bumpScale: 0.02,
      roughness: 0.78,
    }),
    new THREE.MeshStandardMaterial({
      map: createAwningStripeTexture('#7f1d1d', '#fde68a'),
      bumpMap: textures.foliageBump,
      bumpScale: 0.02,
      roughness: 0.78,
    }),
    new THREE.MeshStandardMaterial({
      map: createAwningStripeTexture('#0f766e', '#fffbeb'),
      bumpMap: textures.foliageBump,
      bumpScale: 0.02,
      roughness: 0.78,
    }),
  ];

  const sleepingBagColors = [
    new THREE.MeshStandardMaterial({ color: 0x992b24, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x1e4d3b, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x243b6b, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0xb87324, roughness: 0.85 }),
  ];

  disposableMaterials.push(
    fortressStoneMat,
    carvedMarbleMat,
    darkIronMat,
    timberMat,
    imperialWoodFloorMat,
    furnitureWoodMat,
    barkMat,
    waterMat,
    foamRingMat,
    waterfallMat,
    roastDuckMat,
    mineMoltenCoalMat,
    sailClothMat,
    lhBeamMat,
    seagullMat,
    harborPlazaPavingMat,
    harborStuccoWallMat,
    harborSlateRoofMat,
    harborTerracottaRoofMat,
    hempRopeMat,
    ...stallAwningMaterials,
    ...sleepingBagColors
  );

  // 1) Paved Stone Harbor Quay Plaza, Compass Medallion, Sea-Wall & Open Eastern Ocean
  const harborQuayGeo = new THREE.BoxGeometry(55.5, 0.36, 98.0);
  const harborSeaWallGeo = new THREE.BoxGeometry(1.6, 5.2, 100.0);
  const harborQuayCurbGeo = new THREE.BoxGeometry(0.95, 0.16, 98.0);
  const harborParapetBlockGeo = new THREE.BoxGeometry(1.1, 0.78, 2.6);
  const plazaMedallionOuterGeo = new THREE.CylinderGeometry(11.6, 11.8, 0.06, 32);
  const plazaMedallionInnerGeo = new THREE.CylinderGeometry(7.2, 7.4, 0.08, 24);
  const plazaWalkwayRunnerGeo = new THREE.BoxGeometry(30.0, 0.05, 5.2);
  const bollardBaseGeo = new THREE.CylinderGeometry(0.28, 0.36, 0.86, 10);
  const bollardCapGeo = new THREE.SphereGeometry(0.32, 10, 8);
  const ropeCoilGeo = new THREE.TorusGeometry(0.42, 0.11, 8, 16);
  ropeCoilGeo.rotateX(Math.PI / 2);
  const streetLampPostGeo = new THREE.CylinderGeometry(0.11, 0.16, 4.4, 8);
  const streetLampArmGeo = new THREE.BoxGeometry(1.1, 0.12, 0.12);
  const oceanWaterGeo = new THREE.PlaneGeometry(680.0, 680.0, isSoftwareGl ? 32 : 56, isSoftwareGl ? 32 : 56);
  oceanWaterGeo.rotateX(-Math.PI / 2);
  const cannonCarriageGeo = new THREE.BoxGeometry(1.35, 0.52, 0.72);
  const cannonBarrelGeo = new THREE.CylinderGeometry(0.18, 0.24, 1.85, 10);
  cannonBarrelGeo.rotateZ(Math.PI / 2);
  const cannonBallGeo = new THREE.SphereGeometry(0.18, 8, 8);
  disposableGeometries.push(
    harborQuayGeo,
    harborSeaWallGeo,
    harborQuayCurbGeo,
    harborParapetBlockGeo,
    plazaMedallionOuterGeo,
    plazaMedallionInnerGeo,
    plazaWalkwayRunnerGeo,
    bollardBaseGeo,
    bollardCapGeo,
    ropeCoilGeo,
    streetLampPostGeo,
    streetLampArmGeo,
    oceanWaterGeo,
    cannonCarriageGeo,
    cannonBarrelGeo,
    cannonBallGeo
  );

  const quayMesh = new THREE.Mesh(harborQuayGeo, harborPlazaPavingMat);
  quayMesh.position.set(227.75, hPlazaY - 0.16, 263.0);
  quayMesh.receiveShadow = !isSoftwareGl;
  const quayCurbMesh = new THREE.Mesh(harborQuayCurbGeo, carvedMarbleMat);
  quayCurbMesh.position.set(254.6, hPlazaY + 0.04, 263.0);
  const seaWallMesh = new THREE.Mesh(harborSeaWallGeo, fortressStoneMat);
  seaWallMesh.position.set(255.2, hPlazaY - 2.3, 263.0);
  const openOceanMesh = new THREE.Mesh(oceanWaterGeo, waterMat);
  openOceanMesh.position.set(594.5, hWaterY, 420.0);

  // Decorative Imperial Plaza Medallion & Royal Promenade Stone Runners
  const medOuter = new THREE.Mesh(plazaMedallionOuterGeo, carvedMarbleMat);
  medOuter.position.set(SOUTHEAST_HARBOR_POS.fountainX, hPlazaY + 0.01, SOUTHEAST_HARBOR_POS.fountainZ);
  const medInner = new THREE.Mesh(plazaMedallionInnerGeo, imperialCrimsonMat);
  medInner.position.set(SOUTHEAST_HARBOR_POS.fountainX, hPlazaY + 0.02, SOUTHEAST_HARBOR_POS.fountainZ);
  const westGateRunner = new THREE.Mesh(plazaWalkwayRunnerGeo, carvedMarbleMat);
  westGateRunner.position.set(216.0, hPlazaY + 0.01, SOUTHEAST_HARBOR_POS.fountainZ);
  harborGroup.add(quayMesh, quayCurbMesh, seaWallMesh, openOceanMesh, medOuter, medInner, westGateRunner);

  // Quayside Cast-Iron Mooring Bollards, Coiled Hemp Ropes & Ornate Harbor Streetlamps
  for (const bz of [220.0, 232.0, 245.5, 258.5, 271.0, 285.0, 301.0]) {
    const bollard = new THREE.Mesh(bollardBaseGeo, darkIronMat);
    bollard.position.set(254.35, hPlazaY + 0.43, bz);
    const bCap = new THREE.Mesh(bollardCapGeo, darkIronMat);
    bCap.position.set(254.35, hPlazaY + 0.88, bz);
    const rCoil = new THREE.Mesh(ropeCoilGeo, hempRopeMat);
    rCoil.position.set(254.35, hPlazaY + 0.11, bz);
    harborGroup.add(bollard, bCap, rCoil);
  }
  for (const [lx, lz, armDir] of [
    [206.5, 238.5, 1],
    [206.5, 250.5, 1],
    [252.8, 246.8, -1],
    [252.8, 257.2, -1],
    [225.0, 242.0, 1],
    [239.0, 242.0, -1],
  ]) {
    const lPost = new THREE.Mesh(streetLampPostGeo, darkIronMat);
    lPost.position.set(lx, hPlazaY + 2.2, lz);
    const lArm = new THREE.Mesh(streetLampArmGeo, darkIronMat);
    lArm.position.set(lx + armDir * 0.45, hPlazaY + 4.25, lz);
    harborGroup.add(
      lPost,
      lArm,
      createRedChineseLantern(lx + armDir * 0.88, hPlazaY + 3.85, lz)
    );
  }

  // Distant Rocky Sea-Stack Islands & Foam Rings
  const seaStackRockGeo = new THREE.DodecahedronGeometry(6.5, 1);
  const seaStackFoamGeo = new THREE.RingGeometry(6.2, 11.5, 24);
  seaStackFoamGeo.rotateX(-Math.PI / 2);
  disposableGeometries.push(seaStackRockGeo, seaStackFoamGeo);
  for (const [isx, isz, isScale, isH] of [
    [358.0, 224.0, 1.35, 14.5],
    [392.0, 286.0, 1.65, 18.0],
    [342.0, 328.0, 1.15, 11.5],
  ]) {
    const stackGroup = new THREE.Group();
    stackGroup.position.set(isx, hWaterY, isz);
    const mainSpire = new THREE.Mesh(seaStackRockGeo, fortressStoneMat);
    mainSpire.scale.set(isScale, isH / 6.5, isScale * 0.9);
    mainSpire.position.y = isH * 0.32;
    const subSpire = new THREE.Mesh(seaStackRockGeo, fortressStoneMat);
    subSpire.scale.set(isScale * 0.75, (isH * 0.55) / 6.5, isScale * 0.7);
    subSpire.position.set(-4.5 * isScale, isH * 0.18, 3.8 * isScale);
    const sFoam = new THREE.Mesh(seaStackFoamGeo, foamRingMat);
    sFoam.scale.setScalar(isScale * 1.15);
    sFoam.position.y = 0.08;
    stackGroup.add(mainSpire, subSpire, sFoam);
    harborGroup.add(stackGroup);
  }

  // Sea-wall crenellations & Harbor Cannons (merlons skip both the Main Pier at z=252 and the Sailable Ship Jetty at z=282)
  for (let bz = 218; bz <= 308; bz += 6.0) {
    if (Math.abs(bz - SOUTHEAST_HARBOR_POS.pierZ) < 4.8 || Math.abs(bz - 282.0) < 3.5) continue;
    const merlon = new THREE.Mesh(harborParapetBlockGeo, fortressStoneMat);
    merlon.position.set(255.1, hPlazaY + 0.39, bz);
    harborGroup.add(merlon);
  }
  for (const cz of [221.0, 239.0, 263.0, 275.0, 293.0]) {
    const cGroup = new THREE.Group();
    cGroup.position.set(253.8, hPlazaY, cz);
    const carriage = new THREE.Mesh(cannonCarriageGeo, timberMat);
    carriage.position.y = 0.26;
    const barrel = new THREE.Mesh(cannonBarrelGeo, darkIronMat);
    barrel.position.set(0.45, 0.62, 0);
    cGroup.add(carriage, barrel);
    for (let b = 0; b < 4; b++) {
      const ball = new THREE.Mesh(cannonBallGeo, darkIronMat);
      ball.position.set(-0.35 + (b % 2) * 0.36, 0.18 + Math.floor(b / 2) * 0.28, 0.72);
      cGroup.add(ball);
    }
    harborGroup.add(cGroup);
  }

  // 2) FORTIFIED IMPERIAL HARBOR PERIMETER CASTLE WALLS, TWIN-TOWERED BARBICAN GATEHOUSE & OCTAGONAL CORNER BASTIONS
  const gateTowerBaseGeo = new THREE.BoxGeometry(5.6, 2.6, 5.6);
  gateTowerBaseGeo.translate(0, 1.3, 0);
  const gateTowerGeo = new THREE.BoxGeometry(5.0, 11.6, 5.0);
  gateTowerGeo.translate(0, 5.8, 0);
  const gateTowerUpperGeo = new THREE.BoxGeometry(5.4, 1.8, 5.4);
  const gateTowerRoofLowerGeo = new THREE.ConeGeometry(4.5, 2.2, 4);
  gateTowerRoofLowerGeo.rotateY(Math.PI / 4);
  const gateTowerRoofGeo = new THREE.ConeGeometry(3.8, 3.2, 4);
  gateTowerRoofGeo.rotateY(Math.PI / 4);
  const gateArchBridgeGeo = new THREE.BoxGeometry(4.8, 3.2, 8.8);
  const gateArchPillarGeo = new THREE.BoxGeometry(2.4, 7.2, 1.2);
  const portcullisBarVGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.2, 6);
  const portcullisBarHGeo = new THREE.BoxGeometry(0.14, 0.14, 6.8);
  const arrowSlitRecessGeo = new THREE.BoxGeometry(0.28, 1.65, 0.36);

  const wallWestNorthGeo = new THREE.BoxGeometry(2.1, 6.6, 22.0);
  const wallWestSouthGeo = new THREE.BoxGeometry(2.1, 6.6, 60.0);
  const wallNorthWestGeo = new THREE.BoxGeometry(34.2, 6.6, 2.1);
  const wallNorthEastGeo = new THREE.BoxGeometry(13.6, 6.6, 2.1);
  const wallNorthArchGeo = new THREE.BoxGeometry(8.6, 2.2, 2.6);
  const wallSouthGeo = new THREE.BoxGeometry(55.4, 6.6, 2.1);

  const wallPlinthWestNGeo = new THREE.BoxGeometry(2.8, 1.6, 22.2);
  const wallPlinthWestSGeo = new THREE.BoxGeometry(2.8, 1.6, 60.2);
  const wallPlinthNorthWGeo = new THREE.BoxGeometry(34.4, 1.6, 2.8);
  const wallPlinthNorthEGeo = new THREE.BoxGeometry(13.8, 1.6, 2.8);
  const wallPlinthSouthGeo = new THREE.BoxGeometry(55.6, 1.6, 2.8);

  const wallCorniceWestNGeo = new THREE.BoxGeometry(2.5, 0.38, 22.2);
  const wallCorniceWestSGeo = new THREE.BoxGeometry(2.5, 0.38, 60.2);
  const wallCorniceNorthWGeo = new THREE.BoxGeometry(34.4, 0.38, 2.5);
  const wallCorniceNorthEGeo = new THREE.BoxGeometry(13.8, 0.38, 2.5);
  const wallCorniceSouthGeo = new THREE.BoxGeometry(55.6, 0.38, 2.5);

  const wallButtressPierGeo = new THREE.BoxGeometry(1.35, 6.5, 1.35);
  const wallButtressCapGeo = new THREE.BoxGeometry(1.55, 0.45, 1.55);
  const wallCorbelGeo = new THREE.BoxGeometry(0.45, 0.65, 0.45);
  const merlonCapGeo = new THREE.BoxGeometry(1.26, 0.18, 2.76);
  const heraldicShieldGeo = new THREE.CylinderGeometry(0.48, 0.38, 0.12, 6);
  heraldicShieldGeo.rotateZ(Math.PI / 2);

  const cornerBastionPlinthGeo = new THREE.CylinderGeometry(3.5, 4.1, 2.4, 8);
  cornerBastionPlinthGeo.translate(0, 1.2, 0);
  const cornerBastionGeo = new THREE.CylinderGeometry(3.1, 3.5, 9.2, 8);
  cornerBastionGeo.translate(0, 4.6, 0);
  const cornerBastionCrownGeo = new THREE.CylinderGeometry(3.55, 3.25, 1.65, 8);
  const cornerBastionCapGeo = new THREE.ConeGeometry(4.0, 3.4, 8);

  disposableGeometries.push(
    gateTowerBaseGeo,
    gateTowerGeo,
    gateTowerUpperGeo,
    gateTowerRoofLowerGeo,
    gateTowerRoofGeo,
    gateArchBridgeGeo,
    gateArchPillarGeo,
    portcullisBarVGeo,
    portcullisBarHGeo,
    arrowSlitRecessGeo,
    wallWestNorthGeo,
    wallWestSouthGeo,
    wallNorthWestGeo,
    wallNorthEastGeo,
    wallNorthArchGeo,
    wallSouthGeo,
    wallPlinthWestNGeo,
    wallPlinthWestSGeo,
    wallPlinthNorthWGeo,
    wallPlinthNorthEGeo,
    wallPlinthSouthGeo,
    wallCorniceWestNGeo,
    wallCorniceWestSGeo,
    wallCorniceNorthWGeo,
    wallCorniceNorthEGeo,
    wallCorniceSouthGeo,
    wallButtressPierGeo,
    wallButtressCapGeo,
    wallCorbelGeo,
    merlonCapGeo,
    heraldicShieldGeo,
    cornerBastionPlinthGeo,
    cornerBastionGeo,
    cornerBastionCrownGeo,
    cornerBastionCapGeo
  );

  // Twin-Towered Western Gatehouse Barbican
  for (const gz of [238.0, 250.0]) {
    const gBase = new THREE.Mesh(gateTowerBaseGeo, carvedMarbleMat);
    gBase.position.set(SOUTHEAST_HARBOR_POS.gateX, hPlazaY, gz);
    const gTower = new THREE.Mesh(gateTowerGeo, fortressStoneMat);
    gTower.position.set(SOUTHEAST_HARBOR_POS.gateX, hPlazaY, gz);
    const gCrown = new THREE.Mesh(gateTowerUpperGeo, carvedMarbleMat);
    gCrown.position.set(SOUTHEAST_HARBOR_POS.gateX, hPlazaY + 11.8, gz);
    const gRoofLower = new THREE.Mesh(gateTowerRoofLowerGeo, pagodaTileMat);
    gRoofLower.position.set(SOUTHEAST_HARBOR_POS.gateX, hPlazaY + 13.4, gz);
    const gRoof = new THREE.Mesh(gateTowerRoofGeo, pagodaTileMat);
    gRoof.position.set(SOUTHEAST_HARBOR_POS.gateX, hPlazaY + 15.2, gz);

    // Arrow-slit embrasures & golden heraldic shields on the outer West & inner East faces
    for (const sy of [4.8, 8.4]) {
      const slitW = new THREE.Mesh(arrowSlitRecessGeo, darkIronMat);
      slitW.position.set(SOUTHEAST_HARBOR_POS.gateX - 2.45, hPlazaY + sy, gz);
      const slitE = new THREE.Mesh(arrowSlitRecessGeo, darkIronMat);
      slitE.position.set(SOUTHEAST_HARBOR_POS.gateX + 2.45, hPlazaY + sy, gz);
      harborGroup.add(slitW, slitE);
    }
    const gShield = new THREE.Mesh(heraldicShieldGeo, imperialGoldMat);
    gShield.position.set(SOUTHEAST_HARBOR_POS.gateX - 2.52, hPlazaY + 6.6, gz);

    harborGroup.add(
      gBase,
      gTower,
      gCrown,
      gRoofLower,
      gRoof,
      gShield,
      createRedImperialFlag(SOUTHEAST_HARBOR_POS.gateX - 2.4, hPlazaY + 11.2, gz)
    );
  }

  // Gatehouse Overhead Gallery Bridge, Marble Arch Jambs & Raised Iron Portcullis Grate
  const gateBridge = new THREE.Mesh(gateArchBridgeGeo, carvedMarbleMat);
  gateBridge.position.set(SOUTHEAST_HARBOR_POS.gateX, hPlazaY + 8.6, SOUTHEAST_HARBOR_POS.gateZ);
  const gateBridgeRoof = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.55, 9.2),
    pagodaTileMat
  );
  disposableGeometries.push(gateBridgeRoof.geometry);
  gateBridgeRoof.position.set(SOUTHEAST_HARBOR_POS.gateX, hPlazaY + 10.45, SOUTHEAST_HARBOR_POS.gateZ);
  const gatePillarN = new THREE.Mesh(gateArchPillarGeo, carvedMarbleMat);
  gatePillarN.position.set(SOUTHEAST_HARBOR_POS.gateX, hPlazaY + 3.6, SOUTHEAST_HARBOR_POS.gateZ - 3.3);
  const gatePillarS = new THREE.Mesh(gateArchPillarGeo, carvedMarbleMat);
  gatePillarS.position.set(SOUTHEAST_HARBOR_POS.gateX, hPlazaY + 3.6, SOUTHEAST_HARBOR_POS.gateZ + 3.3);
  harborGroup.add(gateBridge, gateBridgeRoof, gatePillarN, gatePillarS);

  // Raised Heavy Iron Portcullis under the Western Gatehouse Arch (bottom at hPlazaY + 5.6m, well clear of mounted riders)
  for (let pz = -2.4; pz <= 2.4; pz += 0.8) {
    const pBarV = new THREE.Mesh(portcullisBarVGeo, darkIronMat);
    pBarV.position.set(SOUTHEAST_HARBOR_POS.gateX, hPlazaY + 6.9, SOUTHEAST_HARBOR_POS.gateZ + pz);
    harborGroup.add(pBarV);
  }
  for (const py of [5.6, 6.8]) {
    const pBarH = new THREE.Mesh(portcullisBarHGeo, darkIronMat);
    pBarH.position.set(SOUTHEAST_HARBOR_POS.gateX, hPlazaY + py, SOUTHEAST_HARBOR_POS.gateZ);
    harborGroup.add(pBarH);
  }
  harborGroup.add(
    createRedChineseLantern(SOUTHEAST_HARBOR_POS.gateX - 2.3, hPlazaY + 6.4, SOUTHEAST_HARBOR_POS.gateZ - 2.5),
    createRedChineseLantern(SOUTHEAST_HARBOR_POS.gateX - 2.3, hPlazaY + 6.4, SOUTHEAST_HARBOR_POS.gateZ + 2.5),
    createRedChineseLantern(SOUTHEAST_HARBOR_POS.gateX + 2.3, hPlazaY + 6.4, SOUTHEAST_HARBOR_POS.gateZ - 2.5),
    createRedChineseLantern(SOUTHEAST_HARBOR_POS.gateX + 2.3, hPlazaY + 6.4, SOUTHEAST_HARBOR_POS.gateZ + 2.5)
  );

  // Curtain Walls + Battered Marble Foundation Plinths + Upper Machicolation Cornice Friezes
  const wWestN = new THREE.Mesh(wallWestNorthGeo, fortressStoneMat);
  wWestN.position.set(200.0, hPlazaY + 3.3, 225.0);
  const wWestS = new THREE.Mesh(wallWestSouthGeo, fortressStoneMat);
  wWestS.position.set(200.0, hPlazaY + 3.3, 282.0);
  const wNorthW = new THREE.Mesh(wallNorthWestGeo, fortressStoneMat);
  wNorthW.position.set(217.1, hPlazaY + 3.3, 214.0);
  const wNorthE = new THREE.Mesh(wallNorthEastGeo, fortressStoneMat);
  wNorthE.position.set(248.6, hPlazaY + 3.3, 214.0);
  const wNorthArch = new THREE.Mesh(wallNorthArchGeo, imperialCrimsonMat);
  wNorthArch.position.set(238.0, hPlazaY + 5.9, 214.0);
  const wNorthPillarL = new THREE.Mesh(gateArchPillarGeo, carvedMarbleMat);
  wNorthPillarL.rotation.y = Math.PI / 2;
  wNorthPillarL.position.set(234.4, hPlazaY + 3.5, 214.0);
  const wNorthPillarR = new THREE.Mesh(gateArchPillarGeo, carvedMarbleMat);
  wNorthPillarR.rotation.y = Math.PI / 2;
  wNorthPillarR.position.set(241.6, hPlazaY + 3.5, 214.0);
  const wSouth = new THREE.Mesh(wallSouthGeo, fortressStoneMat);
  wSouth.position.set(227.7, hPlazaY + 3.3, 312.0);

  const pWestN = new THREE.Mesh(wallPlinthWestNGeo, carvedMarbleMat);
  pWestN.position.set(200.0, hPlazaY + 0.8, 225.0);
  const pWestS = new THREE.Mesh(wallPlinthWestSGeo, carvedMarbleMat);
  pWestS.position.set(200.0, hPlazaY + 0.8, 282.0);
  const pNorthW = new THREE.Mesh(wallPlinthNorthWGeo, carvedMarbleMat);
  pNorthW.position.set(217.1, hPlazaY + 0.8, 214.0);
  const pNorthE = new THREE.Mesh(wallPlinthNorthEGeo, carvedMarbleMat);
  pNorthE.position.set(248.6, hPlazaY + 0.8, 214.0);
  const pSouth = new THREE.Mesh(wallPlinthSouthGeo, carvedMarbleMat);
  pSouth.position.set(227.7, hPlazaY + 0.8, 312.0);

  const cWestN = new THREE.Mesh(wallCorniceWestNGeo, carvedMarbleMat);
  cWestN.position.set(200.0, hPlazaY + 6.45, 225.0);
  const cWestS = new THREE.Mesh(wallCorniceWestSGeo, carvedMarbleMat);
  cWestS.position.set(200.0, hPlazaY + 6.45, 282.0);
  const cNorthW = new THREE.Mesh(wallCorniceNorthWGeo, carvedMarbleMat);
  cNorthW.position.set(217.1, hPlazaY + 6.45, 214.0);
  const cNorthE = new THREE.Mesh(wallCorniceNorthEGeo, carvedMarbleMat);
  cNorthE.position.set(248.6, hPlazaY + 6.45, 214.0);
  const cSouth = new THREE.Mesh(wallCorniceSouthGeo, carvedMarbleMat);
  cSouth.position.set(227.7, hPlazaY + 6.45, 312.0);

  harborGroup.add(
    wWestN,
    wWestS,
    wNorthW,
    wNorthE,
    wNorthArch,
    wNorthPillarL,
    wNorthPillarR,
    wSouth,
    pWestN,
    pWestS,
    pNorthW,
    pNorthE,
    pSouth,
    cWestN,
    cWestS,
    cNorthW,
    cNorthE,
    cSouth
  );

  // Engaged Stone Buttress Piers & Golden Shields along West, North, and South Curtain Walls
  for (const bz of [222.0, 231.0, 260.0, 271.0, 282.0, 293.0, 303.0]) {
    const pier = new THREE.Mesh(wallButtressPierGeo, carvedMarbleMat);
    pier.position.set(200.0, hPlazaY + 3.25, bz);
    const cap = new THREE.Mesh(wallButtressCapGeo, pagodaTileMat);
    cap.position.set(200.0, hPlazaY + 6.65, bz);
    const shield = new THREE.Mesh(heraldicShieldGeo, imperialGoldMat);
    shield.position.set(198.8, hPlazaY + 4.6, bz);
    harborGroup.add(pier, cap, shield);
  }
  for (const bx of [210.0, 222.0, 246.0]) {
    const pierN = new THREE.Mesh(wallButtressPierGeo, carvedMarbleMat);
    pierN.position.set(bx, hPlazaY + 3.25, 214.0);
    const capN = new THREE.Mesh(wallButtressCapGeo, pagodaTileMat);
    capN.position.set(bx, hPlazaY + 6.65, 214.0);
    harborGroup.add(pierN, capN);
  }
  for (const bx of [210.0, 222.0, 234.0, 246.0]) {
    const pierS = new THREE.Mesh(wallButtressPierGeo, carvedMarbleMat);
    pierS.position.set(bx, hPlazaY + 3.25, 312.0);
    const capS = new THREE.Mesh(wallButtressCapGeo, pagodaTileMat);
    capS.position.set(bx, hPlazaY + 6.65, 312.0);
    harborGroup.add(pierS, capS);
  }

  // Crenellated Battlement Merlons with White Marble Coping Caps & Machicolation Corbels
  for (let wz = 218.0; wz <= 308.0; wz += 4.2) {
    if (wz >= 234.5 && wz <= 253.5) continue;
    const mW = new THREE.Mesh(harborParapetBlockGeo, fortressStoneMat);
    mW.position.set(200.0, hPlazaY + 7.0, wz);
    const mCap = new THREE.Mesh(merlonCapGeo, carvedMarbleMat);
    mCap.position.set(200.0, hPlazaY + 7.46, wz);
    const corbel = new THREE.Mesh(wallCorbelGeo, carvedMarbleMat);
    corbel.position.set(198.9, hPlazaY + 6.1, wz);
    harborGroup.add(mW, mCap, corbel);
  }
  for (let wx = 204.5; wx <= 251.5; wx += 4.2) {
    const mS = new THREE.Mesh(harborParapetBlockGeo, fortressStoneMat);
    mS.rotation.y = Math.PI / 2;
    mS.position.set(wx, hPlazaY + 7.0, 312.0);
    const mCapS = new THREE.Mesh(merlonCapGeo, carvedMarbleMat);
    mCapS.rotation.y = Math.PI / 2;
    mCapS.position.set(wx, hPlazaY + 7.46, 312.0);
    const corbelS = new THREE.Mesh(wallCorbelGeo, carvedMarbleMat);
    corbelS.position.set(wx, hPlazaY + 6.1, 313.1);
    harborGroup.add(mS, mCapS, corbelS);
    if (wx < 233.5 || wx > 242.5) {
      const mN = new THREE.Mesh(harborParapetBlockGeo, fortressStoneMat);
      mN.rotation.y = Math.PI / 2;
      mN.position.set(wx, hPlazaY + 7.0, 214.0);
      const mCapN = new THREE.Mesh(merlonCapGeo, carvedMarbleMat);
      mCapN.rotation.y = Math.PI / 2;
      mCapN.position.set(wx, hPlazaY + 7.46, 214.0);
      const corbelN = new THREE.Mesh(wallCorbelGeo, carvedMarbleMat);
      corbelN.position.set(wx, hPlazaY + 6.1, 212.9);
      harborGroup.add(mN, mCapN, corbelN);
    }
  }

  // 4 Multi-Tiered Octagonal Corner Bastion Towers
  for (const [bx, bz] of [
    [200.0, 214.0],
    [200.0, 312.0],
    [255.2, 214.0],
    [255.2, 312.0],
  ]) {
    const bPlinth = new THREE.Mesh(cornerBastionPlinthGeo, carvedMarbleMat);
    bPlinth.position.set(bx, hPlazaY, bz);
    const bastion = new THREE.Mesh(cornerBastionGeo, fortressStoneMat);
    bastion.position.set(bx, hPlazaY, bz);
    const bCrown = new THREE.Mesh(cornerBastionCrownGeo, carvedMarbleMat);
    bCrown.position.set(bx, hPlazaY + 9.4, bz);
    const bCap = new THREE.Mesh(cornerBastionCapGeo, pagodaTileMat);
    bCap.position.set(bx, hPlazaY + 11.7, bz);
    harborGroup.add(
      bPlinth,
      bastion,
      bCrown,
      bCap,
      createRedImperialFlag(bx, hPlazaY + 10.6, bz)
    );
  }

  // 3) THE MARINER'S HARBOR TAVERN & INN (Half-Timbered Stucco, Stone Wainscot, Veranda Porch & Stone Chimney)
  const tavX = SOUTHEAST_HARBOR_POS.tavernX;
  const tavZ = SOUTHEAST_HARBOR_POS.tavernZ;
  const tavY = SOUTHEAST_HARBOR_POS.tavernFloorY;
  const tavernGroup = new THREE.Group();
  tavernGroup.position.set(tavX, tavY, tavZ);

  const tavFloorGeo = new THREE.BoxGeometry(16.4, 0.3, 14.8);
  const tavStonePlinthGeo = new THREE.BoxGeometry(16.6, 1.35, 12.5);
  const tavBackWallGeo = new THREE.BoxGeometry(16.0, 5.2, 0.45);
  const tavSideWallGeo = new THREE.BoxGeometry(0.45, 5.2, 12.0);
  const tavFrontFlankGeo = new THREE.BoxGeometry(6.7, 5.2, 0.45);
  const tavFrontLintelGeo = new THREE.BoxGeometry(2.6, 1.8, 0.48);
  const tavRoofGeo = new THREE.ConeGeometry(12.4, 4.4, 4);
  tavRoofGeo.rotateY(Math.PI / 4);
  tavRoofGeo.scale(1.06, 1.0, 0.90);
  const tavPorchRoofGeo = new THREE.BoxGeometry(16.4, 0.24, 2.85);
  const tavPorchPostGeo = new THREE.BoxGeometry(0.26, 3.45, 0.26);
  const tavPorchBeamGeo = new THREE.BoxGeometry(16.2, 0.24, 0.28);
  const tavCornerQuoinGeo = new THREE.BoxGeometry(0.65, 5.3, 0.65);
  const tavWindowPaneGeo = new THREE.BoxGeometry(1.65, 1.25, 0.56);
  const tavChimneyStackGeo = new THREE.BoxGeometry(1.45, 4.6, 1.15);
  const tavBarCounterGeo = new THREE.BoxGeometry(9.6, 1.12, 1.1);
  const aleBarrelGeo = new THREE.CylinderGeometry(0.42, 0.48, 1.05, 10);
  aleBarrelGeo.rotateZ(Math.PI / 2);
  const tavHearthGeo = new THREE.BoxGeometry(2.8, 5.2, 1.2);
  const forgeCoalMoundGeo = new THREE.SphereGeometry(0.38, 8, 6);
  const tableTopGeo = new THREE.BoxGeometry(2.1, 0.1, 1.25);
  const tableLegGeo = new THREE.BoxGeometry(0.14, 0.76, 0.14);
  const feastPlatterGeo = new THREE.CylinderGeometry(0.52, 0.45, 0.06, 12);
  const roastDuckGeo = new THREE.SphereGeometry(0.24, 8, 8);

  disposableGeometries.push(
    tavFloorGeo,
    tavStonePlinthGeo,
    tavBackWallGeo,
    tavSideWallGeo,
    tavFrontFlankGeo,
    tavFrontLintelGeo,
    tavRoofGeo,
    tavPorchRoofGeo,
    tavPorchPostGeo,
    tavPorchBeamGeo,
    tavCornerQuoinGeo,
    tavWindowPaneGeo,
    tavChimneyStackGeo,
    tavBarCounterGeo,
    aleBarrelGeo,
    tavHearthGeo,
    forgeCoalMoundGeo,
    tableTopGeo,
    tableLegGeo,
    feastPlatterGeo,
    roastDuckGeo
  );

  const tavFloor = new THREE.Mesh(tavFloorGeo, imperialWoodFloorMat);
  tavFloor.position.set(0, -0.15, 1.2);
  const tavBackW = new THREE.Mesh(tavBackWallGeo, harborStuccoWallMat);
  tavBackW.position.set(0, 2.6, -6.0);
  const tavWestW = new THREE.Mesh(tavSideWallGeo, harborStuccoWallMat);
  tavWestW.position.set(-8.0, 2.6, 0);
  const tavEastW = new THREE.Mesh(tavSideWallGeo, harborStuccoWallMat);
  tavEastW.position.set(8.0, 2.6, 0);
  const tavFrontL = new THREE.Mesh(tavFrontFlankGeo, harborStuccoWallMat);
  tavFrontL.position.set(-4.65, 2.6, 6.0);
  const tavFrontR = new THREE.Mesh(tavFrontFlankGeo, harborStuccoWallMat);
  tavFrontR.position.set(4.65, 2.6, 6.0);
  const tavLintel = new THREE.Mesh(tavFrontLintelGeo, imperialCrimsonMat);
  tavLintel.position.set(0, 4.3, 6.0);
  const tavRoof = new THREE.Mesh(tavRoofGeo, harborTerracottaRoofMat);
  tavRoof.position.set(0, 7.3, 0.0);

  // Tavern Front Veranda Porch Posts, Header Beam & Sloped Porch Awning Roof (covering z = 6.0..8.5)
  const tavPorchBeam = new THREE.Mesh(tavPorchBeamGeo, barkMat);
  tavPorchBeam.position.set(0, 3.38, 8.2);
  const tavPorchRoof = new THREE.Mesh(tavPorchRoofGeo, pagodaTileMat);
  tavPorchRoof.position.set(0, 3.68, 7.25);
  tavPorchRoof.rotation.x = 0.16;
  tavernGroup.add(tavPorchBeam, tavPorchRoof);
  for (const px of [-7.75, -2.35, 2.35, 7.75]) {
    const pPost = new THREE.Mesh(tavPorchPostGeo, barkMat);
    pPost.position.set(px, 1.72, 8.2);
    tavernGroup.add(pPost);
  }
  for (const [qx, qz] of [
    [-8.0, -6.0],
    [8.0, -6.0],
    [-8.0, 6.0],
    [8.0, 6.0],
  ]) {
    const quoin = new THREE.Mesh(tavCornerQuoinGeo, fortressStoneMat);
    quoin.position.set(qx, 2.65, qz);
    tavernGroup.add(quoin);
  }
  // Framed glowing Tavern windows on front flanks & side walls
  for (const wx of [-4.8, 4.8]) {
    const fWinFrame = new THREE.Mesh(tavWindowPaneGeo, barkMat);
    fWinFrame.scale.set(1.14, 1.16, 0.92);
    fWinFrame.position.set(wx, 2.55, 6.0);
    const fWinGlass = new THREE.Mesh(tavWindowPaneGeo, warmLanternMat);
    fWinGlass.position.set(wx, 2.55, 6.0);
    tavernGroup.add(fWinFrame, fWinGlass);
  }
  for (const wz of [-2.4, 2.4]) {
    for (const sideX of [-8.0, 8.0]) {
      const sWin = new THREE.Mesh(tavWindowPaneGeo, warmLanternMat);
      sWin.rotation.y = Math.PI / 2;
      sWin.position.set(sideX, 2.65, wz);
      const sFrame = new THREE.Mesh(tavWindowPaneGeo, barkMat);
      sFrame.rotation.y = Math.PI / 2;
      sFrame.scale.set(1.14, 1.16, 0.92);
      sFrame.position.set(sideX, 2.65, wz);
      tavernGroup.add(sFrame, sWin);
    }
  }

  tavernGroup.add(
    tavFloor,
    tavBackW,
    tavWestW,
    tavEastW,
    tavFrontL,
    tavFrontR,
    tavLintel,
    tavRoof,
    createInteractiveDoubleDoor('harbor-tavern-door', 0, 0, 6.0, 2.6, 3.4),
    createRedChineseLantern(-2.35, 2.95, 8.45),
    createRedChineseLantern(2.35, 2.95, 8.45)
  );

  const barCounter = new THREE.Mesh(tavBarCounterGeo, furnitureWoodMat);
  barCounter.position.set(-2.5, 0.56, -3.2);
  tavernGroup.add(barCounter);
  for (let b = 0; b < 8; b++) {
    const barrel = new THREE.Mesh(aleBarrelGeo, barkMat);
    barrel.position.set(-6.2 + (b % 4) * 1.85, 0.52 + Math.floor(b / 4) * 0.92, -5.1);
    tavernGroup.add(barrel);
  }
  const hearthMesh = new THREE.Mesh(tavHearthGeo, fortressStoneMat);
  hearthMesh.position.set(4.8, 2.6, -5.2);
  const chimneyStack = new THREE.Mesh(tavChimneyStackGeo, fortressStoneMat);
  chimneyStack.position.set(4.8, 7.2, -5.2);
  const hearthFire = new THREE.Mesh(forgeCoalMoundGeo, mineMoltenCoalMat);
  hearthFire.position.set(4.8, 0.35, -4.6);
  tavernGroup.add(
    hearthMesh,
    chimneyStack,
    hearthFire,
    createRedChineseLantern(-3.2, 4.2, 0),
    createRedChineseLantern(3.2, 4.2, 0)
  );
  for (const [tx, tz] of [
    [-4.5, 1.2],
    [-4.5, 3.8],
    [4.2, 1.2],
    [4.2, 3.8],
  ]) {
    const tTop = new THREE.Mesh(tableTopGeo, furnitureWoodMat);
    tTop.position.set(tx, 0.78, tz);
    for (const [lx, lz] of [
      [-0.85, -0.48],
      [0.85, -0.48],
      [-0.85, 0.48],
      [0.85, 0.48],
    ]) {
      const tLeg = new THREE.Mesh(tableLegGeo, barkMat);
      tLeg.position.set(tx + lx, 0.38, tz + lz);
      tavernGroup.add(tLeg);
    }
    const platter = new THREE.Mesh(feastPlatterGeo, imperialGoldMat);
    platter.position.set(tx, 0.86, tz);
    const roast = new THREE.Mesh(roastDuckGeo, roastDuckMat);
    roast.position.set(tx, 1.0, tz);
    tavernGroup.add(tTop, platter, roast);
  }
  harborGroup.add(tavernGroup);

  // 4) TWO-TIER MARBLE FOUNTAIN & ARCHITECTURALLY GROUNDED HARBOR BAZAAR STALLS
  const fountainBaseSlabGeo = new THREE.CylinderGeometry(4.45, 4.65, 0.24, 16);
  const fountainWallSegGeo = new THREE.BoxGeometry(1.78, 1.06, 0.52);
  const fountainCopingSegGeo = new THREE.BoxGeometry(1.88, 0.14, 0.66);
  const fountainWaterGeo = new THREE.CylinderGeometry(3.88, 3.88, 0.12, 24);
  const fountainPillarGeo = new THREE.CylinderGeometry(0.62, 0.88, 2.4, 12);
  const fountainUpperBowlGeo = new THREE.CylinderGeometry(1.85, 0.72, 0.48, 16);
  const fountainUpperWaterGeo = new THREE.CylinderGeometry(1.62, 1.62, 0.08, 16);
  const fountainJetStreamGeo = new THREE.CylinderGeometry(0.06, 0.14, 1.38, 8);
  const anchorShankGeo = new THREE.CylinderGeometry(0.18, 0.18, 2.4, 8);
  const anchorFlukeGeo = new THREE.TorusGeometry(0.95, 0.16, 8, 16, Math.PI);
  const stallPlatformGeo = new THREE.BoxGeometry(4.3, 0.14, 3.3);
  const stallCanopyGeo = new THREE.BoxGeometry(4.5, 0.18, 3.55);
  const stallValanceFrontGeo = new THREE.BoxGeometry(4.54, 0.28, 0.08);
  const stallValanceSideGeo = new THREE.BoxGeometry(0.08, 0.26, 3.55);
  const stallCornerPostGeo = new THREE.BoxGeometry(0.18, 2.86, 0.18);
  const stallPostPlinthGeo = new THREE.BoxGeometry(0.30, 0.28, 0.30);
  const stallCrossBeamFrontGeo = new THREE.BoxGeometry(4.12, 0.16, 0.16);
  const stallSideRafterGeo = new THREE.BoxGeometry(0.16, 0.16, 3.05);
  const stallKneeBraceGeo = new THREE.BoxGeometry(0.12, 0.72, 0.12);
  const stallBackWainscotGeo = new THREE.BoxGeometry(3.92, 1.38, 0.16);
  const stallBackShelfGeo = new THREE.BoxGeometry(3.76, 0.10, 0.42);
  const stallCounterGeo = new THREE.BoxGeometry(3.84, 0.90, 1.18);
  const stallCounterTopGeo = new THREE.BoxGeometry(3.98, 0.10, 1.30);
  const spiceBasketGeo = new THREE.CylinderGeometry(0.38, 0.3, 0.45, 8);
  const balustradePostGeo = new THREE.BoxGeometry(0.18, 1.0, 0.18);
  const weaponRackBarGeo = new THREE.BoxGeometry(1.8, 0.14, 0.42);
  const chestBodyGeo = new THREE.BoxGeometry(1.2, 0.72, 0.8);
  const supplyCrateGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);

  disposableGeometries.push(
    fountainBaseSlabGeo,
    fountainWallSegGeo,
    fountainCopingSegGeo,
    fountainWaterGeo,
    fountainPillarGeo,
    fountainUpperBowlGeo,
    fountainUpperWaterGeo,
    fountainJetStreamGeo,
    anchorShankGeo,
    anchorFlukeGeo,
    stallPlatformGeo,
    stallCanopyGeo,
    stallValanceFrontGeo,
    stallValanceSideGeo,
    stallCornerPostGeo,
    stallPostPlinthGeo,
    stallCrossBeamFrontGeo,
    stallSideRafterGeo,
    stallKneeBraceGeo,
    stallBackWainscotGeo,
    stallBackShelfGeo,
    stallCounterGeo,
    stallCounterTopGeo,
    spiceBasketGeo,
    balustradePostGeo,
    weaponRackBarGeo,
    chestBodyGeo,
    supplyCrateGeo
  );

  const fntGroup = new THREE.Group();
  fntGroup.position.set(SOUTHEAST_HARBOR_POS.fountainX, hPlazaY, SOUTHEAST_HARBOR_POS.fountainZ);
  const fBaseSlab = new THREE.Mesh(fountainBaseSlabGeo, fortressStoneMat);
  fBaseSlab.position.y = 0.12;
  fntGroup.add(fBaseSlab);

  for (let w = 0; w < 16; w++) {
    const ang = (w / 16) * Math.PI * 2;
    const wx = Math.sin(ang) * 4.12;
    const wz = Math.cos(ang) * 4.12;
    const wallSeg = new THREE.Mesh(fountainWallSegGeo, carvedMarbleMat);
    wallSeg.position.set(wx, 0.53, wz);
    wallSeg.rotation.y = ang;
    const copingSeg = new THREE.Mesh(fountainCopingSegGeo, imperialCrimsonMat);
    copingSeg.position.set(wx, 1.08, wz);
    copingSeg.rotation.y = ang;
    fntGroup.add(wallSeg, copingSeg);
  }

  const fWat = new THREE.Mesh(fountainWaterGeo, waterMat);
  fWat.position.y = 0.74;
  const fCol = new THREE.Mesh(fountainPillarGeo, carvedMarbleMat);
  fCol.position.y = 1.35;
  const fUpperBowl = new THREE.Mesh(fountainUpperBowlGeo, carvedMarbleMat);
  fUpperBowl.position.y = 2.15;
  const fUpperWat = new THREE.Mesh(fountainUpperWaterGeo, waterMat);
  fUpperWat.position.y = 2.38;
  for (let j = 0; j < 4; j++) {
    const jAng = (j / 4) * Math.PI * 2 + Math.PI / 4;
    const jet = new THREE.Mesh(fountainJetStreamGeo, waterfallMat);
    jet.position.set(Math.cos(jAng) * 1.45, 1.48, Math.sin(jAng) * 1.45);
    jet.rotation.z = -Math.cos(jAng) * 0.22;
    jet.rotation.x = Math.sin(jAng) * 0.22;
    fntGroup.add(jet);
  }
  const aShank = new THREE.Mesh(anchorShankGeo, imperialGoldMat);
  aShank.position.y = 3.55;
  const aFluke = new THREE.Mesh(anchorFlukeGeo, imperialGoldMat);
  aFluke.position.y = 3.05;
  aFluke.rotation.z = Math.PI;
  fntGroup.add(fWat, fCol, fUpperBowl, fUpperWat, aShank, aFluke);
  harborGroup.add(fntGroup);

  const stallPlacements: Array<[number, number, THREE.Material]> = [
    [212.0, 254.0, stallAwningMaterials[0]],
    [212.0, 263.0, stallAwningMaterials[1]],
    [224.0, 263.0, stallAwningMaterials[2]],
    [240.0, 263.0, stallAwningMaterials[3]],
    [246.0, 238.0, stallAwningMaterials[4]],
    [246.0, 246.0, stallAwningMaterials[5]],
  ];
  const merchantSkinMat = new THREE.MeshStandardMaterial({ color: 0xe0b596, roughness: 0.65 });
  const merchantHairMat = new THREE.MeshStandardMaterial({ color: 0x241911, roughness: 0.85 });
  const steelDisplayMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.22,
    metalness: 0.88,
  });
  const ironIngotMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.35,
    metalness: 0.82,
  });
  const roastMeatMat = new THREE.MeshStandardMaterial({
    color: 0x9a3412,
    roughness: 0.55,
  });
  const breadCrustMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.72,
  });
  const cheeseGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.58,
  });
  const appleRedMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.38,
  });
  const merchantRobeColors = [
    new THREE.MeshStandardMaterial({ color: 0x8b1e24, roughness: 0.72 }),
    new THREE.MeshStandardMaterial({ color: 0x1d4d4f, roughness: 0.72 }),
    new THREE.MeshStandardMaterial({ color: 0x6b3fa0, roughness: 0.72 }),
    new THREE.MeshStandardMaterial({ color: 0x2c4a70, roughness: 0.72 }),
    new THREE.MeshStandardMaterial({ color: 0x3b281e, roughness: 0.78 }),
    new THREE.MeshStandardMaterial({ color: 0x9c5a1a, roughness: 0.72 }),
  ];
  disposableMaterials.push(
    merchantSkinMat,
    merchantHairMat,
    steelDisplayMat,
    ironIngotMat,
    roastMeatMat,
    breadCrustMat,
    cheeseGoldMat,
    appleRedMat,
    ...merchantRobeColors
  );

  const npcTorsoGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.76, 8);
  const npcHipSkirtGeo = new THREE.CylinderGeometry(0.26, 0.30, 0.28, 8);
  const npcLegGeo = new THREE.CylinderGeometry(0.088, 0.072, 0.44, 8);
  const npcBootGeo = new THREE.BoxGeometry(0.15, 0.14, 0.25);
  const npcHeadGeo = new THREE.SphereGeometry(0.16, 10, 8);
  const npcHatGeo = new THREE.CylinderGeometry(0.18, 0.17, 0.14, 10);
  const npcArmGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.52, 6);
  npcArmGeo.translate(0, -0.22, 0);
  const displayBladeGeo = new THREE.BoxGeometry(0.06, 0.02, 0.88);
  const displayGuardGeo = new THREE.BoxGeometry(0.24, 0.03, 0.04);
  const displayBowArcGeo = new THREE.TorusGeometry(0.38, 0.022, 6, 14, Math.PI * 0.85);
  const displayLogGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.95, 8);
  displayLogGeo.rotateZ(Math.PI / 2);
  const displayStoneBlockGeo = new THREE.BoxGeometry(0.42, 0.24, 0.32);
  const displayIngotGeo = new THREE.BoxGeometry(0.28, 0.10, 0.14);
  const displayPlatterGeo = new THREE.CylinderGeometry(0.32, 0.26, 0.04, 12);
  const displayRoastGeo = new THREE.SphereGeometry(0.18, 10, 8);
  displayRoastGeo.scale(1.35, 0.75, 0.95);
  const displayLoafGeo = new THREE.SphereGeometry(0.15, 10, 8);
  displayLoafGeo.scale(1.4, 0.68, 0.85);
  disposableGeometries.push(
    npcTorsoGeo,
    npcHipSkirtGeo,
    npcLegGeo,
    npcBootGeo,
    npcHeadGeo,
    npcHatGeo,
    npcArmGeo,
    displayBladeGeo,
    displayGuardGeo,
    displayBowArcGeo,
    displayLogGeo,
    displayStoneBlockGeo,
    displayIngotGeo,
    displayPlatterGeo,
    displayRoastGeo,
    displayLoafGeo
  );

  const merchantArmPivots: THREE.Group[] = [];

  for (let s = 0; s < stallPlacements.length; s++) {
    const [sx, sz, canopyMat] = stallPlacements[s];
    // Orient every stall so its front (+Z) and merchant face directly toward the Harbor Fountain & Plaza
    const syaw = Math.atan2(
      SOUTHEAST_HARBOR_POS.fountainX - sx,
      SOUTHEAST_HARBOR_POS.fountainZ - sz
    );
    const stGroup = new THREE.Group();
    stGroup.position.set(sx, hPlazaY, sz);
    stGroup.rotation.y = syaw;

    // Grounded timber & stone base platform
    const platform = new THREE.Mesh(stallPlatformGeo, imperialWoodFloorMat);
    platform.position.set(0, 0.07, 0);
    // Front merchant counter & polished hardwood counter top
    const counter = new THREE.Mesh(stallCounterGeo, furnitureWoodMat);
    counter.position.set(0, 0.48, 0.15);
    const counterTop = new THREE.Mesh(stallCounterTopGeo, imperialWoodFloorMat);
    counterTop.position.set(0, 0.94, 0.15);
    // Back timber wainscot partition & merchandise display shelf behind the merchant
    const backWall = new THREE.Mesh(stallBackWainscotGeo, timberMat);
    backWall.position.set(0, 0.76, -1.38);
    const backShelf = new THREE.Mesh(stallBackShelfGeo, furnitureWoodMat);
    backShelf.position.set(0, 1.46, -1.22);

    // Pitched striped canopy + hanging front/back/side fabric valances resting on full-height timber frame
    const canopy = new THREE.Mesh(stallCanopyGeo, canopyMat);
    canopy.position.set(0, 2.78, 0);
    canopy.rotation.x = 0.09;
    const frontValance = new THREE.Mesh(stallValanceFrontGeo, canopyMat);
    frontValance.position.set(0, 2.52, 1.74);
    const backValance = new THREE.Mesh(stallValanceFrontGeo, canopyMat);
    backValance.position.set(0, 2.84, -1.74);
    const leftValance = new THREE.Mesh(stallValanceSideGeo, canopyMat);
    leftValance.position.set(-2.22, 2.66, 0);
    leftValance.rotation.x = 0.09;
    const rightValance = new THREE.Mesh(stallValanceSideGeo, canopyMat);
    rightValance.position.set(2.22, 2.66, 0);
    rightValance.rotation.x = 0.09;

    // Upper horizontal tie-beams & sloped side rafters connecting all 4 corner posts to the canopy
    const frontBeam = new THREE.Mesh(stallCrossBeamFrontGeo, barkMat);
    frontBeam.position.set(0, 2.56, 1.38);
    const backBeam = new THREE.Mesh(stallCrossBeamFrontGeo, barkMat);
    backBeam.position.set(0, 2.82, -1.38);
    const leftRafter = new THREE.Mesh(stallSideRafterGeo, barkMat);
    leftRafter.position.set(-1.95, 2.69, 0);
    leftRafter.rotation.x = 0.09;
    const rightRafter = new THREE.Mesh(stallSideRafterGeo, barkMat);
    rightRafter.position.set(1.95, 2.69, 0);
    rightRafter.rotation.x = 0.09;

    stGroup.add(
      platform,
      counter,
      counterTop,
      backWall,
      backShelf,
      canopy,
      frontValance,
      backValance,
      leftValance,
      rightValance,
      frontBeam,
      backBeam,
      leftRafter,
      rightRafter
    );

    // 4 Full-height corner support posts (y = 0.0 to y = 2.86m) + carved stone base plinths + diagonal knee braces
    for (const px of [-1.95, 1.95]) {
      for (const pz of [-1.38, 1.38]) {
        const plinth = new THREE.Mesh(stallPostPlinthGeo, fortressStoneMat);
        plinth.position.set(px, 0.14, pz);
        const post = new THREE.Mesh(stallCornerPostGeo, barkMat);
        post.position.set(px, 1.43, pz);
        const brace = new THREE.Mesh(stallKneeBraceGeo, furnitureWoodMat);
        brace.position.set(px - Math.sign(px) * 0.24, 2.34, pz);
        brace.rotation.z = Math.sign(px) * 0.68;
        stGroup.add(plinth, post, brace);
      }
    }

    if (s === 0) {
      // Stall 0: Swords & Blades
      const displayRack = new THREE.Mesh(weaponRackBarGeo, imperialGoldMat);
      displayRack.scale.set(0.85, 1, 1);
      displayRack.position.set(-0.65, 1.24, 0.0);
      stGroup.add(displayRack);
      for (let w = 0; w < 3; w++) {
        const swordGrp = new THREE.Group();
        swordGrp.position.set(-1.1 + w * 0.55, 1.01, 0.22);
        swordGrp.rotation.y = 0.25 - w * 0.2;
        const blade = new THREE.Mesh(displayBladeGeo, steelDisplayMat);
        const guard = new THREE.Mesh(displayGuardGeo, imperialGoldMat);
        guard.position.z = -0.32;
        swordGrp.add(blade, guard);
        stGroup.add(swordGrp);
      }
      const warhammerHead = new THREE.Mesh(displayStoneBlockGeo, imperialGoldMat);
      warhammerHead.scale.set(0.65, 0.65, 0.65);
      warhammerHead.position.set(1.05, 1.08, 0.18);
      stGroup.add(warhammerHead);
    } else if (s === 1) {
      // Stall 1: Bows & Arrows
      for (let b = 0; b < 3; b++) {
        const bowArc = new THREE.Mesh(
          displayBowArcGeo,
          b === 1 ? imperialGoldMat : furnitureWoodMat
        );
        bowArc.position.set(-1.05 + b * 0.65, 1.08, 0.18);
        bowArc.rotation.set(Math.PI / 2, 0, 0.35);
        stGroup.add(bowArc);
      }
      const quiverTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.09, 0.52, 8),
        imperialCrimsonMat
      );
      disposableGeometries.push(quiverTube.geometry);
      quiverTube.position.set(1.12, 1.20, 0.15);
      quiverTube.rotation.z = -0.22;
      stGroup.add(quiverTube);
    } else if (s === 2) {
      // Stall 2: Timber & Building Materials
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3 - row; col++) {
          const logMesh = new THREE.Mesh(displayLogGeo, barkMat);
          logMesh.position.set(-0.75 + col * 0.24 + row * 0.12, 1.05 + row * 0.19, 0.18);
          stGroup.add(logMesh);
        }
      }
      for (let t = 0; t < 3; t++) {
        const clayTile = new THREE.Mesh(displayStoneBlockGeo, imperialCrimsonMat);
        clayTile.scale.set(0.85, 0.42, 0.85);
        clayTile.position.set(0.85, 1.02 + t * 0.11, 0.18);
        stGroup.add(clayTile);
      }
    } else if (s === 3) {
      // Stall 3: Cut Stone & White Marble
      for (let b = 0; b < 3; b++) {
        const granite = new THREE.Mesh(displayStoneBlockGeo, fortressStoneMat);
        granite.position.set(-1.05 + b * 0.48, 1.08, 0.18);
        stGroup.add(granite);
      }
      for (let m = 0; m < 2; m++) {
        const marbleCol = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.16, 0.52, 10),
          carvedMarbleMat
        );
        disposableGeometries.push(marbleCol.geometry);
        marbleCol.position.set(0.75 + m * 0.42, 1.22, 0.16);
        stGroup.add(marbleCol);
      }
    } else if (s === 4) {
      // Stall 4: Smithy, Iron Ingots & Gold Ore
      for (let i = 0; i < 6; i++) {
        const ingot = new THREE.Mesh(
          displayIngotGeo,
          i >= 4 ? imperialGoldMat : ironIngotMat
        );
        ingot.position.set(
          -1.05 + (i % 3) * 0.34,
          1.02 + Math.floor(i / 3) * 0.11,
          0.18
        );
        stGroup.add(ingot);
      }
      const swordBlade = new THREE.Mesh(displayBladeGeo, steelDisplayMat);
      swordBlade.position.set(0.85, 1.02, 0.18);
      swordBlade.rotation.y = 0.4;
      stGroup.add(swordBlade);
    } else {
      // Stall 5: Food, Roast Game Meat & Harbor Provisions
      for (let p = 0; p < 3; p++) {
        const platter = new THREE.Mesh(displayPlatterGeo, furnitureWoodMat);
        platter.position.set(-1.05 + p * 0.72, 1.00, 0.18);
        stGroup.add(platter);
      }
      const roastMeat = new THREE.Mesh(displayRoastGeo, roastMeatMat);
      roastMeat.position.set(-1.05, 1.12, 0.18);
      const breadLoaf1 = new THREE.Mesh(displayLoafGeo, breadCrustMat);
      breadLoaf1.position.set(-0.33, 1.10, 0.20);
      const cheeseWheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.12, 10),
        cheeseGoldMat
      );
      disposableGeometries.push(cheeseWheel.geometry);
      cheeseWheel.position.set(0.39, 1.08, 0.18);
      stGroup.add(roastMeat, breadLoaf1, cheeseWheel);
      for (let a = 0; a < 4; a++) {
        const apple = new THREE.Mesh(
          new THREE.SphereGeometry(0.075, 8, 8),
          appleRedMat
        );
        disposableGeometries.push(apple.geometry);
        apple.position.set(1.02 + (a % 2) * 0.16, 1.04, 0.10 + Math.floor(a / 2) * 0.16);
        stGroup.add(apple);
      }
    }

    // Harbor Bazaar Merchant / Blacksmith NPC standing behind counter on the stall platform (with full lower tunic, legs & boots)
    const npcGroup = new THREE.Group();
    npcGroup.position.set(0, 0.14, -0.78);
    const robeMat = merchantRobeColors[s % merchantRobeColors.length];
    const npcTorso = new THREE.Mesh(npcTorsoGeo, robeMat);
    npcTorso.position.set(0, 0.92, 0);
    const npcHipSkirt = new THREE.Mesh(npcHipSkirtGeo, robeMat);
    npcHipSkirt.position.set(0, 0.48, 0);
    const leftLeg = new THREE.Mesh(npcLegGeo, merchantHairMat);
    leftLeg.position.set(-0.11, 0.24, 0);
    const rightLeg = new THREE.Mesh(npcLegGeo, merchantHairMat);
    rightLeg.position.set(0.11, 0.24, 0);
    const leftBoot = new THREE.Mesh(npcBootGeo, darkIronMat);
    leftBoot.position.set(-0.11, 0.07, 0.04);
    const rightBoot = new THREE.Mesh(npcBootGeo, darkIronMat);
    rightBoot.position.set(0.11, 0.07, 0.04);
    const npcSash = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.25, 0.12, 8), imperialGoldMat);
    disposableGeometries.push(npcSash.geometry);
    npcSash.position.set(0, 0.64, 0);
    const npcHead = new THREE.Mesh(npcHeadGeo, merchantSkinMat);
    npcHead.position.set(0, 1.48, 0);
    const npcHat = new THREE.Mesh(npcHatGeo, s === 4 ? merchantHairMat : imperialGoldMat);
    npcHat.position.set(0, 1.62, 0);

    const leftArm = new THREE.Mesh(npcArmGeo, robeMat);
    leftArm.position.set(-0.28, 1.24, 0);
    leftArm.rotation.z = 0.18;

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.28, 1.24, 0);
    const rightArm = new THREE.Mesh(npcArmGeo, robeMat);
    rightArmPivot.add(rightArm);
    merchantArmPivots.push(rightArmPivot);

    npcGroup.add(
      npcTorso,
      npcHipSkirt,
      leftLeg,
      rightLeg,
      leftBoot,
      rightBoot,
      npcSash,
      npcHead,
      npcHat,
      leftArm,
      rightArmPivot
    );
    stGroup.add(
      npcGroup,
      createRedChineseLantern(1.55, 2.15, 1.38)
    );

    const crate = new THREE.Mesh(supplyCrateGeo, imperialWoodFloorMat);
    crate.position.set(1.42, 0.74, -0.82);
    stGroup.add(crate);
    harborGroup.add(stGroup);
  }

  // 5) HARBOR CUSTOMS & CARGO WAREHOUSE DISTRICT
  const whX = SOUTHEAST_HARBOR_POS.warehouseX;
  const whZ = SOUTHEAST_HARBOR_POS.warehouseZ;
  const whY = SOUTHEAST_HARBOR_POS.warehouseFloorY;
  const warehouseGroup = new THREE.Group();
  warehouseGroup.position.set(whX, whY, whZ);

  const whFloorGeo = new THREE.BoxGeometry(17.4, 0.3, 12.2);
  const whSouthWallGeo = new THREE.BoxGeometry(17.0, 5.6, 0.48);
  const whSideWallGeo = new THREE.BoxGeometry(0.48, 5.6, 11.0);
  const whNorthFlankGeo = new THREE.BoxGeometry(7.1, 5.6, 0.48);
  const whNorthLintelGeo = new THREE.BoxGeometry(2.8, 2.2, 0.5);
  const whCornerPilasterGeo = new THREE.BoxGeometry(0.72, 5.7, 0.72);
  const whTimberBandGeo = new THREE.BoxGeometry(17.2, 0.22, 11.3);
  const whRoofGeo = new THREE.ConeGeometry(12.8, 4.5, 4);
  whRoofGeo.rotateY(Math.PI / 4);
  whRoofGeo.scale(1.08, 1.0, 0.78);
  const whHoistBeamGeo = new THREE.BoxGeometry(0.34, 0.34, 3.4);
  const whHoistBraceGeo = new THREE.BoxGeometry(0.24, 1.55, 0.24);
  const whHoistPulleyGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.14, 12);
  whHoistPulleyGeo.rotateZ(Math.PI / 2);
  const whHoistRopeGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.28, 8);
  const whCrateSlingGeo = new THREE.BoxGeometry(1.26, 1.26, 0.10);
  const whRackShelfGeo = new THREE.BoxGeometry(4.8, 0.16, 1.4);
  const whRackPostGeo = new THREE.BoxGeometry(0.18, 3.2, 0.18);
  const grainSackGeo = new THREE.SphereGeometry(0.36, 8, 8);

  disposableGeometries.push(
    whFloorGeo,
    whSouthWallGeo,
    whSideWallGeo,
    whNorthFlankGeo,
    whNorthLintelGeo,
    whCornerPilasterGeo,
    whTimberBandGeo,
    whRoofGeo,
    whHoistBeamGeo,
    whHoistBraceGeo,
    whHoistPulleyGeo,
    whHoistRopeGeo,
    whCrateSlingGeo,
    whRackShelfGeo,
    whRackPostGeo,
    grainSackGeo
  );

  const whFloor = new THREE.Mesh(whFloorGeo, imperialWoodFloorMat);
  whFloor.position.set(0, -0.15, -0.3);
  const whSouthW = new THREE.Mesh(whSouthWallGeo, fortressStoneMat);
  whSouthW.position.set(0, 2.8, 5.5);
  const whWestW = new THREE.Mesh(whSideWallGeo, fortressStoneMat);
  whWestW.position.set(-8.5, 2.8, 0);
  const whEastW = new THREE.Mesh(whSideWallGeo, fortressStoneMat);
  whEastW.position.set(8.5, 2.8, 0);
  const whNorthL = new THREE.Mesh(whNorthFlankGeo, harborStuccoWallMat);
  whNorthL.position.set(-4.95, 2.8, -5.5);
  const whNorthR = new THREE.Mesh(whNorthFlankGeo, harborStuccoWallMat);
  whNorthR.position.set(4.95, 2.8, -5.5);
  const whLintel = new THREE.Mesh(whNorthLintelGeo, imperialCrimsonMat);
  whLintel.position.set(0, 4.5, -5.5);
  const whTimberBand = new THREE.Mesh(whTimberBandGeo, barkMat);
  whTimberBand.position.set(0, 5.52, 0);
  const whRoof = new THREE.Mesh(whRoofGeo, pagodaTileMat);
  whRoof.position.set(0, 7.6, 0);

  // Connected Hoist Beam, Diagonal Strut Brace, Iron Pulley Wheel, Taut Rope & Slung Crate (zero floating!)
  const whHoistBeam = new THREE.Mesh(whHoistBeamGeo, barkMat);
  whHoistBeam.position.set(0, 5.8, -6.3);
  const whHoistBrace = new THREE.Mesh(whHoistBraceGeo, barkMat);
  whHoistBrace.position.set(0, 5.15, -6.15);
  whHoistBrace.rotation.x = 0.68;
  const whPulley = new THREE.Mesh(whHoistPulleyGeo, darkIronMat);
  whPulley.position.set(0, 5.58, -7.4);
  const whHoistRope = new THREE.Mesh(whHoistRopeGeo, hempRopeMat);
  whHoistRope.position.set(0, 5.02, -7.4);
  const whHangingCrate = new THREE.Mesh(supplyCrateGeo, furnitureWoodMat);
  whHangingCrate.position.set(0, 3.85, -7.4);
  const whCrateSling = new THREE.Mesh(whCrateSlingGeo, darkIronMat);
  whCrateSling.position.set(0, 3.85, -7.4);

  for (const [px, pz] of [
    [-8.5, -5.5],
    [8.5, -5.5],
    [-8.5, 5.5],
    [8.5, 5.5],
  ]) {
    const pilaster = new THREE.Mesh(whCornerPilasterGeo, fortressStoneMat);
    pilaster.position.set(px, 2.85, pz);
    warehouseGroup.add(pilaster);
  }

  const whDoorGroup = createInteractiveDoubleDoor(
    SOUTHEAST_HARBOR_POS.warehouseDoorId,
    0,
    0,
    -5.5,
    2.8,
    3.4
  );
  whDoorGroup.position.set(0, 0, -5.5);
  whDoorGroup.rotation.y = Math.PI;
  for (const child of whDoorGroup.children) {
    child.position.z = 0;
  }

  warehouseGroup.add(
    whFloor,
    whSouthW,
    whWestW,
    whEastW,
    whNorthL,
    whNorthR,
    whLintel,
    whTimberBand,
    whRoof,
    whHoistBeam,
    whHoistBrace,
    whPulley,
    whHoistRope,
    whHangingCrate,
    whCrateSling,
    whDoorGroup,
    createRedChineseLantern(-2.4, 3.8, -5.9),
    createRedChineseLantern(2.4, 3.8, -5.9)
  );

  for (const side of [-1, 1]) {
    for (const sy of [1.4, 2.8]) {
      const shelf = new THREE.Mesh(whRackShelfGeo, barkMat);
      shelf.position.set(side * 5.4, sy, 2.2);
      warehouseGroup.add(shelf);
    }
    // Vertical rack support posts holding up the warehouse shelves from the floor
    for (const rx of [side * 3.2, side * 7.6]) {
      for (const rz of [1.6, 2.8]) {
        const rPost = new THREE.Mesh(whRackPostGeo, barkMat);
        rPost.position.set(rx, 1.6, rz);
        warehouseGroup.add(rPost);
      }
    }
    for (let c = 0; c < 6; c++) {
      const crate = new THREE.Mesh(supplyCrateGeo, c % 2 === 0 ? furnitureWoodMat : imperialWoodFloorMat);
      crate.position.set(
        side * (4.2 + (c % 2) * 1.4),
        0.58 + Math.floor(c / 2) * 1.15,
        -2.2 + (c % 3) * 1.6
      );
      warehouseGroup.add(crate);
    }
  }
  for (let b = 0; b < 10; b++) {
    const barrel = new THREE.Mesh(aleBarrelGeo, barkMat);
    barrel.position.set(-4.5 + (b % 5) * 2.2, 0.52 + Math.floor(b / 5) * 0.92, 4.3);
    warehouseGroup.add(barrel);
  }
  for (let g = 0; g < 8; g++) {
    const sack = new THREE.Mesh(grainSackGeo, sleepingBagColors[1]);
    sack.position.set(-2.4 + (g % 4) * 1.1, 0.32 + Math.floor(g / 4) * 0.52, 1.8);
    warehouseGroup.add(sack);
  }
  const qmDesk = new THREE.Mesh(tableTopGeo, furnitureWoodMat);
  qmDesk.position.set(0, 0.78, -1.2);
  for (const [lx, lz] of [
    [-0.85, -0.48],
    [0.85, -0.48],
    [-0.85, 0.48],
    [0.85, 0.48],
  ]) {
    const dLeg = new THREE.Mesh(tableLegGeo, barkMat);
    dLeg.position.set(lx, 0.38, -1.2 + lz);
    warehouseGroup.add(dLeg);
  }
  warehouseGroup.add(
    qmDesk,
    createRedChineseLantern(-3.8, 4.4, 0),
    createRedChineseLantern(3.8, 4.4, 0)
  );
  harborGroup.add(warehouseGroup);

  // 5B) HARBOR PORTMASTER'S HOUSE & MARITIME CHANDLERY (Formerly wall-less shed at 243, 277)
  const shedGroup = new THREE.Group();
  shedGroup.position.set(SOUTHEAST_HARBOR_POS.cargoShedX, hPlazaY, SOUTHEAST_HARBOR_POS.cargoShedZ);
  const shedDeckGeo = new THREE.BoxGeometry(12.4, 0.26, 9.4);
  const shedSouthWallGeo = new THREE.BoxGeometry(12.0, 4.6, 0.44);
  const shedSideWallGeo = new THREE.BoxGeometry(0.44, 4.6, 9.0);
  const shedNorthFlankGeo = new THREE.BoxGeometry(4.6, 4.6, 0.44);
  const shedNorthLintelGeo = new THREE.BoxGeometry(2.8, 1.25, 0.48);
  const shedStoneWainscotSGeo = new THREE.BoxGeometry(12.2, 1.35, 0.52);
  const shedStoneWainscotSideGeo = new THREE.BoxGeometry(0.52, 1.35, 9.2);
  const shedStoneWainscotFlankGeo = new THREE.BoxGeometry(4.65, 1.35, 0.52);
  const shedCornerPostGeo = new THREE.BoxGeometry(0.56, 4.7, 0.56);
  const shedRoofEaveBandGeo = new THREE.BoxGeometry(12.5, 0.24, 9.5);
  const shedHippedRoofGeo = new THREE.ConeGeometry(9.2, 3.5, 4);
  shedHippedRoofGeo.rotateY(Math.PI / 4);
  shedHippedRoofGeo.scale(1.06, 1.0, 0.80);
  const cranePedestalGeo = new THREE.BoxGeometry(1.5, 0.92, 1.5);
  const craneMastFullGeo = new THREE.CylinderGeometry(0.24, 0.28, 6.8, 8);
  const craneArmGeo = new THREE.BoxGeometry(4.4, 0.30, 0.30);
  const craneStrutGeo = new THREE.BoxGeometry(2.1, 0.22, 0.22);
  const craneCableGeo = new THREE.CylinderGeometry(0.04, 0.04, 5.2, 6);
  disposableGeometries.push(
    shedDeckGeo,
    shedSouthWallGeo,
    shedSideWallGeo,
    shedNorthFlankGeo,
    shedNorthLintelGeo,
    shedStoneWainscotSGeo,
    shedStoneWainscotSideGeo,
    shedStoneWainscotFlankGeo,
    shedCornerPostGeo,
    shedRoofEaveBandGeo,
    shedHippedRoofGeo,
    cranePedestalGeo,
    craneMastFullGeo,
    craneArmGeo,
    craneStrutGeo,
    craneCableGeo
  );

  const shedDeck = new THREE.Mesh(shedDeckGeo, imperialWoodFloorMat);
  shedDeck.position.y = 0.13;
  // 4 Full Walls enclosing the Portmaster's House & Maritime Chandlery (12.0m x 9.0m, y = 0..4.6m)
  const shedSouthW = new THREE.Mesh(shedSouthWallGeo, harborStuccoWallMat);
  shedSouthW.position.set(0, 2.3, 4.5);
  const shedSouthWainscot = new THREE.Mesh(shedStoneWainscotSGeo, fortressStoneMat);
  shedSouthWainscot.position.set(0, 0.68, 4.5);
  const shedWestW = new THREE.Mesh(shedSideWallGeo, harborStuccoWallMat);
  shedWestW.position.set(-6.0, 2.3, 0);
  const shedWestWainscot = new THREE.Mesh(shedStoneWainscotSideGeo, fortressStoneMat);
  shedWestWainscot.position.set(-6.0, 0.68, 0);
  const shedEastW = new THREE.Mesh(shedSideWallGeo, harborStuccoWallMat);
  shedEastW.position.set(6.0, 2.3, 0);
  const shedEastWainscot = new THREE.Mesh(shedStoneWainscotSideGeo, fortressStoneMat);
  shedEastWainscot.position.set(6.0, 0.68, 0);
  const shedNorthL = new THREE.Mesh(shedNorthFlankGeo, harborStuccoWallMat);
  shedNorthL.position.set(-3.7, 2.3, -4.5);
  const shedNorthLWainscot = new THREE.Mesh(shedStoneWainscotFlankGeo, fortressStoneMat);
  shedNorthLWainscot.position.set(-3.7, 0.68, -4.5);
  const shedNorthR = new THREE.Mesh(shedNorthFlankGeo, harborStuccoWallMat);
  shedNorthR.position.set(3.7, 2.3, -4.5);
  const shedNorthRWainscot = new THREE.Mesh(shedStoneWainscotFlankGeo, fortressStoneMat);
  shedNorthRWainscot.position.set(3.7, 0.68, -4.5);
  const shedNorthLintel = new THREE.Mesh(shedNorthLintelGeo, imperialCrimsonMat);
  shedNorthLintel.position.set(0, 3.98, -4.5);
  const shedEaveBand = new THREE.Mesh(shedRoofEaveBandGeo, barkMat);
  shedEaveBand.position.set(0, 4.58, 0);
  const shedRoof = new THREE.Mesh(shedHippedRoofGeo, harborSlateRoofMat);
  shedRoof.position.set(0, 6.32, 0);

  shedGroup.add(
    shedDeck,
    shedSouthW,
    shedSouthWainscot,
    shedWestW,
    shedWestWainscot,
    shedEastW,
    shedEastWainscot,
    shedNorthL,
    shedNorthLWainscot,
    shedNorthR,
    shedNorthRWainscot,
    shedNorthLintel,
    shedEaveBand,
    shedRoof,
    createRedChineseLantern(-1.85, 3.45, -4.85),
    createRedChineseLantern(1.85, 3.45, -4.85)
  );

  // Corner Stone Quoins & Door Jamb Posts for the Portmaster's House
  for (const [cx, cz] of [
    [-6.0, -4.5],
    [6.0, -4.5],
    [-6.0, 4.5],
    [6.0, 4.5],
    [-1.4, -4.5],
    [1.4, -4.5],
  ]) {
    const cPost = new THREE.Mesh(shedCornerPostGeo, barkMat);
    cPost.position.set(cx, 2.35, cz);
    shedGroup.add(cPost);
  }
  // Framed glowing windows on South, West & East walls of Portmaster's House
  for (const wx of [-3.4, 3.4]) {
    for (const wz of [-4.5, 4.5]) {
      const wFrame = new THREE.Mesh(tavWindowPaneGeo, barkMat);
      wFrame.scale.set(0.95, 0.95, 0.9);
      wFrame.position.set(wx, 2.55, wz);
      const wPane = new THREE.Mesh(tavWindowPaneGeo, warmLanternMat);
      wPane.scale.set(0.84, 0.84, 0.92);
      wPane.position.set(wx, 2.55, wz);
      shedGroup.add(wFrame, wPane);
    }
  }
  for (const sideX of [-6.0, 6.0]) {
    const sFrame = new THREE.Mesh(tavWindowPaneGeo, barkMat);
    sFrame.rotation.y = Math.PI / 2;
    sFrame.scale.set(1.05, 0.95, 0.9);
    sFrame.position.set(sideX, 2.55, 0);
    const sPane = new THREE.Mesh(tavWindowPaneGeo, warmLanternMat);
    sPane.rotation.y = Math.PI / 2;
    sPane.scale.set(0.92, 0.84, 0.92);
    sPane.position.set(sideX, 2.55, 0);
    shedGroup.add(sFrame, sPane);
  }

  // Interior Cargo Stacks along West & East walls leaving a clear center aisle
  for (const side of [-1, 1]) {
    for (let c = 0; c < 3; c++) {
      const cx = side * 4.2;
      const cz = -2.2 + c * 2.2;
      const cr = new THREE.Mesh(supplyCrateGeo, c % 2 === 0 ? imperialWoodFloorMat : furnitureWoodMat);
      cr.position.set(cx, 0.86, cz);
      shedGroup.add(cr);
      if (c < 2) {
        const topCr = new THREE.Mesh(supplyCrateGeo, c % 2 === 1 ? imperialWoodFloorMat : furnitureWoodMat);
        topCr.position.set(cx, 2.04, cz);
        shedGroup.add(topCr);
      }
    }
  }

  // Grounded Quayside Cargo Crane at (7.8, 0, -2.5) with Stone Pedestal, Full Mast, Strut Brace, Cable & Pallet Crate
  const cranePedestal = new THREE.Mesh(cranePedestalGeo, fortressStoneMat);
  cranePedestal.position.set(7.8, 0.46, -2.5);
  const craneMast = new THREE.Mesh(craneMastFullGeo, barkMat);
  craneMast.position.set(7.8, 3.4, -2.5);
  const craneJib = new THREE.Mesh(craneArmGeo, timberMat);
  craneJib.position.set(9.4, 6.2, -2.5);
  craneJib.rotation.z = 0.24;
  const craneStrut = new THREE.Mesh(craneStrutGeo, barkMat);
  craneStrut.position.set(8.65, 5.25, -2.5);
  craneStrut.rotation.z = 0.72;
  const craneCable = new THREE.Mesh(craneCableGeo, darkIronMat);
  craneCable.position.set(10.8, 3.9, -2.5);
  const craneCrate = new THREE.Mesh(supplyCrateGeo, furnitureWoodMat);
  craneCrate.position.set(10.8, 0.62, -2.5);
  shedGroup.add(cranePedestal, craneMast, craneJib, craneStrut, craneCable, craneCrate);
  harborGroup.add(shedGroup);

  // 6) MARBLE AMPHITHEATER & COLONNADE (Columns grounded on stone pedestals from y=0 to y=8.4m)
  const amphGroup = new THREE.Group();
  amphGroup.position.set(SOUTHEAST_HARBOR_POS.amphitheaterX, hPlazaY, SOUTHEAST_HARBOR_POS.amphitheaterZ);
  const amphStageGeo = new THREE.CylinderGeometry(6.4, 6.8, 0.36, 24);
  const amphBenchSegGeo = new THREE.BoxGeometry(2.6, 1.0, 1.65);
  const amphColPedestalGeo = new THREE.BoxGeometry(1.18, 0.68, 1.18);
  const amphColCapGeo = new THREE.BoxGeometry(1.12, 0.36, 1.12);
  const amphColGeo = new THREE.CylinderGeometry(0.38, 0.46, 8.2, 12);
  amphColGeo.translate(0, 4.1, 0);
  const amphArchBeamGeo = new THREE.BoxGeometry(5.3, 0.52, 0.72);
  disposableGeometries.push(
    amphStageGeo,
    amphBenchSegGeo,
    amphColPedestalGeo,
    amphColCapGeo,
    amphColGeo,
    amphArchBeamGeo
  );

  const stageMesh = new THREE.Mesh(amphStageGeo, carvedMarbleMat);
  stageMesh.position.y = 0.18;
  amphGroup.add(stageMesh);

  for (let tier = 0; tier < 5; tier++) {
    const rad = 7.8 + tier * 1.65;
    const tierH = 0.55 + tier * 0.56;
    const numSegs = 12 + tier * 2;
    for (let s = 0; s < numSegs; s++) {
      const ang = -Math.PI * 0.44 + (s / (numSegs - 1)) * (Math.PI * 0.88);
      const bx = Math.sin(ang) * rad;
      const bz = Math.cos(ang) * rad;
      const bench = new THREE.Mesh(amphBenchSegGeo, tier % 2 === 0 ? carvedMarbleMat : fortressStoneMat);
      bench.scale.set(1.0 + tier * 0.1, tierH, 1.0);
      bench.position.set(bx, tierH * 0.5, bz);
      bench.rotation.y = ang;
      amphGroup.add(bench);
    }
  }
  for (let c = 0; c < 6; c++) {
    const ang = -Math.PI * 0.4 + (c / 5) * (Math.PI * 0.8);
    const cx = Math.sin(ang) * 15.6;
    const cz = Math.cos(ang) * 15.6;
    const colPedestal = new THREE.Mesh(amphColPedestalGeo, fortressStoneMat);
    colPedestal.position.set(cx, 0.34, cz);
    colPedestal.rotation.y = ang;
    const col = new THREE.Mesh(amphColGeo, carvedMarbleMat);
    col.position.set(cx, 0, cz);
    const colCap = new THREE.Mesh(amphColCapGeo, imperialGoldMat);
    colCap.position.set(cx, 8.15, cz);
    colCap.rotation.y = ang;
    amphGroup.add(colPedestal, col, colCap);
    if (c < 5) {
      const nextAng = -Math.PI * 0.4 + ((c + 1) / 5) * (Math.PI * 0.8);
      const nx = Math.sin(nextAng) * 15.6;
      const nz = Math.cos(nextAng) * 15.6;
      const midX = (cx + nx) * 0.5;
      const midZ = (cz + nz) * 0.5;
      const beam = new THREE.Mesh(amphArchBeamGeo, imperialCrimsonMat);
      beam.position.set(midX, 8.4, midZ);
      beam.rotation.y = (ang + nextAng) * 0.5;
      amphGroup.add(beam, createRedChineseLantern(midX, 7.65, midZ));
    }
  }
  harborGroup.add(amphGroup);

  // 7) WOODEN HARBOR PIER & 42m 3-MASTED GALLEON SHIP
  const pierLen = SOUTHEAST_HARBOR_POS.pierEndX - SOUTHEAST_HARBOR_POS.pierStartX;
  const hPierDeckGeo = new THREE.BoxGeometry(pierLen, 0.28, SOUTHEAST_HARBOR_POS.pierHalfW * 2);
  const gangplankGeo = new THREE.BoxGeometry(5.4, 0.2, 3.8);
  const pilingGeo = new THREE.CylinderGeometry(0.24, 0.28, 2.6, 8);
  disposableGeometries.push(hPierDeckGeo, gangplankGeo, pilingGeo);

  const hPierDeck = new THREE.Mesh(hPierDeckGeo, timberMat);
  hPierDeck.position.set(
    (SOUTHEAST_HARBOR_POS.pierStartX + SOUTHEAST_HARBOR_POS.pierEndX) * 0.5,
    SOUTHEAST_HARBOR_POS.pierY - 0.14,
    SOUTHEAST_HARBOR_POS.pierZ
  );
  harborGroup.add(hPierDeck);

  for (let px = 256.0; px <= 271.0; px += 3.5) {
    for (const pz of [249.4, 254.6]) {
      const piling = new THREE.Mesh(pilingGeo, barkMat);
      piling.scale.y = 3.2;
      piling.position.set(px, 0.9, pz);
      harborGroup.add(piling);
    }
  }
  const gangplank = new THREE.Mesh(gangplankGeo, imperialWoodFloorMat);
  gangplank.position.set(273.5, 3.45, SOUTHEAST_HARBOR_POS.pierZ);
  gangplank.rotation.z = Math.atan2(
    SOUTHEAST_HARBOR_POS.shipDeckY - SOUTHEAST_HARBOR_POS.pierY,
    5.0
  );
  harborGroup.add(gangplank);

  const shipGroup = new THREE.Group();
  shipGroup.position.set(
    SOUTHEAST_HARBOR_POS.shipX,
    SOUTHEAST_HARBOR_POS.shipDeckY,
    SOUTHEAST_HARBOR_POS.shipZ
  );

  const hullMainGeo = new THREE.BoxGeometry(12.8, 4.2, 37.0);
  const hullBowConeGeo = new THREE.ConeGeometry(6.4, 9.5, 4);
  hullBowConeGeo.rotateX(-Math.PI / 2);
  hullBowConeGeo.rotateZ(Math.PI / 4);
  const bowspritSparGeo = new THREE.CylinderGeometry(0.14, 0.28, 11.5, 8);
  bowspritSparGeo.rotateX(Math.PI * 0.36);
  const shipMainDeckGeo = new THREE.BoxGeometry(12.6, 0.26, 41.6);
  const shipQuarterdeckSlabGeo = new THREE.BoxGeometry(12.6, 0.28, 13.4);
  const cabinSideWallGeo = new THREE.BoxGeometry(0.38, 3.0, 13.3);
  const cabinSternWallGeo = new THREE.BoxGeometry(12.6, 3.0, 0.42);
  const cabinFrontFlankGeo = new THREE.BoxGeometry(5.05, 3.0, 0.42);
  const cabinFrontLintelGeo = new THREE.BoxGeometry(2.6, 0.65, 0.44);
  const sternWindowPaneGeo = new THREE.BoxGeometry(2.2, 1.35, 0.52);
  const shipBulwarkSideGeo = new THREE.BoxGeometry(0.34, 1.1, 17.6);
  const shipBulwarkEndGeo = new THREE.BoxGeometry(12.6, 1.15, 0.38);
  const shipMastGeo = new THREE.CylinderGeometry(0.24, 0.4, 23.5, 10);
  shipMastGeo.translate(0, 11.75, 0);
  const shipYardarmGeo = new THREE.CylinderGeometry(0.11, 0.14, 10.6, 8);
  shipYardarmGeo.rotateZ(Math.PI / 2);
  const shipSailGeo = new THREE.PlaneGeometry(9.8, 5.4, 8, 4);
  const sailPos = shipSailGeo.attributes.position;
  for (let i = 0; i < sailPos.count; i++) {
    const sx = sailPos.getX(i);
    const sy = sailPos.getY(i);
    const billow = Math.cos((sx / 9.8) * Math.PI) * Math.cos((sy / 5.4) * Math.PI) * 1.25;
    sailPos.setZ(i, -billow);
  }
  shipSailGeo.computeVertexNormals();
  const shipWheelRimGeo = new THREE.TorusGeometry(0.78, 0.075, 8, 20);
  const shipWheelSpokeGeo = new THREE.CylinderGeometry(0.032, 0.032, 1.88, 6);
  const shipHelmStandGeo = new THREE.BoxGeometry(0.46, 1.32, 0.38);
  const binnacleStandGeo = new THREE.CylinderGeometry(0.22, 0.28, 1.05, 10);
  const treasureChestGeo = new THREE.BoxGeometry(1.5, 0.95, 1.05);
  const captainBedGeo = new THREE.BoxGeometry(2.6, 0.68, 3.4);
  const captainPillowGeo = new THREE.BoxGeometry(2.2, 0.24, 0.65);
  const shipStepGeo = new THREE.BoxGeometry(2.4, 0.22, 0.52);
  const qDeckFrontRailGeo = new THREE.BoxGeometry(6.6, 0.95, 0.28);

  disposableGeometries.push(
    hullMainGeo,
    hullBowConeGeo,
    bowspritSparGeo,
    shipMainDeckGeo,
    shipQuarterdeckSlabGeo,
    cabinSideWallGeo,
    cabinSternWallGeo,
    cabinFrontFlankGeo,
    cabinFrontLintelGeo,
    sternWindowPaneGeo,
    shipBulwarkSideGeo,
    shipBulwarkEndGeo,
    shipMastGeo,
    shipYardarmGeo,
    shipSailGeo,
    shipWheelRimGeo,
    shipWheelSpokeGeo,
    shipHelmStandGeo,
    binnacleStandGeo,
    treasureChestGeo,
    captainBedGeo,
    captainPillowGeo,
    shipStepGeo,
    qDeckFrontRailGeo
  );

  const hullMesh = new THREE.Mesh(hullMainGeo, barkMat);
  hullMesh.position.set(0, -1.95, 0);
  const bowCone = new THREE.Mesh(hullBowConeGeo, barkMat);
  bowCone.position.set(0, -1.25, -21.5);
  const bowsprit = new THREE.Mesh(bowspritSparGeo, timberMat);
  bowsprit.position.set(0, 1.45, -23.5);
  const mainDeckMesh = new THREE.Mesh(shipMainDeckGeo, imperialWoodFloorMat);
  mainDeckMesh.position.set(0, -0.12, 0);
  const qDeckSlab = new THREE.Mesh(shipQuarterdeckSlabGeo, imperialWoodFloorMat);
  qDeckSlab.position.set(0, 3.0 - 0.14, 14.15);
  shipGroup.add(hullMesh, bowCone, bowsprit, mainDeckMesh, qDeckSlab);

  const cabWallPort = new THREE.Mesh(cabinSideWallGeo, timberMat);
  cabWallPort.position.set(-6.1, 1.5, 14.15);
  const cabWallStbd = new THREE.Mesh(cabinSideWallGeo, timberMat);
  cabWallStbd.position.set(6.1, 1.5, 14.15);
  const cabWallStern = new THREE.Mesh(cabinSternWallGeo, timberMat);
  cabWallStern.position.set(0, 1.5, 20.65);
  const cabFrontL = new THREE.Mesh(cabinFrontFlankGeo, timberMat);
  cabFrontL.position.set(-3.72, 1.5, 7.5);
  const cabFrontR = new THREE.Mesh(cabinFrontFlankGeo, timberMat);
  cabFrontR.position.set(3.72, 1.5, 7.5);
  const cabFrontLintel = new THREE.Mesh(cabinFrontLintelGeo, imperialCrimsonMat);
  cabFrontLintel.position.set(0, 2.68, 7.5);
  const captainDoor = createInteractiveDoubleDoor(
    SOUTHEAST_HARBOR_POS.shipCaptainDoorId,
    0,
    0,
    7.5,
    2.4,
    2.35
  );
  shipGroup.add(cabWallPort, cabWallStbd, cabWallStern, cabFrontL, cabFrontR, cabFrontLintel, captainDoor);

  for (const wx of [-3.6, 0, 3.6]) {
    const winMesh = new THREE.Mesh(sternWindowPaneGeo, warmLanternMat);
    winMesh.position.set(wx, 1.75, 20.68);
    const winFrame = new THREE.Mesh(sternWindowPaneGeo, imperialGoldMat);
    winFrame.scale.set(1.12, 1.15, 0.85);
    winFrame.position.set(wx, 1.75, 20.68);
    shipGroup.add(winFrame, winMesh);
  }

  // Royal Naval Shipwright's Executive Office inside the Galleon Captain's Cabin (local z = 7.5..20.65)
  // Emptied of the old bed/chests and transformed into an Admiral & Master Shipwright Naval Office!
  const officeCarpetGeo = new THREE.BoxGeometry(6.4, 0.04, 8.2);
  const officeCarpetBorderGeo = new THREE.BoxGeometry(6.8, 0.03, 8.6);
  const officeDeskTopGeo = new THREE.BoxGeometry(3.5, 0.14, 1.55);
  const officeDeskPedestalGeo = new THREE.BoxGeometry(0.95, 0.84, 1.42);
  const officeDeskModestyGeo = new THREE.BoxGeometry(1.7, 0.74, 0.12);
  const officeChairSeatGeo = new THREE.BoxGeometry(0.76, 0.10, 0.72);
  const officeChairBackGeo = new THREE.BoxGeometry(0.74, 1.18, 0.12);
  const officeChairArmGeo = new THREE.BoxGeometry(0.10, 0.08, 0.68);
  const officeBookshelfFrameGeo = new THREE.BoxGeometry(0.85, 2.55, 6.2);
  const officeDraftingTableGeo = new THREE.BoxGeometry(0.95, 0.92, 5.8);
  const officeGlobeSphereGeo = new THREE.SphereGeometry(0.46, 14, 12);
  const officeGlobeRingGeo = new THREE.TorusGeometry(0.54, 0.035, 8, 20);
  const officeModelHullGeo = new THREE.ConeGeometry(0.24, 1.15, 6);
  officeModelHullGeo.rotateX(Math.PI / 2);
  disposableGeometries.push(
    officeCarpetGeo,
    officeCarpetBorderGeo,
    officeDeskTopGeo,
    officeDeskPedestalGeo,
    officeDeskModestyGeo,
    officeChairSeatGeo,
    officeChairBackGeo,
    officeChairArmGeo,
    officeBookshelfFrameGeo,
    officeDraftingTableGeo,
    officeGlobeSphereGeo,
    officeGlobeRingGeo,
    officeModelHullGeo
  );

  // 1) Woven Crimson & Gold Admiral's Office Carpet
  const officeCarpetBorder = new THREE.Mesh(officeCarpetBorderGeo, imperialGoldMat);
  officeCarpetBorder.position.set(0, 0.015, 14.2);
  const officeCarpet = new THREE.Mesh(officeCarpetGeo, imperialCrimsonMat);
  officeCarpet.position.set(0, 0.025, 14.2);
  shipGroup.add(officeCarpetBorder, officeCarpet);

  // 2) Executive Mahogany Shipwright's Desk at (0, 0, 15.6) -> World (282.0, 3.65, 267.6)
  const officeDeskGroup = new THREE.Group();
  officeDeskGroup.position.set(0, 0, 15.6);
  const deskTop = new THREE.Mesh(officeDeskTopGeo, furnitureWoodMat);
  deskTop.position.set(0, 0.88, 0);
  const deskTrim = new THREE.Mesh(officeDeskTopGeo, imperialGoldMat);
  deskTrim.scale.set(1.02, 0.45, 1.03);
  deskTrim.position.set(0, 0.86, 0);
  const deskPedL = new THREE.Mesh(officeDeskPedestalGeo, timberMat);
  deskPedL.position.set(-1.18, 0.42, 0);
  const deskPedR = new THREE.Mesh(officeDeskPedestalGeo, timberMat);
  deskPedR.position.set(1.18, 0.42, 0);
  const deskFrontPanel = new THREE.Mesh(officeDeskModestyGeo, imperialCrimsonMat);
  deskFrontPanel.position.set(0, 0.44, -0.62);

  // Naval Blueprints, Golden Scale Ship Model, Brass Compass & Ledger on the Executive Desk
  const deskBlueprint = new THREE.Mesh(feastPlatterGeo, carvedMarbleMat);
  deskBlueprint.scale.set(1.85, 0.25, 1.25);
  deskBlueprint.position.set(-0.35, 0.96, -0.08);
  const deskMiniShip = new THREE.Mesh(officeModelHullGeo, imperialGoldMat);
  deskMiniShip.position.set(0.95, 1.12, -0.12);
  deskMiniShip.rotation.y = 0.35;
  const deskMiniMast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.65, 6),
    imperialGoldMat
  );
  disposableGeometries.push(deskMiniMast.geometry);
  deskMiniMast.position.set(0.95, 1.38, -0.12);
  const deskLedger = new THREE.Mesh(displayStoneBlockGeo, imperialCrimsonMat);
  deskLedger.scale.set(0.95, 0.38, 1.15);
  deskLedger.position.set(-1.15, 0.98, 0.12);
  officeDeskGroup.add(
    deskTop,
    deskTrim,
    deskPedL,
    deskPedR,
    deskFrontPanel,
    deskBlueprint,
    deskMiniShip,
    deskMiniMast,
    deskLedger
  );

  // 3) High-Backed Admiral's Office Chair & Seated Royal Shipwright Master NPC (with full seated legs & boots!)
  const chairGroup = new THREE.Group();
  chairGroup.position.set(0, 0, 1.25); // local z = 16.85 behind the desk
  const chairSeat = new THREE.Mesh(officeChairSeatGeo, imperialCrimsonMat);
  chairSeat.position.set(0, 0.48, 0);
  const chairBack = new THREE.Mesh(officeChairBackGeo, imperialCrimsonMat);
  chairBack.position.set(0, 1.08, 0.32);
  const chairBackFrame = new THREE.Mesh(officeChairBackGeo, imperialGoldMat);
  chairBackFrame.scale.set(1.08, 1.05, 0.75);
  chairBackFrame.position.set(0, 1.08, 0.34);
  const chairArmL = new THREE.Mesh(officeChairArmGeo, furnitureWoodMat);
  chairArmL.position.set(-0.38, 0.72, 0);
  const chairArmR = new THREE.Mesh(officeChairArmGeo, furnitureWoodMat);
  chairArmR.position.set(0.38, 0.72, 0);
  chairGroup.add(chairSeat, chairBack, chairBackFrame, chairArmL, chairArmR);
  for (const [clx, clz] of [
    [-0.32, -0.28],
    [0.32, -0.28],
    [-0.32, 0.28],
    [0.32, 0.28],
  ]) {
    const cLeg = new THREE.Mesh(tableLegGeo, furnitureWoodMat);
    cLeg.scale.set(1.0, 0.62, 1.0);
    cLeg.position.set(clx, 0.24, clz);
    chairGroup.add(cLeg);
  }

  // Seated Shipwright Master NPC facing forward (-Z toward the cabin entrance & desk)
  const swNpcGroup = new THREE.Group();
  swNpcGroup.position.set(0, 0.04, 1.22);
  swNpcGroup.rotation.y = Math.PI; // Faces -Z toward the cabin doorway

  const swNpcTorso = new THREE.Mesh(npcTorsoGeo, imperialCrimsonMat);
  swNpcTorso.position.set(0, 0.88, 0);
  const swNpcHip = new THREE.Mesh(npcHipSkirtGeo, imperialCrimsonMat);
  swNpcHip.position.set(0, 0.52, 0.04);
  // Seated thighs extending forward onto the chair cushion + lower shins & boots resting on floor
  const swLeftThigh = new THREE.Mesh(npcLegGeo, merchantHairMat);
  swLeftThigh.rotation.x = Math.PI / 2;
  swLeftThigh.position.set(-0.13, 0.50, 0.22);
  const swRightThigh = new THREE.Mesh(npcLegGeo, merchantHairMat);
  swRightThigh.rotation.x = Math.PI / 2;
  swRightThigh.position.set(0.13, 0.50, 0.22);
  const swLeftShin = new THREE.Mesh(npcLegGeo, merchantHairMat);
  swLeftShin.position.set(-0.13, 0.26, 0.40);
  const swRightShin = new THREE.Mesh(npcLegGeo, merchantHairMat);
  swRightShin.position.set(0.13, 0.26, 0.40);
  const swLeftBoot = new THREE.Mesh(npcBootGeo, darkIronMat);
  swLeftBoot.position.set(-0.13, 0.07, 0.45);
  const swRightBoot = new THREE.Mesh(npcBootGeo, darkIronMat);
  swRightBoot.position.set(0.13, 0.07, 0.45);

  const swNpcSash = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.25, 0.14, 8),
    imperialGoldMat
  );
  disposableGeometries.push(swNpcSash.geometry);
  swNpcSash.position.set(0, 0.72, 0);
  const swNpcHead = new THREE.Mesh(npcHeadGeo, merchantSkinMat);
  swNpcHead.position.set(0, 1.44, 0);
  const swNpcHat = new THREE.Mesh(npcHatGeo, imperialGoldMat);
  swNpcHat.scale.set(1.28, 1.22, 1.28);
  swNpcHat.position.set(0, 1.60, 0);
  const swLeftArm = new THREE.Mesh(npcArmGeo, imperialCrimsonMat);
  swLeftArm.position.set(-0.28, 1.18, 0.06);
  swLeftArm.rotation.x = -0.55;
  swLeftArm.rotation.z = 0.16;
  const swRightArmPivot = new THREE.Group();
  swRightArmPivot.position.set(0.28, 1.18, 0.06);
  const swRightArm = new THREE.Mesh(npcArmGeo, imperialCrimsonMat);
  swRightArmPivot.add(swRightArm);
  merchantArmPivots.push(swRightArmPivot);

  swNpcGroup.add(
    swNpcTorso,
    swNpcHip,
    swLeftThigh,
    swRightThigh,
    swLeftShin,
    swRightShin,
    swLeftBoot,
    swRightBoot,
    swNpcSash,
    swNpcHead,
    swNpcHat,
    swLeftArm,
    swRightArmPivot
  );
  officeDeskGroup.add(chairGroup, swNpcGroup);
  shipGroup.add(officeDeskGroup);

  // 4) Port-Wall Naval Archives & Blueprint Scroll Bookshelf (x = -5.15, z = 13.0)
  const portBookshelf = new THREE.Mesh(officeBookshelfFrameGeo, timberMat);
  portBookshelf.position.set(-5.15, 1.28, 13.0);
  shipGroup.add(portBookshelf);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      const scrollTube = new THREE.Mesh(displayLogGeo, row % 2 === 0 ? carvedMarbleMat : imperialGoldMat);
      scrollTube.scale.set(0.55, 0.55, 0.65);
      scrollTube.position.set(-4.68, 0.55 + row * 0.72, 10.6 + col * 1.18);
      shipGroup.add(scrollTube);
    }
  }

  // 5) Starboard-Wall Naval Drafting Table & Scale Hull Prototypes Rack (x = 5.15, z = 13.0)
  const stbdDraftingTable = new THREE.Mesh(officeDraftingTableGeo, furnitureWoodMat);
  stbdDraftingTable.position.set(5.15, 0.46, 13.0);
  shipGroup.add(stbdDraftingTable);
  for (let m = 0; m < 3; m++) {
    const hullProto = new THREE.Mesh(
      officeModelHullGeo,
      m === 1 ? imperialGoldMat : m === 0 ? furnitureWoodMat : imperialCrimsonMat
    );
    hullProto.position.set(5.05, 1.12, 10.9 + m * 2.1);
    shipGroup.add(hullProto);
  }

  // 6) Brass Celestial & Maritime Globe at (3.8, 0, 18.2) & Iron-Bound Naval Strongbox at (-3.8, 0, 18.4)
  const globeStand = new THREE.Mesh(binnacleStandGeo, furnitureWoodMat);
  globeStand.position.set(3.8, 0.52, 18.2);
  const globeRing = new THREE.Mesh(officeGlobeRingGeo, imperialGoldMat);
  globeRing.position.set(3.8, 1.28, 18.2);
  globeRing.rotation.z = 0.41;
  const globeSphere = new THREE.Mesh(officeGlobeSphereGeo, waterMat);
  globeSphere.position.set(3.8, 1.28, 18.2);
  const officeStrongbox = new THREE.Mesh(treasureChestGeo, darkIronMat);
  officeStrongbox.position.set(-3.8, 0.48, 18.4);
  const officeStrongboxGold = new THREE.Mesh(forgeCoalMoundGeo, mineGoldOreMat);
  officeStrongboxGold.position.set(-3.8, 0.96, 18.4);
  shipGroup.add(
    globeStand,
    globeRing,
    globeSphere,
    officeStrongbox,
    officeStrongboxGold,
    createRedChineseLantern(-2.6, 2.45, 11.2),
    createRedChineseLantern(2.6, 2.45, 11.2),
    createRedChineseLantern(-2.6, 2.45, 17.5),
    createRedChineseLantern(2.6, 2.45, 17.5)
  );

  const shipStepSubWallGeo = new THREE.BoxGeometry(2.36, 1.0, 0.48);
  disposableGeometries.push(shipStepSubWallGeo);
  for (const stairSide of [-1, 1]) {
    for (let s = 0; s <= 12; s++) {
      const t = s / 12;
      const stepTopY = t * 3.0;
      const stepZ = 2.5 + t * 5.0;
      const step = new THREE.Mesh(shipStepGeo, imperialWoodFloorMat);
      step.position.set(stairSide * 4.55, stepTopY - 0.08, stepZ);
      shipGroup.add(step);

      if (stepTopY > 0.12) {
        const subWall = new THREE.Mesh(shipStepSubWallGeo, timberMat);
        subWall.scale.set(1.0, stepTopY, 1.0);
        subWall.position.set(stairSide * 4.55, stepTopY * 0.5 - 0.05, stepZ);
        shipGroup.add(subWall);
      }
    }
  }

  const portBowRail = new THREE.Mesh(shipBulwarkSideGeo, imperialCrimsonMat);
  portBowRail.position.set(-6.15, 0.55, -11.4);
  const portMidRail = new THREE.Mesh(shipBulwarkSideGeo, imperialCrimsonMat);
  portMidRail.scale.z = 5.5 / 17.6;
  portMidRail.position.set(-6.15, 0.55, 4.75);
  const portSternRail = new THREE.Mesh(shipBulwarkSideGeo, imperialCrimsonMat);
  portSternRail.scale.z = 13.3 / 17.6;
  portSternRail.position.set(-6.15, 3.55, 14.15);
  const stbdBowRail = new THREE.Mesh(shipBulwarkSideGeo, imperialCrimsonMat);
  stbdBowRail.position.set(6.15, 0.55, -11.4);
  const stbdMidRail = new THREE.Mesh(shipBulwarkSideGeo, imperialCrimsonMat);
  stbdMidRail.scale.z = 0.65;
  stbdMidRail.position.set(6.15, 0.55, 1.5);
  const stbdSternRail = new THREE.Mesh(shipBulwarkSideGeo, imperialCrimsonMat);
  stbdSternRail.scale.z = 13.3 / 17.6;
  stbdSternRail.position.set(6.15, 3.55, 14.15);
  const bowRail = new THREE.Mesh(shipBulwarkEndGeo, imperialCrimsonMat);
  bowRail.position.set(0, 0.55, -20.6);
  const sternRail = new THREE.Mesh(shipBulwarkEndGeo, imperialCrimsonMat);
  sternRail.position.set(0, 3.55, 20.6);
  const qDeckFrontRail = new THREE.Mesh(qDeckFrontRailGeo, imperialCrimsonMat);
  qDeckFrontRail.position.set(0, 3.48, 7.55);
  shipGroup.add(
    portBowRail,
    portMidRail,
    portSternRail,
    stbdBowRail,
    stbdMidRail,
    stbdSternRail,
    bowRail,
    sternRail,
    qDeckFrontRail
  );

  for (const cz of [-13.5, -7.5, -1.5]) {
    for (const side of [-1, 1]) {
      if (side === -1 && Math.abs(cz) < 3.5) continue;
      const scGroup = new THREE.Group();
      scGroup.position.set(side * 5.2, 0, cz);
      if (side === -1) scGroup.rotation.y = Math.PI;
      const scCarriage = new THREE.Mesh(cannonCarriageGeo, timberMat);
      scCarriage.position.y = 0.26;
      const scBarrel = new THREE.Mesh(cannonBarrelGeo, darkIronMat);
      scBarrel.position.set(0.45, 0.62, 0);
      scGroup.add(scCarriage, scBarrel);
      shipGroup.add(scGroup);
    }
  }

  for (const [mz, mScale] of [
    [-16.2, 0.92],
    [-8.2, 1.08],
    [-0.6, 0.90],
  ]) {
    const mast = new THREE.Mesh(shipMastGeo, barkMat);
    mast.position.set(0, 0, mz);
    mast.scale.y = mScale;
    shipGroup.add(mast);
    for (const sy of [8.2 * mScale, 15.0 * mScale]) {
      const yard = new THREE.Mesh(shipYardarmGeo, timberMat);
      yard.position.set(0, sy + 2.5, mz);
      const sail = new THREE.Mesh(shipSailGeo, sailClothMat);
      sail.position.set(0, sy, mz - 0.28);
      shipGroup.add(yard, sail);
    }
    shipGroup.add(createRedImperialFlag(0, 22.8 * mScale, mz));
  }

  const binnacleStand = new THREE.Mesh(binnacleStandGeo, furnitureWoodMat);
  binnacleStand.position.set(0, 3.52, 8.45);
  const binnacleCompass = new THREE.Mesh(cannonBallGeo, imperialGoldMat);
  binnacleCompass.scale.setScalar(1.35);
  binnacleCompass.position.set(0, 4.12, 8.45);
  const helmStand = new THREE.Mesh(shipHelmStandGeo, furnitureWoodMat);
  helmStand.position.set(0, 3.66, 9.2);
  const wheelAssembly = new THREE.Group();
  wheelAssembly.position.set(0, 4.18, 9.48);
  const wheelRim = new THREE.Mesh(shipWheelRimGeo, furnitureWoodMat);
  const wheelHub = new THREE.Mesh(cannonBallGeo, imperialGoldMat);
  wheelHub.scale.set(0.9, 0.9, 1.4);
  wheelAssembly.add(wheelRim, wheelHub);
  for (let sp = 0; sp < 4; sp++) {
    const spoke = new THREE.Mesh(shipWheelSpokeGeo, imperialGoldMat);
    spoke.rotation.z = (sp / 4) * Math.PI;
    wheelAssembly.add(spoke);
  }

  const sternChest = new THREE.Mesh(treasureChestGeo, barkMat);
  sternChest.position.set(3.8, 3.48, 17.5);
  const sternGold = new THREE.Mesh(forgeCoalMoundGeo, mineGoldOreMat);
  sternGold.position.set(3.8, 3.98, 17.5);

  shipGroup.add(
    binnacleStand,
    binnacleCompass,
    helmStand,
    wheelAssembly,
    sternChest,
    sternGold,
    createRedChineseLantern(-5.2, 5.2, 20.2),
    createRedChineseLantern(5.2, 5.2, 20.2),
    createRedImperialFlag(0, 5.5, 20.5)
  );
  harborGroup.add(shipGroup);

  // 8) CLIMBABLE 26m ROUNDED CYLINDRICAL IMPERIAL LIGHTHOUSE (Centered at 252.0, 202.0)
  const lhX = SOUTHEAST_HARBOR_POS.lighthouseX;
  const lhZ = SOUTHEAST_HARBOR_POS.lighthouseZ;
  const lhBaseY = SOUTHEAST_HARBOR_POS.lighthouseBaseY;
  const lhTopY = SOUTHEAST_HARBOR_POS.lighthouseTopDeckY;
  const lhH = lhTopY - lhBaseY;
  const lighthouseGroup = new THREE.Group();
  lighthouseGroup.position.set(lhX, lhBaseY, lhZ);

  // Stepped circular marble base plinth + cylindrical tower drum (with South doorway portal at +Z)
  const lhPlinthOuterGeo = new THREE.CylinderGeometry(4.65, 5.05, 1.2, 24);
  const lhPlinthInnerGeo = new THREE.CylinderGeometry(4.25, 4.55, 0.65, 24);
  const lhWallSegSpan = (Math.PI * 2 - 0.72) / 14;
  const lhWallSegChord = 2 * 4.0 * Math.sin(lhWallSegSpan * 0.5) + 0.16;
  const lhWallSegGeo = new THREE.BoxGeometry(lhWallSegChord, lhH, 0.56);
  const lhDoorJambGeo = new THREE.BoxGeometry(0.48, 3.3, 0.78);
  const lhDoorLintelGeo = new THREE.BoxGeometry(2.75, lhH - 3.2, 0.58);
  const lhDoorArchCorniceGeo = new THREE.BoxGeometry(3.15, 0.42, 0.92);
  const lhCylinderStripeGeo = new THREE.CylinderGeometry(4.32, 4.32, 1.32, 24, 1, true);
  const lhCorniceRingGeo = new THREE.CylinderGeometry(4.65, 4.18, 0.72, 24, 1, true);
  const lhDeckInnerDiskGeo = new THREE.CylinderGeometry(2.22, 2.22, 0.32, 24);
  const lhDeckOuterRingSegGeo = new THREE.BoxGeometry(1.82, 0.32, 1.08);
  const lhDeckMidSectorSegGeo = new THREE.BoxGeometry(1.38, 0.32, 1.36);
  const lhHatchSideBeamGeo = new THREE.BoxGeometry(0.16, 0.38, 1.38);
  const lhHatchNorthBeamGeo = new THREE.BoxGeometry(1.76, 0.38, 0.16);
  const lhDeckCircleRimGeo = new THREE.CylinderGeometry(4.62, 4.62, 0.34, 24, 1, true);
  const lhRailPostGeo = new THREE.CylinderGeometry(0.11, 0.13, 1.08, 8);
  const lhRailSegSpan = (Math.PI * 2) / 16;
  const lhRailSegChord = 2 * 4.45 * Math.sin(lhRailSegSpan * 0.5) + 0.08;
  const lhTopRailSegGeo = new THREE.BoxGeometry(lhRailSegChord, 0.96, 0.22);
  const lhPortholeFrameGeo = new THREE.TorusGeometry(0.52, 0.09, 8, 16);
  const lhPortholeGlassGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.14, 14);
  lhPortholeGlassGeo.rotateX(Math.PI / 2);
  const lhLanternBaseGeo = new THREE.CylinderGeometry(1.42, 1.55, 0.85, 20);
  const lhLanternGlassGeo = new THREE.CylinderGeometry(1.28, 1.28, 3.5, 20);
  const lhDomeRoofGeo = new THREE.SphereGeometry(1.52, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52);
  const lhFinialSpireGeo = new THREE.ConeGeometry(0.32, 1.75, 10);
  const lhSearchBeamGeo = new THREE.ConeGeometry(3.8, 28.0, 12, 1, true);
  lhSearchBeamGeo.translate(0, -14.0, 0);
  lhSearchBeamGeo.rotateX(Math.PI / 2);
  const lhLadderRailGeo = new THREE.BoxGeometry(0.11, lhH + 0.85, 0.11);
  const hwLadderRungGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.62, 6);
  hwLadderRungGeo.rotateZ(Math.PI / 2);

  disposableGeometries.push(
    lhPlinthOuterGeo,
    lhPlinthInnerGeo,
    lhWallSegGeo,
    lhDoorJambGeo,
    lhDoorLintelGeo,
    lhDoorArchCorniceGeo,
    lhCylinderStripeGeo,
    lhCorniceRingGeo,
    lhDeckInnerDiskGeo,
    lhDeckOuterRingSegGeo,
    lhDeckMidSectorSegGeo,
    lhHatchSideBeamGeo,
    lhHatchNorthBeamGeo,
    lhDeckCircleRimGeo,
    lhRailPostGeo,
    lhTopRailSegGeo,
    lhPortholeFrameGeo,
    lhPortholeGlassGeo,
    lhLanternBaseGeo,
    lhLanternGlassGeo,
    lhDomeRoofGeo,
    lhFinialSpireGeo,
    lhSearchBeamGeo,
    lhLadderRailGeo,
    hwLadderRungGeo
  );

  const lhPlinthOuter = new THREE.Mesh(lhPlinthOuterGeo, fortressStoneMat);
  lhPlinthOuter.position.set(0, -0.52, 0);
  const lhPlinthInner = new THREE.Mesh(lhPlinthInnerGeo, carvedMarbleMat);
  lhPlinthInner.position.set(0, 0.18, 0);
  lighthouseGroup.add(lhPlinthOuter, lhPlinthInner);

  // 14 Tangential Curved Wall Segments forming the Cylindrical Lighthouse Drum (leaving South Doorway at +Z open)
  for (let i = 0; i < 14; i++) {
    const ang = 0.36 + (i + 0.5) * lhWallSegSpan;
    const segMesh = new THREE.Mesh(lhWallSegGeo, carvedMarbleMat);
    segMesh.position.set(Math.sin(ang) * 4.0, lhH * 0.5, Math.cos(ang) * 4.0);
    segMesh.rotation.y = ang;
    lighthouseGroup.add(segMesh);
  }

  // South Entrance Portal Frame, Upper Wall Lintel & Interactive Double Door
  const lhJambL = new THREE.Mesh(lhDoorJambGeo, imperialCrimsonMat);
  lhJambL.position.set(-1.32, 1.65, 3.92);
  const lhJambR = new THREE.Mesh(lhDoorJambGeo, imperialCrimsonMat);
  lhJambR.position.set(1.32, 1.65, 3.92);
  const lhLintel = new THREE.Mesh(lhDoorLintelGeo, carvedMarbleMat);
  lhLintel.position.set(0, (3.2 + lhH) * 0.5, 3.88);
  const lhDoorCornice = new THREE.Mesh(lhDoorArchCorniceGeo, imperialGoldMat);
  lhDoorCornice.position.set(0, 3.42, 4.02);
  lighthouseGroup.add(
    lhJambL,
    lhJambR,
    lhLintel,
    lhDoorCornice,
    createInteractiveDoubleDoor(SOUTHEAST_HARBOR_POS.lighthouseDoorId, 0, 0.08, 3.85, 2.2, 3.2)
  );

  // 3 Cylindrical Crimson Stripe Bands & Brass-Framed Circular Porthole Windows around the Lighthouse Drum
  for (const sy of [5.2, 10.4, 15.2]) {
    const stripeRing = new THREE.Mesh(lhCylinderStripeGeo, imperialCrimsonMat);
    stripeRing.position.set(0, sy, 0);
    lighthouseGroup.add(stripeRing);
  }
  for (const [pang, py] of [
    [Math.PI * 0.5, 7.8],
    [-Math.PI * 0.5, 7.8],
    [Math.PI, 12.8],
    [0, 12.8],
  ]) {
    const pFrame = new THREE.Mesh(lhPortholeFrameGeo, imperialGoldMat);
    pFrame.position.set(Math.sin(pang) * 4.28, py, Math.cos(pang) * 4.28);
    pFrame.rotation.y = pang;
    const pGlass = new THREE.Mesh(lhPortholeGlassGeo, warmLanternMat);
    pGlass.position.set(Math.sin(pang) * 4.24, py, Math.cos(pang) * 4.24);
    pGlass.rotation.y = pang;
    lighthouseGroup.add(pFrame, pGlass);
  }

  // Circular Corbelled Upper Gallery Deck at y = lhH (with clean framed North-Center Ladder Hatch Opening at (0, -2.9))
  const lhCorniceRing = new THREE.Mesh(lhCorniceRingGeo, carvedMarbleMat);
  lhCorniceRing.position.set(0, lhH - 0.52, 0);
  const lhDeckRim = new THREE.Mesh(lhDeckCircleRimGeo, imperialGoldMat);
  lhDeckRim.position.set(0, lhH - 0.16, 0);
  const lhDeckInnerDisk = new THREE.Mesh(lhDeckInnerDiskGeo, carvedMarbleMat);
  lhDeckInnerDisk.position.set(0, lhH - 0.16, 0);
  lighthouseGroup.add(lhCorniceRing, lhDeckRim, lhDeckInnerDisk);

  // Outer gallery walkway ring (r = 3.50..4.58m) + middle sector ring (r = 2.18..3.54m) skipping the North ladder hatch at ang = PI
  for (let i = 0; i < 16; i++) {
    const ang = (i + 0.5) * lhRailSegSpan;
    const outerSeg = new THREE.Mesh(lhDeckOuterRingSegGeo, carvedMarbleMat);
    outerSeg.position.set(Math.sin(ang) * 4.04, lhH - 0.16, Math.cos(ang) * 4.04);
    outerSeg.rotation.y = ang;
    lighthouseGroup.add(outerSeg);

    // Skip the 2 north-facing middle sectors (i = 7 and i = 8, around ang = PI -> x in [-0.8, 0.8], z in [-3.54, -2.18]) for the ladder hatch!
    if (i !== 7 && i !== 8) {
      const midSeg = new THREE.Mesh(lhDeckMidSectorSegGeo, carvedMarbleMat);
      midSeg.position.set(Math.sin(ang) * 2.86, lhH - 0.16, Math.cos(ang) * 2.86);
      midSeg.rotation.y = ang;
      lighthouseGroup.add(midSeg);
    }
  }

  // Crimson & Gold Ladder Hatch Coaming Frame around the North Hatch Opening (x in [-0.82, 0.82], z in [-3.56, -2.20])
  const hatchBeamL = new THREE.Mesh(lhHatchSideBeamGeo, imperialCrimsonMat);
  hatchBeamL.position.set(-0.82, lhH - 0.12, -2.88);
  const hatchBeamR = new THREE.Mesh(lhHatchSideBeamGeo, imperialCrimsonMat);
  hatchBeamR.position.set(0.82, lhH - 0.12, -2.88);
  const hatchBeamN = new THREE.Mesh(lhHatchNorthBeamGeo, imperialGoldMat);
  hatchBeamN.position.set(0, lhH - 0.12, -3.56);
  lighthouseGroup.add(hatchBeamL, hatchBeamR, hatchBeamN);

  // Interior Climbable Vertical Ladder at (0, lhH * 0.5, -2.9) rising cleanly through the open North hatch
  const lhLadderGroup = new THREE.Group();
  lhLadderGroup.position.set(0, lhH * 0.5, -2.9);
  const lhRailL = new THREE.Mesh(lhLadderRailGeo, imperialCrimsonMat);
  lhRailL.position.x = -0.35;
  const lhRailR = new THREE.Mesh(lhLadderRailGeo, imperialCrimsonMat);
  lhRailR.position.x = 0.35;
  lhLadderGroup.add(lhRailL, lhRailR);
  for (let r = 0; r <= 38; r++) {
    const rung = new THREE.Mesh(hwLadderRungGeo, imperialGoldMat);
    rung.position.y = -lhH * 0.5 + 0.35 + (r / 38) * (lhH - 0.4);
    lhLadderGroup.add(rung);
  }
  lighthouseGroup.add(lhLadderGroup);

  // 16-Segment Circular Balustrade Railing around the Upper Observation Gallery (r = 4.45m)
  for (let i = 0; i < 16; i++) {
    const ang = (i + 0.5) * lhRailSegSpan;
    const postAng = i * lhRailSegSpan;
    const railSeg = new THREE.Mesh(lhTopRailSegGeo, imperialCrimsonMat);
    railSeg.position.set(Math.sin(ang) * 4.45, lhH + 0.48, Math.cos(ang) * 4.45);
    railSeg.rotation.y = ang;
    const railPost = new THREE.Mesh(lhRailPostGeo, carvedMarbleMat);
    railPost.position.set(Math.sin(postAng) * 4.45, lhH + 0.54, Math.cos(postAng) * 4.45);
    lighthouseGroup.add(railSeg, railPost);
  }

  // Compact Central Cylindrical Lantern Room (r = 1.42..1.55m), Domed Gold Cupola & Rotating Dual Searchlight Beams
  const lhLanternBase = new THREE.Mesh(lhLanternBaseGeo, fortressStoneMat);
  lhLanternBase.position.set(0, lhH + 0.42, 0);
  const lhBeaconCore = new THREE.Mesh(lhLanternGlassGeo, warmLanternMat);
  lhBeaconCore.position.set(0, lhH + 2.55, 0);
  const lhDomeRoof = new THREE.Mesh(lhDomeRoofGeo, imperialGoldMat);
  lhDomeRoof.position.set(0, lhH + 4.25, 0);
  const lhFinial = new THREE.Mesh(lhFinialSpireGeo, imperialGoldMat);
  lhFinial.position.set(0, lhH + 6.45, 0);
  const lighthouseBeaconGroup = new THREE.Group();
  lighthouseBeaconGroup.position.set(0, lhH + 2.6, 0);
  const beam1 = new THREE.Mesh(lhSearchBeamGeo, lhBeamMat);
  const beam2 = new THREE.Mesh(lhSearchBeamGeo, lhBeamMat);
  beam2.rotation.y = Math.PI;
  lighthouseBeaconGroup.add(beam1, beam2);
  lighthouseGroup.add(lhLanternBase, lhBeaconCore, lhDomeRoof, lhFinial, lighthouseBeaconGroup);
  harborGroup.add(lighthouseGroup);

  scene.add(harborGroup);
  distanceCulledObjects.push({
    obj: harborGroup,
    cx: 255.0,
    cz: 255.0,
    radius: 145,
  });

  // 9) SOARING WHITE COASTAL SEAGULLS ABOVE THE HARBOR (Full Sculpted 3D Anatomy)
  const harborSeagullsGroup = new THREE.Group();
  const seagullMantleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.55 });
  const seagullTipMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
  const seagullBeakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
  disposableMaterials.push(seagullMantleMat, seagullTipMat, seagullBeakMat);

  const gullTorsoGeo = new THREE.ConeGeometry(0.14, 0.66, 6);
  gullTorsoGeo.rotateX(Math.PI / 2);
  const gullBreastGeo = new THREE.SphereGeometry(0.13, 6, 5);
  gullBreastGeo.scale(0.95, 0.85, 1.35);
  gullBreastGeo.translate(0, -0.02, 0.12);
  const gullHeadGeo = new THREE.SphereGeometry(0.095, 6, 5);
  gullHeadGeo.translate(0, 0.05, 0.35);
  const gullBeakGeo = new THREE.ConeGeometry(0.032, 0.16, 5);
  gullBeakGeo.rotateX(Math.PI / 2);
  gullBeakGeo.translate(0, 0.04, 0.47);
  const gullTailGeo = new THREE.ConeGeometry(0.15, 0.30, 5);
  gullTailGeo.rotateX(-Math.PI / 2);
  gullTailGeo.scale(1.2, 0.22, 1.0);
  gullTailGeo.translate(0, 0.01, -0.40);
  const seagullWingInnerGeo = new THREE.BoxGeometry(0.48, 0.032, 0.22);
  const seagullWingOuterGeo = new THREE.BoxGeometry(0.44, 0.024, 0.16);
  disposableGeometries.push(
    gullTorsoGeo,
    gullBreastGeo,
    gullHeadGeo,
    gullBeakGeo,
    gullTailGeo,
    seagullWingInnerGeo,
    seagullWingOuterGeo
  );

  for (let g = 0; g < 10; g++) {
    const gull = new THREE.Group();
    const torso = new THREE.Mesh(gullTorsoGeo, seagullMat);
    const breast = new THREE.Mesh(gullBreastGeo, seagullMat);
    const head = new THREE.Mesh(gullHeadGeo, seagullMat);
    const beak = new THREE.Mesh(gullBeakGeo, seagullBeakMat);
    const tail = new THREE.Mesh(gullTailGeo, seagullMat);

    const leftWingPivot = new THREE.Group();
    leftWingPivot.position.set(-0.09, 0.02, 0.04);
    const lwInner = new THREE.Mesh(seagullWingInnerGeo, seagullMantleMat);
    lwInner.position.set(-0.22, 0, 0);
    const lwOuter = new THREE.Mesh(seagullWingOuterGeo, seagullTipMat);
    lwOuter.position.set(-0.62, 0.01, -0.03);
    lwOuter.rotation.y = 0.14;
    lwOuter.rotation.z = 0.08;
    leftWingPivot.add(lwInner, lwOuter);

    const rightWingPivot = new THREE.Group();
    rightWingPivot.position.set(0.09, 0.02, 0.04);
    const rwInner = new THREE.Mesh(seagullWingInnerGeo, seagullMantleMat);
    rwInner.position.set(0.22, 0, 0);
    const rwOuter = new THREE.Mesh(seagullWingOuterGeo, seagullTipMat);
    rwOuter.position.set(0.62, 0.01, -0.03);
    rwOuter.rotation.y = -0.14;
    rwOuter.rotation.z = -0.08;
    rightWingPivot.add(rwInner, rwOuter);

    gull.add(torso, breast, head, beak, tail, leftWingPivot, rightWingPivot);
    gull.userData = {
      orbitRadius: 18 + (g % 4) * 9,
      orbitSpeed: 0.22 + (g % 3) * 0.05,
      phase: (g / 10) * Math.PI * 2,
      altitude: 19 + (g % 4) * 3.5,
      leftWingPivot,
      rightWingPivot,
    };
    harborSeagullsGroup.add(gull);
  }
  scene.add(harborSeagullsGroup);

  const updateHarbor = (elapsedTime: number, playerX: number, playerZ: number) => {
    if (harborGroup.visible) {
      lighthouseBeaconGroup.rotation.y = elapsedTime * 0.65;
      for (let m = 0; m < merchantArmPivots.length; m++) {
        const armPivot = merchantArmPivots[m];
        armPivot.rotation.x = -0.55 + Math.sin(elapsedTime * 3.2 + m * 1.3) * 0.35;
        armPivot.rotation.z = -0.22 + Math.cos(elapsedTime * 2.4 + m) * 0.12;
      }
    }
    const nearHarborGulls = isWithinViewDistance(272, 252, playerX, playerZ, 65, 180);
    harborSeagullsGroup.visible = nearHarborGulls;
    if (nearHarborGulls) {
      const gulls = harborSeagullsGroup.children;
      for (let g = 0; g < gulls.length; g++) {
        const gull = gulls[g];
        const ud = gull.userData;
        const ang = elapsedTime * ud.orbitSpeed + ud.phase;
        const gx = 272 + Math.cos(ang) * ud.orbitRadius;
        const gz = 252 + Math.sin(ang) * ud.orbitRadius;
        gull.position.set(gx, ud.altitude + Math.sin(elapsedTime * 1.2 + ud.phase) * 1.4, gz);
        gull.rotation.order = 'YXZ';
        gull.rotation.y = Math.atan2(-Math.sin(ang), Math.cos(ang));
        gull.rotation.z = -0.16;
        const flap = Math.sin(elapsedTime * 6.0 + ud.phase * 2) * 0.42;
        if (ud.leftWingPivot && ud.rightWingPivot) {
          ud.leftWingPivot.rotation.z = 0.08 + flap;
          ud.rightWingPivot.rotation.z = -0.08 - flap;
        }
      }
    }
  };

  return {
    harborGroup,
    lighthouseBeaconGroup,
    harborSeagullsGroup,
    updateHarbor,
  };
}
// #endregion
