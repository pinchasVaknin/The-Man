// ============================================================================
// MODULE: Dev Server / Bundled Dev Module Plugin
// DESIGN: Vite dev-server middleware serving an in-memory esbuild ESM bundle (SRP)
// SUMMARY: Collapses 240+ unbundled src/ TypeScript requests down to a few split
//          ESM chunks in dev mode so rate-limited cloud proxies (HTTP 429) never
//          abort the initial module graph. Dev-only; npm run build is untouched.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as esbuild from 'esbuild';
import path from 'node:path';
import type { Plugin } from 'vite';
// #endregion

// ======================== DEV BUNDLE PLUGIN ======================== \\
// #region Dev Bundle Plugin
const DEV_BUNDLE_PREFIX = '/@dev-bundle/';

interface IBuiltBundle {
  readonly files: Map<string, Uint8Array>;
}

/**
 * Summary: Bundles src/main.tsx into split ESM chunks in memory via esbuild (~250ms)
 *          while letting Vite serve /src/index.css (Tailwind v4) and /models/*.glb.
 */
export function devBundlePlugin(projectRoot: string): Plugin {
  let cachedBundle: IBuiltBundle | null = null;
  let pendingBuild: Promise<IBuiltBundle> | null = null;

  const invalidate = (): void => {
    cachedBundle = null;
  };

  const buildInMemory = async (): Promise<IBuiltBundle> => {
    if (cachedBundle) return cachedBundle;
    if (pendingBuild) return pendingBuild;

    pendingBuild = (async () => {
      const virtualOutDir = path.join(projectRoot, '.dev-bundle-virtual');
      const result = await esbuild.build({
        entryPoints: {
          main: path.resolve(projectRoot, 'src/main.tsx'),
        },
        bundle: true,
        splitting: true,
        format: 'esm',
        platform: 'browser',
        target: 'es2022',
        jsx: 'automatic',
        sourcemap: 'inline',
        write: false,
        outdir: virtualOutDir,
        publicPath: DEV_BUNDLE_PREFIX,
        define: {
          'import.meta.env.BASE_URL': '"/"',
          'import.meta.env.DEV': 'true',
          'import.meta.env.PROD': 'false',
          'import.meta.env.MODE': '"development"',
        },
        plugins: [
          {
            name: 'externalize-css-to-vite',
            setup(build) {
              build.onResolve({ filter: /\.css$/ }, (args) => ({
                path: args.path,
                namespace: 'dev-bundle-ignore-css',
              }));
              build.onLoad({ filter: /.*/, namespace: 'dev-bundle-ignore-css' }, () => ({
                contents: '',
                loader: 'js',
              }));
            },
          },
        ],
      });

      const files = new Map<string, Uint8Array>();
      for (const out of result.outputFiles) {
        const rel = path.relative(virtualOutDir, out.path).replace(/\\/g, '/');
        files.set(rel, out.contents);
      }
      cachedBundle = { files };
      return cachedBundle;
    })();

    try {
      return await pendingBuild;
    } finally {
      pendingBuild = null;
    }
  };

  return {
    name: 'dev-bundle-plugin',
    apply: 'serve',
    configureServer(server) {
      server.watcher?.on('change', invalidate);
      server.watcher?.on('add', invalidate);
      server.watcher?.on('unlink', invalidate);

      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url ?? '';
        const cleanPath = rawUrl.split('?')[0];

        if (cleanPath.startsWith('/models/') && cleanPath.endsWith('.glb')) {
          res.setHeader('Cache-Control', 'public, max-age=3600');
          next();
          return;
        }

        if (!cleanPath.startsWith(DEV_BUNDLE_PREFIX)) {
          next();
          return;
        }

        const relFile = cleanPath.slice(DEV_BUNDLE_PREFIX.length);
        try {
          const bundle = await buildInMemory();
          const content = bundle.files.get(relFile);
          if (!content) {
            res.statusCode = 404;
            res.end(`Not found in dev bundle: ${relFile}`);
            return;
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(Buffer.from(content));
        } catch (err: unknown) {
          server.config.logger.error(`[dev-bundle] Build failed: ${String(err)}`);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.end(`console.error(${JSON.stringify(`Dev bundle error: ${String(err)}`)});`);
        }
      });
    },
    transformIndexHtml(html) {
      return html.replace(
        '<script type="module" src="/src/main.tsx"></script>',
        `<link rel="stylesheet" href="/src/index.css?direct" />\n    <script type="module" src="${DEV_BUNDLE_PREFIX}main.js"></script>`
      );
    },
  };
}
// #endregion
