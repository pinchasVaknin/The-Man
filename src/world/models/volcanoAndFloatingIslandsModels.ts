// ============================================================================
// MODULE: World / Models / Volcano Sanctum & Celestial Sky Archipelago (SRP)
// DESIGN: Procedural 3D landmark builders for the Western Volcano Sanctum
//         (lair of the Mystical CatLion) and High-Altitude Eastern Celestial
//         Sky Archipelago & Cloud-Climb Ascent.
// ============================================================================

import * as THREE from 'three';
import {
  VOLCANO_SANCTUM_POS,
  groundHeightAt,
  isVolcanoBossArenaLocked,
  isWithinViewDistance,
  VIEW_DISTANCE,
} from '../terrainMath';
import { perturbGeometryVertices } from '../builders/shaderAndMaterialBuilders';
import { buildCelestialSkyArchipelagoModels } from './celestialSkyArchipelagoBuilder';
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
 *          and the High-Altitude Celestial Sky Archipelago (y=54m..82m) entered via
 *          a Ground Astral Stargate Dock & 65-meter Helical Cloud-Crystal Ascent.
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
    distanceCulledObjects,
    lanternLights,
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
    const wz = VOLCANO_SANCTUM_POS.z + sinRHelper(bAng) * bRad;
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
    volcanoLight.visible = false;
    volcanoLight.userData.baseIntensity = 3.6;
    volcanoLight.position.set(0, 10.5, 0);
    volcanoGroup.add(volcanoLight);
    lanternLights.push(volcanoLight);
  }

  scene.add(volcanoGroup);
  distanceCulledObjects.push({
    obj: volcanoGroup,
    cx: VOLCANO_SANCTUM_POS.x,
    cz: VOLCANO_SANCTUM_POS.z,
    radius: 75,
  });

  // ==========================================================================
  // PART 2: HIGH-ALTITUDE CELESTIAL SKY ARCHIPELAGO & CLOUD-CLIMB ASCENT
  // ==========================================================================
  const { floatingIslandsGroup, updateCelestialSkyArchipelago } =
    buildCelestialSkyArchipelagoModels(ctx, obsidianMat, magmaCrystalMat);

  return {
    volcanoGroup,
    floatingIslandsGroup,
    updateVolcanoAndFloatingIslands: (elapsedTime: number, playerX: number, playerZ: number) => {
      if (
        isWithinViewDistance(
          VOLCANO_SANCTUM_POS.x,
          VOLCANO_SANCTUM_POS.z,
          playerX,
          playerZ,
          135,
          VIEW_DISTANCE
        )
      ) {
        const pulse = 2.15 + Math.sin(elapsedTime * 3.4) * 0.5;
        magmaMat.emissiveIntensity = pulse;
        if (volcanoLight) {
          volcanoLight.userData.baseIntensity = 3.2 + Math.sin(elapsedTime * 4.5) * 0.65;
        }
        const arenaLocked = isVolcanoBossArenaLocked(playerX, playerZ);
        const targetGateY = arenaLocked ? 0.0 : 9.2;
        for (let gIdx = 0; gIdx < bossArenaLockGates.length; gIdx++) {
          const gate = bossArenaLockGates[gIdx];
          gate.position.y += (targetGateY - gate.position.y) * 0.18;
        }
        for (let i = 0; i < sanctumCrystals.length; i++) {
          sanctumCrystals[i].rotation.y = elapsedTime * 0.65 + i;
        }
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

      updateCelestialSkyArchipelago(elapsedTime, playerX, playerZ);
    },
  };
}

function sinRHelper(ang: number): number {
  return Math.sin(ang);
}
