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
const CENTER_DRAGON = { lx: MINE_POI.dragonMouth.lx, wallLz: 451.5, headY: -36.5, scale: 38.0 } as const;

/** Summary: Z stations of the 3 side ForestDragon heads on each side wall, and the 4 structural pillars flanking them. */
const SIDE_DRAGON_LZS = [410, 428, 446] as const;
const SIDE_PILLAR_LZS = [401, 419, 437, 455] as const;
const SIDE_DRAGON_SCALE = 26.0;

/** Summary: Symmetrical skull, horns, jaw and upper neck bone indices of DemonDragon (excludes asymmetric spine/wings). */
const DEMON_HEAD_BONES: ReadonlySet<number> = new Set([19, 20, 21, 22, 23, 24]);

/** Summary: Symmetrical upper neck, skull and jaw bone indices of ForestDragon (excludes shoulders/wings). */
const FOREST_HEAD_BONES: ReadonlySet<number> = new Set([33, 34, 35]);
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
    emissiveIntensity: 1.65,
    roughness: 0.65,
    side: THREE.DoubleSide,
  });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.85 });
  const vertexStone = ctx.materials.statue;
  ctx.ownMaterial(runeMat, lavaMat, flameMat);

  const golem = buildGolem(ctx, vertexStone, runeMat);
  buildGolemChamber(ctx, runeMat);
  buildPassage(ctx);
  const flames = buildDragonForgeHeadsAndPillars(ctx, vertexStone, lavaMat, flameMat);
  buildForgeFloor(ctx, lavaMat);
  buildTreasure(ctx, lavaMat);
  buildRoyalTreasureVault(ctx);

  return (t: number): void => {
    golem.position.y = Math.sin(t * 1.1) * 0.06;
    golem.scale.y = 1 + Math.sin(t * 1.1) * 0.006;
    runeMat.color.setHSL(0.55, 1, 0.55 + Math.sin(t * 2.0) * 0.12);
    lavaMap.offset.set(t * 0.012, -t * 0.038);
    lavaMat.emissiveIntensity = 1.55 + Math.sin(t * 1.7) * 0.22;
    flames.forEach((f, i) => {
      f.scale.y = 1 + Math.sin(t * 9 + i * 1.9) * 0.25;
      f.scale.x = 1 + Math.sin(t * 7 + i) * 0.1;
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

/** Summary: Orange-red lava with bright veins, tiled and scrolled to look molten. */
function createLavaTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const c = canvas.getContext('2d');
  if (c !== null) {
    c.fillStyle = '#7a1606';
    c.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 90; i++) {
      const x = (i * 53) % 128;
      const y = (i * 29) % 128;
      const r = 4 + (i % 7) * 3;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, i % 3 === 0 ? '#fff3a0' : '#ff9a20');
      g.addColorStop(1, 'rgba(255,80,0,0)');
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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
/** Summary: Gate frames, rune circle, the protected doorway, ceiling chains and wall alcoves. */
function buildGolemChamber(ctx: ISetPieceContext, runeMat: THREE.Material): void {
  const m = ctx.materials;
  // Gate frames where the tunnel leaves the bridge and where it opens into the chamber.
  for (const lz of [300.4, 313.6]) {
    for (const x of [-7.2, 7.2]) addBox(ctx, 2.4, 9.0, 2.0, m.stone, x, LEDGE, lz);
    addBox(ctx, 17, 1.6, 2.2, m.darkStone, 0, LEDGE + 7.4, lz);
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

  // The protected doorway into the ancient passage, with its stone doors folded open.
  const doorLz = 353.6;
  for (const x of [-6.8, 6.8]) addBox(ctx, 2.6, 12, 2.4, m.stone, x, LEDGE, doorLz);
  addBox(ctx, 16.2, 2.4, 2.6, m.darkStone, 0, LEDGE + 12, doorLz);
  for (let i = 0; i < 6; i++) addBox(ctx, 0.5, 1.0, 0.08, runeMat, -5 + i * 2, LEDGE + 12.7, doorLz - 1.32);
  const crest = new THREE.Mesh(ctx.own(new THREE.OctahedronGeometry(1.6, 0)), m.gold);
  crest.scale.set(1.3, 1.0, 0.25);
  crest.position.set(0, LEDGE + 16, doorLz - 1.3);
  ctx.group.add(crest);
  for (const x of [-11.6, 11.6]) addBox(ctx, 4.8, 10, 0.7, m.darkStone, x, LEDGE, doorLz - 0.9);

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
/** Summary: Pilasters, carved relief panels and torches stepping down both walls of the passage. */
function buildPassage(ctx: ISetPieceContext): void {
  const m = ctx.materials;
  for (let lz = 357; lz <= 381; lz += 6) {
    const floor = sampleAncientMineFloor(0, lz, LEDGE)?.height ?? FORGE;
    for (const x of [-4.75, 4.75]) {
      addBox(ctx, 0.5, -32 - floor, 0.9, m.stone, x, floor, lz);
      addBox(ctx, 0.12, 2.6, 2.6, m.darkStone, x * 1.03, floor + 1.6, lz + 3);
      addBox(ctx, 0.14, 0.18, 2.0, m.gold, x * 1.035, floor + 3.6, lz + 3);
      addBox(ctx, 0.14, 1.2, 0.18, m.gold, x * 1.035, floor + 2.4, lz + 3);
    }
    ctx.addTorch(-4.3, floor + 2.8, lz, 0xff9a30, 5);
    ctx.addTorch(4.3, floor + 2.8, lz, 0xff9a30, 5);
  }
  // Arch into the forge at the foot of the stairs.
  for (const x of [-6.6, 6.6]) addBox(ctx, 2.4, 13, 2.0, m.stone, x, FORGE, 384.6);
  addBox(ctx, 15.6, 2.6, 2.2, m.darkStone, 0, FORGE + 11.4, 384.6);
}
// #endregion

// #region Dragon Forge Heads And Pillars
interface IBakedDragonHeadAsset {
  readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.Material;
}

/**
 * Summary: Extracts a baked, symmetrically centered BufferGeometry of a dragon's head/neck/jaw subtree.
 * Design: Requires ALL 3 vertices of each triangle to belong to `headBones` so no stretched shoulder
 *         or wing polygons are pulled into the bust, and uses explicit symmetry anchors `(anchorX, anchorY, anchorZ)`.
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

  const positions: number[] = [];
  const uvs: number[] = [];
  const pushVertex = (vi: number): void => {
    mesh.getVertexPosition(vi, v);
    positions.push(
      (v.x - anchorX) * scale,
      (v.y - anchorY) * scale,
      (v.z - anchorZ) * scale
    );
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
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  out.computeVertexNormals();
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
 * Summary: Builds the baked open-jaw ForestDragon head for the 6 side platforms.
 */
function bakeForestDragonHeadNow(ctx: ISetPieceContext): IBakedDragonHeadAsset {
  const forest = createReadyForestDragon();
  forest.rig.resetToRest();
  // Pitch skull (bone 34) up slightly so the head looks proudly across the forge, and open the lower jaw (bone 35).
  if (forest.rig.bones[34] !== undefined) {
    forest.rig.bones[34].quaternion.multiply(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.35)
    );
  }
  if (forest.rig.bones[35] !== undefined) {
    forest.rig.bones[35].quaternion.multiply(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.52)
    );
  }
  forest.object.updateMatrixWorld(true);
  forest.mesh.skeleton.update();

  // Exact skull symmetry plane of ForestDragon: anchorX = -0.0395, anchorY = 0.56, anchorZ = 0.30.
  const geometry = ctx.own(
    bakeSkinnedHeadSubtree(forest.mesh, FOREST_HEAD_BONES, SIDE_DRAGON_SCALE, -0.0395, 0.56, 0.30)
  );
  const rawMat = Array.isArray(forest.mesh.material) ? forest.mesh.material[0] : forest.mesh.material;
  const mat = rawMat.clone() as THREE.MeshStandardMaterial;
  mat.roughness = 0.44;
  mat.metalness = 0.25;
  mat.emissive = new THREE.Color(0x281004);
  mat.emissiveIntensity = 0.38;
  ctx.ownMaterial(mat);
  forest.dispose();
  return { geometry, material: mat };
}

/**
 * Summary: Builds the Dragon Forge's colossal central Red DemonDragon head (with pure molten lava
 *          positioned strictly inside its orbital eye sockets and no X/plus glints), the side pillars,
 *          and the 6 enlarged side ForestDragon heads seated neatly on raised stone-and-gold platforms
 *          (with no eye lava and a clean, well-proportioned lava stream pouring from inside their open jaws).
 */
function buildDragonForgeHeadsAndPillars(
  ctx: ISetPieceContext,
  vertexStone: THREE.Material,
  lavaMat: THREE.Material,
  flameMat: THREE.Material
): THREE.Mesh[] {
  const m = ctx.materials;
  const flames: THREE.Mesh[] = [];

  // Pure molten lava eye materials for the central Red Dragon (no X/plus cross-planes).
  const eyeOuterMat = new THREE.MeshBasicMaterial({ color: 0xff2600, fog: false });
  const eyeMidMat = new THREE.MeshBasicMaterial({ color: 0xff8c00, fog: false });
  const eyeCoreMat = new THREE.MeshBasicMaterial({ color: 0xffea75, fog: false });
  ctx.ownMaterial(eyeOuterMat, eyeMidMat, eyeCoreMat);

  const eyeSphereGeo = ctx.own(new THREE.SphereGeometry(1, 12, 10));
  const flameGeo = ctx.own(new THREE.ConeGeometry(0.85, 3.0, 6));

  // 1) COLOSSAL CENTRAL RED DEMON-DRAGON HEAD ON THE SOUTH SHRINE (lx = 0, wallLz = 451.5, headY = -36.5, scale = 38.0)
  const { lx, wallLz, headY, scale } = CENTER_DRAGON;
  // Grand obsidian & gold furnace shrine rising from the lava bed to frame the colossal Red Dragon neck.
  addBox(ctx, 32, 34, 6.0, m.darkStone, lx, MINE_LEVEL_Y.lavaBed, wallLz + 3.2);
  addBox(ctx, 28, 1.4, 6.6, m.gold, lx, headY + 10.5, wallLz + 3.0);
  addBox(ctx, 28, 1.2, 6.6, m.gold, lx, headY - 7.5, wallLz + 3.0);
  for (const sideX of [-13.5, 13.5]) {
    addBox(ctx, 3.0, 32, 6.6, m.stone, lx + sideX, MINE_LEVEL_Y.lavaBed + 1, wallLz + 3.0);
    addBox(ctx, 3.4, 0.9, 7.0, m.gold, lx + sideX, headY + 3.5, wallLz + 3.0);
  }

  const centerFallbackGeo = ctx.own(
    mergeParts([
      box(14, 9, 14, DRAGON_STONE, 0, 0, 4),
      box(9, 4, 11, DRAGON_SCORCHED, 0, 1.5, 8),
      box(8, 2.5, 10, DRAGON_STONE, 0, -3.5, 8),
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
  const eyeX = 0.047 * scale; // 1.786 m
  const eyeY = (0.580 - 0.540) * scale; // +1.520 m
  const eyeZ = (1.028 - 0.820) * scale; // +7.904 m
  for (const side of [-1, 1] as const) {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * eyeX, eyeY, eyeZ);
    eyeGroup.rotation.y = side * 0.28;
    centerGroup.add(eyeGroup);

    const outer = new THREE.Mesh(eyeSphereGeo, eyeOuterMat);
    outer.scale.set(0.46, 0.30, 0.38);
    eyeGroup.add(outer);

    const mid = new THREE.Mesh(eyeSphereGeo, eyeMidMat);
    mid.scale.set(0.35, 0.22, 0.30);
    mid.position.set(side * 0.05, 0, 0.08);
    eyeGroup.add(mid);

    const core = new THREE.Mesh(eyeSphereGeo, eyeCoreMat);
    core.scale.set(0.22, 0.14, 0.20);
    core.position.set(side * 0.08, 0, 0.14);
    eyeGroup.add(core);
  }

  // Molten furnace glow & lava tongue inside the open DemonDragon jaws (rawY = 0.44..0.52, rawZ = 0.96..1.04).
  const centerThroatGlow = new THREE.Mesh(ctx.own(new THREE.SphereGeometry(1.75, 12, 10)), m.molten);
  centerThroatGlow.scale.set(1.05, 0.82, 1.35);
  centerThroatGlow.position.set(0, -1.9, 6.2);
  centerThroatGlow.name = 'ancient-mine-dragon-fire';
  centerGroup.add(centerThroatGlow);

  const centerTongue = new THREE.Mesh(ctx.own(new THREE.BoxGeometry(2.6, 0.65, 3.8)), lavaMat);
  centerTongue.position.set(0, -3.1, 7.4);
  centerTongue.rotation.x = 0.32;
  centerGroup.add(centerTongue);

  // Main lava stream pouring from inside the Red Dragon's open mouth (mine z = 443.3, y = -39.6)
  // down onto the Chest Deflector Canopy ("Umbrella") at (mine z = 438.6, y = -44.0) above the treasure chest!
  const mouthWorldZ = wallLz - 8.2; // 443.3
  const mouthWorldY = headY - 3.1; // -39.6
  const canopyApexZ = TREASURE_ISLAND.lz + 0.6; // 438.6
  const canopyApexY = -44.0;
  const mainStreamLen = Math.hypot(mouthWorldZ - canopyApexZ, mouthWorldY - canopyApexY) + 0.6;
  const mainStream = new THREE.Mesh(
    ctx.own(new THREE.CylinderGeometry(1.05, 1.55, mainStreamLen, 14, 1, true)),
    lavaMat
  );
  mainStream.position.set(lx, (mouthWorldY + canopyApexY) / 2, (mouthWorldZ + canopyApexZ) / 2);
  mainStream.rotation.x = Math.atan2(mouthWorldZ - canopyApexZ, mouthWorldY - canopyApexY);
  ctx.group.add(mainStream);

  for (let i = 0; i < 5; i++) {
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.userData.isAnimated = true;
    flame.position.set(lx - 2.0 + i * 1.0, mouthWorldY + 0.4, mouthWorldZ - 0.5);
    ctx.group.add(flame);
    flames.push(flame);
  }
  ctx.addLight(lx, headY - 1.0, wallLz - 10.5, 0xff5a18, 14);

  // 2) HANDSOME SIDE PILLARS & 6 ENLARGED FOREST-DRAGON HEADS ON RAISED PLATFORMS (3 WEST, 3 EAST)
  const sideFallbackGeo = ctx.own(
    mergeParts([
      box(3.4, 4.2, 4.2, DRAGON_STONE, 0, 0.5, 1.2),
      box(2.8, 1.8, 3.6, DRAGON_SCORCHED, 0, 0.2, 2.6),
      box(2.6, 1.2, 3.4, DRAGON_STONE, 0, -1.2, 2.5),
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

  const sideThroatGeo = ctx.own(new THREE.SphereGeometry(0.65, 10, 8));
  const sideTongueGeo = ctx.own(new THREE.BoxGeometry(0.82, 0.26, 1.45));
  const sideSplashGeo = ctx.own(new THREE.TorusGeometry(1.05, 0.18, 6, 16));

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
      lavaRim.scale.setScalar(2.4);
      lavaRim.position.set(0, LAVA + 0.05, 0);
      pGroup.add(lavaRim);
    }

    // 3 Raised Stone-and-Gold Dragon Platforms per side (6 total) bearing the enlarged ForestDragon heads.
    for (const dlz of SIDE_DRAGON_LZS) {
      const platX = side * 41.8;
      const platTopY = -41.5;
      const platH = platTopY - pillarBaseY;

      // Wide stepped platform rising from the lava bed so the dragon head sits cleanly ON TOP of it.
      addBox(ctx, 7.6, platH - 0.6, 8.2, m.darkStone, platX, pillarBaseY, dlz);
      addBox(ctx, 8.2, 0.6, 8.8, m.gold, platX, platTopY - 0.6, dlz);
      addBox(ctx, 8.0, 0.5, 8.6, m.gold, platX, LAVA + 0.3, dlz);

      // Stepped upper plinth seat set slightly toward the back of the platform (lx = side * 42.4, top at y = -40.3).
      const seatX = side * 42.4;
      const seatTopY = platTopY + 1.2;
      addBox(ctx, 5.4, 0.85, 5.6, m.stone, seatX, platTopY, dlz);
      addBox(ctx, 5.8, 0.35, 6.0, m.gold, seatX, platTopY + 0.85, dlz);

      // Carved stone spout channel on the front lip of the platform beneath the dragon's open jaws.
      const troughX = platX + inwardSign * 3.4;
      addBox(ctx, 2.2, 0.7, 2.2, m.darkStone, troughX, platTopY, dlz);
      addBox(ctx, 1.4, 0.75, 1.4, m.molten, troughX + inwardSign * 0.2, platTopY + 0.05, dlz);

      // Mount the enlarged ForestDragon head (scale = 26.0) squarely above the stepped seat:
      // Neck base bottom is at mountY - 2.86 = -40.3, resting directly on seatTopY (-40.3)!
      const mountY = -37.45;
      const mountGroup = new THREE.Group();
      mountGroup.name = `ancient-mine-side-dragon-${side < 0 ? 'west' : 'east'}-${dlz}`;
      mountGroup.position.set(seatX, mountY, dlz);
      mountGroup.rotation.y = headYaw;
      ctx.group.add(mountGroup);

      // Baked ForestDragon head with open jaws (NO lava in the eyes per user request).
      const headMesh = new THREE.Mesh(sideFallbackGeo, vertexStone);
      headMesh.frustumCulled = false;
      mountGroup.add(headMesh);
      sideHeadMeshes.push(headMesh);

      // Molten fire core & tongue strictly inside the open mouth cavity (local y = -0.82, local z = +2.35..+2.85).
      const throat = new THREE.Mesh(sideThroatGeo, m.molten);
      throat.scale.set(0.95, 0.65, 1.15);
      throat.position.set(0, -0.72, 2.15);
      mountGroup.add(throat);

      const tongue = new THREE.Mesh(sideTongueGeo, lavaMat);
      tongue.position.set(0, -0.96, 2.55);
      tongue.rotation.x = 0.26;
      mountGroup.add(tongue);

      // Clean, natural lava stream pouring from inside the open jaws (local z = 2.95, local y = -1.05) into the pool.
      const sideMouthWorldY = mountY - 1.05;
      const sideFallH = sideMouthWorldY - LAVA + 0.4;
      const sideFall = new THREE.Mesh(
        ctx.own(new THREE.CylinderGeometry(0.36, 0.68, sideFallH, 12, 1, true)),
        lavaMat
      );
      sideFall.position.set(0, (sideMouthWorldY + LAVA) / 2 - mountY, 3.35);
      sideFall.rotation.x = -0.08;
      mountGroup.add(sideFall);

      // Splash ring where the side dragon's lava stream enters the pool in front of the platform.
      const splashX = seatX + inwardSign * 3.95;
      const splash = new THREE.Mesh(sideSplashGeo, m.molten);
      splash.rotation.x = -Math.PI / 2;
      splash.position.set(splashX, LAVA + 0.06, dlz);
      ctx.group.add(splash);

      const sideFlame = new THREE.Mesh(flameGeo, flameMat);
      sideFlame.userData.isAnimated = true;
      sideFlame.scale.setScalar(0.65);
      sideFlame.position.set(seatX + inwardSign * 2.9, sideMouthWorldY + 0.25, dlz);
      ctx.group.add(sideFlame);
      flames.push(sideFlame);
    }

    ctx.addLight(wallX + inwardSign * 9.5, -38.0, 428, 0xff5a14, 9.5);
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

  return flames;
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
function buildTreasure(ctx: ISetPieceContext, lavaMat: THREE.Material): void {
  const m = ctx.materials;
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
  const impactBasin = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(1.75, 1.35, 0.45, 12)), m.molten);
  impactBasin.position.set(f.lx, canopyY + 0.45, canopyZ + 0.2);
  ctx.group.add(impactBasin);

  //Raised front shield rim (prevents lava from ever spilling forward toward the player / front of the chest).
  addBox(ctx, 7.6, 0.65, 0.48, m.gold, f.lx, canopyY - 0.05, canopyZ - 2.1);
  addBox(ctx, 7.6, 0.55, 0.45, m.darkStone, f.lx, canopyY - 0.05, canopyZ + 2.1);

  const splashGeo = ctx.own(new THREE.TorusGeometry(1.65, 0.24, 6, 18));

  // Left and right pitched canopy wings + side lava chutes + side waterfalls into the lava river.
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

    // Side lava waterfall pouring off the outer tip of the umbrella (lx = ±5.85) down into the lava river!
    const pourX = f.lx + side * 5.65;
    const pourTopY = canopyY - 0.55;
    const sideStreamH = pourTopY - LAVA + 0.45;
    const sideStream = new THREE.Mesh(
      ctx.own(new THREE.CylinderGeometry(0.65, 1.25, sideStreamH, 12, 1, true)),
      lavaMat
    );
    sideStream.position.set(pourX, (pourTopY + LAVA) / 2, canopyZ);
    sideStream.rotation.z = -side * 0.12;
    ctx.group.add(sideStream);

    // Glowing splash ring in the lava river on either side of the island (lx = ±6.2).
    const sideSplash = new THREE.Mesh(splashGeo, m.molten);
    sideSplash.rotation.x = -Math.PI / 2;
    sideSplash.position.set(f.lx + side * 6.15, LAVA + 0.07, canopyZ);
    ctx.group.add(sideSplash);
  }
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

  const silverMat = new THREE.MeshStandardMaterial({
    color: 0xdbe4ee,
    metalness: 0.92,
    roughness: 0.16,
    emissive: 0x1e293b,
    emissiveIntensity: 0.2,
  });
  const diamondMat = new THREE.MeshStandardMaterial({
    color: 0xb8f4ff,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.95,
    metalness: 0.15,
    roughness: 0.08,
    transparent: true,
    opacity: 0.92,
  });
  const rubyMat = new THREE.MeshStandardMaterial({
    color: 0xff2a4b,
    emissive: 0xd90429,
    emissiveIntensity: 0.75,
    metalness: 0.2,
    roughness: 0.12,
  });
  ctx.ownMaterial(silverMat, diamondMat, rubyMat);

  // 1) SECRET PASSAGE ARCHWAY AT THE EAST END OF THE FORGE LANDING (lx = 46, lz = 386..396)
  for (const z of [386.8, 395.2]) {
    addBox(ctx, 1.8, 9.5, 1.6, m.stone, 46.2, FORGE, z);
    addBox(ctx, 2.1, 0.5, 1.9, m.gold, 46.2, FORGE + 4.5, z);
  }
  addBox(ctx, 2.0, 1.8, 10.2, m.darkStone, 46.2, FORGE + 9.5, 391.0);
  addBox(ctx, 2.2, 0.4, 9.6, m.gold, 46.2, FORGE + 9.2, 391.0);
  ctx.addTorch(45.2, FORGE + 3.2, 387.5, 0xffb040, 6.5);
  ctx.addTorch(45.2, FORGE + 3.2, 394.5, 0xffb040, 6.5);

  // 2) TORCHES & ARCH RIBS ALONG THE SECRET VAULT STAIRS (lx = 48..56, lz = 396..472)
  for (let lz = 402; lz <= 466; lz += 16) {
    const stepFloor = sampleAncientMineFloor(52, lz, FORGE)?.height ?? V;
    for (const x of [48.35, 55.65]) {
      addBox(ctx, 0.6, 11.0, 0.9, m.stone, x, stepFloor, lz);
      addBox(ctx, 0.75, 0.35, 1.1, m.gold, x, stepFloor + 4.2, lz);
    }
    ctx.addTorch(48.8, stepFloor + 3.0, lz, 0xffaa38, 6.0);
  }

  // 3) ROYAL VAULT GRAND DOORWAY & PILLARS (lx = -24..56, lz = 472..508, y = -63.35)
  for (const x of [48.6, 55.4]) {
    addBox(ctx, 1.8, 12.0, 1.8, m.darkStone, x, V, 472.6);
    addBox(ctx, 2.1, 0.55, 2.1, m.gold, x, V + 5.5, 472.6);
  }
  addBox(ctx, 8.8, 2.0, 2.2, m.gold, 52.0, V + 12.0, 472.6);

  // Structural gold-banded vault columns supporting the Royal Vault ceiling (y = -42.0).
  const vaultH = -42.0 - V;
  for (const [vx, vz] of [[-14, 480], [10, 480], [34, 480], [-14, 500], [10, 500], [34, 500]] as const) {
    addBox(ctx, 2.6, vaultH, 2.6, m.darkStone, vx, V, vz);
    addBox(ctx, 3.0, 0.6, 3.0, m.gold, vx, V + 0.02, vz);
    addBox(ctx, 2.9, 0.5, 2.9, m.gold, vx, V + 6.0, vz);
    addBox(ctx, 3.1, 0.7, 3.1, m.gold, vx, -42.7, vz);
    ctx.addTorch(vx + (vx < 12 ? 1.5 : -1.5), V + 3.4, vz, 0xffcf58, 7.5);
  }

  // 4) OVERHEAD GOLD CHUTE PIPE DESCENDING FROM THE CENTRAL HUB INTO THE VAULT (lx = 18, lz = 484)
  const chuteX = 18.0;
  const chuteZ = 484.0;
  const chuteTopY = -42.0;
  const chuteSpoutY = V + 8.5;
  const chutePipe = new THREE.Mesh(
    ctx.own(new THREE.CylinderGeometry(1.35, 1.55, chuteTopY - chuteSpoutY, 12)),
    m.iron
  );
  chutePipe.position.set(chuteX, (chuteTopY + chuteSpoutY) / 2, chuteZ);
  ctx.group.add(chutePipe);

  for (const ringY of [chuteSpoutY + 0.4, chuteSpoutY + 4.5, chuteTopY - 1.2]) {
    const collar = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(1.75, 1.75, 0.55, 12)), m.gold);
    collar.position.set(chuteX, ringY, chuteZ);
    ctx.group.add(collar);
  }

  // Continuous golden stream of coins/bullion pouring out of the chute spout onto the colossal gold mountain below!
  const goldStream = new THREE.Mesh(
    ctx.own(new THREE.CylinderGeometry(0.65, 1.85, chuteSpoutY - (V + 3.2), 12)),
    m.gold
  );
  goldStream.position.set(chuteX, (chuteSpoutY + V + 3.2) / 2, chuteZ);
  ctx.group.add(goldStream);

  // 5) MOUNTAINS OF GOLD, STACKED SILVER INGOTS, AND GIANT SPARKLING DIAMONDS
  const goldMoundGeo = ctx.own(new THREE.ConeGeometry(1, 1, 14));
  const diamondGeo = ctx.own(new THREE.OctahedronGeometry(1, 0));

  const addGoldMountain = (x: number, z: number, radius: number, height: number): void => {
    const mound = new THREE.Mesh(goldMoundGeo, m.gold);
    mound.scale.set(radius, height, radius);
    mound.position.set(x, V + height / 2, z);
    ctx.group.add(mound);
  };

  // Colossal gold mountain directly under the Gold Chute + surrounding mountains of gold along the vault walls.
  addGoldMountain(chuteX, chuteZ, 6.2, 4.8);
  addGoldMountain(27.5, 485.5, 4.8, 3.6);
  addGoldMountain(2.5, 483.5, 4.5, 3.4);
  addGoldMountain(-8.5, 485.0, 5.2, 4.1);
  addGoldMountain(-18.5, 492.0, 4.6, 3.8);
  addGoldMountain(-8.0, 502.5, 5.5, 4.4);
  addGoldMountain(6.0, 503.0, 4.9, 3.9);
  addGoldMountain(21.0, 502.5, 5.8, 4.5);
  addGoldMountain(38.0, 501.0, 4.4, 3.5);

  // Stacked Silver Ingot Pallets (gleaming silver bullion bars).
  const addSilverPallet = (px: number, pz: number, rows: number): void => {
    addBox(ctx, 2.8, 0.22, 2.0, m.wood, px, V, pz);
    for (let r = 0; r < rows; r++) {
      for (let ix = -1; ix <= 1; ix++) {
        for (let iz = -0.5; iz <= 0.5; iz += 1) {
          addBox(ctx, 0.72, 0.28, 0.78, silverMat, px + ix * 0.82, V + 0.22 + r * 0.29, pz + iz * 0.88);
        }
      }
    }
  };
  addSilverPallet(-2.5, 495.5, 4);
  addSilverPallet(-15.5, 496.5, 5);
  addSilverPallet(28.5, 495.5, 4);
  addSilverPallet(41.5, 492.0, 3);

  // Stacked Gold Bullion Pyramids along the royal aisle.
  const addGoldBullionStack = (px: number, pz: number): void => {
    addBox(ctx, 2.6, 0.25, 1.8, m.darkStone, px, V, pz);
    for (let r = 0; r < 4; r++) {
      const count = 4 - r;
      for (let i = 0; i < count; i++) {
        addBox(
          ctx,
          0.52,
          0.26,
          1.35,
          m.gold,
          px - ((count - 1) * 0.58) / 2 + i * 0.58,
          V + 0.25 + r * 0.27,
          pz
        );
      }
    }
  };
  addGoldBullionStack(6.5, 494.5);
  addGoldBullionStack(16.5, 494.5);

  // Giant Sparkling Diamonds & Royal Gems on pedestals and atop the gold mountains!
  const diamondSpots: ReadonlyArray<{ x: number; y: number; z: number; s: number; isRuby?: boolean }> = [
    { x: chuteX, y: V + 5.1, z: chuteZ, s: 0.95 },
    { x: 21.0, y: V + 4.8, z: 502.5, s: 0.88 },
    { x: -8.0, y: V + 4.7, z: 502.5, s: 0.85, isRuby: true },
    { x: -8.5, y: V + 4.4, z: 485.0, s: 0.82 },
    { x: 27.5, y: V + 3.9, z: 485.5, s: 0.78, isRuby: true },
    { x: 11.5, y: V + 2.35, z: 490.0, s: 1.15 }, // Centerpiece Royal Diamond on pedestal at MINE_POI.royalVault
    { x: 8.5, y: V + 1.95, z: 490.0, s: 0.72, isRuby: true },
    { x: 14.5, y: V + 1.95, z: 490.0, s: 0.72 },
  ];

  // Centerpiece Royal Diamond Pedestal at (11.5, V, 490).
  addBox(ctx, 8.2, 0.5, 3.2, m.darkStone, 11.5, V, 490.0);
  addBox(ctx, 7.6, 0.9, 2.6, m.stone, 11.5, V + 0.5, 490.0);
  addBox(ctx, 7.9, 0.25, 2.9, m.gold, 11.5, V + 1.4, 490.0);

  for (const d of diamondSpots) {
    const gem = new THREE.Mesh(diamondGeo, d.isRuby ? rubyMat : diamondMat);
    gem.scale.set(d.s * 0.85, d.s * 1.25, d.s * 0.85);
    gem.position.set(d.x, d.y, d.z);
    gem.rotation.y = 0.6;
    ctx.group.add(gem);
  }
}
// #endregion

