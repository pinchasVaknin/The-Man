// ============================================================================
// MODULE: World / Models / Rhino
// DESIGN: Re-export facade over the generated model module (no logic of its own)
// SUMMARY: Single import point for the self-contained rhino model, rig and animator
//          in ./animals/Rhino_Complete.ts. Does not build or animate anything itself.
// ============================================================================

export {
  Rhino,
  RhinoRig,
  RhinoAnimator,
  RHINO_GAITS,
  RHINO_STATES,
  RHINO_EMBEDDED_PACK_B64,
  RHINO_EMBEDDED_TEXTURE_URI,
  unpackRhinoBundle,
  createReadyRhino,
  type RhinoState,
  type RhinoOptions,
  type RhinoUnpackedData,
} from './animals/Rhino_Complete';
export { Rhino as default } from './animals/Rhino_Complete';
