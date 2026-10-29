// ============================================================================
// MODULE: Core / Config & Validation
// DESIGN: Centralized system configuration and input boundary validation (Fail-fast, SRP)
// SUMMARY: Exposes canonical world boundaries (PLAYABLE_RADIUS, 0..24h world day cycle),
//          valid weather kinds, and validated URL parameter overrides parsing.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { WeatherKind, WeatherCycleMode, CameraPerspectiveMode } from '../world/domain/worldTypes';
// #endregion

// ======================== CONSTANTS & BOUNDARIES ======================== \\
// #region Constants & Boundaries
/**
 * Summary: Canonical maximum playable world radius in meters from origin.
 * Design: Clamps player teleportation, debug positioning, and spatial calculations.
 */
export const PLAYABLE_RADIUS = 680;

/**
 * Summary: Minimum valid world hour in the 24-hour day cycle.
 */
export const MIN_WORLD_HOUR = 0;

/**
 * Summary: Maximum valid world hour in the 24-hour day cycle.
 */
export const MAX_WORLD_HOUR = 24;

/**
 * Summary: Valid weather kind tokens accepted by the dynamic weather simulation.
 */
export const VALID_WEATHER_KINDS: readonly WeatherKind[] = [
  'clear_clouds',
  'regional_rain',
  'dense_fog',
  'lightning_storm',
  'mountain_snow',
  'wind_sand',
] as const;

/**
 * Summary: Mapping from short URL query parameter names to domain WeatherKind tokens.
 */
export const URL_WEATHER_MAP: Record<string, WeatherKind> = {
  clear: 'clear_clouds',
  rain: 'regional_rain',
  fog: 'dense_fog',
  thunder: 'lightning_storm',
  snow: 'mountain_snow',
  sand: 'wind_sand',
};

/**
 * Summary: Mapping from short URL season query parameters to elapsed cycle seconds offset.
 */
export const URL_SEASON_OFFSETS: Record<string, number> = {
  spring: 20,
  summer: 200,
  autumn: 380,
  winter: 560,
};
// #endregion

// ======================== INTERFACES & CONTRACTS ======================== \\
// #region Interfaces & Contracts
/**
 * Summary: Validated spatial coordinates parsed from URL parameters.
 * Design: Immutable container holding clamped X and Z positions within playable bounds.
 */
export interface IValidatedPositionOverride {
  readonly x: number;
  readonly z: number;
  readonly y?: number;
  readonly yaw?: number;
  readonly pitch?: number;
}

/**
 * Summary: Structured container for all validated URL query parameter overrides.
 * Design: Decouples URL search string parsing from 3D canvas initialization logic.
 */
export interface IValidatedUrlOverrides {
  readonly position?: IValidatedPositionOverride;
  readonly cameraPerspective?: CameraPerspectiveMode;
  readonly forcedWeatherKind?: WeatherKind;
  readonly seasonTimeOffset?: number;
  readonly weatherMode?: WeatherCycleMode;
  readonly worldHour?: number;
}
// #endregion

// ======================== VALIDATION FUNCTIONS ======================== \\
// #region Validation Functions
/**
 * Summary: Restricts a numerical value within specified minimum and maximum bounds.
 * Design: Pure mathematical clamping function returning min on NaN to avoid unbounded states.
 * @param val The input value to clamp.
 * @param min The lower inclusive bound.
 * @param max The upper inclusive bound.
 * @returns Clamped numerical value within [min, max].
 */
export function clamp(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, val));
}

/**
 * Summary: Validates and bounds a spatial map coordinate to the canonical playable radius.
 * Design: Guards against NaN and Infinity by falling back to zero, clamping within [-radius, radius].
 * @param val Coordinate value along an axis.
 * @param radius Optional map boundary radius, defaulting to PLAYABLE_RADIUS.
 * @returns Safe, finite coordinate clamped within map boundary.
 */
export function validateCoordinate(val: number, radius: number = PLAYABLE_RADIUS): number {
  if (!Number.isFinite(val)) return 0;
  return clamp(val, -radius, radius);
}

/**
 * Summary: Validates world hour ensuring it lies within standard 24-hour cycle.
 * Design: Fallbacks to midday (12.0) on NaN/Infinity, clamping within [0, 24].
 * @param val World hour floating-point value.
 * @returns Validated world hour clamped between MIN_WORLD_HOUR and MAX_WORLD_HOUR.
 */
export function validateWorldHour(val: number): number {
  if (!Number.isFinite(val)) return 12;
  return clamp(val, MIN_WORLD_HOUR, MAX_WORLD_HOUR);
}

/**
 * Summary: Parses and sanitizes URL search query parameters into safe overrides.
 * Design: Implements defensive parsing with whitelist validation for weather, season, and perspective.
 * @param search URL search query string (e.g. window.location.search).
 * @returns Fully validated and sanitized override configuration object.
 */
export function parseAndValidateUrlOverrides(search: string): IValidatedUrlOverrides {
  if (!search) return {};
  const params = new URLSearchParams(search);
  const result: {
    position?: IValidatedPositionOverride;
    cameraPerspective?: CameraPerspectiveMode;
    forcedWeatherKind?: WeatherKind;
    seasonTimeOffset?: number;
    weatherMode?: WeatherCycleMode;
    worldHour?: number;
  } = {};

  const posParam = params.get('pos');
  if (posParam) {
    const parts = posParam.split(',').map((s) => parseFloat(s));
    if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      const clampedX = validateCoordinate(parts[0]);
      const clampedZ = validateCoordinate(parts[1]);
      const explicitY = parts.length >= 4 && Number.isFinite(parts[3]) ? clamp(parts[3], -100, 500) : undefined;
      const yaw = parts.length >= 3 && Number.isFinite(parts[2]) ? parts[2] : undefined;
      const pitch = parts.length >= 5 && Number.isFinite(parts[4]) ? clamp(parts[4], -Math.PI / 2, Math.PI / 2) : undefined;

      result.position = {
        x: clampedX,
        z: clampedZ,
        y: explicitY,
        yaw,
        pitch,
      };
    }
  }

  const hourParam = params.get('hour');
  if (hourParam) {
    const parsedHour = parseFloat(hourParam);
    if (Number.isFinite(parsedHour)) {
      result.worldHour = validateWorldHour(parsedHour);
    }
  }

  const perspParam = params.get('perspective');
  if (perspParam === 'first_person' || perspParam === 'third_person') {
    result.cameraPerspective = perspParam;
  }

  const wParam = params.get('weather');
  if (wParam && wParam in URL_WEATHER_MAP) {
    result.forcedWeatherKind = URL_WEATHER_MAP[wParam];
  }

  const sParam = params.get('season');
  if (sParam && sParam in URL_SEASON_OFFSETS) {
    result.seasonTimeOffset = URL_SEASON_OFFSETS[sParam];
  }

  const wmParam = params.get('weatherMode');
  if (wmParam === 'seasonal' || wmParam === 'turbo_test') {
    result.weatherMode = wmParam;
  }

  return result;
}
// #endregion
