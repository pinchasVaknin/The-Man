export {
  createReadyDemonDragon,
  DemonDragon,
  DEMON_DRAGON_GAITS,
} from '../../../public/models/animals/DemonDragon_Complete';
export type {
  DemonDragonState,
  DemonDragonOptions,
  ReadyDemonDragonController,
} from '../../../public/models/animals/DemonDragon_Complete';

export const DEMON_DRAGON_STATES = [
  'idle',
  'walk',
  'trot',
  'fly',
  'skip',
  'roar',
  'attack',
  'lie',
  'sleep',
  'death',
] as const;
