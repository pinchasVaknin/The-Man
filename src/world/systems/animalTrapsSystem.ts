// ============================================================================
// MODULE: World / Systems / Animal Traps & Workbench System
// DESIGN: Autonomous wildlife trapping, crafting recipes, and trap life-cycle (SRP)
// SUMMARY: Manages trap crafting workbench in the starting lodge, placed world traps,
//          real wildlife attraction & catches (squirrels, rabbits, birds, bears, fish),
//          and harvesting caught game without requiring bow or sword.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { INVENTORY_ITEM_MAP, type InventoryItemId } from '../domain/worldTypes';
import type { GroundAnimalSpecies, ISmallAnimalState } from './boidsAndWildlifeSystem';
// #endregion

// ======================== RECIPES & DATA CONTRACTS ======================== \\
// #region Recipes & Data Contracts
export type TrapKind =
  | 'trap_cage_small'
  | 'trap_snare'
  | 'trap_bear_jaw'
  | 'trap_net'
  | 'trap_fish';

export type CaughtTrapSpecies = GroundAnimalSpecies | 'dove' | 'fish';

export interface ITrapIngredient {
  readonly itemId: InventoryItemId;
  readonly count: number;
}

export interface ITrapRecipe {
  readonly id: TrapKind;
  readonly kind: TrapKind;
  readonly itemId: InventoryItemId;
  readonly resultItemId: InventoryItemId;
  readonly name: string;
  readonly subtitle: string;
  readonly description: string;
  readonly targetAnimalsLabel: string;
  readonly targetSpecies: readonly CaughtTrapSpecies[];
  readonly ingredients: readonly ITrapIngredient[];
  readonly triggerRadius: number;
  readonly attractRadius: number;
  readonly baseCatchTimeSec: number;
  readonly xpReward: number;
  readonly defaultLoot: readonly {
    readonly itemId: InventoryItemId;
    readonly min: number;
    readonly max: number;
  }[];
}

export interface IWorkbenchStash {
  materials: Record<string, number>;
}

export interface IPlacedTrap {
  readonly id: string;
  readonly kind: TrapKind;
  readonly trapItemId?: InventoryItemId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  status: 'armed' | 'sprung';
  sprung?: boolean;
  armedDuration: number;
  caughtSpecies?: CaughtTrapSpecies;
  caughtAnimalName?: string;
  caughtAnimalLevel?: number;
  loot?: Array<{ itemId: InventoryItemId; quantity: number }>;
  xp?: number;
  notifiedSprung?: boolean;
  luredCritterAssigned?: boolean;
}

let activePlacedTrapsRef: IPlacedTrap[] = [];

/** Summary: Registers the active world placed traps array so wildlife and bird AI can react to traps. */
export function setActivePlacedTrapsRef(traps: IPlacedTrap[]): void {
  activePlacedTrapsRef = traps;
}

/** Summary: Returns the currently active world placed traps array. */
export function getActivePlacedTrapsRef(): IPlacedTrap[] {
  return activePlacedTrapsRef;
}

