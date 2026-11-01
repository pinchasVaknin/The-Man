// Re-export the self-contained Jaguar model, 42-bone rig, and 14-state procedural animator
// directly from ./animals/Jaguar_Complete.ts.
export {
  type JaguarState,
  type JaguarOptions,
  type JaguarUnpackedData,
  JAGUAR_STATES,
  JAGUAR_GAITS,
  unpackJaguarBundle,
  JaguarRig,
  JaguarAnimator,
  Jaguar,
  JAGUAR_EMBEDDED_PACK_B64,
  JAGUAR_EMBEDDED_TEXTURE_URI,
  createReadyJaguar,
} from './animals/Jaguar_Complete';
