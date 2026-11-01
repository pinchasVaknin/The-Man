// ============================================================================
// MODULE: World / Models / Crocodile
// DESIGN: Re-export facade over the generated model module (no logic of its own)
// SUMMARY: Single import point for the self-contained crocodile model, rig and animator
//          in ./animals/Crocodile_Complete.ts. Does not build or animate anything itself.
// ============================================================================

export {
  type CrocodileState,
  type CrocodileOptions,
  type CrocodileUnpackedData,
  CROCODILE_GAITS,
  CROCODILE_STATES,
  unpackCrocodileBundle,
  CrocodileRig,
  CrocodileAnimator,
  Crocodile,
  CROC_EMBEDDED_PACK_B64,
  CROC_EMBEDDED_TEXTURE_URI,
  createReadyCrocodile,
} from './animals/Crocodile_Complete';

