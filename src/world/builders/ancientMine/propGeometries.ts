// ============================================================================
// MODULE: World / Builders / Ancient Mine
// DESIGN: Each prop kind is built once from primitive parts, coloured per vertex and merged
//         into one BufferGeometry, so every kind renders as a single instanced draw call.
// SUMMARY: Geometry factories for the mine props (crates, barrels, tables, carts, torches,
//          pillars, veins...). Origin at the floor centre, +Z is the prop's front.
//          Does not place, light or add anything to a scene.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { IMinePropKind } from '../../domain/landmarks/ancientMine/ancientMineProps';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Palette
/** Summary: Shared colours of the dwarven material palette. */
export const MINE_PALETTE = {
  oak: 0x7a5232,
  darkOak: 0x4e3320,
  iron: 0x3d3d44,
  rust: 0x6e4630,
  gold: 0xd6a23e,
  granite: 0x8b8378,
  darkGranite: 0x55504a,
  ember: 0xff7a1a,
  coal: 0x1e1a18,
  ore: 0x6d6258,
  rope: 0xb09060,
} as const;

/** Summary: Vein and crystal colours by tint. */
export const MINERAL_TINTS = {
  iron: 0x8a5a44,
  copper: 0xc07040,
  gold: 0xe8b84a,
  blue: 0x48c8ff,
  purple: 0xb060ff,
  dark: 0x2a2630,
} as const;
// #endregion

// #region Part Helper
export interface IPart {
  readonly geo: THREE.BufferGeometry;
  readonly color: number;
}

/** Summary: A coloured, positioned primitive part. */
export function part(geo: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): IPart {
  geo.rotateX(rx);
  geo.rotateY(ry);
  geo.rotateZ(rz);
  geo.translate(x, y, z);
  return { geo, color };
}

/** Summary: Axis-aligned box part whose bottom sits at `y`. */
export function box(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0): IPart {
  return part(new THREE.BoxGeometry(w, h, d), color, x, y + h / 2, z);
}

/** Summary: Upright cylinder part whose bottom sits at `y`. */
export function cyl(rTop: number, rBottom: number, h: number, color: number, x = 0, y = 0, z = 0, segments = 10): IPart {
  return part(new THREE.CylinderGeometry(rTop, rBottom, h, segments), color, x, y + h / 2, z);
}

/** Summary: Merges parts into one geometry carrying a per-vertex colour attribute. */
export function mergeParts(parts: readonly IPart[]): THREE.BufferGeometry {
  const prepared = parts.map(({ geo, color }) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    const c = new THREE.Color(color);
    const colors = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) {
      colors[i] = c.r;
      colors[i + 1] = c.g;
      colors[i + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  });
  const merged = mergeGeometries(prepared, false);
  for (const g of prepared) g.dispose();
  if (merged === null) throw new Error('MINE_PROP_MERGE_FAILED');
  merged.computeBoundingSphere();
  return merged;
}
// #endregion

// ======================== PUBLIC FACTORIES ======================== \\
// #region Build Prop Geometry
/**
 * Summary: Builds the merged geometry of one prop kind.
 * Design: Shapes stay simple and readable at distance; detail comes from silhouette (bands,
 *         legs, handles), not polygon count.
 * @param kind The prop kind.
 * @param tintColor Colour used by tinted kinds (veins, crystals, ore); ignored by the others.
 * @returns A new geometry; the caller owns and disposes it.
 */
