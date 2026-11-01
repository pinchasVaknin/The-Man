# Graph Report - TheMan  (2026-11-01)

## Corpus Check
- 136 files · ~272,834 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1324 nodes · 3620 edges · 74 communities (50 shown, 24 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `59d055f4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- boidsAndWildlifeSystem.ts
- savedGameSettings.ts
- terrainMath.test.ts
- swordAttackAnimationSystem.ts
- wildlifeAndFootprintsBuilder.ts
- combatAndInventorySystem.ts
- collisionAndTerraces.ts
- WorldCanvas.tsx
- Result
- package.json
- Deer_Complete.ts
- compilerOptions
- GameLoop
- persistedSettingsValidation.ts
- config.ts
- worldTypes.ts
- proceduralModels.ts
- devDependencies
- atmosphereRenderController.ts
- terrainAndBiomeSystem.ts
- labModelFactory.ts
- GameShellOverlay.tsx
- TheMan — 3D Living Nature & RPG World Simulator
- rules/graphify.md
- workflows/graphify.md
- CLAUDE.md
- NatureSoundEngine
- WorldCanvas
- telemetryStore.ts
- src_world_terrainmath_computedwarvenminercaravanstate
- t
- src_world_terrainmath_dwarven_guardian_statues
- src_world_terrainmath_dwarven_miners_count
- src_world_terrainmath_dwarven_stone_houses
- playerPhysicsSystem.ts
- src_world_terrainmath_arrowprojectile
- itemArtworkRegistry.tsx
- src_world_terrainmath_characterskillsstate
- App.tsx
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
- IPlayerState
- labCatalog.ts
- Rhino.ts
- playerAndCombatBuilder.ts
- DemonDragon_Complete.ts
- src_world_terrainmath_dynamicatmospherestate
- ForestDragon_Complete.ts
- scripts
- SpatialHashGrid2D
- dependencies
- BearAnimator
- Crocodile.ts
- src_world_terrainmath_getanimalspeciesnamehe
- ILogger
- dwarvenMineAndCaravanSystem.ts
- ref_node_test
- horsePhysicsSystem.ts
- main.tsx
- gameLoop.ts
- MockLogger
- WolfAnimator
- vite.config.ts
- תיקיית מודלים תלת-ממדיים (`public/models`)
- src_world_terrainmath_archery_targets
- src_locales_index_he

## God Nodes (most connected - your core abstractions)
1. `t()` - 49 edges
2. `WorldCanvas` - 47 edges
3. `groundHeightAt()` - 43 edges
4. `walkableHeightAt()` - 39 edges
5. `three` - 34 edges
6. `DeerAnimator` - 33 edges
7. `NatureSoundEngine` - 27 edges
8. `registerWindowDebugBridge()` - 24 edges
9. `IPlayerState` - 24 edges
10. `ILogger` - 19 edges

## Surprising Connections (you probably didn't know these)
- `saveGameSettings()` --calls--> `validateGameSettings()`  [EXTRACTED]
  vite.config.ts → src/config/persistedSettingsValidation.ts
- `saveLabOverrides()` --calls--> `validateLabOverrides()`  [EXTRACTED]
  vite.config.ts → src/config/persistedSettingsValidation.ts
- `IWeatherOptionDef` --references--> `WeatherToggleOption`  [EXTRACTED]
  src/components/GameShellOverlay.tsx → src/world/domain/worldTypes.ts
- `IGameLoopOptions` --references--> `ILogger`  [EXTRACTED]
  src/core/gameLoop.ts → src/core/ILogger.ts
- `ISettlementModelHandles` --references--> `IRideableHorseState`  [EXTRACTED]
  src/world/models/settlementModels.ts → src/world/domain/worldTypes.ts

## Import Cycles
- None detected.

## Communities (74 total, 24 thin omitted)

### Community 0 - "boidsAndWildlifeSystem.ts"
Cohesion: 0.11
Nodes (40): activeWorldAnimalsRegistry, advanceAnimalWithWaterShoreRecovery(), AnimalAiBehavior, BIRD_FLOCK_CONFIGS, caveLocalToWorld(), computePlayerNoiseRateAtDistance(), createInitialBoidBirds(), createInitialSmallAnimals() (+32 more)

### Community 1 - "savedGameSettings.ts"
Cohesion: 0.19
Nodes (13): GameSettingsModal(), IKeybindRowMeta, KEYBIND_CATEGORIES, KEYBIND_ROWS, KeybindCategory, DEFAULT_GAME_KEYBINDINGS, FirefliesMode, formatKeyCodeLabel() (+5 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.05
Nodes (44): LAKESIDE_TEA_PAVILION_POS, ISettlementModelHandles, src_world_terrainmath_bear_mountain_caves, src_world_terrainmath_birch_grove_center, src_world_terrainmath_birchgrovefactorat, src_world_terrainmath_chinese_fortress_pos, src_world_terrainmath_chinesefortressstairheightat, src_world_terrainmath_computehorsebiomechanicalpose (+36 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.09
Nodes (33): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+25 more)

### Community 4 - "wildlifeAndFootprintsBuilder.ts"
Cohesion: 0.21
Nodes (13): SAVED_LAB_OVERRIDES, buildWildlifeAndFootprintsLayer(), IWildlifeAndFootprintsHandles, IWildlifeSoundCallbacks, attachDeerGlbModel(), IAnimatedDeer, IBoidBirdState, createFootprintTrailTracker() (+5 more)

### Community 5 - "combatAndInventorySystem.ts"
Cohesion: 0.09
Nodes (28): IArcheryTargetDef, ISolidBuildingBox, ISmallAnimalState, ARCHERY_TARGETS_SPATIAL_GRID, arrowFireStrategy, arrowNormalStrategy, arrowWindStrategy, bowStrategy (+20 more)

### Community 6 - "collisionAndTerraces.ts"
Cohesion: 0.16
Nodes (19): DWARVEN_GUARDIAN_STATUES, DWARVEN_STONE_HOUSES, ARCHERY_TARGETS, CHINESE_FORTRESS_POS, CORNER_WATCHTOWERS, FORTRESS_Y_OFFSET, FORTRESS_Z_OFFSET, findNearestBed() (+11 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.06
Nodes (43): ref_three_addons_environments_roomenvironment_js, _camTargetLook, _euler, _sunVec, _tourLook, _tourPos, createAnimationFrameScheduler(), createGpuFencePacedScheduler() (+35 more)

### Community 8 - "Result"
Cohesion: 0.23
Nodes (4): AppException, InfrastructureCorruptedException, InvalidResultAccessException, Result

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
Cohesion: 0.15
Nodes (5): GameLoop, IFrameScheduler, createHarness(), FakeScheduler, RecordingLogger

### Community 13 - "persistedSettingsValidation.ts"
Cohesion: 0.13
Nodes (22): ANIMATION_SPEED_RANGE, CAMERA_PERSPECTIVES, FIREFLIES_MODES, GameSettingsValidationError, isNumberInRange(), isOneOf(), isPlainObject(), JUMP_FORCE_RANGE (+14 more)

### Community 14 - "config.ts"
Cohesion: 0.21
Nodes (16): clamp(), IValidatedPositionOverride, IValidatedUrlOverrides, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS, URL_SEASON_OFFSETS (+8 more)

### Community 15 - "worldTypes.ts"
Cohesion: 0.12
Nodes (23): ITelemetrySnapshot, ArrowElementKind, BiomeType, DEFAULT_STARTER_OWNED_ITEM_IDS, EquippedToolSlot, FIRST_MARKET_CATALOG_ITEM, IArrowTrailPoint, ICharacterSkillsState (+15 more)

### Community 16 - "proceduralModels.ts"
Cohesion: 0.06
Nodes (93): three, buildColliderDebugWireframes(), IColliderDebugHandles, buildDwarvenKingdomAndMiners(), IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig, buildPlayerAndCombatSystems() (+85 more)

### Community 17 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, tailwindcss, @tailwindcss/vite, tsx, @types/node, @types/react, @types/react-dom, @types/three (+3 more)

### Community 18 - "atmosphereRenderController.ts"
Cohesion: 0.13
Nodes (14): ref_three_addons_objects_sky_js, applyDynamicAtmosphereToScene(), _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor, IRideableHorseState (+6 more)

### Community 19 - "terrainAndBiomeSystem.ts"
Cohesion: 0.17
Nodes (25): CLEAR_ZONES, FLAT_BUILDING_TERRACES, BEAR_MOUNTAIN_CAVES, BIRCH_GROVE_CENTER, CROCODILE_RIVER_BEND_POS, MAGIC_STONE_CIRCLE_POS, PLAYABLE_RADIUS, PLAYER_EYE_HEIGHT (+17 more)

### Community 20 - "labModelFactory.ts"
Cohesion: 0.24
Nodes (16): ref_three_examples_jsm_environments_roomenvironment_js, CharacterLabCanvas(), afterDraw(), tick(), ICharacterLabCanvasProps, computeLabAnimationCycleProgress(), getEffectiveLabAnimationSpeed(), ILabAnimationDef (+8 more)

### Community 21 - "GameShellOverlay.tsx"
Cohesion: 0.10
Nodes (30): IWeatherOptionDef, SEASON_OPTIONS, SkyrimModalMode, WEATHER_OPTIONS, renderArtifactArtwork(), formatMarketError(), InventoryCategoryTab, ISkyrimInventoryModalProps (+22 more)

### Community 22 - "TheMan — 3D Living Nature & RPG World Simulator"
Cohesion: 0.29
Nodes (6): Engineering standards, Getting Started, Installation & Run, Overview & Architecture, Prerequisites, TheMan — 3D Living Nature & RPG World Simulator

### Community 27 - "WorldCanvas"
Cohesion: 0.20
Nodes (18): WorldCanvas, registerWindowDebugBridge(), findNearestFortressDoor(), findNearestMarketStall(), findNearestDeadLootableAnimal(), getActiveWorldAnimals(), lootDeadAnimal(), assignHotbarSlot() (+10 more)

### Community 28 - "telemetryStore.ts"
Cohesion: 0.29
Nodes (6): react, INITIAL_TELEMETRY_SNAPSHOT, ITelemetryStore, telemetryStore, TelemetrySnapshot, src_world_terrainmath_world_spawn

### Community 30 - "t"
Cohesion: 0.13
Nodes (17): ExplorerMinimap, GRID_SIZE, IExplorerMinimapProps, horseSkinsFromWorld, en, LocaleSchema, getLocaleDictionary(), setLocaleDictionary() (+9 more)

### Community 34 - "playerPhysicsSystem.ts"
Cohesion: 0.16
Nodes (16): SOLID_BUILDING_BOXES, chineseFortressStairHeightAt(), isChineseFortressWalkableZone(), findLookedAtWatchtowerLadder(), findWatchtowerLadderAt(), getLadderById(), isOnWatchtowerLadder(), RIDEABLE_HORSES (+8 more)

### Community 36 - "itemArtworkRegistry.tsx"
Cohesion: 0.12
Nodes (7): GameShellOverlay, ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy, renderItemSvgIcon(), useTelemetry()

### Community 38 - "App.tsx"
Cohesion: 0.27
Nodes (11): App(), WEATHER_CYCLE_ORDER, IGameSettingsModalProps, IGameShellOverlayProps, IWorldCanvasProps, IGameSettingsConfig, loadActiveGameSettings(), GameStateMode (+3 more)

### Community 47 - "keyBindingMatch.ts"
Cohesion: 0.70
Nodes (3): isBindingHeld(), matchesKeyBinding(), MODIFIER_FAMILIES

### Community 48 - "JaguarAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyJaguar(), Jaguar, JAGUAR_EMBEDDED_PACK_B64, JAGUAR_EMBEDDED_TEXTURE_URI, JAGUAR_GAITS, JAGUAR_STATES, JaguarAnimator (+5 more)

### Community 49 - "IPlayerState"
Cohesion: 0.13
Nodes (8): IPlayerState, ArrowEquipmentStrategy, BowEquipmentStrategy, IEquipmentSlotStrategy, isInventoryItemEquipped(), SwordEquipmentStrategy, ToolEquipmentStrategy, UsableGearStrategy

### Community 50 - "labCatalog.ts"
Cohesion: 0.20
Nodes (22): CAMERA_PRESETS, CharacterLabView(), ENVIRONMENT_PRESETS, ICharacterLabViewProps, SPEED_OPTIONS, countActivePoseOverrides(), createInitialLabSessionState(), filterLabEntities() (+14 more)

### Community 51 - "Rhino.ts"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyRhino(), Rhino, RHINO_EMBEDDED_PACK_B64, RHINO_EMBEDDED_TEXTURE_URI, RHINO_GAITS, RHINO_STATES, RhinoAnimator (+5 more)

### Community 52 - "playerAndCombatBuilder.ts"
Cohesion: 0.13
Nodes (15): IPlayerAndCombatBuilderContext, IPlayerAndCombatHandle, IArrowProjectile, ARROW_TRAIL_MAX_AGE, LOCKED_SWORD_GRIP_TRANSFORM, src_world_terrainmath_arrow_trail_max_age, src_world_terrainmath_arrowelementkind, src_world_terrainmath_computefirstpersonswordattackpose (+7 more)

### Community 53 - "DemonDragon_Complete.ts"
Cohesion: 0.10
Nodes (13): CLIP_ORDER, createReadyDemonDragon(), DEMON_DRAGON_EMBEDDED_PACK_B64, DEMON_DRAGON_EMBEDDED_TEXTURE_URI, DEMON_DRAGON_GAITS, DemonDragon, DemonDragonAnimator, DemonDragonOptions (+5 more)

### Community 55 - "ForestDragon_Complete.ts"
Cohesion: 0.09
Nodes (14): CLIP_ORDER, createReadyForestDragon(), FOREST_DRAGON_EMBEDDED_PACK_B64, FOREST_DRAGON_EMBEDDED_TEXTURE_URI, FOREST_DRAGON_GAITS, ForestDragon, ForestDragonAnimator, ForestDragonOptions (+6 more)

### Community 56 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, preview, test

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
Cohesion: 0.12
Nodes (6): IErrorBoundaryProps, IErrorBoundaryState, MockErrorLogger, ConsoleLogger, ILogger, NullLogger

### Community 63 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.18
Nodes (16): SOUTHERN_MINE_POS, IDwarvenMinerCaravanState, buildMinerWaypoints(), CaravanPath, computeDwarvenMinerCaravanState(), DWARVEN_MINER_STATIONS, DWARVEN_MINERS_COUNT, IMinerStationConfig (+8 more)

### Community 64 - "ref_node_test"
Cohesion: 0.26
Nodes (9): ref_node_assert_strict, ref_node_fs, ref_node_os, ref_node_path, ref_node_test, ref_node_url, DEFAULT_LAB_POSE_OVERRIDES, assertMatchesGolden() (+1 more)

### Community 65 - "horsePhysicsSystem.ts"
Cohesion: 0.29
Nodes (8): computeHorseBiomechanicalPose(), computeHorseTurnResistance(), IHorseBiomechanicalPose, IHorseLimbAngles, IHorseSteeringStepResult, solveForelimb(), solveHindlimb(), stepMountedHorseSteering()

### Community 66 - "main.tsx"
Cohesion: 0.20
Nodes (4): ref_react_dom_client, ErrorBoundary, src_index, rootElement

### Community 67 - "gameLoop.ts"
Cohesion: 0.31
Nodes (4): IGameLoopOptions, createTickErrorGuard(), ITickErrorGuard, TickErrorDecision

### Community 69 - "WolfAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyWolf(), unpackWolfBundle(), Wolf, WOLF_EMBEDDED_PACK_B64, WOLF_EMBEDDED_TEXTURE_URI, WOLF_GAITS, WOLF_STATES (+5 more)

### Community 72 - "vite.config.ts"
Cohesion: 0.14
Nodes (14): ref_node_fs_promises, ref_node_http, ref_path, @tailwindcss/vite, vite, @vitejs/plugin-react, assertTrustedJsonRequest(), PERSISTENCE_ROUTES (+6 more)

### Community 74 - "תיקיית מודלים תלת-ממדיים (`public/models`)"
Cohesion: 0.50
Nodes (3): מבנה תיקיות מומלץ (אופציונלי, או ישירות בתיקייה זו):, פורמטים מומלצים:, תיקיית מודלים תלת-ממדיים (`public/models`)

## Knowledge Gaps
- **211 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+206 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 424 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `proceduralModels.ts` to `terrainMath.test.ts`, `wildlifeAndFootprintsBuilder.ts`, `WolfAnimator`, `WorldCanvas.tsx`, `package.json`, `Deer_Complete.ts`, `config.ts`, `JaguarAnimator`, `atmosphereRenderController.ts`, `Rhino.ts`, `labModelFactory.ts`, `playerAndCombatBuilder.ts`, `DemonDragon_Complete.ts`, `ForestDragon_Complete.ts`, `BearAnimator`, `Crocodile.ts`?**
  _High betweenness centrality (0.253) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `boidsAndWildlifeSystem.ts`, `savedGameSettings.ts`, `main.tsx`, `playerPhysicsSystem.ts`, `itemArtworkRegistry.tsx`, `combatAndInventorySystem.ts`, `collisionAndTerraces.ts`, `WorldCanvas.tsx`, `worldTypes.ts`, `proceduralModels.ts`, `labCatalog.ts`, `terrainAndBiomeSystem.ts`, `GameShellOverlay.tsx`, `WorldCanvas`, `telemetryStore.ts`, `ILogger`, `dwarvenMineAndCaravanSystem.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `WorldCanvas` (e.g. with `.runFrame()` and `.start()`) actually correct?**
  _`WorldCanvas` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _211 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `boidsAndWildlifeSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11414141414141414 - nodes in this community are weakly interconnected._
- **Should `terrainMath.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.04830917874396135 - nodes in this community are weakly interconnected._
- **Should `swordAttackAnimationSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09243697478991597 - nodes in this community are weakly interconnected._