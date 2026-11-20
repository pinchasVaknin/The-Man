// ============================================================================
// MODULE: Tooling / Clip-Rig Animal GLB Converter
// DESIGN: One-off exporter; reads each animal's packed data module through the module's own unpacker
// SUMMARY: Writes public/models/animals/<name>.glb for the seven animals still packed as base64.
//          Run with: npx tsx scripts/convertClipRigAnimalsToGlb.ts
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { mkdirSync, writeFileSync } from 'node:fs';
import { encodeClipRigGlb } from '../src/world/models/animals/clipRigGlb';
import type { IClipRigModelData } from '../src/world/models/animalModelAssets';
import { CAT_LION_EMBEDDED_PACK_B64, CAT_LION_EMBEDDED_TEXTURE_URI, unpackCatLionBundle } from '../src/world/models/animals/CatLion_Complete';
import { STAG_EMBEDDED_PACK_B64, STAG_EMBEDDED_TEXTURE_URI, unpackStagBundle } from '../src/world/models/animals/Stag_Complete';
import { DOVE_EMBEDDED_PACK_B64, DOVE_EMBEDDED_TEXTURE_URI, unpackDoveBundle } from '../src/world/models/animals/Dove_Complete';
import { HORSE_EMBEDDED_PACK_B64, HORSE_EMBEDDED_TEXTURE_URI, unpackHorseBundle } from '../src/world/models/animals/Horse_Complete';
import { DOLPHIN_PACK_B64, DOLPHIN_TEX_B64, unpackDolphinBundle } from '../src/world/models/animals/Dolphin_Complete';
import { HIPPO_PACK_B64, HIPPO_TEX_B64, unpackHippoBundle } from '../src/world/models/animals/Hippo_Complete';
import { KOIFISH_PACK_B64, KOIFISH_TEX_B64, unpackKoiFishBundle } from '../src/world/models/animals/KoiFish_Complete';
// #endregion

// ======================== CONVERSION ======================== \\
// #region Convert All Animals
const OUTPUT_DIRECTORY = new URL('../public/models/animals/', import.meta.url);
mkdirSync(OUTPUT_DIRECTORY, { recursive: true });

const ANIMALS: ReadonlyArray<readonly [string, () => IClipRigModelData, string]> = [
  ['cat-lion', () => unpackCatLionBundle(CAT_LION_EMBEDDED_PACK_B64), CAT_LION_EMBEDDED_TEXTURE_URI],
  ['stag', () => unpackStagBundle(STAG_EMBEDDED_PACK_B64), STAG_EMBEDDED_TEXTURE_URI],
  ['dove', () => unpackDoveBundle(DOVE_EMBEDDED_PACK_B64), DOVE_EMBEDDED_TEXTURE_URI],
  ['horse', () => unpackHorseBundle(HORSE_EMBEDDED_PACK_B64), HORSE_EMBEDDED_TEXTURE_URI],
  ['dolphin', () => unpackDolphinBundle(DOLPHIN_PACK_B64), DOLPHIN_TEX_B64],
  ['hippo', () => unpackHippoBundle(HIPPO_PACK_B64), HIPPO_TEX_B64],
  ['koi-fish', () => unpackKoiFishBundle(KOIFISH_PACK_B64), KOIFISH_TEX_B64],
];

for (const [fileName, unpack, textureUri] of ANIMALS) {
  const rig = unpack();
  const framesPerClip = rig.clipRootTranslations.length / 3 / rig.clipDurations.length;
  const glb = encodeClipRigGlb(rig, framesPerClip, textureUri);
  writeFileSync(new URL(`${fileName}.glb`, OUTPUT_DIRECTORY), new Uint8Array(glb));
  console.log(`${fileName}.glb ${(glb.byteLength / 1024).toFixed(0)} KB (${rig.parents.length} joints, ${rig.clipDurations.length} clips x ${framesPerClip} frames)`);
}
// #endregion
