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
import { preloadAllCharacterModels } from './world/models/Characters/characterAssets';
import { preloadAllStatueModels } from './world/models/statues/statueAssets';
import { preloadArcheryTargetModel } from './world/models/equipment/archeryTargetAssets';
import './index.css';
// #endregion

// ======================== APPLICATION MOUNT ======================== \\
// #region Application Mount
const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new InfrastructureCorruptedException("Root element '#root' was not found in document DOM.");
}

const appServices = createAppServices();

createRoot(rootElement).render(
    <ErrorBoundary logger={appServices.logger}>
        <AppServicesProvider value={appServices}>
            <App />
        </AppServicesProvider>
    </ErrorBoundary>,
);

// Queue background GLB downloads after the initial UI renders; fetchAssetBytes bounds concurrency (max 4)
// and retries HTTP 429/503 automatically so proxy rate limits never stall startup.
queueMicrotask(() => {
    void Promise.allSettled([
        preloadAllFloraModels().catch((err: unknown) => {
            appServices.logger.warn('Plant models could not be preloaded', { error: String(err) });
        }),
        preloadAllSaddleModels().catch((err: unknown) => {
            appServices.logger.warn('Saddle models could not be preloaded', { error: String(err) });
        }),
        preloadAllCharacterModels().catch((err: unknown) => {
            appServices.logger.warn('Character models could not be preloaded', { error: String(err) });
        }),
        preloadAllStatueModels().catch((err: unknown) => {
            appServices.logger.warn('Statue models could not be preloaded', { error: String(err) });
        }),
        preloadArcheryTargetModel().catch((err: unknown) => {
            appServices.logger.warn('Archery target model could not be preloaded', { error: String(err) });
        }),
    ]).then(() => {
        preloadAllAnimalModels().catch((err: unknown) => {
            appServices.logger.warn('Animal models could not be preloaded', { error: String(err) });
        });
    });
});
// #endregion
