# Graph Report - TheMan  (2026-11-01)

## Corpus Check
- 118 files · ~239,517 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1277 nodes · 3463 edges · 63 communities (41 shown, 22 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8d177fe9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- boidsAndWildlifeSystem.ts
- savedGameSettings.ts
- terrainMath.test.ts
- swordAttackAnimationSystem.ts
- fortressModels.ts
- combatAndInventorySystem.ts
- playerPhysicsSystem.ts
- WorldCanvas.tsx
- worldTypes.ts
- package.json
- Deer_Complete.ts
- compilerOptions
- t
- playerAndCombatBuilder.ts
- proceduralModels.ts
- devDependencies
- atmosphereRenderController.ts
- terrainAndBiomeSystem.ts
- dwarvenMineAndCaravanSystem.ts
- SkyrimInventoryModal.tsx
- TheMan — 3D Living Nature & RPG World Simulator
- rules/graphify.md
- workflows/graphify.md
- CLAUDE.md
- locales/index.ts
- WorldCanvas
- telemetryStore.ts
- src_world_terrainmath_computedwarvenminercaravanstate
- src_world_terrainmath_dwarven_guardian_statues
- src_world_terrainmath_dwarven_miners_count
- src_world_terrainmath_dwarven_stone_houses
- src_world_terrainmath_arrowprojectile
- itemArtworkRegistry.tsx
- src_world_terrainmath_characterskillsstate
- GameShellOverlay.tsx
- src_world_terrainmath_inventoryitemdef
- src_world_terrainmath_obstaclecylinder
- ref_domain_worldtypes
- src_world_domain_landmarksregistry_chinesefortressstairheightat
- src_world_terrainmath_solaratmosphere
- src_world_terrainmath_playerstate
- src_world_terrainmath_rideablehorsestate
- src_world_terrainmath_weatherstatesnapshot
- JaguarAnimator
- IPlayerState
- labCatalog.ts
- Rhino.ts
- SpatialHashGrid2D
- DemonDragon_Complete.ts
- src_world_terrainmath_dynamicatmospherestate
- ForestDragon_Complete.ts
- scripts
- dependencies
- BearAnimator
- Crocodile.ts
- src_world_terrainmath_getanimalspeciesnamehe
- NatureSoundEngine
- collisionAndTerraces.ts
- WolfAnimator
- vite.config.ts
- תיקיית מודלים תלת-ממדיים (`public/models`)
- src_world_terrainmath_archery_targets
- src_locales_index_he

## God Nodes (most connected - your core abstractions)
1. `t()` - 49 edges
2. `groundHeightAt()` - 43 edges
3. `WorldCanvas` - 41 edges
4. `walkableHeightAt()` - 39 edges
5. `three` - 34 edges
6. `DeerAnimator` - 33 edges
7. `NatureSoundEngine` - 27 edges
8. `registerWindowDebugBridge()` - 24 edges
9. `IPlayerState` - 24 edges
10. `hash2D()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `saveGameSettings()` --calls--> `validateGameSettings()`  [EXTRACTED]
  vite.config.ts → src/config/persistedSettingsValidation.ts
- `saveLabOverrides()` --calls--> `validateLabOverrides()`  [EXTRACTED]
  vite.config.ts → src/config/persistedSettingsValidation.ts
- `WorldCanvas` --indirect_call--> `tick()`  [INFERRED]
  src/components/WorldCanvas.tsx → src/lab/CharacterLabCanvas.tsx
- `IErrorBoundaryProps` --references--> `ILogger`  [EXTRACTED]
  src/components/ErrorBoundary.tsx → src/core/ILogger.ts
- `ExplorerMinimap` --calls--> `sampleMinimapColorAt()`  [EXTRACTED]
  src/components/ExplorerMinimap.tsx → src/world/systems/terrainAndBiomeSystem.ts

## Import Cycles
- None detected.

## Communities (63 total, 22 thin omitted)

### Community 0 - "boidsAndWildlifeSystem.ts"
Cohesion: 0.08
Nodes (64): buildDwarvenKingdomAndMiners(), buildPlayerAndCombatSystems(), buildWildlifeAndFootprintsLayer(), IWildlifeAndFootprintsHandles, IWildlifeSoundCallbacks, WORLD_SPAWN, distToSegment(), buildSanctuaryAndDragonModels() (+56 more)

### Community 1 - "savedGameSettings.ts"
Cohesion: 0.16
Nodes (17): App(), GameSettingsModal(), IGameSettingsModalProps, IKeybindRowMeta, KEYBIND_CATEGORIES, KEYBIND_ROWS, KeybindCategory, DEFAULT_GAME_KEYBINDINGS (+9 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.06
Nodes (38): LAKESIDE_TEA_PAVILION_POS, DEFAULT_WEATHER_CYCLE_MODE, src_world_terrainmath_bear_mountain_caves, src_world_terrainmath_birch_grove_center, src_world_terrainmath_computehorsebiomechanicalpose, src_world_terrainmath_computeweatherstate, src_world_terrainmath_corner_watchtowers, src_world_terrainmath_createinitialplayerstate (+30 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.09
Nodes (33): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+25 more)

### Community 4 - "fortressModels.ts"
Cohesion: 0.21
Nodes (12): isWithinViewDistance(), ARCHERY_TARGETS, CHINESE_FORTRESS_POS, chineseFortressStairHeightAt(), CORNER_WATCHTOWERS, FORTRESS_Y_OFFSET, FORTRESS_Z_OFFSET, ropeBridgePointInfoAt() (+4 more)

### Community 5 - "combatAndInventorySystem.ts"
Cohesion: 0.09
Nodes (30): DEFAULT_STARTER_OWNED_ITEM_IDS, IArcheryTargetDef, IInventoryItemDef, ISolidBuildingBox, getActiveWorldAnimals(), ARCHERY_TARGETS_SPATIAL_GRID, arrowFireStrategy, arrowNormalStrategy (+22 more)

### Community 6 - "playerPhysicsSystem.ts"
Cohesion: 0.20
Nodes (14): SOLID_BUILDING_BOXES, isChineseFortressWalkableZone(), findLookedAtWatchtowerLadder(), findWatchtowerLadderAt(), getLadderById(), isOnWatchtowerLadder(), RIDEABLE_HORSES, ISkillProgressionResult (+6 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.06
Nodes (43): ref_three_addons_environments_roomenvironment_js, _camTargetLook, _euler, _sunVec, _tourLook, _tourPos, WalkPaceMode, createInitialRideableHorses() (+35 more)

### Community 8 - "worldTypes.ts"
Cohesion: 0.05
Nodes (62): ref_node_assert_strict, ref_node_test, AppException, InfrastructureCorruptedException, InvalidResultAccessException, clamp(), IValidatedPositionOverride, IValidatedUrlOverrides (+54 more)

### Community 9 - "package.json"
Cohesion: 0.15
Nodes (12): name, private, type, version, react-dom, tailwindcss, tsx, @types/node (+4 more)

### Community 10 - "Deer_Complete.ts"
Cohesion: 0.05
Nodes (40): BoneDef, BoneGroup, BoneName, Chain, CHAINS, computeDeerSkinWeights(), createReadyDeer(), Deer (+32 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "t"
Cohesion: 0.17
Nodes (12): react, ExplorerMinimap, GRID_SIZE, IExplorerMinimapProps, horseSkinsFromWorld, t(), createCatalogItem(), getArrowKindLabel() (+4 more)

### Community 13 - "playerAndCombatBuilder.ts"
Cohesion: 0.14
Nodes (12): IPlayerAndCombatBuilderContext, ArrowElementKind, ARROW_TRAIL_MAX_AGE, src_world_terrainmath_arrow_trail_max_age, src_world_terrainmath_arrowelementkind, src_world_terrainmath_computefirstpersonswordattackpose, src_world_terrainmath_computeslopepitchandroll, src_world_terrainmath_iarrowprojectile (+4 more)

### Community 16 - "proceduralModels.ts"
Cohesion: 0.06
Nodes (67): three, buildColliderDebugWireframes(), IColliderDebugHandles, attachFlagHorizontalWaveShader(), attachWindSwayShader(), createBirchBarkTexture(), perturbGeometryVertices(), fbm2D() (+59 more)

### Community 17 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, tailwindcss, @tailwindcss/vite, tsx, @types/node, @types/react, @types/react-dom, @types/three (+3 more)

### Community 18 - "atmosphereRenderController.ts"
Cohesion: 0.18
Nodes (10): ref_three_addons_objects_sky_js, applyDynamicAtmosphereToScene(), _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor, src_world_terrainmath_computedynamicsolarcycle (+2 more)

### Community 19 - "terrainAndBiomeSystem.ts"
Cohesion: 0.21
Nodes (21): CLEAR_ZONES, FLAT_BUILDING_TERRACES, BEAR_MOUNTAIN_CAVES, BIRCH_GROVE_CENTER, CROCODILE_RIVER_BEND_POS, MAGIC_STONE_CIRCLE_POS, PLAYABLE_RADIUS, PLAYER_EYE_HEIGHT (+13 more)

### Community 20 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.12
Nodes (22): IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig, VIEW_DISTANCE, DWARVEN_GUARDIAN_STATUES, DWARVEN_STONE_HOUSES, SOUTHERN_MINE_POS, IDwarvenMinerCaravanState (+14 more)

### Community 21 - "SkyrimInventoryModal.tsx"
Cohesion: 0.11
Nodes (24): renderArtifactArtwork(), formatMarketError(), InventoryCategoryTab, ISkyrimInventoryModalProps, ITEM_SHORT_NAMES, NON_SELLABLE_STARTER_IDS, SkyrimInventoryModal, ITelemetrySnapshot (+16 more)

### Community 22 - "TheMan — 3D Living Nature & RPG World Simulator"
Cohesion: 0.29
Nodes (6): Engineering standards, Getting Started, Installation & Run, Overview & Architecture, Prerequisites, TheMan — 3D Living Nature & RPG World Simulator

### Community 26 - "locales/index.ts"
Cohesion: 0.39
Nodes (5): en, LocaleSchema, getLocaleDictionary(), setLocaleDictionary(), TranslationDictionary

### Community 27 - "WorldCanvas"
Cohesion: 0.21
Nodes (17): WorldCanvas, registerWindowDebugBridge(), findNearestFortressDoor(), findNearestMarketStall(), findNearestDeadLootableAnimal(), getAnimalLootDrops(), getAnimalSpeciesName(), lootDeadAnimal() (+9 more)

### Community 28 - "telemetryStore.ts"
Cohesion: 0.39
Nodes (4): TelemetrySnapshot, INITIAL_TELEMETRY_SNAPSHOT, ITelemetryStore, telemetryStore

### Community 36 - "itemArtworkRegistry.tsx"
Cohesion: 0.14
Nodes (4): ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy

### Community 38 - "GameShellOverlay.tsx"
Cohesion: 0.18
Nodes (18): WEATHER_CYCLE_ORDER, GameShellOverlay, IGameShellOverlayProps, IWeatherOptionDef, SEASON_OPTIONS, SkyrimModalMode, WEATHER_OPTIONS, renderItemSvgIcon() (+10 more)

### Community 48 - "JaguarAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyJaguar(), Jaguar, JAGUAR_EMBEDDED_PACK_B64, JAGUAR_EMBEDDED_TEXTURE_URI, JAGUAR_GAITS, JAGUAR_STATES, JaguarAnimator (+5 more)

### Community 49 - "IPlayerState"
Cohesion: 0.12
Nodes (10): IPlayerAndCombatHandle, EquippedToolSlot, IPlayerState, ArrowEquipmentStrategy, BowEquipmentStrategy, IEquipmentSlotStrategy, isInventoryItemEquipped(), SwordEquipmentStrategy (+2 more)

### Community 50 - "labCatalog.ts"
Cohesion: 0.07
Nodes (63): ref_three_examples_jsm_environments_roomenvironment_js, ANIMATION_SPEED_RANGE, CAMERA_PERSPECTIVES, FIREFLIES_MODES, GameSettingsValidationError, isNumberInRange(), isOneOf(), isPlainObject() (+55 more)

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

### Community 58 - "dependencies"
Cohesion: 0.50
Nodes (4): dependencies, react, react-dom, three

### Community 59 - "BearAnimator"
Cohesion: 0.10
Nodes (13): Bear, BEAR_EMBEDDED_PACK_B64, BEAR_EMBEDDED_TEXTURE_URI, BEAR_GAITS, BEAR_STATES, BearAnimator, BearOptions, BearRig (+5 more)

### Community 60 - "Crocodile.ts"
Cohesion: 0.10
Nodes (12): createReadyCrocodile(), CROC_EMBEDDED_PACK_B64, CROC_EMBEDDED_TEXTURE_URI, Crocodile, CROCODILE_GAITS, CROCODILE_STATES, CrocodileAnimator, CrocodileOptions (+4 more)

### Community 62 - "NatureSoundEngine"
Cohesion: 0.05
Nodes (15): ref_react_dom_client, ErrorBoundary, IErrorBoundaryProps, IErrorBoundaryState, MockErrorLogger, ConsoleLogger, ILogger, NullLogger (+7 more)

### Community 63 - "collisionAndTerraces.ts"
Cohesion: 0.17
Nodes (15): HILL_BRIDGE_YAW, HILL_WATCHTOWERS, ROPE_BRIDGE_DEF, findNearestBed(), FORTRESS_DOORS, IWorldBedDef, WORLD_BEDS, MARKET_STALL_LOCATIONS (+7 more)

### Community 69 - "WolfAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyWolf(), unpackWolfBundle(), Wolf, WOLF_EMBEDDED_PACK_B64, WOLF_EMBEDDED_TEXTURE_URI, WOLF_GAITS, WOLF_STATES (+5 more)

### Community 72 - "vite.config.ts"
Cohesion: 0.14
Nodes (14): ref_node_fs_promises, ref_node_http, ref_path, @tailwindcss/vite, vite, @vitejs/plugin-react, assertTrustedJsonRequest(), PERSISTENCE_ROUTES (+6 more)

### Community 74 - "תיקיית מודלים תלת-ממדיים (`public/models`)"
Cohesion: 0.50
Nodes (3): מבנה תיקיות מומלץ (אופציונלי, או ישירות בתיקייה זו):, פורמטים מומלצים:, תיקיית מודלים תלת-ממדיים (`public/models`)

## Knowledge Gaps
- **210 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+205 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 413 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `proceduralModels.ts` to `boidsAndWildlifeSystem.ts`, `terrainMath.test.ts`, `fortressModels.ts`, `WolfAnimator`, `WorldCanvas.tsx`, `worldTypes.ts`, `package.json`, `Deer_Complete.ts`, `playerAndCombatBuilder.ts`, `JaguarAnimator`, `labCatalog.ts`, `atmosphereRenderController.ts`, `dwarvenMineAndCaravanSystem.ts`, `DemonDragon_Complete.ts`, `Rhino.ts`, `ForestDragon_Complete.ts`, `BearAnimator`, `Crocodile.ts`?**
  _High betweenness centrality (0.272) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `boidsAndWildlifeSystem.ts`, `savedGameSettings.ts`, `fortressModels.ts`, `combatAndInventorySystem.ts`, `GameShellOverlay.tsx`, `WorldCanvas.tsx`, `playerPhysicsSystem.ts`, `worldTypes.ts`, `labCatalog.ts`, `terrainAndBiomeSystem.ts`, `dwarvenMineAndCaravanSystem.ts`, `SkyrimInventoryModal.tsx`, `locales/index.ts`, `WorldCanvas`, `telemetryStore.ts`, `NatureSoundEngine`, `collisionAndTerraces.ts`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _210 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `boidsAndWildlifeSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07511737089201878 - nodes in this community are weakly interconnected._
- **Should `terrainMath.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05641025641025641 - nodes in this community are weakly interconnected._
- **Should `swordAttackAnimationSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09243697478991597 - nodes in this community are weakly interconnected._
- **Should `combatAndInventorySystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08669354838709678 - nodes in this community are weakly interconnected._