// ============================================================================
// MODULE: World / Models / Volcano Sanctum & Floating Blooming Islands (SRP)
// DESIGN: Procedural 3D landmark builders for the Western Volcano Sanctum
//         (lair of the Mystical CatLion) and High-Altitude Eastern Floating
//         Blooming Sky Islands with Central Sky-Waterfall & Spiraling Mini-Islands.
// ============================================================================

import * as THREE from 'three';
import {
  VOLCANO_SANCTUM_POS,
  FLOATING_BLOOMING_ISLANDS,
  FLOATING_ISLAND_STAIR_POS,
  FLOATING_WATERFALL_STEP_ISLANDS,
  SKY_WIND_GEYSERS,
  floatingBloomingIslandHeightAt,
  groundHeightAt,
  isVolcanoBossArenaLocked,
  isWithinViewDistance,
  VIEW_DISTANCE,
} from '../terrainMath';
import { attachWindSwayShader, perturbGeometryVertices } from '../builders/shaderAndMaterialBuilders';
import type { IWorldModelBuildContext } from './types';

export interface IVolcanoAndFloatingIslandsResult {
  readonly volcanoGroup: THREE.Group;
  readonly floatingIslandsGroup: THREE.Group;
  readonly updateVolcanoAndFloatingIslands: (
    elapsedTime: number,
    playerX: number,
    playerZ: number
  ) => void;
}

/**
 * Summary: Constructs the upgraded Western Volcano Sanctum (with exterior lava rivers,
 *          twin portal magma waterfalls, billowing volcanic smoke & ember plume,
 *          subterranean stalactite magma chamber, and Mystical CatLion Sun-Throne)
 *          and the High-Altitude Floating Blooming Sky Islands (y=68m..71m) entered via
 *          a 65-meter central Sky-Waterfall encircled by 45 spiraling mini-islands.
 */
