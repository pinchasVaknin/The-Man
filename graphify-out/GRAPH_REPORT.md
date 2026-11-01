# Graph Report - TheMan  (2026-11-01)

## Corpus Check
- 116 files · ~444,629 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1526 nodes · 3830 edges · 72 communities (47 shown, 25 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2b566aae`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- boidsAndWildlifeSystem.ts
- GameSettingsModal.tsx
- terrainMath.test.ts
- swordAttackAnimationSystem.ts
- config.ts
- combatAndInventorySystem.ts
- playerPhysicsSystem.ts
- WorldCanvas.tsx
- AppException.ts
- package.json
- Deer_Complete.ts
- compilerOptions
- NatureSoundEngine
- playerAndCombatBuilder.ts
- IRideableHorseState
- react
- proceduralModels.ts
- atmosphereRenderController.ts
- wildlifeAndFootprintsBuilder.ts
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
- ITelemetrySnapshot
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
- Crocodile.ts
- src_world_terrainmath_getanimalspeciesnamehe
- ref_node_assert_strict
- collisionAndTerraces.ts
- ErrorBoundary.tsx
- App.tsx
- Result
- ConsoleLogger
- MockErrorLogger
- MockLogger
- תיקיית מודלים תלת-ממדיים (`public/models`)
- src_locales_index_he

## God Nodes (most connected - your core abstractions)
1. `t()` - 49 edges
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
- `buildWildlifeAndFootprintsLayer()` --calls--> `createReadyCrocodile()`  [EXTRACTED]
  src/world/builders/wildlifeAndFootprintsBuilder.ts → public/models/animals/Crocodile_Complete.ts
- `attachDeerGlbModel()` --calls--> `createReadyDeer()`  [EXTRACTED]
  src/world/models/deerGlbLoader.ts → public/models/animals/Deer_Complete.ts

## Import Cycles
- None detected.

## Communities (72 total, 25 thin omitted)

### Community 0 - "boidsAndWildlifeSystem.ts"
Cohesion: 0.11
Nodes (31): activeWorldAnimalsRegistry, advanceAnimalWithWaterShoreRecovery(), AnimalAiBehavior, BIRD_FLOCK_CONFIGS, BoidBirdState, caveLocalToWorld(), computePlayerNoiseRateAtDistance(), createInitialBoidBirds() (+23 more)

### Community 1 - "GameSettingsModal.tsx"
Cohesion: 0.23
Nodes (13): GameSettingsModal(), IGameSettingsModalProps, IKeybindRowMeta, KEYBIND_CATEGORIES, KEYBIND_ROWS, KeybindCategory, DEFAULT_GAME_KEYBINDINGS, FirefliesMode (+5 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.05
Nodes (47): LAKESIDE_TEA_PAVILION_POS, ISettlementModelHandles, SettlementModelHandles, DEFAULT_WEATHER_CYCLE_MODE, src_world_terrainmath_bear_mountain_caves, src_world_terrainmath_birch_grove_center, src_world_terrainmath_birchgrovefactorat, src_world_terrainmath_chinese_fortress_pos (+39 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.07
Nodes (40): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+32 more)

### Community 4 - "config.ts"
Cohesion: 0.31
Nodes (11): clamp(), IValidatedPositionOverride, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS, URL_SEASON_OFFSETS, URL_WEATHER_MAP (+3 more)

### Community 5 - "combatAndInventorySystem.ts"
Cohesion: 0.08
Nodes (30): IWildlifeAndFootprintsHandles, IArcheryTargetDef, damageGroundAnimal(), getActiveWorldAnimals(), IBoidBirdState, ISmallAnimalState, ARCHERY_TARGETS_SPATIAL_GRID, arrowFireStrategy (+22 more)

### Community 6 - "playerPhysicsSystem.ts"
Cohesion: 0.14
Nodes (24): ARCHERY_TARGETS, CHINESE_FORTRESS_POS, chineseFortressStairHeightAt(), CORNER_WATCHTOWERS, FORTRESS_Y_OFFSET, FORTRESS_Z_OFFSET, isChineseFortressWalkableZone(), ropeBridgePointInfoAt() (+16 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.06
Nodes (44): ref_three_addons_environments_roomenvironment_js, _camTargetLook, _euler, _sunVec, _tourLook, _tourPos, VirtualMoveState, WorldCanvasProps (+36 more)

### Community 8 - "AppException.ts"
Cohesion: 0.35
Nodes (3): AppException, InfrastructureCorruptedException, InvalidResultAccessException

### Community 9 - "package.json"
Cohesion: 0.05
Nodes (39): dependencies, react, react-dom, three, devDependencies, tailwindcss, @tailwindcss/vite, tsx (+31 more)

### Community 10 - "Deer_Complete.ts"
Cohesion: 0.05
Nodes (40): BoneDef, BoneGroup, BoneName, Chain, CHAINS, computeDeerSkinWeights(), createReadyDeer(), Deer (+32 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 13 - "playerAndCombatBuilder.ts"
Cohesion: 0.11
Nodes (16): SAVED_LAB_OVERRIDES, IPlayerAndCombatBuilderContext, PlayerAndCombatBuilderContext, PlayerAndCombatHandle, ArrowElementKind, ARROW_TRAIL_MAX_AGE, src_world_terrainmath_arrow_trail_max_age, src_world_terrainmath_arrowelementkind (+8 more)

### Community 14 - "IRideableHorseState"
Cohesion: 0.40
Nodes (6): IPlayerAndCombatHandle, IWindowDebugBridgeDeps, IArrowProjectile, IDynamicAtmosphereState, IRideableHorseState, IAnimatedWorldHandles

### Community 15 - "react"
Cohesion: 0.29
Nodes (6): react, ExplorerMinimap, ExplorerMinimapProps, GRID_SIZE, IExplorerMinimapProps, src_world_terrainmath_sampleminimapcolorat

### Community 16 - "proceduralModels.ts"
Cohesion: 0.05
Nodes (103): three, buildColliderDebugWireframes(), IColliderDebugHandles, buildPlayerAndCombatSystems(), attachFlagHorizontalWaveShader(), attachWindSwayShader(), createBirchBarkTexture(), perturbGeometryVertices() (+95 more)

### Community 17 - "atmosphereRenderController.ts"
Cohesion: 0.17
Nodes (11): ref_three_addons_objects_sky_js, applyDynamicAtmosphereToScene(), AtmosphereRenderContext, _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor (+3 more)

### Community 18 - "wildlifeAndFootprintsBuilder.ts"
Cohesion: 0.06
Nodes (28): CLIP_ORDER, createReadyWolf(), unpackWolfBundle(), Wolf, WOLF_EMBEDDED_PACK_B64, WOLF_EMBEDDED_TEXTURE_URI, WOLF_GAITS, WOLF_STATES (+20 more)

### Community 19 - "terrainAndBiomeSystem.ts"
Cohesion: 0.18
Nodes (25): CLEAR_ZONES, FLAT_BUILDING_TERRACES, SOLID_BUILDING_BOXES, BEAR_MOUNTAIN_CAVES, BIRCH_GROVE_CENTER, CROCODILE_RIVER_BEND_POS, MAGIC_STONE_CIRCLE_POS, PLAYABLE_RADIUS (+17 more)

### Community 20 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.10
Nodes (28): buildDwarvenKingdomAndMiners(), DwarvenKingdomBuilderContext, DwarvenKingdomHandle, DwarvenMinerRig, IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig, VIEW_DISTANCE (+20 more)

### Community 21 - "GameShellOverlay.tsx"
Cohesion: 0.11
Nodes (30): GameShellOverlayProps, SEASON_OPTIONS, SkyrimModalMode, WEATHER_OPTIONS, renderArtifactArtwork(), formatMarketError(), InventoryCategoryTab, ISkyrimInventoryModalProps (+22 more)

### Community 22 - "TheMan — 3D Living Nature & RPG World Simulator"
Cohesion: 0.29
Nodes (6): Engineering standards, Getting Started, Installation & Run, Overview & Architecture, Prerequisites, TheMan — 3D Living Nature & RPG World Simulator

### Community 26 - "t"
Cohesion: 0.19
Nodes (11): en, LocaleSchema, getLocaleDictionary(), NestedKeyOf, setLocaleDictionary(), t(), TranslationDictionary, TranslationKey (+3 more)

### Community 27 - "WorldCanvas"
Cohesion: 0.17
Nodes (22): WorldCanvas, registerWindowDebugBridge(), findNearestFortressDoor(), findNearestMarketStall(), findNearestDeadLootableAnimal(), getAnimalLootDrops(), getAnimalSpeciesName(), lootDeadAnimal() (+14 more)

### Community 28 - "telemetryStore.ts"
Cohesion: 0.33
Nodes (5): TelemetrySnapshot, INITIAL_TELEMETRY_SNAPSHOT, ITelemetryStore, telemetryStore, src_world_terrainmath_world_spawn

### Community 30 - "Deer_Complete_3ce1524f.ts"
Cohesion: 0.06
Nodes (33): BoneDef, BoneGroup, BoneName, Chain, CHAINS, computeDeerSkinWeights(), createReadyDeer(), Deer (+25 more)

### Community 34 - "Deer_36e45a72.ts"
Cohesion: 0.06
Nodes (30): BoneDef, BoneGroup, BoneName, Chain, CHAINS, computeDeerSkinWeights(), Deer, DEER_BONES (+22 more)

### Community 36 - "itemArtworkRegistry.tsx"
Cohesion: 0.14
Nodes (4): ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy

### Community 38 - "worldTypes.ts"
Cohesion: 0.05
Nodes (36): ArcheryTargetDef, ArrowTrailPoint, CharacterSkillsState, ClimbableLadderInfo, CornerWatchtowerDef, createCatalogItem(), DEFAULT_STARTER_OWNED_ITEM_IDS, DwarvenGuardianStatueDef (+28 more)

### Community 47 - "labCatalog.ts"
Cohesion: 0.08
Nodes (54): ref_three_examples_jsm_environments_roomenvironment_js, CharacterLabCanvas(), afterDraw(), tick(), ICharacterLabCanvasProps, CAMERA_PRESETS, CharacterLabView(), ENVIRONMENT_PRESETS (+46 more)

### Community 48 - "ITelemetrySnapshot"
Cohesion: 0.29
Nodes (8): ITelemetrySnapshot, IValidatedUrlOverrides, CameraPerspectiveMode, ICharacterSkillsState, SeasonType, WalkPaceMode, WeatherKind, ISkillAccessor

### Community 49 - "IPlayerState"
Cohesion: 0.13
Nodes (9): EquippedToolSlot, IPlayerState, ArrowEquipmentStrategy, BowEquipmentStrategy, IEquipmentSlotStrategy, isInventoryItemEquipped(), SwordEquipmentStrategy, ToolEquipmentStrategy (+1 more)

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

### Community 60 - "Crocodile.ts"
Cohesion: 0.10
Nodes (12): createReadyCrocodile(), CROC_EMBEDDED_PACK_B64, CROC_EMBEDDED_TEXTURE_URI, Crocodile, CROCODILE_GAITS, CROCODILE_STATES, CrocodileAnimator, CrocodileOptions (+4 more)

### Community 62 - "ref_node_assert_strict"
Cohesion: 0.21
Nodes (6): ref_node_assert_strict, ref_node_test, ILogger, NullLogger, IPlayerInput, src_world_terrainmath_biometype

### Community 63 - "collisionAndTerraces.ts"
Cohesion: 0.20
Nodes (11): HILL_BRIDGE_YAW, HILL_WATCHTOWERS, ROPE_BRIDGE_DEF, MARKET_STALL_LOCATIONS, SOUTHEAST_HARBOR_POS, SOUTHWEST_OASIS_POS, HUNTER_LODGE_POS, RIVERSIDE_WINDMILLS (+3 more)

### Community 64 - "ErrorBoundary.tsx"
Cohesion: 0.17
Nodes (6): ref_react_dom_client, ErrorBoundary, IErrorBoundaryProps, IErrorBoundaryState, src_index, rootElement

### Community 65 - "App.tsx"
Cohesion: 0.22
Nodes (12): App(), WEATHER_CYCLE_ORDER, IGameShellOverlayProps, IWeatherOptionDef, GameStateMode, IVirtualMoveState, IWorldCanvasProps, loadActiveGameSettings() (+4 more)

### Community 66 - "Result"
Cohesion: 0.20
Nodes (4): GameShellOverlay, renderItemSvgIcon(), Result, useTelemetry()

### Community 74 - "תיקיית מודלים תלת-ממדיים (`public/models`)"
Cohesion: 0.50
Nodes (3): מבנה תיקיות מומלץ (אופציונלי, או ישירות בתיקייה זו):, פורמטים מומלצים:, תיקיית מודלים תלת-ממדיים (`public/models`)

## Knowledge Gaps
- **318 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+313 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 560 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `proceduralModels.ts` to `terrainMath.test.ts`, `WorldCanvas.tsx`, `package.json`, `Deer_Complete.ts`, `playerAndCombatBuilder.ts`, `atmosphereRenderController.ts`, `wildlifeAndFootprintsBuilder.ts`, `dwarvenMineAndCaravanSystem.ts`, `Deer_Complete_3ce1524f.ts`, `Deer_36e45a72.ts`, `labCatalog.ts`, `JaguarAnimator`, `Rhino.ts`, `DemonDragon_Complete.ts`, `ForestDragon_Complete.ts`, `Bear_Complete_c2863232.ts`, `Crocodile_Complete_9a40f875.ts`, `Bear_447e38ff.ts`, `BearAnimator`, `Crocodile.ts`?**
  _High betweenness centrality (0.474) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `ErrorBoundary.tsx`, `GameSettingsModal.tsx`, `Result`, `boidsAndWildlifeSystem.ts`, `combatAndInventorySystem.ts`, `playerPhysicsSystem.ts`, `WorldCanvas.tsx`, `worldTypes.ts`, `react`, `labCatalog.ts`, `proceduralModels.ts`, `terrainAndBiomeSystem.ts`, `dwarvenMineAndCaravanSystem.ts`, `GameShellOverlay.tsx`, `WorldCanvas`, `telemetryStore.ts`, `collisionAndTerraces.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _318 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `boidsAndWildlifeSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10795454545454546 - nodes in this community are weakly interconnected._
- **Should `terrainMath.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.045068027210884355 - nodes in this community are weakly interconnected._
- **Should `swordAttackAnimationSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07200929152148665 - nodes in this community are weakly interconnected._
- **Should `combatAndInventorySystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0846774193548387 - nodes in this community are weakly interconnected._