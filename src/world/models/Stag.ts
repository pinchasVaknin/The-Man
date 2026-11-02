// ============================================================================
// MODULE: World / Models / Stag
// DESIGN: Re-export facade over src/world/models/animals/Stag_Complete.ts
// SUMMARY: Exposes the self-contained 3D Horned Stag rig, skinned mesh,
//          47-joint skeleton, and 13 animation clips.
// ============================================================================

export {
  Stag,
  StagAnimator,
  StagRig,
  STAG_GAITS,
  STAG_STATES,
  createReadyStag,
  type StagOptions,
  type StagState,
  type StagUnpackedData,
} from './animals/Stag_Complete';
