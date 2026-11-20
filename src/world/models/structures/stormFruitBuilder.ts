// ============================================================================
// MODULE: World / Models / Skybound Isles / Storm Fruit
// DESIGN: A bush is a dark green mound with a few fruit on it; the fruit hides while the bush is
//         bare. Thrown fruit is drawn from a small pool of meshes, one per fruit in flight, so
//         nothing is created or destroyed during play.
// SUMMARY: Builds and animates the Storm Fruit bushes and the fruit in flight.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import { STORM_FRUIT_BUSHES, isStormFruitReady } from '../../domain/landmarksRegistry';
import { getStormFruitThrows } from '../../systems/stormFruitSystem';
import type { IWorldModelBuildContext } from '../types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What the Storm Fruit builder hands back to the frame loop. */
export interface IStormFruitBuildResult {
  readonly group: THREE.Group;
  /** Shows ready fruit, and draws every fruit in flight; call once per frame while nearby. */
  readonly update: (elapsedSec: number) => void;
}
// #endregion

// #region Tuning
/** Most fruit in flight at once that gets a mesh; extra throws are simply not drawn. */
const THROW_POOL_SIZE = 6;
/** Fruit positions on each bush, relative to the bush centre. */
const BUSH_FRUIT_OFFSETS: ReadonlyArray<readonly [number, number, number]> = [
  [0.45, 0.85, 0.2],
  [-0.35, 0.95, -0.25],
  [0.1, 1.15, -0.45],
];
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Build
/**
 * Summary: Builds the Storm Fruit bushes and the pool for thrown fruit.
 * @param ctx Shared build context.
 * @returns The root group (not yet added to the scene) and the per-frame update.
 */
export function buildStormFruit(ctx: IWorldModelBuildContext): IStormFruitBuildResult {
  const group = new THREE.Group();
  group.name = 'storm-fruit';
  const bushGeo = new THREE.SphereGeometry(0.9, 12, 8);
  bushGeo.scale(1, 0.7, 1);
  const fruitGeo = new THREE.SphereGeometry(0.18, 10, 8);
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x3f6b3a, roughness: 0.9 });
  const fruitMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x9a3412, emissiveIntensity: 0.4, roughness: 0.4 });
  ctx.disposableGeometries.push(bushGeo, fruitGeo);
  ctx.disposableMaterials.push(bushMat, fruitMat);

  const bushes = STORM_FRUIT_BUSHES.map((b) => {
    const bush = new THREE.Group();
    bush.position.set(b.x, b.y, b.z);
    const mound = new THREE.Mesh(bushGeo, bushMat);
    mound.position.y = 0.6;
    bush.add(mound);
    const fruit = BUSH_FRUIT_OFFSETS.map(([fx, fy, fz]) => {
      const f = new THREE.Mesh(fruitGeo, fruitMat);
      f.position.set(fx, fy, fz);
      bush.add(f);
      return f;
    });
    group.add(bush);
    return { id: b.id, fruit };
  });

  const throwGeo = fruitGeo;
  const pool: THREE.Mesh[] = [];
  for (let i = 0; i < THROW_POOL_SIZE; i++) {
    const m = new THREE.Mesh(throwGeo, fruitMat);
    m.visible = false;
    group.add(m);
    pool.push(m);
  }

  return {
    group,
    update: () => {
      for (const bush of bushes) {
        const ready = isStormFruitReady(bush.id);
        for (const f of bush.fruit) f.visible = ready;
      }
      const flying = getStormFruitThrows();
      pool.forEach((m, i) => {
        const f = flying[i];
        m.visible = Boolean(f);
        if (f) m.position.set(f.x, f.y, f.z);
      });
    },
  };
}
// #endregion
