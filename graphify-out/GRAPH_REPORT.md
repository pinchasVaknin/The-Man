# Graph Report - TheMan  (2026-11-01)

## Corpus Check
- 152 files · ~286,901 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1372 nodes · 3790 edges · 86 communities (59 shown, 27 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5cb92df5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- boidsAndWildlifeSystem.ts
- savedGameSettings.ts
- terrainMath.test.ts
- swordAttackAnimationSystem.ts
- MockErrorLogger
- hudTelemetryBuilder.ts
- collisionAndTerraces.ts
- WorldCanvas.tsx
- AppException.ts
- package.json
- Deer_Complete.ts
- compilerOptions
- gameLoop.ts
- labCatalog.ts
- atmosphereAndWeatherSystem.ts
- worldTypes.ts
- proceduralModels.ts
- devDependencies
- atmosphereRenderController.ts
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
- WorldCanvas
- src_world_terrainmath_inventoryitemdef
- src_world_terrainmath_obstaclecylinder
- ref_domain_worldtypes
- src_world_domain_landmarksregistry_chinesefortressstairheightat
- src_world_terrainmath_solaratmosphere
- src_world_terrainmath_playerstate
- src_world_terrainmath_rideablehorsestate
- src_world_terrainmath_weatherstatesnapshot
- playerPhysicsSystem.ts
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
- BearAnimator
- Crocodile.ts
- src_world_terrainmath_getanimalspeciesnamehe
- ref_node_test
- terrainAndBiomeSystem.ts
- goldenMaster.ts
- horsePhysicsSystem.ts
- locales/index.ts
- settlementModels.ts
- RhinoAnimator
- WolfAnimator
- labModelFactory.ts
- wildlifeAndFootprintsBuilder.ts
- vite.config.ts
- App.tsx
- תיקיית מודלים תלת-ממדיים (`public/models`)
- src_world_terrainmath_archery_targets
- t
- src_locales_index_he
- validateGameSettings
- movementIntent.spec.ts
- ConsoleLogger
- combatAndInventorySystem.spec.ts
- weaponFeelSystem.spec.ts
- highlandBridgeLandmarks.ts
- stepArrowsPhysics
- getEffectiveLabAnimationSpeed

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
- `IFootprintDecalState` --references--> `BiomeType`  [EXTRACTED]
  src/world/systems/footprintTrailSystem.ts → src/world/domain/worldTypes.ts
- `ISpeciesProfile` --references--> `InventoryItemId`  [EXTRACTED]
  src/world/systems/wildlifeSpeciesProfiles.ts → src/world/domain/worldTypes.ts
- `ICameraRigFrameInput` --references--> `IPlayerState`  [EXTRACTED]
  src/world/systems/cameraRigSystem.ts → src/world/domain/worldTypes.ts

## Import Cycles
- None detected.

## Communities (86 total, 27 thin omitted)

### Community 0 - "boidsAndWildlifeSystem.ts"
Cohesion: 0.10
Nodes (44): SOLID_BUILDING_BOXES, WORLD_SPAWN, activeWorldAnimalsRegistry, advanceAnimalWithWaterShoreRecovery(), AnimalAiBehavior, BIRD_FLOCK_CONFIGS, caveLocalToWorld(), computePlayerNoiseRateAtDistance() (+36 more)

### Community 1 - "savedGameSettings.ts"
Cohesion: 0.18
Nodes (13): GameSettingsModal(), IKeybindRowMeta, KEYBIND_CATEGORIES, KEYBIND_ROWS, KeybindCategory, DEFAULT_GAME_KEYBINDINGS, FirefliesMode, formatKeyCodeLabel() (+5 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.07
Nodes (28): DEFAULT_WEATHER_CYCLE_MODE, src_world_terrainmath_birch_grove_center, src_world_terrainmath_birchgrovefactorat, src_world_terrainmath_chinesefortressstairheightat, src_world_terrainmath_computeweatherstate, src_world_terrainmath_corner_watchtowers, src_world_terrainmath_createinitialplayerstate, src_world_terrainmath_default_weather_cycle_mode (+20 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.09
Nodes (33): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+25 more)

### Community 5 - "hudTelemetryBuilder.ts"
Cohesion: 0.35
Nodes (11): buildTelemetrySnapshot(), registerWindowDebugBridge(), findLookedAtWatchtowerLadder(), findNearestBed(), findNearestFortressDoor(), findNearestMarketStall(), findNearestDeadLootableAnimal(), getAnimalSpeciesName() (+3 more)

### Community 6 - "collisionAndTerraces.ts"
Cohesion: 0.14
Nodes (21): DWARVEN_GUARDIAN_STATUES, DWARVEN_STONE_HOUSES, ARCHERY_TARGETS, CHINESE_FORTRESS_POS, chineseFortressStairHeightAt(), CORNER_WATCHTOWERS, FORTRESS_Y_OFFSET, FORTRESS_Z_OFFSET (+13 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.07
Nodes (38): _camTargetLook, _euler, _sunVec, createAnimationFrameScheduler(), createGpuFencePacedScheduler(), src_world_terrainmath_arrowelementkind, src_world_terrainmath_assignhotbarslot, src_world_terrainmath_awardskillxp (+30 more)

### Community 8 - "AppException.ts"
Cohesion: 0.20
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

### Community 12 - "gameLoop.ts"
Cohesion: 0.13
Nodes (6): GameLoop, IFrameScheduler, createHarness(), FakeScheduler, RecordingLogger, ITickErrorGuard

### Community 13 - "labCatalog.ts"
Cohesion: 0.16
Nodes (25): SAVED_LAB_OVERRIDES, CAMERA_PRESETS, CharacterLabView(), ENVIRONMENT_PRESETS, ICharacterLabViewProps, SPEED_OPTIONS, countActivePoseOverrides(), createInitialLabSessionState() (+17 more)

### Community 14 - "atmosphereAndWeatherSystem.ts"
Cohesion: 0.19
Nodes (23): clamp(), IValidatedPositionOverride, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS, URL_SEASON_OFFSETS, URL_WEATHER_MAP (+15 more)

### Community 15 - "worldTypes.ts"
Cohesion: 0.13
Nodes (24): IValidatedUrlOverrides, ITelemetrySnapshot, ArrowElementKind, BiomeType, CameraPerspectiveMode, DEFAULT_STARTER_OWNED_ITEM_IDS, EquippedToolSlot, FIRST_MARKET_CATALOG_ITEM (+16 more)

### Community 16 - "proceduralModels.ts"
Cohesion: 0.06
Nodes (86): three, ref_three_addons_environments_roomenvironment_js, buildColliderDebugWireframes(), IColliderDebugHandles, buildDwarvenKingdomAndMiners(), IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig (+78 more)

### Community 17 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, tailwindcss, @tailwindcss/vite, tsx, @types/node, @types/react, @types/react-dom, @types/three (+3 more)

### Community 18 - "atmosphereRenderController.ts"
Cohesion: 0.11
Nodes (20): ref_three_addons_objects_sky_js, applyDynamicAtmosphereToScene(), _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor, IHudTelemetryInput (+12 more)

### Community 19 - "landmarksRegistry.ts"
Cohesion: 0.20
Nodes (17): BEAR_MOUNTAIN_CAVES, BIRCH_GROVE_CENTER, CROCODILE_RIVER_BEND_POS, MAGIC_STONE_CIRCLE_POS, PLAYABLE_RADIUS, PLAYER_EYE_HEIGHT, SMALL_MEADOW_HILLS, SNOW_LINE_ALTITUDE (+9 more)

### Community 21 - "GameShellOverlay.tsx"
Cohesion: 0.10
Nodes (30): SEASON_OPTIONS, SkyrimModalMode, WEATHER_OPTIONS, renderArtifactArtwork(), formatMarketError(), InventoryCategoryTab, ISkyrimInventoryModalProps, ITEM_SHORT_NAMES (+22 more)

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
Nodes (12): ANIMATION_SPEED_RANGE, CAMERA_PERSPECTIVES, FIREFLIES_MODES, GameSettingsValidationError, JUMP_FORCE_RANGE, KEYBINDING_NAMES, LAB_NUMBER_RANGES, LAB_ROTATION_FIELDS (+4 more)

### Community 34 - "combatAndInventorySystem.ts"
Cohesion: 0.09
Nodes (20): IArcheryTargetDef, ISmallAnimalState, ARCHERY_TARGETS_SPATIAL_GRID, arrowFireStrategy, arrowNormalStrategy, arrowWindStrategy, bowStrategy, cloakStrategy (+12 more)

### Community 36 - "itemArtworkRegistry.tsx"
Cohesion: 0.12
Nodes (7): GameShellOverlay, ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy, renderItemSvgIcon(), useTelemetry()

### Community 38 - "WorldCanvas"
Cohesion: 0.17
Nodes (17): WorldCanvas, isBindingHeld(), matchesKeyBinding(), MODIFIER_FAMILIES, lootDeadAnimal(), computeTargetFov(), createCameraPose(), createCameraRigState() (+9 more)

### Community 47 - "playerPhysicsSystem.ts"
Cohesion: 0.15
Nodes (17): createInput(), findWatchtowerLadderAt(), getLadderById(), IPlayerInput, spawnArrowProjectile(), applySkillXpGain(), awardSkillXp(), createInitialPlayerState() (+9 more)

### Community 48 - "JaguarAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyJaguar(), Jaguar, JAGUAR_EMBEDDED_PACK_B64, JAGUAR_EMBEDDED_TEXTURE_URI, JAGUAR_GAITS, JAGUAR_STATES, JaguarAnimator (+5 more)

### Community 49 - "IPlayerState"
Cohesion: 0.18
Nodes (8): IPlayerAndCombatHandle, InventoryItemId, IPlayerState, ArrowEquipmentStrategy, BowEquipmentStrategy, IEquipmentSlotStrategy, SwordEquipmentStrategy, ToolEquipmentStrategy

### Community 51 - "Rhino.ts"
Cohesion: 0.12
Nodes (12): CLIP_ORDER, createReadyRhino(), Rhino, RHINO_EMBEDDED_PACK_B64, RHINO_EMBEDDED_TEXTURE_URI, RHINO_GAITS, RHINO_STATES, RhinoOptions (+4 more)

### Community 52 - "playerAndCombatBuilder.ts"
Cohesion: 0.18
Nodes (10): IPlayerAndCombatBuilderContext, ARROW_TRAIL_MAX_AGE, LOCKED_SWORD_GRIP_TRANSFORM, src_world_terrainmath_arrow_trail_max_age, src_world_terrainmath_computefirstpersonswordattackpose, src_world_terrainmath_computeslopepitchandroll, src_world_terrainmath_getsurfacenormalat, src_world_terrainmath_iplayerstate (+2 more)

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

### Community 62 - "ref_node_test"
Cohesion: 0.22
Nodes (8): ref_node_assert_strict, ref_node_test, IErrorBoundaryProps, IErrorBoundaryState, IGameLoopOptions, ILogger, NullLogger, src_world_terrainmath_biometype

### Community 63 - "terrainAndBiomeSystem.ts"
Cohesion: 0.17
Nodes (18): CLEAR_ZONES, FLAT_BUILDING_TERRACES, SOUTHERN_MINE_POS, IDwarvenMinerCaravanState, buildMinerWaypoints(), CaravanPath, computeDwarvenMinerCaravanState(), DWARVEN_MINER_STATIONS (+10 more)

### Community 64 - "goldenMaster.ts"
Cohesion: 0.46
Nodes (6): ref_node_fs, ref_node_os, ref_node_path, ref_node_url, assertMatchesGolden(), normalizeForGolden()

### Community 65 - "horsePhysicsSystem.ts"
Cohesion: 0.29
Nodes (8): computeHorseBiomechanicalPose(), computeHorseTurnResistance(), IHorseBiomechanicalPose, IHorseLimbAngles, IHorseSteeringStepResult, solveForelimb(), solveHindlimb(), stepMountedHorseSteering()

### Community 66 - "locales/index.ts"
Cohesion: 0.39
Nodes (5): en, LocaleSchema, getLocaleDictionary(), setLocaleDictionary(), TranslationDictionary

### Community 67 - "settlementModels.ts"
Cohesion: 0.12
Nodes (15): LAKESIDE_TEA_PAVILION_POS, RIDEABLE_HORSES, src_world_terrainmath_bear_mountain_caves, src_world_terrainmath_computehorsebiomechanicalpose, src_world_terrainmath_crocodile_river_bend_pos, src_world_terrainmath_hunter_lodge_pos, src_world_terrainmath_irideablehorsestate, src_world_terrainmath_lakeside_tea_pavilion_pos (+7 more)

### Community 69 - "WolfAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyWolf(), unpackWolfBundle(), Wolf, WOLF_EMBEDDED_PACK_B64, WOLF_EMBEDDED_TEXTURE_URI, WOLF_GAITS, WOLF_STATES (+5 more)

### Community 70 - "labModelFactory.ts"
Cohesion: 0.27
Nodes (13): ref_three_examples_jsm_environments_roomenvironment_js, ICharacterLabCanvasProps, ILabAnimationDef, ILabEntityDef, ILabPoseOverrides, ILabSkinDef, LabCameraPreset, LabStageEnvironment (+5 more)

### Community 71 - "wildlifeAndFootprintsBuilder.ts"
Cohesion: 0.18
Nodes (15): DEFAULT_LAB_POSE_OVERRIDES, LAB_POSE_OVERRIDES_STORAGE_KEY, mergeStoredLabOverrides(), StoredLabOverridesError, buildWildlifeAndFootprintsLayer(), IWildlifeAndFootprintsHandles, IWildlifeSoundCallbacks, IBoidBirdState (+7 more)

### Community 72 - "vite.config.ts"
Cohesion: 0.15
Nodes (11): ref_node_fs_promises, ref_node_http, ref_path, @tailwindcss/vite, @vitejs/plugin-react, assertTrustedJsonRequest(), PERSISTENCE_ROUTES, PersistenceErrorCode (+3 more)

### Community 73 - "App.tsx"
Cohesion: 0.21
Nodes (12): WEATHER_CYCLE_ORDER, IGameSettingsModalProps, IGameShellOverlayProps, IWeatherOptionDef, IWorldCanvasProps, IGameSettingsConfig, Result, GameStateMode (+4 more)

### Community 74 - "תיקיית מודלים תלת-ממדיים (`public/models`)"
Cohesion: 0.50
Nodes (3): מבנה תיקיות מומלץ (אופציונלי, או ישירות בתיקייה זו):, פורמטים מומלצים:, תיקיית מודלים תלת-ממדיים (`public/models`)

### Community 76 - "t"
Cohesion: 0.16
Nodes (12): react, ExplorerMinimap, GRID_SIZE, IExplorerMinimapProps, horseSkinsFromWorld, t(), createCatalogItem(), getArrowKindLabel() (+4 more)

### Community 78 - "validateGameSettings"
Cohesion: 0.31
Nodes (9): isNumberInRange(), isOneOf(), isPlainObject(), toAnimationSpeeds(), toLabPoseOverrides(), validateGameSettings(), validateLabOverrides(), saveGameSettings() (+1 more)

### Community 79 - "movementIntent.spec.ts"
Cohesion: 0.47
Nodes (4): IMovementAxes, readMovementAxes(), BINDINGS, NO_JOYSTICK

### Community 80 - "ConsoleLogger"
Cohesion: 0.10
Nodes (6): ref_react_dom_client, App(), ErrorBoundary, ConsoleLogger, src_index, rootElement

### Community 81 - "combatAndInventorySystem.spec.ts"
Cohesion: 0.25
Nodes (7): assignHotbarSlot(), buyMarketItem(), equipInventoryItem(), MarketTransactionResult, sellMarketItem(), createMarketEligiblePlayer(), toggleFavoriteItem()

### Community 82 - "weaponFeelSystem.spec.ts"
Cohesion: 0.60
Nodes (3): IMeleeFeelInput, stepBowFeel(), stepMeleeFeelAndSway()

### Community 83 - "highlandBridgeLandmarks.ts"
Cohesion: 0.25
Nodes (6): HILL_BRIDGE_COS, HILL_BRIDGE_SIN, HILL_BRIDGE_YAW, HILL_WATCHTOWERS, ROPE_BRIDGE_DEF, ropeBridgePointInfoAt()

### Community 84 - "stepArrowsPhysics"
Cohesion: 0.47
Nodes (6): getActiveWorldAnimals(), evaluateSwordStrikeWindowHit(), getNearbyArcheryTargets(), getNearbySolidBuildingBoxes(), stepArrowsPhysics(), stepSwordSwingCombat()

### Community 85 - "getEffectiveLabAnimationSpeed"
Cohesion: 0.70
Nodes (5): CharacterLabCanvas(), afterDraw(), tick(), computeLabAnimationCycleProgress(), getEffectiveLabAnimationSpeed()

## Knowledge Gaps
- **220 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+215 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 438 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `proceduralModels.ts` to `settlementModels.ts`, `WolfAnimator`, `labModelFactory.ts`, `wildlifeAndFootprintsBuilder.ts`, `WorldCanvas.tsx`, `package.json`, `Deer_Complete.ts`, `atmosphereAndWeatherSystem.ts`, `JaguarAnimator`, `atmosphereRenderController.ts`, `Rhino.ts`, `playerAndCombatBuilder.ts`, `DemonDragon_Complete.ts`, `ForestDragon_Complete.ts`, `BearAnimator`, `Crocodile.ts`?**
  _High betweenness centrality (0.218) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `boidsAndWildlifeSystem.ts`, `savedGameSettings.ts`, `hudTelemetryBuilder.ts`, `collisionAndTerraces.ts`, `WorldCanvas.tsx`, `labCatalog.ts`, `atmosphereAndWeatherSystem.ts`, `worldTypes.ts`, `GameShellOverlay.tsx`, `telemetryStore.ts`, `combatAndInventorySystem.ts`, `itemArtworkRegistry.tsx`, `WorldCanvas`, `playerPhysicsSystem.ts`, `ref_node_test`, `terrainAndBiomeSystem.ts`, `locales/index.ts`, `ConsoleLogger`, `highlandBridgeLandmarks.ts`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `WorldCanvas` (e.g. with `.runFrame()` and `.start()`) actually correct?**
  _`WorldCanvas` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _220 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `boidsAndWildlifeSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0963265306122449 - nodes in this community are weakly interconnected._
- **Should `terrainMath.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `swordAttackAnimationSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09243697478991597 - nodes in this community are weakly interconnected._