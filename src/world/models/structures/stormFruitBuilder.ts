// ============================================================================
// MODULE: World / Models / Skybound Isles / Storm Fruit
// DESIGN: Each bush is a gnarled, thorny twilight storm-shrub with twisted dark branches and
//         wilted indigo-violet foliage mounds. When harvested, the bush retains visible tiny
//         unripe purple buds that visibly swell and ripen back to glowing fiery-orange Storm
//         Fruit as the regrowth timer counts down.
// SUMMARY: Builds and animates the thorny Storm Fruit bushes, visible regrowth, and throws.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import {
  STORM_FRUIT_BUSHES,
  STORM_FRUIT_REGROW_SEC,
  getStormFruitRegrowSec,
  isStormFruitReady,
} from '../../domain/landmarksRegistry';
import { getStormFruitThrows } from '../../systems/stormFruitSystem';
import type { IWorldModelBuildContext } from '../types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What the Storm Fruit builder hands back to the frame loop. */
export interface IStormFruitBuildResult {
  readonly group: THREE.Group;
  /** Updates ripe glow & regrowing bud scale, plus draws every fruit in flight. */
  readonly update: (elapsedSec: number) => void;
}

interface IBushVisual {
  readonly id: string;
  readonly fruit: THREE.Mesh[];
  readonly halos: THREE.Mesh[];
}
// #endregion

// #region Tuning
/** Most fruit in flight at once that gets a mesh; extra throws are simply not drawn. */
const THROW_POOL_SIZE = 6;
/** Fruit positions on each bush, relative to the bush centre. */
const BUSH_FRUIT_OFFSETS: ReadonlyArray<readonly [number, number, number]> = [
  [0.44, 0.88, 0.22],
  [-0.36, 0.98, -0.24],
  [0.12, 1.18, -0.44],
];
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Build
/**
 * Summary: Builds the gnarled Storm Fruit bushes and the pool for thrown fruit.
 * @param ctx Shared build context.
 * @returns The root group (not yet added to the scene) and the per-frame update.
 */
export function buildStormFruit(ctx: IWorldModelBuildContext): IStormFruitBuildResult {
  const group = new THREE.Group();
  group.name = 'storm-fruit';

  const bushGeo = new THREE.IcosahedronGeometry(0.84, 1);
  bushGeo.scale(1.05, 0.68, 1.05);
  const subMoundGeo = new THREE.IcosahedronGeometry(0.55, 1);
  subMoundGeo.scale(1.0, 0.72, 1.0);
  const branchGeo = new THREE.ConeGeometry(0.08, 1.25, 5);
  const fruitGeo = new THREE.SphereGeometry(0.2, 10, 8);
  const haloGeo = new THREE.SphereGeometry(0.32, 8, 6);

  const barkMat = new THREE.MeshStandardMaterial({
    color: 0x1f1929,
    bumpMap: ctx.textures.barkBump,
    bumpScale: 0.06,
    roughness: 0.92,
  });
  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x2d2842,
    emissive: 0x1e1b4b,
    emissiveIntensity: 0.25,
    bumpMap: ctx.textures.foliageBump,
    bumpScale: 0.05,
    roughness: 0.88,
  });
  const ripeFruitMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 0.95,
    roughness: 0.32,
  });
  const growingBudMat = new THREE.MeshStandardMaterial({
    color: 0x7c3aed,
    emissive: 0x4c1d95,
    emissiveIntensity: 0.45,
    roughness: 0.65,
  });
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xfb923c,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });

  ctx.disposableGeometries.push(bushGeo, subMoundGeo, branchGeo, fruitGeo, haloGeo);
  ctx.disposableMaterials.push(barkMat, foliageMat, ripeFruitMat, growingBudMat, haloMat);

  const bushes: IBushVisual[] = STORM_FRUIT_BUSHES.map((b, bIdx) => {
    const bush = new THREE.Group();
    bush.position.set(b.x, b.y, b.z);
    bush.rotation.y = bIdx * 1.1;

    // Dark wilted foliage cluster
    const mound = new THREE.Mesh(bushGeo, foliageMat);
    mound.position.y = 0.58;
    const lobeA = new THREE.Mesh(subMoundGeo, foliageMat);
    lobeA.position.set(0.45, 0.48, -0.2);
    const lobeB = new THREE.Mesh(subMoundGeo, foliageMat);
    lobeB.position.set(-0.42, 0.52, 0.26);
    bush.add(mound, lobeA, lobeB);

    // 4 gnarled crooked thorn branches poking out of the shrub
    for (let k = 0; k < 4; k++) {
      const ang = (k / 4) * Math.PI * 2 + 0.35;
      const thorn = new THREE.Mesh(branchGeo, barkMat);
      thorn.position.set(Math.cos(ang) * 0.36, 0.72, Math.sin(ang) * 0.36);
      thorn.rotation.z = -Math.cos(ang) * 0.65;
      thorn.rotation.x = Math.sin(ang) * 0.65;
      bush.add(thorn);
    }

    const fruit: THREE.Mesh[] = [];
    const halos: THREE.Mesh[] = [];
    for (const [fx, fy, fz] of BUSH_FRUIT_OFFSETS) {
      const f = new THREE.Mesh(fruitGeo, ripeFruitMat);
      f.position.set(fx, fy, fz);
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.set(fx, fy, fz);
      bush.add(f, halo);
      fruit.push(f);
      halos.push(halo);
    }
    group.add(bush);
    return { id: b.id, fruit, halos };
  });

  const pool: THREE.Mesh[] = [];
  for (let i = 0; i < THROW_POOL_SIZE; i++) {
    const m = new THREE.Mesh(fruitGeo, ripeFruitMat);
    m.visible = false;
    group.add(m);
    pool.push(m);
  }

  return {
    group,
    update: (elapsedSec: number) => {
      ripeFruitMat.emissiveIntensity = 0.85 + Math.sin(elapsedSec * 3.2) * 0.25;
      for (let bi = 0; bi < bushes.length; bi++) {
        const bush = bushes[bi];
        const ready = isStormFruitReady(bush.id);
        const regrowLeft = getStormFruitRegrowSec(bush.id);
        const progress = ready ? 1 : Math.max(0.05, 1 - regrowLeft / STORM_FRUIT_REGROW_SEC);
        const budScale = ready ? 1.0 : 0.2 + progress * 0.62;

        for (let fi = 0; fi < bush.fruit.length; fi++) {
          const f = bush.fruit[fi];
          const h = bush.halos[fi];
          const base = BUSH_FRUIT_OFFSETS[fi];
          f.visible = true;
          f.material = ready ? ripeFruitMat : growingBudMat;
          f.scale.setScalar(budScale);
          f.position.y = base[1] + (ready ? Math.sin(elapsedSec * 2.4 + bi + fi) * 0.035 : 0);
          h.visible = ready;
          if (ready) {
            h.scale.setScalar(0.95 + Math.sin(elapsedSec * 3.0 + fi) * 0.14);
          }
        }
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
