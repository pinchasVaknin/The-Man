# Graph Report - TheMan  (2026-11-02)

## Corpus Check
- 173 files · ~293,452 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: .glb 8, (none) 3, .example 1)

## Summary
- 1453 nodes · 4127 edges · 95 communities (62 shown, 33 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `175e8d89`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- boidsAndWildlifeSystem.ts
- App.tsx
- terrainMath.test.ts
- swordAttackAnimationSystem.ts
- TheMan — Architecture
- terrainAndBiomeSystem.ts
- InfrastructureCorruptedException
- WorldCanvas.tsx
- ref_node_test
- package.json
- Deer_Complete.ts
- compilerOptions
- GameLoop
- labCatalog.ts
- config.ts
- worldTypes.ts
- proceduralModels.ts
- devDependencies
- atmosphereAndWeatherSystem.ts
- landmarksRegistry.ts
- src_world_terrainmath_cameraperspectivemode
- GameShellOverlay.tsx
- TheMan — 3D Living Nature & RPG World Simulator
- rules/graphify.md
- workflows/graphify.md
- CLAUDE.md
- NatureSoundEngine
- worldClockSystem.ts
- telemetryStore.ts
- src_world_terrainmath_computedwarvenminercaravanstate
- persistedSettingsValidation.ts
- src_world_terrainmath_dwarven_guardian_statues
- src_world_terrainmath_dwarven_miners_count
- src_world_terrainmath_dwarven_stone_houses
- cameraRigSystem.ts
- src_world_terrainmath_arrowprojectile
- itemArtworkRegistry.tsx
- src_world_terrainmath_characterskillsstate
- interactionLandmarks.ts
- src_world_terrainmath_inventoryitemdef
- src_world_terrainmath_obstaclecylinder
- ref_domain_worldtypes
- src_world_domain_landmarksregistry_chinesefortressstairheightat
- src_world_terrainmath_solaratmosphere
- src_world_terrainmath_playerstate
- src_world_terrainmath_rideablehorsestate
- src_world_terrainmath_weatherstatesnapshot
- animalModelAssets.ts
- Jaguar_Complete.ts
- combatAndInventorySystem.ts
- src_world_terrainmath_walkpacemode
- RhinoAnimator
- atmosphereRenderController.ts
- getLoadedAnimalModel
- src_world_terrainmath_dynamicatmospherestate
- createAnimalTexture
- scripts
- SpatialHashGrid2D
- dependencies
- Bear_Complete.ts
- Crocodile_Complete.ts
- src_world_terrainmath_getanimalspeciesnamehe
- ILogger
- dwarvenMineAndCaravanSystem.ts
- MockErrorLogger
- horsePhysicsSystem.ts
- t
- deferredAnimalModel.spec.ts
- WorldCanvas
- Wolf_Complete.ts
- IPlayerState
- animalModels.characterization.spec.ts
- vite.config.ts
- three
- 3D model files (`public/models`)
- src_world_terrainmath_archery_targets
- createArchitecturalSharedAssets
- src_locales_index_he
- environmentAtmosphereModels.ts
- BearAnimator
- JaguarAnimator
- hudTelemetryBuilder.ts
- weaponFeelSystem.spec.ts
- WolfAnimator
- groundHeightAt
- CrocodileAnimator
- settlementModels.ts
- wildlifeAndFootprintsBuilder.ts
- playerPhysicsSystem.ts
- highlandBridgeLandmarks.ts
- movementIntent.spec.ts
- keyBindingMatch.ts
- validateGameSettings
- DemonDragonAnimator
- ForestDragonAnimator

## God Nodes (most connected - your core abstractions)
1. `WorldCanvas` - 57 edges
2. `t()` - 49 edges
3. `groundHeightAt()` - 43 edges
4. `walkableHeightAt()` - 42 edges
5. `three` - 39 edges
6. `ILogger` - 34 edges
7. `DeerAnimator` - 33 edges
8. `IPlayerState` - 31 edges
9. `NatureSoundEngine` - 31 edges
10. `InfrastructureCorruptedException` - 24 edges

## Surprising Connections (you probably didn't know these)
- `5.4 React and the frame` --references--> `createCameraPose()`  [INFERRED]
  ARCHITECTURE.md → src/world/systems/cameraRigSystem.ts
- `9. Errors and logging` --references--> `AppException`  [INFERRED]
  ARCHITECTURE.md → src/core/AppException.ts
- `9. Errors and logging` --references--> `InfrastructureCorruptedException`  [INFERRED]
  ARCHITECTURE.md → src/core/AppException.ts
- `9. Errors and logging` --references--> `ILogger`  [INFERRED]
  ARCHITECTURE.md → src/core/ILogger.ts
- `4. Composition root and services` --references--> `ConsoleLogger`  [INFERRED]
  ARCHITECTURE.md → src/core/ILogger.ts

## Import Cycles
- None detected.

## Communities (95 total, 33 thin omitted)

### Community 0 - "boidsAndWildlifeSystem.ts"
Cohesion: 0.08
Nodes (48): 6.1 Wildlife species (`world/systems/wildlifeSpeciesProfiles.ts`), ref_node_fs, ref_node_os, ref_node_path, ref_node_url, assertMatchesGolden(), normalizeForGolden(), activeWorldAnimalsRegistry (+40 more)

### Community 1 - "App.tsx"
Cohesion: 0.14
Nodes (24): 2. Source layout and layers, App(), WEATHER_CYCLE_ORDER, GameSettingsModal(), IGameSettingsModalProps, KEYBIND_CATEGORIES, KEYBIND_ROWS, KeybindCategory (+16 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.06
Nodes (30): DEFAULT_WEATHER_CYCLE_MODE, src_world_terrainmath_birch_grove_center, src_world_terrainmath_birchgrovefactorat, src_world_terrainmath_chinese_fortress_pos, src_world_terrainmath_chinesefortressstairheightat, src_world_terrainmath_computeweatherstate, src_world_terrainmath_corner_watchtowers, src_world_terrainmath_createinitialplayerstate (+22 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.09
Nodes (33): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+25 more)

### Community 4 - "TheMan — Architecture"
Cohesion: 0.08
Nodes (20): 10. Build output, 11. Testing, 12. Adding things, 1. Stack, 3. Startup, 5.1 GameLoop (`src/core/gameLoop.ts`), 5.2 Fixed timestep with interpolation, 5.3 What runs where (`components/WorldCanvas.tsx`) (+12 more)

### Community 5 - "terrainAndBiomeSystem.ts"
Cohesion: 0.25
Nodes (21): chineseFortressStairHeightAt(), isChineseFortressWalkableZone(), ropeBridgePointInfoAt(), distToSegment(), isInsideSouthernMine(), southernMineFloorHeightAt(), southernMineWalkableHeightAt(), stepPlayerPhysics() (+13 more)

### Community 6 - "InfrastructureCorruptedException"
Cohesion: 0.18
Nodes (14): 4. Composition root and services, react, ref_react_dom_client, ref_react_dom_server, AppServicesContext, AppServicesProvider, LoggerProbe(), useAppServices() (+6 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.07
Nodes (36): _camTargetLook, _euler, _sunVec, createAnimationFrameScheduler(), createGpuFencePacedScheduler(), src_world_terrainmath_assignhotbarslot, src_world_terrainmath_awardskillxp, src_world_terrainmath_buymarketitem (+28 more)

### Community 8 - "ref_node_test"
Cohesion: 0.16
Nodes (7): 8. Persistence and input validation, ref_node_assert_strict, ref_node_test, globalWithWindow, AppException, InvalidResultAccessException, Result

### Community 9 - "package.json"
Cohesion: 0.15
Nodes (12): name, private, type, version, react-dom, tailwindcss, tsx, @types/node (+4 more)

### Community 10 - "Deer_Complete.ts"
Cohesion: 0.05
Nodes (39): requireProceduralGeometry(), BoneDef, BoneGroup, BoneName, Chain, CHAINS, computeDeerSkinWeights(), createReadyDeer() (+31 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "GameLoop"
Cohesion: 0.11
Nodes (11): GameLoop, IFixedStepOptions, IFrameScheduler, IGameLoopOptions, createFixedHarness(), createHarness(), FakeScheduler, RecordingLogger (+3 more)

### Community 13 - "labCatalog.ts"
Cohesion: 0.11
Nodes (42): ref_three_examples_jsm_environments_roomenvironment_js, SAVED_LAB_OVERRIDES, CharacterLabCanvas(), afterDraw(), tick(), ICharacterLabCanvasProps, CAMERA_PRESETS, CharacterLabView() (+34 more)

### Community 14 - "config.ts"
Cohesion: 0.35
Nodes (10): clamp(), IValidatedPositionOverride, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS, URL_SEASON_OFFSETS, URL_WEATHER_MAP (+2 more)

### Community 15 - "worldTypes.ts"
Cohesion: 0.12
Nodes (25): IValidatedUrlOverrides, ITelemetrySnapshot, ArrowElementKind, BiomeType, CameraPerspectiveMode, createCatalogItem(), DEFAULT_STARTER_OWNED_ITEM_IDS, EquippedToolSlot (+17 more)

### Community 16 - "proceduralModels.ts"
Cohesion: 0.16
Nodes (21): IColliderDebugHandles, IWildlifeSoundCallbacks, VIEW_DISTANCE, IObstacleCylinder, IArchitecturalSharedAssets, IFortressModelResult, IMartialArtsMonk, IHarborModelHandles (+13 more)

### Community 17 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, tailwindcss, @tailwindcss/vite, tsx, @types/node, @types/react, @types/react-dom, @types/three (+3 more)

### Community 18 - "atmosphereAndWeatherSystem.ts"
Cohesion: 0.21
Nodes (22): applyDynamicAtmosphereToScene(), IHudTelemetryInput, createInput(), IWindowDebugBridgeDeps, createTestBridgeDeps(), lerpColorHex(), lerpNum(), smoothstep() (+14 more)

### Community 19 - "landmarksRegistry.ts"
Cohesion: 0.14
Nodes (28): CLEAR_ZONES, FLAT_BUILDING_TERRACES, BEAR_MOUNTAIN_CAVES, BIRCH_GROVE_CENTER, CROCODILE_RIVER_BEND_POS, MAGIC_STONE_CIRCLE_POS, PLAYABLE_RADIUS, PLAYER_EYE_HEIGHT (+20 more)

### Community 21 - "GameShellOverlay.tsx"
Cohesion: 0.10
Nodes (32): GameShellOverlay, SEASON_OPTIONS, SkyrimModalMode, WEATHER_OPTIONS, renderArtifactArtwork(), renderItemSvgIcon(), formatMarketError(), InventoryCategoryTab (+24 more)

### Community 22 - "TheMan — 3D Living Nature & RPG World Simulator"
Cohesion: 0.25
Nodes (6): Engineering standards, Getting Started, Installation & Run, Overview & Architecture, Prerequisites, TheMan — 3D Living Nature & RPG World Simulator

### Community 27 - "worldClockSystem.ts"
Cohesion: 0.36
Nodes (7): advanceSleepClock(), advanceWorldClock(), isSleepingAllowedAt(), PLAY_CLOCK_HOURS_PER_SECOND, SLEEP_CLOCK_HOURS_PER_SECOND, TITLE_CLOCK_HOURS_PER_SECOND, WAKE_UP_HOUR

### Community 28 - "telemetryStore.ts"
Cohesion: 0.33
Nodes (5): INITIAL_TELEMETRY_SNAPSHOT, ITelemetryStore, telemetryStore, TelemetrySnapshot, src_world_terrainmath_world_spawn

### Community 30 - "persistedSettingsValidation.ts"
Cohesion: 0.15
Nodes (12): ANIMATION_SPEED_RANGE, CAMERA_PERSPECTIVES, FIREFLIES_MODES, GameSettingsValidationError, JUMP_FORCE_RANGE, KEYBINDING_NAMES, LAB_NUMBER_RANGES, LAB_ROTATION_FIELDS (+4 more)

### Community 34 - "cameraRigSystem.ts"
Cohesion: 0.27
Nodes (10): computeTargetFov(), createCameraPose(), createCameraRigState(), easeFovToward(), ICameraPose, ICameraRigState, VIEW_VARIANTS, stepCameraRig() (+2 more)

### Community 36 - "itemArtworkRegistry.tsx"
Cohesion: 0.14
Nodes (4): ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy

### Community 38 - "interactionLandmarks.ts"
Cohesion: 0.18
Nodes (13): ARCHERY_TARGETS, CHINESE_FORTRESS_POS, CORNER_WATCHTOWERS, FORTRESS_Y_OFFSET, FORTRESS_Z_OFFSET, findWatchtowerLadderAt(), getLadderById(), isOnWatchtowerLadder() (+5 more)

### Community 47 - "animalModelAssets.ts"
Cohesion: 0.11
Nodes (24): ref_node_fs_promises, ref_three_addons_loaders_gltfloader_js, CharacterLabView, MODELS_DIRECTORY, preloadAnimalModelsForTests(), readModelFromDisk(), ANIMAL_MODEL_IDS, AnimalModelFetcher (+16 more)

### Community 48 - "Jaguar_Complete.ts"
Cohesion: 0.13
Nodes (9): CLIP_ORDER, createReadyJaguar(), Jaguar, JAGUAR_GAITS, JAGUAR_STATES, JaguarOptions, JaguarRig, JaguarState (+1 more)

### Community 49 - "combatAndInventorySystem.ts"
Cohesion: 0.08
Nodes (24): IWildlifeAndFootprintsHandles, IArcheryTargetDef, IBoidBirdState, ISmallAnimalState, ARCHERY_TARGETS_SPATIAL_GRID, arrowFireStrategy, arrowNormalStrategy, arrowWindStrategy (+16 more)

### Community 51 - "RhinoAnimator"
Cohesion: 0.11
Nodes (3): Rhino, RhinoAnimator, RhinoRig

### Community 52 - "atmosphereRenderController.ts"
Cohesion: 0.20
Nodes (9): ref_three_addons_objects_sky_js, _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor, src_world_terrainmath_computedynamicsolarcycle, src_world_terrainmath_idynamicatmospherestate (+1 more)

### Community 53 - "getLoadedAnimalModel"
Cohesion: 0.14
Nodes (10): getLoadedAnimalModel(), CLIP_ORDER, createReadyDemonDragon(), DEMON_DRAGON_GAITS, DemonDragon, DemonDragonOptions, DemonDragonRig, DemonDragonState (+2 more)

### Community 55 - "createAnimalTexture"
Cohesion: 0.14
Nodes (10): createAnimalTexture(), CLIP_ORDER, createReadyForestDragon(), FOREST_DRAGON_GAITS, ForestDragon, ForestDragonOptions, ForestDragonRig, ForestDragonState (+2 more)

### Community 56 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, preview, test

### Community 58 - "dependencies"
Cohesion: 0.50
Nodes (4): dependencies, react, react-dom, three

### Community 59 - "Bear_Complete.ts"
Cohesion: 0.14
Nodes (9): Bear, BEAR_GAITS, BEAR_STATES, BearOptions, BearRig, BearState, BearUnpackedData, CLIP_ORDER (+1 more)

### Community 60 - "Crocodile_Complete.ts"
Cohesion: 0.14
Nodes (9): IClipRigModelData, createReadyCrocodile(), Crocodile, CROCODILE_GAITS, CROCODILE_STATES, CrocodileOptions, CrocodileRig, CrocodileState (+1 more)

### Community 62 - "ILogger"
Cohesion: 0.11
Nodes (8): createAppServices(), IErrorBoundaryProps, IErrorBoundaryState, ConsoleLogger, ILogger, NullLogger, MockLogger, src_world_terrainmath_biometype

### Community 63 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.20
Nodes (12): SOUTHERN_MINE_POS, IDwarvenMinerCaravanState, buildMinerWaypoints(), CaravanPath, computeDwarvenMinerCaravanState(), DWARVEN_MINER_STATIONS, DWARVEN_MINERS_COUNT, IMinerStationConfig (+4 more)

### Community 65 - "horsePhysicsSystem.ts"
Cohesion: 0.29
Nodes (8): computeHorseBiomechanicalPose(), computeHorseTurnResistance(), IHorseBiomechanicalPose, IHorseLimbAngles, IHorseSteeringStepResult, solveForelimb(), solveHindlimb(), stepMountedHorseSteering()

### Community 66 - "t"
Cohesion: 0.20
Nodes (11): ExplorerMinimap, GRID_SIZE, IExplorerMinimapProps, en, LocaleSchema, getLocaleDictionary(), setLocaleDictionary(), t() (+3 more)

### Community 67 - "deferredAnimalModel.spec.ts"
Cohesion: 0.13
Nodes (4): DeferredAnimalModel, IAnimatedAnimalModel, FakeModel, RecordingLogger

### Community 68 - "WorldCanvas"
Cohesion: 0.19
Nodes (16): WorldCanvas, lerp(), lerpAngle(), getActiveWorldAnimals(), lootDeadAnimal(), assignHotbarSlot(), evaluateSwordStrikeWindowHit(), getNearbyArcheryTargets() (+8 more)

### Community 69 - "Wolf_Complete.ts"
Cohesion: 0.14
Nodes (9): CLIP_ORDER, createReadyWolf(), Wolf, WOLF_GAITS, WOLF_STATES, WolfOptions, WolfRig, WolfState (+1 more)

### Community 70 - "IPlayerState"
Cohesion: 0.18
Nodes (8): InventoryItemId, IPlayerState, ICameraRigFrameInput, ArrowEquipmentStrategy, BowEquipmentStrategy, IEquipmentSlotStrategy, SwordEquipmentStrategy, ToolEquipmentStrategy

### Community 71 - "animalModels.characterization.spec.ts"
Cohesion: 0.19
Nodes (13): requireClipRig(), fingerprint(), IAnimatedModel, poseOf(), sumOf(), CLIP_ORDER, createReadyRhino(), RHINO_GAITS (+5 more)

### Community 72 - "vite.config.ts"
Cohesion: 0.16
Nodes (12): ref_node_http, ref_path, @tailwindcss/vite, vite, @vitejs/plugin-react, assertTrustedJsonRequest(), PERSISTENCE_ROUTES, PersistenceErrorCode (+4 more)

### Community 73 - "three"
Cohesion: 0.10
Nodes (21): three, buildDwarvenKingdomAndMiners(), IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig, buildPlayerAndCombatSystems(), IPlayerAndCombatBuilderContext, IPlayerAndCombatHandle (+13 more)

### Community 76 - "createArchitecturalSharedAssets"
Cohesion: 0.16
Nodes (19): ref_three_addons_environments_roomenvironment_js, attachFlagHorizontalWaveShader(), createWorldScene(), IWorldScene, isWithinViewDistance(), createArchitecturalSharedAssets(), createChinesePagodaRoof(), createInteractiveDoubleDoor() (+11 more)

### Community 78 - "environmentAtmosphereModels.ts"
Cohesion: 0.18
Nodes (17): attachWindSwayShader(), createBirchBarkTexture(), perturbGeometryVertices(), fbm2D(), hash2D(), valueNoise2D(), buildEnvironmentAtmosphereModels(), IForestSquirrel (+9 more)

### Community 81 - "hudTelemetryBuilder.ts"
Cohesion: 0.21
Nodes (15): buildTelemetrySnapshot(), registerWindowDebugBridge(), findLookedAtWatchtowerLadder(), findNearestBed(), findNearestFortressDoor(), findNearestMarketStall(), findNearestDeadLootableAnimal(), getAnimalSpeciesName() (+7 more)

### Community 82 - "weaponFeelSystem.spec.ts"
Cohesion: 0.60
Nodes (3): IMeleeFeelInput, stepBowFeel(), stepMeleeFeelAndSway()

### Community 84 - "groundHeightAt"
Cohesion: 0.18
Nodes (14): buildColliderDebugWireframes(), buildSettlementModels(), buildTerrainAndWaterModel(), ITerrainAndWaterResult, smoothstepLocal(), getSurfaceNormalAt(), groundHeightAt(), southwestOasisBiomeFactorAt() (+6 more)

### Community 86 - "settlementModels.ts"
Cohesion: 0.13
Nodes (15): IRideableHorseState, ISettlementModelHandles, src_world_terrainmath_bear_mountain_caves, src_world_terrainmath_computehorsebiomechanicalpose, src_world_terrainmath_crocodile_river_bend_pos, src_world_terrainmath_hunter_lodge_pos, src_world_terrainmath_irideablehorsestate, src_world_terrainmath_lakeside_tea_pavilion_pos (+7 more)

### Community 87 - "wildlifeAndFootprintsBuilder.ts"
Cohesion: 0.17
Nodes (16): DEFAULT_LAB_POSE_OVERRIDES, LAB_POSE_OVERRIDES_STORAGE_KEY, mergeStoredLabOverrides(), StoredLabOverridesError, buildWildlifeAndFootprintsLayer(), isAnimalModelLoaded(), attachDeerGlbModel(), requireDeer() (+8 more)

### Community 88 - "playerPhysicsSystem.ts"
Cohesion: 0.18
Nodes (9): SOLID_BUILDING_BOXES, FORTRESS_DOORS, RIDEABLE_HORSES, IPlayerInput, ISkillProgressionResult, SKILL_ACCESSORS, SkillProgressionName, src_world_systems_terrainandbiomesystem_chinesefortressstairheightat (+1 more)

### Community 89 - "highlandBridgeLandmarks.ts"
Cohesion: 0.29
Nodes (5): HILL_BRIDGE_COS, HILL_BRIDGE_SIN, HILL_BRIDGE_YAW, HILL_WATCHTOWERS, ROPE_BRIDGE_DEF

### Community 90 - "movementIntent.spec.ts"
Cohesion: 0.47
Nodes (4): IMovementAxes, readMovementAxes(), BINDINGS, NO_JOYSTICK

### Community 91 - "keyBindingMatch.ts"
Cohesion: 0.70
Nodes (3): isBindingHeld(), matchesKeyBinding(), MODIFIER_FAMILIES

### Community 92 - "validateGameSettings"
Cohesion: 0.33
Nodes (8): isNumberInRange(), isOneOf(), isPlainObject(), toAnimationSpeeds(), toLabPoseOverrides(), validateGameSettings(), validateLabOverrides(), saveLabOverrides()

## Knowledge Gaps
- **232 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+227 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 461 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `three` to `WorldCanvas.tsx`, `package.json`, `Deer_Complete.ts`, `labCatalog.ts`, `proceduralModels.ts`, `atmosphereAndWeatherSystem.ts`, `animalModelAssets.ts`, `Jaguar_Complete.ts`, `atmosphereRenderController.ts`, `getLoadedAnimalModel`, `createAnimalTexture`, `Bear_Complete.ts`, `Crocodile_Complete.ts`, `deferredAnimalModel.spec.ts`, `Wolf_Complete.ts`, `animalModels.characterization.spec.ts`, `createArchitecturalSharedAssets`, `environmentAtmosphereModels.ts`, `groundHeightAt`, `settlementModels.ts`, `wildlifeAndFootprintsBuilder.ts`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **Why does `ILogger` connect `ILogger` to `MockErrorLogger`, `App.tsx`, `deferredAnimalModel.spec.ts`, `TheMan — Architecture`, `InfrastructureCorruptedException`, `ref_node_test`, `Deer_Complete.ts`, `GameLoop`, `createArchitecturalSharedAssets`, `animalModelAssets.ts`, `proceduralModels.ts`, `wildlifeAndFootprintsBuilder.ts`, `NatureSoundEngine`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `boidsAndWildlifeSystem.ts`, `App.tsx`, `TheMan — Architecture`, `terrainAndBiomeSystem.ts`, `WorldCanvas.tsx`, `labCatalog.ts`, `worldTypes.ts`, `atmosphereAndWeatherSystem.ts`, `landmarksRegistry.ts`, `GameShellOverlay.tsx`, `telemetryStore.ts`, `interactionLandmarks.ts`, `combatAndInventorySystem.ts`, `ILogger`, `dwarvenMineAndCaravanSystem.ts`, `WorldCanvas`, `hudTelemetryBuilder.ts`, `playerPhysicsSystem.ts`, `highlandBridgeLandmarks.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `WorldCanvas` (e.g. with `.start()` and `.stop()`) actually correct?**
  _`WorldCanvas` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `t()` (e.g. with `12. Adding things` and `labCatalog.test.ts`) actually correct?**
  _`t()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _232 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `boidsAndWildlifeSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08051948051948052 - nodes in this community are weakly interconnected._