# Graph Report - TheMan  (2026-11-01)

## Corpus Check
- 158 files · ~288,678 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1391 nodes · 3876 edges · 81 communities (51 shown, 30 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ffa6f1f8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- boidsAndWildlifeSystem.ts
- GameSettingsModal.tsx
- terrainMath.test.ts
- swordAttackAnimationSystem.ts
- AppServicesContext.spec.ts
- collisionAndTerraces.ts
- JaguarAnimator
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
- windowDebugController.spec.ts
- terrainAndBiomeSystem.ts
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
- combatAndInventorySystem.ts
- src_world_terrainmath_arrowprojectile
- itemArtworkRegistry.tsx
- src_world_terrainmath_characterskillsstate
- CrocodileAnimator
- src_world_terrainmath_inventoryitemdef
- src_world_terrainmath_obstaclecylinder
- ref_domain_worldtypes
- src_world_domain_landmarksregistry_chinesefortressstairheightat
- src_world_terrainmath_solaratmosphere
- src_world_terrainmath_playerstate
- src_world_terrainmath_rideablehorsestate
- src_world_terrainmath_weatherstatesnapshot
- playerPhysicsSystem.ts
- Jaguar.ts
- IPlayerState
- src_world_terrainmath_walkpacemode
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
- ref_node_test
- dwarvenMineAndCaravanSystem.ts
- MockErrorLogger
- horsePhysicsSystem.ts
- t
- MockLogger
- interpolation.spec.ts
- WolfAnimator
- labModelFactory.ts
- getEffectiveLabAnimationSpeed
- vite.config.ts
- wildlifeAndFootprintsBuilder.ts
- תיקיית מודלים תלת-ממדיים (`public/models`)
- src_world_terrainmath_archery_targets
- App.tsx
- src_locales_index_he
- movementIntent.spec.ts
- WorldCanvas
- weaponFeelSystem.spec.ts

## God Nodes (most connected - your core abstractions)
1. `WorldCanvas` - 57 edges
2. `t()` - 49 edges
3. `groundHeightAt()` - 43 edges
4. `walkableHeightAt()` - 42 edges
5. `three` - 35 edges
6. `DeerAnimator` - 33 edges
7. `IPlayerState` - 31 edges
8. `NatureSoundEngine` - 31 edges
9. `ILogger` - 25 edges
10. `registerWindowDebugBridge()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `saveGameSettings()` --calls--> `validateGameSettings()`  [EXTRACTED]
  vite.config.ts → src/config/persistedSettingsValidation.ts
- `saveLabOverrides()` --calls--> `validateLabOverrides()`  [EXTRACTED]
  vite.config.ts → src/config/persistedSettingsValidation.ts
- `IErrorBoundaryProps` --references--> `ILogger`  [EXTRACTED]
  src/components/ErrorBoundary.tsx → src/core/ILogger.ts
- `IWeatherOptionDef` --references--> `WeatherToggleOption`  [EXTRACTED]
  src/components/GameShellOverlay.tsx → src/world/domain/worldTypes.ts
- `IGameLoopOptions` --references--> `ILogger`  [EXTRACTED]
  src/core/gameLoop.ts → src/core/ILogger.ts

## Import Cycles
- None detected.

## Communities (81 total, 30 thin omitted)

### Community 0 - "boidsAndWildlifeSystem.ts"
Cohesion: 0.06
Nodes (65): ref_node_fs, ref_node_os, ref_node_path, ref_node_url, assertMatchesGolden(), normalizeForGolden(), createInput(), createTestBridgeDeps() (+57 more)

### Community 1 - "GameSettingsModal.tsx"
Cohesion: 0.18
Nodes (15): GameSettingsModal(), IGameSettingsModalProps, IKeybindRowMeta, KEYBIND_CATEGORIES, KEYBIND_ROWS, KeybindCategory, DEFAULT_GAME_KEYBINDINGS, FirefliesMode (+7 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.05
Nodes (42): LAKESIDE_TEA_PAVILION_POS, ISettlementModelHandles, src_world_terrainmath_bear_mountain_caves, src_world_terrainmath_birch_grove_center, src_world_terrainmath_birchgrovefactorat, src_world_terrainmath_chinesefortressstairheightat, src_world_terrainmath_computehorsebiomechanicalpose, src_world_terrainmath_computeweatherstate (+34 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.09
Nodes (33): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+25 more)

### Community 4 - "AppServicesContext.spec.ts"
Cohesion: 0.12
Nodes (15): react, ref_react_dom_client, ref_react_dom_server, App(), AppServicesContext, AppServicesProvider, LoggerProbe(), useAppServices() (+7 more)

### Community 5 - "collisionAndTerraces.ts"
Cohesion: 0.16
Nodes (18): ARCHERY_TARGETS, CHINESE_FORTRESS_POS, CORNER_WATCHTOWERS, FORTRESS_Y_OFFSET, FORTRESS_Z_OFFSET, isChineseFortressWalkableZone(), FORTRESS_DOORS, isOnWatchtowerLadder() (+10 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.07
Nodes (41): _camTargetLook, _euler, _sunVec, createAnimationFrameScheduler(), createGpuFencePacedScheduler(), MIN_BOW_DRAW_TO_SHOOT, src_world_terrainmath_arrowelementkind, src_world_terrainmath_assignhotbarslot (+33 more)

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
Nodes (9): GameLoop, IFixedStepOptions, IFrameScheduler, IGameLoopOptions, createFixedHarness(), createHarness(), FakeScheduler, RecordingLogger (+1 more)

### Community 13 - "labCatalog.ts"
Cohesion: 0.17
Nodes (24): CAMERA_PRESETS, CharacterLabView(), ENVIRONMENT_PRESETS, ICharacterLabViewProps, SPEED_OPTIONS, countActivePoseOverrides(), createInitialLabSessionState(), EDITOR_LABEL_FIELDS (+16 more)

### Community 14 - "config.ts"
Cohesion: 0.35
Nodes (10): clamp(), IValidatedPositionOverride, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS, URL_SEASON_OFFSETS, URL_WEATHER_MAP (+2 more)

### Community 15 - "worldTypes.ts"
Cohesion: 0.11
Nodes (26): IValidatedUrlOverrides, ITelemetrySnapshot, ArrowElementKind, BiomeType, DEFAULT_STARTER_OWNED_ITEM_IDS, EquippedToolSlot, FIRST_MARKET_CATALOG_ITEM, IArrowTrailPoint (+18 more)

### Community 16 - "proceduralModels.ts"
Cohesion: 0.06
Nodes (92): three, ref_three_addons_environments_roomenvironment_js, buildColliderDebugWireframes(), IColliderDebugHandles, buildDwarvenKingdomAndMiners(), buildPlayerAndCombatSystems(), attachFlagHorizontalWaveShader(), attachWindSwayShader() (+84 more)

### Community 17 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, tailwindcss, @tailwindcss/vite, tsx, @types/node, @types/react, @types/react-dom, @types/three (+3 more)

### Community 18 - "windowDebugController.spec.ts"
Cohesion: 0.11
Nodes (20): ref_three_addons_objects_sky_js, IWildlifeSoundCallbacks, applyDynamicAtmosphereToScene(), _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor (+12 more)

### Community 19 - "terrainAndBiomeSystem.ts"
Cohesion: 0.16
Nodes (26): CLEAR_ZONES, FLAT_BUILDING_TERRACES, BEAR_MOUNTAIN_CAVES, BIRCH_GROVE_CENTER, CROCODILE_RIVER_BEND_POS, MAGIC_STONE_CIRCLE_POS, PLAYABLE_RADIUS, PLAYER_EYE_HEIGHT (+18 more)

### Community 21 - "GameShellOverlay.tsx"
Cohesion: 0.10
Nodes (30): IWeatherOptionDef, SEASON_OPTIONS, SkyrimModalMode, WEATHER_OPTIONS, renderArtifactArtwork(), formatMarketError(), InventoryCategoryTab, ISkyrimInventoryModalProps (+22 more)

### Community 22 - "TheMan — 3D Living Nature & RPG World Simulator"
Cohesion: 0.29
Nodes (6): Engineering standards, Getting Started, Installation & Run, Overview & Architecture, Prerequisites, TheMan — 3D Living Nature & RPG World Simulator

### Community 27 - "worldClockSystem.ts"
Cohesion: 0.22
Nodes (10): isBindingHeld(), matchesKeyBinding(), MODIFIER_FAMILIES, advanceSleepClock(), advanceWorldClock(), isSleepingAllowedAt(), PLAY_CLOCK_HOURS_PER_SECOND, SLEEP_CLOCK_HOURS_PER_SECOND (+2 more)

### Community 28 - "telemetryStore.ts"
Cohesion: 0.33
Nodes (5): INITIAL_TELEMETRY_SNAPSHOT, ITelemetryStore, telemetryStore, TelemetrySnapshot, src_world_terrainmath_world_spawn

### Community 30 - "persistedSettingsValidation.ts"
Cohesion: 0.15
Nodes (19): ANIMATION_SPEED_RANGE, CAMERA_PERSPECTIVES, FIREFLIES_MODES, GameSettingsValidationError, isNumberInRange(), isOneOf(), isPlainObject(), JUMP_FORCE_RANGE (+11 more)

### Community 34 - "combatAndInventorySystem.ts"
Cohesion: 0.10
Nodes (27): IArcheryTargetDef, IArrowProjectile, getActiveWorldAnimals(), ARCHERY_TARGETS_SPATIAL_GRID, arrowFireStrategy, arrowNormalStrategy, arrowWindStrategy, bowStrategy (+19 more)

### Community 36 - "itemArtworkRegistry.tsx"
Cohesion: 0.12
Nodes (7): GameShellOverlay, ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy, renderItemSvgIcon(), useTelemetry()

### Community 47 - "playerPhysicsSystem.ts"
Cohesion: 0.18
Nodes (14): SOLID_BUILDING_BOXES, chineseFortressStairHeightAt(), findLookedAtWatchtowerLadder(), findWatchtowerLadderAt(), getLadderById(), RIDEABLE_HORSES, IPlayerInput, ISkillProgressionResult (+6 more)

### Community 48 - "Jaguar.ts"
Cohesion: 0.12
Nodes (12): CLIP_ORDER, createReadyJaguar(), Jaguar, JAGUAR_EMBEDDED_PACK_B64, JAGUAR_EMBEDDED_TEXTURE_URI, JAGUAR_GAITS, JAGUAR_STATES, JaguarOptions (+4 more)

### Community 49 - "IPlayerState"
Cohesion: 0.12
Nodes (9): IPlayerAndCombatHandle, IPlayerState, ArrowEquipmentStrategy, BowEquipmentStrategy, IEquipmentSlotStrategy, isInventoryItemEquipped(), SwordEquipmentStrategy, ToolEquipmentStrategy (+1 more)

### Community 51 - "Rhino.ts"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyRhino(), Rhino, RHINO_EMBEDDED_PACK_B64, RHINO_EMBEDDED_TEXTURE_URI, RHINO_GAITS, RHINO_STATES, RhinoAnimator (+5 more)

### Community 52 - "playerAndCombatBuilder.ts"
Cohesion: 0.17
Nodes (11): SAVED_LAB_OVERRIDES, IPlayerAndCombatBuilderContext, ARROW_TRAIL_MAX_AGE, LOCKED_SWORD_GRIP_TRANSFORM, src_world_terrainmath_arrow_trail_max_age, src_world_terrainmath_computefirstpersonswordattackpose, src_world_terrainmath_computeslopepitchandroll, src_world_terrainmath_getsurfacenormalat (+3 more)

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
Cohesion: 0.14
Nodes (11): createReadyCrocodile(), CROC_EMBEDDED_PACK_B64, CROC_EMBEDDED_TEXTURE_URI, Crocodile, CROCODILE_GAITS, CROCODILE_STATES, CrocodileOptions, CrocodileRig (+3 more)

### Community 62 - "ref_node_test"
Cohesion: 0.15
Nodes (7): ref_node_assert_strict, ref_node_test, createAppServices(), ConsoleLogger, ILogger, NullLogger, src_world_terrainmath_biometype

### Community 63 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.13
Nodes (21): IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig, DWARVEN_GUARDIAN_STATUES, DWARVEN_STONE_HOUSES, SOUTHERN_MINE_POS, IDwarvenMinerCaravanState, buildMinerWaypoints() (+13 more)

### Community 65 - "horsePhysicsSystem.ts"
Cohesion: 0.29
Nodes (8): computeHorseBiomechanicalPose(), computeHorseTurnResistance(), IHorseBiomechanicalPose, IHorseLimbAngles, IHorseSteeringStepResult, solveForelimb(), solveHindlimb(), stepMountedHorseSteering()

### Community 66 - "t"
Cohesion: 0.12
Nodes (18): ExplorerMinimap, GRID_SIZE, IExplorerMinimapProps, horseSkinsFromWorld, en, LocaleSchema, getLocaleDictionary(), setLocaleDictionary() (+10 more)

### Community 69 - "WolfAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyWolf(), unpackWolfBundle(), Wolf, WOLF_EMBEDDED_PACK_B64, WOLF_EMBEDDED_TEXTURE_URI, WOLF_GAITS, WOLF_STATES (+5 more)

### Community 70 - "labModelFactory.ts"
Cohesion: 0.27
Nodes (13): ref_three_examples_jsm_environments_roomenvironment_js, ICharacterLabCanvasProps, ILabAnimationDef, ILabEntityDef, ILabPoseOverrides, ILabSkinDef, LabCameraPreset, LabStageEnvironment (+5 more)

### Community 71 - "getEffectiveLabAnimationSpeed"
Cohesion: 0.70
Nodes (5): CharacterLabCanvas(), afterDraw(), tick(), computeLabAnimationCycleProgress(), getEffectiveLabAnimationSpeed()

### Community 72 - "vite.config.ts"
Cohesion: 0.15
Nodes (14): ref_node_fs_promises, ref_node_http, ref_path, @tailwindcss/vite, vite, @vitejs/plugin-react, assertTrustedJsonRequest(), PERSISTENCE_ROUTES (+6 more)

### Community 73 - "wildlifeAndFootprintsBuilder.ts"
Cohesion: 0.20
Nodes (14): DEFAULT_LAB_POSE_OVERRIDES, LAB_POSE_OVERRIDES_STORAGE_KEY, mergeStoredLabOverrides(), StoredLabOverridesError, buildWildlifeAndFootprintsLayer(), IWildlifeAndFootprintsHandles, IBoidBirdState, ISmallAnimalState (+6 more)

### Community 74 - "תיקיית מודלים תלת-ממדיים (`public/models`)"
Cohesion: 0.50
Nodes (3): מבנה תיקיות מומלץ (אופציונלי, או ישירות בתיקייה זו):, פורמטים מומלצים:, תיקיית מודלים תלת-ממדיים (`public/models`)

### Community 76 - "App.tsx"
Cohesion: 0.33
Nodes (8): CharacterLabView, WEATHER_CYCLE_ORDER, IGameShellOverlayProps, IWorldCanvasProps, GameStateMode, IVirtualMoveState, IGameActions, src_world_terrainmath_igameactions

### Community 79 - "movementIntent.spec.ts"
Cohesion: 0.47
Nodes (4): IMovementAxes, readMovementAxes(), BINDINGS, NO_JOYSTICK

### Community 81 - "WorldCanvas"
Cohesion: 0.22
Nodes (18): WorldCanvas, buildTelemetrySnapshot(), registerWindowDebugBridge(), findNearestBed(), findNearestFortressDoor(), findNearestMarketStall(), findNearestDeadLootableAnimal(), getAnimalSpeciesName() (+10 more)

### Community 82 - "weaponFeelSystem.spec.ts"
Cohesion: 0.60
Nodes (3): IMeleeFeelInput, stepBowFeel(), stepMeleeFeelAndSway()

## Knowledge Gaps
- **222 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+217 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 440 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `proceduralModels.ts` to `terrainMath.test.ts`, `WolfAnimator`, `labModelFactory.ts`, `WorldCanvas.tsx`, `package.json`, `wildlifeAndFootprintsBuilder.ts`, `Deer_Complete.ts`, `Jaguar.ts`, `windowDebugController.spec.ts`, `Rhino.ts`, `playerAndCombatBuilder.ts`, `DemonDragon_Complete.ts`, `ForestDragon_Complete.ts`, `BearAnimator`, `Crocodile.ts`, `dwarvenMineAndCaravanSystem.ts`?**
  _High betweenness centrality (0.204) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `boidsAndWildlifeSystem.ts`, `GameSettingsModal.tsx`, `combatAndInventorySystem.ts`, `AppServicesContext.spec.ts`, `itemArtworkRegistry.tsx`, `collisionAndTerraces.ts`, `WorldCanvas.tsx`, `labCatalog.ts`, `playerPhysicsSystem.ts`, `worldTypes.ts`, `WorldCanvas`, `proceduralModels.ts`, `terrainAndBiomeSystem.ts`, `GameShellOverlay.tsx`, `telemetryStore.ts`, `dwarvenMineAndCaravanSystem.ts`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `ILogger` connect `ref_node_test` to `MockErrorLogger`, `GameSettingsModal.tsx`, `MockLogger`, `AppServicesContext.spec.ts`, `wildlifeAndFootprintsBuilder.ts`, `GameLoop`, `proceduralModels.ts`, `NatureSoundEngine`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `WorldCanvas` (e.g. with `.start()` and `.stop()`) actually correct?**
  _`WorldCanvas` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _222 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `boidsAndWildlifeSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06210526315789474 - nodes in this community are weakly interconnected._
- **Should `terrainMath.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0507399577167019 - nodes in this community are weakly interconnected._