// ============================================================================
// MODULE: World / Builders / Ancient Mine
// DESIGN: A shared dwarf body (broad, short-legged, long-bearded) plus one held object and
//         headwear per pose, merged into a single coloured geometry. Built 10 units tall and
//         scaled by the caller, facing +Z.
// SUMMARY: Geometry of the monumental hero statues and the first king. Does not place them.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import { box, cyl, mergeParts, part, MINE_PALETTE, type IPart } from './propGeometries';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants
/** Summary: Height of the statue geometry before scaling, in units. */
export const STATUE_UNIT_HEIGHT = 10;

export type IStatuePose = 'axeWarrior' | 'hammerKing' | 'shieldGuardian' | 'ancientMiner' | 'firstKing';

const STONE = MINE_PALETTE.granite;
const DARK = MINE_PALETTE.darkGranite;
const GOLD = MINE_PALETTE.gold;
// #endregion

// ======================== PUBLIC FACTORY ======================== \\
// #region Build Statue
/**
 * Summary: Builds one statue pose, 10 units tall, standing at the origin and facing +Z.
 * @param pose Which legendary dwarf.
 * @returns A new geometry the caller owns.
 */
export function buildDwarfStatueGeometry(pose: IStatuePose): THREE.BufferGeometry {
  const isKing = pose === 'firstKing' || pose === 'hammerKing';
  return mergeParts([...bodyParts(isKing), ...headwearParts(pose), ...heldParts(pose)]);
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Body
/** Summary: Boots, legs, armoured skirt, barrel chest, belt, pauldrons, head and braided beard. */
function bodyParts(isKing: boolean): IPart[] {
  const parts: IPart[] = [
    box(1.3, 0.7, 1.7, DARK, -0.85, 0, 0.2),
    box(1.3, 0.7, 1.7, DARK, 0.85, 0, 0.2),
    box(1.1, 1.6, 1.1, STONE, -0.8, 0.7, 0),
    box(1.1, 1.6, 1.1, STONE, 0.8, 0.7, 0),
    cyl(1.9, 2.3, 1.6, STONE, 0, 1.9, 0, 10),
    cyl(2.3, 1.9, 2.8, STONE, 0, 3.5, 0, 10),
    cyl(2.0, 2.0, 0.45, GOLD, 0, 3.5, 0, 10),
    part(new THREE.SphereGeometry(1.0, 10, 8), STONE, -2.2, 6.0, 0),
    part(new THREE.SphereGeometry(1.0, 10, 8), STONE, 2.2, 6.0, 0),
    cyl(0.75, 0.9, 0.7, STONE, 0, 6.3, 0, 8),
    part(new THREE.SphereGeometry(1.05, 12, 10), STONE, 0, 7.6, 0.05),
    // Beard: broad, long and braided down the chest.
    part(new THREE.ConeGeometry(1.15, 3.4, 8), DARK, 0, 5.5, 1.0, Math.PI - 0.12),
    part(new THREE.ConeGeometry(0.35, 1.4, 6), DARK, -0.45, 3.6, 1.5, Math.PI),
    part(new THREE.ConeGeometry(0.35, 1.4, 6), DARK, 0.45, 3.6, 1.5, Math.PI),
    cyl(0.4, 0.4, 0.15, GOLD, -0.45, 4.3, 1.5, 8),
    cyl(0.4, 0.4, 0.15, GOLD, 0.45, 4.3, 1.5, 8),
    // Upper arms.
    part(new THREE.CylinderGeometry(0.6, 0.55, 2.2, 8), STONE, -2.4, 4.9, 0.2, 0.2, 0, 0.12),
    part(new THREE.CylinderGeometry(0.6, 0.55, 2.2, 8), STONE, 2.4, 4.9, 0.2, 0.2, 0, -0.12),
  ];
  if (isKing) {
    // Cloak falling from the shoulders behind the figure.
    parts.push(part(new THREE.CylinderGeometry(2.4, 3.2, 6.0, 10, 1, true, Math.PI * 0.6, Math.PI * 0.8), DARK, 0, 3.4, -0.2));
  }
  return parts;
}
// #endregion

// #region Headwear
function headwearParts(pose: IStatuePose): IPart[] {
  switch (pose) {
    case 'firstKing':
    case 'hammerKing':
      return [
        cyl(1.15, 1.1, 0.5, GOLD, 0, 8.3, 0, 12),
        ...[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2;
          return part(new THREE.ConeGeometry(0.22, 0.7, 4), GOLD, Math.sin(a) * 1.0, 9.05, Math.cos(a) * 1.0);
        }),
      ];
    case 'axeWarrior':
      return [
        part(new THREE.SphereGeometry(1.15, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), DARK, 0, 7.8, 0),
        part(new THREE.ConeGeometry(0.25, 1.4, 6), STONE, -1.2, 8.6, 0, 0, 0, 0.9),
        part(new THREE.ConeGeometry(0.25, 1.4, 6), STONE, 1.2, 8.6, 0, 0, 0, -0.9),
      ];
    case 'shieldGuardian':
      return [part(new THREE.SphereGeometry(1.15, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), DARK, 0, 7.8, 0), box(0.25, 1.0, 0.9, GOLD, 0, 8.2, 0)];
    case 'ancientMiner':
      return [cyl(1.0, 1.15, 0.7, DARK, 0, 8.0, 0, 10), cyl(0.35, 0.35, 0.3, GOLD, 0, 8.2, 1.0, 8)];
  }
}
// #endregion