/** Summary: Available trap craft recipes at the Trapper's Workbench. */
export const TRAP_RECIPES: readonly ITrapRecipe[] = [
  {
    id: 'trap_cage_small',
    kind: 'trap_cage_small',
    itemId: 'trap_cage_small',
    resultItemId: 'trap_cage_small',
    name: 'Small Cage Trap',
    subtitle: 'Wooden Drop-Box Trap · Squirrels & Rabbits',
    description:
      'Slatted wooden drop-box baited with wild berries and seeds. Lures nearby squirrels and rabbits to walk inside and safely captures them without damaging hides or meat.',
    targetAnimalsLabel: 'Squirrels & Rabbits',
    targetSpecies: ['squirrel', 'rabbit'],
    ingredients: [
      { itemId: 'oak_timber', count: 2 },
      { itemId: 'twine_fiber', count: 1 },
      { itemId: 'wild_berries', count: 1 },
    ],
    triggerRadius: 2.1,
    attractRadius: 38.0,
    baseCatchTimeSec: 16.0,
    xpReward: 45,
    defaultLoot: [
      { itemId: 'raw_game_meat', min: 1, max: 2 },
      { itemId: 'small_hide', min: 1, max: 2 },
      { itemId: 'animal_bone', min: 1, max: 2 },
    ],
  },
  {
    id: 'trap_snare',
    kind: 'trap_snare',
    itemId: 'trap_snare',
    resultItemId: 'trap_snare',
    name: 'Wire Snare Trap',
    subtitle: 'Baited Trail Snare · Squirrels & Rabbits',
    description:
      'Tension-sprung braided snare loop pegged into forest soil with berry & seed scent bait. Draws nearby rabbits and squirrels onto the trail and snags them when they pass through.',
    targetAnimalsLabel: 'Rabbits & Squirrels',
    targetSpecies: ['rabbit', 'squirrel'],
    ingredients: [
      { itemId: 'oak_timber', count: 1 },
      { itemId: 'twine_fiber', count: 2 },
    ],
    triggerRadius: 1.9,
    attractRadius: 36.0,
    baseCatchTimeSec: 14.0,
    xpReward: 35,
    defaultLoot: [
      { itemId: 'raw_game_meat', min: 1, max: 2 },
      { itemId: 'small_hide', min: 1, max: 1 },
    ],
  },
  {
    id: 'trap_bear_jaw',
    kind: 'trap_bear_jaw',
    itemId: 'trap_bear_jaw',
    resultItemId: 'trap_bear_jaw',
    name: 'Heavy Steel Bear Trap',
    subtitle: 'Serrated Steel Jaws · Clamps Bear Paw, Deals Damage & Slows (-10% for 7s)',
    description:
      'Dual-spring tempered steel jaw trap. Snaps shut onto a bear’s front paw, forcing it to stop and roar on all fours, dealing heavy damage and reducing its speed by 10% for 7 seconds after the roar.',
    targetAnimalsLabel: 'Bears & Large Predators',
    targetSpecies: ['bear', 'wolf', 'crocodile', 'jaguar'],
    ingredients: [
      { itemId: 'iron_ingots', count: 2 },
      { itemId: 'oak_timber', count: 1 },
      { itemId: 'raw_game_meat', count: 1 },
    ],
    triggerRadius: 2.5,
    attractRadius: 34.0,
    baseCatchTimeSec: 22.0,
    xpReward: 95,
    defaultLoot: [
      { itemId: 'raw_game_meat', min: 2, max: 4 },
      { itemId: 'animal_bone', min: 2, max: 3 },
      { itemId: 'animal_fat', min: 1, max: 2 },
    ],
  },
  {
    id: 'trap_net',
    kind: 'trap_net',
    itemId: 'trap_net',
    resultItemId: 'trap_net',
    name: 'Baited Bird Net Trap',
    subtitle: 'Seed & Berry Drop Net · Lures Flying Birds to Land, Walk & Eat',
    description:
      'Woven flax drop net with a central dish of golden grain seeds and wild berries. Flying birds land around the trap, walk up to peck at the food bait, and trigger the net.',
    targetAnimalsLabel: 'Wild Doves & Forest Birds',
    targetSpecies: ['dove', 'rabbit', 'squirrel'],
    ingredients: [
      { itemId: 'twine_fiber', count: 2 },
      { itemId: 'oak_timber', count: 1 },
      { itemId: 'grain_seeds', count: 1 },
      { itemId: 'wild_berries', count: 1 },
    ],
    triggerRadius: 2.2,
    attractRadius: 48.0,
    baseCatchTimeSec: 18.0,
    xpReward: 65,
    defaultLoot: [
      { itemId: 'raw_game_meat', min: 2, max: 3 },
      { itemId: 'animal_bone', min: 1, max: 2 },
    ],
  },
  {
    id: 'trap_fish',
    kind: 'trap_fish',
    itemId: 'trap_fish',
    resultItemId: 'trap_fish',
    name: 'Woven Fish Trap',
    subtitle: 'Willow-Reed Funnel Basket · River, Lake & Harbor Fish',
    description:
      'Conical woven reed funnel basket baited with grain seeds and tethered to a wooden float. Place in shallow water along any shoreline, river, or lake to catch fresh trout and salmon.',
    targetAnimalsLabel: 'River Trout & Silver Salmon (Water Placement)',
    targetSpecies: ['fish'],
    ingredients: [
      { itemId: 'oak_timber', count: 1 },
      { itemId: 'twine_fiber', count: 2 },
      { itemId: 'grain_seeds', count: 1 },
    ],
    triggerRadius: 2.2,
    attractRadius: 30.0,
    baseCatchTimeSec: 11.0,
    xpReward: 50,
    defaultLoot: [
      { itemId: 'raw_game_meat', min: 2, max: 3 },
      { itemId: 'animal_fat', min: 1, max: 2 },
    ],
  },
];

/** Summary: Default starter materials stocked in the Trapper's Workbench cabin stash. */
export const DEFAULT_TRAP_WORKBENCH_STASH: Record<string, number> = {
  oak_timber: 10,
  twine_fiber: 10,
  wild_berries: 8,
  grain_seeds: 8,
  iron_ingots: 6,
  raw_game_meat: 4,
};
// #endregion

// ======================== CRAFTING & WORKBENCH LOGIC ======================== \\
// #region Crafting & Workbench Logic
/**
 * Summary: Counts total available quantity of an item between player inventory and workbench stash.
 */
export function getAvailableResourceCount(
  itemId: InventoryItemId,
  playerOwnedItemIds: readonly InventoryItemId[],
  workbenchStash: Record<string, number>
): { total: number; inInventory: number; inStash: number } {
  let inInventory = 0;
  for (let i = 0; i < playerOwnedItemIds.length; i++) {
    if (playerOwnedItemIds[i] === itemId) inInventory++;
  }
  const inStash = workbenchStash[itemId] ?? 0;
  return { total: inInventory + inStash, inInventory, inStash };
}

