// ============================================================================
// MODULE: World / Systems / Weapon Feel System
// DESIGN: Pure per-frame easing of weapon presentation values on the player state
// SUMMARY: Bow draw tension and release kick, sword block blend, lifetime of sword
//          impact effects, and first-person weapon sway from mouse look and vertical
//          momentum. Gameplay rules (hits, damage, stamina) live elsewhere.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { IPlayerState } from '../domain/worldTypes';
// #endregion

// ======================== CONSTANTS ======================== \\
// #region Constants
/** Seconds to draw the bow from slack to full tension. */
const BOW_FULL_DRAW_SECONDS = 0.52;
/** Tension lost per second after the bow is lowered. */
const BOW_RELAX_PER_SECOND = 5.0;
/** Seconds for the release recoil kick to settle. */
const BOW_RELEASE_KICK_SECONDS = 0.28;
/** Lifetime of the sword clash spark (seconds). */
const SWORD_SPARK_LIFETIME = 0.45;
/** Lifetime of the forward air-slash wave (seconds). */
const SWORD_AIR_WAVE_LIFETIME = 0.48;
/** Largest weapon sway offset in either axis. */
const MAX_WEAPON_SWAY = 0.045;
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: Inputs of the melee feel and sway step. */
export interface IMeleeFeelInput {
  readonly dt: number;
  readonly lookYawDelta: number;
  readonly lookPitchDelta: number;
  readonly landingDip: number;
}
// #endregion

// ======================== BOW ======================== \\
// #region Bow
/**
 * Summary: Builds bow tension while the draw input is held and eases the release kick.
 */
export function stepBowFeel(player: IPlayerState, dt: number, isDrawHeld: boolean): void {
  if (player.bowDrawn) {
    if (isDrawHeld) {
      player.bowDrawProgress = Math.min(1.0, player.bowDrawProgress + dt / BOW_FULL_DRAW_SECONDS);
    }
  } else {
    player.bowDrawProgress = Math.max(0, player.bowDrawProgress - dt * BOW_RELAX_PER_SECOND);
  }
  if ((player.bowReleaseKick ?? 0) > 0) {
    player.bowReleaseKick = Math.max(0, (player.bowReleaseKick ?? 0) - dt / BOW_RELEASE_KICK_SECONDS);
  }
}
// #endregion

// ======================== MELEE & SWAY ======================== \\
// #region Melee & Sway
/**
 * Summary: Blends the sword block pose, ages impact effects and eases weapon sway.
 * Design: Must run after the sword swing step, so an impact created this frame ages
 *         by the same frame delta as before the extraction.
 */
export function stepMeleeFeelAndSway(player: IPlayerState, input: IMeleeFeelInput): void {
  const { dt } = input;
  const targetBlock =
    !player.isSwimming && player.equippedTool === 'sword' && Boolean(player.swordBlocking) ? 1.0 : 0.0;
  player.swordBlockProgress =
    (player.swordBlockProgress ?? 0) + (targetBlock - (player.swordBlockProgress ?? 0)) * (1 - Math.exp(-14 * dt));

  if (player.lastSwordHitPoint) {
    player.lastSwordHitPoint.age += dt;
    if (player.lastSwordHitPoint.age > SWORD_SPARK_LIFETIME) {
      player.lastSwordHitPoint = null;
    }
  }
  if (player.lastSwordAirWave) {
    player.lastSwordAirWave.age += dt;
    if (player.lastSwordAirWave.age > SWORD_AIR_WAVE_LIFETIME) {
      player.lastSwordAirWave = null;
    }
  }

  // Mouse-look lag plus vertical jump/fall momentum.
  const targetSwayX = Math.max(-MAX_WEAPON_SWAY, Math.min(MAX_WEAPON_SWAY, -input.lookYawDelta * 0.65));
  const targetSwayY = Math.max(
    -MAX_WEAPON_SWAY,
    Math.min(MAX_WEAPON_SWAY, -input.lookPitchDelta * 0.65 - player.vy * 0.0045 + input.landingDip * 0.14)
  );
  const swayDamp = 1 - Math.exp(-12 * dt);
  player.weaponSwayX = ((player.weaponSwayX ?? 0) + targetSwayX) * (1 - swayDamp * 0.65);
  player.weaponSwayY = ((player.weaponSwayY ?? 0) + targetSwayY) * (1 - swayDamp * 0.65);
}
// #endregion
