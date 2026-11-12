// ============================================================================
// MODULE: World / Domain / Time And Season State
// DESIGN: The world clock, the season clock and the weather mode the player is in (SRP)
// SUMMARY: One named state object for the in-game hour, the season offset and elapsed in-game hours, the forced
//          season and weather (from the URL or the player), and the weather cycle mode. Replaces loose variables in
//          the canvas so the clocks have one owner and one shape.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { SeasonType, WeatherCycleMode, WeatherKind } from '../terrainMath';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: Mutable time, season and weather state of one running world. */
export interface ITimeAndSeasonState {
  /** Hour of the day, 0 to 24, shown by the world clock. */
  worldHours: number;
  /** Offset of the season clock, in season seconds (180 s is summer). */
  seasonTimeOffset: number;
  /** In-game hours elapsed since the clock started; the season clock advances with them. */
  inGameHoursElapsed: number;
  /** Season forced by the player, or 'auto' to follow the season clock. */
  forcedSeason: SeasonType | 'auto';
  /** How the weather changes over time (automatic cycle or a fixed mode). */
  activeWeatherMode: WeatherCycleMode;
  /** Weather forced by a URL parameter, or null. */
  urlForcedWeatherKind: WeatherKind | null;
}
// #endregion