/**
 * Summary: Checks whether the player can craft a specific trap recipe given their items and workbench stash.
 */
export function canCraftTrap(
  recipe: ITrapRecipe,
  playerOwnedItemIds: readonly InventoryItemId[],
  workbenchStash: Record<string, number>
): boolean {
  for (let i = 0; i < recipe.ingredients.length; i++) {
    const ing = recipe.ingredients[i];
    const { total } = getAvailableResourceCount(ing.itemId, playerOwnedItemIds, workbenchStash);
    if (total < ing.count) return false;
  }
  return true;
}

/**
 * Summary: Crafts a trap at the Trapper's Workbench, consuming ingredients first from workbench stash then player inventory.
 */
export function craftTrapAtWorkbench(
  recipeKind: TrapKind,
  playerOwnedItemIds: readonly InventoryItemId[],
  workbenchStash: Record<string, number>
): {
  success: boolean;
  updatedPlayerItems: InventoryItemId[];
  updatedWorkbenchStash: Record<string, number>;
  craftedItemId?: InventoryItemId;
  error?: string;
} {
  const recipe = TRAP_RECIPES.find((r) => r.kind === recipeKind);
  if (!recipe) {
    return {
      success: false,
      updatedPlayerItems: [...playerOwnedItemIds],
      updatedWorkbenchStash: { ...workbenchStash },
      error: 'Unknown trap recipe',
    };
  }

  if (!canCraftTrap(recipe, playerOwnedItemIds, workbenchStash)) {
    return {
      success: false,
      updatedPlayerItems: [...playerOwnedItemIds],
      updatedWorkbenchStash: { ...workbenchStash },
      error: 'Insufficient materials to craft trap',
    };
  }

  const updatedStash = { ...workbenchStash };
  const updatedPlayerItems = [...playerOwnedItemIds];

  // Deduct ingredients: draw from stash first, then player inventory
  for (let i = 0; i < recipe.ingredients.length; i++) {
    const ing = recipe.ingredients[i];
    let remainingToDeduct = ing.count;

    const inStash = updatedStash[ing.itemId] ?? 0;
    const deductFromStash = Math.min(inStash, remainingToDeduct);
    if (deductFromStash > 0) {
      updatedStash[ing.itemId] = inStash - deductFromStash;
      remainingToDeduct -= deductFromStash;
    }

    if (remainingToDeduct > 0) {
      let deductedFromInv = 0;
      for (let j = updatedPlayerItems.length - 1; j >= 0; j--) {
        if (updatedPlayerItems[j] === ing.itemId) {
          updatedPlayerItems.splice(j, 1);
          deductedFromInv++;
          if (deductedFromInv >= remainingToDeduct) break;
        }
      }
    }
  }

  // Deliver crafted trap item directly to player inventory
  updatedPlayerItems.push(recipe.itemId);

  return {
    success: true,
    updatedPlayerItems,
    updatedWorkbenchStash: updatedStash,
    craftedItemId: recipe.itemId,
  };
}
// #endregion

// ======================== PLACEMENT & RECOVERY ======================== \\
// #region Placement & Recovery
let nextTrapIdCounter = 1;

/**
 * Minimum time (in seconds) an armed baited trap must sit on the ground before nearby
 * wildlife catches the scent and cautiously approaches.
 */
export const TRAP_SCENT_NOTICE_DELAY_SEC = 10.0;

export interface ITrapPlacementPreview {
  readonly valid: boolean;
  readonly reason: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly kind: TrapKind;
  readonly itemId: InventoryItemId;
  readonly trapName: string;
}

/**
 * Summary: Computes the 3D ground/water placement coordinates in front of the player
 *          and validates whether the trap can be placed there (green = valid, red = invalid).
 */
