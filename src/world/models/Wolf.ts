// ============================================================================
// MODULE: World / Models / Wolf
// DESIGN: Re-export facade over the generated model module (no logic of its own)
// SUMMARY: Single import point for the self-contained wolf model, rig and animator
//          in ./animals/Wolf_Complete.ts. Does not build or animate anything itself.
// ============================================================================

export {
  Wolf,
  WolfRig,
  WolfAnimator,
  WOLF_GAITS,
  WOLF_STATES,
  createReadyWolf,
  type WolfState,
  type WolfOptions,
  type WolfUnpackedData,
} from './animals/Wolf_Complete';
export { Wolf as default } from './animals/Wolf_Complete';

