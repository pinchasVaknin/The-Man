// ============================================================================
// MODULE: World / Models / CatLion
// DESIGN: Re-export facade over src/world/models/animals/CatLion_Complete.ts
// SUMMARY: Exposes the self-contained 3D CatLion (Savanna Lion) rig, skinned mesh,
//          42-joint skeleton, and 14 animation clips.
// ============================================================================

export {
  CatLion,
  CatLionAnimator,
  CatLionRig,
  CAT_LION_GAITS,
  CAT_LION_STATES,
  createReadyCatLion,
  type CatLionOptions,
  type CatLionState,
  type CatLionUnpackedData,
} from './animals/CatLion_Complete';
