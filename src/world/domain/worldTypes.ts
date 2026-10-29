// ============================================================================
// MODULE: World / Domain / Types
// DESIGN: Core domain data structures, state models, and configuration types (DIP, SRP)
// SUMMARY: Declares immutable and runtime types for player state, world landmarks,
//          inventory catalog, dynamic atmosphere, weather cycles, and entities.
//          Does not contain business logic or Three.js scene instances.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { Result } from '../../core/Result';
import { t } from '../../locales';
export { Result };
export { AppException, InfrastructureCorruptedException, InvalidResultAccessException } from '../../core/AppException';
// #endregion

// ======================== BIOME & LOCOMOTION TYPES ======================== \\
// #region Biome & Locomotion Types
/**
 * Summary: Categorical landscape biome enumeration identifying regional terrain characteristics.
 * Design: Guides ground textures, plant distribution, footstep audio, and minimap pixel tinting.
 */
export type BiomeType =
  | 'water'
  | 'pier'
  | 'bridge'
  | 'cabin'
  | 'trail'
  | 'shore'
  | 'meadow'
  | 'forest'
  | 'birch_grove'
  | 'desert'
  | 'highland'
  | 'rock';

/**
 * Summary: Player traversal speed gear selection controlling movement velocities.
 * Design: Modulates stride kinematics and stamina depletion rates across relaxed, normal, and fast paces.
 */
export type WalkPaceMode = 'relaxed' | 'normal' | 'fast';

/**
 * Summary: Viewport perspective toggle between third-person follow camera and first-person immersion.
 * Design: Dictates character mesh visibility, weapon rendering modes, and reticle positioning.
 */
export type CameraPerspectiveMode = 'third_person' | 'first_person';

/**
 * Summary: Currently drawn hand-held weapon or utility tool equipment slot.
 * Design: Dispatches attack kinematics, idle poses, and lighting effects (e.g. torch illumination).
 */
export type EquippedToolSlot = 'bow' | 'sword' | 'torch' | 'unarmed';

/**
 * Summary: Elemental infusion classification for ballistic arrow projectiles.
 * Design: Determines particle flight trails, impact burst effects, and elemental damage modifiers.
 */
export type ArrowElementKind = 'normal' | 'fire' | 'wind';

/**
 * Summary: Canonical identifier union covering all collectible and craftable game items.
 * Design: Strongly-typed catalog preventing invalid inventory references across logic and UI.
 */
export type InventoryItemId =
  | 'bow'
  | 'sword'
  | 'katana_imperial'
  | 'elven_longbow'
  | 'dwarven_warhammer'
  | 'dragonbone_bow'
  | 'celestial_jin_sword'
  | 'torch'
  | 'unarmed'
  | 'arrow_normal'
  | 'arrow_fire'
  | 'arrow_wind'
  | 'oak_timber'
  | 'cut_granite_blocks'
  | 'iron_ingots'
  | 'imperial_clay_tiles'
  | 'marble_pillar_stone'
  | 'dwarven_gold_ore'
  | 'crystal_gem'
  | 'ancient_dwarven_horn'
  | 'elven_cloak';
// #endregion

// ======================== INVENTORY & EQUIPMENT TYPES ======================== \\
// #region Inventory & Equipment Types
/**
 * Summary: Immutable definition metadata for a distinct inventory item archetype.
 * Design: Specifies market price, weapon stats, category tabs, and required hero level.
 */
export interface IInventoryItemDef {
  readonly id: InventoryItemId;
  readonly name: string;
  readonly category: 'weapons' | 'materials' | 'ammo' | 'gear' | 'treasures';
  readonly categoryLabel: string;
  readonly statLabel: string;
  readonly weight: number;
  readonly valueGold: number;
  readonly requiredLevel: number;
  readonly weaponRole?: 'bow' | 'sword';
  readonly starterOwned?: boolean;
  readonly description: string;
  readonly lore?: string;
  readonly rarity?: 'common' | 'refined' | 'epic' | 'legendary';
}
export type InventoryItemDef = IInventoryItemDef;

