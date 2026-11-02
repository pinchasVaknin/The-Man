// ============================================================================
// MODULE: World / Models / Jaguar
// DESIGN: Re-export facade over the generated model module (no logic of its own)
// SUMMARY: Single import point for the self-contained jaguar model, rig and animator
//          in ./animals/Jaguar_Complete.ts. Does not build or animate anything itself.
// ============================================================================

// Re-export the self-contained Jaguar model, 42-bone rig, and 14-state procedural animator
// directly from ./animals/Jaguar_Complete.ts.
export {
  type JaguarState,
  type JaguarOptions,
  type JaguarUnpackedData,
  JAGUAR_STATES,
  JAGUAR_GAITS,
  JaguarRig,
  JaguarAnimator,
  Jaguar,
  createReadyJaguar,
} from './animals/Jaguar_Complete';
