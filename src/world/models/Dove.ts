// ============================================================================
// MODULE: World / Models / Dove Facade
// DESIGN: Clean re-export facade for Dove_Complete.ts (75-joint dove GLB + 14 animations incl. flight)
// ============================================================================

import {
  Dove,
  DoveRig,
  DoveAnimator,
  DOVE_GAITS,
  DOVE_STATES,
  createReadyDove,
  type DoveState,
  type DoveOptions,
  type DoveUnpackedData,
} from './animals/Dove_Complete';

export type DoveController = Dove;

export {
  Dove,
  DoveRig,
  DoveAnimator,
  DOVE_GAITS,
  DOVE_STATES,
  createReadyDove,
  type DoveState,
  type DoveOptions,
  type DoveUnpackedData,
};
