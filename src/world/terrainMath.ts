// ============================================================================
// MODULE: World / Facade
// DESIGN: Facade Pattern over decoupled world domain and subsystem modules (SRP, DIP)
// SUMMARY: Exposes a single unified public entry point for terrain mathematics,
//          domain constants, physics systems, and environmental cycles.
// ============================================================================

// ======================== DOMAIN RE-EXPORTS ======================== \\
// #region Domain Re-exports
export * from './domain/worldTypes';
export * from './domain/noiseAndMath';
export * from './domain/landmarksRegistry';
// #endregion

// ======================== SUBSYSTEM RE-EXPORTS ======================== \\
// #region Subsystem Re-exports
export * from './systems/dwarvenMineAndCaravanSystem';
export * from './systems/terrainAndBiomeSystem';
export * from './systems/horsePhysicsSystem';
export * from './systems/playerPhysicsSystem';
export * from './systems/combatAndInventorySystem';
export * from './systems/atmosphereAndWeatherSystem';
export * from './systems/boidsAndWildlifeSystem';
export * from './systems/footprintTrailSystem';
export * from './systems/swordAttackAnimationSystem';
// #endregion
