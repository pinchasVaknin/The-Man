# Graph Report - TheMan  (2026-11-01)

## Corpus Check
- 123 files · ~447,971 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1572 nodes · 3962 edges · 78 communities (54 shown, 24 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ef55f5a5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- boidsAndWildlifeSystem.ts
- App.tsx
- terrainMath.test.ts
- swordAttackAnimationSystem.ts
- config.ts
- combatAndInventorySystem.ts
- playerPhysicsSystem.ts
- WorldCanvas.tsx
- Result
- package.json
- Deer_Complete.ts
- compilerOptions
- NatureSoundEngine
- playerAndCombatBuilder.ts
- settlementModels.ts
- groundHeightAt
- proceduralModels.ts
- atmosphereRenderController.ts
- WolfAnimator
- terrainAndBiomeSystem.ts
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
- Deer_Complete_3ce1524f.ts
- src_world_terrainmath_dwarven_guardian_statues
- src_world_terrainmath_dwarven_miners_count
- src_world_terrainmath_dwarven_stone_houses
- Deer_36e45a72.ts
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
- environmentAtmosphereModels.ts
- JaguarAnimator
- IPlayerState
- labCatalog.ts
- Rhino.ts
- SpatialHashGrid2D
- DemonDragon_Complete.ts
- src_world_terrainmath_dynamicatmospherestate
- ForestDragon_Complete.ts
- Bear_Complete_c2863232.ts
- Crocodile_Complete_9a40f875.ts
- Bear_447e38ff.ts
- BearAnimator
- Crocodile.ts
- src_world_terrainmath_getanimalspeciesnamehe
- ref_node_assert_strict
- interactionLandmarks.ts
- main.tsx
- horsePhysicsSystem.ts
- footprintTrailSystem.ts
- atmosphereAndWeatherSystem.ts
- MockErrorLogger
- MockLogger
- farmhouseModels.ts
- vite.config.ts
- תיקיית מודלים תלת-ממדיים (`public/models`)
- src_locales_index_he
- devDependencies
- createArchitecturalSharedAssets
- scripts
- dependencies

## God Nodes (most connected - your core abstractions)
1. `t()` - 49 edges
2. `groundHeightAt()` - 43 edges
3. `WorldCanvas` - 40 edges
4. `three` - 39 edges
5. `walkableHeightAt()` - 39 edges
6. `DeerAnimator` - 33 edges
7. `DeerAnimator` - 30 edges
8. `DeerAnimator` - 30 edges
9. `NatureSoundEngine` - 27 edges
10. `IPlayerState` - 25 edges

## Surprising Connections (you probably didn't know these)
- `buildLabEntityRig()` --calls--> `createReadyBear()`  [EXTRACTED]
  src/lab/labModelFactory.ts → public/models/animals/Bear_Complete.ts
- `buildWildlifeAndFootprintsLayer()` --calls--> `createReadyBear()`  [EXTRACTED]
  src/world/builders/wildlifeAndFootprintsBuilder.ts → public/models/animals/Bear_Complete.ts
- `buildLabEntityRig()` --calls--> `createReadyCrocodile()`  [EXTRACTED]
  src/lab/labModelFactory.ts → public/models/animals/Crocodile_Complete.ts
- `buildWildlifeAndFootprintsLayer()` --calls--> `createReadyCrocodile()`  [EXTRACTED]
  src/world/builders/wildlifeAndFootprintsBuilder.ts → public/models/animals/Crocodile_Complete.ts
- `attachDeerGlbModel()` --calls--> `createReadyDeer()`  [EXTRACTED]
  src/world/models/deerGlbLoader.ts → public/models/animals/Deer_Complete.ts

## Import Cycles
- None detected.

## Communities (78 total, 24 thin omitted)

### Community 0 - "boidsAndWildlifeSystem.ts"
Cohesion: 0.11
Nodes (32): activeWorldAnimalsRegistry, advanceAnimalWithWaterShoreRecovery(), AnimalAiBehavior, BIRD_FLOCK_CONFIGS, BoidBirdState, caveLocalToWorld(), computePlayerNoiseRateAtDistance(), createInitialBoidBirds() (+24 more)

### Community 1 - "App.tsx"
Cohesion: 0.12
Nodes (26): WEATHER_CYCLE_ORDER, GameSettingsModal(), IGameSettingsModalProps, IKeybindRowMeta, KEYBIND_CATEGORIES, KEYBIND_ROWS, KeybindCategory, IGameShellOverlayProps (+18 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.06
Nodes (31): DEFAULT_WEATHER_CYCLE_MODE, getRoofHeightAt(), isInsideBearCave(), isPositionUnderRoof(), src_world_terrainmath_birch_grove_center, src_world_terrainmath_chinese_fortress_pos, src_world_terrainmath_chinesefortressstairheightat, src_world_terrainmath_computeweatherstate (+23 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.07
Nodes (40): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+32 more)

### Community 4 - "config.ts"
Cohesion: 0.18
Nodes (18): clamp(), IValidatedPositionOverride, IValidatedUrlOverrides, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS, URL_SEASON_OFFSETS (+10 more)

### Community 5 - "combatAndInventorySystem.ts"
Cohesion: 0.07
Nodes (26): IWildlifeAndFootprintsHandles, IArcheryTargetDef, ISolidBuildingBox, IBoidBirdState, ISmallAnimalState, ARCHERY_TARGETS_SPATIAL_GRID, arrowFireStrategy, arrowNormalStrategy (+18 more)

### Community 6 - "playerPhysicsSystem.ts"
Cohesion: 0.18
Nodes (16): PLAYABLE_RADIUS, chineseFortressStairHeightAt(), isChineseFortressWalkableZone(), ropeBridgePointInfoAt(), FORTRESS_DOORS, RIDEABLE_HORSES, createInitialRideableHorses(), ISkillProgressionResult (+8 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.06
Nodes (44): ref_three_addons_environments_roomenvironment_js, _camTargetLook, _euler, _sunVec, _tourLook, _tourPos, VirtualMoveState, WorldCanvasProps (+36 more)

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

### Community 13 - "playerAndCombatBuilder.ts"
Cohesion: 0.13
Nodes (14): IPlayerAndCombatBuilderContext, PlayerAndCombatBuilderContext, PlayerAndCombatHandle, ARROW_TRAIL_MAX_AGE, LOCKED_SWORD_GRIP_TRANSFORM, src_world_terrainmath_arrow_trail_max_age, src_world_terrainmath_arrowelementkind, src_world_terrainmath_computefirstpersonswordattackpose (+6 more)

### Community 14 - "settlementModels.ts"
Cohesion: 0.13
Nodes (15): IRideableHorseState, ISettlementModelHandles, SettlementModelHandles, src_world_terrainmath_bear_mountain_caves, src_world_terrainmath_computehorsebiomechanicalpose, src_world_terrainmath_crocodile_river_bend_pos, src_world_terrainmath_irideablehorsestate, src_world_terrainmath_lakeside_tea_pavilion_pos (+7 more)

### Community 15 - "groundHeightAt"
Cohesion: 0.20
Nodes (20): distToSegment(), buildTerrainAndWaterModel(), ITerrainAndWaterResult, smoothstepLocal(), TerrainAndWaterResult, birchGroveFactorAt(), generateWorldObstacles(), getSurfaceNormalAt() (+12 more)

### Community 16 - "proceduralModels.ts"
Cohesion: 0.09
Nodes (38): three, buildColliderDebugWireframes(), IColliderDebugHandles, isWithinViewDistance(), VIEW_DISTANCE, IArrowProjectile, IObstacleCylinder, ArchitecturalSharedAssets (+30 more)

### Community 17 - "atmosphereRenderController.ts"
Cohesion: 0.14
Nodes (13): ref_three_addons_objects_sky_js, AtmosphereRenderContext, _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor, IWindowDebugBridgeDeps (+5 more)

### Community 18 - "WolfAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyWolf(), unpackWolfBundle(), Wolf, WOLF_EMBEDDED_PACK_B64, WOLF_EMBEDDED_TEXTURE_URI, WOLF_GAITS, WOLF_STATES (+5 more)

### Community 19 - "terrainAndBiomeSystem.ts"
Cohesion: 0.14
Nodes (33): CLEAR_ZONES, FLAT_BUILDING_TERRACES, SOLID_BUILDING_BOXES, BEAR_MOUNTAIN_CAVES, BIRCH_GROVE_CENTER, CROCODILE_RIVER_BEND_POS, MAGIC_STONE_CIRCLE_POS, PLAYER_EYE_HEIGHT (+25 more)

### Community 20 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.12
Nodes (22): DwarvenKingdomBuilderContext, DwarvenKingdomHandle, DwarvenMinerRig, IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig, DWARVEN_GUARDIAN_STATUES, DWARVEN_STONE_HOUSES (+14 more)

### Community 21 - "GameShellOverlay.tsx"
Cohesion: 0.09
Nodes (34): GameShellOverlay, GameShellOverlayProps, SEASON_OPTIONS, SkyrimModalMode, WEATHER_OPTIONS, renderArtifactArtwork(), renderItemSvgIcon(), formatMarketError() (+26 more)

### Community 22 - "TheMan — 3D Living Nature & RPG World Simulator"
Cohesion: 0.29
Nodes (6): Engineering standards, Getting Started, Installation & Run, Overview & Architecture, Prerequisites, TheMan — 3D Living Nature & RPG World Simulator

### Community 26 - "t"
Cohesion: 0.19
Nodes (11): en, LocaleSchema, getLocaleDictionary(), NestedKeyOf, setLocaleDictionary(), t(), TranslationDictionary, TranslationKey (+3 more)

### Community 27 - "WorldCanvas"
Cohesion: 0.15
Nodes (24): WorldCanvas, registerWindowDebugBridge(), findNearestFortressDoor(), findNearestMarketStall(), findNearestDeadLootableAnimal(), getActiveWorldAnimals(), getAnimalLootDrops(), getAnimalSpeciesName() (+16 more)

### Community 28 - "telemetryStore.ts"
Cohesion: 0.33
Nodes (5): TelemetrySnapshot, INITIAL_TELEMETRY_SNAPSHOT, ITelemetryStore, telemetryStore, src_world_terrainmath_world_spawn

### Community 30 - "Deer_Complete_3ce1524f.ts"
Cohesion: 0.06
Nodes (33): BoneDef, BoneGroup, BoneName, Chain, CHAINS, computeDeerSkinWeights(), createReadyDeer(), Deer (+25 more)

### Community 34 - "Deer_36e45a72.ts"
Cohesion: 0.06
Nodes (30): BoneDef, BoneGroup, BoneName, Chain, CHAINS, computeDeerSkinWeights(), Deer, DEER_BONES (+22 more)

### Community 36 - "itemArtworkRegistry.tsx"
Cohesion: 0.10
Nodes (10): react, ExplorerMinimap, ExplorerMinimapProps, GRID_SIZE, IExplorerMinimapProps, ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES (+2 more)

### Community 38 - "worldTypes.ts"
Cohesion: 0.05
Nodes (40): ITelemetrySnapshot, ArcheryTargetDef, ArrowElementKind, ArrowTrailPoint, CharacterSkillsState, ClimbableLadderInfo, CornerWatchtowerDef, createCatalogItem() (+32 more)

### Community 47 - "environmentAtmosphereModels.ts"
Cohesion: 0.22
Nodes (10): IWeatherStateSnapshot, attachDeerGlbModel(), EnvironmentAtmosphereHandle, IAnimatedDeer, IEnvironmentAtmosphereHandle, IForestSquirrel, SquirrelActionState, src_world_terrainmath_fbm2d (+2 more)

### Community 48 - "JaguarAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyJaguar(), Jaguar, JAGUAR_EMBEDDED_PACK_B64, JAGUAR_EMBEDDED_TEXTURE_URI, JAGUAR_GAITS, JAGUAR_STATES, JaguarAnimator (+5 more)

### Community 49 - "IPlayerState"
Cohesion: 0.21
Nodes (8): IPlayerAndCombatHandle, InventoryItemId, IPlayerState, ArrowEquipmentStrategy, BowEquipmentStrategy, IEquipmentSlotStrategy, SwordEquipmentStrategy, ToolEquipmentStrategy

### Community 50 - "labCatalog.ts"
Cohesion: 0.06
Nodes (66): ref_three_examples_jsm_environments_roomenvironment_js, ANIMATION_SPEED_RANGE, CAMERA_PERSPECTIVES, FIREFLIES_MODES, GameSettingsValidationError, isNumberInRange(), isOneOf(), isPlainObject() (+58 more)

### Community 51 - "Rhino.ts"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyRhino(), Rhino, RHINO_EMBEDDED_PACK_B64, RHINO_EMBEDDED_TEXTURE_URI, RHINO_GAITS, RHINO_STATES, RhinoAnimator (+5 more)

### Community 53 - "DemonDragon_Complete.ts"
Cohesion: 0.09
Nodes (14): CLIP_ORDER, createReadyDemonDragon(), DEMON_DRAGON_EMBEDDED_PACK_B64, DEMON_DRAGON_EMBEDDED_TEXTURE_URI, DEMON_DRAGON_GAITS, DemonDragon, DemonDragonAnimator, DemonDragonOptions (+6 more)

### Community 55 - "ForestDragon_Complete.ts"
Cohesion: 0.09
Nodes (14): CLIP_ORDER, createReadyForestDragon(), FOREST_DRAGON_EMBEDDED_PACK_B64, FOREST_DRAGON_EMBEDDED_TEXTURE_URI, FOREST_DRAGON_GAITS, ForestDragon, ForestDragonAnimator, ForestDragonOptions (+6 more)

### Community 56 - "Bear_Complete_c2863232.ts"
Cohesion: 0.10
Nodes (12): Bear, BEAR_EMBEDDED_PACK_B64, BEAR_EMBEDDED_TEXTURE_URI, BEAR_GAITS, BearAnimator, BearOptions, BearRig, BearState (+4 more)

### Community 57 - "Crocodile_Complete_9a40f875.ts"
Cohesion: 0.10
Nodes (12): CLIP_ORDER, createReadyCrocodile(), CROC_EMBEDDED_PACK_B64, CROC_EMBEDDED_TEXTURE_URI, Crocodile, CROCODILE_GAITS, CrocodileAnimator, CrocodileOptions (+4 more)

### Community 58 - "Bear_447e38ff.ts"
Cohesion: 0.11
Nodes (8): Bear, BEAR_GAITS, BearAnimator, BearOptions, BearRig, BearState, BearUnpackedData, CLIP_ORDER

### Community 59 - "BearAnimator"
Cohesion: 0.09
Nodes (13): Bear, BEAR_EMBEDDED_PACK_B64, BEAR_EMBEDDED_TEXTURE_URI, BEAR_GAITS, BEAR_STATES, BearAnimator, BearOptions, BearRig (+5 more)

### Community 60 - "Crocodile.ts"
Cohesion: 0.10
Nodes (12): createReadyCrocodile(), CROC_EMBEDDED_PACK_B64, CROC_EMBEDDED_TEXTURE_URI, Crocodile, CROCODILE_GAITS, CROCODILE_STATES, CrocodileAnimator, CrocodileOptions (+4 more)

### Community 62 - "ref_node_assert_strict"
Cohesion: 0.12
Nodes (9): ref_node_assert_strict, ref_node_test, IErrorBoundaryProps, IErrorBoundaryState, ConsoleLogger, ILogger, NullLogger, IPlayerInput (+1 more)

### Community 63 - "interactionLandmarks.ts"
Cohesion: 0.19
Nodes (13): ARCHERY_TARGETS, CHINESE_FORTRESS_POS, CORNER_WATCHTOWERS, FORTRESS_Y_OFFSET, FORTRESS_Z_OFFSET, findLookedAtWatchtowerLadder(), findWatchtowerLadderAt(), getLadderById() (+5 more)

### Community 64 - "main.tsx"
Cohesion: 0.18
Nodes (5): ref_react_dom_client, App(), ErrorBoundary, src_index, rootElement

### Community 65 - "horsePhysicsSystem.ts"
Cohesion: 0.21
Nodes (11): computeHorseBiomechanicalPose(), computeHorseTurnResistance(), HorseBiomechanicalPose, HorseLimbAngles, HorseSteeringStepResult, IHorseBiomechanicalPose, IHorseLimbAngles, IHorseSteeringStepResult (+3 more)

### Community 66 - "footprintTrailSystem.ts"
Cohesion: 0.23
Nodes (10): BiomeType, createFootprintTrailTracker(), FOOTPRINT_MAX_AGE_SECONDS, FootprintDecalState, FootprintTrailTracker, IFootprintDecalState, IFootprintTrailTracker, isImprintableBiomeSurface() (+2 more)

### Community 67 - "atmosphereAndWeatherSystem.ts"
Cohesion: 0.36
Nodes (14): applyDynamicAtmosphereToScene(), fbm2D(), lerpColorHex(), lerpNum(), smoothstep(), valueNoise2D(), computeDynamicSolarCycle(), computeWeatherState() (+6 more)

### Community 70 - "farmhouseModels.ts"
Cohesion: 0.15
Nodes (20): buildDwarvenKingdomAndMiners(), buildPlayerAndCombatSystems(), attachWindSwayShader(), createBirchBarkTexture(), perturbGeometryVertices(), buildWildlifeAndFootprintsLayer(), hash2D(), buildEnvironmentAtmosphereModels() (+12 more)

### Community 72 - "vite.config.ts"
Cohesion: 0.14
Nodes (14): ref_node_fs_promises, ref_node_http, ref_path, @tailwindcss/vite, vite, @vitejs/plugin-react, assertTrustedJsonRequest(), PERSISTENCE_ROUTES (+6 more)

### Community 74 - "תיקיית מודלים תלת-ממדיים (`public/models`)"
Cohesion: 0.50
Nodes (3): מבנה תיקיות מומלץ (אופציונלי, או ישירות בתיקייה זו):, פורמטים מומלצים:, תיקיית מודלים תלת-ממדיים (`public/models`)

### Community 78 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, tailwindcss, @tailwindcss/vite, tsx, @types/node, @types/react, @types/react-dom, @types/three (+3 more)

### Community 79 - "createArchitecturalSharedAssets"
Cohesion: 0.19
Nodes (13): attachFlagHorizontalWaveShader(), createArchitecturalSharedAssets(), createChinesePagodaRoof(), createInteractiveDoubleDoor(), createOrnatePaifangGate(), createRedChineseLantern(), createRedImperialFlag(), buildHarborModels() (+5 more)

### Community 81 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, preview, test

### Community 83 - "dependencies"
Cohesion: 0.50
Nodes (4): dependencies, react, react-dom, three

## Knowledge Gaps
- **336 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+331 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 582 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `proceduralModels.ts` to `config.ts`, `WorldCanvas.tsx`, `package.json`, `Deer_Complete.ts`, `playerAndCombatBuilder.ts`, `settlementModels.ts`, `groundHeightAt`, `atmosphereRenderController.ts`, `WolfAnimator`, `dwarvenMineAndCaravanSystem.ts`, `Deer_Complete_3ce1524f.ts`, `Deer_36e45a72.ts`, `environmentAtmosphereModels.ts`, `JaguarAnimator`, `labCatalog.ts`, `Rhino.ts`, `DemonDragon_Complete.ts`, `ForestDragon_Complete.ts`, `Bear_Complete_c2863232.ts`, `Crocodile_Complete_9a40f875.ts`, `Bear_447e38ff.ts`, `BearAnimator`, `Crocodile.ts`, `farmhouseModels.ts`, `createArchitecturalSharedAssets`?**
  _High betweenness centrality (0.462) - this node is a cross-community bridge._
- **Why does `NatureSoundEngine` connect `NatureSoundEngine` to `App.tsx`, `footprintTrailSystem.ts`, `config.ts`, `WorldCanvas.tsx`, `atmosphereRenderController.ts`, `ref_node_assert_strict`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _336 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `boidsAndWildlifeSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10873440285204991 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11612903225806452 - nodes in this community are weakly interconnected._
- **Should `terrainMath.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `swordAttackAnimationSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07200929152148665 - nodes in this community are weakly interconnected._