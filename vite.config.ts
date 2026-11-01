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
import type { IncomingMessage } from 'node:http';
import { validateGameSettings, validateLabOverrides } from './src/config/persistedSettingsValidation';

// ======================== DEV-ONLY FILE PERSISTENCE ======================== \\
// #region Dev File Persistence Plugin
/** Largest accepted request body; real settings and lab override payloads are a few KB. */
const MAX_PERSISTENCE_BODY_BYTES = 256 * 1024;

type PersistenceErrorCode =
  | 'FORBIDDEN_ORIGIN'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'PAYLOAD_TOO_LARGE'
  | 'INVALID_JSON'
  | 'INVALID_GAME_SETTINGS'
  | 'INVALID_LAB_OVERRIDES'
  | 'SETTINGS_FILE_MARKERS_MISSING'
  | 'INTERNAL_ERROR';

const STATUS_BY_ERROR: Readonly<Record<PersistenceErrorCode, number>> = {
  FORBIDDEN_ORIGIN: 403,
  UNSUPPORTED_MEDIA_TYPE: 415,
  PAYLOAD_TOO_LARGE: 413,
  INVALID_JSON: 400,
  INVALID_GAME_SETTINGS: 400,
  INVALID_LAB_OVERRIDES: 400,
  SETTINGS_FILE_MARKERS_MISSING: 500,
  INTERNAL_ERROR: 500,
};

/**
 * Summary: Thrown inside a request handler to answer with a known error code.
 * Design: Local to the dev plugin; the handler boundary turns it into an opaque JSON error.
 */
class PersistenceRequestError extends Error {
  public constructor(public readonly code: PersistenceErrorCode) {
    super(code);
  }
}

/** Summary: Rejects cross-origin browser requests (CSRF) and non-JSON bodies before reading them. */
function assertTrustedJsonRequest(req: IncomingMessage): void {
  const origin = req.headers.origin;
  if (origin !== undefined && origin !== `http://${req.headers.host}`) {
    throw new PersistenceRequestError('FORBIDDEN_ORIGIN');
  }
  if (!(req.headers['content-type'] ?? '').startsWith('application/json')) {
    throw new PersistenceRequestError('UNSUPPORTED_MEDIA_TYPE');
  }
}

/** Summary: Reads and parses a JSON body, aborting as soon as it exceeds the size cap. */
async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > MAX_PERSISTENCE_BODY_BYTES) {
      throw new PersistenceRequestError('PAYLOAD_TOO_LARGE');
    }
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  } catch {
    throw new PersistenceRequestError('INVALID_JSON');
  }
}

/** Summary: Writes the lab overrides source file from a validated payload. */
async function saveLabOverrides(payload: unknown): Promise<string> {
  const validated = validateLabOverrides(payload);
  if (validated.isFailure) throw new PersistenceRequestError(validated.error);
  const targetPath = path.resolve(import.meta.dirname, 'src/config/savedLabOverrides.ts');
  const fileContent = `// ============================================================================
// MODULE: Config / Saved Lab Pose & Weapon Overrides
// DESIGN: Persistent source-of-truth file written directly by the Lab "Save" button
// SUMMARY: Stores per-entity weapon/limb/body pose overrides calibrated in the
//          Character & Animation Laboratory so they persist in the project codebase.
// ============================================================================

import type { ILabPoseOverrides } from '../lab/labCatalog';

export const SAVED_LAB_OVERRIDES: Record<string, ILabPoseOverrides> = ${JSON.stringify(validated.value, null, 2)};
`;
  await fs.writeFile(targetPath, fileContent, 'utf-8');
  return 'src/config/savedLabOverrides.ts';
}

/** Summary: Rewrites the SAVED_GAME_SETTINGS literal in place from a validated payload. */
async function saveGameSettings(payload: unknown): Promise<string> {
  const validated = validateGameSettings(payload);
  if (validated.isFailure) throw new PersistenceRequestError(validated.error);
  const targetPath = path.resolve(import.meta.dirname, 'src/config/savedGameSettings.ts');
  const currentFile = await fs.readFile(targetPath, 'utf-8');
  const markerStart = 'export const SAVED_GAME_SETTINGS: IGameSettingsConfig = ';
  const startIdx = currentFile.indexOf(markerStart);
  const storageKeyIdx = currentFile.indexOf('\nconst STORAGE_KEY =');
  if (startIdx === -1 || storageKeyIdx === -1) {
    throw new PersistenceRequestError('SETTINGS_FILE_MARKERS_MISSING');
  }
  const updatedFile =
    currentFile.slice(0, startIdx) +
    markerStart +
    JSON.stringify(validated.value, null, 2) +
    ';\n' +
    currentFile.slice(storageKeyIdx);
  await fs.writeFile(targetPath, updatedFile, 'utf-8');
  return 'src/config/savedGameSettings.ts';
}

const PERSISTENCE_ROUTES: ReadonlyMap<string, (payload: unknown) => Promise<string>> = new Map([
  ['/api/save-lab-overrides', saveLabOverrides],
  ['/api/save-game-settings', saveGameSettings],
]);

/**
 * Summary: Dev-server-only endpoints that let the Lab and Settings "Save" buttons write
 *          their values back into src/config. Not part of the production build.
 * Design: Route map (no if-chains), one error boundary per request, opaque error codes,
 *         same-origin + JSON content-type checks against CSRF, a body size cap and
 *         allowlist validation before anything touches the file system.
 */
function directFilePersistencePlugin(): Plugin {
  return {
    name: 'direct-file-persistence-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const save = req.method === 'POST' && req.url ? PERSISTENCE_ROUTES.get(req.url) : undefined;
        if (!save) {
          next();
          return;
        }
        res.setHeader('Content-Type', 'application/json');
        try {
          assertTrustedJsonRequest(req);
          const file = await save(await readJsonBody(req));
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true, file }));
        } catch (err: unknown) {
          const code = err instanceof PersistenceRequestError ? err.code : 'INTERNAL_ERROR';
          if (code === 'INTERNAL_ERROR' || code === 'SETTINGS_FILE_MARKERS_MISSING') {
            server.config.logger.error(`[persistence] ${req.url} failed: ${String(err)}`);
          }
          res.statusCode = STATUS_BY_ERROR[code];
          res.end(JSON.stringify({ ok: false, errorCode: code }));
        }
      });
    },
  };
}
// #endregion

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
