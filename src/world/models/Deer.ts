// ============================================================================
// MODULE: World / Models / Deer
// DESIGN: Re-export facade over the generated model module (no logic of its own)
// SUMMARY: Single import point for the self-contained deer model, rig and animator
//          in ./animals/Deer_Complete.ts. Does not build or animate anything itself.
// ============================================================================

/**
 * Re-exports the complete self-contained deer model, rig, skinning,
 * 9-state procedural IK animator, and embedded geometry/texture factory
 * from ./animals/Deer_Complete.ts.
 */
export {
  type DeerBoneName,
  DeerRig,
  skinDeerGeometry,
  type DeerState,
  DEER_STATES,
  DeerAnimator,
  type DeerOptions,
  Deer,
  DEER_EMBEDDED_PACK_B64,
  DEER_EMBEDDED_TEXTURE_URI,
  createReadyDeer,
} from './animals/Deer_Complete';

