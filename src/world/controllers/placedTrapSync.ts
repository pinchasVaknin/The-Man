// ============================================================================
// MODULE: World / Controllers / Placed Trap Sync
// DESIGN: Owns the 3D meshes of the player's placed traps and keeps them in step with the trap list (SRP)
// SUMMARY: Adds a mesh for each new trap, rebuilds a mesh when a trap's sprung state changes, and removes and
//          disposes meshes of traps that no longer exist. The canvas only calls sync() and clear().
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type * as THREE from 'three';
import type { IPlacedTrap } from '../systems/animalTrapsSystem';
import { createPlacedTrapMesh } from '../models/placedTrapModels';
import { disposeObjectTree } from '../../core/disposeObjectTree';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: Keeps the placed-trap meshes under one group in step with the trap list. */
export interface IPlacedTrapSync {
  /** Brings the meshes in line with `traps`: adds new traps, rebuilds sprung-state changes, removes old ones. */
  sync(traps: readonly IPlacedTrap[]): void;
  /** Removes and disposes every trap mesh (used when the world is reset). */
  clear(): void;
}

interface ITrapMeshEntry {
  readonly mesh: THREE.Group;
  readonly sprung: boolean;
}
// #endregion

// ======================== FACTORY ======================== \\
// #region Factory
/**
 * Summary: Creates the sync for one group of placed-trap meshes.
 * @param group Group the trap meshes are added to (the canvas owns it and adds it to the scene).
 */
export function createPlacedTrapSync(group: THREE.Group): IPlacedTrapSync {
  const meshes = new Map<string, ITrapMeshEntry>();

  const removeEntry = (entry: ITrapMeshEntry): void => {
    group.remove(entry.mesh);
    disposeObjectTree(entry.mesh);
  };

  return {
    sync(traps: readonly IPlacedTrap[]): void {
      // Remove meshes whose trap is gone. A scan is used because the trap list is short.
      for (const [id, entry] of meshes.entries()) {
        if (!traps.some((t) => t.id === id)) {
          removeEntry(entry);
          meshes.delete(id);
        }
      }
      for (const trap of traps) {
        const isSprung = trap.status === 'sprung' || Boolean(trap.sprung);
        const existing = meshes.get(trap.id);
        if (!existing || existing.sprung !== isSprung) {
          if (existing) {
            removeEntry(existing);
          }
          const mesh = createPlacedTrapMesh(trap);
          group.add(mesh);
          meshes.set(trap.id, { mesh, sprung: isSprung });
        }
      }
    },
    clear(): void {
      for (const entry of meshes.values()) {
        removeEntry(entry);
      }
      meshes.clear();
    },
  };
}
// #endregion
