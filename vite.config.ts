// ============================================================================
// MODULE: Tooling / Vite Configuration
// DESIGN: Vite build and development server configuration with code-splitting (SRP)
// SUMMARY: Configures React, Tailwind CSS plugin, path aliases, server HMR, and
//          vendor chunk partitioning to reduce production JS bundle size.
// ============================================================================

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs/promises';
import path from 'path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

function directFilePersistencePlugin(): Plugin {
  return {
    name: 'direct-file-persistence-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method === 'POST' && req.url === '/api/save-lab-overrides') {
          try {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const bodyStr = Buffer.concat(chunks).toString('utf-8');
            const parsed = JSON.parse(bodyStr || '{}');
            const targetPath = path.resolve(
              import.meta.dirname,
              'src/config/savedLabOverrides.ts'
            );
            const fileContent = `// ============================================================================
// MODULE: Config / Saved Lab Pose & Weapon Overrides
// DESIGN: Persistent source-of-truth file written directly by the Lab "Save" button
// SUMMARY: Stores per-entity weapon/limb/body pose overrides calibrated in the
//          Character & Animation Laboratory so they persist in the project codebase.
// ============================================================================

import type { ILabPoseOverrides } from '../lab/labCatalog';

export const SAVED_LAB_OVERRIDES: Record<string, ILabPoseOverrides> = ${JSON.stringify(parsed, null, 2)};
`;
            await fs.writeFile(targetPath, fileContent, 'utf-8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, file: 'src/config/savedLabOverrides.ts' }));
          } catch (err: unknown) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: String(err) }));
          }
          return;
        }

        if (req.method === 'POST' && req.url === '/api/save-game-settings') {
          try {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const bodyStr = Buffer.concat(chunks).toString('utf-8');
            const parsed = JSON.parse(bodyStr || '{}');
            const targetPath = path.resolve(
              import.meta.dirname,
              'src/config/savedGameSettings.ts'
            );
            const currentFile = await fs.readFile(targetPath, 'utf-8');
            const markerStart = 'export const SAVED_GAME_SETTINGS: IGameSettingsConfig = ';
            const startIdx = currentFile.indexOf(markerStart);
            const storageKeyIdx = currentFile.indexOf('\nconst STORAGE_KEY =');
            if (startIdx !== -1 && storageKeyIdx !== -1) {
              const updatedFile =
                currentFile.slice(0, startIdx) +
                markerStart +
                JSON.stringify(parsed, null, 2) +
                ';\n' +
                currentFile.slice(storageKeyIdx);
              await fs.writeFile(targetPath, updatedFile, 'utf-8');
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, file: 'src/config/savedGameSettings.ts' }));
          } catch (err: unknown) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: String(err) }));
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), directFilePersistencePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three')) {
              return 'vendor-three';
            }
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react';
            }
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