function createCatalogItem(
  id: InventoryItemId,
  category: 'weapons' | 'materials' | 'ammo' | 'gear' | 'treasures',
  weight: number,
  valueGold: number,
  requiredLevel: number,
  options?: {
    weaponRole?: 'bow' | 'sword';
    starterOwned?: boolean;
    rarity?: 'common' | 'refined' | 'epic' | 'legendary';
  }
): IInventoryItemDef {
  const name = t(`items.${id}.name`);
  const categoryLabel = t(`items.${id}.category`);
  const statLabel = t(`items.${id}.stat`);
  const description = t(`items.${id}.description`);
  const loreVal = t(`items.${id}.lore`);
  const lore = loreVal !== `items.${id}.lore` ? loreVal : undefined;

  return {
    id,
    name,
    category,
    categoryLabel,
    statLabel,
    weight,
    valueGold,
    requiredLevel,
    weaponRole: options?.weaponRole,
    starterOwned: options?.starterOwned,
    rarity: options?.rarity,
    description,
    lore,
  };
}

/** Summary: Static registry of all available inventory items in the game world. */
export const INVENTORY_ITEMS: readonly IInventoryItemDef[] = [
  createCatalogItem('bow', 'weapons', 3, 145, 1, { weaponRole: 'bow', starterOwned: true, rarity: 'refined' }),
  createCatalogItem('sword', 'weapons', 4, 180, 1, { weaponRole: 'sword', starterOwned: true, rarity: 'refined' }),
  createCatalogItem('katana_imperial', 'weapons', 3, 220, 1, { weaponRole: 'sword', rarity: 'refined' }),
  createCatalogItem('elven_longbow', 'weapons', 2.8, 480, 2, { weaponRole: 'bow', rarity: 'epic' }),
  createCatalogItem('dwarven_warhammer', 'weapons', 6.2, 720, 3, { weaponRole: 'sword', rarity: 'epic' }),
  createCatalogItem('dragonbone_bow', 'weapons', 3.2, 980, 4, { weaponRole: 'bow', rarity: 'legendary' }),
  createCatalogItem('celestial_jin_sword', 'weapons', 3.8, 1450, 5, { weaponRole: 'sword', rarity: 'legendary' }),
  createCatalogItem('torch', 'gear', 1.5, 45, 1, { starterOwned: true, rarity: 'common' }),
  createCatalogItem('arrow_normal', 'ammo', 1, 25, 1, { starterOwned: true, rarity: 'common' }),
  createCatalogItem('arrow_fire', 'ammo', 1, 55, 1, { starterOwned: true, rarity: 'refined' }),
  createCatalogItem('arrow_wind', 'ammo', 0.8, 65, 1, { starterOwned: true, rarity: 'refined' }),
  createCatalogItem('oak_timber', 'materials', 4, 65, 1, { starterOwned: true, rarity: 'common' }),
  createCatalogItem('cut_granite_blocks', 'materials', 8, 90, 1, { starterOwned: true, rarity: 'common' }),
  createCatalogItem('iron_ingots', 'materials', 5, 130, 1, { starterOwned: true, rarity: 'refined' }),
  createCatalogItem('imperial_clay_tiles', 'materials', 3.5, 155, 1, { starterOwned: true, rarity: 'refined' }),
  createCatalogItem('marble_pillar_stone', 'materials', 10, 260, 1, { starterOwned: true, rarity: 'epic' }),
  createCatalogItem('dwarven_gold_ore', 'materials', 6, 220, 1, { starterOwned: true, rarity: 'epic' }),
  createCatalogItem('crystal_gem', 'materials', 2, 350, 1, { starterOwned: true, rarity: 'legendary' }),
  createCatalogItem('ancient_dwarven_horn', 'gear', 2.5, 160, 1, { rarity: 'refined' }),
  createCatalogItem('elven_cloak', 'gear', 1.2, 190, 1, { rarity: 'refined' }),
  createCatalogItem('unarmed', 'gear', 0, 0, 1, { starterOwned: true, rarity: 'common' }),
];