export function computeTrapPlacementPreview(
  placedTraps: readonly IPlacedTrap[],
  trapItem: InventoryItemId,
  playerX: number,
  playerY: number,
  playerZ: number,
  playerYaw: number,
  groundHeightFn: (x: number, z: number) => number,
  waterLevel = 1.4,
  playerPitch = 0
): ITrapPlacementPreview | null {
  const recipe = TRAP_RECIPES.find((r) => r.itemId === trapItem);
  if (!recipe) return null;

  // Project placement distance in front of the player based on camera pitch (1.75m..3.35m)
  const pitchFactor = Math.max(-0.85, Math.min(0.35, playerPitch));
  const lookDist = Math.max(1.75, Math.min(3.35, 2.45 + pitchFactor * 1.15));
  const fwdX = -Math.sin(playerYaw);
  const fwdZ = -Math.cos(playerYaw);
  const placeX = playerX + fwdX * lookDist;
  const placeZ = playerZ + fwdZ * lookDist;
  const groundY = groundHeightFn(placeX, placeZ);
  const renderY = recipe.kind === 'trap_fish' ? Math.max(groundY + 0.04, waterLevel - 0.04) : groundY + 0.05;

  // 1. Reject placing inside the starting Hunter's Lodge cabin interior
  if (Math.abs(placeX - -92.2) < 4.2 && Math.abs(placeZ - 73.2) < 4.2) {
    return {
      valid: false,
      reason: 'Cannot place traps indoors',
      x: placeX,
      y: renderY,
      z: placeZ,
      yaw: playerYaw,
      kind: recipe.kind,
      itemId: recipe.itemId,
      trapName: recipe.name,
    };
  }

  // 2. Water vs dry land validation
  if (recipe.kind === 'trap_fish') {
    if (groundY > waterLevel + 0.45) {
      return {
        valid: false,
        reason: 'Fish Traps must be placed in shallow water or shoreline',
        x: placeX,
        y: groundY + 0.05,
        z: placeZ,
        yaw: playerYaw,
        kind: recipe.kind,
        itemId: recipe.itemId,
        trapName: recipe.name,
      };
    }
    if (groundY < waterLevel - 3.2) {
      return {
        valid: false,
        reason: 'Water is too deep here for a Woven Fish Trap',
        x: placeX,
        y: renderY,
        z: placeZ,
        yaw: playerYaw,
        kind: recipe.kind,
        itemId: recipe.itemId,
        trapName: recipe.name,
      };
    }
  } else {
    if (groundY <= waterLevel + 0.05) {
      return {
        valid: false,
        reason: 'Land traps cannot be placed in water',
        x: placeX,
        y: renderY,
        z: placeZ,
        yaw: playerYaw,
        kind: recipe.kind,
        itemId: recipe.itemId,
        trapName: recipe.name,
      };
    }
  }

  // 3. Steepness / elevation difference check
  const sampleDx = groundHeightFn(placeX + 0.45, placeZ);
  const sampleDz = groundHeightFn(placeX, placeZ + 0.45);
  if (
    Math.abs(groundY - playerY) > 2.85 ||
    Math.abs(sampleDx - groundY) > 0.68 ||
    Math.abs(sampleDz - groundY) > 0.68
  ) {
    return {
      valid: false,
      reason: 'Ground is too steep or uneven here',
      x: placeX,
      y: renderY,
      z: placeZ,
      yaw: playerYaw,
      kind: recipe.kind,
      itemId: recipe.itemId,
      trapName: recipe.name,
    };
  }

  // 4. Overlap with existing placed traps
  for (let i = 0; i < placedTraps.length; i++) {
    const existing = placedTraps[i];
    if (Math.hypot(existing.x - placeX, existing.z - placeZ) < 1.25) {
      return {
        valid: false,
        reason: 'Too close to another placed trap',
        x: placeX,
        y: renderY,
        z: placeZ,
        yaw: playerYaw,
        kind: recipe.kind,
        itemId: recipe.itemId,
        trapName: recipe.name,
      };
    }
  }

  return {
    valid: true,
    reason: 'Valid placement — Left-Click to place trap',
    x: placeX,
    y: renderY,
    z: placeZ,
    yaw: playerYaw,
    kind: recipe.kind,
    itemId: recipe.itemId,
    trapName: recipe.name,
  };
}

/**
 * Summary: Places an armed trap in the game world ahead of the player on the ground/water surface.
 */
export function placeTrapOnGround(
  placedTraps: readonly IPlacedTrap[],
  trapItem: InventoryItemId,
  playerX: number,
  playerY: number,
  playerZ: number,
  playerYaw: number,
  groundHeightFn: (x: number, z: number) => number,
  waterLevel = 1.4,
  playerPitch = 0
): {
  success: boolean;
  updatedTraps: IPlacedTrap[];
  placedTrap?: IPlacedTrap;
  error?: string;
} {
  const preview = computeTrapPlacementPreview(
    placedTraps,
    trapItem,
    playerX,
    playerY,
    playerZ,
    playerYaw,
    groundHeightFn,
    waterLevel,
    playerPitch
  );
  if (!preview) {
    return { success: false, updatedTraps: [...placedTraps], error: 'Not a placeable trap item' };
  }
  if (!preview.valid) {
    return {
      success: false,
      updatedTraps: [...placedTraps],
      error: preview.reason,
    };
  }

  const newTrap: IPlacedTrap = {
    id: `trap-${preview.kind}-${Date.now()}-${nextTrapIdCounter++}`,
    kind: preview.kind,
    trapItemId: preview.itemId,
    x: preview.x,
    y: preview.y,
    z: preview.z,
    yaw: preview.yaw,
    status: 'armed',
    sprung: false,
    armedDuration: 0,
  };

  return {
    success: true,
    updatedTraps: [...placedTraps, newTrap],
    placedTrap: newTrap,
  };
}

/**
 * Summary: Picks up an armed, empty trap from the ground and returns the item to inventory.
 */
