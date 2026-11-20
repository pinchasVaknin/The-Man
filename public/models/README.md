# 3D model files (`public/models`)

Files here are served as-is at `/models/<path>` and are not part of the JavaScript bundle.

## `animals/`

One GLB per animal: `bear`, `crocodile`, `jaguar`, `wolf`, `rhino`, `demon-dragon`,
`forest-dragon`, `deer`. Each file holds the skinned mesh, the skeleton, the embedded JPEG
texture and, for every animal except the deer, the 13 baked animation clips (24 keyframes
each). The deer's animations are procedural IK code in `src/world/models/animals/Deer_Complete.ts`.

- Normals, UVs (0..1 models), skin weights and clip rotations are stored quantized
  (`KHR_mesh_quantization`), exactly as the original packs were.
- `asset.extras` carries `format: "theman-animal-model@1"`, the root-motion joint, the exact
  clip durations and the original parent table.
- Loaded at runtime by `src/world/models/animalModelAssets.ts` (three's `GLTFLoader`); the
  animals appear in the world as their files arrive.
- `src/world/models/__golden__/*-model.json` pins geometry, skeleton and animation poses;
  re-export a model only together with an intentional golden update.

## `plants/`

One GLB per plant: `anim-tree`, `anim-tree-wide`, `anim-tree-compact`, `pine-tree`, `oak-green`,
`oak-yellow`, `forest-bush`, `forest-fern`, `cornflower`, `white-flower`. Plain glTF 2.0 with float
geometry (no quantization). Each file has a node `high` (full mesh) and a node `low` (LOD mesh);
every primitive carries its material id in `extras.matId`, and the textures are glTF images
(WebP through `EXT_texture_webp`, or JPEG). `asset.extras.format` is `"theman-flora-model@1"`.

- Read and written by `src/world/models/plants/floraGlb.ts`; it does not use `GLTFLoader`, so the
  arrays come back exactly as stored.
- Loaded by `src/world/models/plants/floraAssets.ts`. The download starts at app start and the
  `'vegetation'` loading stage waits for it, so the world never builds without its plants.
- The materials, wind sway and tree-felling animation are code in `plants/floraRuntime.ts`.
- These files replaced base64 data modules (`plants/*_Complete.ts`) and a one-off converter,
  removed in the commit after `cdf2936`. To re-export a plant from the old data, check out
  `cdf2936` and run `npx tsx scripts/convertFloraToGlb.ts`.
