// ============================================================================
// MODULE: World / Builders / Ancient Mine
// DESIGN: Landmarks sized from the layout (golem fixture, surfaces, lava pool, stones, island,
//         POIs). The golem and the dragon head are merged multi-part geometries; lava and
//         flames use scrolling canvas textures and emissive pulses for motion.
// SUMMARY: Builds the deep level: the stone golem guardian and its chamber (gates, rune
//          circle, chains, alcoves), the ancient passage, and the Dragon Forge with the
//          dragon-head furnace, pouring lava, channels, basalt, glowing cracks, the stepping
//          stones and the treasure chest.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import { sampleAncientMineFloor } from '../../domain/landmarks/ancientMine/ancientMineFloor';
import {
  LAVA_STEPPING_STONES,
  MINE_LEVEL_Y,
  MINE_POI,
  MINE_SOLID_FIXTURES,
  MINE_SURFACES,
  TREASURE_ISLAND,
} from '../../domain/landmarks/ancientMine/ancientMineLayout';
import { isAnimalModelLoaded, loadAnimalModel } from '../../models/animalModelAssets';
import { createReadyDemonDragon } from '../../models/DemonDragon';
import { createReadyForestDragon } from '../../models/ForestDragon';
import { box, cyl, mergeParts, part, type IPart } from './propGeometries';
import type { ISetPieceContext, ISetPieceUpdate } from './upperLevelSetPieces';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants
const LEDGE = MINE_LEVEL_Y.chasmLedge;
const FORGE = MINE_LEVEL_Y.forgeFloor;
const LAVA = MINE_LEVEL_Y.lavaSurface;

const GOLEM_STONE = 0x7a7468;
const GOLEM_DARK = 0x4a4540;
const GOLEM_IRON = 0x3d3d44;
const RUNE_BLUE = 0x5ad0ff;
const DRAGON_STONE = 0x2c2624;
const DRAGON_SCORCHED = 0x4a2418;
const GOLD = 0xd6a23e;

//** Summary: Central colossal Red DemonDragon head anchor on the forge's south wall. */
const CENTER_DRAGON = { lx: MINE_POI.dragonMouth.lx, wallLz: 451.5, headY: -35.8, scale: 46.0 } as const;

/** Summary: Z stations of the 3 side ForestDragon heads on each side wall, and the 4 structural pillars flanking them. */
const SIDE_DRAGON_LZS = [410, 428, 446] as const;
const SIDE_PILLAR_LZS = [401, 419, 437, 455] as const;
const SIDE_DRAGON_SCALE = 26.0;

/** Summary: Symmetrical skull, horns, jaw and upper neck bone indices of DemonDragon (excludes asymmetric spine/wings). */
const DEMON_HEAD_BONES: ReadonlySet<number> = new Set([19, 20, 21, 22, 23, 24]);

/** Summary: Neck column where hood sides connect (bone 23), cobra-hood flare (bone 32), upper neck (bone 33), skull/horns (bone 34), and lower jaw (bone 35) of ForestDragon. */
const FOREST_HEAD_BONES: ReadonlySet<number> = new Set([23, 32, 33, 34, 35]);

/** Summary: Wing and leg bone indices of ForestDragon that must never be pulled into the neck bust. */
const FOREST_EXCLUDED_LIMB_BONES: ReadonlySet<number> = new Set([
  24, 25, 26, 27, 28, 29, 30, 31, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
  51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65,
]);
// #endregion

// ======================== PUBLIC BUILD ======================== \\
// #region Build Deep Level
/**
 * Summary: Builds every deep-level set piece into the mine group.
 * @param ctx Group, shared materials, geometry ownership and torch helper.
 * @param textures Disposal list for the lava texture this builds.
 * @returns The animation update (golem breathing, rune and eye pulse, flames, lava flow).
 */
export function buildDeepLevelSetPieces(ctx: ISetPieceContext, textures: THREE.Texture[]): ISetPieceUpdate {
  const runeMat = new THREE.MeshBasicMaterial({ color: RUNE_BLUE });
  const lavaMap = createLavaTexture();
  textures.push(lavaMap);
  const lavaMat = new THREE.MeshStandardMaterial({
    map: lavaMap,
    emissiveMap: lavaMap,
    emissive: 0xff5a10,
    emissiveIntensity: 1.75,
    roughness: 0.55,
    side: THREE.DoubleSide,
  });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.85 });
  const vertexStone = ctx.materials.statue;
  ctx.ownMaterial(runeMat, lavaMat, flameMat);

  const golem = buildGolem(ctx, vertexStone, runeMat);
  buildGolemChamber(ctx, runeMat);
  buildPassage(ctx);
  const { flames, cascades } = buildDragonForgeHeadsAndPillars(ctx, vertexStone, lavaMat, flameMat);
  buildForgeFloor(ctx, lavaMat);
  const umbrellaCascades = buildTreasure(ctx, lavaMat);
  cascades.push(...umbrellaCascades);
  buildRoyalTreasureVault(ctx);

  return (t: number): void => {
    golem.position.y = Math.sin(t * 1.1) * 0.06;
    golem.scale.y = 1 + Math.sin(t * 1.1) * 0.006;
    runeMat.color.setHSL(0.55, 1, 0.55 + Math.sin(t * 2.0) * 0.12);
    lavaMap.offset.set(Math.sin(t * 0.6) * 0.03, -t * 0.055);
    lavaMat.emissiveIntensity = 1.65 + Math.sin(t * 2.1) * 0.25;
    flames.forEach((f, i) => {
      f.scale.y = 1 + Math.sin(t * 9 + i * 1.9) * 0.25;
      f.scale.x = 1 + Math.sin(t * 7 + i) * 0.1;
    });
    cascades.forEach((c, i) => {
      const pulse = Math.sin(t * 4.2 + i * 1.3);
      c.scale.x = 1 + pulse * 0.06;
      c.scale.z = 1 - pulse * 0.05;
    });
  };
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Helpers
function addBox(ctx: ISetPieceContext, w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(ctx.own(new THREE.BoxGeometry(w, h, d)), m);
  mesh.position.set(x, y + h / 2, z);
  ctx.group.add(mesh);
  return mesh;
}

function fixture(id: string): (typeof MINE_SOLID_FIXTURES)[number] {
  const f = MINE_SOLID_FIXTURES.find((x) => x.id === id);
  if (f === undefined) throw new Error(`MINE_FIXTURE_MISSING: ${id}`);
  return f;
}