/** Summary: Readonly Map providing O(1) item definition lookups by InventoryItemId. */
export const INVENTORY_ITEM_MAP: ReadonlyMap<InventoryItemId, IInventoryItemDef> = new Map(
  INVENTORY_ITEMS.map((item) => [item.id, item])
);

/** Summary: List of starter owned item IDs derived directly from catalog definitions. */
export const DEFAULT_STARTER_OWNED_ITEM_IDS: readonly InventoryItemId[] = Object.freeze(
  INVENTORY_ITEMS.filter((item) => Boolean(item.starterOwned)).map((item) => item.id)
);

/** Summary: First available non-starter market catalog item. */
export const FIRST_MARKET_CATALOG_ITEM: IInventoryItemDef =
  INVENTORY_ITEM_MAP.get('katana_imperial') ?? INVENTORY_ITEMS[0];
// #endregion

// ======================== CHARACTER SKILLS & PLAYER STATE ======================== \\
// #region Character Skills & Player State
/**
 * Summary: Player progression profile tracking experience points and mastery levels.
 * Design: Drives unlock gates for high-tier weaponry, stamina caps, and mounted speed bonuses.
 */
export interface ICharacterSkillsState {
  archeryLevel: number;
  archeryXp: number;
  archeryXpNext: number;
  swordsmanshipLevel: number;
  swordsmanshipXp: number;
  swordsmanshipXpNext: number;
  horsemanshipLevel: number;
  horsemanshipXp: number;
  horsemanshipXpNext: number;
  athleticsLevel: number;
  athleticsXp: number;
  athleticsXpNext: number;
  explorationLevel: number;
  explorationXp: number;
  explorationXpNext: number;
  lastLevelUpSkill?: string | null;
  lastLevelUpTitle?: string | null;
  lastLevelUpTimer?: number;
}
export type CharacterSkillsState = ICharacterSkillsState;

/**
 * Summary: Radial collision boundary representing trees, boulders, fences, or buildings.
 * Design: Evaluated during player and horse physics steps to enforce 2D kinematic avoidance.
 */
export interface IObstacleCylinder {
  readonly x: number;
  readonly z: number;
  readonly radius: number;
  readonly kind: 'pine' | 'oak' | 'birch' | 'palm' | 'acacia' | 'boulder' | 'pillar';
  readonly scale: number;
  readonly seed: number;
}
export type ObstacleCylinder = IObstacleCylinder;

/**
 * Summary: Complete physical and combat runtime state for the player avatar.
 * Design: Single source of truth updated per tick by playerPhysicsSystem and combatAndInventorySystem.
 */
