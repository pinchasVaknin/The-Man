// ============================================================================
// MODULE: World / Domain / Simulation State
// DESIGN: The values the simulation step advances and reads each tick (SRP)
// SUMMARY: The current weather and atmosphere, the total elapsed time, the landing impact that dips the view, the time
//          of the last thunder, and the autosave timer. Replaces loose variables in the canvas so the simulation has one
//          owner and one shape.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { IDynamicAtmosphereState, IWeatherStateSnapshot } from '../domain/worldTypes';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: Mutable simulation state of one running world. */
export interface ISimulationState {
  /** Weather at the player's position, as last computed. */
  currentWeather: IWeatherStateSnapshot;
  /** Sky, light and fog derived from the time of day and the weather. */
  currentAtmo: IDynamicAtmosphereState;
  /** Simulation time in seconds since the world started. */
  elapsedTotal: number;
  /** Downward dip of the view after a landing, in metres; eases back to zero. */
  landingDip: number;
  /** Simulation time of the last thunder, so thunder does not repeat too fast. */
  lastThunderTime: number;
  /** Seconds since the last autosave. */
  worldSaveTimer: number;
}

/** Summary: Creates the simulation state from the weather and atmosphere computed at start. */
export function createSimulationState(
  initial: { readonly weather: IWeatherStateSnapshot; readonly atmosphere: IDynamicAtmosphereState }
): ISimulationState {
  return {
    currentWeather: initial.weather,
    currentAtmo: initial.atmosphere,
    elapsedTotal: 0,
    landingDip: 0,
    lastThunderTime: -10,
    worldSaveTimer: 0,
  };
}
// #endregion