/** Summary: Orange-red lava with bright veins and flowing molten ribbons, tiled and scrolled to look molten. */
function createLavaTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const c = canvas.getContext('2d');
  if (c !== null) {
    c.fillStyle = '#6e1204';
    c.fillRect(0, 0, 128, 128);
    // Vertical molten flow ribbons so cascades look like liquid magma streams rather than static spots
    for (let s = 0; s < 10; s++) {
      const sx = ((s * 13 + 7) % 16) * 8;
      const grad = c.createLinearGradient(sx, 0, sx + 12, 0);
      grad.addColorStop(0, 'rgba(255,60,0,0)');
      grad.addColorStop(0.5, s % 2 === 0 ? 'rgba(255,195,50,0.65)' : 'rgba(255,110,15,0.55)');
      grad.addColorStop(1, 'rgba(255,60,0,0)');
      c.fillStyle = grad;
      c.fillRect(sx - 6, 0, 20, 128);
    }
    for (let i = 0; i < 90; i++) {
      const x = (i * 53) % 128;
      const y = (i * 29) % 128;
      const r = 4 + (i % 7) * 3;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, i % 3 === 0 ? '#fff6b0' : '#ff9e22');
      g.addColorStop(1, 'rgba(255,80,0,0)');
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Summary: Builds an organic, multi-ribbed, gravity-curving molten lava cascade geometry between a
 *          top spout `(0, 0, 0)` and a lower landing offset `(offsetX, -dropHeight, offsetZ)` so
 *          pouring lava looks like a living, billowing liquid waterfall instead of a rigid cylinder.
 */
function createSculptedLavaCascadeGeometry(
  topRadiusX: number,
  topRadiusZ: number,
  bottomRadiusX: number,
  bottomRadiusZ: number,
  dropHeight: number,
  offsetX: number,
  offsetZ: number,
  archBulgeZ: number,
  radialSegs = 20,
  heightSegs = 18
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= heightSegs; iy++) {
    const v = iy / heightSegs; // 0 at top mouth/spout, 1 at bottom impact
    // Parabolic gravity fall: gentle horizontal launch at top, accelerating downward
    const y = -v * dropHeight;
    const centerX = offsetX * Math.pow(v, 1.25);
    const centerZ = offsetZ * Math.pow(v, 1.25) + archBulgeZ * Math.sin(v * Math.PI);

    // Natural vena-contracta narrowing in mid-air followed by a wide splashing flare at the bottom
    const midPinch = 1.0 - 0.14 * Math.sin(v * Math.PI);
    const splashFlare = v > 0.78 ? 1.0 + Math.pow((v - 0.78) / 0.22, 1.6) * 0.48 : 1.0;
    const rxBase = (topRadiusX + (bottomRadiusX - topRadiusX) * v) * midPinch * splashFlare;
    const rzBase = (topRadiusZ + (bottomRadiusZ - topRadiusZ) * v) * midPinch * splashFlare;

    for (let ix = 0; ix <= radialSegs; ix++) {
      const u = ix / radialSegs;
      const theta = u * Math.PI * 2;
      // Organic longitudinal magma ribs and billowing surface waves
      const rib =
        1.0 +
        0.22 * Math.sin(theta * 5 + v * 9.5) +
        0.14 * Math.cos(theta * 3 - v * 7.0) +
        0.08 * Math.sin(theta * 8 + v * 14.0);
      const x = centerX + Math.cos(theta) * rxBase * rib;
      const z = centerZ + Math.sin(theta) * rzBase * rib;
      positions.push(x, y, z);
      uvs.push(u * 2.0, (1 - v) * 3.5);
    }
  }

  const stride = radialSegs + 1;
  for (let iy = 0; iy < heightSegs; iy++) {
    for (let ix = 0; ix < radialSegs; ix++) {
      const a = iy * stride + ix;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setIndex(indices);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}
// #endregion

// #region Golem
/**
 * Summary: The colossal stone guardian: hunched, long-armed, iron-jointed, runes and eyes aglow.
 * @returns The golem root, animated by a slow breathing motion.
 */
function buildGolem(ctx: ISetPieceContext, stone: THREE.Material, runeMat: THREE.Material): THREE.Group {
  const f = fixture('golem-body');
  const root = new THREE.Group();
  root.position.set(f.lx, 0, f.lz);
  // The guardian faces north, toward whoever comes through the gate.
  root.rotation.y = Math.PI;
  ctx.group.add(root);
  const B = f.baseY;
  const rock = (r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1): IPart => {
    const g = new THREE.DodecahedronGeometry(r, 0);
    g.scale(sx, sy, sz);
    return part(g, GOLEM_STONE, x, y, z);
  };
  const body: IPart[] = [
    box(1.9, 0.8, 2.5, GOLEM_DARK, -1.6, B, 0.3),
    box(1.9, 0.8, 2.5, GOLEM_DARK, 1.6, B, 0.3),
    cyl(0.95, 1.1, 3.0, GOLEM_STONE, -1.6, B + 2.3, 0, 8),
    cyl(0.95, 1.1, 3.0, GOLEM_STONE, 1.6, B + 2.3, 0, 8),
    cyl(1.15, 1.15, 0.4, GOLEM_IRON, -1.6, B + 2.4, 0, 10),
    cyl(1.15, 1.15, 0.4, GOLEM_IRON, 1.6, B + 2.4, 0, 10),
    box(4.4, 1.5, 2.6, GOLEM_STONE, 0, B + 3.6, 0),
    rock(2.9, 0, B + 6.6, 0.3, 1.05, 0.95, 0.75),
    rock(1.7, -1.4, B + 7.6, 0.9),
    rock(1.7, 1.4, B + 7.6, 0.9),
    rock(1.6, -3.2, B + 8.0, 0.1),
    rock(1.6, 3.2, B + 8.0, 0.1),
    cyl(1.0, 1.0, 0.5, GOLEM_IRON, -3.6, B + 7.0, 0.3, 10),
    cyl(1.0, 1.0, 0.5, GOLEM_IRON, 3.6, B + 7.0, 0.3, 10),
    part(new THREE.CylinderGeometry(0.75, 0.9, 2.8, 8), GOLEM_STONE, -3.9, B + 5.5, 0.4, 0.15, 0, 0.12),
    part(new THREE.CylinderGeometry(0.75, 0.9, 2.8, 8), GOLEM_STONE, 3.9, B + 5.5, 0.4, 0.15, 0, -0.12),
    cyl(0.95, 0.95, 0.45, GOLEM_IRON, -4.0, B + 4.1, 0.6, 10),
    cyl(0.95, 0.95, 0.45, GOLEM_IRON, 4.0, B + 4.1, 0.6, 10),
    cyl(0.95, 1.15, 2.6, GOLEM_STONE, -4.0, B + 2.7, 0.8, 8),
    cyl(0.95, 1.15, 2.6, GOLEM_STONE, 4.0, B + 2.7, 0.8, 8),
    rock(1.15, -4.0, B + 1.1, 1.0, 1.1, 0.9, 1.2),
    rock(1.15, 4.0, B + 1.1, 1.0, 1.1, 0.9, 1.2),
    box(1.9, 1.6, 1.7, GOLEM_STONE, 0, B + 8.6, 1.4),
    box(2.2, 0.45, 0.6, GOLEM_DARK, 0, B + 9.75, 2.15),
    // Cracks across the chest and shoulders.
    box(0.12, 2.2, 0.1, GOLEM_DARK, -0.8, B + 5.5, 2.45),
    box(1.6, 0.12, 0.1, GOLEM_DARK, 0.6, B + 6.8, 2.4),
    box(0.1, 1.4, 0.1, GOLEM_DARK, 3.4, B + 7.6, 1.5),
  ];
  const golem = new THREE.Mesh(ctx.own(mergeParts(body)), stone);
  root.add(golem);
  const runes: IPart[] = [
    box(0.2, 1.6, 0.06, RUNE_BLUE, 0, B + 5.4, 2.62),
    box(1.4, 0.18, 0.06, RUNE_BLUE, 0, B + 6.1, 2.62),
    box(0.18, 0.9, 0.06, RUNE_BLUE, -0.6, B + 5.0, 2.6),
    box(0.18, 0.9, 0.06, RUNE_BLUE, 0.6, B + 5.0, 2.6),
    box(0.16, 1.2, 0.06, RUNE_BLUE, -4.0, B + 2.3, 1.95),
    box(0.16, 1.2, 0.06, RUNE_BLUE, 4.0, B + 2.3, 1.95),
    // Eyes under the heavy brow.
    box(0.45, 0.28, 0.12, RUNE_BLUE, -0.5, B + 9.3, 2.27),
    box(0.45, 0.28, 0.12, RUNE_BLUE, 0.5, B + 9.3, 2.27),
  ];
  root.add(new THREE.Mesh(ctx.own(mergeParts(runes)), runeMat));
  ctx.addLight(f.lx, B + 9.3, f.lz - 3.5, 0x4aa8ff, 7);
  ctx.addLight(f.lx, B + 4, f.lz - 5, 0x3a90ff, 6);
  return root;
}
// #endregion

// #region Golem Chamber
/** Summary: Gate frames reaching all the way to the local ceiling, rune circle, protected doorway, ceiling chains and wall alcoves. */
function buildGolemChamber(ctx: ISetPieceContext, runeMat: THREE.Material): void {
  const m = ctx.materials;
  // Gate frame at lz = 313.6 where the tunnel opens into the Golem Chamber (chamber ceiling = -22.0).
  // Note: At lz = 300.4 (directly underneath the King's Balcony where the Golden King statue stands at y = -29.35),
  // keep the tunnel arch strictly below y = -30.0 so NO wall ever rises onto the King's Balcony!
  {
    const lz = 300.4;
    // Tunnel ceiling under King's Balcony is CEILING_Y.underBalcony = -30.20, width lx = -6..6.
    // Keep all arch pieces strictly disjoint in Y and strictly below y = -30.24 so nothing Z-fights with the balcony underside!
    const lintelTopY = -30.24;
    const lintelBottomY = -31.08;
    const goldSoffitBottomY = -31.28;
    const jambH = goldSoffitBottomY - (LEDGE + 0.02);
    for (const x of [-5.52, 5.52]) {
      addBox(ctx, 0.88, jambH, 1.68, m.stone, x, LEDGE + 0.02, lz);
    }
    addBox(ctx, 11.92, 0.2, 1.84, m.gold, 0, goldSoffitBottomY, lz);
    addBox(ctx, 11.88, lintelTopY - lintelBottomY, 1.72, m.darkStone, 0, lintelBottomY, lz);
  }
  {
    const lz = 313.6;
    const topCeilingY = -22.04;
    const collarBottomY = LEDGE + 7.34;
    const collarTopY = LEDGE + 7.60;
    for (const x of [-7.2, 7.2]) {
      addBox(ctx, 2.4, 7.32, 2.0, m.stone, x, LEDGE + 0.02, lz);
    }
    addBox(ctx, 16.8, collarTopY - collarBottomY, 2.26, m.gold, 0, collarBottomY, lz);
    addBox(ctx, 16.6, topCeilingY - collarTopY, 2.12, m.darkStone, 0, collarTopY, lz);
    for (let i = 0; i < 7; i++) addBox(ctx, 0.4, 0.7, 0.08, runeMat, -6 + i * 2, LEDGE + 7.85, lz - 1.12);
  }
  // Raised iron portcullis teeth in the chamber gate's lintel.
  for (let i = 0; i < 9; i++) addBox(ctx, 0.18, 1.2, 0.18, m.iron, -4.8 + i * 1.2, LEDGE + 6.2, 313.6);

  // Rune circle around the guardian.
  const g = fixture('golem-body');
  for (const r of [6.5, 8.2]) {
    const ring = new THREE.Mesh(ctx.own(new THREE.TorusGeometry(r, 0.12, 4, 48)), runeMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(g.lx, LEDGE + 0.04, g.lz);
    ctx.group.add(ring);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rune = addBox(ctx, 0.25, 0.04, 1.1, runeMat, g.lx + Math.sin(a) * 7.35, LEDGE + 0.02, g.lz + Math.cos(a) * 7.35);
    rune.rotation.y = a;
  }

  // The protected doorway into the ancient passage (lz = 353.6):
  // `ancient-passage` opening is lx = -5..5, ceilingY = -32.0 (which is LEDGE + 4.35).
  // `golem-chamber` ceiling is -22.0 (which is LEDGE + 14.35).
  // Make the jambs and over-door lintel span the entire height from the doorway top (LEDGE + 4.35) up to the chamber ceiling (LEDGE + 14.5)!
  const doorLz = 353.6;
  const chamberFullH = -22.0 - LEDGE + 0.2; // 14.55m
  for (const x of [-6.3, 6.3]) addBox(ctx, 2.6, chamberFullH, 2.4, m.stone, x, LEDGE, doorLz);
  addBox(ctx, 15.4, chamberFullH - 4.35, 2.6, m.darkStone, 0, LEDGE + 4.35, doorLz);
  addBox(ctx, 15.6, 0.26, 2.7, m.gold, 0, LEDGE + 4.3, doorLz);
  for (let i = 0; i < 6; i++) addBox(ctx, 0.5, 1.0, 0.08, runeMat, -5 + i * 2, LEDGE + 5.2, doorLz - 1.32);
  const crest = new THREE.Mesh(ctx.own(new THREE.OctahedronGeometry(1.5, 0)), m.gold);
  crest.scale.set(1.3, 1.0, 0.25);
  crest.position.set(0, LEDGE + 7.8, doorLz - 1.35);
  ctx.group.add(crest);
  for (const x of [-10.8, 10.8]) addBox(ctx, 4.4, 8.5, 0.7, m.darkStone, x, LEDGE, doorLz - 0.9);

  // Wall alcoves behind the braziers, and runic bands along both side walls.
  for (const [x, lz] of [[-29.9, 316.5], [-29.9, 334], [-29.9, 351.5], [29.9, 351.5]] as const) {
    addBox(ctx, 0.3, 4.2, 3.4, m.void, x, LEDGE + 0.4, lz);
    addBox(ctx, 0.5, 0.6, 4.2, m.stone, x, LEDGE + 4.6, lz);
  }
  for (const x of [-29.95, 29.95]) addBox(ctx, 0.08, 0.35, 38, runeMat, x, LEDGE + 6.5, 334);

  // Chains: hanging from the vault between the pillars, and loose ends swaying above the circle.
  const linkGeo = ctx.own(new THREE.TorusGeometry(0.16, 0.045, 4, 8));
  const matrices: THREE.Matrix4[] = [];
  const hang = (x: number, z: number, top: number, bottom: number): void => {
    const count = Math.round((top - bottom) / 0.38);
    for (let i = 0; i < count; i++) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, i % 2 ? Math.PI / 2 : 0, 0));
      matrices.push(new THREE.Matrix4().compose(new THREE.Vector3(x, top - i * 0.38, z), q, new THREE.Vector3(1, 1, 1)));
    }
  };
  const vault = -22.2;
  for (const [x, z] of [[-24, 322], [24, 322], [-24, 346], [24, 346]] as const) hang(x + Math.sign(x) * -2.6, z, vault, LEDGE + 9);
  for (const [x, z, len] of [[-5, 334, 9], [5, 344, 7], [-3, 348, 11], [6, 331, 6]] as const) hang(x, z, vault, vault - len);
  const chains = new THREE.InstancedMesh(linkGeo, m.iron, matrices.length);
  matrices.forEach((mx, i) => chains.setMatrixAt(i, mx));
  chains.instanceMatrix.needsUpdate = true;
  chains.computeBoundingSphere();
  ctx.group.add(chains);
}
// #endregion

