# Graph Report - TheMan  (2026-11-01)

## Corpus Check
- 156 files · ~287,550 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1384 nodes · 3851 edges · 82 communities (53 shown, 29 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e892ca05`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- boidsAndWildlifeSystem.ts
- App.tsx
- terrainMath.test.ts
- swordAttackAnimationSystem.ts
- ILogger
- hudTelemetryBuilder.ts
- collisionAndTerraces.ts
- WorldCanvas.tsx
- AppException.ts
- package.json
- Deer_Complete.ts
- compilerOptions
- GameLoop
- labCatalog.ts
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
- Bear.ts
- Crocodile.ts
- src_world_terrainmath_getanimalspeciesnamehe
- ref_node_test
- dwarvenMineAndCaravanSystem.ts
- BearAnimator
- horsePhysicsSystem.ts
- t
- CrocodileAnimator
- keyBindingMatch.ts
- WolfAnimator
- labModelFactory.ts
- wildlifeAndFootprintsBuilder.ts
- vite.config.ts
- MockLogger
- תיקיית מודלים תלת-ממדיים (`public/models`)
- src_world_terrainmath_archery_targets
- AppServicesContext.spec.ts
- src_locales_index_he
- movementIntent.spec.ts
- ErrorBoundary
- registerWindowDebugBridge
- weaponFeelSystem.spec.ts

## God Nodes (most connected - your core abstractions)
1. `WorldCanvas` - 56 edges
2. `t()` - 49 edges
3. `groundHeightAt()` - 43 edges
4. `walkableHeightAt()` - 42 edges
5. `three` - 35 edges
6. `DeerAnimator` - 33 edges
7. `NatureSoundEngine` - 31 edges
8. `IPlayerState` - 30 edges
9. `ILogger` - 25 edges
10. `registerWindowDebugBridge()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `saveGameSettings()` --calls--> `validateGameSettings()`  [EXTRACTED]
  vite.config.ts → src/config/persistedSettingsValidation.ts
- `saveLabOverrides()` --calls--> `validateLabOverrides()`  [EXTRACTED]
  vite.config.ts → src/config/persistedSettingsValidation.ts
- `IWeatherOptionDef` --references--> `WeatherToggleOption`  [EXTRACTED]
  src/components/GameShellOverlay.tsx → src/world/domain/worldTypes.ts
- `horseSkinsFromWorld` --calls--> `t()`  [EXTRACTED]
  src/lab/labCatalog.ts → src/locales/index.ts
- `createCatalogItem()` --calls--> `t()`  [EXTRACTED]
  src/world/domain/worldTypes.ts → src/locales/index.ts

## Import Cycles
- None detected.

## Communities (82 total, 29 thin omitted)

### Community 0 - "boidsAndWildlifeSystem.ts"
Cohesion: 0.06
Nodes (61): ref_node_fs, ref_node_os, ref_node_path, ref_node_url, assertMatchesGolden(), normalizeForGolden(), createInput(), createTestBridgeDeps() (+53 more)

### Community 1 - "App.tsx"
Cohesion: 0.14
Nodes (25): App(), LoggerProbe(), useAppServices(), WEATHER_CYCLE_ORDER, GameSettingsModal(), IGameSettingsModalProps, IKeybindRowMeta, KEYBIND_CATEGORIES (+17 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.05
Nodes (43): LAKESIDE_TEA_PAVILION_POS, ISettlementModelHandles, DEFAULT_WEATHER_CYCLE_MODE, src_world_terrainmath_bear_mountain_caves, src_world_terrainmath_birch_grove_center, src_world_terrainmath_birchgrovefactorat, src_world_terrainmath_chinesefortressstairheightat, src_world_terrainmath_computehorsebiomechanicalpose (+35 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.09
Nodes (33): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+25 more)

### Community 4 - "ILogger"
Cohesion: 0.12
Nodes (6): IErrorBoundaryProps, IErrorBoundaryState, MockErrorLogger, IGameLoopOptions, ILogger, ITickErrorGuard

### Community 5 - "hudTelemetryBuilder.ts"
Cohesion: 0.18
Nodes (15): buildTelemetrySnapshot(), findLookedAtWatchtowerLadder(), findNearestBed(), findNearestFortressDoor(), findNearestDeadLootableAnimal(), getAnimalLootDrops(), getAnimalSpeciesName(), lootDeadAnimal() (+7 more)

### Community 6 - "collisionAndTerraces.ts"
Cohesion: 0.14
Nodes (19): DWARVEN_GUARDIAN_STATUES, DWARVEN_STONE_HOUSES, CORNER_WATCHTOWERS, HILL_BRIDGE_YAW, HILL_WATCHTOWERS, ROPE_BRIDGE_DEF, findWatchtowerLadderAt(), FORTRESS_DOORS (+11 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.08
Nodes (34): _camTargetLook, _euler, _sunVec, src_world_terrainmath_arrowelementkind, src_world_terrainmath_assignhotbarslot, src_world_terrainmath_awardskillxp, src_world_terrainmath_buymarketitem, src_world_terrainmath_classifyswordattackphase (+26 more)

### Community 8 - "AppException.ts"
Cohesion: 0.27
Nodes (5): AppException, InfrastructureCorruptedException, InvalidResultAccessException, createTickErrorGuard(), TickErrorDecision

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

### Community 13 - "labCatalog.ts"
Cohesion: 0.17
Nodes (24): CAMERA_PRESETS, CharacterLabView(), ENVIRONMENT_PRESETS, ICharacterLabViewProps, SPEED_OPTIONS, countActivePoseOverrides(), createInitialLabSessionState(), EDITOR_LABEL_FIELDS (+16 more)

### Community 14 - "config.ts"
Cohesion: 0.27
Nodes (13): clamp(), IValidatedPositionOverride, IValidatedUrlOverrides, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS, URL_SEASON_OFFSETS (+5 more)

### Community 15 - "worldTypes.ts"
Cohesion: 0.12
Nodes (22): ITelemetrySnapshot, ArrowElementKind, BiomeType, createCatalogItem(), DEFAULT_STARTER_OWNED_ITEM_IDS, EquippedToolSlot, FIRST_MARKET_CATALOG_ITEM, IArrowTrailPoint (+14 more)

### Community 16 - "proceduralModels.ts"
Cohesion: 0.06
Nodes (90): three, ref_three_addons_environments_roomenvironment_js, buildColliderDebugWireframes(), IColliderDebugHandles, buildDwarvenKingdomAndMiners(), IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig (+82 more)

### Community 17 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, tailwindcss, @tailwindcss/vite, tsx, @types/node, @types/react, @types/react-dom, @types/three (+3 more)

### Community 18 - "atmosphereRenderController.ts"
Cohesion: 0.12
Nodes (19): ref_three_addons_objects_sky_js, applyDynamicAtmosphereToScene(), _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor, IHudTelemetryInput (+11 more)

### Community 19 - "terrainAndBiomeSystem.ts"
Cohesion: 0.17
Nodes (25): CLEAR_ZONES, FLAT_BUILDING_TERRACES, SOLID_BUILDING_BOXES, BEAR_MOUNTAIN_CAVES, BIRCH_GROVE_CENTER, CROCODILE_RIVER_BEND_POS, MAGIC_STONE_CIRCLE_POS, PLAYER_EYE_HEIGHT (+17 more)

### Community 21 - "GameShellOverlay.tsx"
Cohesion: 0.09
Nodes (33): IWeatherOptionDef, SEASON_OPTIONS, SkyrimModalMode, WEATHER_OPTIONS, renderArtifactArtwork(), formatMarketError(), InventoryCategoryTab, ISkyrimInventoryModalProps (+25 more)

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
Cohesion: 0.12
Nodes (24): ANIMATION_SPEED_RANGE, CAMERA_PERSPECTIVES, FIREFLIES_MODES, GameSettingsValidationError, isNumberInRange(), isOneOf(), isPlainObject(), JUMP_FORCE_RANGE (+16 more)

### Community 34 - "combatAndInventorySystem.ts"
Cohesion: 0.08
Nodes (24): IWildlifeAndFootprintsHandles, IArcheryTargetDef, IBoidBirdState, ISmallAnimalState, ARCHERY_TARGETS_SPATIAL_GRID, arrowFireStrategy, arrowNormalStrategy, arrowWindStrategy (+16 more)

### Community 36 - "itemArtworkRegistry.tsx"
Cohesion: 0.12
Nodes (7): GameShellOverlay, ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy, renderItemSvgIcon(), useTelemetry()

### Community 38 - "WorldCanvas"
Cohesion: 0.14
Nodes (22): WorldCanvas, createAnimationFrameScheduler(), createGpuFencePacedScheduler(), getActiveWorldAnimals(), computeTargetFov(), createCameraPose(), createCameraRigState(), easeFovToward() (+14 more)

### Community 47 - "playerPhysicsSystem.ts"
Cohesion: 0.16
Nodes (13): PLAYABLE_RADIUS, ARCHERY_TARGETS, CHINESE_FORTRESS_POS, chineseFortressStairHeightAt(), FORTRESS_Y_OFFSET, FORTRESS_Z_OFFSET, isChineseFortressWalkableZone(), RIDEABLE_HORSES (+5 more)

### Community 48 - "JaguarAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyJaguar(), Jaguar, JAGUAR_EMBEDDED_PACK_B64, JAGUAR_EMBEDDED_TEXTURE_URI, JAGUAR_GAITS, JAGUAR_STATES, JaguarAnimator (+5 more)

### Community 49 - "IPlayerState"
Cohesion: 0.17
Nodes (9): IPlayerAndCombatHandle, InventoryItemId, IPlayerState, ICameraRigFrameInput, ArrowEquipmentStrategy, BowEquipmentStrategy, IEquipmentSlotStrategy, SwordEquipmentStrategy (+1 more)

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
Cohesion: 0.14
Nodes (11): createReadyCrocodile(), CROC_EMBEDDED_PACK_B64, CROC_EMBEDDED_TEXTURE_URI, Crocodile, CROCODILE_GAITS, CROCODILE_STATES, CrocodileOptions, CrocodileRig (+3 more)

### Community 62 - "ref_node_test"
Cohesion: 0.17
Nodes (6): ref_node_assert_strict, ref_node_test, globalWithWindow, ConsoleLogger, NullLogger, src_world_terrainmath_biometype

### Community 63 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.18
Nodes (16): SOUTHERN_MINE_POS, IDwarvenMinerCaravanState, buildMinerWaypoints(), CaravanPath, computeDwarvenMinerCaravanState(), DWARVEN_MINER_STATIONS, DWARVEN_MINERS_COUNT, IMinerStationConfig (+8 more)

### Community 65 - "horsePhysicsSystem.ts"
Cohesion: 0.29
Nodes (8): computeHorseBiomechanicalPose(), computeHorseTurnResistance(), IHorseBiomechanicalPose, IHorseLimbAngles, IHorseSteeringStepResult, solveForelimb(), solveHindlimb(), stepMountedHorseSteering()

### Community 66 - "t"
Cohesion: 0.20
Nodes (11): ExplorerMinimap, GRID_SIZE, IExplorerMinimapProps, en, LocaleSchema, getLocaleDictionary(), setLocaleDictionary(), t() (+3 more)

### Community 68 - "keyBindingMatch.ts"
Cohesion: 0.70
Nodes (3): isBindingHeld(), matchesKeyBinding(), MODIFIER_FAMILIES

### Community 69 - "WolfAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyWolf(), unpackWolfBundle(), Wolf, WOLF_EMBEDDED_PACK_B64, WOLF_EMBEDDED_TEXTURE_URI, WOLF_GAITS, WOLF_STATES (+5 more)

### Community 70 - "labModelFactory.ts"
Cohesion: 0.24
Nodes (16): ref_three_examples_jsm_environments_roomenvironment_js, CharacterLabCanvas(), afterDraw(), tick(), ICharacterLabCanvasProps, computeLabAnimationCycleProgress(), getEffectiveLabAnimationSpeed(), ILabAnimationDef (+8 more)

### Community 71 - "wildlifeAndFootprintsBuilder.ts"
Cohesion: 0.29
Nodes (10): buildWildlifeAndFootprintsLayer(), IWildlifeSoundCallbacks, attachDeerGlbModel(), IAnimatedDeer, createFootprintTrailTracker(), FOOTPRINT_MAX_AGE_SECONDS, IFootprintTrailTracker, isImprintableBiomeSurface() (+2 more)

### Community 72 - "vite.config.ts"
Cohesion: 0.14
Nodes (14): ref_node_fs_promises, ref_node_http, ref_path, @tailwindcss/vite, vite, @vitejs/plugin-react, assertTrustedJsonRequest(), PERSISTENCE_ROUTES (+6 more)

### Community 74 - "תיקיית מודלים תלת-ממדיים (`public/models`)"
Cohesion: 0.50
Nodes (3): מבנה תיקיות מומלץ (אופציונלי, או ישירות בתיקייה זו):, פורמטים מומלצים:, תיקיית מודלים תלת-ממדיים (`public/models`)

### Community 76 - "AppServicesContext.spec.ts"
Cohesion: 0.23
Nodes (10): react, ref_react_dom_client, ref_react_dom_server, AppServicesContext, AppServicesProvider, createAppServices(), IAppServices, src_index (+2 more)

### Community 79 - "movementIntent.spec.ts"
Cohesion: 0.47
Nodes (4): IMovementAxes, readMovementAxes(), BINDINGS, NO_JOYSTICK

### Community 81 - "registerWindowDebugBridge"
Cohesion: 0.26
Nodes (10): registerWindowDebugBridge(), findNearestMarketStall(), assignHotbarSlot(), buyMarketItem(), equipInventoryItem(), MarketTransactionResult, sellMarketItem(), toggleFavoriteItem() (+2 more)

### Community 82 - "weaponFeelSystem.spec.ts"
Cohesion: 0.60
Nodes (3): IMeleeFeelInput, stepBowFeel(), stepMeleeFeelAndSway()

## Knowledge Gaps
- **222 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+217 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 441 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `proceduralModels.ts` to `boidsAndWildlifeSystem.ts`, `terrainMath.test.ts`, `WolfAnimator`, `labModelFactory.ts`, `wildlifeAndFootprintsBuilder.ts`, `WorldCanvas.tsx`, `package.json`, `Deer_Complete.ts`, `JaguarAnimator`, `atmosphereRenderController.ts`, `Rhino.ts`, `playerAndCombatBuilder.ts`, `DemonDragon_Complete.ts`, `ForestDragon_Complete.ts`, `Bear.ts`, `Crocodile.ts`?**
  _High betweenness centrality (0.235) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `boidsAndWildlifeSystem.ts`, `App.tsx`, `combatAndInventorySystem.ts`, `ILogger`, `itemArtworkRegistry.tsx`, `WorldCanvas`, `WorldCanvas.tsx`, `collisionAndTerraces.ts`, `hudTelemetryBuilder.ts`, `labCatalog.ts`, `playerPhysicsSystem.ts`, `ErrorBoundary`, `worldTypes.ts`, `terrainAndBiomeSystem.ts`, `GameShellOverlay.tsx`, `telemetryStore.ts`, `dwarvenMineAndCaravanSystem.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `ILogger` connect `ILogger` to `App.tsx`, `wildlifeAndFootprintsBuilder.ts`, `MockLogger`, `AppServicesContext.spec.ts`, `GameLoop`, `proceduralModels.ts`, `NatureSoundEngine`, `ref_node_test`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `WorldCanvas` (e.g. with `.runFrame()` and `.start()`) actually correct?**
  _`WorldCanvas` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _222 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `boidsAndWildlifeSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.062342342342342344 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1402116402116402 - nodes in this community are weakly interconnected._