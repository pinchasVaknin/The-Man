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

/** Summary: Dragon head anchor: centre of the snout tip line, on the forge's south wall. */
const DRAGON = { lx: MINE_POI.dragonMouth.lx, wallLz: 454, jawLz: 438, mouthY: -48 } as const;
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
  const lavaMat = new THREE.MeshStandardMaterial({ map: lavaMap, emissiveMap: lavaMap, emissive: 0xff5a10, emissiveIntensity: 1.6, roughness: 0.7 });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.85 });
  const vertexStone = ctx.materials.statue;
  ctx.ownMaterial(runeMat, lavaMat, flameMat);

  const golem = buildGolem(ctx, vertexStone, runeMat);
  buildGolemChamber(ctx, runeMat);
  buildPassage(ctx);
  const flames = buildDragonHead(ctx, vertexStone, lavaMat, flameMat);
  buildForgeFloor(ctx, lavaMat);
  buildTreasure(ctx);

  return (t: number): void => {
    golem.position.y = Math.sin(t * 1.1) * 0.06;
    golem.scale.y = 1 + Math.sin(t * 1.1) * 0.006;
    runeMat.color.setHSL(0.55, 1, 0.55 + Math.sin(t * 2.0) * 0.12);
    lavaMap.offset.set(t * 0.012, -t * 0.03);
    lavaMat.emissiveIntensity = 1.5 + Math.sin(t * 1.7) * 0.25;
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

function addMerged(ctx: ISetPieceContext, parts: IPart[], m: THREE.Material, x: number, y: number, z: number, yaw = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(ctx.own(mergeParts(parts)), m);
  mesh.position.set(x, y, z);
  mesh.rotation.y = yaw;
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

// #region Dragon Head
/**
 * Summary: The dragon-head furnace carved into the south wall: skull, snout, jaws with teeth,
 *          horns, brow, glowing eyes and nostrils, gold engravings, and fire in the open mouth.
 * @returns Flame meshes for the flicker animation.
 */
function buildDragonHead(ctx: ISetPieceContext, stone: THREE.Material, lavaMat: THREE.Material, flameMat: THREE.Material): THREE.Mesh[] {
  const m = ctx.materials;
  const { lx, wallLz, jawLz, mouthY } = DRAGON;
  const head: IPart[] = [
    // Face plate merging the head into the cliff.
    box(34, 30, 4, DRAGON_STONE, 0, FORGE, wallLz + 2),
    // Skull and brow.
    box(20, 10, 12, DRAGON_STONE, 0, mouthY + 9, wallLz - 6),
    box(22, 2.2, 3, DRAGON_SCORCHED, 0, mouthY + 13.2, jawLz + 4.6),
    // Upper snout and its teeth.
    box(13, 5, 12, DRAGON_STONE, 0, mouthY + 5, jawLz + 6),
    box(13.4, 1.0, 12.2, DRAGON_SCORCHED, 0, mouthY + 5, jawLz + 6),
    // Lower jaw resting at the pool edge.
    box(13, 3.2, 12, DRAGON_STONE, 0, FORGE - 0.8, jawLz + 6),
    // Horns sweeping back and up.
    part(new THREE.ConeGeometry(1.6, 11, 6), DRAGON_STONE, -9, mouthY + 20, wallLz - 4, -0.9, 0, 0.45),
    part(new THREE.ConeGeometry(1.6, 11, 6), DRAGON_STONE, 9, mouthY + 20, wallLz - 4, -0.9, 0, -0.45),
    // Nostril bosses.
    box(2.2, 1.4, 2.2, DRAGON_SCORCHED, -3, mouthY + 10, jawLz + 0.6),
    box(2.2, 1.4, 2.2, DRAGON_SCORCHED, 3, mouthY + 10, jawLz + 0.6),
    // Dwarven engravings in gold along brow and jaw.
    box(18, 0.25, 0.12, GOLD, 0, mouthY + 14.6, jawLz + 3.05),
    box(13.2, 0.25, 0.12, GOLD, 0, FORGE + 1.6, jawLz - 0.05),
    box(13.2, 0.25, 0.12, GOLD, 0, mouthY + 9.6, jawLz - 0.05),
  ];
  // Crest ridges along the top of the skull.
  for (let i = 0; i < 6; i++) head.push(part(new THREE.ConeGeometry(0.9, 2.4, 4), DRAGON_SCORCHED, 0, mouthY + 20, wallLz - 10 + i * 2.2));
  // Teeth: down from the upper snout, up from the lower jaw.
  for (let i = 0; i < 9; i++) {
    const x = -5.6 + i * 1.4;
    head.push(part(new THREE.ConeGeometry(0.42, 1.9, 5), 0xd8d0c0, x, mouthY + 4.1, jawLz + 0.6, Math.PI));
    head.push(part(new THREE.ConeGeometry(0.38, 1.6, 5), 0xd8d0c0, x + 0.7, FORGE + 3.0, jawLz + 0.6));
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      head.push(part(new THREE.ConeGeometry(0.4, 1.8, 5), 0xd8d0c0, side * 6.2, mouthY + 4.1, jawLz + 2.4 + i * 2.2, Math.PI));
    }
  }
  addMerged(ctx, head, stone, lx, 0, 0);

  // Mouth: dark cavity, the furnace fire deep inside, a lava tongue and the fall into the pool.
  addBox(ctx, 11, mouthY + 4 - (FORGE + 2.4), 9, m.void, lx, FORGE + 2.4, jawLz + 6.5);
  const glow = addBox(ctx, 10, 5, 0.6, m.molten, lx, FORGE + 2.6, wallLz - 4);
  glow.name = 'ancient-mine-dragon-fire';
  const tongue = new THREE.Mesh(ctx.own(new THREE.PlaneGeometry(9, 12)), lavaMat);
  tongue.rotation.x = -Math.PI / 2 + 0.05;
  tongue.position.set(lx, FORGE + 2.45, jawLz + 6.5);
  ctx.group.add(tongue);
  const fall = new THREE.Mesh(ctx.own(new THREE.PlaneGeometry(9, FORGE + 2.4 - LAVA + 0.4)), lavaMat);
  fall.position.set(lx, (FORGE + 2.4 + LAVA) / 2, jawLz - 0.1);
  fall.rotation.x = 0.25;
  ctx.group.add(fall);
  const flames: THREE.Mesh[] = [];
  const flameGeo = ctx.own(new THREE.ConeGeometry(0.9, 3.2, 6));
  for (let i = 0; i < 7; i++) {
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.userData.isAnimated = true;
    flame.position.set(lx - 4.2 + i * 1.4, FORGE + 4.2, wallLz - 6 - (i % 2) * 1.2);
    ctx.group.add(flame);
    flames.push(flame);
  }
  // Glowing eyes under the brow, and heat-cracked rock around the head.
  // Eyes sit on the skull's front face, under the brow ridge.
  for (const x of [-5.5, 5.5]) addBox(ctx, 2.6, 1.6, 0.4, m.molten, lx + x, mouthY + 11.2, jawLz + 3.85);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const crack = addBox(ctx, 0.25, 5 + (i % 4) * 2, 0.1, m.molten, lx + Math.cos(a) * 16, FORGE + 12 + Math.sin(a) * 11, wallLz - 0.1);
    crack.rotation.z = a + Math.PI / 2 + 0.3 * ((i % 3) - 1);
  }
  ctx.addLight(lx, FORGE + 5, jawLz - 2, 0xff4a10, 14);
  ctx.addLight(lx - 12, FORGE + 3, jawLz - 4, 0xff6a1a, 8);
  ctx.addLight(lx + 12, FORGE + 3, jawLz - 4, 0xff6a1a, 8);
  return flames;
}
// #endregion

