// ============================================================================
// MODULE: Tooling / Flora GLB Converter
// DESIGN: One-off exporter; reads the packed plant data modules through the runtime's own unpacker
// SUMMARY: Writes public/models/plants/<name>.glb for every plant. Run with:
//          npx tsx scripts/convertFloraToGlb.ts
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \
// #region Imports & Dependencies
import { mkdirSync, writeFileSync } from 'node:fs';
import { encodeFloraGlb } from '../src/world/models/plants/floraGlb';
import { unpackFloraBundle } from '../src/world/models/plants/floraRuntime';
import * as animTree from '../src/world/models/plants/AnimTree_Complete';
import * as animTreeCompact from '../src/world/models/plants/AnimTreeCompact_Complete';
import * as animTreeWide from '../src/world/models/plants/AnimTreeWide_Complete';
import * as cornflower from '../src/world/models/plants/Cornflower_Complete';
import * as forestBush from '../src/world/models/plants/ForestBush_Complete';
import * as forestFern from '../src/world/models/plants/ForestFern_Complete';
import * as oakGreen from '../src/world/models/plants/OakGreen_Complete';
import * as oakYellow from '../src/world/models/plants/OakYellow_Complete';
import * as pineTree from '../src/world/models/plants/PineTree_Complete';
import * as whiteFlower from '../src/world/models/plants/WhiteFlower_Complete';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \
// #region Constants & Types
interface IPlantDataModule {
  [exportName: string]: unknown;
}

/** File name (without extension) and the upper-case prefix of its data exports. */
const PLANTS: ReadonlyArray<readonly [string, string, IPlantDataModule]> = [
  ['anim-tree', 'ANIMTREE', animTree],
  ['anim-tree-wide', 'ANIMTREEWIDE', animTreeWide],
  ['anim-tree-compact', 'ANIMTREECOMPACT', animTreeCompact],
  ['pine-tree', 'PINETREE', pineTree],
  ['oak-green', 'OAKGREEN', oakGreen],
  ['oak-yellow', 'OAKYELLOW', oakYellow],
  ['forest-bush', 'FORESTBUSH', forestBush],
  ['forest-fern', 'FORESTFERN', forestFern],
  ['cornflower', 'CORNFLOWER', cornflower],
  ['white-flower', 'WHITEFLOWER', whiteFlower],
];
const OUTPUT_DIRECTORY = new URL('../public/models/plants/', import.meta.url);
// #endregion

// ======================== CONVERSION ======================== \
// #region Convert All Plants
mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
for (const [fileName, prefix, data] of PLANTS) {
  const glb = encodeFloraGlb({
    high: unpackFloraBundle(data[`${prefix}_PACK_B64`] as string),
    low: unpackFloraBundle(data[`${prefix}_LOD_PACK_B64`] as string),
    textures: data[`${prefix}_TEXTURES`] as Record<number, string>,
  });
  writeFileSync(new URL(`${fileName}.glb`, OUTPUT_DIRECTORY), new Uint8Array(glb));
  console.log(`${fileName}.glb ${(glb.byteLength / 1024).toFixed(0)} KB`);
}
// #endregion
