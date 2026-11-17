// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles — Giant Sky Tree
// DESIGN: The tree grows from the middle of the north-east Crystal islet. Its branch path is one
//         walkable spiral ramp that winds 2.5 turns up the trunk, rising 40 m from the islet deck to
//         an observation platform at the top. The spiral's heights repeat over a spot once per turn
//         (16 m apart), so the surface query reports every height there and the caller takes the one
//         nearest the player's feet. The trunk is solid, so the spiral is the only way up.
// SUMMARY: Tree geometry, the trunk box, the spiral branch path and its surface visitor, and the top platform.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import { CRYSTAL_ISLETS } from './crystalIslesLayout';
import type { ISkyBouncePad, ISkySolidBox } from './skyHarborLayout';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Tuning
const ISLET = CRYSTAL_ISLETS.find((i) => i.id === 'crystal-islet-north-east')!;

/** Summary: Trunk centre (the islet's centre) and the deck height the spiral starts from. */
export const SKY_TREE = {
  x: ISLET.x,
  z: ISLET.z,
  baseY: ISLET.y,
  topY: ISLET.y + 40.0,
};
/** Summary: Radius (m) of the spiral's centre line around the trunk. */
export const SKY_TREE_SPIRAL_RADIUS_M = 5.0;
/** Summary: Half width (m) of the spiral's walkable branch. */
export const SKY_TREE_BRANCH_HALF_WIDTH_M = 1.1;
/** Summary: Number of full turns the branch path makes around the trunk. */
export const SKY_TREE_TURNS = 2.5;
/** Summary: Half width (m) of the solid trunk. */
export const SKY_TREE_TRUNK_HALF_M = 1.4;
/** Summary: Radius (m) of the observation platform at the top. Kept inside the spiral's inner edge, so the spiral's last turn is not overlapped (the player steps across the small gap). */
export const SKY_TREE_TOP_RADIUS_M = 4.0;
// #endregion

// #region Definitions
/** Summary: The trunk, a solid column from the islet deck to the top platform. */
export const SKY_TREE_TRUNK_BOX: ISkySolidBox = {
  id: 'sky-tree-trunk',
  minX: SKY_TREE.x - SKY_TREE_TRUNK_HALF_M,
  maxX: SKY_TREE.x + SKY_TREE_TRUNK_HALF_M,
  minZ: SKY_TREE.z - SKY_TREE_TRUNK_HALF_M,
  maxZ: SKY_TREE.z + SKY_TREE_TRUNK_HALF_M,
  minY: SKY_TREE.baseY,
  maxY: SKY_TREE.topY,
};
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Grotto
/** Summary: Mushroom grotto at the south edge of the islet, behind the tree's roots. Opens towards the trunk. */
export const SKY_TREE_GROTTO = { x: SKY_TREE.x, z: -33.5, y: SKY_TREE.baseY };

/** Summary: The grotto's three walls (west, east, back). The trunk-facing side is open. */
export const SKY_TREE_GROTTO_WALLS: readonly ISkySolidBox[] = [
  { id: 'sky-tree-grotto-west', minX: 899.9, maxX: 900.5, minZ: -35.0, maxZ: -31.4, minY: SKY_TREE.baseY, maxY: SKY_TREE.baseY + 1.6 },
  { id: 'sky-tree-grotto-east', minX: 903.5, maxX: 904.1, minZ: -35.0, maxZ: -31.4, minY: SKY_TREE.baseY, maxY: SKY_TREE.baseY + 1.6 },
  { id: 'sky-tree-grotto-back', minX: 899.9, maxX: 904.1, minZ: -32.0, maxZ: -31.4, minY: SKY_TREE.baseY, maxY: SKY_TREE.baseY + 1.6 },
];

/** Summary: The grotto's bounce mushroom, in the middle of the hollow. */
export const SKY_TREE_GROTTO_MUSHROOM: ISkyBouncePad = {
  id: 'sky-tree-grotto-mushroom',
  x: SKY_TREE_GROTTO.x,
  z: -34.0,
  topY: SKY_TREE.baseY + 0.5,
  radius: 0.8,
  // Kept low: the spiral's first turn passes over the grotto, and a higher launch would throw the player onto it.
  bounceVy: 5.5,
};
// #endregion

// #region Surfaces
/**
 * Summary: Reports every walkable height of the spiral branch path and of the top platform at (x, z).
 *          The spiral can have several heights over one spot (one per turn); the caller picks the one it can reach.
 * @param x Point X.
 * @param z Point Z.
 * @param visit Called with each walkable height, its kind and id.
 */
export function visitSkyTreeSurfaces(x: number, z: number, visit: (y: number, kind: 'ramp' | 'deck', id: string) => void): void {
  const dx = x - SKY_TREE.x;
  const dz = z - SKY_TREE.z;
  const r = Math.hypot(dx, dz);
  const reach = Math.max(SKY_TREE_TOP_RADIUS_M, SKY_TREE_SPIRAL_RADIUS_M + SKY_TREE_BRANCH_HALF_WIDTH_M);
  if (r > reach) return;

  // The top platform is a flat disc over the trunk top.
  if (r <= SKY_TREE_TOP_RADIUS_M) visit(SKY_TREE.topY, 'deck', 'sky-tree-top');

  // The spiral: angle of this spot on the branch centre line, one candidate per turn it passes.
  if (Math.abs(r - SKY_TREE_SPIRAL_RADIUS_M) > SKY_TREE_BRANCH_HALF_WIDTH_M) return;
  const totalAngle = 2 * Math.PI * SKY_TREE_TURNS;
  const rise = SKY_TREE.topY - SKY_TREE.baseY;
  const phi = (Math.atan2(dz, dx) + 2 * Math.PI) % (2 * Math.PI);
  for (let theta = phi; theta <= totalAngle + 1e-9; theta += 2 * Math.PI) {
    visit(SKY_TREE.baseY + (rise * theta) / totalAngle, 'ramp', 'sky-tree-spiral');
  }
}
// #endregion
