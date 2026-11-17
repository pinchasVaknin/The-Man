// ============================================================================
// MODULE: World / Models / Skybound Isles / Pickups
// DESIGN: A gem pickup is a spinning crystal in the gem's colour; a gold pickup is a small
//         stack of spinning coins. Each one hides for good once the domain marks it collected,
//         so the renderer never decides what was taken.
// SUMMARY: Builds and animates the floating Skybound Isles pickups.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import { SKY_PICKUPS, isSkyPickupCollected } from '../domain/landmarksRegistry';
import type { IWorldModelBuildContext } from './types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What the pickups builder hands back to the frame loop. */
export interface ISkyPickupsBuildResult {
  readonly group: THREE.Group;
  /** Spins the pickups and hides collected ones; call once per frame while nearby. */
  readonly update: (elapsedSec: number) => void;
}

interface IPickupVisual {
  readonly id: string;
  readonly mesh: THREE.Object3D;
  readonly baseY: number;
}
// #endregion

// #region Tuning
const GEM_COLOURS: Readonly<Record<string, number>> = {
  amethyst_gem: 0xa855f7,
  sapphire_gem: 0x3b82f6,
  crystal_gem: 0xe0f2fe,
};
const DEFAULT_GEM_COLOUR = 0x22d3ee;
const COIN_COUNT = 3;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Build
/**
 * Summary: Builds every floating pickup and returns their frame update.
 * @param ctx Shared build context.
 * @returns The root group (not yet added to the scene) and the per-frame update.
 */
export function buildSkyPickups(ctx: IWorldModelBuildContext): ISkyPickupsBuildResult {
  const group = new THREE.Group();
  group.name = 'sky-pickups';
  const gemGeo = new THREE.OctahedronGeometry(0.32, 0);
  gemGeo.scale(1, 1.5, 1);
  const coinGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.06, 14);
  coinGeo.rotateX(Math.PI / 2);
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xb45309, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.3 });
  ctx.disposableGeometries.push(gemGeo, coinGeo);
  ctx.disposableMaterials.push(goldMat);
  const gemMats = new Map<number, THREE.MeshStandardMaterial>();

  const visuals: IPickupVisual[] = SKY_PICKUPS.map((p) => {
    let mesh: THREE.Object3D;
    if (p.itemId) {
      const colour = GEM_COLOURS[p.itemId] ?? DEFAULT_GEM_COLOUR;
      let mat = gemMats.get(colour);
      if (!mat) {
        mat = new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 0.9, roughness: 0.15 });
        gemMats.set(colour, mat);
        ctx.disposableMaterials.push(mat);
      }
      mesh = new THREE.Mesh(gemGeo, mat);
    } else {
      const stack = new THREE.Group();
      for (let i = 0; i < COIN_COUNT; i++) {
        const coin = new THREE.Mesh(coinGeo, goldMat);
        coin.position.set((i - 1) * 0.28, (i % 2) * 0.18, 0);
        stack.add(coin);
      }
      mesh = stack;
    }
    mesh.position.set(p.x, p.y, p.z);
    group.add(mesh);
    return { id: p.id, mesh, baseY: p.y };
  });

  return {
    group,
    update: (elapsedSec: number) => {
      visuals.forEach((v, i) => {
        v.mesh.visible = !isSkyPickupCollected(v.id);
        if (!v.mesh.visible) return;
        v.mesh.rotation.y = elapsedSec * 1.6 + i;
        v.mesh.position.y = v.baseY + Math.sin(elapsedSec * 2 + i) * 0.12;
      });
    },
  };
}
// #endregion
