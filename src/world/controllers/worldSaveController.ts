// ============================================================================
// MODULE: World / Controllers / World Save
// DESIGN: Saves the playing world to its mode's save slot, on demand, on page hide and on the autosave timer (SRP)
// SUMMARY: The canvas builds one controller over its state. The simulation's autosave timer, the page-hide and
//          visibility listeners, and the debug save hook all call the same `save`.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\\\
// #region Imports & Dependencies
import { getFelledTreesForSave } from '../systems/treeFellingSystem';
import { getDeadDwarfIds } from '../builders/dwarvenKingdomBuilder';
import type { IPlacedTrap } from '../systems/animalTrapsSystem';
import type { GameWorldMode } from '../systems/worldSaveManager';
import { captureCurrentWorldSnapshot, loadWorldSnapshot, saveWorldSnapshot } from '../systems/worldSaveManager';
import type { GameStateMode } from '../domain/gameShellTypes';
import { encodeRevealedMap, mapExplorationState } from '../domain/mapExploration';
import type { IPlayerState, IRideableHorseState } from '../domain/worldTypes';
import type { ISmallAnimalState } from '../systems/boidsAndWildlifeSystem';
// #endregion

// ======================== CONTRACTS ======================== \\\\
// #region Contracts
/** Summary: What a save reads. Values that the canvas reassigns are read through getters, so the save sees the live value. */
export interface IWorldSaveContext {
  readonly getWorldMode: () => GameWorldMode;
  readonly gameStateRef: { current: GameStateMode };
  readonly getActiveWorldAnimals: () => ISmallAnimalState[];
  readonly openDoorIds: Set<string>;
  readonly playerState: IPlayerState;
  readonly rideableHorses: readonly IRideableHorseState[];
  readonly timeState: { worldHours: number; inGameHoursElapsed: number; seasonTimeOffset: number };
  /** The traps the player has placed (S2). */
  readonly worldPlacedTraps: readonly IPlacedTrap[];
}

/** Summary: The save entry points handed to the canvas and the simulation. */
export interface IWorldSaveController {
  /** Writes the live world to its mode's save slot. Skips the title screen unless a save already exists. */
  readonly save: () => void;
  /** Saves when the page is hidden or closed. Returns the function that removes those listeners. */
  readonly attachPageListeners: () => () => void;
}
// #endregion

// ======================== FACTORY ======================== \\\\
// #region Factory
/**
 * Summary: Builds the world save controller over the given context.
 * @returns The save entry points.
 */
export function createWorldSaveController(ctx: IWorldSaveContext): IWorldSaveController {
  const save = (): void => {
    const mode = ctx.getWorldMode();
    if (ctx.gameStateRef.current === 'title' && !loadWorldSnapshot(mode)) {
      return;
    }
    const snap = captureCurrentWorldSnapshot(
      mode,
      ctx.playerState,
      ctx.rideableHorses,
      ctx.getActiveWorldAnimals(),
      ctx.openDoorIds,
      ctx.timeState.worldHours
    );
    snap.inGameHoursElapsed = ctx.timeState.inGameHoursElapsed;
    snap.seasonTimeOffset = ctx.timeState.seasonTimeOffset;
    snap.placedTraps = JSON.parse(JSON.stringify(ctx.worldPlacedTraps));
    snap.felledTrees = getFelledTreesForSave();
    snap.deadDwarfIds = getDeadDwarfIds();
    if (mapExplorationState.revealed) {
      snap.revealedMap = encodeRevealedMap(mapExplorationState.revealed);
    }
    saveWorldSnapshot(mode, snap);
  };

  const attachPageListeners = (): (() => void) => {
    const onPageHideSave = (): void => save();
    const onVisibilitySave = (): void => {
      if (document.visibilityState === 'hidden') save();
    };
    window.addEventListener('pagehide', onPageHideSave);
    document.addEventListener('visibilitychange', onVisibilitySave);
    return () => {
      window.removeEventListener('pagehide', onPageHideSave);
      document.removeEventListener('visibilitychange', onVisibilitySave);
    };
  };

  return { save, attachPageListeners };
}
// #endregion
