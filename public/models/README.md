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