// #region Ancient Passage
/** Summary: Pilasters, Dwarven banners and torches stepping down both walls of the passage, plus full-height arch into the Forge. */
function buildPassage(ctx: ISetPieceContext): void {
  const m = ctx.materials;
  for (let lz = 357; lz <= 381; lz += 6) {
    const floor = sampleAncientMineFloor(0, lz, LEDGE)?.height ?? FORGE;
    for (const x of [-4.75, 4.75]) {
      addBox(ctx, 0.5, -32 - floor, 0.9, m.stone, x, floor, lz);
    }
    ctx.addTorch(-4.3, floor + 2.8, lz, 0xff9a30, 5);
    ctx.addTorch(4.3, floor + 2.8, lz, 0xff9a30, 5);
  }
  // Arch into the Dragon Forge at the foot of the stairs (lz = 384.6):
  // `ancient-passage` ceiling is -32.0 (FORGE + 19.35); `dragon-forge` ceiling is -14.0 (FORGE + 37.35).
  // Extend jambs and over-door lintel all the way up to the Dragon Forge ceiling (-14.0) so there is no hole above the lintel!
  const forgeFullH = -14.0 - FORGE + 0.2; // 37.55m
  for (const x of [-6.2, 6.2]) addBox(ctx, 2.4, forgeFullH, 2.0, m.stone, x, FORGE, 384.6);
  addBox(ctx, 15.0, forgeFullH - 11.4, 2.2, m.darkStone, 0, FORGE + 11.4, 384.6);
  addBox(ctx, 15.2, 0.3, 2.35, m.gold, 0, FORGE + 11.3, 384.6);
}
// #endregion

// #region Dragon Forge Heads And Pillars
interface IBakedDragonHeadAsset {
  readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.Material;
}

/**
 * Summary: Computes the skinned vertex normal for vertex `vi` using the skeleton's current boneMatrices,
 *          preserving smooth GLB normals without flat-shading facet artifacts.
 */
function getSkinnedVertexNormal(
  mesh: THREE.SkinnedMesh,
  vi: number,
  target: THREE.Vector3
): THREE.Vector3 {
  const srcGeo = mesh.geometry;
  const normAttr = srcGeo.attributes.normal;
  if (normAttr === undefined) {
    return target.set(0, 1, 0);
  }
  const nx = normAttr.getX(vi);
  const ny = normAttr.getY(vi);
  const nz = normAttr.getZ(vi);

  const skinIndexAttr = srcGeo.attributes.skinIndex;
  const skinWeightAttr = srcGeo.attributes.skinWeight;
  const boneMatrices = mesh.skeleton?.boneMatrices;
  if (skinIndexAttr === undefined || skinWeightAttr === undefined || boneMatrices == null) {
    return target.set(nx, ny, nz).normalize();
  }

  const indices = [
    skinIndexAttr.getX(vi),
    skinIndexAttr.getY(vi),
    skinIndexAttr.getZ(vi),
    skinIndexAttr.getW(vi),
  ];
  const weights = [
    skinWeightAttr.getX(vi),
    skinWeightAttr.getY(vi),
    skinWeightAttr.getZ(vi),
    skinWeightAttr.getW(vi),
  ];

  let outX = 0;
  let outY = 0;
  let outZ = 0;
  for (let k = 0; k < 4; k++) {
    const w = weights[k];
    if (w <= 0.0001) continue;
    const base = indices[k] * 16;
    const m00 = boneMatrices[base + 0];
    const m10 = boneMatrices[base + 1];
    const m20 = boneMatrices[base + 2];
    const m01 = boneMatrices[base + 4];
    const m11 = boneMatrices[base + 5];
    const m21 = boneMatrices[base + 6];
    const m02 = boneMatrices[base + 8];
    const m12 = boneMatrices[base + 9];
    const m22 = boneMatrices[base + 10];
    outX += w * (m00 * nx + m01 * ny + m02 * nz);
    outY += w * (m10 * nx + m11 * ny + m12 * nz);
    outZ += w * (m20 * nx + m21 * ny + m22 * nz);
  }
  return target.set(outX, outY, outZ).normalize();
}

/**
 * Summary: Extracts a baked, symmetrically centered BufferGeometry of a dragon's head/neck/jaw subtree
 *          while preserving smooth skinned vertex normals.
 */