export function pickupArmedTrap(
  placedTraps: readonly IPlacedTrap[],
  trapId: string
): {
  success: boolean;
  updatedTraps: IPlacedTrap[];
  returnedItemId?: InventoryItemId;
} {
  const trapIndex = placedTraps.findIndex((t) => t.id === trapId);
  if (trapIndex < 0) return { success: false, updatedTraps: [...placedTraps] };

  const targetTrap = placedTraps[trapIndex];
  if (targetTrap.status !== 'armed') {
    return { success: false, updatedTraps: [...placedTraps] };
  }

  const recipe = TRAP_RECIPES.find((r) => r.kind === targetTrap.kind);
  const updatedTraps = placedTraps.filter((t) => t.id !== trapId);

  return {
    success: true,
    updatedTraps,
    returnedItemId: recipe?.itemId ?? 'trap_cage_small',
  };
}

/**
 * Summary: Collects loot and XP from a sprung trap, and resets or retrieves the trap.
 */
export function collectSprungTrapLoot(
  placedTraps: readonly IPlacedTrap[],
  trapId: string
): {
  success: boolean;
  updatedTraps: IPlacedTrap[];
  loot: Array<{ itemId: InventoryItemId; quantity: number }>;
  xp: number;
  returnedItemId: InventoryItemId;
  caughtSpecies?: CaughtTrapSpecies;
  caughtAnimalName?: string;
  caughtAnimalLevel?: number;
} {
  const trapIndex = placedTraps.findIndex((t) => t.id === trapId);
  if (trapIndex < 0) {
    return {
      success: false,
      updatedTraps: [...placedTraps],
      loot: [],
      xp: 0,
      returnedItemId: 'trap_cage_small',
    };
  }

  const targetTrap = placedTraps[trapIndex];
  const recipe = TRAP_RECIPES.find((r) => r.kind === targetTrap.kind);
  const returnedItemId = recipe?.itemId ?? 'trap_cage_small';
  const loot = targetTrap.loot ? [...targetTrap.loot] : [];
  const xp = targetTrap.xp ?? recipe?.xpReward ?? 40;

  const updatedTraps = placedTraps.filter((t) => t.id !== trapId);

  return {
    success: true,
    updatedTraps,
    loot,
    xp,
    returnedItemId,
    caughtSpecies: targetTrap.caughtSpecies,
    caughtAnimalName: targetTrap.caughtAnimalName,
    caughtAnimalLevel: targetTrap.caughtAnimalLevel,
  };
}
// #endregion

// ======================== ANIMAL SIMULATION & TRAPPING TICK ======================== \\
// #region Animal Simulation & Trapping Tick
/**
 * Summary: Generates authentic loot based on caught animal species and level.
 */
export function generateCaughtAnimalLoot(
  species: CaughtTrapSpecies,
  level: number,
  trapKind: TrapKind
): Array<{ itemId: InventoryItemId; quantity: number }> {
  const levelBonus = Math.max(0, level - 1);
  const lootList: Array<{ itemId: InventoryItemId; quantity: number }> = [];

  switch (species) {
    case 'squirrel':
      lootList.push({ itemId: 'raw_game_meat', quantity: 1 + (levelBonus > 1 ? 1 : 0) });
      lootList.push({ itemId: 'small_hide', quantity: 1 + (levelBonus >= 2 ? 1 : 0) });
      lootList.push({ itemId: 'animal_bone', quantity: 1 });
      break;

    case 'rabbit':
      lootList.push({ itemId: 'raw_game_meat', quantity: 1 + (levelBonus > 0 ? 1 : 0) });
      lootList.push({ itemId: 'small_hide', quantity: 1 + (levelBonus >= 2 ? 1 : 0) });
      lootList.push({ itemId: 'animal_bone', quantity: 1 });
      break;

    case 'dove':
      lootList.push({ itemId: 'raw_game_meat', quantity: 2 + (levelBonus > 1 ? 1 : 0) });
      lootList.push({ itemId: 'animal_bone', quantity: 1 });
      lootList.push({ itemId: 'animal_fat', quantity: 1 });
      break;

    case 'fish':
      lootList.push({ itemId: 'raw_game_meat', quantity: 2 + (levelBonus > 0 ? 1 : 0) });
      lootList.push({ itemId: 'animal_fat', quantity: 1 + (levelBonus >= 2 ? 1 : 0) });
      break;

    case 'deer':
      lootList.push({ itemId: 'deer_meat', quantity: 2 + levelBonus });
      lootList.push({ itemId: 'deer_hide', quantity: 1 + (levelBonus >= 2 ? 1 : 0) });
      lootList.push({ itemId: 'deer_antlers', quantity: 1 });
      lootList.push({ itemId: 'animal_bone', quantity: 2 + levelBonus });
      break;

    case 'sheep':
      lootList.push({ itemId: 'raw_game_meat', quantity: 2 + levelBonus });
      lootList.push({ itemId: 'sheep_hide', quantity: 1 + (levelBonus >= 1 ? 1 : 0) });
      lootList.push({ itemId: 'animal_bone', quantity: 2 });
      break;

    case 'wolf':
      lootList.push({ itemId: 'raw_game_meat', quantity: 2 + levelBonus });
      lootList.push({ itemId: 'wolf_hide', quantity: 1 + (levelBonus >= 2 ? 1 : 0) });
      lootList.push({ itemId: 'wolf_fang', quantity: 1 + (levelBonus >= 1 ? 1 : 0) });
      lootList.push({ itemId: 'animal_bone', quantity: 2 });
      break;

    case 'bear':
      lootList.push({ itemId: 'bear_meat', quantity: 3 + levelBonus });
      lootList.push({ itemId: 'bear_hide', quantity: 1 + (levelBonus >= 2 ? 1 : 0) });
      lootList.push({ itemId: 'bear_claws', quantity: 1 + (levelBonus >= 1 ? 1 : 0) });
      lootList.push({ itemId: 'animal_fat', quantity: 2 });
      lootList.push({ itemId: 'animal_bone', quantity: 3 });
      break;

    case 'crocodile':
      lootList.push({ itemId: 'raw_game_meat', quantity: 3 + levelBonus });
      lootList.push({ itemId: 'crocodile_hide', quantity: 1 + (levelBonus >= 2 ? 1 : 0) });
      lootList.push({ itemId: 'crocodile_teeth', quantity: 1 + (levelBonus >= 1 ? 1 : 0) });
      lootList.push({ itemId: 'animal_bone', quantity: 3 });
      break;

    case 'jaguar':
      lootList.push({ itemId: 'raw_game_meat', quantity: 2 + levelBonus });
      lootList.push({ itemId: 'jaguar_hide', quantity: 1 + (levelBonus >= 2 ? 1 : 0) });
      lootList.push({ itemId: 'wolf_fang', quantity: 2 });
      lootList.push({ itemId: 'animal_bone', quantity: 2 });
      break;

    default:
      lootList.push({ itemId: 'raw_game_meat', quantity: 2 });
      lootList.push({ itemId: 'small_hide', quantity: 1 });
      break;
  }

  if (trapKind === 'trap_bear_jaw' && !lootList.some((l) => l.itemId === 'animal_fat')) {
    lootList.push({ itemId: 'animal_fat', quantity: 1 });
  }

  return lootList;
}