export interface IPlayerState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  onGround: boolean;
  isFlying: boolean;
  isSwimming?: boolean;
  lastJumpPressTime: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  bobPhase: number;
  bobAmount: number;
  distanceWalked: number;
  stepCount: number;
  inWater: boolean;
  currentBiome: BiomeType;
  walkPace: WalkPaceMode;
  stamina?: number; // 0..100
  maxStamina?: number; // 100
  skills?: ICharacterSkillsState;
  goldCoins?: number;
  ownedItemIds?: InventoryItemId[];
  activeWeaponId?: InventoryItemId;
  climbingLadderId?: string | null;
  mountedHorseId?: string | null;
  mountedHorseYaw?: number;
  cameraPerspective?: CameraPerspectiveMode;
  equippedTool?: EquippedToolSlot;
  arrowKind?: ArrowElementKind;
  hotbarSlots?: [
    InventoryItemId | null,
    InventoryItemId | null,
    InventoryItemId | null,
    InventoryItemId | null,
  ];
  favoriteIds?: InventoryItemId[];
  swordSwingProgress?: number; // 0..1 when swinging sword
  swordComboIndex?: number; // 0, 1, 2 for 3-hit Skyrim slash combo
  swordHeavyAttack?: boolean; // true when executing a long-press heavy forward air-cleaving attack
  swordStrikePending?: boolean; // true during Phase B Wind-Up until Phase C active strike hit window resolves
  swordHitStopTimer?: number; // brief tactile hit-stop resistance timer upon striking a target/obstacle
  swordDebugFreezeProgress?: number | null; // optional deterministic phase inspection lock
  swordChargeTime?: number; // 0..1 windup progress while holding attack button
  swordBlocking?: boolean; // Right-click parry/block guard when sword is equipped
  swordBlockProgress?: number; // 0..1 smooth interpolation into horizontal block stance
  bowZoomHeld?: boolean; // Right-click closer zoom in bow mode (without drawing arrow)
  bowReleaseKick?: number; // 0..1 recoil kick right after releasing an arrow
  weaponSwayX?: number; // Smooth camera-turn horizontal weapon lag
  weaponSwayY?: number; // Smooth camera-pitch/vertical weapon lag
  lastSwordHitPoint?: {
    x: number;
    y: number;
    z: number;
    age: number;
    kind: 'target' | 'obstacle' | 'wall';
  } | null;
  lastSwordAirWave?: {
    startX: number;
    startY: number;
    startZ: number;
    dirX: number;
    dirY: number;
    dirZ: number;
    yaw: number;
    pitch: number;
    age: number;
  } | null;
  dashCooldown?: number;
  dashTimer?: number;
  bowDrawn: boolean;
  bowDrawProgress: number; // 0..1
  arrowsShotCount: number;
  nextArrowId?: number;
  lastArrowHitTarget?: string | null;
}
export type PlayerState = IPlayerState;

/**
 * Summary: Snapshot of hardware and touch input controls sampled per animation frame.
 * Design: Decouples raw DOM keyboard/mouse/touch events from physical simulation steps.
 */
export interface IPlayerInput {
  forward: number; // -1 to 1
  right: number;   // -1 to 1
  sprint: boolean; // Shift = fast
  relaxed: boolean; // Ctrl = relaxed (or descend when flying)
  jumpPressed: boolean;
  jumpHeld: boolean;
  toggleFlyRequested?: boolean;
  toggleMountHorseRequested?: boolean;
  lookYawDelta: number;
  lookPitchDelta: number;
}
export type PlayerInput = IPlayerInput;
// #endregion

// ======================== ANIMAL & HORSE ENTITY TYPES ======================== \\
// #region Animal & Horse Entity Types
/**
 * Summary: Structural definition and visual configuration for an interactive rideable horse.
 * Design: Defines color palette, home spawn coordinates, and biome habitat affinity.
 */
export interface IRideableHorseDef {
  readonly id: string;
  readonly name: string;
  readonly coatColorHex: number;
  readonly maneColorHex: number;
  readonly saddleColorHex: number;
  readonly homeX: number;
  readonly homeZ: number;
  readonly homeYaw: number;
}
export type RideableHorseDef = IRideableHorseDef;

/**
 * Summary: Mutable physical simulation state for an individual mountable horse.
 * Design: Governs locomotion speed, steering momentum, rider attachment, and gait phase.
 */
export interface IRideableHorseState {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  gaitPhase: number;
}
export type RideableHorseState = IRideableHorseState;
// #endregion

// ======================== ATMOSPHERE & WEATHER STATE ======================== \\
// #region Atmosphere & Weather State
/**
 * Summary: Solar and atmospheric lighting parameters computed dynamically per world hour.
 * Design: Synchronizes sun direction, hemisphere light colors, fog density, and sky Rayleigh scatter.
 */