export function buildPropGeometry(kind: IMinePropKind, tintColor: number = MINERAL_TINTS.iron): THREE.BufferGeometry {
  const P = MINE_PALETTE;
  switch (kind) {
    case 'crate':
      return mergeParts(crateParts(0, 0));
    case 'crateStack':
      return mergeParts([...crateParts(-0.55, 0), ...crateParts(0.55, 0), ...crateParts(0, 1.1)]);
    case 'barrel':
      return mergeParts([
        cyl(0.38, 0.38, 1.2, P.oak),
        cyl(0.45, 0.45, 0.08, P.iron, 0, 0.2),
        cyl(0.47, 0.47, 0.08, P.iron, 0, 0.56),
        cyl(0.45, 0.45, 0.08, P.iron, 0, 0.92),
      ]);
    case 'oreBin':
      return mergeParts([
        box(2.0, 0.9, 1.6, P.darkOak),
        box(2.1, 0.1, 1.7, P.iron, 0, 0.9),
        box(1.7, 0.25, 1.3, tintColor, 0, 0.8),
      ]);
    case 'orePile':
      return mergeParts([
        part(new THREE.DodecahedronGeometry(1.0, 0), tintColor, 0, 0.3, 0),
        part(new THREE.DodecahedronGeometry(0.7, 0), P.ore, 0.8, 0.25, 0.4),
        part(new THREE.DodecahedronGeometry(0.6, 0), tintColor, -0.7, 0.2, -0.5),
      ]);
    case 'toolRack':
      return mergeParts([
        box(2.0, 0.12, 0.3, P.darkOak, 0, 1.8),
        box(0.12, 2.0, 0.3, P.darkOak, -0.95),
        box(0.12, 2.0, 0.3, P.darkOak, 0.95),
        box(0.06, 1.3, 0.06, P.oak, -0.5, 0.5, 0.1),
        box(0.5, 0.15, 0.1, P.iron, -0.5, 1.7, 0.1),
        box(0.06, 1.3, 0.06, P.oak, 0, 0.5, 0.1),
        box(0.25, 0.3, 0.12, P.iron, 0, 1.75, 0.1),
        box(0.06, 1.3, 0.06, P.oak, 0.5, 0.5, 0.1),
        box(0.4, 0.12, 0.1, P.iron, 0.5, 1.7, 0.1),
      ]);
    case 'workbench':
      return mergeParts([
        box(2.8, 0.15, 1.2, P.oak, 0, 0.85),
        ...[-1.25, 1.25].flatMap((x) => [-0.5, 0.5].map((z) => box(0.15, 0.85, 0.15, P.darkOak, x, 0, z))),
        box(0.5, 0.2, 0.3, P.iron, -0.6, 1.0),
        box(0.3, 0.12, 0.6, P.iron, 0.7, 1.0),
      ]);
    case 'anvil':
      return mergeParts([
        box(0.5, 0.45, 0.4, P.darkOak),
        box(0.35, 0.2, 0.25, P.iron, 0, 0.45),
        box(1.1, 0.22, 0.35, P.iron, 0.1, 0.65),
        part(new THREE.ConeGeometry(0.16, 0.4, 6), P.iron, -0.62, 0.76, 0, 0, 0, Math.PI / 2),
      ]);
    case 'longTable':
      return mergeParts([
        box(6.0, 0.16, 1.5, P.oak, 0, 0.8),
        ...[-2.6, 2.6].flatMap((x) => [-0.55, 0.55].map((z) => box(0.2, 0.8, 0.2, P.darkOak, x, 0, z))),
        ...[-2, -0.7, 0.7, 2].map((x) => cyl(0.08, 0.07, 0.2, P.darkOak, x, 0.96, 0.3, 8)),
        ...[-1.4, 1.4].map((x) => cyl(0.35, 0.3, 0.08, P.iron, x, 0.96, -0.2, 12)),
        box(0.7, 0.3, 0.4, P.gold, 0, 0.96, -0.1),
      ]);
    case 'bench':
      return mergeParts([
        box(6.0, 0.1, 0.45, P.oak, 0, 0.42),
        ...[-2.6, 0, 2.6].map((x) => box(0.14, 0.42, 0.4, P.darkOak, x)),
      ]);
    case 'fireplace':
      return mergeParts([
        box(4.0, 0.5, 2.0, P.darkGranite),
        box(0.6, 2.4, 2.0, P.granite, -1.7, 0.5),
        box(0.6, 2.4, 2.0, P.granite, 1.7, 0.5),
        box(4.2, 0.6, 2.1, P.granite, 0, 2.6),
        box(2.8, 2.0, 0.3, P.darkGranite, 0, 0.5, -0.85),
        box(1.8, 0.5, 1.2, P.coal, 0, 0.5, 0.1),
        part(new THREE.ConeGeometry(0.6, 1.1, 6), P.ember, 0, 1.55, 0.1),
        box(0.3, 0.9, 0.08, P.iron, 0.9, 0.5, 0.95),
      ]);
    case 'weaponRack':
      return mergeParts([
        box(2.4, 0.15, 0.4, P.darkOak),
        box(2.4, 0.12, 0.3, P.darkOak, 0, 1.6),
        ...[-0.8, 0, 0.8].map((x) => box(0.07, 1.8, 0.07, P.oak, x, 0.1, 0.05)),
        ...[-0.8, 0.8].map((x) => box(0.55, 0.45, 0.08, P.iron, x, 1.55, 0.1)),
        box(0.12, 0.6, 0.6, P.iron, 0, 1.55, 0.1),
      ]);
    case 'oreCart':
      return mergeParts([
        box(1.3, 0.7, 1.9, P.rust, 0, 0.45),
        box(1.4, 0.08, 2.0, P.iron, 0, 1.15),
        box(1.1, 0.3, 1.6, tintColor, 0, 1.0),
        ...[-0.55, 0.55].flatMap((z) =>
          [-0.7, 0.7].map((x) => part(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 12), P.iron, x, 0.3, z, 0, 0, Math.PI / 2))
        ),
      ]);
    case 'controlBooth':
      return mergeParts([
        box(3.2, 0.3, 3.2, P.darkGranite),
        box(0.25, 2.6, 0.25, P.darkOak, -1.45, 0.3, -1.45),
        box(0.25, 2.6, 0.25, P.darkOak, 1.45, 0.3, -1.45),
        box(0.25, 2.6, 0.25, P.darkOak, -1.45, 0.3, 1.45),
        box(0.25, 2.6, 0.25, P.darkOak, 1.45, 0.3, 1.45),
        box(3.2, 1.0, 0.15, P.oak, 0, 0.3, -1.5),
        box(0.15, 1.0, 3.2, P.oak, -1.5, 0.3),
        box(0.15, 1.0, 3.2, P.oak, 1.5, 0.3),
        part(new THREE.ConeGeometry(2.6, 0.9, 4), P.darkOak, 0, 3.35, 0, 0, Math.PI / 4),
        box(1.8, 0.9, 0.6, P.iron, 0, 0.3, -0.9),
        ...[-0.5, 0, 0.5].map((x) => box(0.06, 0.6, 0.06, P.gold, x, 1.2, -0.75)),
      ]);
    case 'lever':
      return mergeParts([box(0.4, 0.3, 0.4, P.iron), part(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6), P.iron, 0, 0.75, 0, 0.35), cyl(0.09, 0.09, 0.12, P.gold, 0, 1.2, 0.18, 8)]);
    case 'torchStand':
      return mergeParts([
        cyl(0.3, 0.38, 0.2, P.darkGranite),
        cyl(0.07, 0.09, 1.7, P.iron, 0, 0.2),
        cyl(0.22, 0.12, 0.3, P.iron, 0, 1.9),
        part(new THREE.ConeGeometry(0.16, 0.45, 6), P.ember, 0, 2.35, 0),
      ]);
    case 'stonePillar':
      return mergeParts([
        box(4.6, 1.2, 4.6, P.darkGranite),
        box(4.0, 0.6, 4.0, P.granite, 0, 1.2),
        part(new THREE.CylinderGeometry(1.6, 1.8, 26, 8), P.granite, 0, 14.8, 0, 0, Math.PI / 8),
        ...[4, 10, 16, 22].map((y) => cyl(1.85, 1.85, 0.5, P.gold, 0, y, 0, 8)),
        box(4.2, 1.6, 4.2, P.granite, 0, 27.8),
      ]);
    case 'timberPost':
      return mergeParts([box(0.5, 6.0, 0.5, P.darkOak), box(0.7, 0.3, 0.7, P.iron, 0, 2.0), box(0.7, 0.3, 0.7, P.iron, 0, 4.4)]);
    case 'castingMold':
      return mergeParts([box(2.0, 0.45, 1.2, P.darkGranite), box(1.6, 0.06, 0.8, P.ember, 0, 0.42)]);
    case 'bellows':
      return mergeParts([
        part(new THREE.CylinderGeometry(0.1, 0.55, 1.4, 4), P.darkOak, 0, 0.5, 0, Math.PI / 2, Math.PI / 4),
        box(0.12, 0.12, 0.9, P.iron, 0, 0.5, -0.9),
        box(1.6, 0.25, 1.2, P.darkGranite),
      ]);
    case 'crystalCluster':
      return mergeParts(
        [
          [0, 0, 1.6, 0.3],
          [0.4, 0.2, 1.1, 0.22],
          [-0.35, -0.25, 0.9, 0.2],
          [0.1, -0.45, 0.7, 0.16],
        ].map(([x, z, h, r], i) => part(new THREE.ConeGeometry(r, h, 6), tintColor, x, h / 2, z, (i - 1.5) * 0.18, 0, (i % 2 ? 1 : -1) * 0.15))
      );
    case 'brazier':
      return mergeParts([
        ...[0, 2.09, 4.19].map((a) =>
          part(new THREE.CylinderGeometry(0.05, 0.07, 1.25, 6), P.iron, Math.cos(a) * 0.32, 0.6, Math.sin(a) * 0.32, Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25)
        ),
        cyl(0.55, 0.32, 0.35, P.iron, 0, 1.15),
        cyl(0.5, 0.5, 0.1, P.coal, 0, 1.42),
        part(new THREE.ConeGeometry(0.35, 0.7, 7), P.ember, 0, 1.8, 0),
        cyl(0.58, 0.58, 0.06, P.gold, 0, 1.47),
      ]);
    case 'banner':
      return mergeParts([
        box(2.2, 0.12, 0.12, P.darkOak, 0, 3.9),
        box(1.8, 3.6, 0.04, 0x7a1e1e, 0, 0.3),
        box(1.8, 0.2, 0.05, P.gold, 0, 0.3),
        part(new THREE.OctahedronGeometry(0.45, 0), P.gold, 0, 2.3, 0.04, 0, 0, 0),
        part(new THREE.ConeGeometry(0.9, 0.6, 3), 0x7a1e1e, 0, 0.0, 0, Math.PI, 0, 0),
      ]);
    case 'stoneBlock':
      return mergeParts([
        part(new THREE.BoxGeometry(2.4, 1.4, 1.8), P.granite, 0, 0.7, 0, 0.05, 0, 0.06),
        box(2.5, 0.2, 1.9, P.gold, 0, 0.95),
        part(new THREE.BoxGeometry(1.0, 0.6, 0.8), P.darkGranite, 1.3, 0.3, 0.9, 0.3, 0.6, 0),
      ]);
    case 'mineralVein':
      return mergeParts(
        [
          [-0.9, 0.2, 0.5],
          [-0.3, 0.9, 0.42],
          [0.3, 1.5, 0.48],
          [0.9, 2.1, 0.4],
          [0.2, 0.5, 0.3],
          [-0.6, 1.8, 0.32],
        ].map(([x, y, r]) => part(new THREE.OctahedronGeometry(r, 0), tintColor, x, y, 0.05))
      );
  }
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Shared Parts
/** Summary: One reinforced crate (planks plus iron bands), bottom at height `y`. */
function crateParts(x: number, y: number): IPart[] {
  const P = MINE_PALETTE;
  return [
    box(1.1, 1.1, 1.1, P.oak, x, y),
    box(1.14, 0.08, 1.14, P.iron, x, y + 0.15),
    box(1.14, 0.08, 1.14, P.iron, x, y + 0.87),
    box(0.08, 1.12, 1.14, P.darkOak, x, y),
  ];
}
// #endregion
