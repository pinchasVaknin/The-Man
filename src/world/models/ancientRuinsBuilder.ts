// ============================================================================
// MODULE: World / Models / Skybound Isles / Ancient Ruins
// DESIGN: Placed from the Ancient Ruins domain data; walls, piers, statues and railings are
//         drawn from their solid boxes, so the ruins collide exactly where they stand. Glow
//         follows the rune puzzle: each awakened rune lights its pedestal and its tile on the
//         clue wall, and the temple door sinks once all four burn.
// SUMMARY: Builds and animates the Ancient Sky Ruins: temple with collapsed roof and great
//          door, portico, clue wall, broken stair, landing and lone column, the sealed room,
//          the broken bridge, statues, rune pedestals and overgrowth.
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
import { boxMesh, buildRailInstances, createMaterials, rampSlab, type IHarborMaterials } from './skyHarborShared';
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
  const ruinStone = new THREE.MeshStandardMaterial({ color: 0xa9ad9a, roughness: 0.92, bumpMap: ctx.textures.rockBump, bumpScale: 0.08 });
  const moss = new THREE.MeshStandardMaterial({ color: 0x4d7c3a, roughness: 0.95 });
  const runeOff = new THREE.MeshStandardMaterial({ color: 0x5b6470, emissive: 0x0f172a, emissiveIntensity: 0.2, roughness: 0.6 });
  const runeOn = new THREE.MeshStandardMaterial({ color: 0x99f6e4, emissive: 0x14b8a6, emissiveIntensity: 2.4, roughness: 0.3 });
  ctx.disposableMaterials.push(ruinStone, moss, runeOff, runeOn);

  buildSolidStone(box, ruinStone, group);
  const door = buildTemple(ctx, mats, box, ruinStone, moss, group);
  const runes = buildRunesAndClue(ctx, box, ruinStone, runeOff, group);
  buildStairColumnAndBridge(ctx, mats, box, ruinStone, moss, group);
  buildOvergrowth(ctx, moss, group);
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
/** Temple walls, sealed room walls, columns, piers and statue bodies, drawn from their boxes. */
function buildSolidStone(box: THREE.BoxGeometry, stone: THREE.Material, group: THREE.Group): void {
  const drawn = RUINS_SOLID_BOXES.filter(
    (b) => b.id.startsWith('ruins-temple-wall') || b.id.startsWith('ruins-sealed-wall') || b.id === 'ruins-stair-landing-pier'
  );
  for (const b of drawn) {
    group.add(boxMesh(box, stone, (b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, (b.minZ + b.maxZ) / 2, b.maxX - b.minX, b.maxY - b.minY, b.maxZ - b.minZ, b.yaw ?? 0));
  }
}
// #endregion

// #region Temple
function buildTemple(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  box: THREE.BoxGeometry,
  stone: THREE.Material,
  moss: THREE.Material,
  group: THREE.Group
): THREE.Group {
  const T = RUINS_TEMPLE;
  const cx = (T.minX + T.maxX) / 2;
  // Roof: the north half survives, the south half has fallen in.
  group.add(boxMesh(box, stone, cx, T.wallTopY + 0.4, T.minZ + 4.5, T.maxX - T.minX + 1.6, 0.8, 9.0));
  group.add(boxMesh(box, moss, cx, T.wallTopY + 0.85, T.minZ + 4.0, T.maxX - T.minX, 0.12, 7.0));
  group.add(boxMesh(box, stone, T.minX + 3.0, T.wallTopY - 1.2, T.minZ + 10.5, 6.0, 0.7, 3.0, 0.25));
  group.add(boxMesh(box, mats.marble, cx, DECK_Y + 0.04, (T.minZ + T.maxZ) / 2, T.maxX - T.minX - 0.8, 0.06, T.maxZ - T.minZ - 0.8));
  // Altar at the back.
  group.add(boxMesh(box, mats.marble, cx, DECK_Y + 0.6, T.minZ + 1.6, 4.0, 1.2, 1.4));

  // Portico columns, some broken off.
  const columnGeo = new THREE.CylinderGeometry(0.6, 0.7, 1, 12);
  ctx.disposableGeometries.push(columnGeo);
  for (const c of RUINS_PORTICO_COLUMNS) {
    const column = new THREE.Mesh(columnGeo, stone);
    column.scale.y = c.height;
    column.position.set(c.x, DECK_Y + c.height / 2, c.z);
    group.add(column);
    if (c.height < 7) group.add(boxMesh(box, stone, c.x + 0.4, c.height + DECK_Y + 0.15, c.z, 1.3, 0.3, 1.1, 0.6));
  }

  // The great door: a carved slab that sinks into the floor when the runes all burn.
  const d = RUINS_TEMPLE_DOOR;
  const door = new THREE.Group();
  door.add(boxMesh(box, mats.darkStone, (d.minX + d.maxX) / 2, (d.minY + d.maxY) / 2, (d.minZ + d.maxZ) / 2, d.maxX - d.minX, d.maxY - d.minY, d.maxZ - d.minZ));
  for (let k = 0; k < 4; k++) {
    door.add(boxMesh(box, mats.runeDim, d.minX + 0.6 + k * 1.05, d.minY + 3.0, d.maxZ + 0.02, 0.5, 0.5, 0.04));
  }
  group.add(door);
  // Lintel over the doorway.
  group.add(boxMesh(box, stone, (d.minX + d.maxX) / 2, d.maxY + 0.5, (d.minZ + d.maxZ) / 2, d.maxX - d.minX + 2.0, 1.0, 1.0));
  return door;
}
// #endregion

// #region Runes And Clue
function buildRunesAndClue(ctx: IWorldModelBuildContext, box: THREE.BoxGeometry, stone: THREE.Material, runeOff: THREE.Material, group: THREE.Group): IRuneVisual[] {
  const glyphGeo = new THREE.TorusGeometry(0.32, 0.07, 6, 16);
  glyphGeo.rotateX(Math.PI / 2);
  ctx.disposableGeometries.push(glyphGeo);
  // Clue wall beside the door: four tiles, one per rune, each carved with a pictogram of its place.
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
  ctx.disposableGeometries.push(discGeo, pillarGeo);
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
  // Broken edge of the stair: a jagged chunk hanging past the landing.
  group.add(boxMesh(box, stone, RUINS_STAIR_LANDING.x + RUINS_STAIR_LANDING.radius, RUINS_STAIR_LANDING.y - 0.9, RUINS_STAIR_LANDING.z + 0.6, 1.2, 1.2, 1.6, 0.5));

  // Broken bridge with an arch underneath and a jagged tip.
  const b = RUINS_BROKEN_BRIDGE;
  group.add(rampSlab(box, stone, b, 0.9));
  group.add(boxMesh(box, moss, (b.ax + b.bx) / 2, DECK_Y + 0.02, (b.az + b.bz) / 2, 3.0, 0.04, 1.2, Math.atan2(-(b.bz - b.az), b.bx - b.ax)));
  group.add(boxMesh(box, stone, b.bx + 0.3, DECK_Y - 1.3, b.bz + 0.4, 1.6, 1.8, 1.4, 0.7));

  // Sealed room: a low roof and a bush half-hiding the crack.
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

  // Statues: pedestal, body and head blocks with a broken arm.
  for (const s of RUINS_STATUES) {
    group.add(boxMesh(box, mats.marble, s.x, DECK_Y + 0.5, s.z, 2.4, 1.0, 2.4));
    group.add(boxMesh(box, mats.marble, s.x, DECK_Y + 1.0 + (s.height - 2.2) / 2, s.z, 1.3, s.height - 2.2, 0.9));
    group.add(boxMesh(box, mats.marble, s.x, DECK_Y + s.height - 0.6, s.z, 0.8, 0.9, 0.8));
    group.add(boxMesh(box, mats.marble, s.x + 0.9, DECK_Y + s.height - 2.0, s.z, 0.35, 1.6, 0.35, 0.4));
  }
}
// #endregion

// #region Overgrowth
/** Vines hanging from the temple walls and moss patches on the deck. */
function buildOvergrowth(ctx: IWorldModelBuildContext, moss: THREE.Material, group: THREE.Group): void {
  const vineGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 4);
  const patchGeo = new THREE.CylinderGeometry(1, 1, 0.05, 10);
  ctx.disposableGeometries.push(vineGeo, patchGeo);
  const T = RUINS_TEMPLE;
  for (let k = 0; k < 14; k++) {
    const onWest = k % 2 === 0;
    const len = 2 + (k % 4) * 1.3;
    const vine = new THREE.Mesh(vineGeo, moss);
    vine.scale.y = len;
    vine.position.set(onWest ? T.minX - 0.45 : T.maxX + 0.45, T.wallTopY - 2.6 - len / 2, T.minZ + 1.5 + (k * 1.1) % (T.maxZ - T.minZ - 2));
    group.add(vine);
  }
  for (let k = 0; k < 9; k++) {
    const a = k * 2.39996;
    const r = Math.sqrt((k + 0.5) / 9) * ISLAND.radius * 0.85;
    const patch = new THREE.Mesh(patchGeo, moss);
    patch.scale.set(1.2 + (k % 3) * 0.6, 1, 1.0 + (k % 2) * 0.5);
    patch.position.set(ISLAND.x + Math.cos(a) * r, DECK_Y + 0.03, ISLAND.z + Math.sin(a) * r);
    group.add(patch);
  }
}
// #endregion
