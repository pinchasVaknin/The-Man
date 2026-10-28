// ============================================================================
// MODULE: Application Entrypoint
// DESIGN: Mounts React application root into DOM element (SRP)
// SUMMARY: Initializes the React 19 application tree and imports global styles.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
// #endregion

// ======================== APPLICATION MOUNT ======================== \\
// #region Application Mount
createRoot(document.getElementById('root')!).render(<App />);
// #endregion