export interface ITickTrapsResult {
  readonly newlySprungTraps: IPlacedTrap[];
  readonly trappedAnimalIds: number[];
  readonly consumedBearTrapIds: string[];
  readonly bearTrapNotifications: string[];
}

/**
 * Summary: Updates placed traps every frame:
 *  - Attracts real world squirrels, rabbits, and predators toward armed traps.
 *  - Never triggers land traps empty without a real animal reaching the trap.
 *  - When a bear steps on a Heavy Steel Bear Trap (`trap_bear_jaw`), clamps the trap onto
 *    the bear's front paw, deals damage, makes the bear stop and roar on all fours (`'roar'`),
 *    then removes the trap and slows the bear by 10% for 7 seconds as it resumes chasing!
 *  - Handles fish traps (`trap_fish`) catching river trout / salmon in water.
 */
export function tickPlacedAnimalTraps(
  traps: IPlacedTrap[],
  activeAnimals: ISmallAnimalState[],
  dt: number,
  _totalElapsedSeconds: number
): ITickTrapsResult {
  setActivePlacedTrapsRef(traps);
  const newlySprungTraps: IPlacedTrap[] = [];
  const trappedAnimalIds: number[] = [];
  const consumedBearTrapIds: string[] = [];
  const bearTrapNotifications: string[] = [];

  for (let tIdx = traps.length - 1; tIdx >= 0; tIdx--) {
    const trap = traps[tIdx];

    // If a bird net trap was just sprung by the bird AI in boidsAndWildlifeSystem, emit its notification once
    if (trap.status === 'sprung') {
      if (!trap.notifiedSprung) {
        trap.notifiedSprung = true;
        newlySprungTraps.push(trap);
      }
      continue;
    }

    trap.armedDuration += dt;
    const recipe = TRAP_RECIPES.find((r) => r.kind === trap.kind);
    if (!recipe) continue;

    // Fish Trap (`trap_fish`): catches swimming fish in water after baseCatchTimeSec
    if (trap.kind === 'trap_fish') {
      if (trap.armedDuration >= recipe.baseCatchTimeSec) {
        const seed = Math.abs(Math.sin(trap.x * 12.9898 + trap.z * 78.233));
        const fishLevel = 1 + (Math.floor(seed * 10) % 3);
        const fishName = seed > 0.5 ? 'River Trout' : 'Silver Salmon';
        trap.status = 'sprung';
        trap.sprung = true;
        trap.notifiedSprung = true;
        trap.caughtSpecies = 'fish';
        trap.caughtAnimalLevel = fishLevel;
        trap.caughtAnimalName = fishName;
        trap.loot = generateCaughtAnimalLoot('fish', fishLevel, 'trap_fish');
        trap.xp = Math.round(recipe.xpReward * (1 + (fishLevel - 1) * 0.25));
        newlySprungTraps.push(trap);
      }
      continue;
    }

    // For Small Cage Trap and Wire Snare: after TRAP_SCENT_NOTICE_DELAY_SEC (10s) of scent dispersal,
    // ensure a woodland squirrel or rabbit notices the bait from a natural distance (~17.5m)
    // and cautiously approaches over time instead of rushing in immediately!
    if (
      (trap.kind === 'trap_cage_small' || trap.kind === 'trap_snare') &&
      trap.armedDuration >= TRAP_SCENT_NOTICE_DELAY_SEC
    ) {
      let hasNearbyCritter = false;
      for (let i = 0; i < activeAnimals.length; i++) {
        const a = activeAnimals[i];
        if (a.isDead || a.isLooted) continue;
        if (a.species !== 'squirrel' && a.species !== 'rabbit') continue;
        if (Math.hypot(a.x - trap.x, a.z - trap.z) <= recipe.attractRadius) {
          hasNearbyCritter = true;
          break;
        }
      }

      if (!hasNearbyCritter && !trap.luredCritterAssigned) {
        // Pick a live squirrel or rabbit (preferring squirrel if trap x+z hash is odd, rabbit if even, so both are common)
        const preferSquirrel = Math.abs(Math.round(trap.x + trap.z)) % 2 === 1;
        let candidate: ISmallAnimalState | null = null;
        for (let i = 0; i < activeAnimals.length; i++) {
          const a = activeAnimals[i];
          if (a.isDead || a.isLooted) continue;
          if (preferSquirrel ? a.species === 'squirrel' : a.species === 'rabbit') {
            candidate = a;
            break;
          }
        }
        if (!candidate) {
          for (let i = 0; i < activeAnimals.length; i++) {
            const a = activeAnimals[i];
            if (!a.isDead && !a.isLooted && (a.species === 'squirrel' || a.species === 'rabbit')) {
              candidate = a;
              break;
            }
          }
        }
        if (candidate) {
          const spawnAng = trap.yaw + Math.PI * 0.35;
          const spawnDist = 17.5;
          candidate.x = trap.x + Math.cos(spawnAng) * spawnDist;
          candidate.z = trap.z + Math.sin(spawnAng) * spawnDist;
          candidate.y = trap.y;
          candidate.homeX = trap.x;
          candidate.homeZ = trap.z;
          candidate.isResting = false;
          trap.luredCritterAssigned = true;
        }
      }
    }

    let triggered = false;
    let nearestTargetAnimal: ISmallAnimalState | null = null;
    let nearestTargetDist = Infinity;

    // 1. Check live world animals entering trigger distance or attraction radius
    for (let aIdx = 0; aIdx < activeAnimals.length; aIdx++) {
      const a = activeAnimals[aIdx];
      if (a.isDead || a.isLooted || a.isTamed || a.isMountedByPlayer) continue;
      if ((a.trappedByBearJawTimer ?? 0) > 0) continue;

      const speciesKey = a.species;
      if (!recipe.targetSpecies.includes(speciesKey)) continue;

      const dist = Math.hypot(a.x - trap.x, a.z - trap.z);
      if (dist < nearestTargetDist) {
        nearestTargetDist = dist;
        nearestTargetAnimal = a;
      }

      if (dist <= recipe.triggerRadius) {
        triggered = true;
        const animalLevel = a.level ?? 1;

        // Special behavior for Heavy Steel Bear Trap (`trap_bear_jaw`) on Bears:
        // Clamps onto the bear's front paw, stops it to roar on all 4s, deals damage,
        // then disappears after the roar animation and slows the bear by 10% for 7 seconds!
        if (trap.kind === 'trap_bear_jaw' && a.species === 'bear') {
          const bearDmg = 45;
          const curHp = a.hp ?? a.maxHp ?? 150;
          a.hp = Math.max(1, curHp - bearDmg);
          a.hitReactionTimer = 1.0;
          a.wokenUpTimer = 18.0;
          a.isResting = false;
          a.trappedByBearJawTimer = 2.4; // 4-legged roar animation duration while trap is clamped to paw
          a.bearTrapSlowTimer = 2.4 + 7.0; // 7.0 seconds of 10% speed reduction after roar finishes
          a.aiBehavior = 'roaring';
          a.actionTimer = 2.4;
          a.alertLevel = 'curious';
          a.vx = 0;
          a.vz = 0;

          consumedBearTrapIds.push(trap.id);
          traps.splice(tIdx, 1);
          bearTrapNotifications.push(
            `Bear Trap clamped onto Lv.${animalLevel} Bear's paw! (-${bearDmg} HP · Roaring · -10% Speed for 7s)`
          );
          break;
        }

        // Standard capture for small/medium game (squirrels, rabbits, etc.)
        trap.status = 'sprung';
        trap.sprung = true;
        trap.notifiedSprung = true;
        trap.caughtSpecies = speciesKey;
        trap.caughtAnimalLevel = animalLevel;
        trap.caughtAnimalName = `${speciesKey.charAt(0).toUpperCase() + speciesKey.slice(1)}`;
        trap.loot = generateCaughtAnimalLoot(speciesKey, animalLevel, trap.kind);
        trap.xp = Math.round(recipe.xpReward * (1 + (animalLevel - 1) * 0.25));

        a.isDead = true;
        a.hp = 0;
        a.isLooted = true;
        trappedAnimalIds.push(a.id);
        newlySprungTraps.push(trap);
        break;
      }
    }

    if (triggered) continue;

    // Only begin luring wildlife once the trap has been armed for at least TRAP_SCENT_NOTICE_DELAY_SEC (10s),
    // and only nudge predators here (squirrels & rabbits are cautiously steered in boidsAndWildlifeSystem.ts with sniffing pauses).
    if (
      trap.armedDuration >= TRAP_SCENT_NOTICE_DELAY_SEC &&
      nearestTargetAnimal &&
      nearestTargetDist <= recipe.attractRadius &&
      nearestTargetDist > 0.05 &&
      nearestTargetAnimal.species !== 'squirrel' &&
      nearestTargetAnimal.species !== 'rabbit'
    ) {
      const a = nearestTargetAnimal;
      const dirX = (trap.x - a.x) / nearestTargetDist;
      const dirZ = (trap.z - a.z) / nearestTargetDist;
      const lureSpeed =
        a.species === 'bear'
          ? 2.2 * ((a.bearTrapSlowTimer ?? 0) > 0 ? 0.9 : 1.0)
          : 1.85;
      a.isResting = false;
      a.vx = dirX * lureSpeed;
      a.vz = dirZ * lureSpeed;
      a.x += a.vx * dt;
      a.z += a.vz * dt;
      a.yaw = Math.atan2(a.vx, a.vz);
    }
  }

  return {
    newlySprungTraps,
    trappedAnimalIds,
    consumedBearTrapIds,
    bearTrapNotifications,
  };
}

