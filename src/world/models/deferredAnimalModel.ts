// ============================================================================
// MODULE: World / Models / Deferred Animal Model
// DESIGN: Proxy (virtual proxy) over an animal model whose GLB is still downloading
// SUMMARY: Stands in for a bear, wolf, dragon, ... from the first frame: it owns the scene
//          object the model will live in, remembers the last state and move speed, and
//          forwards calls once the model is built. Until then update() does nothing.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import type { ILogger } from '../../core/ILogger';
import { loadAnimalModel, type AnimalModelId } from './animalModelAssets';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: What the world code uses of a built animal model. */
export interface IAnimatedAnimalModel<TState> {
  readonly object: THREE.Object3D;
  readonly mesh: THREE.SkinnedMesh;
  readonly rig: { readonly bones: readonly THREE.Bone[] };
  setState(state: TState): void;
  update(dt: number, turn?: number): void;
  moveSpeed?: number;
}
// #endregion

// ======================== DEFERRED MODEL ======================== \\
// #region Deferred Model
/**
 * Summary: An animal model that attaches itself when its GLB has loaded.
 * Design: Callers keep one stable object for the animal's whole life, so world code needs no
 *         "is it loaded yet" branches; state set before loading is replayed on attach.
 */
export class DeferredAnimalModel<TState, TModel extends IAnimatedAnimalModel<TState>> {
  /** Scene object to place in the world; the model is added inside it when ready. */
  public readonly object = new THREE.Group();
  private model: TModel | null = null;
  private pendingState: TState | null = null;
  private pendingMoveSpeed: number | null = null;

  /**
   * @param modelId GLB to load (shared with every other instance of the same animal).
   * @param build Builds the model synchronously once the GLB is loaded.
   * @param logger Receives a warning when the download fails (the animal then stays invisible).
   * @param onAttached Called after the model is attached (e.g. to register disposables).
   * @param load Loads the GLB (the shared asset library by default; tests inject a fake).
   */
  public constructor(
    modelId: AnimalModelId,
    build: () => TModel,
    logger: ILogger,
    onAttached?: (model: TModel) => void,
    load: (id: AnimalModelId) => Promise<unknown> = loadAnimalModel
  ) {
    load(modelId)
      .then(() => {
        const model = build();
        this.model = model;
        this.object.add(model.object);
        if (this.pendingState !== null) model.setState(this.pendingState);
        if (this.pendingMoveSpeed !== null) model.moveSpeed = this.pendingMoveSpeed;
        onAttached?.(model);
      })
      .catch((err: unknown) => {
        logger.warn('Animal model could not be loaded; the animal stays hidden', {
          modelId,
          error: String(err),
        });
      });
  }

  /** Summary: True once the model is built and attached. */
  public isLoaded(): boolean {
    return this.model !== null;
  }

  /** Summary: The skeleton of the built model, or undefined while loading. */
  public get rig(): TModel['rig'] | undefined {
    return this.model?.rig;
  }

  /** Summary: Sets (or remembers) the animation state. */
  public setState(state: TState): void {
    this.pendingState = state;
    this.model?.setState(state);
  }

  /** Summary: Advances the animation; does nothing while loading. */
  public update(dt: number, turn?: number): void {
    this.model?.update(dt, turn);
  }

  /** Summary: Move speed forwarded to models that have one (rhino); remembered while loading. */
  public get moveSpeed(): number {
    return this.model?.moveSpeed ?? this.pendingMoveSpeed ?? 0;
  }

  public set moveSpeed(value: number) {
    this.pendingMoveSpeed = value;
    if (this.model) this.model.moveSpeed = value;
  }
}
// #endregion