function bakeSkinnedHeadSubtree(
  mesh: THREE.SkinnedMesh,
  headBones: ReadonlySet<number>,
  scale: number,
  anchorX: number,
  anchorY: number,
  anchorZ: number
): THREE.BufferGeometry {
  const srcGeo = mesh.geometry;
  const indexAttr = srcGeo.index;
  const skinIndexAttr = srcGeo.attributes.skinIndex;
  const uvAttr = srcGeo.attributes.uv;
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const pushVertex = (vi: number): void => {
    mesh.getVertexPosition(vi, v);
    getSkinnedVertexNormal(mesh, vi, n);
    positions.push(
      (v.x - anchorX) * scale,
      (v.y - anchorY) * scale,
      (v.z - anchorZ) * scale
    );
    normals.push(n.x, n.y, n.z);
    if (uvAttr !== undefined) {
      uvs.push(uvAttr.getX(vi), uvAttr.getY(vi));
    } else {
      uvs.push(0, 0);
    }
  };

  if (indexAttr !== null) {
    for (let i = 0; i < indexAttr.count; i += 3) {
      const a = indexAttr.getX(i);
      const b = indexAttr.getX(i + 1);
      const c = indexAttr.getX(i + 2);
      const ba = skinIndexAttr.getX(a);
      const bb = skinIndexAttr.getX(b);
      const bc = skinIndexAttr.getX(c);
      if (headBones.has(ba) && headBones.has(bb) && headBones.has(bc)) {
        pushVertex(a);
        pushVertex(b);
        pushVertex(c);
      }
    }
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  out.computeBoundingSphere();
  return out;
}

/**
 * Summary: Builds the colossal baked open-jaw Red DemonDragon head for the center furnace.
 */
function bakeDemonDragonHeadNow(ctx: ISetPieceContext): IBakedDragonHeadAsset {
  const demon = createReadyDemonDragon();
  demon.rig.resetToRest();
  if (demon.rig.bones[23] !== undefined) {
    demon.rig.bones[23].quaternion.set(-0.55, 0, 0, 0.835).normalize();
  }
  demon.object.updateMatrixWorld(true);
  demon.mesh.skeleton.update();

  // Exact skull symmetry plane of DemonDragon: anchorX = -0.0942, anchorY = 0.54, anchorZ = 0.82.
  const geometry = ctx.own(
    bakeSkinnedHeadSubtree(demon.mesh, DEMON_HEAD_BONES, CENTER_DRAGON.scale, -0.0942, 0.54, 0.82)
  );
  const rawMat = Array.isArray(demon.mesh.material) ? demon.mesh.material[0] : demon.mesh.material;
  const mat = rawMat.clone() as THREE.MeshStandardMaterial;
  mat.roughness = 0.42;
  mat.metalness = 0.28;
  mat.emissive = new THREE.Color(0x4a1204);
  mat.emissiveIntensity = 0.52;
  ctx.ownMaterial(mat);
  demon.dispose();
  return { geometry, material: mat };
}

/**
 * Summary: Builds the baked open-jaw ForestDragon head & cobra-hood bust statue for the 6 side pedestals.
 * Design:
 * - Poses the lower jaw bone (`bones[35]`) using the authentic open-mouth quaternion `(0.813, 0.582, 0, 0)`
 *   from the ForestDragon `'roar'` animation clip, with zero manual vertex smearing.
 * - Includes the full head, golden horns, flared green cobra hood, and neck (`FOREST_HEAD_BONES = 23, 32, 33, 34, 35`)
 *   all the way down to where the flared hood sides connect to the neck column (`y = 0.418..0.44`),
 *   matching the reference bust silhouette.
 * - Preserves smooth skinned GLB vertex normals (`getSkinnedVertexNormal`) so the scales, horns, and jaw
 *   render with smooth studio shading.
 */
function bakeForestDragonHeadNow(ctx: ISetPieceContext): IBakedDragonHeadAsset {
  const forest = createReadyForestDragon();
  forest.rig.resetToRest();
  // Apply the open-mouth jaw pose from the ForestDragon 'roar' animation clip (frames 9..12)
  if (forest.rig.bones[35] !== undefined) {
    forest.rig.bones[35].quaternion.set(0.813097, 0.582128, 0, 0).normalize();
  }
  forest.object.updateMatrixWorld(true);
  forest.mesh.skeleton.update();

  const srcGeo = forest.mesh.geometry;
  const indexAttr = srcGeo.index;
  const skinIndexAttr = srcGeo.attributes.skinIndex;
  const skinWeightAttr = srcGeo.attributes.skinWeight;
  const uvAttr = srcGeo.attributes.uv;
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const n = new THREE.Vector3();

  // Anchor at the symmetry plane (anchorX = -0.0392), neck cut line right where the flared green hood sides
  // connect to the neck (anchorY = 0.52), and center of the neck cross-section (anchorZ = 0.235).
  const anchorX = -0.0392;
  const anchorY = 0.52;
  const anchorZ = 0.235;

  const isHeadNeckVertex = (vi: number): boolean => {
    const idx = [
      skinIndexAttr.getX(vi),
      skinIndexAttr.getY(vi),
      skinIndexAttr.getZ(vi),
      skinIndexAttr.getW(vi),
    ];
    const w =
      skinWeightAttr !== undefined
        ? [
            skinWeightAttr.getX(vi),
            skinWeightAttr.getY(vi),
            skinWeightAttr.getZ(vi),
            skinWeightAttr.getW(vi),
          ]
        : [1, 0, 0, 0];

    let headNeckWeight = 0;
    for (let k = 0; k < 4; k++) {
      if (w[k] > 0.01 && FOREST_EXCLUDED_LIMB_BONES.has(idx[k])) {
        return false;
      }
      if (FOREST_HEAD_BONES.has(idx[k])) {
        headNeckWeight += w[k];
      }
    }
    return headNeckWeight >= 0.08;
  };

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  const pushBustVertex = (vi: number, pos: THREE.Vector3): void => {
    getSkinnedVertexNormal(forest.mesh, vi, n);
    positions.push(
      (pos.x - anchorX) * SIDE_DRAGON_SCALE,
      (pos.y - anchorY) * SIDE_DRAGON_SCALE,
      (pos.z - anchorZ) * SIDE_DRAGON_SCALE
    );
    normals.push(n.x, n.y, n.z);
    if (uvAttr !== undefined) {
      uvs.push(uvAttr.getX(vi), uvAttr.getY(vi));
    } else {
      uvs.push(0, 0);
    }
  };

  if (indexAttr !== null) {
    for (let i = 0; i < indexAttr.count; i += 3) {
      const a = indexAttr.getX(i);
      const b = indexAttr.getX(i + 1);
      const c = indexAttr.getX(i + 2);
      if (!isHeadNeckVertex(a) || !isHeadNeckVertex(b) || !isHeadNeckVertex(c)) {
        continue;
      }
      forest.mesh.getVertexPosition(a, vA);
      forest.mesh.getVertexPosition(b, vB);
      forest.mesh.getVertexPosition(c, vC);
      // Trim the lower neck stalk right where the flared cobra hood sides connect to the neck (y >= 0.508),
      // while keeping 100% of the open lower jaw in front (z >= 0.30).
      const keepA = vA.y >= 0.508 || vA.z >= 0.30 ? 1 : 0;
      const keepB = vB.y >= 0.508 || vB.z >= 0.30 ? 1 : 0;
      const keepC = vC.y >= 0.508 || vC.z >= 0.30 ? 1 : 0;
      if (keepA + keepB + keepC >= 2) {
        pushBustVertex(a, vA);
        pushBustVertex(b, vB);
        pushBustVertex(c, vC);
      }
    }
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  out.computeBoundingSphere();

  const geometry = ctx.own(out);
  const rawMat = Array.isArray(forest.mesh.material) ? forest.mesh.material[0] : forest.mesh.material;
  const mat = rawMat.clone() as THREE.MeshStandardMaterial;
  mat.roughness = 0.45;
  mat.metalness = 0.18;
  mat.emissive = new THREE.Color(0x1f1408);
  mat.emissiveIntensity = 0.28;
  mat.side = THREE.DoubleSide;
  ctx.ownMaterial(mat);
  forest.dispose();
  return { geometry, material: mat };
}

/**
 * Summary: Builds the Dragon Forge's enlarged central Red DemonDragon head (scale = 46.0, with pure
 *          molten lava inside its orbital eye sockets), the side pillars, and the 6 cobra-hood
 *          ForestDragon head statues with wide-open jaws pouring sculpted multi-layer molten cascades.
 */
function buildDragonForgeHeadsAndPillars(
  ctx: ISetPieceContext,
  vertexStone: THREE.Material,
  lavaMat: THREE.Material,
  flameMat: THREE.Material
): { flames: THREE.Mesh[]; cascades: THREE.Object3D[] } {
  const m = ctx.materials;
  const flames: THREE.Mesh[] = [];
  const cascades: THREE.Object3D[] = [];

  // Pure molten lava eye materials for the central Red Dragon (no X/plus cross-planes).
  const eyeOuterMat = new THREE.MeshBasicMaterial({ color: 0xff2600, fog: false });
  const eyeMidMat = new THREE.MeshBasicMaterial({ color: 0xff8c00, fog: false });
  const eyeCoreMat = new THREE.MeshBasicMaterial({ color: 0xffea75, fog: false });
  ctx.ownMaterial(eyeOuterMat, eyeMidMat, eyeCoreMat);

  const eyeSphereGeo = ctx.own(new THREE.SphereGeometry(1, 12, 10));
  const flameGeo = ctx.own(new THREE.ConeGeometry(0.85, 3.0, 6));

  // 1) COLOSSAL CENTRAL RED DEMON-DRAGON HEAD ON THE SOUTH SHRINE (lx = 0, wallLz = 451.5, headY = -35.8, scale = 46.0)
  const { lx, wallLz, headY, scale } = CENTER_DRAGON;
  // Grand obsidian & gold furnace shrine rising from the lava bed to frame the colossal Red Dragon head.
  addBox(ctx, 34, 36, 6.0, m.darkStone, lx, MINE_LEVEL_Y.lavaBed, wallLz + 3.2);
  addBox(ctx, 30, 1.5, 6.6, m.gold, lx, headY + 11.8, wallLz + 3.0);
  addBox(ctx, 30, 1.3, 6.6, m.gold, lx, headY - 8.5, wallLz + 3.0);
  for (const sideX of [-14.5, 14.5]) {
    addBox(ctx, 3.2, 34, 6.6, m.stone, lx + sideX, MINE_LEVEL_Y.lavaBed + 1, wallLz + 3.0);
    addBox(ctx, 3.6, 0.95, 7.0, m.gold, lx + sideX, headY + 4.0, wallLz + 3.0);
  }

  const centerFallbackGeo = ctx.own(
    mergeParts([
      box(16, 10, 16, DRAGON_STONE, 0, 0, 5),
      box(11, 4.8, 13, DRAGON_SCORCHED, 0, 1.8, 9.5),
      box(9.5, 3.0, 12, DRAGON_STONE, 0, -4.2, 9.5),
    ])
  );
  const centerGroup = new THREE.Group();
  centerGroup.name = 'ancient-mine-center-demon-dragon-head';
  centerGroup.position.set(lx, headY, wallLz);
  centerGroup.rotation.y = Math.PI;
  ctx.group.add(centerGroup);

  const centerHeadMesh = new THREE.Mesh(centerFallbackGeo, vertexStone);
  centerHeadMesh.frustumCulled = false;
  centerGroup.add(centerHeadMesh);

  if (isAnimalModelLoaded('demon-dragon')) {
    const baked = bakeDemonDragonHeadNow(ctx);
    centerHeadMesh.geometry = baked.geometry;
    centerHeadMesh.material = baked.material;
  } else if (typeof window !== 'undefined') {
    loadAnimalModel('demon-dragon')
      .then(() => {
        const baked = bakeDemonDragonHeadNow(ctx);
        centerHeadMesh.geometry = baked.geometry;
        centerHeadMesh.material = baked.material;
      })
      .catch(() => {});
  }

  // Pure molten lava nestled strictly inside the Red DemonDragon's orbital eye sockets:
  // Measured socket coordinates on DemonDragon: symX = ±0.047, rawY = 0.580, rawZ = 1.028.
  const eyeX = 0.047 * scale;
  const eyeY = (0.580 - 0.540) * scale;
  const eyeZ = (1.028 - 0.820) * scale;
  for (const side of [-1, 1] as const) {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * eyeX, eyeY, eyeZ);
    eyeGroup.rotation.y = side * 0.28;
    centerGroup.add(eyeGroup);

    const outer = new THREE.Mesh(eyeSphereGeo, eyeOuterMat);
    outer.scale.set(0.55, 0.36, 0.45);
    eyeGroup.add(outer);

    const mid = new THREE.Mesh(eyeSphereGeo, eyeMidMat);
    mid.scale.set(0.42, 0.26, 0.36);
    mid.position.set(side * 0.06, 0, 0.1);
    eyeGroup.add(mid);

    const core = new THREE.Mesh(eyeSphereGeo, eyeCoreMat);
    core.scale.set(0.26, 0.17, 0.24);
    core.position.set(side * 0.1, 0, 0.16);
    eyeGroup.add(core);
  }

  // Molten furnace glow & sculpted lava tongue inside the enlarged open DemonDragon jaws
  const centerThroatGlow = new THREE.Mesh(ctx.own(new THREE.SphereGeometry(2.15, 14, 12)), m.molten);
  centerThroatGlow.scale.set(1.12, 0.85, 1.45);
  centerThroatGlow.position.set(0, -2.3, 7.5);
  centerThroatGlow.name = 'ancient-mine-dragon-fire';
  centerGroup.add(centerThroatGlow);

  const centerTongue = new THREE.Mesh(
    ctx.own(createSculptedLavaCascadeGeometry(1.35, 0.55, 1.55, 0.72, 2.2, 0, 3.2, 0.45, 16, 10)),
    lavaMat
  );
  centerTongue.position.set(0, -2.1, 6.6);
  centerGroup.add(centerTongue);

  // Sculpted multi-layered molten lava cascade pouring from inside the Red Dragon's wide-open mouth
  // (mine z = 441.7, y = -39.5) down onto the Chest Deflector Canopy ("Umbrella") apex (mine z = 438.6, y = -44.0)!
  const mouthWorldZ = wallLz - 9.8; // 441.7
  const mouthWorldY = headY - 3.7; // -39.5
  const canopyApexZ = TREASURE_ISLAND.lz + 0.6; // 438.6
  const canopyApexY = -44.0;
  const mainDropH = mouthWorldY - canopyApexY + 0.35;
  const mainOffsetZ = canopyApexZ - mouthWorldZ;

  const mainCascadeGroup = new THREE.Group();
  mainCascadeGroup.position.set(lx, mouthWorldY, mouthWorldZ);
  ctx.group.add(mainCascadeGroup);

  const mainOuterCascade = new THREE.Mesh(
    ctx.own(
      createSculptedLavaCascadeGeometry(1.38, 1.05, 1.95, 1.55, mainDropH, 0, mainOffsetZ, -0.75, 22, 18)
    ),
    lavaMat
  );
  mainCascadeGroup.add(mainOuterCascade);

  const mainInnerCore = new THREE.Mesh(
    ctx.own(
      createSculptedLavaCascadeGeometry(0.95, 0.72, 1.35, 1.08, mainDropH, 0, mainOffsetZ, -0.75, 16, 14)
    ),
    m.molten
  );
  mainCascadeGroup.add(mainInnerCore);
  cascades.push(mainCascadeGroup);

  for (let i = 0; i < 5; i++) {
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.userData.isAnimated = true;
    flame.position.set(lx - 2.2 + i * 1.1, mouthWorldY + 0.3, mouthWorldZ - 0.6);
    ctx.group.add(flame);
    flames.push(flame);
  }
  ctx.addLight(lx, headY - 1.0, wallLz - 11.5, 0xff5a18, 15);

  // 2) HANDSOME SIDE PILLARS & 6 COBRA-HOOD FOREST-DRAGON HEAD STATUES WITH WIDE-OPEN MOUTHS (3 WEST, 3 EAST)
  const sideFallbackGeo = ctx.own(
    mergeParts([
      box(4.4, 4.6, 4.8, DRAGON_STONE, 0, 1.2, 0.8),
      box(3.6, 2.2, 5.2, DRAGON_SCORCHED, 0, 1.8, 3.8),
      box(3.2, 1.2, 4.8, DRAGON_STONE, 0, 0.2, 3.4),
    ])
  );
  const sideHeadMeshes: THREE.Mesh[] = [];

  const pillarBaseY = MINE_LEVEL_Y.lavaBed;
  const pillarTopY = -14.5;
  const pillarH = pillarTopY - pillarBaseY;
  const pillarShaftGeo = ctx.own(new THREE.CylinderGeometry(1.85, 2.25, pillarH, 8));
  const pillarPedestalGeo = ctx.own(new THREE.CylinderGeometry(2.7, 3.0, 4.4, 8));
  const pillarRingGeo = ctx.own(new THREE.CylinderGeometry(2.25, 2.25, 0.52, 8));
  const pillarCapitalGeo = ctx.own(new THREE.CylinderGeometry(2.9, 1.95, 2.6, 8));

  const sideThroatGeo = ctx.own(new THREE.SphereGeometry(0.45, 12, 10));
  const sideSplashGeo = ctx.own(new THREE.TorusGeometry(1.55, 0.26, 6, 20));
  const sideSplashInnerGeo = ctx.own(new THREE.CylinderGeometry(1.35, 1.65, 0.28, 14));
  // Vertical octagonal stone-and-gold neck socket collar on top of the pedestal where the dragon's neck base connects
  const bustCollarGeo = ctx.own(new THREE.CylinderGeometry(2.25, 2.65, 1.15, 8));
  const bustGoldTrimGeo = ctx.own(new THREE.CylinderGeometry(2.45, 2.45, 0.32, 8));

  // With SIDE_DRAGON_SCALE = 26.0 and anchor = (-0.0392, 0.52, 0.235):
  // - Neck cut line where the green hood sides connect (y = 0.508..0.52) sits at localY = -0.31..0.0, localZ = 0.0
  // - Upper snout tip (y = 0.558, z = 0.453) is at localY = +0.99, localZ = +5.67
  // - Open lower jaw tip from 'roar' clip (y = 0.494, z = 0.419) is at localY = -0.68, localZ = +4.78
  // - Open mouth center is at localY = +0.18, localZ = +4.65
  const sideMouthLocalY = 0.18;
  const sideMouthLocalZ = 4.65;
  const mountY = -33.85;
  const sideMouthWorldY = mountY + sideMouthLocalY; // -33.67
  const sideFallH = sideMouthWorldY - LAVA + 0.35; // ~19.3m tall cascade!
  const sideCascadeOuterGeo = ctx.own(
    createSculptedLavaCascadeGeometry(0.48, 0.40, 1.32, 1.18, sideFallH, 0, 1.45, 0.55, 18, 18)
  );
  const sideCascadeCoreGeo = ctx.own(
    createSculptedLavaCascadeGeometry(0.30, 0.25, 0.85, 0.75, sideFallH, 0, 1.45, 0.55, 14, 14)
  );
  const sideMouthPourGeo = ctx.own(
    createSculptedLavaCascadeGeometry(0.38, 0.28, 0.48, 0.40, 0.95, 0, 0.85, 0.18, 14, 8)
  );

  for (const side of [-1, 1] as const) {
    const wallX = side * 44.2;
    const inwardSign = -side; // +1 on west wall (facing east), -1 on east wall (facing west)
    const headYaw = side === -1 ? Math.PI / 2 : -Math.PI / 2;

    // Upper architectural cornice beam tying the pillars together along the enlarged side wall.
    addBox(ctx, 3.0, 2.0, 62, m.darkStone, wallX, pillarTopY - 2.0, 428);
    addBox(ctx, 3.3, 0.5, 62, m.gold, wallX, pillarTopY - 2.3, 428);

    // 4 Grand structural Dwarven columns along each side wall.
    for (const plz of SIDE_PILLAR_LZS) {
      const pGroup = new THREE.Group();
      pGroup.position.set(wallX, 0, plz);
      ctx.group.add(pGroup);

      const pedestal = new THREE.Mesh(pillarPedestalGeo, m.darkStone);
      pedestal.position.set(0, pillarBaseY + 2.2, 0);
      pGroup.add(pedestal);

      const shaft = new THREE.Mesh(pillarShaftGeo, m.stone);
      shaft.position.set(0, pillarBaseY + pillarH / 2, 0);
      pGroup.add(shaft);

      const capital = new THREE.Mesh(pillarCapitalGeo, m.darkStone);
      capital.position.set(0, pillarTopY - 1.3, 0);
      pGroup.add(capital);

      for (const bandY of [-48.5, -39.0, -29.5, -20.0]) {
        const ring = new THREE.Mesh(pillarRingGeo, m.gold);
        ring.position.set(0, bandY, 0);
        pGroup.add(ring);
      }

      const lavaRim = new THREE.Mesh(sideSplashGeo, m.molten);
      lavaRim.rotation.x = -Math.PI / 2;
      lavaRim.scale.setScalar(1.85);
      lavaRim.position.set(0, LAVA + 0.05, 0);
      pGroup.add(lavaRim);
    }

    // 3 Monumental Dragon Bust Pedestals per side (6 total) bearing the Cobra-Hood ForestDragon Head Statues!
    for (const dlz of SIDE_DRAGON_LZS) {
      const platX = side * 41.8;
      const platTopY = -41.5;
      const platH = platTopY - pillarBaseY;

      // Lower foundation platform rising out of the lava pool (y: -55.85 .. -41.5).
      addBox(ctx, 8.2, platH - 0.6, 8.8, m.darkStone, platX, pillarBaseY, dlz);
      addBox(ctx, 8.8, 0.6, 9.4, m.gold, platX, platTopY - 0.6, dlz);
      addBox(ctx, 8.6, 0.5, 9.2, m.gold, platX, LAVA + 0.3, dlz);

      // Stepped stone-and-gold Dragon Bust Pedestal rising from the platform up to y = -33.9
      const towerX = side * 41.6;
      addBox(ctx, 6.8, 3.8, 7.2, m.stone, towerX, platTopY, dlz);
      addBox(ctx, 7.2, 0.45, 7.6, m.gold, towerX, platTopY + 3.8, dlz);
      addBox(ctx, 5.8, 2.8, 6.2, m.darkStone, towerX, platTopY + 4.25, dlz);
      addBox(ctx, 6.3, 0.55, 6.6, m.gold, towerX, platTopY + 7.05, dlz);

      const seatX = side * 41.2;
      const mountGroup = new THREE.Group();
      mountGroup.name = `ancient-mine-side-dragon-${side < 0 ? 'west' : 'east'}-${dlz}`;
      mountGroup.position.set(seatX, mountY, dlz);
      mountGroup.rotation.y = headYaw;
      ctx.group.add(mountGroup);

      // Vertical stone-and-gold neck socket collar cupping the base of the dragon neck right where the hood sides connect
      const bustCollar = new THREE.Mesh(bustCollarGeo, m.darkStone);
      bustCollar.position.set(0, -0.35, 0.0);
      mountGroup.add(bustCollar);

      const bustGoldRing = new THREE.Mesh(bustGoldTrimGeo, m.gold);
      bustGoldRing.position.set(0, 0.05, 0.0);
      mountGroup.add(bustGoldRing);

      // Baked ForestDragon cobra-hood bust statue with wide-open jaws from 'roar' animation.
      const headMesh = new THREE.Mesh(sideFallbackGeo, vertexStone);
      headMesh.frustumCulled = false;
      mountGroup.add(headMesh);
      sideHeadMeshes.push(headMesh);

      // Molten fire core & pouring lava tongue tucked deep inside the open mouth cavity (between upper snout y=+0.99 and lower jaw y=-0.68).
      const throat = new THREE.Mesh(sideThroatGeo, m.molten);
      throat.scale.set(0.75, 0.58, 1.05);
      throat.position.set(0, 0.22, 3.85);
      mountGroup.add(throat);

      const mouthPour = new THREE.Mesh(sideMouthPourGeo, lavaMat);
      mouthPour.position.set(0, 0.20, 4.05);
      mountGroup.add(mouthPour);

      // Sculpted multi-layer molten lava cascade pouring from inside the open jaws down into the lava pool!
      const sideCascadeGroup = new THREE.Group();
      sideCascadeGroup.position.set(0, sideMouthLocalY, sideMouthLocalZ);
      mountGroup.add(sideCascadeGroup);

      const sideFallOuter = new THREE.Mesh(sideCascadeOuterGeo, lavaMat);
      sideCascadeGroup.add(sideFallOuter);

      const sideFallCore = new THREE.Mesh(sideCascadeCoreGeo, m.molten);
      sideCascadeGroup.add(sideFallCore);
      cascades.push(sideCascadeGroup);

      // Glowing splash ring + churning molten mound where the cascade crashes into the lava pool.
      const splashX = seatX + inwardSign * (sideMouthLocalZ + 1.45);
      const splash = new THREE.Mesh(sideSplashGeo, m.molten);
      splash.rotation.x = -Math.PI / 2;
      splash.position.set(splashX, LAVA + 0.08, dlz);
      ctx.group.add(splash);

      const splashCore = new THREE.Mesh(sideSplashInnerGeo, lavaMat);
      splashCore.position.set(splashX, LAVA + 0.14, dlz);
      ctx.group.add(splashCore);

      const sideFlame = new THREE.Mesh(flameGeo, flameMat);
      sideFlame.userData.isAnimated = true;
      sideFlame.scale.setScalar(0.92);
      sideFlame.position.set(seatX + inwardSign * sideMouthLocalZ, sideMouthWorldY + 0.35, dlz);
      ctx.group.add(sideFlame);
      flames.push(sideFlame);
    }

    ctx.addLight(wallX + inwardSign * 10.5, -31.0, 428, 0xff5a14, 11.0);
  }

  if (isAnimalModelLoaded('forest-dragon')) {
    const baked = bakeForestDragonHeadNow(ctx);
    for (const hm of sideHeadMeshes) {
      hm.geometry = baked.geometry;
      hm.material = baked.material;
    }
  } else if (typeof window !== 'undefined') {
    loadAnimalModel('forest-dragon')
      .then(() => {
        const baked = bakeForestDragonHeadNow(ctx);
        for (const hm of sideHeadMeshes) {
          hm.geometry = baked.geometry;
          hm.material = baked.material;
        }
      })
      .catch(() => {});
  }

  return { flames, cascades };
}
// #endregion

// #region Forge Floor
/** Summary: Textured lava for every lava surface, basalt columns on the north shore, and stepping stones. */
function buildForgeFloor(ctx: ISetPieceContext, lavaMat: THREE.Material): void {
  const m = ctx.materials;
  for (const s of MINE_SURFACES) {
    if (s.material !== 'lava' || s.footprint.kind !== 'rect') continue;
    const f = s.footprint;
    const plane = new THREE.Mesh(ctx.own(new THREE.PlaneGeometry(f.maxLx - f.minLx, f.maxLz - f.minLz)), lavaMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set((f.minLx + f.maxLx) / 2, LAVA, (f.minLz + f.maxLz) / 2);
    plane.name = `ancient-mine-lava-${s.id}`;
    ctx.group.add(plane);
  }
  // Glowing cracks in the north landing floor along the pool edge.
  for (let i = 0; i < 12; i++) {
    const crack = addBox(ctx, 0.18, 0.03, 2.4 + (i % 3), m.molten, -32 + i * 5.8, FORGE + 0.005, 393.5);
    crack.rotation.y = ((i % 5) - 2) * 0.22;
  }
  // Stepping stones: hexagonal basalt pillars with a glowing rim where they meet the lava.
  for (const s of [...LAVA_STEPPING_STONES, TREASURE_ISLAND]) {
    const depth = s.topY - MINE_LEVEL_Y.lavaBed;
    const pillar = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(s.r, s.r * 1.08, depth, 6)), m.darkStone);
    pillar.position.set(s.lx, MINE_LEVEL_Y.lavaBed + depth / 2, s.lz);
    ctx.group.add(pillar);
    const top = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(s.r * 0.98, s.r * 0.98, 0.12, 6)), m.stone);
    top.position.set(s.lx, s.topY + 0.01, s.lz);
    ctx.group.add(top);
    const rim = new THREE.Mesh(ctx.own(new THREE.TorusGeometry(s.r * 1.05, 0.12, 4, 6)), m.molten);
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(s.lx, LAVA + 0.06, s.lz);
    ctx.group.add(rim);
  }
}
// #endregion

