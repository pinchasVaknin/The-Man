// ============================================================================
// MODULE: Application Entrypoint
// DESIGN: Mounts React application root into DOM element (SRP)
// SUMMARY: Initializes the React 19 application tree and imports global styles.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InfrastructureCorruptedException } from './core/AppException';
import { createAppServices } from './app/compositionRoot';
import { AppServicesProvider } from './app/AppServicesContext';
import { preloadAllAnimalModels } from './world/models/animalModelAssets';
import { preloadAllFloraModels } from './world/models/plants/floraAssets';
import { preloadAllSaddleModels } from './world/models/equipment/saddleAssets';
import './index.css';
// #endregion

// ======================== APPLICATION MOUNT ======================== \\
// #region Application Mount
const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new InfrastructureCorruptedException("Root element '#root' was not found in document DOM.");
}

const appServices = createAppServices();

// Start downloading the animal models right away, in parallel with building the world;
// animals appear as their files arrive (see DeferredAnimalModel).
preloadAllAnimalModels().catch((err: unknown) => {
    appServices.logger.warn('Animal models could not be preloaded', { error: String(err) });
});

// The plant files are needed before the world's vegetation is built (the loading screen waits for
// them), so start them now. A failure is logged here and surfaces again when the world is built.
preloadAllFloraModels().catch((err: unknown) => {
    appServices.logger.warn('Plant models could not be preloaded', { error: String(err) });
});

preloadAllSaddleModels().catch((err: unknown) => {
    appServices.logger.warn('Saddle models could not be preloaded', { error: String(err) });
});

createRoot(rootElement).render(
    <ErrorBoundary logger={appServices.logger}>
        <AppServicesProvider value={appServices}>
            <App />
        </AppServicesProvider>
    </ErrorBoundary>,
);
// #endregion
