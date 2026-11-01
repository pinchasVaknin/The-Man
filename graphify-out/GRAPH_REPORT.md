# Graph Report - TheMan  (2026-11-01)

## Corpus Check
- 118 files · ~238,241 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1276 nodes · 3459 edges · 71 communities (47 shown, 24 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `09ab8ab6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- boidsAndWildlifeSystem.ts
- App.tsx
- terrainMath.test.ts
- swordAttackAnimationSystem.ts
- config.ts
- combatAndInventorySystem.ts
- terrainAndBiomeSystem.ts
- WorldCanvas.tsx
- Result
- package.json
- Deer_Complete.ts
- compilerOptions
- persistedSettingsValidation.ts
- playerAndCombatBuilder.ts
- NatureSoundEngine
- JaguarAnimator
- proceduralModels.ts
- devDependencies
- atmosphereRenderController.ts
- landmarksRegistry.ts
- dwarvenMineAndCaravanSystem.ts
- GameShellOverlay.tsx
- TheMan — 3D Living Nature & RPG World Simulator
- rules/graphify.md
- workflows/graphify.md
- CLAUDE.md
- t
- WorldCanvas
- telemetryStore.ts
- src_world_terrainmath_computedwarvenminercaravanstate
- main.tsx
- src_world_terrainmath_dwarven_guardian_statues
- src_world_terrainmath_dwarven_miners_count
- src_world_terrainmath_dwarven_stone_houses
- labOverridesStorage.ts
- src_world_terrainmath_arrowprojectile
- itemArtworkRegistry.tsx
- src_world_terrainmath_characterskillsstate
- worldTypes.ts
- src_world_terrainmath_inventoryitemdef
- src_world_terrainmath_obstaclecylinder
- ref_domain_worldtypes
- src_world_domain_landmarksregistry_chinesefortressstairheightat
- src_world_terrainmath_solaratmosphere
- src_world_terrainmath_playerstate
- src_world_terrainmath_rideablehorsestate
- src_world_terrainmath_weatherstatesnapshot
- labModelFactory.ts
- Jaguar.ts
- IPlayerState
- labCatalog.ts
- Rhino.ts
- SpatialHashGrid2D
- DemonDragon_Complete.ts
- src_world_terrainmath_dynamicatmospherestate
- ForestDragon_Complete.ts
- scripts
- getEffectiveLabAnimationSpeed
- dependencies
- BearAnimator
- Crocodile.ts
- src_world_terrainmath_getanimalspeciesnamehe
- ref_node_assert_strict
- collisionAndTerraces.ts
- horsePhysicsSystem.ts
- wildlifeAndFootprintsBuilder.ts
- WolfAnimator
- vite.config.ts
- תיקיית מודלים תלת-ממדיים (`public/models`)
- src_world_terrainmath_archery_targets
- src_locales_index_he

## God Nodes (most connected - your core abstractions)
1. `t()` - 49 edges
2. `groundHeightAt()` - 43 edges
3. `WorldCanvas` - 40 edges
4. `walkableHeightAt()` - 39 edges
5. `three` - 34 edges
6. `DeerAnimator` - 33 edges
7. `NatureSoundEngine` - 27 edges
8. `registerWindowDebugBridge()` - 24 edges
9. `IPlayerState` - 24 edges
10. `hash2D()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `saveLabOverrides()` --calls--> `validateLabOverrides()`  [EXTRACTED]
  vite.config.ts → src/config/persistedSettingsValidation.ts
- `WorldCanvas` --indirect_call--> `tick()`  [INFERRED]
  src/components/WorldCanvas.tsx → src/lab/CharacterLabCanvas.tsx
- `saveGameSettings()` --calls--> `validateGameSettings()`  [EXTRACTED]
  vite.config.ts → src/config/persistedSettingsValidation.ts
- `horseSkinsFromWorld` --calls--> `t()`  [EXTRACTED]
  src/lab/labCatalog.ts → src/locales/index.ts
- `createCatalogItem()` --calls--> `t()`  [EXTRACTED]
  src/world/domain/worldTypes.ts → src/locales/index.ts

## Import Cycles
- None detected.

## Communities (71 total, 24 thin omitted)

### Community 0 - "boidsAndWildlifeSystem.ts"
Cohesion: 0.11
Nodes (33): activeWorldAnimalsRegistry, advanceAnimalWithWaterShoreRecovery(), AnimalAiBehavior, BIRD_FLOCK_CONFIGS, caveLocalToWorld(), computePlayerNoiseRateAtDistance(), createInitialBoidBirds(), createInitialSmallAnimals() (+25 more)

### Community 1 - "App.tsx"
Cohesion: 0.14
Nodes (23): App(), WEATHER_CYCLE_ORDER, GameSettingsModal(), IGameSettingsModalProps, IKeybindRowMeta, KEYBIND_CATEGORIES, KEYBIND_ROWS, KeybindCategory (+15 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.05
Nodes (50): HUNTER_LODGE_POS, LAKESIDE_TEA_PAVILION_POS, RIVERSIDE_WINDMILLS, SAKURA_SANCTUARY_POS, SAKURA_SANCTUARY_YAW, VALLEY_FARMS, ISettlementModelHandles, DEFAULT_WEATHER_CYCLE_MODE (+42 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.09
Nodes (33): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+25 more)

### Community 4 - "config.ts"
Cohesion: 0.35
Nodes (10): clamp(), IValidatedPositionOverride, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS, URL_SEASON_OFFSETS, URL_WEATHER_MAP (+2 more)

### Community 5 - "combatAndInventorySystem.ts"
Cohesion: 0.08
Nodes (32): DEFAULT_STARTER_OWNED_ITEM_IDS, IArcheryTargetDef, IInventoryItemDef, ISolidBuildingBox, getActiveWorldAnimals(), ISmallAnimalState, ARCHERY_TARGETS_SPATIAL_GRID, arrowFireStrategy (+24 more)

### Community 6 - "terrainAndBiomeSystem.ts"
Cohesion: 0.14
Nodes (28): southernRiverBridgeHeightAt(), chineseFortressStairHeightAt(), isChineseFortressWalkableZone(), ropeBridgePointInfoAt(), findLookedAtWatchtowerLadder(), findWatchtowerLadderAt(), FORTRESS_DOORS, getLadderById() (+20 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.06
Nodes (42): ref_three_addons_environments_roomenvironment_js, _camTargetLook, _euler, _sunVec, _tourLook, _tourPos, EquippedToolSlot, WalkPaceMode (+34 more)

### Community 8 - "Result"
Cohesion: 0.15
Nodes (7): AppException, InfrastructureCorruptedException, InvalidResultAccessException, Result, createTickErrorGuard(), ITickErrorGuard, TickErrorDecision

### Community 9 - "package.json"
Cohesion: 0.14
Nodes (13): name, private, type, version, react-dom, tailwindcss, tsx, @types/node (+5 more)

### Community 10 - "Deer_Complete.ts"
Cohesion: 0.05
Nodes (40): BoneDef, BoneGroup, BoneName, Chain, CHAINS, computeDeerSkinWeights(), createReadyDeer(), Deer (+32 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "persistedSettingsValidation.ts"
Cohesion: 0.15
Nodes (19): ANIMATION_SPEED_RANGE, CAMERA_PERSPECTIVES, FIREFLIES_MODES, GameSettingsValidationError, isNumberInRange(), isOneOf(), isPlainObject(), JUMP_FORCE_RANGE (+11 more)

### Community 13 - "playerAndCombatBuilder.ts"
Cohesion: 0.12
Nodes (14): IPlayerAndCombatBuilderContext, ArrowElementKind, ARROW_TRAIL_MAX_AGE, LOCKED_SWORD_GRIP_TRANSFORM, src_world_terrainmath_arrow_trail_max_age, src_world_terrainmath_arrowelementkind, src_world_terrainmath_computefirstpersonswordattackpose, src_world_terrainmath_computeslopepitchandroll (+6 more)

### Community 16 - "proceduralModels.ts"
Cohesion: 0.06
Nodes (86): three, buildColliderDebugWireframes(), IColliderDebugHandles, buildDwarvenKingdomAndMiners(), attachFlagHorizontalWaveShader(), attachWindSwayShader(), createBirchBarkTexture(), perturbGeometryVertices() (+78 more)

### Community 17 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, tailwindcss, @tailwindcss/vite, tsx, @types/node, @types/react, @types/react-dom, @types/three (+3 more)

### Community 18 - "atmosphereRenderController.ts"
Cohesion: 0.18
Nodes (10): ref_three_addons_objects_sky_js, applyDynamicAtmosphereToScene(), _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor, src_world_terrainmath_computedynamicsolarcycle (+2 more)

### Community 19 - "landmarksRegistry.ts"
Cohesion: 0.18
Nodes (21): SOLID_BUILDING_BOXES, BEAR_MOUNTAIN_CAVES, BIRCH_GROVE_CENTER, CROCODILE_RIVER_BEND_POS, MAGIC_STONE_CIRCLE_POS, PLAYABLE_RADIUS, PLAYER_EYE_HEIGHT, SMALL_MEADOW_HILLS (+13 more)

### Community 20 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.17
Nodes (13): IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig, buildMinerWaypoints(), CaravanPath, computeDwarvenMinerCaravanState(), DWARVEN_MINER_STATIONS, DWARVEN_MINERS_COUNT (+5 more)

### Community 21 - "GameShellOverlay.tsx"
Cohesion: 0.11
Nodes (31): react, GameShellOverlay, SEASON_OPTIONS, SkyrimModalMode, WEATHER_OPTIONS, renderArtifactArtwork(), renderItemSvgIcon(), formatMarketError() (+23 more)

### Community 22 - "TheMan — 3D Living Nature & RPG World Simulator"
Cohesion: 0.29
Nodes (6): Engineering standards, Getting Started, Installation & Run, Overview & Architecture, Prerequisites, TheMan — 3D Living Nature & RPG World Simulator

### Community 26 - "t"
Cohesion: 0.20
Nodes (11): ExplorerMinimap, GRID_SIZE, IExplorerMinimapProps, en, LocaleSchema, getLocaleDictionary(), setLocaleDictionary(), t() (+3 more)

### Community 27 - "WorldCanvas"
Cohesion: 0.23
Nodes (15): WorldCanvas, registerWindowDebugBridge(), findNearestFortressDoor(), findNearestMarketStall(), findNearestDeadLootableAnimal(), assignHotbarSlot(), buyMarketItem(), equipInventoryItem() (+7 more)

### Community 28 - "telemetryStore.ts"
Cohesion: 0.33
Nodes (5): TelemetrySnapshot, INITIAL_TELEMETRY_SNAPSHOT, ITelemetryStore, telemetryStore, src_world_terrainmath_world_spawn

### Community 30 - "main.tsx"
Cohesion: 0.20
Nodes (4): ref_react_dom_client, ErrorBoundary, src_index, rootElement

### Community 34 - "labOverridesStorage.ts"
Cohesion: 0.36
Nodes (5): validateLabOverrides(), DEFAULT_LAB_POSE_OVERRIDES, LAB_POSE_OVERRIDES_STORAGE_KEY, mergeStoredLabOverrides(), StoredLabOverridesError

### Community 36 - "itemArtworkRegistry.tsx"
Cohesion: 0.14
Nodes (4): ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy

### Community 38 - "worldTypes.ts"
Cohesion: 0.08
Nodes (31): IWeatherOptionDef, ITelemetrySnapshot, IValidatedUrlOverrides, IWindowDebugBridgeDeps, BiomeType, createCatalogItem(), FIRST_MARKET_CATALOG_ITEM, IArrowProjectile (+23 more)

### Community 47 - "labModelFactory.ts"
Cohesion: 0.32
Nodes (11): ref_three_examples_jsm_environments_roomenvironment_js, ICharacterLabCanvasProps, ILabAnimationDef, ILabEntityDef, ILabPoseOverrides, ILabSkinDef, LabCameraPreset, LabStageEnvironment (+3 more)

### Community 48 - "Jaguar.ts"
Cohesion: 0.12
Nodes (12): CLIP_ORDER, createReadyJaguar(), Jaguar, JAGUAR_EMBEDDED_PACK_B64, JAGUAR_EMBEDDED_TEXTURE_URI, JAGUAR_GAITS, JAGUAR_STATES, JaguarOptions (+4 more)

### Community 49 - "IPlayerState"
Cohesion: 0.13
Nodes (9): IPlayerAndCombatHandle, IPlayerState, ArrowEquipmentStrategy, BowEquipmentStrategy, IEquipmentSlotStrategy, isInventoryItemEquipped(), SwordEquipmentStrategy, ToolEquipmentStrategy (+1 more)

### Community 50 - "labCatalog.ts"
Cohesion: 0.19
Nodes (23): CAMERA_PRESETS, CharacterLabView(), ENVIRONMENT_PRESETS, ICharacterLabViewProps, SPEED_OPTIONS, countActivePoseOverrides(), createInitialLabSessionState(), filterLabEntities() (+15 more)

### Community 51 - "Rhino.ts"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyRhino(), Rhino, RHINO_EMBEDDED_PACK_B64, RHINO_EMBEDDED_TEXTURE_URI, RHINO_GAITS, RHINO_STATES, RhinoAnimator (+5 more)

### Community 53 - "DemonDragon_Complete.ts"
Cohesion: 0.10
Nodes (13): CLIP_ORDER, createReadyDemonDragon(), DEMON_DRAGON_EMBEDDED_PACK_B64, DEMON_DRAGON_EMBEDDED_TEXTURE_URI, DEMON_DRAGON_GAITS, DemonDragon, DemonDragonAnimator, DemonDragonOptions (+5 more)

### Community 55 - "ForestDragon_Complete.ts"
Cohesion: 0.09
Nodes (14): CLIP_ORDER, createReadyForestDragon(), FOREST_DRAGON_EMBEDDED_PACK_B64, FOREST_DRAGON_EMBEDDED_TEXTURE_URI, FOREST_DRAGON_GAITS, ForestDragon, ForestDragonAnimator, ForestDragonOptions (+6 more)

### Community 56 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, preview, test

### Community 57 - "getEffectiveLabAnimationSpeed"
Cohesion: 0.70
Nodes (5): CharacterLabCanvas(), afterDraw(), tick(), computeLabAnimationCycleProgress(), getEffectiveLabAnimationSpeed()

### Community 58 - "dependencies"
Cohesion: 0.50
Nodes (4): dependencies, react, react-dom, three

### Community 59 - "BearAnimator"
Cohesion: 0.10
Nodes (13): Bear, BEAR_EMBEDDED_PACK_B64, BEAR_EMBEDDED_TEXTURE_URI, BEAR_GAITS, BEAR_STATES, BearAnimator, BearOptions, BearRig (+5 more)

### Community 60 - "Crocodile.ts"
Cohesion: 0.10
Nodes (12): createReadyCrocodile(), CROC_EMBEDDED_PACK_B64, CROC_EMBEDDED_TEXTURE_URI, Crocodile, CROCODILE_GAITS, CROCODILE_STATES, CrocodileAnimator, CrocodileOptions (+4 more)

### Community 62 - "ref_node_assert_strict"
Cohesion: 0.08
Nodes (12): ref_node_assert_strict, ref_node_test, IErrorBoundaryProps, IErrorBoundaryState, MockErrorLogger, SAVED_GAME_SETTINGS, globalWithWindow, ConsoleLogger (+4 more)

### Community 63 - "collisionAndTerraces.ts"
Cohesion: 0.14
Nodes (19): CLEAR_ZONES, FLAT_BUILDING_TERRACES, DWARVEN_GUARDIAN_STATUES, DWARVEN_STONE_HOUSES, SOUTHERN_MINE_POS, ARCHERY_TARGETS, CHINESE_FORTRESS_POS, CORNER_WATCHTOWERS (+11 more)

### Community 65 - "horsePhysicsSystem.ts"
Cohesion: 0.29
Nodes (8): computeHorseBiomechanicalPose(), computeHorseTurnResistance(), IHorseBiomechanicalPose, IHorseLimbAngles, IHorseSteeringStepResult, solveForelimb(), solveHindlimb(), stepMountedHorseSteering()

### Community 66 - "wildlifeAndFootprintsBuilder.ts"
Cohesion: 0.16
Nodes (17): SAVED_LAB_OVERRIDES, buildPlayerAndCombatSystems(), buildWildlifeAndFootprintsLayer(), IWildlifeAndFootprintsHandles, IWildlifeSoundCallbacks, attachDeerGlbModel(), IAnimatedDeer, IBoidBirdState (+9 more)

### Community 69 - "WolfAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyWolf(), unpackWolfBundle(), Wolf, WOLF_EMBEDDED_PACK_B64, WOLF_EMBEDDED_TEXTURE_URI, WOLF_GAITS, WOLF_STATES (+5 more)

### Community 72 - "vite.config.ts"
Cohesion: 0.15
Nodes (12): ref_node_fs_promises, ref_node_http, ref_path, @tailwindcss/vite, vite, assertTrustedJsonRequest(), PERSISTENCE_ROUTES, PersistenceErrorCode (+4 more)

### Community 74 - "תיקיית מודלים תלת-ממדיים (`public/models`)"
Cohesion: 0.50
Nodes (3): מבנה תיקיות מומלץ (אופציונלי, או ישירות בתיקייה זו):, פורמטים מומלצים:, תיקיית מודלים תלת-ממדיים (`public/models`)

## Knowledge Gaps
- **210 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+205 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 412 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `proceduralModels.ts` to `wildlifeAndFootprintsBuilder.ts`, `terrainMath.test.ts`, `WolfAnimator`, `worldTypes.ts`, `WorldCanvas.tsx`, `package.json`, `Deer_Complete.ts`, `playerAndCombatBuilder.ts`, `labModelFactory.ts`, `Jaguar.ts`, `atmosphereRenderController.ts`, `Rhino.ts`, `dwarvenMineAndCaravanSystem.ts`, `DemonDragon_Complete.ts`, `ForestDragon_Complete.ts`, `BearAnimator`, `Crocodile.ts`?**
  _High betweenness centrality (0.270) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `boidsAndWildlifeSystem.ts`, `App.tsx`, `terrainMath.test.ts`, `combatAndInventorySystem.ts`, `terrainAndBiomeSystem.ts`, `WorldCanvas.tsx`, `worldTypes.ts`, `proceduralModels.ts`, `labCatalog.ts`, `dwarvenMineAndCaravanSystem.ts`, `GameShellOverlay.tsx`, `main.tsx`, `WorldCanvas`, `telemetryStore.ts`, `ref_node_assert_strict`, `collisionAndTerraces.ts`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _210 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `boidsAndWildlifeSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11229946524064172 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14153846153846153 - nodes in this community are weakly interconnected._
- **Should `terrainMath.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.04644412191582003 - nodes in this community are weakly interconnected._
- **Should `swordAttackAnimationSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09243697478991597 - nodes in this community are weakly interconnected._