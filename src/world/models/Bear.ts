// ============================================================================
// MODULE: World / Models / Bear
// DESIGN: Re-export facade over the generated model module (no logic of its own)
// SUMMARY: Single import point for the self-contained bear model, rig and animator
//          in ./animals/Bear_Complete.ts. Does not build or animate anything itself.
// ============================================================================

export {
  type BearState,
  type BearOptions,
  type BearUnpackedData,
  BEAR_GAITS,
  BEAR_STATES,
  BearRig,
  BearAnimator,
  Bear,
  createReadyBear,
} from './animals/Bear_Complete';

