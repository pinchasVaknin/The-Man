// ============================================================================
// MODULE: Test Support / Animal Models For Tests
// DESIGN: Single seam that makes the animal models available to node tests
// SUMMARY: Prepares the animal model assets before a test builds a model. Until the
//          models move out of the code bundle this has nothing to do.
// ============================================================================

// ======================== PRELOAD ======================== \\
// #region Preload
/**
 * Summary: Makes every animal model available to synchronous model factories in tests.
 */
export async function preloadAnimalModelsForTests(): Promise<void> {
  // The models are still embedded in the source modules at this point.
}
// #endregion
