// ============================================================================
// MODULE: App / Composition Root
// DESIGN: Single place where concrete infrastructure is chosen and wired (DIP)
// SUMMARY: Creates the application services once at startup: the logger and the
//          sound-engine factory. Everything else receives these through the React
//          context or as parameters, never by reaching for a global instance.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { ConsoleLogger, type ILogger } from '../core/ILogger';
import { NatureSoundEngine } from '../world/soundEngine';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: Services shared by the whole application. */
export interface IAppServices {
  readonly logger: ILogger;
  /** Creates a sound engine for one world mount (each mount disposes its own). */
  readonly createSoundEngine: () => NatureSoundEngine;
}
// #endregion

// ======================== COMPOSITION ======================== \\
// #region Composition
/**
 * Summary: Wires the production services.
 * Design: Called once from main.tsx; tests build their own IAppServices with fakes.
 */
export function createAppServices(): IAppServices {
  const logger: ILogger = ConsoleLogger.instance;
  return {
    logger,
    createSoundEngine: () => new NatureSoundEngine(logger),
  };
}
// #endregion
