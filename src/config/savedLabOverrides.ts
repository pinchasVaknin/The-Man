// ============================================================================
// MODULE: Config / Saved Lab Pose & Weapon Overrides
// DESIGN: Persistent source-of-truth file written directly by the Lab "Save" button
// SUMMARY: Stores per-entity weapon/limb/body pose overrides calibrated in the
//          Character & Animation Laboratory so they persist in the project codebase.
// ============================================================================

import type { ILabPoseOverrides } from '../lab/labCatalog';

export const SAVED_LAB_OVERRIDES: Record<string, ILabPoseOverrides> = {};

