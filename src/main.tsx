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
import './index.css';
// #endregion

// ======================== APPLICATION MOUNT ======================== \\
// #region Application Mount
const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new InfrastructureCorruptedException("Root element '#root' was not found in document DOM.");
}

createRoot(rootElement).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>,
);
// #endregion
