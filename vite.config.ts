// ============================================================================
// MODULE: Tooling / Vite Configuration
// DESIGN: Vite build and development server configuration with code-splitting (SRP)
// SUMMARY: Configures React, Tailwind CSS, the dev-only file persistence plugin
//          (devServer/), path aliases, server HMR and vendor chunk partitioning.
//          Imports nothing from src/, so the config never loads game code.
// ============================================================================

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { directFilePersistencePlugin } from './devServer/persistencePlugin.ts';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), directFilePersistencePlugin(import.meta.dirname)],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      rolldownOptions: {
        output: {
          // Vite 8 / Rolldown: codeSplitting.groups replaces the deprecated manualChunks.
          codeSplitting: {
            groups: [
              { name: 'vendor-three', test: /[\\/]node_modules[\\/]three[\\/]/, priority: 30 },
              { name: 'vendor-react', test: /[\\/]node_modules[\\/]react/, priority: 30 },
            ],
          },
        },
      },
      chunkSizeWarningLimit: 800,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
