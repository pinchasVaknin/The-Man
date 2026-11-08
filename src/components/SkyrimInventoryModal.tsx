// ============================================================================
// MODULE: Components / Skyrim Inventory Modal
// DESIGN: Humble UI modal implementing Skyrim-style split-pane inventory (SRP)
// SUMMARY: Displays categories (Weapons, Ammo, Gear, Market, Skills), 3D item inspections,
//          gold transactions, hotbar slot bindings, and player attributes.
// ============================================================================

// ======================== IMPORTS & PROPS ======================== \\
// #region Imports & Props
import React, { useEffect, useState } from 'react';
import {
  INVENTORY_ITEMS,
  INVENTORY_ITEM_MAP,
  InventoryItemId,
  IInventoryItemDef,
  ICharacterSkillsState,
  getMarketSellPrice,
  getMarketStallCatalogItems,
  isStackableInventoryItem,
  requiresSellConfirmation,
  getAllSailableShips,
  isHarborShipDockOccupied,
  type ShipTierId,
  type ISailableShipState,
  type IBuyMarketItemPayload,
  type ISellMarketItemPayload,
  type MarketTransactionErrorCode,
} from '../world/terrainMath';
import { t } from '../locales';
import type { Result } from '../core/Result';
import { renderArtifactArtwork } from './itemArtworkRegistry';
export { renderArtifactArtwork };

/**
 * Summary: Enumerated navigation tabs for the Skyrim inventory modal dialog.
 * Design: Categorizes weapons, clothing, materials, ammunition, chest, and marketplace interactions.
 */
export type InventoryCategoryTab =
  | 'all'
  | 'weapons'
  | 'clothing'
  | 'traps'
  | 'materials'
  | 'food'
  | 'ammo'
  | 'gear'
  | 'treasures'
  | 'market'
  | 'chest'
  | 'skills';

/**
 * Summary: Props contract for Skyrim-style full-screen inventory modal dialog.
 * Design: Exposes inventory collections, equipment handlers, chest handlers, and market transaction dispatchers.
 */
export interface ISkyrimInventoryModalProps {
  selectedCategory: InventoryCategoryTab;
  onSelectCategory: (cat: InventoryCategoryTab) => void;
  selectedItemId: InventoryItemId;
  onSelectItem: (id: InventoryItemId) => void;
  isItemEquipped: (id: InventoryItemId) => boolean;
  isItemOwned: (id: InventoryItemId) => boolean;
  ownedItemIds?: readonly InventoryItemId[];
  goldCoins: number;
  favoriteIds: InventoryItemId[];
  hotbarSlots: (InventoryItemId | null)[];
  onEquipItem: (id: InventoryItemId) => void;
  onBuyItem: (
    id: InventoryItemId,
    quantity?: number
  ) => Result<IBuyMarketItemPayload, MarketTransactionErrorCode>;
  onSellItem: (id: InventoryItemId) => Result<ISellMarketItemPayload, MarketTransactionErrorCode>;
  onTakeChestItem?: (chestId: string, itemId: InventoryItemId, quantity?: number) => void;
  onStoreChestItem?: (chestId: string, itemId: InventoryItemId, quantity?: number) => void;
  onTakeAllChestItems?: (chestId: string) => number;
  onStoreAllChestItems?: (chestId: string) => number;
  onBuyShip?: (tierId: string) => { ok: boolean; message: string };
  godMode?: boolean;
  onToggleFavorite: (id: InventoryItemId) => void;
  onAssignHotbar: (slotIdx: number, id: InventoryItemId) => void;
  onClose: () => void;
  /** Display label of the key that closes the inventory (e.g. "Tab"). */
  closeKeyLabel: string;
  /** Display label of the key that equips or buys the selected item (e.g. "E"). */
  interactKeyLabel: string;
  nearbyMarket?: {
    id: string;
    name?: string;
    stock?: Partial<Record<InventoryItemId, number>>;
  } | null;
  nearbyChest?: {
    id: string;
    name: string;
    isOpened: boolean;
    contents: InventoryItemId[];
  } | null;
  skills?: ICharacterSkillsState;
  stamina?: number;
  maxStamina?: number;
  hp?: number;
  maxHp?: number;
  hunger?: number;
  maxHunger?: number;
  distanceWalked?: number;
  arrowsShotCount?: number;
}

export const ITEM_SHORT_NAMES: Record<InventoryItemId, string> = {
  bow: t('items.bow.short'),
  sword: t('items.sword.short'),
  woodcutter_axe: t('items.woodcutter_axe.short'),
  torch: t('items.torch.short'),
  unarmed: t('items.unarmed.short'),
  arrow_normal: t('items.arrow_normal.short'),
  arrow_fire: t('items.arrow_fire.short'),
  arrow_wind: t('items.arrow_wind.short'),
  oak_timber: t('items.oak_timber.short'),
  cut_granite_blocks: t('items.cut_granite_blocks.short'),
  iron_ingots: t('items.iron_ingots.short'),
  imperial_clay_tiles: t('items.imperial_clay_tiles.short'),
  marble_pillar_stone: t('items.marble_pillar_stone.short'),
  dwarven_gold_ore: t('items.dwarven_gold_ore.short'),
  crystal_gem: t('items.crystal_gem.short'),
  ancient_dwarven_horn: t('items.ancient_dwarven_horn.short'),
  simple_tunic: t('items.simple_tunic.short'),
  ranger_garb: t('items.ranger_garb.short'),
  elven_cloak: t('items.elven_cloak.short'),
  imperial_armor: t('items.imperial_armor.short'),
  katana_imperial: t('items.katana_imperial.short'),
  elven_longbow: t('items.elven_longbow.short'),
  dwarven_warhammer: t('items.dwarven_warhammer.short'),
  dragonbone_bow: t('items.dragonbone_bow.short'),
  celestial_jin_sword: t('items.celestial_jin_sword.short'),
  raw_game_meat: t('items.raw_game_meat.short'),
  roasted_meat: t('items.roasted_meat.short'),
  fresh_bread_loaf: t('items.fresh_bread_loaf.short'),
  harbor_cheese_wheel: t('items.harbor_cheese_wheel.short'),
  red_orchard_apples: t('items.red_orchard_apples.short'),
  small_hide: t('items.small_hide.short'),
  deer_hide: t('items.deer_hide.short'),
  sheep_hide: t('items.sheep_hide.short'),
  wolf_hide: t('items.wolf_hide.short'),
  jaguar_hide: t('items.jaguar_hide.short'),
  crocodile_hide: t('items.crocodile_hide.short'),
  bear_hide: t('items.bear_hide.short'),
  rhino_hide: t('items.rhino_hide.short'),
  deer_antlers: t('items.deer_antlers.short'),
  deer_meat: t('items.deer_meat.short'),
  bear_meat: t('items.bear_meat.short'),
  rotten_meat: t('items.rotten_meat.short'),
  animal_bone: t('items.animal_bone.short'),
  animal_fat: t('items.animal_fat.short'),
  bear_claws: t('items.bear_claws.short'),
  wolf_fang: t('items.wolf_fang.short'),
  crocodile_teeth: t('items.crocodile_teeth.short'),
  rhino_horn: t('items.rhino_horn.short'),
  dragon_meat: t('items.dragon_meat.short'),
  dragon_scales: t('items.dragon_scales.short'),
  dragon_horn: t('items.dragon_horn.short'),
  dragon_claws: t('items.dragon_claws.short'),
  dragon_bone: t('items.dragon_bone.short'),
  trap_cage_small: t('items.trap_cage_small.short'),
  trap_snare: t('items.trap_snare.short'),
  trap_bear_jaw: t('items.trap_bear_jaw.short'),
  trap_net: t('items.trap_net.short'),
  trap_fish: t('items.trap_fish.short'),
  twine_fiber: t('items.twine_fiber.short'),
  wild_berries: t('items.wild_berries.short'),
  grain_seeds: t('items.grain_seeds.short'),
};

