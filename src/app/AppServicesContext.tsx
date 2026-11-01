// ============================================================================
// MODULE: App / App Services Context
// DESIGN: React context that carries the composition root's services to components
// SUMMARY: AppServicesProvider wraps the tree in main.tsx; useAppServices reads it and
//          fails loudly when a component is rendered outside the provider.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { createContext, useContext } from 'react';
import { InfrastructureCorruptedException } from '../core/AppException';
import type { IAppServices } from './compositionRoot';
// #endregion

// ======================== CONTEXT ======================== \\
// #region Context
const AppServicesContext = createContext<IAppServices | null>(null);

/** Summary: Provides the application services to the component tree. */
export const AppServicesProvider = AppServicesContext.Provider;

/**
 * Summary: Returns the application services.
 * @throws InfrastructureCorruptedException when no AppServicesProvider is mounted above.
 */
export function useAppServices(): IAppServices {
  const services = useContext(AppServicesContext);
  if (!services) {
    throw new InfrastructureCorruptedException('useAppServices was called outside AppServicesProvider.');
  }
  return services;
}
// #endregion