/**
 * Summary: Finds the nearest placed trap within interaction radius.
 */
export function findNearestPlacedTrap(
  x: number,
  y: number,
  z: number,
  traps: readonly IPlacedTrap[],
  maxDist = 3.2
): IPlacedTrap | null {
  let best: IPlacedTrap | null = null;
  let bestDist = maxDist;

  for (let i = 0; i < traps.length; i++) {
    const t = traps[i];
    if (Math.abs(y - t.y) > 2.8) continue;
    const d = Math.hypot(x - t.x, z - t.z);
    if (d < bestDist) {
      bestDist = d;
      best = t;
    }
  }

  return best;
}

/**
 * Summary: Direct placement helper returning a new IPlacedTrap instance.
 */
export function placeAnimalTrap(
  trapItem: InventoryItemId,
  pos: { x: number; y: number; z: number },
  yaw: number
): IPlacedTrap {
  const recipe = TRAP_RECIPES.find((r) => r.itemId === trapItem) ?? TRAP_RECIPES[0];
  return {
    id: `trap-${recipe.kind}-${Date.now()}-${nextTrapIdCounter++}`,
    kind: recipe.kind,
    trapItemId: recipe.itemId,
    x: pos.x,
    y: pos.y + 0.05,
    z: pos.z,
    yaw,
    status: 'armed',
    sprung: false,
    armedDuration: 0,
  };
}

