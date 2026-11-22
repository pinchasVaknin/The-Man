// ============================================================================
// MODULE: Tooling / Vite Configuration
// DESIGN: Vite build and development server configuration with code-splitting (SRP)
// SUMMARY: Configures React, Tailwind CSS, the dev-only file persistence plugin
//          (devServer/), path aliases, server HMR and vendor chunk partitioning.
//          Imports nothing from src/, so the config never loads game code.
// ============================================================================

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { rmSync } from 'node:fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { devBundlePlugin } from './devServer/devBundlePlugin.ts';
import { directFilePersistencePlugin } from './devServer/persistencePlugin.ts';

// public/assets/aistudio is an AI Studio sync folder the app never loads; Vite copies all of
// public/ into the build, so drop it from the output once the bundle is written.
function removeAiStudioAssetsPlugin(): Plugin {
  let outDir = 'dist';
  return {
    name: 'remove-aistudio-assets',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      rmSync(path.join(outDir, 'assets', 'aistudio'), { recursive: true, force: true });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      devBundlePlugin(import.meta.dirname),
      directFilePersistencePlugin(import.meta.dirname),
      removeAiStudioAssetsPlugin(),
    ],
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
      port: 3000,
      host: '0.0.0.0',
      // Cloud preview environments (Google AI Studio) serve the app from their own host names.
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      host: '0.0.0.0',
      allowedHosts: true as const,
    },
  };
});
