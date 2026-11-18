// ============================================================================
// MODULE: World / Models / Skybound Isles / Ancient Ruins
// DESIGN: Placed from the Ancient Ruins domain data, upgraded to match the reference artwork:
//         grand classical Greek/Celestial ruined temple with fluted columns, carved capitals,
//         entablature frieze, an arched pediment crown on the roofline, multi-part ancient
//         trees and canopy overgrowth growing atop the temple roof and colonnade, processional
//         flagstone walkways, and dramatic waterfalls pouring down the mossy cliff sides.
// SUMMARY: Builds and animates the Ancient Sky Ruins.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import {
  getSkyIsland,
  RUINS_TEMPLE,
  RUINS_TEMPLE_DOOR,
  RUINS_PORTICO_COLUMNS,
  RUINS_CLUE_WALL,
  RUINS_STAIR_LANDING,
  RUINS_BROKEN_STAIR,
  RUINS_COLUMN_TOP,
  RUINS_SEALED_CRACK,
  RUINS_SEALED_ROOM,
  RUINS_BROKEN_BRIDGE,
  RUINS_STATUES,
  RUINS_RUNES,
  RUINS_SOLID_BOXES,
  getSkyPuzzleState,
  isSkyPuzzleSolved,
} from '../domain/landmarksRegistry';
import {
  boxMesh,
  buildInstancedSkyTrees,
  buildRailInstances,
  createMaterials,
  rampSlab,
  type IHarborMaterials,
} from './skyHarborShared';
import type { IWorldModelBuildContext } from './types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What the Ruins builder hands back to the frame loop. */
export interface IAncientRuinsBuildResult {
  readonly group: THREE.Group;
  /** Animates rune glow, clue tiles and the temple door. */
  readonly update: (elapsedSec: number) => void;
}

interface IRuneVisual {
  readonly id: string;
  readonly glyph: THREE.Mesh;
  readonly clueTile: THREE.Mesh;
}
// #endregion

// #region Tuning
const ISLAND = getSkyIsland('ancient-sky-ruins')!;
const DECK_Y = ISLAND.deckY;
/** How far (m) the temple door sinks into the floor once open. */
const DOOR_SINK_M = 6.5;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Build
/**
 * Summary: Builds the Ancient Sky Ruins and returns their frame update.
 * @param ctx Shared build context.
 * @returns The root group (not yet added to the scene) and the per-frame update.
 */
