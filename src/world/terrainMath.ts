/**
 * Terrain & World Systems Facade (`terrainMath.ts`)
 *
 * Implements the Facade Pattern over the decoupled domain and system modules:
 * - `domain/worldTypes`: Core domain types, interfaces, and inventory definitions
 * - `domain/noiseAndMath`: Pure deterministic procedural noise & interpolation utilities
 * - `domain/landmarksRegistry`: World constants, landmarks, ladders, doors, and collider boxes
 * - `systems/dwarvenMineAndCaravanSystem`: Underground Dwarven Mine walkability & Sunrise/Sunset Caravan scheduler
 * - `systems/terrainAndBiomeSystem`: Elevation, water surfaces, roofs, trails, biomes, minimap & obstacles
 * - `systems/playerPhysicsSystem`: Player kinematics, horse riding, ladder climbing, swimming & collision resolution
 * - `systems/combatAndInventorySystem`: Skyrim-style sword combos, heavy air-cleave, archery ballistics & inventory
 * - `systems/atmosphereAndWeatherSystem`: Dynamic 24-hour solar/lunar cycle & seasonal/turbo weather engine
 */

export * from './domain/worldTypes';
export * from './domain/noiseAndMath';
export * from './domain/landmarksRegistry';
export * from './systems/dwarvenMineAndCaravanSystem';
export * from './systems/terrainAndBiomeSystem';
export * from './systems/horsePhysicsSystem';
export * from './systems/playerPhysicsSystem';
export * from './systems/combatAndInventorySystem';
export * from './systems/atmosphereAndWeatherSystem';
export * from './systems/boidsAndWildlifeSystem';
export * from './systems/footprintTrailSystem';
export * from './systems/swordAttackAnimationSystem';

