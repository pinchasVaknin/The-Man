// ============================================================================
// MODULE: World / Models / ForestDragon
// DESIGN: Re-export facade over the generated model module (no logic of its own)
// SUMMARY: Single import point for the self-contained southern forest dragon model, rig and animator
//          in ./animals/ForestDragon_Complete.ts. Does not build or animate anything itself.
// ============================================================================

export {
  createReadyForestDragon,
  ForestDragon,
  FOREST_DRAGON_GAITS,
} from './animals/ForestDragon_Complete';
export type {
  ForestDragonState,
  ForestDragonOptions,
  ReadyForestDragonController,
} from './animals/ForestDragon_Complete';

export const FOREST_DRAGON_STATES = [
  'idle',
  'walk',
  'trot',
  'run',
  'fly',
  'stalk',
  'roar',
  'call',
  'attack',
  'sit',
  'lie',
  'sleep',
  'death',
] as const;