export interface IDynamicAtmosphereState {
  worldHours: number; // 0..24 continuous clock
  timeString: string; // e.g. "06:52"
  phaseLabel: string;
  isNight: boolean;
  nightFactor: number; // 0 (day) .. 1 (full night)
  sunElevationDeg: number;
  sunAzimuthDeg: number;
  sunDirX: number;
  sunDirY: number;
  sunDirZ: number;
  sunColorHex: number;
  sunIntensity: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensity: number;
  fogColorHex: number;
  fogDensity: number;
  morningMistOpacity: number; // 0..1 for low-lying ground/lake mist banks
  waterDeepHex: number;
  waterShallowHex: number;
  skyTurbidity: number;
  skyRayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  exposure: number;
}
export type DynamicAtmosphereState = IDynamicAtmosphereState;

/** Summary: Alias for IDynamicAtmosphereState used by atmosphere and debug controllers. */

/**
 * Summary: Seasonal cycle epoch dividing the annual calendar into 4 distinct phases.
 * Design: Modulates temperature, vegetation tints, weather patterns, and mountain snow line.
 */
export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';

/**
 * Summary: Dynamic meteorological condition classification governing sky and terrain effects.
 * Design: Controls rain particle systems, wet ground shaders, thunder flashes, and fog volume.
 */
export type WeatherKind =
  | 'clear_clouds'
  | 'regional_rain'
  | 'dense_fog'
  | 'mountain_snow'
  | 'lightning_storm'
  | 'wind_sand';

/**
 * Summary: Execution mode for the atmospheric weather transition state machine.
 * Design: Allows switching between fast turbo verification cycle and natural seasonal cycle.
 */
export type WeatherCycleMode = 'turbo_test' | 'seasonal';

/**
 * Summary: User-selectable override options in the HUD for testing dynamic weather modes.
 * Design: Enables manual weather locking or automatic progression via seasonal engine.
 */
export type WeatherToggleOption =
  | 'auto'
  | 'clear_clouds'
  | 'regional_rain'
  | 'dense_fog'
  | 'lightning_storm';

/**
 * Summary: Atmospheric snapshot capturing weather, precipitation, and cloud cover.
 * Design: Consumed by terrain shaders, foliage wind uniforms, and sound engine emitters.
 */
export interface IWeatherStateSnapshot {
  mode: WeatherCycleMode;
  season: SeasonType;
  seasonLabel: string;
  weatherKind: WeatherKind;
  weatherLabel: string;
  cloudCoverage: number;      // 0.15 .. 1.0
  cloudDarkness: number;      // 0 (white cumulus) .. 1 (dark storm clouds)
  rainIntensity: number;      // 0 .. 1 (regional rain streaks)
  snowIntensity: number;      // 0 .. 1 (high-mountain / winter snowflakes)
  fogIntensity: number;       // 0 .. 1 (dense rolling fog & mist)
  wetness: number;            // 0 .. 1 (wet ground darkening & reflective rain puddles)
  windStrength: number;       // 0.15 .. 1.0 (sways trees, grass, clouds)
  sandWindIntensity: number;  // 0 .. 1 (strong wind with blowing sand/dust)
  lightningFlash: number;     // 0 .. 1 (instantaneous lightning bolt & sky flash)
  thunderTriggered: boolean;  // true on the onset of a lightning strike
  boltOriginX: number;
  boltOriginZ: number;
}
export type WeatherStateSnapshot = IWeatherStateSnapshot;
// #endregion

// ======================== WORLD STRUCTURES & LANDMARKS ======================== \\
// #region World Structures & Landmarks
/**
 * Summary: Structural layout definition for agricultural homesteads across the valley.
 * Design: Defines house position, fenced perimeter boundaries, front gate, and enterable doors.
 */
export interface IValleyFarmDef {
  readonly id: string;
  readonly doorId: string;
  readonly name: string;
  readonly x: number;
  readonly z: number;
  readonly height: number;
  readonly clearRadius: number;
  readonly fenceHalfW: number;
  readonly fenceHalfD: number;
  readonly gateHalfW: number;
  readonly dirZ: 1 | -1;
}
export type ValleyFarmDef = IValleyFarmDef;

/**
 * Summary: Landmark definition for strategic elevated stone watchtowers.
 * Design: Specifies base coordinate, enclosed ground floor, spiral platforms, and climbable ladders.
 */