const NON_SELLABLE_STARTER_IDS: InventoryItemId[] = ['unarmed'];
// #endregion

// ======================== MODAL COMPONENT ======================== \\
// #region Modal Component

function formatMarketError(error: MarketTransactionErrorCode): string {
  if (error === 'OUT_OF_STOCK') {
    return 'Out of stock — merchant restocks every few days.';
  }
  return t(`market.errors.${error}`);
}

export const SkyrimInventoryModal = React.memo<ISkyrimInventoryModalProps>(({
  selectedCategory,
  onSelectCategory,
  selectedItemId,
  onSelectItem,
  isItemEquipped,
  isItemOwned,
  ownedItemIds,
  goldCoins,
  hotbarSlots,
  onEquipItem,
  onBuyItem,
  onSellItem,
  onTakeChestItem,
  onStoreChestItem,
  onTakeAllChestItems,
  onStoreAllChestItems,
  onBuyShip,
  godMode = false,
  onAssignHotbar,
  onClose,
  closeKeyLabel,
  interactKeyLabel,
  nearbyMarket,
  nearbyChest,
  skills,
  hp = 100,
  maxHp = 100,
  hunger = 100,
  maxHunger = 100,
}) => {
  const [tradeFeedback, setTradeFeedback] = useState<string | null>(null);
  const [pendingRareSaleId, setPendingRareSaleId] = useState<InventoryItemId | null>(null);
  const [buyQuantity, setBuyQuantity] = useState<number>(1);
  const [selectedShipTier, setSelectedShipTier] = useState<ShipTierId>('sloop');
  const [, setShipTick] = useState(0);

  useEffect(() => {
    setBuyQuantity(1);
  }, [selectedItemId]);

  const getOwnedCount = (itemId: InventoryItemId): number => {
    if (!ownedItemIds) return isItemOwned(itemId) ? 1 : 0;
    let count = 0;
    for (let i = 0; i < ownedItemIds.length; i++) {
      if (ownedItemIds[i] === itemId) count++;
    }
    return count;
  };

  const getChestCount = (itemId: InventoryItemId): number => {
    const contents = nearbyChest?.contents;
    if (!contents) return 0;
    let count = 0;
    for (let i = 0; i < contents.length; i++) {
      if (contents[i] === itemId) count++;
    }
    return count;
  };

  const getMerchantStockCount = (itemId: InventoryItemId): number => {
    if (nearbyMarket?.stock) {
      return nearbyMarket.stock[itemId] ?? 0;
    }
    const def = INVENTORY_ITEM_MAP.get(itemId);
    if (!def) return 0;
    return def.category === 'ammo' ? 10 : def.category === 'food' ? 8 : def.category === 'materials' ? 6 : 1;
  };

  const performSell = (itemId: InventoryItemId): void => {
    const res = onSellItem(itemId);
    setTradeFeedback(
      res.isSuccess ? t('interactions.sold_success', { gold: res.value.soldForGold }) : formatMarketError(res.error)
    );
  };

  const requestSell = (itemId: InventoryItemId): void => {
    if (requiresSellConfirmation(itemId)) {
      setPendingRareSaleId(itemId);
      return;
    }
    performSell(itemId);
  };

  const pendingRareSaleItem = pendingRareSaleId ? INVENTORY_ITEM_MAP.get(pendingRareSaleId) : undefined;
  const [tradeSide, setTradeSide] = useState<'player' | 'merchant'>('merchant');
  const [playerMarketCat, setPlayerMarketCat] = useState<'all' | 'weapons' | 'clothing' | 'traps' | 'materials' | 'food'>('all');
  const [merchantMarketCat, setMerchantMarketCat] = useState<'all' | 'weapons' | 'clothing' | 'traps' | 'materials' | 'food'>('all');

  const s: ICharacterSkillsState = skills ?? {
    archeryLevel: 1,
    archeryXp: 0,
    archeryXpNext: 240,
    swordsmanshipLevel: 1,
    swordsmanshipXp: 0,
    swordsmanshipXpNext: 240,
    horsemanshipLevel: 1,
    horsemanshipXp: 0,
    horsemanshipXpNext: 240,
    athleticsLevel: 1,
    athleticsXp: 0,
    athleticsXpNext: 240,
    explorationLevel: 1,
    explorationXp: 0,
    explorationXpNext: 240,
  };

  const totalSkillLevels =
    s.archeryLevel +
    s.swordsmanshipLevel +
    s.horsemanshipLevel +
    s.athleticsLevel +
    s.explorationLevel;
  const overallHeroLevel = Math.max(1, 1 + Math.floor((totalSkillLevels - 5) / 2));

  const inChestModal = Boolean(nearbyChest && selectedCategory === 'chest');
  const isShipwrightMarket = Boolean(
    !inChestModal && nearbyMarket?.id === 'market-harbor-shipwright'
  );
  const inHarborMarket = Boolean(nearbyMarket && !inChestModal);
  const inSplitContainerMode = inHarborMarket || inChestModal;
  const allShips: readonly ISailableShipState[] = isShipwrightMarket ? getAllSailableShips() : [];
  const inspectedShip: ISailableShipState | null = isShipwrightMarket
    ? (allShips.find((sh) => sh.tierId === selectedShipTier) ?? allShips[0] ?? null)
    : null;
  const dockBlockingShip = isShipwrightMarket ? isHarborShipDockOccupied(18.0) : null;

  // Personal Inventory Mode (Outside Market/Chest): ONLY show items currently owned by the player!
  const activePersonalTab: 'weapons' | 'clothing' | 'traps' | 'materials' | 'food' =
    selectedCategory === 'food'
      ? 'food'
      : selectedCategory === 'clothing'
        ? 'clothing'
        : selectedCategory === 'traps' || selectedCategory === 'gear'
          ? 'traps'
          : selectedCategory === 'materials' || selectedCategory === 'treasures'
            ? 'materials'
            : 'weapons';

  const ownedPersonalItems: readonly IInventoryItemDef[] = INVENTORY_ITEMS.filter((item) => {
    if (!isItemOwned(item.id)) return false;
    if (activePersonalTab === 'food') {
      return item.category === 'food';
    }
    if (activePersonalTab === 'clothing') {
      return item.category === 'clothing';
    }
    if (activePersonalTab === 'traps') {
      return item.id.startsWith('trap_');
    }
    if (activePersonalTab === 'materials') {
      return item.category === 'materials';
    }
    return item.category === 'weapons' || item.category === 'ammo' || item.id === 'torch';
  });

  // Left Column = Player's Owned Items
  const playerOwnedMarketItems: readonly IInventoryItemDef[] = INVENTORY_ITEMS.filter((item) => {
    if (!isItemOwned(item.id) || item.id === 'unarmed') return false;
    if (playerMarketCat === 'weapons') {
      return item.category === 'weapons' || item.category === 'ammo' || item.id === 'torch';
    }
    if (playerMarketCat === 'clothing') {
      return item.category === 'clothing';
    }
    if (playerMarketCat === 'traps') {
      return item.id.startsWith('trap_');
    }
    if (playerMarketCat === 'materials') {
      return item.category === 'materials';
    }
    if (playerMarketCat === 'food') {
      return item.category === 'food';
    }
    return true;
  });

  // Right Column = Merchant's Stock (including player-sold items, hiding 0-stock items) OR Chest Contents
  const rightColumnItems: readonly IInventoryItemDef[] = (() => {
    const baseItems: readonly IInventoryItemDef[] = inChestModal
      ? Array.from(new Set(nearbyChest?.contents ?? []))
          .map((id) => INVENTORY_ITEM_MAP.get(id))
          .filter((d): d is IInventoryItemDef => Boolean(d))
      : nearbyMarket?.stock
        ? INVENTORY_ITEMS.filter(
            (item) => item.id !== 'unarmed' && (nearbyMarket.stock?.[item.id] ?? 0) > 0
          )
        : getMarketStallCatalogItems(nearbyMarket?.id);

    return baseItems.filter((item) => {
      if (merchantMarketCat === 'weapons') {
        return item.category === 'weapons' || item.category === 'ammo' || item.id === 'torch';
      }
      if (merchantMarketCat === 'clothing') {
        return item.category === 'clothing';
      }
      if (merchantMarketCat === 'traps') {
        return item.id.startsWith('trap_');
      }
      if (merchantMarketCat === 'materials') {
        return item.category === 'materials';
      }
      if (merchantMarketCat === 'food') {
        return item.category === 'food';
      }
      return true;
    });
  })();

  const inspectedItem: IInventoryItemDef | null = (() => {
    if (!inSplitContainerMode) {
      if (ownedPersonalItems.length === 0) return null;
      return (
        ownedPersonalItems.find((i) => i.id === selectedItemId) ??
        ownedPersonalItems[0] ??
        null
      );
    }
    if (tradeSide === 'player') {
      return (
        playerOwnedMarketItems.find((i) => i.id === selectedItemId) ??
        playerOwnedMarketItems[0] ??
        null
      );
    }
    return (
      rightColumnItems.find((i) => i.id === selectedItemId) ??
      rightColumnItems[0] ??
      null
    );
  })();

  const inspectedOwned = inspectedItem ? isItemOwned(inspectedItem.id) : false;
  const inspectedEquipped = inspectedItem ? isItemEquipped(inspectedItem.id) : false;
  const inspectedStackable = inspectedItem ? isStackableInventoryItem(inspectedItem.id) : false;
  const inspectedReqLevel = inspectedItem?.requiredLevel ?? 1;
  const inspectedLevelLocked =
    Boolean(inspectedItem) && !inspectedOwned && !inspectedStackable && overallHeroLevel < inspectedReqLevel;
  const inspectedSellPrice = inspectedItem ? getMarketSellPrice(inspectedItem) : 0;
  const canSellInspected =
    inHarborMarket &&
    Boolean(inspectedItem) &&
    inspectedOwned &&
    !NON_SELLABLE_STARTER_IDS.includes(inspectedItem!.id) &&
    inspectedSellPrice > 0;

  const inspectedMerchantStock = inspectedItem ? getMerchantStockCount(inspectedItem.id) : 0;
  const maxAffordableQty = inspectedItem
    ? Math.max(1, Math.min(50, Math.floor(goldCoins / Math.max(1, inspectedItem.valueGold))))
    : 1;
  const sliderMaxQty = inspectedItem
    ? Math.max(1, Math.min(inspectedMerchantStock || 10, Math.max(10, maxAffordableQty)))
    : 10;
  const effectiveBuyQty = inspectedStackable
    ? Math.max(1, Math.min(sliderMaxQty, buyQuantity))
    : 1;
  const totalBuyPrice = inspectedItem ? inspectedItem.valueGold * effectiveBuyQty : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('ui.inventory_aria')}
      data-testid="skyrim-inventory-modal"
      className="fixed inset-0 z-30 flex flex-col justify-between p-4 sm:p-7 pointer-events-auto select-none overflow-hidden"
      style={{
        background:
          'linear-gradient(90deg, rgba(8, 10, 12, 0.92) 0%, rgba(12, 15, 18, 0.86) 50%, rgba(8, 10, 12, 0.92) 100%)',
        backdropFilter: 'blur(12px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Minimal Header Bar */}
      <header className="w-full max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-stone-700/60">
        <div className="flex flex-wrap items-center gap-5">
          <h1 className="font-display-he text-2xl sm:text-3xl font-bold text-stone-100 tracking-wide">
            {inChestModal
              ? nearbyChest?.name ?? "Hunter's Cabin Chest"
              : inHarborMarket
                ? t('market.hud.harbor_market_title', { market: nearbyMarket?.name ?? '' })
                : t('ui.personal_gear_title')}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-stone-300">
            <span>
              {t('ui.hero_level_label')}
              <strong className="text-amber-300 font-mono-tabular">{overallHeroLevel}</strong>
            </span>
            <span className="text-stone-600">|</span>
            <span data-testid="inventory-gold-display">
              {t('ui.gold_label')}
              <strong className="text-amber-400 font-mono-tabular">{goldCoins}</strong>
            </span>
            <span className="text-stone-600">|</span>
            <span data-testid="inventory-hp-display" className="flex items-center gap-1.5">
              <span className="text-rose-400 font-semibold">HP:</span>
              <strong className="text-rose-300 font-mono-tabular">
                {Math.round(hp)}/{Math.round(maxHp)}
              </strong>
            </span>
            <span className="text-stone-600">|</span>
            <span data-testid="inventory-hunger-display" className="flex items-center gap-1.5">
              <span className="text-amber-400 font-semibold">Hunger:</span>
              <strong className="text-amber-200 font-mono-tabular">
                {Math.round(hunger)}/{Math.round(maxHunger)}
              </strong>
            </span>
          </div>
        </div>

        <button
          type="button"
          data-testid="close-skyrim-inventory"
          onClick={onClose}
          className="text-sm font-semibold text-stone-300 hover:text-amber-300 transition-colors cursor-pointer px-3 py-1.5"
        >
          {t('ui.close_inventory', { key: closeKeyLabel })}
        </button>
      </header>

      {inSplitContainerMode ? (
        /* =====================================================================
           HARBOR MARKET OR CHEST SPLIT 3-COLUMN LAYOUT (Left = Player, Center = Showcase, Right = Merchant/Chest)
           ===================================================================== */
        <div
          data-testid="harbor-market-split-layout"
          className="w-full max-w-7xl mx-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 py-4 overflow-hidden items-stretch"
        >
          {/* PHYSICAL LEFT COLUMN (Left screen - Player-owned items) */}
          <div
            data-testid="market-left-player-column"
            className="md:col-span-4 flex flex-col h-full max-h-[75vh] bg-stone-900/55 border border-stone-700/60 p-4 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-stone-700/70">
              <div>
                <h2 className="font-display-he text-xl font-bold text-amber-300">
                  {isShipwrightMarket ? 'Owned Fleet' : t('ui.my_gear_left')}
                </h2>
                <p className="text-xs text-stone-400">
                  {isShipwrightMarket
                    ? 'Commissioned ships appear on the World Map [M] and at the Harbor Pier'
                    : inChestModal
                      ? 'Select an item to store in the chest or equip'
                      : t('ui.my_gear_hint')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {inChestModal && nearbyChest && (
                  <button
                    type="button"
                    data-testid="chest-store-all-btn"
                    onClick={() => {
                      const storedCount = onStoreAllChestItems?.(nearbyChest.id) ?? 0;
                      setTradeFeedback(
                        storedCount > 0
                          ? `Stored ${storedCount} unequipped item${storedCount === 1 ? '' : 's'} in the chest.`
                          : 'No unequipped items to store.'
                      );
                    }}
                    className="px-2.5 py-1 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-stone-950 transition-colors cursor-pointer"
                    title="Store all unequipped items in chest [Y]"
                  >
                    Store All [Y]
                  </button>
                )}
                <span className="text-xs font-mono-tabular text-stone-300 bg-stone-800/80 px-2 py-0.5">
                  {isShipwrightMarket
                    ? `${allShips.filter((sh) => sh.spawned).length} / ${allShips.length}`
                    : t('ui.items_count', { count: playerOwnedMarketItems.length })}
                </span>
              </div>
            </div>

            {isShipwrightMarket ? (
              <div
                data-testid="shipwright-owned-fleet-list"
                className="flex-1 overflow-y-auto space-y-2 pr-1"
              >
                {allShips.filter((sh) => sh.spawned).length === 0 ? (
                  <div className="py-10 text-center text-xs text-stone-400">
                    You do not own any active ships yet. Select a ship from the catalog on the right to commission it!
                  </div>
                ) : (
                  allShips
                    .filter((sh) => sh.spawned)
                    .map((sh) => {
                      const isSelected = inspectedShip?.tierId === sh.tierId;
                      return (
                        <button
                          key={sh.id}
                          type="button"
                          data-testid={`owned-ship-item-${sh.tierId}`}
                          onClick={() => {
                            setSelectedShipTier(sh.tierId);
                            setTradeFeedback(null);
                          }}
                          className={`w-full flex flex-col gap-1 px-3 py-2.5 text-left transition-colors cursor-pointer border-l-2 ${
                            isSelected
                              ? 'border-amber-400 bg-amber-950/40 text-white font-bold'
                              : 'border-transparent text-stone-300 hover:bg-stone-800/50 hover:text-stone-100'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-sm font-bold text-amber-200">{sh.name}</span>
                            <span className="px-1.5 py-0.5 text-[10px] font-mono-tabular bg-emerald-950/80 border border-emerald-400/40 text-emerald-300">
                              Owned · On Map [M]
                            </span>
                          </div>
                          <span className="text-[11px] font-mono-tabular text-stone-400">
                            Position: ({Math.round(sh.x)}, {Math.round(sh.z)}) · Top Speed:{' '}
                            {sh.sprintForwardSpeed} kt
                          </span>
                        </button>
                      );
                    })
                )}
              </div>
            ) : (
              <>
                {/* Category Filter for Player's Owned Items */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {(
                    [
                      ['all', t('ui.all_filter')],
                      ['weapons', t('ui.weapons_filter')],
                      ['clothing', t('ui.clothing_filter')],
                      ['traps', t('ui.traps_filter')],
                      ['materials', t('ui.materials_filter')],
                      ['food', t('ui.food_filter')],
                    ] as const
                  ).map(([catKey, label]) => (
                    <button
                      key={catKey}
                      type="button"
                      data-testid={`player-market-filter-${catKey}`}
                      onClick={() => setPlayerMarketCat(catKey)}
                      className={`px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                        playerMarketCat === catKey
                          ? 'bg-amber-400 text-stone-950'
                          : 'bg-stone-800/70 text-stone-300 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div
                  data-testid="market-player-owned-list"
                  className="flex-1 overflow-y-auto space-y-1.5 pr-1"
                >
                  {playerOwnedMarketItems.map((item) => {
                    const isSelected = inspectedItem?.id === item.id && tradeSide === 'player';
                    const equipped = isItemEquipped(item.id);
                    const sellVal = getMarketSellPrice(item);
                    const count = getOwnedCount(item.id);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-testid={`player-market-item-${item.id}`}
                        onClick={() => {
                          setTradeSide('player');
                          onSelectItem(item.id);
                          setTradeFeedback(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-right transition-colors cursor-pointer border-r-2 ${
                          isSelected
                            ? 'border-amber-400 bg-amber-950/40 text-white font-bold'
                            : 'border-transparent text-stone-300 hover:bg-stone-800/50 hover:text-stone-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate text-sm sm:text-base">{item.name}</span>
                          {count > 1 && (
                            <span className="px-1.5 py-0.5 text-[11px] font-mono-tabular font-bold bg-stone-800 text-amber-200">
                              ×{count}
                            </span>
                          )}
                          {equipped && (
                            <span className="text-[11px] font-semibold text-amber-300 shrink-0">
                              {t('interactions.equipped_label')}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono-tabular text-amber-300 shrink-0">
                          {inChestModal ? 'Store →' : t('interactions.sell_tag', { price: sellVal })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* PHYSICAL CENTER COLUMN (Center screen - Item inspection & buy/sell/take/store actions) */}
          <div
            data-testid="market-center-showcase"
            className="md:col-span-4 flex flex-col items-center justify-center text-center bg-stone-950/65 border border-stone-700/70 p-5 overflow-y-auto"
          >
            {inChestModal && (
              <div
                data-testid="chest-opened-effect-banner"
                className="w-full px-3 py-1.5 mb-3 text-xs font-bold text-amber-200 bg-amber-950/50 border border-amber-400/50 flex items-center justify-center gap-2 animate-pulse"
              >
                <span>✨ {nearbyChest?.name ?? 'Chest'} Opened</span>
              </div>
            )}

            {isShipwrightMarket && inspectedShip ? (
              <div data-testid="shipwright-center-showcase" className="w-full flex flex-col items-center">
                <div className="px-3 py-1 text-xs font-bold mb-3 border bg-sky-950/60 border-sky-400/50 text-sky-200">
                  ⚓ Royal Galleon Shipyard · Harbor Shipwright
                </div>

                {/* Naval Ship Silhouette & Compass Artwork */}
                <div className="relative w-36 h-36 flex items-center justify-center mb-3 bg-stone-900/80 border border-amber-500/35">
                  <svg viewBox="0 0 96 96" className="w-28 h-28">
                    <path
                      d="M14 64 L82 64 L72 78 L24 78 Z"
                      fill="#78350f"
                      stroke="#fbbf24"
                      strokeWidth="2"
                    />
                    <line x1="48" y1="16" x2="48" y2="64" stroke="#d97706" strokeWidth="3" />
                    <path
                      d="M48 18 Q68 32 64 54 L48 54 Z"
                      fill="#fef3c7"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                    />
                    {inspectedShip.tierId !== 'sloop' && (
                      <>
                        <line x1="30" y1="24" x2="30" y2="64" stroke="#b45309" strokeWidth="2.5" />
                        <path
                          d="M30 26 Q43 36 41 54 L30 54 Z"
                          fill="#fde68a"
                          stroke="#d97706"
                          strokeWidth="1.2"
                        />
                      </>
                    )}
                    <path
                      d="M8 80 Q28 75 48 80 T88 80"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                    />
                  </svg>
                </div>

                <h2
                  data-testid="inspected-ship-title"
                  className="font-display-he text-xl sm:text-2xl font-bold text-white mb-2"
                >
                  {inspectedShip.name}
                </h2>

                <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-stone-300 mb-3">
                  <span className="text-sky-300 font-semibold font-mono-tabular">
                    Cruise Speed: {inspectedShip.maxForwardSpeed} kt
                  </span>
                  <span className="text-stone-600">·</span>
                  <span className="text-amber-300 font-semibold font-mono-tabular">
                    Full Sail Speed: {inspectedShip.sprintForwardSpeed} kt
                  </span>
                </div>

                <p className="max-w-sm text-xs sm:text-sm text-stone-300/90 leading-relaxed mb-3">
                  {inspectedShip.description}
                </p>

                <div className="mb-3 px-3 py-1.5 text-xs font-mono-tabular font-bold bg-stone-900/90 border border-stone-700 text-amber-300">
                  {godMode
                    ? `Price: Free (0 🪙 in God Mode)`
                    : `Purchase Price: ${inspectedShip.priceGold} 🪙 Gold`}
                </div>

                {dockBlockingShip && !inspectedShip.spawned && (
                  <div
                    data-testid="shipwright-dock-occupied-warning"
                    className="w-full mb-3 px-3 py-2 text-xs font-bold text-rose-200 bg-rose-950/75 border border-rose-500/50"
                  >
                    ⚠️ The Harbor Pier is currently occupied by {dockBlockingShip.name}! Sail it away from the dock before commissioning another ship.
                  </div>
                )}

                {tradeFeedback && (
                  <div
                    data-testid="trade-feedback-banner"
                    className="w-full mb-3 px-4 py-1.5 text-xs font-bold text-amber-200 bg-stone-900/95 border border-amber-400/50"
                  >
                    {tradeFeedback}
                  </div>
                )}

                {inspectedShip.spawned ? (
                  <div
                    data-testid="shipwright-already-owned-badge"
                    className="w-full py-2.5 px-4 text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/50"
                  >
                    ✓ Ship Owned · Moored at Harbor & Tracked on World Map [M]
                  </div>
                ) : (
                  <button
                    type="button"
                    data-testid="shipwright-buy-ship-btn"
                    disabled={
                      Boolean(dockBlockingShip) ||
                      (!godMode && goldCoins < inspectedShip.priceGold)
                    }
                    onClick={() => {
                      const res = onBuyShip?.(inspectedShip.tierId);
                      if (res) {
                        setTradeFeedback(res.message);
                        setShipTick((n) => n + 1);
                      }
                    }}
                    className={`w-full py-2.5 px-5 text-sm font-bold transition-colors ${
                      dockBlockingShip
                        ? 'bg-rose-950/80 text-rose-200 border border-rose-500/40 cursor-not-allowed'
                        : !godMode && goldCoins < inspectedShip.priceGold
                          ? 'bg-stone-800 text-stone-400 cursor-not-allowed'
                          : 'bg-emerald-400 hover:bg-emerald-300 text-stone-950 cursor-pointer'
                    }`}
                  >
                    {dockBlockingShip
                      ? 'Harbor Pier Occupied — Clear Existing Ship First'
                      : !godMode && goldCoins < inspectedShip.priceGold
                        ? `Insufficient Gold (${inspectedShip.priceGold} 🪙)`
                        : godMode
                          ? `Commission & Launch at Pier (Free · God Mode) [${interactKeyLabel}]`
                          : `Purchase & Launch at Pier (${inspectedShip.priceGold} 🪙) [${interactKeyLabel}]`}
                  </button>
                )}
              </div>
            ) : inspectedItem ? (
              <>
                <div
                  className={`px-3 py-1 text-xs font-bold mb-3 border ${
                    tradeSide === 'player'
                      ? 'bg-amber-950/60 border-amber-400/50 text-amber-200'
                      : 'bg-emerald-950/60 border-emerald-400/50 text-emerald-200'
                  }`}
                >
                  {tradeSide === 'player'
                    ? t('ui.selected_from_my_list')
                    : inChestModal
                      ? 'Selected from Chest'
                      : t('ui.selected_from_merchant_list')}
                </div>

                <div className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center mb-3">
                  {renderArtifactArtwork(inspectedItem.id, 'w-36 h-36 sm:w-40 sm:h-40')}
                </div>

                <div className="text-xs font-semibold text-amber-300/90 tracking-wide mb-1">
                  {t('ui.category_required_level', {
                    category: inspectedItem.categoryLabel ?? '',
                    level: inspectedReqLevel,
                  })}
                </div>
                <h2
                  data-testid="inspected-item-title"
                  className="font-display-he text-2xl sm:text-3xl font-bold text-white mb-2"
                >
                  {inspectedItem.name}
                </h2>

                <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-stone-300 mb-3">
                  <span className="text-amber-200 font-semibold">{inspectedItem.statLabel}</span>
                  <span className="text-stone-600">·</span>
                  <span>{t('ui.weight_label', { weight: inspectedItem.weight })}</span>
                  <span className="text-stone-600">·</span>
                  <span>
                    {tradeSide === 'player'
                      ? t('interactions.inspected_sell_tag', { price: inspectedSellPrice })
                      : t('interactions.inspected_buy_tag', { price: inspectedItem.valueGold })}
                  </span>
                </div>

                <p className="max-w-sm text-xs sm:text-sm text-stone-300/90 leading-relaxed mb-3">
                  {inspectedItem.description}
                </p>

                {tradeFeedback && (
                  <div
                    data-testid="trade-feedback-banner"
                    className="mb-3 px-4 py-1.5 text-xs font-bold text-amber-200 bg-stone-900/95 border border-amber-400/50"
                  >
                    {tradeFeedback}
                  </div>
                )}

                {/* Quantity Slider when buying stackable items (Ammo, Materials, Food) in Market */}
                {inHarborMarket && tradeSide === 'merchant' && inspectedStackable && (
                  <div
                    data-testid="buy-quantity-slider-box"
                    className="w-full mb-3 p-3 bg-stone-900/90 border border-stone-700/80 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-300 font-semibold">
                        Quantity: <strong className="text-emerald-300 font-mono-tabular">×{effectiveBuyQty}</strong>
                      </span>
                      <span className="text-amber-300 font-mono-tabular font-bold">
                        {effectiveBuyQty} × {inspectedItem.valueGold} = {totalBuyPrice} 🪙
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid="buy-qty-minus"
                        onClick={() => setBuyQuantity((q) => Math.max(1, q - 1))}
                        className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold cursor-pointer"
                      >
                        −
                      </button>
                      <input
                        type="range"
                        data-testid="buy-quantity-slider"
                        min={1}
                        max={sliderMaxQty}
                        value={effectiveBuyQty}
                        onChange={(e) => setBuyQuantity(Number(e.target.value))}
                        className="flex-1 accent-emerald-400 cursor-pointer"
                      />
                      <button
                        type="button"
                        data-testid="buy-qty-plus"
                        onClick={() => setBuyQuantity((q) => Math.min(sliderMaxQty, q + 1))}
                        className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold cursor-pointer"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        data-testid="buy-qty-plus5"
                        onClick={() => setBuyQuantity((q) => Math.min(sliderMaxQty, q + 5))}
                        className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-emerald-300 text-xs font-mono-tabular font-bold cursor-pointer"
                      >
                        +5
                      </button>
                    </div>
                  </div>
                )}

                {/* Center Action Buttons based on Chest vs Market and Left (Player) vs Right (Chest/Merchant) */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
                  {inChestModal ? (
                    tradeSide === 'player' ? (
                      <>
                        {inspectedOwned && !NON_SELLABLE_STARTER_IDS.includes(inspectedItem.id) && (
                          <button
                            type="button"
                            data-testid="chest-store-btn"
                            onClick={() => {
                              if (nearbyChest) {
                                onStoreChestItem?.(nearbyChest.id, inspectedItem.id, 1);
                                setTradeFeedback(`Stored ${inspectedItem.name} in chest.`);
                              }
                            }}
                            className="w-full py-2.5 px-5 text-sm font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 transition-colors cursor-pointer"
                          >
                            Store in Chest [{interactKeyLabel}]
                          </button>
                        )}
                        {inspectedOwned && inspectedItem.category !== 'materials' && (
                          <button
                            type="button"
                            data-testid="skyrim-equip-btn"
                            onClick={() => onEquipItem(inspectedItem.id)}
                            className="w-full py-2 px-4 text-xs font-bold text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-600 transition-colors cursor-pointer"
                          >
                            {inspectedItem.category === 'food'
                              ? `Eat (${inspectedItem.name}) [R]`
                              : inspectedEquipped
                                ? t('interactions.equipped_now', { key: 'R' })
                                : t('interactions.equip_action', { key: 'R' })}
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        data-testid="chest-take-btn"
                        disabled={getChestCount(inspectedItem.id) <= 0}
                        onClick={() => {
                          if (nearbyChest) {
                            onTakeChestItem?.(nearbyChest.id, inspectedItem.id, 1);
                            setTradeFeedback(`Took ${inspectedItem.name} from chest.`);
                          }
                        }}
                        className="w-full py-2.5 px-5 text-sm font-bold text-stone-950 bg-emerald-400 hover:bg-emerald-300 transition-colors cursor-pointer"
                      >
                        Take from Chest [{interactKeyLabel}]
                      </button>
                    )
                  ) : tradeSide === 'player' ? (
                    <>
                      {canSellInspected && (
                        <button
                          type="button"
                          data-testid="skyrim-sell-btn"
                          onClick={() => requestSell(inspectedItem.id)}
                          className="w-full py-2.5 px-5 text-sm font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 transition-colors cursor-pointer"
                        >
                          {t('interactions.sell_action', { price: inspectedSellPrice })}
                        </button>
                      )}
                      {inspectedOwned && inspectedItem.category !== 'materials' && (
                        <button
                          type="button"
                          data-testid="skyrim-equip-btn"
                          onClick={() => onEquipItem(inspectedItem.id)}
                          className="w-full py-2 px-4 text-xs font-bold text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-600 transition-colors cursor-pointer"
                        >
                          {inspectedItem.category === 'food'
                            ? `Eat (${inspectedItem.name}) [${interactKeyLabel}]`
                            : inspectedEquipped
                              ? t('interactions.equipped_now', { key: interactKeyLabel })
                              : t('interactions.equip_action', { key: interactKeyLabel })}
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {!inspectedOwned || inspectedStackable ? (
                        <button
                          type="button"
                          data-testid="skyrim-buy-btn"
                          disabled={inspectedLevelLocked || goldCoins < totalBuyPrice}
                          onClick={() => {
                            const res = onBuyItem(inspectedItem.id, effectiveBuyQty);
                            setTradeFeedback(
                              res.isSuccess
                                ? effectiveBuyQty > 1
                                  ? `${t('interactions.purchased_success')} (×${effectiveBuyQty})`
                                  : t('interactions.purchased_success')
                                : formatMarketError(res.error)
                            );
                          }}
                          className={`w-full py-2.5 px-5 text-sm font-bold transition-colors ${
                            inspectedLevelLocked
                              ? 'bg-rose-950/80 text-rose-200 border border-rose-500/40 cursor-not-allowed'
                              : goldCoins < totalBuyPrice
                                ? 'bg-stone-800 text-stone-400 cursor-not-allowed'
                                : 'bg-emerald-400 hover:bg-emerald-300 text-stone-950 cursor-pointer'
                          }`}
                        >
                          {inspectedLevelLocked
                            ? t('interactions.level_insufficient', { level: inspectedReqLevel })
                            : goldCoins < totalBuyPrice
                              ? t('interactions.gold_insufficient', { price: totalBuyPrice })
                              : effectiveBuyQty > 1
                                ? `Buy ×${effectiveBuyQty} (${totalBuyPrice} 🪙)`
                                : t('interactions.buy_action', { price: totalBuyPrice })}
                        </button>
                      ) : (
                        <div className="w-full flex flex-col gap-2">
                          <div className="py-2 px-4 text-xs font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-500/40">
                            {t('interactions.already_owned_notice')}
                          </div>
                          {canSellInspected && (
                            <button
                              type="button"
                              data-testid="skyrim-sell-btn"
                              onClick={() => requestSell(inspectedItem.id)}
                              className="w-full py-2 px-4 text-xs font-bold text-amber-200 bg-stone-800 hover:bg-stone-700 border border-amber-400/40 cursor-pointer"
                            >
                              {t('interactions.sell_short', { price: inspectedSellPrice })}
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              <div
                data-testid="empty-showcase-placeholder"
                className="flex flex-col items-center justify-center text-stone-500 py-12"
              >
                <p className="text-sm font-medium">
                  {inChestModal && rightColumnItems.length === 0
                    ? 'The chest is empty.'
                    : 'No items in this category.'}
                </p>
              </div>
            )}
          </div>

          {/* PHYSICAL RIGHT COLUMN (Right screen - Merchant catalog OR Chest contents) */}
          <div
            data-testid="market-right-merchant-column"
            className="md:col-span-4 flex flex-col h-full max-h-[75vh] bg-stone-900/55 border border-stone-700/60 p-4 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-stone-700/70">
              <div>
                <h2 className="font-display-he text-xl font-bold text-emerald-300">
                  {isShipwrightMarket
                    ? 'Harbor Shipyard Catalog (4 Ship Classes)'
                    : inChestModal
                      ? nearbyChest?.name ?? "Hunter's Cabin Chest"
                      : t('ui.merchant_goods_right')}
                </h2>
                <p className="text-xs text-stone-400">
                  {isShipwrightMarket
                    ? 'Max 1 ship owned per class · Appears at the Harbor Pier & World Map'
                    : inChestModal
                      ? 'Select an item from the chest to take'
                      : t('ui.merchant_goods_hint')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {inChestModal && nearbyChest && (
                  <button
                    type="button"
                    data-testid="chest-take-all-btn"
                    disabled={(nearbyChest.contents?.length ?? 0) === 0}
                    onClick={() => {
                      const takenCount = onTakeAllChestItems?.(nearbyChest.id) ?? 0;
                      setTradeFeedback(
                        takenCount > 0
                          ? `Took ${takenCount} item${takenCount === 1 ? '' : 's'} from the chest.`
                          : 'Chest is empty.'
                      );
                    }}
                    className={`px-2.5 py-1 text-xs font-bold transition-colors ${
                      (nearbyChest.contents?.length ?? 0) > 0
                        ? 'bg-emerald-400 hover:bg-emerald-300 text-stone-950 cursor-pointer'
                        : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    }`}
                    title="Take all items from chest [T]"
                  >
                    Take All [T]
                  </button>
                )}
                <span className="text-xs font-mono-tabular text-stone-300 bg-stone-800/80 px-2 py-0.5">
                  {isShipwrightMarket
                    ? `${allShips.length} Ships`
                    : t('ui.items_count', { count: rightColumnItems.length })}
                </span>
              </div>
            </div>

            {isShipwrightMarket ? (
              <div
                data-testid="shipwright-catalog-list"
                className="flex-1 overflow-y-auto space-y-2 pr-1"
              >
                {allShips.map((sh) => {
                  const isSelected = inspectedShip?.tierId === sh.tierId;
                  return (
                    <button
                      key={sh.id}
                      type="button"
                      data-testid={`shipwright-ship-item-${sh.tierId}`}
                      onClick={() => {
                        setSelectedShipTier(sh.tierId);
                        setTradeFeedback(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-3 text-left transition-colors cursor-pointer border-l-2 ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-950/40 text-white font-bold'
                          : 'border-transparent text-stone-300 hover:bg-stone-800/50 hover:text-stone-100'
                      }`}
                    >
                      <div className="flex flex-col items-start min-w-0">
                        <span className="truncate text-sm sm:text-base font-bold">{sh.name}</span>
                        <span className="text-[11px] text-stone-400 font-mono-tabular">
                          Speed: {sh.maxForwardSpeed}–{sh.sprintForwardSpeed} kt
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-xs font-mono-tabular">
                        {sh.spawned ? (
                          <span className="px-2 py-0.5 bg-emerald-950/90 border border-emerald-400/40 text-emerald-300 font-bold">
                            Owned
                          </span>
                        ) : (
                          <span className="text-amber-300 font-bold">
                            {godMode ? '0 🪙 (Free)' : `${sh.priceGold} 🪙`}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                {/* Category Filter for Merchant / Chest */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {(
                    [
                      ['all', t('ui.all_filter')],
                      ['weapons', t('ui.weapons_filter')],
                      ['clothing', t('ui.clothing_filter')],
                      ['traps', t('ui.traps_filter')],
                      ['materials', t('ui.materials_filter')],
                      ['food', t('ui.food_filter')],
                    ] as const
                  ).map(([catKey, label]) => (
                    <button
                      key={catKey}
                      type="button"
                      data-testid={`merchant-market-filter-${catKey}`}
                      onClick={() => setMerchantMarketCat(catKey)}
                      className={`px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                        merchantMarketCat === catKey
                          ? 'bg-emerald-400 text-stone-950'
                          : 'bg-stone-800/70 text-stone-300 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div
                  data-testid="market-merchant-catalog-list"
                  className="flex-1 overflow-y-auto space-y-1.5 pr-1"
                >
                  {rightColumnItems.length === 0 ? (
                    <div className="py-10 text-center text-xs text-stone-400">
                      {inChestModal ? 'Chest is empty.' : 'No items in this category.'}
                    </div>
                  ) : (
                    rightColumnItems.map((item) => {
                      const isSelected = inspectedItem?.id === item.id && tradeSide === 'merchant';
                      const owned = isItemOwned(item.id);
                      const ownedCount = getOwnedCount(item.id);
                      const chestCount = getChestCount(item.id);
                      const merchantStockCount = getMerchantStockCount(item.id);
                      const reqLvl = item.requiredLevel ?? 1;
                      const locked = !inChestModal && !owned && overallHeroLevel < reqLvl;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-testid={`merchant-market-item-${item.id}`}
                          onClick={() => {
                            setTradeSide('merchant');
                            onSelectItem(item.id);
                            setTradeFeedback(null);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 text-right transition-colors cursor-pointer border-r-2 ${
                            isSelected
                              ? 'border-emerald-400 bg-emerald-950/40 text-white font-bold'
                              : 'border-transparent text-stone-300 hover:bg-stone-800/50 hover:text-stone-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate text-sm sm:text-base">{item.name}</span>
                            {inChestModal && chestCount > 1 && (
                              <span className="px-1.5 py-0.5 text-[11px] font-mono-tabular font-bold bg-stone-800 text-emerald-200">
                                ×{chestCount}
                              </span>
                            )}
                            {!inChestModal && merchantStockCount > 0 && (
                              <span
                                data-testid={`merchant-stock-badge-${item.id}`}
                                className="px-1.5 py-0.5 text-[11px] font-mono-tabular font-bold bg-stone-800 text-emerald-200"
                              >
                                ×{merchantStockCount}
                              </span>
                            )}
                            {!inChestModal && owned && (
                              <span className="text-[11px] font-semibold text-amber-300/90 shrink-0">
                                {ownedCount > 1
                                  ? `${t('interactions.owned_label')} ×${ownedCount}`
                                  : t('interactions.owned_label')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 text-xs font-mono-tabular">
                            {inChestModal ? (
                              <span className="text-emerald-300">← Take</span>
                            ) : locked ? (
                              <span className="text-rose-400">
                                {t('interactions.level_required_badge', { level: reqLvl })}
                              </span>
                            ) : (
                              <span className="text-amber-300">{item.valueGold} 🪙</span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* =====================================================================
           PERSONAL INVENTORY OUTSIDE MARKET/CHEST (Player equipment list only)
           ===================================================================== */
        <div
          className="w-full max-w-6xl mx-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 py-6 overflow-hidden items-center"
        >
          {/* LEFT SIDE: Far-Left Text Category Headings + Scrollable Owned Item Names List */}
          <div
            className="md:col-span-6 h-full flex flex-row gap-6 sm:gap-10 overflow-hidden items-stretch"
          >
            <nav
              aria-label={t('ui.menu_topics_aria')}
              className="w-40 sm:w-44 shrink-0 flex flex-col justify-center gap-6 border-r border-stone-700/60 pr-4"
            >
              <button
                type="button"
                data-testid="cat-tab-weapons"
                onClick={() => {
                  onSelectCategory('weapons');
                  const firstOwnedWep = Array.from(INVENTORY_ITEM_MAP.values()).find(
                    (i) =>
                      isItemOwned(i.id) &&
                      (i.category === 'weapons' || i.category === 'ammo' || i.id === 'torch')
                  );
                  if (firstOwnedWep) onSelectItem(firstOwnedWep.id);
                }}
                className={`text-right font-display-he text-2xl sm:text-3xl font-bold transition-all cursor-pointer ${
                  activePersonalTab === 'weapons'
                    ? 'text-amber-300 translate-x-[-4px]'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {t('ui.weapons_tab')}
              </button>

              <button
                type="button"
                data-testid="cat-tab-clothing"
                onClick={() => {
                  onSelectCategory('clothing');
                  const firstOwnedClothing = Array.from(INVENTORY_ITEM_MAP.values()).find(
                    (i) => isItemOwned(i.id) && i.category === 'clothing'
                  );
                  if (firstOwnedClothing) onSelectItem(firstOwnedClothing.id);
                }}
                className={`text-right font-display-he text-2xl sm:text-3xl font-bold transition-all cursor-pointer ${
                  activePersonalTab === 'clothing'
                    ? 'text-amber-300 translate-x-[-4px]'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {t('ui.clothing_tab')}
              </button>

              <button
                type="button"
                data-testid="cat-tab-traps"
                onClick={() => {
                  onSelectCategory('traps');
                  const firstOwnedTrap = Array.from(INVENTORY_ITEM_MAP.values()).find(
                    (i) => isItemOwned(i.id) && i.id.startsWith('trap_')
                  );
                  if (firstOwnedTrap) onSelectItem(firstOwnedTrap.id);
                }}
                className={`text-right font-display-he text-2xl sm:text-3xl font-bold transition-all cursor-pointer ${
                  activePersonalTab === 'traps'
                    ? 'text-amber-300 translate-x-[-4px]'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {t('ui.traps_tab')}
              </button>

              <button
                type="button"
                data-testid="cat-tab-materials"
                onClick={() => {
                  onSelectCategory('materials');
                  const firstOwnedMat = Array.from(INVENTORY_ITEM_MAP.values()).find(
                    (i) => isItemOwned(i.id) && i.category === 'materials'
                  );
                  if (firstOwnedMat) onSelectItem(firstOwnedMat.id);
                }}
                className={`text-right font-display-he text-2xl sm:text-3xl font-bold transition-all cursor-pointer ${
                  activePersonalTab === 'materials'
                    ? 'text-amber-300 translate-x-[-4px]'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {t('ui.materials_tab')}
              </button>

              <button
                type="button"
                data-testid="cat-tab-food"
                onClick={() => {
                  onSelectCategory('food');
                  const firstOwnedFood = Array.from(INVENTORY_ITEM_MAP.values()).find(
                    (i) => isItemOwned(i.id) && i.category === 'food'
                  );
                  if (firstOwnedFood) onSelectItem(firstOwnedFood.id);
                }}
                className={`text-right font-display-he text-2xl sm:text-3xl font-bold transition-all cursor-pointer ${
                  activePersonalTab === 'food'
                    ? 'text-amber-300 translate-x-[-4px]'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {t('ui.food_tab')}
              </button>
            </nav>

            {/* Scrollable Owned Item Names List */}
            <div className="flex-1 flex flex-col h-full max-h-[68vh] overflow-hidden">
              <div className="text-xs uppercase tracking-widest text-stone-400 pb-2 mb-2 border-b border-stone-800">
                {activePersonalTab === 'weapons'
                  ? t('ui.owned_weapons_desc')
                  : activePersonalTab === 'clothing'
                    ? t('ui.owned_clothing_desc')
                    : activePersonalTab === 'traps'
                      ? t('ui.owned_traps_desc')
                      : activePersonalTab === 'food'
                        ? t('ui.owned_food_desc')
                        : t('ui.owned_materials_desc')}
              </div>

              <div
                data-testid="inventory-scrollable-list"
                className="flex-1 overflow-y-auto pr-1 space-y-1.5"
              >
                {ownedPersonalItems.map((item) => {
                  const isSelected = inspectedItem?.id === item.id;
                  const equipped = isItemEquipped(item.id);
                  const count = getOwnedCount(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-testid={`inv-item-${item.id}`}
                      onMouseEnter={() => {
                        onSelectItem(item.id);
                      }}
                      onClick={() => {
                        onSelectItem(item.id);
                        if (item.id.startsWith('trap_')) {
                          onEquipItem(item.id);
                        }
                      }}
                      onDoubleClick={() => {
                        onEquipItem(item.id);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-right transition-colors cursor-pointer border-r-2 ${
                        isSelected
                          ? 'border-amber-400 bg-stone-800/75 text-white font-bold'
                          : 'border-transparent text-stone-300 hover:bg-stone-800/40 hover:text-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="truncate text-base sm:text-lg">{item.name}</span>
                        {count > 1 && (
                          <span className="px-1.5 py-0.5 text-xs font-mono-tabular font-bold bg-stone-800 text-amber-200">
                            ×{count}
                          </span>
                        )}
                        {equipped && (
                          <span className="text-[11px] font-semibold text-amber-300 shrink-0">
                            {t('interactions.equipped_label')}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE OF SCREEN: Large Showcase Image & Owned Item Details (Strictly empty when category has 0 items!) */}
          <div
            data-testid="inventory-right-showcase"
            className="md:col-span-6 flex flex-col items-center justify-center text-center px-4 sm:px-8"
          >
            {inspectedItem ? (
              <>
                <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center mb-5">
                  {renderArtifactArtwork(inspectedItem.id, 'w-52 h-52 sm:w-60 sm:h-60')}
                </div>

                <div className="text-xs font-semibold text-amber-300/90 tracking-wide mb-1">
                  {t('ui.category_owned_by_hero', { category: inspectedItem.categoryLabel ?? '' })}
                </div>
                <h2
                  data-testid="inspected-item-title"
                  className="font-display-he text-2xl sm:text-4xl font-bold text-white mb-2"
                >
                  {inspectedItem.name}
                </h2>

                <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-stone-300 mb-3">
                  <span className="text-amber-200 font-semibold">{inspectedItem.statLabel}</span>
                  <span className="text-stone-600">·</span>
                  <span>{t('ui.weight_label', { weight: inspectedItem.weight })}</span>
                  <span className="text-stone-600">·</span>
                  <span>{t('ui.estimated_value_label', { value: inspectedItem.valueGold })}</span>
                </div>

                <p className="max-w-md text-xs sm:text-sm text-stone-300/90 leading-relaxed mb-5">
                  {inspectedItem.description}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  {inspectedOwned && inspectedItem.category !== 'materials' && (
                    <button
                      type="button"
                      data-testid="skyrim-equip-btn"
                      onClick={() => onEquipItem(inspectedItem.id)}
                      className="px-6 py-2.5 text-sm font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 transition-colors cursor-pointer"
                    >
                      {inspectedItem.category === 'food'
                        ? `Eat (${inspectedItem.name}) [${interactKeyLabel}]`
                        : inspectedItem.id.startsWith('trap_')
                          ? `Hold Trap in Hands (${inspectedItem.name}) [${interactKeyLabel}]`
                          : inspectedEquipped
                            ? t('interactions.equipped_now', { key: interactKeyLabel })
                            : t('interactions.equip_action', { key: interactKeyLabel })}
                    </button>
                  )}

                  {inspectedOwned && inspectedItem.category !== 'materials' && (
                    <div className="flex items-center gap-1.5 mr-2">
                      {[0, 1, 2, 3].map((slotIdx) => {
                        const isBound = hotbarSlots[slotIdx] === inspectedItem.id;
                        return (
                          <button
                            key={slotIdx}
                            type="button"
                            onClick={() => onAssignHotbar(slotIdx, inspectedItem.id)}
                            title={t('interactions.assign_hotbar_slot', { slot: slotIdx + 1 })}
                            className={`w-8 h-8 text-xs font-mono-tabular font-bold transition-colors cursor-pointer ${
                              isBound
                                ? 'bg-amber-400 text-stone-950'
                                : 'bg-stone-800/90 text-stone-300 hover:text-white border border-stone-700'
                            }`}
                          >
                            {slotIdx + 1}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
      {pendingRareSaleItem && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) setPendingRareSaleId(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="rare-sale-title"
            aria-describedby="rare-sale-body"
            data-testid="rare-sale-confirm-dialog"
            className="w-full max-w-sm p-5 rounded-2xl bg-stone-900 border border-amber-500/60 shadow-2xl text-left"
          >
            <h3 id="rare-sale-title" className="font-display-he text-lg font-bold text-amber-300">
              {t('interactions.rare_sale_title')}
            </h3>
            <p id="rare-sale-body" className="mt-2 text-sm text-stone-300 leading-relaxed">
              {t('interactions.rare_sale_body', {
                item: pendingRareSaleItem.name,
                price: getMarketSellPrice(pendingRareSaleItem),
              })}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                data-testid="rare-sale-cancel-btn"
                onClick={() => setPendingRareSaleId(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-600 cursor-pointer"
              >
                {t('interactions.rare_sale_cancel')}
              </button>
              <button
                type="button"
                data-testid="rare-sale-confirm-btn"
                onClick={() => {
                  performSell(pendingRareSaleItem.id);
                  setPendingRareSaleId(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-bold text-stone-950 bg-red-400 hover:bg-red-300 cursor-pointer"
              >
                {t('interactions.rare_sale_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
SkyrimInventoryModal.displayName = 'SkyrimInventoryModal';
// #endregion

