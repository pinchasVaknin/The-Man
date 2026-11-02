# Graph Report - TheMan  (2026-11-02)

## Corpus Check
- 176 files · ~295,097 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: .glb 8, (none) 3, .example 1)

## Summary
- 1482 nodes · 4184 edges · 94 communities (60 shown, 34 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c2e8793b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- boidsAndWildlifeSystem.ts
- savedGameSettings.ts
- terrainMath.test.ts
- swordAttackAnimationSystem.ts
- TheMan — Architecture
- terrainAndBiomeSystem.ts
- main.tsx
- WorldCanvas.tsx
- Result
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
- DeerAnimator
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
- Rhino_Complete.ts
- atmosphereRenderController.ts
- DemonDragon
- src_world_terrainmath_dynamicatmospherestate
- ForestDragon
- scripts
- SpatialHashGrid2D
- persistenceValidation.ts
- Bear_Complete.ts
- requireClipRig
- src_world_terrainmath_getanimalspeciesnamehe
- ref_node_test
- dwarvenMineAndCaravanSystem.ts
- ILogger
- IRideableHorseState
- t
- deferredAnimalModel.spec.ts
- interpolation.spec.ts
- Wolf_Complete.ts
- IPlayerState
- animalModels.characterization.spec.ts
- persistencePlugin.ts
- playerAndCombatBuilder.ts
- 3D model files (`public/models`)
- src_world_terrainmath_archery_targets
- hash2D
- src_locales_index_he
- farmhouseModels.ts
- BearAnimator
- JaguarAnimator
- WorldCanvas
- goldenMaster.ts
- WolfAnimator
- terrainAndWaterModel.ts
- CrocodileAnimator
- getLoadedAnimalModel
- wildlifeAndFootprintsBuilder.ts
- InfrastructureCorruptedException
- CharacterLabCanvas.tsx
- RhinoAnimator
- keyBindingMatch.ts
- App.tsx
- persistenceValidationParity.spec.ts

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
- `8. Persistence and input validation` --references--> `Result`  [INFERRED]
  ARCHITECTURE.md → src/core/Result.ts
- `4. Composition root and services` --references--> `useAppServices()`  [INFERRED]
  ARCHITECTURE.md → src/app/AppServicesContext.tsx
- `5.1 GameLoop (`src/core/gameLoop.ts`)` --references--> `ErrorBoundary`  [INFERRED]
  ARCHITECTURE.md → src/components/ErrorBoundary.tsx
- `9. Errors and logging` --references--> `ErrorBoundary`  [INFERRED]
  ARCHITECTURE.md → src/components/ErrorBoundary.tsx
- `12. Adding things` --references--> `IGameKeybindings`  [INFERRED]
  ARCHITECTURE.md → src/config/savedGameSettings.ts

## Import Cycles
- None detected.

## Communities (94 total, 34 thin omitted)

### Community 0 - "boidsAndWildlifeSystem.ts"
Cohesion: 0.06
Nodes (58): 6.1 Wildlife species (`world/systems/wildlifeSpeciesProfiles.ts`), 6.2 Other dispatch tables, 6. Strategy tables instead of switches, createInput(), SOLID_BUILDING_BOXES, BEAR_MOUNTAIN_CAVES, CROCODILE_RIVER_BEND_POS, PLAYABLE_RADIUS (+50 more)

### Community 1 - "savedGameSettings.ts"
Cohesion: 0.14
Nodes (19): App(), LoggerProbe(), useAppServices(), GameSettingsModal(), IGameSettingsModalProps, IKeybindRowMeta, KEYBIND_CATEGORIES, KEYBIND_ROWS (+11 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.05
Nodes (39): BIRCH_GROVE_CENTER, SNOW_LINE_ALTITUDE, SOUTHERN_PASS_VALLEY_POS, SOUTHERN_RIVER_BRIDGE_POS, WALKABLE_MOUNTAINS, DEFAULT_WEATHER_CYCLE_MODE, src_world_terrainmath_bear_mountain_caves, src_world_terrainmath_birch_grove_center (+31 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.09
Nodes (33): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+25 more)

### Community 4 - "TheMan — Architecture"
Cohesion: 0.18
Nodes (10): 10. Build output, 11. Testing, 1. Stack, 3. Startup, 4. Composition root and services, 7.1 Files (`public/models/animals/*.glb`), 7.2 Runtime, 7. Animal models: GLB files and async loading (+2 more)

### Community 5 - "terrainAndBiomeSystem.ts"
Cohesion: 0.18
Nodes (32): southernRiverBridgeHeightAt(), chineseFortressStairHeightAt(), isChineseFortressWalkableZone(), ropeBridgePointInfoAt(), distToSegment(), buildFortressModels(), buildTerrainAndWaterModel(), isInsideSouthernMine() (+24 more)

### Community 6 - "main.tsx"
Cohesion: 0.12
Nodes (11): react, ref_react_dom_client, AppServicesContext, AppServicesProvider, IAppServices, ErrorBoundary, IErrorBoundaryProps, IErrorBoundaryState (+3 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.07
Nodes (37): _camTargetLook, _euler, _sunVec, createAnimationFrameScheduler(), createGpuFencePacedScheduler(), src_world_terrainmath_assignhotbarslot, src_world_terrainmath_awardskillxp, src_world_terrainmath_buymarketitem (+29 more)

### Community 9 - "package.json"
Cohesion: 0.12
Nodes (16): dependencies, react, react-dom, three, name, private, type, version (+8 more)

### Community 10 - "Deer_Complete.ts"
Cohesion: 0.06
Nodes (37): isAnimalModelLoaded(), requireProceduralGeometry(), BoneDef, BoneGroup, BoneName, Chain, CHAINS, computeDeerSkinWeights() (+29 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "GameLoop"
Cohesion: 0.12
Nodes (9): GameLoop, IFixedStepOptions, IFrameScheduler, IGameLoopOptions, createFixedHarness(), createHarness(), FakeScheduler, RecordingLogger (+1 more)

### Community 13 - "labCatalog.ts"
Cohesion: 0.14
Nodes (27): SAVED_LAB_OVERRIDES, CAMERA_PRESETS, CharacterLabView(), ENVIRONMENT_PRESETS, ICharacterLabViewProps, SPEED_OPTIONS, countActivePoseOverrides(), createInitialLabSessionState() (+19 more)

### Community 14 - "config.ts"
Cohesion: 0.25
Nodes (13): clamp(), IValidatedPositionOverride, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS, URL_SEASON_OFFSETS, URL_WEATHER_MAP (+5 more)

### Community 15 - "worldTypes.ts"
Cohesion: 0.12
Nodes (27): IValidatedUrlOverrides, IHudTelemetryInput, ITelemetrySnapshot, ArrowElementKind, BiomeType, CameraPerspectiveMode, createCatalogItem(), EquippedToolSlot (+19 more)

### Community 16 - "proceduralModels.ts"
Cohesion: 0.10
Nodes (38): three, buildColliderDebugWireframes(), IColliderDebugHandles, attachFlagHorizontalWaveShader(), attachWindSwayShader(), IWildlifeSoundCallbacks, VIEW_DISTANCE, IObstacleCylinder (+30 more)

### Community 17 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, tailwindcss, @tailwindcss/vite, tsx, @types/node, @types/react, @types/react-dom, @types/three (+3 more)

### Community 18 - "atmosphereAndWeatherSystem.ts"
Cohesion: 0.39
Nodes (13): createTestBridgeDeps(), fbm2D(), lerpColorHex(), lerpNum(), smoothstep(), computeDynamicSolarCycle(), computeWeatherState(), getSeasonLabel() (+5 more)

### Community 19 - "landmarksRegistry.ts"
Cohesion: 0.12
Nodes (34): CLEAR_ZONES, FLAT_BUILDING_TERRACES, MAGIC_STONE_CIRCLE_POS, WATERFALL_CLIFF_POS, WATERFALL_POOL_POS, DWARVEN_GUARDIAN_STATUES, DWARVEN_STONE_HOUSES, SOUTHERN_MINE_POS (+26 more)

### Community 21 - "GameShellOverlay.tsx"
Cohesion: 0.10
Nodes (31): IWeatherOptionDef, SEASON_OPTIONS, SkyrimModalMode, WEATHER_OPTIONS, renderArtifactArtwork(), formatMarketError(), InventoryCategoryTab, ISkyrimInventoryModalProps (+23 more)

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
Cohesion: 0.14
Nodes (21): ANIMATION_SPEED_RANGE, CAMERA_PERSPECTIVES, FIREFLIES_MODES, GameSettingsValidationError, isNumberInRange(), isOneOf(), isPlainObject(), JUMP_FORCE_RANGE (+13 more)

### Community 34 - "cameraRigSystem.ts"
Cohesion: 0.15
Nodes (17): 5.1 GameLoop (`src/core/gameLoop.ts`), 5.2 Fixed timestep with interpolation, 5.3 What runs where (`components/WorldCanvas.tsx`), 5.4 React and the frame, 5. The game loop, PLAYER_EYE_HEIGHT, computeTargetFov(), createCameraPose() (+9 more)

### Community 36 - "itemArtworkRegistry.tsx"
Cohesion: 0.12
Nodes (7): GameShellOverlay, ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy, renderItemSvgIcon(), useTelemetry()

### Community 47 - "animalModelAssets.ts"
Cohesion: 0.16
Nodes (18): ref_three_addons_loaders_gltfloader_js, ANIMAL_MODEL_IDS, AnimalModelFetcher, decodeClipRig(), decodeProceduralGeometry(), decodeSkinWeights(), dequantize(), fetchAnimalModelFromServer() (+10 more)

### Community 48 - "Jaguar_Complete.ts"
Cohesion: 0.12
Nodes (9): IClipRigModelData, CLIP_ORDER, Jaguar, JAGUAR_GAITS, JAGUAR_STATES, JaguarOptions, JaguarRig, JaguarState (+1 more)

### Community 49 - "combatAndInventorySystem.ts"
Cohesion: 0.07
Nodes (35): IWildlifeAndFootprintsHandles, DEFAULT_STARTER_OWNED_ITEM_IDS, IArcheryTargetDef, IInventoryItemDef, ISolidBuildingBox, getActiveWorldAnimals(), IBoidBirdState, ISmallAnimalState (+27 more)

### Community 51 - "Rhino_Complete.ts"
Cohesion: 0.12
Nodes (9): CLIP_ORDER, createReadyRhino(), Rhino, RHINO_GAITS, RHINO_STATES, RhinoOptions, RhinoRig, RhinoState (+1 more)

### Community 52 - "atmosphereRenderController.ts"
Cohesion: 0.18
Nodes (10): ref_three_addons_objects_sky_js, applyDynamicAtmosphereToScene(), _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor, src_world_terrainmath_computedynamicsolarcycle (+2 more)

### Community 53 - "DemonDragon"
Cohesion: 0.14
Nodes (3): DemonDragon, DemonDragonAnimator, DemonDragonRig

### Community 55 - "ForestDragon"
Cohesion: 0.14
Nodes (3): ForestDragon, ForestDragonAnimator, ForestDragonRig

### Community 56 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, preview, test

### Community 58 - "persistenceValidation.ts"
Cohesion: 0.14
Nodes (21): ANIMATION_SPEED_RANGE, CAMERA_PERSPECTIVES, checkGameSettingsPayload(), checkLabOverridesPayload(), FIREFLIES_MODES, IPersistedGameSettings, isNumberInRange(), isOneOf() (+13 more)

### Community 59 - "Bear_Complete.ts"
Cohesion: 0.14
Nodes (8): Bear, BEAR_GAITS, BEAR_STATES, BearOptions, BearRig, BearState, BearUnpackedData, CLIP_ORDER

### Community 60 - "requireClipRig"
Cohesion: 0.15
Nodes (9): requireClipRig(), createReadyCrocodile(), Crocodile, CROCODILE_GAITS, CROCODILE_STATES, CrocodileOptions, CrocodileRig, CrocodileState (+1 more)

### Community 62 - "ref_node_test"
Cohesion: 0.14
Nodes (9): ref_node_assert_strict, ref_node_test, ref_react_dom_server, createAppServices(), SAVED_GAME_SETTINGS, globalWithWindow, ConsoleLogger, NullLogger (+1 more)

### Community 63 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.24
Nodes (10): IDwarvenMinerCaravanState, buildMinerWaypoints(), CaravanPath, computeDwarvenMinerCaravanState(), DWARVEN_MINER_STATIONS, IMinerStationConfig, interpolateDwarvenCaravanWaypoints(), MinerStationConfig (+2 more)

### Community 64 - "ILogger"
Cohesion: 0.10
Nodes (5): MockErrorLogger, ILogger, AttachDeerGlbOptions, RecordingLogger, MockLogger

### Community 65 - "IRideableHorseState"
Cohesion: 0.24
Nodes (10): IRideableHorseState, ISettlementModelHandles, computeHorseBiomechanicalPose(), computeHorseTurnResistance(), IHorseBiomechanicalPose, IHorseLimbAngles, IHorseSteeringStepResult, solveForelimb() (+2 more)

### Community 66 - "t"
Cohesion: 0.20
Nodes (11): ExplorerMinimap, GRID_SIZE, IExplorerMinimapProps, horseSkinsFromWorld, en, LocaleSchema, getLocaleDictionary(), setLocaleDictionary() (+3 more)

### Community 67 - "deferredAnimalModel.spec.ts"
Cohesion: 0.12
Nodes (11): 12. Adding things, ref_node_fs_promises, CharacterLabView, MODELS_DIRECTORY, preloadAnimalModelsForTests(), readModelFromDisk(), AnimalModelId, preloadAllAnimalModels() (+3 more)

### Community 69 - "Wolf_Complete.ts"
Cohesion: 0.14
Nodes (9): CLIP_ORDER, createReadyWolf(), Wolf, WOLF_GAITS, WOLF_STATES, WolfOptions, WolfRig, WolfState (+1 more)

### Community 70 - "IPlayerState"
Cohesion: 0.13
Nodes (8): IPlayerState, ArrowEquipmentStrategy, BowEquipmentStrategy, IEquipmentSlotStrategy, isInventoryItemEquipped(), SwordEquipmentStrategy, ToolEquipmentStrategy, UsableGearStrategy

### Community 71 - "animalModels.characterization.spec.ts"
Cohesion: 0.36
Nodes (5): fingerprint(), IAnimatedModel, poseOf(), sumOf(), FOREST_DRAGON_STATES

### Community 72 - "persistencePlugin.ts"
Cohesion: 0.16
Nodes (14): assertTrustedJsonRequest(), directFilePersistencePlugin(), PERSISTENCE_ROUTES, PersistenceErrorCode, PersistenceRequestError, readJsonBody(), saveGameSettings(), saveLabOverrides() (+6 more)

### Community 73 - "playerAndCombatBuilder.ts"
Cohesion: 0.13
Nodes (15): IPlayerAndCombatBuilderContext, IPlayerAndCombatHandle, IArrowProjectile, ARROW_TRAIL_MAX_AGE, LOCKED_SWORD_GRIP_TRANSFORM, src_world_terrainmath_arrow_trail_max_age, src_world_terrainmath_arrowelementkind, src_world_terrainmath_computefirstpersonswordattackpose (+7 more)

### Community 76 - "hash2D"
Cohesion: 0.16
Nodes (17): ref_three_addons_environments_roomenvironment_js, buildPlayerAndCombatSystems(), createBirchBarkTexture(), createWorldScene(), IWorldScene, isWithinViewDistance(), hash2D(), valueNoise2D() (+9 more)

### Community 78 - "farmhouseModels.ts"
Cohesion: 0.16
Nodes (12): buildDwarvenKingdomAndMiners(), IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig, perturbGeometryVertices(), buildFarmhouseModels(), IFarmhouseModelHandles, attachAnimatedWaterWaveShader() (+4 more)

### Community 81 - "WorldCanvas"
Cohesion: 0.23
Nodes (18): WorldCanvas, buildTelemetrySnapshot(), registerWindowDebugBridge(), findLookedAtWatchtowerLadder(), findNearestBed(), findNearestFortressDoor(), findNearestMarketStall(), findNearestDeadLootableAnimal() (+10 more)

### Community 82 - "goldenMaster.ts"
Cohesion: 0.27
Nodes (9): ref_node_fs, ref_node_os, ref_node_path, ref_node_url, assertMatchesGolden(), normalizeForGolden(), IMeleeFeelInput, stepBowFeel() (+1 more)

### Community 84 - "terrainAndWaterModel.ts"
Cohesion: 0.14
Nodes (13): IForestSquirrel, SquirrelActionState, ITerrainAndWaterResult, smoothstepLocal(), src_world_terrainmath_birchgrovefactorat, src_world_terrainmath_fbm2d, src_world_terrainmath_getroofheightat, src_world_terrainmath_hash2d (+5 more)

### Community 86 - "getLoadedAnimalModel"
Cohesion: 0.18
Nodes (16): createAnimalTexture(), getLoadedAnimalModel(), CLIP_ORDER, createReadyDemonDragon(), DEMON_DRAGON_GAITS, DemonDragonOptions, DemonDragonState, DemonDragonUnpackedData (+8 more)

### Community 87 - "wildlifeAndFootprintsBuilder.ts"
Cohesion: 0.22
Nodes (15): buildLabEntityRig(), computeGroupStats(), buildWildlifeAndFootprintsLayer(), createReadyBear(), createReadyJaguar(), attachDeerGlbModel(), IAnimatedDeer, createFootprintTrailTracker() (+7 more)

### Community 88 - "InfrastructureCorruptedException"
Cohesion: 0.19
Nodes (6): 9. Errors and logging, AppException, InfrastructureCorruptedException, createTickErrorGuard(), TickErrorDecision, requireDeer()

### Community 89 - "CharacterLabCanvas.tsx"
Cohesion: 0.26
Nodes (14): ref_three_examples_jsm_environments_roomenvironment_js, CharacterLabCanvas(), afterDraw(), tick(), ICharacterLabCanvasProps, computeLabAnimationCycleProgress(), getEffectiveLabAnimationSpeed(), ILabAnimationDef (+6 more)

### Community 91 - "keyBindingMatch.ts"
Cohesion: 0.70
Nodes (3): isBindingHeld(), matchesKeyBinding(), MODIFIER_FAMILIES

### Community 92 - "App.tsx"
Cohesion: 0.40
Nodes (9): 2. Source layout and layers, WEATHER_CYCLE_ORDER, IGameShellOverlayProps, IWorldCanvasProps, IGameSettingsConfig, GameStateMode, IVirtualMoveState, IGameActions (+1 more)

### Community 93 - "persistenceValidationParity.spec.ts"
Cohesion: 0.47
Nodes (5): clone(), GAME_SETTINGS_CASES, LAB_CASES, withPose(), withSettings()

## Knowledge Gaps
- **248 isolated node(s):** `PersistenceErrorCode`, `STATUS_BY_ERROR`, `PERSISTENCE_ROUTES`, `PayloadCheck`, `IPersistedGameSettings` (+243 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 476 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `proceduralModels.ts` to `terrainMath.test.ts`, `WorldCanvas.tsx`, `package.json`, `Deer_Complete.ts`, `config.ts`, `animalModelAssets.ts`, `Jaguar_Complete.ts`, `Rhino_Complete.ts`, `atmosphereRenderController.ts`, `Bear_Complete.ts`, `requireClipRig`, `deferredAnimalModel.spec.ts`, `Wolf_Complete.ts`, `animalModels.characterization.spec.ts`, `playerAndCombatBuilder.ts`, `hash2D`, `farmhouseModels.ts`, `terrainAndWaterModel.ts`, `getLoadedAnimalModel`, `wildlifeAndFootprintsBuilder.ts`, `CharacterLabCanvas.tsx`?**
  _High betweenness centrality (0.169) - this node is a cross-community bridge._
- **Why does `ILogger` connect `ILogger` to `savedGameSettings.ts`, `deferredAnimalModel.spec.ts`, `main.tsx`, `Deer_Complete.ts`, `GameLoop`, `hash2D`, `proceduralModels.ts`, `wildlifeAndFootprintsBuilder.ts`, `InfrastructureCorruptedException`, `NatureSoundEngine`, `ref_node_test`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `DeerAnimator` connect `DeerAnimator` to `Deer_Complete.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `WorldCanvas` (e.g. with `.start()` and `.stop()`) actually correct?**
  _`WorldCanvas` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `t()` (e.g. with `12. Adding things` and `labCatalog.test.ts`) actually correct?**
  _`t()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PersistenceErrorCode`, `STATUS_BY_ERROR`, `PERSISTENCE_ROUTES` to the rest of the system?**
  _248 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `boidsAndWildlifeSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0649692712906058 - nodes in this community are weakly interconnected._