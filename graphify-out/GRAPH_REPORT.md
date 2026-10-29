# Graph Report - TheMan  (2026-10-28)

## Corpus Check
- 72 files · ~117,627 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 3, .css 1)

## Summary
- 704 nodes · 1823 edges · 46 communities (32 shown, 14 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `23f70385`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- terrainAndWaterModel.ts
- GameShellOverlay.tsx
- combatAndInventorySystem.ts
- swordAttackAnimationSystem.ts
- dwarvenMineAndCaravanSystem.ts
- WorldCanvas
- groundHeightAt
- WorldCanvas.tsx
- Result
- package.json
- windowDebugController.ts
- compilerOptions
- ILogger
- terrainMath.test.ts
- wildlifeAndFootprintsBuilder.ts
- playerAndCombatBuilder.ts
- proceduralModels.ts
- atmosphereRenderController.ts
- fortressModels.ts
- registerWindowDebugBridge
- worldTypes.ts
- SkyrimInventoryModal.tsx
- Run and deploy your AI Studio app
- rules/graphify.md
- workflows/graphify.md
- CLAUDE.md
- horsePhysicsSystem.ts
- environmentAtmosphereModels.ts
- telemetryStore.ts
- src_world_terrainmath_computedwarvenminercaravanstate
- src_world_terrainmath_computehorsebiomechanicalpose
- src_world_terrainmath_dwarven_guardian_statues
- src_world_terrainmath_dwarven_miners_count
- src_world_terrainmath_dwarven_stone_houses
- src_world_terrainmath_rideable_horses
- react
- itemArtworkRegistry.tsx
- createArchitecturalSharedAssets
- types.ts
- ExplorerMinimap.tsx
- terrainMath.ts
- ref_domain_worldtypes
- src_world_domain_landmarksregistry_chinesefortressstairheightat
- src_world_terrainmath_solaratmosphere
- harborModels.ts
- MockLogger

## God Nodes (most connected - your core abstractions)
1. `WorldCanvas` - 43 edges
2. `groundHeightAt()` - 35 edges
3. `walkableHeightAt()` - 26 edges
4. `NatureSoundEngine` - 25 edges
5. `three` - 21 edges
6. `createArchitecturalSharedAssets()` - 19 edges
7. `isWithinViewDistance()` - 17 edges
8. `hash2D()` - 17 edges
9. `buildRealisticWorld()` - 17 edges
10. `stepPlayerPhysics()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `ExplorerMinimap` --calls--> `sampleMinimapColorAt()`  [EXTRACTED]
  src/components/ExplorerMinimap.tsx → src/world/systems/terrainAndBiomeSystem.ts
- `IGameShellOverlayProps` --references--> `TelemetrySnapshot`  [EXTRACTED]
  src/components/GameShellOverlay.tsx → src/components/WorldCanvas.tsx
- `ITelemetrySnapshot` --references--> `BiomeType`  [EXTRACTED]
  src/components/WorldCanvas.tsx → src/world/domain/worldTypes.ts
- `ITelemetrySnapshot` --references--> `CharacterSkillsState`  [EXTRACTED]
  src/components/WorldCanvas.tsx → src/world/domain/worldTypes.ts
- `ITelemetrySnapshot` --references--> `InventoryItemId`  [EXTRACTED]
  src/components/WorldCanvas.tsx → src/world/domain/worldTypes.ts

## Import Cycles
- None detected.

## Communities (46 total, 14 thin omitted)

### Community 0 - "terrainAndWaterModel.ts"
Cohesion: 0.12
Nodes (18): attachWindSwayShader(), perturbGeometryVertices(), buildFarmhouseModels(), FarmhouseModelHandles, IFarmhouseModelHandles, attachAnimatedWaterWaveShader(), ITerrainAndWaterResult, smoothstepLocal() (+10 more)

### Community 1 - "GameShellOverlay.tsx"
Cohesion: 0.20
Nodes (16): WEATHER_CYCLE_ORDER, DEFAULT_OWNED_IDS, GameShellOverlay, GameShellOverlayProps, IGameShellOverlayProps, SkyrimModalMode, WEATHER_OPTIONS, renderItemSvgIcon() (+8 more)

### Community 2 - "combatAndInventorySystem.ts"
Cohesion: 0.13
Nodes (15): ArcheryTargetDef, evaluateSwordStrikeWindowHit(), IBuyMarketItemPayload, ISellMarketItemPayload, ISwordSlashHitResult, MarketTransactionErrorCode, spawnArrowProjectile(), stepArrowsPhysics() (+7 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.08
Nodes (37): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+29 more)

### Community 4 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.11
Nodes (23): buildDwarvenKingdomAndMiners(), DwarvenKingdomBuilderContext, DwarvenKingdomHandle, DwarvenMinerRig, IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig, DwarvenMinerCaravanState (+15 more)

### Community 6 - "groundHeightAt"
Cohesion: 0.23
Nodes (26): applyDynamicAtmosphereToScene(), distToSegment(), fbm2D(), hash2D(), lerpColorHex(), lerpNum(), smoothstep(), valueNoise2D() (+18 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.10
Nodes (24): ref_three_addons_environments_roomenvironment_js, _camTargetLook, _euler, ITelemetrySnapshot, IVirtualMoveState, _sunVec, _tourLook, _tourPos (+16 more)

### Community 8 - "Result"
Cohesion: 0.18
Nodes (5): ref_node_test, AppException, InfrastructureCorruptedException, InvalidResultAccessException, Result

### Community 9 - "package.json"
Cohesion: 0.05
Nodes (38): dependencies, react, react-dom, three, devDependencies, tailwindcss, @tailwindcss/vite, tsx (+30 more)

### Community 10 - "windowDebugController.ts"
Cohesion: 0.10
Nodes (19): WindowDebugBridgeDeps, src_world_terrainmath_assignhotbarslot, src_world_terrainmath_buymarketitem, src_world_terrainmath_classifyswordattackphase, src_world_terrainmath_equipinventoryitem, src_world_terrainmath_equippedtoolslot, src_world_terrainmath_findlookedatwatchtowerladder, src_world_terrainmath_findnearestfortressdoor (+11 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "ILogger"
Cohesion: 0.16
Nodes (5): ref_node_assert_strict, ConsoleLogger, ILogger, NullLogger, src_world_terrainmath_biometype

### Community 13 - "terrainMath.test.ts"
Cohesion: 0.06
Nodes (77): CLEAR_ZONES, FLAT_BUILDING_TERRACES, SOLID_BUILDING_BOXES, BIRCH_GROVE_CENTER, MAGIC_STONE_CIRCLE_POS, PLAYABLE_RADIUS, PLAYER_EYE_HEIGHT, SMALL_MEADOW_HILLS (+69 more)

### Community 14 - "wildlifeAndFootprintsBuilder.ts"
Cohesion: 0.11
Nodes (28): buildWildlifeAndFootprintsLayer(), IWildlifeAndFootprintsController, WildlifeAndFootprintsController, BiomeType, PlayerState, RideableHorseState, IAnimatedWorldHandles, BIRD_FLOCK_CONFIGS (+20 more)

### Community 15 - "playerAndCombatBuilder.ts"
Cohesion: 0.14
Nodes (14): IPlayerAndCombatBuilderContext, IPlayerAndCombatHandle, PlayerAndCombatBuilderContext, PlayerAndCombatHandle, ArrowProjectile, ARROW_TRAIL_MAX_AGE, LOCKED_SWORD_GRIP_TRANSFORM, src_world_terrainmath_arrow_trail_max_age (+6 more)

### Community 16 - "proceduralModels.ts"
Cohesion: 0.22
Nodes (14): buildPlayerAndCombatSystems(), createBirchBarkTexture(), isWithinViewDistance(), buildEnvironmentAtmosphereModels(), buildFortressModels(), buildSanctuaryAndDragonModels(), ISanctuaryAndDragonResult, ITaiChiMonk (+6 more)

### Community 17 - "atmosphereRenderController.ts"
Cohesion: 0.13
Nodes (15): ref_three_addons_objects_sky_js, AtmosphereRenderContext, _denseFogColor, IAtmosphereRenderContext, _lightningColor, _sandFogColor, _stormFogColor, IWindowDebugBridgeDeps (+7 more)

### Community 18 - "fortressModels.ts"
Cohesion: 0.19
Nodes (12): three, attachFlagHorizontalWaveShader(), ArchitecturalSharedAssets, FortressModelResult, IFortressModelResult, IMartialArtsMonk, IOasisModelHandles, OasisModelHandles (+4 more)

### Community 19 - "registerWindowDebugBridge"
Cohesion: 0.23
Nodes (12): registerWindowDebugBridge(), findNearestMarketStall(), IPlayerState, assignHotbarSlot(), buyMarketItem(), equipInventoryItem(), MarketTransactionResult, sellMarketItem() (+4 more)

### Community 20 - "worldTypes.ts"
Cohesion: 0.06
Nodes (33): ArrowTrailPoint, ClimbableLadderInfo, CornerWatchtowerDef, DwarvenGuardianStatueDef, DwarvenStoneHouseDef, FortressDoorDef, GameActions, HillWatchtowerDef (+25 more)

### Community 21 - "SkyrimInventoryModal.tsx"
Cohesion: 0.14
Nodes (17): renderArtifactArtwork(), InventoryCategoryTab, ISkyrimInventoryModalProps, NON_SELLABLE_STARTER_IDS, SHORT_NAMES_HE, SkyrimInventoryModal, SkyrimInventoryModalProps, CharacterSkillsState (+9 more)

### Community 22 - "Run and deploy your AI Studio app"
Cohesion: 0.50
Nodes (3): Engineering standards, Run and deploy your AI Studio app, Run Locally

### Community 26 - "horsePhysicsSystem.ts"
Cohesion: 0.21
Nodes (11): computeHorseBiomechanicalPose(), computeHorseTurnResistance(), HorseBiomechanicalPose, HorseLimbAngles, HorseSteeringStepResult, IHorseBiomechanicalPose, IHorseLimbAngles, IHorseSteeringStepResult (+3 more)

### Community 27 - "environmentAtmosphereModels.ts"
Cohesion: 0.14
Nodes (13): EnvironmentAtmosphereHandle, IAnimatedDeer, IForestSquirrel, SquirrelActionState, ISettlementModelHandles, SettlementModelHandles, src_world_terrainmath_fbm2d, src_world_terrainmath_hunter_lodge_pos (+5 more)

### Community 28 - "telemetryStore.ts"
Cohesion: 0.33
Nodes (5): TelemetrySnapshot, INITIAL_TELEMETRY_SNAPSHOT, ITelemetryStore, telemetryStore, src_world_terrainmath_world_spawn

### Community 35 - "react"
Cohesion: 0.14
Nodes (8): react, ref_react_dom_client, App(), ErrorBoundary, IErrorBoundaryProps, IErrorBoundaryState, src_index, rootElement

### Community 36 - "itemArtworkRegistry.tsx"
Cohesion: 0.15
Nodes (4): ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy

### Community 37 - "createArchitecturalSharedAssets"
Cohesion: 0.36
Nodes (8): createArchitecturalSharedAssets(), createChinesePagodaRoof(), createInteractiveDoubleDoor(), createOrnatePaifangGate(), createRedChineseLantern(), createRedImperialFlag(), buildHarborModels(), buildOasisModels()

### Community 38 - "types.ts"
Cohesion: 0.31
Nodes (8): ObstacleCylinder, IArchitecturalSharedAssets, DistanceCulledObject, DoorPivotHandle, IDistanceCulledObject, IDoorPivotHandle, IWorldModelBuildContext, WorldTextureSet

### Community 39 - "ExplorerMinimap.tsx"
Cohesion: 0.33
Nodes (5): ExplorerMinimap, ExplorerMinimapProps, GRID_SIZE, IExplorerMinimapProps, src_world_terrainmath_sampleminimapcolorat

### Community 40 - "terrainMath.ts"
Cohesion: 0.40
Nodes (4): configureTexture(), createWorldTextures(), IWorldTextureSet, src_world_terrainmath_valuenoise2d

### Community 44 - "harborModels.ts"
Cohesion: 0.40
Nodes (4): HarborModelHandles, IHarborModelHandles, src_world_terrainmath_iswithinviewdistance, src_world_terrainmath_southeast_harbor_pos

## Knowledge Gaps
- **189 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+184 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 295 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `fortressModels.ts` to `terrainAndWaterModel.ts`, `dwarvenMineAndCaravanSystem.ts`, `types.ts`, `WorldCanvas.tsx`, `terrainMath.ts`, `package.json`, `windowDebugController.ts`, `harborModels.ts`, `wildlifeAndFootprintsBuilder.ts`, `playerAndCombatBuilder.ts`, `proceduralModels.ts`, `atmosphereRenderController.ts`, `environmentAtmosphereModels.ts`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `GameShellOverlay.tsx`, `itemArtworkRegistry.tsx`, `ExplorerMinimap.tsx`, `WorldCanvas.tsx`, `package.json`, `SkyrimInventoryModal.tsx`, `telemetryStore.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `WorldCanvas` connect `WorldCanvas` to `GameShellOverlay.tsx`, `combatAndInventorySystem.ts`, `swordAttackAnimationSystem.ts`, `dwarvenMineAndCaravanSystem.ts`, `groundHeightAt`, `WorldCanvas.tsx`, `terrainMath.ts`, `terrainMath.test.ts`, `proceduralModels.ts`, `registerWindowDebugBridge`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `WorldCanvas` (e.g. with `.dispose()` and `.init()`) actually correct?**
  _`WorldCanvas` has 14 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _189 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `terrainAndWaterModel.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1225296442687747 - nodes in this community are weakly interconnected._
- **Should `combatAndInventorySystem.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13157894736842105 - nodes in this community are weakly interconnected._