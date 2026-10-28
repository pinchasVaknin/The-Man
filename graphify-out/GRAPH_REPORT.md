# Graph Report - TheMan  (2026-10-28)

## Corpus Check
- 58 files · ~112,273 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 3, .css 1)

## Summary
- 575 nodes · 1572 edges · 35 communities (25 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4eb906c4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- proceduralModels.ts
- GameShellOverlay.tsx
- combatAndInventorySystem.ts
- swordAttackAnimationSystem.ts
- dwarvenMineAndCaravanSystem.ts
- terrainMath.test.ts
- atmosphereAndWeatherSystem.ts
- WorldCanvas.tsx
- InvalidResultAccessException
- package.json
- windowDebugController.ts
- compilerOptions
- NatureSoundEngine
- terrainAndBiomeSystem.ts
- dependencies
- playerAndCombatBuilder.ts
- devDependencies
- atmosphereRenderController.ts
- playerPhysicsSystem.ts
- scripts
- worldTypes.ts
- vite.config.ts
- Run and deploy your AI Studio app
- rules/graphify.md
- workflows/graphify.md
- CLAUDE.md
- horsePhysicsSystem.ts
- interactionLandmarks.ts
- PlayerState
- src_world_terrainmath_computedwarvenminercaravanstate
- src_world_terrainmath_computehorsebiomechanicalpose
- src_world_terrainmath_dwarven_guardian_statues
- src_world_terrainmath_dwarven_miners_count
- src_world_terrainmath_dwarven_stone_houses
- src_world_terrainmath_rideable_horses

## God Nodes (most connected - your core abstractions)
1. `WorldCanvas()` - 38 edges
2. `groundHeightAt()` - 35 edges
3. `walkableHeightAt()` - 28 edges
4. `NatureSoundEngine` - 22 edges
5. `three` - 21 edges
6. `isWithinViewDistance()` - 17 edges
7. `hash2D()` - 17 edges
8. `createArchitecturalSharedAssets()` - 17 edges
9. `stepPlayerPhysics()` - 17 edges
10. `tick()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `ExplorerMinimap()` --calls--> `sampleMinimapColorAt()`  [EXTRACTED]
  src/components/ExplorerMinimap.tsx → src/world/systems/terrainAndBiomeSystem.ts
- `GameShellOverlayProps` --references--> `TelemetrySnapshot`  [EXTRACTED]
  src/components/GameShellOverlay.tsx → src/components/WorldCanvas.tsx
- `GameShellOverlayProps` --references--> `WeatherToggleOption`  [EXTRACTED]
  src/components/GameShellOverlay.tsx → src/world/domain/worldTypes.ts
- `WorldCanvasProps` --references--> `WeatherToggleOption`  [EXTRACTED]
  src/components/WorldCanvas.tsx → src/world/domain/worldTypes.ts
- `WorldCanvas()` --calls--> `findLookedAtWatchtowerLadder()`  [EXTRACTED]
  src/components/WorldCanvas.tsx → src/world/domain/landmarks/interactionLandmarks.ts

## Import Cycles
- None detected.

## Communities (35 total, 10 thin omitted)

### Community 0 - "proceduralModels.ts"
Cohesion: 0.06
Nodes (80): ref_domain_worldtypes, three, buildDwarvenKingdomAndMiners(), buildPlayerAndCombatSystems(), attachFlagHorizontalWaveShader(), attachWindSwayShader(), createBirchBarkTexture(), perturbGeometryVertices() (+72 more)

### Community 1 - "GameShellOverlay.tsx"
Cohesion: 0.09
Nodes (32): react, ref_react_dom_client, App(), WEATHER_CYCLE_ORDER, ExplorerMinimap(), ExplorerMinimapProps, GRID_SIZE, DEFAULT_OWNED_IDS (+24 more)

### Community 2 - "combatAndInventorySystem.ts"
Cohesion: 0.14
Nodes (30): WorldCanvas(), afterDraw(), applyDynamicAtmosphere(), emitHudSnapshot(), executeSwordSlash(), fireArrowNow(), getEffectiveForcedWeather(), handleSwordStrikeImpactFeedback() (+22 more)

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.09
Nodes (33): AttackTrajectoryKeyframes, bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose() (+25 more)

### Community 4 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.16
Nodes (15): DwarvenKingdomBuilderContext, DwarvenKingdomHandle, DwarvenMinerRig, VIEW_DISTANCE, DWARVEN_STONE_HOUSES, SOUTHERN_MINE_POS, DwarvenMinerCaravanState, computeDwarvenMinerCaravanState() (+7 more)

### Community 5 - "terrainMath.test.ts"
Cohesion: 0.06
Nodes (33): ref_node_assert_strict, ref_node_test, src_world_terrainmath_birch_grove_center, src_world_terrainmath_birchgrovefactorat, src_world_terrainmath_chinese_fortress_pos, src_world_terrainmath_chinesefortressstairheightat, src_world_terrainmath_corner_watchtowers, src_world_terrainmath_findlookedatwatchtowerladder (+25 more)

### Community 6 - "atmosphereAndWeatherSystem.ts"
Cohesion: 0.21
Nodes (18): lerpColorHex(), lerpNum(), smoothstep(), DynamicAtmosphereState, SeasonType, computeDynamicSolarCycle(), computeWeatherState(), DEFAULT_WEATHER_CYCLE_MODE (+10 more)

### Community 7 - "WorldCanvas.tsx"
Cohesion: 0.09
Nodes (22): ref_three_addons_environments_roomenvironment_js, _camTargetLook, _euler, _sunVec, _tourLook, _tourPos, WorldCanvasProps, WeatherToggleOption (+14 more)

### Community 8 - "InvalidResultAccessException"
Cohesion: 0.20
Nodes (4): AppException, InfrastructureCorruptedException, InvalidResultAccessException, Result

### Community 9 - "package.json"
Cohesion: 0.10
Nodes (20): name, private, type, version, autoprefixer, dotenv, esbuild, express (+12 more)

### Community 10 - "windowDebugController.ts"
Cohesion: 0.12
Nodes (15): src_world_terrainmath_assignhotbarslot, src_world_terrainmath_buymarketitem, src_world_terrainmath_classifyswordattackphase, src_world_terrainmath_equipinventoryitem, src_world_terrainmath_equippedtoolslot, src_world_terrainmath_findnearestfortressdoor, src_world_terrainmath_findnearestmarketstall, src_world_terrainmath_findnearestrideablehorse (+7 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+9 more)

### Community 13 - "terrainAndBiomeSystem.ts"
Cohesion: 0.14
Nodes (29): CLEAR_ZONES, FLAT_BUILDING_TERRACES, SOLID_BUILDING_BOXES, BIRCH_GROVE_CENTER, MAGIC_STONE_CIRCLE_POS, PLAYABLE_RADIUS, PLAYER_EYE_HEIGHT, SMALL_MEADOW_HILLS (+21 more)

### Community 14 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, dotenv, express, @google/genai, lucide-react, motion, react, react-dom (+5 more)

### Community 15 - "playerAndCombatBuilder.ts"
Cohesion: 0.15
Nodes (12): PlayerAndCombatBuilderContext, ARROW_TRAIL_MAX_AGE, LOCKED_SWORD_GRIP_TRANSFORM, src_world_terrainmath_archery_targets, src_world_terrainmath_arrow_trail_max_age, src_world_terrainmath_arrowelementkind, src_world_terrainmath_arrowprojectile, src_world_terrainmath_computefirstpersonswordattackpose (+4 more)

### Community 16 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, autoprefixer, esbuild, tailwindcss, tsx, @types/express, @types/node, @types/react (+2 more)

### Community 17 - "atmosphereRenderController.ts"
Cohesion: 0.20
Nodes (9): ref_three_addons_objects_sky_js, AtmosphereRenderContext, _denseFogColor, _lightningColor, _sandFogColor, _stormFogColor, src_world_terrainmath_computedynamicsolarcycle, src_world_terrainmath_solaratmosphere (+1 more)

### Community 18 - "playerPhysicsSystem.ts"
Cohesion: 0.28
Nodes (16): WORLD_SPAWN, ropeBridgePointInfoAt(), findLookedAtWatchtowerLadder(), findWatchtowerLadderAt(), getLadderById(), isInsideSouthernMine(), createInitialRideableHorses(), stepPlayerPhysics() (+8 more)

### Community 19 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, clean, dev, lint, preview

### Community 20 - "worldTypes.ts"
Cohesion: 0.11
Nodes (22): SkyrimInventoryModalProps, TelemetrySnapshot, ArrowElementKind, ArrowTrailPoint, BiomeType, CameraPerspectiveMode, CharacterSkillsState, ClimbableLadderInfo (+14 more)

### Community 21 - "vite.config.ts"
Cohesion: 0.40
Nodes (4): ref_path, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 22 - "Run and deploy your AI Studio app"
Cohesion: 0.50
Nodes (3): Engineering standards, Run and deploy your AI Studio app, Run Locally

### Community 26 - "horsePhysicsSystem.ts"
Cohesion: 0.31
Nodes (8): computeHorseBiomechanicalPose(), computeHorseTurnResistance(), HorseBiomechanicalPose, HorseLimbAngles, HorseSteeringStepResult, solveForelimb(), solveHindlimb(), stepMountedHorseSteering()

### Community 27 - "interactionLandmarks.ts"
Cohesion: 0.23
Nodes (10): ARCHERY_TARGETS, CHINESE_FORTRESS_POS, CORNER_WATCHTOWERS, FORTRESS_Z_OFFSET, HILL_WATCHTOWERS, FORTRESS_DOORS, isOnWatchtowerLadder(), src_world_domain_landmarksregistry_chinesefortressstairheightat (+2 more)

### Community 28 - "PlayerState"
Cohesion: 0.33
Nodes (9): PlayerAndCombatHandle, WindowDebugBridgeDeps, ArrowProjectile, ObstacleCylinder, PlayerState, RideableHorseState, WeatherCycleMode, WeatherStateSnapshot (+1 more)

## Knowledge Gaps
- **131 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+126 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 214 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `proceduralModels.ts` to `dwarvenMineAndCaravanSystem.ts`, `WorldCanvas.tsx`, `package.json`, `windowDebugController.ts`, `playerAndCombatBuilder.ts`, `atmosphereRenderController.ts`, `interactionLandmarks.ts`?**
  _High betweenness centrality (0.149) - this node is a cross-community bridge._
- **Why does `NatureSoundEngine` connect `NatureSoundEngine` to `combatAndInventorySystem.ts`, `WorldCanvas.tsx`, `windowDebugController.ts`, `worldTypes.ts`, `PlayerState`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `WorldCanvas()` (e.g. with `emitHudSnapshot()` and `executeSwordSlash()`) actually correct?**
  _`WorldCanvas()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _131 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `proceduralModels.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05958499904816295 - nodes in this community are weakly interconnected._
- **Should `GameShellOverlay.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08708708708708708 - nodes in this community are weakly interconnected._