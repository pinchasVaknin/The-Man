/**
 * Re-exports the complete self-contained deer model, rig, skinning,
 * 9-state procedural IK animator, and embedded geometry/texture factory
 * from /public/models/Deer_Complete.ts.
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
} from '../../../public/models/Deer_Complete';
