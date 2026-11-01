# Graph Report - TheMan  (2026-11-01)

## Corpus Check
- 139 files · ~273,932 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1329 nodes · 3660 edges · 73 communities (46 shown, 27 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2abed704`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- boidsAndWildlifeSystem.ts
- t
- terrainMath.test.ts
- swordAttackAnimationSystem.ts
- MockErrorLogger
- combatAndInventorySystem.ts
- collisionAndTerraces.ts
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
- WorldCanvas
- telemetryStore.ts
- src_world_terrainmath_computedwarvenminercaravanstate
- locales/index.ts
- src_world_terrainmath_dwarven_guardian_statues
- src_world_terrainmath_dwarven_miners_count
- src_world_terrainmath_dwarven_stone_houses
- playerPhysicsSystem.ts
- src_world_terrainmath_arrowprojectile
- itemArtworkRegistry.tsx
- src_world_terrainmath_characterskillsstate
- IGameSettingsConfig
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
- BearAnimator
- Crocodile.ts
- src_world_terrainmath_getanimalspeciesnamehe
- ILogger
- dwarvenMineAndCaravanSystem.ts
- ref_node_test
- horsePhysicsSystem.ts
- main.tsx
- MockLogger
- WolfAnimator
- vite.config.ts
- תיקיית מודלים תלת-ממדיים (`public/models`)
- src_world_terrainmath_archery_targets
- src_locales_index_he

## God Nodes (most connected - your core abstractions)
1. `t()` - 49 edges
2. `WorldCanvas` - 46 edges
3. `groundHeightAt()` - 43 edges
4. `walkableHeightAt()` - 39 edges
5. `three` - 34 edges
6. `DeerAnimator` - 33 edges
7. `NatureSoundEngine` - 27 edges
8. `IPlayerState` - 26 edges
9. `registerWindowDebugBridge()` - 24 edges
10. `ILogger` - 19 edges

## Surprising Connections (you probably didn't know these)
- `saveGameSettings()` --calls--> `validateGameSettings()`  [EXTRACTED]
  vite.config.ts → src/config/persistedSettingsValidation.ts
- `saveLabOverrides()` --calls--> `validateLabOverrides()`  [EXTRACTED]
  vite.config.ts → src/config/persistedSettingsValidation.ts
- `IWeatherOptionDef` --references--> `WeatherToggleOption`  [EXTRACTED]
  src/components/GameShellOverlay.tsx → src/world/domain/worldTypes.ts
- `createCatalogItem()` --calls--> `t()`  [EXTRACTED]
  src/world/domain/worldTypes.ts → src/locales/index.ts
- `getArrowKindLabel()` --calls--> `t()`  [EXTRACTED]
  src/world/systems/combatAndInventorySystem.ts → src/locales/index.ts

## Import Cycles
- None detected.

## Communities (73 total, 27 thin omitted)

### Community 0 - "boidsAndWildlifeSystem.ts"
Cohesion: 0.11
Nodes (37): activeWorldAnimalsRegistry, advanceAnimalWithWaterShoreRecovery(), AnimalAiBehavior, BIRD_FLOCK_CONFIGS, caveLocalToWorld(), computePlayerNoiseRateAtDistance(), createInitialBoidBirds(), createInitialSmallAnimals() (+29 more)

### Community 1 - "t"
Cohesion: 0.12
Nodes (22): App(), WEATHER_CYCLE_ORDER, GameSettingsModal(), IKeybindRowMeta, KEYBIND_CATEGORIES, KEYBIND_ROWS, KeybindCategory, DEFAULT_GAME_KEYBINDINGS (+14 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.05
Nodes (39): LAKESIDE_TEA_PAVILION_POS, ISettlementModelHandles, src_world_terrainmath_bear_mountain_caves, src_world_terrainmath_birch_grove_center, src_world_terrainmath_chinesefortressstairheightat, src_world_terrainmath_computehorsebiomechanicalpose, src_world_terrainmath_computeweatherstate, src_world_terrainmath_corner_watchtowers (+31 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.09
Nodes (33): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+25 more)

### Community 5 - "combatAndInventorySystem.ts"
Cohesion: 0.07
Nodes (36): IWildlifeAndFootprintsHandles, DEFAULT_STARTER_OWNED_ITEM_IDS, IArcheryTargetDef, IInventoryItemDef, ISolidBuildingBox, getActiveWorldAnimals(), ISmallAnimalState, ARCHERY_TARGETS_SPATIAL_GRID (+28 more)

### Community 6 - "collisionAndTerraces.ts"
Cohesion: 0.33
Nodes (8): DWARVEN_GUARDIAN_STATUES, DWARVEN_STONE_HOUSES, SOUTHERN_MINE_POS, HUNTER_LODGE_POS, RIVERSIDE_WINDMILLS, SAKURA_SANCTUARY_POS, SAKURA_SANCTUARY_YAW, VALLEY_FARMS

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.07
Nodes (39): ref_three_addons_environments_roomenvironment_js, _camTargetLook, _euler, _sunVec, _tourLook, _tourPos, createAnimationFrameScheduler(), createGpuFencePacedScheduler() (+31 more)

### Community 8 - "Result"
Cohesion: 0.19
Nodes (6): AppException, InfrastructureCorruptedException, InvalidResultAccessException, Result, createTickErrorGuard(), TickErrorDecision

### Community 9 - "package.json"
Cohesion: 0.15
Nodes (12): name, private, type, version, react-dom, tailwindcss, tsx, @types/node (+4 more)

### Community 10 - "Deer_Complete.ts"
Cohesion: 0.05
Nodes (39): BoneDef, BoneGroup, BoneName, Chain, CHAINS, computeDeerSkinWeights(), createReadyDeer(), Deer (+31 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "GameLoop"
Cohesion: 0.12
Nodes (6): GameLoop, IFrameScheduler, createHarness(), FakeScheduler, RecordingLogger, ITickErrorGuard

### Community 13 - "labCatalog.ts"
Cohesion: 0.05
Nodes (79): ref_three_examples_jsm_environments_roomenvironment_js, ANIMATION_SPEED_RANGE, CAMERA_PERSPECTIVES, FIREFLIES_MODES, GameSettingsValidationError, isNumberInRange(), isOneOf(), isPlainObject() (+71 more)

### Community 14 - "config.ts"
Cohesion: 0.29
Nodes (12): clamp(), IValidatedPositionOverride, IValidatedUrlOverrides, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS, URL_SEASON_OFFSETS (+4 more)

### Community 15 - "worldTypes.ts"
Cohesion: 0.13
Nodes (23): ITelemetrySnapshot, ArrowElementKind, CameraPerspectiveMode, createCatalogItem(), EquippedToolSlot, FIRST_MARKET_CATALOG_ITEM, IArrowTrailPoint, ICharacterSkillsState (+15 more)

### Community 16 - "proceduralModels.ts"
Cohesion: 0.05
Nodes (105): three, buildColliderDebugWireframes(), IColliderDebugHandles, buildDwarvenKingdomAndMiners(), IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig, buildPlayerAndCombatSystems() (+97 more)

### Community 17 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, tailwindcss, @tailwindcss/vite, tsx, @types/node, @types/react, @types/react-dom, @types/three (+3 more)

### Community 18 - "windowDebugController.spec.ts"
Cohesion: 0.12
Nodes (22): ref_three_addons_objects_sky_js, applyDynamicAtmosphereToScene(), _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor, IHudTelemetryInput (+14 more)

### Community 19 - "terrainAndBiomeSystem.ts"
Cohesion: 0.16
Nodes (26): CLEAR_ZONES, FLAT_BUILDING_TERRACES, BEAR_MOUNTAIN_CAVES, BIRCH_GROVE_CENTER, CROCODILE_RIVER_BEND_POS, MAGIC_STONE_CIRCLE_POS, PLAYABLE_RADIUS, PLAYER_EYE_HEIGHT (+18 more)

### Community 21 - "GameShellOverlay.tsx"
Cohesion: 0.11
Nodes (29): IWeatherOptionDef, SEASON_OPTIONS, SkyrimModalMode, WEATHER_OPTIONS, renderArtifactArtwork(), formatMarketError(), InventoryCategoryTab, ISkyrimInventoryModalProps (+21 more)

### Community 22 - "TheMan — 3D Living Nature & RPG World Simulator"
Cohesion: 0.29
Nodes (6): Engineering standards, Getting Started, Installation & Run, Overview & Architecture, Prerequisites, TheMan — 3D Living Nature & RPG World Simulator

### Community 27 - "WorldCanvas"
Cohesion: 0.24
Nodes (17): WorldCanvas, buildTelemetrySnapshot(), registerWindowDebugBridge(), findLookedAtWatchtowerLadder(), findNearestBed(), findNearestFortressDoor(), findNearestMarketStall(), findNearestDeadLootableAnimal() (+9 more)

### Community 28 - "telemetryStore.ts"
Cohesion: 0.21
Nodes (7): react, ExplorerMinimap, GRID_SIZE, IExplorerMinimapProps, ITelemetryStore, telemetryStore, TelemetrySnapshot

### Community 30 - "locales/index.ts"
Cohesion: 0.28
Nodes (6): en, LocaleSchema, TranslationDictionary, MARKET_STALL_LOCATIONS, SOUTHEAST_HARBOR_POS, SOUTHWEST_OASIS_POS

### Community 34 - "playerPhysicsSystem.ts"
Cohesion: 0.13
Nodes (20): SOLID_BUILDING_BOXES, ARCHERY_TARGETS, CHINESE_FORTRESS_POS, chineseFortressStairHeightAt(), CORNER_WATCHTOWERS, FORTRESS_Y_OFFSET, FORTRESS_Z_OFFSET, isChineseFortressWalkableZone() (+12 more)

### Community 36 - "itemArtworkRegistry.tsx"
Cohesion: 0.12
Nodes (7): GameShellOverlay, ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy, renderItemSvgIcon(), useTelemetry()

### Community 38 - "IGameSettingsConfig"
Cohesion: 0.43
Nodes (7): IGameSettingsModalProps, IGameShellOverlayProps, IWorldCanvasProps, IGameSettingsConfig, GameStateMode, IVirtualMoveState, IGameActions

### Community 47 - "keyBindingMatch.ts"
Cohesion: 0.70
Nodes (3): isBindingHeld(), matchesKeyBinding(), MODIFIER_FAMILIES

### Community 48 - "JaguarAnimator"
Cohesion: 0.09
Nodes (12): CLIP_ORDER, Jaguar, JAGUAR_EMBEDDED_PACK_B64, JAGUAR_EMBEDDED_TEXTURE_URI, JAGUAR_GAITS, JAGUAR_STATES, JaguarAnimator, JaguarOptions (+4 more)

### Community 49 - "IPlayerState"
Cohesion: 0.13
Nodes (8): IPlayerState, ArrowEquipmentStrategy, BowEquipmentStrategy, IEquipmentSlotStrategy, isInventoryItemEquipped(), SwordEquipmentStrategy, ToolEquipmentStrategy, UsableGearStrategy

### Community 51 - "Rhino.ts"
Cohesion: 0.09
Nodes (12): CLIP_ORDER, Rhino, RHINO_EMBEDDED_PACK_B64, RHINO_EMBEDDED_TEXTURE_URI, RHINO_GAITS, RHINO_STATES, RhinoAnimator, RhinoOptions (+4 more)

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
Nodes (12): Bear, BEAR_EMBEDDED_PACK_B64, BEAR_EMBEDDED_TEXTURE_URI, BEAR_GAITS, BEAR_STATES, BearAnimator, BearOptions, BearRig (+4 more)

### Community 60 - "Crocodile.ts"
Cohesion: 0.10
Nodes (11): CROC_EMBEDDED_PACK_B64, CROC_EMBEDDED_TEXTURE_URI, Crocodile, CROCODILE_GAITS, CROCODILE_STATES, CrocodileAnimator, CrocodileOptions, CrocodileRig (+3 more)

### Community 62 - "ILogger"
Cohesion: 0.14
Nodes (7): IErrorBoundaryProps, IErrorBoundaryState, IGameLoopOptions, ConsoleLogger, ILogger, NullLogger, src_world_terrainmath_biometype

### Community 63 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.20
Nodes (14): IDwarvenMinerCaravanState, buildMinerWaypoints(), CaravanPath, computeDwarvenMinerCaravanState(), DWARVEN_MINER_STATIONS, IMinerStationConfig, interpolateDwarvenCaravanWaypoints(), isInsideSouthernMine() (+6 more)

### Community 64 - "ref_node_test"
Cohesion: 0.18
Nodes (12): ref_node_assert_strict, ref_node_fs, ref_node_os, ref_node_path, ref_node_test, ref_node_url, INITIAL_TELEMETRY_SNAPSHOT, getLocaleDictionary() (+4 more)

### Community 65 - "horsePhysicsSystem.ts"
Cohesion: 0.29
Nodes (8): computeHorseBiomechanicalPose(), computeHorseTurnResistance(), IHorseBiomechanicalPose, IHorseLimbAngles, IHorseSteeringStepResult, solveForelimb(), solveHindlimb(), stepMountedHorseSteering()

### Community 66 - "main.tsx"
Cohesion: 0.20
Nodes (4): ref_react_dom_client, ErrorBoundary, src_index, rootElement

### Community 69 - "WolfAnimator"
Cohesion: 0.09
Nodes (12): CLIP_ORDER, unpackWolfBundle(), Wolf, WOLF_EMBEDDED_PACK_B64, WOLF_EMBEDDED_TEXTURE_URI, WOLF_GAITS, WOLF_STATES, WolfAnimator (+4 more)

### Community 72 - "vite.config.ts"
Cohesion: 0.14
Nodes (14): ref_node_fs_promises, ref_node_http, ref_path, @tailwindcss/vite, vite, @vitejs/plugin-react, assertTrustedJsonRequest(), PERSISTENCE_ROUTES (+6 more)

### Community 74 - "תיקיית מודלים תלת-ממדיים (`public/models`)"
Cohesion: 0.50
Nodes (3): מבנה תיקיות מומלץ (אופציונלי, או ישירות בתיקייה זו):, פורמטים מומלצים:, תיקיית מודלים תלת-ממדיים (`public/models`)

## Knowledge Gaps
- **211 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+206 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 427 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `proceduralModels.ts` to `terrainMath.test.ts`, `WolfAnimator`, `WorldCanvas.tsx`, `package.json`, `Deer_Complete.ts`, `labCatalog.ts`, `JaguarAnimator`, `windowDebugController.spec.ts`, `Rhino.ts`, `playerAndCombatBuilder.ts`, `DemonDragon_Complete.ts`, `ForestDragon_Complete.ts`, `BearAnimator`, `Crocodile.ts`?**
  _High betweenness centrality (0.234) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `boidsAndWildlifeSystem.ts`, `combatAndInventorySystem.ts`, `collisionAndTerraces.ts`, `WorldCanvas.tsx`, `labCatalog.ts`, `worldTypes.ts`, `proceduralModels.ts`, `windowDebugController.spec.ts`, `terrainAndBiomeSystem.ts`, `GameShellOverlay.tsx`, `WorldCanvas`, `telemetryStore.ts`, `locales/index.ts`, `playerPhysicsSystem.ts`, `itemArtworkRegistry.tsx`, `ILogger`, `dwarvenMineAndCaravanSystem.ts`, `ref_node_test`, `main.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `WorldCanvas` (e.g. with `.runFrame()` and `.start()`) actually correct?**
  _`WorldCanvas` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _211 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `boidsAndWildlifeSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11498257839721254 - nodes in this community are weakly interconnected._
- **Should `t` be split into smaller, more focused modules?**
  _Cohesion score 0.1168091168091168 - nodes in this community are weakly interconnected._
- **Should `terrainMath.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.054878048780487805 - nodes in this community are weakly interconnected._