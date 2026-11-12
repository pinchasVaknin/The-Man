// ============================================================================
// MODULE: World / Domain / Graphics Quality
// DESIGN: Pure mapping from a quality preset to renderer settings. No three.js or DOM imports, so it is unit-testable.
// SUMMARY: Three presets (low, medium, high). "high" matches the renderer's original settings, so existing players see no change.
// ============================================================================

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
/** The graphics preset chosen in the settings panel. */
export type GraphicsQuality = 'low' | 'medium' | 'high';

/** The graphics presets, in the order the settings panel shows them. */
export const GRAPHICS_QUALITIES: readonly GraphicsQuality[] = ['low', 'medium', 'high'];

/** Renderer settings one preset resolves to. */
export interface IGraphicsProfile {
  readonly shadowsEnabled: boolean;
  /** Square shadow map side length in pixels. */
  readonly shadowMapSize: number;
  /** Upper bound on the device pixel ratio the renderer draws at. */
  readonly maxPixelRatio: number;
}

export const GRAPHICS_PROFILES: Readonly<Record<GraphicsQuality, IGraphicsProfile>> = {
  low: { shadowsEnabled: false, shadowMapSize: 1024, maxPixelRatio: 1 },
  medium: { shadowsEnabled: true, shadowMapSize: 1024, maxPixelRatio: 1.5 },
  high: { shadowsEnabled: true, shadowMapSize: 2048, maxPixelRatio: 2 },
};
// #endregion

// ======================== PUBLIC FUNCTIONS ======================== \\
// #region Resolve Renderer Settings
/**
 * Summary: Returns whether shadows are drawn. Software rasterizers never draw shadows, whatever the preset.
 */
export function resolveShadowsEnabled(quality: GraphicsQuality, isSoftwareGl: boolean): boolean {
  return !isSoftwareGl && GRAPHICS_PROFILES[quality].shadowsEnabled;
}

/**
 * Summary: Returns the pixel ratio the renderer should draw at for this preset and device.
 * Software rasterizers always draw at 1, as before.
 */
export function resolvePixelRatio(
  quality: GraphicsQuality,
  devicePixelRatio: number,
  isSoftwareGl: boolean
): number {
  if (isSoftwareGl) return 1;
  const safeRatio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(safeRatio, GRAPHICS_PROFILES[quality].maxPixelRatio);
}
// #endregion
