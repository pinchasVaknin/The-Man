# Graph Report - TheMan  (2026-11-02)

## Corpus Check
- 172 files · ~291,379 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: .glb 8, (none) 3, .example 1)

## Summary
- 1431 nodes · 4081 edges · 92 communities (60 shown, 32 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3021fa5d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- boidsAndWildlifeSystem.ts
- GameSettingsModal.tsx
- terrainMath.test.ts
- swordAttackAnimationSystem.ts
- main.tsx
- terrainAndBiomeSystem.ts
- InfrastructureCorruptedException
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
- DeerAnimator
- landmarksRegistry.ts
- src_world_terrainmath_cameraperspectivemode
- SkyrimInventoryModal.tsx
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
- WorldCanvas
- src_world_terrainmath_arrowprojectile
- itemArtworkRegistry.tsx
- src_world_terrainmath_characterskillsstate
- collisionAndTerraces.ts
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
- DemonDragon
- src_world_terrainmath_dynamicatmospherestate
- ForestDragon_Complete.ts
- scripts
- SpatialHashGrid2D
- dependencies
- Bear_Complete.ts
- Crocodile_Complete.ts
- src_world_terrainmath_getanimalspeciesnamehe
- ref_node_test
- dwarvenMineAndCaravanSystem.ts
- ILogger
- horsePhysicsSystem.ts
- t
- deferredAnimalModel.spec.ts
- interpolation.spec.ts
- Wolf_Complete.ts
- IPlayerState
- Rhino_Complete.ts
- vite.config.ts
- playerAndCombatBuilder.ts
- 3D model files (`public/models`)
- src_world_terrainmath_archery_targets
- GameShellOverlay.tsx
- src_locales_index_he
- CharacterLabCanvas.tsx
- BearAnimator
- JaguarAnimator
- registerWindowDebugBridge
- weaponFeelSystem.spec.ts
- WolfAnimator
- wildlifeAndFootprintsBuilder.ts
- CrocodileAnimator
- createAnimalTexture
- labOverridesStorage.ts
- animalModels.characterization.spec.ts
- highlandBridgeLandmarks.ts
- movementIntent.spec.ts
- keyBindingMatch.ts

## God Nodes (most connected - your core abstractions)
1. `WorldCanvas` - 57 edges
2. `t()` - 48 edges
3. `groundHeightAt()` - 43 edges
4. `walkableHeightAt()` - 42 edges
5. `three` - 39 edges
6. `ILogger` - 33 edges
7. `DeerAnimator` - 33 edges
8. `IPlayerState` - 31 edges
9. `NatureSoundEngine` - 31 edges
10. `registerWindowDebugBridge()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `saveGameSettings()` --calls--> `validateGameSettings()`  [EXTRACTED]
  vite.config.ts → src/config/persistedSettingsValidation.ts
- `saveLabOverrides()` --calls--> `validateLabOverrides()`  [EXTRACTED]
  vite.config.ts → src/config/persistedSettingsValidation.ts
- `IErrorBoundaryProps` --references--> `ILogger`  [EXTRACTED]
  src/components/ErrorBoundary.tsx → src/core/ILogger.ts
- `IGameSettingsModalProps` --references--> `IGameSettingsConfig`  [EXTRACTED]
  src/components/GameSettingsModal.tsx → src/config/savedGameSettings.ts
- `IGameLoopOptions` --references--> `ILogger`  [EXTRACTED]
  src/core/gameLoop.ts → src/core/ILogger.ts

## Import Cycles
- None detected.

## Communities (92 total, 32 thin omitted)

### Community 0 - "boidsAndWildlifeSystem.ts"
Cohesion: 0.05
Nodes (67): ref_node_fs, ref_node_os, ref_node_path, ref_node_url, assertMatchesGolden(), normalizeForGolden(), applyDynamicAtmosphereToScene(), createInput() (+59 more)

### Community 1 - "GameSettingsModal.tsx"
Cohesion: 0.17
Nodes (13): GameSettingsModal(), IGameSettingsModalProps, IKeybindRowMeta, KEYBIND_CATEGORIES, KEYBIND_ROWS, KeybindCategory, DEFAULT_GAME_KEYBINDINGS, FirefliesMode (+5 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.05
Nodes (43): LAKESIDE_TEA_PAVILION_POS, RIDEABLE_HORSES, src_world_terrainmath_bear_mountain_caves, src_world_terrainmath_birch_grove_center, src_world_terrainmath_birchgrovefactorat, src_world_terrainmath_chinese_fortress_pos, src_world_terrainmath_chinesefortressstairheightat, src_world_terrainmath_computehorsebiomechanicalpose (+35 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.09
Nodes (33): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+25 more)

### Community 4 - "main.tsx"
Cohesion: 0.15
Nodes (7): ref_react_dom_client, ErrorBoundary, IErrorBoundaryProps, IErrorBoundaryState, src_index, appServices, rootElement

### Community 5 - "terrainAndBiomeSystem.ts"
Cohesion: 0.19
Nodes (24): chineseFortressStairHeightAt(), isChineseFortressWalkableZone(), ropeBridgePointInfoAt(), findLookedAtWatchtowerLadder(), findWatchtowerLadderAt(), getLadderById(), isInsideSouthernMine(), findNearestRideableHorse() (+16 more)

### Community 6 - "InfrastructureCorruptedException"
Cohesion: 0.18
Nodes (9): InfrastructureCorruptedException, IFixedStepOptions, IGameLoopOptions, createTickErrorGuard(), ITickErrorGuard, TickErrorDecision, fetchAnimalModelFromServer(), requireProceduralGeometry() (+1 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.07
Nodes (43): _camTargetLook, _euler, _sunVec, createAnimationFrameScheduler(), createGpuFencePacedScheduler(), buildTelemetrySnapshot(), findNearestFortressDoor(), findNearestDeadLootableAnimal() (+35 more)

### Community 8 - "Result"
Cohesion: 0.25
Nodes (3): AppException, InvalidResultAccessException, Result

### Community 9 - "package.json"
Cohesion: 0.15
Nodes (12): name, private, type, version, react-dom, tailwindcss, tsx, @types/node (+4 more)

### Community 10 - "Deer_Complete.ts"
Cohesion: 0.07
Nodes (35): getLoadedAnimalModel(), BoneDef, BoneGroup, BoneName, Chain, CHAINS, computeDeerSkinWeights(), createReadyDeer() (+27 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "GameLoop"
Cohesion: 0.15
Nodes (6): GameLoop, IFrameScheduler, createFixedHarness(), createHarness(), FakeScheduler, RecordingLogger

### Community 13 - "labCatalog.ts"
Cohesion: 0.16
Nodes (25): CAMERA_PRESETS, CharacterLabView(), ENVIRONMENT_PRESETS, ICharacterLabViewProps, SPEED_OPTIONS, countActivePoseOverrides(), createInitialLabSessionState(), EDITOR_LABEL_FIELDS (+17 more)

### Community 14 - "config.ts"
Cohesion: 0.35
Nodes (10): clamp(), IValidatedPositionOverride, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS, URL_SEASON_OFFSETS, URL_WEATHER_MAP (+2 more)

### Community 15 - "worldTypes.ts"
Cohesion: 0.12
Nodes (26): IValidatedUrlOverrides, ITelemetrySnapshot, ArrowElementKind, BiomeType, CameraPerspectiveMode, createCatalogItem(), DEFAULT_STARTER_OWNED_ITEM_IDS, EquippedToolSlot (+18 more)

### Community 16 - "proceduralModels.ts"
Cohesion: 0.06
Nodes (86): three, ref_three_addons_environments_roomenvironment_js, buildColliderDebugWireframes(), IColliderDebugHandles, buildDwarvenKingdomAndMiners(), IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig (+78 more)

### Community 17 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, tailwindcss, @tailwindcss/vite, tsx, @types/node, @types/react, @types/react-dom, @types/three (+3 more)

### Community 18 - "DeerAnimator"
Cohesion: 0.15
Nodes (3): DeerAnimator, DeerRig, ss()

### Community 19 - "landmarksRegistry.ts"
Cohesion: 0.16
Nodes (23): SOLID_BUILDING_BOXES, BEAR_MOUNTAIN_CAVES, BIRCH_GROVE_CENTER, CROCODILE_RIVER_BEND_POS, MAGIC_STONE_CIRCLE_POS, PLAYABLE_RADIUS, PLAYER_EYE_HEIGHT, SMALL_MEADOW_HILLS (+15 more)

### Community 21 - "SkyrimInventoryModal.tsx"
Cohesion: 0.11
Nodes (23): renderArtifactArtwork(), formatMarketError(), ISkyrimInventoryModalProps, ITEM_SHORT_NAMES, NON_SELLABLE_STARTER_IDS, SkyrimInventoryModal, IBuyMarketItemPayload, IInventoryItemDef (+15 more)

### Community 22 - "TheMan — 3D Living Nature & RPG World Simulator"
Cohesion: 0.29
Nodes (6): Engineering standards, Getting Started, Installation & Run, Overview & Architecture, Prerequisites, TheMan — 3D Living Nature & RPG World Simulator

### Community 27 - "worldClockSystem.ts"
Cohesion: 0.36
Nodes (7): advanceSleepClock(), advanceWorldClock(), isSleepingAllowedAt(), PLAY_CLOCK_HOURS_PER_SECOND, SLEEP_CLOCK_HOURS_PER_SECOND, TITLE_CLOCK_HOURS_PER_SECOND, WAKE_UP_HOUR

### Community 28 - "telemetryStore.ts"
Cohesion: 0.33
Nodes (5): INITIAL_TELEMETRY_SNAPSHOT, ITelemetryStore, telemetryStore, TelemetrySnapshot, src_world_terrainmath_world_spawn

### Community 30 - "persistedSettingsValidation.ts"
Cohesion: 0.15
Nodes (19): ANIMATION_SPEED_RANGE, CAMERA_PERSPECTIVES, FIREFLIES_MODES, GameSettingsValidationError, isNumberInRange(), isOneOf(), isPlainObject(), JUMP_FORCE_RANGE (+11 more)

### Community 34 - "WorldCanvas"
Cohesion: 0.18
Nodes (20): WorldCanvas, getActiveWorldAnimals(), computeTargetFov(), createCameraPose(), createCameraRigState(), easeFovToward(), ICameraPose, ICameraRigState (+12 more)

### Community 36 - "itemArtworkRegistry.tsx"
Cohesion: 0.14
Nodes (4): ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy

### Community 38 - "collisionAndTerraces.ts"
Cohesion: 0.15
Nodes (20): CLEAR_ZONES, FLAT_BUILDING_TERRACES, DWARVEN_GUARDIAN_STATUES, DWARVEN_STONE_HOUSES, ARCHERY_TARGETS, CHINESE_FORTRESS_POS, CORNER_WATCHTOWERS, FORTRESS_Y_OFFSET (+12 more)

### Community 47 - "animalModelAssets.ts"
Cohesion: 0.11
Nodes (24): ref_node_fs_promises, ref_three_addons_loaders_gltfloader_js, CharacterLabView, MODELS_DIRECTORY, preloadAnimalModelsForTests(), readModelFromDisk(), ANIMAL_MODEL_IDS, AnimalModelFetcher (+16 more)

### Community 48 - "Jaguar_Complete.ts"
Cohesion: 0.13
Nodes (9): CLIP_ORDER, createReadyJaguar(), Jaguar, JAGUAR_GAITS, JAGUAR_STATES, JaguarOptions, JaguarRig, JaguarState (+1 more)

### Community 49 - "combatAndInventorySystem.ts"
Cohesion: 0.08
Nodes (22): IArcheryTargetDef, ISmallAnimalState, ARCHERY_TARGETS_SPATIAL_GRID, arrowFireStrategy, arrowNormalStrategy, arrowWindStrategy, bowStrategy, cloakStrategy (+14 more)

### Community 52 - "atmosphereRenderController.ts"
Cohesion: 0.12
Nodes (18): ref_three_addons_objects_sky_js, IPlayerAndCombatHandle, _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor, IHudTelemetryInput (+10 more)

### Community 53 - "DemonDragon"
Cohesion: 0.14
Nodes (3): DemonDragon, DemonDragonAnimator, DemonDragonRig

### Community 55 - "ForestDragon_Complete.ts"
Cohesion: 0.11
Nodes (10): CLIP_ORDER, FOREST_DRAGON_GAITS, ForestDragon, ForestDragonAnimator, ForestDragonOptions, ForestDragonRig, ForestDragonState, ForestDragonUnpackedData (+2 more)

### Community 56 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, preview, test

### Community 58 - "dependencies"
Cohesion: 0.50
Nodes (4): dependencies, react, react-dom, three

### Community 59 - "Bear_Complete.ts"
Cohesion: 0.14
Nodes (8): Bear, BEAR_GAITS, BEAR_STATES, BearOptions, BearRig, BearState, BearUnpackedData, CLIP_ORDER

### Community 60 - "Crocodile_Complete.ts"
Cohesion: 0.15
Nodes (8): createReadyCrocodile(), Crocodile, CROCODILE_GAITS, CROCODILE_STATES, CrocodileOptions, CrocodileRig, CrocodileState, CrocodileUnpackedData

### Community 62 - "ref_node_test"
Cohesion: 0.13
Nodes (14): ref_node_assert_strict, ref_node_test, react, ref_react_dom_server, App(), AppServicesContext, AppServicesProvider, LoggerProbe() (+6 more)

### Community 63 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.24
Nodes (10): SOUTHERN_MINE_POS, buildMinerWaypoints(), CaravanPath, DWARVEN_MINER_STATIONS, IMinerStationConfig, MinerStationConfig, PRECOMPUTED_CARAVAN_TO_HOME, PRECOMPUTED_CARAVAN_TO_MINE (+2 more)

### Community 64 - "ILogger"
Cohesion: 0.12
Nodes (4): MockErrorLogger, ILogger, AttachDeerGlbOptions, MockLogger

### Community 65 - "horsePhysicsSystem.ts"
Cohesion: 0.29
Nodes (8): computeHorseBiomechanicalPose(), computeHorseTurnResistance(), IHorseBiomechanicalPose, IHorseLimbAngles, IHorseSteeringStepResult, solveForelimb(), solveHindlimb(), stepMountedHorseSteering()

### Community 66 - "t"
Cohesion: 0.20
Nodes (11): ExplorerMinimap, GRID_SIZE, IExplorerMinimapProps, en, LocaleSchema, getLocaleDictionary(), setLocaleDictionary(), t() (+3 more)

### Community 67 - "deferredAnimalModel.spec.ts"
Cohesion: 0.12
Nodes (4): DeferredAnimalModel, IAnimatedAnimalModel, FakeModel, RecordingLogger

### Community 69 - "Wolf_Complete.ts"
Cohesion: 0.14
Nodes (8): CLIP_ORDER, Wolf, WOLF_GAITS, WOLF_STATES, WolfOptions, WolfRig, WolfState, WolfUnpackedData

### Community 70 - "IPlayerState"
Cohesion: 0.18
Nodes (8): InventoryItemId, IPlayerState, ICameraRigFrameInput, ArrowEquipmentStrategy, BowEquipmentStrategy, IEquipmentSlotStrategy, SwordEquipmentStrategy, ToolEquipmentStrategy

### Community 71 - "Rhino_Complete.ts"
Cohesion: 0.14
Nodes (8): IClipRigModelData, CLIP_ORDER, Rhino, RHINO_GAITS, RHINO_STATES, RhinoOptions, RhinoState, RhinoUnpackedData

### Community 72 - "vite.config.ts"
Cohesion: 0.16
Nodes (13): ref_node_http, ref_path, @tailwindcss/vite, vite, @vitejs/plugin-react, assertTrustedJsonRequest(), PERSISTENCE_ROUTES, PersistenceErrorCode (+5 more)

### Community 73 - "playerAndCombatBuilder.ts"
Cohesion: 0.13
Nodes (14): SAVED_LAB_OVERRIDES, IPlayerAndCombatBuilderContext, ARROW_TRAIL_MAX_AGE, LOCKED_SWORD_GRIP_TRANSFORM, src_world_terrainmath_arrow_trail_max_age, src_world_terrainmath_arrowelementkind, src_world_terrainmath_computefirstpersonswordattackpose, src_world_terrainmath_computeslopepitchandroll (+6 more)

### Community 76 - "GameShellOverlay.tsx"
Cohesion: 0.17
Nodes (21): WEATHER_CYCLE_ORDER, GameShellOverlay, IGameShellOverlayProps, IWeatherOptionDef, SEASON_OPTIONS, SkyrimModalMode, WEATHER_OPTIONS, renderItemSvgIcon() (+13 more)

### Community 78 - "CharacterLabCanvas.tsx"
Cohesion: 0.26
Nodes (14): ref_three_examples_jsm_environments_roomenvironment_js, CharacterLabCanvas(), afterDraw(), tick(), ICharacterLabCanvasProps, computeLabAnimationCycleProgress(), getEffectiveLabAnimationSpeed(), ILabAnimationDef (+6 more)

### Community 81 - "registerWindowDebugBridge"
Cohesion: 0.29
Nodes (9): registerWindowDebugBridge(), findNearestMarketStall(), assignHotbarSlot(), buyMarketItem(), equipInventoryItem(), MarketTransactionResult, sellMarketItem(), toggleFavoriteItem() (+1 more)

### Community 82 - "weaponFeelSystem.spec.ts"
Cohesion: 0.60
Nodes (3): IMeleeFeelInput, stepBowFeel(), stepMeleeFeelAndSway()

### Community 84 - "wildlifeAndFootprintsBuilder.ts"
Cohesion: 0.30
Nodes (12): buildLabEntityRig(), computeGroupStats(), buildWildlifeAndFootprintsLayer(), IWildlifeAndFootprintsHandles, isAnimalModelLoaded(), createReadyBear(), createReadyRhino(), createReadyWolf() (+4 more)

### Community 86 - "createAnimalTexture"
Cohesion: 0.29
Nodes (10): createAnimalTexture(), requireClipRig(), CLIP_ORDER, createReadyDemonDragon(), DEMON_DRAGON_GAITS, DemonDragonOptions, DemonDragonState, DemonDragonUnpackedData (+2 more)

### Community 87 - "labOverridesStorage.ts"
Cohesion: 0.36
Nodes (5): validateLabOverrides(), DEFAULT_LAB_POSE_OVERRIDES, LAB_POSE_OVERRIDES_STORAGE_KEY, mergeStoredLabOverrides(), StoredLabOverridesError

### Community 88 - "animalModels.characterization.spec.ts"
Cohesion: 0.43
Nodes (4): fingerprint(), IAnimatedModel, poseOf(), sumOf()

### Community 89 - "highlandBridgeLandmarks.ts"
Cohesion: 0.29
Nodes (5): HILL_BRIDGE_COS, HILL_BRIDGE_SIN, HILL_BRIDGE_YAW, HILL_WATCHTOWERS, ROPE_BRIDGE_DEF

### Community 90 - "movementIntent.spec.ts"
Cohesion: 0.47
Nodes (4): IMovementAxes, readMovementAxes(), BINDINGS, NO_JOYSTICK

### Community 91 - "keyBindingMatch.ts"
Cohesion: 0.70
Nodes (3): isBindingHeld(), matchesKeyBinding(), MODIFIER_FAMILIES

## Knowledge Gaps
- **224 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+219 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 455 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `proceduralModels.ts` to `terrainMath.test.ts`, `WorldCanvas.tsx`, `package.json`, `Deer_Complete.ts`, `animalModelAssets.ts`, `Jaguar_Complete.ts`, `atmosphereRenderController.ts`, `ForestDragon_Complete.ts`, `Bear_Complete.ts`, `Crocodile_Complete.ts`, `ref_node_test`, `deferredAnimalModel.spec.ts`, `Wolf_Complete.ts`, `Rhino_Complete.ts`, `playerAndCombatBuilder.ts`, `CharacterLabCanvas.tsx`, `wildlifeAndFootprintsBuilder.ts`, `createAnimalTexture`, `animalModels.characterization.spec.ts`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **Why does `ILogger` connect `ILogger` to `GameSettingsModal.tsx`, `deferredAnimalModel.spec.ts`, `main.tsx`, `InfrastructureCorruptedException`, `Deer_Complete.ts`, `GameLoop`, `proceduralModels.ts`, `wildlifeAndFootprintsBuilder.ts`, `NatureSoundEngine`, `ref_node_test`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `boidsAndWildlifeSystem.ts`, `GameSettingsModal.tsx`, `WorldCanvas`, `main.tsx`, `terrainAndBiomeSystem.ts`, `collisionAndTerraces.ts`, `WorldCanvas.tsx`, `GameShellOverlay.tsx`, `labCatalog.ts`, `worldTypes.ts`, `combatAndInventorySystem.ts`, `SkyrimInventoryModal.tsx`, `highlandBridgeLandmarks.ts`, `telemetryStore.ts`, `dwarvenMineAndCaravanSystem.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `WorldCanvas` (e.g. with `.start()` and `.stop()`) actually correct?**
  _`WorldCanvas` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _224 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `boidsAndWildlifeSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05462962962962963 - nodes in this community are weakly interconnected._
- **Should `terrainMath.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.049494949494949494 - nodes in this community are weakly interconnected._