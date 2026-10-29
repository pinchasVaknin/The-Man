// ============================================================================
// MODULE: Components / Skyrim Inventory Modal
// DESIGN: Humble UI modal implementing Skyrim-style split-pane inventory (SRP)
// SUMMARY: Displays categories (Weapons, Ammo, Gear, Market, Skills), 3D item inspections,
//          gold transactions, hotbar slot bindings, and player attributes.
// ============================================================================

// ======================== IMPORTS & PROPS ======================== \\
// #region Imports & Props
import React, { useState } from 'react';
import {
  INVENTORY_ITEMS,
  INVENTORY_ITEM_MAP,
  InventoryItemId,
  IInventoryItemDef,
  ICharacterSkillsState,
  getMarketSellPrice,
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
 * Design: Categorizes weapons, materials, ammunition, and marketplace interactions.
 */
export type InventoryCategoryTab =
  | 'all'
  | 'weapons'
  | 'materials'
  | 'ammo'
  | 'gear'
  | 'treasures'
  | 'market'
  | 'skills';

/**
 * Summary: Props contract for Skyrim-style full-screen inventory modal dialog.
 * Design: Exposes inventory collections, equipment handlers, and market transaction dispatchers.
 */
export interface ISkyrimInventoryModalProps {
  selectedCategory: InventoryCategoryTab;
  onSelectCategory: (cat: InventoryCategoryTab) => void;
  selectedItemId: InventoryItemId;
  onSelectItem: (id: InventoryItemId) => void;
  isItemEquipped: (id: InventoryItemId) => boolean;
  isItemOwned: (id: InventoryItemId) => boolean;
  goldCoins: number;
  favoriteIds: InventoryItemId[];
  hotbarSlots: (InventoryItemId | null)[];
  onEquipItem: (id: InventoryItemId) => void;
  onBuyItem: (id: InventoryItemId) => Result<IBuyMarketItemPayload, MarketTransactionErrorCode>;
  onSellItem: (id: InventoryItemId) => Result<ISellMarketItemPayload, MarketTransactionErrorCode>;
  onToggleFavorite: (id: InventoryItemId) => void;
  onAssignHotbar: (slotIdx: number, id: InventoryItemId) => void;
  onClose: () => void;
  nearbyMarket?: { id: string; name?: string } | null;
  skills?: ICharacterSkillsState;
  stamina?: number;
  maxStamina?: number;
  distanceWalked?: number;
  arrowsShotCount?: number;
}
export type SkyrimInventoryModalProps = ISkyrimInventoryModalProps;

export const ITEM_SHORT_NAMES: Record<InventoryItemId, string> = {
  bow: t('items.bow.short'),
  sword: t('items.sword.short'),
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
  elven_cloak: t('items.elven_cloak.short'),
  katana_imperial: t('items.katana_imperial.short'),
  elven_longbow: t('items.elven_longbow.short'),
  dwarven_warhammer: t('items.dwarven_warhammer.short'),
  dragonbone_bow: t('items.dragonbone_bow.short'),
  celestial_jin_sword: t('items.celestial_jin_sword.short'),
};

const NON_SELLABLE_STARTER_IDS: InventoryItemId[] = ['unarmed'];
// #endregion

// ======================== MODAL COMPONENT ======================== \\
// #region Modal Component

function formatMarketError(error: MarketTransactionErrorCode): string {
  return t(`market.errors.${error}`);
}

export const SkyrimInventoryModal = React.memo<ISkyrimInventoryModalProps>(({
  selectedCategory,
  onSelectCategory,
  selectedItemId,
  onSelectItem,
  isItemEquipped,
  isItemOwned,
  goldCoins,
  hotbarSlots,
  onEquipItem,
  onBuyItem,
  onSellItem,
  onAssignHotbar,
  onClose,
  nearbyMarket,
  skills,
}) => {
  const [tradeFeedback, setTradeFeedback] = useState<string | null>(null);
  const [tradeSide, setTradeSide] = useState<'player' | 'merchant'>('merchant');
  const [playerMarketCat, setPlayerMarketCat] = useState<'all' | 'weapons' | 'materials'>('all');
  const [merchantMarketCat, setMerchantMarketCat] = useState<'all' | 'weapons' | 'materials'>('all');

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

  const inHarborMarket = Boolean(nearbyMarket);

  // Personal Inventory Mode (Outside Market): ONLY show items currently owned by the player!
  const activePersonalTab: 'weapons' | 'materials' =
    selectedCategory === 'materials' || selectedCategory === 'treasures'
      ? 'materials'
      : 'weapons';

  const ownedPersonalItems: readonly IInventoryItemDef[] = INVENTORY_ITEMS.filter((item) => {
    if (!isItemOwned(item.id)) return false;
    if (activePersonalTab === 'materials') {
      return item.category === 'materials';
    }
    return item.category === 'weapons' || item.category === 'ammo' || item.id === 'torch';
  });

  // Harbor Market Mode: Left Column = Player's Owned Items | Right Column = Merchant's Items
  const playerOwnedMarketItems: readonly IInventoryItemDef[] = INVENTORY_ITEMS.filter((item) => {
    if (!isItemOwned(item.id) || item.id === 'unarmed') return false;
    if (playerMarketCat === 'weapons') {
      return item.category === 'weapons' || item.category === 'ammo' || item.id === 'torch';
    }
    if (playerMarketCat === 'materials') {
      return item.category === 'materials';
    }
    return true;
  });

  const merchantCatalogItems: readonly IInventoryItemDef[] = INVENTORY_ITEMS.filter((item) => {
    if (item.id === 'unarmed') return false;
    if (merchantMarketCat === 'weapons') {
      return item.category === 'weapons' || item.category === 'ammo' || item.id === 'torch';
    }
    if (merchantMarketCat === 'materials') {
      return item.category === 'materials';
    }
    return true;
  });

  const inspectedItem: IInventoryItemDef = (() => {
    if (!inHarborMarket) {
      return (
        ownedPersonalItems.find((i) => i.id === selectedItemId) ??
        ownedPersonalItems[0] ??
        INVENTORY_ITEMS[0]
      );
    }
    return (
      INVENTORY_ITEM_MAP.get(selectedItemId) ??
      merchantCatalogItems[0] ??
      INVENTORY_ITEMS[0]
    );
  })();

  const inspectedOwned = isItemOwned(inspectedItem.id);
  const inspectedEquipped = isItemEquipped(inspectedItem.id);
  const inspectedReqLevel = inspectedItem.requiredLevel ?? 1;
  const inspectedLevelLocked = !inspectedOwned && overallHeroLevel < inspectedReqLevel;
  const inspectedSellPrice = getMarketSellPrice(inspectedItem);
  const canSellInspected =
    inHarborMarket &&
    inspectedOwned &&
    !NON_SELLABLE_STARTER_IDS.includes(inspectedItem.id) &&
    inspectedSellPrice > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('ui.inventory_aria')}
      data-testid="skyrim-inventory-modal"
      dir="rtl"
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
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between pb-3 border-b border-stone-700/60">
        <div className="flex items-center gap-6">
          <h1 className="font-display-he text-2xl sm:text-3xl font-bold text-stone-100 tracking-wide">
            {inHarborMarket ? t('market.hud.harbor_market_title', { market: nearbyMarket?.name ?? '' }) : t('ui.personal_gear_title')}
          </h1>
          <div className="flex items-center gap-4 text-sm text-stone-300">
            <span>
              {t('ui.hero_level_label')}<strong className="text-amber-300 font-mono-tabular">{overallHeroLevel}</strong>
            </span>
            <span className="text-stone-600">|</span>
            <span data-testid="inventory-gold-display">
              {t('ui.gold_label')}<strong className="text-amber-400 font-mono-tabular">{goldCoins}</strong>
            </span>
          </div>
        </div>

        <button
          type="button"
          data-testid="close-skyrim-inventory"
          onClick={onClose}
          className="text-sm font-semibold text-stone-300 hover:text-amber-300 transition-colors cursor-pointer px-3 py-1.5"
        >
          {t('ui.close_tab')}
        </button>
      </header>

      {inHarborMarket ? (
        /* =====================================================================
           HARBOR MARKET SPLIT 3-COLUMN LAYOUT (dir="ltr" so Left = Player, Center = Showcase, Right = Merchant)
           ===================================================================== */
        <div
          dir="ltr"
          data-testid="harbor-market-split-layout"
          className="w-full max-w-7xl mx-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 py-4 overflow-hidden items-stretch"
        >
          {/* PHYSICAL LEFT COLUMN (Left screen - Player-owned items / available to sell) */}
          <div
            dir="rtl"
            data-testid="market-left-player-column"
            className="md:col-span-4 flex flex-col h-full max-h-[75vh] bg-stone-900/55 border border-stone-700/60 p-4 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-stone-700/70">
              <div>
                <h2 className="font-display-he text-xl font-bold text-amber-300">
                  {t('ui.my_gear_left')}
                </h2>
                <p className="text-xs text-stone-400">{t('ui.my_gear_hint')}</p>
              </div>
              <span className="text-xs font-mono-tabular text-stone-300 bg-stone-800/80 px-2 py-0.5">
                {t('ui.items_count', { count: playerOwnedMarketItems.length })}
              </span>
            </div>

            {/* Category Filter for Player's Owned Items */}
            <div className="flex items-center gap-2 mb-3">
              {(
                [
                  ['all', t('ui.all_filter')],
                  ['weapons', t('ui.weapons_filter')],
                  ['materials', t('ui.materials_filter')],
                ] as const
              ).map(([catKey, label]) => (
                <button
                  key={catKey}
                  type="button"
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
                const isSelected = inspectedItem.id === item.id && tradeSide === 'player';
                const equipped = isItemEquipped(item.id);
                const sellVal = getMarketSellPrice(item);

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
                      {equipped && (
                        <span className="text-[11px] font-semibold text-amber-300 shrink-0">
                          {t('interactions.equipped_label')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono-tabular text-amber-300 shrink-0">
                      {t('interactions.sell_tag', { price: sellVal })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PHYSICAL CENTER COLUMN (Center screen - Item inspection & buy / sell actions) */}
          <div
            dir="rtl"
            data-testid="market-center-showcase"
            className="md:col-span-4 flex flex-col items-center justify-center text-center bg-stone-950/65 border border-stone-700/70 p-5 overflow-y-auto"
          >
            <div
              className={`px-3 py-1 text-xs font-bold mb-3 border ${
                tradeSide === 'player'
                  ? 'bg-amber-950/60 border-amber-400/50 text-amber-200'
                  : 'bg-emerald-950/60 border-emerald-400/50 text-emerald-200'
              }`}
            >
              {tradeSide === 'player'
                ? t('ui.selected_from_my_list')
                : t('ui.selected_from_merchant_list')}
            </div>

            <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center mb-3">
              {renderArtifactArtwork(inspectedItem.id, 'w-44 h-44 sm:w-48 sm:h-48')}
            </div>

            <div className="text-xs font-semibold text-amber-300/90 tracking-wide mb-1">
              {t('ui.category_required_level', { category: inspectedItem.categoryLabel ?? '', level: inspectedReqLevel })}
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

            <p className="max-w-sm text-xs sm:text-sm text-stone-300/90 leading-relaxed mb-4">
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

            {/* Center Action Buttons based on whether item was clicked from Player (Left) or Merchant (Right) */}
            <div className="flex flex-wrap items-center justify-center gap-3 w-full">
              {tradeSide === 'player' ? (
                <>
                  {canSellInspected && (
                    <button
                      type="button"
                      data-testid="skyrim-sell-btn"
                      onClick={() => {
                        const res = onSellItem(inspectedItem.id);
                        setTradeFeedback(
                          res.isSuccess ? t('interactions.sold_success', { gold: res.value.soldForGold }) : formatMarketError(res.error)
                        );
                      }}
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
                      {inspectedEquipped ? t('interactions.equipped_now') : t('interactions.equip_action')}
                    </button>
                  )}
                </>
              ) : (
                <>
                  {!inspectedOwned ? (
                    <button
                      type="button"
                      data-testid="skyrim-buy-btn"
                      disabled={inspectedLevelLocked || goldCoins < inspectedItem.valueGold}
                      onClick={() => {
                        const res = onBuyItem(inspectedItem.id);
                        setTradeFeedback(
                          res.isSuccess ? t('interactions.purchased_success') : formatMarketError(res.error)
                        );
                      }}
                      className={`w-full py-2.5 px-5 text-sm font-bold transition-colors ${
                        inspectedLevelLocked
                          ? 'bg-rose-950/80 text-rose-200 border border-rose-500/40 cursor-not-allowed'
                          : goldCoins < inspectedItem.valueGold
                            ? 'bg-stone-800 text-stone-400 cursor-not-allowed'
                            : 'bg-emerald-400 hover:bg-emerald-300 text-stone-950 cursor-pointer'
                      }`}
                    >
                      {inspectedLevelLocked
                        ? t('interactions.level_insufficient', { level: inspectedReqLevel })
                        : goldCoins < inspectedItem.valueGold
                          ? t('interactions.gold_insufficient', { price: inspectedItem.valueGold })
                          : t('interactions.buy_action', { price: inspectedItem.valueGold })}
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
                          onClick={() => {
                            const res = onSellItem(inspectedItem.id);
                            setTradeFeedback(
                              res.isSuccess ? t('interactions.sold_success', { gold: res.value.soldForGold }) : formatMarketError(res.error)
                            );
                          }}
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
          </div>

          {/* PHYSICAL RIGHT COLUMN (Right screen - Merchant items / catalog to buy) */}
          <div
            dir="rtl"
            data-testid="market-right-merchant-column"
            className="md:col-span-4 flex flex-col h-full max-h-[75vh] bg-stone-900/55 border border-stone-700/60 p-4 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-stone-700/70">
              <div>
                <h2 className="font-display-he text-xl font-bold text-emerald-300">
                  {t('ui.merchant_goods_right')}
                </h2>
                <p className="text-xs text-stone-400">{t('ui.merchant_goods_hint')}</p>
              </div>
              <span className="text-xs font-mono-tabular text-stone-300 bg-stone-800/80 px-2 py-0.5">
                {t('ui.items_count', { count: merchantCatalogItems.length })}
              </span>
            </div>

            {/* Category Filter for Merchant's Catalog */}
            <div className="flex items-center gap-2 mb-3">
              {(
                [
                  ['all', t('ui.all_filter')],
                  ['weapons', t('ui.weapons_filter')],
                  ['materials', t('ui.materials_filter')],
                ] as const
              ).map(([catKey, label]) => (
                <button
                  key={catKey}
                  type="button"
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
              {merchantCatalogItems.map((item) => {
                const isSelected = inspectedItem.id === item.id && tradeSide === 'merchant';
                const owned = isItemOwned(item.id);
                const reqLvl = item.requiredLevel ?? 1;
                const locked = !owned && overallHeroLevel < reqLvl;

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
                      {owned && (
                        <span className="text-[11px] font-semibold text-emerald-300 shrink-0">
                          {t('interactions.owned_label')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-xs font-mono-tabular">
                      {locked ? (
                        <span className="text-rose-400">{t('interactions.level_required_badge', { level: reqLvl })}</span>
                      ) : (
                        <span className="text-amber-300">{item.valueGold} 🪙</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* =====================================================================
           PERSONAL INVENTORY OUTSIDE MARKET (Player equipment list only)
           ===================================================================== */
        <div
          dir="ltr"
          className="w-full max-w-6xl mx-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 py-6 overflow-hidden items-center"
        >
          {/* LEFT SIDE: Far-Left Text Category Headings + Scrollable Owned Item Names List */}
          <div
            dir="ltr"
            className="md:col-span-6 h-full flex flex-row gap-6 sm:gap-10 overflow-hidden items-stretch"
          >
            <nav
              dir="rtl"
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
            </nav>

            {/* Scrollable Owned Item Names List */}
            <div dir="rtl" className="flex-1 flex flex-col h-full max-h-[68vh] overflow-hidden">
              <div className="text-xs uppercase tracking-widest text-stone-400 pb-2 mb-2 border-b border-stone-800">
                {activePersonalTab === 'weapons'
                  ? t('ui.owned_weapons_desc')
                  : t('ui.owned_materials_desc')}
              </div>

              <div
                data-testid="inventory-scrollable-list"
                className="flex-1 overflow-y-auto pr-1 space-y-1.5"
              >
                {ownedPersonalItems.map((item) => {
                  const isSelected = inspectedItem.id === item.id;
                  const equipped = isItemEquipped(item.id);

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

          {/* RIGHT SIDE OF SCREEN: Large Showcase Image & Owned Item Details */}
          <div
            dir="rtl"
            data-testid="inventory-right-showcase"
            className="md:col-span-6 flex flex-col items-center justify-center text-center px-4 sm:px-8"
          >
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
              {inspectedItem.name ?? inspectedItem.name}
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
                  {inspectedEquipped ? t('interactions.equipped_now') : t('interactions.equip_action')}
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
          </div>
        </div>
      )}
    </div>
  );
});
SkyrimInventoryModal.displayName = 'SkyrimInventoryModal';
// #endregion