export interface IHillWatchtowerDef {
  readonly id: string;
  readonly doorId: string;
  readonly name: string;
  readonly x: number;
  readonly z: number;
  readonly baseY: number;
  readonly deckY: number;
  readonly halfSize: number;
  readonly yaw: number;
  readonly doorSideLocalZ: 1 | -1;
  readonly bridgeSideLocalZ: 1 | -1 | 0;
  readonly localLadderX: number;
  readonly localLadderZ: number;
  readonly ladderX: number;
  readonly ladderZ: number;
  readonly standX: number;
  readonly standZ: number;
  readonly doorX: number;
  readonly doorZ: number;
  readonly doorMinX: number;
  readonly doorMaxX: number;
  readonly doorMinZ: number;
  readonly doorMaxZ: number;
  readonly isWest: boolean;
  readonly isSouth: boolean;
  readonly connectedToBridge: boolean;
}
export type HillWatchtowerDef = IHillWatchtowerDef;

/**
 * Summary: Monumental stone guardian statues guarding the southern mountain kingdom.
 * Design: Represents colossal stone effigies flanking the mountain pass to the deep mines.
 */
export interface IDwarvenGuardianStatueDef {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly z: number;
  readonly baseY: number;
  readonly pedestalHalfSize: number;
  readonly totalHeight: number;
  readonly yaw: number;
  readonly side: 'west' | 'east';
}
export type DwarvenGuardianStatueDef = IDwarvenGuardianStatueDef;

/**
 * Summary: Residential stone cottage architecture in the southern dwarven kingdom.
 * Design: Defines enterable mountain stone dwellings and door interaction triggers.
 */
export interface IDwarvenStoneHouseDef {
  readonly id: string;
  readonly doorId: string;
  readonly name: string;
  readonly x: number;
  readonly z: number;
  readonly terraceY: number;
  readonly floorY: number;
  readonly halfW: number;
  readonly halfD: number;
  readonly dirX: 1 | -1;
  readonly doorX: number;
  readonly doorZ: number;
}
export type DwarvenStoneHouseDef = IDwarvenStoneHouseDef;

/**
 * Summary: Operational status of the automated dwarven caravan schedule.
 * Design: Animates miners marching between village homes and deep mountain excavation sites.
 */
export interface IDwarvenMinerCaravanState {
  dwarfIndex: number;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  activity: 'resting_home' | 'caravan_to_mine' | 'mining_work' | 'caravan_to_home';
  walkCycle: number;
  miningSwing: number;
  lanternLit: boolean;
}
export type DwarvenMinerCaravanState = IDwarvenMinerCaravanState;

/**
 * Summary: Bastion watchtowers anchoring the four corners of the northern fortress.
 * Design: Provides elevated archery vantage points and connects to walkable rampart corridors.
 */
export interface ICornerWatchtowerDef {
  readonly id: string;
  readonly doorId: string;
  readonly name: string;
  readonly cx: number;
  readonly cz: number;
  readonly doorX: number;
  readonly doorZ: number;
  readonly ladderX: number;
  readonly ladderZ: number;
  readonly isWest: boolean;
  readonly isSouth: boolean;
}
export type CornerWatchtowerDef = ICornerWatchtowerDef;

/**
 * Summary: Spatial trigger volume for vertical ladder climbing interactions.
 * Design: Engages locked vertical ladder ascension kinematics when approached by the player.
 */
export interface IClimbableLadderInfo {
  readonly id: string;
  readonly name: string;
  readonly ladderX: number;
  readonly ladderZ: number;
  readonly standX: number;
  readonly standZ: number;
  readonly isWest: boolean;
  readonly isSouth: boolean;
  readonly minY: number;
  readonly maxY: number;
  readonly floors: readonly number[];
}
export type ClimbableLadderInfo = IClimbableLadderInfo;

/**
 * Summary: Enterable hinged door definition for fortress pavilions and halls.
 * Design: Tracks angular pivot orientation and proximity-based toggle state.
 */
