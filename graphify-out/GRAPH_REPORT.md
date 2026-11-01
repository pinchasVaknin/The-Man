# Graph Report - TheMan  (2026-11-01)

## Corpus Check
- 120 files · ~447,018 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1564 nodes · 3920 edges · 84 communities (59 shown, 25 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f1145769`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- boidsAndWildlifeSystem.ts
- GameSettingsModal.tsx
- terrainMath.test.ts
- swordAttackAnimationSystem.ts
- registerWindowDebugBridge
- combatAndInventorySystem.ts
- playerPhysicsSystem.ts
- WorldCanvas.tsx
- AppException.ts
- package.json
- Deer_Complete.ts
- compilerOptions
- NatureSoundEngine
- playerAndCombatBuilder.ts
- settlementModels.ts
- proceduralModels.ts
- terrainMath.ts
- atmosphereRenderController.ts
- WolfAnimator
- landmarksRegistry.ts
- dwarvenMineAndCaravanSystem.ts
- GameShellOverlay.tsx
- TheMan — 3D Living Nature & RPG World Simulator
- rules/graphify.md
- workflows/graphify.md
- CLAUDE.md
- locales/index.ts
- terrainAndBiomeSystem.ts
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
- groundHeightAt
- JaguarAnimator
- IPlayerState
- labCatalog.ts
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
- src_world_terrainmath_getanimalspeciesnamehe
- ILogger
- interactionLandmarks.ts
- main.tsx
- App.tsx
- validateGameSettings
- atmosphereAndWeatherSystem.ts
- ref_node_assert_strict
- MockLogger
- three
- highlandBridgeLandmarks.ts
- vite.config.ts
- ITickErrorGuard
- תיקיית מודלים תלת-ממדיים (`public/models`)
- persistedSettingsValidation.ts
- collisionAndTerraces.ts
- src_locales_index_he
- devDependencies
- createArchitecturalSharedAssets
- ITelemetrySnapshot
- scripts
- react
- dependencies

## God Nodes (most connected - your core abstractions)
1. `t()` - 49 edges
2. `groundHeightAt()` - 43 edges
3. `WorldCanvas` - 40 edges
4. `three` - 39 edges
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

## Communities (84 total, 25 thin omitted)

### Community 0 - "boidsAndWildlifeSystem.ts"
Cohesion: 0.11
Nodes (32): activeWorldAnimalsRegistry, advanceAnimalWithWaterShoreRecovery(), AnimalAiBehavior, BIRD_FLOCK_CONFIGS, BoidBirdState, caveLocalToWorld(), computePlayerNoiseRateAtDistance(), createInitialBoidBirds() (+24 more)

### Community 1 - "GameSettingsModal.tsx"
Cohesion: 0.25
Nodes (12): GameSettingsModal(), IGameSettingsModalProps, IKeybindRowMeta, KEYBIND_CATEGORIES, KEYBIND_ROWS, KeybindCategory, DEFAULT_GAME_KEYBINDINGS, FirefliesMode (+4 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.06
Nodes (32): DEFAULT_WEATHER_CYCLE_MODE, src_world_terrainmath_birch_grove_center, src_world_terrainmath_birchgrovefactorat, src_world_terrainmath_chinese_fortress_pos, src_world_terrainmath_chinesefortressstairheightat, src_world_terrainmath_computeweatherstate, src_world_terrainmath_corner_watchtowers, src_world_terrainmath_createinitialplayerstate (+24 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.07
Nodes (41): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+33 more)

### Community 4 - "registerWindowDebugBridge"
Cohesion: 0.27
Nodes (13): clamp(), IValidatedPositionOverride, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS, URL_SEASON_OFFSETS, URL_WEATHER_MAP (+5 more)

### Community 5 - "combatAndInventorySystem.ts"
Cohesion: 0.08
Nodes (40): WorldCanvas, findNearestFortressDoor(), findNearestMarketStall(), DEFAULT_STARTER_OWNED_ITEM_IDS, ISolidBuildingBox, getActiveWorldAnimals(), ARCHERY_TARGETS_SPATIAL_GRID, arrowFireStrategy (+32 more)

### Community 6 - "playerPhysicsSystem.ts"
Cohesion: 0.13
Nodes (26): chineseFortressStairHeightAt(), isChineseFortressWalkableZone(), findLookedAtWatchtowerLadder(), findWatchtowerLadderAt(), getLadderById(), distToSegment(), IPlayerInput, applySkillXpGain() (+18 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.06
Nodes (49): ref_three_addons_environments_roomenvironment_js, _camTargetLook, _euler, _sunVec, _tourLook, _tourPos, VirtualMoveState, WorldCanvasProps (+41 more)

### Community 8 - "AppException.ts"
Cohesion: 0.22
Nodes (5): AppException, InfrastructureCorruptedException, InvalidResultAccessException, createTickErrorGuard(), TickErrorDecision

### Community 9 - "package.json"
Cohesion: 0.14
Nodes (13): name, private, type, version, react-dom, tailwindcss, tsx, @types/node (+5 more)

### Community 10 - "Deer_Complete.ts"
Cohesion: 0.05
Nodes (40): BoneDef, BoneGroup, BoneName, Chain, CHAINS, computeDeerSkinWeights(), createReadyDeer(), Deer (+32 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 13 - "playerAndCombatBuilder.ts"
Cohesion: 0.11
Nodes (17): IPlayerAndCombatBuilderContext, IPlayerAndCombatHandle, PlayerAndCombatBuilderContext, PlayerAndCombatHandle, ArrowElementKind, IArrowProjectile, ARROW_TRAIL_MAX_AGE, src_world_terrainmath_arrow_trail_max_age (+9 more)

### Community 14 - "settlementModels.ts"
Cohesion: 0.10
Nodes (20): IColliderDebugHandles, IRideableHorseState, ISettlementModelHandles, SettlementModelHandles, IAnimatedWorldHandles, src_world_terrainmath_bear_mountain_caves, src_world_terrainmath_computehorsebiomechanicalpose, src_world_terrainmath_crocodile_river_bend_pos (+12 more)

### Community 15 - "proceduralModels.ts"
Cohesion: 0.15
Nodes (22): buildColliderDebugWireframes(), buildDwarvenKingdomAndMiners(), buildPlayerAndCombatSystems(), buildWildlifeAndFootprintsLayer(), isWithinViewDistance(), buildFortressModels(), FortressModelResult, IFortressModelResult (+14 more)

### Community 16 - "terrainMath.ts"
Cohesion: 0.12
Nodes (20): attachFlagHorizontalWaveShader(), valueNoise2D(), ArchitecturalSharedAssets, IArchitecturalSharedAssets, HarborModelHandles, IHarborModelHandles, IOasisModelHandles, OasisModelHandles (+12 more)

### Community 17 - "atmosphereRenderController.ts"
Cohesion: 0.17
Nodes (11): ref_three_addons_objects_sky_js, applyDynamicAtmosphereToScene(), AtmosphereRenderContext, _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor (+3 more)

### Community 18 - "WolfAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyWolf(), unpackWolfBundle(), Wolf, WOLF_EMBEDDED_PACK_B64, WOLF_EMBEDDED_TEXTURE_URI, WOLF_GAITS, WOLF_STATES (+5 more)

### Community 19 - "landmarksRegistry.ts"
Cohesion: 0.22
Nodes (16): BIRCH_GROVE_CENTER, MAGIC_STONE_CIRCLE_POS, PLAYABLE_RADIUS, PLAYER_EYE_HEIGHT, SMALL_MEADOW_HILLS, SNOW_LINE_ALTITUDE, SOUTHERN_DRAGON_RUINS_POS, SOUTHERN_PASS_VALLEY_POS (+8 more)

### Community 20 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.13
Nodes (19): DwarvenKingdomBuilderContext, DwarvenKingdomHandle, DwarvenMinerRig, IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig, DWARVEN_GUARDIAN_STATUES, DWARVEN_STONE_HOUSES (+11 more)

### Community 21 - "GameShellOverlay.tsx"
Cohesion: 0.10
Nodes (31): GameShellOverlayProps, SEASON_OPTIONS, SkyrimModalMode, WEATHER_OPTIONS, renderArtifactArtwork(), formatMarketError(), InventoryCategoryTab, ISkyrimInventoryModalProps (+23 more)

### Community 22 - "TheMan — 3D Living Nature & RPG World Simulator"
Cohesion: 0.29
Nodes (6): Engineering standards, Getting Started, Installation & Run, Overview & Architecture, Prerequisites, TheMan — 3D Living Nature & RPG World Simulator

### Community 26 - "locales/index.ts"
Cohesion: 0.29
Nodes (7): en, LocaleSchema, getLocaleDictionary(), NestedKeyOf, setLocaleDictionary(), TranslationDictionary, TranslationKey

### Community 27 - "terrainAndBiomeSystem.ts"
Cohesion: 0.27
Nodes (12): t(), BEAR_MOUNTAIN_CAVES, CROCODILE_RIVER_BEND_POS, WATER_LEVEL, isInsideSouthernMine(), southernMineFloorHeightAt(), southernMineWalkableHeightAt(), getBiomeLabel() (+4 more)

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
Cohesion: 0.12
Nodes (7): GameShellOverlay, ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy, renderItemSvgIcon(), useTelemetry()

### Community 38 - "worldTypes.ts"
Cohesion: 0.06
Nodes (33): ArcheryTargetDef, ArrowTrailPoint, CharacterSkillsState, ClimbableLadderInfo, CornerWatchtowerDef, createCatalogItem(), DwarvenGuardianStatueDef, DwarvenMinerCaravanState (+25 more)

### Community 47 - "groundHeightAt"
Cohesion: 0.15
Nodes (21): fbm2D(), IWeatherStateSnapshot, attachDeerGlbModel(), buildEnvironmentAtmosphereModels(), EnvironmentAtmosphereHandle, IAnimatedDeer, IEnvironmentAtmosphereHandle, IForestSquirrel (+13 more)

### Community 49 - "IPlayerState"
Cohesion: 0.16
Nodes (9): InventoryItemId, IPlayerState, ArrowEquipmentStrategy, BowEquipmentStrategy, IEquipmentSlotStrategy, isInventoryItemEquipped(), SwordEquipmentStrategy, ToolEquipmentStrategy (+1 more)

### Community 50 - "labCatalog.ts"
Cohesion: 0.05
Nodes (64): CLIP_ORDER, createReadyJaguar(), Jaguar, JAGUAR_EMBEDDED_PACK_B64, JAGUAR_EMBEDDED_TEXTURE_URI, JAGUAR_GAITS, JAGUAR_STATES, JaguarOptions (+56 more)

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
Cohesion: 0.06
Nodes (30): createReadyCrocodile(), CROC_EMBEDDED_PACK_B64, CROC_EMBEDDED_TEXTURE_URI, Crocodile, CROCODILE_GAITS, CROCODILE_STATES, CrocodileAnimator, CrocodileOptions (+22 more)

### Community 62 - "ILogger"
Cohesion: 0.15
Nodes (6): IErrorBoundaryProps, IErrorBoundaryState, ConsoleLogger, ILogger, NullLogger, src_world_terrainmath_biometype

### Community 63 - "interactionLandmarks.ts"
Cohesion: 0.17
Nodes (13): ARCHERY_TARGETS, CHINESE_FORTRESS_POS, CORNER_WATCHTOWERS, FORTRESS_Y_OFFSET, FORTRESS_Z_OFFSET, findNearestBed(), FORTRESS_DOORS, isOnWatchtowerLadder() (+5 more)

### Community 64 - "main.tsx"
Cohesion: 0.20
Nodes (4): ref_react_dom_client, ErrorBoundary, src_index, rootElement

### Community 65 - "App.tsx"
Cohesion: 0.24
Nodes (11): App(), WEATHER_CYCLE_ORDER, IGameShellOverlayProps, IWeatherOptionDef, GameStateMode, IVirtualMoveState, IWorldCanvasProps, loadActiveGameSettings() (+3 more)

### Community 66 - "validateGameSettings"
Cohesion: 0.31
Nodes (9): isNumberInRange(), isOneOf(), isPlainObject(), toAnimationSpeeds(), toLabPoseOverrides(), validateGameSettings(), validateLabOverrides(), saveGameSettings() (+1 more)

### Community 67 - "atmosphereAndWeatherSystem.ts"
Cohesion: 0.29
Nodes (16): IWindowDebugBridgeDeps, createTestBridgeDeps(), lerpColorHex(), lerpNum(), smoothstep(), IDynamicAtmosphereState, IObstacleCylinder, WeatherCycleMode (+8 more)

### Community 68 - "ref_node_assert_strict"
Cohesion: 0.22
Nodes (4): ref_node_assert_strict, ref_node_test, MockErrorLogger, SAVED_GAME_SETTINGS

### Community 70 - "three"
Cohesion: 0.24
Nodes (13): three, attachWindSwayShader(), createBirchBarkTexture(), perturbGeometryVertices(), hash2D(), buildFarmhouseModels(), FarmhouseModelHandles, IFarmhouseModelHandles (+5 more)

### Community 71 - "highlandBridgeLandmarks.ts"
Cohesion: 0.25
Nodes (6): HILL_BRIDGE_COS, HILL_BRIDGE_SIN, HILL_BRIDGE_YAW, HILL_WATCHTOWERS, ROPE_BRIDGE_DEF, ropeBridgePointInfoAt()

### Community 72 - "vite.config.ts"
Cohesion: 0.15
Nodes (11): ref_node_fs_promises, ref_node_http, ref_path, @tailwindcss/vite, @vitejs/plugin-react, assertTrustedJsonRequest(), PERSISTENCE_ROUTES, PersistenceErrorCode (+3 more)

### Community 74 - "תיקיית מודלים תלת-ממדיים (`public/models`)"
Cohesion: 0.50
Nodes (3): מבנה תיקיות מומלץ (אופציונלי, או ישירות בתיקייה זו):, פורמטים מומלצים:, תיקיית מודלים תלת-ממדיים (`public/models`)

### Community 75 - "persistedSettingsValidation.ts"
Cohesion: 0.15
Nodes (12): ANIMATION_SPEED_RANGE, CAMERA_PERSPECTIVES, FIREFLIES_MODES, GameSettingsValidationError, JUMP_FORCE_RANGE, KEYBINDING_NAMES, LAB_NUMBER_RANGES, LAB_ROTATION_FIELDS (+4 more)

### Community 76 - "collisionAndTerraces.ts"
Cohesion: 0.24
Nodes (10): CLEAR_ZONES, FLAT_BUILDING_TERRACES, SOLID_BUILDING_BOXES, HUNTER_LODGE_POS, LAKESIDE_TEA_PAVILION_POS, RIDEABLE_HORSES, RIVERSIDE_WINDMILLS, SAKURA_SANCTUARY_POS (+2 more)

### Community 78 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, tailwindcss, @tailwindcss/vite, tsx, @types/node, @types/react, @types/react-dom, @types/three (+3 more)

### Community 79 - "createArchitecturalSharedAssets"
Cohesion: 0.36
Nodes (8): createArchitecturalSharedAssets(), createChinesePagodaRoof(), createInteractiveDoubleDoor(), createOrnatePaifangGate(), createRedChineseLantern(), createRedImperialFlag(), buildHarborModels(), buildOasisModels()

### Community 80 - "ITelemetrySnapshot"
Cohesion: 0.29
Nodes (8): ITelemetrySnapshot, IValidatedUrlOverrides, CameraPerspectiveMode, ICharacterSkillsState, SeasonType, WalkPaceMode, WeatherKind, ISkillAccessor

### Community 81 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, preview, test

### Community 82 - "react"
Cohesion: 0.29
Nodes (6): react, ExplorerMinimap, ExplorerMinimapProps, GRID_SIZE, IExplorerMinimapProps, src_world_terrainmath_sampleminimapcolorat

### Community 83 - "dependencies"
Cohesion: 0.50
Nodes (4): dependencies, react, react-dom, three

## Knowledge Gaps
- **334 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+329 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 579 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `three` to `WorldCanvas.tsx`, `package.json`, `Deer_Complete.ts`, `playerAndCombatBuilder.ts`, `settlementModels.ts`, `proceduralModels.ts`, `terrainMath.ts`, `atmosphereRenderController.ts`, `WolfAnimator`, `dwarvenMineAndCaravanSystem.ts`, `Deer_Complete_3ce1524f.ts`, `Deer_36e45a72.ts`, `groundHeightAt`, `labCatalog.ts`, `Rhino.ts`, `DemonDragon_Complete.ts`, `ForestDragon_Complete.ts`, `Bear_Complete_c2863232.ts`, `Crocodile_Complete_9a40f875.ts`, `Bear_447e38ff.ts`, `BearAnimator`, `wildlifeAndFootprintsBuilder.ts`, `atmosphereAndWeatherSystem.ts`?**
  _High betweenness centrality (0.458) - this node is a cross-community bridge._
- **Why does `t()` connect `terrainAndBiomeSystem.ts` to `boidsAndWildlifeSystem.ts`, `GameSettingsModal.tsx`, `combatAndInventorySystem.ts`, `playerPhysicsSystem.ts`, `WorldCanvas.tsx`, `dwarvenMineAndCaravanSystem.ts`, `GameShellOverlay.tsx`, `locales/index.ts`, `telemetryStore.ts`, `itemArtworkRegistry.tsx`, `worldTypes.ts`, `labCatalog.ts`, `ILogger`, `interactionLandmarks.ts`, `main.tsx`, `atmosphereAndWeatherSystem.ts`, `highlandBridgeLandmarks.ts`, `collisionAndTerraces.ts`, `react`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _334 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `boidsAndWildlifeSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10873440285204991 - nodes in this community are weakly interconnected._
- **Should `terrainMath.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `swordAttackAnimationSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06976744186046512 - nodes in this community are weakly interconnected._
- **Should `combatAndInventorySystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08115942028985507 - nodes in this community are weakly interconnected._