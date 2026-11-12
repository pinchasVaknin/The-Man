# Graph Report - TheMan  (2026-11-12)

## Corpus Check
- 232 files · ~1,353,581 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: .glb 8, (none) 3, .example 1)

## Summary
- 2070 nodes · 5216 edges · 115 communities (84 shown, 31 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 178 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c03ec04b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- boidsAndWildlifeSystem.ts
- savedGameSettings.ts
- InfrastructureCorruptedException
- swordAttackAnimationSystem.ts
- worldBehavior.characterization.spec.ts
- groundHeightAt
- 10. באגי משחק שאומתו בסימולציה
- windowDebugController.ts
- walkableHeightAt
- package.json
- Deer_Complete.ts
- compilerOptions
- GameLoop
- hudTelemetryBuilder.ts
- TheMan — Architecture
- worldTypes.ts
- dwarvenMineAndCaravanSystem.ts
- devDependencies
- worldClockSystem.ts
- terrainMath.test.ts
- src_world_terrainmath_cameraperspectivemode
- GameShellOverlay.tsx
- NatureSoundEngine
- rules/graphify.md
- workflows/graphify.md
- CLAUDE.md
- labCatalog.ts
- collisionWorld.ts
- terrainMath.ts
- src_world_terrainmath_computedwarvenminercaravanstate
- boidsAndWildlifeSystem.spec.ts
- src_world_terrainmath_dwarven_guardian_statues
- src_world_terrainmath_dwarven_miners_count
- src_world_terrainmath_dwarven_stone_houses
- WorldCanvas
- src_world_terrainmath_arrowprojectile
- itemArtworkRegistry.tsx
- src_world_terrainmath_characterskillsstate
- Result
- src_world_terrainmath_inventoryitemdef
- src_world_terrainmath_obstaclecylinder
- ref_domain_worldtypes
- terrainAndBiomeSystem.ts
- src_world_terrainmath_solaratmosphere
- src_world_terrainmath_playerstate
- src_world_terrainmath_rideablehorsestate
- src_world_terrainmath_weatherstatesnapshot
- animalModelAssets.ts
- labModelFactory.ts
- combatAndInventorySystem.ts
- src_world_terrainmath_walkpacemode
- Rhino_Complete.ts
- WorldCanvas.tsx
- getLoadedAnimalModel
- src_world_terrainmath_dynamicatmospherestate
- InventoryItemId
- scripts
- 5. ביצועים
- persistenceValidation.ts
- Bear_Complete.ts
- requireClipRig
- src_world_terrainmath_getanimalspeciesnamehe
- stepArrowsPhysics
- landmarksRegistry.ts
- ref_node_test
- undergroundCulling.ts
- collisionAndTerraces.ts
- deferredAnimalModel.spec.ts
- three
- Wolf_Complete.ts
- IEquipmentSlotStrategy
- awardSkillXp
- persistencePlugin.ts
- 12. מצב הבדיקות
- 3D model files (`public/models`)
- src_world_terrainmath_archery_targets
- atmosphereRenderController.ts
- src_locales_index_he
- registerWindowDebugBridge
- BearAnimator
- syncEquippedItemsAfterRemoval
- playerPhysicsSystem.ts
- PerfStats
- buildFarmhouseModels
- ILogger
- CrocodileAnimator
- createAnimalTexture
- worldSaveManager.ts
- getChestContents
- TheMan — דו"ח ביקורת מלא (היטבוקסים, ביצועים, מבנה, נראות)
- DemonDragonAnimator
- proceduralModels.ts
- atmosphereAndWeatherSystem.ts
- damageGroundAnimal
- monkAndHippoFixes.test.ts
- ForestDragonAnimator
- 11ב. מערכות נוספות שנבדקו בסבב השלישי
- 11ד. סבב שישי: גמדים, שגרת יום, מזג אוויר, קול, דרקון חי ומובייל
- worldSceneBuilder.ts
- main.tsx
- JaguarAnimator
- WolfAnimator
- locales/index.ts
- TheMan — 3D Living Nature & RPG World Simulator
- settlementModels.ts
- dependencies
- combatAndInventorySystem.spec.ts
- RhinoAnimator
- movementIntent.spec.ts
- keyBindingMatch.ts
- 11. שחקן, מצלמה ושמירה
- t
- IRideableHorseState
- 13. מבנה מערכות המשחק — מה לא יושב במערכת מסודרת
- 2. נתונים שנמדדו

## God Nodes (most connected - your core abstractions)
1. `walkableHeightAt()` - 56 edges
2. `WorldCanvas` - 54 edges
3. `t()` - 52 edges
4. `groundHeightAt()` - 50 edges
5. `three` - 44 edges
6. `stepSmallAnimals()` - 36 edges
7. `ILogger` - 35 edges
8. `DeerAnimator` - 33 edges
9. `NatureSoundEngine` - 30 edges
10. `stepPlayerPhysics()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `H1 — כל צרכן מפרש את אותה תיבה אחרת [נקרא בקוד]` --references--> `resolveAnimalObstacleCollision()`  [INFERRED]
  PROJECT_AUDIT.md → src/world/systems/boidsAndWildlifeSystem.ts
- `H3 — שכבת הדיבאג (F3) לא משקפת את הפיזיקה [נקרא בקוד]` --references--> `walkableHeightAt()`  [INFERRED]
  PROJECT_AUDIT.md → src/world/systems/terrainAndBiomeSystem.ts
- `H4 — אי אפשר לעמוד על תיבה [נקרא בקוד]` --references--> `walkableHeightAt()`  [INFERRED]
  PROJECT_AUDIT.md → src/world/systems/terrainAndBiomeSystem.ts
- `P5 — רזולוציה ואיכות קבועות [נקרא בקוד]` --references--> `GameSettingsModal()`  [INFERRED]
  PROJECT_AUDIT.md → src/components/GameSettingsModal.tsx
- `P7 — עבודת רינדור בתוך צעד הסימולציה [נקרא בקוד]` --references--> `computeDynamicSolarCycle()`  [INFERRED]
  PROJECT_AUDIT.md → src/world/systems/atmosphereAndWeatherSystem.ts

## Import Cycles
- None detected.

## Communities (115 total, 31 thin omitted)

### Community 0 - "boidsAndWildlifeSystem.ts"
Cohesion: 0.07
Nodes (46): 6.1 Wildlife species (`world/systems/wildlifeSpeciesProfiles.ts`), 6.2 Other dispatch tables, 6. Strategy tables instead of switches, CB4 — חצים וחרב סורקים את כל 4,290 המכשולים [נקרא בקוד], G10 — טורפים "תוקפים את הרצפה" מתחת לשחקן מעופף [נמדד] — חומרה גבוהה, G1 — דובים לא מצליחים להיכנס למערה שלהם [נמדד] — חומרה גבוהה, src_world_domain_landmarksregistry_getnearbysolidbuildingboxes, src_world_systems_animaltrapssystem (+38 more)

### Community 1 - "savedGameSettings.ts"
Cohesion: 0.25
Nodes (12): GameSettingsModal(), IGameSettingsModalProps, IKeybindRowMeta, KEYBIND_CATEGORIES, KEYBIND_ROWS, KeybindCategory, DEFAULT_GAME_KEYBINDINGS, FirefliesMode (+4 more)

### Community 2 - "InfrastructureCorruptedException"
Cohesion: 0.19
Nodes (7): 9. Errors and logging, AppException, InfrastructureCorruptedException, InvalidResultAccessException, createTickErrorGuard(), TickErrorDecision, fetchAnimalModelFromServer()

### Community 3 - "swordAttackAnimationSystem.ts"
Cohesion: 0.09
Nodes (33): bezier3(), clamp(), classifySwordAttackPhase(), COMBO_0_KEYFRAMES, COMBO_1_KEYFRAMES, COMBO_2_HEAVY_KEYFRAMES, computeFirstPersonSwordAttackPose(), COS_TILT (+25 more)

### Community 4 - "worldBehavior.characterization.spec.ts"
Cohesion: 0.16
Nodes (15): ref_node_fs, ref_node_os, ref_node_path, ref_node_url, assertMatchesGolden(), normalizeForGolden(), createInput(), createInitialBoidBirds() (+7 more)

### Community 5 - "groundHeightAt"
Cohesion: 0.23
Nodes (28): 2.2 עלות פונקציות (node, מיקרו־שניות לקריאה), distToSegment(), fbm2D(), smoothstep(), buildTerrainAndWaterModel(), stepPlayerPhysics(), birchGroveFactorAt(), easternCoastlineXAt() (+20 more)

### Community 6 - "10. באגי משחק שאומתו בסימולציה"
Cohesion: 0.17
Nodes (12): 10. באגי משחק שאומתו בסימולציה, G11 — חיות מכות בקצב כפול מהמתוכנן [נמדד], G12 — אפשר להכניע את הבוס בהר הגעש בלי סיכון [נמדד] — חומרה בינונית, G2 — בלילה הדובים ישנים איפה שהם עומדים [נמדד] — לוודא כוונה, G3 — טורף מתעלם מהשחקן כשיש ביניהם הפרש גובה של יותר מ-3.4 מ' [נמדד] — חומרה גבוהה, G5 — אין עקיפת מכשולים: טורף רץ במקום מול קיר [נמדד] — חומרה גבוהה, G6 — חיות עוברות דרך השחקן [נמדד] — חומרה בינונית, G7 — לחיות אין מגבלת מדרגה ושיפוע [נקרא בקוד + נמדד חלקית] — חומרה בינונית (+4 more)

### Community 7 - "windowDebugController.ts"
Cohesion: 0.07
Nodes (34): IPlayerAndCombatBuilderContext, IPlayerAndCombatHandle, IWindowDebugBridgeDeps, IArrowProjectile, IDynamicAtmosphereState, ARROW_TRAIL_MAX_AGE, triggerSwordSlash(), LOCKED_SWORD_GRIP_TRANSFORM (+26 more)

### Community 8 - "walkableHeightAt"
Cohesion: 0.09
Nodes (28): 6. מבנה הקוד, A1 — קובצי ענק ופונקציות ענק, A3 — פיצ'ר אחד מפוזר על חמישה קבצים (זה הגורם לסחף ההיטבוקסים), A4 — מספרי קסם וקואורדינטות משוכפלות, A5 — התנהגות לפי מחרוזות, A6 — מחרוזות UI בתוך הקוד, בניגוד לתקן הפרויקט, A7 — תקשורת בין React למשחק דרך `window` ו-DOM, A8 — פערים בבדיקות ובכלים (+20 more)

### Community 9 - "package.json"
Cohesion: 0.12
Nodes (17): directFilePersistencePlugin(), name, private, type, version, ref_path, react-dom, tailwindcss (+9 more)

### Community 10 - "Deer_Complete.ts"
Cohesion: 0.05
Nodes (39): requireProceduralGeometry(), BoneDef, BoneGroup, BoneName, Chain, CHAINS, computeDeerSkinWeights(), createReadyDeer() (+31 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "GameLoop"
Cohesion: 0.12
Nodes (9): GameLoop, IFixedStepOptions, IFrameScheduler, IGameLoopOptions, createFixedHarness(), createHarness(), FakeScheduler, RecordingLogger (+1 more)

### Community 13 - "hudTelemetryBuilder.ts"
Cohesion: 0.18
Nodes (14): SYS5 — רכיבה: הכול "סוס", ומזוהה לפי מחרוזת [נקרא בקוד], buildTelemetrySnapshot(), IHudTelemetryInput, findNearestBed(), findNearestFortressDoor(), IWeatherStateSnapshot, IEnvironmentAtmosphereHandle, findNearestDeadLootableAnimal() (+6 more)

### Community 14 - "TheMan — Architecture"
Cohesion: 0.10
Nodes (15): 10. Build output, 11. Testing, 1. Stack, 3. Startup, 5.1 GameLoop (`src/core/gameLoop.ts`), 5.2 Fixed timestep with interpolation, 5.3 What runs where (`components/WorldCanvas.tsx`), 5.4 React and the frame (+7 more)

### Community 15 - "worldTypes.ts"
Cohesion: 0.18
Nodes (21): 2. Source layout and layers, IGameShellOverlayProps, IWeatherOptionDef, IValidatedUrlOverrides, GameStateMode, ITelemetrySnapshot, IVirtualMoveState, ArrowElementKind (+13 more)

### Community 16 - "dwarvenMineAndCaravanSystem.ts"
Cohesion: 0.08
Nodes (28): A9 — קוד מת וניקיון, IDwarvenKingdomBuilderContext, IDwarvenKingdomHandle, IDwarvenMinerRig, VIEW_DISTANCE, DWARVEN_GUARDIAN_STATUES, DWARVEN_STONE_HOUSES, DWARVEN_MINECART_ROUTES (+20 more)

### Community 17 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, tailwindcss, @tailwindcss/vite, tsx, @types/node, @types/react, @types/react-dom, @types/three (+3 more)

### Community 18 - "worldClockSystem.ts"
Cohesion: 0.36
Nodes (7): advanceSleepClock(), advanceWorldClock(), isSleepingAllowedAt(), PLAY_CLOCK_HOURS_PER_SECOND, SLEEP_CLOCK_HOURS_PER_SECOND, TITLE_CLOCK_HOURS_PER_SECOND, WAKE_UP_HOUR

### Community 19 - "terrainMath.test.ts"
Cohesion: 0.08
Nodes (23): validateWorldEntityColliders(), propagateHerdAlert(), src_world_terrainmath_birch_grove_center, src_world_terrainmath_computeweatherstate, src_world_terrainmath_corner_watchtowers, src_world_terrainmath_default_weather_cycle_mode, src_world_terrainmath_fortress_y_offset, src_world_terrainmath_fortress_z_offset (+15 more)

### Community 21 - "GameShellOverlay.tsx"
Cohesion: 0.11
Nodes (28): SEASON_OPTIONS, SkyrimModalMode, WEATHER_OPTIONS, renderArtifactArtwork(), formatMarketError(), InventoryCategoryTab, ISkyrimInventoryModalProps, ITEM_SHORT_NAMES (+20 more)

### Community 26 - "labCatalog.ts"
Cohesion: 0.05
Nodes (78): ref_three_examples_jsm_environments_roomenvironment_js, ANIMATION_SPEED_RANGE, CAMERA_PERSPECTIVES, FIREFLIES_MODES, GameSettingsValidationError, isNumberInRange(), isOneOf(), isPlainObject() (+70 more)

### Community 27 - "collisionWorld.ts"
Cohesion: 0.07
Nodes (38): 4. היטבוקסים, 8. תוכנית עבודה מסודרת, H10 — השחקן סורק את כל 962 התיבות פעמיים בכל צעד, ומתנהג לפי מחרוזות [נקרא בקוד], H11 — הערות קטנות [נקרא בקוד], H1 — כל צרכן מפרש את אותה תיבה אחרת [נקרא בקוד], H2 — 66 תיבות בלי `minY` [נמדד], H3 — שכבת הדיבאג (F3) לא משקפת את הפיזיקה [נקרא בקוד], H4 — אי אפשר לעמוד על תיבה [נקרא בקוד] (+30 more)

### Community 28 - "terrainMath.ts"
Cohesion: 0.20
Nodes (9): 3. מה כתוב טוב (לשמר), react, WEATHER_CYCLE_ORDER, INITIAL_TELEMETRY_SNAPSHOT, ITelemetryStore, telemetryStore, TelemetrySnapshot, src_world_terrainmath_igameactions (+1 more)

### Community 30 - "boidsAndWildlifeSystem.spec.ts"
Cohesion: 0.06
Nodes (43): CharacterLabView, MODELS_DIRECTORY, preloadAnimalModelsForTests(), readModelFromDisk(), src_world_domain_landmarksregistry_findnearestbed, src_world_domain_landmarksregistry_floating_island_stair_pos, src_world_domain_landmarksregistry_floating_waterfall_step_islands, src_world_domain_landmarksregistry_floatingbloomingislandheightat (+35 more)

### Community 34 - "WorldCanvas"
Cohesion: 0.14
Nodes (21): WorldCanvas, lerp(), lerpAngle(), PLAYER_EYE_HEIGHT, IPlayerState, computeTargetFov(), createCameraPose(), createCameraRigState() (+13 more)

### Community 36 - "itemArtworkRegistry.tsx"
Cohesion: 0.14
Nodes (4): ARTWORK_STRATEGIES, ArtworkRenderStrategy, ICON_STRATEGIES, IconRenderStrategy

### Community 38 - "Result"
Cohesion: 0.25
Nodes (5): GameShellOverlay, renderItemSvgIcon(), Result, useTelemetry(), IGameActions

### Community 42 - "terrainAndBiomeSystem.ts"
Cohesion: 0.03
Nodes (70): FULL_MAP_GRID_SIZE, GRID_SIZE, IExplorerMinimapProps, IWorldMapLandmarkPin, UNDERGROUND_MINE_LANDMARKS, WORLD_MAP_LANDMARKS, src_world_domain_landmarksregistry_bear_mountain_caves, src_world_domain_landmarksregistry_birch_grove_center (+62 more)

### Community 47 - "animalModelAssets.ts"
Cohesion: 0.11
Nodes (22): ref_node_fs_promises, ref_three_addons_loaders_gltfloader_js, ANIMAL_MODEL_IDS, AnimalModelFetcher, decodeClipRig(), decodeProceduralGeometry(), decodeSkinWeights(), dequantize() (+14 more)

### Community 48 - "labModelFactory.ts"
Cohesion: 0.12
Nodes (12): buildLabEntityRig(), computeGroupStats(), CLIP_ORDER, createReadyJaguar(), Jaguar, JAGUAR_GAITS, JAGUAR_STATES, JaguarOptions (+4 more)

### Community 49 - "combatAndInventorySystem.ts"
Cohesion: 0.05
Nodes (34): src_world_builders_dwarvenkingdombuilder_getactivedwarvenminers, src_world_domain_landmarksregistry_archery_targets, src_world_domain_landmarksregistry_findnearestmarketstall, src_world_domain_landmarksregistry_getmarketstallcatalogitems, src_world_domain_landmarksregistry_getobstaclecollidermetrics, src_world_domain_landmarksregistry_getsolidbuildingworldaabb, src_world_domain_landmarksregistry_market_stall_locations, src_world_domain_landmarksregistry_player_eye_height (+26 more)

### Community 51 - "Rhino_Complete.ts"
Cohesion: 0.12
Nodes (9): IClipRigModelData, CLIP_ORDER, Rhino, RHINO_GAITS, RHINO_STATES, RhinoOptions, RhinoRig, RhinoState (+1 more)

### Community 52 - "WorldCanvas.tsx"
Cohesion: 0.03
Nodes (63): _camTargetLook, _euler, IWorldCanvasProps, _sunVec, src_world_builders_dwarvenkingdombuilder_getorinitdwarfcorpseloot, createAnimationFrameScheduler(), createGpuFencePacedScheduler(), src_world_models_placedtrapmodels (+55 more)

### Community 53 - "getLoadedAnimalModel"
Cohesion: 0.14
Nodes (10): getLoadedAnimalModel(), CLIP_ORDER, createReadyDemonDragon(), DEMON_DRAGON_GAITS, DemonDragon, DemonDragonOptions, DemonDragonRig, DemonDragonState (+2 more)

### Community 55 - "InventoryItemId"
Cohesion: 0.20
Nodes (10): 12. Adding things, InventoryItemId, AnimalModelId, GroundAnimalSpecies, BASE_PROFILE, DEFAULT_SENSES_ASLEEP, DEFAULT_SENSES_AWAKE, ISpeciesProfile (+2 more)

### Community 56 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, preview, test

### Community 57 - "5. ביצועים"
Cohesion: 0.20
Nodes (10): 5. ביצועים, P10 — בינה של חיות: סביר היום, לא יגדל טוב [נקרא בקוד], P2 — המכרה הוא יחידת culling אחת, וה-culling מתעלם מגובה [נקרא בקוד], P3 — עשרות אורות נקודתיים פעילים בו־זמנית [נקרא בקוד], P4 — מעבר הצללים רץ גם מתחת לאדמה [נקרא בקוד], P5 — רזולוציה ואיכות קבועות [נקרא בקוד], P6 — שמירה אוטומטית סינכרונית כל 2.5 שניות [נקרא בקוד], P7 — עבודת רינדור בתוך צעד הסימולציה [נקרא בקוד] (+2 more)

### Community 58 - "persistenceValidation.ts"
Cohesion: 0.14
Nodes (21): ANIMATION_SPEED_RANGE, CAMERA_PERSPECTIVES, checkGameSettingsPayload(), checkLabOverridesPayload(), FIREFLIES_MODES, IPersistedGameSettings, isNumberInRange(), isOneOf() (+13 more)

### Community 59 - "Bear_Complete.ts"
Cohesion: 0.14
Nodes (9): Bear, BEAR_GAITS, BEAR_STATES, BearOptions, BearRig, BearState, BearUnpackedData, CLIP_ORDER (+1 more)

### Community 60 - "requireClipRig"
Cohesion: 0.15
Nodes (9): requireClipRig(), createReadyCrocodile(), Crocodile, CROCODILE_GAITS, CROCODILE_STATES, CrocodileOptions, CrocodileRig, CrocodileState (+1 more)

### Community 62 - "stepArrowsPhysics"
Cohesion: 0.40
Nodes (6): SYS2 — זיהוי פגיעות: מימוש נפרד לכל סוג מטרה [נקרא בקוד], getActiveWorldBirds(), evaluateSwordStrikeWindowHit(), getNearbyArcheryTargets(), stepArrowsPhysics(), stepSwordSwingCombat()

### Community 63 - "landmarksRegistry.ts"
Cohesion: 0.05
Nodes (67): COLLIDABLE_WORLD_ENTITY_REGISTRY, getHillWatchtowerLocalWalls(), BIRCH_GROVE_CENTER, CROCODILE_RIVER_BEND_POS, src_world_domain_landmarks_corelandmarks_desert_dragon_pass_pos, src_world_domain_landmarks_corelandmarks_desertpyramidheightat, src_world_domain_landmarks_corelandmarks_floating_waterfall_step_islands, src_world_domain_landmarks_corelandmarks_floatingbloomingislandheightat (+59 more)

### Community 64 - "ref_node_test"
Cohesion: 0.15
Nodes (9): ref_node_assert_strict, ref_node_test, ref_react_dom_server, createAppServices(), IAppServices, globalWithWindow, ConsoleLogger, NullLogger (+1 more)

### Community 65 - "undergroundCulling.ts"
Cohesion: 0.47
Nodes (5): שלב 3 — ביצועים: P2 — הסתרת הסביבה החיצונית כשהשחקן במכרה (בוצע), isPlayerUnderground(), markOutdoorRoots(), OUTDOOR_LAYER, setCameraUndergroundMask()

### Community 66 - "collisionAndTerraces.ts"
Cohesion: 0.06
Nodes (59): סבב איחוד המכרה הגדול (לא הושלם; טרם commit), CLEAR_ZONES, FLAT_BUILDING_TERRACES, ILocalWallBox, SOLID_BUILDING_BOXES, src_world_domain_landmarks_corelandmarks_desert_pyramid_sanctuary_pos, src_world_domain_landmarks_corelandmarks_floating_blooming_islands, src_world_domain_landmarks_corelandmarks_floating_island_stair_pos (+51 more)

### Community 67 - "deferredAnimalModel.spec.ts"
Cohesion: 0.19
Nodes (3): IAnimatedAnimalModel, FakeModel, RecordingLogger

### Community 68 - "three"
Cohesion: 0.10
Nodes (33): three, attachFlagHorizontalWaveShader(), attachWindSwayShader(), createBirchBarkTexture(), perturbGeometryVertices(), WATER_LEVEL, hash2D(), IObstacleCylinder (+25 more)

### Community 69 - "Wolf_Complete.ts"
Cohesion: 0.14
Nodes (9): CLIP_ORDER, createReadyWolf(), Wolf, WOLF_GAITS, WOLF_STATES, WolfOptions, WolfRig, WolfState (+1 more)

### Community 70 - "IEquipmentSlotStrategy"
Cohesion: 0.12
Nodes (5): ArrowEquipmentStrategy, BowEquipmentStrategy, IEquipmentSlotStrategy, SwordEquipmentStrategy, ToolEquipmentStrategy

### Community 71 - "awardSkillXp"
Cohesion: 0.20
Nodes (5): ClothingEquipmentStrategy, spawnArrowProjectile(), UsableGearStrategy, applySkillXpGain(), awardSkillXp()

### Community 72 - "persistencePlugin.ts"
Cohesion: 0.25
Nodes (9): assertTrustedJsonRequest(), PERSISTENCE_ROUTES, PersistenceErrorCode, PersistenceRequestError, readJsonBody(), saveGameSettings(), saveLabOverrides(), STATUS_BY_ERROR (+1 more)

### Community 73 - "12. מצב הבדיקות"
Cohesion: 0.50
Nodes (4): 12. מצב הבדיקות, T1 — חבילת הבדיקות נכשלת על הקוד הקיים [נמדד], T1א — אבחון שלב 0א (הרצה חוזרת, Node 24, עץ נקי), T2 — בדיקות שחסרות

### Community 76 - "atmosphereRenderController.ts"
Cohesion: 0.13
Nodes (17): שלב 3 — ביצועים וציור: P3 (אורות נקודתיים במכרה) — בוצע, לא נמדד בפריים, applyDynamicAtmosphereToScene(), _denseFogColor, IAtmosphereRenderContext, isMineLantern(), isVisibleInHierarchy(), _lightningColor, MINE_LIGHT_POOL_SIZE (+9 more)

### Community 78 - "registerWindowDebugBridge"
Cohesion: 0.33
Nodes (11): clamp(), IValidatedPositionOverride, MAX_WORLD_HOUR, MIN_WORLD_HOUR, parseAndValidateUrlOverrides(), PLAYABLE_RADIUS, URL_SEASON_OFFSETS, URL_WEATHER_MAP (+3 more)

### Community 80 - "syncEquippedItemsAfterRemoval"
Cohesion: 0.22
Nodes (7): consumeArrowFromInventory(), equipInventoryItem(), FoodConsumptionStrategy, getArrowItemIdForKind(), isInventoryItemEquipped(), storeItemInWorldChest(), syncEquippedItemsAfterRemoval()

### Community 81 - "playerPhysicsSystem.ts"
Cohesion: 0.07
Nodes (24): src_world_domain_landmarksregistry_findlookedatwatchtowerladder, src_world_domain_landmarksregistry_findwatchtowerladderat, src_world_domain_landmarksregistry_fortress_doors, src_world_domain_landmarksregistry_gethillwatchtowerlocalwalls, src_world_domain_landmarksregistry_getladderbyid, src_world_domain_landmarksregistry_hill_watchtowers, src_world_domain_landmarksregistry_playable_radius, src_world_domain_landmarksregistry_pointinsidesolidbuildingbox (+16 more)

### Community 82 - "PerfStats"
Cohesion: 0.25
Nodes (5): formatPerfStats(), IPerfSectionSummary, IPerfSnapshot, percentile(), PerfStats

### Community 83 - "buildFarmhouseModels"
Cohesion: 0.20
Nodes (12): P1 — יותר מדי קריאות ציור; אין מיזוג גיאומטריה מחוץ לצמחייה [נמדד + נקרא בקוד], chamberAndTunnelWallBoxes(), khazadBridgeSegment(), mineFloorY(), mineNwGalleryStepRise(), mineNwGalleryStepX(), buildFarmhouseModels(), createLanternAssembly() (+4 more)

### Community 84 - "ILogger"
Cohesion: 0.12
Nodes (5): IErrorBoundaryProps, IErrorBoundaryState, MockErrorLogger, ILogger, MockLogger

### Community 86 - "createAnimalTexture"
Cohesion: 0.14
Nodes (10): createAnimalTexture(), CLIP_ORDER, createReadyForestDragon(), FOREST_DRAGON_GAITS, ForestDragon, ForestDragonOptions, ForestDragonRig, ForestDragonState (+2 more)

### Community 87 - "worldSaveManager.ts"
Cohesion: 0.09
Nodes (31): S1 — אין אימות של שמירה בטעינה [נקרא בקוד], src_world_domain_landmarksregistry_rideable_horses, src_world_domain_landmarksregistry_survival_cabin_spawn, DEFAULT_STARTER_OWNED_ITEM_IDS, resetActiveWorldBirds(), src_world_systems_monktemplesystem_resetactivetemplemonksstate, applyGameModeToPlayerState(), src_world_systems_sailableshipsystem (+23 more)

### Community 88 - "getChestContents"
Cohesion: 0.25
Nodes (8): checkAndRestockMerchants(), getChestContents(), isStackableInventoryItem(), lootWorldChest(), restockAllMerchants(), storeAllUnequippedInWorldChest(), takeAllFromWorldChest(), takeItemFromWorldChest()

### Community 89 - "TheMan — דו"ח ביקורת מלא (היטבוקסים, ביצועים, מבנה, נראות)"
Cohesion: 0.18
Nodes (10): 0. הוראות למי שמבצע את התיקונים, 1. השורה התחתונה, 7. נראות, 9. מה לא נבדק, H5 — השלמה (גלילים), H5 — תנועה לפי צירים (סבב ראשון), TheMan — דו"ח ביקורת מלא (היטבוקסים, ביצועים, מבנה, נראות), נספח — קבצים שנוספו במהלך הביקורת (+2 more)

### Community 91 - "proceduralModels.ts"
Cohesion: 0.07
Nodes (41): buildColliderDebugWireframes(), IColliderDebugHandles, IWildlifeSoundCallbacks, isWithinViewDistance(), SOUTHERN_DRAGON_RUINS_POS, SOUTHEAST_HARBOR_POS, SAKURA_SANCTUARY_YAW, createArchitecturalSharedAssets() (+33 more)

### Community 93 - "atmosphereAndWeatherSystem.ts"
Cohesion: 0.38
Nodes (11): createTestBridgeDeps(), lerpColorHex(), lerpNum(), computeDynamicSolarCycle(), computeWeatherState(), DEFAULT_WEATHER_CYCLE_MODE, getSeasonLabel(), getWeatherLabel() (+3 more)

### Community 95 - "damageGroundAnimal"
Cohesion: 0.13
Nodes (19): 11ג. סבב חמישי: נזירים, גמדים, דרקון, מלכודות, חלונות ומגע, DR1 — הדרקון: נשיפת האש לא פוגעת בשחקן, והנזק שלו לא קשור למה שהוא עושה [נקרא בקוד] — חומרה גבוהה, DR2 — הדרקון אחרי שיורים בו, לפי כללי מצב ההישרדות [נמדד בסימולציה] — חומרה גבוהה, G4 — טורף מכה דרך קיר [נמדד] — חומרה גבוהה, LAB1 — קוד ה-lab [נקרא בקוד, שטחי], N1 — לוגיקת משחק של דמויות רצה בתוך הרינדור [נקרא בקוד] — חומרה גבוהה, N2 — נזירים עוברים דרך קירות המבצר, ותוקפים מתחת לשחקן מרחף [נמדד] — חומרה גבוהה, N3 — הגמדים: העתק של קוד הנזירים, עם אותן בעיות [נקרא בקוד] (+11 more)

### Community 96 - "monkAndHippoFixes.test.ts"
Cohesion: 0.10
Nodes (19): src_world_builders_dwarvenkingdombuilder_checkarrowhitdwarf, src_world_builders_dwarvenkingdombuilder_checkswordhitdwarf, src_world_builders_dwarvenkingdombuilder_findactivecombatdwarf, src_world_builders_dwarvenkingdombuilder_findnearestdeadlootabledwarf, src_world_builders_dwarvenkingdombuilder_findtargetedlivedwarf, src_world_builders_dwarvenkingdombuilder_lootdeaddwarf, src_world_domain_landmarksregistry_chinese_fortress_pos, src_world_domain_landmarksregistry_fortress_z_offset (+11 more)

### Community 100 - "11ב. מערכות נוספות שנבדקו בסבב השלישי"
Cohesion: 0.22
Nodes (9): 11ב. מערכות נוספות שנבדקו בסבב השלישי, CB1 — חץ אש לא נותן בונוס נזק על חיות [נקרא בקוד], CB2 — היטבוקס החץ על חיות הוא גליל רחב מדי [נקרא בקוד] — חומרה בינונית, CB3 — נתוני מינים משוכפלים בשרשראות תנאים [נקרא בקוד], MM1 — פתיחה ראשונה של מפת העולם: קפיאה של כמה שניות [נמדד חלקית] — חומרה גבוהה, MM2 — המפה הקטנה דוגמת את השטח תוך כדי תנועה [נקרא בקוד + נמדד עלות], MM3 — כניסה ראשונה למכרה בונה את מפת המכרה [נקרא בקוד], MT1 — רכיבה: אותו רדיוס התנגשות כמו ברגל [נקרא בקוד] (+1 more)

### Community 101 - "11ד. סבב שישי: גמדים, שגרת יום, מזג אוויר, קול, דרקון חי ומובייל"
Cohesion: 0.25
Nodes (8): 11ד. סבב שישי: גמדים, שגרת יום, מזג אוויר, קול, דרקון חי ומובייל, DR1 (עדכון) — נשיפת האש של הדרקון: אומת במשחק החי [נמדד חלקית], MK1 — משמרות השמירה של הנזירים [נמדד בסימולציה], MOB1 — תצוגת מובייל [נמדד בהדמיה של 375×812], N3 (עדכון) — גמדים: אומת בסימולציה [נמדד], SND1 — קול סביבה קשור למיקומים קבועים [נקרא בקוד], V6 — אפקט האש של הדרקון [נמדד: צילום מסך], WX1 — מזג האוויר מתחלף בבת אחת [נמדד] — חומרה בינונית

### Community 102 - "worldSceneBuilder.ts"
Cohesion: 0.20
Nodes (11): A2 — "המערכות טהורות" — לא מדויק, P8 — זמן עלייה [נמדד חלקית], ref_three_addons_environments_roomenvironment_js, ref_three_addons_objects_sky_js, createWorldScene(), IWorldScene, valueNoise2D(), configureTexture() (+3 more)

### Community 103 - "main.tsx"
Cohesion: 0.18
Nodes (11): 4. Composition root and services, ref_react_dom_client, App(), AppServicesContext, AppServicesProvider, LoggerProbe(), useAppServices(), loadActiveGameSettings() (+3 more)

### Community 106 - "locales/index.ts"
Cohesion: 0.23
Nodes (6): en, LocaleSchema, getLocaleDictionary(), setLocaleDictionary(), TranslationDictionary, SpatialHashGrid2D

### Community 107 - "TheMan — 3D Living Nature & RPG World Simulator"
Cohesion: 0.25
Nodes (6): Engineering standards, Getting Started, Installation & Run, Overview & Architecture, Prerequisites, TheMan — 3D Living Nature & RPG World Simulator

### Community 109 - "settlementModels.ts"
Cohesion: 0.09
Nodes (23): BEAR_MOUNTAIN_CAVES, SOUTHERN_PASS_VALLEY_POS, WATERFALL_POOL_POS, LAKESIDE_TEA_PAVILION_POS, RIDEABLE_HORSES, RIVERSIDE_WINDMILLS, SAKURA_SANCTUARY_POS, VALLEY_FARMS (+15 more)

### Community 110 - "dependencies"
Cohesion: 0.50
Nodes (4): dependencies, react, react-dom, three

### Community 112 - "combatAndInventorySystem.spec.ts"
Cohesion: 0.18
Nodes (11): UI1 — ממשק [נקרא בקוד, שטחי], assignHotbarSlot(), buyMarketItem(), getInitialItemStockForStall(), getMarketSellPrice(), getMerchantStallStock(), MarketTransactionResult, sellMarketItem() (+3 more)

### Community 115 - "movementIntent.spec.ts"
Cohesion: 0.47
Nodes (4): IMovementAxes, readMovementAxes(), BINDINGS, NO_JOYSTICK

### Community 117 - "keyBindingMatch.ts"
Cohesion: 0.70
Nodes (3): isBindingHeld(), matchesKeyBinding(), MODIFIER_FAMILIES

### Community 118 - "11. שחקן, מצלמה ושמירה"
Cohesion: 0.22
Nodes (9): 11. שחקן, מצלמה ושמירה, C1 — מצלמת גוף שלישי עוברת דרך קירות [נקרא בקוד] — חומרה גבוהה, F — פיצ'רים חסרים שמקובלים במשחקים כאלה, PL1 — נפילה לתהום במוריה: בלי נזק, ו"שיגור" חזרה למעלה [נמדד] — חומרה גבוהה, PL2 — אין נזק נפילה בשום מקום [נמדד + נקרא בקוד], PL3 — קפיצה על רהיטים זורקת את השחקן, לפעמים דרך קיר [נמדד], PL-OK — מסלולי הליכה שנבדקו ועברו (25), S3 — אין שמירה ביציאה מהדף [נקרא בקוד] (+1 more)

### Community 119 - "t"
Cohesion: 0.25
Nodes (8): ExplorerMinimap, fillFullWorldTerrainRow(), horseSkinsFromWorld, t(), createCatalogItem(), getArrowKindLabel(), getEquippedToolLabel(), getBiomeLabel()

### Community 121 - "IRideableHorseState"
Cohesion: 0.24
Nodes (10): IRideableHorseState, ISettlementModelHandles, computeHorseBiomechanicalPose(), computeHorseTurnResistance(), IHorseBiomechanicalPose, IHorseLimbAngles, IHorseSteeringStepResult, solveForelimb() (+2 more)

### Community 122 - "13. מבנה מערכות המשחק — מה לא יושב במערכת מסודרת"
Cohesion: 0.20
Nodes (10): 13. מבנה מערכות המשחק — מה לא יושב במערכת מסודרת, SYS10 — "איפה השחקן נמצא": מחושב מחדש בכל מקום, כל פעם אחרת [נקרא בקוד], SYS3 — בינת החיות: מכונת מצבים סמויה בפונקציה אחת [נקרא בקוד + נמדד], SYS4 — שבעה סוגי יצורים, שבעה מימושים [נקרא בקוד], SYS6 — מלאי: אין מודול מלאי [נקרא בקוד], SYS7 — אינטראקציות (מקש E): שרשרת תנאים אחת ארוכה [נקרא בקוד], SYS8 — מצב משחק שחי בתוך קומפוננטת React [נקרא בקוד], SYS9 — הודעות למסך: מחרוזת וטיימר שנכתבים מעשרות מקומות [נקרא בקוד] (+2 more)

### Community 125 - "2. נתונים שנמדדו"
Cohesion: 0.50
Nodes (4): 2.1 נתוני התנגשות (סקריפט node שקרא את הנתונים, קריאה בלבד), 2.3 קריאות ציור לפריים (דפדפן, Intel Iris Xe, ספירת `drawElements/drawArrays`, כולל מעבר הצללים), 2.4 FPS אמיתי, בשתי רזולוציות (סבב שישי) [נמדד], 2. נתונים שנמדדו

## Knowledge Gaps
- **348 isolated node(s):** `סימון רמת הוודאות בדו"ח`, `1. השורה התחתונה`, `2.1 נתוני התנגשות (סקריפט node שקרא את הנתונים, קריאה בלבד)`, `2.3 קריאות ציור לפריים (דפדפן, Intel Iris Xe, ספירת `drawElements/drawArrays`, כולל מעבר הצללים)`, `2.4 FPS אמיתי, בשתי רזולוציות (סבב שישי) [נמדד]` (+343 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 769 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `three` to `windowDebugController.ts`, `package.json`, `Deer_Complete.ts`, `dwarvenMineAndCaravanSystem.ts`, `terrainMath.test.ts`, `labCatalog.ts`, `collisionWorld.ts`, `boidsAndWildlifeSystem.spec.ts`, `animalModelAssets.ts`, `labModelFactory.ts`, `Rhino_Complete.ts`, `WorldCanvas.tsx`, `getLoadedAnimalModel`, `Bear_Complete.ts`, `requireClipRig`, `landmarksRegistry.ts`, `undergroundCulling.ts`, `collisionAndTerraces.ts`, `deferredAnimalModel.spec.ts`, `Wolf_Complete.ts`, `atmosphereRenderController.ts`, `createAnimalTexture`, `proceduralModels.ts`, `atmosphereAndWeatherSystem.ts`, `monkAndHippoFixes.test.ts`, `worldSceneBuilder.ts`, `settlementModels.ts`?**
  _High betweenness centrality (0.153) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `boidsAndWildlifeSystem.ts`, `savedGameSettings.ts`, `TheMan — Architecture`, `worldTypes.ts`, `dwarvenMineAndCaravanSystem.ts`, `terrainMath.test.ts`, `GameShellOverlay.tsx`, `labCatalog.ts`, `terrainMath.ts`, `WorldCanvas`, `Result`, `terrainAndBiomeSystem.ts`, `combatAndInventorySystem.ts`, `WorldCanvas.tsx`, `InventoryItemId`, `landmarksRegistry.ts`, `collisionAndTerraces.ts`, `awardSkillXp`, `playerPhysicsSystem.ts`, `ILogger`, `getChestContents`, `atmosphereAndWeatherSystem.ts`, `locales/index.ts`, `settlementModels.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `NatureSoundEngine` connect `NatureSoundEngine` to `ref_node_test`, `windowDebugController.ts`, `ILogger`, `WorldCanvas.tsx`, `atmosphereAndWeatherSystem.ts`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `walkableHeightAt()` (e.g. with `2.2 עלות פונקציות (node, מיקרו־שניות לקריאה)` and `A1 — קובצי ענק ופונקציות ענק`) actually correct?**
  _`walkableHeightAt()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `WorldCanvas` (e.g. with `.start()` and `.stop()`) actually correct?**
  _`WorldCanvas` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `t()` (e.g. with `12. Adding things` and `A9 — קוד מת וניקיון`) actually correct?**
  _`t()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `groundHeightAt()` (e.g. with `2.2 עלות פונקציות (node, מיקרו־שניות לקריאה)` and `A1 — קובצי ענק ופונקציות ענק`) actually correct?**
  _`groundHeightAt()` has 3 INFERRED edges - model-reasoned connections that need verification._