// #region Held Objects
function heldParts(pose: IStatuePose): IPart[] {
  switch (pose) {
    case 'axeWarrior':
      // Great axe held diagonally across the body.
      return [
        part(new THREE.CylinderGeometry(0.16, 0.16, 7.0, 6), MINE_PALETTE.darkOak, 0, 4.4, 1.7, 0, 0, 0.75),
        part(new THREE.BoxGeometry(0.25, 2.0, 1.6), STONE, 2.3, 6.7, 1.7, 0, 0, 0.75),
        ...[-1, 1].map((s) => part(new THREE.SphereGeometry(0.55, 8, 6), STONE, s * 1.6, 3.6, 1.4)),
      ];
    case 'hammerKing':
      // War hammer held upright at his right side.
      return [
        cyl(0.18, 0.18, 6.5, MINE_PALETTE.darkOak, 2.9, 0.4, 1.0, 6),
        box(1.0, 1.1, 1.9, STONE, 2.9, 6.9, 1.0),
        box(1.05, 0.2, 1.95, GOLD, 2.9, 7.35, 1.0),
        part(new THREE.SphereGeometry(0.55, 8, 6), STONE, 2.9, 4.4, 1.0),
        part(new THREE.SphereGeometry(0.55, 8, 6), STONE, -2.6, 3.6, 0.8),
      ];
    case 'shieldGuardian':
      // Round shield before the left side, spear upright on the right.
      return [
        part(new THREE.CylinderGeometry(2.0, 2.0, 0.35, 16), STONE, -1.6, 4.2, 2.0, Math.PI / 2),
        part(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10), GOLD, -1.6, 4.2, 2.25, Math.PI / 2),
        cyl(0.13, 0.13, 8.4, MINE_PALETTE.darkOak, 2.7, 0.2, 1.0, 6),
        part(new THREE.ConeGeometry(0.4, 1.4, 4), STONE, 2.7, 9.3, 1.0),
        part(new THREE.SphereGeometry(0.55, 8, 6), STONE, 2.7, 4.6, 1.0),
      ];
    case 'ancientMiner':
      // Pickaxe resting on the right shoulder, lantern in the left hand.
      return [
        part(new THREE.CylinderGeometry(0.15, 0.15, 5.0, 6), MINE_PALETTE.darkOak, 1.9, 6.0, 0.6, 0.9, 0, 0),
        part(new THREE.BoxGeometry(0.25, 0.4, 3.0), STONE, 1.9, 7.9, -1.0, 0, 0, Math.PI / 2),
        part(new THREE.SphereGeometry(0.55, 8, 6), STONE, -2.6, 3.6, 0.8),
        cyl(0.05, 0.05, 0.8, MINE_PALETTE.iron, -2.6, 2.6, 0.8, 4),
        cyl(0.45, 0.35, 0.8, GOLD, -2.6, 1.9, 0.8, 6),
      ];
    case 'firstKing':
      // Massive royal warhammer, head down before him, both hands on the pommel.
      return [
        cyl(0.25, 0.25, 4.6, MINE_PALETTE.darkOak, 0, 1.0, 2.4, 8),
        box(2.6, 1.4, 1.4, STONE, 0, 0.0, 2.4),
        box(2.7, 0.25, 1.5, GOLD, 0, 0.55, 2.4),
        part(new THREE.SphereGeometry(0.4, 8, 6), GOLD, 0, 5.75, 2.4),
        part(new THREE.SphereGeometry(0.6, 8, 6), STONE, -0.55, 5.3, 2.3),
        part(new THREE.SphereGeometry(0.6, 8, 6), STONE, 0.55, 5.3, 2.3),
        part(new THREE.CylinderGeometry(0.5, 0.45, 2.4, 8), STONE, -1.3, 4.3, 1.4, -0.9, 0, 0.5),
        part(new THREE.CylinderGeometry(0.5, 0.45, 2.4, 8), STONE, 1.3, 4.3, 1.4, -0.9, 0, -0.5),
      ];
  }
}
// #endregion
