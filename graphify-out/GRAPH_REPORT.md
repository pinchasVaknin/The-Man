# Graph Report - TheMan  (2026-11-01)

## Corpus Check
- 120 files · ~240,368 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1284 nodes · 3482 edges · 70 communities (44 shown, 26 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2cd48656`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- boidsAndWildlifeSystem.ts
- savedGameSettings.ts
- terrainMath.test.ts
- swordAttackAnimationSystem.ts
- NatureSoundEngine
- combatAndInventorySystem.ts
- playerPhysicsSystem.ts
- WorldCanvas.tsx
- Result
- package.json
- Deer_Complete.ts
- compilerOptions
- t
- persistedSettingsValidation.ts
- config.ts
- horsePhysicsSystem.ts
- proceduralModels.ts
- devDependencies
- atmosphereRenderController.ts
- terrainAndBiomeSystem.ts
- dwarvenMineAndCaravanSystem.ts
- GameShellOverlay.tsx
- TheMan — 3D Living Nature & RPG World Simulator
- rules/graphify.md
- workflows/graphify.md
- CLAUDE.md
- main.tsx
- WorldCanvas
- telemetryStore.ts
- src_world_terrainmath_computedwarvenminercaravanstate
- react
- src_world_terrainmath_dwarven_guardian_statues
- src_world_terrainmath_dwarven_miners_count
- src_world_terrainmath_dwarven_stone_houses
- MockErrorLogger
- src_world_terrainmath_arrowprojectile
- itemArtworkRegistry.tsx
- src_world_terrainmath_characterskillsstate
- App.tsx
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
- labCatalog.ts
- RhinoAnimator
- MockLogger
- DemonDragon_Complete.ts
- src_world_terrainmath_dynamicatmospherestate
- ForestDragon_Complete.ts
- scripts
- SpatialHashGrid2D
- dependencies
- BearAnimator
- Crocodile.ts
- src_world_terrainmath_getanimalspeciesnamehe
- ref_node_assert_strict
- worldTypes.ts
- GameShellOverlay
- WolfAnimator
- vite.config.ts
- תיקיית מודלים תלת-ממדיים (`public/models`)
- src_world_terrainmath_archery_targets
- src_locales_index_he

## God Nodes (most connected - your core abstractions)
1. `t()` - 49 edges
2. `WorldCanvas` - 43 edges
3. `groundHeightAt()` - 43 edges
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
- `IGameSettingsModalProps` --references--> `IGameSettingsConfig`  [EXTRACTED]
  src/components/GameSettingsModal.tsx → src/config/savedGameSettings.ts
- `IWeatherOptionDef` --references--> `WeatherToggleOption`  [EXTRACTED]
  src/components/GameShellOverlay.tsx → src/world/domain/worldTypes.ts
- `WorldCanvas` --indirect_call--> `tick()`  [INFERRED]
  src/components/WorldCanvas.tsx → src/lab/CharacterLabCanvas.tsx

## Import Cycles
- None detected.

## Communities (70 total, 26 thin omitted)

### Community 0 - "boidsAndWildlifeSystem.ts"
Cohesion: 0.05
Nodes (65): buildWildlifeAndFootprintsLayer(), IWildlifeAndFootprintsHandles, IWildlifeSoundCallbacks, SOLID_BUILDING_BOXES, WORLD_SPAWN, CLIP_ORDER, createReadyRhino(), Rhino (+57 more)

### Community 1 - "savedGameSettings.ts"
Cohesion: 0.16
Nodes (15): App(), GameSettingsModal(), IGameSettingsModalProps, IKeybindRowMeta, KEYBIND_CATEGORIES, KEYBIND_ROWS, KeybindCategory, DEFAULT_GAME_KEYBINDINGS (+7 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.05
Nodes (41): LAKESIDE_TEA_PAVILION_POS, src_world_terrainmath_bear_mountain_caves, src_world_terrainmath_birch_grove_center, src_world_terrainmath_birchgrovefactorat, src_world_terrainmath_chinesefortressstairheightat, src_world_terrainmath_computehorsebiomechanicalpose, src_world_terrainmath_computeweatherstate, src_world_terrainmath_corner_watchtowers (+33 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.09
Nodes (33): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+25 more)

### Community 5 - "combatAndInventorySystem.ts"
Cohesion: 0.08
Nodes (27): DEFAULT_STARTER_OWNED_ITEM_IDS, IInventoryItemDef, getActiveWorldAnimals(), ARCHERY_TARGETS_SPATIAL_GRID, arrowFireStrategy, arrowNormalStrategy, arrowWindStrategy, bowStrategy (+19 more)

### Community 6 - "playerPhysicsSystem.ts"
Cohesion: 0.13
Nodes (20): chineseFortressStairHeightAt(), FORTRESS_Z_OFFSET, isChineseFortressWalkableZone(), findWatchtowerLadderAt(), FORTRESS_DOORS, getLadderById(), isOnWatchtowerLadder(), RIDEABLE_HORSES (+12 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.06
Nodes (48): ref_three_addons_environments_roomenvironment_js, _camTargetLook, _euler, ITelemetrySnapshot, _sunVec, _tourLook, _tourPos, ArrowElementKind (+40 more)

### Community 8 - "Result"
Cohesion: 0.15
Nodes (7): AppException, InfrastructureCorruptedException, InvalidResultAccessException, Result, createTickErrorGuard(), ITickErrorGuard, TickErrorDecision

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
Cohesion: 0.16
Nodes (13): horseSkinsFromWorld, en, LocaleSchema, getLocaleDictionary(), setLocaleDictionary(), t(), TranslationDictionary, createCatalogItem() (+5 more)

### Community 13 - "persistedSettingsValidation.ts"
Cohesion: 0.16
Nodes (18): ANIMATION_SPEED_RANGE, CAMERA_PERSPECTIVES, FIREFLIES_MODES, GameSettingsValidationError, isNumberInRange(), isOneOf(), isPlainObject(), JUMP_FORCE_RANGE (+10 more)

### Community 14 - "config.ts"
Cohesion: 0.24
Nodes (14): clamp(), IValidatedPositionOverride, IValidatedUrlOverrides, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS, URL_SEASON_OFFSETS (+6 more)

### Community 15 - "horsePhysicsSystem.ts"
Cohesion: 0.29
Nodes (8): computeHorseBiomechanicalPose(), computeHorseTurnResistance(), IHorseBiomechanicalPose, IHorseLimbAngles, IHorseSteeringStepResult, solveForelimb(), solveHindlimb(), stepMountedHorseSteering()

### Community 16 - "proceduralModels.ts"
Cohesion: 0.06
Nodes (95): three, buildColliderDebugWireframes(), IColliderDebugHandles, buildDwarvenKingdomAndMiners(), IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig, buildPlayerAndCombatSystems() (+87 more)

### Community 17 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, tailwindcss, @tailwindcss/vite, tsx, @types/node, @types/react, @types/react-dom, @types/three (+3 more)

### Community 18 - "atmosphereRenderController.ts"
Cohesion: 0.12
Nodes (17): ref_three_addons_objects_sky_js, applyDynamicAtmosphereToScene(), _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor, IWindowDebugBridgeDeps (+9 more)

### Community 19 - "terrainAndBiomeSystem.ts"
Cohesion: 0.15
Nodes (28): CLEAR_ZONES, FLAT_BUILDING_TERRACES, BEAR_MOUNTAIN_CAVES, BIRCH_GROVE_CENTER, CROCODILE_RIVER_BEND_POS, MAGIC_STONE_CIRCLE_POS, PLAYABLE_RADIUS, PLAYER_EYE_HEIGHT (+20 more)

### Community 20 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.18
Nodes (15): IDwarvenMinerCaravanState, buildMinerWaypoints(), CaravanPath, computeDwarvenMinerCaravanState(), DWARVEN_MINER_STATIONS, DWARVEN_MINERS_COUNT, IMinerStationConfig, interpolateDwarvenCaravanWaypoints() (+7 more)

### Community 21 - "GameShellOverlay.tsx"
Cohesion: 0.10
Nodes (32): IWeatherOptionDef, SEASON_OPTIONS, SkyrimModalMode, WEATHER_OPTIONS, renderArtifactArtwork(), formatMarketError(), InventoryCategoryTab, ISkyrimInventoryModalProps (+24 more)

### Community 22 - "TheMan — 3D Living Nature & RPG World Simulator"
Cohesion: 0.29
Nodes (6): Engineering standards, Getting Started, Installation & Run, Overview & Architecture, Prerequisites, TheMan — 3D Living Nature & RPG World Simulator

### Community 26 - "main.tsx"
Cohesion: 0.20
Nodes (4): ref_react_dom_client, ErrorBoundary, src_index, rootElement

### Community 27 - "WorldCanvas"
Cohesion: 0.18
Nodes (20): WorldCanvas, registerWindowDebugBridge(), findLookedAtWatchtowerLadder(), findNearestFortressDoor(), findNearestMarketStall(), findNearestDeadLootableAnimal(), getAnimalSpeciesName(), lootDeadAnimal() (+12 more)

### Community 28 - "telemetryStore.ts"
Cohesion: 0.33
Nodes (5): TelemetrySnapshot, INITIAL_TELEMETRY_SNAPSHOT, ITelemetryStore, telemetryStore, src_world_terrainmath_world_spawn

### Community 30 - "react"
Cohesion: 0.33
Nodes (5): react, ExplorerMinimap, GRID_SIZE, IExplorerMinimapProps, src_world_terrainmath_sampleminimapcolorat

### Community 36 - "itemArtworkRegistry.tsx"
Cohesion: 0.14
Nodes (4): ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy

### Community 38 - "App.tsx"
Cohesion: 0.29
Nodes (10): WEATHER_CYCLE_ORDER, IGameShellOverlayProps, GameStateMode, IVirtualMoveState, IWorldCanvasProps, IGameSettingsConfig, IGameActions, WeatherToggleOption (+2 more)

### Community 47 - "keyBindingMatch.ts"
Cohesion: 0.70
Nodes (3): isBindingHeld(), matchesKeyBinding(), MODIFIER_FAMILIES

### Community 48 - "JaguarAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyJaguar(), Jaguar, JAGUAR_EMBEDDED_PACK_B64, JAGUAR_EMBEDDED_TEXTURE_URI, JAGUAR_GAITS, JAGUAR_STATES, JaguarAnimator (+5 more)

### Community 49 - "IPlayerState"
Cohesion: 0.18
Nodes (8): IPlayerAndCombatHandle, InventoryItemId, IPlayerState, ArrowEquipmentStrategy, BowEquipmentStrategy, IEquipmentSlotStrategy, SwordEquipmentStrategy, ToolEquipmentStrategy

### Community 50 - "labCatalog.ts"
Cohesion: 0.08
Nodes (54): ref_three_examples_jsm_environments_roomenvironment_js, validateLabOverrides(), SAVED_LAB_OVERRIDES, CharacterLabCanvas(), afterDraw(), tick(), ICharacterLabCanvasProps, CAMERA_PRESETS (+46 more)

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

### Community 62 - "ref_node_assert_strict"
Cohesion: 0.14
Nodes (7): ref_node_assert_strict, ref_node_test, IErrorBoundaryProps, IErrorBoundaryState, ConsoleLogger, ILogger, NullLogger

### Community 63 - "worldTypes.ts"
Cohesion: 0.12
Nodes (27): DWARVEN_STONE_HOUSES, SOUTHERN_MINE_POS, ARCHERY_TARGETS, CHINESE_FORTRESS_POS, CORNER_WATCHTOWERS, findNearestBed(), IWorldBedDef, WORLD_BEDS (+19 more)

### Community 64 - "GameShellOverlay"
Cohesion: 0.67
Nodes (3): GameShellOverlay, renderItemSvgIcon(), useTelemetry()

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
- **211 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+206 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 415 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `proceduralModels.ts` to `boidsAndWildlifeSystem.ts`, `terrainMath.test.ts`, `WolfAnimator`, `WorldCanvas.tsx`, `package.json`, `Deer_Complete.ts`, `config.ts`, `JaguarAnimator`, `labCatalog.ts`, `atmosphereRenderController.ts`, `DemonDragon_Complete.ts`, `ForestDragon_Complete.ts`, `BearAnimator`, `Crocodile.ts`?**
  _High betweenness centrality (0.250) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `GameShellOverlay`, `savedGameSettings.ts`, `boidsAndWildlifeSystem.ts`, `combatAndInventorySystem.ts`, `playerPhysicsSystem.ts`, `WorldCanvas.tsx`, `proceduralModels.ts`, `labCatalog.ts`, `terrainAndBiomeSystem.ts`, `dwarvenMineAndCaravanSystem.ts`, `GameShellOverlay.tsx`, `react`, `main.tsx`, `WorldCanvas`, `telemetryStore.ts`, `ref_node_assert_strict`, `worldTypes.ts`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _211 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `boidsAndWildlifeSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05042016806722689 - nodes in this community are weakly interconnected._
- **Should `terrainMath.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05204872646733112 - nodes in this community are weakly interconnected._
- **Should `swordAttackAnimationSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09243697478991597 - nodes in this community are weakly interconnected._
- **Should `combatAndInventorySystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0846774193548387 - nodes in this community are weakly interconnected._