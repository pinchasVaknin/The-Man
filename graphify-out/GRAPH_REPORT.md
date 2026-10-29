# Graph Report - TheMan  (2026-10-29)

## Corpus Check
- 89 files · ~153,166 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 860 nodes · 2276 edges · 55 communities (32 shown, 23 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8b619036`
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
- windowDebugController.ts
- compilerOptions
- NatureSoundEngine
- collisionAndTerraces.ts
- wildlifeAndFootprintsBuilder.ts
- playerAndCombatBuilder.ts
- proceduralModels.ts
- atmosphereRenderController.ts
- ExplorerMinimap.tsx
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
- src_world_terrainmath_computehorsebiomechanicalpose
- src_world_terrainmath_dwarven_guardian_statues
- src_world_terrainmath_dwarven_miners_count
- src_world_terrainmath_dwarven_stone_houses
- src_world_terrainmath_rideable_horses
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
- react
- IPlayerState
- ArrowElementKind
- evaluateSwordStrikeWindowHit
- SpatialHashGrid2D
- UsableGearStrategy
- src_world_terrainmath_dynamicatmospherestate

## God Nodes (most connected - your core abstractions)
1. `groundHeightAt()` - 36 edges
2. `t()` - 32 edges
3. `WorldCanvas` - 31 edges
4. `NatureSoundEngine` - 27 edges
5. `walkableHeightAt()` - 27 edges
6. `three` - 24 edges
7. `IPlayerState` - 24 edges
8. `registerWindowDebugBridge()` - 20 edges
9. `createArchitecturalSharedAssets()` - 19 edges
10. `computeFirstPersonSwordAttackPose()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `WorldCanvas` --indirect_call--> `tick()`  [INFERRED]
  src/components/WorldCanvas.tsx → src/lab/CharacterLabCanvas.tsx
- `createCatalogItem()` --calls--> `t()`  [EXTRACTED]
  src/world/domain/worldTypes.ts → src/locales/index.ts
- `getArrowKindLabel()` --calls--> `t()`  [EXTRACTED]
  src/world/systems/combatAndInventorySystem.ts → src/locales/index.ts
- `getEquippedToolLabel()` --calls--> `t()`  [EXTRACTED]
  src/world/systems/combatAndInventorySystem.ts → src/locales/index.ts
- `createMarketEligiblePlayer()` --calls--> `createInitialPlayerState()`  [EXTRACTED]
  src/world/systems/combatAndInventorySystem.spec.ts → src/world/systems/playerPhysicsSystem.ts

## Import Cycles
- None detected.

## Communities (55 total, 23 thin omitted)

### Community 0 - "atmosphereAndWeatherSystem.ts"
Cohesion: 0.34
Nodes (14): applyDynamicAtmosphereToScene(), lerpColorHex(), lerpNum(), smoothstep(), SeasonType, computeDynamicSolarCycle(), computeWeatherState(), DEFAULT_WEATHER_CYCLE_MODE (+6 more)

### Community 1 - "App.tsx"
Cohesion: 0.23
Nodes (11): WEATHER_CYCLE_ORDER, src_components_gameshelloverlay_gameshelloverlay, IGameShellOverlayProps, IWeatherOptionDef, GameStateMode, IVirtualMoveState, IWorldCanvasProps, IGameActions (+3 more)

### Community 2 - "terrainMath.test.ts"
Cohesion: 0.06
Nodes (30): src_world_terrainmath_birch_grove_center, src_world_terrainmath_birchgrovefactorat, src_world_terrainmath_chinese_fortress_pos, src_world_terrainmath_chinesefortressstairheightat, src_world_terrainmath_corner_watchtowers, src_world_terrainmath_fortress_doors, src_world_terrainmath_fortress_y_offset, src_world_terrainmath_fortress_z_offset (+22 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.07
Nodes (40): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+32 more)

### Community 4 - "config.ts"
Cohesion: 0.19
Nodes (17): clamp(), IValidatedPositionOverride, IValidatedUrlOverrides, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS, URL_SEASON_OFFSETS (+9 more)

### Community 5 - "combatAndInventorySystem.ts"
Cohesion: 0.08
Nodes (23): DEFAULT_STARTER_OWNED_ITEM_IDS, IArcheryTargetDef, ISolidBuildingBox, ARCHERY_TARGETS_SPATIAL_GRID, arrowFireStrategy, arrowNormalStrategy, arrowWindStrategy, bowStrategy (+15 more)

### Community 6 - "playerPhysicsSystem.ts"
Cohesion: 0.18
Nodes (18): t(), chineseFortressStairHeightAt(), isChineseFortressWalkableZone(), findLookedAtWatchtowerLadder(), findWatchtowerLadderAt(), getLadderById(), applySkillXpGain(), createInitialRideableHorses() (+10 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.08
Nodes (26): ref_three_addons_environments_roomenvironment_js, _camTargetLook, _euler, ITelemetrySnapshot, _sunVec, _tourLook, _tourPos, VirtualMoveState (+18 more)

### Community 8 - "Result"
Cohesion: 0.19
Nodes (4): AppException, InfrastructureCorruptedException, InvalidResultAccessException, Result

### Community 9 - "package.json"
Cohesion: 0.05
Nodes (38): dependencies, react, react-dom, three, devDependencies, tailwindcss, @tailwindcss/vite, tsx (+30 more)

### Community 10 - "windowDebugController.ts"
Cohesion: 0.10
Nodes (19): WindowDebugBridgeDeps, src_world_terrainmath_assignhotbarslot, src_world_terrainmath_buymarketitem, src_world_terrainmath_classifyswordattackphase, src_world_terrainmath_equipinventoryitem, src_world_terrainmath_equippedtoolslot, src_world_terrainmath_findlookedatwatchtowerladder, src_world_terrainmath_findnearestfortressdoor (+11 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "NatureSoundEngine"
Cohesion: 0.07
Nodes (9): ref_node_assert_strict, ref_node_test, MockErrorLogger, ConsoleLogger, ILogger, NullLogger, NatureSoundEngine, MockLogger (+1 more)

### Community 13 - "collisionAndTerraces.ts"
Cohesion: 0.19
Nodes (15): SOLID_BUILDING_BOXES, ARCHERY_TARGETS, CHINESE_FORTRESS_POS, FORTRESS_Y_OFFSET, FORTRESS_Z_OFFSET, FORTRESS_DOORS, isOnWatchtowerLadder(), MARKET_STALL_LOCATIONS (+7 more)

### Community 14 - "wildlifeAndFootprintsBuilder.ts"
Cohesion: 0.12
Nodes (25): buildWildlifeAndFootprintsLayer(), IWildlifeAndFootprintsController, WildlifeAndFootprintsController, BiomeType, BIRD_FLOCK_CONFIGS, BirdFlockConfig, BoidBirdState, BoidsAndWildlifeStepResult (+17 more)

### Community 15 - "playerAndCombatBuilder.ts"
Cohesion: 0.15
Nodes (12): IPlayerAndCombatBuilderContext, PlayerAndCombatBuilderContext, PlayerAndCombatHandle, ARROW_TRAIL_MAX_AGE, LOCKED_SWORD_GRIP_TRANSFORM, src_world_terrainmath_arrow_trail_max_age, src_world_terrainmath_arrowelementkind, src_world_terrainmath_computefirstpersonswordattackpose (+4 more)

### Community 16 - "proceduralModels.ts"
Cohesion: 0.06
Nodes (88): three, buildDwarvenKingdomAndMiners(), buildPlayerAndCombatSystems(), attachFlagHorizontalWaveShader(), attachWindSwayShader(), createBirchBarkTexture(), perturbGeometryVertices(), isWithinViewDistance() (+80 more)

### Community 17 - "atmosphereRenderController.ts"
Cohesion: 0.13
Nodes (17): ref_three_addons_objects_sky_js, AtmosphereRenderContext, _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor, IWindowDebugBridgeDeps (+9 more)

### Community 18 - "ExplorerMinimap.tsx"
Cohesion: 0.33
Nodes (5): ExplorerMinimap, ExplorerMinimapProps, GRID_SIZE, IExplorerMinimapProps, src_world_terrainmath_sampleminimapcolorat

### Community 19 - "terrainAndBiomeSystem.ts"
Cohesion: 0.17
Nodes (22): CLEAR_ZONES, FLAT_BUILDING_TERRACES, BIRCH_GROVE_CENTER, MAGIC_STONE_CIRCLE_POS, PLAYABLE_RADIUS, PLAYER_EYE_HEIGHT, SMALL_MEADOW_HILLS, SNOW_LINE_ALTITUDE (+14 more)

### Community 20 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.11
Nodes (24): DwarvenKingdomBuilderContext, DwarvenKingdomHandle, DwarvenMinerRig, IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig, DWARVEN_GUARDIAN_STATUES, DWARVEN_STONE_HOUSES (+16 more)

### Community 21 - "GameShellOverlay.tsx"
Cohesion: 0.11
Nodes (31): GameShellOverlayProps, SkyrimModalMode, renderArtifactArtwork(), formatMarketError(), InventoryCategoryTab, ISkyrimInventoryModalProps, ITEM_SHORT_NAMES, NON_SELLABLE_STARTER_IDS (+23 more)

### Community 22 - "TheMan — 3D Living Nature & RPG World Simulator"
Cohesion: 0.29
Nodes (6): Engineering standards, Getting Started, Installation & Run, Overview & Architecture, Prerequisites, TheMan — 3D Living Nature & RPG World Simulator

### Community 26 - "locales/index.ts"
Cohesion: 0.27
Nodes (8): he, LocaleSchema, getLocaleDictionary(), src_locales_index_he, NestedKeyOf, setLocaleDictionary(), TranslationDictionary, TranslationKey

### Community 27 - "WorldCanvas"
Cohesion: 0.20
Nodes (17): WorldCanvas, registerWindowDebugBridge(), findNearestFortressDoor(), findNearestMarketStall(), assignHotbarSlot(), buyMarketItem(), equipInventoryItem(), MarketTransactionResult (+9 more)

### Community 28 - "telemetryStore.ts"
Cohesion: 0.29
Nodes (6): TelemetrySnapshot, INITIAL_TELEMETRY_SNAPSHOT, ITelemetryStore, telemetryStore, useTelemetry(), src_world_terrainmath_world_spawn

### Community 36 - "itemArtworkRegistry.tsx"
Cohesion: 0.14
Nodes (5): ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy, renderItemSvgIcon()

### Community 38 - "worldTypes.ts"
Cohesion: 0.06
Nodes (33): ArcheryTargetDef, ArrowTrailPoint, CharacterSkillsState, ClimbableLadderInfo, CornerWatchtowerDef, createCatalogItem(), DwarvenGuardianStatueDef, DwarvenMinerCaravanState (+25 more)

### Community 47 - "labCatalog.ts"
Cohesion: 0.08
Nodes (50): ref_three_examples_jsm_environments_roomenvironment_js, CharacterLabCanvas(), afterDraw(), tick(), ICharacterLabCanvasProps, CAMERA_PRESETS, CharacterLabView(), ENVIRONMENT_PRESETS (+42 more)

### Community 48 - "react"
Cohesion: 0.14
Nodes (8): react, ref_react_dom_client, App(), ErrorBoundary, IErrorBoundaryProps, IErrorBoundaryState, src_index, rootElement

### Community 49 - "IPlayerState"
Cohesion: 0.22
Nodes (6): IPlayerAndCombatHandle, IPlayerState, BowEquipmentStrategy, IEquipmentSlotStrategy, SwordEquipmentStrategy, ToolEquipmentStrategy

### Community 51 - "evaluateSwordStrikeWindowHit"
Cohesion: 0.50
Nodes (5): evaluateSwordStrikeWindowHit(), getNearbyArcheryTargets(), getNearbySolidBuildingBoxes(), stepArrowsPhysics(), stepSwordSwingCombat()

## Knowledge Gaps
- **223 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+218 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 347 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `proceduralModels.ts` to `config.ts`, `WorldCanvas.tsx`, `package.json`, `windowDebugController.ts`, `wildlifeAndFootprintsBuilder.ts`, `playerAndCombatBuilder.ts`, `labCatalog.ts`, `atmosphereRenderController.ts`, `dwarvenMineAndCaravanSystem.ts`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `App.tsx`, `itemArtworkRegistry.tsx`, `WorldCanvas.tsx`, `package.json`, `labCatalog.ts`, `ExplorerMinimap.tsx`, `GameShellOverlay.tsx`, `telemetryStore.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `NatureSoundEngine` connect `NatureSoundEngine` to `App.tsx`, `config.ts`, `WorldCanvas.tsx`, `windowDebugController.ts`, `wildlifeAndFootprintsBuilder.ts`, `atmosphereRenderController.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _223 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `terrainMath.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `swordAttackAnimationSystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07200929152148665 - nodes in this community are weakly interconnected._
- **Should `combatAndInventorySystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._