/**
 * Summary: Harvests prey loot and XP from a sprung trap into player inventory.
 */
export function harvestPlacedTrap(
  trap: IPlacedTrap,
  ownedItemIds: InventoryItemId[]
): {
  success: boolean;
  xpGained: number;
  notification: string;
  returnedTrapItem: InventoryItemId;
} {
  const res = collectSprungTrapLoot([trap], trap.id);
  for (const item of res.loot) {
    for (let q = 0; q < item.quantity; q++) {
      ownedItemIds.push(item.itemId);
    }
  }
  ownedItemIds.push(res.returnedItemId);
  const lootStr = res.loot
    .map((l) => `${l.quantity}x ${INVENTORY_ITEM_MAP.get(l.itemId)?.name ?? l.itemId}`)
    .join(', ');
  return {
    success: true,
    xpGained: res.xp,
    notification: `Harvested trap catch: ${res.caughtAnimalName ?? 'Game'} (Lv. ${res.caughtAnimalLevel ?? 1}) — ${lootStr} (+${res.xp} XP)`,
    returnedTrapItem: res.returnedItemId,
  };
}

/**
 * Summary: Retrieves an armed trap from the ground back to player inventory.
 */
export function pickupPlacedTrap(
  trap: IPlacedTrap,
  ownedItemIds: InventoryItemId[]
): { success: boolean; returnedTrapItem: InventoryItemId } {
  const res = pickupArmedTrap([trap], trap.id);
  const returnedItem =
    res.returnedItemId ??
    (TRAP_RECIPES.find((r) => r.kind === trap.kind)?.itemId ?? 'trap_cage_small');
  ownedItemIds.push(returnedItem);
  return {
    success: true,
    returnedTrapItem: returnedItem,
  };
}
// #endregion
