// ============================================================================
// MODULE: World / Models / DemonDragon
// DESIGN: Re-export facade over the generated model module (no logic of its own)
// SUMMARY: Single import point for the self-contained flying ice dragon model, rig and animator
//          in ./animals/DemonDragon_Complete.ts. Does not build or animate anything itself.
// ============================================================================

export {
  createReadyDemonDragon,
  DemonDragon,
  DEMON_DRAGON_GAITS,
} from './animals/DemonDragon_Complete';
export type {
  DemonDragonState,
  DemonDragonOptions,
  ReadyDemonDragonController,
} from './animals/DemonDragon_Complete';

