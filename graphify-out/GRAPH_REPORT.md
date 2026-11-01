# Graph Report - TheMan  (2026-11-01)

## Corpus Check
- 116 files · ~440,631 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1522 nodes · 3802 edges · 78 communities (50 shown, 28 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1faa8bf8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- atmosphereAndWeatherSystem.ts
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
- ref_node_assert_strict
- collisionAndTerraces.ts
- wildlifeAndFootprintsBuilder.ts
- playerAndCombatBuilder.ts
- three
- atmosphereRenderController.ts
- boidsAndWildlifeSystem.ts
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
- labCatalog.ts
- ErrorBoundary
- IPlayerState
- JaguarAnimator
- Rhino.ts
- SpatialHashGrid2D
- DemonDragon_Complete.ts
- src_world_terrainmath_dynamicatmospherestate
- ForestDragon_Complete.ts
- Bear_Complete_c2863232.ts
- Crocodile_Complete_9a40f875.ts
- Bear_447e38ff.ts
- Bear.ts
- Crocodile.ts
- farmhouseModels.ts
- proceduralModels.ts
- NatureSoundEngine
- groundHeightAt
- horsePhysicsSystem.ts
- BearAnimator
- CrocodileAnimator
- colliderDebugBuilder.ts
- environmentAtmosphereModels.ts
- terrainMath.ts
- MockErrorLogger
- ITelemetrySnapshot
- MockLogger
- תיקיית מודלים תלת-ממדיים (`public/models`)
- BiomeType
- playerPhysicsSystem.spec.ts
- src_locales_index_he

## God Nodes (most connected - your core abstractions)
1. `groundHeightAt()` - 43 edges
2. `three` - 39 edges
3. `walkableHeightAt()` - 39 edges
4. `WorldCanvas` - 38 edges
5. `t()` - 35 edges
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

## Communities (78 total, 28 thin omitted)

### Community 0 - "atmosphereAndWeatherSystem.ts"
Cohesion: 0.38
Nodes (13): applyDynamicAtmosphereToScene(), lerpColorHex(), lerpNum(), smoothstep(), computeDynamicSolarCycle(), computeWeatherState(), DEFAULT_WEATHER_CYCLE_MODE, getSeasonLabel() (+5 more)

### Community 1 - "App.tsx"
Cohesion: 0.12
Nodes (26): react, ref_react_dom_client, App(), WEATHER_CYCLE_ORDER, GameSettingsModal(), IGameSettingsModalProps, IKeybindRowMeta, KEYBIND_ROWS (+18 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.07
Nodes (30): LAKESIDE_TEA_PAVILION_POS, SettlementModelHandles, src_world_terrainmath_bear_mountain_caves, src_world_terrainmath_birch_grove_center, src_world_terrainmath_computehorsebiomechanicalpose, src_world_terrainmath_corner_watchtowers, src_world_terrainmath_crocodile_river_bend_pos, src_world_terrainmath_fortress_y_offset (+22 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.07
Nodes (40): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+32 more)

### Community 4 - "config.ts"
Cohesion: 0.19
Nodes (17): IWeatherOptionDef, clamp(), IValidatedPositionOverride, IValidatedUrlOverrides, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS (+9 more)

### Community 5 - "combatAndInventorySystem.ts"
Cohesion: 0.09
Nodes (29): IArcheryTargetDef, getActiveWorldAnimals(), ISmallAnimalState, ARCHERY_TARGETS_SPATIAL_GRID, arrowFireStrategy, arrowNormalStrategy, arrowWindStrategy, bowStrategy (+21 more)

### Community 6 - "playerPhysicsSystem.ts"
Cohesion: 0.12
Nodes (27): SOLID_BUILDING_BOXES, WORLD_SPAWN, chineseFortressStairHeightAt(), isChineseFortressWalkableZone(), ropeBridgePointInfoAt(), findLookedAtWatchtowerLadder(), findWatchtowerLadderAt(), getLadderById() (+19 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.05
Nodes (51): ref_three_addons_environments_roomenvironment_js, _camTargetLook, _euler, _sunVec, _tourLook, _tourPos, VirtualMoveState, WorldCanvasProps (+43 more)

### Community 8 - "Result"
Cohesion: 0.21
Nodes (4): AppException, InfrastructureCorruptedException, InvalidResultAccessException, Result

### Community 9 - "package.json"
Cohesion: 0.05
Nodes (39): dependencies, react, react-dom, three, devDependencies, tailwindcss, @tailwindcss/vite, tsx (+31 more)

### Community 10 - "Deer_Complete.ts"
Cohesion: 0.05
Nodes (40): BoneDef, BoneGroup, BoneName, Chain, CHAINS, computeDeerSkinWeights(), createReadyDeer(), Deer (+32 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "ref_node_assert_strict"
Cohesion: 0.14
Nodes (8): ref_node_assert_strict, ref_node_test, IErrorBoundaryProps, IErrorBoundaryState, ConsoleLogger, ILogger, NullLogger, src_world_terrainmath_biometype

### Community 13 - "collisionAndTerraces.ts"
Cohesion: 0.16
Nodes (18): ARCHERY_TARGETS, CHINESE_FORTRESS_POS, CORNER_WATCHTOWERS, FORTRESS_Y_OFFSET, FORTRESS_Z_OFFSET, findNearestBed(), findNearestFortressDoor(), FORTRESS_DOORS (+10 more)

### Community 14 - "wildlifeAndFootprintsBuilder.ts"
Cohesion: 0.17
Nodes (17): buildWildlifeAndFootprintsLayer(), IWildlifeAndFootprintsHandles, IWildlifeSoundCallbacks, WildlifeAndFootprintsHandles, WildlifeSoundCallbacks, attachDeerGlbModel(), IAnimatedDeer, IBoidBirdState (+9 more)

### Community 15 - "playerAndCombatBuilder.ts"
Cohesion: 0.11
Nodes (17): IPlayerAndCombatBuilderContext, IPlayerAndCombatHandle, PlayerAndCombatBuilderContext, PlayerAndCombatHandle, ArrowElementKind, IArrowProjectile, ARROW_TRAIL_MAX_AGE, src_world_terrainmath_arrow_trail_max_age (+9 more)

### Community 16 - "three"
Cohesion: 0.11
Nodes (25): three, attachFlagHorizontalWaveShader(), ArchitecturalSharedAssets, IArchitecturalSharedAssets, FortressModelResult, IFortressModelResult, IMartialArtsMonk, HarborModelHandles (+17 more)

### Community 17 - "atmosphereRenderController.ts"
Cohesion: 0.17
Nodes (11): ref_three_addons_objects_sky_js, AtmosphereRenderContext, _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor, IDynamicAtmosphereState (+3 more)

### Community 18 - "boidsAndWildlifeSystem.ts"
Cohesion: 0.05
Nodes (48): CLIP_ORDER, createReadyWolf(), unpackWolfBundle(), Wolf, WOLF_EMBEDDED_PACK_B64, WOLF_EMBEDDED_TEXTURE_URI, WOLF_GAITS, WOLF_STATES (+40 more)

### Community 19 - "terrainAndBiomeSystem.ts"
Cohesion: 0.16
Nodes (25): CLEAR_ZONES, FLAT_BUILDING_TERRACES, BEAR_MOUNTAIN_CAVES, BIRCH_GROVE_CENTER, CROCODILE_RIVER_BEND_POS, MAGIC_STONE_CIRCLE_POS, PLAYABLE_RADIUS, PLAYER_EYE_HEIGHT (+17 more)

### Community 20 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.12
Nodes (22): DwarvenKingdomBuilderContext, DwarvenKingdomHandle, DwarvenMinerRig, IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig, DWARVEN_GUARDIAN_STATUES, DWARVEN_STONE_HOUSES (+14 more)

### Community 21 - "GameShellOverlay.tsx"
Cohesion: 0.11
Nodes (30): GameShellOverlayProps, SEASON_OPTIONS, SkyrimModalMode, WEATHER_OPTIONS, renderArtifactArtwork(), formatMarketError(), InventoryCategoryTab, ISkyrimInventoryModalProps (+22 more)

### Community 22 - "TheMan — 3D Living Nature & RPG World Simulator"
Cohesion: 0.29
Nodes (6): Engineering standards, Getting Started, Installation & Run, Overview & Architecture, Prerequisites, TheMan — 3D Living Nature & RPG World Simulator

### Community 26 - "t"
Cohesion: 0.16
Nodes (14): ExplorerMinimap, ExplorerMinimapProps, GRID_SIZE, IExplorerMinimapProps, en, LocaleSchema, getLocaleDictionary(), NestedKeyOf (+6 more)

### Community 27 - "WorldCanvas"
Cohesion: 0.19
Nodes (18): WorldCanvas, registerWindowDebugBridge(), createTestBridgeDeps(), findNearestMarketStall(), findNearestDeadLootableAnimal(), getAnimalSpeciesNameHe(), lootDeadAnimal(), assignHotbarSlot() (+10 more)

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
Cohesion: 0.11
Nodes (7): GameShellOverlay, ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy, renderItemSvgIcon(), useTelemetry()

### Community 38 - "worldTypes.ts"
Cohesion: 0.05
Nodes (36): ArcheryTargetDef, ArrowTrailPoint, CharacterSkillsState, ClimbableLadderInfo, CornerWatchtowerDef, createCatalogItem(), DEFAULT_STARTER_OWNED_ITEM_IDS, DwarvenGuardianStatueDef (+28 more)

### Community 47 - "labCatalog.ts"
Cohesion: 0.11
Nodes (42): ref_three_examples_jsm_environments_roomenvironment_js, SAVED_LAB_OVERRIDES, CharacterLabCanvas(), afterDraw(), tick(), ICharacterLabCanvasProps, CAMERA_PRESETS, CharacterLabView() (+34 more)

### Community 49 - "IPlayerState"
Cohesion: 0.14
Nodes (8): IPlayerState, ArrowEquipmentStrategy, BowEquipmentStrategy, IEquipmentSlotStrategy, isInventoryItemEquipped(), SwordEquipmentStrategy, ToolEquipmentStrategy, UsableGearStrategy

### Community 50 - "JaguarAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyJaguar(), Jaguar, JAGUAR_EMBEDDED_PACK_B64, JAGUAR_EMBEDDED_TEXTURE_URI, JAGUAR_GAITS, JAGUAR_STATES, JaguarAnimator (+5 more)

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

### Community 59 - "Bear.ts"
Cohesion: 0.13
Nodes (12): Bear, BEAR_EMBEDDED_PACK_B64, BEAR_EMBEDDED_TEXTURE_URI, BEAR_GAITS, BEAR_STATES, BearOptions, BearRig, BearState (+4 more)

### Community 60 - "Crocodile.ts"
Cohesion: 0.14
Nodes (11): createReadyCrocodile(), CROC_EMBEDDED_PACK_B64, CROC_EMBEDDED_TEXTURE_URI, Crocodile, CROCODILE_GAITS, CROCODILE_STATES, CrocodileOptions, CrocodileRig (+3 more)

### Community 61 - "farmhouseModels.ts"
Cohesion: 0.18
Nodes (17): buildDwarvenKingdomAndMiners(), attachWindSwayShader(), createBirchBarkTexture(), perturbGeometryVertices(), fbm2D(), hash2D(), valueNoise2D(), buildFarmhouseModels() (+9 more)

### Community 62 - "proceduralModels.ts"
Cohesion: 0.20
Nodes (17): buildColliderDebugWireframes(), buildPlayerAndCombatSystems(), isWithinViewDistance(), createArchitecturalSharedAssets(), createChinesePagodaRoof(), createInteractiveDoubleDoor(), createOrnatePaifangGate(), createRedChineseLantern() (+9 more)

### Community 64 - "groundHeightAt"
Cohesion: 0.21
Nodes (16): distToSegment(), buildTerrainAndWaterModel(), ITerrainAndWaterResult, smoothstepLocal(), TerrainAndWaterResult, generateWorldObstacles(), getSurfaceNormalAt(), groundHeightAt() (+8 more)

### Community 65 - "horsePhysicsSystem.ts"
Cohesion: 0.18
Nodes (13): IRideableHorseState, ISettlementModelHandles, computeHorseBiomechanicalPose(), computeHorseTurnResistance(), HorseBiomechanicalPose, HorseLimbAngles, HorseSteeringStepResult, IHorseBiomechanicalPose (+5 more)

### Community 68 - "colliderDebugBuilder.ts"
Cohesion: 0.20
Nodes (9): IColliderDebugHandles, IObstacleCylinder, IAnimatedWorldHandles, src_world_terrainmath_chinese_fortress_pos, src_world_terrainmath_fortress_doors, src_world_terrainmath_hill_watchtowers, src_world_terrainmath_solid_building_boxes, src_world_terrainmath_southeast_harbor_pos (+1 more)

### Community 69 - "environmentAtmosphereModels.ts"
Cohesion: 0.25
Nodes (8): IWeatherStateSnapshot, EnvironmentAtmosphereHandle, IEnvironmentAtmosphereHandle, IForestSquirrel, SquirrelActionState, src_world_terrainmath_fbm2d, src_world_terrainmath_getroofheightat, src_world_terrainmath_water_level

### Community 70 - "terrainMath.ts"
Cohesion: 0.33
Nodes (5): configureTexture(), createWorldTextures(), IWorldTextureSet, WorldTextureSet, src_world_terrainmath_valuenoise2d

### Community 72 - "ITelemetrySnapshot"
Cohesion: 0.40
Nodes (5): ITelemetrySnapshot, ICharacterSkillsState, SeasonType, WalkPaceMode, ISkillAccessor

### Community 74 - "תיקיית מודלים תלת-ממדיים (`public/models`)"
Cohesion: 0.50
Nodes (3): מבנה תיקיות מומלץ (אופציונלי, או ישירות בתיקייה זו):, פורמטים מומלצים:, תיקיית מודלים תלת-ממדיים (`public/models`)

## Knowledge Gaps
- **316 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+311 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 560 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `three` to `terrainMath.test.ts`, `config.ts`, `WorldCanvas.tsx`, `package.json`, `Deer_Complete.ts`, `wildlifeAndFootprintsBuilder.ts`, `playerAndCombatBuilder.ts`, `atmosphereRenderController.ts`, `boidsAndWildlifeSystem.ts`, `dwarvenMineAndCaravanSystem.ts`, `Deer_Complete_3ce1524f.ts`, `Deer_36e45a72.ts`, `labCatalog.ts`, `JaguarAnimator`, `Rhino.ts`, `DemonDragon_Complete.ts`, `ForestDragon_Complete.ts`, `Bear_Complete_c2863232.ts`, `Crocodile_Complete_9a40f875.ts`, `Bear_447e38ff.ts`, `Bear.ts`, `Crocodile.ts`, `farmhouseModels.ts`, `proceduralModels.ts`, `groundHeightAt`, `colliderDebugBuilder.ts`, `environmentAtmosphereModels.ts`, `terrainMath.ts`?**
  _High betweenness centrality (0.468) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _316 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11954022988505747 - nodes in this community are weakly interconnected._
- **Should `terrainMath.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07258064516129033 - nodes in this community are weakly interconnected._
- **Should `swordAttackAnimationSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07200929152148665 - nodes in this community are weakly interconnected._
- **Should `combatAndInventorySystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09247311827956989 - nodes in this community are weakly interconnected._
- **Should `playerPhysicsSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1206896551724138 - nodes in this community are weakly interconnected._