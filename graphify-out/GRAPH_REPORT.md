# Graph Report - TheMan  (2026-11-01)

## Corpus Check
- 152 files · ~287,017 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1370 nodes · 3788 edges · 83 communities (54 shown, 29 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c77408b8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- boidsAndWildlifeSystem.ts
- App.tsx
- terrainMath.test.ts
- swordAttackAnimationSystem.ts
- ErrorBoundary.spec.ts
- WorldCanvas
- playerPhysicsSystem.ts
- WorldCanvas.tsx
- AppException.ts
- package.json
- Deer_Complete.ts
- compilerOptions
- GameLoop
- CharacterLabView.tsx
- config.ts
- worldTypes.ts
- proceduralModels.ts
- devDependencies
- worldBehavior.characterization.spec.ts
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
- combatAndInventorySystem.ts
- src_world_terrainmath_arrowprojectile
- itemArtworkRegistry.tsx
- src_world_terrainmath_characterskillsstate
- cameraRigSystem.ts
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
- src_world_terrainmath_walkpacemode
- Rhino.ts
- playerAndCombatBuilder.ts
- DemonDragon_Complete.ts
- src_world_terrainmath_dynamicatmospherestate
- ForestDragon_Complete.ts
- scripts
- SpatialHashGrid2D
- dependencies
- Bear.ts
- Crocodile.ts
- src_world_terrainmath_getanimalspeciesnamehe
- ILogger
- dwarvenMineAndCaravanSystem.ts
- ref_node_test
- horsePhysicsSystem.ts
- t
- settlementModels.ts
- gameLoop.ts
- WolfAnimator
- labCatalog.ts
- wildlifeAndFootprintsBuilder.ts
- vite.config.ts
- Result
- תיקיית מודלים תלת-ממדיים (`public/models`)
- src_world_terrainmath_archery_targets
- terrainAndBiomeSystem.ts
- src_locales_index_he
- BearAnimator
- movementIntent.spec.ts
- main.tsx
- MockLogger
- weaponFeelSystem.spec.ts

## God Nodes (most connected - your core abstractions)
1. `WorldCanvas` - 55 edges
2. `t()` - 49 edges
3. `groundHeightAt()` - 43 edges
4. `walkableHeightAt()` - 42 edges
5. `three` - 35 edges
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
- `IGameLoopOptions` --references--> `ILogger`  [EXTRACTED]
  src/core/gameLoop.ts → src/core/ILogger.ts
- `horseSkinsFromWorld` --calls--> `t()`  [EXTRACTED]
  src/lab/labCatalog.ts → src/locales/index.ts
- `createCatalogItem()` --calls--> `t()`  [EXTRACTED]
  src/world/domain/worldTypes.ts → src/locales/index.ts

## Import Cycles
- None detected.

## Communities (83 total, 29 thin omitted)

### Community 0 - "boidsAndWildlifeSystem.ts"
Cohesion: 0.10
Nodes (32): activeWorldAnimalsRegistry, advanceAnimalWithWaterShoreRecovery(), AnimalAiBehavior, BIRD_FLOCK_CONFIGS, caveLocalToWorld(), computePlayerNoiseRateAtDistance(), createInitialBoidBirds(), createInitialSmallAnimals() (+24 more)

### Community 1 - "App.tsx"
Cohesion: 0.14
Nodes (19): App(), WEATHER_CYCLE_ORDER, GameSettingsModal(), IGameSettingsModalProps, IKeybindRowMeta, KEYBIND_CATEGORIES, KEYBIND_ROWS, KeybindCategory (+11 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.07
Nodes (28): src_world_terrainmath_birch_grove_center, src_world_terrainmath_birchgrovefactorat, src_world_terrainmath_chinesefortressstairheightat, src_world_terrainmath_computeweatherstate, src_world_terrainmath_corner_watchtowers, src_world_terrainmath_createinitialplayerstate, src_world_terrainmath_default_weather_cycle_mode, src_world_terrainmath_fortress_y_offset (+20 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.09
Nodes (33): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+25 more)

### Community 5 - "WorldCanvas"
Cohesion: 0.17
Nodes (24): WorldCanvas, buildTelemetrySnapshot(), registerWindowDebugBridge(), findLookedAtWatchtowerLadder(), findNearestBed(), findNearestFortressDoor(), findNearestMarketStall(), findNearestDeadLootableAnimal() (+16 more)

### Community 6 - "playerPhysicsSystem.ts"
Cohesion: 0.18
Nodes (14): ARCHERY_TARGETS, CHINESE_FORTRESS_POS, CORNER_WATCHTOWERS, FORTRESS_Z_OFFSET, findWatchtowerLadderAt(), FORTRESS_DOORS, getLadderById(), isOnWatchtowerLadder() (+6 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.07
Nodes (39): _camTargetLook, _euler, _sunVec, createAnimationFrameScheduler(), createGpuFencePacedScheduler(), src_world_terrainmath_arrowelementkind, src_world_terrainmath_assignhotbarslot, src_world_terrainmath_awardskillxp (+31 more)

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
Cohesion: 0.22
Nodes (18): CAMERA_PRESETS, CharacterLabView(), ENVIRONMENT_PRESETS, ICharacterLabViewProps, SPEED_OPTIONS, countActivePoseOverrides(), createInitialLabSessionState(), filterLabEntities() (+10 more)

### Community 14 - "config.ts"
Cohesion: 0.35
Nodes (10): clamp(), IValidatedPositionOverride, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS, URL_SEASON_OFFSETS, URL_WEATHER_MAP (+2 more)

### Community 15 - "worldTypes.ts"
Cohesion: 0.12
Nodes (26): IValidatedUrlOverrides, ITelemetrySnapshot, ArrowElementKind, BiomeType, CameraPerspectiveMode, createCatalogItem(), EquippedToolSlot, FIRST_MARKET_CATALOG_ITEM (+18 more)

### Community 16 - "proceduralModels.ts"
Cohesion: 0.06
Nodes (92): three, ref_three_addons_environments_roomenvironment_js, buildColliderDebugWireframes(), IColliderDebugHandles, buildDwarvenKingdomAndMiners(), buildPlayerAndCombatSystems(), attachFlagHorizontalWaveShader(), attachWindSwayShader() (+84 more)

### Community 17 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, tailwindcss, @tailwindcss/vite, tsx, @types/node, @types/react, @types/react-dom, @types/three (+3 more)

### Community 18 - "worldBehavior.characterization.spec.ts"
Cohesion: 0.08
Nodes (34): ref_three_addons_objects_sky_js, IPlayerAndCombatHandle, applyDynamicAtmosphereToScene(), _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor (+26 more)

### Community 19 - "landmarksRegistry.ts"
Cohesion: 0.12
Nodes (29): CLEAR_ZONES, FLAT_BUILDING_TERRACES, SOLID_BUILDING_BOXES, BIRCH_GROVE_CENTER, MAGIC_STONE_CIRCLE_POS, PLAYABLE_RADIUS, PLAYER_EYE_HEIGHT, SMALL_MEADOW_HILLS (+21 more)

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
Cohesion: 0.24
Nodes (7): react, GameShellOverlay, renderItemSvgIcon(), ITelemetryStore, telemetryStore, useTelemetry(), TelemetrySnapshot

### Community 30 - "persistedSettingsValidation.ts"
Cohesion: 0.12
Nodes (24): ANIMATION_SPEED_RANGE, CAMERA_PERSPECTIVES, FIREFLIES_MODES, GameSettingsValidationError, isNumberInRange(), isOneOf(), isPlainObject(), JUMP_FORCE_RANGE (+16 more)

### Community 34 - "combatAndInventorySystem.ts"
Cohesion: 0.08
Nodes (29): IWildlifeAndFootprintsHandles, DEFAULT_STARTER_OWNED_ITEM_IDS, IArcheryTargetDef, ISolidBuildingBox, getActiveWorldAnimals(), ISmallAnimalState, ARCHERY_TARGETS_SPATIAL_GRID, arrowFireStrategy (+21 more)

### Community 36 - "itemArtworkRegistry.tsx"
Cohesion: 0.14
Nodes (4): ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy

### Community 38 - "cameraRigSystem.ts"
Cohesion: 0.24
Nodes (11): computeTargetFov(), createCameraPose(), createCameraRigState(), easeFovToward(), ICameraPose, ICameraRigFrameInput, ICameraRigState, VIEW_VARIANTS (+3 more)

### Community 47 - "keyBindingMatch.ts"
Cohesion: 0.70
Nodes (3): isBindingHeld(), matchesKeyBinding(), MODIFIER_FAMILIES

### Community 48 - "JaguarAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyJaguar(), Jaguar, JAGUAR_EMBEDDED_PACK_B64, JAGUAR_EMBEDDED_TEXTURE_URI, JAGUAR_GAITS, JAGUAR_STATES, JaguarAnimator (+5 more)

### Community 49 - "IPlayerState"
Cohesion: 0.13
Nodes (8): IPlayerState, ArrowEquipmentStrategy, BowEquipmentStrategy, IEquipmentSlotStrategy, isInventoryItemEquipped(), SwordEquipmentStrategy, ToolEquipmentStrategy, UsableGearStrategy

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

### Community 59 - "Bear.ts"
Cohesion: 0.13
Nodes (12): Bear, BEAR_EMBEDDED_PACK_B64, BEAR_EMBEDDED_TEXTURE_URI, BEAR_GAITS, BEAR_STATES, BearOptions, BearRig, BearState (+4 more)

### Community 60 - "Crocodile.ts"
Cohesion: 0.10
Nodes (12): createReadyCrocodile(), CROC_EMBEDDED_PACK_B64, CROC_EMBEDDED_TEXTURE_URI, Crocodile, CROCODILE_GAITS, CROCODILE_STATES, CrocodileAnimator, CrocodileOptions (+4 more)

### Community 62 - "ILogger"
Cohesion: 0.16
Nodes (6): IErrorBoundaryProps, IErrorBoundaryState, ConsoleLogger, ILogger, NullLogger, src_world_terrainmath_biometype

### Community 63 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.15
Nodes (16): IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig, DWARVEN_GUARDIAN_STATUES, DWARVEN_STONE_HOUSES, SOUTHERN_MINE_POS, buildMinerWaypoints(), CaravanPath (+8 more)

### Community 64 - "ref_node_test"
Cohesion: 0.28
Nodes (9): ref_node_assert_strict, ref_node_fs, ref_node_os, ref_node_path, ref_node_test, ref_node_url, INITIAL_TELEMETRY_SNAPSHOT, assertMatchesGolden() (+1 more)

### Community 65 - "horsePhysicsSystem.ts"
Cohesion: 0.29
Nodes (8): computeHorseBiomechanicalPose(), computeHorseTurnResistance(), IHorseBiomechanicalPose, IHorseLimbAngles, IHorseSteeringStepResult, solveForelimb(), solveHindlimb(), stepMountedHorseSteering()

### Community 66 - "t"
Cohesion: 0.20
Nodes (11): ExplorerMinimap, GRID_SIZE, IExplorerMinimapProps, en, LocaleSchema, getLocaleDictionary(), setLocaleDictionary(), t() (+3 more)

### Community 67 - "settlementModels.ts"
Cohesion: 0.11
Nodes (18): HUNTER_LODGE_POS, LAKESIDE_TEA_PAVILION_POS, RIDEABLE_HORSES, VALLEY_FARMS, ISettlementModelHandles, src_world_terrainmath_bear_mountain_caves, src_world_terrainmath_computehorsebiomechanicalpose, src_world_terrainmath_crocodile_river_bend_pos (+10 more)

### Community 68 - "gameLoop.ts"
Cohesion: 0.27
Nodes (5): InfrastructureCorruptedException, IGameLoopOptions, createTickErrorGuard(), ITickErrorGuard, TickErrorDecision

### Community 69 - "WolfAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyWolf(), unpackWolfBundle(), Wolf, WOLF_EMBEDDED_PACK_B64, WOLF_EMBEDDED_TEXTURE_URI, WOLF_GAITS, WOLF_STATES (+5 more)

### Community 70 - "labCatalog.ts"
Cohesion: 0.20
Nodes (20): ref_three_examples_jsm_environments_roomenvironment_js, CharacterLabCanvas(), afterDraw(), tick(), ICharacterLabCanvasProps, computeLabAnimationCycleProgress(), getEffectiveLabAnimationSpeed(), horseSkinsFromWorld (+12 more)

### Community 71 - "wildlifeAndFootprintsBuilder.ts"
Cohesion: 0.23
Nodes (13): buildWildlifeAndFootprintsLayer(), IWildlifeSoundCallbacks, attachDeerGlbModel(), IAnimatedDeer, stepBoidsAndWildlife(), createFootprintTrailTracker(), FOOTPRINT_MAX_AGE_SECONDS, IFootprintDecalState (+5 more)

### Community 72 - "vite.config.ts"
Cohesion: 0.14
Nodes (14): ref_node_fs_promises, ref_node_http, ref_path, @tailwindcss/vite, vite, @vitejs/plugin-react, assertTrustedJsonRequest(), PERSISTENCE_ROUTES (+6 more)

### Community 73 - "Result"
Cohesion: 0.27
Nodes (8): IGameShellOverlayProps, IWeatherOptionDef, IWorldCanvasProps, Result, GameStateMode, IVirtualMoveState, IGameActions, WeatherToggleOption

### Community 74 - "תיקיית מודלים תלת-ממדיים (`public/models`)"
Cohesion: 0.50
Nodes (3): מבנה תיקיות מומלץ (אופציונלי, או ישירות בתיקייה זו):, פורמטים מומלצים:, תיקיית מודלים תלת-ממדיים (`public/models`)

### Community 76 - "terrainAndBiomeSystem.ts"
Cohesion: 0.21
Nodes (18): BEAR_MOUNTAIN_CAVES, CROCODILE_RIVER_BEND_POS, southernRiverBridgeHeightAt(), WATER_LEVEL, WORLD_SPAWN, chineseFortressStairHeightAt(), isChineseFortressWalkableZone(), ropeBridgePointInfoAt() (+10 more)

### Community 79 - "movementIntent.spec.ts"
Cohesion: 0.47
Nodes (4): IMovementAxes, readMovementAxes(), BINDINGS, NO_JOYSTICK

### Community 80 - "main.tsx"
Cohesion: 0.20
Nodes (4): ref_react_dom_client, ErrorBoundary, src_index, rootElement

### Community 82 - "weaponFeelSystem.spec.ts"
Cohesion: 0.60
Nodes (3): IMeleeFeelInput, stepBowFeel(), stepMeleeFeelAndSway()

## Knowledge Gaps
- **218 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+213 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 436 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `proceduralModels.ts` to `settlementModels.ts`, `WolfAnimator`, `labCatalog.ts`, `WorldCanvas.tsx`, `wildlifeAndFootprintsBuilder.ts`, `package.json`, `Deer_Complete.ts`, `JaguarAnimator`, `worldBehavior.characterization.spec.ts`, `Rhino.ts`, `playerAndCombatBuilder.ts`, `DemonDragon_Complete.ts`, `ForestDragon_Complete.ts`, `Bear.ts`, `Crocodile.ts`, `dwarvenMineAndCaravanSystem.ts`?**
  _High betweenness centrality (0.217) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `boidsAndWildlifeSystem.ts`, `App.tsx`, `WorldCanvas`, `playerPhysicsSystem.ts`, `WorldCanvas.tsx`, `CharacterLabView.tsx`, `worldTypes.ts`, `proceduralModels.ts`, `worldBehavior.characterization.spec.ts`, `landmarksRegistry.ts`, `GameShellOverlay.tsx`, `telemetryStore.ts`, `combatAndInventorySystem.ts`, `ILogger`, `dwarvenMineAndCaravanSystem.ts`, `settlementModels.ts`, `labCatalog.ts`, `terrainAndBiomeSystem.ts`, `main.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `WorldCanvas` (e.g. with `.runFrame()` and `.start()`) actually correct?**
  _`WorldCanvas` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _218 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `boidsAndWildlifeSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09803921568627451 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14492753623188406 - nodes in this community are weakly interconnected._
- **Should `terrainMath.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._