// #region Forge Floor
/** Summary: Textured lava for every lava surface, basalt columns, glowing floor cracks, stone platforms. */
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
  // Basalt columns in clusters against the side walls.
  const hex = ctx.own(new THREE.CylinderGeometry(0.8, 0.8, 1, 6));
  const columns: THREE.Matrix4[] = [];
  for (const x of [-38.8, 38.8]) {
    for (let lz = 390; lz < 452; lz += 1.7) {
      const h = 1.5 + Math.abs(Math.sin(lz * 1.7 + x)) * 4.5;
      const dx = Math.sin(lz * 3.1) * 0.6;
      columns.push(new THREE.Matrix4().compose(new THREE.Vector3(x + dx, FORGE + h / 2, lz), new THREE.Quaternion(), new THREE.Vector3(1, h, 1)));
    }
  }
  const basalt = new THREE.InstancedMesh(hex, m.darkStone, columns.length);
  columns.forEach((mx, i) => basalt.setMatrixAt(i, mx));
  basalt.instanceMatrix.needsUpdate = true;
  basalt.computeBoundingSphere();
  ctx.group.add(basalt);
  // Glowing cracks in the floor around the pool.
  for (let i = 0; i < 18; i++) {
    const side = i % 2 ? 1 : -1;
    const crack = addBox(ctx, 0.18, 0.03, 3 + (i % 4), m.molten, side * (31.5 + (i % 3) * 2), FORGE + 0.005, 398 + i * 2.6);
    crack.rotation.y = 0.6 * ((i % 5) - 2) * 0.3;
  }
  // Stepping stones: hexagonal basalt pillars with a glowing rim where they meet the lava.
  for (const s of [...LAVA_STEPPING_STONES, TREASURE_ISLAND]) {
    const depth = s.topY - MINE_LEVEL_Y.lavaBed;
    const pillar = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(s.r, s.r * 1.08, depth, 6)), m.darkStone);
    pillar.position.set(s.lx, MINE_LEVEL_Y.lavaBed + depth / 2, s.lz);
    ctx.group.add(pillar);
    const top = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(s.r * 0.98, s.r * 0.98, 0.12, 6)), m.stone);
    top.position.set(s.lx, s.topY - 0.05, s.lz);
    ctx.group.add(top);
    const rim = new THREE.Mesh(ctx.own(new THREE.TorusGeometry(s.r * 1.05, 0.12, 4, 6)), m.molten);
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(s.lx, LAVA + 0.06, s.lz);
    ctx.group.add(rim);
  }
}
// #endregion

// #region Treasure
/** Summary: The ancient dwarven treasure chest: dark iron, domed lid, gold bands, lock and crest. */
function buildTreasure(ctx: ISetPieceContext): void {
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
  const chest = new THREE.Mesh(ctx.own(mergeParts(parts)), ctx.materials.statue);
  chest.position.set(f.lx, f.baseY, f.lz);
  chest.rotation.y = Math.PI;
  ctx.group.add(chest);
  // Gold-lit pedestal ring on the island.
  const ring = new THREE.Mesh(ctx.own(new THREE.TorusGeometry(2.2, 0.15, 4, 24)), ctx.materials.gold);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(f.lx, f.baseY + 0.03, f.lz);
  ctx.group.add(ring);
  ctx.addLight(f.lx, f.baseY + 3.5, f.lz, 0xffd070, 8);
}
// #endregion
