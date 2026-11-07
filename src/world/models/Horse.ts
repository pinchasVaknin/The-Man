// ============================================================================
// MODULE: World / Models / Horse Facade
// DESIGN: Clean re-export facade for Horse_Complete.ts (53-joint desert horse GLB + 14 animations)
// ============================================================================

import {
  Horse,
  HorseRig,
  HorseAnimator,
  HORSE_GAITS,
  HORSE_STATES,
  createReadyHorse,
  type HorseState,
  type HorseOptions,
  type HorseUnpackedData,
} from './animals/Horse_Complete';

export type HorseController = Horse;

export {
  Horse,
  HorseRig,
  HorseAnimator,
  HORSE_GAITS,
  HORSE_STATES,
  createReadyHorse,
  type HorseState,
  type HorseOptions,
  type HorseUnpackedData,
};
