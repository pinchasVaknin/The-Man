import * as THREE from 'three';
import {
  Deer,
  DEER_STATES,
  type DeerState,
  createReadyDeer,
} from './Deer';

export { DEER_STATES, type DeerState };

export interface DeerGlbInstanceController {
  /**Root group added to targetContainer */
  readonly root: THREE.Group;
  /**Underlying Deer instance from Deer_Complete.ts */
  readonly deer: Deer;
  /**True when the embedded Deer_Complete model is ready */
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
  /**Optional callback fired when the model is attached */
  onLoaded?: (controller: DeerGlbInstanceController) => void;
}

/**
 * Synchronously instantiates the self-contained Deer_Complete model
 * (geometry + texture + 27-bone rig + 9-state procedural IK animator)
 * into `targetContainer`.
 */
export function attachDeerGlbModel(
  targetContainer: THREE.Group,
  options?: AttachDeerGlbOptions
): DeerGlbInstanceController {
  const desiredScale = options?.scale ?? 1.0;

  while (targetContainer.children.length > 0) {
    targetContainer.remove(targetContainer.children[0]);
  }

  const deerInstance = createReadyDeer({
    scale: desiredScale,
    tintHex: options?.tintHex,
    castShadow: options?.castShadow ?? true,
    receiveShadow: options?.receiveShadow ?? true,
  });

  if (options?.disposableMaterials && deerInstance.mesh.material instanceof THREE.Material) {
    options.disposableMaterials.push(deerInstance.mesh.material);
  }

  targetContainer.add(deerInstance.object);

  const handle: DeerGlbInstanceController = {
    get root() {
      return deerInstance.object;
    },
    get deer() {
      return deerInstance;
    },
    isLoaded() {
      return true;
    },
    getState() {
      return deerInstance.state;
    },
    setState(next: DeerState) {
      deerInstance.setState(next);
    },
    setTurn(nextTurn: number) {
      deerInstance.turn = nextTurn;
    },
    setTint(tintHex: number) {
      const mat = deerInstance.mesh.material;
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.color.setHex(tintHex);
      }
    },
    update(dt: number, turn?: number) {
      if (typeof turn === 'number') {
        deerInstance.turn = turn;
      }
      deerInstance.update(dt);
    },
  };

  options?.onLoaded?.(handle);

  return handle;
}
