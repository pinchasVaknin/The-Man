// ============================================================================
// MODULE: World / Models / Deer Instance Loader
// DESIGN: Thin adapter around createReadyDeer returning a small controller; attaches late (async GLB)
// SUMMARY: Instantiates the embedded deer model into a target container and exposes
//          state, scale and update controls. Does not decide deer behavior; the wildlife AI does.
// ============================================================================

import * as THREE from 'three';
import {
  Deer,
  DEER_STATES,
  type DeerState,
  createReadyDeer,
} from './Deer';
import { InfrastructureCorruptedException } from '../../core/AppException';
import type { ILogger } from '../../core/ILogger';
import { isAnimalModelLoaded, loadAnimalModel } from './animalModelAssets';

export { DEER_STATES, type DeerState };

export interface DeerGlbInstanceController {
  /**Root group added to targetContainer */
  readonly root: THREE.Group;
  /**Underlying Deer instance from Deer_Complete.ts */
  readonly deer: Deer;
  /**True once the deer GLB has loaded and the model is attached */
  isLoaded: () => boolean;
  /**Current animation state */
  getState: () => DeerState;
  /**Switch to any of the 9 deer states ('idle' | 'walk' | 'eat' | 'call' | 'lie' | 'run' | 'flee' | 'skip' | 'death') */
  setState: (state: DeerState) => void;
  /**Set body turn lean (-1..1) */
  setTurn: (turn: number) => void;
  /**Set subtle material color tint multiplier */
  setTint: (tintHex: number) => void;
  /**Advance skeleton IK & animation by dt seconds (with optional turn lean -1..1) */
  update: (dt: number, turn?: number) => void;
}

export interface AttachDeerGlbOptions {
  /**Scale multiplier (Deer_Complete is normalized to 1.35m height, default 1.0) */
  scale?: number;
  /**Optional subtle coat tint multiplier (default 0xffffff preserves natural texture) */
  tintHex?: number;
  /**Whether the deer mesh casts shadows */
  castShadow?: boolean;
  /**Whether the deer mesh receives shadows */
  receiveShadow?: boolean;
  /**Optional array to register created materials for disposal */
  disposableMaterials?: THREE.Material[];
  /**Receives a warning when the model cannot be downloaded */
  logger?: ILogger;
  /**Optional callback fired when the model is attached */
  onLoaded?: (controller: DeerGlbInstanceController) => void;
}

/**
 * Summary: Places a deer model into `targetContainer`, now or as soon as its GLB has loaded.
 * Design: When the model is already loaded (the lab preloads everything) the deer attaches
 *         synchronously. Otherwise the controller starts empty: isLoaded() is false and
 *         state/update calls only remember the latest state until the model arrives.
 * @param targetContainer Group that receives the deer (its children are replaced).
 * @param options Scale, tint, shadows, disposal list, logger and an attach callback.
 * @returns The controller (usable immediately).
 */
export function attachDeerGlbModel(
  targetContainer: THREE.Group,
  options?: AttachDeerGlbOptions
): DeerGlbInstanceController {
  let deerInstance: Deer | null = null;
  let pendingState: DeerState | null = null;
  let pendingTint: number | null = null;

  const attach = () => {
    while (targetContainer.children.length > 0) {
      targetContainer.remove(targetContainer.children[0]);
    }
    const instance = createReadyDeer({
      scale: options?.scale ?? 1.0,
      tintHex: options?.tintHex,
      castShadow: options?.castShadow ?? true,
      receiveShadow: options?.receiveShadow ?? true,
    });
    if (options?.disposableMaterials && instance.mesh.material instanceof THREE.Material) {
      options.disposableMaterials.push(instance.mesh.material);
    }
    targetContainer.add(instance.object);
    deerInstance = instance;
    if (pendingState !== null) instance.setState(pendingState);
    if (pendingTint !== null) handle.setTint(pendingTint);
    options?.onLoaded?.(handle);
  };

  const handle: DeerGlbInstanceController = {
    get root() {
      return requireDeer().object;
    },
    get deer() {
      return requireDeer();
    },
    isLoaded() {
      return deerInstance !== null;
    },
    getState() {
      return deerInstance?.state ?? pendingState ?? 'idle';
    },
    setState(next: DeerState) {
      pendingState = next;
      deerInstance?.setState(next);
    },
    setTurn(nextTurn: number) {
      if (deerInstance) deerInstance.turn = nextTurn;
    },
    setTint(tintHex: number) {
      pendingTint = tintHex;
      const mat = deerInstance?.mesh.material;
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.color.setHex(tintHex);
      }
    },
    update(dt: number, turn?: number) {
      if (!deerInstance) return;
      if (typeof turn === 'number') {
        deerInstance.turn = turn;
      }
      deerInstance.update(dt);
    },
  };

  function requireDeer(): Deer {
    if (!deerInstance) {
      throw new InfrastructureCorruptedException('The deer model was used before it finished loading.');
    }
    return deerInstance;
  }

  if (isAnimalModelLoaded('deer')) {
    attach();
  } else {
    loadAnimalModel('deer')
      .then(attach)
      .catch((err: unknown) => {
        options?.logger?.warn('Deer model could not be loaded; the deer stays hidden', { error: String(err) });
      });
  }
  return handle;
}
