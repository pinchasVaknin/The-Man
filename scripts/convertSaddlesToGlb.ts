// ============================================================================
// MODULE: Tooling / Saddle GLB Converter
// DESIGN: One-off exporter; reads the packed saddle data modules through the runtime's own unpacker
// SUMMARY: Writes public/models/equipment/<name>.glb for both saddles. Run with:
//          npx tsx scripts/convertSaddlesToGlb.ts
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \
// #region Imports & Dependencies
import { mkdirSync, writeFileSync } from 'node:fs';
import { encodeSaddleGlb } from '../src/world/models/equipment/saddleGlb';
import { unpackSaddleBundle } from '../src/world/models/equipment/saddleRuntime';
import { SADDLE_PACK_B64, SADDLE_SPEC, SADDLE_TEX_B64 } from '../src/world/models/equipment/Saddle_Complete';
import { WESTERN_SADDLE_PACK_B64, WESTERN_SADDLE_SPEC, WESTERN_SADDLE_TEX_B64 } from '../src/world/models/equipment/WesternSaddle_Complete';
// #endregion

// ======================== CONVERSION ======================== \
// #region Convert Both Saddles
const OUTPUT_DIRECTORY = new URL('../public/models/equipment/', import.meta.url);
mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
for (const [fileName, spec, pack, texture] of [
  ['saddle', SADDLE_SPEC, SADDLE_PACK_B64, SADDLE_TEX_B64],
  ['western-saddle', WESTERN_SADDLE_SPEC, WESTERN_SADDLE_PACK_B64, WESTERN_SADDLE_TEX_B64],
] as const) {
  const glb = encodeSaddleGlb({ mesh: unpackSaddleBundle(pack, spec), textureDataUri: texture });
  writeFileSync(new URL(`${fileName}.glb`, OUTPUT_DIRECTORY), new Uint8Array(glb));
  console.log(`${fileName}.glb ${(glb.byteLength / 1024).toFixed(0)} KB`);
}
// #endregion