export function buildAncientRuins(ctx: IWorldModelBuildContext): IAncientRuinsBuildResult {
  const group = new THREE.Group();
  group.name = 'ancient-sky-ruins';
  const mats = createMaterials(ctx);
  const box = new THREE.BoxGeometry(1, 1, 1);
  ctx.disposableGeometries.push(box);

  const ruinStone = new THREE.MeshStandardMaterial({ color: 0x9ca38f, roughness: 0.9, bumpMap: ctx.textures.rockBump, bumpScale: 0.08 });
  const moss = new THREE.MeshStandardMaterial({ color: 0x3f6e33, roughness: 0.92 });
  const lushLeaves = new THREE.MeshStandardMaterial({ color: 0x2e5c25, emissive: 0x14330e, emissiveIntensity: 0.25, roughness: 0.85 });
  const runeOff = new THREE.MeshStandardMaterial({ color: 0x5b6470, emissive: 0x0f172a, emissiveIntensity: 0.2, roughness: 0.6 });
  const runeOn = new THREE.MeshStandardMaterial({ color: 0x99f6e4, emissive: 0x14b8a6, emissiveIntensity: 2.4, roughness: 0.3 });
  ctx.disposableMaterials.push(ruinStone, moss, lushLeaves, runeOff, runeOn);

  buildSolidStone(box, ruinStone, group);
  const door = buildTemple(ctx, mats, box, ruinStone, moss, lushLeaves, group);
  const runes = buildRunesAndClue(ctx, box, ruinStone, runeOff, group);
  buildStairColumnAndBridge(ctx, mats, box, ruinStone, moss, group);
  buildOvergrowthAndWaterfalls(ctx, mats, box, ruinStone, moss, lushLeaves, group);
  group.add(buildRailInstances(ctx, box, ruinStone, RUINS_SOLID_BOXES));

  return {
    group,
    update: (elapsedSec: number) => {
      const lit = getSkyPuzzleState().ruinsRunesLit;
      for (const r of runes) {
        const on = lit.includes(r.id);
        r.glyph.material = on ? runeOn : runeOff;
        r.clueTile.material = on ? runeOn : runeOff;
        r.glyph.rotation.y = on ? elapsedSec * 0.8 : 0;
      }
      runeOn.emissiveIntensity = 2.2 + Math.sin(elapsedSec * 2.5) * 0.4;
      const target = isSkyPuzzleSolved('ruins-temple') ? -DOOR_SINK_M : 0;
      door.position.y += (target - door.position.y) * 0.04;
    },
  };
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Solid Stone
function buildSolidStone(box: THREE.BoxGeometry, stone: THREE.Material, group: THREE.Group): void {
  const drawn = RUINS_SOLID_BOXES.filter(
    (b) => b.id.startsWith('ruins-sealed-wall') || b.id === 'ruins-stair-landing-pier'
  );
  for (const b of drawn) {
    group.add(boxMesh(box, stone, (b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, (b.minZ + b.maxZ) / 2, b.maxX - b.minX, b.maxY - b.minY, b.maxZ - b.minZ, b.yaw ?? 0));
  }
  const templeWalls = RUINS_SOLID_BOXES.filter((b) => b.id.startsWith('ruins-temple-wall'));
  for (const b of templeWalls) {
    const cx = (b.minX + b.maxX) / 2;
    const cz = (b.minZ + b.maxZ) / 2;
    const sx = b.maxX - b.minX;
    const sz = b.maxZ - b.minZ;
    group.add(boxMesh(box, stone, cx, b.minY + 0.7, cz, sx, 1.4, sz, b.yaw ?? 0));
    group.add(boxMesh(box, stone, cx, b.maxY - 0.55, cz, sx + 0.2, 1.1, sz + 0.2, b.yaw ?? 0));
  }
}
// #endregion

// #region Classical Ruined Temple
function buildTemple(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  box: THREE.BoxGeometry,
  stone: THREE.Material,
  moss: THREE.Material,
  lushLeaves: THREE.Material,
  group: THREE.Group
): THREE.Group {
  const T = RUINS_TEMPLE;
  const cx = (T.minX + T.maxX) / 2;
  const spanX = T.maxX - T.minX;
  const wallH = T.wallTopY - DECK_Y;

  // Stepped classical entablature cornice and roof over the temple, plus arched pediment crown.
  group.add(boxMesh(box, stone, cx, T.wallTopY + 0.45, (T.minZ + T.maxZ) / 2, spanX + 1.8, 0.9, T.maxZ - T.minZ + 1.4));
  group.add(boxMesh(box, stone, cx, T.wallTopY + 1.1, (T.minZ + T.maxZ) / 2, spanX + 2.4, 0.45, T.maxZ - T.minZ + 2.0));
  group.add(boxMesh(box, moss, cx, T.wallTopY + 1.38, (T.minZ + T.maxZ) / 2, spanX + 1.8, 0.18, T.maxZ - T.minZ + 1.2));
  group.add(boxMesh(box, mats.marble, cx, DECK_Y + 0.04, (T.minZ + T.maxZ) / 2, spanX - 0.8, 0.06, T.maxZ - T.minZ - 0.8));

  // Stepped classical crepidoma threshold steps at the south temple portico entrance.
  for (let s = 0; s < 3; s++) {
    group.add(boxMesh(box, stone, cx, DECK_Y + 0.04 + s * 0.03, T.maxZ + 3.6 - s * 1.1, spanX + 1.6 - s * 0.4, 0.06, 1.0));
  }

  const pedimentArchGeo = new THREE.TorusGeometry(2.8, 0.55, 8, 24, Math.PI);
  const columnGeo = new THREE.CylinderGeometry(0.62, 0.74, 1, 14);
  const capitalGeo = new THREE.CylinderGeometry(0.98, 0.65, 0.52, 12);
  ctx.disposableGeometries.push(pedimentArchGeo, columnGeo, capitalGeo);

  for (const zPed of [T.maxZ + 0.4, T.minZ + 1.2]) {
    const pediment = new THREE.Mesh(pedimentArchGeo, stone);
    pediment.position.set(T.minX + 3.6, T.wallTopY + 1.35, zPed);
    group.add(pediment);
  }

  // Altar at the back of the sanctuary.
  group.add(boxMesh(box, mats.marble, cx, DECK_Y + 0.6, T.minZ + 1.6, 4.0, 1.2, 1.4));

  // Full perimeter colonnade: 7 columns along the entire back (North) wall (`T.minZ`),
  // 6 columns along both the West (`T.minX`) and East (`T.maxX`) walls, and columns flanking the South door,
  // plus the front portico columns.
  const perimeterCols: Array<{ x: number; z: number; height: number }> = [...RUINS_PORTICO_COLUMNS];
  const backColCount = 6;
  for (let i = 0; i <= backColCount; i++) {
    const x = T.minX + (i / backColCount) * spanX;
    perimeterCols.push({ x, z: T.minZ, height: wallH });
  }
  const sideColCount = 5;
  for (let j = 1; j <= sideColCount; j++) {
    const z = T.minZ + (j / sideColCount) * (T.maxZ - T.minZ);
    perimeterCols.push({ x: T.minX, z, height: wallH });
    perimeterCols.push({ x: T.maxX, z, height: wallH });
  }
  for (const x of [T.minX + 3.2, T.minX + 6.4, T.maxX - 6.4, T.maxX - 3.2]) {
    perimeterCols.push({ x, z: T.maxZ, height: wallH });
  }

  for (const c of perimeterCols) {
    group.add(boxMesh(box, stone, c.x, DECK_Y + 0.24, c.z, 1.75, 0.48, 1.75));
    const column = new THREE.Mesh(columnGeo, stone);
    column.scale.y = c.height;
    column.position.set(c.x, DECK_Y + c.height / 2, c.z);
    group.add(column);

    const cap = new THREE.Mesh(capitalGeo, stone);
    cap.position.set(c.x, DECK_Y + c.height - 0.15, c.z);
    group.add(cap);
  }

  // Entablature beam spanning across the tall portico columns.
  group.add(boxMesh(box, stone, cx, DECK_Y + 7.25, T.maxZ + 3.2, spanX + 1.2, 0.85, 1.5));
  group.add(boxMesh(box, moss, cx, DECK_Y + 7.72, T.maxZ + 3.2, spanX + 1.0, 0.18, 1.3));

  // Memory-optimized instanced world trees growing atop the ruined temple roof (matching reference image).
  buildInstancedSkyTrees(
    ctx,
    group,
    [
      [-4.2, 10.5, 0.85],
      [3.8, 11.2, 0.75],
      [-3.5, 3.5, 0.82],
      [2.8, 4.2, 0.72],
      [-0.5, 7.5, 0.78],
    ].map(([ox, oz, sc]) => ({
      x: cx + ox,
      y: T.wallTopY + 1.35,
      z: T.minZ + oz,
      scale: sc,
      style: 'broadleaf' as const,
    }))
  );

  // The great door: a carved slab that sinks into the floor when the runes all burn.
  const d = RUINS_TEMPLE_DOOR;
  const door = new THREE.Group();
  door.add(boxMesh(box, mats.darkStone, (d.minX + d.maxX) / 2, (d.minY + d.maxY) / 2, (d.minZ + d.maxZ) / 2, d.maxX - d.minX, d.maxY - d.minY, d.maxZ - d.minZ));
  for (let k = 0; k < 4; k++) {
    door.add(boxMesh(box, mats.runeDim, d.minX + 0.6 + k * 1.05, d.minY + 3.0, d.maxZ + 0.02, 0.5, 0.5, 0.04));
  }
  group.add(door);
  group.add(boxMesh(box, stone, (d.minX + d.maxX) / 2, d.maxY + 0.5, (d.minZ + d.maxZ) / 2, d.maxX - d.minX + 2.0, 1.0, 1.0));
  return door;
}
// #endregion

// #region Runes And Clue
function buildRunesAndClue(ctx: IWorldModelBuildContext, box: THREE.BoxGeometry, stone: THREE.Material, runeOff: THREE.Material, group: THREE.Group): IRuneVisual[] {
  const glyphGeo = new THREE.TorusGeometry(0.32, 0.07, 6, 16);
  glyphGeo.rotateX(Math.PI / 2);
  ctx.disposableGeometries.push(glyphGeo);
  const w = RUINS_CLUE_WALL;
  group.add(boxMesh(box, stone, w.x, w.y, w.z + 0.15, 4.4, 2.2, 0.3));
  return RUINS_RUNES.map((r, i) => {
    group.add(boxMesh(box, stone, r.x, r.y + 0.5, r.z, 0.7, 1.0, 0.7));
    const glyph = new THREE.Mesh(glyphGeo, runeOff);
    glyph.position.set(r.x, r.y + 1.08, r.z);
    group.add(glyph);
    const clueTile = boxMesh(box, runeOff, w.x - 1.5 + i * 1.0, w.y, w.z + 0.33, 0.7, 0.7, 0.04);
    group.add(clueTile);
    group.add(boxMesh(box, stone, w.x - 1.5 + i * 1.0, w.y - 0.15 + (i % 2) * 0.3, w.z + 0.37, 0.12 + i * 0.08, 0.12, 0.02));
    return { id: r.id, glyph, clueTile };
  });
}
// #endregion

// #region Stair, Column And Bridge
function buildStairColumnAndBridge(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  box: THREE.BoxGeometry,
  stone: THREE.Material,
  moss: THREE.Material,
  group: THREE.Group
): void {
  group.add(rampSlab(box, stone, RUINS_BROKEN_STAIR, 0.8));
  const discGeo = new THREE.CylinderGeometry(1, 0.85, 0.6, 16);
  const pillarGeo = new THREE.CylinderGeometry(1.5, 1.7, 1, 14);
  const supportArchGeo = new THREE.TorusGeometry(2.1, 0.28, 8, 18, Math.PI);
  ctx.disposableGeometries.push(discGeo, pillarGeo, supportArchGeo);

  // Stone support arch under the Broken Staircase (`RUINS_BROKEN_STAIR`).
  const st = RUINS_BROKEN_STAIR;
  const stairArch = new THREE.Mesh(supportArchGeo, stone);
  stairArch.position.set((st.ax + st.bx) / 2, DECK_Y + 0.1, (st.az + st.bz) / 2);
  stairArch.rotation.y = Math.atan2(-(st.bz - st.az), st.bx - st.ax);
  group.add(stairArch);

  for (const p of [RUINS_STAIR_LANDING, RUINS_COLUMN_TOP]) {
    const disc = new THREE.Mesh(discGeo, stone);
    disc.scale.set(p.radius, 1, p.radius);
    disc.position.set(p.x, p.y - 0.3, p.z);
    group.add(disc);
  }
  const column = new THREE.Mesh(pillarGeo, stone);
  column.scale.y = RUINS_COLUMN_TOP.y - DECK_Y - 0.6;
  column.position.set(RUINS_COLUMN_TOP.x, DECK_Y + (RUINS_COLUMN_TOP.y - DECK_Y - 0.6) / 2, RUINS_COLUMN_TOP.z);
  group.add(column);
  group.add(boxMesh(box, stone, RUINS_STAIR_LANDING.x + RUINS_STAIR_LANDING.radius, RUINS_STAIR_LANDING.y - 0.9, RUINS_STAIR_LANDING.z + 0.6, 1.2, 1.2, 1.6, 0.5));

  const b = RUINS_BROKEN_BRIDGE;
  group.add(rampSlab(box, stone, b, 0.9));
  group.add(boxMesh(box, moss, (b.ax + b.bx) / 2, DECK_Y + 0.02, (b.az + b.bz) / 2, 3.0, 0.04, 1.2, Math.atan2(-(b.bz - b.az), b.bx - b.ax)));
  group.add(boxMesh(box, stone, b.bx + 0.3, DECK_Y - 1.3, b.bz + 0.4, 1.6, 1.8, 1.4, 0.7));

  const R = RUINS_SEALED_ROOM;
  group.add(boxMesh(box, stone, (R.minX + R.maxX) / 2, R.wallTopY + 0.3, (R.minZ + R.maxZ) / 2, R.maxX - R.minX + 1.2, 0.6, R.maxZ - R.minZ + 1.2));
  const bushGeo = new THREE.IcosahedronGeometry(1.0, 1);
  ctx.disposableGeometries.push(bushGeo);
  for (const dz of [-1.9, 1.9]) {
    const bush = new THREE.Mesh(bushGeo, moss);
    bush.scale.set(0.9, 1.1, 1.0);
    bush.position.set(R.minX - 1.2, DECK_Y + 0.8, (RUINS_SEALED_CRACK.minZ + RUINS_SEALED_CRACK.maxZ) / 2 + dz);
    group.add(bush);
  }

  for (const s of RUINS_STATUES) {
    group.add(boxMesh(box, mats.marble, s.x, DECK_Y + 0.5, s.z, 2.4, 1.0, 2.4));
    group.add(boxMesh(box, mats.marble, s.x, DECK_Y + 1.0 + (s.height - 2.2) / 2, s.z, 1.3, s.height - 2.2, 0.9));
    group.add(boxMesh(box, mats.marble, s.x, DECK_Y + s.height - 0.6, s.z, 0.8, 0.9, 0.8));
    group.add(boxMesh(box, mats.marble, s.x + 0.9, DECK_Y + s.height - 2.0, s.z, 0.35, 1.6, 0.35, 0.4));
  }
}
// #endregion

// #region Overgrowth, Pathways And Cliff Waterfalls
function buildOvergrowthAndWaterfalls(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  box: THREE.BoxGeometry,
  stone: THREE.Material,
  moss: THREE.Material,
  lushLeaves: THREE.Material,
  group: THREE.Group
): void {
  const vineGeo = new THREE.CylinderGeometry(0.06, 0.04, 1, 5);
  const patchGeo = new THREE.CylinderGeometry(1, 1, 0.05, 10);
  const fallGeo = new THREE.CylinderGeometry(0.95, 1.85, 34, 10, 1, true);
  const waterfallMat = new THREE.MeshStandardMaterial({
    color: 0xcffafe,
    emissive: 0x7dd3fc,
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  ctx.disposableGeometries.push(vineGeo, patchGeo, fallGeo);
  ctx.disposableMaterials.push(waterfallMat);

  const T = RUINS_TEMPLE;

  // Hanging vines draping from the temple walls and cliff rim.
  for (let k = 0; k < 22; k++) {
    const onWest = k % 2 === 0;
    const len = 2.4 + (k % 4) * 1.5;
    const vine = new THREE.Mesh(vineGeo, moss);
    vine.scale.y = len;
    vine.position.set(onWest ? T.minX - 0.45 : T.maxX + 0.45, T.wallTopY - 2.2 - len / 2, T.minZ + 1.0 + (k * 1.1) % (T.maxZ - T.minZ - 1));
    group.add(vine);
  }

  // Rim vines hanging down the rocky cliff edges of the Ruins island.
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2;
    const r = ISLAND.radius * 0.96;
    const len = 6.0 + (i % 4) * 3.2;
    const cliffVine = new THREE.Mesh(vineGeo, moss);
    cliffVine.scale.set(2.2, len, 2.2);
    cliffVine.position.set(ISLAND.x + Math.cos(ang) * r, DECK_Y - 1.2 - len / 2, ISLAND.z + Math.sin(ang) * r);
    group.add(cliffVine);
  }

  // Multiple dramatic waterfalls pouring off the mossy cliff sides into the clouds below (matching reference image).
  for (const [ang, fallLen] of [
    [0.85, 34],
    [1.45, 38],
    [2.15, 32],
    [-0.95, 35],
    [-2.25, 30],
  ] as const) {
    const fx = ISLAND.x + Math.cos(ang) * (ISLAND.radius - 0.4);
    const fz = ISLAND.z + Math.sin(ang) * (ISLAND.radius - 0.4);
    const fall = new THREE.Mesh(fallGeo, waterfallMat);
    fall.scale.y = fallLen / 34;
    fall.position.set(fx, DECK_Y - fallLen / 2, fz);
    group.add(fall);
  }

  // Memory-optimized instanced world trees flanking the temple on the outer cliff edges
  // (placed well clear of `RUINS_SEALED_ROOM` at `localX: -24..-16, localZ: 2..10`).
  buildInstancedSkyTrees(
    ctx,
    group,
    [
      [-19.5, -6.5, 1.05],
      [-14.5, 16.5, 0.95],
      [19.0, -8.5, 1.0],
      [18.5, 8.0, 0.9],
    ].map(([lx, lz, sc]) => ({
      x: ISLAND.x + lx,
      y: DECK_Y,
      z: ISLAND.z + lz,
      scale: sc,
      style: 'broadleaf' as const,
    }))
  );

  for (let k = 0; k < 12; k++) {
    const a = k * 2.39996;
    const r = Math.sqrt((k + 0.5) / 12) * ISLAND.radius * 0.85;
    const patch = new THREE.Mesh(patchGeo, moss);
    patch.scale.set(1.4 + (k % 3) * 0.6, 1, 1.1 + (k % 2) * 0.5);
    patch.position.set(ISLAND.x + Math.cos(a) * r, DECK_Y + 0.03, ISLAND.z + Math.sin(a) * r);
    group.add(patch);
  }
}
// #endregion
