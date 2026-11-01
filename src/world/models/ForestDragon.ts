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
