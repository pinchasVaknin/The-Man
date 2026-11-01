# Graph Report - TheMan  (2026-11-01)

## Corpus Check
- 123 files · ~447,380 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1501 nodes · 3870 edges · 77 communities (49 shown, 28 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `214791f1`
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
- persistedSettingsValidation.ts
- playerAndCombatBuilder.ts
- settlementModels.ts
- groundHeightAt
- proceduralModels.ts
- BearAnimator
- WolfAnimator
- terrainAndBiomeSystem.ts
- dwarvenMineAndCaravanSystem.ts
- GameShellOverlay.tsx
- TheMan — 3D Living Nature & RPG World Simulator
- rules/graphify.md
- workflows/graphify.md
- CLAUDE.md
- locales/index.ts
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
- CharacterLabCanvas.tsx
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
- Bear.ts
- Crocodile.ts
- src_world_terrainmath_getanimalspeciesnamehe
- NatureSoundEngine
- collisionAndTerraces.ts
- RhinoAnimator
- horsePhysicsSystem.ts
- wildlifeAndFootprintsBuilder.ts
- CrocodileAnimator
- Wolf
- Wolf.ts
- InfrastructureCorruptedException
- Bear
- vite.config.ts
- ref_node_assert_strict
- תיקיית מודלים תלת-ממדיים (`public/models`)
- src_world_terrainmath_archery_targets
- src_locales_index_he

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
10. `registerWindowDebugBridge()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `buildLabEntityRig()` --calls--> `createReadyCrocodile()`  [EXTRACTED]
  src/lab/labModelFactory.ts → public/models/animals/Crocodile_Complete.ts
- `buildWildlifeAndFootprintsLayer()` --calls--> `createReadyCrocodile()`  [EXTRACTED]
  src/world/builders/wildlifeAndFootprintsBuilder.ts → public/models/animals/Crocodile_Complete.ts
- `attachDeerGlbModel()` --calls--> `createReadyDeer()`  [EXTRACTED]
  src/world/models/deerGlbLoader.ts → public/models/animals/Deer_Complete.ts
- `buildSanctuaryAndDragonModels()` --calls--> `createReadyDemonDragon()`  [EXTRACTED]
  src/world/models/sanctuaryAndDragonModels.ts → public/models/animals/DemonDragon_Complete.ts
- `buildSanctuaryAndDragonModels()` --calls--> `createReadyForestDragon()`  [EXTRACTED]
  src/world/models/sanctuaryAndDragonModels.ts → public/models/animals/ForestDragon_Complete.ts

## Import Cycles
- None detected.

## Communities (77 total, 28 thin omitted)

### Community 0 - "boidsAndWildlifeSystem.ts"
Cohesion: 0.13
Nodes (31): activeWorldAnimalsRegistry, advanceAnimalWithWaterShoreRecovery(), AnimalAiBehavior, BIRD_FLOCK_CONFIGS, caveLocalToWorld(), computePlayerNoiseRateAtDistance(), createInitialBoidBirds(), createInitialSmallAnimals() (+23 more)

### Community 1 - "App.tsx"
Cohesion: 0.13
Nodes (25): App(), WEATHER_CYCLE_ORDER, GameSettingsModal(), IGameSettingsModalProps, IKeybindRowMeta, KEYBIND_CATEGORIES, KEYBIND_ROWS, KeybindCategory (+17 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.06
Nodes (32): SOLID_BUILDING_BOXES, CHINESE_FORTRESS_POS, FORTRESS_DOORS, DEFAULT_WEATHER_CYCLE_MODE, src_world_terrainmath_birch_grove_center, src_world_terrainmath_chinese_fortress_pos, src_world_terrainmath_chinesefortressstairheightat, src_world_terrainmath_computeweatherstate (+24 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.09
Nodes (33): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+25 more)

### Community 4 - "config.ts"
Cohesion: 0.26
Nodes (13): clamp(), IValidatedPositionOverride, IValidatedUrlOverrides, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS, URL_SEASON_OFFSETS (+5 more)

### Community 5 - "combatAndInventorySystem.ts"
Cohesion: 0.07
Nodes (27): IWildlifeAndFootprintsHandles, DEFAULT_STARTER_OWNED_ITEM_IDS, IArcheryTargetDef, IInventoryItemDef, ISolidBuildingBox, IBoidBirdState, ISmallAnimalState, ARCHERY_TARGETS_SPATIAL_GRID (+19 more)

### Community 6 - "playerPhysicsSystem.ts"
Cohesion: 0.14
Nodes (21): t(), WORLD_SPAWN, chineseFortressStairHeightAt(), isChineseFortressWalkableZone(), findLookedAtWatchtowerLadder(), findWatchtowerLadderAt(), getLadderById(), isOnWatchtowerLadder() (+13 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.05
Nodes (57): ref_three_addons_environments_roomenvironment_js, ref_three_addons_objects_sky_js, _camTargetLook, _euler, _sunVec, _tourLook, _tourPos, applyDynamicAtmosphereToScene() (+49 more)

### Community 8 - "Result"
Cohesion: 0.27
Nodes (3): AppException, InvalidResultAccessException, Result

### Community 9 - "package.json"
Cohesion: 0.06
Nodes (34): dependencies, react, react-dom, three, devDependencies, tailwindcss, @tailwindcss/vite, tsx (+26 more)

### Community 10 - "Deer_Complete.ts"
Cohesion: 0.05
Nodes (40): BoneDef, BoneGroup, BoneName, Chain, CHAINS, computeDeerSkinWeights(), createReadyDeer(), Deer (+32 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "persistedSettingsValidation.ts"
Cohesion: 0.14
Nodes (20): ANIMATION_SPEED_RANGE, CAMERA_PERSPECTIVES, FIREFLIES_MODES, GameSettingsValidationError, isNumberInRange(), isOneOf(), isPlainObject(), JUMP_FORCE_RANGE (+12 more)

### Community 13 - "playerAndCombatBuilder.ts"
Cohesion: 0.13
Nodes (16): SAVED_LAB_OVERRIDES, buildDwarvenKingdomAndMiners(), buildPlayerAndCombatSystems(), IPlayerAndCombatBuilderContext, buildSettlementModels(), ARROW_TRAIL_MAX_AGE, LOCKED_SWORD_GRIP_TRANSFORM, computeSlopePitchAndRoll() (+8 more)

### Community 14 - "settlementModels.ts"
Cohesion: 0.12
Nodes (16): LAKESIDE_TEA_PAVILION_POS, IRideableHorseState, ISettlementModelHandles, src_world_terrainmath_bear_mountain_caves, src_world_terrainmath_computehorsebiomechanicalpose, src_world_terrainmath_crocodile_river_bend_pos, src_world_terrainmath_hunter_lodge_pos, src_world_terrainmath_irideablehorsestate (+8 more)

### Community 15 - "groundHeightAt"
Cohesion: 0.39
Nodes (9): damageGroundAnimal(), killGroundAnimal(), triggerCrocodilePackAggro(), evaluateSwordStrikeWindowHit(), getNearbyArcheryTargets(), getNearbySolidBuildingBoxes(), stepArrowsPhysics(), groundHeightAt() (+1 more)

### Community 16 - "proceduralModels.ts"
Cohesion: 0.06
Nodes (87): three, buildColliderDebugWireframes(), IColliderDebugHandles, attachFlagHorizontalWaveShader(), attachWindSwayShader(), createBirchBarkTexture(), perturbGeometryVertices(), createTestBridgeDeps() (+79 more)

### Community 19 - "terrainAndBiomeSystem.ts"
Cohesion: 0.17
Nodes (25): CLEAR_ZONES, FLAT_BUILDING_TERRACES, BEAR_MOUNTAIN_CAVES, BIRCH_GROVE_CENTER, CROCODILE_RIVER_BEND_POS, MAGIC_STONE_CIRCLE_POS, PLAYABLE_RADIUS, PLAYER_EYE_HEIGHT (+17 more)

### Community 20 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.14
Nodes (20): IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig, DWARVEN_GUARDIAN_STATUES, DWARVEN_STONE_HOUSES, SOUTHERN_MINE_POS, buildMinerWaypoints(), CaravanPath (+12 more)

### Community 21 - "GameShellOverlay.tsx"
Cohesion: 0.09
Nodes (36): react, ExplorerMinimap, GRID_SIZE, IExplorerMinimapProps, GameShellOverlay, SEASON_OPTIONS, SkyrimModalMode, WEATHER_OPTIONS (+28 more)

### Community 22 - "TheMan — 3D Living Nature & RPG World Simulator"
Cohesion: 0.29
Nodes (6): Engineering standards, Getting Started, Installation & Run, Overview & Architecture, Prerequisites, TheMan — 3D Living Nature & RPG World Simulator

### Community 26 - "locales/index.ts"
Cohesion: 0.39
Nodes (5): en, LocaleSchema, getLocaleDictionary(), setLocaleDictionary(), TranslationDictionary

### Community 27 - "WorldCanvas"
Cohesion: 0.14
Nodes (25): WorldCanvas, registerWindowDebugBridge(), findNearestBed(), findNearestFortressDoor(), findNearestMarketStall(), findNearestDeadLootableAnimal(), getActiveWorldAnimals(), getAnimalSpeciesName() (+17 more)

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
Cohesion: 0.14
Nodes (4): ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy

### Community 38 - "worldTypes.ts"
Cohesion: 0.13
Nodes (17): ITelemetrySnapshot, ArrowElementKind, createCatalogItem(), EquippedToolSlot, FIRST_MARKET_CATALOG_ITEM, IArrowTrailPoint, IClimbableLadderInfo, ICornerWatchtowerDef (+9 more)

### Community 47 - "CharacterLabCanvas.tsx"
Cohesion: 0.26
Nodes (14): ref_three_examples_jsm_environments_roomenvironment_js, CharacterLabCanvas(), afterDraw(), tick(), ICharacterLabCanvasProps, computeLabAnimationCycleProgress(), getEffectiveLabAnimationSpeed(), ILabAnimationDef (+6 more)

### Community 48 - "JaguarAnimator"
Cohesion: 0.09
Nodes (12): CLIP_ORDER, Jaguar, JAGUAR_EMBEDDED_PACK_B64, JAGUAR_EMBEDDED_TEXTURE_URI, JAGUAR_GAITS, JAGUAR_STATES, JaguarAnimator, JaguarOptions (+4 more)

### Community 49 - "IPlayerState"
Cohesion: 0.18
Nodes (8): IPlayerAndCombatHandle, InventoryItemId, IPlayerState, ArrowEquipmentStrategy, BowEquipmentStrategy, IEquipmentSlotStrategy, SwordEquipmentStrategy, ToolEquipmentStrategy

### Community 50 - "labCatalog.ts"
Cohesion: 0.16
Nodes (27): CAMERA_PRESETS, CharacterLabView(), ENVIRONMENT_PRESETS, ICharacterLabViewProps, SPEED_OPTIONS, countActivePoseOverrides(), createInitialLabSessionState(), DEFAULT_LAB_POSE_OVERRIDES (+19 more)

### Community 51 - "Rhino.ts"
Cohesion: 0.12
Nodes (12): CLIP_ORDER, createReadyRhino(), Rhino, RHINO_EMBEDDED_PACK_B64, RHINO_EMBEDDED_TEXTURE_URI, RHINO_GAITS, RHINO_STATES, RhinoOptions (+4 more)

### Community 53 - "DemonDragon_Complete.ts"
Cohesion: 0.10
Nodes (13): CLIP_ORDER, createReadyDemonDragon(), DEMON_DRAGON_EMBEDDED_PACK_B64, DEMON_DRAGON_EMBEDDED_TEXTURE_URI, DEMON_DRAGON_GAITS, DemonDragon, DemonDragonAnimator, DemonDragonOptions (+5 more)

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
Cohesion: 0.22
Nodes (10): BEAR_EMBEDDED_PACK_B64, BEAR_EMBEDDED_TEXTURE_URI, BEAR_GAITS, BEAR_STATES, BearOptions, BearRig, BearState, BearUnpackedData (+2 more)

### Community 60 - "Crocodile.ts"
Cohesion: 0.14
Nodes (11): createReadyCrocodile(), CROC_EMBEDDED_PACK_B64, CROC_EMBEDDED_TEXTURE_URI, Crocodile, CROCODILE_GAITS, CROCODILE_STATES, CrocodileOptions, CrocodileRig (+3 more)

### Community 62 - "NatureSoundEngine"
Cohesion: 0.05
Nodes (15): ref_react_dom_client, ErrorBoundary, IErrorBoundaryProps, IErrorBoundaryState, MockErrorLogger, ConsoleLogger, ILogger, NullLogger (+7 more)

### Community 63 - "collisionAndTerraces.ts"
Cohesion: 0.20
Nodes (14): ARCHERY_TARGETS, CORNER_WATCHTOWERS, FORTRESS_Y_OFFSET, FORTRESS_Z_OFFSET, IWorldBedDef, WORLD_BEDS, MARKET_STALL_LOCATIONS, SOUTHEAST_HARBOR_POS (+6 more)

### Community 65 - "horsePhysicsSystem.ts"
Cohesion: 0.29
Nodes (8): computeHorseBiomechanicalPose(), computeHorseTurnResistance(), IHorseBiomechanicalPose, IHorseLimbAngles, IHorseSteeringStepResult, solveForelimb(), solveHindlimb(), stepMountedHorseSteering()

### Community 66 - "wildlifeAndFootprintsBuilder.ts"
Cohesion: 0.25
Nodes (14): createReadyBear(), createReadyJaguar(), createReadyWolf(), buildLabEntityRig(), computeGroupStats(), buildWildlifeAndFootprintsLayer(), IWildlifeSoundCallbacks, attachDeerGlbModel() (+6 more)

### Community 69 - "Wolf.ts"
Cohesion: 0.33
Nodes (9): CLIP_ORDER, unpackWolfBundle(), WOLF_EMBEDDED_PACK_B64, WOLF_EMBEDDED_TEXTURE_URI, WOLF_GAITS, WOLF_STATES, WolfOptions, WolfState (+1 more)

### Community 70 - "InfrastructureCorruptedException"
Cohesion: 0.31
Nodes (4): InfrastructureCorruptedException, createTickErrorGuard(), ITickErrorGuard, TickErrorDecision

### Community 72 - "vite.config.ts"
Cohesion: 0.14
Nodes (13): ref_node_fs_promises, ref_node_http, ref_path, @tailwindcss/vite, vite, @vitejs/plugin-react, assertTrustedJsonRequest(), PERSISTENCE_ROUTES (+5 more)

### Community 73 - "ref_node_assert_strict"
Cohesion: 0.38
Nodes (4): ref_node_assert_strict, ref_node_test, SAVED_GAME_SETTINGS, globalWithWindow

### Community 74 - "תיקיית מודלים תלת-ממדיים (`public/models`)"
Cohesion: 0.50
Nodes (3): מבנה תיקיות מומלץ (אופציונלי, או ישירות בתיקייה זו):, פורמטים מומלצים:, תיקיית מודלים תלת-ממדיים (`public/models`)

## Knowledge Gaps
- **267 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+262 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 514 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `proceduralModels.ts` to `terrainMath.test.ts`, `config.ts`, `WorldCanvas.tsx`, `package.json`, `Deer_Complete.ts`, `playerAndCombatBuilder.ts`, `settlementModels.ts`, `dwarvenMineAndCaravanSystem.ts`, `Deer_Complete_3ce1524f.ts`, `Deer_36e45a72.ts`, `CharacterLabCanvas.tsx`, `JaguarAnimator`, `Rhino.ts`, `DemonDragon_Complete.ts`, `ForestDragon_Complete.ts`, `Bear_Complete_c2863232.ts`, `Crocodile_Complete_9a40f875.ts`, `Bear_447e38ff.ts`, `Bear.ts`, `Crocodile.ts`, `wildlifeAndFootprintsBuilder.ts`, `Wolf.ts`?**
  _High betweenness centrality (0.468) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _267 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `boidsAndWildlifeSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13257575757575757 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13227513227513227 - nodes in this community are weakly interconnected._
- **Should `terrainMath.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06417112299465241 - nodes in this community are weakly interconnected._
- **Should `swordAttackAnimationSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09243697478991597 - nodes in this community are weakly interconnected._
- **Should `combatAndInventorySystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07096774193548387 - nodes in this community are weakly interconnected._