# Graph Report - TheMan  (2026-11-01)

## Corpus Check
- 142 files · ~279,326 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1340 nodes · 3707 edges · 79 communities (53 shown, 26 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `098809ec`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- boidsAndWildlifeSystem.ts
- App.tsx
- terrainMath.test.ts
- swordAttackAnimationSystem.ts
- MockErrorLogger
- WorldCanvas
- locales/index.ts
- WorldCanvas.tsx
- Result
- package.json
- Deer_Complete.ts
- compilerOptions
- GameLoop
- labCatalog.ts
- registerWindowDebugBridge
- worldTypes.ts
- proceduralModels.ts
- devDependencies
- atmosphereRenderController.ts
- terrainAndBiomeSystem.ts
- src_world_terrainmath_cameraperspectivemode
- GameShellOverlay.tsx
- TheMan — 3D Living Nature & RPG World Simulator
- rules/graphify.md
- workflows/graphify.md
- CLAUDE.md
- NatureSoundEngine
- buyMarketItem
- telemetryStore.ts
- src_world_terrainmath_computedwarvenminercaravanstate
- persistedSettingsValidation.ts
- src_world_terrainmath_dwarven_guardian_statues
- src_world_terrainmath_dwarven_miners_count
- src_world_terrainmath_dwarven_stone_houses
- playerPhysicsSystem.ts
- src_world_terrainmath_arrowprojectile
- itemArtworkRegistry.tsx
- src_world_terrainmath_characterskillsstate
- IPlayerState
- src_world_terrainmath_inventoryitemdef
- src_world_terrainmath_obstaclecylinder
- ref_domain_worldtypes
- src_world_domain_landmarksregistry_chinesefortressstairheightat
- src_world_terrainmath_solaratmosphere
- src_world_terrainmath_playerstate
- src_world_terrainmath_rideablehorsestate
- src_world_terrainmath_weatherstatesnapshot
- keyBindingMatch.ts
- JaguarAnimator
- combatAndInventorySystem.ts
- src_world_terrainmath_walkpacemode
- Rhino.ts
- playerAndCombatBuilder.ts
- DemonDragon_Complete.ts
- src_world_terrainmath_dynamicatmospherestate
- ForestDragon_Complete.ts
- scripts
- index.spec.ts
- dependencies
- BearAnimator
- Crocodile.ts
- src_world_terrainmath_getanimalspeciesnamehe
- ILogger
- dwarvenMineAndCaravanSystem.ts
- ref_node_test
- horsePhysicsSystem.ts
- t
- settlementModels.ts
- MockLogger
- WolfAnimator
- labModelFactory.ts
- wildlifeAndFootprintsBuilder.ts
- vite.config.ts
- windowDebugController.spec.ts
- תיקיית מודלים תלת-ממדיים (`public/models`)
- src_world_terrainmath_archery_targets
- getEffectiveLabAnimationSpeed
- src_locales_index_he
- labOverridesStorage.ts

## God Nodes (most connected - your core abstractions)
1. `WorldCanvas` - 51 edges
2. `t()` - 49 edges
3. `groundHeightAt()` - 43 edges
4. `walkableHeightAt()` - 42 edges
5. `three` - 34 edges
6. `DeerAnimator` - 33 edges
7. `IPlayerState` - 29 edges
8. `NatureSoundEngine` - 27 edges
9. `registerWindowDebugBridge()` - 24 edges
10. `ILogger` - 19 edges

## Surprising Connections (you probably didn't know these)
- `saveGameSettings()` --calls--> `validateGameSettings()`  [EXTRACTED]
  vite.config.ts → src/config/persistedSettingsValidation.ts
- `saveLabOverrides()` --calls--> `validateLabOverrides()`  [EXTRACTED]
  vite.config.ts → src/config/persistedSettingsValidation.ts
- `IWeatherOptionDef` --references--> `WeatherToggleOption`  [EXTRACTED]
  src/components/GameShellOverlay.tsx → src/world/domain/worldTypes.ts
- `horseSkinsFromWorld` --calls--> `t()`  [EXTRACTED]
  src/lab/labCatalog.ts → src/locales/index.ts
- `IFootprintDecalState` --references--> `BiomeType`  [EXTRACTED]
  src/world/systems/footprintTrailSystem.ts → src/world/domain/worldTypes.ts

## Import Cycles
- None detected.

## Communities (79 total, 26 thin omitted)

### Community 0 - "boidsAndWildlifeSystem.ts"
Cohesion: 0.12
Nodes (38): activeWorldAnimalsRegistry, advanceAnimalWithWaterShoreRecovery(), AnimalAiBehavior, BIRD_FLOCK_CONFIGS, caveLocalToWorld(), computePlayerNoiseRateAtDistance(), createInitialBoidBirds(), createInitialSmallAnimals() (+30 more)

### Community 1 - "App.tsx"
Cohesion: 0.14
Nodes (23): App(), WEATHER_CYCLE_ORDER, GameSettingsModal(), IGameSettingsModalProps, IKeybindRowMeta, KEYBIND_CATEGORIES, KEYBIND_ROWS, KeybindCategory (+15 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.06
Nodes (32): DEFAULT_WEATHER_CYCLE_MODE, src_world_terrainmath_birch_grove_center, src_world_terrainmath_birchgrovefactorat, src_world_terrainmath_chinese_fortress_pos, src_world_terrainmath_chinesefortressstairheightat, src_world_terrainmath_computeweatherstate, src_world_terrainmath_corner_watchtowers, src_world_terrainmath_createinitialplayerstate (+24 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.09
Nodes (33): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+25 more)

### Community 5 - "WorldCanvas"
Cohesion: 0.20
Nodes (19): WorldCanvas, buildTelemetrySnapshot(), findLookedAtWatchtowerLadder(), findNearestBed(), findNearestFortressDoor(), findNearestDeadLootableAnimal(), getActiveWorldAnimals(), getAnimalSpeciesName() (+11 more)

### Community 6 - "locales/index.ts"
Cohesion: 0.13
Nodes (22): en, LocaleSchema, TranslationDictionary, CLEAR_ZONES, FLAT_BUILDING_TERRACES, DWARVEN_GUARDIAN_STATUES, DWARVEN_STONE_HOUSES, ARCHERY_TARGETS (+14 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.07
Nodes (41): ref_three_addons_environments_roomenvironment_js, _camTargetLook, _euler, _sunVec, createAnimationFrameScheduler(), createGpuFencePacedScheduler(), src_world_terrainmath_arrowelementkind, src_world_terrainmath_assignhotbarslot (+33 more)

### Community 8 - "Result"
Cohesion: 0.19
Nodes (6): AppException, InfrastructureCorruptedException, InvalidResultAccessException, Result, createTickErrorGuard(), TickErrorDecision

### Community 9 - "package.json"
Cohesion: 0.15
Nodes (12): name, private, type, version, react-dom, tailwindcss, tsx, @types/node (+4 more)

### Community 10 - "Deer_Complete.ts"
Cohesion: 0.05
Nodes (40): BoneDef, BoneGroup, BoneName, Chain, CHAINS, computeDeerSkinWeights(), createReadyDeer(), Deer (+32 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "GameLoop"
Cohesion: 0.12
Nodes (6): GameLoop, IFrameScheduler, createHarness(), FakeScheduler, RecordingLogger, ITickErrorGuard

### Community 13 - "labCatalog.ts"
Cohesion: 0.20
Nodes (22): CAMERA_PRESETS, CharacterLabView(), ENVIRONMENT_PRESETS, ICharacterLabViewProps, SPEED_OPTIONS, countActivePoseOverrides(), createInitialLabSessionState(), filterLabEntities() (+14 more)

### Community 14 - "registerWindowDebugBridge"
Cohesion: 0.27
Nodes (13): clamp(), IValidatedPositionOverride, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS, URL_SEASON_OFFSETS, URL_WEATHER_MAP (+5 more)

### Community 15 - "worldTypes.ts"
Cohesion: 0.13
Nodes (24): IValidatedUrlOverrides, ITelemetrySnapshot, ArrowElementKind, BiomeType, CameraPerspectiveMode, DEFAULT_STARTER_OWNED_ITEM_IDS, EquippedToolSlot, FIRST_MARKET_CATALOG_ITEM (+16 more)

### Community 16 - "proceduralModels.ts"
Cohesion: 0.06
Nodes (93): three, buildColliderDebugWireframes(), IColliderDebugHandles, buildDwarvenKingdomAndMiners(), IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig, buildPlayerAndCombatSystems() (+85 more)

### Community 17 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, tailwindcss, @tailwindcss/vite, tsx, @types/node, @types/react, @types/react-dom, @types/three (+3 more)

### Community 18 - "atmosphereRenderController.ts"
Cohesion: 0.18
Nodes (10): ref_three_addons_objects_sky_js, applyDynamicAtmosphereToScene(), _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor, src_world_terrainmath_computedynamicsolarcycle (+2 more)

### Community 19 - "terrainAndBiomeSystem.ts"
Cohesion: 0.17
Nodes (24): BEAR_MOUNTAIN_CAVES, BIRCH_GROVE_CENTER, CROCODILE_RIVER_BEND_POS, MAGIC_STONE_CIRCLE_POS, PLAYER_EYE_HEIGHT, SMALL_MEADOW_HILLS, SNOW_LINE_ALTITUDE, SOUTHERN_DRAGON_RUINS_POS (+16 more)

### Community 21 - "GameShellOverlay.tsx"
Cohesion: 0.09
Nodes (32): IWeatherOptionDef, SEASON_OPTIONS, SkyrimModalMode, WEATHER_OPTIONS, renderArtifactArtwork(), formatMarketError(), InventoryCategoryTab, ISkyrimInventoryModalProps (+24 more)

### Community 22 - "TheMan — 3D Living Nature & RPG World Simulator"
Cohesion: 0.29
Nodes (6): Engineering standards, Getting Started, Installation & Run, Overview & Architecture, Prerequisites, TheMan — 3D Living Nature & RPG World Simulator

### Community 27 - "buyMarketItem"
Cohesion: 0.33
Nodes (6): findNearestMarketStall(), buyMarketItem(), equipInventoryItem(), MarketTransactionResult, sellMarketItem(), getPlayerHeroLevel()

### Community 28 - "telemetryStore.ts"
Cohesion: 0.27
Nodes (6): GameShellOverlay, renderItemSvgIcon(), ITelemetryStore, telemetryStore, useTelemetry(), TelemetrySnapshot

### Community 30 - "persistedSettingsValidation.ts"
Cohesion: 0.14
Nodes (21): ANIMATION_SPEED_RANGE, CAMERA_PERSPECTIVES, FIREFLIES_MODES, GameSettingsValidationError, isNumberInRange(), isOneOf(), isPlainObject(), JUMP_FORCE_RANGE (+13 more)

### Community 34 - "playerPhysicsSystem.ts"
Cohesion: 0.14
Nodes (14): SOLID_BUILDING_BOXES, PLAYABLE_RADIUS, chineseFortressStairHeightAt(), isChineseFortressWalkableZone(), findWatchtowerLadderAt(), FORTRESS_DOORS, getLadderById(), isOnWatchtowerLadder() (+6 more)

### Community 36 - "itemArtworkRegistry.tsx"
Cohesion: 0.14
Nodes (4): ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy

### Community 38 - "IPlayerState"
Cohesion: 0.15
Nodes (19): IPlayerAndCombatHandle, IHudTelemetryInput, IArrowProjectile, IPlayerState, IRideableHorseState, IWeatherStateSnapshot, IEnvironmentAtmosphereHandle, IAnimatedWorldHandles (+11 more)

### Community 47 - "keyBindingMatch.ts"
Cohesion: 0.70
Nodes (3): isBindingHeld(), matchesKeyBinding(), MODIFIER_FAMILIES

### Community 48 - "JaguarAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyJaguar(), Jaguar, JAGUAR_EMBEDDED_PACK_B64, JAGUAR_EMBEDDED_TEXTURE_URI, JAGUAR_GAITS, JAGUAR_STATES, JaguarAnimator (+5 more)

### Community 49 - "combatAndInventorySystem.ts"
Cohesion: 0.07
Nodes (25): IArcheryTargetDef, InventoryItemId, ARCHERY_TARGETS_SPATIAL_GRID, ArrowEquipmentStrategy, arrowFireStrategy, arrowNormalStrategy, arrowWindStrategy, BowEquipmentStrategy (+17 more)

### Community 51 - "Rhino.ts"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyRhino(), Rhino, RHINO_EMBEDDED_PACK_B64, RHINO_EMBEDDED_TEXTURE_URI, RHINO_GAITS, RHINO_STATES, RhinoAnimator (+5 more)

### Community 52 - "playerAndCombatBuilder.ts"
Cohesion: 0.18
Nodes (10): SAVED_LAB_OVERRIDES, IPlayerAndCombatBuilderContext, ARROW_TRAIL_MAX_AGE, src_world_terrainmath_arrow_trail_max_age, src_world_terrainmath_computefirstpersonswordattackpose, src_world_terrainmath_computeslopepitchandroll, src_world_terrainmath_getsurfacenormalat, src_world_terrainmath_iplayerstate (+2 more)

### Community 53 - "DemonDragon_Complete.ts"
Cohesion: 0.10
Nodes (13): CLIP_ORDER, createReadyDemonDragon(), DEMON_DRAGON_EMBEDDED_PACK_B64, DEMON_DRAGON_EMBEDDED_TEXTURE_URI, DEMON_DRAGON_GAITS, DemonDragon, DemonDragonAnimator, DemonDragonOptions (+5 more)

### Community 55 - "ForestDragon_Complete.ts"
Cohesion: 0.09
Nodes (14): CLIP_ORDER, createReadyForestDragon(), FOREST_DRAGON_EMBEDDED_PACK_B64, FOREST_DRAGON_EMBEDDED_TEXTURE_URI, FOREST_DRAGON_GAITS, ForestDragon, ForestDragonAnimator, ForestDragonOptions (+6 more)

### Community 56 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, preview, test

### Community 57 - "index.spec.ts"
Cohesion: 0.32
Nodes (3): getLocaleDictionary(), setLocaleDictionary(), SpatialHashGrid2D

### Community 58 - "dependencies"
Cohesion: 0.50
Nodes (4): dependencies, react, react-dom, three

### Community 59 - "BearAnimator"
Cohesion: 0.10
Nodes (13): Bear, BEAR_EMBEDDED_PACK_B64, BEAR_EMBEDDED_TEXTURE_URI, BEAR_GAITS, BEAR_STATES, BearAnimator, BearOptions, BearRig (+5 more)

### Community 60 - "Crocodile.ts"
Cohesion: 0.10
Nodes (12): createReadyCrocodile(), CROC_EMBEDDED_PACK_B64, CROC_EMBEDDED_TEXTURE_URI, Crocodile, CROCODILE_GAITS, CROCODILE_STATES, CrocodileAnimator, CrocodileOptions (+4 more)

### Community 62 - "ILogger"
Cohesion: 0.14
Nodes (6): IErrorBoundaryProps, IGameLoopOptions, ConsoleLogger, ILogger, NullLogger, src_world_terrainmath_biometype

### Community 63 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.18
Nodes (16): SOUTHERN_MINE_POS, IDwarvenMinerCaravanState, buildMinerWaypoints(), CaravanPath, computeDwarvenMinerCaravanState(), DWARVEN_MINER_STATIONS, DWARVEN_MINERS_COUNT, IMinerStationConfig (+8 more)

### Community 64 - "ref_node_test"
Cohesion: 0.20
Nodes (10): ref_node_assert_strict, ref_node_fs, ref_node_os, ref_node_path, ref_node_test, ref_node_url, INITIAL_TELEMETRY_SNAPSHOT, assertMatchesGolden() (+2 more)

### Community 65 - "horsePhysicsSystem.ts"
Cohesion: 0.29
Nodes (8): computeHorseBiomechanicalPose(), computeHorseTurnResistance(), IHorseBiomechanicalPose, IHorseLimbAngles, IHorseSteeringStepResult, solveForelimb(), solveHindlimb(), stepMountedHorseSteering()

### Community 66 - "t"
Cohesion: 0.12
Nodes (14): react, ref_react_dom_client, ErrorBoundary, IErrorBoundaryState, ExplorerMinimap, GRID_SIZE, IExplorerMinimapProps, src_index (+6 more)

### Community 67 - "settlementModels.ts"
Cohesion: 0.12
Nodes (16): SOUTHERN_PASS_VALLEY_POS, LAKESIDE_TEA_PAVILION_POS, ISettlementModelHandles, src_world_terrainmath_bear_mountain_caves, src_world_terrainmath_computehorsebiomechanicalpose, src_world_terrainmath_crocodile_river_bend_pos, src_world_terrainmath_hunter_lodge_pos, src_world_terrainmath_irideablehorsestate (+8 more)

### Community 69 - "WolfAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyWolf(), unpackWolfBundle(), Wolf, WOLF_EMBEDDED_PACK_B64, WOLF_EMBEDDED_TEXTURE_URI, WOLF_GAITS, WOLF_STATES (+5 more)

### Community 70 - "labModelFactory.ts"
Cohesion: 0.24
Nodes (14): ref_three_examples_jsm_environments_roomenvironment_js, ICharacterLabCanvasProps, ILabAnimationDef, ILabEntityDef, ILabPoseOverrides, ILabSkinDef, LabCameraPreset, LabStageEnvironment (+6 more)

### Community 71 - "wildlifeAndFootprintsBuilder.ts"
Cohesion: 0.25
Nodes (12): buildWildlifeAndFootprintsLayer(), IWildlifeAndFootprintsHandles, IWildlifeSoundCallbacks, IBoidBirdState, ISmallAnimalState, createFootprintTrailTracker(), FOOTPRINT_MAX_AGE_SECONDS, IFootprintDecalState (+4 more)

### Community 72 - "vite.config.ts"
Cohesion: 0.14
Nodes (14): ref_node_fs_promises, ref_node_http, ref_path, @tailwindcss/vite, vite, @vitejs/plugin-react, assertTrustedJsonRequest(), PERSISTENCE_ROUTES (+6 more)

### Community 73 - "windowDebugController.spec.ts"
Cohesion: 0.27
Nodes (8): IWindowDebugBridgeDeps, createTestBridgeDeps(), IDynamicAtmosphereState, WeatherCycleMode, assignHotbarSlot(), createMarketEligiblePlayer(), toggleFavoriteItem(), createInitialPlayerState()

### Community 74 - "תיקיית מודלים תלת-ממדיים (`public/models`)"
Cohesion: 0.50
Nodes (3): מבנה תיקיות מומלץ (אופציונלי, או ישירות בתיקייה זו):, פורמטים מומלצים:, תיקיית מודלים תלת-ממדיים (`public/models`)

### Community 76 - "getEffectiveLabAnimationSpeed"
Cohesion: 0.70
Nodes (5): CharacterLabCanvas(), afterDraw(), tick(), computeLabAnimationCycleProgress(), getEffectiveLabAnimationSpeed()

### Community 78 - "labOverridesStorage.ts"
Cohesion: 0.50
Nodes (3): DEFAULT_LAB_POSE_OVERRIDES, LAB_POSE_OVERRIDES_STORAGE_KEY, StoredLabOverridesError

## Knowledge Gaps
- **211 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+206 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 429 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `proceduralModels.ts` to `settlementModels.ts`, `WolfAnimator`, `labModelFactory.ts`, `wildlifeAndFootprintsBuilder.ts`, `WorldCanvas.tsx`, `package.json`, `windowDebugController.spec.ts`, `Deer_Complete.ts`, `JaguarAnimator`, `atmosphereRenderController.ts`, `Rhino.ts`, `playerAndCombatBuilder.ts`, `DemonDragon_Complete.ts`, `ForestDragon_Complete.ts`, `BearAnimator`, `Crocodile.ts`?**
  _High betweenness centrality (0.244) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `boidsAndWildlifeSystem.ts`, `App.tsx`, `playerPhysicsSystem.ts`, `WorldCanvas`, `locales/index.ts`, `WorldCanvas.tsx`, `labCatalog.ts`, `worldTypes.ts`, `proceduralModels.ts`, `combatAndInventorySystem.ts`, `terrainAndBiomeSystem.ts`, `GameShellOverlay.tsx`, `index.spec.ts`, `telemetryStore.ts`, `dwarvenMineAndCaravanSystem.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `WorldCanvas` (e.g. with `.runFrame()` and `.start()`) actually correct?**
  _`WorldCanvas` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _211 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `boidsAndWildlifeSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11960132890365449 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13756613756613756 - nodes in this community are weakly interconnected._
- **Should `terrainMath.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._