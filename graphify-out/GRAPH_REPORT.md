# Graph Report - TheMan  (2026-11-01)

## Corpus Check
- 116 files · ~440,724 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1525 nodes · 3820 edges · 61 communities (41 shown, 20 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1a254a88`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- boidsAndWildlifeSystem.ts
- App.tsx
- terrainMath.test.ts
- swordAttackAnimationSystem.ts
- config.ts
- combatAndInventorySystem.ts
- playerPhysicsSystem.ts
- WorldCanvas.tsx
- ref_node_assert_strict
- package.json
- Deer_Complete.ts
- compilerOptions
- NatureSoundEngine
- settlementModels.ts
- playerAndCombatBuilder.ts
- proceduralModels.ts
- atmosphereRenderController.ts
- WolfAnimator
- terrainAndBiomeSystem.ts
- dwarvenMineAndCaravanSystem.ts
- GameShellOverlay.tsx
- TheMan — 3D Living Nature & RPG World Simulator
- rules/graphify.md
- workflows/graphify.md
- CLAUDE.md
- t
- WorldCanvas
- telemetryStore.ts
- src_world_terrainmath_computedwarvenminercaravanstate
- Deer_Complete_3ce1524f.ts
- src_world_terrainmath_dwarven_guardian_statues
- src_world_terrainmath_dwarven_miners_count
- src_world_terrainmath_dwarven_stone_houses
- Deer_36e45a72.ts
- src_world_terrainmath_arrowprojectile
- itemArtworkRegistry.tsx
- src_world_terrainmath_characterskillsstate
- worldTypes.ts
- src_world_terrainmath_inventoryitemdef
- src_world_terrainmath_obstaclecylinder
- ref_domain_worldtypes
- src_world_domain_landmarksregistry_chinesefortressstairheightat
- src_world_terrainmath_solaratmosphere
- src_world_terrainmath_playerstate
- src_world_terrainmath_rideablehorsestate
- src_world_terrainmath_weatherstatesnapshot
- labCatalog.ts
- IPlayerState
- JaguarAnimator
- Rhino.ts
- SpatialHashGrid2D
- DemonDragon_Complete.ts
- src_world_terrainmath_dynamicatmospherestate
- ForestDragon_Complete.ts
- Bear_Complete_c2863232.ts
- Crocodile_Complete_9a40f875.ts
- Bear_447e38ff.ts
- BearAnimator
- wildlifeAndFootprintsBuilder.ts
- תיקיית מודלים תלת-ממדיים (`public/models`)
- src_locales_index_he

## God Nodes (most connected - your core abstractions)
1. `t()` - 44 edges
2. `groundHeightAt()` - 43 edges
3. `three` - 39 edges
4. `WorldCanvas` - 39 edges
5. `walkableHeightAt()` - 39 edges
6. `DeerAnimator` - 33 edges
7. `DeerAnimator` - 30 edges
8. `DeerAnimator` - 30 edges
9. `NatureSoundEngine` - 27 edges
10. `IPlayerState` - 25 edges

## Surprising Connections (you probably didn't know these)
- `buildLabEntityRig()` --calls--> `createReadyBear()`  [EXTRACTED]
  src/lab/labModelFactory.ts → public/models/animals/Bear_Complete.ts
- `buildWildlifeAndFootprintsLayer()` --calls--> `createReadyBear()`  [EXTRACTED]
  src/world/builders/wildlifeAndFootprintsBuilder.ts → public/models/animals/Bear_Complete.ts
- `buildLabEntityRig()` --calls--> `createReadyCrocodile()`  [EXTRACTED]
  src/lab/labModelFactory.ts → public/models/animals/Crocodile_Complete.ts
- `attachDeerGlbModel()` --calls--> `createReadyDeer()`  [EXTRACTED]
  src/world/models/deerGlbLoader.ts → public/models/animals/Deer_Complete.ts
- `buildSanctuaryAndDragonModels()` --calls--> `createReadyDemonDragon()`  [EXTRACTED]
  src/world/models/sanctuaryAndDragonModels.ts → public/models/animals/DemonDragon_Complete.ts

## Import Cycles
- None detected.

## Communities (61 total, 20 thin omitted)

### Community 0 - "boidsAndWildlifeSystem.ts"
Cohesion: 0.11
Nodes (31): activeWorldAnimalsRegistry, advanceAnimalWithWaterShoreRecovery(), AnimalAiBehavior, BIRD_FLOCK_CONFIGS, BoidBirdState, caveLocalToWorld(), computePlayerNoiseRateAtDistance(), createInitialBoidBirds() (+23 more)

### Community 1 - "App.tsx"
Cohesion: 0.13
Nodes (20): ref_react_dom_client, App(), WEATHER_CYCLE_ORDER, GameSettingsModal(), IGameSettingsModalProps, IKeybindRowMeta, KEYBIND_CATEGORIES, KEYBIND_ROWS (+12 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.06
Nodes (34): DEFAULT_WEATHER_CYCLE_MODE, getRoofHeightAt(), isInsideBearCave(), isPositionUnderRoof(), src_world_terrainmath_birch_grove_center, src_world_terrainmath_birchgrovefactorat, src_world_terrainmath_chinese_fortress_pos, src_world_terrainmath_chinesefortressstairheightat (+26 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.07
Nodes (40): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+32 more)

### Community 4 - "config.ts"
Cohesion: 0.31
Nodes (11): clamp(), IValidatedPositionOverride, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS, URL_SEASON_OFFSETS, URL_WEATHER_MAP (+3 more)

### Community 5 - "combatAndInventorySystem.ts"
Cohesion: 0.09
Nodes (30): IArcheryTargetDef, damageGroundAnimal(), getActiveWorldAnimals(), ISmallAnimalState, ARCHERY_TARGETS_SPATIAL_GRID, arrowFireStrategy, arrowNormalStrategy, arrowWindStrategy (+22 more)

### Community 6 - "playerPhysicsSystem.ts"
Cohesion: 0.15
Nodes (22): PLAYABLE_RADIUS, ARCHERY_TARGETS, CHINESE_FORTRESS_POS, chineseFortressStairHeightAt(), CORNER_WATCHTOWERS, FORTRESS_Z_OFFSET, isChineseFortressWalkableZone(), findLookedAtWatchtowerLadder() (+14 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.06
Nodes (44): ref_three_addons_environments_roomenvironment_js, _camTargetLook, _euler, _sunVec, _tourLook, _tourPos, VirtualMoveState, WorldCanvasProps (+36 more)

### Community 8 - "ref_node_assert_strict"
Cohesion: 0.16
Nodes (6): ref_node_assert_strict, AppException, InfrastructureCorruptedException, InvalidResultAccessException, Result, IPlayerInput

### Community 9 - "package.json"
Cohesion: 0.05
Nodes (39): dependencies, react, react-dom, three, devDependencies, tailwindcss, @tailwindcss/vite, tsx (+31 more)

### Community 10 - "Deer_Complete.ts"
Cohesion: 0.05
Nodes (40): BoneDef, BoneGroup, BoneName, Chain, CHAINS, computeDeerSkinWeights(), createReadyDeer(), Deer (+32 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "NatureSoundEngine"
Cohesion: 0.05
Nodes (13): ref_node_test, ErrorBoundary, IErrorBoundaryProps, IErrorBoundaryState, MockErrorLogger, ConsoleLogger, ILogger, NullLogger (+5 more)

### Community 13 - "settlementModels.ts"
Cohesion: 0.12
Nodes (16): SOUTHERN_PASS_VALLEY_POS, SettlementModelHandles, src_world_terrainmath_bear_mountain_caves, src_world_terrainmath_computehorsebiomechanicalpose, src_world_terrainmath_computeslopepitchandroll, src_world_terrainmath_crocodile_river_bend_pos, src_world_terrainmath_hunter_lodge_pos, src_world_terrainmath_irideablehorsestate (+8 more)

### Community 15 - "playerAndCombatBuilder.ts"
Cohesion: 0.12
Nodes (16): SAVED_LAB_OVERRIDES, IPlayerAndCombatBuilderContext, IPlayerAndCombatHandle, PlayerAndCombatBuilderContext, PlayerAndCombatHandle, IArrowProjectile, ARROW_TRAIL_MAX_AGE, src_world_terrainmath_arrow_trail_max_age (+8 more)

### Community 16 - "proceduralModels.ts"
Cohesion: 0.05
Nodes (104): three, buildColliderDebugWireframes(), IColliderDebugHandles, buildPlayerAndCombatSystems(), attachFlagHorizontalWaveShader(), attachWindSwayShader(), createBirchBarkTexture(), perturbGeometryVertices() (+96 more)

### Community 17 - "atmosphereRenderController.ts"
Cohesion: 0.13
Nodes (14): ref_three_addons_objects_sky_js, applyDynamicAtmosphereToScene(), AtmosphereRenderContext, _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor (+6 more)

### Community 18 - "WolfAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyWolf(), unpackWolfBundle(), Wolf, WOLF_EMBEDDED_PACK_B64, WOLF_EMBEDDED_TEXTURE_URI, WOLF_GAITS, WOLF_STATES (+5 more)

### Community 19 - "terrainAndBiomeSystem.ts"
Cohesion: 0.13
Nodes (38): CLEAR_ZONES, FLAT_BUILDING_TERRACES, SOLID_BUILDING_BOXES, BEAR_MOUNTAIN_CAVES, BIRCH_GROVE_CENTER, CROCODILE_RIVER_BEND_POS, MAGIC_STONE_CIRCLE_POS, PLAYER_EYE_HEIGHT (+30 more)

### Community 20 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.12
Nodes (23): buildDwarvenKingdomAndMiners(), DwarvenKingdomBuilderContext, DwarvenKingdomHandle, DwarvenMinerRig, IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig, VIEW_DISTANCE (+15 more)

### Community 21 - "GameShellOverlay.tsx"
Cohesion: 0.09
Nodes (38): GameShellOverlayProps, IGameShellOverlayProps, IWeatherOptionDef, SEASON_OPTIONS, SkyrimModalMode, WEATHER_OPTIONS, renderArtifactArtwork(), formatMarketError() (+30 more)

### Community 22 - "TheMan — 3D Living Nature & RPG World Simulator"
Cohesion: 0.29
Nodes (6): Engineering standards, Getting Started, Installation & Run, Overview & Architecture, Prerequisites, TheMan — 3D Living Nature & RPG World Simulator

### Community 26 - "t"
Cohesion: 0.16
Nodes (13): en, LocaleSchema, getLocaleDictionary(), NestedKeyOf, setLocaleDictionary(), t(), TranslationDictionary, TranslationKey (+5 more)

### Community 27 - "WorldCanvas"
Cohesion: 0.19
Nodes (19): WorldCanvas, registerWindowDebugBridge(), findNearestFortressDoor(), findNearestMarketStall(), findNearestDeadLootableAnimal(), getAnimalLootDrops(), getAnimalSpeciesNameHe(), lootDeadAnimal() (+11 more)

### Community 28 - "telemetryStore.ts"
Cohesion: 0.21
Nodes (8): GameShellOverlay, renderItemSvgIcon(), TelemetrySnapshot, INITIAL_TELEMETRY_SNAPSHOT, ITelemetryStore, telemetryStore, useTelemetry(), src_world_terrainmath_world_spawn

### Community 30 - "Deer_Complete_3ce1524f.ts"
Cohesion: 0.06
Nodes (33): BoneDef, BoneGroup, BoneName, Chain, CHAINS, computeDeerSkinWeights(), createReadyDeer(), Deer (+25 more)

### Community 34 - "Deer_36e45a72.ts"
Cohesion: 0.06
Nodes (30): BoneDef, BoneGroup, BoneName, Chain, CHAINS, computeDeerSkinWeights(), Deer, DEER_BONES (+22 more)

### Community 36 - "itemArtworkRegistry.tsx"
Cohesion: 0.10
Nodes (10): react, ExplorerMinimap, ExplorerMinimapProps, GRID_SIZE, IExplorerMinimapProps, ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES (+2 more)

### Community 38 - "worldTypes.ts"
Cohesion: 0.05
Nodes (44): ITelemetrySnapshot, IValidatedUrlOverrides, ArcheryTargetDef, ArrowTrailPoint, CameraPerspectiveMode, CharacterSkillsState, ClimbableLadderInfo, CornerWatchtowerDef (+36 more)

### Community 47 - "labCatalog.ts"
Cohesion: 0.07
Nodes (56): ref_three_examples_jsm_environments_roomenvironment_js, CharacterLabCanvas(), afterDraw(), tick(), ICharacterLabCanvasProps, CAMERA_PRESETS, CharacterLabView(), ENVIRONMENT_PRESETS (+48 more)

### Community 49 - "IPlayerState"
Cohesion: 0.11
Nodes (10): ArrowElementKind, EquippedToolSlot, IPlayerState, ArrowEquipmentStrategy, BowEquipmentStrategy, IEquipmentSlotStrategy, isInventoryItemEquipped(), SwordEquipmentStrategy (+2 more)

### Community 50 - "JaguarAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyJaguar(), Jaguar, JAGUAR_EMBEDDED_PACK_B64, JAGUAR_EMBEDDED_TEXTURE_URI, JAGUAR_GAITS, JAGUAR_STATES, JaguarAnimator (+5 more)

### Community 51 - "Rhino.ts"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyRhino(), Rhino, RHINO_EMBEDDED_PACK_B64, RHINO_EMBEDDED_TEXTURE_URI, RHINO_GAITS, RHINO_STATES, RhinoAnimator (+5 more)

### Community 53 - "DemonDragon_Complete.ts"
Cohesion: 0.09
Nodes (14): CLIP_ORDER, createReadyDemonDragon(), DEMON_DRAGON_EMBEDDED_PACK_B64, DEMON_DRAGON_EMBEDDED_TEXTURE_URI, DEMON_DRAGON_GAITS, DemonDragon, DemonDragonAnimator, DemonDragonOptions (+6 more)

### Community 55 - "ForestDragon_Complete.ts"
Cohesion: 0.09
Nodes (14): CLIP_ORDER, createReadyForestDragon(), FOREST_DRAGON_EMBEDDED_PACK_B64, FOREST_DRAGON_EMBEDDED_TEXTURE_URI, FOREST_DRAGON_GAITS, ForestDragon, ForestDragonAnimator, ForestDragonOptions (+6 more)

### Community 56 - "Bear_Complete_c2863232.ts"
Cohesion: 0.10
Nodes (12): Bear, BEAR_EMBEDDED_PACK_B64, BEAR_EMBEDDED_TEXTURE_URI, BEAR_GAITS, BearAnimator, BearOptions, BearRig, BearState (+4 more)

### Community 57 - "Crocodile_Complete_9a40f875.ts"
Cohesion: 0.10
Nodes (12): CLIP_ORDER, createReadyCrocodile(), CROC_EMBEDDED_PACK_B64, CROC_EMBEDDED_TEXTURE_URI, Crocodile, CROCODILE_GAITS, CrocodileAnimator, CrocodileOptions (+4 more)

### Community 58 - "Bear_447e38ff.ts"
Cohesion: 0.11
Nodes (8): Bear, BEAR_GAITS, BearAnimator, BearOptions, BearRig, BearState, BearUnpackedData, CLIP_ORDER

### Community 59 - "BearAnimator"
Cohesion: 0.09
Nodes (13): Bear, BEAR_EMBEDDED_PACK_B64, BEAR_EMBEDDED_TEXTURE_URI, BEAR_GAITS, BEAR_STATES, BearAnimator, BearOptions, BearRig (+5 more)

### Community 60 - "wildlifeAndFootprintsBuilder.ts"
Cohesion: 0.07
Nodes (27): createReadyCrocodile(), CROC_EMBEDDED_PACK_B64, CROC_EMBEDDED_TEXTURE_URI, Crocodile, CROCODILE_GAITS, CROCODILE_STATES, CrocodileAnimator, CrocodileOptions (+19 more)

### Community 74 - "תיקיית מודלים תלת-ממדיים (`public/models`)"
Cohesion: 0.50
Nodes (3): מבנה תיקיות מומלץ (אופציונלי, או ישירות בתיקייה זו):, פורמטים מומלצים:, תיקיית מודלים תלת-ממדיים (`public/models`)

## Knowledge Gaps
- **319 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+314 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 560 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `proceduralModels.ts` to `WorldCanvas.tsx`, `package.json`, `Deer_Complete.ts`, `settlementModels.ts`, `playerAndCombatBuilder.ts`, `atmosphereRenderController.ts`, `WolfAnimator`, `dwarvenMineAndCaravanSystem.ts`, `Deer_Complete_3ce1524f.ts`, `Deer_36e45a72.ts`, `labCatalog.ts`, `JaguarAnimator`, `Rhino.ts`, `DemonDragon_Complete.ts`, `ForestDragon_Complete.ts`, `Bear_Complete_c2863232.ts`, `Crocodile_Complete_9a40f875.ts`, `Bear_447e38ff.ts`, `BearAnimator`, `wildlifeAndFootprintsBuilder.ts`?**
  _High betweenness centrality (0.472) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `boidsAndWildlifeSystem.ts`, `App.tsx`, `itemArtworkRegistry.tsx`, `combatAndInventorySystem.ts`, `playerPhysicsSystem.ts`, `WorldCanvas.tsx`, `worldTypes.ts`, `NatureSoundEngine`, `labCatalog.ts`, `proceduralModels.ts`, `terrainAndBiomeSystem.ts`, `dwarvenMineAndCaravanSystem.ts`, `GameShellOverlay.tsx`, `WorldCanvas`, `telemetryStore.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _319 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `boidsAndWildlifeSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10795454545454546 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13043478260869565 - nodes in this community are weakly interconnected._
- **Should `terrainMath.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `swordAttackAnimationSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07200929152148665 - nodes in this community are weakly interconnected._