export function buildVolcanoAndFloatingIslandsModels(
  ctx: IWorldModelBuildContext
): IVolcanoAndFloatingIslandsResult {
  const {
    scene,
    textures,
    isSoftwareGl,
    disposableGeometries,
    disposableMaterials,
    swayMaterials,
    distanceCulledObjects,
  } = ctx;

  // ==========================================================================
  // PART 1: WESTERN VOLCANO SANCTUM (MYSTICAL CAT-LION LAIR)
  // ==========================================================================
  const volcanoGroup = new THREE.Group();
  volcanoGroup.position.set(
    VOLCANO_SANCTUM_POS.x,
    VOLCANO_SANCTUM_POS.floorY,
    VOLCANO_SANCTUM_POS.z
  );

  const basaltMat = new THREE.MeshStandardMaterial({
    color: 0x221c1a,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.18,
    roughness: 0.9,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
  const obsidianMat = new THREE.MeshStandardMaterial({
    color: 0x141013,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.1,
    roughness: 0.32,
    metalness: 0.38,
    side: THREE.DoubleSide,
  });
  const magmaMat = new THREE.MeshStandardMaterial({
    color: 0xff5500,
    emissive: 0xff3300,
    emissiveIntensity: 2.35,
    roughness: 0.22,
    metalness: 0.05,
  });
  const magmaCrystalMat = new THREE.MeshStandardMaterial({
    color: 0xffb833,
    emissive: 0xff4800,
    emissiveIntensity: 2.8,
    roughness: 0.18,
    metalness: 0.18,
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xe5b842,
    emissive: 0x5c3804,
    emissiveIntensity: 0.35,
    roughness: 0.26,
    metalness: 0.86,
  });
  const volcanicSmokeMat = new THREE.MeshStandardMaterial({
    color: 0x2a2321,
    emissive: 0x4a1604,
    emissiveIntensity: 0.45,
    roughness: 0.95,
    transparent: true,
    opacity: 0.72,
  });

  disposableMaterials.push(
    basaltMat,
    obsidianMat,
    magmaMat,
    magmaCrystalMat,
    goldTrimMat,
    volcanicSmokeMat
  );

  // 1A. Colossal Subterranean Boss Chamber Floor (60m diameter), Lava Moat, 3 Cardinal Baffled Corridors & Chicane Baffle Walls
  const chamberFloorGeo = new THREE.CylinderGeometry(24.2, 24.8, 0.6, 48);
  const lavaMoatGeo = new THREE.RingGeometry(23.6, 30.2, 48);
  lavaMoatGeo.rotateX(-Math.PI / 2);
  const tunnelFloorGeo = new THREE.BoxGeometry(68.0, 0.6, 11.2);
  const pocketFloorGeo = new THREE.BoxGeometry(24.0, 0.6, 23.6);
  const baffleWallGeo = new THREE.BoxGeometry(5.0, 9.6, 11.6);
  const baffleTrimGeo = new THREE.BoxGeometry(5.25, 0.45, 11.85);
  const lockGateBarGeo = new THREE.CylinderGeometry(0.24, 0.24, 8.8, 8);
  const lockGateHeaderGeo = new THREE.BoxGeometry(1.1, 0.85, 10.4);
  const moatBridgeGeo = new THREE.BoxGeometry(7.2, 0.46, 5.2);
  const daisStep1Geo = new THREE.CylinderGeometry(6.4, 7.0, 0.24, 8);
  const daisStep2Geo = new THREE.CylinderGeometry(4.8, 5.4, 0.26, 8);
  const daisTrimRingGeo = new THREE.TorusGeometry(4.85, 0.16, 10, 28);
  daisTrimRingGeo.rotateX(Math.PI / 2);
  const sunHaloArchGeo = new THREE.TorusGeometry(4.2, 0.30, 10, 28, Math.PI * 1.25);
  const sunBladeGeo = new THREE.ConeGeometry(0.35, 2.4, 5);

  disposableGeometries.push(
    chamberFloorGeo,
    lavaMoatGeo,
    tunnelFloorGeo,
    pocketFloorGeo,
    baffleWallGeo,
    baffleTrimGeo,
    lockGateBarGeo,
    lockGateHeaderGeo,
    moatBridgeGeo,
    daisStep1Geo,
    daisStep2Geo,
    daisTrimRingGeo,
    sunHaloArchGeo,
    sunBladeGeo
  );

  const chamberFloor = new THREE.Mesh(chamberFloorGeo, obsidianMat);
  chamberFloor.position.set(0, -0.3, 0);
  chamberFloor.receiveShadow = !isSoftwareGl;
  volcanoGroup.add(chamberFloor);

  const lavaMoatMesh = new THREE.Mesh(lavaMoatGeo, magmaMat);
  lavaMoatMesh.position.set(0, -0.04, 0);
  volcanoGroup.add(lavaMoatMesh);

  // 4 Obsidian Bridges spanning the inner Lava Moat (East, North, South, West)
  for (const ang of [0, Math.PI * 0.5, -Math.PI * 0.5, Math.PI]) {
    const br = new THREE.Mesh(moatBridgeGeo, obsidianMat);
    br.position.set(Math.cos(ang) * 26.8, 0.06, Math.sin(ang) * 26.8);
    br.rotation.y = -ang;
    volcanoGroup.add(br);
  }

  // King CatLion Sun-Throne Dais at local (-1.0, 0, 0) -> world (-621, 3.2..3.65, 115)
  const daisStep1 = new THREE.Mesh(daisStep1Geo, obsidianMat);
  daisStep1.position.set(-1.0, 0.12, 0);
  daisStep1.receiveShadow = !isSoftwareGl;
  const daisStep2 = new THREE.Mesh(daisStep2Geo, obsidianMat);
  daisStep2.position.set(-1.0, 0.32, 0);
  daisStep2.receiveShadow = !isSoftwareGl;
  const daisTrim = new THREE.Mesh(daisTrimRingGeo, goldTrimMat);
  daisTrim.position.set(-1.0, 0.45, 0);
  volcanoGroup.add(daisStep1, daisStep2, daisTrim);

  // Grand Sun-Halo Arch & Radiating Flame Blades behind the CatLion Throne (local x = -4.6)
  const sunHaloGroup = new THREE.Group();
  sunHaloGroup.position.set(-4.6, 4.1, 0);
  sunHaloGroup.rotation.y = Math.PI / 2;
  const sunHaloArch = new THREE.Mesh(sunHaloArchGeo, goldTrimMat);
  sunHaloArch.rotation.z = -Math.PI * 0.125;
  sunHaloGroup.add(sunHaloArch);
  for (let b = 0; b < 7; b++) {
    const bAng = ((b / 6) - 0.5) * Math.PI * 0.92;
    const blade = new THREE.Mesh(sunBladeGeo, magmaCrystalMat);
    blade.position.set(Math.sin(bAng) * 5.0, Math.cos(bAng) * 5.0, 0);
    blade.rotation.z = -bAng;
    sunHaloGroup.add(blade);
  }
  volcanoGroup.add(sunHaloGroup);

  // 1B. Sculpted Vaulted Inner Sanctum Cathedral Dome (radius 30.2m, height 21.5m) with 3 open cardinal throats (East +X, North -Z, South +Z)
  const buildVolcanoChamberDomeGeo = (): THREE.BufferGeometry => {
    const azSegs = 56;
    const elSegs = 24;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const rx = 30.2;
    const rz = 30.2;
    const ry = 21.5;

    for (let ie = 0; ie <= elSegs; ie++) {
      const v = ie / elSegs;
      const phi = v * (Math.PI * 0.5);
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);
      for (let ia = 0; ia <= azSegs; ia++) {
        const u = ia / azSegs;
        const ang = u * Math.PI * 2;
        const cosA = Math.cos(ang);
        const sinA = Math.sin(ang);
        const crag = Math.sin(ang * 9.0 + phi * 5.0) * 0.75 * sinP;
        const x = cosA * (rx * cosP + crag);
        const y = -0.3 + Math.pow(sinP, 0.85) * ry;
        const z = sinA * (rz * cosP + crag);
        positions.push(x, y, z);
        uvs.push(u * 8.0, v * 4.0);
      }
    }

    const row = azSegs + 1;
    for (let ie = 0; ie < elSegs; ie++) {
      for (let ia = 0; ia < azSegs; ia++) {
        const a = ie * row + ia;
        const b = a + 1;
        const c = (ie + 1) * row + ia;
        const d = c + 1;
        const mx = (positions[a * 3] + positions[d * 3]) * 0.5;
        const my = (positions[a * 3 + 1] + positions[d * 3 + 1]) * 0.5;
        const mz = (positions[a * 3 + 2] + positions[d * 3 + 2]) * 0.5;
        // Leave East (+X), North (-Z), and South (+Z) entrance throats open
        const inEastThroat = mx > 24.0 && Math.abs(mz) < 5.6 && my < 9.5;
        const inNorthThroat = mz < -24.0 && Math.abs(mx) < 5.6 && my < 9.5;
        const inSouthThroat = mz > 24.0 && Math.abs(mx) < 5.6 && my < 9.5;
        if (inEastThroat || inNorthThroat || inSouthThroat) {
          continue;
        }
        indices.push(a, b, d, a, d, c);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };

  // 1C. Sculpted Obsidian Cardinal Corridor Arch Shell (local x: +27.5 .. +95.5, clear width 10.4m, widened to 22.8m in Chicane Baffle Pocket r = 45..69m, height 9.6m)
  const buildVolcanoTunnelShellGeo = (): THREE.BufferGeometry => {
    const uSegs = 32;
    const vSegs = 36;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let iv = 0; iv <= vSegs; iv++) {
      const v = iv / vSegs;
      const lx = 27.5 + v * 68.0;
      const inPocket = lx >= 44.5 && lx <= 69.5;
      const pocketBlend = inPocket
        ? Math.sin(Math.max(0, Math.min(1, (lx - 44.5) / 25.0)) * Math.PI)
        : 0;
      const baseHalfW = 5.25 + (pocketBlend > 0.12 ? 6.35 : 0.0);
      for (let iu = 0; iu <= uSegs; iu++) {
        const u = iu / uSegs;
        const theta = u * Math.PI;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        const rz = baseHalfW + Math.sin(lx * 0.35) * 0.18;
        const ry = 9.6;
        const z = -cosT * rz;
        const y = -0.25 + Math.pow(sinT, 0.85) * ry;
        positions.push(lx, y, z);
        uvs.push(u * 4.0, v * 8.0);
      }
    }
    const row = uSegs + 1;
    for (let iv = 0; iv < vSegs; iv++) {
      for (let iu = 0; iu < uSegs; iu++) {
        const a = iv * row + iu;
        const b = a + 1;
        const c = (iv + 1) * row + iu;
        const d = c + 1;
        indices.push(a, b, d, a, d, c);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };

  const chamberDomeGeo = buildVolcanoChamberDomeGeo();
  const tunnelShellGeo = buildVolcanoTunnelShellGeo();
  disposableGeometries.push(chamberDomeGeo, tunnelShellGeo);

  const chamberDomeMesh = new THREE.Mesh(chamberDomeGeo, basaltMat);
  volcanoGroup.add(chamberDomeMesh);

  // 1D. Hanging Ceiling Stalactites, Inner Magma Falls, 3 Cardinal Corridors, Chicane Baffle Walls & Dynamic Boss Lock Gates
  const portalPillarGeo = new THREE.CylinderGeometry(1.55, 2.1, 13.6, 8);
  const portalLintelGeo = new THREE.BoxGeometry(3.8, 2.6, 15.2);
  const crystalClusterGeo = new THREE.OctahedronGeometry(0.8, 0);
  const stalactiteGeo = new THREE.ConeGeometry(0.72, 4.2, 7);
  stalactiteGeo.rotateX(Math.PI);
  const lavaFallSheetGeo = new THREE.CylinderGeometry(0.75, 1.25, 14.5, 12);
  const lavaBasinGeo = new THREE.CylinderGeometry(3.6, 4.0, 0.35, 20);
  const calderaPoolGeo = new THREE.CylinderGeometry(31.5, 28.5, 0.6, 36);
  const calderaSpireGeo = new THREE.ConeGeometry(3.2, 11.2, 7);
  const lavaRiverSegGeo = new THREE.BoxGeometry(5.6, 0.32, 2.8);
  const smokePuffGeo = new THREE.DodecahedronGeometry(3.8, 1);

  disposableGeometries.push(
    portalPillarGeo,
    portalLintelGeo,
    crystalClusterGeo,
    stalactiteGeo,
    lavaFallSheetGeo,
    lavaBasinGeo,
    calderaPoolGeo,
    calderaSpireGeo,
    lavaRiverSegGeo,
    smokePuffGeo
  );

  // Glowing Magma Crystal Pillars & Throne Accents inside the Sanctum Chamber
  const sanctumCrystals: THREE.Mesh[] = [];
  const bossArenaLockGates: THREE.Group[] = [];

  // Build all 3 Cardinal Corridors: East (rotY = 0), North (rotY = +PI/2), South (rotY = -PI/2)
  for (const corridorRotY of [0, Math.PI * 0.5, -Math.PI * 0.5]) {
    const corrGroup = new THREE.Group();
    corrGroup.rotation.y = corridorRotY;

    const tFloor = new THREE.Mesh(tunnelFloorGeo, obsidianMat);
    tFloor.position.set(61.5, -0.28, 0);
    tFloor.receiveShadow = !isSoftwareGl;
    corrGroup.add(tFloor);

    const pFloor = new THREE.Mesh(pocketFloorGeo, obsidianMat);
    pFloor.position.set(57.0, -0.27, 0);
    pFloor.receiveShadow = !isSoftwareGl;
    corrGroup.add(pFloor);

    const tShell = new THREE.Mesh(tunnelShellGeo, basaltMat);
    corrGroup.add(tShell);

    // Solid Obsidian Chicane Baffle Wall at r = 57.0m (blocks straight line-of-sight from outside while leaving 5.4m side passages on left & right!)
    const baffleWall = new THREE.Mesh(baffleWallGeo, obsidianMat);
    baffleWall.position.set(57.0, 4.6, 0);
    baffleWall.castShadow = !isSoftwareGl;
    baffleWall.receiveShadow = !isSoftwareGl;
    corrGroup.add(baffleWall);

    const baffleLowerTrim = new THREE.Mesh(baffleTrimGeo, goldTrimMat);
    baffleLowerTrim.position.set(57.0, 0.85, 0);
    const baffleUpperTrim = new THREE.Mesh(baffleTrimGeo, goldTrimMat);
    baffleUpperTrim.position.set(57.0, 7.65, 0);
    corrGroup.add(baffleLowerTrim, baffleUpperTrim);

    // Glowing Magma Crystals on both faces of the Chicane Baffle Wall to guide the hunter around the turn
    for (const faceSign of [-1, 1] as const) {
      const baffleCrystal = new THREE.Mesh(crystalClusterGeo, magmaCrystalMat);
      baffleCrystal.scale.set(1.25, 2.2, 0.65);
      baffleCrystal.position.set(57.0 + faceSign * 2.65, 4.2, 0);
      corrGroup.add(baffleCrystal);
      sanctumCrystals.push(baffleCrystal);
    }

    // Dynamic Obsidian & Magma Portcullis Lock Gate at the inner chamber threshold (r = 28.6m)
    const lockGateGroup = new THREE.Group();
    lockGateGroup.position.set(28.6, 9.2, 0); // Starts raised open (y = 9.2m) until player enters the Boss Arena!
    const gateHeader = new THREE.Mesh(lockGateHeaderGeo, goldTrimMat);
    gateHeader.position.set(0, 8.6, 0);
    lockGateGroup.add(gateHeader);
    for (let barIdx = -4; barIdx <= 4; barIdx++) {
      const bar = new THREE.Mesh(
        lockGateBarGeo,
        barIdx % 2 === 0 ? obsidianMat : magmaCrystalMat
      );
      bar.position.set(0, 4.4, barIdx * 1.08);
      lockGateGroup.add(bar);
    }
    corrGroup.add(lockGateGroup);
    bossArenaLockGates.push(lockGateGroup);

    // Outer Portal Pylons, Lintel, Crest Crystal & Twin Magma Waterfalls at r = 94.0m
    for (const side of [-1, 1] as const) {
      const pillar = new THREE.Mesh(portalPillarGeo, obsidianMat);
      pillar.position.set(94.0, 6.2, side * 6.0);
      pillar.castShadow = !isSoftwareGl;
      pillar.receiveShadow = !isSoftwareGl;
      corrGroup.add(pillar);

      const topCrystal = new THREE.Mesh(crystalClusterGeo, magmaCrystalMat);
      topCrystal.scale.set(1.45, 2.7, 1.45);
      topCrystal.position.set(94.0, 13.6, side * 6.0);
      corrGroup.add(topCrystal);

      const extLavaFall = new THREE.Mesh(lavaFallSheetGeo, magmaMat);
      extLavaFall.scale.set(1.2, 1.3, 1.2);
      extLavaFall.position.set(94.2, 7.2, side * 9.5);
      corrGroup.add(extLavaFall);

      const extLavaBasin = new THREE.Mesh(lavaBasinGeo, magmaMat);
      extLavaBasin.position.set(94.8, 0.08, side * 9.5);
      corrGroup.add(extLavaBasin);

      for (const tx of [34.0, 42.0, 72.0, 82.0]) {
        const rib = new THREE.Mesh(portalPillarGeo, obsidianMat);
        rib.scale.set(0.58, 0.68, 0.58);
        rib.position.set(tx, 4.1, side * 4.95);
        corrGroup.add(rib);
      }

      for (const ox of [101.5, 108.5]) {
        const obelisk = new THREE.Mesh(portalPillarGeo, basaltMat);
        obelisk.scale.set(0.68, 0.58, 0.68);
        obelisk.position.set(ox, 3.2, side * 6.6);
        corrGroup.add(obelisk);

        const brazierCrystal = new THREE.Mesh(crystalClusterGeo, magmaCrystalMat);
        brazierCrystal.scale.set(0.95, 1.75, 0.95);
        brazierCrystal.position.set(ox, 7.1, side * 6.6);
        corrGroup.add(brazierCrystal);
      }
    }

    const portalLintel = new THREE.Mesh(portalLintelGeo, obsidianMat);
    portalLintel.position.set(94.0, 10.8, 0);
    portalLintel.castShadow = !isSoftwareGl;
    corrGroup.add(portalLintel);

    const crestCrystal = new THREE.Mesh(crystalClusterGeo, magmaCrystalMat);
    crestCrystal.scale.set(1.9, 3.4, 1.9);
    crestCrystal.position.set(94.2, 14.4, 0);
    corrGroup.add(crestCrystal);
    sanctumCrystals.push(crestCrystal);

    volcanoGroup.add(corrGroup);
  }

  // 20 Hanging Volcanic Stalactites with glowing magma tips inside the Colossal Sanctum Ceiling Dome
  for (let s = 0; s < 20; s++) {
    const sAng = (s / 20) * Math.PI * 2 + 0.2;
    const sRad = 9.5 + (s % 3) * 5.8;
    const sx = Math.cos(sAng) * sRad;
    const sz = Math.sin(sAng) * sRad;
    const ceilY = 20.5 - 3.2 * Math.pow(sRad / 30.0, 2);
    const stal = new THREE.Mesh(stalactiteGeo, basaltMat);
    stal.position.set(sx, ceilY - 1.6, sz);
    stal.scale.set(0.95 + (s % 3) * 0.25, 0.9 + (s % 4) * 0.25, 0.95 + (s % 3) * 0.25);
    volcanoGroup.add(stal);

    if (s % 2 === 0) {
      const tip = new THREE.Mesh(crystalClusterGeo, magmaCrystalMat);
      tip.scale.set(0.42, 0.82, 0.42);
      tip.position.set(sx, ceilY - 3.5, sz);
      volcanoGroup.add(tip);
    }
  }

  // 4 Inner Wall Magma Cascades pouring down into the circular Lava Moat (r = 26.8m)
  for (const wAng of [Math.PI * 0.25, -Math.PI * 0.25, Math.PI * 0.75, -Math.PI * 0.75]) {
    const fall = new THREE.Mesh(lavaFallSheetGeo, magmaMat);
    fall.position.set(Math.cos(wAng) * 26.8, 6.8, Math.sin(wAng) * 26.8);
    volcanoGroup.add(fall);
  }

  // Heart of the Volcano levitating crystal inside the Sun-Throne Halo
  const heartCrystal = new THREE.Mesh(crystalClusterGeo, magmaCrystalMat);
  heartCrystal.scale.set(1.55, 2.6, 1.55);
  heartCrystal.position.set(-4.4, 4.6, 0);
  volcanoGroup.add(heartCrystal);
  sanctumCrystals.push(heartCrystal);

  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + 0.38;
    if (
      Math.abs(Math.sin(ang)) < 0.28 ||
      Math.abs(Math.cos(ang)) < 0.28
    ) {
      continue;
    }
    const cx = Math.cos(ang) * 21.5;
    const cz = Math.sin(ang) * 21.5;
    const col = new THREE.Mesh(portalPillarGeo, obsidianMat);
    col.scale.set(0.85, 1.25, 0.85);
    col.position.set(cx, 7.2, cz);
    volcanoGroup.add(col);

    const crys = new THREE.Mesh(crystalClusterGeo, magmaCrystalMat);
    crys.scale.set(1.25, 2.7, 1.25);
    crys.position.set(cx * 0.90, 1.4, cz * 0.90);
    crys.rotation.set(0.2 * Math.sin(i), i, 0.15 * Math.cos(i));
    volcanoGroup.add(crys);
    sanctumCrystals.push(crys);
  }

  // 4 Exterior Molten Lava Rivers cascading down the Volcano flanks between the 3 cardinal portals
  for (const rAng of [Math.PI * 0.25, Math.PI * 0.75, -Math.PI * 0.75, -Math.PI * 0.25]) {
    const cosR = Math.cos(rAng);
    const sinR = Math.sin(rAng);
    for (let step = 0; step < 12; step++) {
      const rad = 35.0 + step * 5.4;
      const wx = VOLCANO_SANCTUM_POS.x + cosR * rad;
      const wz = VOLCANO_SANCTUM_POS.z + sinR * rad;
      const wy = groundHeightAt(wx, wz) - VOLCANO_SANCTUM_POS.floorY;
      const nextRad = rad + 5.4;
      const nextWy =
        groundHeightAt(
          VOLCANO_SANCTUM_POS.x + cosR * nextRad,
          VOLCANO_SANCTUM_POS.z + sinR * nextRad
        ) - VOLCANO_SANCTUM_POS.floorY;
      const seg = new THREE.Mesh(lavaRiverSegGeo, magmaMat);
      seg.position.set(cosR * (rad + 2.5), (wy + nextWy) * 0.5 + 0.08, sinR * (rad + 2.5));
      seg.rotation.y = -rAng;
      seg.rotation.z = Math.atan2(nextWy - wy, 5.4);
      volcanoGroup.add(seg);
    }
    // Base Lava Pool at the foot of each lava river
    const pool = new THREE.Mesh(lavaBasinGeo, magmaMat);
    pool.scale.set(1.6, 1.0, 1.6);
    pool.position.set(cosR * 102.0, 0.12, sinR * 102.0);
    volcanoGroup.add(pool);
  }

  // Summit Caldera Molten Lava Lake & 16 Jagged Basalt Crater Rim Spires high above the chamber
  const calderaLocalY = VOLCANO_SANCTUM_POS.craterRimY - VOLCANO_SANCTUM_POS.floorY - 9.5;
  const calderaPool = new THREE.Mesh(calderaPoolGeo, magmaMat);
  calderaPool.position.set(0, calderaLocalY, 0);
  volcanoGroup.add(calderaPool);

  for (let s = 0; s < 16; s++) {
    const sAng = (s / 16) * Math.PI * 2;
    const sRad = 33.5 + (s % 2) * 2.4;
    const spire = new THREE.Mesh(calderaSpireGeo, basaltMat);
    spire.position.set(
      Math.cos(sAng) * sRad,
      calderaLocalY + 6.2 + (s % 3) * 1.4,
      Math.sin(sAng) * sRad
    );
    spire.rotation.z = -Math.cos(sAng) * 0.22;
    spire.rotation.x = Math.sin(sAng) * 0.22;
    volcanoGroup.add(spire);
  }

  // Animated Billowing Volcanic Smoke Plume & Rising Glowing Embers above the Summit Caldera
  const smokePuffs: THREE.Mesh[] = [];
  const risingEmbers: THREE.Mesh[] = [];
  for (let p = 0; p < 16; p++) {
    const puff = new THREE.Mesh(smokePuffGeo, volcanicSmokeMat);
    const t = p / 16;
    puff.position.set(
      Math.cos(p * 1.7) * (3.5 + t * 12.5),
      calderaLocalY + 4.5 + t * 42.0,
      Math.sin(p * 1.7) * (3.5 + t * 12.5)
    );
    puff.scale.setScalar(0.95 + t * 2.4);
    volcanoGroup.add(puff);
    smokePuffs.push(puff);
  }
  for (let e = 0; e < 20; e++) {
    const ember = new THREE.Mesh(crystalClusterGeo, magmaCrystalMat);
    const t = e / 20;
    ember.scale.setScalar(0.4 + (e % 3) * 0.2);
    ember.position.set(
      Math.cos(e * 2.3) * (4.0 + t * 12.0),
      calderaLocalY + 2.5 + t * 38.0,
      Math.sin(e * 2.3) * (4.0 + t * 12.0)
    );
    volcanoGroup.add(ember);
    risingEmbers.push(ember);
  }

  // Outer Western Volcanic Badlands: jagged basalt monoliths, obsidian crags, and glowing magma vents (r = 112m..215m)
  const badlandsCragGeo = new THREE.ConeGeometry(2.8, 9.2, 6);
  perturbGeometryVertices(badlandsCragGeo, 0.38, 1.4);
  const badlandsLavaPoolGeo = new THREE.CylinderGeometry(3.0, 3.5, 0.22, 12);
  disposableGeometries.push(badlandsCragGeo, badlandsLavaPoolGeo);

  for (let b = 0; b < 28; b++) {
    const bAng = (b / 28) * Math.PI * 2 + (b % 3) * 0.14;
    // Leave the 3 cardinal entrance approach corridors clear (East 0, North -PI/2, South +PI/2)
    if (
      Math.abs(Math.sin(bAng)) < 0.24 ||
      Math.abs(Math.cos(bAng)) < 0.24
    ) {
      continue;
    }
    const bRad = 112.0 + ((b * 37) % 98);
    const wx = VOLCANO_SANCTUM_POS.x + Math.cos(bAng) * bRad;
    const wz = VOLCANO_SANCTUM_POS.z + Math.sin(bAng) * bRad;
    const wy = groundHeightAt(wx, wz);
    const lx = wx - VOLCANO_SANCTUM_POS.x;
    const lz = wz - VOLCANO_SANCTUM_POS.z;
    const ly = wy - VOLCANO_SANCTUM_POS.floorY;

    const crag = new THREE.Mesh(badlandsCragGeo, b % 2 === 0 ? basaltMat : obsidianMat);
    const cragScale = 0.8 + (b % 4) * 0.34;
    crag.scale.set(cragScale, cragScale * (0.85 + (b % 3) * 0.28), cragScale);
    crag.position.set(lx, ly + 2.6 * cragScale, lz);
    crag.rotation.set(((b % 5) - 2) * 0.08, b * 1.1, (((b + 2) % 5) - 2) * 0.08);
    crag.castShadow = !isSoftwareGl;
    crag.receiveShadow = !isSoftwareGl;
    volcanoGroup.add(crag);

    if (b % 3 === 0) {
      const crystal = new THREE.Mesh(crystalClusterGeo, magmaCrystalMat);
      crystal.scale.setScalar(1.0 + (b % 3) * 0.25);
      crystal.position.set(lx + Math.cos(bAng + 0.6) * 2.6, ly + 0.55, lz + Math.sin(bAng + 0.6) * 2.6);
      volcanoGroup.add(crystal);
    }
    if (b % 4 === 0 && bRad < 195.0) {
      const pool = new THREE.Mesh(badlandsLavaPoolGeo, magmaCrystalMat);
      pool.position.set(lx - Math.cos(bAng) * 4.0, ly + 0.06, lz - Math.sin(bAng) * 4.0);
      volcanoGroup.add(pool);
    }
  }

  let volcanoLight: THREE.PointLight | null = null;
  if (!isSoftwareGl) {
    volcanoLight = new THREE.PointLight(0xff5511, 3.6, 58.0, 1.3);
    volcanoLight.position.set(0, 10.5, 0);
    volcanoGroup.add(volcanoLight);
  }

  scene.add(volcanoGroup);
  distanceCulledObjects.push({
    obj: volcanoGroup,
    cx: VOLCANO_SANCTUM_POS.x,
    cz: VOLCANO_SANCTUM_POS.z,
    radius: 250,
  });

  // ==========================================================================
  // PART 2: HIGH-ALTITUDE FLOATING BLOOMING SKY ISLANDS & SPIRAL WATERFALL
  // ==========================================================================
  const floatingIslandsGroup = new THREE.Group();

  const islandGrassMat = new THREE.MeshStandardMaterial({
    color: 0x4ea854,
    map: textures.terrainAlbedo,
    bumpMap: textures.terrainBump,
    bumpScale: 0.06,
    roughness: 0.82,
  });
  const islandCliffMat = new THREE.MeshStandardMaterial({
    color: 0x6e6a63,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.12,
    roughness: 0.86,
  });
  const blossomCanopyPinkMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    bumpMap: textures.foliageBump,
    bumpScale: 0.05,
    roughness: 0.52,
  });
  const blossomCanopyRoseMat = new THREE.MeshStandardMaterial({
    color: 0xfb7185,
    bumpMap: textures.foliageBump,
    bumpScale: 0.05,
    roughness: 0.52,
  });
  const blossomCanopyWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xfde2e4,
    bumpMap: textures.foliageBump,
    bumpScale: 0.04,
    roughness: 0.48,
  });
  const vineFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x3b8a44,
    roughness: 0.68,
  });
  const skyCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 2.2,
    roughness: 0.18,
  });
  const marbleArchMat = new THREE.MeshStandardMaterial({
    color: 0xf1ece1,
    roughness: 0.42,
    metalness: 0.08,
  });
  const flowerGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.5,
    roughness: 0.38,
  });
  const waterfallCoreMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.85,
    roughness: 0.12,
    metalness: 0.1,
    transparent: true,
    opacity: 0.84,
    side: THREE.DoubleSide,
  });
  const waterfallFoamMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x7dd3fc,
    emissiveIntensity: 0.65,
    roughness: 0.25,
    transparent: true,
    opacity: 0.68,
    side: THREE.DoubleSide,
  });

  attachWindSwayShader(blossomCanopyPinkMat, 0.016, 1.4, swayMaterials);
  attachWindSwayShader(blossomCanopyRoseMat, 0.018, 1.5, swayMaterials);
  attachWindSwayShader(blossomCanopyWhiteMat, 0.015, 1.35, swayMaterials);
  attachWindSwayShader(vineFoliageMat, 0.02, 1.6, swayMaterials);

  disposableMaterials.push(
    islandGrassMat,
    islandCliffMat,
    blossomCanopyPinkMat,
    blossomCanopyRoseMat,
    blossomCanopyWhiteMat,
    vineFoliageMat,
    skyCrystalMat,
    marbleArchMat,
    flowerGoldMat,
    waterfallCoreMat,
    waterfallFoamMat
  );

  const treeTrunkGeo = new THREE.CylinderGeometry(0.24, 0.46, 5.4, 8);
  treeTrunkGeo.translate(0, 2.7, 0);
  const treeCrownGeo = new THREE.IcosahedronGeometry(2.85, 2);
  perturbGeometryVertices(treeCrownGeo, 0.2, 1.3);
  treeCrownGeo.scale(1.3, 0.78, 1.3);
  const flowerPatchGeo = new THREE.CylinderGeometry(0.65, 0.75, 0.18, 7);
  const hangingVineGeo = new THREE.ConeGeometry(0.32, 4.8, 6);
  hangingVineGeo.rotateX(Math.PI);
  const undersideCrystalGeo = new THREE.OctahedronGeometry(1.15, 0);
  undersideCrystalGeo.scale(0.85, 2.35, 0.85);

  disposableGeometries.push(
    treeTrunkGeo,
    treeCrownGeo,
    flowerPatchGeo,
    hangingVineGeo,
    undersideCrystalGeo
  );

  // Build each of the 3 High-Altitude Large Floating Blooming Sky Islands (y = 68m..71m)
  const floatingCrystals: THREE.Mesh[] = [];
  for (let idx = 0; idx < FLOATING_BLOOMING_ISLANDS.length; idx++) {
    const isl = FLOATING_BLOOMING_ISLANDS[idx];
    const islGroup = new THREE.Group();
    islGroup.position.set(isl.x, isl.deckY, isl.z);

    // 1. Lush Top Blooming Turf Deck & Deep Craggy Floating Island Underside
    const topDeckGeo = new THREE.CylinderGeometry(isl.radius, isl.radius * 0.95, 1.5, 36);
    const rimRockGeo = new THREE.CylinderGeometry(isl.radius * 0.96, isl.radius * 0.78, 4.6, 28);
    const underConeGeo = new THREE.ConeGeometry(isl.radius * 0.76, isl.radius * 0.82, 18);
    underConeGeo.rotateX(Math.PI);
    perturbGeometryVertices(underConeGeo, 0.95, 0.35);
    disposableGeometries.push(topDeckGeo, rimRockGeo, underConeGeo);

    const topDeck = new THREE.Mesh(topDeckGeo, islandGrassMat);
    topDeck.position.set(0, -0.72, 0);
    topDeck.receiveShadow = !isSoftwareGl;
    islGroup.add(topDeck);

    const rimRock = new THREE.Mesh(rimRockGeo, islandCliffMat);
    rimRock.position.set(0, -3.4, 0);
    rimRock.castShadow = !isSoftwareGl;
    rimRock.receiveShadow = !isSoftwareGl;
    islGroup.add(rimRock);

    const underCone = new THREE.Mesh(underConeGeo, islandCliffMat);
    underCone.position.set(0, -5.2 - isl.radius * 0.38, 0);
    underCone.castShadow = !isSoftwareGl;
    islGroup.add(underCone);

    // 2. Glowing Sky-Levitation Crystals embedded in the underside & Hanging Blossom Vines around the rim
    const vineCount = Math.round(isl.radius * 0.9);
    for (let v = 0; v < vineCount; v++) {
      const ang = (v / vineCount) * Math.PI * 2;
      const vx = Math.cos(ang) * (isl.radius - 0.35);
      const vz = Math.sin(ang) * (isl.radius - 0.35);
      const vine = new THREE.Mesh(
        hangingVineGeo,
        v % 3 === 0 ? blossomCanopyPinkMat : vineFoliageMat
      );
      vine.position.set(vx, -2.4 - (v % 3) * 0.6, vz);
      vine.scale.set(1.0, 0.85 + (v % 3) * 0.35, 1.0);
      islGroup.add(vine);

      if (v % 3 === 0) {
        const uCrys = new THREE.Mesh(undersideCrystalGeo, skyCrystalMat);
        const crRad = isl.radius * 0.48;
        uCrys.position.set(Math.cos(ang) * crRad, -7.2 - (v % 2) * 2.5, Math.sin(ang) * crRad);
        uCrys.rotation.set(Math.sin(ang) * 0.35, ang, -Math.cos(ang) * 0.35);
        islGroup.add(uCrys);
        floatingCrystals.push(uCrys);
      }
    }

    //Giant central underside apex levitation crystal
    const apexCrystal = new THREE.Mesh(undersideCrystalGeo, skyCrystalMat);
    apexCrystal.scale.set(1.8, 2.2, 1.8);
    apexCrystal.position.set(0, -5.5 - isl.radius * 0.78, 0);
    islGroup.add(apexCrystal);
    floatingCrystals.push(apexCrystal);

    // 3. Blooming Sakura Trees & Wildflower Meadows on the Island Deck
    const treeRingCount = idx === 0 ? 8 : 5;
    for (let t = 0; t < treeRingCount; t++) {
      const tAng = (t / treeRingCount) * Math.PI * 2 + 0.42;
      if (idx === 0 && (Math.abs(Math.cos(tAng) + 1) < 0.36 || Math.abs(Math.sin(tAng) + 1) < 0.24)) {
        continue;
      }
      const tRad = isl.radius * 0.72;
      const tx = Math.cos(tAng) * tRad;
      const tz = Math.sin(tAng) * tRad;

      const treeGroup = new THREE.Group();
      treeGroup.position.set(tx, 0, tz);
      const trunk = new THREE.Mesh(treeTrunkGeo, islandCliffMat);
      trunk.castShadow = !isSoftwareGl;
      treeGroup.add(trunk);

      const canopyMat =
        t % 3 === 0
          ? blossomCanopyPinkMat
          : t % 3 === 1
            ? blossomCanopyRoseMat
            : blossomCanopyWhiteMat;
      const mainCrown = new THREE.Mesh(treeCrownGeo, canopyMat);
      mainCrown.position.set(0, 5.8, 0);
      mainCrown.castShadow = !isSoftwareGl;
      const sideCrown = new THREE.Mesh(treeCrownGeo, canopyMat);
      sideCrown.scale.setScalar(0.75);
      sideCrown.position.set(1.4, 4.9, 0.8);
      treeGroup.add(mainCrown, sideCrown);
      islGroup.add(treeGroup);
    }

    // Carpet of blooming wildflower patches across the deck
    const flowerCount = idx === 0 ? 48 : 26;
    for (let f = 0; f < flowerCount; f++) {
      const fAng = f * 2.39996;
      const fRad = Math.sqrt((f + 0.5) / flowerCount) * (isl.radius - 2.4);
      const fx = Math.cos(fAng) * fRad;
      const fz = Math.sin(fAng) * fRad;
      const fMat =
        f % 4 === 0
          ? blossomCanopyPinkMat
          : f % 4 === 1
            ? blossomCanopyRoseMat
            : f % 4 === 2
              ? flowerGoldMat
              : blossomCanopyWhiteMat;
      const patch = new THREE.Mesh(flowerPatchGeo, fMat);
      patch.position.set(fx, 0.08, fz);
      patch.scale.set(0.85 + (f % 3) * 0.35, 1.0, 0.85 + ((f + 1) % 3) * 0.35);
      islGroup.add(patch);
    }

    floatingIslandsGroup.add(islGroup);
  }

  // 4. Centerpiece Floral Marble Sanctuary Arch & Celestial Star-Sanctuary Canopy Bed
  const mainIslX = FLOATING_BLOOMING_ISLANDS[0].x;
  const mainIslZ = FLOATING_BLOOMING_ISLANDS[0].z;
  const mainDeckY = FLOATING_BLOOMING_ISLANDS[0].deckY;
  const northIslX = FLOATING_BLOOMING_ISLANDS[1].x;
  const northIslZ = FLOATING_BLOOMING_ISLANDS[1].z;
  const northDeckY = FLOATING_BLOOMING_ISLANDS[1].deckY;
  const eastIslX = FLOATING_BLOOMING_ISLANDS[2].x;
  const eastIslZ = FLOATING_BLOOMING_ISLANDS[2].z;
  const eastDeckY = FLOATING_BLOOMING_ISLANDS[2].deckY;
  const archColumnGeo = new THREE.CylinderGeometry(0.42, 0.52, 5.6, 12);
  const archTorusGeo = new THREE.TorusGeometry(3.2, 0.42, 10, 24, Math.PI);
  const bedDaisGeo = new THREE.CylinderGeometry(2.6, 2.9, 0.36, 24);
  const bedFrameGeo = new THREE.BoxGeometry(2.4, 0.38, 3.1);
  const bedMattressGeo = new THREE.BoxGeometry(2.15, 0.26, 2.85);
  const bedPillowGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.85, 12);
  bedPillowGeo.rotateZ(Math.PI / 2);
  const fountainBasinGeo = new THREE.CylinderGeometry(3.4, 2.8, 0.75, 24);
  const fountainWaterGeo = new THREE.CylinderGeometry(3.1, 3.1, 0.16, 24);
  const gazeboDomeRingGeo = new THREE.TorusGeometry(4.2, 0.32, 10, 28);
  gazeboDomeRingGeo.rotateX(Math.PI / 2);

  disposableGeometries.push(
    archColumnGeo,
    archTorusGeo,
    bedDaisGeo,
    bedFrameGeo,
    bedMattressGeo,
    bedPillowGeo,
    fountainBasinGeo,
    fountainWaterGeo,
    gazeboDomeRingGeo
  );

  for (const side of [-1, 1] as const) {
    const col = new THREE.Mesh(archColumnGeo, marbleArchMat);
    col.position.set(mainIslX + side * 3.2, mainDeckY + 0.3 + 2.8, mainIslZ);
    col.castShadow = !isSoftwareGl;
    floatingIslandsGroup.add(col);
  }
  const archTop = new THREE.Mesh(archTorusGeo, marbleArchMat);
  archTop.position.set(mainIslX, mainDeckY + 0.3 + 5.6, mainIslZ);
  floatingIslandsGroup.add(archTop);

  // Celestial Star-Sanctuary Canopy Bed at (mainIslX, 68.35, -35.0)
  const bedDais = new THREE.Mesh(bedDaisGeo, marbleArchMat);
  bedDais.position.set(mainIslX, mainDeckY + 0.32, mainIslZ);
  floatingIslandsGroup.add(bedDais);

  const bedFrame = new THREE.Mesh(bedFrameGeo, flowerGoldMat);
  bedFrame.position.set(mainIslX, mainDeckY + 0.62, mainIslZ);
  floatingIslandsGroup.add(bedFrame);

  const bedMattress = new THREE.Mesh(bedMattressGeo, blossomCanopyWhiteMat);
  bedMattress.position.set(mainIslX, mainDeckY + 0.84, mainIslZ);
  floatingIslandsGroup.add(bedMattress);

  const bedPillow = new THREE.Mesh(bedPillowGeo, blossomCanopyPinkMat);
  bedPillow.position.set(mainIslX, mainDeckY + 1.05, mainIslZ - 1.05);
  floatingIslandsGroup.add(bedPillow);

  const sanctuaryStarCrystal = new THREE.Mesh(undersideCrystalGeo, skyCrystalMat);
  sanctuaryStarCrystal.scale.set(0.55, 0.85, 0.55);
  sanctuaryStarCrystal.position.set(mainIslX, mainDeckY + 4.4, mainIslZ);
  floatingIslandsGroup.add(sanctuaryStarCrystal);
  floatingCrystals.push(sanctuaryStarCrystal);

  // North Island Celestial Star-Fountain at (northIslX, 71.0, -85.0)
  const starFountainBasin = new THREE.Mesh(fountainBasinGeo, marbleArchMat);
  starFountainBasin.position.set(northIslX, northDeckY + 0.42, northIslZ);
  floatingIslandsGroup.add(starFountainBasin);

  const starFountainWater = new THREE.Mesh(fountainWaterGeo, waterfallCoreMat);
  starFountainWater.position.set(northIslX, northDeckY + 0.78, northIslZ);
  floatingIslandsGroup.add(starFountainWater);

  // East Island Golden Sun-Gazebo Belvedere at (eastIslX, 70.0, -18.0)
  for (let g = 0; g < 6; g++) {
    const gAng = (g / 6) * Math.PI * 2;
    const gCol = new THREE.Mesh(archColumnGeo, marbleArchMat);
    gCol.scale.set(0.72, 0.78, 0.72);
    gCol.position.set(
      eastIslX + Math.cos(gAng) * 4.2,
      eastDeckY + 2.2,
      eastIslZ + Math.sin(gAng) * 4.2
    );
    floatingIslandsGroup.add(gCol);
  }
  const gazeboCrown = new THREE.Mesh(gazeboDomeRingGeo, flowerGoldMat);
  gazeboCrown.position.set(eastIslX, eastDeckY + 4.4, eastIslZ);
  floatingIslandsGroup.add(gazeboCrown);

  // 5. North & East Arched Floral Sky-Bridges connecting the 3 High-Altitude Floating Islands
  const bridgePlankGeo = new THREE.BoxGeometry(5.8, 0.32, 1.15);
  const bridgeKerbGeo = new THREE.BoxGeometry(0.35, 0.52, 1.18);
  disposableGeometries.push(bridgePlankGeo, bridgeKerbGeo);

  // North Sky-Bridge (x = mainIslX, z = -61.5 .. -68.5)
  for (let s = 0; s <= 7; s++) {
    const t = s / 7;
    const bz = -61.5 - t * 7.0;
    const by = floatingBloomingIslandHeightAt(mainIslX, bz, mainDeckY + 1.5) ?? mainDeckY + 1.5;
    const plank = new THREE.Mesh(bridgePlankGeo, marbleArchMat);
    plank.position.set(mainIslX, by - 0.14, bz);
    floatingIslandsGroup.add(plank);
    for (const side of [-1, 1] as const) {
      const kerb = new THREE.Mesh(bridgeKerbGeo, blossomCanopyPinkMat);
      kerb.position.set(mainIslX + side * 2.75, by + 0.18, bz);
      floatingIslandsGroup.add(kerb);
    }
  }

  // East Sky-Bridge (from (mainIslX + 25.0, -26) to (mainIslX + 31.5, -23.6))
  const eastBridgeStartX = mainIslX + 25.0;
  const eastBridgeEndX = mainIslX + 31.5;
  const eastBridgeYaw = Math.atan2(eastBridgeEndX - eastBridgeStartX, -23.6 - -26.0);
  for (let s = 0; s <= 7; s++) {
    const t = s / 7;
    const bx = eastBridgeStartX + t * 6.5;
    const bz = -26.0 + t * 2.4;
    const by = floatingBloomingIslandHeightAt(bx, bz, mainDeckY + 1.0) ?? mainDeckY + 1.0;
    const plank = new THREE.Mesh(bridgePlankGeo, marbleArchMat);
    plank.position.set(bx, by - 0.14, bz);
    plank.rotation.y = eastBridgeYaw;
    floatingIslandsGroup.add(plank);
  }

  // ==========================================================================
  // 6. COLOSSAL 65-METER CENTRAL SKY-WATERFALL & 57 SPIRALING MINI-ISLAND STAIRS
  // ==========================================================================
  const wfX = FLOATING_ISLAND_STAIR_POS.waterfallX;
  const wfZ = FLOATING_ISLAND_STAIR_POS.waterfallZ;
  const wfFootY = FLOATING_ISLAND_STAIR_POS.footY;
  const wfTopY = FLOATING_ISLAND_STAIR_POS.topY;
  const wfHeight = wfTopY - wfFootY;

  // 6A. Upper Spring Pond & Marble Aqueduct Channel on the Main Island pouring into the Sky-Waterfall
  const aqueductDeckGeo = new THREE.BoxGeometry(15.5, 0.85, 7.6);
  const aqueductWaterGeo = new THREE.BoxGeometry(15.6, 0.25, 4.8);
  const waterfallCoreGeo = new THREE.CylinderGeometry(2.15, 2.95, wfHeight, 24, 1, true);
  const waterfallVeilGeo = new THREE.CylinderGeometry(2.65, 3.65, wfHeight, 24, 1, true);
  const waterfallRingGeo = new THREE.TorusGeometry(2.65, 0.24, 8, 24);
  waterfallRingGeo.rotateX(Math.PI / 2);
  const plungePoolWaterGeo = new THREE.CylinderGeometry(7.2, 6.8, 0.28, 32);
  const plungePoolRimGeo = new THREE.TorusGeometry(7.2, 0.65, 10, 28);
  plungePoolRimGeo.rotateX(Math.PI / 2);
  const mistPuffGeo = new THREE.IcosahedronGeometry(1.85, 1);

  disposableGeometries.push(
    aqueductDeckGeo,
    aqueductWaterGeo,
    waterfallCoreGeo,
    waterfallVeilGeo,
    waterfallRingGeo,
    plungePoolWaterGeo,
    plungePoolRimGeo,
    mistPuffGeo
  );

  const aqueductDeck = new THREE.Mesh(aqueductDeckGeo, marbleArchMat);
  aqueductDeck.position.set((wfX + FLOATING_ISLAND_STAIR_POS.topX) * 0.5 + 0.5, wfTopY - 0.42, wfZ);
  floatingIslandsGroup.add(aqueductDeck);

  const aqueductWater = new THREE.Mesh(aqueductWaterGeo, waterfallCoreMat);
  aqueductWater.position.set((wfX + FLOATING_ISLAND_STAIR_POS.topX) * 0.5 + 0.5, wfTopY + 0.04, wfZ);
  floatingIslandsGroup.add(aqueductWater);

  // Central 65m Sky-Waterfall Core & Frothy Mist Veil
  const waterfallCoreMesh = new THREE.Mesh(waterfallCoreGeo, waterfallCoreMat);
  waterfallCoreMesh.position.set(wfX, wfFootY + wfHeight * 0.5, wfZ);
  floatingIslandsGroup.add(waterfallCoreMesh);

  const waterfallVeilMesh = new THREE.Mesh(waterfallVeilGeo, waterfallFoamMat);
  waterfallVeilMesh.position.set(wfX, wfFootY + wfHeight * 0.5, wfZ);
  floatingIslandsGroup.add(waterfallVeilMesh);

  // Ground-Level Plunge Pool & Rim Boulders at (wfX, 3.4, -35)
  const plungePoolMesh = new THREE.Mesh(plungePoolWaterGeo, waterfallCoreMat);
  plungePoolMesh.position.set(wfX, wfFootY + 0.06, wfZ);
  floatingIslandsGroup.add(plungePoolMesh);

  const plungePoolRim = new THREE.Mesh(plungePoolRimGeo, islandCliffMat);
  plungePoolRim.position.set(wfX, wfFootY + 0.12, wfZ);
  floatingIslandsGroup.add(plungePoolRim);

  // Animated Cascading Waterfall Foam Rings & Plunge Pool Mist Puffs
  const waterfallRings: THREE.Mesh[] = [];
  for (let r = 0; r < 18; r++) {
    const ring = new THREE.Mesh(waterfallRingGeo, waterfallFoamMat);
    const t = r / 18;
    ring.position.set(wfX, wfTopY - t * wfHeight, wfZ);
    ring.scale.setScalar(0.85 + t * 0.45);
    floatingIslandsGroup.add(ring);
    waterfallRings.push(ring);
  }

  const waterfallMistPuffs: THREE.Mesh[] = [];
  for (let m = 0; m < 10; m++) {
    const mAng = (m / 10) * Math.PI * 2;
    const puff = new THREE.Mesh(mistPuffGeo, waterfallFoamMat);
    puff.position.set(
      wfX + Math.cos(mAng) * 3.6,
      wfFootY + 1.2 + (m % 3) * 0.8,
      wfZ + Math.sin(mAng) * 3.6
    );
    floatingIslandsGroup.add(puff);
    waterfallMistPuffs.push(puff);
  }

  // 6B. Ground-Level Marble Entry Plaza & Welcome Torii Archway at (entryRampStartX..footX, 3.3, -35.0)
  const entryPlazaGeo = new THREE.BoxGeometry(10.2, 0.48, 7.8);
  const entryArchBeamGeo = new THREE.BoxGeometry(1.1, 0.75, 8.6);
  // Non-overlapping floating step island discs (1.48m regular, 1.85m rest landing; consecutive centers are ~3.78m apart)
  const miniIslandDeckGeo = new THREE.CylinderGeometry(1.48, 1.32, 0.36, 18);
  const miniIslandRestDeckGeo = new THREE.CylinderGeometry(1.85, 1.65, 0.44, 22);
  const miniIslandRimGeo = new THREE.TorusGeometry(1.48, 0.075, 8, 20);
  miniIslandRimGeo.rotateX(Math.PI / 2);
  const miniIslandRestRimGeo = new THREE.TorusGeometry(1.85, 0.095, 8, 24);
  miniIslandRestRimGeo.rotateX(Math.PI / 2);
  const miniIslandRockGeo = new THREE.ConeGeometry(1.28, 1.85, 10);
  miniIslandRockGeo.rotateX(Math.PI);
  perturbGeometryVertices(miniIslandRockGeo, 0.10, 1.4);
  // Compact inset marble stepping stones strictly bridging the open gap between consecutive floating step islands
  const miniStepTreadGeo = new THREE.BoxGeometry(0.62, 0.16, 1.46);
  const railPostGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.92, 8);
  const railBarGeo = new THREE.BoxGeometry(2.6, 0.08, 0.09);
  const miniCrystalGeo = new THREE.OctahedronGeometry(0.32, 0);
  miniCrystalGeo.scale(0.8, 1.85, 0.8);

  disposableGeometries.push(
    entryPlazaGeo,
    entryArchBeamGeo,
    miniIslandDeckGeo,
    miniIslandRestDeckGeo,
    miniIslandRimGeo,
    miniIslandRestRimGeo,
    miniIslandRockGeo,
    miniStepTreadGeo,
    railPostGeo,
    railBarGeo,
    miniCrystalGeo
  );

  const entryGateX = FLOATING_ISLAND_STAIR_POS.entryRampStartX + 1.5;
  const entryPlazaMesh = new THREE.Mesh(entryPlazaGeo, marbleArchMat);
  entryPlazaMesh.position.set(FLOATING_ISLAND_STAIR_POS.entryRampStartX + 4.7, 3.12, wfZ);
  entryPlazaMesh.rotation.z = 0.024;
  entryPlazaMesh.receiveShadow = !isSoftwareGl;
  floatingIslandsGroup.add(entryPlazaMesh);

  for (const side of [-1, 1] as const) {
    const gateCol = new THREE.Mesh(archColumnGeo, marbleArchMat);
    gateCol.scale.set(0.88, 0.92, 0.88);
    gateCol.position.set(entryGateX, 3.2 + 2.5, wfZ + side * 3.4);
    floatingIslandsGroup.add(gateCol);

    const gateLantern = new THREE.Mesh(miniCrystalGeo, skyCrystalMat);
    gateLantern.scale.setScalar(1.35);
    gateLantern.position.set(entryGateX, 3.2 + 5.7, wfZ + side * 3.4);
    floatingIslandsGroup.add(gateLantern);
    floatingCrystals.push(gateLantern);
  }
  const gateTopBeam = new THREE.Mesh(entryArchBeamGeo, flowerGoldMat);
  gateTopBeam.position.set(entryGateX, 3.2 + 5.15, wfZ);
  floatingIslandsGroup.add(gateTopBeam);

  // 6C. 57 Floating Mini-Islands & Grand Rest-Landing Terraces Spiraling Upward Around the Waterfall
  //     Each mini-island sits level horizontally with clean non-overlapping spacing and 2 inset marble stepping stones in the gap.
  for (let i = 0; i < FLOATING_WATERFALL_STEP_ISLANDS.length; i++) {
    const stepIsl = FLOATING_WATERFALL_STEP_ISLANDS[i];
    const miniGroup = new THREE.Group();
    miniGroup.position.set(stepIsl.x, stepIsl.y, stepIsl.z);

    const miniTop = new THREE.Mesh(
      stepIsl.isRestLanding ? miniIslandRestDeckGeo : miniIslandDeckGeo,
      islandGrassMat
    );
    miniTop.position.set(0, -0.18, 0);
    miniTop.receiveShadow = !isSoftwareGl;
    miniGroup.add(miniTop);

    const miniRim = new THREE.Mesh(
      stepIsl.isRestLanding ? miniIslandRestRimGeo : miniIslandRimGeo,
      flowerGoldMat
    );
    miniRim.position.set(0, -0.02, 0);
    miniGroup.add(miniRim);

    const outCos = Math.cos(stepIsl.angle);
    const outSin = Math.sin(stepIsl.angle);

    if (stepIsl.isRestLanding) {
      const restPillar = new THREE.Mesh(archColumnGeo, marbleArchMat);
      restPillar.scale.set(0.42, 0.48, 0.42);
      restPillar.position.set(outCos * 1.52, 1.25, outSin * 1.52);
      miniGroup.add(restPillar);

      const restCrystal = new THREE.Mesh(miniCrystalGeo, skyCrystalMat);
      restCrystal.scale.setScalar(1.1);
      restCrystal.position.set(outCos * 1.52, 2.95, outSin * 1.52);
      miniGroup.add(restCrystal);
      floatingCrystals.push(restCrystal);

      const restBlossom = new THREE.Mesh(treeCrownGeo, blossomCanopyPinkMat);
      restBlossom.scale.setScalar(0.38);
      restBlossom.position.set(outCos * 1.45, 2.65, outSin * 1.45);
      miniGroup.add(restBlossom);
    }

    // Craggy tapered rock underside of the mini-island
    const miniRock = new THREE.Mesh(miniIslandRockGeo, islandCliffMat);
    if (stepIsl.isRestLanding) {
      miniRock.scale.set(1.22, 1.18, 1.22);
    }
    miniRock.position.set(0, -1.25, 0);
    miniRock.castShadow = !isSoftwareGl;
    miniGroup.add(miniRock);

    // Glowing cyan levitation crystal underneath the mini-island tip
    const miniCrys = new THREE.Mesh(miniCrystalGeo, skyCrystalMat);
    miniCrys.position.set(0, stepIsl.isRestLanding ? -2.55 : -2.35, 0);
    miniGroup.add(miniCrys);
    floatingCrystals.push(miniCrys);

    // Outer-edge marble balustrade post & glowing crystal lantern
    const balPost = new THREE.Mesh(railPostGeo, marbleArchMat);
    const balR = stepIsl.radius - 0.18;
    balPost.position.set(outCos * balR, 0.46, outSin * balR);
    miniGroup.add(balPost);

    const balGem = new THREE.Mesh(miniCrystalGeo, flowerGoldMat);
    balGem.scale.setScalar(0.42);
    balGem.position.set(outCos * balR, 1.04, outSin * balR);
    miniGroup.add(balGem);

    // Blooming flower accent on the outer edge of each mini-island
    const flowerAccent = new THREE.Mesh(
      flowerPatchGeo,
      i % 2 === 0 ? blossomCanopyPinkMat : flowerGoldMat
    );
    flowerAccent.scale.setScalar(0.48);
    flowerAccent.position.set(outCos * (balR - 0.38), 0.04, outSin * (balR - 0.38));
    miniGroup.add(flowerAccent);

    if (i % 3 === 0) {
      const miniVine = new THREE.Mesh(hangingVineGeo, vineFoliageMat);
      miniVine.scale.set(0.45, 0.48, 0.45);
      miniVine.position.set(outCos * (stepIsl.radius - 0.12), -0.85, outSin * (stepIsl.radius - 0.12));
      miniGroup.add(miniVine);
    }

    floatingIslandsGroup.add(miniGroup);

    // 2 compact inset marble stepping stones strictly bridging the open gap between stepIsl and nextIsl
    if (i < FLOATING_WATERFALL_STEP_ISLANDS.length - 1) {
      const nextIsl = FLOATING_WATERFALL_STEP_ISLANDS[i + 1];
      const dx = nextIsl.x - stepIsl.x;
      const dz = nextIsl.z - stepIsl.z;
      const dy = nextIsl.y - stepIsl.y;
      const horizLen = Math.hypot(dx, dz) || 1;
      const stepYaw = Math.atan2(-dz, dx);
      const dirX = dx / horizLen;
      const dirZ = dz / horizLen;
      const startRim = stepIsl.radius + 0.12;
      const endRim = nextIsl.radius + 0.12;
      const clearGap = horizLen - startRim - endRim;

      if (clearGap > 0.2) {
        for (const gapFrac of [0.35, 0.65] as const) {
          const distAlong = startRim + clearGap * gapFrac;
          const u = distAlong / horizLen;
          const tread = new THREE.Mesh(miniStepTreadGeo, marbleArchMat);
          tread.position.set(
            stepIsl.x + dirX * distAlong,
            stepIsl.y + dy * u - 0.08,
            stepIsl.z + dirZ * distAlong
          );
          tread.rotation.y = stepYaw;
          floatingIslandsGroup.add(tread);
        }
      }
    }
  }

  // ==========================================================================
  // 6D. CELESTIAL BUILDINGS, TEMPLES, WATCHTOWERS & ASTRAL OBSERVATORY ON THE FLOATING ISLANDS
  // ==========================================================================
  const towerBodyGeo = new THREE.CylinderGeometry(2.1, 2.45, 5.8, 12);
  const towerRoofGeo = new THREE.ConeGeometry(3.15, 2.8, 12);
  const templeDomeGeo = new THREE.SphereGeometry(5.6, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const barracksBaseGeo = new THREE.BoxGeometry(9.4, 0.45, 5.8);
  const barracksRoofGeo = new THREE.ConeGeometry(6.6, 2.7, 4);
  barracksRoofGeo.rotateY(Math.PI * 0.25);
  const bannerClothGeo = new THREE.BoxGeometry(0.08, 2.6, 0.95);
  const chestBoxGeo = new THREE.BoxGeometry(1.45, 0.85, 0.95);
  const chestLidGeo = new THREE.CylinderGeometry(0.48, 0.48, 1.45, 12, 1, false, 0, Math.PI);
  chestLidGeo.rotateZ(Math.PI / 2);
  const orreryRingGeo = new THREE.TorusGeometry(2.15, 0.09, 10, 32);

  const skyBannerMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 0.45,
    roughness: 0.4,
  });
  const silverArmorMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.78,
    roughness: 0.22,
  });

  disposableMaterials.push(skyBannerMat, silverArmorMat);
  disposableGeometries.push(
    towerBodyGeo,
    towerRoofGeo,
    templeDomeGeo,
    barracksBaseGeo,
    barracksRoofGeo,
    bannerClothGeo,
    chestBoxGeo,
    chestLidGeo,
    orreryRingGeo
  );

  // 1) Twin Sky-Gate Watchtowers on Main Island flanking the Upper Waterfall Aqueduct (topX + 5.5, 68.0, -35 ± 5.2)
  const skyWatchtowerX = FLOATING_ISLAND_STAIR_POS.topX + 5.5;
  for (const side of [-1, 1] as const) {
    const wtGroup = new THREE.Group();
    wtGroup.position.set(skyWatchtowerX, mainDeckY, wfZ + side * 5.2);

    const wtBody = new THREE.Mesh(towerBodyGeo, marbleArchMat);
    wtBody.position.set(0, 2.9, 0);
    wtBody.castShadow = !isSoftwareGl;
    wtGroup.add(wtBody);

    const wtRoof = new THREE.Mesh(towerRoofGeo, flowerGoldMat);
    wtRoof.position.set(0, 7.1, 0);
    wtGroup.add(wtRoof);

    const wtCrystal = new THREE.Mesh(miniCrystalGeo, skyCrystalMat);
    wtCrystal.scale.setScalar(1.45);
    wtCrystal.position.set(0, 9.1, 0);
    wtGroup.add(wtCrystal);
    floatingCrystals.push(wtCrystal);

    const wtBanner = new THREE.Mesh(bannerClothGeo, skyBannerMat);
    wtBanner.position.set(-2.25, 3.8, 0);
    wtGroup.add(wtBanner);

    floatingIslandsGroup.add(wtGroup);
  }

  // 2) Grand Celestial Temple Pavilion around the Main Island Sanctuary (mainIslX, 68.0, -35)
  for (let c = 0; c < 8; c++) {
    const cAng = (c / 8) * Math.PI * 2 + Math.PI / 8;
    const tCol = new THREE.Mesh(archColumnGeo, marbleArchMat);
    tCol.scale.set(0.82, 1.05, 0.82);
    tCol.position.set(mainIslX + Math.cos(cAng) * 5.2, mainDeckY + 2.95, mainIslZ + Math.sin(cAng) * 5.2);
    floatingIslandsGroup.add(tCol);
  }
  const templeDome = new THREE.Mesh(templeDomeGeo, marbleArchMat);
  templeDome.position.set(mainIslX, mainDeckY + 5.8, mainIslZ);
  floatingIslandsGroup.add(templeDome);

  const templeCrownRing = new THREE.Mesh(gazeboDomeRingGeo, flowerGoldMat);
  templeCrownRing.scale.setScalar(1.26);
  templeCrownRing.position.set(mainIslX, mainDeckY + 5.85, mainIslZ);
  floatingIslandsGroup.add(templeCrownRing);

  const templeApexSpire = new THREE.Mesh(undersideCrystalGeo, skyCrystalMat);
  templeApexSpire.scale.set(0.75, 1.35, 0.75);
  templeApexSpire.position.set(mainIslX, mainDeckY + 12.6, mainIslZ);
  floatingIslandsGroup.add(templeApexSpire);
  floatingCrystals.push(templeApexSpire);

  // 3) Sky-Guard Citadel Barracks & Armory Hall on Main Island Southern Terrace (mainIslX, 68.0, -15.5)
  const barracksGroup = new THREE.Group();
  barracksGroup.position.set(mainIslX, mainDeckY, -15.5);

  const bDais = new THREE.Mesh(barracksBaseGeo, marbleArchMat);
  bDais.position.set(0, 0.22, 0);
  barracksGroup.add(bDais);

  for (const px of [-4.1, -1.4, 1.4, 4.1]) {
    for (const pz of [-2.3, 2.3]) {
      const bCol = new THREE.Mesh(archColumnGeo, marbleArchMat);
      bCol.scale.set(0.65, 0.78, 0.65);
      bCol.position.set(px, 2.35, pz);
      barracksGroup.add(bCol);
    }
  }
  const bRoof = new THREE.Mesh(barracksRoofGeo, flowerGoldMat);
  bRoof.scale.set(1.25, 1.0, 0.82);
  bRoof.position.set(0, 5.65, 0);
  barracksGroup.add(bRoof);

  // Celestial Treasure Chest inside the Barracks Hall
  const barracksChest = new THREE.Mesh(chestBoxGeo, silverArmorMat);
  barracksChest.position.set(0, 0.85, 0);
  barracksGroup.add(barracksChest);
  const barracksChestLid = new THREE.Mesh(chestLidGeo, flowerGoldMat);
  barracksChestLid.position.set(0, 1.28, 0);
  barracksGroup.add(barracksChestLid);

  floatingIslandsGroup.add(barracksGroup);

  // 4) North Island Hall of the Starlight Guardians Citadel (northIslX, 71.0, -93.5)
  const northCitadelGroup = new THREE.Group();
  northCitadelGroup.position.set(northIslX, northDeckY, -93.5);

  const ncTowerCenter = new THREE.Mesh(towerBodyGeo, marbleArchMat);
  ncTowerCenter.scale.set(1.25, 1.25, 1.25);
  ncTowerCenter.position.set(0, 3.6, 0);
  northCitadelGroup.add(ncTowerCenter);

  const ncRoofCenter = new THREE.Mesh(towerRoofGeo, flowerGoldMat);
  ncRoofCenter.scale.set(1.28, 1.35, 1.28);
  ncRoofCenter.position.set(0, 9.1, 0);
  northCitadelGroup.add(ncRoofCenter);

  for (const side of [-1, 1] as const) {
    const sideWing = new THREE.Mesh(towerBodyGeo, marbleArchMat);
    sideWing.scale.set(0.75, 0.85, 0.75);
    sideWing.position.set(side * 4.2, 2.45, 0.8);
    northCitadelGroup.add(sideWing);

    const sideRoof = new THREE.Mesh(towerRoofGeo, blossomCanopyPinkMat);
    sideRoof.scale.set(0.8, 0.9, 0.8);
    sideRoof.position.set(side * 4.2, 6.1, 0.8);
    northCitadelGroup.add(sideRoof);
  }
  const ncStarCrystal = new THREE.Mesh(undersideCrystalGeo, skyCrystalMat);
  ncStarCrystal.scale.set(0.8, 1.4, 0.8);
  ncStarCrystal.position.set(0, 12.2, 0);
  northCitadelGroup.add(ncStarCrystal);
  floatingCrystals.push(ncStarCrystal);

  floatingIslandsGroup.add(northCitadelGroup);

  // 5) East Island Astral Observatory Dome & Rotating Golden Orrery at (eastIslX, 70.0, -18.0)
  const orreryGroup = new THREE.Group();
  orreryGroup.position.set(eastIslX, eastDeckY + 2.55, eastIslZ);
  const orreryRing1 = new THREE.Mesh(orreryRingGeo, flowerGoldMat);
  const orreryRing2 = new THREE.Mesh(orreryRingGeo, silverArmorMat);
  orreryRing2.scale.setScalar(0.78);
  orreryRing2.rotation.x = Math.PI / 3;
  const orreryCore = new THREE.Mesh(miniCrystalGeo, skyCrystalMat);
  orreryCore.scale.setScalar(1.35);
  orreryGroup.add(orreryRing1, orreryRing2, orreryCore);
  floatingIslandsGroup.add(orreryGroup);

  // East Island Celestial Relic Chest on a marble pedestal at (eastIslX + 5.5, 70.0, -18.0)
  const eastChestBase = new THREE.Mesh( chestBoxGeo, silverArmorMat );
  eastChestBase.position.set(eastIslX + 5.5, eastDeckY + 0.55, eastIslZ);
  eastChestBase.rotation.y = -Math.PI / 2;
  const eastChestTop = new THREE.Mesh( chestLidGeo, flowerGoldMat );
  eastChestTop.position.set(eastIslX + 5.5, eastDeckY + 0.98, eastIslZ);
  eastChestTop.rotation.y = -Math.PI / 2;
  floatingIslandsGroup.add(eastChestBase, eastChestTop);

  // ==========================================================================
  // 6E. ARTICULATED ANIMATED CELESTIAL SKY-GUARDS STATIONED & PATROLLING THE ISLANDS
  // ==========================================================================
  const guardTorsoGeo = new THREE.CylinderGeometry(0.32, 0.25, 0.86, 12);
  const guardBeltGeo = new THREE.CylinderGeometry(0.265, 0.265, 0.12, 12);
  const guardPauldronGeo = new THREE.SphereGeometry(0.21, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62);
  const guardChestCoreGeo = new THREE.OctahedronGeometry(0.11, 0);
  const guardHeadGeo = new THREE.SphereGeometry(0.22, 12, 12);
  const guardVisorGeo = new THREE.BoxGeometry(0.28, 0.065, 0.24);
  const guardEyeGeo = new THREE.BoxGeometry(0.065, 0.025, 0.05);
  const guardHelmCrestGeo = new THREE.ConeGeometry(0.22, 0.54, 8);
  const guardHelmWingGeo = new THREE.BoxGeometry(0.06, 0.34, 0.16);
  const guardLimbGeo = new THREE.CylinderGeometry(0.095, 0.082, 0.72, 8);
  const guardTassetGeo = new THREE.BoxGeometry(0.22, 0.30, 0.24);
  const guardCapeGeo = new THREE.BoxGeometry(0.64, 1.24, 0.05);
  // Long ceremonial halberd-spear (4.4m shaft + cross-guard + crescent axe-wing + glowing crystal spear blade)
  const guardSpearShaftGeo = new THREE.CylinderGeometry(0.04, 0.044, 4.4, 8);
  const guardSpearCrossGeo = new THREE.BoxGeometry(0.46, 0.07, 0.12);
  const guardHalberdWingGeo = new THREE.ConeGeometry(0.28, 0.52, 4);
  guardHalberdWingGeo.rotateZ(Math.PI / 2);
  const guardSpearTipGeo = new THREE.OctahedronGeometry(0.22, 0);
  guardSpearTipGeo.scale(0.62, 2.45, 0.62);
  const guardShieldGeo = new THREE.CylinderGeometry(0.44, 0.38, 0.07, 10);
  guardShieldGeo.rotateX(Math.PI / 2);
  const guardShieldRimGeo = new THREE.TorusGeometry(0.41, 0.032, 6, 10);
  const guardVisorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.85,
    roughness: 0.2,
  });
  const guardEyeMat = new THREE.MeshBasicMaterial({
    color: 0x7dd3fc,
  });

  disposableMaterials.push(guardVisorMat, guardEyeMat);
  disposableGeometries.push(
    guardTorsoGeo,
    guardBeltGeo,
    guardPauldronGeo,
    guardChestCoreGeo,
    guardHeadGeo,
    guardVisorGeo,
    guardEyeGeo,
    guardHelmCrestGeo,
    guardHelmWingGeo,
    guardLimbGeo,
    guardTassetGeo,
    guardCapeGeo,
    guardSpearShaftGeo,
    guardSpearCrossGeo,
    guardHalberdWingGeo,
    guardSpearTipGeo,
    guardShieldGeo,
    guardShieldRimGeo
  );

  interface ICelestialSkyGuard {
    root: THREE.Group;
    leftArm: THREE.Group;
    rightArm: THREE.Group;
    weaponArm: THREE.Group;
    leftLeg: THREE.Mesh;
    rightLeg: THREE.Mesh;
    cape: THREE.Mesh;
    homeX: number;
    homeY: number;
    homeZ: number;
    baseYaw: number;
    patrolAxis: 'none' | 'x' | 'z';
    patrolRadius: number;
    phaseOffset: number;
    isGateGuard: boolean;
    gateCenterX: number;
    gateCenterZ: number;
    gateSide: -1 | 1;
  }

  const skyGuards: ICelestialSkyGuard[] = [];
  const groundGateGuardX = entryGateX - 0.2;
  const upperGateGuardX = FLOATING_ISLAND_STAIR_POS.topX + 3.2;
  const guardConfigs: ReadonlyArray<{
    x: number;
    y: number;
    z: number;
    yaw: number;
    patrolAxis: 'none' | 'x' | 'z';
    patrolRadius: number;
    isGateGuard?: boolean;
    gateCenterX?: number;
    gateCenterZ?: number;
    gateSide?: -1 | 1;
  }> = [
    // 2 Gate Guards at Ground Waterfall Entry Gate (facing -X; spears crossed in an "X" across the gate until player is very close)
    {
      x: groundGateGuardX,
      y: 3.22,
      z: wfZ - 2.35,
      yaw: -Math.PI / 2,
      patrolAxis: 'none',
      patrolRadius: 0,
      isGateGuard: true,
      gateCenterX: groundGateGuardX,
      gateCenterZ: wfZ,
      gateSide: -1,
    },
    {
      x: groundGateGuardX,
      y: 3.22,
      z: wfZ + 2.35,
      yaw: -Math.PI / 2,
      patrolAxis: 'none',
      patrolRadius: 0,
      isGateGuard: true,
      gateCenterX: groundGateGuardX,
      gateCenterZ: wfZ,
      gateSide: 1,
    },
    // 2 Gate Guards at Upper Sky-Gate Watchtowers (facing -X; spears crossed in an "X" across the gate until player is very close)
    {
      x: upperGateGuardX,
      y: mainDeckY,
      z: wfZ - 2.35,
      yaw: -Math.PI / 2,
      patrolAxis: 'none',
      patrolRadius: 0,
      isGateGuard: true,
      gateCenterX: upperGateGuardX,
      gateCenterZ: wfZ,
      gateSide: -1,
    },
    {
      x: upperGateGuardX,
      y: mainDeckY,
      z: wfZ + 2.35,
      yaw: -Math.PI / 2,
      patrolAxis: 'none',
      patrolRadius: 0,
      isGateGuard: true,
      gateCenterX: upperGateGuardX,
      gateCenterZ: wfZ,
      gateSide: 1,
    },
    // 2 Patrolling Guards on Main Sky Island Sanctuary Plaza & Barracks
    { x: mainIslX - 8.5, y: mainDeckY + 0.12, z: mainIslZ, yaw: 0, patrolAxis: 'z', patrolRadius: 8.5 },
    { x: mainIslX, y: mainDeckY + 0.12, z: mainIslZ + 12.5, yaw: Math.PI / 2, patrolAxis: 'x', patrolRadius: 8.0 },
    // 1 Guard at North Island Star-Citadel Courtyard
    { x: northIslX - 2.8, y: northDeckY + 0.1, z: northIslZ + 8.5, yaw: 0, patrolAxis: 'x', patrolRadius: 4.5 },
    // 1 Guard at East Island Astral Observatory Entrance
    { x: eastIslX - 7.5, y: eastDeckY + 0.1, z: eastIslZ - 2.5, yaw: -Math.PI / 2, patrolAxis: 'z', patrolRadius: 4.0 },
  ];

  for (let gIdx = 0; gIdx < guardConfigs.length; gIdx++) {
    const cfg = guardConfigs[gIdx];
    const gRoot = new THREE.Group();
    gRoot.position.set(cfg.x, cfg.y, cfg.z);
    gRoot.rotation.y = cfg.yaw;

    const torso = new THREE.Mesh(guardTorsoGeo, silverArmorMat);
    torso.position.set(0, 1.15, 0);
    torso.castShadow = !isSoftwareGl;
    gRoot.add(torso);

    const belt = new THREE.Mesh(guardBeltGeo, flowerGoldMat);
    belt.position.set(0, 0.78, 0);
    gRoot.add(belt);

    const chestCore = new THREE.Mesh(guardChestCoreGeo, skyCrystalMat);
    chestCore.position.set(0, 1.24, 0.29);
    gRoot.add(chestCore);

    for (const side of [-1, 1] as const) {
      const pauldron = new THREE.Mesh(guardPauldronGeo, flowerGoldMat);
      pauldron.position.set(side * 0.38, 1.48, 0);
      gRoot.add(pauldron);

      const tasset = new THREE.Mesh(guardTassetGeo, flowerGoldMat);
      tasset.position.set(side * 0.21, 0.66, 0);
      tasset.rotation.z = side * -0.14;
      gRoot.add(tasset);
    }

    const head = new THREE.Mesh(guardHeadGeo, silverArmorMat);
    head.position.set(0, 1.72, 0);
    gRoot.add(head);

    const visor = new THREE.Mesh(guardVisorGeo, guardVisorMat);
    visor.position.set(0, 1.72, 0.12);
    gRoot.add(visor);

    for (const side of [-1, 1] as const) {
      const eye = new THREE.Mesh(guardEyeGeo, guardEyeMat);
      eye.position.set(side * 0.068, 1.725, 0.245);
      gRoot.add(eye);

      const wing = new THREE.Mesh(guardHelmWingGeo, flowerGoldMat);
      wing.position.set(side * 0.22, 1.88, -0.02);
      wing.rotation.z = side * -0.35;
      gRoot.add(wing);
    }

    const helmCrest = new THREE.Mesh(guardHelmCrestGeo, flowerGoldMat);
    helmCrest.position.set(0, 2.08, 0);
    gRoot.add(helmCrest);

    const cape = new THREE.Mesh(guardCapeGeo, skyBannerMat);
    cape.position.set(0, 1.04, -0.27);
    cape.rotation.x = 0.15;
    gRoot.add(cape);

    const leftLeg = new THREE.Mesh(guardLimbGeo, silverArmorMat);
    leftLeg.position.set(-0.14, 0.36, 0);
    const rightLeg = new THREE.Mesh(guardLimbGeo, silverArmorMat);
    rightLeg.position.set(0.14, 0.36, 0);
    gRoot.add(leftLeg, rightLeg);

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.38, 1.40, 0);
    const leftArmMesh = new THREE.Mesh(guardLimbGeo, silverArmorMat);
    leftArmMesh.position.set(0, -0.28, 0);
    leftArm.add(leftArmMesh);
    gRoot.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.38, 1.40, 0);
    const rightArmMesh = new THREE.Mesh(guardLimbGeo, silverArmorMat);
    rightArmMesh.position.set(0, -0.28, 0);
    rightArm.add(rightArmMesh);
    gRoot.add(rightArm);

    // Place the Halberd-Spear in the inner gate-facing hand so the pair of gate guards cross spears cleanly in an "X"
    const isGate = Boolean(cfg.isGateGuard);
    const gateSide: -1 | 1 = cfg.gateSide ?? -1;
    // When yaw = -Math.PI/2, local +X is world +Z. So guard at z = wfZ - 2.35 (gateSide = -1) has its inner side at +X (rightArm),
    // and guard at z = wfZ + 2.35 (gateSide = 1) has its inner side at -X (leftArm).
    const weaponArm = isGate && gateSide === 1 ? leftArm : rightArm;
    const shieldArm = isGate && gateSide === 1 ? rightArm : leftArm;
    const shieldSideSign = shieldArm === leftArm ? -1 : 1;

    const shield = new THREE.Mesh(guardShieldGeo, silverArmorMat);
    shield.position.set(shieldSideSign * 0.14, -0.32, 0.24);
    const shieldRim = new THREE.Mesh(guardShieldRimGeo, flowerGoldMat);
    shieldRim.position.copy(shield.position);
    const shieldGem = new THREE.Mesh(guardChestCoreGeo, skyCrystalMat);
    shieldGem.position.set(shieldSideSign * 0.14, -0.32, 0.29);
    shieldArm.add(shield, shieldRim, shieldGem);

    const spearGroup = new THREE.Group();
    spearGroup.position.set(0, -0.22, 0.24);
    const spearShaft = new THREE.Mesh(guardSpearShaftGeo, flowerGoldMat);
    spearShaft.position.set(0, 1.45, 0);
    const spearCross = new THREE.Mesh(guardSpearCrossGeo, flowerGoldMat);
    spearCross.position.set(0, 3.45, 0);
    const halberdWing = new THREE.Mesh(guardHalberdWingGeo, flowerGoldMat);
    halberdWing.position.set(gateSide === 1 ? -0.22 : 0.22, 3.32, 0);
    const spearTip = new THREE.Mesh(guardSpearTipGeo, skyCrystalMat);
    spearTip.position.set(0, 3.98, 0);
    spearGroup.add(spearShaft, spearCross, halberdWing, spearTip);
    weaponArm.add(spearGroup);

    floatingIslandsGroup.add(gRoot);
    skyGuards.push({
      root: gRoot,
      leftArm,
      rightArm,
      weaponArm,
      leftLeg,
      rightLeg,
      cape,
      homeX: cfg.x,
      homeY: cfg.y,
      homeZ: cfg.z,
      baseYaw: cfg.yaw,
      patrolAxis: cfg.patrolAxis,
      patrolRadius: cfg.patrolRadius,
      phaseOffset: gIdx * 1.37,
      isGateGuard: isGate,
      gateCenterX: cfg.gateCenterX ?? cfg.x,
      gateCenterZ: cfg.gateCenterZ ?? cfg.z,
      gateSide,
    });
  }

  // ==========================================================================
  // 6F. OVERARCHING SKY-PRISM RAINBOW ARC & FLOATING CELESTIAL LANTERNS
  // ==========================================================================
  const rainbowArcColors = [0xf43f5e, 0xf59e0b, 0x10b981, 0x38bdf8, 0xa855f7];
  for (let b = 0; b < rainbowArcColors.length; b++) {
    const rbGeo = new THREE.TorusGeometry(24.0 - b * 0.55, 0.24, 8, 42, Math.PI);
    const rbMat = new THREE.MeshBasicMaterial({
      color: rainbowArcColors[b],
      transparent: true,
      opacity: 0.34,
    });
    disposableGeometries.push(rbGeo);
    disposableMaterials.push(rbMat);
    const rbMesh = new THREE.Mesh(rbGeo, rbMat);
    rbMesh.position.set(wfX + 18.0, mainDeckY - 1.0, wfZ);
    rbMesh.rotation.y = Math.PI * 0.18;
    floatingIslandsGroup.add(rbMesh);
  }

  const skyLanterns: { mesh: THREE.Mesh; baseY: number; phase: number }[] = [];
  for (let l = 0; l < 14; l++) {
    const lAng = (l / 14) * Math.PI * 2;
    const lRad = 32.0 + (l % 3) * 14.0;
    const lanternMesh = new THREE.Mesh(miniCrystalGeo, l % 2 === 0 ? flowerGoldMat : skyCrystalMat);
    lanternMesh.scale.setScalar(1.3);
    const ly = mainDeckY + 6.5 + (l % 4) * 3.2;
    lanternMesh.position.set(mainIslX + Math.cos(lAng) * lRad, ly, mainIslZ + Math.sin(lAng) * lRad);
    floatingIslandsGroup.add(lanternMesh);
    skyLanterns.push({ mesh: lanternMesh, baseY: ly, phase: l * 0.91 });
  }

  // ==========================================================================
  // 7. CELESTIAL WIND-RING & VOLCANO THERMAL SUPER-JUMP LAUNCH PADS
  // ==========================================================================
  const geyserBaseGeo = new THREE.CylinderGeometry(2.35, 2.65, 0.24, 24);
  const geyserRingGeo = new THREE.TorusGeometry(1.85, 0.11, 8, 28);
  geyserRingGeo.rotateX(Math.PI / 2);
  disposableGeometries.push(geyserBaseGeo, geyserRingGeo);

  const animatedGeyserRings: { mesh: THREE.Mesh; baseY: number; ringIndex: number }[] = [];
  for (let g = 0; g < SKY_WIND_GEYSERS.length; g++) {
    const geyser = SKY_WIND_GEYSERS[g];
    const isVolcanoGeyser = geyser.theme === 'volcano';
    const padBase = new THREE.Mesh(geyserBaseGeo, isVolcanoGeyser ? obsidianMat : marbleArchMat);
    padBase.position.set(geyser.x, geyser.y + 0.08, geyser.z);
    scene.add(padBase);

    for (let r = 0; r < 3; r++) {
      const ringMesh = new THREE.Mesh(
        geyserRingGeo,
        isVolcanoGeyser ? magmaCrystalMat : r % 2 === 0 ? skyCrystalMat : flowerGoldMat
      );
      ringMesh.position.set(geyser.x, geyser.y + 0.45 + r * 0.65, geyser.z);
      ringMesh.scale.setScalar(1.0 - r * 0.16);
      scene.add(ringMesh);
      animatedGeyserRings.push({ mesh: ringMesh, baseY: geyser.y, ringIndex: r + g * 3 });
    }
  }

  scene.add(floatingIslandsGroup);
  distanceCulledObjects.push({
    obj: floatingIslandsGroup,
    cx: mainIslX,
    cz: mainIslZ,
    radius: 135,
  });

  return {
    volcanoGroup,
    floatingIslandsGroup,
    updateVolcanoAndFloatingIslands: (elapsedTime: number, playerX: number, playerZ: number) => {
      if (isWithinViewDistance(VOLCANO_SANCTUM_POS.x, VOLCANO_SANCTUM_POS.z, playerX, playerZ, 135, VIEW_DISTANCE)) {
        const pulse = 2.15 + Math.sin(elapsedTime * 3.4) * 0.5;
        magmaMat.emissiveIntensity = pulse;
        if (volcanoLight) {
          volcanoLight.intensity = 3.2 + Math.sin(elapsedTime * 4.5) * 0.65;
        }
        // Animate the 3 Dynamic Obsidian & Magma Portcullis Lock Gates:
        // Drop to y = 0.0 (locked shut!) when the player is inside the Boss Arena fighting the King CatLion,
        // and rise to y = 9.2 (open!) when outside or once the King CatLion is subdued/tamed/defeated.
        const arenaLocked = isVolcanoBossArenaLocked(playerX, playerZ);
        const targetGateY = arenaLocked ? 0.0 : 9.2;
        for (let gIdx = 0; gIdx < bossArenaLockGates.length; gIdx++) {
          const gate = bossArenaLockGates[gIdx];
          gate.position.y += (targetGateY - gate.position.y) * 0.18;
        }
        for (let i = 0; i < sanctumCrystals.length; i++) {
          sanctumCrystals[i].rotation.y = elapsedTime * 0.65 + i;
        }
        // Animate billowing volcanic smoke plume & rising glowing embers above the summit crater
        for (let p = 0; p < smokePuffs.length; p++) {
          const cycle = (elapsedTime * 0.12 + p / smokePuffs.length) % 1.0;
          const puff = smokePuffs[p];
          const swirlAng = p * 1.7 + elapsedTime * 0.45;
          const spreadR = 2.2 + cycle * 10.5;
          puff.position.set(
            Math.cos(swirlAng) * spreadR,
            calderaLocalY + 3.0 + cycle * 42.0,
            Math.sin(swirlAng) * spreadR
          );
          puff.scale.setScalar(0.75 + cycle * 2.35);
          puff.rotation.y = elapsedTime * 0.3 + p;
        }
        for (let e = 0; e < risingEmbers.length; e++) {
          const eCycle = (elapsedTime * 0.28 + e / risingEmbers.length) % 1.0;
          const ember = risingEmbers[e];
          const eAng = e * 2.3 - elapsedTime * 1.1;
          const eRad = 2.5 + Math.sin(eCycle * Math.PI) * 9.5;
          ember.position.set(
            Math.cos(eAng) * eRad,
            calderaLocalY + 1.5 + eCycle * 38.0,
            Math.sin(eAng) * eRad
          );
          ember.rotation.set(elapsedTime * 2.2 + e, elapsedTime * 1.8, e);
        }
      }

      if (isWithinViewDistance(mainIslX, mainIslZ, playerX, playerZ, 135, VIEW_DISTANCE)) {
        skyCrystalMat.emissiveIntensity = 1.9 + Math.sin(elapsedTime * 2.4) * 0.45;
        // Animate cascading sky-waterfall rings & plunge pool mist
        for (let r = 0; r < waterfallRings.length; r++) {
          const fallT = (elapsedTime * 0.42 + r / waterfallRings.length) % 1.0;
          const ring = waterfallRings[r];
          ring.position.y = wfTopY - fallT * wfHeight;
          ring.scale.setScalar(0.82 + fallT * 0.52);
        }
        for (let m = 0; m < waterfallMistPuffs.length; m++) {
          const mAng = (m / waterfallMistPuffs.length) * Math.PI * 2 + elapsedTime * 0.55;
          const puff = waterfallMistPuffs[m];
          puff.position.x = wfX + Math.cos(mAng) * (3.4 + Math.sin(elapsedTime * 2.0 + m) * 0.6);
          puff.position.z = wfZ + Math.sin(mAng) * (3.4 + Math.cos(elapsedTime * 2.0 + m) * 0.6);
          puff.position.y = wfFootY + 1.1 + Math.abs(Math.sin(elapsedTime * 1.8 + m)) * 1.6;
        }
        // Animate Astral Observatory Orrery & Floating Sky Lanterns
        orreryRing1.rotation.y = elapsedTime * 0.65;
        orreryRing1.rotation.x = Math.sin(elapsedTime * 0.4) * 0.45;
        orreryRing2.rotation.z = -elapsedTime * 0.95;
        orreryCore.rotation.y = elapsedTime * 1.4;
        for (let l = 0; l < skyLanterns.length; l++) {
          const sl = skyLanterns[l];
          sl.mesh.position.y = sl.baseY + Math.sin(elapsedTime * 1.5 + sl.phase) * 0.85;
          sl.mesh.rotation.y = elapsedTime * 0.8 + sl.phase;
        }
        // Animate Celestial Sky-Guards:
        // - Gate guards hold their long halberd-spears crossed in an "X" blocking the gateway
        //   until the player gets very close (distToGate < 4.5m), then smoothly uncross & raise them upright to salute!
        for (let g = 0; g < skyGuards.length; g++) {
          const gd = skyGuards[g];
          gd.cape.rotation.x = 0.16 + Math.sin(elapsedTime * 3.2 + gd.phaseOffset) * 0.08;
          if (gd.patrolAxis !== 'none' && gd.patrolRadius > 0) {
            const pPhase = elapsedTime * 0.42 + gd.phaseOffset;
            const offset = Math.sin(pPhase) * gd.patrolRadius;
            const dirSign = Math.cos(pPhase) >= 0 ? 1 : -1;
            if (gd.patrolAxis === 'x') {
              gd.root.position.x = gd.homeX + offset;
              gd.root.rotation.y = dirSign > 0 ? Math.PI / 2 : -Math.PI / 2;
            } else {
              gd.root.position.z = gd.homeZ + offset;
              gd.root.rotation.y = dirSign > 0 ? 0 : Math.PI;
            }
            const stride = Math.sin(elapsedTime * 5.2 + gd.phaseOffset) * 0.45;
            gd.leftLeg.rotation.x = stride;
            gd.rightLeg.rotation.x = -stride;
            gd.leftArm.rotation.x = -stride * 0.55;
            gd.rightArm.rotation.x = stride * 0.45;
          } else if (gd.isGateGuard) {
            const distToGate = Math.hypot(playerX - gd.gateCenterX, playerZ - gd.gateCenterZ);
            // Smoothly transition from 0 (crossed "X" barrier) when distToGate >= 4.5m to 1 (uncrossed upright salute) when distToGate <= 2.9m
            const openBlend = Math.max(0, Math.min(1, (4.5 - distToGate) / 1.6));
            const smoothOpen = openBlend * openBlend * (3.0 - 2.0 * openBlend);
            // When closed (smoothOpen = 0), tilt each gate guard's inner weaponArm across the gateway by ~55 deg (0.96 rad) so the two halberds cross in an "X"
            const crossedRotZ = (gd.gateSide === -1 ? -0.96 : 0.96) * (1.0 - smoothOpen);
            gd.weaponArm.rotation.z = crossedRotZ;
            gd.weaponArm.rotation.x = -0.18 * smoothOpen + Math.sin(elapsedTime * 2.2 + gd.phaseOffset) * 0.025;
            gd.weaponArm.position.y = 1.40 + smoothOpen * 0.22;
            gd.root.rotation.y = gd.baseYaw;
            gd.leftLeg.rotation.x = 0;
            gd.rightLeg.rotation.x = 0;
          } else {
            const distToPlayer = Math.hypot(playerX - gd.homeX, playerZ - gd.homeZ);
            if (distToPlayer < 6.5) {
              gd.rightArm.rotation.x = -0.55 + Math.sin(elapsedTime * 3.0) * 0.06;
              gd.root.rotation.y = Math.atan2(playerX - gd.homeX, playerZ - gd.homeZ);
            } else {
              gd.rightArm.rotation.x = Math.sin(elapsedTime * 1.8 + gd.phaseOffset) * 0.05;
              gd.root.rotation.y = gd.baseYaw;
            }
            gd.leftLeg.rotation.x = 0;
            gd.rightLeg.rotation.x = 0;
          }
        }
      }

      // Animate Celestial Wind-Ring & Thermal Launch Pads
      for (let i = 0; i < animatedGeyserRings.length; i++) {
        const item = animatedGeyserRings[i];
        const cycle = (elapsedTime * 0.65 + (item.ringIndex % 3) * 0.33) % 1.0;
        item.mesh.position.y = item.baseY + 0.35 + cycle * 2.2;
        item.mesh.scale.setScalar(1.05 - cycle * 0.45);
        item.mesh.rotation.z = elapsedTime * 1.8 + item.ringIndex;
      }
    },
  };
}