// #region Treasure & Deflector Canopy
/**
 * Summary: The ancient dwarven treasure chest on TREASURE_ISLAND, protected overhead by an ornate
 *          Obsidian & Gold Lava Deflector Canopy ("Umbrella") that catches the Red Dragon's lava stream
 *          and diverts it to the left and right sides into the lava river while leaving the front of
 *          the chest completely open and accessible.
 */
function buildTreasure(ctx: ISetPieceContext, lavaMat: THREE.Material): THREE.Object3D[] {
  const m = ctx.materials;
  const umbrellaCascades: THREE.Object3D[] = [];
  const f = fixture('treasure-chest');
  const IRON = 0x2a2a30;
  const lid = new THREE.CylinderGeometry(0.7, 0.7, 2.2, 14, 1, false, 0, Math.PI);
  const parts: IPart[] = [
    box(2.2, 0.9, 1.4, IRON, 0, 0, 0),
    part(lid, IRON, 0, 0.9, 0, 0, 0, Math.PI / 2),
    ...[-0.85, 0, 0.85].map((x) => box(0.16, 0.95, 1.46, GOLD, x, 0, 0)),
    ...[-0.85, 0, 0.85].map((x) => part(new THREE.CylinderGeometry(0.73, 0.73, 0.16, 14, 1, false, 0, Math.PI), GOLD, x, 0.9, 0, 0, 0, Math.PI / 2)),
    box(2.26, 0.12, 1.46, GOLD, 0, 0.85, 0),
    box(0.5, 0.55, 0.12, GOLD, 0, 0.5, 0.74),
    box(0.1, 0.22, 0.13, 0x111111, 0, 0.58, 0.75),
    ...[-1.08, 1.08].flatMap((x) => [-0.68, 0.68].map((z) => box(0.18, 0.18, 0.18, GOLD, x, 0, z))),
    part(new THREE.OctahedronGeometry(0.28, 0), GOLD, 0, 1.45, 0.45),
  ];
  const chest = new THREE.Mesh(ctx.own(mergeParts(parts)), m.statue);
  chest.position.set(f.lx, f.baseY + 0.07, f.lz);
  chest.rotation.y = Math.PI;
  ctx.group.add(chest);

  // Gold-lit pedestal ring on the island.
  const ring = new THREE.Mesh(ctx.own(new THREE.TorusGeometry(2.2, 0.15, 4, 24)), m.gold);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(f.lx, f.baseY + 0.08, f.lz);
  ctx.group.add(ring);
  ctx.addLight(f.lx, f.baseY + 3.2, f.lz - 1.5, 0xffd070, 9);

  // DWARVEN LAVA DEFLECTOR CANOPY ("UMBRELLA") ABOVE THE CHEST:
  // Supported only by two rear pillars behind the chest (lz = f.lz + 2.4) so the front approach (lz < f.lz) is 100% open!
  const canopyY = f.baseY + 5.75; // -44.4
  const canopyZ = f.lz + 0.4; // 438.4
  for (const side of [-1, 1] as const) {
    const colX = f.lx + side * 2.65;
    const colZ = f.lz + 2.35;
    addBox(ctx, 0.75, canopyY - f.baseY - 0.3, 0.75, m.darkStone, colX, f.baseY + 0.07, colZ);
    addBox(ctx, 0.95, 0.35, 0.95, m.gold, colX, f.baseY + 0.07, colZ);
    addBox(ctx, 0.95, 0.35, 0.95, m.gold, colX, canopyY - 0.65, colZ);
    // Cantilevered support bracket reaching forward from the rear pillar under the canopy roof.
    addBox(ctx, 0.55, 0.45, 3.8, m.iron, colX, canopyY - 0.55, f.lz + 0.8);
  }

  // Central gold apex finial & impact basin where the Red Dragon's lava stream strikes the umbrella.
  const impactBasin = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(1.85, 1.45, 0.48, 14)), m.molten);
  impactBasin.position.set(f.lx, canopyY + 0.45, canopyZ + 0.2);
  ctx.group.add(impactBasin);

  // Raised front shield rim (prevents lava from ever spilling forward toward the player / front of the chest).
  addBox(ctx, 7.6, 0.65, 0.48, m.gold, f.lx, canopyY - 0.05, canopyZ - 2.1);
  addBox(ctx, 7.6, 0.55, 0.45, m.darkStone, f.lx, canopyY - 0.05, canopyZ + 2.1);

  const splashGeo = ctx.own(new THREE.TorusGeometry(1.65, 0.24, 6, 18));

  // Left and right pitched canopy wings + side lava chutes + sculpted side waterfalls into the lava river.
  for (const side of [-1, 1] as const) {
    const wingGroup = new THREE.Group();
    wingGroup.position.set(f.lx + side * 2.4, canopyY, canopyZ);
    wingGroup.rotation.z = -side * 0.22; // Pitches downward toward the outer left/right sides
    ctx.group.add(wingGroup);

    const wingSlab = new THREE.Mesh(ctx.own(new THREE.BoxGeometry(5.2, 0.38, 4.4)), m.darkStone);
    wingGroup.add(wingSlab);

    const wingGoldTrim = new THREE.Mesh(ctx.own(new THREE.BoxGeometry(5.35, 0.16, 4.55)), m.gold);
    wingGoldTrim.position.set(0, -0.15, 0);
    wingGroup.add(wingGoldTrim);

    // Glowing molten lava sheet flowing sideways down the pitched umbrella wing.
    const wingLava = new THREE.Mesh(ctx.own(new THREE.BoxGeometry(4.9, 0.14, 3.2)), lavaMat);
    wingLava.position.set(side * 0.2, 0.24, 0.1);
    wingGroup.add(wingLava);

    // Sculpted side lava waterfall pouring off the outer tip of the umbrella down into the lava river!
    const pourX = f.lx + side * 4.95;
    const pourTopY = canopyY - 0.5;
    const sideStreamH = pourTopY - LAVA + 0.35;
    const sideCascadeGroup = new THREE.Group();
    sideCascadeGroup.position.set(pourX, pourTopY, canopyZ);
    ctx.group.add(sideCascadeGroup);

    const sideStreamOuter = new THREE.Mesh(
      ctx.own(
        createSculptedLavaCascadeGeometry(0.65, 0.92, 1.35, 1.45, sideStreamH, side * 1.15, 0, 0, 18, 14)
      ),
      lavaMat
    );
    sideCascadeGroup.add(sideStreamOuter);

    const sideStreamCore = new THREE.Mesh(
      ctx.own(
        createSculptedLavaCascadeGeometry(0.42, 0.62, 0.88, 0.95, sideStreamH, side * 1.15, 0, 0, 14, 12)
      ),
      m.molten
    );
    sideCascadeGroup.add(sideStreamCore);
    umbrellaCascades.push(sideCascadeGroup);

    // Glowing splash ring in the lava river on either side of the island (lx = ±6.1).
    const sideSplash = new THREE.Mesh(splashGeo, m.molten);
    sideSplash.rotation.x = -Math.PI / 2;
    sideSplash.position.set(f.lx + side * 6.1, LAVA + 0.07, canopyZ);
    ctx.group.add(sideSplash);
  }
  return umbrellaCascades;
}
// #endregion

