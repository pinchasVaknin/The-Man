# Graph Report - TheMan  (2026-11-01)

## Corpus Check
- 132 files · ~271,500 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1298 nodes · 3546 edges · 74 communities (51 shown, 23 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `20a9b062`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- boidsAndWildlifeSystem.ts
- savedGameSettings.ts
- terrainMath.test.ts
- swordAttackAnimationSystem.ts
- buildWildlifeAndFootprintsLayer
- combatAndInventorySystem.ts
- ITelemetrySnapshot
- WorldCanvas.tsx
- Result
- package.json
- Deer_Complete.ts
- compilerOptions
- hash2D
- persistedSettingsValidation.ts
- config.ts
- worldTypes.ts
- proceduralModels.ts
- devDependencies
- atmosphereRenderController.ts
- terrainAndBiomeSystem.ts
- labModelFactory.ts
- GameShellOverlay.tsx
- TheMan — 3D Living Nature & RPG World Simulator
- rules/graphify.md
- workflows/graphify.md
- CLAUDE.md
- groundHeightAt
- WorldCanvas
- telemetryStore.ts
- src_world_terrainmath_computedwarvenminercaravanstate
- react
- src_world_terrainmath_dwarven_guardian_statues
- src_world_terrainmath_dwarven_miners_count
- src_world_terrainmath_dwarven_stone_houses
- atmosphereAndWeatherSystem.ts
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
- NatureSoundEngine
- farmhouseModels.ts
- ref_node_test
- wildlifeAndFootprintsBuilder.ts
- CrocodileAnimator
- environmentAtmosphereModels.ts
- proceduralTextures.ts
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
- `IWeatherOptionDef` --references--> `WeatherToggleOption`  [EXTRACTED]
  src/components/GameShellOverlay.tsx → src/world/domain/worldTypes.ts
- `WorldCanvas` --indirect_call--> `tick()`  [INFERRED]
  src/components/WorldCanvas.tsx → src/lab/CharacterLabCanvas.tsx
- `IErrorBoundaryProps` --references--> `ILogger`  [EXTRACTED]
  src/components/ErrorBoundary.tsx → src/core/ILogger.ts

## Import Cycles
- None detected.

## Communities (74 total, 23 thin omitted)

### Community 0 - "boidsAndWildlifeSystem.ts"
Cohesion: 0.11
Nodes (40): activeWorldAnimalsRegistry, advanceAnimalWithWaterShoreRecovery(), AnimalAiBehavior, BIRD_FLOCK_CONFIGS, caveLocalToWorld(), computePlayerNoiseRateAtDistance(), createInitialBoidBirds(), createInitialSmallAnimals() (+32 more)

### Community 1 - "savedGameSettings.ts"
Cohesion: 0.20
Nodes (12): GameSettingsModal(), IKeybindRowMeta, KEYBIND_CATEGORIES, KEYBIND_ROWS, KeybindCategory, DEFAULT_GAME_KEYBINDINGS, FirefliesMode, formatKeyCodeLabel() (+4 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.06
Nodes (34): DEFAULT_WEATHER_CYCLE_MODE, src_world_terrainmath_bear_mountain_caves, src_world_terrainmath_birch_grove_center, src_world_terrainmath_computehorsebiomechanicalpose, src_world_terrainmath_computeweatherstate, src_world_terrainmath_corner_watchtowers, src_world_terrainmath_createinitialplayerstate, src_world_terrainmath_crocodile_river_bend_pos (+26 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.09
Nodes (33): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+25 more)

### Community 4 - "buildWildlifeAndFootprintsLayer"
Cohesion: 0.27
Nodes (9): buildWildlifeAndFootprintsLayer(), BiomeType, createFootprintTrailTracker(), FOOTPRINT_MAX_AGE_SECONDS, IFootprintDecalState, IFootprintTrailTracker, isImprintableBiomeSurface(), MAX_FOOTPRINT_DECALS (+1 more)

### Community 5 - "combatAndInventorySystem.ts"
Cohesion: 0.10
Nodes (27): IArcheryTargetDef, ISmallAnimalState, ARCHERY_TARGETS_SPATIAL_GRID, arrowFireStrategy, arrowNormalStrategy, arrowWindStrategy, bowStrategy, cloakStrategy (+19 more)

### Community 6 - "ITelemetrySnapshot"
Cohesion: 0.40
Nodes (5): ITelemetrySnapshot, CameraPerspectiveMode, ICharacterSkillsState, SeasonType, ISkillAccessor

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.06
Nodes (43): ref_three_addons_environments_roomenvironment_js, _camTargetLook, _euler, _sunVec, _tourLook, _tourPos, EquippedToolSlot, src_world_terrainmath_assignhotbarslot (+35 more)

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

### Community 12 - "hash2D"
Cohesion: 0.17
Nodes (20): buildDwarvenKingdomAndMiners(), buildPlayerAndCombatSystems(), createBirchBarkTexture(), isWithinViewDistance(), hash2D(), createArchitecturalSharedAssets(), createChinesePagodaRoof(), createInteractiveDoubleDoor() (+12 more)

### Community 13 - "persistedSettingsValidation.ts"
Cohesion: 0.16
Nodes (18): ANIMATION_SPEED_RANGE, CAMERA_PERSPECTIVES, FIREFLIES_MODES, GameSettingsValidationError, isNumberInRange(), isOneOf(), isPlainObject(), JUMP_FORCE_RANGE (+10 more)

### Community 14 - "config.ts"
Cohesion: 0.23
Nodes (15): clamp(), IValidatedPositionOverride, IValidatedUrlOverrides, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS, URL_SEASON_OFFSETS (+7 more)

### Community 15 - "worldTypes.ts"
Cohesion: 0.08
Nodes (27): DEFAULT_STARTER_OWNED_ITEM_IDS, IArrowTrailPoint, IClimbableLadderInfo, ICornerWatchtowerDef, IDwarvenGuardianStatueDef, IDwarvenStoneHouseDef, IFortressDoorDef, IHillWatchtowerDef (+19 more)

### Community 16 - "proceduralModels.ts"
Cohesion: 0.13
Nodes (27): three, buildColliderDebugWireframes(), IColliderDebugHandles, attachFlagHorizontalWaveShader(), VIEW_DISTANCE, IObstacleCylinder, IArchitecturalSharedAssets, IFortressModelResult (+19 more)

### Community 17 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, tailwindcss, @tailwindcss/vite, tsx, @types/node, @types/react, @types/react-dom, @types/three (+3 more)

### Community 18 - "atmosphereRenderController.ts"
Cohesion: 0.18
Nodes (10): ref_three_addons_objects_sky_js, _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor, IDynamicAtmosphereState, src_world_terrainmath_computedynamicsolarcycle (+2 more)

### Community 19 - "terrainAndBiomeSystem.ts"
Cohesion: 0.05
Nodes (92): horseSkinsFromWorld, en, LocaleSchema, getLocaleDictionary(), setLocaleDictionary(), t(), TranslationDictionary, IDwarvenKingdomBuilderContext (+84 more)

### Community 20 - "labModelFactory.ts"
Cohesion: 0.20
Nodes (17): ref_three_examples_jsm_environments_roomenvironment_js, CharacterLabCanvas(), afterDraw(), tick(), ICharacterLabCanvasProps, computeLabAnimationCycleProgress(), getEffectiveLabAnimationSpeed(), ILabAnimationDef (+9 more)

### Community 21 - "GameShellOverlay.tsx"
Cohesion: 0.10
Nodes (31): IWeatherOptionDef, SEASON_OPTIONS, SkyrimModalMode, WEATHER_OPTIONS, renderArtifactArtwork(), formatMarketError(), InventoryCategoryTab, ISkyrimInventoryModalProps (+23 more)

### Community 22 - "TheMan — 3D Living Nature & RPG World Simulator"
Cohesion: 0.29
Nodes (6): Engineering standards, Getting Started, Installation & Run, Overview & Architecture, Prerequisites, TheMan — 3D Living Nature & RPG World Simulator

### Community 26 - "groundHeightAt"
Cohesion: 0.26
Nodes (18): distToSegment(), buildTerrainAndWaterModel(), ITerrainAndWaterResult, smoothstepLocal(), birchGroveFactorAt(), generateWorldObstacles(), getSurfaceBiomeAt(), getSurfaceNormalAt() (+10 more)

### Community 27 - "WorldCanvas"
Cohesion: 0.20
Nodes (18): WorldCanvas, registerWindowDebugBridge(), findNearestFortressDoor(), findNearestMarketStall(), findNearestDeadLootableAnimal(), getActiveWorldAnimals(), lootDeadAnimal(), assignHotbarSlot() (+10 more)

### Community 28 - "telemetryStore.ts"
Cohesion: 0.33
Nodes (5): TelemetrySnapshot, INITIAL_TELEMETRY_SNAPSHOT, ITelemetryStore, telemetryStore, src_world_terrainmath_world_spawn

### Community 30 - "react"
Cohesion: 0.33
Nodes (5): react, ExplorerMinimap, GRID_SIZE, IExplorerMinimapProps, src_world_terrainmath_sampleminimapcolorat

### Community 34 - "atmosphereAndWeatherSystem.ts"
Cohesion: 0.35
Nodes (14): applyDynamicAtmosphereToScene(), createTestBridgeDeps(), fbm2D(), lerpColorHex(), lerpNum(), smoothstep(), computeDynamicSolarCycle(), computeWeatherState() (+6 more)

### Community 36 - "itemArtworkRegistry.tsx"
Cohesion: 0.12
Nodes (7): GameShellOverlay, ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy, renderItemSvgIcon(), useTelemetry()

### Community 38 - "App.tsx"
Cohesion: 0.24
Nodes (11): App(), WEATHER_CYCLE_ORDER, IGameSettingsModalProps, IGameShellOverlayProps, GameStateMode, IVirtualMoveState, IWorldCanvasProps, IGameSettingsConfig (+3 more)

### Community 47 - "keyBindingMatch.ts"
Cohesion: 0.70
Nodes (3): isBindingHeld(), matchesKeyBinding(), MODIFIER_FAMILIES

### Community 48 - "JaguarAnimator"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyJaguar(), Jaguar, JAGUAR_EMBEDDED_PACK_B64, JAGUAR_EMBEDDED_TEXTURE_URI, JAGUAR_GAITS, JAGUAR_STATES, JaguarAnimator (+5 more)

### Community 49 - "IPlayerState"
Cohesion: 0.13
Nodes (9): ArrowElementKind, IPlayerState, ArrowEquipmentStrategy, BowEquipmentStrategy, IEquipmentSlotStrategy, isInventoryItemEquipped(), SwordEquipmentStrategy, ToolEquipmentStrategy (+1 more)

### Community 50 - "labCatalog.ts"
Cohesion: 0.20
Nodes (22): CAMERA_PRESETS, CharacterLabView(), ENVIRONMENT_PRESETS, ICharacterLabViewProps, SPEED_OPTIONS, countActivePoseOverrides(), createInitialLabSessionState(), filterLabEntities() (+14 more)

### Community 51 - "Rhino.ts"
Cohesion: 0.09
Nodes (13): CLIP_ORDER, createReadyRhino(), Rhino, RHINO_EMBEDDED_PACK_B64, RHINO_EMBEDDED_TEXTURE_URI, RHINO_GAITS, RHINO_STATES, RhinoAnimator (+5 more)

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
Nodes (13): Bear, BEAR_EMBEDDED_PACK_B64, BEAR_EMBEDDED_TEXTURE_URI, BEAR_GAITS, BEAR_STATES, BearAnimator, BearOptions, BearRig (+5 more)

### Community 60 - "Crocodile.ts"
Cohesion: 0.14
Nodes (11): createReadyCrocodile(), CROC_EMBEDDED_PACK_B64, CROC_EMBEDDED_TEXTURE_URI, Crocodile, CROCODILE_GAITS, CROCODILE_STATES, CrocodileOptions, CrocodileRig (+3 more)

### Community 62 - "NatureSoundEngine"
Cohesion: 0.05
Nodes (13): ref_react_dom_client, ErrorBoundary, IErrorBoundaryProps, IErrorBoundaryState, MockErrorLogger, ConsoleLogger, ILogger, NullLogger (+5 more)

### Community 63 - "farmhouseModels.ts"
Cohesion: 0.19
Nodes (11): attachWindSwayShader(), perturbGeometryVertices(), buildFarmhouseModels(), IFarmhouseModelHandles, attachAnimatedWaterWaveShader(), src_world_terrainmath_hash2d, src_world_terrainmath_isinsidebearcave, src_world_terrainmath_magic_stone_circle_pos (+3 more)

### Community 64 - "ref_node_test"
Cohesion: 0.26
Nodes (9): ref_node_assert_strict, ref_node_fs, ref_node_os, ref_node_path, ref_node_test, ref_node_url, DEFAULT_LAB_POSE_OVERRIDES, assertMatchesGolden() (+1 more)

### Community 65 - "wildlifeAndFootprintsBuilder.ts"
Cohesion: 0.24
Nodes (9): validateLabOverrides(), SAVED_LAB_OVERRIDES, ILabPoseOverrides, LAB_POSE_OVERRIDES_STORAGE_KEY, mergeStoredLabOverrides(), StoredLabOverridesError, IWildlifeAndFootprintsHandles, IWildlifeSoundCallbacks (+1 more)

### Community 67 - "environmentAtmosphereModels.ts"
Cohesion: 0.33
Nodes (5): IForestSquirrel, SquirrelActionState, src_world_terrainmath_fbm2d, src_world_terrainmath_getroofheightat, src_world_terrainmath_water_level

### Community 68 - "proceduralTextures.ts"
Cohesion: 0.60
Nodes (4): valueNoise2D(), configureTexture(), createWorldTextures(), src_world_terrainmath_valuenoise2d

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 418 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `proceduralModels.ts` to `terrainMath.test.ts`, `WorldCanvas.tsx`, `package.json`, `Deer_Complete.ts`, `config.ts`, `atmosphereRenderController.ts`, `terrainAndBiomeSystem.ts`, `labModelFactory.ts`, `groundHeightAt`, `JaguarAnimator`, `Rhino.ts`, `playerAndCombatBuilder.ts`, `DemonDragon_Complete.ts`, `ForestDragon_Complete.ts`, `BearAnimator`, `Crocodile.ts`, `farmhouseModels.ts`, `wildlifeAndFootprintsBuilder.ts`, `environmentAtmosphereModels.ts`, `proceduralTextures.ts`, `WolfAnimator`?**
  _High betweenness centrality (0.256) - this node is a cross-community bridge._
- **Why does `t()` connect `terrainAndBiomeSystem.ts` to `boidsAndWildlifeSystem.ts`, `savedGameSettings.ts`, `atmosphereAndWeatherSystem.ts`, `itemArtworkRegistry.tsx`, `combatAndInventorySystem.ts`, `WorldCanvas.tsx`, `worldTypes.ts`, `labCatalog.ts`, `GameShellOverlay.tsx`, `react`, `WorldCanvas`, `telemetryStore.ts`, `NatureSoundEngine`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _211 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `boidsAndWildlifeSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11414141414141414 - nodes in this community are weakly interconnected._
- **Should `terrainMath.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06190476190476191 - nodes in this community are weakly interconnected._
- **Should `swordAttackAnimationSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09243697478991597 - nodes in this community are weakly interconnected._
- **Should `combatAndInventorySystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0960591133004926 - nodes in this community are weakly interconnected._