export interface IFortressDoorDef {
  readonly id: string;
  readonly buildingName: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly interactRadius: number;
}
export type FortressDoorDef = IFortressDoorDef;

/**
 * Summary: Axis-aligned or oriented bounding box for architectural collision solid volumes.
 * Design: Prevents player and mount clipping into building interiors, walls, and steps.
 */
export interface ISolidBuildingBox {
  readonly id: string;
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly minY?: number;
  readonly maxY?: number;
}
export type SolidBuildingBox = ISolidBuildingBox;
// #endregion

// ======================== COMBAT & PROJECTILE TYPES ======================== \\
// #region Combat & Projectile Types
/**
 * Summary: Bullseye archery target landmark for marksman practice.
 * Design: Computes radial projectile impact accuracy and awards archery skill progression.
 */
export interface IArcheryTargetDef {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  readonly bullseyeRadius: number;
}
export type ArcheryTargetDef = IArcheryTargetDef;

/**
 * Summary: Historical flight trajectory sample for rendering arrow smoke ribbons.
 * Design: Maintains bounded temporal trail buffer with alpha decay for visual flight clarity.
 */
export interface IArrowTrailPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  age: number;
}
export type ArrowTrailPoint = IArrowTrailPoint;

/**
 * Summary: Active ballistic projectile simulated in flight.
 * Design: Integrates gravity, velocity, drag, and collision queries against targets and terrain.
 */
export interface IArrowProjectile {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  arrowKind?: ArrowElementKind;
  stuck: boolean;
  hitKind: 'none' | 'target' | 'obstacle' | 'building' | 'ground';
  hitTargetId: string | null;
  age: number;
  trail: IArrowTrailPoint[];
}

/**
 * Summary: Error code enumeration returned on failed marketplace economy transactions.
 * Design: Strongly-typed diagnostic identifiers used to display localized user error notices.
 */
export type MarketTransactionErrorCode =
  | 'NOT_IN_MARKET'
  | 'ALREADY_OWNED'
  | 'LEVEL_TOO_LOW'
  | 'INSUFFICIENT_GOLD'
  | 'ITEM_NOT_FOUND'
  | 'NOT_OWNED'
  | 'CANNOT_SELL'
  | 'CANNOT_SELL_STARTER_GEAR';

/**
 * Summary: Success payload generated upon successful item purchase at a market stall.
 * Design: Returns remaining gold balance and reference to the newly acquired inventory item.
 */
export interface IBuyMarketItemPayload {
  readonly goldCoins: number;
  readonly requiredLevel: number;
  readonly playerLevel: number;
}

/**
 * Summary: Success payload generated upon successful item sale at a market stall.
 * Design: Returns updated gold balance and identification of the relinquished material.
 */
export interface ISellMarketItemPayload {
  readonly goldCoins: number;
  readonly soldForGold: number;
}

/**
 * Summary: Union of successful marketplace transaction outcomes (buy or sell).
 * Design: Strongly-typed result payload for Result.ok returns in economy actions.
 */
export type IMarketTransactionSuccess = IBuyMarketItemPayload | ISellMarketItemPayload;

/**
 * Summary: Core interaction callback registry exposed to the game shell and UI overlays.
 * Design: Bridges UI user gestures (clicks, hotkeys) to domain state mutation systems.
 */
export interface IGameActions {
  readonly onEquipItem: (id: InventoryItemId) => void;
  readonly onBuyItem: (id: InventoryItemId) => Result<IBuyMarketItemPayload, MarketTransactionErrorCode>;
  readonly onSellItem: (id: InventoryItemId) => Result<ISellMarketItemPayload, MarketTransactionErrorCode>;
  readonly onAssignHotbar: (slotIndex: number, id: InventoryItemId) => void;
  readonly onToggleFavorite: (id: InventoryItemId) => void;
}
export type GameActions = IGameActions;
// #endregion
// #endregion