// #region Secret Royal Treasure Vault
/**
 * Summary: Builds the Secret Passage & Royal Treasure Vault descending from the east side of the
 *          Dragon Forge entrance landing (lx: 46..56, lz: 386..472) into the underground Royal Vault
 *          (lx: -24..56, lz: 472..508, y = -63.35), filled with mountains of gold fed by the vertical
 *          Gold Chute from the Central Hub above, stacked silver ingots, and giant sparkling diamonds.
 */
function buildRoyalTreasureVault(ctx: ISetPieceContext): void {
  const m = ctx.materials;
  const V = MINE_LEVEL_Y.vaultFloor; // -63.35
  const CEIL = -42.0;
  const vaultH = CEIL - V; // 21.35m

  const silverMat = new THREE.MeshStandardMaterial({
    color: 0xdbe4ee,
    metalness: 0.92,
    roughness: 0.16,
    emissive: 0x1e293b,
    emissiveIntensity: 0.22,
  });
  const diamondMat = new THREE.MeshStandardMaterial({
    color: 0xb8f4ff,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.05,
    metalness: 0.15,
    roughness: 0.08,
    transparent: true,
    opacity: 0.94,
  });
  const rubyMat = new THREE.MeshStandardMaterial({
    color: 0xff2a4b,
    emissive: 0xd90429,
    emissiveIntensity: 0.82,
    metalness: 0.2,
    roughness: 0.12,
  });
  const emeraldMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x059669,
    emissiveIntensity: 0.78,
    metalness: 0.18,
    roughness: 0.12,
  });
  const royalCarpetMat = new THREE.MeshStandardMaterial({
    color: 0x7f1d1d,
    roughness: 0.82,
    metalness: 0.08,
    emissive: 0x2a0606,
    emissiveIntensity: 0.25,
  });
  ctx.ownMaterial(silverMat, diamondMat, rubyMat, emeraldMat, royalCarpetMat);

  // 1) SECRET PASSAGE ARCHWAY AT THE EAST END OF THE FORGE LANDING (lx = 46, lz = 386..396)
  const forgeFullH = -36.04 - FORGE;
  for (const z of [386.7, 395.3]) {
    addBox(ctx, 1.5, 4.48, 1.4, m.stone, 46.2, FORGE + 0.02, z);
    addBox(ctx, 1.72, 0.36, 1.62, m.gold, 46.2, FORGE + 4.5, z);
    addBox(ctx, 1.5, forgeFullH - 4.86, 1.4, m.stone, 46.2, FORGE + 4.86, z);
  }
  addBox(ctx, 1.88, 0.34, 10.2, m.gold, 46.2, FORGE + 9.06, 391.0);
  addBox(ctx, 1.72, forgeFullH - 9.4, 10.0, m.darkStone, 46.2, FORGE + 9.4, 391.0);
  ctx.addTorch(45.2, FORGE + 3.2, 387.5, 0xffb040, 6.5);
  ctx.addTorch(45.2, FORGE + 3.2, 394.5, 0xffb040, 6.5);

  // 2) TORCHES & ARCH RIBS ALONG THE SECRET VAULT STAIRS (lx = 48..56, lz = 396..472)
  for (let lz = 402; lz <= 466; lz += 16) {
    const stepFloor = sampleAncientMineFloor(52, lz, FORGE)?.height ?? V;
    const ribH = Math.max(10.8, -41.06 - stepFloor);
    for (const x of [48.38, 55.62]) {
      addBox(ctx, 0.56, 4.18, 0.86, m.stone, x, stepFloor + 0.02, lz);
      addBox(ctx, 0.72, 0.32, 1.04, m.gold, x, stepFloor + 4.2, lz);
      addBox(ctx, 0.56, ribH - 4.52, 0.86, m.stone, x, stepFloor + 4.52, lz);
    }
    ctx.addTorch(48.85, stepFloor + 3.0, lz, 0xffaa38, 6.0);
  }

  // 3) ROYAL VAULT GRAND ENTRY PORTAL (lx = 48..56, lz = 472.85)
  //    Strictly inside lx = 48..56 and south of the bottom stair step at lz = 472.0 so nothing clips or Z-fights!
  const vaultFullH = CEIL - V - 0.06;
  for (const x of [48.72, 55.28]) {
    // Stepped base plinth & golden collar
    addBox(ctx, 1.4, 0.68, 1.44, m.darkStone, x, V + 0.02, 472.85);
    addBox(ctx, 1.46, 0.24, 1.5, m.gold, x, V + 0.7, 472.85);
    // Lower pillar shaft + golden rune band + upper shaft
    addBox(ctx, 1.28, 4.56, 1.32, m.darkStone, x, V + 0.94, 472.85);
    addBox(ctx, 1.48, 0.42, 1.52, m.gold, x, V + 5.5, 472.85);
    addBox(ctx, 1.28, 4.38, 1.32, m.darkStone, x, V + 5.92, 472.85);
  }
  // Grand architrave lintel & frieze spanning lx = 48.05 .. 55.95 above y = V + 10.3
  addBox(ctx, 7.9, 0.42, 1.6, m.gold, 52.0, V + 10.3, 472.85);
  addBox(ctx, 7.8, vaultFullH - 10.72, 1.46, m.darkStone, 52.0, V + 10.72, 472.85);
  addBox(ctx, 7.9, 0.32, 1.62, m.gold, 52.0, V + 13.4, 472.85);
  // Royal diamond crest & flanking torches on the Grand Entry Portal
  const portalCrest = new THREE.Mesh(ctx.own(new THREE.OctahedronGeometry(0.95, 0)), m.gold);
  portalCrest.scale.set(1.25, 1.1, 0.35);
  portalCrest.position.set(52.0, V + 12.05, 472.02);
  ctx.group.add(portalCrest);
  ctx.addTorch(49.55, V + 3.6, 472.05, 0xffcf58, 7.0);
  ctx.addTorch(54.45, V + 3.6, 472.05, 0xffcf58, 7.0);

  // 4) ROYAL CRIMSON & GOLD CARPET RUNNER (strictly disjoint XZ gold borders & seamless L-corner red runner above V = -63.35)
  // Entry runner leg from stairs landing (lx = 52.0, lz = 472.4..492.4) forming a full L-corner at the south-east turn
  addBox(ctx, 5.2, 0.024, 20.0, m.gold, 52.0, V + 0.02, 482.4);
  addBox(ctx, 4.4, 0.026, 19.2, royalCarpetMat, 52.0, V + 0.045, 482.4);
  // East-West grand runner from the Entry runner's west edge (lx = 49.38) to West Throne Dais (lx = -19.0) along lz = 487.6..492.4
  addBox(ctx, 68.38, 0.024, 4.8, m.gold, 15.19, V + 0.02, 490.0);
  addBox(ctx, 68.42, 0.026, 4.0, royalCarpetMat, 15.61, V + 0.046, 490.0);
  // North-South cross runner arms (north arm lz = 476.2..487.55, south arm lz = 492.45..503.8 — disjoint from East-West runner!)
  for (const armZ of [481.88, 498.12]) {
    addBox(ctx, 4.6, 0.024, 11.3, m.gold, 16.0, V + 0.02, armZ);
    addBox(ctx, 3.9, 0.026, 10.9, royalCarpetMat, 16.0, V + 0.045, armZ);
  }

  // Perimeter golden crown cornice near the Royal Vault ceiling (y = CEIL - 0.52):
  addBox(ctx, 71.2, 0.45, 0.42, m.gold, 12.0, CEIL - 0.52, 472.32);
  addBox(ctx, 79.2, 0.45, 0.42, m.gold, 16.0, CEIL - 0.52, 507.68);
  addBox(ctx, 0.42, 0.45, 34.8, m.gold, -23.68, CEIL - 0.52, 490.0);
  addBox(ctx, 0.42, 0.45, 33.5, m.gold, 55.68, CEIL - 0.52, 490.75);

  // 5) 6 GRAND FLUTED DWARVEN COLUMNS (`vault-col-n1..s3`: [-14, 10, 34] x [480, 500], halfX=1.4, halfZ=1.4)
  for (const vx of [-14, 10, 34] as const) {
    // Vaulted ceiling arch rib spanning North-South (strictly below CEIL - 0.04 so it never Z-fights with the ceiling!)
    addBox(ctx, 1.8, 1.32, 35.4, m.darkStone, vx, CEIL - 1.36, 490.0);
    addBox(ctx, 2.02, 0.28, 35.4, m.gold, vx, CEIL - 1.64, 490.0);

    for (const vz of [480, 500] as const) {
      // Stepped base plinth (strictly disjoint Y tiers within halfX=1.4, halfZ=1.4)
      addBox(ctx, 2.75, 0.63, 2.75, m.darkStone, vx, V + 0.02, vz);
      addBox(ctx, 2.8, 0.25, 2.8, m.gold, vx, V + 0.65, vz);
      // Main column shaft + golden corner flutes
      addBox(ctx, 2.35, vaultH - 2.35, 2.35, m.stone, vx, V + 0.9, vz);
      for (const [cx, cz] of [[-1.08, -1.08], [1.08, -1.08], [-1.08, 1.08], [1.08, 1.08]] as const) {
        addBox(ctx, 0.26, vaultH - 2.6, 0.26, m.gold, vx + cx, V + 1.02, vz + cz);
      }
      // Decorative gold bands & capital
      for (const bandH of [5.2, 10.4, 15.6]) {
        addBox(ctx, 2.65, 0.4, 2.65, m.gold, vx, V + bandH, vz);
      }
      addBox(ctx, 2.85, 0.3, 2.85, m.gold, vx, CEIL - 1.45, vz);
      addBox(ctx, 2.8, 1.08, 2.8, m.darkStone, vx, CEIL - 1.15, vz);

      // Mounted wall torches facing the central royal aisle (lz = 490)
      const aisleSign = vz < 490 ? 1 : -1;
      ctx.addTorch(vx, V + 3.4, vz + aisleSign * 1.48, 0xffcf58, 7.5);
    }
  }
  // Longitudinal ceiling ribs tying the columns together along z = 480 and z = 500 (strictly below the transverse ribs)
  for (const vz of [480, 500] as const) {
    addBox(ctx, 79.2, 1.08, 1.56, m.darkStone, 16.0, CEIL - 1.14, vz);
    addBox(ctx, 79.2, 0.26, 1.78, m.gold, 16.0, CEIL - 1.4, vz);
  }

  // 6) COLOSSAL DRAGON-GOLD FUNNEL & OCTAGONAL RECEIVING BASIN (`vault-gold-funnel-basin` at (0, 490), halfX=5.1, halfZ=5.1)
  const fx = 0.0;
  const fz = 490.0;

  // Stepped octagonal dark-stone & gold retaining basin (outer radius 5.05m, height 1.28m)
  const basinBase = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(5.05, 5.2, 0.48, 8)), m.darkStone);
  basinBase.position.set(fx, V + 0.24, fz);
  basinBase.castShadow = true;
  basinBase.receiveShadow = true;
  ctx.group.add(basinBase);

  const basinWall = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(4.75, 4.95, 0.82, 8)), m.stone);
  basinWall.position.set(fx, V + 0.48 + 0.41, fz);
  basinWall.castShadow = true;
  basinWall.receiveShadow = true;
  ctx.group.add(basinWall);

  const basinGoldRim = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(4.92, 4.92, 0.24, 8)), m.gold);
  basinGoldRim.position.set(fx, V + 1.22, fz);
  ctx.group.add(basinGoldRim);

  // 8 Ornate Golden Corner Buttresses & Smelting Braziers around the octagonal basin rim
  const cornerBrazierGeo = ctx.own(new THREE.CylinderGeometry(0.42, 0.28, 0.55, 8));
  const cornerFireGeo = ctx.own(new THREE.SphereGeometry(0.32, 8, 6));
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const bx = fx + Math.cos(ang) * 4.55;
    const bz = fz + Math.sin(ang) * 4.55;
    addBox(ctx, 0.68, 1.42, 0.68, m.gold, bx, V + 0.02, bz);
    const cup = new THREE.Mesh(cornerBrazierGeo, m.iron);
    cup.position.set(bx, V + 1.68, bz);
    ctx.group.add(cup);
    const ember = new THREE.Mesh(cornerFireGeo, m.molten);
    ember.scale.set(1, 0.65, 1);
    ember.position.set(bx, V + 1.96, bz);
    ctx.group.add(ember);
  }

  // Overflowing gold treasure mountain + stacked ingots + sparkling gems inside the octagonal basin
  const goldMoundGeo = ctx.own(new THREE.ConeGeometry(1, 1, 14));
  const diamondGeo = ctx.own(new THREE.OctahedronGeometry(1, 0));

  const mainGoldCone = new THREE.Mesh(goldMoundGeo, m.gold);
  mainGoldCone.scale.set(4.35, 4.2, 4.35);
  mainGoldCone.position.set(fx, V + 0.75 + 2.1, fz);
  mainGoldCone.castShadow = true;
  ctx.group.add(mainGoldCone);

  for (const [ox, oz, r, h] of [
    [-1.8, -1.5, 2.3, 2.5],
    [1.9, -1.4, 2.2, 2.4],
    [-1.7, 1.6, 2.25, 2.45],
    [1.8, 1.7, 2.35, 2.6],
  ] as const) {
    const subMound = new THREE.Mesh(goldMoundGeo, m.gold);
    subMound.scale.set(r, h, r);
    subMound.position.set(fx + ox, V + 0.8 + h / 2, fz + oz);
    ctx.group.add(subMound);
  }

  // Monumental Multi-Tiered Ceiling-to-Basin Dragon-Gold Funnel descending from the Dragon Forge above (CEIL = -42.0 down to V + 6.4)
  // Upper conical collector hood at ceiling (y = -42.0 .. -46.2)
  const upperHood = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(4.4, 2.45, 4.2, 12)), m.darkStone);
  upperHood.position.set(fx, CEIL - 2.1, fz);
  ctx.group.add(upperHood);

  const upperHoodRim = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(4.65, 4.65, 0.48, 12)), m.gold);
  upperHoodRim.position.set(fx, CEIL - 0.35, fz);
  ctx.group.add(upperHoodRim);

  const midBarrel = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(2.45, 2.15, 5.2, 12)), m.iron);
  midBarrel.position.set(fx, CEIL - 4.2 - 2.6, fz);
  ctx.group.add(midBarrel);

  // Glowing molten-gold observation core visible through the mid-barrel
  const moltenCore = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(1.85, 1.65, 4.6, 12)), m.molten);
  moltenCore.position.set(fx, CEIL - 4.2 - 2.6, fz);
  ctx.group.add(moltenCore);

  // Lower tapered conical funnel nozzle (y = CEIL - 9.4 down to V + 6.8 = -56.55)
  const lowerNozzleH = (CEIL - 9.4) - (V + 6.8); // 5.55m
  const lowerNozzle = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(2.35, 1.15, lowerNozzleH, 12)), m.darkStone);
  lowerNozzle.position.set(fx, V + 6.8 + lowerNozzleH / 2, fz);
  ctx.group.add(lowerNozzle);

  // Heavy golden gear-collars & structural ceiling suspension struts around the funnel
  for (const [ry, rad] of [
    [CEIL - 4.2, 2.75],
    [CEIL - 6.8, 2.58],
    [CEIL - 9.4, 2.55],
    [V + 9.2, 1.95],
    [V + 6.8, 1.42],
  ] as const) {
    const ring = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(rad, rad, 0.46, 12)), m.gold);
    ring.position.set(fx, ry, fz);
    ctx.group.add(ring);
  }

  // 4 Diagonal iron & gold brace struts anchoring the funnel to the ceiling
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const sx = fx + Math.cos(ang) * 3.1;
    const sz = fz + Math.sin(ang) * 3.1;
    const strut = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(0.22, 0.26, 7.2, 8)), m.iron);
    strut.position.set(sx, CEIL - 3.4, sz);
    ctx.group.add(strut);

    // 4 Golden Dragon-Gargoyle Spouts around the lower funnel collar (V + 7.2)
    const gx = fx + Math.cos(ang) * 1.65;
    const gz = fz + Math.sin(ang) * 1.65;
    addBox(ctx, 0.65, 0.65, 0.65, m.gold, gx, V + 6.9, gz);
  }

  // Cascading stream of gleaming molten gold & coins pouring from the funnel nozzle onto the gold mountain peak!
  const streamH = (V + 6.8) - (V + 3.6);
  const goldStream = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(0.68, 1.55, streamH, 14)), m.gold);
  goldStream.position.set(fx, V + 3.6 + streamH / 2, fz);
  ctx.group.add(goldStream);

  const moltenRibbon = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(0.42, 0.95, streamH + 0.2, 12)), m.molten);
  moltenRibbon.position.set(fx, V + 3.6 + streamH / 2, fz);
  ctx.group.add(moltenRibbon);

  ctx.addLight(fx, V + 6.2, fz, 0xffc845, 12.0);

  // 7) 4-STEPPED OCTAGONAL "HEART OF THE MOUNTAIN" DIAMOND SHRINE (`vault-diamond-shrine` at (16, 490), halfX=2.8, halfZ=2.8)
  const sx = 16.0;
  const sz = 490.0;
  const stepRadii: ReadonlyArray<readonly [number, number, number, THREE.Material]> = [
    [2.85, 0.42, 0.0, m.darkStone],
    [2.45, 0.38, 0.42, m.gold],
    [2.05, 0.42, 0.80, m.stone],
    [1.62, 0.45, 1.22, m.darkStone],
  ];
  for (const [rad, h, yOff, mat] of stepRadii) {
    const step = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(rad * 0.96, rad, h, 8)), mat);
    step.position.set(sx, V + yOff + h / 2, sz);
    step.castShadow = true;
    step.receiveShadow = true;
    ctx.group.add(step);
  }
  const shrineCrown = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(1.72, 1.72, 0.22, 8)), m.gold);
  shrineCrown.position.set(sx, V + 1.72, sz);
  ctx.group.add(shrineCrown);

  // 4 Corner golden obelisks with ruby/emerald finials framing the central Heart Diamond
  for (const [ox, oz, isRuby] of [
    [-1.85, -1.85, true],
    [1.85, -1.85, false],
    [-1.85, 1.85, false],
    [1.85, 1.85, true],
  ] as const) {
    addBox(ctx, 0.46, 1.65, 0.46, m.gold, sx + ox, V + 0.42, sz + oz);
    const finial = new THREE.Mesh(diamondGeo, isRuby ? rubyMat : emeraldMat);
    finial.scale.set(0.32, 0.52, 0.32);
    finial.position.set(sx + ox, V + 2.38, sz + oz);
    ctx.group.add(finial);
  }

  // Colossal Levitating "Heart of the Mountain" Diamond + 4 surrounding royal gems
  const heartDiamond = new THREE.Mesh(diamondGeo, diamondMat);
  heartDiamond.scale.set(1.15, 1.65, 1.15);
  heartDiamond.position.set(sx, V + 3.15, sz);
  heartDiamond.rotation.y = Math.PI / 4;
  ctx.group.add(heartDiamond);
  ctx.addLight(sx, V + 3.6, sz, 0x5ad8ff, 9.5);

  // 8) WEST ROYAL TREASURY DAIS & GUARDIAN STATUES (`vault-west-throne-dais` at (-21.2, 490), halfX=1.8, halfZ=3.8)
  const dx = -21.2;
  const dz = 490.0;
  addBox(ctx, 3.4, 0.48, 7.4, m.darkStone, dx, V, dz);
  addBox(ctx, 3.5, 0.18, 7.5, m.gold, dx, V + 0.48, dz);
  addBox(ctx, 2.6, 0.45, 5.8, m.stone, dx - 0.3, V + 0.66, dz);
  addBox(ctx, 2.7, 0.16, 5.9, m.gold, dx - 0.3, V + 1.11, dz);

  // Carved golden treasury backdrop arch on the west wall (lx = -23.4)
  addBox(ctx, 0.7, 8.5, 7.6, m.darkStone, -23.4, V + 1.1, dz);
  addBox(ctx, 0.85, 0.5, 7.8, m.gold, -23.35, V + 9.4, dz);
  for (const szOff of [-3.3, 3.3]) {
    addBox(ctx, 0.9, 8.5, 0.9, m.gold, -23.3, V + 1.1, dz + szOff);
  }

  // Helper to build an ornate locked Dwarven Treasure Chest
  const addOrnateChest = (cx: number, cy: number, cz: number, yaw: number): void => {
    const g = new THREE.Group();
    g.position.set(cx, cy, cz);
    g.rotation.y = yaw;
    ctx.group.add(g);

    const body = new THREE.Mesh(ctx.own(new THREE.BoxGeometry(1.35, 0.68, 0.88)), m.darkStone);
    body.position.set(0, 0.34, 0);
    g.add(body);
    const lid = new THREE.Mesh(ctx.own(new THREE.BoxGeometry(1.4, 0.32, 0.92)), m.stone);
    lid.position.set(0, 0.84, 0);
    g.add(lid);
    const trim = new THREE.Mesh(ctx.own(new THREE.BoxGeometry(1.44, 0.12, 0.96)), m.gold);
    trim.position.set(0, 0.68, 0);
    g.add(trim);
    const lock = new THREE.Mesh(ctx.own(new THREE.BoxGeometry(0.28, 0.3, 0.14)), m.gold);
    lock.position.set(0, 0.58, 0.45);
    g.add(lock);
  };

  // 3 Royal Treasure Chests atop the West Dais (facing East +X)
  addOrnateChest(dx - 0.2, V + 1.27, dz, Math.PI / 2);
  addOrnateChest(dx - 0.2, V + 1.27, dz - 1.85, Math.PI / 2);
  addOrnateChest(dx - 0.2, V + 1.27, dz + 1.85, Math.PI / 2);

  // 2 Golden Dwarven Guardian Statues flanking the West Dais
  const vaultStatueGeo = ctx.own(
    mergeParts([
      box(1.2, 0.35, 1.2, GOLEM_DARK, 0, 0.18, 0),
      box(0.95, 2.1, 0.8, GOLEM_STONE, 0, 1.4, 0),
      box(1.15, 0.45, 0.9, GOLD, 0, 2.2, 0),
      box(0.75, 0.75, 0.75, GOLEM_STONE, 0, 2.8, 0),
      box(0.85, 0.28, 0.85, GOLD, 0, 3.25, 0),
      cyl(0.07, 0.07, 3.0, 6, GOLD, 0.55, 1.65, 0.25),
    ])
  );
  for (const szOff of [-2.95, 2.95]) {
    const st = new THREE.Mesh(vaultStatueGeo, m.statue);
    st.position.set(dx + 0.4, V + 0.66, dz + szOff);
    st.rotation.y = Math.PI / 2;
    st.castShadow = true;
    ctx.group.add(st);
  }
  ctx.addTorch(-22.6, V + 4.2, dz - 3.6, 0xffcf58, 7.0);
  ctx.addTorch(-22.6, V + 4.2, dz + 3.6, 0xffcf58, 7.0);

  // 9) 4 WEST SILVER BULLION PALLETS (`vault-silver-pallet-1..4` at lx = -20.0, lz = 477.0, 482.5, 497.5, 503.0)
  const addSilverPallet = (px: number, pz: number, rows: number): void => {
    addBox(ctx, 2.9, 0.24, 2.3, m.darkStone, px, V, pz);
    addBox(ctx, 2.7, 0.14, 2.1, m.wood, px, V + 0.24, pz);
    for (let r = 0; r < rows; r++) {
      for (let ix = -1; ix <= 1; ix++) {
        for (let iz = -0.5; iz <= 0.5; iz += 1) {
          addBox(ctx, 0.74, 0.26, 0.82, silverMat, px + ix * 0.84, V + 0.38 + r * 0.27, pz + iz * 0.9);
        }
      }
    }
  };
  addSilverPallet(-20.0, 477.0, 4);
  addSilverPallet(-20.0, 482.5, 5);
  addSilverPallet(-20.0, 497.5, 5);
  addSilverPallet(-20.0, 503.0, 4);

  // 10) 4 SOUTH GOLD BULLION VAULT PLATFORMS (`vault-gold-stack-1..4` at lz = 505.2, lx = -6, 4, 20, 30)
  const addGoldBullionPlatform = (px: number, pz: number, hasRuby: boolean): void => {
    // Non-coplanar stepped stone & gold base matching halfX=2.1, halfZ=1.4
    addBox(ctx, 4.0, 0.32, 2.6, m.darkStone, px, V, pz);
    addBox(ctx, 4.1, 0.14, 2.7, m.gold, px, V + 0.32, pz);
    for (let r = 0; r < 4; r++) {
      const count = 5 - r;
      for (let i = 0; i < count; i++) {
        addBox(
          ctx,
          0.56,
          0.26,
          1.65,
          m.gold,
          px - ((count - 1) * 0.64) / 2 + i * 0.64,
          V + 0.46 + r * 0.27,
          pz
        );
      }
    }
    const gem = new THREE.Mesh(diamondGeo, hasRuby ? rubyMat : diamondMat);
    gem.scale.set(0.45, 0.68, 0.45);
    gem.position.set(px, V + 1.85, pz);
    ctx.group.add(gem);
  };
  addGoldBullionPlatform(-6.0, 505.2, true);
  addGoldBullionPlatform(4.0, 505.2, false);
  addGoldBullionPlatform(20.0, 505.2, true);
  addGoldBullionPlatform(30.0, 505.2, false);

  // 11) 4 NORTH ROYAL JEWEL HOARD PEDESTALS & CHESTS (`vault-north-hoard-1..4` at lz = 474.8, lx = -6, 6, 22, 34)
  const addNorthJewelPedestal = (px: number, pz: number, gemMat: THREE.Material): void => {
    addBox(ctx, 3.4, 0.36, 2.2, m.darkStone, px, V, pz);
    addBox(ctx, 3.5, 0.14, 2.3, m.gold, px, V + 0.36, pz);
    addOrnateChest(px - 0.65, V + 0.50, pz, 0);

    // Mini gold mound + royal gem beside the chest on the pedestal
    const miniMound = new THREE.Mesh(goldMoundGeo, m.gold);
    miniMound.scale.set(0.85, 0.75, 0.85);
    miniMound.position.set(px + 0.85, V + 0.50 + 0.375, pz);
    ctx.group.add(miniMound);

    const gem = new THREE.Mesh(diamondGeo, gemMat);
    gem.scale.set(0.42, 0.62, 0.42);
    gem.position.set(px + 0.85, V + 1.48, pz);
    ctx.group.add(gem);
  };
  addNorthJewelPedestal(-6.0, 474.8, rubyMat);
  addNorthJewelPedestal(6.0, 474.8, diamondMat);
  addNorthJewelPedestal(22.0, 474.8, emeraldMat);
  addNorthJewelPedestal(34.0, 474.8, rubyMat);

  // 12) 3 OVERHEAD GOLDEN TREASURY CHANDELIERS AT (-9, 490), (16, 490), AND (34, 490)
  for (const cx of [-9.0, 16.0, 34.0] as const) {
    const chY = CEIL - 4.8;
    const chain = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(0.12, 0.12, 4.8, 8)), m.iron);
    chain.position.set(cx, CEIL - 2.4, 490.0);
    ctx.group.add(chain);

    const wheel = new THREE.Mesh(ctx.own(new THREE.TorusGeometry(2.2, 0.16, 8, 20)), m.gold);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(cx, chY, 490.0);
    ctx.group.add(wheel);

    ctx.addLight(cx, chY - 0.5, 490.0, 0xffd268, 9.0);
  }
}
// #endregion

