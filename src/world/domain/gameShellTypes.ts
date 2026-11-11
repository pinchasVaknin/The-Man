// ============================================================================
// MODULE: World / Domain / Game Shell Types
// DESIGN: Shared contracts between the 3D world and the React shell (no runtime code)
// SUMMARY: Game mode, the HUD telemetry snapshot and the virtual (touch) movement state.
//          Lives in the domain layer so core and UI modules can depend on it without
//          importing the WorldCanvas component.
// ============================================================================

// ======================== IMPORTS ======================== \\
// #region Imports
import type {
  ArrowElementKind,
  BiomeType,
  CameraPerspectiveMode,
  EquippedToolSlot,
  ICharacterSkillsState,
  InventoryItemId,
  SeasonType,
  WalkPaceMode,
  WeatherKind,
} from './worldTypes';
// #endregion

// ======================== SHELL CONTRACTS ======================== \\
// #region Shell Contracts
/**
 * Summary: High-level application mode for WorldCanvas view hierarchy.
 * Design: Controls transition between title screen, active gameplay, and paused modal state.
 */
export type GameStateMode = 'title' | 'playing' | 'paused';

/**
 * Summary: Real-time telemetry snapshot published to HUD and diagnostic overlays.
 * Design: Encapsulates fps, player coordinates, biome, time of day, and weather condition.
 */
export interface ITelemetrySnapshot {
  x: number;
  y: number;
  z: number;
  yawDeg: number;
  distanceWalked: number;
  stepCount: number;
  biome: BiomeType;
  walkPace: WalkPaceMode;
  isFlying: boolean;
  isSwimming?: boolean;
  isCrouching?: boolean;
  colliderDebugVisible?: boolean;
  cameraPerspective?: CameraPerspectiveMode;
  equippedTool?: EquippedToolSlot;
  activeWeaponId?: InventoryItemId;
  equippedClothingId?: InventoryItemId;
  arrowKind?: ArrowElementKind;
  hotbarSlots?: (InventoryItemId | null)[];
  favoriteIds?: InventoryItemId[];
  goldCoins?: number;
  ownedItemIds?: InventoryItemId[];
  nearbyMarket?: {
    id: string;
    name: string;
    stock?: Partial<Record<InventoryItemId, number>>;
  } | null;
  nearbyDeadAnimal?: {
    id: string;
    species: string;
    speciesName: string;
  } | null;
  nearbyFallenTree?: {
    id: string;
    kind: string;
    name: string;
    woodYield: number;
  } | null;
  nearbyChest?: {
    id: string;
    name: string;
    isOpened: boolean;
    contents: InventoryItemId[];
    isCorpse?: boolean;
    goldCoins?: number;
  } | null;
  activeEnemyHealthBar?: {
    id: number;
    name: string;
    level?: number;
    hp: number;
    maxHp: number;
    isBoss: boolean;
    isSubdued?: boolean;
  } | null;
  lootNotification?: string | null;
  swordSwingProgress?: number;
  dashCooldown?: number;
  bowDrawn?: boolean;
  bowDrawProgress?: number;
  arrowsShotCount?: number;
  lastArrowHitTarget?: string | null;
  lastArrowHitTargetName?: string | null;
  timeString: string;
  phaseLabel: string;
  sunElevationDeg: number;
  pointerLocked: boolean;
  weatherKind?: WeatherKind;
  weatherLabel?: string;
  wetness?: number;
  mountedHorseId?: string | null;
  nearbyHorse?: {
    id: string;
    name: string;
  } | null;
  nearbyDoor?: {
    id: string;
    buildingName: string;
    isOpen: boolean;
  } | null;
  nearbyBed?: {
    id: string;
    name: string;
  } | null;
  nearbyTrapWorkbench?: {
    id: string;
    name: string;
    nameHe: string;
  } | null;
  nearbyPlacedTrap?: {
    id: string;
    kind: string;
    status: 'armed' | 'sprung';
    sprung?: boolean;
    caughtSpecies?: string;
    caughtAnimalName?: string;
    caughtAnimalLevel?: number;
    x: number;
    y: number;
    z: number;
  } | null;
  targetedCreature?: {
    id: number;
    species: string;
    speciesName: string;
    level: number;
    hp: number;
    maxHp: number;
    alertLevel: string;
    threatRating: 'easy' | 'moderate' | 'dangerous' | 'deadly';
    isBoss: boolean;
  } | null;
  placedTrapsCount?: number;
  sprungTrapsCount?: number;
  heldTrapStatus?: {
    readonly itemId: InventoryItemId;
    readonly name: string;
    readonly count: number;
    readonly valid: boolean;
    readonly reason: string;
  } | null;
  isSleepingInBed?: boolean;
  worldHours?: number;
  season?: SeasonType;
  seasonLabel?: string;
  forcedSeason?: SeasonType | 'auto';
  nearbyLadder?: boolean;
  climbingLadder?: boolean;
  nearbyMinecart?: {
    lineId: string;
    lineName: string;
    destinationName: string;
  } | null;
  drivingMinecart?: {
    lineId: string;
    lineName: string;
    speed: number;
  } | null;
  stamina?: number;
  maxStamina?: number;
  staminaExhausted?: boolean;
  mountStamina?: number;
  mountMaxStamina?: number;
  mountStaminaExhausted?: boolean;
  hp?: number;
  maxHp?: number;
  hunger?: number;
  maxHunger?: number;
  damageFlashIntensity?: number;
  skills?: ICharacterSkillsState;
  deathRespawnPhase?: {
    stage: 'dying' | 'waking';
    timer: number;
    cause: 'combat' | 'starvation';
    causeText?: string;
  } | null;
  ownedShips?: ReadonlyArray<{
    id: string;
    tierId: string;
    name: string;
    x: number;
    z: number;
    yaw: number;
    spawned: boolean;
    priceGold: number;
    maxForwardSpeed: number;
    description: string;
  }>;
}
export type TelemetrySnapshot = ITelemetrySnapshot;

/**
 * Summary: Touch and virtual joystick state for mobile / secondary input devices.
 * Design: Translates 2D virtual thumbstick vectors into directional walk pace signals.
 */
export interface IVirtualMoveState {
  forward: number;
  right: number;
  sprint: boolean;
  relaxed: boolean;
  jump: boolean;
  drawBow?: boolean;
}
// #endregion
