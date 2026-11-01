# Graph Report - TheMan  (2026-11-01)

## Corpus Check
- 149 files · ~281,171 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1360 nodes · 3765 edges · 80 communities (54 shown, 26 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1ac10676`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- combatAndInventorySystem.ts
- App.tsx
- terrainMath.test.ts
- swordAttackAnimationSystem.ts
- MockErrorLogger
- hudTelemetryBuilder.ts
- collisionAndTerraces.ts
- WorldCanvas.tsx
- Result
- package.json
- Deer_Complete.ts
- compilerOptions
- GameLoop
- CharacterLabView.tsx
- config.ts
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
- worldClockSystem.ts
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
- WorldCanvas
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
- InventoryItemId
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
- ILogger
- dwarvenMineAndCaravanSystem.ts
- goldenMaster.ts
- horsePhysicsSystem.ts
- t
- settlementModels.ts
- gameLoop.ts
- WolfAnimator
- labCatalog.ts
- wildlifeAndFootprintsBuilder.ts
- vite.config.ts
- windowDebugController.spec.ts
- תיקיית מודלים תלת-ממדיים (`public/models`)
- src_world_terrainmath_archery_targets
- getEffectiveLabAnimationSpeed
- src_locales_index_he
- ref_node_test
- movementIntent.spec.ts

## God Nodes (most connected - your core abstractions)
1. `WorldCanvas` - 57 edges
2. `t()` - 49 edges
3. `groundHeightAt()` - 43 edges
4. `walkableHeightAt()` - 42 edges
5. `three` - 34 edges
6. `DeerAnimator` - 33 edges
7. `IPlayerState` - 30 edges
8. `NatureSoundEngine` - 27 edges
9. `registerWindowDebugBridge()` - 24 edges
10. `ILogger` - 19 edges

## Surprising Connections (you probably didn't know these)
- `saveGameSettings()` --calls--> `validateGameSettings()`  [EXTRACTED]
  vite.config.ts → src/config/persistedSettingsValidation.ts
- `saveLabOverrides()` --calls--> `validateLabOverrides()`  [EXTRACTED]
  vite.config.ts → src/config/persistedSettingsValidation.ts
- `IFootprintDecalState` --references--> `BiomeType`  [EXTRACTED]
  src/world/systems/footprintTrailSystem.ts → src/world/domain/worldTypes.ts
- `ISkillAccessor` --references--> `ICharacterSkillsState`  [EXTRACTED]
  src/world/systems/playerPhysicsSystem.ts → src/world/domain/worldTypes.ts
- `ISettlementModelHandles` --references--> `IRideableHorseState`  [EXTRACTED]
  src/world/models/settlementModels.ts → src/world/domain/worldTypes.ts

## Import Cycles
- None detected.

## Communities (80 total, 26 thin omitted)

### Community 0 - "combatAndInventorySystem.ts"
Cohesion: 0.05
Nodes (71): SOLID_BUILDING_BOXES, WORLD_SPAWN, IArcheryTargetDef, ISolidBuildingBox, activeWorldAnimalsRegistry, advanceAnimalWithWaterShoreRecovery(), AnimalAiBehavior, BIRD_FLOCK_CONFIGS (+63 more)

### Community 1 - "App.tsx"
Cohesion: 0.14
Nodes (20): react, App(), WEATHER_CYCLE_ORDER, GameSettingsModal(), IGameSettingsModalProps, IKeybindRowMeta, KEYBIND_CATEGORIES, KEYBIND_ROWS (+12 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.06
Nodes (30): src_world_terrainmath_birch_grove_center, src_world_terrainmath_birchgrovefactorat, src_world_terrainmath_chinese_fortress_pos, src_world_terrainmath_chinesefortressstairheightat, src_world_terrainmath_computeweatherstate, src_world_terrainmath_corner_watchtowers, src_world_terrainmath_createinitialplayerstate, src_world_terrainmath_default_weather_cycle_mode (+22 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.09
Nodes (33): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+25 more)

### Community 5 - "hudTelemetryBuilder.ts"
Cohesion: 0.24
Nodes (14): buildTelemetrySnapshot(), registerWindowDebugBridge(), findLookedAtWatchtowerLadder(), findNearestBed(), findNearestFortressDoor(), findNearestMarketStall(), findNearestDeadLootableAnimal(), getAnimalSpeciesName() (+6 more)

### Community 6 - "collisionAndTerraces.ts"
Cohesion: 0.17
Nodes (17): ARCHERY_TARGETS, CHINESE_FORTRESS_POS, CORNER_WATCHTOWERS, FORTRESS_Y_OFFSET, FORTRESS_Z_OFFSET, FORTRESS_DOORS, isOnWatchtowerLadder(), IWorldBedDef (+9 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.07
Nodes (36): ref_three_addons_environments_roomenvironment_js, _camTargetLook, _euler, _sunVec, isPositionUnderRoof(), src_world_terrainmath_assignhotbarslot, src_world_terrainmath_awardskillxp, src_world_terrainmath_buymarketitem (+28 more)

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

### Community 13 - "CharacterLabView.tsx"
Cohesion: 0.20
Nodes (18): CAMERA_PRESETS, CharacterLabView(), ENVIRONMENT_PRESETS, ICharacterLabViewProps, SPEED_OPTIONS, countActivePoseOverrides(), createInitialLabSessionState(), filterLabEntities() (+10 more)

### Community 14 - "config.ts"
Cohesion: 0.35
Nodes (10): clamp(), IValidatedPositionOverride, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS, URL_SEASON_OFFSETS, URL_WEATHER_MAP (+2 more)

### Community 15 - "worldTypes.ts"
Cohesion: 0.14
Nodes (23): IValidatedUrlOverrides, ITelemetrySnapshot, ArrowElementKind, BiomeType, CameraPerspectiveMode, DEFAULT_STARTER_OWNED_ITEM_IDS, EquippedToolSlot, FIRST_MARKET_CATALOG_ITEM (+15 more)

### Community 16 - "proceduralModels.ts"
Cohesion: 0.06
Nodes (90): three, buildColliderDebugWireframes(), IColliderDebugHandles, buildDwarvenKingdomAndMiners(), buildPlayerAndCombatSystems(), attachFlagHorizontalWaveShader(), attachWindSwayShader(), createBirchBarkTexture() (+82 more)

### Community 17 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, tailwindcss, @tailwindcss/vite, tsx, @types/node, @types/react, @types/react-dom, @types/three (+3 more)

### Community 18 - "atmosphereRenderController.ts"
Cohesion: 0.20
Nodes (9): ref_three_addons_objects_sky_js, _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor, src_world_terrainmath_computedynamicsolarcycle, src_world_terrainmath_idynamicatmospherestate (+1 more)

### Community 19 - "terrainAndBiomeSystem.ts"
Cohesion: 0.15
Nodes (27): CLEAR_ZONES, FLAT_BUILDING_TERRACES, BEAR_MOUNTAIN_CAVES, BIRCH_GROVE_CENTER, CROCODILE_RIVER_BEND_POS, MAGIC_STONE_CIRCLE_POS, PLAYABLE_RADIUS, PLAYER_EYE_HEIGHT (+19 more)

### Community 21 - "GameShellOverlay.tsx"
Cohesion: 0.11
Nodes (29): SEASON_OPTIONS, SkyrimModalMode, WEATHER_OPTIONS, renderArtifactArtwork(), formatMarketError(), InventoryCategoryTab, ISkyrimInventoryModalProps, ITEM_SHORT_NAMES (+21 more)

### Community 22 - "TheMan — 3D Living Nature & RPG World Simulator"
Cohesion: 0.29
Nodes (6): Engineering standards, Getting Started, Installation & Run, Overview & Architecture, Prerequisites, TheMan — 3D Living Nature & RPG World Simulator

### Community 27 - "worldClockSystem.ts"
Cohesion: 0.36
Nodes (7): advanceSleepClock(), advanceWorldClock(), isSleepingAllowedAt(), PLAY_CLOCK_HOURS_PER_SECOND, SLEEP_CLOCK_HOURS_PER_SECOND, TITLE_CLOCK_HOURS_PER_SECOND, WAKE_UP_HOUR

### Community 28 - "telemetryStore.ts"
Cohesion: 0.39
Nodes (4): INITIAL_TELEMETRY_SNAPSHOT, ITelemetryStore, telemetryStore, TelemetrySnapshot

### Community 30 - "persistedSettingsValidation.ts"
Cohesion: 0.14
Nodes (21): ANIMATION_SPEED_RANGE, CAMERA_PERSPECTIVES, FIREFLIES_MODES, GameSettingsValidationError, isNumberInRange(), isOneOf(), isPlainObject(), JUMP_FORCE_RANGE (+13 more)

### Community 34 - "playerPhysicsSystem.ts"
Cohesion: 0.14
Nodes (18): createInput(), findWatchtowerLadderAt(), getLadderById(), IPlayerInput, assignHotbarSlot(), createMarketEligiblePlayer(), toggleFavoriteItem(), createInitialPlayerState() (+10 more)

### Community 36 - "itemArtworkRegistry.tsx"
Cohesion: 0.12
Nodes (7): GameShellOverlay, ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy, renderItemSvgIcon(), useTelemetry()

### Community 38 - "WorldCanvas"
Cohesion: 0.23
Nodes (13): WorldCanvas, createAnimationFrameScheduler(), createGpuFencePacedScheduler(), computeTargetFov(), createCameraPose(), createCameraRigState(), easeFovToward(), ICameraPose (+5 more)

### Community 47 - "keyBindingMatch.ts"
Cohesion: 0.70
Nodes (3): isBindingHeld(), matchesKeyBinding(), MODIFIER_FAMILIES

### Community 48 - "JaguarAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyJaguar(), Jaguar, JAGUAR_EMBEDDED_PACK_B64, JAGUAR_EMBEDDED_TEXTURE_URI, JAGUAR_GAITS, JAGUAR_STATES, JaguarAnimator (+5 more)

### Community 49 - "InventoryItemId"
Cohesion: 0.15
Nodes (6): InventoryItemId, ArrowEquipmentStrategy, BowEquipmentStrategy, IEquipmentSlotStrategy, SwordEquipmentStrategy, ToolEquipmentStrategy

### Community 51 - "Rhino.ts"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyRhino(), Rhino, RHINO_EMBEDDED_PACK_B64, RHINO_EMBEDDED_TEXTURE_URI, RHINO_GAITS, RHINO_STATES, RhinoAnimator (+5 more)

### Community 52 - "playerAndCombatBuilder.ts"
Cohesion: 0.11
Nodes (21): IPlayerAndCombatBuilderContext, IPlayerAndCombatHandle, IHudTelemetryInput, IArrowProjectile, IPlayerState, IRideableHorseState, IWeatherStateSnapshot, IEnvironmentAtmosphereHandle (+13 more)

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
Nodes (10): ref_react_dom_client, IErrorBoundaryProps, IErrorBoundaryState, IGameLoopOptions, ConsoleLogger, ILogger, NullLogger, src_index (+2 more)

### Community 63 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.13
Nodes (21): IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig, VIEW_DISTANCE, DWARVEN_GUARDIAN_STATUES, DWARVEN_STONE_HOUSES, SOUTHERN_MINE_POS, buildMinerWaypoints() (+13 more)

### Community 64 - "goldenMaster.ts"
Cohesion: 0.27
Nodes (9): ref_node_fs, ref_node_os, ref_node_path, ref_node_url, assertMatchesGolden(), normalizeForGolden(), IMeleeFeelInput, stepBowFeel() (+1 more)

### Community 65 - "horsePhysicsSystem.ts"
Cohesion: 0.29
Nodes (8): computeHorseBiomechanicalPose(), computeHorseTurnResistance(), IHorseBiomechanicalPose, IHorseLimbAngles, IHorseSteeringStepResult, solveForelimb(), solveHindlimb(), stepMountedHorseSteering()

### Community 66 - "t"
Cohesion: 0.10
Nodes (17): ErrorBoundary, ExplorerMinimap, GRID_SIZE, IExplorerMinimapProps, horseSkinsFromWorld, en, LocaleSchema, getLocaleDictionary() (+9 more)

### Community 67 - "settlementModels.ts"
Cohesion: 0.12
Nodes (16): LAKESIDE_TEA_PAVILION_POS, RIDEABLE_HORSES, ISettlementModelHandles, src_world_terrainmath_bear_mountain_caves, src_world_terrainmath_computehorsebiomechanicalpose, src_world_terrainmath_crocodile_river_bend_pos, src_world_terrainmath_hunter_lodge_pos, src_world_terrainmath_irideablehorsestate (+8 more)

### Community 68 - "gameLoop.ts"
Cohesion: 0.36
Nodes (3): createTickErrorGuard(), ITickErrorGuard, TickErrorDecision

### Community 69 - "WolfAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyWolf(), unpackWolfBundle(), Wolf, WOLF_EMBEDDED_PACK_B64, WOLF_EMBEDDED_TEXTURE_URI, WOLF_GAITS, WOLF_STATES (+5 more)

### Community 70 - "labCatalog.ts"
Cohesion: 0.24
Nodes (15): ref_three_examples_jsm_environments_roomenvironment_js, ICharacterLabCanvasProps, ILabAnimationDef, ILabEntityDef, ILabPoseOverrides, ILabSkinDef, ILabSkinPalette, LabCameraPreset (+7 more)

### Community 71 - "wildlifeAndFootprintsBuilder.ts"
Cohesion: 0.19
Nodes (15): SAVED_LAB_OVERRIDES, buildWildlifeAndFootprintsLayer(), IWildlifeAndFootprintsHandles, IWildlifeSoundCallbacks, attachDeerGlbModel(), IAnimatedDeer, IBoidBirdState, ISmallAnimalState (+7 more)

### Community 72 - "vite.config.ts"
Cohesion: 0.14
Nodes (14): ref_node_fs_promises, ref_node_http, ref_path, @tailwindcss/vite, vite, @vitejs/plugin-react, assertTrustedJsonRequest(), PERSISTENCE_ROUTES (+6 more)

### Community 73 - "windowDebugController.spec.ts"
Cohesion: 0.27
Nodes (10): IGameShellOverlayProps, IWeatherOptionDef, IWorldCanvasProps, IWindowDebugBridgeDeps, GameStateMode, IVirtualMoveState, IDynamicAtmosphereState, IGameActions (+2 more)

### Community 74 - "תיקיית מודלים תלת-ממדיים (`public/models`)"
Cohesion: 0.50
Nodes (3): מבנה תיקיות מומלץ (אופציונלי, או ישירות בתיקייה זו):, פורמטים מומלצים:, תיקיית מודלים תלת-ממדיים (`public/models`)

### Community 76 - "getEffectiveLabAnimationSpeed"
Cohesion: 0.70
Nodes (5): CharacterLabCanvas(), afterDraw(), tick(), computeLabAnimationCycleProgress(), getEffectiveLabAnimationSpeed()

### Community 78 - "ref_node_test"
Cohesion: 0.33
Nodes (5): ref_node_assert_strict, ref_node_test, DEFAULT_LAB_POSE_OVERRIDES, LAB_POSE_OVERRIDES_STORAGE_KEY, StoredLabOverridesError

### Community 79 - "movementIntent.spec.ts"
Cohesion: 0.47
Nodes (4): IMovementAxes, readMovementAxes(), BINDINGS, NO_JOYSTICK

## Knowledge Gaps
- **215 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+210 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 433 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `proceduralModels.ts` to `settlementModels.ts`, `WolfAnimator`, `labCatalog.ts`, `WorldCanvas.tsx`, `wildlifeAndFootprintsBuilder.ts`, `package.json`, `windowDebugController.spec.ts`, `Deer_Complete.ts`, `JaguarAnimator`, `atmosphereRenderController.ts`, `Rhino.ts`, `playerAndCombatBuilder.ts`, `DemonDragon_Complete.ts`, `ForestDragon_Complete.ts`, `BearAnimator`, `Crocodile.ts`, `dwarvenMineAndCaravanSystem.ts`?**
  _High betweenness centrality (0.237) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `combatAndInventorySystem.ts`, `App.tsx`, `playerPhysicsSystem.ts`, `itemArtworkRegistry.tsx`, `hudTelemetryBuilder.ts`, `WorldCanvas`, `WorldCanvas.tsx`, `labCatalog.ts`, `collisionAndTerraces.ts`, `CharacterLabView.tsx`, `worldTypes.ts`, `proceduralModels.ts`, `terrainAndBiomeSystem.ts`, `GameShellOverlay.tsx`, `telemetryStore.ts`, `ILogger`, `dwarvenMineAndCaravanSystem.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `WorldCanvas` (e.g. with `.runFrame()` and `.start()`) actually correct?**
  _`WorldCanvas` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _215 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `combatAndInventorySystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.054746835443037975 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `terrainMath.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._